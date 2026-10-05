/**
 * Algorithme Studio - Traducteur Automatique
 * Convertit le pseudo-code algorithmique en code Python 3 et C
 */

class AlgorithmeTranslator {
    static toPython(code) {
        const rawLines = code.split(/\r?\n/);
        let py = "# Traduction automatique depuis Algorithme (OFPPT) vers Python 3\n\n";
        let indentLevel = 0;
        let insideBody = false;

        const getIndent = () => "    ".repeat(indentLevel);

        for (let raw of rawLines) {
            let line = raw.trim();
            // preserve comments
            if (line.startsWith('//')) {
                py += getIndent() + "# " + line.substring(2).trim() + "\n";
                continue;
            }

            const commentIdx = line.indexOf('//');
            let inlineComment = "";
            if (commentIdx !== -1) {
                inlineComment = "  # " + line.substring(commentIdx + 2).trim();
                line = line.substring(0, commentIdx).trim();
            }

            if (!line) continue;

            const norm = line.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (norm.startsWith('ALGORITHME')) {
                const name = line.replace(/^ALGORITHME\s+/i, '').trim();
                py += `# Programme : ${name}\n\n`;
                continue;
            }

            if (norm.startsWith('VARIABLE') || norm.startsWith('VARIABLES') || norm.startsWith('VAR')) {
                // In python, variable declaration can be commented or type hinted
                py += `# Déclaration : ${line}\n`;
                continue;
            }

            if (norm.startsWith('CONSTANTE') || norm.startsWith('CONSTANTES')) {
                const constDecl = line.replace(/^CONSTANTES?\s+/i, '').trim();
                py += `${constDecl}\n`;
                continue;
            }

            if (norm === 'DEBUT' || norm === 'DÉBUT') {
                insideBody = true;
                py += "\ndef main():\n";
                indentLevel++;
                continue;
            }

            if (norm === 'FIN') {
                if (insideBody) {
                    indentLevel = Math.max(0, indentLevel - 1);
                    insideBody = false;
                }
                continue;
            }

            // Normalisations of expressions
            let expr = line
                .replace(/←|<-|:=/g, ' = ')
                .replace(/<>/g, ' != ')
                .replace(/\bET\b/gi, ' and ')
                .replace(/\bOU\b/gi, ' or ')
                .replace(/\bNON\b/gi, ' not ')
                .replace(/\bMOD\b/gi, ' % ')
                .replace(/\bDIV\b/gi, ' // ')
                .replace(/\bVRAI\b/gi, 'True')
                .replace(/\bFAUX\b/gi, 'False');

            // Structures
            // SI cond ALORS
            if (norm.startsWith('SI ') || norm.startsWith('SI(')) {
                let cond = expr.replace(/^si\s+/i, '').replace(/\salors$/i, '').trim();
                // Fix single = into ==
                cond = cond.replace(/(?<![=<>!])=(?![=])/g, '==');
                py += `${getIndent()}if ${cond}:${inlineComment}\n`;
                indentLevel++;
                continue;
            }

            if (norm === 'SINON') {
                indentLevel = Math.max(0, indentLevel - 1);
                py += `${getIndent()}else:${inlineComment}\n`;
                indentLevel++;
                continue;
            }

            if (norm.startsWith('SINON SI') || norm.startsWith('SINONSI')) {
                indentLevel = Math.max(0, indentLevel - 1);
                let cond = expr.replace(/^sinon\s*si\s+/i, '').replace(/\salors$/i, '').trim();
                cond = cond.replace(/(?<![=<>!])=(?![=])/g, '==');
                py += `${getIndent()}elif ${cond}:${inlineComment}\n`;
                indentLevel++;
                continue;
            }

            if (norm === 'FINSI' || norm === 'FIN SI') {
                indentLevel = Math.max(1, indentLevel - 1);
                continue;
            }

            // POUR i ← 1 À 10 [PAS p] FAIRE
            if (norm.startsWith('POUR ')) {
                const pourMatch = line.replace(/←|<-|:=/g, '<-')
                    .match(/pour\s+([a-zA-Z0-9_]+)\s*<-\s*(.+?)\s+(?:à|a)\s+(.+?)(?:\s+pas\s+(.+?))?\s+faire/i);
                if (pourMatch) {
                    const it = pourMatch[1].trim();
                    const st = pourMatch[2].trim();
                    const en = pourMatch[3].trim();
                    const sp = pourMatch[4] ? pourMatch[4].trim() : "1";
                    if (sp === "1") {
                        py += `${getIndent()}for ${it} in range(${st}, (${en}) + 1):${inlineComment}\n`;
                    } else {
                        py += `${getIndent()}for ${it} in range(${st}, (${en}) + 1, ${sp}):${inlineComment}\n`;
                    }
                    indentLevel++;
                    continue;
                }
            }

            if (norm === 'FINPOUR' || norm === 'FIN POUR') {
                indentLevel = Math.max(1, indentLevel - 1);
                continue;
            }

            // TANT QUE cond FAIRE
            if (norm.startsWith('TANT QUE ') || norm.startsWith('TANTQUE ')) {
                let cond = expr.replace(/^tant\s*que\s+/i, '').replace(/\sfaire$/i, '').trim();
                cond = cond.replace(/(?<![=<>!])=(?![=])/g, '==');
                py += `${getIndent()}while ${cond}:${inlineComment}\n`;
                indentLevel++;
                continue;
            }

            if (norm === 'FINTANTQUE' || norm === 'FIN TANT QUE' || norm === 'FIN TANTQUE') {
                indentLevel = Math.max(1, indentLevel - 1);
                continue;
            }

            // REPETER
            if (norm === 'REPETER' || norm === 'RÉPÉTER') {
                py += `${getIndent()}while True:${inlineComment}\n`;
                indentLevel++;
                continue;
            }

            // JUSQU'A cond
            if (norm.startsWith("JUSQU'A") || norm.startsWith("JUSQUA")) {
                let cond = expr.replace(/^jusqu(?:'|’)?(?:à|a)\s+/i, '').trim();
                cond = cond.replace(/(?<![=<>!])=(?![=])/g, '==');
                py += `${getIndent()}if ${cond}:\n${getIndent()}    break\n`;
                indentLevel = Math.max(1, indentLevel - 1);
                continue;
            }

            // SELON var FAIRE
            if (norm.startsWith('SELON ')) {
                const selMatch = line.match(/selon\s+(.+?)\s+faire/i);
                if (selMatch) {
                    const selVar = selMatch[1].trim();
                    py += `${getIndent()}match ${selVar}:${inlineComment}\n`;
                    indentLevel++;
                    continue;
                }
            }

            if (norm.startsWith('CAS AUTRE') || norm.startsWith('DEFAUT')) {
                py += `${getIndent()}case _:${inlineComment}\n`;
                indentLevel++;
                continue;
            }

            if (norm.startsWith('CAS ')) {
                const casMatch = line.match(/cas\s+([^:]+):?(.*)/i);
                if (casMatch) {
                    const val = casMatch[1].trim();
                    py += `${getIndent()}case ${val}:${inlineComment}\n`;
                    indentLevel++;
                    if (casMatch[2] && casMatch[2].trim()) {
                        py += `${getIndent()}    ${casMatch[2].trim()}\n`;
                    }
                    continue;
                }
            }

            if (norm === 'FINSELON' || norm === 'FIN SELON') {
                indentLevel = Math.max(1, indentLevel - 2);
                continue;
            }

            // ECRIRE(...)
            if (norm.startsWith('ECRIRE') || norm.startsWith('ÉCRIRE') || norm.startsWith('AFFICHER')) {
                const p1 = expr.indexOf('(');
                const p2 = expr.lastIndexOf(')');
                let content = "";
                if (p1 !== -1 && p2 !== -1) {
                    content = expr.substring(p1 + 1, p2);
                } else {
                    content = expr.replace(/^(?:ÉCRIRE|ECRIRE|AFFICHER)\s+/i, '');
                }
                py += `${getIndent()}print(${content})${inlineComment}\n`;
                continue;
            }

            // LIRE(...)
            if (norm.startsWith('LIRE')) {
                const p1 = expr.indexOf('(');
                const p2 = expr.lastIndexOf(')');
                let vNames = [];
                if (p1 !== -1 && p2 !== -1) {
                    vNames = expr.substring(p1 + 1, p2).split(',').map(s => s.trim());
                } else {
                    vNames = expr.replace(/^LIRE\s+/i, '').split(',').map(s => s.trim());
                }
                for (let v of vNames) {
                    py += `${getIndent()}${v} = input(f"Entrez {v} : ")${inlineComment}\n`;
                }
                continue;
            }

            // Affectation: x = expr
            py += `${getIndent()}${expr}${inlineComment}\n`;
        }

        py += "\nif __name__ == '__main__':\n    main()\n";
        return py;
    }

    static toC(code) {
        const rawLines = code.split(/\r?\n/);
        let cCode = "/* Traduction automatique vers Langage C */\n#include <stdio.h>\n#include <stdbool.h>\n\n";
        let indentLevel = 1;
        let insideBody = false;
        let cBody = "";
        let varDecls = "";

        const getIndent = () => "    ".repeat(indentLevel);

        for (let raw of rawLines) {
            let line = raw.trim();
            if (line.startsWith('//')) {
                cBody += getIndent() + "// " + line.substring(2).trim() + "\n";
                continue;
            }
            if (!line) continue;

            const norm = line.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (norm.startsWith('VARIABLE') || norm.startsWith('VARIABLES')) {
                const withoutKw = line.replace(/^VARIABLES?\s+/i, '').trim();
                const colon = withoutKw.indexOf(':');
                if (colon !== -1) {
                    const vars = withoutKw.substring(0, colon).trim();
                    const typeRaw = withoutKw.substring(colon + 1).trim().toUpperCase();
                    let cType = "int";
                    if (typeRaw.includes('REEL') || typeRaw.includes('FLOAT') || typeRaw.includes('DOUBLE')) cType = "double";
                    else if (typeRaw.includes('CHAINE') || typeRaw.includes('STRING')) cType = "char*";
                    else if (typeRaw.includes('CARACT')) cType = "char";
                    else if (typeRaw.includes('BOOL')) cType = "bool";

                    varDecls += `    ${cType} ${vars};\n`;
                }
                continue;
            }

            if (norm === 'DEBUT' || norm === 'DÉBUT') {
                insideBody = true;
                continue;
            }

            if (norm === 'FIN') {
                continue;
            }

            let expr = line
                .replace(/←|<-|:=/g, ' = ')
                .replace(/<>/g, ' != ')
                .replace(/\bET\b/gi, ' && ')
                .replace(/\bOU\b/gi, ' || ')
                .replace(/\bNON\b/gi, ' ! ')
                .replace(/\bMOD\b/gi, ' % ')
                .replace(/\bVRAI\b/gi, 'true')
                .replace(/\bFAUX\b/gi, 'false');

            if (norm.startsWith('SI ') || norm.startsWith('SI(')) {
                let cond = expr.replace(/^si\s+/i, '').replace(/\salors$/i, '').trim();
                cBody += `${getIndent()}if (${cond}) {\n`;
                indentLevel++;
                continue;
            }

            if (norm === 'SINON') {
                indentLevel = Math.max(1, indentLevel - 1);
                cBody += `${getIndent()}} else {\n`;
                indentLevel++;
                continue;
            }

            if (norm === 'FINSI' || norm === 'FIN SI') {
                indentLevel = Math.max(1, indentLevel - 1);
                cBody += `${getIndent()}}\n`;
                continue;
            }

            if (norm.startsWith('POUR ')) {
                const pourMatch = line.replace(/←|<-|:=/g, '<-')
                    .match(/pour\s+([a-zA-Z0-9_]+)\s*<-\s*(.+?)\s+(?:à|a)\s+(.+?)(?:\s+pas\s+(.+?))?\s+faire/i);
                if (pourMatch) {
                    const it = pourMatch[1].trim();
                    const st = pourMatch[2].trim();
                    const en = pourMatch[3].trim();
                    const sp = pourMatch[4] ? pourMatch[4].trim() : "1";
                    cBody += `${getIndent()}for (${it} = ${st}; ${it} <= ${en}; ${it} += ${sp}) {\n`;
                    indentLevel++;
                    continue;
                }
            }

            if (norm === 'FINPOUR' || norm === 'FIN POUR') {
                indentLevel = Math.max(1, indentLevel - 1);
                cBody += `${getIndent()}}\n`;
                continue;
            }

            if (norm.startsWith('TANT QUE ') || norm.startsWith('TANTQUE ')) {
                let cond = expr.replace(/^tant\s*que\s+/i, '').replace(/\sfaire$/i, '').trim();
                cBody += `${getIndent()}while (${cond}) {\n`;
                indentLevel++;
                continue;
            }

            if (norm === 'FINTANTQUE' || norm === 'FIN TANT QUE' || norm === 'FIN TANTQUE') {
                indentLevel = Math.max(1, indentLevel - 1);
                cBody += `${getIndent()}}\n`;
                continue;
            }

            if (norm.startsWith('ECRIRE') || norm.startsWith('ÉCRIRE')) {
                cBody += `${getIndent()}printf("%s\\n", /* ... */);\n`;
                continue;
            }

            if (norm.startsWith('LIRE')) {
                cBody += `${getIndent()}scanf(/* ... */);\n`;
                continue;
            }

            cBody += `${getIndent()}${expr};\n`;
        }

        return cCode + "int main() {\n" + varDecls + (varDecls ? "\n" : "") + cBody + "    return 0;\n}\n";
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AlgorithmeTranslator;
}
