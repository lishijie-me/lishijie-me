// js/giteeApi.js (支持分支指定，默认 main)
window.GITEE_API_BASE = 'https://gitee.com/api/v5';

/**
 * 获取文件 SHA (支持分支参数)
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
 * 上传或覆盖文件 (带自动重试 + 分支指定)
 */
window.uploadFileToGitee = async function (config, isRetry = false) {
    const { token, owner, repo, path, content, message = 'update via tool', branch = 'main' } = config;
    if (!content) throw new Error('文件内容不能为空');

    // 1. 获取 SHA（指定分支）
    let sha = null;
    try {
        sha = await window.getGiteeSha({ ...config, branch });
        console.log('[upload] 获取 SHA:', sha || '文件不存在');
    } catch (err) {
        console.warn('[upload] 获取 SHA 出错，将继续尝试上传:', err.message);
        sha = null;
    }

    // 2. 构建请求体
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const base64Content = btoa(unescape(encodeURIComponent(content)));

    const payload = {
        content: base64Content,
        message: message,
        branch: branch   // 关键：指定分支
    };
    if (sha) payload.sha = sha;

    console.log('[upload] 请求 Payload:', JSON.stringify(payload, null, 2));

    // 3. 发送请求（使用 Authorization 头）
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${token}`
        },
        body: JSON.stringify(payload)
    });

    // 4. 处理成功
    if (resp.ok) {
        const result = await resp.json();
        console.log('[upload] 上传成功:', result);
        return result;
    }

    // 5. 处理失败响应
    let errorBody;
    try {
        errorBody = await resp.json();
    } catch (_) {
        errorBody = { message: await resp.text() };
    }
    const errorMsg = errorBody.message || '';

    console.error('[upload] 请求失败:', resp.status, errorMsg);

    // 6. 判断是否为“文件已存在”错误
    const isFileExistsError = (resp.status === 400 || resp.status === 409) &&
        (errorMsg.includes('文件名已存在') || errorMsg.includes('already exists') || errorMsg.includes('文件已存在'));

    if (isFileExistsError) {
        if (!isRetry) {
            console.warn('[upload] 文件已存在，尝试重试 (重新获取 SHA)');
            try {
                const newSha = await window.getGiteeSha({ ...config, branch });
                if (!newSha) {
                    throw new Error('文件确实存在，但无法获取其 SHA，请检查权限或路径');
                }
                return await window.uploadFileToGitee(
                    { ...config, sha: newSha, branch },
                    true
                );
            } catch (retryErr) {
                throw new Error(`覆盖文件失败 (重试后): ${retryErr.message}`);
            }
        } else {
            throw new Error(`文件已存在且无法覆盖: ${errorMsg}`);
        }
    }

    // 其他错误
    throw new Error(`上传失败 (${resp.status}): ${errorMsg}`);
};

/**
 * 读取文件内容 (支持分支)
 */
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

/**
 * 删除文件 (支持分支)
 */
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