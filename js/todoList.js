// js/todoList.js
(function() {
    const TOOL_KEY = 'todoList';
    const FILE_PATH = 'todo.md';

    const useIndepCheck = document.getElementById('useIndependentConfig');
    const indepArea = document.getElementById('independentConfigArea');
    const localToken = document.getElementById('localToken');
    const localOwner = document.getElementById('localOwner');
    const localRepo = document.getElementById('localRepo');
    const todoInput = document.getElementById('todoInput');
    const container = document.getElementById('todoListContainer');
    const msgDiv = document.getElementById('todoMsg');

    let todos = [];

    function loadLocalConfig() {
        const saved = localStorage.getItem(TOOL_KEY + '_config');
        if (saved) {
            try {
                const { token, owner, repo } = JSON.parse(saved);
                localToken.value = token || '';
                localOwner.value = owner || '';
                localRepo.value = repo || '';
            } catch(e) {}
        }
    }
    loadLocalConfig();

    useIndepCheck.addEventListener('change', function() {
        if (this.checked) indepArea.classList.add('active');
        else { indepArea.classList.remove('active'); window.clearToolConfig(TOOL_KEY); }
    });

    function getValidConfig() {
        if (useIndepCheck.checked) {
            const token = localToken.value.trim();
            const owner = localOwner.value.trim();
            const repo = localRepo.value.trim();
            if (!token || !owner || !repo) throw new Error('独立配置不完整');
            const cfg = { token, owner, repo };
            window.saveToolConfig(TOOL_KEY, cfg);
            return cfg;
        } else {
            const cfg = window.getToolConfig(TOOL_KEY);
            if (!window.isConfigValid(cfg)) throw new Error('全局配置不完整');
            return cfg;
        }
    }

    function renderTodos(list) {
        if (!list || list.length === 0) {
            container.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:1rem;">🎉 暂无待办</p>';
            return;
        }
        let html = '';
        list.forEach((item, index) => {
            const done = item.startsWith('[x]');
            const text = item.replace(/^\[[ x]\]\s*/, '');
            html += `
        <div class="todo-item ${done ? 'done' : ''}">
          <input type="checkbox" ${done ? 'checked' : ''} data-index="${index}">
          <span class="text">${text}</span>
          <button class="del-btn" data-index="${index}">✕</button>
        </div>
      `;
        });
        container.innerHTML = html;

        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function() {
                const idx = parseInt(this.dataset.index);
                if (todos[idx].startsWith('[x]')) todos[idx] = todos[idx].replace('[x]', '[ ]');
                else todos[idx] = todos[idx].replace('[ ]', '[x]');
                saveAndRefresh();
            });
        });
        container.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.dataset.index);
                todos.splice(idx, 1);
                saveAndRefresh();
            });
        });
    }

    async function loadFromCloud() {
        try {
            const config = getValidConfig();
            const content = await window.getGiteeFile({ ...config, path: FILE_PATH });
            todos = content ? content.split('\n').filter(line => line.trim() !== '') : [];
            renderTodos(todos);
            msgDiv.innerHTML = '<span style="color:#10b981;">✅ 加载成功</span>';
        } catch (err) {
            msgDiv.innerHTML = `<span style="color:#ef4444;">❌ 加载失败: ${err.message}</span>`;
        }
    }

    async function saveAndRefresh() {
        try {
            const config = getValidConfig();
            await window.uploadFileToGitee({
                ...config,
                path: FILE_PATH,
                content: todos.join('\n'),
                message: '更新待办'
            });
            renderTodos(todos);
            msgDiv.innerHTML = '<span style="color:#10b981;">✅ 已同步</span>';
        } catch (err) {
            msgDiv.innerHTML = `<span style="color:#ef4444;">❌ 同步失败: ${err.message}</span>`;
        }
    }

    document.getElementById('addTodoBtn').addEventListener('click', async function() {
        const val = todoInput.value.trim();
        if (!val) { msgDiv.innerHTML = '<span style="color:#f59e0b;">⚠️ 请输入任务</span>'; return; }
        todos.push('[ ] ' + val);
        todoInput.value = '';
        await saveAndRefresh();
    });

    document.getElementById('refreshTodoBtn').addEventListener('click', loadFromCloud);
    loadFromCloud();
})();