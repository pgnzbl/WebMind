/**
 * 真正的 DOCX 文档生成器
 * 使用 JSZip 生成符合 Open XML 标准的 .docx 文件
 */

/**
 * 下载图片并返回 Blob
 * @param {string} imageUrl - 图片 URL
 * @returns {Promise<{blob: Blob, ext: string}>}
 */
async function downloadImageBlob(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      mode: 'cors',
      cache: 'default'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const blob = await response.blob();
    const type = blob.type;
    let ext = 'png';
    
    if (type.includes('jpeg') || type.includes('jpg')) ext = 'jpeg';
    else if (type.includes('png')) ext = 'png';
    else if (type.includes('gif')) ext = 'gif';
    else if (type.includes('bmp')) ext = 'bmp';
    
    return { blob, ext, type };
  } catch (error) {
    console.error(`Failed to download image ${imageUrl}:`, error);
    return null;
  }
}

/**
 * 获取图片尺寸
 */
async function getImageDimensions(blob) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      resolve({ width: 600, height: 400 }); // 默认尺寸
    };
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * 解析 Markdown 为文档块
 */
function parseMarkdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) continue;
    
    // 代码块 ```code```
    if (trimmed === '```' || trimmed.match(/^```[\w\-]*$/)) {
      const codeLines = [];
      const langMatch = trimmed.match(/^```([\w\-]+)$/);
      const language = langMatch ? langMatch[1] : '';
      i++; // 跳过开始的 ```
      
      while (i < lines.length) {
        const codeLine = lines[i];
        if (codeLine.trim() === '```') {
          i++; // 跳过结束的 ```
          break;
        }
        codeLines.push(codeLine);
        i++;
      }
      i--; // 回退一行（for 循环会自动 +1）
      
      blocks.push({
        type: 'code',
        language: language,
        content: codeLines.join('\n')
      });
      continue;
    }
    
    // 标题
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2]
      });
      continue;
    }
    
    // 图片
    const imageMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      blocks.push({
        type: 'image',
        alt: imageMatch[1],
        url: imageMatch[2]
      });
      continue;
    }
    
    // 水平线 --- 或 ***
    if (trimmed.match(/^[-*]{3,}$/)) {
      blocks.push({
        type: 'hr'
      });
      continue;
    }
    
    // 引用块 > text
    if (trimmed.match(/^>\s+/)) {
      const quoteLines = [];
      while (i < lines.length) {
        const quoteLine = lines[i].trim();
        const match = quoteLine.match(/^>\s+(.+)$/);
        if (!match) break;
        quoteLines.push(match[1]);
        i++;
      }
      i--; // 回退一行
      blocks.push({
        type: 'blockquote',
        content: parseInlineFormats(quoteLines.join(' '))
      });
      continue;
    }
    
    // 有序列表项 1. 2. 3.
    if (trimmed.match(/^\d+\.\s+/)) {
      const listItems = [];
      while (i < lines.length) {
        const listLine = lines[i].trim();
        const match = listLine.match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        listItems.push(parseInlineFormats(match[1]));
        i++;
      }
      i--; // 回退一行
      blocks.push({
        type: 'orderedList',
        items: listItems
      });
      continue;
    }
    
    // 无序列表项 - 或 *
    if (trimmed.match(/^[-*]\s+/)) {
      const listItems = [];
      while (i < lines.length) {
        const listLine = lines[i].trim();
        const match = listLine.match(/^[-*]\s+(.+)$/);
        if (!match) break;
        listItems.push(parseInlineFormats(match[1]));
        i++;
      }
      i--; // 回退一行
      blocks.push({
        type: 'list',
        items: listItems
      });
      continue;
    }
    
    // 普通段落
    blocks.push({
      type: 'paragraph',
      content: parseInlineFormats(trimmed)
    });
  }
  
  return blocks;
}

/**
 * 解析行内格式（粗体、斜体、链接等）
 */
function parseInlineFormats(text) {
  const segments = [];
  let current = '';
  let i = 0;
  
  while (i < text.length) {
    // 粗体 **text**
    if (text.substr(i, 2) === '**') {
      if (current) {
        segments.push({ text: current });
        current = '';
      }
      i += 2;
      let boldText = '';
      while (i < text.length && text.substr(i, 2) !== '**') {
        boldText += text[i];
        i++;
      }
      if (boldText) {
        segments.push({ text: boldText, bold: true });
      }
      i += 2;
      continue;
    }
    
    // 斜体 *text*
    if (text[i] === '*' && text.substr(i, 2) !== '**') {
      if (current) {
        segments.push({ text: current });
        current = '';
      }
      i++;
      let italicText = '';
      while (i < text.length && text[i] !== '*') {
        italicText += text[i];
        i++;
      }
      if (italicText) {
        segments.push({ text: italicText, italic: true });
      }
      i++;
      continue;
    }
    
    // 行内代码 `code`
    if (text[i] === '`') {
      if (current) {
        segments.push({ text: current });
        current = '';
      }
      i++;
      let codeText = '';
      while (i < text.length && text[i] !== '`') {
        codeText += text[i];
        i++;
      }
      if (codeText) {
        segments.push({ text: codeText, code: true });
      }
      i++;
      continue;
    }
    
    // 链接 [text](url)
    const linkMatch = text.substr(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      if (current) {
        segments.push({ text: current });
        current = '';
      }
      segments.push({ 
        text: linkMatch[1], 
        link: linkMatch[2]
      });
      i += linkMatch[0].length;
      continue;
    }
    
    current += text[i];
    i++;
  }
  
  if (current) {
    segments.push({ text: current });
  }
  
  return segments.length > 0 ? segments : [{ text: text }];
}

/**
 * 转义 XML 字符
 */
function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 生成 [Content_Types].xml
 */
function generateContentTypes(imageCount) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="gif" ContentType="image/gif"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  return xml;
}

/**
 * 生成 _rels/.rels
 */
function generateRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

/**
 * 生成 word/_rels/document.xml.rels
 */
function generateDocumentRels(imageCount) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
  
  for (let i = 0; i < imageCount; i++) {
    xml += `
  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i + 1}.${imageCount > 0 ? 'png' : 'png'}"/>`;
  }
  
  xml += `
</Relationships>`;
  return xml;
}

/**
 * 生成文本运行（run）
 */
function generateRun(segment) {
  let xml = '<w:r>';
  
  // 总是添加字体属性
  xml += '<w:rPr>';
  
  // 字体设置：代码用 Consolas，其他用宋体
  if (segment.code) {
    xml += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas"/>';
    xml += '<w:shd w:val="clear" w:fill="F3F3F3"/>';
  } else {
    xml += '<w:rFonts w:ascii="SimSun" w:hAnsi="SimSun" w:eastAsia="SimSun" w:hint="eastAsia"/>';
  }
  
  // 加粗
  if (segment.bold) {
    xml += '<w:b/>';
    xml += '<w:bCs/>';
  }
  
  // 斜体
  if (segment.italic) {
    xml += '<w:i/>';
    xml += '<w:iCs/>';
  }
  
  // 链接样式
  if (segment.link) {
    xml += '<w:color w:val="0563C1"/>';
    xml += '<w:u w:val="single"/>';
  }
  
  // 字号：小四 12pt = 24 half-points
  xml += '<w:sz w:val="24"/>';
  xml += '<w:szCs w:val="24"/>';
  
  xml += '</w:rPr>';
  
  xml += `<w:t xml:space="preserve">${escapeXml(segment.text)}</w:t>`;
  xml += '</w:r>';
  
  return xml;
}

/**
 * 生成图片段落
 */
function generateImageParagraph(imageIndex, width, height) {
  // EMUs (English Metric Units): 1 inch = 914400 EMUs, 1 cm = 360000 EMUs
  // 限制图片宽度不超过 6 英寸 (约 15cm)
  const maxWidthEMU = 914400 * 6;
  let widthEMU = width * 9525; // 像素转 EMU (约)
  let heightEMU = height * 9525;
  
  if (widthEMU > maxWidthEMU) {
    const ratio = maxWidthEMU / widthEMU;
    widthEMU = maxWidthEMU;
    heightEMU = Math.round(heightEMU * ratio);
  }
  
  const rId = `rId${imageIndex + 1}`;
  
  return `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="120" w:after="240" w:line="360" w:lineRule="auto"/>
        <w:ind w:firstLine="0" w:firstLineChars="0" w:left="0" w:leftChars="0"/>
      </w:pPr>
      <w:r>
        <w:rPr/>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="${widthEMU}" cy="${heightEMU}"/>
            <wp:docPr id="${imageIndex + 1}" name="图片 ${imageIndex + 1}"/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="${imageIndex + 1}" name="图片${imageIndex + 1}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${rId}"/>
                    <a:stretch>
                      <a:fillRect/>
                    </a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${widthEMU}" cy="${heightEMU}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect">
                      <a:avLst/>
                    </a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>`;
}

/**
 * 生成代码块
 */
function generateCodeBlock(code, language = '') {
  let xml = '';
  
  // 代码块标题（语言标识）
  if (language) {
    xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="120" w:after="0" w:line="240" w:lineRule="auto"/>
        <w:ind w:firstLine="0" w:firstLineChars="0" w:left="0" w:leftChars="0"/>
        <w:jc w:val="left"/>
        <w:shd w:val="clear" w:fill="E8E8E8"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas"/>
          <w:b/>
          <w:bCs/>
          <w:sz w:val="20"/>
          <w:szCs w:val="20"/>
          <w:color w:val="666666"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(language)}</w:t>
      </w:r>
    </w:p>`;
  }
  
  // 代码内容按行拆分
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
        <w:ind w:firstLine="0" w:firstLineChars="0" w:left="240" w:leftChars="100"/>
        <w:jc w:val="left"/>
        <w:shd w:val="clear" w:fill="F5F5F5"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="Consolas"/>
          <w:sz w:val="20"/>
          <w:szCs w:val="20"/>
          <w:color w:val="333333"/>
        </w:rPr>
        <w:t xml:space="preserve">${line ? escapeXml(line) : ' '}</w:t>
      </w:r>
    </w:p>`;
  }
  
  // 代码块后添加空行
  xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="120"/>
      </w:pPr>
    </w:p>`;
  
  return xml;
}

/**
 * 生成 word/document.xml
 */
function generateDocument(blocks, images) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>`;
  
  let imageIndex = 0;
  
  blocks.forEach(block => {
    if (block.type === 'heading') {
      // 中文文档标准字号（半角点数）
      // H1(##): 三号 16pt = 32, H2(###): 四号 14pt = 28, H3(####): 小四 12pt = 24
      // H4-H6: 小四 12pt = 24
      const fontSizes = [32, 28, 24, 24, 24, 24]; // 对应 H1-H6
      const fontSize = fontSizes[block.level - 1];
      
      // 标题后间距：一级标题 360twips(1.5行)，其他标题 240twips(1行)
      const spacingAfter = block.level === 1 ? 360 : 240;
      
      xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="${spacingAfter}" w:line="360" w:lineRule="auto"/>
        <w:ind w:firstLine="0" w:firstLineChars="0" w:left="0" w:leftChars="0"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="SimHei" w:hAnsi="SimHei" w:eastAsia="SimHei" w:hint="eastAsia"/>
          <w:b/>
          <w:bCs/>
          <w:sz w:val="${fontSize}"/>
          <w:szCs w:val="${fontSize}"/>
        </w:rPr>
        <w:t>${escapeXml(block.content)}</w:t>
      </w:r>
    </w:p>`;
    } else if (block.type === 'paragraph') {
      xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/>
        <w:ind w:firstLine="0" w:firstLineChars="0" w:left="0" w:leftChars="0"/>
        <w:jc w:val="left"/>
        <w:rPr>
          <w:rFonts w:ascii="SimSun" w:hAnsi="SimSun" w:eastAsia="SimSun" w:hint="eastAsia"/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
        </w:rPr>
      </w:pPr>`;
      block.content.forEach(segment => {
        xml += generateRun(segment);
      });
      xml += `
    </w:p>`;
    } else if (block.type === 'list') {
      block.items.forEach(item => {
        xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="100" w:line="360" w:lineRule="auto"/>
        <w:ind w:left="420" w:leftChars="0" w:hanging="420" w:hangingChars="200"/>
        <w:numPr>
          <w:ilvl w:val="0"/>
          <w:numId w:val="1"/>
        </w:numPr>
        <w:rPr>
          <w:rFonts w:ascii="SimSun" w:hAnsi="SimSun" w:eastAsia="SimSun" w:hint="eastAsia"/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
        </w:rPr>
      </w:pPr>`;
        item.forEach(segment => {
          xml += generateRun(segment);
        });
        xml += `
    </w:p>`;
      });
    } else if (block.type === 'image') {
      const imageData = images[block.url];
      if (imageData) {
        xml += generateImageParagraph(imageIndex, imageData.width, imageData.height);
        imageIndex++;
      } else {
        // 图片加载失败，显示占位文本
        xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/>
        <w:ind w:firstLine="0" w:firstLineChars="0" w:left="0" w:leftChars="0"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:color w:val="999999"/>
          <w:i/>
        </w:rPr>
        <w:t>[图片加载失败: ${escapeXml(block.alt || block.url)}]</w:t>
      </w:r>
    </w:p>`;
      }
    } else if (block.type === 'code') {
      // 代码块
      xml += generateCodeBlock(block.content, block.language);
    } else if (block.type === 'orderedList') {
      // 有序列表
      block.items.forEach((item, index) => {
        xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="100" w:line="360" w:lineRule="auto"/>
        <w:ind w:left="420" w:leftChars="0" w:hanging="420" w:hangingChars="200"/>
        <w:numPr>
          <w:ilvl w:val="0"/>
          <w:numId w:val="2"/>
        </w:numPr>
        <w:rPr>
          <w:rFonts w:ascii="SimSun" w:hAnsi="SimSun" w:eastAsia="SimSun" w:hint="eastAsia"/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
        </w:rPr>
      </w:pPr>`;
        item.forEach(segment => {
          xml += generateRun(segment);
        });
        xml += `
    </w:p>`;
      });
    } else if (block.type === 'blockquote') {
      // 引用块
      xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="120" w:line="360" w:lineRule="auto"/>
        <w:ind w:left="420" w:leftChars="200" w:firstLine="0" w:firstLineChars="0"/>
        <w:jc w:val="left"/>
        <w:shd w:val="clear" w:fill="F5F5F5"/>
        <w:rPr>
          <w:rFonts w:ascii="SimSun" w:hAnsi="SimSun" w:eastAsia="SimSun" w:hint="eastAsia"/>
          <w:i/>
          <w:iCs/>
          <w:color w:val="666666"/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
        </w:rPr>
      </w:pPr>`;
      block.content.forEach(segment => {
        xml += generateRun(segment);
      });
      xml += `
    </w:p>`;
    } else if (block.type === 'hr') {
      // 水平线
      xml += `
    <w:p>
      <w:pPr>
        <w:spacing w:before="120" w:after="120"/>
        <w:ind w:firstLine="0" w:firstLineChars="0" w:left="0" w:leftChars="0"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/>
        </w:pBdr>
      </w:pPr>
    </w:p>`;
    }
  });
  
  xml += `
  </w:body>
</w:document>`;
  
  return xml;
}

/**
 * 生成真正的 DOCX 文件
 * @param {string} markdown - Markdown 内容
 * @param {string} filename - 文件名
 * @param {Function} onProgress - 进度回调
 */
export async function generateWordWithImages(markdown, filename, onProgress) {
  try {
    // 1. 解析 Markdown
    onProgress && onProgress({ step: 'parse', progress: 5, message: '解析文档结构...' });
    const blocks = parseMarkdownToBlocks(markdown);
    
    // 2. 提取所有图片
    const imageBlocks = blocks.filter(b => b.type === 'image');
    const imageUrls = imageBlocks.map(b => b.url);
    
    onProgress && onProgress({ step: 'download', progress: 10, message: `发现 ${imageUrls.length} 张图片...` });
    
    // 3. 下载所有图片
    const images = {};
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      onProgress && onProgress({ 
        step: 'download', 
        progress: 10 + (i / imageUrls.length) * 40, 
        message: `下载图片 ${i + 1}/${imageUrls.length}...` 
      });
      
      const imageData = await downloadImageBlob(url);
      if (imageData) {
        const dimensions = await getImageDimensions(imageData.blob);
        images[url] = {
          blob: imageData.blob,
          ext: imageData.ext,
          width: dimensions.width,
          height: dimensions.height
        };
      }
    }
    
    // 4. 创建 ZIP (DOCX)
    onProgress && onProgress({ step: 'zip', progress: 60, message: '生成 DOCX 结构...' });
    
    const zip = new JSZip();
    
    // 添加 [Content_Types].xml
    zip.file('[Content_Types].xml', generateContentTypes(Object.keys(images).length));
    
    // 添加 _rels/.rels
    zip.file('_rels/.rels', generateRootRels());
    
    // 添加 word/document.xml
    zip.file('word/document.xml', generateDocument(blocks, images));
    
    // 添加 word/_rels/document.xml.rels
    zip.file('word/_rels/document.xml.rels', generateDocumentRels(Object.keys(images).length));
    
    // 添加图片文件
    let imgIndex = 1;
    for (const url in images) {
      const imageData = images[url];
      zip.file(`word/media/image${imgIndex}.${imageData.ext}`, imageData.blob);
      imgIndex++;
    }
    
    // 5. 生成 Blob
    onProgress && onProgress({ step: 'generate', progress: 90, message: '打包文件...' });
    
    const blob = await zip.generateAsync({ 
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    
    // 6. 触发下载
    onProgress && onProgress({ step: 'save', progress: 95, message: '保存文件...' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    onProgress && onProgress({ step: 'complete', progress: 100, message: '导出完成！' });
    
    return true;
  } catch (error) {
    console.error('Failed to generate DOCX:', error);
    throw error;
  }
}
