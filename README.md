# 黄道手札 · Ecliptic Notes

> 以太阳黄经为科学主线，沉浸式探索二十四节气

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/vite-6.x-646CFF.svg)](https://vitejs.dev)
[![GitHub Pages](https://img.shields.io/badge/deployed-GitHub%20Pages-blueviolet.svg)](https://clove-48.github.io/solar_terms/)

一款基于原生前端技术栈的轻量级 H5 应用，以**太阳黄经**为科学主线，通过触控交互沉浸式探索二十四节气背后的天文原理与民俗文化。

所有计算在浏览器本地完成，零后端依赖，无数据上传。

## 核心特性

| 特性 | 说明 |
|------|------|
| **动态黄道带** | Canvas 2D 渲染 0°~360° 黄道轨道，点击节气直达详情 |
| **双标签详情** | 每个节气含【科学】和【民俗】两个标签页，一键切换视角 |
| **科学实验室** | 圭表测影 + 日晷模拟，实时计算太阳赤纬、高度角、影长 |
| **实时校准** | 显示今日所处节气、黄经角度、距下个节气天数 |
| **场景引擎** | 四季节气专属粒子动画（花瓣/烈日/落叶/雪花） |
| **程序化音效** | Web Audio API 合成春雷、蝉鸣、秋风、冬雪声 |
| **交互方式** | 点击→滑动→翻页→摇一摇→拖拽→日期选择器 |
| **气象科普视频** | 嵌入中国气象局节气科普动画（B站合集） |

## 技术栈

- **框架**: 原生 HTML/CSS/JS + Canvas 2D
- **构建**: Vite 6
- **音频**: Web Audio API（程序化合成）
- **样式**: CSS Custom Properties + Grid/Flexbox
- **字体**: Noto Serif/Sans SC + Exo + JetBrains Mono

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

```
solar_terms/
├── index.html              # 入口 HTML
├── vite.config.js          # Vite 配置
├── package.json            # 依赖管理
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Pages 自动部署
├── data/
│   ├── solarTerms.json     # 24节气完整数据集
│   └── poems.json          # 节气古诗词
├── scripts/
│   └── calc_solar_data.py  # 天文数据验证脚本
└── src/
    ├── main.js             # 应用入口
    ├── app/                # 路由 + 状态管理 + 事件总线
    ├── pages/              # 4个页面 (loading/zodiac/detail/lab)
    ├── interaction/        # 交互辅助系统
    ├── business/           # 天文计算 + 音效合成
    ├── renderer/           # Canvas 渲染 + 场景引擎
    ├── styles/             # 7个CSS模块
    └── utils/              # 7个工具模块
```

## 页面导航

| 页面 | 路由 | 功能 |
|------|------|------|
| 加载页 | `#/loading` | 加载节气数据，显示进度环 |
| 黄道带 | `#/zodiac` | 黄道轨道可视化，点击节气进入详情 |
| 节气详情 | `#/detail?id=N` | 科学/民俗双标签，含科普视频 |
| 科学实验室 | `#/lab` | 圭表测影 + 日晷模拟互动实验 |

## 浏览器兼容

| 特性 | Chrome | Safari | Firefox | WeChat |
|------|--------|--------|---------|--------|
| Canvas 2D | ✅ | ✅ | ✅ | ✅ |
| 触控交互 | ✅ | ✅ | ✅ | ✅ |

## 文档

- [产品需求文档 (PRD)](.trae/documents/PRD-节气科普沉浸式H5.md)
- [技术架构文档](.trae/documents/技术架构-节气科普沉浸式H5.md)
- [开发 Checklist](.trae/documents/开发Checklist-节气科普沉浸式H5.md)

## 设计理念

**「国风科技」** —— 以 Academia（学院风）为传统文化基底 × Modern Dark（现代深色模式）为科技视觉骨架，融合 Chinese Simplified 中文字体生态。

- 色彩：深空蓝黑 (#0a0e1a) + 金色 (#d4a574) + 朱砂红 (#c23b22)
- 字体：Noto Serif SC（衬线/国风）+ Noto Sans SC（无衬线/科技）+ JetBrains Mono（等宽/数据）
- 装饰：四象标注 + 28星宿 + 印章式首字 + 卷轴式卡片

## License

MIT