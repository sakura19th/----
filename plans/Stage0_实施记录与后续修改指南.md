# Stage 0 实施记录与后续修改指南

## 1. 文档目的

本文档用于记录本次 Stage 0 的实际实施结果、关键决策、文件落点、发布方式与后续修改约束，供后续继续开发时参考。

对应主计划：[`plans/MVP_videcoding_实施计划.md`](./MVP_videcoding_实施计划.md)  
对应目录规范：[`plans/README.md`](./README.md)

---

## 2. Stage 0 范围说明

本次实施严格限定在 [`plans/MVP_videcoding_实施计划.md`](./MVP_videcoding_实施计划.md) 的 Stage 0 范围内。

### 2.1 Stage 0 目标

让项目可以：
- 启动
- 渲染
- 切屏

### 2.2 Stage 0 已交付内容

已完成以下内容：
- Vite + React + TypeScript 基础工程
- 应用入口与全局样式
- 最小 screen 切换机制
- 标题页
- 开局页占位
- GitHub Pages 自动构建与发布工作流

### 2.3 Stage 0 明确未做内容

以下内容均未进入实现，后续不要误判为已完成：
- 类型系统与静态数据契约
- Zustand 业务 store
- 地图生成与单局 run 流程
- 战斗公式与战斗状态机
- AI 接口与 fallback 逻辑
- 人物驱动增强

---

## 3. 本次新增或修改的关键文件

### 3.1 工程配置

- [`package.json`](../package.json)
- [`package-lock.json`](../package-lock.json)
- [`tsconfig.json`](../tsconfig.json)
- [`tsconfig.app.json`](../tsconfig.app.json)
- [`tsconfig.node.json`](../tsconfig.node.json)
- [`vite.config.ts`](../vite.config.ts)
- [`index.html`](../index.html)

### 3.2 应用入口与页面骨架

- [`src/main.tsx`](../src/main.tsx)
- [`src/app/App.tsx`](../src/app/App.tsx)
- [`src/components/layout/ScreenFrame.tsx`](../src/components/layout/ScreenFrame.tsx)
- [`src/screens/title/TitleScreen.tsx`](../src/screens/title/TitleScreen.tsx)
- [`src/screens/start/StartScreen.tsx`](../src/screens/start/StartScreen.tsx)
- [`src/styles/globals/global.css`](../src/styles/globals/global.css)
- [`src/vite-env.d.ts`](../src/vite-env.d.ts)

### 3.3 自动发布配置

- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

---

## 4. 当前实现结构说明

### 4.1 应用入口

前端入口位于 [`src/main.tsx`](../src/main.tsx)，负责：
- 挂载 React 应用
- 导入全局样式
- 渲染 [`App`](../src/app/App.tsx)

### 4.2 应用壳层

[`src/app/App.tsx`](../src/app/App.tsx) 是当前 Stage 0 的最小应用编排层，负责：
- 管理当前 screen 状态
- 在标题页与开局页之间切换
- 组合页面组件

当前 screen 机制使用本地 `useState`，这是有意为之，原因是 Stage 0 只要求“最小切屏”，还不应提前进入后续阶段的全局状态设计。

### 4.3 页面层

当前仅实现两个页面：
- [`src/screens/title/TitleScreen.tsx`](../src/screens/title/TitleScreen.tsx)
- [`src/screens/start/StartScreen.tsx`](../src/screens/start/StartScreen.tsx)

这两个页面的职责：
- 标题页：显示项目标题，并进入开局页
- 开局页：作为占位页，验证切屏能力，并返回标题页

### 4.4 布局组件

[`src/components/layout/ScreenFrame.tsx`](../src/components/layout/ScreenFrame.tsx) 是当前最小布局容器，用于承载页面内容。

### 4.5 样式层

[`src/styles/globals/global.css`](../src/styles/globals/global.css) 提供：
- 页面基础重置
- 背景与文本样式
- 容器布局
- 按钮、卡片、标题等 Stage 0 级别通用样式

---

## 5. GitHub 发布机制说明

### 5.1 自动发布工作流

仓库已增加 GitHub Actions 工作流：[` .github/workflows/deploy.yml `](../.github/workflows/deploy.yml)

其行为如下：
- 当代码 push 到 `main` 分支时自动触发
- 自动执行 [`npm ci`](../package-lock.json)
- 自动执行 [`npm run build`](../package.json)
- 自动上传 [`dist`](../dist) 目录
- 自动发布到 GitHub Pages

### 5.2 Pages 设置要求

GitHub 仓库中需要将 Pages 的来源设置为：
- **GitHub Actions**

否则虽然工作流存在，但不会按预期完成 Pages 发布。

### 5.3 为什么之前会白屏

之前白屏的根因是构建产物中的资源路径为绝对路径，直接访问发布页或静态文件时可能找不到资源。

本次已在 [`vite.config.ts`](../vite.config.ts) 中增加：
- `base: './'`

这会让构建后的资源路径改为相对路径，适合当前静态托管场景与 GitHub Pages 场景。

---

## 6. 关于 dist 与 assets 的说明

构建后 [`dist`](../dist) 目录中出现：
- [`dist/index.html`](../dist/index.html)
- [`dist/assets/*.js`](../dist/assets)
- [`dist/assets/*.css`](../dist/assets)

这是 Vite 的正常行为。

### 6.1 JS 文件的作用

打包后的应用代码会输出到 [`dist/assets`](../dist/assets) 下的 JS 文件中。

### 6.2 CSS 文件的作用

导入的样式会被提取到 [`dist/assets`](../dist/assets) 下的 CSS 文件中。

### 6.3 注意事项

主计划或 README 中提到“发布期输出单一 index.html”时，当前应理解为：
- 以一个 [`index.html`](../index.html) 作为发布入口
- 不代表完全没有附属静态资源文件

如果未来确实要做“单一 HTML 内联所有资源”的产物形式，需要单独补充构建策略，不属于当前 Stage 0 范围。

---

## 7. 后续修改时必须遵守的规则

### 7.1 阶段顺序不可跳跃

后续必须继续遵守 [`plans/MVP_videcoding_实施计划.md`](./MVP_videcoding_实施计划.md) 中的阶段顺序：
1. Stage 1 类型系统与静态数据契约
2. Stage 2 单局主流程骨架
3. Stage 3 战斗纯逻辑内核
4. Stage 4 战斗 UI 接入
5. Stage 5 一局闭环内容补齐
6. Stage 6 AI 接口与 fallback
7. Stage 7 人物驱动增强

禁止直接跳去实现：
- AI 接口细节
- 炫技动效
- 大量页面美化
- 与主流程无关的扩展系统

### 7.2 当前页面切换机制只是临时最小骨架

[`src/app/App.tsx`](../src/app/App.tsx) 当前用 `useState` 管理 screen，只适用于 Stage 0。

进入 Stage 2 或后续页面扩展时，可以逐步替换为更正式的状态装配方案，但必须遵循主计划，不要在 Stage 1 就提前塞入复杂业务流程。

### 7.3 不要误把空目录当作已实现模块

当前大量目录中只有 [`.gitkeep`](../src/.gitkeep)，例如：
- [`src/domain`](../src/domain)
- [`src/data`](../src/data)
- [`src/types`](../src/types)
- [`src/app/store`](../src/app/store)

这些目录只是骨架保留，并不代表模块已实现。

### 7.4 Stage 1 的正确起点

后续如果继续开发，应该从以下内容开始：
- 在 [`src/types`](../src/types) 下补充核心类型
- 在 [`src/data/constants`](../src/data/constants) 下补充常量
- 在 [`src/data`](../src/data) 下补充最小静态模板数据
- 先让类型与静态数据通过检查，再考虑 mock 数据渲染

不要一开始就做：
- 真正的地图推进
- 战斗状态流转
- AI 文本生成
- 复杂 store 分片

---

## 8. 推荐后续修改步骤

### 8.1 若只是修改 Stage 0 页面文案或样式

优先修改：
- [`src/screens/title/TitleScreen.tsx`](../src/screens/title/TitleScreen.tsx)
- [`src/screens/start/StartScreen.tsx`](../src/screens/start/StartScreen.tsx)
- [`src/styles/globals/global.css`](../src/styles/globals/global.css)

### 8.2 若要新增 Stage 1 内容

优先新增：
- [`src/types`](../src/types)
- [`src/data/constants`](../src/data/constants)
- [`src/data/archetypes`](../src/data/archetypes)
- [`src/data/skills`](../src/data/skills)
- [`src/data/enemies`](../src/data/enemies)
- [`src/data/events`](../src/data/events)

### 8.3 若要发布最新内容

标准流程：
1. 本地修改代码
2. 执行 [`npm run build`](../package.json) 做基础验证
3. `git add .`
4. `git commit -m "你的提交说明"`
5. `git push origin main`
6. 等待 GitHub Actions 自动构建并发布

---

## 9. 当前已知注意事项

### 9.1 当前仓库已提交较多构建与依赖文件

当前 Git 历史中已经包含：
- [`node_modules`](../node_modules)
- [`dist`](../dist)
- `*.tsbuildinfo`
- 编译输出的 [`vite.config.js`](../vite.config.js) 与 [`vite.config.d.ts`](../vite.config.d.ts)

这不是理想的长期仓库状态，但这是此前按“全部 git 到 main”执行后的结果。

后续若要清理仓库，应单独规划：
- 增加 [`.gitignore`](../.gitignore)
- 停止追踪不应入库的文件
- 重新整理发布策略

该清理动作不属于本次 Stage 0 的既有交付。

### 9.2 Windows 下可能出现 CRLF 警告

Git 提交时可能出现 LF/CRLF 转换警告，这在 Windows 环境下较常见。当前未影响构建、提交与发布。

---

## 10. 本阶段验收结论

当前 Stage 0 已满足以下条件：
- 应用可构建
- 标题页可渲染
- 标题页可进入开局页占位
- GitHub Pages 可通过 push 到 `main` 自动构建与发布

因此可以视为：
- Stage 0 已完成
- 具备进入 Stage 1 的前置条件

---

## 11. 后续如需继续开发的参考顺序

建议直接参考：[`plans/MVP_videcoding_实施计划.md`](./MVP_videcoding_实施计划.md)

实际执行时推荐遵守以下顺序：
1. 先补类型
2. 再补静态数据
3. 再做单局流程骨架
4. 再做战斗纯逻辑
5. 再做战斗 UI
6. 再补整局闭环
7. 最后接 AI 与人物驱动增强

本文档的作用是帮助后续开发人员快速理解：
- 当前做到哪里
- 哪些是已经稳定的基础
- 哪些内容尚未开始
- 后续修改应从哪里接着做
