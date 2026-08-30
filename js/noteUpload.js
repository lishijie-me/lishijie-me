// js/noteUpload.js
(function() {
    const TOOL_KEY = 'noteUpload';

    const useIndepCheck = document.getElementById('useIndependentConfig');
    const indepArea = document.getElementById('independentConfigArea');
    const localToken = document.getElementById('localToken');
    const localOwner = document.getElementById('localOwner');
    const localRepo = document.getElementById('localRepo');
    const filePath = document.getElementById('filePath');
    const content = document.getElementById('markdownContent');
    const uploadBtn = document.getElementById('uploadBtn');
    const msgDiv = document.getElementById('uploadMsg');

    // 加载保存的独立配置到输入框
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

    // 监听独立配置开关
    useIndepCheck.addEventListener('change', function() {
        if (this.checked) {
            indepArea.classList.add('active');
        } else {
            indepArea.classList.remove('active');
            // 清除独立配置 (回退全局)
            window.clearToolConfig(TOOL_KEY);
        }
    });

    uploadBtn.addEventListener('click', async function() {
        const path = filePath.value.trim();
        const mdContent = content.value;

        if (!path) {
            msgDiv.innerHTML = '<span style="color:#ef4444;">❌ 请填写文件路径</span>';
            return;
        }
        if (!mdContent) {
            msgDiv.innerHTML = '<span style="color:#ef4444;">❌ 请填写 Markdown 内容</span>';
            return;
        }

        // 1. 获取配置
        let config;
        if (useIndepCheck.checked) {
            const token = localToken.value.trim();
            const owner = localOwner.value.trim();
            const repo = localRepo.value.trim();
            if (!token || !owner || !repo) {
                msgDiv.innerHTML = '<span style="color:#ef4444;">❌ 请补全独立配置信息</span>';
                return;
            }
            config = { token, owner, repo };
            // 保存独立配置供下次使用
            window.saveToolConfig(TOOL_KEY, config);
        } else {
            config = window.getToolConfig(TOOL_KEY);
            if (!window.isConfigValid(config)) {
                msgDiv.innerHTML = '<span style="color:#ef4444;">❌ 全局配置不完整，请先到 <a href="settings.html">设置页</a> 配置或开启独立配置</span>';
                return;
            }
        }

        // 2. Loading 状态
        uploadBtn.disabled = true;
        uploadBtn.textContent = '⏳ 上传中...';
        msgDiv.innerHTML = '';

        try {
            const result = await window.uploadFileToGitee({
                ...config,
                path: path,
                content: mdContent,
                message: `更新手记: ${path}`
            });
            msgDiv.innerHTML = `<span style="color:#10b981;">✅ 上传成功！ <a href="${result.content.html_url}" target="_blank">查看文件</a></span>`;
        } catch (err) {
            msgDiv.innerHTML = `<span style="color:#ef4444;">❌ 上传失败: ${err.message}</span>`;
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '🚀 提交上传';
        }
    });
})();