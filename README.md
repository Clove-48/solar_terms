# 黄道手札 · Ecliptic Notes

> 以太阳黄经为科学主线，手势交互唤醒二十四节气

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/vite-6.x-646CFF.svg)](https://vitejs.dev)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-Handpose-orange.svg)](https://www.tensorflow.org/js)

一款基于原生前端技术栈的轻量级 H5 应用，以**太阳黄经**为科学主线，通过 **TensorFlow.js Handpose 手势识别**与 **7 种降级交互方案**，面向青少年提供沉浸式节气科普体验。

所有计算在浏览器本地完成，零后端依赖，无数据上传。

## 核心特性

| 特性 | 说明 |
|------|------|
| **手势交互** | 握拳→立春、张手→夏至、剪刀手→秋分、挥手→全年预览 |
| **动态黄道带** | Canvas 2D 渲染 0°~360° 黄道轨道，国风科技视觉重设计 |
| **双标签详情** | 每个节气含【科学】和【民俗】两个标签页，一键切换视角 |
| **科学实验室** | 圭表测影 + 日晷模拟，实时计算太阳赤纬、高度角、影长 |
| **实时校准** | 显示今日所处节气、黄经角度、距下个节气天数 |
| **场景引擎** | 四季节气专属粒子动画（花瓣/烈日/落叶/雪花） |
| **程序化音效** | Web Audio API 合成春雷、蝉鸣、秋风、冬雪声 |
| **7 种降级** | 手势→滑动→点击→翻页→摇一摇→拖拽→日期选择器 |

## 技术栈

- **框架**: 原生 HTML/CSS/JS + Canvas 2D
- **构建**: Vite 6
- **手势识别**: TensorFlow.js Handpose
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
├── data/
│   ├── solarTerms.json     # 24节气完整数据集
│   └── poems.json          # 节气古诗词
├── scripts/
│   └── calc_solar_data.py  # 天文数据验证脚本
└── src/
    ├── main.js             # 应用入口
    ├── app/                # 路由 + 状态管理 + 事件总线
    ├── pages/              # 4个页面 (loading/zodiac/detail/lab)
    ├── interaction/        # 手势识别 + 降级交互 + 摄像头
    ├── business/           # 天文计算 + 音效合成
    ├── renderer/           # Canvas 渲染 + 场景引擎
    ├── styles/             # 7个CSS模块（令牌/重置/字体/布局/组件/过渡/响应式）
    └── utils/              # 7个工具模块
```

## 手势映射

| 手势 | 识别逻辑 | 唤醒节气 | 动画/音效 |
|------|---------|---------|----------|
| 握拳 | 指尖距掌心 < 0.42×handSpan | **立春** | 花瓣飘落 + 春雷 |
| 张手 | 指尖距掌心 > 0.60×handSpan | **夏至** | 烈日辉光 + 蝉鸣 |
| 剪刀手 | 食指中指夹角 > 20° | **秋分** | 落叶纷飞 + 秋风 |
| 挥手 | 手腕横向位移 > 40px/帧 | **全年预览** | 黄道带自动旋转 |

## 浏览器兼容

| 特性 | Chrome | Safari | Firefox | WeChat |
|------|--------|--------|---------|--------|
| Canvas 2D | ✅ | ✅ | ✅ | ✅ |
| 手势识别 | ✅ | ⚠️ WKWebView | ✅ | ❌ → 自动降级 |
| 降级交互 | ✅ | ✅ | ✅ | ✅ |

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