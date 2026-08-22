/**
 * giteeApiUtils.js
 * 公共Gitee工具：安全解析、日志、按钮禁用、限流检测、gitee基础API
 * 支持：全局共享配置 / 页面独立配置（由页面的复选框开关控制）
 */

// ========== 全局共享配置（所有页面共用） ==========
const GLOBAL_CONFIG_KEY = "gitee_global_config";

/**
 * 获取全局配置
 */
function getGiteeGlobalConfig() {
    const str = localStorage.getItem(GLOBAL_CONFIG_KEY);
    if (!str) return { repo: "", token: "", branch: "main" };
    try {
        return JSON.parse(str);
    } catch (e) {
        return { repo: "", token: "", branch: "main" };
    }
}

/**
 * 保存全局配置
 * @param {Object} cfg {repo,token,branch}
 */
function saveGiteeGlobalConfig(cfg) {
    localStorage.setItem(GLOBAL_CONFIG_KEY, JSON.stringify(cfg));
}

/**
 * 获取页面私有配置
 * @param {string} pageKey 页面存储key，例如 "songlist_local_config"
 */
function getPageLocalConfig(pageKey) {
    const str = localStorage.getItem(pageKey);
    if (!str) return { repo: "", token: "", branch: "main" };
    try {
        return JSON.parse(str);
    } catch (e) {
        return { repo: "", token: "", branch: "main" };
    }
}

/**
 * 保存页面私有配置
 * @param {string} pageKey
 * @param {Object} cfg
 */
function savePageLocalConfig(pageKey, cfg) {
    localStorage.setItem(pageKey, JSON.stringify(cfg));
}

/**
 * 安全解析fetch响应，兼容Gitee限流返回HTML页面
 * @param {Response} resp
 * @returns {Promise<any>}
 */
async function safeParseJson(resp) {
    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
        const text = await resp.text();
        return { __isHtml: true, status: resp.status, text };
    }
    return await resp.json();
}

/**
 * 追加日志，自动带时间戳、滚动到底部
 * @param {HTMLElement} logEl 日志DOM容器
 * @param {string} msg 日志文本
 */
function appendLog(logEl, msg) {
    const t = new Date().toLocaleTimeString();
    logEl.innerText += `[${t}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
}

/**
 * 批量设置一组按钮禁用/启用状态
 * @param {HTMLElement[]} btnList DOM按钮数组
 * @param {boolean} disabled true禁用，false启用
 */
function setButtonsDisabled(btnList, disabled) {
    btnList.forEach(btn => {
        if (btn) btn.disabled = disabled;
    });
}

/**
 * 检测429限流并输出日志
 * @param {Response} resp fetch响应
 * @param {HTMLElement} logEl 日志DOM
 * @returns {boolean} true = 触发限流
 */
function checkRateLimit(resp, logEl) {
    if (resp.status === 429) {
        appendLog(logEl, "⚠️Gitee限流，请等待几分钟后重试");
        return true;
    }
    return false;
}

// ========== Gitee基础API，需要传入当前页面实际cfg ==========

/**
 * 获取文件内容与sha
 * @param {Object} cfg {repo,token,branch} 当前生效配置
 * @param {string} filePath 仓库内文件路径
 * @param {HTMLElement} logEl
 * @returns {Promise<{ok:boolean, sha:string|null, content:string|null, respJson:any}>}
 */
async function giteeGetFile(cfg, filePath, logEl) {
    if (!cfg.repo || !cfg.token) {
        appendLog(logEl, "❌请先填写仓库和Gitee Token");
        return { ok: false, sha: null, content: null, respJson: null };
    }
    const url = `https://gitee.com/api/v5/repos/${cfg.repo}/contents/${encodeURIComponent(filePath)}?access_token=${cfg.token}&ref=${cfg.branch}`;
    try {
        const resp = await fetch(url);
        if (resp.status === 404) {
            return { ok: true, sha: null, content: null, respJson: null };
        }
        if (checkRateLimit(resp, logEl)) {
            return { ok: false, sha: null, content: null, respJson: null };
        }
        const json = await safeParseJson(resp);
        if (json.__isHtml) {
            appendLog(logEl, `⚠️接口返回HTML，状态${json.status}，触发风控/限流`);
            return { ok: false, sha: null, content: null, respJson: json };
        }
        if (!resp.ok) {
            appendLog(logEl, `❌读取文件失败 ${JSON.stringify(json)}`);
            return { ok: false, sha: null, content: null, respJson: json };
        }
        return {
            ok: true,
            sha: json.sha,
            content: json.content,
            respJson: json
        };
    } catch (err) {
        appendLog(logEl, `读取文件异常:${err.message}`);
        return { ok: false, sha: null, content: null, respJson: null };
    }
}

/**
 * 创建 / 更新文件
 * @param {Object} cfg {repo,token,branch} 当前生效配置
 * @param {string} filePath 文件路径
 * @param {string} base64Content base64编码后的文本
 * @param {string|null} sha 已有文件传sha；新建传null
 * @param {string} commitMsg commit信息
 * @param {HTMLElement} logEl
 * @returns {Promise<{ok:boolean, newSha:string|null, respJson:any}>}
 */
async function giteeSaveFile(cfg, filePath, base64Content, sha, commitMsg, logEl) {
    if (!cfg.repo || !cfg.token) {
        appendLog(logEl, "❌请先填写仓库和Gitee Token");
        return { ok: false, newSha: null, respJson: null };
    }
    const url = `https://gitee.com/api/v5/repos/${cfg.repo}/contents/${encodeURIComponent(filePath)}`;
    const payload = {
        access_token: cfg.token,
        branch: cfg.branch,
        message: commitMsg,
        content: base64Content
    };
    if (sha) payload.sha = sha;
    const method = sha ? "PUT" : "POST";
    try {
        const resp = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (checkRateLimit(resp, logEl)) {
            return { ok: false, newSha: null, respJson: null };
        }
        const json = await safeParseJson(resp);
        if (json.__isHtml) {
            appendLog(logEl, "⚠️保存失败，接口返回HTML页面，风控限流");
            return { ok: false, newSha: null, respJson: json };
        }
        if (!resp.ok) {
            appendLog(logEl, `❌保存失败:${JSON.stringify(json)}`);
            return { ok: false, newSha: null, respJson: json };
        }
        return {
            ok: true,
            newSha: json.content.sha,
            respJson: json
        };
    } catch (err) {
        appendLog(logEl, `保存异常:${err.message}`);
        return { ok: false, newSha: null, respJson: null };
    }
}
