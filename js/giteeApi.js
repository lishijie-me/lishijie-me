// js/giteeApi.js (增强版)
window.GITEE_API_BASE = 'https://gitee.com/api/v5';

/**
 * 获取文件 SHA (增强错误处理)
 */
window.getGiteeSha = async function (config) {
    const { token, owner, repo, path } = config;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const resp = await fetch(url, {
        headers: { 'Authorization': `token ${token}` }
    });

    if (resp.status === 404) {
        return null; // 文件不存在
    }

    if (!resp.ok) {
        let errorText = '';
        try {
            const errData = await resp.json();
            errorText = errData.message || JSON.stringify(errData);
        } catch (_) {
            errorText = await resp.text();
        }
        throw new Error(`获取文件 SHA 失败 (${resp.status}): ${errorText}`);
    }

    const data = await resp.json();
    if (!data.sha) {
        throw new Error('Gitee 返回的数据中缺少 sha 字段');
    }
    return data.sha;
};

/**
 * 上传或覆盖文件 (支持自动重试)
 */
window.uploadFileToGitee = async function (config, retry = true) {
    const { token, owner, repo, path, content, message = 'update via tool' } = config;
    if (!content) throw new Error('文件内容不能为空');

    // 1. 获取 SHA
    let sha;
    try {
        sha = await window.getGiteeSha(config);
    } catch (err) {
        // 如果是 404 则视为新文件，否则直接抛出
        if (err.message.includes('404')) {
            sha = null;
        } else {
            throw new Error(`无法检查文件是否存在: ${err.message}`);
        }
    }

    // 2. 构建请求
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
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

    // 3. 处理响应
    if (resp.ok) {
        return await resp.json();
    }

    // 4. 错误处理 & 自动重试 (针对“文件已存在”)
    let errorBody;
    try {
        errorBody = await resp.json();
    } catch (_) {
        errorBody = { message: await resp.text() };
    }

    // 如果是“文件已存在”错误 (可能 message 包含 "already exists" 或 "文件已存在")
    const errorMsg = errorBody.message || '';
    if (resp.status === 409 || errorMsg.includes('already exists') || errorMsg.includes('文件已存在')) {
        if (retry) {
            // 重新获取 SHA (可能之前因某些原因未获取到)
            try {
                const newSha = await window.getGiteeSha(config);
                if (newSha) {
                    // 重试一次，但关闭重试标志防止死循环
                    return await window.uploadFileToGitee({ ...config, sha: newSha }, false);
                } else {
                    throw new Error('文件确实存在但无法获取其 SHA，请检查权限或路径');
                }
            } catch (retryErr) {
                throw new Error(`覆盖文件失败: ${retryErr.message}`);
            }
        } else {
            throw new Error(`文件已存在且无法覆盖: ${errorMsg}`);
        }
    }

    // 其他错误
    throw new Error(`上传失败 (${resp.status}): ${errorMsg}`);
};

/**
 * 读取文件内容 (不变)
 */
window.getGiteeFile = async function (config) {
    const { token, owner, repo, path } = config;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const resp = await fetch(url, {
        headers: { 'Authorization': `token ${token}` }
    });
    if (resp.status === 404) return null;
    if (!resp.ok) {
        let errMsg;
        try {
            const errData = await resp.json();
            errMsg = errData.message || JSON.stringify(errData);
        } catch (_) {
            errMsg = await resp.text();
        }
        throw new Error(`读取文件失败 (${resp.status}): ${errMsg}`);
    }
    const data = await resp.json();
    return decodeURIComponent(escape(atob(data.content)));
};

/**
 * 删除文件 (不变)
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
    if (!resp.ok) {
        let errMsg;
        try {
            const errData = await resp.json();
            errMsg = errData.message || JSON.stringify(errData);
        } catch (_) {
            errMsg = await resp.text();
        }
        throw new Error(`删除失败 (${resp.status}): ${errMsg}`);
    }
    return await resp.json();
};