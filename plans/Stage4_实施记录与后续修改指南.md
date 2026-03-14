# Stage4 实施记录与后续修改指南

## 1. 文档目的

本文档用于沉淀 Stage4「战斗接线与最小可玩闭环」阶段已经完成的实际更新内容，并为后续维护者提供统一的修改入口与风险提示。

它不是对 Stage3 规格的重复摘抄，而是补充说明：

- Stage4 已经真正接通了哪些链路
- 当前实现如何承接 Stage0-Stage3 的既有结构
- 战斗从事件进入、结算奖励、再返回地图的闭环是如何落地的
- 后续如果继续扩战斗 UI、目标选择、失败处理或地图流程，应该优先改哪些位置
- 当前有哪些刻意简化点，不应误判为已经完成

对应参考：

- [`plans/Stage3_实施记录与后续修改指南.md`](plans/Stage3_实施记录与后续修改指南.md)
- [`plans/Stage3_实施规格说明.md`](plans/Stage3_实施规格说明.md)
- [`plans/Stage2_实施记录与后续修改指南.md`](plans/Stage2_实施记录与后续修改指南.md)

---

## 2. Stage4 目标与本次完成范围

### 2.1 Stage4 目标回顾

Stage3 完成的是“战斗纯逻辑内核”，但玩家仍无法在正式单局流程中进入战斗、进行最小操作并把结果回写到地图。

Stage4 的核心目标，是把已有的战斗内核接入 Stage2 的 run 流程与页面切换中，形成一条可以实际运行的最小闭环：

`event -> pending encounter -> battle -> reward apply -> map`

本阶段重点不是扩规则深度，而是把已经存在的规则内核接到正式流程上，并确保回写结果可见、可验证、可维护。

### 2.2 本次实际完成范围

本次 Stage4 已实际完成的范围包括：

- 在 [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts:141) 中新增战斗遭遇初始化、自动推进到玩家决策点、玩家出手提交、战斗结束回写地图等流程装配逻辑
- 在 [`src/app/App.tsx`](src/app/App.tsx:18) 中把 [`BattleScreen`](src/screens/battle/BattleScreen.tsx:41) 接入正式 screen 分发
- 在 [`src/screens/battle/BattleScreen.tsx`](src/screens/battle/BattleScreen.tsx:41) 中实现最小战斗页，用于展示敌我状态、日志与行动按钮
- 在 [`src/types/run.ts`](src/types/run.ts:39) 中扩展 [`RunScreen`](src/types/run.ts:39)、[`RunEncounterState`](src/types/run.ts:41)、[`RunBattlePresentation`](src/types/run.ts:49) 与 [`RunPresentationState`](src/types/run.ts:57)，让 run state 可以承载战斗上下文
- 在 [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts:121) 中把事件选项里的 `unlock-battle` 结果继续写入 [`pendingEncounter`](src/types/run.ts:60)，作为战斗入口桥接
- 在 [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts:47) 既有能力基础上，由 Stage4 流程层正式消费战斗奖励回写结果
- 在 [`src/tests/run/stage4BattleSmokeTest.ts`](src/tests/run/stage4BattleSmokeTest.ts:19) 中补充 Stage4 冒烟测试，覆盖“事件触发战斗、进入 battle screen、自动推进、胜利回写地图奖励”的最小验收链路

### 2.3 明确不属于本次完成范围的内容

以下内容不要误判为 Stage4 已完成：

- 完整的战斗交互界面、美术布局、动效与演出
- 玩家自由选择任意目标、切换技能目标、查看完整技能说明的正式战斗 UX
- 战斗失败后的结算页、专门结果页或失败分支流程
- 多战斗节点串联、章节化战斗配置、精英/Boss 特殊 UI
- 背包、道具、撤退、等待、自动战斗等完整指令系统
- Stage5 及以后才应扩展的地图随机性、内容池丰富度与更复杂节点结构

因此，Stage4 当前完成的是“战斗已正式接入单局流程”，不是“战斗系统表现层完全体”。

---

## 3. 与 Stage0-Stage3 的衔接关系

### 3.1 与 Stage0 的关系

Stage0 主要解决项目可运行、可构建、可本地打开的问题。Stage4 没有改动这些基础设施，但继续建立在既有 Vite + React 运行壳层上。

对于维护者来说，这意味着：

- Stage4 文档只描述战斗接线，不重新定义工程启动方式
- 若页面表现异常，仍应先确认 Stage0/基础壳层是否正常工作

### 3.2 与 Stage1 的关系

Stage1 提供了类型系统、静态模板与基础数据契约。Stage4 没有发明第二套战斗或 run 数据格式，而是继续消费 Stage1/Stage2 已存在的数据源：

- 战斗模板仍来自 [`BATTLE_TEMPLATES`](src/app/store/gameStore.ts:80)
- 敌人模板仍来自 [`ENEMY_TEMPLATES`](src/app/store/gameStore.ts:96)
- 技能模板仍来自 [`SKILL_TEMPLATES`](src/app/store/gameStore.ts:134)

如果后续要扩可用战斗、敌人或技能，优先改模板层与类型层，不要在页面或 store 中硬编码第二套静态数据。

### 3.3 与 Stage2 的关系

Stage2 已经建立 `map -> event -> resolveNode -> map` 的单局主流程骨架。Stage4 对它的关键扩展，不是替换，而是在事件结算后增加“挂起战斗遭遇”的中间态：

- [`resolveNode()`](src/domain/run/resolveNode.ts:79) 在遇到 `unlock-battle` 时记录 [`pendingEncounter`](src/domain/run/resolveNode.ts:182)
- [`openCurrentNode()`](src/app/store/gameStore.ts:275) 发现挂起的是战斗而不是普通事件时，会初始化 [`battleContext`](src/app/store/gameStore.ts:299)
- 战斗结束后再回到 [`activeScreen: 'map'`](src/app/store/gameStore.ts:197)，并更新节点结果、资源与队伍状态

也就是说，Stage4 是在 Stage2 主流程骨架中插入一个战斗分支闭环，而不是另起一套流程控制器。

### 3.4 与 Stage3 的关系

Stage3 提供的是可复用的战斗规则内核，Stage4 负责把它接到流程层：

- [`createBattleState()`](src/app/store/gameStore.ts:152) 负责初始化战斗状态
- [`resolveTurn()`](src/app/store/gameStore.ts:131) / [`resolveTurn()`](src/app/store/gameStore.ts:356) 负责敌我出手推进
- [`applyResourceRewards()`](src/app/store/gameStore.ts:172) 负责将胜利奖励和幸存者状态回写到队伍

后续维护必须保持这个分层：

1. 规则仍放在 [`src/domain/battle`](src/domain/battle)
2. run 流程桥接仍放在 [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts:208)
3. 展示逻辑仍放在 [`src/screens/battle/BattleScreen.tsx`](src/screens/battle/BattleScreen.tsx:41)

不要把战斗规则反向塞进 UI 或 store。

---

## 4. 本次关键实现点

### 4.1 在 run state 中补齐战斗展示态与上下文

Stage2 的 [`RunState`](src/types/run.ts:67) 只覆盖地图、事件、招募等最小流程。Stage4 为了让正式流程能承载一场正在进行的战斗，扩展了以下契约：

- [`RunScreen`](src/types/run.ts:39) 新增 `battle`
- [`RunEncounterState`](src/types/run.ts:41) 可记录 `battleId`
- [`RunBattlePresentation`](src/types/run.ts:49) 用于承载当前战斗状态、等待输入单位与目标选择上下文
- [`RunPresentationState.battleContext`](src/types/run.ts:64) 作为 battle screen 的唯一展示入口
- [`ResolvedNodeResult.battleResult`](src/types/run.ts:30) 用于把节点战斗结果沉淀进已完成节点记录

这样设计的意义是：

- 地图流程与战斗流程仍共享同一个 [`RunState`](src/types/run.ts:67)
- 战斗不是游离于单局流程外的临时页面，而是 run 的正式一部分
- 存档、恢复、地图结果提示都能继续围绕同一份 run state 演进

### 4.2 事件结算后不直接开战，而是先挂起遭遇

[`resolveNode()`](src/domain/run/resolveNode.ts:79) 在处理事件选项效果时，并不会自己初始化战斗，而是只记录 `pendingBattleId`，最终写入 [`pendingEncounter`](src/domain/run/resolveNode.ts:182)。

这样做的好处有两个：

- 领域层事件结算仍保持纯粹，只表达“本节点触发了一个待进入战斗”
- 真正的战斗初始化时机交给 store 的 [`openCurrentNode()`](src/app/store/gameStore.ts:275)，避免在领域层混入 UI/页面切换决策

维护时要注意：

- 如果以后新增更多遭遇类型，优先沿用 `pendingEncounter` 这层桥接
- 不要让 [`resolveNode()`](src/domain/run/resolveNode.ts:79) 直接依赖页面或 store

### 4.3 战斗初始化由 store 统一装配

Stage4 没有把敌人查找、随机源装配、奖励配置散落在多个地方，而是集中放在 [`createBattleEncounter()`](src/app/store/gameStore.ts:141) 中。

它当前负责：

- 根据 `battleId` 查找战斗模板与敌人模板
- 基于当前队伍与敌人调用 [`createBattleState()`](src/app/store/gameStore.ts:152)
- 传入确定性随机源 [`createDeterministicRandom()`](src/app/store/gameStore.ts:65)
- 组装 `rewardConfig` 与 `metadata`
- 通过 [`advanceBattleToDecision()`](src/app/store/gameStore.ts:113) 把战斗推进到“需要玩家输入”或“战斗已结束”的状态

后续如果要接入：

- `realmGap` 的正式来源
- Boss 特殊元数据
- 不同章节的奖励修正
- seed 驱动的战斗扰动

都应优先扩这里，不要在按钮点击或页面组件里拼装 battle state。

### 4.4 敌方自动推进、我方停在决策点

[`advanceBattleToDecision()`](src/app/store/gameStore.ts:113) 是 Stage4 的关键桥接函数。

它的职责是：

- 读取当前可行动单位 [`getNextReadyUnitId()`](src/app/store/gameStore.ts:105)
- 如果轮到敌方，则直接调用 [`resolveTurn()`](src/app/store/gameStore.ts:131) 自动推进
- 如果轮到我方，则返回 `player-input`，把控制权交给页面
- 如果战斗已结束，则返回 `battle-ended`

这样设计后，页面层就不需要理解完整 ATB 推进逻辑；页面只处理“当前轮到哪个玩家单位出手”。

这也是 Stage4 最重要的分层收益之一：

- 战斗规则仍然由规则层决定
- 流程推进由 store 串联
- 页面只消费结果与发出指令

### 4.5 玩家指令提交后，继续自动推进到下一个决策点或结算结束

[`submitBattleAction()`](src/app/store/gameStore.ts:349) 当前完成以下闭环：

1. 校验当前是否存在合法的 [`battleContext`](src/app/store/gameStore.ts:351)
2. 用玩家提交的 `attack` / `skill` / `guard` 指令调用 [`resolveTurn()`](src/app/store/gameStore.ts:356)
3. 再次调用 [`advanceBattleToDecision()`](src/app/store/gameStore.ts:363)，让敌方连续自动行动直到下一次轮到玩家
4. 如果战斗结束，则交给 [`finishBattle()`](src/app/store/gameStore.ts:171) 做统一回写
5. 如果未结束，则刷新 [`battleContext.awaitingUnitId`](src/app/store/gameStore.ts:392)，留在 battle screen 等待下一次输入

后续若要新增玩家交互能力，例如：

- 选择具体技能目标
- 预览多目标命中范围
- 等待/撤退/道具指令

都应从 [`BattleCommand`](src/app/store/gameStore.ts:11) 与 [`submitBattleAction()`](src/app/store/gameStore.ts:349) 入口向下扩展，而不是让 [`BattleScreen`](src/screens/battle/BattleScreen.tsx:41) 直接改 battle state。

### 4.6 战斗结束后的统一回写

[`finishBattle()`](src/app/store/gameStore.ts:171) 是 Stage4 在流程层最需要稳定维护的函数之一。

它当前负责：

- 调用 [`applyResourceRewards()`](src/app/store/gameStore.ts:172) 统一回写战斗奖励与幸存者 HP/SP
- 更新 [`run.leader`](src/app/store/gameStore.ts:180) 与 [`run.party`](src/app/store/gameStore.ts:181)
- 将战斗奖励累加到 [`run.resources`](src/app/store/gameStore.ts:182)
- 将 [`battleState.result`](src/app/store/gameStore.ts:190) 写回对应节点结果
- 清空 [`pendingEncounter`](src/app/store/gameStore.ts:198) 与 [`battleContext`](src/app/store/gameStore.ts:199)
- 把 [`activeScreen`](src/app/store/gameStore.ts:197) 切回地图
- 写入地图结果提示 [`resultMessage`](src/app/store/gameStore.ts:200)

这意味着后续无论要加：

- 战斗失败惩罚
- 额外掉落
- 结果页跳转
- 节点摘要增强

都应优先从 [`finishBattle()`](src/app/store/gameStore.ts:171) 入手，因为这里是 battle -> map 的唯一可信出口。

---

## 5. 涉及文件与各自职责

### 5.1 [`src/types/run.ts`](src/types/run.ts)

负责：

- 扩展单局流程中的战斗展示态契约
- 定义 `battle` screen、待处理遭遇与战斗上下文结构
- 为地图页、战斗页、store 与存档提供统一运行态接口

后续修改注意：

- 若要扩战斗页面选择态，优先加在 [`RunBattlePresentation`](src/types/run.ts:49)
- 不要把仅页面临时需要、且可由现有 battle state 推导的字段无限堆在 [`RunState`](src/types/run.ts:67)

### 5.2 [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts)

负责：

- 继续承担事件选项的结构化结算
- 将 `unlock-battle` 结果转换为待处理战斗遭遇
- 保持节点推进、节点完成记录与结果消息更新

后续修改注意：

- 事件层只负责“触发什么”，不要在这里正式开战
- 若新增事件效果类型，优先继续保持 effects -> run state 的结构化转换方式

### 5.3 [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts)

负责：

- 管理 screen 与 run 的正式应用状态
- 承接战斗初始化、自动推进、玩家提交指令与战斗结束回写
- 继续统一触发 [`saveRun()`](src/app/store/gameStore.ts:223) 自动存档

这是 Stage4 最核心的装配层文件。

后续修改注意：

- 可以继续扩流程控制，但不要把公式、伤害、状态细节写回 store
- 如果 battle screen 出现流程异常，优先从这里排查，而不是先改页面

### 5.4 [`src/screens/battle/BattleScreen.tsx`](src/screens/battle/BattleScreen.tsx)

负责：

- 展示战斗标题、战场信息、敌我单位状态、最近日志
- 根据当前行动者渲染最小行动按钮
- 为技能计算默认目标预览，并把用户操作回传给 store

后续修改注意：

- 这里目前是最小可玩验证页，不是最终 UI 方案
- 页面负责“展示与提交命令”，不要在这里直接执行战斗规则
- 若要扩更复杂交互，应先确认 [`BattleCommand`](src/app/store/gameStore.ts:11) 与 [`RunBattlePresentation`](src/types/run.ts:49) 是否足够承载

### 5.5 [`src/app/App.tsx`](src/app/App.tsx)

负责：

- 将 `battle` 纳入应用级 screen 分发
- 让战斗页与地图页、事件页、招募页共存于同一装配壳层

后续修改注意：

- 如果未来增加结果页、营地页等新 screen，继续在这里做统一分发
- 不要让下层 screen 自己决定全局路由结构

### 5.6 [`src/tests/run/stage4BattleSmokeTest.ts`](src/tests/run/stage4BattleSmokeTest.ts)

负责：

- 用最小脚本验证 Stage4 主闭环已接通
- 重点覆盖“事件触发战斗 -> 进入 battle screen -> 战斗结束 -> 回地图并回写奖励”

后续修改注意：

- 只要调整 battle -> map 关键流程，就应同步更新此测试
- 若出现看似 UI 问题但本质是流程断裂，此测试通常能较早暴露问题

---

## 6. 核心流程说明（event -> battle -> reward -> map）

下面按维护者视角说明当前正式链路。

### 6.1 event：事件阶段先结算，再挂起战斗

当玩家在事件页选择选项后：

- store 调用 [`chooseEvent()`](src/app/store/gameStore.ts:331)
- 它进一步调用 [`resolveNode()`](src/domain/run/resolveNode.ts:79)
- 如果选项效果中包含 `unlock-battle`，则在 [`pendingEncounter`](src/domain/run/resolveNode.ts:182) 中记录 `battleId`
- 同时节点会标记为已完成，并把结果摘要写入 [`completedNodeResults`](src/domain/run/resolveNode.ts:171)

当前设计口径是：节点的事件后果先被确认，战斗作为该节点的后续遭遇继续处理。

### 6.2 battle：从地图打开挂起遭遇并初始化战斗

地图页点击“进入节点”后：

- store 调用 [`openCurrentNode()`](src/app/store/gameStore.ts:275)
- 如果当前 [`pendingEncounter`](src/app/store/gameStore.ts:277) 挂的是 `battleId`，则调用 [`createBattleEncounter()`](src/app/store/gameStore.ts:141)
- [`createBattleState()`](src/app/store/gameStore.ts:152) 会根据当前队伍与敌人模板生成正式 [`BattleState`](src/types/battle.ts:234)
- [`advanceBattleToDecision()`](src/app/store/gameStore.ts:113) 会让敌方自动推进，直到轮到我方或战斗结束
- 随后 [`battleContext`](src/app/store/gameStore.ts:299) 被写入 [`RunPresentationState`](src/types/run.ts:57)，并切到 `battle` screen

### 6.3 reward：战斗结束后统一应用奖励与幸存者状态

玩家每次在战斗页提交动作后：

- [`submitBattleAction()`](src/app/store/gameStore.ts:349) 调用 [`resolveTurn()`](src/app/store/gameStore.ts:356)
- 然后继续自动推进到下一个玩家决策点或战斗结束
- 一旦结束，统一进入 [`finishBattle()`](src/app/store/gameStore.ts:171)
- [`applyResourceRewards()`](src/app/store/gameStore.ts:172) 根据 [`battleState.result.reward`](src/types/battle.ts:167) 回写幸存者生命、SP 与资源奖励

这一步的关键价值是：战斗层产出 reward payload，run 层只消费，不重复解释战斗细节。

### 6.4 map：清理战斗上下文并返回地图主流程

[`finishBattle()`](src/app/store/gameStore.ts:171) 最终会：

- 清空 [`pendingEncounter`](src/app/store/gameStore.ts:198)
- 清空 [`battleContext`](src/app/store/gameStore.ts:199)
- 把 [`activeScreen`](src/app/store/gameStore.ts:197) 切回 `map`
- 把战斗结果写入节点摘要与 [`resultMessage`](src/app/store/gameStore.ts:200)

因此，地图页上的资源变化、队伍 HP/SP 变化、节点摘要变化，都是 battle -> map 回写的最终可见结果。

---

## 7. 已知限制 / 当前刻意简化点

### 7.1 玩家目标选择仍是默认策略，不是完整交互

[`BattleScreen`](src/screens/battle/BattleScreen.tsx:19) 目前会根据技能类型自动挑选第一批合法目标：

- 单体敌方技能默认取第一个敌人
- 全体技能直接取所有合法单位
- 防御默认作用于自身

这足以验证闭环，但不等于正式目标选择系统已经完成。

### 7.2 战斗页只展示最近日志与核心状态

当前页面展示重点是可验证而非完整表现：

- 只展示敌我基础信息、状态、行动次数
- 日志只截取最近 10 条 [`logs.slice(-10)`](src/screens/battle/BattleScreen.tsx:60)
- 没有时间轴、ATB 条、伤害飘字、技能说明面板

### 7.3 战斗失败处理仍是最小版本

[`finishBattle()`](src/app/store/gameStore.ts:176) 当前区分了胜利与失败文本，但失败后仍然是“返回地图并同步状态”的最小处理。

这表示：

- 失败惩罚、跑团终止、专门结算页等都还没做
- 后续要扩失败分支时，应首先重审 battle result 与 run 主流程的关系

### 7.4 `realmGap` 目前仍为固定值

[`createBattleEncounter()`](src/app/store/gameStore.ts:157) 当前把 `realmGap` 固定传为 `0`。

这说明 Stage3 的阶段压制规则已经可用，但 Stage4 还没有把章节、敌人层级或节点配置正式映射到该参数。

### 7.5 战斗随机源为 store 内部确定性实现

[`createDeterministicRandom()`](src/app/store/gameStore.ts:65) 当前使用 `runSeed + battleId` 生成可复现随机源，足够支撑当前验证与复测。

但它仍是 Stage4 的工程型方案，不等于最终随机体系已经定稿。

### 7.6 `createRun()` 的快照版本信息尚未升级为 Stage4

[`createRun()`](src/domain/run/createRun.ts:39) / [`createRun()`](src/domain/run/createRun.ts:40) 仍写着 `stage2` 与 `0.2.0-stage2`。

这说明当前正式闭环已包含 Stage4 能力，但运行快照元信息尚未跟随升级。该点本身不影响现有战斗接线工作，但属于后续可整理的一处元数据遗留项。

---

## 8. 后续修改建议与风险提示

### 8.1 想扩战斗交互，优先从命令契约入手

如果要支持：

- 手动选目标
- 技能二次确认
- 道具/撤退/等待
- 更复杂的玩家战斗面板

建议修改顺序：

1. 先扩 [`BattleCommand`](src/app/store/gameStore.ts:11)
2. 再扩 [`RunBattlePresentation`](src/types/run.ts:49)
3. 再改 [`submitBattleAction()`](src/app/store/gameStore.ts:349)
4. 最后改 [`BattleScreen`](src/screens/battle/BattleScreen.tsx:41)

不要先在 UI 上硬写按钮状态，再逼 store 兼容。

### 8.2 想改战斗入口，优先守住 pendingEncounter 这一层

如果以后要接：

- 连续战斗
- 精英/首领特殊开场
- 事件后多选一遭遇
- 招募与战斗混合节点

建议继续通过 [`pendingEncounter`](src/types/run.ts:60) 做桥接，而不是让 [`resolveNode()`](src/domain/run/resolveNode.ts:79) 直接打开 battle screen。

这是当前 run 领域层与应用装配层之间最重要的解耦点之一。

### 8.3 想改奖励回写，优先守住 battle reward payload 单向流

当前正确方向是：

- 战斗规则层产出 [`BattleRewardPayload`](src/types/battle.ts:143)
- 流程层消费该 payload 并通过 [`applyResourceRewards()`](src/app/store/gameStore.ts:172) 回写 run

不要在 store 或页面里再次根据日志、敌人数或文本描述“猜测奖励”，否则很容易与规则层口径分叉。

### 8.4 想补结果页或失败分支，优先检查 map 返回时机

当前 battle -> map 的唯一出口是 [`finishBattle()`](src/app/store/gameStore.ts:171)。

如果未来要新增：

- 战斗结算页
- 失败弹窗
- 奖励确认页

最容易出问题的地方是：

- 过早清空 [`battleContext`](src/app/store/gameStore.ts:199)
- 在未写回 [`completedNodeResults`](src/app/store/gameStore.ts:186) 前先跳页面
- 忘记同步 [`pendingEncounter`](src/app/store/gameStore.ts:198)

因此任何新增结果页的改动，都应先把 battle -> result -> map 的状态机画清楚再动手。

### 8.5 不要在页面层重复推导战斗规则

[`BattleScreen`](src/screens/battle/BattleScreen.tsx:41) 目前只读取 battle state 展示结果。如果后续为了“显示方便”在页面里自行推导：

- 额外可行动单位
- 额外伤害预测
- 目标合法性

必须确认这些推导只是展示辅助，而不是替代规则判断。真正可执行与否，仍应由 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 所消费的状态与命令决定。

---

## 9. 验证方式

### 9.1 代码级验证

Stage4 当前最直接的验证入口是 [`src/tests/run/stage4BattleSmokeTest.ts`](src/tests/run/stage4BattleSmokeTest.ts:19)。

该测试会验证：

- 经过第二个节点事件后，是否正确挂起 `battle-gate-ambush`
- 打开节点后是否切换到 `battle` screen
- 是否创建了对应 [`battleState`](src/tests/run/stage4BattleSmokeTest.ts:35)
- 是否成功停在玩家可决策单位
- 连续提交攻击后，战斗结束是否返回地图
- [`pendingEncounter`](src/tests/run/stage4BattleSmokeTest.ts:46) 是否被清空
- 节点结果中是否写入 [`battleResult`](src/tests/run/stage4BattleSmokeTest.ts:47)
- 资源是否成功增加

### 9.2 手动验证建议

维护时可按以下路径手动检查：

1. 启动项目并进入新 run
2. 在第一节点完成普通事件
3. 在第二节点选择会触发战斗的选项
4. 返回地图后点击进入节点
5. 确认是否切入 [`BattleScreen`](src/screens/battle/BattleScreen.tsx:41)
6. 连续执行普攻/技能/防御，确认敌方会自动推进
7. 战斗结束后确认是否回到地图
8. 检查地图资源、队伍 HP/SP、结果消息与节点摘要是否同步变化

### 9.3 回归关注点

只要修改以下模块，就建议至少重新验证一次 Stage4 冒烟链路：

- [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts:208)
- [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts:79)
- [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts:47)
- [`src/domain/battle/createBattleState.ts`](src/domain/battle/createBattleState.ts:219)
- [`src/domain/battle/resolveTurn.ts`](src/domain/battle/resolveTurn.ts:41)
- [`src/screens/battle/BattleScreen.tsx`](src/screens/battle/BattleScreen.tsx:41)

---

## 10. 维护结论

Stage4 已经把 Stage3 的战斗纯逻辑内核，正式接入了 Stage2 的单局主流程中，形成了可运行、可回写、可验证的最小战斗闭环。

当前后续维护的正确方向应当是：

- 继续把战斗规则留在 [`src/domain/battle`](src/domain/battle)
- 继续把流程编排集中在 [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts:208)
- 继续把展示增强放在 [`src/screens/battle/BattleScreen.tsx`](src/screens/battle/BattleScreen.tsx:41)
- 继续通过 [`pendingEncounter`](src/types/run.ts:60) 与 [`battleContext`](src/types/run.ts:64) 维持 event / battle / map 的解耦

只要保持这几个边界，后续无论扩战斗 UX、失败分支、奖励层还是地图战斗混合节点，都可以在当前 Stage4 基础上继续稳定演进。
