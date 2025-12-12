# 🧠 WebMind - 网页智能助手

一个强大的 Chrome 浏览器扩展，集成多个 AI 大模型服务，将网页内容智能转换为结构化文档。

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

### 🌊 实时流式输出
- AI 生成内容实时显示
- 打字机效果和动画
- 随时停止或重新生成
- 完整的进度反馈

### 📄 灵活的文档导出
- Markdown 格式
- Word 格式（预留）
- 智能文件命名
- 生成后自由选择格式

### 📊 历史记录管理
- 查看所有生成历史
- 一键查看历史内容
- 清理和管理功能

## 🚀 快速开始

### 安装

1. **下载项目**
   ```bash
   git clone <repository-url>
   cd WebMind
   ```

2. **准备图标**
   - 在 `icons/` 目录放置以下图标：
     - `icon16.png` (16x16)
     - `icon48.png` (48x48)
     - `icon128.png` (128x128)

3. **加载扩展**
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

2. **创建智能代理**
   - 点击扩展图标右上角 ⚙️
   - 点击"+ 创建新代理"
   - 填写以下信息：
     - 代理名称（如：技术文档分析师）
     - 描述（可选）
     - System Prompt（定义代理行为）
     - 提示词模板
     - 选择 AI 模型（从检测列表）
     - 或手动添加模型（输入模型名称，如 `qwen3-plus`）
   - 点击"保存"

### 使用

1. **生成文档**
   - 访问任意网页
   - 点击 WebMind 扩展图标
   - 选择一个智能代理
   - 点击"🚀 生成文档"
   - 观看实时流式输出

2. **导出文档**
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

### 示例 3：文章总结

**代理配置**：
```
名称: 文章总结专家
System Prompt: 你是内容分析师。阅读文章后，
提取主题、核心观点、关键论据和结论。

提示词模板:
请分析以下文章：

{{content}}

输出格式：
# 文章分析
## 主题
## 核心观点
## 关键论据
## 总结
```

## 🎨 界面预览

### Popup 弹窗（450x600）
- 简洁的代理选择
- 当前网页信息预览
- 实时流式输出显示
- 双格式下载按钮

### Options 设置页
- 智能代理管理
- API 平台配置
- 通用设置
- 历史记录查看

### 流式输出动画
- 紫色渐变边框
- 呼吸光效
- 打字机效果
- 自动滚动

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
│   └── utils.js          # 工具函数
└── icons/                 # 图标资源
```

### 技术栈
- **前端**: 原生 JavaScript (ES6+)
- **架构**: Chrome Extension Manifest V3
- **存储**: Chrome Storage API
- **通信**: Chrome Message Passing + Long-lived Connections
- **模块化**: ES6 Modules

### 核心功能

#### 1. 网页内容提取
```javascript
// content/content.js
- 智能识别主内容区域
- 自动清理无关元素
- 提取元数据和链接
- 支持自定义选择器
```

#### 2. AI 平台集成
```javascript
// background/api/*.js
- 统一的 API 接口
- 支持流式输出
- 自动重试机制
- 错误处理
```

#### 3. 流式通信
```javascript
// 使用 Chrome Long-lived Connection
const port = chrome.runtime.connect({ name: 'streaming' });
port.onMessage.addListener((message) => {
  // 实时接收 AI 生成的文本块
});
```

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

## 📝 开发说明

### 调试

**Popup 调试**：
```
右键扩展图标 → 检查弹出内容窗口
```

**Background 调试**：
```
chrome://extensions/ → Service Worker → 检查
```

**Content Script 调试**：
```
在网页上按 F12 → Console
```

### 添加新的 AI 平台

1. 在 `background/api/` 创建新文件：
```javascript
// newprovider.js
export default class NewProviderAPI {
  async verifyApiKey(provider) { }
  async listModels(provider) { }
  async chat({ model, apiKey, baseURL, messages }) { }
  async *chatStream({ model, apiKey, baseURL, messages }) { }
}
```

2. 在 `shared/models.js` 添加配置：
```javascript
{
  id: 'newprovider',
  name: 'New Provider',
  baseURL: 'https://api.example.com/v1',
  enabled: false,
  models: []
}
```

3. 在 `background/services/ai-service.js` 注册：
```javascript
import NewProviderAPI from '../api/newprovider.js';

this.apis = {
  newprovider: new NewProviderAPI()
};
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

### Q: 历史记录无法查看？
**A**: 点击历史记录会自动切换到"生成文档"标签页并显示内容。

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

**常用模型名称（最新）**:

**Qwen3 系列（2024最新，推荐）**:
- `qwen3-max` - 最强性能，最新旗舰
- `qwen3-plus` - 平衡性能，日常推荐
- `qwen3-turbo` - 速度快，性价比高

**经典版本（仍可用）**:
- `qwen-max` - 上一代旗舰
- `qwen-plus` - 上一代平衡版
- `qwen-turbo` - 上一代快速版
- `qwen-long` - 超长文本（100万token）

**Qwen2 系列（开源版）**:
- `qwen2-72b-instruct` - 72B 大模型
- `qwen2-7b-instruct` - 7B 中型
- `qwen2-1.5b-instruct` - 1.5B 轻量

**添加步骤**:
1. 创建代理时，在"手动添加模型"区域
2. 选择"通义千问"平台
3. 输入模型名称（推荐 `qwen3-plus`，或 `qwen3-max`、`qwen3-turbo`）
4. 点击"添加"
5. 在创建的代理中使用该自定义模型

### Q: 其他平台也可以手动添加模型吗？
**A**: 可以！如果某个平台发布了新模型，但自动检测还没更新，你可以手动添加：
- 选择对应平台
- 输入准确的模型名称
- 添加到代理配置中

## 🔄 更新日志

### v1.2.1 (2024-12-10)
- 🐛 修复 Agent 时间显示 NaN 问题
- 🐛 修复历史记录时间显示和点击问题
- 🔧 优化日期格式化逻辑

### v1.2.0 (2024-12-10)
- ✨ 移除不必要的输出格式选择
- 🎨 优化 UI 尺寸（450x600）
- 📐 改进字体和间距
- 💾 生成后灵活选择导出格式

### v1.1.0 (2024-12-10)
- 🌊 实时流式输出功能
- ⏹️ 停止/重新生成功能
- 💾 双格式下载按钮
- 🎨 动画和视觉效果

### v1.0.0 (2024-12-10)
- 🎉 首次发布
- 🤖 多 AI 平台支持
- 🎯 智能代理系统
- 📄 网页内容提取

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发环境
```bash
# 克隆项目
git clone <repository-url>

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

## 📄 许可证

MIT License

---

**享受 WebMind 带来的智能体验！** 🚀✨
