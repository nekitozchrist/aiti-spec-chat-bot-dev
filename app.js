(function() {
    
    if (!window.vkBridge) {
        document.getElementById('content').innerHTML = 
            '<div class="error">Ошибка: VK Bridge не загружен</div>';
        return;
    }
    
    var bridge = window.vkBridge.default || window.vkBridge;
    bridge.send('VKWebAppInit');
    
    var headerEl = document.getElementById('header');
    var contentEl = document.getElementById('content');
    var userToken = null;
    
    var currentScreen = 'main';
    var cache = {
        mainMenu: null,
        knowledgeCategories: null,
        knowledgeTexts: {},
        diagnosticsCategories: null,
        diagnosticsTexts: {},
        diagnosticsList: null,
        diagnosticSolutions: {},
        networkSteps: {},
        info: null
    };
    
    function initApp() {
        bridge.send("VKWebAppGetAuthToken", {
            "app_id": 54477515,
            "scope": ""
        }).then(function(data) {
            userToken = data.access_token;
            showMainMenu();
        }).catch(function() {
            contentEl.innerHTML = '<div class="error">Ошибка авторизации</div>';
        });
    }
    
    function callProcedure(method, params, callback) {
        if (!userToken) {
            contentEl.innerHTML = '<div class="error">Нет доступа</div>';
            return;
        }
        
        var requestParams = {
            v: '5.131',
            access_token: userToken
        };
        
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                requestParams[key] = params[key];
            }
        }
        
        bridge.send('VKWebAppCallAPIMethod', {
            method: 'execute.' + method,
            params: requestParams
        }).then(function(result) {
            callback(result.response);
        }).catch(function() {
            contentEl.innerHTML = '<div class="error">Ошибка загрузки</div>';
        });
    }
    
    function showMainMenu() {
        currentScreen = 'main';
        headerEl.innerHTML = '';
        
        if (cache.mainMenu) {
            renderMainMenu(cache.mainMenu);
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getMainMenu', {}, function(data) {
            cache.mainMenu = data;
            renderMainMenu(data);
        });
    }
    
    function renderMainMenu(data) {
        var html = '';
        for (var i = 0; i < data.buttons.length; i++) {
            var btn = data.buttons[i];
            html += '<button class="menu-item" onclick="app.handleMainButton(\'' + btn.action + '\', \'' + (btn.param || '') + '\')">' + btn.icon + ' ' + btn.title + '</button>';
        }
        contentEl.innerHTML = html;
    }
    
    function showKnowledgeCategories() {
        currentScreen = 'knowledge';
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showMainMenu()">← Назад</button>';
        
        if (cache.knowledgeCategories) {
            renderKnowledgeCategories(cache.knowledgeCategories);
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getKnowledgeCategories', {}, function(data) {
            cache.knowledgeCategories = data;
            renderKnowledgeCategories(data);
        });
    }
    
    function renderKnowledgeCategories(data) {
        var html = '';
        for (var i = 0; i < data.categories.length; i++) {
            var cat = data.categories[i];
            html += '<button class="menu-item" onclick="app.showKnowledgeContent(\'' + cat.key + '\')">' + cat.icon + ' ' + cat.title + '</button>';
        }
        contentEl.innerHTML = html;
    }
    
    function showKnowledgeContent(key) {
        currentScreen = 'category:' + key;
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showKnowledgeCategories()">← Назад</button>';
        
        if (cache.knowledgeTexts[key]) {
            renderKnowledgeContent(key, cache.knowledgeTexts[key]);
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getKnowledgeText', { category: key }, function(data) {
            cache.knowledgeTexts[key] = data;
            renderKnowledgeContent(key, data);
        });
    }
    
    function renderKnowledgeContent(key, data) {
        var text = data.text || data;
        contentEl.innerHTML = '<div class="kb-text">' + text + '</div>';
    }
    
    function showDiagnosticsList() {
        currentScreen = 'diagnostics';
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showMainMenu()">← Назад</button>';
        
        if (cache.diagnosticsCategories) {
            renderDiagnosticsCategories(cache.diagnosticsCategories);
            return;
        }
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getDiagnosticsCategories', {}, function(data) {
            cache.diagnosticsCategories = data;
            renderDiagnosticsCategories(data);
        });
    }
    
    function renderDiagnosticsCategories(data) {
        var html = '';
        for (var i = 0; i < data.categories.length; i++) {
            var cat = data.categories[i];
            html += '<button class="menu-item" onclick="app.showDiagnosticsCategory(\'' + cat.key + '\')">' + cat.icon + ' ' + cat.title + '</button>';
        }
        contentEl.innerHTML = html;
    }
    
    function showDiagnosticsCategory(key) {
        currentScreen = 'diag_category:' + key;
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showDiagnosticsList()">← Назад</button>';
        
        if (key === 'network_diag_category') {
            contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
            callProcedure('getDiagnosticsList', {}, function(data) {
                renderNetworkProblems(data);
            });
        } else {
            if (cache.diagnosticsTexts && cache.diagnosticsTexts[key]) {
                renderDiagnosticsText(key, cache.diagnosticsTexts[key]);
                return;
            }
            
            contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
            // Было: getKnowledgeText
            // Стало:
            callProcedure('getDiagnosticsText', { category: key }, function(data) {
                if (!cache.diagnosticsTexts) cache.diagnosticsTexts = {};
                cache.diagnosticsTexts[key] = data;
                renderDiagnosticsText(key, data);
            });
        }
    }
    
    function renderNetworkProblems(data) {
        var html = '<h3>🌐 Выберите проблему</h3>';
        for (var i = 0; i < data.problems.length; i++) {
            var p = data.problems[i];
            html += '<button class="menu-item" onclick="app.handleDiagnosticChoice(\'' + p.key + '\')">' + p.icon + ' ' + p.title + '</button>';
        }
        contentEl.innerHTML = html;
    }
    
    function renderDiagnosticsText(key, data) {
        var text = data.text || data;
        contentEl.innerHTML = '<div class="kb-text">' + text + '</div>';
    }
    
    function handleDiagnosticChoice(key) {
        if (key === 'network_diag') {
            showNetworkDiagnostics();
        } else {
            showDiagnosticSolution(key);
        }
    }
    
    function showNetworkDiagnostics() {
        currentScreen = 'network_diag';
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showDiagnosticsList()">← Назад</button>';
        
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        
        callProcedure('getNetworkSteps', {}, function(data) {
            var steps = data.steps;
            var html = '<h3>🌐 Диагностика сети</h3>';
            for (var i = 0; i < steps.length; i++) {
                var step = steps[i];
                html += '<button class="menu-item" onclick="app.showNetworkStep(\'' + step.key + '\')">' + step.text + '</button>';
            }
            contentEl.innerHTML = html;
        });
    }
    
    function showNetworkStep(step) {
        currentScreen = 'network_step:' + step;
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showNetworkDiagnostics()">← Назад к списку</button>';
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        var stepNumber = step.substring(4);
        callProcedure('getNetworkDetails', { step: stepNumber }, function(data) {
            renderNetworkStep(step, data.text);
        });
    }
    
    function renderNetworkStep(step, text) {
        var html = '<div class="kb-text">' + text + '</div>';
        html += '<div class="solution-actions">';
        html += '<button class="menu-item" onclick="app.showNetworkDiagnostics()">🔁 Другой шаг</button>';
        html += '<button class="menu-item btn-success" onclick="app.stepSolved()">✅ Помогло</button>';
        html += '</div>';
        contentEl.innerHTML = html;
    }
    
    function stepSolved() {
        alert('✅ Отлично! Проблема решена.');
        showMainMenu();
    }
    
    function showDiagnosticSolution(key) {
        currentScreen = 'solution:' + key;
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showDiagnosticsList()">← Назад</button>';
        if (cache.diagnosticSolutions[key]) {
            renderDiagnosticSolution(key, cache.diagnosticSolutions[key]);
            return;
        }
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        callProcedure('getDiagnosticSolution', { problem: key }, function(data) {
            cache.diagnosticSolutions[key] = data.text;
            renderDiagnosticSolution(key, data.text);
        });
    }
    
    function renderDiagnosticSolution(key, text) {
        var html = '<div class="kb-text">' + text + '</div>';
        html += '<div class="solution-actions">';
        html += '<button class="menu-item btn-success" onclick="app.problemSolved()">✅ Проблема решена</button>';
        html += '</div>';
        contentEl.innerHTML = html;
    }
    
    function showInfo() {
        currentScreen = 'info';
        headerEl.innerHTML = '<button class="back-btn" onclick="app.showMainMenu()">← Назад</button>';
        if (cache.info) {
            contentEl.innerHTML = '<div class="kb-text">' + cache.info + '</div>';
            return;
        }
        contentEl.innerHTML = '<div class="loading">Загрузка...</div>';
        callProcedure('getInfo', {}, function(data) {
            cache.info = data.text;
            contentEl.innerHTML = '<div class="kb-text">' + data.text + '</div>';
        });
    }
    
    function problemSolved() {
        alert('✅ Отлично! Рады, что помогли.');
        showMainMenu();
    }
    
    function handleMainButton(action, param) {
        if (action === 'knowledge') {
            showKnowledgeCategories();
        } else if (action === 'diagnostics') {
            showDiagnosticsList();
        } else if (action === 'info') {
            showInfo();
        }
    }
    
    window.app = {
        showMainMenu: showMainMenu,
        showKnowledgeCategories: showKnowledgeCategories,
        showKnowledgeContent: showKnowledgeContent,
        showDiagnosticsList: showDiagnosticsList,
        showDiagnosticsCategory: showDiagnosticsCategory,
        handleDiagnosticChoice: handleDiagnosticChoice,
        showDiagnosticSolution: showDiagnosticSolution,
        showNetworkDiagnostics: showNetworkDiagnostics,
        showNetworkStep: showNetworkStep,
        stepSolved: stepSolved,
        showInfo: showInfo,
        handleMainButton: handleMainButton,
        problemSolved: problemSolved
    };
    
    initApp();
})();
