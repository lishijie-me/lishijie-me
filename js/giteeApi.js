/**
 * giteeApi.js Gitee API请求封装
 * 已合并原有utils逻辑，移除giteeApiUtils.js依赖
 */

/**
 * 读取配置
 * @param {boolean} useGlobal true=全局配置；false=页面独立配置
 */
function getGiteeConfig(useGlobal) {
    if (useGlobal) {
        return {
            token: localStorage.getItem("gitee_token"),
            owner: localStorage.getItem("gitee_owner"),
            repo: localStorage.getItem("gitee_repo")
        };
    } else {
        return {
            token: localStorage.getItem("page_gitee_token"),
            owner: localStorage.getItem("page_gitee_owner"),
            repo: localStorage.getItem("page_gitee_repo")
        };
    }
}

/**
 * 获取文件sha，更新文件必须传入sha
 * @param {string} token
 * @param {string} owner
 * @param {string} repo
 * @param {string} filePath
 * @returns {string|null} sha不存在返回null
 */
async function getGiteeSha(token, owner, repo, filePath) {
    const resp = await fetch(
        `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
        {
            method: "GET",
            headers: {
                "Authorization": `token ${token}`
            }
        }
    );
    if (!resp.ok) {
        return null;
    }
    const data = await resp.json();
    return data.sha;
}

/**
 * 获取Gitee文件完整信息
 * @param {string} token
 * @param {string} owner
 * @param {string} repo
 * @param {string} filePath
 */
async function getGiteeFile(token, owner, repo, filePath) {
    const resp = await fetch(
        `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
        {
            method: "GET",
            headers: {
                "Authorization": `token ${token}`
            }
        }
    );
    if (!resp.ok) throw new Error("文件读取失败");
    return await resp.json();
}

/**
 * 上传/新建/覆盖文件
 * @param {boolean} useGlobal 是否使用全局配置
 * @param {string} filePath 仓库内路径
 * @param {string} content 文本内容
 * @param {string} message git提交备注
 */
async function uploadFileToGitee(useGlobal, filePath, content, message) {
    const cfg = getGiteeConfig(useGlobal);
    const { token, owner, repo } = cfg;

    if (!token || !owner || !repo) {
        throw new Error("缺少Gitee配置，请检查令牌、仓库信息");
    }

    // 文本转base64
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    const sha = await getGiteeSha(token, owner, repo, filePath);

    const body = {
        message: message,
        content: base64Content
    };
    if (sha) body.sha = sha;

    const res = await fetch(
        `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
        {
            method: "PUT",
            headers: {
                "Authorization": `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }
    );

    const result = await res.json();
    if (!res.ok) {
        throw new Error(result.message || "上传失败");
    }
    return result;
}

/**
 * 删除文件
 * @param {boolean} useGlobal
 * @param {string} filePath
 * @param {string} message
 */
async function deleteGiteeFile(useGlobal, filePath, message) {
    const cfg = getGiteeConfig(useGlobal);
    const { token, owner, repo } = cfg;
    if (!token || !owner || !repo) throw new Error("Gitee配置缺失");

    const sha = await getGiteeSha(token, owner, repo, filePath);
    if (!sha) throw new Error("未找到目标文件，无法删除");

    const res = await fetch(
        `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`,
        {
            method: "DELETE",
            headers: {
                "Authorization": `token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                sha: sha
            })
        }
    );
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "删除失败");
    return result;
}

// 挂载到全局window，页面可直接调用，不要加type="module"
window.uploadFileToGitee = uploadFileToGitee;
window.getGiteeSha = getGiteeSha;
window.getGiteeFile = getGiteeFile;
window.getGiteeConfig = getGiteeConfig;
window.deleteGiteeFile = deleteGiteeFile;
