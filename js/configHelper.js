// js/configHelper.js
window.CONFIG_KEYS = {
    GLOBAL: 'gitee_global_config'
};

/**
 * 获取工具配置 (优先独立配置，缺失字段从全局补全)
 * @param {string} toolKey - 如 'noteUpload', 'songList'
 */
window.getToolConfig = function (toolKey) {
    const defaultConfig = { token: '', owner: '', repo: '' };
    const globalStr = localStorage.getItem(window.CONFIG_KEYS.GLOBAL);
    const global = globalStr ? JSON.parse(globalStr) : {};

    const localStr = localStorage.getItem(toolKey + '_config');
    const local = localStr ? JSON.parse(localStr) : {};

    // 独立配置优先，但缺省字段用全局补全
    return { ...defaultConfig, ...global, ...local };
};

/**
 * 保存工具独立配置
 */
window.saveToolConfig = function (toolKey, config) {
    const { token, owner, repo } = config;
    localStorage.setItem(toolKey + '_config', JSON.stringify({ token, owner, repo }));
};

/**
 * 清除工具独立配置 (回退到全局)
 */
window.clearToolConfig = function (toolKey) {
    localStorage.removeItem(toolKey + '_config');
};

/**
 * 检查配置是否完整
 */
window.isConfigValid = function (config) {
    return !!(config.token && config.owner && config.repo);
};