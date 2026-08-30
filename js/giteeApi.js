// js/giteeApi.js (最终稳定版)
window.GITEE_API_BASE = 'https://gitee.com/api/v5';

/**
 * 获取文件 SHA (指定分支)
 */
window.getGiteeSha = async function (config) {
    const { token, owner, repo, path, branch = 'main' } = config;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
    const resp = await fetch(url, {
        headers: { 'Authorization': `token ${token}` }
    });
    if (resp.status === 404) return null;
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`获取 SHA 失败 (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    return data.sha || null;
};

/**
 * 上传或覆盖文件 (自动选择 POST/PUT，Token 同时使用 Header + URL 增强兼容)
 */
window.uploadFileToGitee = async function (config) {
    const { token, owner, repo, path, content, message = 'update via tool', branch = 'main' } = config;
    if (!content) throw new Error('内容不能为空');

    // 1. 获取 SHA
    let sha = null;
    try {
        sha = await window.getGiteeSha({ token, owner, repo, path, branch });
        console.log('[upload] SHA:', sha || '新文件');
    } catch (e) {
        console.warn('[upload] 获取 SHA 失败，当作新文件:', e.message);
    }

    // 2. Base64 编码（处理中文）
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    // 3. 构造请求体
    const payload = {
        content: encodedContent,
        message: message,
        branch: branch
    };
    if (sha) payload.sha = sha;

    // 4. 决定 HTTP 方法
    const method = sha ? 'PUT' : 'POST';
    // URL 同时携带 access_token 作为额外保障（Header 也保留）
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?access_token=${token}`;

    console.log(`[upload] ${method} ${url}`, payload);

    // 5. 发送请求
    const resp = await fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${token}`  // 保留 Header，双重保障
        },
        body: JSON.stringify(payload)
    });

    // 6. 处理成功
    if (resp.ok) {
        const result = await resp.json();
        console.log('[upload] 成功:', result);
        return result;
    }

    // 7. 失败处理
    let errorMsg = '';
    try {
        const errData = await resp.json();
        errorMsg = errData.message || JSON.stringify(errData);
    } catch (_) {
        errorMsg = await resp.text();
    }
    throw new Error(`上传失败 (${resp.status}): ${errorMsg}`);
};

/**
 * 读取文件内容
 */
window.getGiteeFile = async function (config) {
    const { token, owner, repo, path, branch = 'main' } = config;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}&access_token=${token}`;
    const resp = await fetch(url);
    if (resp.status === 404) return null;
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`读取失败 (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    return decodeURIComponent(escape(atob(data.content)));
};

/**
 * 删除文件
 */
window.deleteGiteeFile = async function (config) {
    const { token, owner, repo, path, message = 'delete', branch = 'main' } = config;
    const sha = await window.getGiteeSha({ token, owner, repo, path, branch });
    if (!sha) return null;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?access_token=${token}`;
    const resp = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${token}`
        },
        body: JSON.stringify({ sha, message, branch })
    });
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`删除失败 (${resp.status}): ${err}`);
    }
    return await resp.json();
};