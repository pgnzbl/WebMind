# 🧠 WebMind - 网页智能助手

一个强大的 Chrome 浏览器扩展，集成多个 AI 大模型服务和知识库（RAG）功能，将网页内容智能转换为结构化文档，支持基于知识库的智能问答。

> **v2.0.0 新特性**：新增知识库（RAG）功能，支持文档上传、向量检索和知识库增强的 AI 对话！

## ✨ 功能特性

### 🤖 多 AI 平台集成
- 支持 DeepSeek、通义千问、硅基流动、OpenAI 等主流 AI 服务
- 统一的 API 管理界面
- 自动检测可用模型

### 🎯 智能代理系统
- 创建自定义 AI Agent
- 配置专属 System Prompt
- 灵活的提示词模板
- 多模型选择（自动检测 + 手动添加）
- 支持文档生成和聊天两种模式

### 📚 知识库集成（RAG）
- **知识库管理**：创建、删除、查看知识库
- **文档上传**：支持 PDF、TXT、DOCX、MD 等格式
- **智能切分**：多种文件切分策略（固定大小、按段落、按标题等）
- **向量检索**：基于语义相似度的智能检索
- **代理增强**：为 AI 代理启用知识库，自动检索相关上下文
- **API 密钥认证**：支持后端 API 密钥安全认证

### 🌊 实时流式输出
- AI 生成内容实时显示，支持 Markdown 渲染
- 图片实时加载和显示
- 打字机效果和动画
- 随时停止或重新生成
- 完整的进度反馈
- 智能超时检测机制

### 📄 强大的文档导出
- **Markdown 格式**：保留图片链接，支持所有 Markdown 编辑器
- **Word 格式（.docx）**：真正的 Open XML 格式，图片自动下载并嵌入
- **图文混排**：智能提取网页图片，保持原始位置和格式
- **实时预览**：Markdown 渲染，图片即时显示
- **智能文件命名**：基于网页标题和时间戳

### 📊 历史记录管理
- 查看所有生成历史
- 一键查看历史内容
- 清理和管理功能

## 🚀 快速开始

### 安装

1. **下载项目**
   ```bash
   git clone https://github.com/pgnzbl/WebMind.git
   cd WebMind
   ```

2. **加载扩展**
   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 WebMind 项目目录

### 配置

1. **添加 API Key**
   - 点击扩展图标
   - 切换到"配置"标签
   - 输入你的 AI 平台 API Key
   - 点击"检测可用模型"

2. **配置知识库后端（可选）**
   - 点击扩展图标右上角 ⚙️
   - 切换到"知识库管理"标签
   - 配置 RAG 后端地址（默认：`http://localhost:8000`）
   - 如果后端启用了 API 密钥认证，输入 API 密钥
   - 点击"检查连接"验证配置
   - **注意**：需要先部署 [RagBackend](https://github.com/pgnzbl/RagBackend) 服务

3. **创建智能代理**
   - 点击扩展图标右上角 ⚙️
   - 点击"+ 创建新代理"
   - 填写以下信息：
     - 代理名称（如：技术文档分析师）
     - 描述（可选）
     - System Prompt（定义代理行为）
     - 提示词模板
     - 选择 AI 模型（从检测列表）
     - 或手动添加模型（输入模型名称，如 `qwen3-plus`）
     - **启用知识库**（可选）：勾选后可以选择知识库，AI 会自动检索相关知识
     - **代理模式**：选择"文档生成"或"聊天"模式
   - 点击"保存"

4. **管理知识库**
   - 在"知识库管理"页面
   - 创建新知识库
   - 上传文档（支持 PDF、TXT、DOCX、MD）
   - 选择文件切分策略
   - 查看和管理已上传的文档

### 使用

1. **生成文档（文档模式）**
   - 访问任意网页
   - 点击 WebMind 扩展图标
   - 选择一个智能代理（文档生成模式）
   - 点击"🚀 生成文档"
   - AI 会自动提取网页内容，如果代理启用了知识库，还会检索相关知识
   - 观看实时流式输出

2. **聊天模式**
   - 点击 WebMind 扩展图标
   - 选择一个智能代理（聊天模式）
   - 在输入框中输入问题
   - 点击"发送"
   - AI 会基于知识库（如果启用）和系统提示词回答

3. **导出文档**
   - 生成完成后
   - 点击"💾 下载 Markdown" 或 "📄 下载 Word"
   - 文档自动保存到下载目录

## 📖 使用示例

### 示例 1：技术文档分析

**代理配置**：
```
名称: 技术文档分析师
System Prompt: 你是专业的技术文档分析师。请仔细阅读技术文档，
提取核心概念、API 使用方法、代码示例和注意事项。
使用 Markdown 格式输出，代码要有语法高亮。

提示词模板:
请分析以下技术文档：

{{content}}

输出格式：
# 文档分析
## 核心概念
## API 说明
## 代码示例
## 注意事项
```

### 示例 2：新闻摘要

**代理配置**：
```
名称: 新闻摘要助手
System Prompt: 你是新闻编辑。提取新闻要点，包括：
事件概述、关键人物、时间地点、影响分析。
保持客观中立，简洁明了。

提示词模板:
请总结以下新闻：

{{content}}

输出格式：
# 新闻摘要
## 事件概述
## 关键信息
## 影响分析
```

## 🔧 技术架构

### 项目结构
```
WebMind/
├── manifest.json          # 扩展配置
├── popup/                 # 弹窗界面
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/               # 设置页面
│   ├── options.html
│   ├── options.js
│   └── options.css
├── background/            # 后台服务
│   ├── background.js
│   ├── api/              # AI 平台集成
│   │   ├── deepseek.js
│   │   ├── tongyi.js
│   │   ├── siliconflow.js
│   │   └── openai.js
│   └── services/
│       └── ai-service.js
├── content/               # 内容脚本
│   ├── content.js
│   └── content.css
├── shared/                # 共享模块
│   ├── models.js         # 数据模型
│   ├── storage.js        # 存储管理
│   ├── kb-service.js     # 知识库服务（RAG）
│   ├── utils.js          # 工具函数
│   ├── markdown-renderer.js  # Markdown 渲染器
│   ├── word-generator.js     # DOCX 文档生成器
│   └── jszip.min.js      # JSZip 库（生成 .docx）
└── icons/                 # 图标资源
```

### 技术栈
- **前端**: 原生 JavaScript (ES6+)
- **架构**: Chrome Extension Manifest V3
- **存储**: Chrome Storage API
- **通信**: Chrome Message Passing + Long-lived Connections
- **模块化**: ES6 Modules
- **文档处理**: Markdown 解析 + Open XML (DOCX)
- **图片处理**: Fetch API + Blob + Base64
- **ZIP 压缩**: JSZip 3.10.1
- **知识库后端**: [RagBackend](https://github.com/pgnzbl/RagBackend) (FastAPI + ChromaDB + Sentence-Transformers)

## 🔐 安全性

### 数据隐私
- ✅ API Key 本地加密存储
- ✅ 所有数据处理在本地进行
- ✅ 不发送数据到第三方（除选定的 AI 平台）
- ✅ 符合 Chrome 扩展安全策略

### 权限说明
```json
{
  "storage": "存储配置和历史",
  "activeTab": "访问当前标签页内容",
  "scripting": "注入内容提取脚本",
  "tabs": "获取标签页信息"
}
```

## 🐛 常见问题

### Q: 提示"无法注入内容提取脚本"？
**A**: 某些特殊页面（如 `chrome://`）不支持内容提取，请在普通网页使用。

### Q: 生成失败提示 API 错误？
**A**: 
1. 检查 API Key 是否正确
2. 检查账户余额是否充足
3. 检查网络连接
4. 查看 Background Console 的详细错误

### Q: 如何获取 API Key？

**DeepSeek**:
```
1. 访问 https://platform.deepseek.com/
2. 注册/登录账号
3. 创建 API Key
4. 支持自动检测模型
```

**通义千问**:
```
1. 访问 https://dashscope.aliyun.com/
2. 使用阿里云账号登录
3. 开通服务并获取 API Key
4. 需要手动添加模型（推荐 qwen3-plus, qwen3-max, qwen3-turbo）
```

**硅基流动**:
```
1. 访问 https://siliconflow.cn/
2. 注册/登录账号
3. 获取 API Key
4. 支持自动检测模型
```

**OpenAI**:
```
1. 访问 https://platform.openai.com/
2. 注册/登录账号
3. 创建 API Key
4. 支持自动检测模型
```

### Q: 为什么通义千问无法自动检测模型？
**A**: 通义千问（DashScope）没有公开的模型列表 API，需要手动添加模型名称。

**常用模型名称**:
- `qwen3-max` - 最强性能，最新旗舰
- `qwen3-plus` - 平衡性能，日常推荐
- `qwen3-turbo` - 速度快，性价比高
- `qwen-max` - 上一代旗舰
- `qwen-plus` - 上一代平衡版
- `qwen-turbo` - 上一代快速版

### Q: Word 导出的图片为什么无法显示？
**A**: 可能原因和解决方案：
1. **图片源网站设置了防盗链**：跨域限制导致下载失败，文档中会显示 `[图片加载失败]`
2. **网络连接问题**：确保网络稳定，图片下载需要时间
3. **图片格式不支持**：支持 PNG、JPEG、GIF、BMP，其他格式可能失败
4. **文件过大**：建议单个文档图片总大小 < 20MB

### Q: Markdown 导出和 Word 导出有什么区别？
**A**: 
- **Markdown (.md)**：
  - ✅ 文件小，导出快
  - ✅ 图片以链接形式存在
  - ⚠️ 需要网络访问图片
  - 适合：在线分享、版本控制
  
- **Word (.docx)**：
  - ✅ 图片完整嵌入，可离线查看
  - ✅ 真正的 Open XML 格式
  - ✅ 完美兼容 Office/WPS
  - ⚠️ 文件较大，导出需时间
  - 适合：正式文档、离线使用

## 🔄 更新日志

### v2.0.1 (2025-01-09)
- 🖼️ **图片智能处理功能**
  - 📸 自动提取网页图片，保持原始位置
  - 🎨 Markdown 内容智能转换（`<img>` → `![alt](src)`）
  - 👁️ 实时预览：流式输出和结果页面支持图片显示
  - 📥 Markdown 导出：保留图片链接
  - 📄 Word 导出升级：
    - ✅ 真正的 .docx 格式（Open XML 标准）
    - 📦 图片自动下载并嵌入文档
    - 🎯 图片尺寸智能适配
    - 💾 完美兼容 Word/WPS/LibreOffice
  - 📊 导出进度实时反馈
- 🛠️ **技术优化**
  - 引入 JSZip 3.10.1 生成标准 DOCX
  - 自定义轻量级 Markdown 渲染器
  - DOM 转 Markdown 智能解析器
  - 图片下载和 Blob 处理优化

### v2.0.0 (2024-12-19)
- ✨ **重大更新：知识库（RAG）功能**
  - 📚 集成知识库管理系统
  - 📄 支持文档上传（PDF、TXT、DOCX、MD）
  - 🔪 多种文件切分策略（固定大小、按段落、按标题等）
  - 🔍 基于语义相似度的向量检索
  - 🤖 AI 代理可启用知识库增强
  - 🔐 API 密钥认证支持
  - 💬 新增聊天模式
  - ⏱️ 智能流式输出超时检测
  - 🎨 紧凑型 UI 设计优化
- 🔗 依赖 [RagBackend](https://github.com/pgnzbl/RagBackend) 服务

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发环境
```bash
# 克隆项目
git clone https://github.com/pgnzbl/WebMind.git
cd WebMind

# 加载到 Chrome
chrome://extensions/ → 加载已解压的扩展程序
```

### 提交规范
```
feat: 新功能
fix: Bug 修复
docs: 文档更新
style: 代码格式
refactor: 重构
perf: 性能优化
test: 测试
chore: 构建/工具
```

## 🔗 相关项目

- **RagBackend**: [https://github.com/pgnzbl/RagBackend](https://github.com/pgnzbl/RagBackend)
  - WebMind 的知识库后端服务
  - 基于 FastAPI + ChromaDB + Sentence-Transformers
  - 提供向量存储和检索功能

## 📄 许可证

MIT License

## 🙏 致谢

- Chrome Extensions 开发团队
- AI 平台提供商
- 开源社区
- [RagBackend](https://github.com/pgnzbl/RagBackend) 项目

## 📞 联系方式

- **GitHub Issues**: 问题反馈
- **Pull Request**: 代码贡献
- **项目地址**: [https://github.com/pgnzbl/WebMind](https://github.com/pgnzbl/WebMind)

---

**享受 WebMind 带来的智能体验！** 🚀✨
