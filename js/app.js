/**
 * AlgoStudio - Gestion des Onglets (Tabs), Écran d'accueil & Fichiers récents
 */

document.addEventListener('DOMContentLoaded', async () => {
    // State
    let tabs = []; // [{ id, title, code, modifiedAt }]
    let activeTabId = null;
    let interpreter = null;
    let editorManager = null;
    let executionStartTime = 0;
    let pendingInputResolve = null;

    // Elements
    const welcomeScreen = document.getElementById('welcome-screen');
    const editorView = document.getElementById('editor-view');
    const consoleSection = document.getElementById('console-section');
    const tabsList = document.getElementById('tabs-list');
    const recentList = document.getElementById('recent-list');
    const btnAddTab = document.getElementById('btn-add-tab');
    const btnHeaderNew = document.getElementById('btn-header-new');
    const btnWelcomeNew = document.getElementById('btn-welcome-new');
    const btnWelcomeOpen = document.getElementById('btn-welcome-open');
    const btnUpload = document.getElementById('btn-upload');
    const fileUploadInput = document.getElementById('file-upload-input');
    const btnSave = document.getElementById('btn-save');
    const btnRun = document.getElementById('btn-run');
    const btnStop = document.getElementById('btn-stop');
    const exampleSelect = document.getElementById('example-select');
    const btnClearConsole = document.getElementById('btn-clear-console');
    const btnClearRecent = document.getElementById('btn-clear-recent');
    const brandHomeBtn = document.getElementById('brand-home-btn');

    // Console Elements
    const consoleLogs = document.getElementById('console-logs');
    const consoleInputRow = document.getElementById('console-input-row');
    const consolePrompt = document.getElementById('console-prompt');
    const consoleInput = document.getElementById('console-input');
    const consoleBtnSubmit = document.getElementById('console-btn-submit');
    const statusDot = document.getElementById('status-dot');
    const runStatusText = document.getElementById('run-status-text');
    const execTimeBadge = document.getElementById('exec-time-badge');
    const editorStatusInfo = document.getElementById('editor-status-info');

    // 1. Initialiser l'Éditeur Monaco / Fallback
    editorManager = new CodeEditorManager('editor-container', {
        onChange: (newCode) => {
            const currentTab = getCurrentTab();
            if (currentTab) {
                currentTab.code = newCode;
                currentTab.modifiedAt = Date.now();
                // Si le nom du fichier est par défaut (ex: Algorithme_1.algo), le synchroniser avec 'ALGORITHME Nom'
                const match = newCode.match(/^\s*ALGORITHME\s+([a-zA-Z0-9_\u00C0-\u017F]+)/im);
                if (match && match[1] && currentTab.title.startsWith('Algorithme_')) {
                    currentTab.title = match[1] + '.algo';
                    renderTabs();
                }
                saveTabsState();
                updateRecentFile(currentTab.title, newCode);
            }
        },
        onCursorChange: (line, col) => {
            if (editorStatusInfo) {
                editorStatusInfo.textContent = `Ln ${line}, Col ${col}`;
            }
        },
        onToggleBreakpoint: (bps) => {
            if (interpreter) interpreter.setBreakpoints(bps);
        }
    });

    await editorManager.init();

    // 2. Initialiser l'Interpréteur
    interpreter = new AlgorithmeInterpreter({
        onPrint: (text, type = 'stdout') => {
            appendConsole(text, type);
        },
        onInput: async (varName, varType) => {
            return await promptConsoleInput(varName, varType);
        },
        onHighlight: (lineNum) => {
            editorManager.highlightExecutionLine(lineNum);
        },
        onError: (err) => {
            appendConsole(`\n✖ ${err}\n`, 'error');
            setRunStatus('error', 'Erreur');
        },
        onFinish: () => {
            const elapsed = ((performance.now() - executionStartTime) / 1000).toFixed(2);
            execTimeBadge.textContent = `${elapsed}s`;
            execTimeBadge.style.display = 'inline-block';
            appendConsole(`\n✔ Exécution terminée (${elapsed}s)\n`, 'success');

            btnRun.style.display = 'inline-flex';
            btnStop.style.display = 'none';
            setRunStatus('ready', 'Prêt');
            editorManager.highlightExecutionLine(null);
        }
    });

    // 3. Gestion des Onglets (Tabs)
    function getCurrentTab() {
        return tabs.find(t => t.id === activeTabId) || null;
    }

    function createNewTab(title = "Nouveau.algo", code = null) {
        if (!title.endsWith('.algo')) title += '.algo';
        const defaultCode = code !== null ? code : `ALGORITHME ${title.replace('.algo', '')}
VARIABLE x : entier
DÉBUT
    ÉCRIRE("Bienvenue dans votre algorithme !")
FIN`;

        const newTab = {
            id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            title: title,
            code: defaultCode,
            modifiedAt: Date.now()
        };

        tabs.push(newTab);
        saveTabsState();
        addRecentFile(newTab.title, newTab.code);
        switchTab(newTab.id);
        return newTab;
    }

    // Navigation & Routing (Évite tout flash ou clignotement)
    function navigateTo(route, params = {}) {
        if (route === 'home') {
            document.documentElement.className = 'route-home';
            try { history.replaceState(null, '', '#/home'); } catch(e) {}
            welcomeScreen.style.display = 'flex';
            editorView.style.display = 'none';
            if (consoleSection) consoleSection.style.display = 'none';
            if (editorStatusInfo) editorStatusInfo.style.display = 'none';
            btnSave.style.display = 'none';
            btnRun.style.display = 'none';
            btnStop.style.display = 'none';
            renderRecentFiles();
        } else if (route === 'editor') {
            document.documentElement.className = 'route-editor';
            const tabTitle = params.tabTitle || 'file';
            try { history.replaceState(null, '', `#/file/${encodeURIComponent(tabTitle)}`); } catch(e) {}
            welcomeScreen.style.display = 'none';
            editorView.style.display = 'flex';
            if (consoleSection) consoleSection.style.display = 'flex';
            if (editorStatusInfo) editorStatusInfo.style.display = 'inline-block';
            btnSave.style.display = 'inline-flex';
            if (!interpreter || !interpreter.isRunning) {
                btnRun.style.display = 'inline-flex';
                btnStop.style.display = 'none';
            }
        }
    }

    function switchTab(id) {
        const targetTab = tabs.find(t => t.id === id);
        if (!targetTab) return;

        activeTabId = id;
        saveTabsState();

        // Mettre à jour la route et afficher l'éditeur sans aucun flash
        navigateTo('editor', { tabTitle: targetTab.title });
        editorManager.setValue(targetTab.code);
        renderTabs();
    }

    function closeTab(id, e) {
        if (e) e.stopPropagation();
        const tabIndex = tabs.findIndex(t => t.id === id);
        if (tabIndex === -1) return;

        tabs.splice(tabIndex, 1);
        saveTabsState();

        if (tabs.length === 0) {
            // Plus d'onglets ouverts -> retour à l'écran d'accueil
            activeTabId = null;
            navigateTo('home');
        } else {
            // Basculer vers l'onglet voisin
            const nextTab = tabs[Math.max(0, tabIndex - 1)];
            switchTab(nextTab.id);
        }
        renderTabs();
    }

    function renderTabs() {
        tabsList.innerHTML = '';
        tabs.forEach(tab => {
            const div = document.createElement('div');
            div.className = `tab-item ${tab.id === activeTabId ? 'active' : ''}`;
            div.title = `${tab.title} (Double-cliquez pour renommer)`;

            div.innerHTML = `
                <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="16 18 22 12 16 6"/>
                    <polyline points="8 6 2 12 8 18"/>
                </svg>
                <span class="tab-title-text">${tab.title}</span>
                <span class="tab-close" title="Fermer l'onglet">✕</span>
            `;

            div.addEventListener('click', () => switchTab(tab.id));
            div.querySelector('.tab-close').addEventListener('click', (e) => closeTab(tab.id, e));

            // Renommer directement avec un double-clic
            div.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const titleSpan = div.querySelector('.tab-title-text');
                const oldTitle = tab.title;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = oldTitle.replace('.algo', '');
                input.style.cssText = 'background: #111; color: #fff; border: 1px solid #3b82f6; border-radius: 3px; font-size: 12px; padding: 1px 4px; outline: none; width: 120px;';
                titleSpan.replaceWith(input);
                input.focus();
                input.select();

                const finish = () => {
                    let val = input.value.trim();
                    if (!val) val = oldTitle.replace('.algo', '');
                    if (!val.endsWith('.algo')) val += '.algo';
                    tab.title = val;
                    saveTabsState();
                    renderTabs();
                };

                input.addEventListener('blur', finish);
                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') finish();
                    if (ev.key === 'Escape') {
                        input.value = oldTitle;
                        finish();
                    }
                });
            });

            tabsList.appendChild(div);
        });
    }

    function saveTabsState() {
        try {
            localStorage.setItem('algo_open_tabs', JSON.stringify(tabs));
            localStorage.setItem('algo_active_tab_id', activeTabId || '');
        } catch (e) {}
    }

    function loadTabsState() {
        try {
            const saved = localStorage.getItem('algo_open_tabs');
            const savedActive = localStorage.getItem('algo_active_tab_id');
            if (saved) {
                tabs = JSON.parse(saved);
                if (tabs.length > 0) {
                    const toActivate = tabs.find(t => t.id === savedActive) ? savedActive : tabs[0].id;
                    switchTab(toActivate);
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }

    // 4. Gestion des Fichiers Récents (localStorage)
    function getRecentFiles() {
        try {
            return JSON.parse(localStorage.getItem('algo_recent_files') || '[]');
        } catch (e) {
            return [];
        }
    }

    function addRecentFile(title, code) {
        let recents = getRecentFiles();
        recents = recents.filter(f => f.title !== title);
        recents.unshift({
            title: title,
            code: code,
            modifiedAt: Date.now()
        });
        if (recents.length > 15) recents.pop();
        localStorage.setItem('algo_recent_files', JSON.stringify(recents));
        renderRecentFiles();
    }

    function updateRecentFile(title, code) {
        let recents = getRecentFiles();
        const found = recents.find(f => f.title === title);
        if (found) {
            found.code = code;
            found.modifiedAt = Date.now();
        } else {
            recents.unshift({ title, code, modifiedAt: Date.now() });
        }
        localStorage.setItem('algo_recent_files', JSON.stringify(recents));
    }

    function renderRecentFiles() {
        const recents = getRecentFiles();
        recentList.innerHTML = '';

        if (recents.length === 0) {
            recentList.innerHTML = '<div class="recent-empty">Aucun fichier récent enregistré.</div>';
            return;
        }

        recents.forEach(file => {
            const dateStr = new Date(file.modifiedAt).toLocaleString('fr-FR', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const item = document.createElement('div');
            item.className = 'recent-item';
            item.innerHTML = `
                <div class="recent-item-left">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#60a5fa" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span class="recent-file-name">${file.title}</span>
                </div>
                <span class="recent-file-date">${dateStr}</span>
            `;

            item.addEventListener('click', () => {
                // Check if already open
                const existing = tabs.find(t => t.title === file.title);
                if (existing) {
                    switchTab(existing.id);
                } else {
                    createNewTab(file.title, file.code);
                }
            });

            recentList.appendChild(item);
        });
    }

    if (btnClearRecent) {
        btnClearRecent.addEventListener('click', () => {
            localStorage.removeItem('algo_recent_files');
            renderRecentFiles();
        });
    }

    // 5. Console & Status
    function appendConsole(text, type = 'stdout') {
        const span = document.createElement('span');
        span.className = `log-${type}`;
        span.textContent = text;
        consoleLogs.appendChild(span);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }

    function clearConsole() {
        consoleLogs.innerHTML = '';
        consoleInputRow.style.display = 'none';
        execTimeBadge.style.display = 'none';
    }

    function setRunStatus(state, label) {
        if (!statusDot || !runStatusText) return;
        statusDot.className = `status-dot dot-${state}`;
        runStatusText.textContent = label;
    }

    function promptConsoleInput(varName, varType) {
        return new Promise((resolve) => {
            pendingInputResolve = resolve;
            consolePrompt.textContent = `LIRE(${varName}) [${varType}] :`;
            consoleInput.value = '';
            consoleInputRow.style.display = 'flex';
            consoleInput.focus();
            consoleLogs.scrollTop = consoleLogs.scrollHeight;
        });
    }

    function submitConsoleInput() {
        if (!pendingInputResolve) return;
        const val = consoleInput.value;
        const promptText = consolePrompt.textContent;
        consoleInputRow.style.display = 'none';

        appendConsole(`${promptText} `, 'info');
        appendConsole(`${val}\n`, 'success');

        const resolve = pendingInputResolve;
        pendingInputResolve = null;
        resolve(val);
    }

    consoleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitConsoleInput();
    });
    consoleBtnSubmit.addEventListener('click', submitConsoleInput);
    btnClearConsole.addEventListener('click', clearConsole);

    // 6. Sauvegarde avec boîte de dialogue système Windows (Save As)
    async function saveCurrentFileToDisk() {
        const currentTab = getCurrentTab();
        if (!currentTab) return;

        const code = editorManager.getValue();
        // Détecter le nom depuis 'ALGORITHME Nom' si possible
        const match = code.match(/ALGORITHME\s+([a-zA-Z0-9_]+)/i);
        let suggestedName = match ? match[1] + '.algo' : currentTab.title;
        if (!suggestedName.endsWith('.algo')) suggestedName += '.algo';

        let savedName = suggestedName;

        // Si le navigateur supporte l'API native Windows File System
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: suggestedName,
                    types: [{
                        description: 'Fichier Algorithme (*.algo)',
                        accept: { 'text/plain': ['.algo'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(code);
                await writable.close();
                savedName = handle.name;
                currentTab.title = savedName;
                saveTabsState();
                renderTabs();
                appendConsole(`\n[Info] Fichier enregistré sur votre appareil : ${savedName}\n`, 'info');
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; // Annulé par l'utilisateur
            }
        }

        // Fallback classique si File System API non disponible
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        appendConsole(`\n[Info] Fichier téléchargé : ${suggestedName}\n`, 'info');
    }

    btnSave.addEventListener('click', saveCurrentFileToDisk);

    // Créer un nouvel onglet sans prompt intrusif
    let newFileCounter = 1;
    const triggerNewTab = () => {
        let name = `Algorithme_${newFileCounter++}.algo`;
        // Vérifier si le nom existe déjà
        while (tabs.some(t => t.title === name)) {
            name = `Algorithme_${newFileCounter++}.algo`;
        }
        createNewTab(name);
    };

    btnAddTab.addEventListener('click', triggerNewTab);
    btnHeaderNew.addEventListener('click', triggerNewTab);
    btnWelcomeNew.addEventListener('click', triggerNewTab);

    // Ouvrir un fichier depuis le PC (.algo uniquement)
    const triggerUpload = async () => {
        if ('showOpenFilePicker' in window) {
            try {
                const [handle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'Fichier Algorithme (*.algo)',
                        accept: { 'text/plain': ['.algo'] }
                    }],
                    multiple: false
                });
                const file = await handle.getFile();
                if (!file.name.toLowerCase().endsWith('.algo')) {
                    alert("Seuls les fichiers avec l'extension .algo sont autorisés.");
                    return;
                }
                const content = await file.text();
                createNewTab(file.name, content);
                clearConsole();
                appendConsole(`\n[Info] Fichier '${file.name}' ouvert dans un nouvel onglet.\n`, 'info');
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; // Annulé par l'utilisateur
            }
        }
        fileUploadInput.click();
    };

    btnUpload.addEventListener('click', triggerUpload);
    btnWelcomeOpen.addEventListener('click', triggerUpload);

    fileUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.algo')) {
            alert("Seuls les fichiers avec l'extension .algo sont autorisés.");
            fileUploadInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            createNewTab(file.name, content);
            clearConsole();
            appendConsole(`\n[Info] Fichier '${file.name}' ouvert dans un nouvel onglet.\n`, 'info');
        };
        reader.readAsText(file);
        fileUploadInput.value = '';
    });

    // Bouton Accueil (Logo)
    brandHomeBtn.addEventListener('click', () => {
        welcomeScreen.style.display = 'flex';
        editorView.style.display = 'none';
        if (consoleSection) consoleSection.style.display = 'none';
        renderRecentFiles();
    });

    // Lancer / Tester le code
    btnRun.addEventListener('click', async () => {
        if (interpreter.isRunning) return;
        const currentTab = getCurrentTab();
        if (!currentTab) return;

        clearConsole();
        executionStartTime = performance.now();

        btnRun.style.display = 'none';
        btnStop.style.display = 'inline-flex';
        setRunStatus('running', 'En cours...');

        const code = editorManager.getValue();
        await interpreter.execute(code, { stepMode: false, delayMs: 0 });
    });

    btnStop.addEventListener('click', () => {
        if (interpreter.isRunning) interpreter.stop();
    });

    // 7. Sélection d'Exemple -> Ouvre dans un NOUVEL ONGLET avec son nom .algo !
    exampleSelect.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const ex = ALGO_EXAMPLES.find(item => item.id === selectedId);
        if (ex) {
            // Ouvre dans un nouvel onglet avec le nom réel du fichier exemple
            const newTab = createNewTab(ex.filename, ex.code);
            clearConsole();
            appendConsole(`\n[Exemple] '${ex.filename}' ouvert dans un nouvel onglet.\n`, 'info');
            exampleSelect.value = ''; // Reset select
        }
    });

    // 8. Démarrage de l'application
    renderRecentFiles();
    const hasTabs = loadTabsState();
    if (!hasTabs) {
        // Au tout début : afficher l'écran d'accueil avec les gros boutons, cacher console !
        welcomeScreen.style.display = 'flex';
        editorView.style.display = 'none';
        if (consoleSection) consoleSection.style.display = 'none';
    }

    // Raccourcis clavier
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5' && !e.shiftKey) {
            e.preventDefault();
            btnRun.click();
        }
        if (e.key === 'F5' && e.shiftKey) {
            e.preventDefault();
            btnStop.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            btnSave.click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            triggerUpload();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            triggerNewTab();
        }
    });
});
