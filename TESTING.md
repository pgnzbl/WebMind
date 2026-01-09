# Markdown 渲染器测试指南

## 测试准备

1. 重新加载扩展：
   - 打开 `chrome://extensions/`
   - 找到 WebMind 扩展
   - 点击 🔄 刷新按钮

2. 打开任意网页，点击扩展图标

## 测试用例

### 测试 1: 行内代码

**测试内容：**
```markdown
IDA-Pro-MCP 1.4.0版本引入了 pyeval 功能并默认启用
```

**预期结果：**
- `pyeval` 显示为行内代码（粉红色背景）
- 后续文字"功能并默认启用"字体正常，不倾斜
- 整体布局正常

### 测试 2: 代码块换行

**测试内容：**
```markdown
部署步骤：

```bash
mkdir -p ~/singularity/html
cp singularity-server ~/singularity/
cp -r ../../html/* ~/singularity/html/
cp ida-mcp-rce.js ~/singularity/html/payloads
vim ~/singularity/html/manager-config.json
```
```

**预期结果：**
- 每个命令独占一行
- 灰色背景 (#f6f8fa)
- 使用等宽字体 (Consolas)
- 保留所有空格和缩进

### 测试 3: 混合格式

**测试内容：**
```markdown
### 技术细节

该漏洞影响 **IDA Pro** 的 *MCP 组件*，可通过 `config.html` 配置。

攻击者可以：
1. 构造恶意网页
2. 执行 `eval()` 函数
3. 获取系统权限
```

**预期结果：**
- 标题显示为 H3（14pt 黑体）
- "IDA Pro" 显示为粗体
- "MCP 组件" 显示为斜体
- `config.html` 和 `eval()` 显示为行内代码
- 有序列表正确编号
- 所有格式互不干扰

### 测试 4: 代码块语言标识

**测试内容：**
```markdown
JavaScript 代码：

```javascript
const exploit = () => {
  console.log("test");
};
```

JSON 配置：

```json
{
  "name": "test",
  "port": 8080
}
```
```

**预期结果：**
- 两个代码块都有灰色背景
- 代码保持格式和缩进
- 每行独立显示

## 常见问题排查

### 问题 1: 显示 "Failed to import marked.js"

**解决方案：**
- 检查 `shared/marked.min.js` 文件是否存在
- 重新加载扩展

### 问题 2: 代码块不换行

**解决方案：**
- 检查 `popup/popup.css` 中 `pre` 标签是否有 `white-space: pre-wrap`
- 清除浏览器缓存后重新加载

### 问题 3: 行内代码后文字倾斜

**解决方案：**
- 如果出现此问题，说明 marked.js 未正确加载
- 检查浏览器控制台错误信息

## 测试通过标准

- ✅ 所有测试用例显示正常
- ✅ 无 JavaScript 错误
- ✅ Markdown 导出正常
- ✅ Word 导出正常
