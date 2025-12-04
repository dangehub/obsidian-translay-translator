# KISS Translator (Obsidian)

面向 Obsidian 的轻量双语翻译插件，来自 KISS Translator 的移植版本。

## 功能概览
- 翻译当前笔记（阅读模式），可隐藏/显示原文。
- 悬浮球一键翻译当前界面（设置页/其他插件 UI），再次点击可清除译文。
- 支持 OpenAI 兼容接口（自定义模型、system/user prompt）或简单文本接口（LibreTranslate 兼容）。
- 可配置“不翻译的选择器”，默认跳过设置页侧边栏。
- 译文样式为行内块，尽量不破坏布局。

## 设置
在 **设置 → 社区插件 → KISS Translator (Obsidian)** 中配置：
- API 类型、API URL、API Key、模型（OpenAI 兼容）、源/目标语言。
- 隐藏原文开关、打开笔记自动翻译。
- 不翻译的选择器：一行一个 CSS 选择器，命中元素及其子节点不翻译（已默认包含设置页侧边栏）。
- System/User Prompt（OpenAI 模式）可自定义，占位符 `{text}` `{from}` `{to}` 可用。

## 使用
- 阅读模式下执行命令：“Translate current note (inline)” 翻译；“Toggle show original text” 切换原文；“Clear translations on current note” 清除。
- 悬浮球：点击翻译当前可见界面（优先设置弹窗），再次点击清除；可拖拽位置。

## 开发 / 构建
- 安装依赖：`npm install`
- 开发监视：`npm run dev`
- 构建：`npm run build`
- 手动安装：将 `main.js`、`manifest.json`、`styles.css` 复制到 `<Vault>/.obsidian/plugins/kiss-translator-obsidian/`。

## 已知限制 / 待规划
- 翻译结果当前仅内存缓存，未持久化；后续计划支持持久化词典与译文编辑回写。
- UI 翻译的“归属插件”目前需手动通过选择器排除或自管范围，暂无自动识别来源机制。

## Changelog

### 0.1.0
- 添加笔记内联翻译/清除/显示隐藏原文命令，支持 OpenAI/LibreTranslate 配置与自定义 prompt。
- 新增全局悬浮球，点击翻译/清除当前界面；支持拖拽位置。
- 设置页文案改为中文，新增“不翻译的选择器”配置并默认屏蔽设置侧边栏。
- 译文样式改为紧凑行内块，减少布局影响；README 更新使用与构建说明。
