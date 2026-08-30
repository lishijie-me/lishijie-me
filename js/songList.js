// js/songList.js
(function() {
    const TOOL_KEY = 'songList';
    const FILE_PATH = 'songlist.md'; // 固定路径

    const useIndepCheck = document.getElementById('useIndependentConfig');
    const indepArea = document.getElementById('independentConfigArea');
    const localToken = document.getElementById('localToken');
    const localOwner = document.getElementById('localOwner');
    const localRepo = document.getElementById('localRepo');
    const songInput = document.getElementById('songInput');
    const container = document.getElementById('songListContainer');
    const msgDiv = document.getElementById('songMsg');

    let currentSongs = []; // 存储当前列表

    // 加载独立配置
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

    // 获取有效配置
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

    // 渲染列表 (修复换行错位)
    function renderList(songs) {
        if (!songs || songs.length === 0) {
            container.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:1rem;">暂无歌曲，添加一首吧 🎶</p>';
            return;
        }
        let html = '';
        songs.forEach((song, index) => {
            const isDone = song.startsWith('[x]');
            const text = song.replace(/^\[[ x]\]\s*/, '');
            html += `
        <div class="song-item">
          <input type="checkbox" ${isDone ? 'checked' : ''} data-index="${index}">
          <span class="text" style="${isDone ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${text}</span>
          <button class="del-btn" data-index="${index}">✕</button>
        </div>
      `;
        });
        container.innerHTML = html;

        // 事件绑定：切换状态
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function() {
                const idx = parseInt(this.dataset.index);
                const item = currentSongs[idx];
                if (item.startsWith('[x]')) currentSongs[idx] = item.replace('[x]', '[ ]');
                else currentSongs[idx] = item.replace('[ ]', '[x]');
                saveAndRefresh();
            });
        });
        // 事件绑定：删除
        container.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.dataset.index);
                currentSongs.splice(idx, 1);
                saveAndRefresh();
            });
        });
    }

    // 从云端加载
    async function loadFromCloud() {
        try {
            const config = getValidConfig();
            const content = await window.getGiteeFile({ ...config, path: FILE_PATH });
            if (content === null) {
                currentSongs = [];
            } else {
                // 按行解析，过滤空行
                currentSongs = content.split('\n').filter(line => line.trim() !== '');
            }
            renderList(currentSongs);
            msgDiv.innerHTML = '<span style="color:#10b981;">✅ 加载成功</span>';
        } catch (err) {
            msgDiv.innerHTML = `<span style="color:#ef4444;">❌ 加载失败: ${err.message}</span>`;
        }
    }

    // 保存并刷新
    async function saveAndRefresh() {
        try {
            const config = getValidConfig();
            const content = currentSongs.join('\n');
            await window.uploadFileToGitee({
                ...config,
                path: FILE_PATH,
                content: content,
                message: '更新歌单'
            });
            renderList(currentSongs);
            msgDiv.innerHTML = '<span style="color:#10b981;">✅ 已同步云端</span>';
        } catch (err) {
            msgDiv.innerHTML = `<span style="color:#ef4444;">❌ 同步失败: ${err.message}</span>`;
        }
    }

    // 添加歌曲
    document.getElementById('addSongBtn').addEventListener('click', async function() {
        const val = songInput.value.trim();
        if (!val) { msgDiv.innerHTML = '<span style="color:#f59e0b;">⚠️ 请输入歌曲信息</span>'; return; }
        currentSongs.push('[ ] ' + val);
        songInput.value = '';
        await saveAndRefresh();
    });

    // 刷新
    document.getElementById('refreshListBtn').addEventListener('click', loadFromCloud);

    // 初始化加载
    loadFromCloud();
})();