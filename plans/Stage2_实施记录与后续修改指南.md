# Stage2 实施记录与后续修改指南

## 1. 文档目的

本文档用于沉淀 Stage2「单局主流程骨架」阶段已经完成的实际更新内容，并为后续阶段继续修改提供统一参考。

它不是对 [`plans/MVP_videcoding_实施计划.md`](plans/MVP_videcoding_实施计划.md) 的重复摘抄，而是补充说明：

- Stage2 已经实际落地了哪些能力
- 本次新增或修改的文件分别承担什么职责
- 现有实现如何承接 Stage1 的类型与静态数据契约
- 当计划文档、说明文档与代码现状不完全一致时，应以什么为准
- 后续进入 Stage3 及以后阶段时，应如何在当前骨架上继续修改

对应参考：

- [`plans/MVP_videcoding_实施计划.md`](plans/MVP_videcoding_实施计划.md)
- [`plans/Stage1_实施记录与后续修改指南.md`](plans/Stage1_实施记录与后续修改指南.md)
- [`plans/README.md`](plans/README.md)

---

## 2. Stage2 目标与本次完成范围

### 2.1 Stage2 目标回顾

依据 [`plans/MVP_videcoding_实施计划.md`](plans/MVP_videcoding_实施计划.md)，Stage2 的核心目标是把 Stage1 已经建立好的类型系统与静态模板，接成一个“可以从开局进入、可以看地图、可以进入节点、可以完成事件结算并返回地图”的单局主流程骨架。

这一阶段重点不在于完整玩法深度，而在于打通以下最小链路：

- 创建正式 [`RunState`](src/types/run.ts:56)
- 基于固定蓝图生成最小地图
- 从地图选择可用节点并进入事件
- 对事件选项进行结构化结算
- 处理资源、状态、关系、技能与招募等最小结果
- 将结果写回 run state 并回到地图
- 建立最小自动存档骨架与恢复入口

### 2.2 本次实际完成范围

本次 Stage2 已实际完成的范围包括：

- 在 [`src/domain/run/createRun.ts`](src/domain/run/createRun.ts:31) 中建立正式开局初始化器
- 在 [`src/domain/run/generateMap.ts`](src/domain/run/generateMap.ts:17) 中建立固定四节点地图生成逻辑
- 在 [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts:79) 中建立事件节点解析与结果回写逻辑
- 在 [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts:20) 中建立资源奖励应用器
- 在 [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts:41) 中建立最小 store 骨架，负责开局、选点、开节点、事件选择与存档衔接
- 在 [`src/screens/map/MapScreen.tsx`](src/screens/map/MapScreen.tsx:22) 与 [`src/screens/event/EventScreen.tsx`](src/screens/event/EventScreen.tsx:16) 中接入 Stage2 地图页与事件页
- 在 [`src/tests/run/stage2RunSmokeTest.ts`](src/tests/run/stage2RunSmokeTest.ts:10) 中补充 Stage2 冒烟验证脚本

### 2.3 明确不属于本次完成范围的内容

以下内容不应误判为 Stage2 已完成：

- 正式战斗回合制逻辑与伤害公式
- 战斗页面上的行动选择与敌我状态机
- 完整招募系统 UI 与复杂队伍管理
- 多分支地图生成算法、随机池权重与章节扩展
- 正式 Zustand 分 slice 设计
- AI provider 接入、提示词编排与生成结果回写
- 整局闭环的胜败结算与结果页

换言之，Stage2 当前完成的是“主流程骨架闭环”，不是“玩法闭环”。

---

## 3. 本次新增/修改文件清单及职责

### 3.1 领域层：单局流程与结算逻辑

#### 新增文件

- [`src/domain/run/createRun.ts`](src/domain/run/createRun.ts:31)
- [`src/domain/run/generateMap.ts`](src/domain/run/generateMap.ts:17)
- [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts:79)
- [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts:20)

#### 职责说明

- [`src/domain/run/createRun.ts`](src/domain/run/createRun.ts:31)
  - 从 Stage1 静态模板中选取主角模板
  - 生成初始队伍成员实例
  - 调用 [`generateMap()`](src/domain/run/generateMap.ts:17) 生成地图
  - 组装 Stage2 版本的正式 [`RunState`](src/types/run.ts:56)
  - 设置初始资源、演示用事件池/战斗池、展示层状态与存档元信息

- [`src/domain/run/generateMap.ts`](src/domain/run/generateMap.ts:17)
  - 用固定蓝图产出最小地图
  - 当前只负责“可验证、可推进”的顺序节点结构
  - 不负责随机生成、章节扩展与权重控制

- [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts:79)
  - 根据当前节点找到对应事件
  - 消费事件选项中的结构化 effects
  - 处理碎晶、HP、SP、关系、状态、技能与招募结果
  - 推进当前节点状态、解锁下个节点、记录节点结果摘要
  - 更新 [`presentation`](src/types/run.ts:47) 以便 UI 返回地图并展示结果

- [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts:20)
  - 提供对 HP、SP、shards、supply 奖励的统一应用入口
  - 当前真正会回写到队伍数值的是 HP/SP
  - 返回 gained 字段，为未来资源统一汇总保留扩展口

### 3.2 应用装配层：最小 store 与存读档衔接

#### 新增/修改文件

- [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts:41)
- [`src/domain/save/loadRun.ts`](src/domain/save/loadRun.ts)
- [`src/domain/save/saveRun.ts`](src/domain/save/saveRun.ts)

#### 职责说明

- [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts:41)
  - 维护当前应用 screen 与 run 实例
  - 提供 [`boot()`](src/app/store/gameStore.ts:67)、[`startNewRun()`](src/app/store/gameStore.ts:85)、[`selectNode()`](src/app/store/gameStore.ts:99)、[`openCurrentNode()`](src/app/store/gameStore.ts:108)、[`chooseEvent()`](src/app/store/gameStore.ts:129) 等操作
  - 通过 [`saveRun()`](src/domain/save/saveRun.ts) 在状态更新时写入持久化结果
  - 通过 [`loadRun()`](src/domain/save/loadRun.ts) 在启动时尝试恢复存档

- [`src/domain/save/loadRun.ts`](src/domain/save/loadRun.ts)
  - 承担最小读档入口
  - 当前是 Stage2 级别的简单恢复骨架

- [`src/domain/save/saveRun.ts`](src/domain/save/saveRun.ts)
  - 承担最小写档入口
  - 当前重点是保存 run state，而不是实现复杂存档管理系统

### 3.3 页面层：地图页、事件页、招募提示衔接

#### 涉及文件

- [`src/screens/map/MapScreen.tsx`](src/screens/map/MapScreen.tsx:22)
- [`src/screens/event/EventScreen.tsx`](src/screens/event/EventScreen.tsx:16)
- [`src/screens/recruit/RecruitScreen.tsx`](src/screens/recruit/RecruitScreen.tsx)
- [`src/app/App.tsx`](src/app/App.tsx)
- [`src/screens/title/TitleScreen.tsx`](src/screens/title/TitleScreen.tsx)
- [`src/screens/start/StartScreen.tsx`](src/screens/start/StartScreen.tsx)
- [`src/styles/globals/global.css`](src/styles/globals/global.css)

#### 职责说明

- [`src/screens/map/MapScreen.tsx`](src/screens/map/MapScreen.tsx:22)
  - 展示 run 概览、资源、自动存档次数、队伍、地图节点与当前选中节点
  - 允许用户选择节点并进入当前可进入节点
  - 承担 Stage2 主地图入口页职责

- [`src/screens/event/EventScreen.tsx`](src/screens/event/EventScreen.tsx:16)
  - 展示当前事件标题、描述与可选项
  - 基于 [`choice.conditions.minimumShards`](src/screens/event/EventScreen.tsx:9) 做最小禁用判断
  - 将用户选择回传给 store 做正式结算

- [`src/screens/recruit/RecruitScreen.tsx`](src/screens/recruit/RecruitScreen.tsx)
  - 承接招募结果提示
  - 当前更偏向“结果通知页”，不是独立完整招募系统

- [`src/app/App.tsx`](src/app/App.tsx)
  - Stage2 已不再只是 Stage0/Stage1 的纯本地占位切屏壳层
  - 它开始承接 store 驱动的 screen 分发与流程装配职责

- [`src/screens/title/TitleScreen.tsx`](src/screens/title/TitleScreen.tsx) 与 [`src/screens/start/StartScreen.tsx`](src/screens/start/StartScreen.tsx)
  - 继续保留标题页与开局过渡职责
  - 为进入 Stage2 正式 run 流程提供入口

### 3.4 类型与验证层

#### 涉及文件

- [`src/types/run.ts`](src/types/run.ts:6)
- [`src/tests/run/stage2RunSmokeTest.ts`](src/tests/run/stage2RunSmokeTest.ts:10)
- [`package.json`](package.json:6)

#### 职责说明

- [`src/types/run.ts`](src/types/run.ts:6)
  - 承接 Stage2 所需的运行态结构扩展
  - 定义节点状态、地图、资源、已完成节点结果、存档元信息、屏幕状态与展示态结构
  - 是本阶段领域层、store 层与页面层之间的统一契约

- [`src/tests/run/stage2RunSmokeTest.ts`](src/tests/run/stage2RunSmokeTest.ts:10)
  - 验证 createRun、事件读取、节点结算、地图推进与招募结果
  - 用最小可执行脚本覆盖 Stage2 核心主链路

- [`package.json`](package.json:8)
  - 表明项目仍以 [`build`](package.json:8) 为主要静态校验入口
  - Stage2 验证仍以类型检查 + 构建 + 冒烟脚本为主

---

## 4. 关键实现说明与架构衔接点

### 4.1 Stage2 如何承接 Stage1

Stage1 的核心价值是“稳定契约 + 静态模板库”。Stage2 没有重做这套结构，而是直接消费它们：

- [`createRun()`](src/domain/run/createRun.ts:31) 直接使用 [`HERO_ARCHETYPES`](src/domain/run/createRun.ts:32)、[`RECRUIT_ARCHETYPES`](src/domain/run/createRun.ts:74)、[`EVENT_TEMPLATES`](src/domain/run/createRun.ts:54)、[`BATTLE_TEMPLATES`](src/domain/run/createRun.ts:55)
- [`resolveNode()`](src/domain/run/resolveNode.ts:79) 直接消费 [`EventChoice`](src/types/event.ts) 的结构化 effects
- [`MapScreen`](src/screens/map/MapScreen.tsx:22) 与 [`EventScreen`](src/screens/event/EventScreen.tsx:16) 直接消费 [`RunState`](src/types/run.ts:56)

这说明当前代码的正确延续方向是：

1. 继续把“数据定义”放在 [`src/types`](src/types) 与 [`src/data`](src/data)
2. 把“流程与结算规则”放在 [`src/domain`](src/domain)
3. 把“状态装配”放在 [`src/app/store`](src/app/store)
4. 把“展示”放在 [`src/screens`](src/screens)

不要在后续阶段重新发明第二套 run 数据结构，也不要把事件结算逻辑回写到模板层。

### 4.2 createRun 是正式 run 初始化入口

[`createRun()`](src/domain/run/createRun.ts:31) 的定位已经和 Stage1 的 [`mockRun`](src/data/templates/mockRun.ts) 不同。

当前应当明确：

- [`src/data/templates/mockRun.ts`](src/data/templates/mockRun.ts) 属于 Stage1 的展示验证资产
- [`createRun()`](src/domain/run/createRun.ts:31) 才是 Stage2 之后继续扩展正式 run 初始化的唯一可信入口

后续如果需要增加：

- 初始队伍构建规则
- seed 驱动的章节差异
- 开局资源变体
- 初始 relic / trait / buff

都应优先扩在 [`src/domain/run/createRun.ts`](src/domain/run/createRun.ts:31)，而不是继续增强 mock 数据。

### 4.3 generateMap 目前是固定蓝图，不是正式地图算法

[`generateMap()`](src/domain/run/generateMap.ts:17) 当前采用 [`STAGE2_NODE_BLUEPRINT`](src/domain/run/generateMap.ts:10) 生成顺序四节点地图。

这样设计的意义是：

- 先保证单局主流程可以稳定串起来
- 先验证节点状态流转与事件引用链路
- 为后续 Stage5 的内容补齐、章节扩展和随机地图生成留出接口

因此后续如果要扩地图，不应误判当前实现已经具备：

- 分层地图
- 路线分叉
- 权重池抽样
- 多章节配置化

这些都属于后续增强内容，应在不破坏 [`RunMap`](src/types/run.ts:16) 基础契约的前提下演进。

### 4.4 resolveNode 是 Stage2 最核心的流程结算点

[`resolveNode()`](src/domain/run/resolveNode.ts:79) 是 Stage2 的主流程心脏，当前它承担了三类职责：

1. 查找当前节点与事件
2. 消费选项 effects 并更新队伍/资源/招募结果
3. 推进地图状态与 presentation 状态

其重要架构含义在于：

- 事件模板继续只表达“结构化结果”
- 真正的运行态更新只发生在领域层
- UI 不直接解释 effects，也不自己改 run state

后续 Stage3/Stage5 如果新增事件效果类型，应优先扩充：

- [`src/types/event.ts`](src/types/event.ts)
- [`resolveNode()`](src/domain/run/resolveNode.ts:79)

而不是在页面里临时判断字符串做处理。

### 4.5 presentation 状态是 UI 与领域层之间的桥

[`RunPresentationState`](src/types/run.ts:47) 与 [`gameStore`](src/app/store/gameStore.ts:41) 共同构成了当前 UI 装配桥接层。

当前它已经承载：

- 当前激活 screen
- 当前选中节点
- 当前事件
- 当前选择
- 待展示的遭遇信息
- 上一次结算结果文案

后续修改时要注意：

- 这是一层“展示态桥接结构”，不是纯领域规则数据
- 它可以继续扩，但不要把 React 局部状态、DOM 状态、动画中间态直接塞进去
- 如果未来切 Zustand 或拆 slice，也应继续保留这层结构化展示态，而不是退化成零散 UI 字段

### 4.6 自动存档当前只有骨架，不代表完整存档系统

在 [`gameStore`](src/app/store/gameStore.ts:50) 中，run 更新后会通过 [`saveRun()`](src/domain/save/saveRun.ts) 落盘；在 [`boot()`](src/app/store/gameStore.ts:67) 中会通过 [`loadRun()`](src/domain/save/loadRun.ts) 尝试恢复。

这说明 Stage2 已建立“存档接入点”，但尚未完成：

- 多 slot 管理
- 手动存档与读取 UI
- 存档迁移版本兼容
- 异常恢复策略
- 自动存档时机精细化

因此当前文档、代码和测试中看到的“自动存档”都应理解为“已打通接线，但仍是最小骨架”。

---

## 5. 文档与代码现状差异时的处理依据

后续修改时，如果发现主计划、阶段说明、页面文案与代码现状存在差异，应按以下优先级判断：

### 5.1 以实际代码契约为直接依据

对于“当前系统到底支持什么”，应优先以这些文件为准：

- [`src/types/run.ts`](src/types/run.ts:56)
- [`src/domain/run/createRun.ts`](src/domain/run/createRun.ts:31)
- [`src/domain/run/generateMap.ts`](src/domain/run/generateMap.ts:17)
- [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts:79)
- [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts:41)

原因是这些文件决定了 Stage2 当前真实的数据结构、流程能力与状态流转。

### 5.2 以阶段计划判断“应不应该做”

如果问题不是“现在代码是什么”，而是“这次修改是否越界”，则应回看：

- [`plans/MVP_videcoding_实施计划.md`](plans/MVP_videcoding_实施计划.md)
- [`plans/Stage1_实施记录与后续修改指南.md`](plans/Stage1_实施记录与后续修改指南.md)
- 本文档 [`plans/Stage2_实施记录与后续修改指南.md`](plans/Stage2_实施记录与后续修改指南.md)

也就是说：

- 判断现状：先看代码
- 判断边界：再看计划与阶段文档

### 5.3 页面文案落后于实现时，优先保持流程真相

如果页面中的说明文本与真实逻辑不完全一致，应优先以真实流程能力为准，并在允许的阶段内补正文案；不要为了迎合旧文案去破坏已经接通的逻辑。

例如：

- 若某页仍写着“占位展示”，但实际已由正式 [`RunState`](src/types/run.ts:56) 驱动，则应认定它属于正式 Stage2 骨架页面
- 若某说明仍沿用 Stage1 口径，但 store 与 domain 已接通存档骨架，应认定“主流程骨架已进入 Stage2”

### 5.4 不要用未来计划反推篡改当前实现定义

如果主计划中写了后续要做战斗、结果页、AI、人物驱动等内容，不代表当前代码已经具备这些能力。

处理原则是：

- 未来阶段写的是“待做方向”
- 当前代码表现的是“已完成事实”
- 后续修改必须以前者指导边界、以后者判断现状

---

## 6. 测试/验证方式与结果

### 6.1 本次采用的验证方式

本次 Stage2 已有的验证方式主要包括：

1. 类型检查与构建
   - 通过 [`package.json`](package.json:8) 中的 [`build`](package.json:8) 脚本完成 TypeScript 构建与前端打包
2. 领域层冒烟测试
   - 通过 [`src/tests/run/stage2RunSmokeTest.ts`](src/tests/run/stage2RunSmokeTest.ts:10) 验证正式 run 主链路
3. UI 手工回归
   - 通过地图页、事件页、招募提示页检查 screen 切换、节点推进与结果展示

### 6.2 冒烟测试覆盖点

[`runStage2SmokeTest()`](src/tests/run/stage2RunSmokeTest.ts:10) 当前至少覆盖了：

- 创建 run 后地图节点数量为 4
- 初始当前节点是 [`node-1`](src/domain/run/generateMap.ts:11)
- 首个节点能够解析出 [`event-broken-caravan`](src/tests/run/stage2RunSmokeTest.ts:16)
- 首次结算后碎晶增加、当前节点推进到 [`node-2`](src/tests/run/stage2RunSmokeTest.ts:20)
- 下一节点状态从 locked 变为 available
- 第三节点能够进入招募事件
- 招募后队伍人数增加
- 招募结算后展示层回到地图
- 领域层不会直接改动自动存档计数

### 6.3 当前可认定的验证结论

依据现有测试脚本与页面接线，可以认定 Stage2 当前已经验证通过的能力有：

- 正式开局初始化可用
- 最小地图推进链路可用
- 事件节点进入与结算可用
- 招募结果可回写到队伍
- 结算结果可回到地图展示
- store 与最小存读档骨架已接通

### 6.4 验证口径上的注意事项

需要特别注意：

- 当前测试重点在“主流程骨架是否接通”，不是在“数值是否平衡”
- 当前没有正式战斗演算回归集
- 当前没有浏览器端 E2E 测试
- 当前没有复杂存档边界测试

因此 Stage2 的验证结论应写成“骨架已通”，而不是“系统已完整稳定”。

---

## 7. 已知限制与不属于 Stage2 的内容

### 7.1 已知限制

当前实现至少存在以下已知限制：

- 地图是固定四节点顺序结构，不支持分叉与随机生成
- 事件结算只覆盖当前已定义的 effects 类型
- 招募流程是事件驱动 + 结果提示，不是独立完整招募系统
- battle 目前只存在待接入引用，不存在真实战斗执行页
- 自动存档只有最小写入与读取骨架，未形成完整存档管理方案
- 页面样式仍主要集中在 [`src/styles/globals/global.css`](src/styles/globals/global.css)
- 当前 store 为自建最小实现，不是正式状态管理架构终态

### 7.2 不属于 Stage2 的内容

以下内容如果要做，应归入后续阶段，而不是继续塞入 Stage2：

- 战斗状态机、伤害公式、敌方行动决策
- 战斗 UI 的完整交互闭环
- 整局通关/失败结果页
- 大量新章节、新节点类型与复杂地图算法
- AI 生成事件文本、角色人设与战斗描述
- 人物驱动增强、关系演化深度系统
- 面向发布质量的完整测试体系

### 7.3 不要错误清理的内容

后续有人整理代码时，不要误删以下资产：

- [`src/data/templates/mockRun.ts`](src/data/templates/mockRun.ts)
  - 虽然 Stage2 已有正式 [`createRun()`](src/domain/run/createRun.ts:31)，但该文件仍是 Stage1 验收资产
- [`src/tests/run/stage2RunSmokeTest.ts`](src/tests/run/stage2RunSmokeTest.ts:10)
  - 这是当前少量能直接证明 Stage2 主链路可用的验证脚本
- [`src/domain/save/loadRun.ts`](src/domain/save/loadRun.ts) 与 [`src/domain/save/saveRun.ts`](src/domain/save/saveRun.ts)
  - 它们虽简单，但已经是后续存档体系的接点

---

## 8. 给后续阶段的修改建议与注意事项

### 8.1 进入 Stage3 时的建议

如果下一步进入战斗纯逻辑阶段，建议优先承接当前结构，而不是另起炉灶：

- 从 [`pendingEncounter.battleId`](src/types/run.ts:43) 继续接战斗入口
- 让事件结算只负责“触发战斗”，不要在事件层直接实现战斗结果
- 让战斗系统消费已有 [`availableBattles`](src/types/run.ts:64) 与敌人模板结构
- 新增战斗状态时，优先扩 [`RunState`](src/types/run.ts:56) 或独立 battle state，而不要破坏现有 map/event 主链路

### 8.2 进入 Stage5 时的建议

如果后续补整局内容闭环，建议在当前骨架上增强：

- 扩展 [`generateMap()`](src/domain/run/generateMap.ts:17) 的章节配置与节点池
- 扩展 [`resolveNode()`](src/domain/run/resolveNode.ts:79) 的 effect 覆盖范围
- 增加资源消耗、恢复、营地与奖励分配规则
- 为 [`completedNodeResults`](src/types/run.ts:65) 增加更稳定的回顾展示用途

### 8.3 对 store 与 UI 的修改注意事项

后续若要重构 [`gameStore`](src/app/store/gameStore.ts:41) 或接 Zustand，请保持以下原则：

- 先保持现有 action 语义稳定，再替换实现方式
- 不要让页面直接操作 run 深层字段
- 不要把事件结算逻辑搬进组件
- screen 切换应继续由结构化状态驱动，而不是 scattered boolean

### 8.4 对类型与事件效果的扩展建议

后续若新增事件效果，推荐顺序为：

1. 先改 [`src/types/event.ts`](src/types/event.ts)
2. 再改 [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts:79)
3. 再补模板数据
4. 最后补页面表现与测试

这样可以继续保持“模板定义 -> 领域消费 -> UI 展示”的单向依赖关系。

### 8.5 对测试补强的建议

后续至少应继续补：

- createRun 不同开局输入的测试
- resolveNode 各种 effect 分支测试
- save/load 的恢复一致性测试
- 进入 battle / recruit / camp 等不同节点后的 screen 流转测试
- 构建后手工回归离线入口 [`dist/index.html`](dist/index.html)

### 8.6 简明判断标准

后续修改前可以先问自己：

1. 这是静态数据还是流程逻辑？
   - 静态数据改 [`src/data`](src/data)
   - 流程逻辑改 [`src/domain`](src/domain)
2. 这是展示态还是领域态？
   - 展示态看 [`presentation`](src/types/run.ts:47)
   - 领域态看 [`RunState`](src/types/run.ts:56) 其他字段与领域函数
3. 这是 Stage2 骨架增强，还是已经越界到后续阶段？
   - 如果已经是战斗内核、AI 接入或整局闭环，则不应继续算作 Stage2 修改

---

## 9. 最终结论

Stage2 当前已完成的，不是“完整游戏一局”，而是“正式单局主流程骨架”。

当前代码库已经具备：

- 正式 [`RunState`](src/types/run.ts:56) 初始化入口
- 固定蓝图驱动的最小地图生成能力
- 事件节点进入、选择、结算与回图能力
- 资源、关系、状态、技能、招募的最小结构化结算能力
- store 驱动的页面流转与最小存读档衔接能力
- 可执行的 Stage2 主链路冒烟验证脚本

以后继续修改时，最重要的是：

- 把 [`createRun()`](src/domain/run/createRun.ts:31) 视为正式 run 初始化入口
- 把 [`resolveNode()`](src/domain/run/resolveNode.ts:79) 视为事件流程结算中心
- 把 [`RunState`](src/types/run.ts:56) 视为当前唯一可信的运行态契约
- 不要为了后续阶段需求破坏现有分层与主链路
- 在进入 Stage3 及以后阶段时，沿着当前骨架渐进扩展，而不是重写一套并行系统
