/**
 * WebMind Content Script
 * 负责提取网页内容
 */

console.log('WebMind Content Script loaded');

/**
 * 提取网页主要内容
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
  
  // 提取文本
  let text = contentElement.innerText || contentElement.textContent;
  
  // 清理文本
  text = text
    .replace(/\n{3,}/g, '\n\n')  // 移除多余的空行
    .replace(/[ \t]+/g, ' ')     // 合并多余的空格
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
  
  // 提取链接
  const links = [];
  contentElement.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    const text = link.textContent.trim();
    if (href && text && !href.startsWith('#')) {
      try {
        const absoluteUrl = new URL(href, window.location.href);
        links.push({
          text: text,
          url: absoluteUrl.href
        });
      } catch (e) {
        // 忽略无效的 URL
      }
    }
  });
  
  // 提取图片
  const images = [];
  contentElement.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt') || '';
    if (src) {
      try {
        const absoluteUrl = new URL(src, window.location.href);
        images.push({
          url: absoluteUrl.href,
          alt: alt
        });
      } catch (e) {
        // 忽略无效的 URL
      }
    }
  });
  
  return {
    text: text,
    metadata: metadata,
    links: links.slice(0, 50), // 限制链接数量
    images: images.slice(0, 20), // 限制图片数量
    wordCount: text.split(/\s+/).length,
    charCount: text.length
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

