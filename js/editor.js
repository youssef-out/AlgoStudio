/**
 * Algorithme Studio - Éditeur de code avec IntelliSense (Autocomplétion dès la 1ère lettre)
 * Supporte Monaco Editor (moteur natif de Visual Studio Code) et un Fallback complet.
 */

class CodeEditorManager {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.onChange = options.onChange || (() => {});
        this.onCursorChange = options.onCursorChange || (() => {});
        this.onToggleBreakpoint = options.onToggleBreakpoint || (() => {});
        
        this.editor = null;
        this.isMonaco = false;
        this.breakpoints = new Set();
        this.currentHighlightLine = null;
        this.monacoDecorations = [];

        // IntelliSense Dictionary for Algorithme Français (OFPPT)
        this.suggestionsData = [
            {
                label: 'ALGORITHME',
                detail: 'Structure complète d\'un algorithme',
                kind: 'Class',
                insertText: 'ALGORITHME ${1:MonProgramme}\nVARIABLE ${2:x} : ${3:entier}\nDÉBUT\n    $0\nFIN',
                plainText: 'ALGORITHME MonProgramme\nVARIABLE x : entier\nDÉBUT\n    \nFIN'
            },
            {
                label: 'VARIABLE',
                detail: 'Déclaration de variable (entier, réel, chaîne...)',
                kind: 'Variable',
                insertText: 'VARIABLE ${1:nom} : ${2:entier}',
                plainText: 'VARIABLE x : entier'
            },
            {
                label: 'VARIABLES',
                detail: 'Déclarer plusieurs variables',
                kind: 'Variable',
                insertText: 'VARIABLES ${1:a, b} : ${2:entier}',
                plainText: 'VARIABLES a, b : entier'
            },
            {
                label: 'CONSTANTE',
                detail: 'Déclaration de constante (ex: PI = 3.14)',
                kind: 'Constant',
                insertText: 'CONSTANTE ${1:PI} = ${2:3.14}',
                plainText: 'CONSTANTE PI = 3.14'
            },
            {
                label: 'DÉBUT',
                detail: 'Début du bloc d\'instructions',
                kind: 'Keyword',
                insertText: 'DÉBUT\n    $0\nFIN',
                plainText: 'DÉBUT\n    \nFIN'
            },
            {
                label: 'DEBUT',
                detail: 'Début du bloc d\'instructions (sans accent)',
                kind: 'Keyword',
                insertText: 'DEBUT\n    $0\nFIN',
                plainText: 'DEBUT\n    \nFIN'
            },
            {
                label: 'FIN',
                detail: 'Fin de l\'algorithme',
                kind: 'Keyword',
                insertText: 'FIN',
                plainText: 'FIN'
            },
            {
                label: 'SI',
                detail: 'Condition SI ... ALORS ... FINSI',
                kind: 'Snippet',
                insertText: 'SI ${1:condition} ALORS\n    $0\nFINSI',
                plainText: 'SI condition ALORS\n    \nFINSI'
            },
            {
                label: 'SI SINON',
                detail: 'Condition SI ... ALORS ... SINON ... FINSI',
                kind: 'Snippet',
                insertText: 'SI ${1:condition} ALORS\n    ${2:// vrai}\nSINON\n    $0\nFINSI',
                plainText: 'SI condition ALORS\n    \nSINON\n    \nFINSI'
            },
            {
                label: 'SINON',
                detail: 'Branche alternative d\'une condition',
                kind: 'Keyword',
                insertText: 'SINON\n    $0',
                plainText: 'SINON\n    '
            },
            {
                label: 'FINSI',
                detail: 'Fermeture de la condition SI',
                kind: 'Keyword',
                insertText: 'FINSI',
                plainText: 'FINSI'
            },
            {
                label: 'POUR',
                detail: 'Boucle POUR variable ← début À fin FAIRE',
                kind: 'Snippet',
                insertText: 'POUR ${1:i} ← ${2:1} À ${3:10} FAIRE\n    $0\nFINPOUR',
                plainText: 'POUR i ← 1 À 10 FAIRE\n    \nFINPOUR'
            },
            {
                label: 'FINPOUR',
                detail: 'Fin de la boucle POUR',
                kind: 'Keyword',
                insertText: 'FINPOUR',
                plainText: 'FINPOUR'
            },
            {
                label: 'TANT QUE',
                detail: 'Boucle TANT QUE condition FAIRE',
                kind: 'Snippet',
                insertText: 'TANT QUE ${1:condition} FAIRE\n    $0\nFINTANTQUE',
                plainText: 'TANT QUE condition FAIRE\n    \nFINTANTQUE'
            },
            {
                label: 'FINTANTQUE',
                detail: 'Fin de la boucle TANT QUE',
                kind: 'Keyword',
                insertText: 'FINTANTQUE',
                plainText: 'FINTANTQUE'
            },
            {
                label: 'RÉPÉTER',
                detail: 'Boucle RÉPÉTER ... JUSQU\'À condition',
                kind: 'Snippet',
                insertText: 'RÉPÉTER\n    $0\nJUSQU\'À ${1:condition}',
                plainText: 'RÉPÉTER\n    \nJUSQU\'À condition'
            },
            {
                label: 'REPETER',
                detail: 'Boucle REPETER ... JUSQU\'A (sans accent)',
                kind: 'Snippet',
                insertText: 'REPETER\n    $0\nJUSQUA ${1:condition}',
                plainText: 'REPETER\n    \nJUSQUA condition'
            },
            {
                label: 'JUSQU\'À',
                detail: 'Condition d\'arrêt de RÉPÉTER',
                kind: 'Keyword',
                insertText: 'JUSQU\'À ${1:condition}',
                plainText: 'JUSQU\'À '
            },
            {
                label: 'SELON',
                detail: 'Structure à choix multiples SELON ... CAS',
                kind: 'Snippet',
                insertText: 'SELON ${1:variable} FAIRE\n    CAS 1 : \n        $0\n    CAS AUTRE : \n        \nFINSELON',
                plainText: 'SELON variable FAIRE\n    CAS 1 : \n        \n    CAS AUTRE : \n        \nFINSELON'
            },
            {
                label: 'CAS',
                detail: 'Cas de la structure SELON',
                kind: 'Keyword',
                insertText: 'CAS ${1:1} : $0',
                plainText: 'CAS 1 : '
            },
            {
                label: 'CAS AUTRE',
                detail: 'Cas par défaut de la structure SELON',
                kind: 'Keyword',
                insertText: 'CAS AUTRE : $0',
                plainText: 'CAS AUTRE : '
            },
            {
                label: 'FINSELON',
                detail: 'Fin de la structure SELON',
                kind: 'Keyword',
                insertText: 'FINSELON',
                plainText: 'FINSELON'
            },
            {
                label: 'ÉCRIRE',
                detail: 'Afficher du texte ou des variables à l\'écran',
                kind: 'Function',
                insertText: 'ÉCRIRE(${1:"Bonjour"})',
                plainText: 'ÉCRIRE("")'
            },
            {
                label: 'ECRIRE',
                detail: 'Afficher à l\'écran (sans accent)',
                kind: 'Function',
                insertText: 'ECRIRE(${1:"Bonjour"})',
                plainText: 'ECRIRE("")'
            },
            {
                label: 'LIRE',
                detail: 'Lire une valeur depuis le clavier',
                kind: 'Function',
                insertText: 'LIRE(${1:variable})',
                plainText: 'LIRE()'
            },
            {
                label: 'AFFICHER',
                detail: 'Afficher à l\'écran',
                kind: 'Function',
                insertText: 'AFFICHER(${1:"texte"})',
                plainText: 'AFFICHER("")'
            },
            {
                label: 'entier',
                detail: 'Type de base : ensemble des entiers relatifs',
                kind: 'TypeParameter',
                insertText: 'entier',
                plainText: 'entier'
            },
            {
                label: 'réel',
                detail: 'Type de base : ensemble des nombres réels',
                kind: 'TypeParameter',
                insertText: 'réel',
                plainText: 'réel'
            },
            {
                label: 'chaîne',
                detail: 'Type de base : chaîne de caractères',
                kind: 'TypeParameter',
                insertText: 'chaîne',
                plainText: 'chaîne'
            },
            {
                label: 'caractère',
                detail: 'Type de base : caractère alphanumérique unique',
                kind: 'TypeParameter',
                insertText: 'caractère',
                plainText: 'caractère'
            },
            {
                label: 'booléen',
                detail: 'Type de base : vrai ou faux',
                kind: 'TypeParameter',
                insertText: 'booléen',
                plainText: 'booléen'
            },
            {
                label: 'vrai',
                detail: 'Constante booléenne VRAI',
                kind: 'Value',
                insertText: 'vrai',
                plainText: 'vrai'
            },
            {
                label: 'faux',
                detail: 'Constante booléenne FAUX',
                kind: 'Value',
                insertText: 'faux',
                plainText: 'faux'
            },
            {
                label: 'mod',
                detail: 'Reste de la division entière (ex: 10 mod 3 = 1)',
                kind: 'Operator',
                insertText: 'mod ',
                plainText: 'mod '
            },
            {
                label: 'div',
                detail: 'Quotient de la division entière (ex: 10 div 3 = 3)',
                kind: 'Operator',
                insertText: 'div ',
                plainText: 'div '
            },
            {
                label: 'ET',
                detail: 'Opérateur logique ET',
                kind: 'Operator',
                insertText: 'ET ',
                plainText: 'ET '
            },
            {
                label: 'OU',
                detail: 'Opérateur logique OU',
                kind: 'Operator',
                insertText: 'OU ',
                plainText: 'OU '
            },
            {
                label: 'NON',
                detail: 'Opérateur logique NON',
                kind: 'Operator',
                insertText: 'NON ',
                plainText: 'NON '
            },
            {
                label: '←',
                detail: 'Opérateur d\'affectation (variable ← valeur)',
                kind: 'Operator',
                insertText: ' ← ',
                plainText: ' ← '
            },
            {
                label: 'affectation',
                detail: 'Insérer la flèche d\'affectation (←)',
                kind: 'Operator',
                insertText: ' ← ',
                plainText: ' ← '
            }
        ];
    }

    async init() {
        if (window.monaco) {
            this.setupMonaco();
            return;
        }

        if (window.require && typeof window.require === 'function') {
            try {
                await new Promise((resolve, reject) => {
                    window.require.config({
                        paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }
                    });
                    window.require(['vs/editor/editor.main'], () => {
                        this.setupMonaco();
                        resolve();
                    }, reject);
                    setTimeout(() => {
                        if (!this.isMonaco) reject(new Error("Timeout Monaco"));
                    }, 3500);
                });
                return;
            } catch (err) {
                console.warn("Monaco indisponible, passage au fallback avec IntelliSense :", err);
            }
        }

        this.setupFallback();
    }

    setupMonaco() {
        try {
            // Register language
            monaco.languages.register({ id: 'algorithme' });

            // Monarch syntax highlighter
            monaco.languages.setMonarchTokensProvider('algorithme', {
                keywords: [
                    'ALGORITHME', 'DEBUT', 'DÉBUT', 'FIN',
                    'VARIABLE', 'VARIABLES', 'CONSTANTE', 'CONSTANTES',
                    'SI', 'ALORS', 'SINON', 'FINSI',
                    'SELON', 'CAS', 'FINSELON', 'AUTRE',
                    'POUR', 'À', 'A', 'PAS', 'FAIRE', 'FINPOUR',
                    'TANT', 'QUE', 'TANT QUE', 'FINTANTQUE',
                    'REPETER', 'RÉPÉTER', 'JUSQU\'À', 'JUSQUA',
                    'ET', 'OU', 'NON', 'VRAI', 'FAUX', 'MOD', 'DIV'
                ],
                types: ['entier', 'réel', 'reel', 'chaîne', 'chaine', 'caractère', 'caractere', 'booléen', 'booleen'],
                io: ['LIRE', 'ÉCRIRE', 'ECRIRE', 'AFFICHER'],
                tokenizer: {
                    root: [
                        [/\/\/.*$/, 'comment'],
                        [/←|<-|:=/, 'delimiter'],
                        [/"([^"\\]|\\.)*"/, 'string'],
                        [/'([^'\\]|\\.)*'/, 'string'],
                        [/\b\d+(\.\d+)?\b/, 'number'],
                        [/[a-zA-Z_\u00C0-\u017F][a-zA-Z0-9_\u00C0-\u017F]*/, {
                            cases: {
                                '@keywords': 'keyword',
                                '@types': 'type',
                                '@io': 'tag',
                                '@default': 'identifier'
                            }
                        }],
                        [/[=><!+\-*/%^]/, 'operator'],
                        [/[()[\],.:]/, 'delimiter']
                    ]
                }
            });

            // IntelliSense Autocompletion dès le 1er caractère
            const triggerLetters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZéàèù'.split('');
            monaco.languages.registerCompletionItemProvider('algorithme', {
                triggerCharacters: triggerLetters,
                provideCompletionItems: (model, position) => {
                    const word = model.getWordUntilPosition(position);
                    const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endColumn: word.endColumn
                    };

                    const suggestions = this.suggestionsData.map(item => {
                        let k = monaco.languages.CompletionItemKind.Snippet;
                        if (item.kind === 'Keyword') k = monaco.languages.CompletionItemKind.Keyword;
                        if (item.kind === 'Function') k = monaco.languages.CompletionItemKind.Function;
                        if (item.kind === 'Variable') k = monaco.languages.CompletionItemKind.Variable;
                        if (item.kind === 'TypeParameter') k = monaco.languages.CompletionItemKind.TypeParameter;
                        if (item.kind === 'Operator') k = monaco.languages.CompletionItemKind.Operator;

                        return {
                            label: item.label,
                            kind: k,
                            detail: item.detail,
                            insertText: item.insertText,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: range,
                            sortText: item.label
                        };
                    });

                    return { suggestions: suggestions };
                }
            });

            // Configuration exacte de VS Code avec suggestions automatiques instantanées
            this.editor = monaco.editor.create(this.container, {
                value: '',
                language: 'algorithme',
                theme: 'vs-dark',
                fontSize: 14,
                fontFamily: '"Consolas", "Courier New", monospace',
                tabSize: 4,
                insertSpaces: true,
                automaticLayout: true,
                glyphMargin: true,
                lineNumbers: 'on',
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                renderLineHighlight: 'all',
                // IntelliSense VS Code setup:
                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false
                },
                quickSuggestionsDelay: 10, // Affiche l'autocomplétion immédiatement après 10ms
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: "on",
                tabCompletion: "on",
                snippetSuggestions: "top",
                wordBasedSuggestions: true
            });

            this.isMonaco = true;

            this.editor.onDidChangeModelContent(() => {
                this.onChange(this.getValue());
            });

            this.editor.onDidChangeCursorPosition((e) => {
                this.onCursorChange(e.position.lineNumber, e.position.column);
            });

            this.editor.onMouseDown((e) => {
                if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
                    const line = e.target.position.lineNumber;
                    this.toggleBreakpoint(line);
                }
            });

        } catch (err) {
            console.error("Erreur configuration Monaco:", err);
            this.setupFallback();
        }
    }

    setupFallback() {
        this.isMonaco = false;
        this.container.innerHTML = `
            <div class="custom-editor-container" style="position: relative;">
                <div class="editor-gutter" id="fallback-gutter"></div>
                <div class="editor-textarea-wrapper">
                    <div class="executing-line-overlay" id="fallback-overlay"></div>
                    <textarea class="editor-textarea" id="fallback-textarea" spellcheck="false" placeholder="Écrivez votre algorithme ici..."></textarea>
                    
                    <!-- INTELLISENSE POPUP WIDGET (comme VS Code) -->
                    <div id="intellisense-popup" class="intellisense-widget" style="display: none;">
                        <ul id="intellisense-list" class="intellisense-list"></ul>
                        <div id="intellisense-doc" class="intellisense-doc"></div>
                    </div>
                </div>
            </div>
        `;

        this.textarea = document.getElementById('fallback-textarea');
        this.gutter = document.getElementById('fallback-gutter');
        this.overlay = document.getElementById('fallback-overlay');
        this.popup = document.getElementById('intellisense-popup');
        this.popupList = document.getElementById('intellisense-list');
        this.popupDoc = document.getElementById('intellisense-doc');

        this.selectedIndex = 0;
        this.filteredMatches = [];

        this.textarea.addEventListener('input', () => {
            this.updateGutter();
            this.onChange(this.getValue());
            this.triggerFallbackIntelliSense();
        });

        this.textarea.addEventListener('keydown', (e) => {
            // If IntelliSense popup is visible, intercept navigation
            if (this.popup && this.popup.style.display !== 'none') {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.selectedIndex = (this.selectedIndex + 1) % this.filteredMatches.length;
                    this.renderIntelliSenseList();
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.selectedIndex = (this.selectedIndex - 1 + this.filteredMatches.length) % this.filteredMatches.length;
                    this.renderIntelliSenseList();
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    this.acceptCurrentIntelliSense();
                    return;
                }
                if (e.key === 'Escape') {
                    this.popup.style.display = 'none';
                    return;
                }
            }

            // Normal Tab indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.textarea.selectionStart;
                const end = this.textarea.selectionEnd;
                const val = this.textarea.value;
                this.textarea.value = val.substring(0, start) + "    " + val.substring(end);
                this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
                this.onChange(this.getValue());
            }
        });

        this.textarea.addEventListener('click', () => {
            if (this.popup) this.popup.style.display = 'none';
            this.updateCursorPos();
        });
        this.textarea.addEventListener('keyup', () => {
            this.updateCursorPos();
        });

        this.updateGutter();
    }

    triggerFallbackIntelliSense() {
        if (!this.textarea || !this.popup) return;
        const cursorPos = this.textarea.selectionStart;
        const textBefore = this.textarea.value.substring(0, cursorPos);
        const match = textBefore.match(/([a-zA-Z_\u00C0-\u017F]+)$/);

        if (!match || match[1].length < 1) {
            this.popup.style.display = 'none';
            return;
        }

        const query = match[1].toLowerCase();
        this.currentQuery = match[1];

        this.filteredMatches = this.suggestionsData.filter(item => {
            const labelNorm = item.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const queryNorm = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return labelNorm.startsWith(queryNorm);
        });

        if (this.filteredMatches.length === 0) {
            this.popup.style.display = 'none';
            return;
        }

        this.selectedIndex = 0;
        this.renderIntelliSenseList();

        // Position popup near cursor line
        const lines = textBefore.split("\n");
        const lineNum = lines.length;
        const colNum = lines[lines.length - 1].length;
        const top = Math.min(this.textarea.clientHeight - 180, Math.max(10, (lineNum * 22) + 10));
        const left = Math.min(this.textarea.clientWidth - 280, Math.max(20, (colNum * 8) + 10));

        this.popup.style.top = `${top}px`;
        this.popup.style.left = `${left}px`;
        this.popup.style.display = 'flex';
    }

    renderIntelliSenseList() {
        this.popupList.innerHTML = '';
        this.filteredMatches.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = `intellisense-item ${idx === this.selectedIndex ? 'active' : ''}`;
            let icon = '⚡';
            if (item.kind === 'Function') icon = '🟣';
            if (item.kind === 'Variable') icon = '🔵';
            if (item.kind === 'Keyword') icon = '🔷';
            if (item.kind === 'TypeParameter') icon = '🟢';

            li.innerHTML = `<span class="item-icon">${icon}</span> <span class="item-label">${item.label}</span>`;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.selectedIndex = idx;
                this.acceptCurrentIntelliSense();
            });
            this.popupList.appendChild(li);
        });

        if (this.filteredMatches[this.selectedIndex]) {
            this.popupDoc.textContent = this.filteredMatches[this.selectedIndex].detail;
        }
    }

    acceptCurrentIntelliSense() {
        if (!this.filteredMatches || this.filteredMatches.length === 0) return;
        const item = this.filteredMatches[this.selectedIndex];
        if (!item) return;

        const cursorPos = this.textarea.selectionStart;
        const val = this.textarea.value;
        const queryLen = this.currentQuery.length;

        const before = val.substring(0, cursorPos - queryLen);
        const after = val.substring(cursorPos);
        const insertion = item.plainText;

        this.textarea.value = before + insertion + after;
        this.textarea.selectionStart = this.textarea.selectionEnd = before.length + insertion.length;
        this.textarea.focus();

        this.popup.style.display = 'none';
        this.updateGutter();
        this.onChange(this.getValue());
    }

    updateCursorPos() {
        const text = this.textarea.value.substring(0, this.textarea.selectionStart);
        const lines = text.split("\n");
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        this.onCursorChange(line, col);
    }

    updateGutter() {
        if (this.isMonaco || !this.gutter) return;
        const lineCount = (this.textarea.value.split('\n')).length;
        let html = '';
        for (let i = 1; i <= lineCount; i++) {
            const bp = this.breakpoints.has(i) ? ' has-breakpoint' : '';
            const act = this.currentHighlightLine === i ? ' active-step' : '';
            html += `<div class="gutter-line${bp}${act}" data-line="${i}">${i}</div>`;
        }
        this.gutter.innerHTML = html;

        this.gutter.querySelectorAll('.gutter-line').forEach(el => {
            el.addEventListener('click', () => {
                const line = parseInt(el.getAttribute('data-line'), 10);
                this.toggleBreakpoint(line);
            });
        });
    }

    toggleBreakpoint(lineNum) {
        if (this.breakpoints.has(lineNum)) {
            this.breakpoints.delete(lineNum);
        } else {
            this.breakpoints.add(lineNum);
        }
        this.refreshBreakpoints();
        this.onToggleBreakpoint(Array.from(this.breakpoints));
    }

    refreshBreakpoints() {
        if (this.isMonaco) {
            const decorations = [];
            for (const line of this.breakpoints) {
                decorations.push({
                    range: new monaco.Range(line, 1, line, 1),
                    options: {
                        isWholeLine: false,
                        glyphMarginClassName: 'monaco-glyph-breakpoint'
                    }
                });
            }
            this.monacoBpDecorations = this.editor.deltaDecorations(this.monacoBpDecorations || [], decorations);
        } else {
            this.updateGutter();
        }
    }

    highlightExecutionLine(lineNum) {
        this.currentHighlightLine = lineNum;
        if (this.isMonaco) {
            if (lineNum) {
                this.editor.revealLineInCenter(lineNum);
                this.monacoDecorations = this.editor.deltaDecorations(this.monacoDecorations, [
                    {
                        range: new monaco.Range(lineNum, 1, lineNum, 1),
                        options: {
                            isWholeLine: true,
                            className: 'monaco-executing-line',
                            glyphMarginClassName: 'monaco-glyph-executing'
                        }
                    }
                ]);
            } else {
                this.monacoDecorations = this.editor.deltaDecorations(this.monacoDecorations, []);
            }
        } else {
            if (lineNum && this.overlay) {
                const lineHeight = 22;
                const top = 10 + (lineNum - 1) * lineHeight;
                this.overlay.style.top = `${top}px`;
                this.overlay.style.display = 'block';
                this.updateGutter();
            } else if (this.overlay) {
                this.overlay.style.display = 'none';
                this.updateGutter();
            }
        }
    }

    insertTextAtCursor(text) {
        if (this.isMonaco) {
            const selection = this.editor.getSelection();
            const op = { range: selection, text: text, forceMoveMarkers: true };
            this.editor.executeEdits("insert-snippet", [op]);
            this.editor.focus();
        } else {
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;
            const val = this.textarea.value;
            this.textarea.value = val.substring(0, start) + text + val.substring(end);
            this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
            this.textarea.focus();
            this.updateGutter();
            this.onChange(this.getValue());
        }
    }

    formatCode() {
        const val = this.getValue();
        const lines = val.split(/\r?\n/);
        let indent = 0;
        let formatted = [];

        for (let raw of lines) {
            let line = raw.trim();
            if (!line) {
                formatted.push("");
                continue;
            }

            const norm = line.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            if (norm === 'FIN' || norm === 'FINSI' || norm === 'FIN SI' ||
                norm === 'FINPOUR' || norm === 'FIN POUR' ||
                norm === 'FINTANTQUE' || norm === 'FIN TANT QUE' || norm === 'FIN TANTQUE' ||
                norm === 'FINSELON' || norm === 'FIN SELON' ||
                norm.startsWith('SINON') || norm.startsWith("JUSQU'A") || norm.startsWith("JUSQUA")) {
                indent = Math.max(0, indent - 1);
            }

            formatted.push("    ".repeat(indent) + line);

            if (norm === 'DEBUT' || norm === 'DÉBUT' ||
                norm.endsWith('ALORS') || norm === 'SINON' ||
                norm.endsWith('FAIRE') || norm === 'REPETER' || norm === 'RÉPÉTER') {
                indent++;
            }
        }

        this.setValue(formatted.join("\n"));
    }

    setValue(text) {
        if (this.isMonaco) {
            this.editor.setValue(text);
        } else if (this.textarea) {
            this.textarea.value = text;
            this.updateGutter();
        }
        this.onChange(text);
    }

    getValue() {
        if (this.isMonaco) {
            return this.editor.getValue();
        } else {
            return this.textarea ? this.textarea.value : "";
        }
    }
}
