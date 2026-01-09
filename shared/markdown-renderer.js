/**
 * 轻量级 Markdown 渲染器
 * 支持基本的 Markdown 语法，特别优化图片显示
 */

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 渲染 Markdown 为 HTML
 * @param {string} markdown - Markdown 文本
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // 1. 转义 HTML（但保留换行符）
  // html = escapeHtml(html); // 暂不转义，因为我们要插入 HTML 标签
  
  // 2. 处理代码块 ```code```
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
  });
  
  // 3. 处理图片 ![alt](url)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" class="md-image" loading="lazy" />`;
  });
  
  // 4. 处理链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
  });
  
  // 5. 处理标题
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  
  // 6. 处理粗体 **text** 或 __text__
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // 7. 处理斜体 *text* 或 _text_
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // 8. 处理行内代码 `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 9. 处理引用块 > text
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  
  // 10. 处理水平分割线 ---
  html = html.replace(/^---$/gm, '<hr/>');
  
  // 11. 处理有序列表项 1. item, 2. item (使用临时标记 <oli>)
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<oli>$2</oli>');
  
  // 12. 处理无序列表项 - item
  html = html.replace(/^-\s+(.+)$/gm, '<li>$1</li>');
  
  // 13. 将连续的 <oli> 包裹在 <ol> 中，并转换为 <li>
  html = html.replace(/(<oli>[\s\S]*?<\/oli>\n?)+/g, (match) => {
    const items = match.replace(/<oli>/g, '<li>').replace(/<\/oli>/g, '</li>');
    return `<ol>${items}</ol>`;
  });
  
  // 14. 将连续的 <li> 包裹在 <ul> 中
  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => {
    return `<ul>${match}</ul>`;
  });
  
  // 15. 处理段落（连续的非标签文本）
  html = html.split('\n\n').map(block => {
    block = block.trim();
    if (!block) return '';
    
    // 如果已经是 HTML 标签，不要包裹 <p>
    if (block.match(/^<(h[1-6]|pre|ul|ol|blockquote|hr|img)/)) {
      return block;
    }
    
    // 否则包裹为段落
    return `<p>${block}</p>`;
  }).join('\n');
  
  // 16. 处理单个换行符为 <br>
  html = html.replace(/\n/g, '<br/>');
  
  return html;
}

/**
 * 渲染 Markdown 到指定元素
 * @param {HTMLElement} element - 目标元素
 * @param {string} markdown - Markdown 文本
 */
export function renderToElement(element, markdown) {
  if (!element) return;
  
  const html = renderMarkdown(markdown);
  element.innerHTML = html;
  
  // 添加样式类
  element.classList.add('markdown-content');
}

/**
 * 从 Markdown 中提取纯文本（移除图片等）
 * @param {string} markdown - Markdown 文本
 * @returns {string} 纯文本
 */
export function extractPlainText(markdown) {
  if (!markdown) return '';
  
  let text = markdown;
  
  // 移除图片
  text = text.replace(/!\[.*?\]\(.*?\)/g, '[图片]');
  
  // 移除链接但保留文本
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // 移除标题标记
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // 移除粗体/斜体标记
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  
  // 移除代码标记
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // 移除引用标记
  text = text.replace(/^>\s+/gm, '');
  
  return text.trim();
}
