# Stage1 实施记录与后续修改指南

## 1. 文档目的

本文档用于记录 Stage1「类型系统与静态数据契约」阶段已经完成的实际改动，并为后续继续修改提供统一约束。

它的作用不是重复 [`plans/MVP_videcoding_实施计划.md`](plans/MVP_videcoding_%E5%AE%9E%E6%96%BD%E8%AE%A1%E5%88%92.md)，而是明确：

- Stage1 已经落地了什么
- 这些实现分别放在什么位置
- 后续继续修改时哪些地方可以改、哪些地方不要提前改
- 如何在承接 Stage1 结果的前提下继续进入 [`Stage2`](plans/MVP_videcoding_%E5%AE%9E%E6%96%BD%E8%AE%A1%E5%88%92.md:289)

---

## 2. Stage1 的目标回顾

依据 [`plans/MVP_videcoding_实施计划.md`](plans/MVP_videcoding_%E5%AE%9E%E6%96%BD%E8%AE%A1%E5%88%92.md:273)，Stage1 的目标是：

- 先锁定主类型与桥接类型
- 先锁定职业、状态、标签、节点、行动等离散值
- 先建立首批静态模板库
- 用 mock run data 验证这些结构已经可以驱动队伍与地图占位展示

Stage1 不负责：

- 正式单局流程
- 正式战斗规则
- 正式 AI provider
- 正式 Zustand store
- 人物驱动增强

因此，当前代码库中属于 Stage1 的实现，本质上都是“稳定契约”和“可消费静态数据”，而不是完整功能系统。

---

## 3. Stage1 已完成内容总览

本阶段已完成以下主链路：

### 3.1 类型系统

已新增类型文件：

- [`src/types/game.ts`](src/types/game.ts)
- [`src/types/character.ts`](src/types/character.ts)
- [`src/types/skill.ts`](src/types/skill.ts)
- [`src/types/event.ts`](src/types/event.ts)
- [`src/types/battle.ts`](src/types/battle.ts)
- [`src/types/ai.ts`](src/types/ai.ts)
- [`src/types/run.ts`](src/types/run.ts)
- [`src/types/index.ts`](src/types/index.ts)

这些文件的职责：

- [`src/types/game.ts`](src/types/game.ts) 提供游戏级共享类型、枚举值关联类型与基础结构
- [`src/types/character.ts`](src/types/character.ts) 定义角色模板与队伍成员实例结构
- [`src/types/skill.ts`](src/types/skill.ts) 定义技能模板与技能效果结构
- [`src/types/event.ts`](src/types/event.ts) 定义事件模板、选项与效果描述
- [`src/types/battle.ts`](src/types/battle.ts) 定义敌人模板、战斗模板与奖励桥接结构
- [`src/types/ai.ts`](src/types/ai.ts) 定义后续 AI 输出的结构化类型占位
- [`src/types/run.ts`](src/types/run.ts) 定义 Stage1 所需的最小 [`RunState`](src/types/run.ts:19)
- [`src/types/index.ts`](src/types/index.ts) 提供统一导出入口

### 3.2 常量系统

已新增常量文件：

- [`src/data/constants/game.ts`](src/data/constants/game.ts)
- [`src/data/constants/index.ts`](src/data/constants/index.ts)

当前常量层承载的内容包括：

- 职业
- 性格标签
- 状态效果
- 关系等级
- 节点类型
- 战斗行动类型

这些常量是 Stage1 之后所有静态模板与后续规则实现的离散值基础。

### 3.3 静态模板库

已新增模板文件：

- [`src/data/archetypes/templates.ts`](src/data/archetypes/templates.ts)
- [`src/data/skills/templates.ts`](src/data/skills/templates.ts)
- [`src/data/enemies/templates.ts`](src/data/enemies/templates.ts)
- [`src/data/events/templates.ts`](src/data/events/templates.ts)
- [`src/data/index.ts`](src/data/index.ts)

当前模板覆盖：

- 主角原型 3 个
- 招募原型 4 个
- 技能模板 10 个
- 敌人模板 5 个
- Boss 模板 1 个
- 事件模板 10 个
- 战斗模板 3 个
- AI 画像配置 3 个

这些模板已经满足 Stage1 对“首批静态内容池”的最低目标。

### 3.4 Mock Run Data 与占位渲染

已新增：

- [`src/data/templates/mockRun.ts`](src/data/templates/mockRun.ts)

已修改：

- [`src/app/App.tsx`](src/app/App.tsx)
- [`src/screens/start/StartScreen.tsx`](src/screens/start/StartScreen.tsx)
- [`src/screens/title/TitleScreen.tsx`](src/screens/title/TitleScreen.tsx)
- [`src/styles/globals/global.css`](src/styles/globals/global.css)

这些改动的目标不是进入正式流程，而是完成 Stage1 验收要求中的“可用 mock run data 渲染队伍与地图占位”。

当前页面能力：

- 标题页可进入 Stage1 占位预览页
- 开局页可展示队伍占位、地图节点占位、遭遇预览
- 仍然沿用 [`src/app/App.tsx`](src/app/App.tsx) 中最小 `useState` 切屏壳层

### 3.5 本地直开兼容性说明

Stage1 之后又补充了“构建后本地可打开”的说明与兼容处理：

- [`vite.config.ts`](vite.config.ts:5) 使用相对 `base: './'`
- [`src/screens/title/TitleScreen.tsx`](src/screens/title/TitleScreen.tsx) 增加说明：离线入口应为 [`dist/index.html`](dist/index.html)
- [`src/screens/start/StartScreen.tsx`](src/screens/start/StartScreen.tsx) 增加相同说明
- [`plans/README.md`](plans/README.md) 已补充 [`dist`](dist) 目录的本地离线使用说明
- 已存在 [`plans/Stage0_本地直开兼容性修复说明.md`](plans/Stage0_%E6%9C%AC%E5%9C%B0%E7%9B%B4%E5%BC%80%E5%85%BC%E5%AE%B9%E6%80%A7%E4%BF%AE%E5%A4%8D%E8%AF%B4%E6%98%8E.md) 记录相关处理

需要明确：

- 可本地离线打开的是构建产物 [`dist/index.html`](dist/index.html)
- 根目录源码 [`index.html`](index.html) 仍然只是 Vite 开发/构建入口，不是离线入口

---

## 4. 关键文件职责说明

### 4.1 类型层

#### [`src/types/character.ts`](src/types/character.ts)

这里是角色契约核心。

重点包括：

- 模板态角色结构
- 队伍成员实例结构
- 属性、身份、成长、叙事字段拆分

后续修改时要注意：

- 不要把战斗状态机字段直接塞进角色模板
- 不要把运行时流程控制字段混进纯模板结构
- 如果 Stage2/Stage3 需要补字段，优先新增桥接字段，而不是破坏现有层次

#### [`src/types/skill.ts`](src/types/skill.ts)

这里定义技能模板与技能效果结构。

后续修改时要注意：

- 技能效果字段应继续保持“可序列化、可静态描述”
- 不要在这里写技能执行逻辑
- 若新增效果种类，应优先扩充效果类型而非写逻辑函数

#### [`src/types/event.ts`](src/types/event.ts)

这里定义事件模板、事件选项和事件效果。

后续修改时要注意：

- 事件不能退化为只有文本描述
- 每个事件选项都应能表达结构化后果
- Stage2 做事件结算时，应消费这些字段，而不是重新定义一套事件格式

#### [`src/types/run.ts`](src/types/run.ts)

这里定义最小 [`RunState`](src/types/run.ts:19)。

后续修改时要注意：

- 当前结构是 Stage1 的最小充分形态
- 可以为 Stage2 增加正式流程所需字段
- 但不要把 createRun、地图推进、存档流程逻辑直接混到类型定义中

#### [`src/types/battle.ts`](src/types/battle.ts)

这里定义敌人模板、战斗模板、奖励桥接数据。

后续修改时要注意：

- 当前只是静态输入结构
- 敌人行为逻辑、回合顺序、结算规则都不在本文件中实现
- Stage3 应基于这里的结构消费，而不是另起一套敌人数据格式

#### [`src/types/ai.ts`](src/types/ai.ts)

这里仅是 AI 输出结构的占位契约。

后续修改时要注意：

- 可以扩字段
- 不能在 Stage1/Stage2 里提前接入 provider 逻辑
- AI 仍然只能生成内容，不能定义规则

### 4.2 数据层

#### [`src/data/constants/game.ts`](src/data/constants/game.ts)

这里是当前离散值中心。

后续修改时要注意：

- 新增职业、状态、节点类型、行动类型时优先改这里
- 避免在各模板文件里硬编码新的散乱字符串

#### [`src/data/archetypes/templates.ts`](src/data/archetypes/templates.ts)

这里维护主角与招募模板。

后续修改时要注意：

- 角色模板应继续走强类型约束
- 不要把战斗运行态残余数据写入 archetype 模板
- 扩充角色数量可以做，但必须复用现有类型系统

#### [`src/data/skills/templates.ts`](src/data/skills/templates.ts)

这里维护技能模板库。

后续修改时要注意：

- 技能模板应继续使用强类型约束
- 可以增加技能数量
- 不要在模板里混入临时页面展示专用字段，除非确实是长期稳定字段

#### [`src/data/enemies/templates.ts`](src/data/enemies/templates.ts)

这里维护敌人模板、Boss 模板、战斗模板和 AI 画像配置。

后续修改时要注意：

- 敌人模板与战斗模板是 Stage3 前的静态输入底座
- 可以继续扩内容数量
- 不要在这里硬写敌人战斗逻辑

#### [`src/data/events/templates.ts`](src/data/events/templates.ts)

这里维护事件模板。

后续修改时要注意：

- 每个事件选项都必须带结构化 effects
- 后续如果引入更多事件类型，应保持当前 effect-driven 设计
- 不要把事件结果写成不可计算的纯自然语言

#### [`src/data/templates/mockRun.ts`](src/data/templates/mockRun.ts)

这里是 Stage1 验收用的 mock 数据。

后续修改时要注意：

- 它是展示数据，不是正式单局初始化器
- Stage2 完成正式 [`createRun`](src/domain/run/createRun.ts) 前，可以继续维护它用于 UI 验收
- Stage2 完成后可逐步弱化其职责，但不要在此之前误删

### 4.3 页面与样式层

#### [`src/app/App.tsx`](src/app/App.tsx)

当前仍然是 Stage0 壳层的最小切屏容器。

后续修改时要注意：

- 在正式引入 [`src/app/store`](src/app/store) 前，不要把这里演化成复杂业务编排中心
- Stage2 若需要继续增加页面切换，也应保持渐进式演进

#### [`src/screens/title/TitleScreen.tsx`](src/screens/title/TitleScreen.tsx)

当前负责标题页与基础说明。

后续修改时要注意：

- 可以继续保留“离线入口说明”
- 不要在这里直接写 Stage2 的流程逻辑

#### [`src/screens/start/StartScreen.tsx`](src/screens/start/StartScreen.tsx)

当前负责 Stage1 占位验证页面。

后续修改时要注意：

- 当前展示是 mock data 驱动
- 进入 Stage2 后可以逐步替换为真实 run state
- 但替换时应保留当前字段结构的兼容性，避免重新发明 UI 数据接口

#### [`src/styles/globals/global.css`](src/styles/globals/global.css)

当前包含 Stage1 占位展示所需样式。

后续修改时要注意：

- 保持全局样式职责，不要把大量页面逻辑耦合到 CSS class 命名里
- 如果 Stage2/Stage3 页面扩张，建议逐步拆出局部样式方案，而不是继续无限堆在这里

---

## 5. Stage1 的实现约束

后续所有修改必须遵守以下约束。

### 5.1 不要破坏分层

继续遵守：

- [`src/types`](src/types) 只放类型
- [`src/data`](src/data) 放静态模板与常量
- [`src/domain`](src/domain) 放规则实现
- [`src/app`](src/app) 放应用装配与流程编排
- [`src/screens`](src/screens) 放页面

不要把：

- 规则计算写进 [`src/data`](src/data)
- 业务流程写进 [`src/types`](src/types)
- 大量规则逻辑写进 [`src/screens`](src/screens)

### 5.2 不要跳阶段

Stage1 已完成的只是契约层。

后续如果继续做功能，应优先进入 [`Stage2`](plans/MVP_videcoding_%E5%AE%9E%E6%96%BD%E8%AE%A1%E5%88%92.md:289)，而不是跳到：

- AI 接口细节
- 复杂战斗演算
- 人物驱动增强
- 大量 UI 美化

### 5.3 不要破坏静态模板的强类型特性

模板文件应继续保持：

- 强类型约束
- 可序列化
- 可被规则层消费

不要把模板退化成：

- 任意对象数组
- 为了临时展示方便而加的混乱字段
- 无法稳定校验的数据结构

### 5.4 不要让 mock 数据冒充正式流程

[`src/data/templates/mockRun.ts`](src/data/templates/mockRun.ts) 的定位必须保持清晰：

- 它是 Stage1 验证数据
- 它不是正式 run 初始化实现
- 它不是正式存档结构生成器

只有在 Stage2 的真实流程落地后，才能逐步淡化它。

---

## 6. 后续推荐修改顺序

### 6.1 如果要继续做 Stage2

建议优先新增：

- [`src/domain/run/createRun.ts`](src/domain/run/createRun.ts)
- [`src/domain/run/generateMap.ts`](src/domain/run/generateMap.ts)
- [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts)
- [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts)
- [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts)
- [`src/app/store/runSlice.ts`](src/app/store/runSlice.ts)

并逐步替换：

- [`src/data/templates/mockRun.ts`](src/data/templates/mockRun.ts) 的部分用途
- [`src/app/App.tsx`](src/app/App.tsx) 中纯 `useState` 壳层的部分职责

### 6.2 如果只是补 Stage1 内容

可以安全继续做的内容包括：

- 增加 archetype 数量
- 增加技能模板数量
- 增加敌人和事件模板数量
- 微调类型字段命名与注释
- 补充数据导出整理
- 补静态数据检查与测试

### 6.3 当前不建议做的内容

在正式进入对应阶段前，不建议现在就做：

- 战斗伤害公式实现
- 状态效果结算器
- 敌人 AI 决策器
- AI provider 调用
- 招募角色 AI 生成
- 完整地图推进页面
- 大规模页面动画演出

---

## 7. 验证与回归建议

后续修改 Stage1 相关内容时，至少做以下检查：

### 7.1 类型检查

确保：

- 新增模板全部通过 TypeScript 检查
- 类型导出入口 [`src/types/index.ts`](src/types/index.ts) 与 [`src/data/index.ts`](src/data/index.ts) 没有失效引用

### 7.2 静态数据检查

抽样检查：

- 角色模板技能引用是否有效
- 敌人模板战斗模板引用是否一致
- 事件模板选项是否都有结构化 effects
- 节点、职业、状态等值是否都来自常量系统

### 7.3 页面占位回归

检查：

- [`TitleScreen`](src/screens/title/TitleScreen.tsx) 能正常进入 [`StartScreen`](src/screens/start/StartScreen.tsx)
- [`StartScreen`](src/screens/start/StartScreen.tsx) 能正常展示队伍、地图节点和遭遇预览
- “本地直开”说明仍然正确，离线入口仍指向 [`dist/index.html`](dist/index.html)

### 7.4 构建与离线入口检查

若涉及构建相关修改，应确认：

- [`vite.config.ts`](vite.config.ts) 中相对 base 没有被破坏
- 构建后仍可打开 [`dist/index.html`](dist/index.html)
- 不要误把根目录 [`index.html`](index.html) 当成离线入口

---

## 8. 后续修改时的简明判断标准

如果你准备修改某个文件，可以先用下面这组判断：

1. 这是类型定义吗？
   - 是：改 [`src/types`](src/types)
2. 这是静态模板或常量吗？
   - 是：改 [`src/data`](src/data)
3. 这是规则计算吗？
   - 是：放到 [`src/domain`](src/domain)
4. 这是页面展示吗？
   - 是：放到 [`src/screens`](src/screens) 或 [`src/components`](src/components)
5. 这是应用流程装配吗？
   - 是：放到 [`src/app`](src/app)
6. 这次修改是否提前跨到了更后面的阶段？
   - 如果是，先停下来，对照 [`plans/MVP_videcoding_实施计划.md`](plans/MVP_videcoding_%E5%AE%9E%E6%96%BD%E8%AE%A1%E5%88%92.md) 检查是否越界

---

## 9. 最终结论

Stage1 已经完成的不是“功能闭环”，而是“数据契约闭环”。

当前代码库已经具备：

- 稳定的核心类型底座
- 可复用的常量系统
- 首批强类型静态模板
- mock run data 驱动的占位渲染能力
- 构建后本地直开的说明约束

以后继续修改时，最重要的是：

- 承接当前契约，不重复造结构
- 不破坏分层
- 不提前跳阶段
- 在进入 [`Stage2`](plans/MVP_videcoding_%E5%AE%9E%E6%96%BD%E8%AE%A1%E5%88%92.md:289) 时，把当前 Stage1 结果作为唯一可信的数据底座继续推进
