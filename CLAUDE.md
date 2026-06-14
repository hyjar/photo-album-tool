# CLAUDE.md

## 项目概述

摄影集自动排版工具 — 一个纯前端的浏览器端应用，用于创建摄影集并导出高质量 PDF。支持自动排版、手动微调、多种布局模板。

## 沟通规则

- 永远使用中文回答问题

## 技术栈

- **语言**: JavaScript (ES Modules, 无 TypeScript)
- **框架**: 无 (纯原生 DOM 操作)
- **构建工具**: Vite 5.x
- **包管理器**: npm
- **核心依赖**:
  - `exifr` - EXIF 元数据提取
  - `jspdf` - PDF 生成
  - `html2canvas` - 页面截图 (用于 PDF 导出)

## 常用命令

```bash
npm run dev      # 启动开发服务器 (端口 5173)
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
```

## 项目结构

```
├── index.html              # 单页应用入口
├── src/
│   ├── main.js             # 主入口，初始化所有模块
│   ├── state.js            # 状态管理 (发布/订阅，撤销/重做)
│   ├── imageLoader.js      # 图片导入 (拖放、文件选择器、EXIF)
│   ├── layoutEngine.js     # 排版算法 (grid/single/collage/timeline/crosspage/portfolio)
│   ├── editor.js           # 交互式编辑器 (拖拽、缩放、参考线)
│   ├── preview.js          # 页面预览渲染
│   ├── pdfExporter.js      # PDF 导出 (html2canvas + jsPDF)
│   ├── projectSave.js      # 项目保存/加载 (JSON)
│   ├── utils.js            # 工具函数 (uid、mm/px 转换、DOM 辅助)
│   └── style.css           # 全局样式
├── server/                 # WeChat 集成服务器 (独立项目，脚手架阶段)
└── docs/compose/           # Claude Code 设计文档
```

## 架构要点

### 状态管理 (`state.js`)
- 全局单例状态对象，pub/sub 通知机制
- 基于快照的撤销/重做 (最多 30 个快照)
- 状态包含: images, pages, selectedElements, template, fitMode, pageSize, orientation, theme, presets 等

### 排版引擎 (`layoutEngine.js`)
- 六种布局算法: `layoutGrid`, `layoutSingle`, `layoutCollage`, `layoutTimeline`, `layoutCrossPage`, `layoutPortfolio`
- 所有坐标单位为毫米 (mm)，屏幕预览转换系数 ~3.78 px/mm (96 DPI)
- 支持自动方向检测 (横图→横页)
- 支持分类排序 (按方向/类别)

### PDF 导出 (`pdfExporter.js`)
- 使用 html2canvas 捕获页面预览
- 注入 jsPDF 生成 PDF (2x 渲染比例)
- 使用 File System Access API (`showSaveFilePicker`) + 降级方案

### 图片加载 (`imageLoader.js`)
- 支持格式: JPEG, PNG, WebP, GIF, BMP
- 使用 objectURL (避免 dataURL 内存膨胀)
- 批量处理，避免阻塞主线程

## 开发规范

### 代码风格
- 使用 ES Modules (import/export)
- 无 TypeScript，纯 JavaScript
- 函数和变量使用 camelCase
- 文件名使用 camelCase

### 坐标系统
- 布局坐标单位: 毫米 (mm)
- 屏幕预览: 转换为像素 (~3.78 px/mm)
- PDF 输出: 直接使用 mm

### 状态更新
- 修改状态后调用 `notify()` 通知订阅者
- 需要撤销支持的操作调用 `pushSnapshot()`

### UI 更新
- 使用 `subscribe()` 监听状态变化
- 遵循发布/订阅模式，不直接操作 DOM

## 注意事项

- 项目没有配置测试框架
- `server/` 目录是独立的 WeChat 集成项目，与主应用无关
- 照片目录 (`照片/`) 被 gitignore，不纳入版本控制
- 使用 File System Access API，需要现代浏览器支持
