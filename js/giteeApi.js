// js/giteeApi.js (最终稳定版)
window.GITEE_API_BASE = 'https://gitee.com/api/v5';

/**
 * 获取文件 SHA
 * 返回: string | null (不存在时返回 null)
 * 抛出: 仅当发生网络/权限等不可恢复错误时抛出
 */
window.getGiteeSha = async function (config) {
    const { token, owner, repo, path } = config;
    const url = `${window.GITEE_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
    const resp = await fetch(url, {
        headers: { 'Authorization': `token ${token}` }
    });

    if (resp.status === 404) {
        return null;
    }

    if (!resp.ok) {
        let errorText = '';
        try {
            const errData = await resp.json();
            errorText = errData.message || JSON.stringify(errData);
        } catch (_) {
            errorText = await resp.text();
        }
        // 非 404 错误抛出，让上层处理
        throw new Error(`获取 SHA 失败 (${resp.status}): ${errorText}`);
    }

    const data = await resp.json();
    return data.sha || null;
};

/**
 * 上传或覆盖文件（带自动重试）
 */
window.uploadFileToGitee = async function (config, isRetry = false) {
    const { token, owner, repo, path, content, message = 'update via tool' } = config;
    if (!content) throw new Error('文件内容不能为空');

    // 1. 获取 SHA（若获取失败，继续尝试，可能文件不存在或临时问题）
    let sha = null;
    try {
        sha = await window.getGiteeSha(config);
        console.log(`[upload] 获取 SHA: ${sha || '文件不存在'}`);
    } catch (err) {
        // 获取 SHA 出错，但不中断上传，将 sha 置 null，尝试直接上传
        console.warn('[upload] 获取 SHA 出错，将继续尝试上传 (可能文件不存在):', err.message);
        sha = null;
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

    // 3. 发送请求
    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    // 4. 处理成功
    if (resp.ok) {
        return await resp.json();
    }

    // 5. 处理失败响应
    let errorBody;
    try {
        errorBody = await resp.json();
    } catch (_) {
        errorBody = { message: await resp.text() };
    }
    const errorMsg = errorBody.message || '';

    // 6. 判断是否为“文件已存在”错误（状态码 400 或 409，且消息包含关键词）
    const isFileExistsError = (resp.status === 400 || resp.status === 409) &&
        (errorMsg.includes('文件名已存在') || errorMsg.includes('already exists') || errorMsg.includes('文件已存在'));

    if (isFileExistsError) {
        if (!isRetry) {
            // 重试一次：重新获取 SHA 并再次上传
            console.warn('[upload] 文件已存在，尝试重试 (重新获取 SHA)');
            try {
                // 强制重新获取 SHA
                const newSha = await window.getGiteeSha(config);
                if (!newSha) {
                    throw new Error('文件确实存在，但无法获取其 SHA，请检查权限或路径');
                }
                // 使用新 SHA 重试，关闭再次重试标志
                return await window.uploadFileToGitee(
                    { ...config, sha: newSha },
                    true // 标记为重试，防止死循环
                );
            } catch (retryErr) {
                throw new Error(`覆盖文件失败 (重试后): ${retryErr.message}`);
            }
        } else {
            // 重试后仍然失败
            throw new Error(`文件已存在且无法覆盖: ${errorMsg}`);
        }
    }

    // 其他错误
    throw new Error(`上传失败 (${resp.status}): ${errorMsg}`);
};

/**
 * 读取文件内容
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