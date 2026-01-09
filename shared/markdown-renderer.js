/**
 * Markdown 渲染器
 * 基于 marked.js v11.1.1
 * 轻量级、高性能、完整支持标准 Markdown 语法
 */

// 导入 marked.js
import { marked } from './marked.min.js';

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 配置 marked.js
 */
marked.setOptions({
  breaks: true,          // 支持换行（GFM 风格）
  gfm: true,            // GitHub Flavored Markdown
  pedantic: false,       // 不使用原始 markdown.pl 的怪异行为
  sanitize: false,       // 不自动清理 HTML（我们自己处理）
  smartLists: true,      // 智能列表行为
  smartypants: false,    // 不转换引号等
  highlight: function(code, lang) {
    // 代码高亮处理（保持原样，未来可扩展 highlight.js）
    return escapeHtml(code);
  }
});

/**
 * 渲染 Markdown 为 HTML
 * @param {string} markdown - Markdown 文本
 * @returns {string} HTML 字符串
 */
export function renderMarkdown(markdown) {
  if (!markdown) return '';
  
  try {
    return marked.parse(markdown);
  } catch (error) {
    console.error('Markdown 渲染失败:', error);
    // 出错时返回转义后的原文
    return `<p>${escapeHtml(markdown)}</p>`;
  }
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
 * 从 Markdown 中提取纯文本（移除格式）
 * @param {string} markdown - Markdown 文本
 * @returns {string} 纯文本
 */
export function extractPlainText(markdown) {
  if (!markdown) return '';
  
  try {
    // 使用 marked 的 lexer 提取文本
    const tokens = marked.lexer(markdown);
    let text = '';
    
    function extractFromTokens(tokens) {
      for (const token of tokens) {
        if (token.type === 'text') {
          text += token.text || '';
        } else if (token.type === 'paragraph') {
          text += token.text || token.raw || '';
          text += '\n';
        } else if (token.type === 'heading') {
          text += token.text || token.raw || '';
          text += '\n';
        } else if (token.type === 'list') {
          if (token.items) {
            extractFromTokens(token.items);
          }
        } else if (token.type === 'list_item') {
          text += '• ' + (token.text || token.raw || '') + '\n';
        } else if (token.type === 'code') {
          text += token.text || '';
          text += '\n';
        } else if (token.type === 'codespan') {
          text += token.text || '';
        } else if (token.tokens) {
          extractFromTokens(token.tokens);
        }
      }
    }
    
    extractFromTokens(tokens);
    return text.trim();
  } catch (error) {
    console.error('提取纯文本失败:', error);
    // 简单回退：移除 Markdown 标记
    return markdown
      .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
      .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
      .replace(/```[\s\S]*?```/g, '[代码块]')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .trim();
  }
}
