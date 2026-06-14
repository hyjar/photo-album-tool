# 📷 摄影集自动排版与导出工具

纯前端实现的摄影集排版工具，支持自动排版、手动微调和 PDF 导出。

## 功能特性

### 图片导入
- 点击按钮选择多个图片文件
- 拖拽文件/文件夹到页面直接导入
- 缩略图列表，支持拖拽排序、右键删除

### 自动排版模板
- **网格布局** - 固定列数，整齐排列
- **单页大图** - 每页一张图片，居中显示
- **拼贴风格** - 不规则组合，视觉丰富
- **时间线** - 垂直排列，适合叙事

### 编辑功能
- 点击选中图片，拖动调整位置
- 右下角拖拽缩放
- 添加标题页、章节页
- 调整背景色、主题色、间距、内边距
- 撤销/重做 (Ctrl+Z / Ctrl+Shift+Z)

### PDF 导出
- 一键导出高质量 PDF
- 支持指定页码范围
- 可调整图片压缩质量
- 自定义文件名和保存位置

### 其他
- 暗色模式
- 项目保存/加载 (JSON 格式)
- 支持 A4/A3/Letter 页面尺寸
- 横向/纵向切换

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z | 重做 |
| Ctrl+S | 保存项目 |
| Ctrl+O | 加载项目 |
| Delete | 删除选中元素 |

## 技术栈

- Vite - 构建工具
- 原生 JavaScript (ES Modules)
- jsPDF - PDF 生成
- CSS 变量 - 主题系统
- File System Access API - 本地文件操作

## 项目结构

```
hyjar/
├── index.html          # 入口页面
├── package.json        # 项目配置
├── vite.config.js      # Vite 配置
├── src/
│   ├── main.js         # 主入口
│   ├── style.css       # 样式
│   ├── state.js        # 状态管理
│   ├── imageLoader.js  # 图片导入
│   ├── layoutEngine.js # 排版引擎
│   ├── editor.js       # 编辑器
│   ├── preview.js      # 预览渲染
│   ├── pdfExporter.js  # PDF 导出
│   ├── projectSave.js  # 项目保存
│   └── utils.js        # 工具函数
└── public/
    └── favicon.svg
```
