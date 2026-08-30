// js/giteeApi.js (最终版 - 动态 POST/PUT)
window.GITEE_API_BASE = 'https://gitee.com/api/v5';

/**
 * 获取文件 SHA
 */
window.getGiteeSha = async function (config) {
    const { token, owner, repo, path, branch = 'main' } = config;
    let url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    if (branch) url += `?ref=${encodeURIComponent(branch)}`;
    const resp = await fetch(url, {
        headers: { 'Authorization': `token ${token}` }
    });

    if (resp.status === 404) return null;
    if (!resp.ok) {
        let errorText = '';
        try {
            const errData = await resp.json();
            errorText = errData.message || JSON.stringify(errData);
        } catch (_) {
            errorText = await resp.text();
        }
        throw new Error(`获取 SHA 失败 (${resp.status}): ${errorText}`);
    }
    const data = await resp.json();
    return data.sha || null;
};

/**
 * 上传或覆盖文件（自动选择 POST/PUT）
 */
window.uploadFileToGitee = async function (config, isRetry = false) {
    const { token, owner, repo, path, content, message = 'update via tool', branch = 'main' } = config;
    if (!content) throw new Error('文件内容不能为空');

    // 1. 获取 SHA
    let sha = null;
    try {
        sha = await window.getGiteeSha({ ...config, branch });
        console.log('[upload] 获取 SHA:', sha || '文件不存在');
    } catch (err) {
        console.warn('[upload] 获取 SHA 出错，将继续尝试上传:', err.message);
        sha = null;
    }

    // 2. 构建基础请求参数
    const baseUrl = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const base64Content = btoa(unescape(encodeURIComponent(content)));

    const payload = {
        content: base64Content,
        message: message,
        branch: branch
    };
    if (sha) payload.sha = sha;

    // 3. 决定 HTTP 方法：有 sha 用 PUT，无 sha 用 POST
    const method = sha ? 'PUT' : 'POST';
    console.log(`[upload] 使用 ${method} 方法，Payload:`, JSON.stringify(payload, null, 2));

    // 4. 发送请求
    const resp = await fetch(baseUrl, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${token}`
        },
        body: JSON.stringify(payload)
    });

    // 5. 处理成功
    if (resp.ok) {
        const result = await resp.json();
        console.log('[upload] 上传成功:', result);
        return result;
    }

    // 6. 处理失败
    let errorBody;
    try {
        errorBody = await resp.json();
    } catch (_) {
        errorBody = { message: await resp.text() };
    }
    const errorMsg = errorBody.message || '';
    console.error('[upload] 请求失败:', resp.status, errorMsg);

    // 7. 特殊错误：如果使用 POST 且返回“文件已存在”，则改用 PUT 重试
    const isFileExistsError = (resp.status === 400 || resp.status === 409) &&
        (errorMsg.includes('文件名已存在') || errorMsg.includes('already exists') || errorMsg.includes('文件已存在'));

    if (isFileExistsError && method === 'POST' && !isRetry) {
        console.warn('[upload] 文件已存在，切换为 PUT 方法重试');
        // 重新获取 SHA（可能之前没获取到）
        let newSha = sha;
        if (!newSha) {
            try {
                newSha = await window.getGiteeSha({ ...config, branch });
            } catch (_) {}
        }
        if (!newSha) {
            throw new Error('文件确实存在，但无法获取其 SHA，请检查权限');
        }
        // 用 PUT 重试，并标记为重试
        return await window.uploadFileToGitee(
            { ...config, sha: newSha, branch },
            true
        );
    }

    // 其他错误（包括 PUT 方法失败）
    throw new Error(`上传失败 (${resp.status}): ${errorMsg}`);
};

// getGiteeFile 和 deleteGiteeFile 与之前相同，但也可支持分支（略，可沿用之前版本）
// 为了完整，我附上完整代码（与之前保持一致）
window.getGiteeFile = async function (config) {
    const { token, owner, repo, path, branch = 'main' } = config;
    let url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    if (branch) url += `?ref=${encodeURIComponent(branch)}`;
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

window.deleteGiteeFile = async function (config) {
    const { token, owner, repo, path, message = 'delete', branch = 'main' } = config;
    const sha = await window.getGiteeSha({ ...config, branch });
    if (!sha) return null;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const resp = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${token}`
        },
        body: JSON.stringify({ sha, message, branch })
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