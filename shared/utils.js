/**
 * WebMind 工具函数模块
 * 提供通用的辅助函数
 */

/**
 * 延迟函数
 * @param {number} ms 
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化日期时间
 * @param {Date|string} date 
 * @param {string} format 
 * @returns {string}
 */
export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '';
  
  // 确保转换为 Date 对象
  const d = date instanceof Date ? date : new Date(date);
  
  // 验证日期是否有效
  if (isNaN(d.getTime())) {
    console.error('Invalid date:', date);
    return '';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 格式化文件大小
 * @param {number} bytes 
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 防抖函数
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func 
 * @param {number} limit 
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 深拷贝对象
 * @param {any} obj 
 * @returns {any}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 下载文件
 * @param {string} content 
 * @param {string} filename 
 * @param {string} mimeType 
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 复制文本到剪贴板
 * @param {string} text 
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

/**
 * 安全的 JSON 解析
 * @param {string} str 
 * @param {any} defaultValue 
 * @returns {any}
 */
export function safeJSONParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 截断文本
 * @param {string} text 
 * @param {number} maxLength 
 * @param {string} suffix 
 * @returns {string}
 */
export function truncate(text, maxLength = 100, suffix = '...') {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 转义 HTML
 * @param {string} html 
 * @returns {string}
 */
export function escapeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * 生成随机颜色
 * @returns {string}
 */
export function randomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

/**
 * 验证 URL
 * @param {string} url 
 * @returns {boolean}
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 提取域名
 * @param {string} url 
 * @returns {string|null}
 */
export function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

/**
 * 生成文件名安全的字符串
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeFilename(str) {
  return str
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 200);
}

/**
 * 计算字符串的 token 数（粗略估算）
 * @param {string} text 
 * @returns {number}
 */
export function estimateTokens(text) {
  // 简单估算：中文字符约 1.5 token，英文单词约 1.3 token
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const others = text.length - chineseChars - englishWords;
  
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3 + others * 0.5);
}

/**
 * 显示通知
 * @param {string} title 
 * @param {string} message 
 * @param {string} type 
 */
export function showNotification(title, message, type = 'info') {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: title,
      message: message
    });
  }
}

/**
 * 重试函数
 * @param {Function} fn 
 * @param {number} maxRetries 
 * @param {number} delayMs 
 * @returns {Promise<any>}
 */
export async function retry(fn, maxRetries = 3, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(delayMs * (i + 1));
    }
  }
}

/**
 * 批量处理
 * @param {Array} items 
 * @param {Function} handler 
 * @param {number} batchSize 
 * @returns {Promise<Array>}
 */
export async function batchProcess(items, handler, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(handler));
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * 下载图片并转换为 base64
 * @param {string} imageUrl - 图片 URL
 * @returns {Promise<{base64: string, type: string} | null>}
 */
async function downloadImageAsBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      mode: 'cors',
      cache: 'default'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    const type = blob.type || 'image/png';
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          base64: reader.result,
          type: type
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to download image ${imageUrl}:`, error);
    return null;
  }
}

/**
 * 提取 Markdown 中的所有图片 URL
 * @param {string} markdown - Markdown 文本
 * @returns {Array<{url: string, alt: string}>}
 */
function extractImagesFromMarkdown(markdown) {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images = [];
  let match;
  
  while ((match = imageRegex.exec(markdown)) !== null) {
    images.push({
      alt: match[1] || '图片',
      url: match[2]
    });
  }
  
  return images;
}

/**
 * 复制为富文本（HTML 格式，图片嵌入为 base64）
 * @param {string} markdown - Markdown 内容
 * @param {Function} onProgress - 进度回调函数 (current, total, message)
 * @returns {Promise<boolean>}
 */
export async function copyAsRichText(markdown, onProgress) {
  try {
    // 1. 提取所有图片 URL
    const images = extractImagesFromMarkdown(markdown);
    onProgress && onProgress(0, images.length, '正在分析图片...');
    
    // 2. 下载所有图片并转换为 base64
    const imageMap = new Map();
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      onProgress && onProgress(i + 1, images.length, `下载图片 ${i + 1}/${images.length}...`);
      
      const imageData = await downloadImageAsBase64(image.url);
      if (imageData) {
        imageMap.set(image.url, imageData.base64);
      }
    }
    
    // 3. 动态导入 marked 库来渲染 Markdown
    onProgress && onProgress(images.length, images.length, '生成 HTML...');
    
    // 使用 marked 库渲染 HTML
    const { marked } = await import('./marked.min.js');
    let html = marked.parse(markdown);
    
    // 4. 替换 HTML 中的图片 URL 为 base64
    for (const [url, base64] of imageMap.entries()) {
      // 匹配 <img src="url" ...> 格式
      const imgRegex = new RegExp(`<img([^>]*?)src=["']${escapeRegExp(url)}["']([^>]*?)>`, 'g');
      html = html.replace(imgRegex, `<img$1src="${base64}"$2>`);
    }
    
    // 5. 添加基本样式使富文本更美观
    const styledHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
  }
  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em 0;
  }
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }
  h1 { font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.25em; }
  code {
    background: #f4f4f4;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: "Consolas", "Monaco", monospace;
  }
  pre {
    background: #f4f4f4;
    padding: 10px;
    border-radius: 5px;
    overflow-x: auto;
  }
  pre code {
    background: none;
    padding: 0;
  }
  blockquote {
    border-left: 4px solid #ddd;
    margin: 1em 0;
    padding-left: 1em;
    color: #666;
  }
  ul, ol {
    padding-left: 2em;
  }
  a {
    color: #0066cc;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
</style>
</head>
<body>
${html}
</body>
</html>`;
    
    // 6. 写入剪贴板
    onProgress && onProgress(images.length, images.length, '复制到剪贴板...');
    
    // 使用 Clipboard API 写入富文本
    const blob = new Blob([styledHtml], { type: 'text/html' });
    const clipboardItem = new ClipboardItem({
      'text/html': blob,
      'text/plain': new Blob([markdown], { type: 'text/plain' })
    });
    
    await navigator.clipboard.write([clipboardItem]);
    
    onProgress && onProgress(images.length, images.length, '复制成功！');
    return true;
  } catch (error) {
    console.error('Failed to copy as rich text:', error);
    throw error;
  }
}

/**
 * 转义正则表达式特殊字符
 * @param {string} string 
 * @returns {string}
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
