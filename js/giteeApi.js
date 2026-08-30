// js/giteeApi.js
window.GITEE_API_BASE = 'https://gitee.com/api/v5';

/**
 * 获取文件SHA (用于更新)
 */
window.getGiteeSha = async function (config) {
    const { token, owner, repo, path } = config;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const resp = await fetch(url, {
        headers: { 'Authorization': `token ${token}` }
    });
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`获取SHA失败 (${resp.status})`);
    const data = await resp.json();
    return data.sha;
};

/**
 * 上传/覆盖文件 (核心)
 */
window.uploadFileToGitee = async function (config) {
    const { token, owner, repo, path, content, message = 'update via tool' } = config;
    if (!content) throw new Error('内容不能为空');

    const sha = await window.getGiteeSha(config);
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

    // 处理中文UTF-8 Base64
    const base64Content = btoa(unescape(encodeURIComponent(content)));

    const payload = {
        access_token: token,
        content: base64Content,
        message: message
    };
    if (sha) payload.sha = sha;

    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || `上传失败 (${resp.status})`);
    }
    return await resp.json();
};

/**
 * 读取文件内容 (返回文本)
 */
window.getGiteeFile = async function (config) {
    const { token, owner, repo, path } = config;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const resp = await fetch(url, {
        headers: { 'Authorization': `token ${token}` }
    });
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`读取失败 (${resp.status})`);
    const data = await resp.json();
    // 解码Base64
    return decodeURIComponent(escape(atob(data.content)));
};

/**
 * 删除文件
 */
window.deleteGiteeFile = async function (config) {
    const { token, owner, repo, path, message = 'delete' } = config;
    const sha = await window.getGiteeSha(config);
    if (!sha) return null;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const resp = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token, sha, message })
    });
    if (!resp.ok) throw new Error('删除失败');
    return await resp.json();
};