/**
 * Version Management Module
 * 统一的版本号管理模块
 * 
 * 版本号统一从 manifest.json 读取，确保所有显示位置一致
 */

/**
 * 获取当前扩展版本号
 * @returns {string} 版本号（例如: "2.0.0"）
 */
export function getVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    return manifest.version;
  } catch (error) {
    console.error('Failed to get version from manifest:', error);
    return '0.0.0';
  }
}

/**
 * 获取格式化的版本号
 * @param {string} prefix - 前缀（例如: "v", "版本 "）
 * @returns {string} 格式化的版本号
 */
export function getFormattedVersion(prefix = 'v') {
  return `${prefix}${getVersion()}`;
}

/**
 * 更新页面中所有版本号显示
 * @param {string} selector - CSS 选择器（例如: ".version", "#app-version"）
 * @param {string} format - 格式化选项: "v" | "plain" | "cn"
 */
export function updateVersionElements(selector, format = 'v') {
  const version = getVersion();
  const elements = document.querySelectorAll(selector);
  
  let displayText;
  switch (format) {
    case 'v':
      displayText = `v${version}`;
      break;
    case 'cn':
      displayText = `版本 ${version}`;
      break;
    case 'plain':
      displayText = version;
      break;
    default:
      displayText = `v${version}`;
  }
  
  elements.forEach(element => {
    element.textContent = displayText;
  });
}

/**
 * 比较版本号
 * @param {string} v1 - 版本号 1
 * @param {string} v2 - 版本号 2
 * @returns {number} -1: v1 < v2, 0: v1 = v2, 1: v1 > v2
 */
export function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

export default {
  getVersion,
  getFormattedVersion,
  updateVersionElements,
  compareVersions
};

