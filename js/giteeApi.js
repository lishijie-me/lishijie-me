// js/giteeApi.js (终版 · 实测通过)
window.GITEE_API_BASE = 'https://gitee.com/api/v5';

/**
 * 获取文件 SHA（指定分支，使用 URL 参数认证）
 */
window.getGiteeSha = async function (config) {
    const { token, owner, repo, path, branch = 'main' } = config;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}&access_token=${token}`;
    const resp = await fetch(url);
    if (resp.status === 404) return null;
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`获取 SHA 失败 (${resp.status}): ${err}`);
    }
    const data = await resp.json();
    return data.sha || null;
};

/**
 * 上传或覆盖文件（主入口）
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

    // 2. Base64 编码
    const encoded = btoa(unescape(encodeURIComponent(content)));

    // 3. 构造请求体（官方格式）
    const payload = {
        content: encoded,
        message: message,
        branch: branch
    };
    if (sha) payload.sha = sha;

    // 4. 决定方法：有 sha → PUT，无 sha → POST
    const method = sha ? 'PUT' : 'POST';
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?access_token=${token}`;

    console.log(`[upload] ${method} ${url}`, payload);

    // 5. 执行请求
    let resp = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    // 6. 如果返回 400 且错误为“文件名已存在”，尝试 fallback
    if (resp.status === 400) {
        const errText = await resp.text();
        if (errText.includes('文件名已存在') || errText.includes('already exists')) {
            console.warn('[upload] 收到“文件已存在”，尝试 fallback: 用 POST + sha');
            // fallback: 强制用 POST 方法，但依然带 sha（某些老版本支持）
            const fallbackPayload = { ...payload };
            const fallbackResp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fallbackPayload)
            });
            if (fallbackResp.ok) {
                const result = await fallbackResp.json();
                console.log('[upload] fallback 成功:', result);
                return result;
            } else {
                // fallback 也失败，则抛出原始错误
                const fallbackErr = await fallbackResp.text();
                throw new Error(`覆盖失败 (POST fallback): ${fallbackErr}`);
            }
        } else {
            // 其他 400 错误
            throw new Error(`上传失败 (400): ${errText}`);
        }
    }

    // 7. 处理其他状态
    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`上传失败 (${resp.status}): ${errText}`);
    }

    return await resp.json();
};

// 读取和删除函数不变（为完整保留）
window.getGiteeFile = async function (config) {
    const { token, owner, repo, path, branch = 'main' } = config;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}&access_token=${token}`;
    const resp = await fetch(url);
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`读取失败 (${resp.status}): ${await resp.text()}`);
    const data = await resp.json();
    return decodeURIComponent(escape(atob(data.content)));
};

window.deleteGiteeFile = async function (config) {
    const { token, owner, repo, path, message = 'delete', branch = 'main' } = config;
    const sha = await window.getGiteeSha({ token, owner, repo, path, branch });
    if (!sha) return null;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?access_token=${token}`;
    const resp = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha, message, branch })
    });
    if (!resp.ok) throw new Error(`删除失败 (${resp.status}): ${await resp.text()}`);
    return await resp.json();
};