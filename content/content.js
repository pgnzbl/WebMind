/**
 * WebMind Content Script
 * 负责提取网页内容
 */

console.log('WebMind Content Script loaded');

/**
 * 将 DOM 节点转换为 Markdown
 */
function nodeToMarkdown(node, baseUrl) {
  if (!node) return '';
  
  // 文本节点
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.trim();
  }
  
  // 元素节点
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase();
    
    // 跳过不需要的元素
    const skipTags = ['script', 'style', 'nav', 'header', 'footer', 'iframe'];
    if (skipTags.includes(tagName)) {
      return '';
    }
    
    // 处理子节点
    const childrenMarkdown = Array.from(node.childNodes)
      .map(child => nodeToMarkdown(child, baseUrl))
      .filter(text => text.trim())
      .join(' ');
    
    // 根据标签类型转换为 Markdown
    switch (tagName) {
      case 'h1':
        return `\n\n# ${childrenMarkdown}\n\n`;
      case 'h2':
        return `\n\n## ${childrenMarkdown}\n\n`;
      case 'h3':
        return `\n\n### ${childrenMarkdown}\n\n`;
      case 'h4':
        return `\n\n#### ${childrenMarkdown}\n\n`;
      case 'h5':
        return `\n\n##### ${childrenMarkdown}\n\n`;
      case 'h6':
        return `\n\n###### ${childrenMarkdown}\n\n`;
      
      case 'p':
        return `\n\n${childrenMarkdown}\n\n`;
      
      case 'br':
        return '\n';
      
      case 'strong':
      case 'b':
        return `**${childrenMarkdown}**`;
      
      case 'em':
      case 'i':
        return `*${childrenMarkdown}*`;
      
      case 'code':
        return `\`${childrenMarkdown}\``;
      
      case 'pre':
        return `\n\n\`\`\`\n${childrenMarkdown}\n\`\`\`\n\n`;
      
      case 'blockquote':
        return `\n\n> ${childrenMarkdown}\n\n`;
      
      case 'ul':
      case 'ol':
        return `\n${childrenMarkdown}\n`;
      
      case 'li':
        return `\n- ${childrenMarkdown}`;
      
      case 'a':
        const href = node.getAttribute('href');
        if (href && !href.startsWith('#')) {
          try {
            const absoluteUrl = new URL(href, baseUrl);
            return `[${childrenMarkdown}](${absoluteUrl.href})`;
          } catch (e) {
            return childrenMarkdown;
          }
        }
        return childrenMarkdown;
      
      case 'img':
        const src = node.getAttribute('src');
        const alt = node.getAttribute('alt') || '图片';
        if (src) {
          try {
            const absoluteUrl = new URL(src, baseUrl);
            return `\n\n![${alt}](${absoluteUrl.href})\n\n`;
          } catch (e) {
            return '';
          }
        }
        return '';
      
      case 'hr':
        return '\n\n---\n\n';
      
      case 'div':
      case 'section':
      case 'article':
      case 'main':
        return childrenMarkdown;
      
      default:
        return childrenMarkdown;
    }
  }
  
  return '';
}

/**
 * 提取网页主要内容（Markdown 格式）
 */
function extractContent() {
  // 移除不需要的元素
  const excludeSelectors = [
    'script', 'style', 'nav', 'header', 'footer', 
    'iframe', '.advertisement', '.ad', '.sidebar',
    '.social-share', '.comments', '#comments'
  ];
  
  // 克隆 body 以避免修改原始 DOM
  const clone = document.body.cloneNode(true);
  
  // 移除排除的元素
  excludeSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // 尝试查找主要内容区域
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.content',
    '#content',
    '.main-content'
  ];
  
  let mainContent = null;
  for (const selector of contentSelectors) {
    mainContent = clone.querySelector(selector);
    if (mainContent && mainContent.textContent.trim().length > 200) {
      break;
    }
  }
  
  // 如果没有找到主要内容区域，使用整个 body
  const contentElement = mainContent || clone;
  
  // 转换为 Markdown 格式
  const baseUrl = window.location.href;
  let markdown = nodeToMarkdown(contentElement, baseUrl);
  
  // 清理 Markdown（移除多余的空行，但保留图片前后的换行）
  markdown = markdown
    .replace(/\n{4,}/g, '\n\n\n')  // 最多保留 2 个连续换行
    .replace(/[ \t]+/g, ' ')       // 合并多余的空格
    .trim();
  
  // 提取元数据
  const metadata = {
    title: document.title,
    url: window.location.href,
    description: document.querySelector('meta[name="description"]')?.content || '',
    author: document.querySelector('meta[name="author"]')?.content || '',
    publishDate: document.querySelector('meta[property="article:published_time"]')?.content || '',
    keywords: document.querySelector('meta[name="keywords"]')?.content || ''
  };
  
  // 统计图片数量（从 Markdown 中提取）
  const imageMatches = markdown.match(/!\[.*?\]\(.*?\)/g) || [];
  const imageCount = imageMatches.length;
  
  return {
    text: markdown,  // 现在返回 Markdown 格式的文本
    metadata: metadata,
    imageCount: imageCount,
    wordCount: markdown.split(/\s+/).length,
    charCount: markdown.length
  };
}

/**
 * 高亮显示提取的内容区域（调试用）
 */
function highlightMainContent() {
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.content'
  ];
  
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      element.style.outline = '3px solid #4f46e5';
      element.style.outlineOffset = '5px';
      
      // 3 秒后移除高亮
      setTimeout(() => {
        element.style.outline = '';
        element.style.outlineOffset = '';
      }, 3000);
      
      break;
    }
  }
}

/**
 * 创建浮动按钮（可选功能）
 */
function createFloatingButton() {
  // 检查是否已存在
  if (document.getElementById('webmind-float-btn')) {
    return;
  }
  
  const button = document.createElement('div');
  button.id = 'webmind-float-btn';
  button.innerHTML = '🧠';
  button.title = 'WebMind - 提取内容';
  
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });
  
  button.addEventListener('click', () => {
    // 打开扩展弹窗
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
  });
  
  document.body.appendChild(button);
}

/**
 * 监听来自 popup 或 background 的消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);
  
  switch (message.type) {
    case 'EXTRACT_CONTENT':
      try {
        const content = extractContent();
        sendResponse(content);
      } catch (error) {
        console.error('Failed to extract content:', error);
        sendResponse({ error: error.message });
      }
      break;
    
    case 'HIGHLIGHT_CONTENT':
      highlightMainContent();
      sendResponse({ success: true });
      break;
    
    case 'SHOW_FLOAT_BUTTON':
      createFloatingButton();
      sendResponse({ success: true });
      break;
    
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true; // 保持消息通道打开
});

// 页面加载完成后的初始化（可选）
if (document.readyState === 'complete') {
  // createFloatingButton(); // 取消注释以启用浮动按钮
} else {
  window.addEventListener('load', () => {
    // createFloatingButton(); // 取消注释以启用浮动按钮
  });
}

