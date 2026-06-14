# 开发 Checklist：黄道手札 · Ecliptic Notes

> 基于 PRD 与技术架构文档，按开发阶段拆解为可执行的任务列表。
> 每个任务完成后标记 `[x]`。
> 最后更新：2026-06-14 | 整体状态：Phase 0-4 已完成，Phase 5 功能验证进行中

---

## Phase 0：数据准备（Day 1-2）

### 0.1 项目初始化

- [x] 创建 Vite vanilla JS 项目脚手架
- [x] 安装 TensorFlow.js 依赖
- [x] 配置 `vite.config.js`（manualChunks 拆分 tfjs/handpose）
- [x] 配置 `.gitignore`（排除 node_modules、dist）
- [x] 创建项目目录结构（按技术架构文档）

### 0.2 节气数据

- [x] 整理 24 节气 JSON 完整数据集（字段见 PRD §6.1）
  - 节气名称、拼音、公历日期、太阳黄经度数
  - 科学维度：太阳赤纬、昼长、影长、直射点、解说文字
  - 民俗维度：物候现象、农事活动、传统习俗、解说文字
  - 动画配置：手势类型、粒子颜色、音效、场景动画类型
- [x] 科学文本校验（确保天文学数据准确）
  - 太阳黄经度数核对（PRD §6.2 表格对照）
  - 太阳赤纬值验证（基于天文公式计算：δ = arcsin(sinλ × sin23.44°)）
  - 圭表影长值验证（基于公式：L = 8×cot(90°-|34°-δ|)）
- [x] 民俗文本校验（物候/农事/习俗内容有可靠来源）
- [x] 存储为 `data/solarTerms.json`

---

## Phase 1：基础建设（Day 3-7）

### 1.1 样式系统

- [x] 创建 `src/styles/tokens.css` — CSS Custom Properties 设计令牌
  - 色彩令牌（bg-deep, bg-elevated, bg-warm, foreground-primary 等 12 个色值）
  - 间距令牌（spacing-xs ~ spacing-2xl 共 6 级）
  - 圆角令牌（radius-sm ~ radius-full 共 4 级）
  - 字体令牌（font-family 各层级、font-size、line-height）
- [x] 创建 `src/styles/reset.css` — CSS Reset（box-sizing、margin/padding 归零）
- [x] 创建 `src/styles/typography.css` — 字体层级
  - 节气标题：Noto Serif SC 700 36-48px
  - 科学标题：Exo 600 20-28px
  - 科学正文：Noto Sans SC 400 16px
  - 民俗正文：Noto Serif SC 400 16px
  - 数据标签：JetBrains Mono 500 12-14px
- [x] 创建 `src/styles/layout.css` — 布局系统（Grid/Flexbox 基础）
- [x] 创建 `src/styles/components.css` — 通用组件（按钮、卡片、标签切换、进度环、节气网格）
- [x] 创建 `src/styles/transitions.css` — 过渡动画
  - 页面切换过渡（fade + slide up/down）
  - 标签切换过渡（背景色 transition 0.3s）
  - 手势唤醒动画（scale + opacity 0.3s ease-out）
  - 节气专属动画（种子破土/烈日辉光/天平摆动）

### 1.2 应用骨架

- [x] 创建 `src/app/store.js` — 全局状态管理
  - 状态：currentTermId, viewMode, interactionMode, isLoading
  - 方法：set(), get(), on()（事件监听）
- [x] 创建 `src/app/router.js` — Hash-based 轻量路由
  - 页面注册：loading → zodiac → detail → lab
  - 页面切换生命周期（DOM ready 保护、URL 参数解析）
- [x] 创建 `src/app/events.js` — 全局事件总线
  - 事件：TERM_SELECTED, GESTURE_DETECTED, MODE_SWITCHED, TAB_SWITCHED, DATA_LOADED
- [x] 创建 `src/main.js` — 应用入口
  - 路由初始化、默认跳转 loading 页

### 1.3 工具函数

- [x] 创建 `src/utils/dom.js`
  - createElement、query、queryAll、delegate（事件委托）、empty、setHTML、data
- [x] 创建 `src/utils/math.js`
  - degToRad, radToDeg, clamp, lerp, polarToCartesian, distance, angleBetween, normalizeAngle, angleDiff, frictionDecay
- [x] 创建 `src/utils/device.js`
  - detectCamera(), detectTouch(), detectMotion(), getDeviceType(), isWeChat(), isSafari(), prefersReducedMotion(), getDPR()
- [x] 创建 `src/utils/responsive.js`
  - getBreakpoint(), isLandscape(), onResize() — 监听 375/414 断点（防抖）
- [x] 创建 `src/utils/audio.js`
  - AudioContext 初始化、loadSound()、playSound()、playTone()、setVolume()、destroy()
- [x] 创建 `src/utils/loading.js`
  - 资源加载管理器：loadModel(), loadFonts(), loadData(), createLoader()，带进度回调

### 1.4 基础页面

- [x] **加载页** (`pages/loading/`)
  - HTML 骨架：进度环 + "正在加载手势识别引擎…" 文字
  - CSS：`bg-deep` 背景 + 金色环形进度环
  - JS：加载数据 → 尝试加载 Handpose 模型 → 进度实时更新
  - 加载完成后自动跳转至 zodiac 页面（requestAnimationFrame 延迟避免 hash 冲突）
- [x] **黄道带主页面** (`pages/zodiac/`) — 基础版
  - HTML 结构：顶部状态栏 + Canvas 黄道带 + 24节气网格（隐藏） + 底部操作提示
  - CSS：全屏深色背景，顶部/底部 Fixed 区域
  - JS：Canvas 渲染（刻度线 + 24节气标记 + 角度标注）
  - 点击节气标记 → 跳转 detail 页面
  - 底部"切换至网格"按钮切换 Canvas/网格视图
- [x] **节气详情页** (`pages/detail/`) — 基础版
  - HTML 结构：标题区 + 双标签 Tab Bar + 内容区
  - CSS：科学/民俗双标签样式 + Tab 切换样式 + 背景色同步过渡
  - JS：读取 URL hash 中的节气 ID → 渲染对应数据
  - 科学标签默认激活，展示基本数据卡片（4宫格数据 + 解说）
  - 民俗标签展示三段式内容（物候/农事/民俗 + 解说）
- [x] **24 节气网格**（降级方案基础）
  - 4×6 网格布局，每个节气为 44×44px 可点击卡片
  - 点击 → 跳转 detail 页面
  - 当前节气高亮（红色边框）
  - 与黄道带视图一键切换

### 1.5 基础交互

- [x] 点击节气标记/卡片 → 跳转节气详情（TERM_SELECTED 事件触发）
- [x] 详情页返回按钮 → 返回黄道带主页面
- [x] 左右滑动黄道带（降级方案核心）
  - Pointer Events 统一鼠标/触屏交互
  - 惯性滑动（基于速度衰减 0.92）
  - 松手后吸附到最近节气
  - 刻度线（每 15° 一条，90° 加粗）

---

## Phase 2：核心视觉（Day 8-14）

### 2.1 黄道带动画引擎

- [x] 创建 `src/renderer/zodiacCanvas.js`
  - 离屏 Canvas 绘制静态轨道（0°~360° 弧形 + 刻度线）
  - 24 节气星点标记（精确角度定位）
  - 当前节气高亮发光效果（accent-red 发光圈 + 名称标签）
  - 触屏拖拽旋转（quadrant 角度计算）
  - Canvas 尺寸响应式（resize 事件重绘 + DPR 适配）
  - 吸附效果：松手后自动吸附到最近节气
- [x] 顶部状态栏实时信息
  - 显示当前节气名称、黄经角度、距下个节气天数
  - 使用 JetBrains Mono 等宽字体

### 2.2 节气详情页完善

- [x] **科学标签** 完整内容
  - 太阳直射点纬度动画（Canvas 绘制地球 + 直射点移动）— *Phase 4 增强*
  - 昼夜时长对比（条状图/半圆图）— *Phase 4 增强*
  - 圭表影长示意图（静态，Phase 4 做动态）
  - 科学解说文字区域
- [x] **民俗标签** 完整内容
  - 物候现象（古文 + 白话对照）
  - 农事活动
  - 传统习俗
  - 暖色卡片样式（bg-warm + border-warm）
  - 细微纸张纹理（SVG noise overlay 0.03 opacity）— *Phase 4 增强*

### 2.3 过渡动画

- [x] 加载页 → 黄道带页（fade in 0.5s）
- [x] 黄道带页 → 详情页（slide up 0.3s ease-out）
- [x] 详情页 → 黄道带页（slide down 0.3s ease-out）
- [x] 科学民俗标签切换（背景色 transition 0.3s）
- [x] 节气唤醒动画（CSS animation keyframes）
  - 立春（握拳）：种子破土（scale + translateY）
  - 夏至（张手）：烈日辉光（radial-gradient 扩展）
  - 秋分（剪刀手）：天平平衡（rotate 摆动）
  - 其他节气：通用 fade + glow 效果

---

## Phase 3：手势识别（Day 15-21）

### 3.1 摄像头管理

- [x] 创建 `src/interaction/cameraManager.js`
  - `detect()` — 检测浏览器是否支持 getUserMedia
  - `requestPermission()` — 请求摄像头权限
  - `startStream()` — 开启视频流，返回 video 元素
  - `stopStream()` — 停止视频流，释放资源
  - 错误处理：权限拒绝、设备不可用、超时
  - Safari 兼容：需要用户手势触发后延迟启动

### 3.2 手势识别引擎

- [x] 创建 `src/interaction/gestureEngine.js`
  - `init()` — 加载 Handpose 模型，返回进度 Promise
  - `start()` — 启动检测循环（rAF 驱动）
  - `stop()` — 停止检测
  - `pause()` / `resume()` — 暂停/恢复检测
  - 性能优化：降帧检测（无手部时降为 5fps）、单例模型
- [x] 创建 `src/interaction/gestureMatcher.js`
  - `matchGesture(landmarks)` → 返回手势类型
  - 握拳判定：指尖到掌心距离 < 35px
  - 张手判定：指尖到掌心距离 > 75px
  - 剪刀手判定：食指中指展开夹角 > 30°
  - 挥手判定：手腕横向位移 > 40px/帧
  - 无匹配 → 返回 'none'
  - GestureMatcher 类：带防抖（连续 3 帧匹配才触发）
- [x] 容错机制
  - 连续 3 帧匹配同一手势才触发（防抖）
  - 识别失败时通过文字提示反馈
  - 无手部出现持续 5s → 降低检测帧率（节能）
  - 自动降级：加载失败时切换到触控模式

### 3.3 手势→节气映射

- [x] **Bugfix: 映射 ID 修正** — solarTerms.json 中夏至实际为 id=10（非 9），秋分实际为 id=16（非 15），已修正 GESTURE_TERM_MAP
- [x] **Bugfix: 消除重复触发** — 移除了 zodiac/logic.js 中重复的事件监听，只保留 onGesture 回调，避免 handleGesture 双发
- [x] **改进: 手势阈值泛化** — 从绝对像素距离改为相对距离（除以手掌跨度 handSpan），适应不同手距摄像头远近
- [x] **改进: 剪刀手识别** — 放宽无名指/小指折叠阈值，降低夹角要求至 20°

- [x] 握拳 → 唤醒立春
  - 种子破土动画（CSS anim-sprout）
  - 自动跳转立春详情页
- [x] 手掌张开 → 唤醒夏至
  - 烈日辉光动画（CSS anim-sun-glow）
  - 自动跳转夏至详情页
- [x] 剪刀手 → 唤醒秋分
  - 天平平衡动画（CSS anim-balance）
  - 自动跳转秋分详情页
- [x] 挥手 → 激活全年预览模式
  - 黄道带自动匀速旋转遍历 24 节气
  - 再次挥手停止

### 3.4 手势 UI 提示

- [x] 底部操作区显示当前手势状态（gesture-status-bar）
  - 等待手势：显示 4 个手势 SVG 图标 + "等待手势..." 文字说明
  - 识别中：高亮对应手势图标（金色边框 + 呼吸动画）
  - 识别成功：全屏动画过渡 + 提示文字更新
- [x] 手势识别开关（用户可手动关闭手势，切换到降级方案）
  - 圆形开关按钮，点击切换 on/off
  - 关闭时图标变灰，提示 "手势已关闭"
  - 开启时重新启动摄像头流 + 引擎

### 3.5 详情页增强（Phase 3 附带）

- [x] 节气详情页添加上一个/下一个节气导航按钮（国风版样式）
- [x] 太阳黄经可视化展示区（径向渐变背景 + 国风装饰）
- [x] 科学解说卡片增加左边框装饰（accent-cyan）

### 3.7 国风科技 UI 优化（Bugfix Round）

- [x] **ZodiacCanvas 视觉重设计**
  - 深空径向渐变背景 + 闪烁星点（80 颗固定星）
  - 金色渐变黄道带轨道 + 外层发光辉光
  - 28 星宿微点环绕黄道带（古籍星图元素）
  - 四象标注（青龙/朱雀/白虎/玄武）于四正点
  - 刻度线分三级（15°/45°/90°），90°为朱砂红
  - 当前节气：三层辉光 + 朱砂红圆点 + 金色边框 + 大号节气名
  - 非当前节气：半透明金色圆点 + 小字名称
  - 中心显示太阳黄经度大字
  - 底部装饰文字 "二 十 四 节 气 · 黄 道 观 测"
- [x] **详情页 国风全面改造**
  - 全景国风装饰（回纹顶部/底部、祥云纹、水墨背景）
  - 印章式节气首字标记
  - 卷轴式民俗内容卡片
  - 国风 Tab 切换栏（菱形装饰字符）
  - 国风数据卡片（金色顶部装饰线）
  - 底部手势返回提示栏（脉冲圆点动画）
  - 上下节气导航国风样式改造
  - 详情页进入动画
- [x] **手势返回导航**
  - 详情页监听全局手势事件（GESTURE_DETECTED）
  - 任意手势（fist/palm/scissors/wave）均可触发返回
  - 1.2 秒防抖避免重复触发
  - 手势反馈动画（脉冲圆点 + 页面滑动反馈）
  - 底部提示文字根据识别到的手势动态更新
  - 页面卸载时自动清理事件监听
- [x] **实验室 国风优化**
  - 深色渐变背景（#060810 → #0a0e1a → #0f1830）
  - 卡片添加金色左边框装饰
  - 数据卡片改为双栏布局（影长 + 高度角）
  - 黄经数据实时显示
  - 自定义 select 下拉框样式

- [x] 创建 `src/renderer/gnomonCanvas.js` — 圭表测影 Canvas 渲染（表杆 + 影子 + 太阳射线）
- [x] 创建 `src/renderer/sundialCanvas.js` — 日晷模拟 Canvas 渲染（盘面 + 指针 + 阴影投影）
- [x] 圭表测影：影长数据显示卡片 + 动态文案（夏至/冬至提示）
- [x] 日晷模拟：节气下拉选择器 + 实时高度角数据
- [x] 自定义滑块样式（accent-gold 圆形滑块）

---

## Phase 4：增强完善（Day 22-28）

### 4.1 科学实验室

- [x] 创建 `src/renderer/gnomonCanvas.js`
  - 绘制圭表（垂直表杆 + 水平地面）
  - 影子随日期变化动态渲染
  - 标注夏至（影最短）/ 冬至（影最长）位置
- [x] 创建 `src/renderer/sundialCanvas.js`
  - 绘制日晷盘面 + 指针
  - 选择不同节气 → 指针阴影角度变化
  - 太阳高度角数值标注
- [x] 创建 `src/business/gnomon.js`
  - 太阳赤纬计算（基于黄经）
  - 正午太阳高度角计算
  - 影长计算（8 尺表高模型）
- [x] 创建 `src/business/sunPosition.js`
  - 太阳直射点纬度计算
  - 昼夜时长计算
- [x] 科学实验室页面 (`pages/lab/`)
  - 圭表测影互动：滑块改变日期 → 影长动态变化
  - 日晷模拟：下拉选择节气 → 高度角动画
  - 实时数据卡片显示影长数值、太阳高度角、太阳赤纬、昼长、直射点、昼夜比

### 4.2 降级交互系统完整实现

- [x] 创建 `src/interaction/fallbackSystem.js`
  - 设备能力检测（检测摄像头、触屏、DeviceMotion）
  - 自动模式切换（按优先级）
  - 手动模式切换（设置面板）
- [x] **方式 1：手势识别**（Phase 3 已完成，此处集成调度）
- [x] **方式 2：左右滑动黄道带**（Phase 1 已完成）
- [x] **方式 3：点击节气卡片**（Phase 1 已完成）
- [x] **方式 4：前后翻页按钮**
  - 详情页添加"上一个/下一个"节气按钮
  - 黄道带页面添加"← 前一个 / 后一个 →"导航
- [x] **方式 5：摇一摇随机节气**
  - DeviceMotion 监听加速度变化
  - 加速度突变 > 阈值 → 随机跳转一个节气
  - iOS 13+ 权限处理
- [x] **方式 6：拖拽节气到场景**
  - 底部节气图标可拖拽
  - 拖拽到中央"地球"动画上 → 进入详情
- [x] **方式 7：日期选择器**
  - HTML5 `<input type="date">` 选择日期
  - 根据日期计算对应节气 → 跳转详情

### 4.3 实时校准模块

- [x] 创建 `src/business/calendar.js`
  - 获取当前日期
  - 计算当前太阳黄经（插值法）
  - 定位当前所处节气
  - 计算距下个节气的天数和黄经角度差
- [x] 集成到顶部状态栏实时显示

### 4.4 场景化音效

- [x] 立春：春雷声（Web Audio API 合成低频隆隆声 + 随机爆裂）
- [x] 夏至：蝉鸣（高频振荡 + LFO 颤音）
- [x] 秋分：秋风（带通滤波器白噪声掠过）
- [x] 冬至：寒风 + 雪声（低通滤波器白噪声）
- [x] 通用：页面切换 whoosh 音效（带通滤波器白噪声扫频）
- [x] 创建 `src/business/soundEffects.js` — 程序化音效合成模块

### 4.5 其他增强

- [x] 科学实验室快捷入口（黄道带页面底部导航）

---

## Phase 5：测试联调（Day 29-30）

### 5.1 功能测试

- [x] 4 种手势识别准确率测试（阈值已调优：FIST_RATIO=0.42, PALM_RATIO=0.60）
- [x] 24 节气数据完整性与正确性验证
- [x] 动态黄道带交互测试（滑动/点击/吸附）
- [x] 圭表测影互动测试（日期滑动 → 影长变化正确性）
- [x] 日晷模拟测试（节气选择 → 高度角正确性）
- [x] 实时校准功能测试（日期 → 节气映射正确性）
- [x] 7 种降级交互方案逐一测试
- [x] 双标签切换功能测试

### 5.2 性能测试

- [x] 构建成功（vite build exit code 0）
- [ ] 页面首屏加载时间 < 3s（含模型预加载）
- [ ] 手势识别帧率 ≥ 20fps（移动端真机测试）
- [ ] 无摄像头场景下交互流畅无卡顿
- [ ] Canvas 渲染帧率 ≥ 30fps
- [ ] 内存泄漏检测（页面切换后内存是否释放）
- [ ] 移动端电池消耗测试（连续使用 10 分钟）

### 5.3 兼容性测试

| 平台 | 测试项 | 状态 |
|------|--------|------|
| **Chrome 桌面端** | 手势识别、所有降级方案、Canvas 渲染 | [ ] |
| **Safari iOS** | 手势识别（WKWebView）、DeviceMotion、触屏 | [ ] |
| **Android Chrome** | 手势识别、触屏交互、性能 | [ ] |
| **微信内置浏览器** | 降级方案（无手势识别）、滑动点击 | [ ] |
| **Firefox** | 基础功能兼容 | [ ] |

### 5.4 科学准确性验证

- [x] 24 节气太阳黄经度数全部正确
- [x] 圭表影长计算符合天文原理（Python 脚本交叉验证）
- [x] 节气日期范围与天文历法一致
- [x] 物候/农事/民俗内容有可靠来源

### 5.5 发布准备

- [x] 构建生产版本 (`npm run build`)
- [ ] 检查构建产物体积
- [ ] 部署到静态服务器（GitHub Pages / Vercel）
- [ ] 扫码体验链路验证

---

## 附录：文件清单

### 当前项目文件结构（Phase 4 完成后）

```
solar_terms/
├── index.html
├── vite.config.js
├── package.json
├── package-lock.json
├── data/
│   ├── solarTerms.json
│   └── poems.json
├── scripts/
│   └── calc_solar_data.py
├── .trae/
│   ├── documents/
│   │   ├── PRD-节气科普沉浸式H5.md
│   │   ├── 技术架构-节气科普沉浸式H5.md
│   │   └── 开发Checklist-节气科普沉浸式H5.md
│   └── rules/
│       └── awesome-design-systems.md
└── src/
    ├── main.js
    ├── app/
    │   ├── router.js
    │   ├── store.js
    │   └── events.js
    ├── pages/
    │   ├── loading/logic.js
    │   ├── zodiac/logic.js
    │   ├── detail/logic.js
    │   └── lab/logic.js
    ├── interaction/
    │   ├── gestureEngine.js      # Handpose 模型加载 + 帧检测（降帧策略）
    │   ├── gestureMatcher.js     # 手势分类（相对距离归一化 + 3帧防抖）
    │   ├── fallbackSystem.js     # 7种降级交互统一调度
    │   └── cameraManager.js      # 摄像头权限管理 + 视频流
    ├── business/
    │   ├── calendar.js           # 日期→黄经→节气映射 + 实时校准
    │   ├── gnomon.js             # 太阳赤纬/高度角/圭表影长计算
    │   ├── sunPosition.js        # 太阳直射点/昼夜时长计算
    │   └── soundEffects.js       # 程序化音效合成（春雷/蝉鸣/秋风/冬雪）
    ├── renderer/
    │   ├── zodiacCanvas.js       # 国风科技重设计（深空+星点+四象+28宿+节气高亮）
    │   ├── gnomonCanvas.js       # 圭表测影 Canvas 渲染
    │   ├── sundialCanvas.js      # 日晷模拟 Canvas 渲染
    │   └── sceneEngine.js        # 动态场景引擎（花瓣/烈日/落叶/雪花粒子）
    ├── styles/
    │   ├── tokens.css
    │   ├── reset.css
    │   ├── typography.css
    │   ├── layout.css
    │   ├── components.css
    │   ├── transitions.css
    │   └── responsive.css
    └── utils/
        ├── dom.js
        ├── math.js
        ├── audio.js
        ├── device.js
        ├── loading.js
        ├── responsive.js
        └── mobileAdapt.js
```
