// js/settings.js
(function() {
    const tokenInput = document.getElementById('globalToken');
    const ownerInput = document.getElementById('globalOwner');
    const repoInput = document.getElementById('globalRepo');
    const msgDiv = document.getElementById('settingsMsg');

    // 加载已有配置
    function loadConfig() {
        const saved = localStorage.getItem(window.CONFIG_KEYS.GLOBAL);
        if (saved) {
            try {
                const { token, owner, repo } = JSON.parse(saved);
                tokenInput.value = token || '';
                ownerInput.value = owner || '';
                repoInput.value = repo || '';
            } catch (e) {}
        }
    }
    loadConfig();

    document.getElementById('saveGlobalBtn').addEventListener('click', function() {
        const token = tokenInput.value.trim();
        const owner = ownerInput.value.trim();
        const repo = repoInput.value.trim();

        if (!token || !owner || !repo) {
            msgDiv.innerHTML = '<span style="color:#ef4444;">❌ 请完整填写 Token、Owner 和 Repo</span>';
            return;
        }

        localStorage.setItem(window.CONFIG_KEYS.GLOBAL, JSON.stringify({ token, owner, repo }));
        msgDiv.innerHTML = '<span style="color:#10b981;">✅ 全局配置已保存</span>';
    });

    document.getElementById('clearGlobalBtn').addEventListener('click', function() {
        if (confirm('确认清除所有全局配置吗？')) {
            localStorage.removeItem(window.CONFIG_KEYS.GLOBAL);
            tokenInput.value = '';
            ownerInput.value = '';
            repoInput.value = '';
            msgDiv.innerHTML = '<span style="color:#f59e0b;">🔄 已清除配置</span>';
        }
    });
})();