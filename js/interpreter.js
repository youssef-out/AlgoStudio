/**
 * Algorithme Studio - Moteur d'interprétation pour pseudo-code français (OFPPT)
 * Conforme aux normes pédagogiques : ALGORITHME, VARIABLES, DEBUT/FIN, SI/ALORS/SINON,
 * SELON/CAS, POUR, TANT QUE, REPETER/JUSQU'A, LIRE, ECRIRE, etc.
 */

class AlgorithmeInterpreter {
    constructor(options = {}) {
        this.onPrint = options.onPrint || console.log;
        this.onInput = options.onInput || (async () => "0");
        this.onStep = options.onStep || (() => {});
        this.onHighlight = options.onHighlight || (() => {});
        this.onVariablesUpdate = options.onVariablesUpdate || (() => {});
        this.onError = options.onError || console.error;
        this.onFinish = options.onFinish || (() => {});

        this.variables = new Map(); // name -> { type, value, declaredLine }
        this.constants = new Map(); // name -> { type, value }
        this.isRunning = false;
        this.isPaused = false;
        this.stepResolve = null;
        this.delayMs = 0;
        this.abortExecution = false;
        this.breakpoints = new Set();
    }

    reset() {
        this.variables.clear();
        this.constants.clear();
        this.isRunning = false;
        this.isPaused = false;
        this.stepResolve = null;
        this.abortExecution = false;
    }

    setBreakpoints(lineNumbers) {
        this.breakpoints = new Set(lineNumbers);
    }

    stop() {
        this.abortExecution = true;
        if (this.stepResolve) {
            this.stepResolve();
            this.stepResolve = null;
        }
        this.isRunning = false;
        this.isPaused = false;
    }

    step() {
        if (this.stepResolve) {
            const res = this.stepResolve;
            this.stepResolve = null;
            this.isPaused = false;
            res();
        }
    }

    normalizeKeyword(word) {
        if (!word) return "";
        return word
            .trim()
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, ""); // removes accents for normalization
    }

    // Tokenize an expression
    tokenizeExpr(exprStr, lineNum) {
        const tokens = [];
        let i = 0;
        const s = exprStr.trim();

        while (i < s.length) {
            const ch = s[i];

            // Whitespace
            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            // String literals "..." or '...'
            if (ch === '"' || ch === "'") {
                const quote = ch;
                let strVal = "";
                i++;
                let closed = false;
                while (i < s.length) {
                    if (s[i] === quote) {
                        closed = true;
                        i++;
                        break;
                    }
                    if (s[i] === '\\' && i + 1 < s.length) {
                        strVal += s[i + 1];
                        i += 2;
                    } else {
                        strVal += s[i];
                        i++;
                    }
                }
                if (!closed) {
                    throw new Error(`Erreur ligne ${lineNum}: Chaîne de caractères non fermée (${quote}).`);
                }
                tokens.push({ type: 'STRING', value: strVal });
                continue;
            }

            // Two-character operators
            const two = s.slice(i, i + 2);
            if (two === '<=' || two === '>=' || two === '<>' || two === '!=') {
                tokens.push({ type: 'OP', value: two === '<>' ? '!=' : two });
                i += 2;
                continue;
            }
            if (two === '<-') {
                tokens.push({ type: 'OP', value: '<-' });
                i += 2;
                continue;
            }
            if (two === ':=') {
                tokens.push({ type: 'OP', value: '<-' });
                i += 2;
                continue;
            }

            // Single char symbols
            if ('+-*/%^()=<>.,:'.includes(ch) || ch === '←') {
                if (ch === '←') {
                    tokens.push({ type: 'OP', value: '<-' });
                } else if (ch === '=') {
                    tokens.push({ type: 'OP', value: '==' });
                } else {
                    tokens.push({ type: 'OP', value: ch });
                }
                i++;
                continue;
            }

            // Numbers
            if (/\d/.test(ch)) {
                let numStr = "";
                let hasDot = false;
                while (i < s.length && (/[\d.]/.test(s[i]))) {
                    if (s[i] === '.') {
                        if (hasDot) break;
                        hasDot = true;
                    }
                    numStr += s[i];
                    i++;
                }
                tokens.push({ type: 'NUMBER', value: parseFloat(numStr), isFloat: hasDot });
                continue;
            }

            // Words (identifiers, keywords, logical ops)
            if (/[a-zA-Z_\u00C0-\u017F]/.test(ch)) {
                let word = "";
                while (i < s.length && /[a-zA-Z0-9_\u00C0-\u017F]/.test(s[i])) {
                    word += s[i];
                    i++;
                }
                const norm = this.normalizeKeyword(word);
                if (norm === 'ET' || norm === 'AND') {
                    tokens.push({ type: 'OP', value: '&&' });
                } else if (norm === 'OU' || norm === 'OR') {
                    tokens.push({ type: 'OP', value: '||' });
                } else if (norm === 'NON' || norm === 'NOT') {
                    tokens.push({ type: 'OP', value: '!' });
                } else if (norm === 'MOD') {
                    tokens.push({ type: 'OP', value: '%' });
                } else if (norm === 'DIV') {
                    tokens.push({ type: 'OP', value: 'div' });
                } else if (norm === 'VRAI' || norm === 'TRUE') {
                    tokens.push({ type: 'BOOLEAN', value: true });
                } else if (norm === 'FAUX' || norm === 'FALSE') {
                    tokens.push({ type: 'BOOLEAN', value: false });
                } else {
                    tokens.push({ type: 'IDENTIFIER', value: word });
                }
                continue;
            }

            throw new Error(`Erreur ligne ${lineNum}: Caractère inattendu '${ch}' dans l'expression.`);
        }

        return tokens;
    }

    // Shunting-yard algorithm & Pratt evaluator for expression
    evaluateTokens(tokens, lineNum) {
        if (!tokens || tokens.length === 0) return null;

        // Convert unary + and -
        const processed = [];
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            const prev = i > 0 ? tokens[i - 1] : null;
            if (t.type === 'OP' && (t.value === '-' || t.value === '+')) {
                if (!prev || (prev.type === 'OP' && prev.value !== ')')) {
                    processed.push({ type: 'UNARY_OP', value: 'u' + t.value });
                    continue;
                }
            }
            processed.push(t);
        }

        // Precedence map
        const precedence = {
            '||': 1,
            '&&': 2,
            '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4,
            '+': 5, '-': 5,
            '*': 6, '/': 6, '%': 6, 'div': 6,
            '^': 7,
            'u+': 8, 'u-': 8, '!': 8
        };

        const isRightAssoc = op => op === '^' || op === 'u+' || op === 'u-' || op === '!';

        // Convert infix to postfix (RPN)
        const outputQueue = [];
        const opStack = [];

        for (const token of processed) {
            if (token.type === 'NUMBER' || token.type === 'STRING' || token.type === 'BOOLEAN' || token.type === 'IDENTIFIER') {
                outputQueue.push(token);
            } else if (token.type === 'UNARY_OP' || (token.type === 'OP' && token.value !== '(' && token.value !== ')')) {
                const o1 = token.value;
                while (opStack.length > 0) {
                    const top = opStack[opStack.length - 1];
                    if (top.type === 'OP' && top.value === '(') break;
                    const o2 = top.value;
                    const p1 = precedence[o1] || 0;
                    const p2 = precedence[o2] || 0;

                    if ((!isRightAssoc(o1) && p1 <= p2) || (isRightAssoc(o1) && p1 < p2)) {
                        outputQueue.push(opStack.pop());
                    } else {
                        break;
                    }
                }
                opStack.push(token);
            } else if (token.type === 'OP' && token.value === '(') {
                opStack.push(token);
            } else if (token.type === 'OP' && token.value === ')') {
                let match = false;
                while (opStack.length > 0) {
                    const top = opStack.pop();
                    if (top.type === 'OP' && top.value === '(') {
                        match = true;
                        break;
                    }
                    outputQueue.push(top);
                }
                if (!match) {
                    throw new Error(`Erreur ligne ${lineNum}: Parenthèse fermante sans parenthèse ouvrante correspondante.`);
                }
            }
        }

        while (opStack.length > 0) {
            const top = opStack.pop();
            if (top.type === 'OP' && (top.value === '(' || top.value === ')')) {
                throw new Error(`Erreur ligne ${lineNum}: Parenthèses mal équilibrées.`);
            }
            outputQueue.push(top);
        }

        // Evaluate RPN
        const valStack = [];
        for (const token of outputQueue) {
            if (token.type === 'NUMBER' || token.type === 'STRING' || token.type === 'BOOLEAN') {
                valStack.push(token.value);
            } else if (token.type === 'IDENTIFIER') {
                const varNameLower = token.value.toLowerCase();
                let found = false;
                // Check variables
                for (const [name, data] of this.variables.entries()) {
                    if (name.toLowerCase() === varNameLower) {
                        if (data.value === undefined || data.value === null) {
                            throw new Error(`Erreur ligne ${lineNum}: La variable '${token.value}' est utilisée avant d'avoir été initialisée.`);
                        }
                        valStack.push(data.value);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // Check constants
                    for (const [name, data] of this.constants.entries()) {
                        if (name.toLowerCase() === varNameLower) {
                            valStack.push(data.value);
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    throw new Error(`Erreur ligne ${lineNum}: La variable '${token.value}' n'a pas été déclarée.`);
                }
            } else if (token.type === 'UNARY_OP') {
                if (valStack.length < 1) throw new Error(`Erreur ligne ${lineNum}: Opérande manquant pour l'opérateur unaire.`);
                const a = valStack.pop();
                if (token.value === 'u-') valStack.push(-a);
                else if (token.value === 'u+') valStack.push(+a);
                else if (token.value === '!') valStack.push(!a);
            } else if (token.type === 'OP') {
                if (token.value === '!') {
                    if (valStack.length < 1) throw new Error(`Erreur ligne ${lineNum}: Opérande manquant pour NON.`);
                    const a = valStack.pop();
                    valStack.push(!a);
                    continue;
                }
                if (valStack.length < 2) {
                    throw new Error(`Erreur ligne ${lineNum}: Opérande manquant pour l'opérateur '${token.value}'.`);
                }
                const b = valStack.pop();
                const a = valStack.pop();

                switch (token.value) {
                    case '+':
                        valStack.push(a + b);
                        break;
                    case '-':
                        valStack.push(a - b);
                        break;
                    case '*':
                        valStack.push(a * b);
                        break;
                    case '/':
                        if (b === 0) throw new Error(`Erreur ligne ${lineNum}: Division par zéro interdite.`);
                        valStack.push(a / b);
                        break;
                    case '%':
                        if (b === 0) throw new Error(`Erreur ligne ${lineNum}: Modulo par zéro interdit.`);
                        valStack.push(a % b);
                        break;
                    case 'div':
                        if (b === 0) throw new Error(`Erreur ligne ${lineNum}: Division entière par zéro interdite.`);
                        valStack.push(Math.trunc(a / b));
                        break;
                    case '^':
                        valStack.push(Math.pow(a, b));
                        break;
                    case '==':
                        valStack.push(a === b);
                        break;
                    case '!=':
                        valStack.push(a !== b);
                        break;
                    case '<':
                        valStack.push(a < b);
                        break;
                    case '<=':
                        valStack.push(a <= b);
                        break;
                    case '>':
                        valStack.push(a > b);
                        break;
                    case '>=':
                        valStack.push(a >= b);
                        break;
                    case '&&':
                        valStack.push(Boolean(a && b));
                        break;
                    case '||':
                        valStack.push(Boolean(a || b));
                        break;
                    default:
                        throw new Error(`Erreur ligne ${lineNum}: Opérateur inconnu '${token.value}'.`);
                }
            }
        }

        if (valStack.length !== 1) {
            throw new Error(`Erreur ligne ${lineNum}: Expression arithmétique/logique invalide.`);
        }

        return valStack[0];
    }

    evalExpression(exprStr, lineNum) {
        const tokens = this.tokenizeExpr(exprStr, lineNum);
        return this.evaluateTokens(tokens, lineNum);
    }

    // Split comma separated expressions taking string quotes into account
    splitArgs(argsStr, lineNum) {
        const parts = [];
        let cur = "";
        let inQuote = false;
        let quoteChar = "";
        let parenDepth = 0;

        for (let i = 0; i < argsStr.length; i++) {
            const ch = argsStr[i];
            if (inQuote) {
                cur += ch;
                if (ch === quoteChar && argsStr[i - 1] !== '\\') {
                    inQuote = false;
                }
            } else {
                if (ch === '"' || ch === "'") {
                    inQuote = true;
                    quoteChar = ch;
                    cur += ch;
                } else if (ch === '(') {
                    parenDepth++;
                    cur += ch;
                } else if (ch === ')') {
                    parenDepth--;
                    cur += ch;
                } else if (ch === ',' && parenDepth === 0) {
                    parts.push(cur.trim());
                    cur = "";
                } else {
                    cur += ch;
                }
            }
        }
        if (cur.trim().length > 0) {
            parts.push(cur.trim());
        }
        return parts;
    }

    // Parse source code into lines and instructions
    parse(code) {
        const rawLines = code.split(/\r?\n/);
        const lines = [];

        for (let i = 0; i < rawLines.length; i++) {
            let line = rawLines[i];
            const lineNum = i + 1;

            // Remove comments (// or /* ... */)
            const commentIdx = line.indexOf('//');
            if (commentIdx !== -1) {
                line = line.substring(0, commentIdx);
            }
            line = line.trim();

            if (line.length > 0) {
                lines.push({
                    text: line,
                    lineNum: lineNum,
                    raw: rawLines[i]
                });
            }
        }

        return lines;
    }

    // Pre-scan declarations
    scanDeclarations(lines) {
        let insideDeclarations = true;
        let algoName = "SansTitre";

        for (let i = 0; i < lines.length; i++) {
            const { text, lineNum } = lines[i];
            const norm = this.normalizeKeyword(text);

            if (norm.startsWith('ALGORITHME')) {
                const parts = text.split(/\s+/);
                if (parts.length > 1) {
                    algoName = parts.slice(1).join(" ").trim();
                }
                continue;
            }

            if (norm === 'DEBUT' || norm === 'DÉBUT') {
                insideDeclarations = false;
                break;
            }

            if (insideDeclarations) {
                // CONSTANTE PI = 3.14
                if (norm.startsWith('CONSTANTE') || norm.startsWith('CONSTANTES')) {
                    const withoutKw = text.replace(/^CONSTANTES?\s+/i, '').trim();
                    const decls = withoutKw.split(',');
                    for (const decl of decls) {
                        const eqIdx = decl.indexOf('=');
                        if (eqIdx !== -1) {
                            const cName = decl.substring(0, eqIdx).trim();
                            const cValStr = decl.substring(eqIdx + 1).trim();
                            const val = this.evalExpression(cValStr, lineNum);
                            this.constants.set(cName, { value: val, line: lineNum });
                        }
                    }
                    continue;
                }

                // VARIABLE x, y : réel
                // VARIABLES x : entier
                if (norm.startsWith('VARIABLE') || norm.startsWith('VARIABLES') || norm.startsWith('VAR')) {
                    const withoutKw = text.replace(/^VARIABLES?\s+/i, '').trim();
                    const colonIdx = withoutKw.indexOf(':');
                    if (colonIdx === -1) {
                        throw new Error(`Erreur ligne ${lineNum}: Syntaxe de déclaration invalide. Attendu: 'VARIABLE nom : type'`);
                    }
                    const varNamesStr = withoutKw.substring(0, colonIdx).trim();
                    const typeRaw = withoutKw.substring(colonIdx + 1).trim();
                    const normType = this.normalizeType(typeRaw, lineNum);

                    const varNames = varNamesStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    for (const vName of varNames) {
                        if (!/^[a-zA-Z_\u00C0-\u017F][a-zA-Z0-9_\u00C0-\u017F]*$/.test(vName)) {
                            throw new Error(`Erreur ligne ${lineNum}: Nom de variable invalide '${vName}'.`);
                        }
                        this.variables.set(vName, {
                            type: normType,
                            value: this.getDefaultValue(normType),
                            declaredLine: lineNum
                        });
                    }
                    continue;
                }
            }
        }

        return { algoName };
    }

    normalizeType(typeStr, lineNum) {
        const norm = this.normalizeKeyword(typeStr);
        if (norm === 'ENTIER' || norm === 'INTEGER') return 'entier';
        if (norm === 'REEL' || norm === 'RÉEL' || norm === 'FLOAT' || norm === 'DOUBLE') return 'réel';
        if (norm === 'CHAINE' || norm === 'CHAÎNE' || norm === 'STRING' || norm.startsWith('CHAINE DE CARACTERE')) return 'chaîne';
        if (norm === 'CARACTERE' || norm === 'CARACTÈRE' || norm === 'CHAR') return 'caractère';
        if (norm === 'BOOLEEN' || norm === 'BOOLÉEN' || norm === 'BOOLEAN') return 'booléen';
        throw new Error(`Erreur ligne ${lineNum}: Type de variable inconnu '${typeStr}'. Types autorisés: entier, réel, chaîne, caractère, booléen.`);
    }

    getDefaultValue(type) {
        switch (type) {
            case 'entier': return 0;
            case 'réel': return 0.0;
            case 'chaîne': return "";
            case 'caractère': return " ";
            case 'booléen': return false;
            default: return 0;
        }
    }

    // Cast and validate assigned value
    validateAndCast(varName, value, lineNum) {
        let vData = null;
        for (const [name, data] of this.variables.entries()) {
            if (name.toLowerCase() === varName.toLowerCase()) {
                vData = data;
                varName = name; // retain case
                break;
            }
        }
        if (!vData) {
            throw new Error(`Erreur ligne ${lineNum}: La variable '${varName}' n'a pas été déclarée.`);
        }

        const type = vData.type;
        let castedVal = value;

        if (type === 'entier') {
            if (typeof value === 'boolean') {
                throw new Error(`Erreur de type ligne ${lineNum}: Impossible d'affecter un booléen à la variable '${varName}' de type entier.`);
            }
            if (typeof value === 'string') {
                const num = parseInt(value, 10);
                if (isNaN(num)) {
                    throw new Error(`Erreur de type ligne ${lineNum}: '${value}' ne peut pas être converti en entier pour '${varName}'.`);
                }
                castedVal = num;
            } else if (typeof value === 'number') {
                castedVal = Math.trunc(value);
            }
        } else if (type === 'réel') {
            if (typeof value === 'boolean') {
                throw new Error(`Erreur de type ligne ${lineNum}: Impossible d'affecter un booléen à la variable '${varName}' de type réel.`);
            }
            if (typeof value === 'string') {
                const num = parseFloat(value.replace(',', '.'));
                if (isNaN(num)) {
                    throw new Error(`Erreur de type ligne ${lineNum}: '${value}' ne peut pas être converti en réel pour '${varName}'.`);
                }
                castedVal = num;
            } else if (typeof value === 'number') {
                castedVal = value;
            }
        } else if (type === 'chaîne') {
            castedVal = String(value);
        } else if (type === 'caractère') {
            castedVal = String(value).charAt(0) || " ";
        } else if (type === 'booléen') {
            if (typeof value === 'boolean') {
                castedVal = value;
            } else if (typeof value === 'string') {
                const s = value.trim().toLowerCase();
                if (s === 'vrai' || s === 'true' || s === '1') castedVal = true;
                else if (s === 'faux' || s === 'false' || s === '0') castedVal = false;
                else throw new Error(`Erreur de type ligne ${lineNum}: Valeur '${value}' invalide pour le type booléen (vrai/faux attendu).`);
            } else {
                castedVal = Boolean(value);
            }
        }

        vData.value = castedVal;
        this.onVariablesUpdate(new Map(this.variables));
        return castedVal;
    }

    // Build block statements tree
    buildAst(lines) {
        let idx = 0;

        // Skip until DEBUT
        while (idx < lines.length) {
            const norm = this.normalizeKeyword(lines[idx].text);
            if (norm === 'DEBUT' || norm === 'DÉBUT') {
                idx++;
                break;
            }
            idx++;
        }

        const parseBlock = (endKeywords = ['FIN']) => {
            const statements = [];

            while (idx < lines.length) {
                const { text, lineNum, raw } = lines[idx];
                const norm = this.normalizeKeyword(text);

                // Check block termination
                for (const endKw of endKeywords) {
                    if (norm === endKw || norm.startsWith(endKw + ' ') || norm.startsWith(endKw + ':')) {
                        return statements;
                    }
                }

                // SI condition ALORS
                if (norm.startsWith('SI ') || norm.startsWith('SI(')) {
                    const siStmt = this.parseSiStatement(lines, idx);
                    statements.push(siStmt.node);
                    idx = siStmt.nextIdx;
                    continue;
                }

                // SELON expression FAIRE
                if (norm.startsWith('SELON ')) {
                    const selonStmt = this.parseSelonStatement(lines, idx);
                    statements.push(selonStmt.node);
                    idx = selonStmt.nextIdx;
                    continue;
                }

                // POUR var ← start À end [PAS step] FAIRE
                if (norm.startsWith('POUR ')) {
                    const pourStmt = this.parsePourStatement(lines, idx);
                    statements.push(pourStmt.node);
                    idx = pourStmt.nextIdx;
                    continue;
                }

                // TANT QUE condition FAIRE
                if (norm.startsWith('TANT QUE ') || norm.startsWith('TANTQUE ')) {
                    const tqStmt = this.parseTantQueStatement(lines, idx);
                    statements.push(tqStmt.node);
                    idx = tqStmt.nextIdx;
                    continue;
                }

                // RÉPÉTER ... JUSQU'À condition
                if (norm === 'REPETER' || norm === 'RÉPÉTER') {
                    const repStmt = this.parseRepeterStatement(lines, idx);
                    statements.push(repStmt.node);
                    idx = repStmt.nextIdx;
                    continue;
                }

                // Basic statements (ECRIRE, LIRE, ASSIGNMENT)
                statements.push(this.parseSimpleStatement(lines[idx]));
                idx++;
            }

            return statements;
        };

        return parseBlock(['FIN']);
    }

    parseSiStatement(lines, startIdx) {
        const { text, lineNum } = lines[startIdx];
        // Match: SI <cond> ALORS
        let condStr = "";
        const norm = this.normalizeKeyword(text);
        const siIdx = text.search(/si\b/i);
        const alorsIdx = text.search(/\balors\b/i);

        if (alorsIdx === -1) {
            throw new Error(`Erreur ligne ${lineNum}: 'ALORS' manquant dans la structure conditionnelle 'SI'.`);
        }
        condStr = text.substring(siIdx + 2, alorsIdx).trim();

        let idx = startIdx + 1;
        const thenBlock = [];
        const elseBlock = [];
        let inElse = false;

        while (idx < lines.length) {
            const curLine = lines[idx];
            const curNorm = this.normalizeKeyword(curLine.text);

            if (curNorm === 'FINSI' || curNorm === 'FIN SI') {
                idx++;
                break;
            }

            if (curNorm === 'SINON') {
                inElse = true;
                idx++;
                continue;
            }

            // SINON SI cond ALORS
            if (curNorm.startsWith('SINON SI') || curNorm.startsWith('SINONSI')) {
                // Parse nested SI
                const nested = this.parseSiStatement(lines, idx);
                elseBlock.push(nested.node);
                idx = nested.nextIdx;
                break;
            }

            if (curNorm.startsWith('SI ') || curNorm.startsWith('SI(')) {
                const subSi = this.parseSiStatement(lines, idx);
                (inElse ? elseBlock : thenBlock).push(subSi.node);
                idx = subSi.nextIdx;
                continue;
            }

            if (curNorm.startsWith('SELON ')) {
                const subSelon = this.parseSelonStatement(lines, idx);
                (inElse ? elseBlock : thenBlock).push(subSelon.node);
                idx = subSelon.nextIdx;
                continue;
            }

            if (curNorm.startsWith('POUR ')) {
                const subPour = this.parsePourStatement(lines, idx);
                (inElse ? elseBlock : thenBlock).push(subPour.node);
                idx = subPour.nextIdx;
                continue;
            }

            if (curNorm.startsWith('TANT QUE ') || curNorm.startsWith('TANTQUE ')) {
                const subTq = this.parseTantQueStatement(lines, idx);
                (inElse ? elseBlock : thenBlock).push(subTq.node);
                idx = subTq.nextIdx;
                continue;
            }

            if (curNorm === 'REPETER' || curNorm === 'RÉPÉTER') {
                const subRep = this.parseRepeterStatement(lines, idx);
                (inElse ? elseBlock : thenBlock).push(subRep.node);
                idx = subRep.nextIdx;
                continue;
            }

            (inElse ? elseBlock : thenBlock).push(this.parseSimpleStatement(curLine));
            idx++;
        }

        return {
            node: {
                type: 'SI',
                condition: condStr,
                lineNum,
                thenBlock,
                elseBlock
            },
            nextIdx: idx
        };
    }

    parseSelonStatement(lines, startIdx) {
        const { text, lineNum } = lines[startIdx];
        // SELON expr FAIRE
        const faireMatch = text.match(/selon\s+(.+?)\s+faire/i);
        if (!faireMatch) {
            throw new Error(`Erreur ligne ${lineNum}: Syntaxe attendue: 'SELON variable FAIRE'.`);
        }
        const expr = faireMatch[1].trim();

        let idx = startIdx + 1;
        const cases = [];
        let defaultCase = null;
        let curCase = null;

        while (idx < lines.length) {
            const curLine = lines[idx];
            const curNorm = this.normalizeKeyword(curLine.text);

            if (curNorm === 'FINSELON' || curNorm === 'FIN SELON') {
                idx++;
                break;
            }

            if (curNorm.startsWith('CAS AUTRE') || curNorm.startsWith('AUTRE') || curNorm.startsWith('DEFAUT')) {
                // default case
                defaultCase = { lineNum: curLine.lineNum, statements: [] };
                curCase = defaultCase;

                // Check if inline statement exists e.g. "CAS AUTRE : ECRIRE(...)"
                const colIdx = curLine.text.indexOf(':');
                if (colIdx !== -1) {
                    const rest = curLine.text.substring(colIdx + 1).trim();
                    if (rest.length > 0) {
                        curCase.statements.push(this.parseSimpleStatement({ text: rest, lineNum: curLine.lineNum }));
                    }
                }
                idx++;
                continue;
            }

            if (curNorm.startsWith('CAS ')) {
                // CAS 1 : or CAS 1, 2 :
                const colIdx = curLine.text.indexOf(':');
                if (colIdx === -1) {
                    throw new Error(`Erreur ligne ${curLine.lineNum}: ':' manquant après 'CAS valeur'.`);
                }
                const valPart = curLine.text.substring(curLine.text.search(/cas\b/i) + 3, colIdx).trim();
                const values = valPart.split(',').map(s => s.trim());
                curCase = { values, lineNum: curLine.lineNum, statements: [] };
                cases.push(curCase);

                const rest = curLine.text.substring(colIdx + 1).trim();
                if (rest.length > 0) {
                    curCase.statements.push(this.parseSimpleStatement({ text: rest, lineNum: curLine.lineNum }));
                }
                idx++;
                continue;
            }

            // Nested block handling
            if (curCase) {
                if (curNorm.startsWith('SI ') || curNorm.startsWith('SI(')) {
                    const subSi = this.parseSiStatement(lines, idx);
                    curCase.statements.push(subSi.node);
                    idx = subSi.nextIdx;
                    continue;
                }
                if (curNorm.startsWith('SELON ')) {
                    const subSelon = this.parseSelonStatement(lines, idx);
                    curCase.statements.push(subSelon.node);
                    idx = subSelon.nextIdx;
                    continue;
                }
                if (curNorm.startsWith('POUR ')) {
                    const subPour = this.parsePourStatement(lines, idx);
                    curCase.statements.push(subPour.node);
                    idx = subPour.nextIdx;
                    continue;
                }
                if (curNorm.startsWith('TANT QUE ') || curNorm.startsWith('TANTQUE ')) {
                    const subTq = this.parseTantQueStatement(lines, idx);
                    curCase.statements.push(subTq.node);
                    idx = subTq.nextIdx;
                    continue;
                }
                if (curNorm === 'REPETER' || curNorm === 'RÉPÉTER') {
                    const subRep = this.parseRepeterStatement(lines, idx);
                    curCase.statements.push(subRep.node);
                    idx = subRep.nextIdx;
                    continue;
                }

                curCase.statements.push(this.parseSimpleStatement(curLine));
            }
            idx++;
        }

        return {
            node: {
                type: 'SELON',
                expression: expr,
                lineNum,
                cases,
                defaultCase
            },
            nextIdx: idx
        };
    }

    parsePourStatement(lines, startIdx) {
        const { text, lineNum } = lines[startIdx];
        // Match: POUR i ← 1 À 10 [PAS 2] FAIRE
        // Normalize arrow inside line
        const cleaned = text.replace(/←|<-|:=/g, '<-');
        const match = cleaned.match(/pour\s+([a-zA-Z0-9_\u00C0-\u017F]+)\s*<-\s*(.+?)\s+(?:à|a)\s+(.+?)(?:\s+pas\s+(.+?))?\s+faire/i);

        if (!match) {
            throw new Error(`Erreur ligne ${lineNum}: Syntaxe invalide pour POUR. Exemple: 'POUR i ← 1 À 10 FAIRE'`);
        }

        const iterator = match[1].trim();
        const startExpr = match[2].trim();
        const endExpr = match[3].trim();
        const stepExpr = match[4] ? match[4].trim() : "1";

        let idx = startIdx + 1;
        const body = [];

        while (idx < lines.length) {
            const curLine = lines[idx];
            const curNorm = this.normalizeKeyword(curLine.text);

            if (curNorm === 'FINPOUR' || curNorm === 'FIN POUR') {
                idx++;
                break;
            }

            if (curNorm.startsWith('SI ') || curNorm.startsWith('SI(')) {
                const subSi = this.parseSiStatement(lines, idx);
                body.push(subSi.node);
                idx = subSi.nextIdx;
                continue;
            }
            if (curNorm.startsWith('SELON ')) {
                const subSelon = this.parseSelonStatement(lines, idx);
                body.push(subSelon.node);
                idx = subSelon.nextIdx;
                continue;
            }
            if (curNorm.startsWith('POUR ')) {
                const subPour = this.parsePourStatement(lines, idx);
                body.push(subPour.node);
                idx = subPour.nextIdx;
                continue;
            }
            if (curNorm.startsWith('TANT QUE ') || curNorm.startsWith('TANTQUE ')) {
                const subTq = this.parseTantQueStatement(lines, idx);
                body.push(subTq.node);
                idx = subTq.nextIdx;
                continue;
            }
            if (curNorm === 'REPETER' || curNorm === 'RÉPÉTER') {
                const subRep = this.parseRepeterStatement(lines, idx);
                body.push(subRep.node);
                idx = subRep.nextIdx;
                continue;
            }

            body.push(this.parseSimpleStatement(curLine));
            idx++;
        }

        return {
            node: {
                type: 'POUR',
                iterator,
                startExpr,
                endExpr,
                stepExpr,
                lineNum,
                body
            },
            nextIdx: idx
        };
    }

    parseTantQueStatement(lines, startIdx) {
        const { text, lineNum } = lines[startIdx];
        // TANT QUE cond FAIRE
        const faireIdx = text.search(/\bfaire\b/i);
        if (faireIdx === -1) {
            throw new Error(`Erreur ligne ${lineNum}: 'FAIRE' manquant après 'TANT QUE condition'.`);
        }
        const condPart = text.substring(text.search(/tant\s*que\b/i) + 8, faireIdx).trim();

        let idx = startIdx + 1;
        const body = [];

        while (idx < lines.length) {
            const curLine = lines[idx];
            const curNorm = this.normalizeKeyword(curLine.text);

            if (curNorm === 'FINTANTQUE' || curNorm === 'FIN TANT QUE' || curNorm === 'FIN TANTQUE') {
                idx++;
                break;
            }

            if (curNorm.startsWith('SI ') || curNorm.startsWith('SI(')) {
                const subSi = this.parseSiStatement(lines, idx);
                body.push(subSi.node);
                idx = subSi.nextIdx;
                continue;
            }
            if (curNorm.startsWith('SELON ')) {
                const subSelon = this.parseSelonStatement(lines, idx);
                body.push(subSelon.node);
                idx = subSelon.nextIdx;
                continue;
            }
            if (curNorm.startsWith('POUR ')) {
                const subPour = this.parsePourStatement(lines, idx);
                body.push(subPour.node);
                idx = subPour.nextIdx;
                continue;
            }
            if (curNorm.startsWith('TANT QUE ') || curNorm.startsWith('TANTQUE ')) {
                const subTq = this.parseTantQueStatement(lines, idx);
                body.push(subTq.node);
                idx = subTq.nextIdx;
                continue;
            }
            if (curNorm === 'REPETER' || curNorm === 'RÉPÉTER') {
                const subRep = this.parseRepeterStatement(lines, idx);
                body.push(subRep.node);
                idx = subRep.nextIdx;
                continue;
            }

            body.push(this.parseSimpleStatement(curLine));
            idx++;
        }

        return {
            node: {
                type: 'TANT_QUE',
                condition: condPart,
                lineNum,
                body
            },
            nextIdx: idx
        };
    }

    parseRepeterStatement(lines, startIdx) {
        const { lineNum } = lines[startIdx];
        let idx = startIdx + 1;
        const body = [];
        let condStr = "";
        let isTantQueVariant = false;

        while (idx < lines.length) {
            const curLine = lines[idx];
            const curNorm = this.normalizeKeyword(curLine.text);

            // JUSQU'À condition or JUSQUA
            if (curNorm.startsWith("JUSQU'A") || curNorm.startsWith("JUSQUA")) {
                const match = curLine.text.match(/jusqu(?:'|’)?(?:à|a)\s+(.+)/i);
                if (!match) {
                    throw new Error(`Erreur ligne ${curLine.lineNum}: Condition manquante après 'JUSQU'À'.`);
                }
                condStr = match[1].trim();
                idx++;
                break;
            }

            // Slide 54 mentions: REPETER TANT QUE cond
            if (curNorm.startsWith("TANT QUE")) {
                isTantQueVariant = true;
                condStr = curLine.text.replace(/tant\s*que/i, '').trim();
                idx++;
                break;
            }

            if (curNorm.startsWith('SI ') || curNorm.startsWith('SI(')) {
                const subSi = this.parseSiStatement(lines, idx);
                body.push(subSi.node);
                idx = subSi.nextIdx;
                continue;
            }
            if (curNorm.startsWith('SELON ')) {
                const subSelon = this.parseSelonStatement(lines, idx);
                body.push(subSelon.node);
                idx = subSelon.nextIdx;
                continue;
            }
            if (curNorm.startsWith('POUR ')) {
                const subPour = this.parsePourStatement(lines, idx);
                body.push(subPour.node);
                idx = subPour.nextIdx;
                continue;
            }
            if (curNorm.startsWith('TANT QUE ') || curNorm.startsWith('TANTQUE ')) {
                const subTq = this.parseTantQueStatement(lines, idx);
                body.push(subTq.node);
                idx = subTq.nextIdx;
                continue;
            }
            if (curNorm === 'REPETER' || curNorm === 'RÉPÉTER') {
                const subRep = this.parseRepeterStatement(lines, idx);
                body.push(subRep.node);
                idx = subRep.nextIdx;
                continue;
            }

            body.push(this.parseSimpleStatement(curLine));
            idx++;
        }

        return {
            node: {
                type: 'REPETER',
                condition: condStr,
                isTantQueVariant,
                lineNum,
                body
            },
            nextIdx: idx
        };
    }

    parseSimpleStatement(lineObj) {
        const { text, lineNum } = lineObj;
        const norm = this.normalizeKeyword(text);

        // ECRIRE(...) or ÉCRIRE(...) or AFFICHER(...)
        if (norm.startsWith('ECRIRE') || norm.startsWith('ÉCRIRE') || norm.startsWith('AFFICHER')) {
            const openParen = text.indexOf('(');
            const closeParen = text.lastIndexOf(')');
            let argsStr = "";
            if (openParen !== -1 && closeParen !== -1 && closeParen > openParen) {
                argsStr = text.substring(openParen + 1, closeParen);
            } else {
                // Without parentheses: ECRIRE "hello", x
                argsStr = text.replace(/^(?:ÉCRIRE|ECRIRE|AFFICHER)\s+/i, '');
            }
            return {
                type: 'ECRIRE',
                args: this.splitArgs(argsStr, lineNum),
                lineNum
            };
        }

        // LIRE(...)
        if (norm.startsWith('LIRE')) {
            const openParen = text.indexOf('(');
            const closeParen = text.lastIndexOf(')');
            let argsStr = "";
            if (openParen !== -1 && closeParen !== -1 && closeParen > openParen) {
                argsStr = text.substring(openParen + 1, closeParen);
            } else {
                argsStr = text.replace(/^LIRE\s+/i, '');
            }
            const vars = argsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
            return {
                type: 'LIRE',
                vars,
                lineNum
            };
        }

        // Affectation: x ← expr OR x <- expr OR x := expr
        let arrowIdx = text.indexOf('←');
        let opLen = 1;
        if (arrowIdx === -1) {
            arrowIdx = text.indexOf('<-');
            opLen = 2;
        }
        if (arrowIdx === -1) {
            arrowIdx = text.indexOf(':=');
            opLen = 2;
        }

        if (arrowIdx !== -1) {
            const targetVar = text.substring(0, arrowIdx).trim();
            const expr = text.substring(arrowIdx + opLen).trim();
            return {
                type: 'AFFECTATION',
                variable: targetVar,
                expression: expr,
                lineNum
            };
        }

        // Single word or unknown
        return {
            type: 'UNKNOWN',
            raw: text,
            lineNum
        };
    }

    // Execute the AST
    async execute(code, options = {}) {
        this.reset();
        this.isRunning = true;
        this.delayMs = options.delayMs || 0;
        const stepMode = options.stepMode || false;

        try {
            const lines = this.parse(code);
            const { algoName } = this.scanDeclarations(lines);
            const ast = this.buildAst(lines);

            this.onVariablesUpdate(new Map(this.variables));
            this.onPrint(`=== Exécution de l'algorithme : ${algoName} ===\n`, 'info');

            await this.executeStatements(ast, stepMode);

            if (!this.abortExecution) {
                this.onPrint(`\n=== Fin normale du programme. ===\n`, 'success');
            } else {
                this.onPrint(`\n[!] Exécution arrêtée par l'utilisateur.\n`, 'warning');
            }
        } catch (err) {
            this.onError(err.message);
            this.onPrint(`\n❌ ${err.message}\n`, 'error');
        } finally {
            this.isRunning = false;
            this.onFinish();
        }
    }

    async stepWait(lineNum, stepMode) {
        if (this.abortExecution) return;

        this.onHighlight(lineNum);
        this.onStep(lineNum, this.getVariablesSnapshot());

        const isBreakpoint = this.breakpoints.has(lineNum);

        if (stepMode || isBreakpoint) {
            this.isPaused = true;
            await new Promise(resolve => {
                this.stepResolve = resolve;
            });
        } else if (this.delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, this.delayMs));
        }
    }

    async executeStatements(statements, stepMode) {
        for (const stmt of statements) {
            if (this.abortExecution) break;
            await this.executeNode(stmt, stepMode);
        }
    }

    async executeNode(node, stepMode) {
        if (this.abortExecution) return;

        await this.stepWait(node.lineNum, stepMode);
        if (this.abortExecution) return;

        switch (node.type) {
            case 'ECRIRE': {
                let output = "";
                for (let i = 0; i < node.args.length; i++) {
                    const argExpr = node.args[i];
                    const val = this.evalExpression(argExpr, node.lineNum);
                    output += (val !== undefined && val !== null ? val : "");
                }
                this.onPrint(output + "\n", 'stdout');
                break;
            }

            case 'LIRE': {
                for (const vName of node.vars) {
                    if (this.abortExecution) break;
                    let vData = null;
                    for (const [name, data] of this.variables.entries()) {
                        if (name.toLowerCase() === vName.toLowerCase()) {
                            vData = data;
                            break;
                        }
                    }
                    if (!vData) {
                        throw new Error(`Erreur ligne ${node.lineNum}: Variable '${vName}' inconnue pour la lecture LIRE.`);
                    }

                    // Request input from user
                    const inputStr = await this.onInput(vName, vData.type);
                    if (this.abortExecution) break;
                    this.validateAndCast(vName, inputStr, node.lineNum);
                }
                break;
            }

            case 'AFFECTATION': {
                const val = this.evalExpression(node.expression, node.lineNum);
                this.validateAndCast(node.variable, val, node.lineNum);
                break;
            }

            case 'SI': {
                const condVal = this.evalExpression(node.condition, node.lineNum);
                if (condVal) {
                    await this.executeStatements(node.thenBlock, stepMode);
                } else if (node.elseBlock && node.elseBlock.length > 0) {
                    await this.executeStatements(node.elseBlock, stepMode);
                }
                break;
            }

            case 'SELON': {
                const targetVal = this.evalExpression(node.expression, node.lineNum);
                let matched = false;

                for (const cas of node.cases) {
                    if (this.abortExecution) break;
                    // Check if targetVal matches any of cas.values
                    for (const vStr of cas.values) {
                        const casVal = this.evalExpression(vStr, cas.lineNum);
                        if (casVal == targetVal) {
                            matched = true;
                            await this.executeStatements(cas.statements, stepMode);
                            break;
                        }
                    }
                    if (matched) break;
                }

                if (!matched && node.defaultCase) {
                    await this.executeStatements(node.defaultCase.statements, stepMode);
                }
                break;
            }

            case 'POUR': {
                const startVal = this.evalExpression(node.startExpr, node.lineNum);
                const endVal = this.evalExpression(node.endExpr, node.lineNum);
                const stepVal = this.evalExpression(node.stepExpr, node.lineNum) || 1;

                this.validateAndCast(node.iterator, startVal, node.lineNum);

                let current = startVal;
                const sign = stepVal > 0 ? 1 : -1;

                let safetyCounter = 0;
                while (sign > 0 ? current <= endVal : current >= endVal) {
                    if (this.abortExecution) break;
                    if (++safetyCounter > 100000) {
                        throw new Error(`Erreur ligne ${node.lineNum}: Boucle infinie détectée (> 100,000 itérations).`);
                    }

                    this.validateAndCast(node.iterator, current, node.lineNum);
                    await this.executeStatements(node.body, stepMode);

                    current += stepVal;
                    this.validateAndCast(node.iterator, current, node.lineNum);
                }
                break;
            }

            case 'TANT_QUE': {
                let safetyCounter = 0;
                while (this.evalExpression(node.condition, node.lineNum)) {
                    if (this.abortExecution) break;
                    if (++safetyCounter > 100000) {
                        throw new Error(`Erreur ligne ${node.lineNum}: Boucle infinie détectée (> 100,000 itérations).`);
                    }
                    await this.executeStatements(node.body, stepMode);
                }
                break;
            }

            case 'REPETER': {
                let safetyCounter = 0;
                do {
                    if (this.abortExecution) break;
                    if (++safetyCounter > 100000) {
                        throw new Error(`Erreur ligne ${node.lineNum}: Boucle infinie détectée (> 100,000 itérations).`);
                    }
                    await this.executeStatements(node.body, stepMode);

                    const condVal = this.evalExpression(node.condition, node.lineNum);
                    // Standard: repeat until condition is true (JUSQU'À condition == vrai stops)
                    // If isTantQueVariant: repeat while condition is true
                    if (node.isTantQueVariant) {
                        if (!condVal) break;
                    } else {
                        if (condVal) break;
                    }
                } while (true);
                break;
            }

            case 'UNKNOWN': {
                // If it's a blank or harmless word, ignore, else report warning
                if (node.raw.trim().length > 0) {
                    this.onPrint(`[Avertissement ligne ${node.lineNum}] Instruction non reconnue : "${node.raw}"\n`, 'warning');
                }
                break;
            }
        }
    }

    getVariablesSnapshot() {
        const snap = {};
        for (const [k, v] of this.variables.entries()) {
            snap[k] = { ...v };
        }
        return snap;
    }
}

// Export for Node and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlgorithmeInterpreter;
}
