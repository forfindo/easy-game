# AGENTS.md - Easy Game 项目指南

## 项目概述
Easy Game 是一个基于网页的游戏集合（2048、找色差、数独），使用原生 HTML、CSS 和 JavaScript 构建。项目使用自定义构建脚本进行压缩和优化。

## 构建系统

### 可用命令
```bash
# 构建项目（压缩 HTML、CSS、JS）
npm run build

# 安装依赖
npm install

# 测试（当前为占位符）
npm test
```

## 代码风格指南

### 文件结构
```
src/
├── index.html              # 主入口点
├── assets/
│   ├── css/
│   │   └── common.css     # 共享样式
│   └── js/
│       ├── 2048.js        # 2048 游戏逻辑
│       ├── color-difference.js
│       └── sudoku.js
├── 2048/
│   └── index.html         # 2048 游戏页面
├── color-difference/
│   └── index.html         # 找色差游戏页面
└── sudoku/
    └── index.html         # 数独游戏页面
```

### HTML 约定
- **语言**：中文 (`lang="zh"`)
- **Meta 标签**：包含 viewport、charset、description、keywords
- **结构**：语义化 HTML5 元素，所有内容都要放在一个container类的元素中
- **样式**：页面特定 CSS 使用内联样式，共享样式使用外部文件

### CSS 约定（务必遵守）
- **固定样式**：asset/css/common.css和container类选择器的样式为固定样式，不能修改，必须修改之前询问我
- **单位**：固定尺寸使用 `px`，流体布局使用 `%`
- **选择器**：基于类的样式，避免使用 ID 选择器进行样式设置
- **组织**：相关属性分组，可选按字母顺序排序