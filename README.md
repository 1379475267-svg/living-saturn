# 🪐 Living Saturn (Demo)

> ⚠️ This project is a **gesture-control demo**, not a final product.

🔗 **Live Demo:**
👉 https://1379475267-svg.github.io/living-saturn/

---

## 📌 项目简介 | Overview

**Living Saturn** 是一个基于 Three.js 的交互式粒子土星系统，
当前版本主要用于 **测试手势识别（MediaPipe）与三维视觉交互的结合效果**。

This project is an **experimental demo** that explores the integration of:

* Hand gesture recognition (MediaPipe)
* Real-time 3D rendering (Three.js)
* Interactive particle systems

---

## 🎯 项目定位 | Purpose

这个项目的核心目的不是完整产品，而是：

* ✅ 验证手势控制在 Web 端的可行性
* ✅ 测试“手势 → 参数映射（openRatio）”的交互效果
* ✅ 探索粒子系统在实时交互下的表现

> ✔️ 手势控制已成功实现，本项目阶段目标已达成

---

## ✨ Features

* 🌌 高密度粒子构成的土星核心
* 💫 多层环带（带椭圆轨道和动态扰动）
* 🖐️ 基于 MediaPipe 的手势识别
* 🎮 手势控制参数：`openRatio`
* 🌊 呼吸感 + 非线性形变
* ⚡ Chaos 模式（环崩解效果）
* ✨ Bloom + 拖影（Afterimage）

---

## 🎮 使用方式 | Usage

### 在线体验（推荐）

直接访问：
👉 https://1379475267-svg.github.io/living-saturn/

---

### 本地运行

```bash
python -m http.server
```

或使用 VS Code Live Server 打开 `index.html`

---

## 🕹️ 操作说明 | Controls

1. 打开网页后允许摄像头权限
2. 将手放入画面中
3. 控制手势：

| 手势状态     | 效果       |
| -------- | -------- |
| 🤏 合拢    | 稳定状态     |
| ✋ 张开     | 扩张、呼吸    |
| 🖐️ 完全张开 | Chaos 崩解 |

其他操作：

* 🖱️ 鼠标移动：视角微调
* 🎡 滚轮：缩放
* 🔳 Fullscreen：沉浸模式

---

## ⚠️ Notes

* 本项目为 **实验性 Demo**
* 更偏向技术验证，而非产品设计
* 性能优先级 < 视觉效果
* 需要浏览器支持 WebGL 和摄像头权限

---

## 🧠 技术栈 | Tech Stack

* Three.js
* MediaPipe Tasks Vision
* WebGL / GLSL
* JavaScript (ES Modules)

---

## 🚀 后续方向（可扩展）

* 🎵 加入音频响应（BGM / 音频驱动粒子）
* 🤲 更复杂手势（旋转 / 捏合 / 双手）
* 🌍 多场景切换（不仅仅是土星）
* 🧩 模块化交互系统

---

## 👀 作者的一点想法

这个项目最初是为了做视觉效果，但在过程中逐渐转向：

> 👉 “用手势去操控一个‘有生命感’的宇宙结构”

目前它更像一个 **交互实验原型（interaction prototype）**，
后续可能会发展成一个更完整的创意项目。

---
## 👤 Author

**Haoran Fei**

* 🎓 Electronic Information Science & Technology 
* 💡 Interested in: Interactive Graphics / Embedded Systems / Creative Coding
* 🔗 GitHub: https://github.com/1379475267-svg

---

⭐ If you like this project, feel free to give it a star!
