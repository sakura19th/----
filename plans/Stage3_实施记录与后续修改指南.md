# Stage3 实施记录与后续修改指南

## 1. 文档目的

本文档用于沉淀 Stage3「战斗纯逻辑内核」阶段已经完成的实际更新内容，并为后续继续修改提供统一参考。

它不是对 [`plans/Stage3_实施规格说明.md`](plans/Stage3_实施规格说明.md) 的重复摘抄，而是补充说明：

- Stage3 已经实际落地了哪些规则能力
- 本次新增或修改的关键文件分别承担什么职责
- 当前实现如何承接 Stage2 的单局主流程骨架
- 后续进入 Stage4 接线时，哪些口径必须继续保持一致
- 后续维护或扩展战斗规则时，哪些地方不要轻易改动

对应参考：

- [`plans/Stage2_实施记录与后续修改指南.md`](plans/Stage2_实施记录与后续修改指南.md)
- [`plans/Stage3_实施规格说明.md`](plans/Stage3_实施规格说明.md)
- [`数值验算/数值公式v1.1.md`](数值验算/数值公式v1.1.md)

---

## 2. Stage3 目标与本次完成边界

### 2.1 Stage3 目标回顾

Stage3 的核心目标不是先补战斗页面，而是先把规则层算通、算稳、算可复现。

本阶段已经围绕以下目标完成落地：

- 建立正式战斗运行态与战斗契约，供后续页面或流程层直接消费
- 建立统一属性导出与伤害、治疗、护盾公式实现
- 建立 ATB 行动条推进、SP/Burst 资源循环与基础行动解析
- 建立阶段压制、Boss 人数补偿、护盾规则与状态处理
- 建立可复现的敌人 AI 决策器
- 建立战斗结束后的奖励载荷输出，并与 Stage2 奖励应用器闭环衔接
- 用公式测试 + 战斗规则测试覆盖关键口径

### 2.2 本次实际完成范围

本次 Stage3 已实际完成的范围包括：

- 在 [`src/domain/battle/createBattleState.ts`](src/domain/battle/createBattleState.ts:219) 中建立正式战斗初始化器
- 在 [`src/domain/formulas/damage.ts`](src/domain/formulas/damage.ts)、[`src/domain/formulas/heal.ts`](src/domain/formulas/heal.ts)、[`src/domain/formulas/shield.ts`](src/domain/formulas/shield.ts) 中实现公式层
- 在 [`src/domain/battle/atb.ts`](src/domain/battle/atb.ts:1) 中实现 ATB 软上限、行动阈值与推进逻辑
- 在 [`src/domain/battle/stageRules.ts`](src/domain/battle/stageRules.ts:3) 中实现阶段压制预设与正负差换算
- 在 [`src/domain/battle/bossCompensation.ts`](src/domain/battle/bossCompensation.ts:13) 中实现 Boss 人数补偿
- 在 [`src/domain/battle/shields.ts`](src/domain/battle/shields.ts:53) 中实现护盾覆盖、排序、层数上限、吸收与自身行动衰减
- 在 [`src/domain/battle/applyStatusEffects.ts`](src/domain/battle/applyStatusEffects.ts:34) 中实现中毒、破甲、充能、眩晕等状态附加与生命周期处理
- 在 [`src/domain/battle/enemyAi.ts`](src/domain/battle/enemyAi.ts:76) 中实现敌方基础决策器
- 在 [`src/domain/battle/resolveTurn.ts`](src/domain/battle/resolveTurn.ts:41) 中实现回合解析、日志输出、胜负判定与奖励载荷生成
- 在 [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts:47) 中补齐战斗奖励与幸存者状态回写闭环
- 在 [`src/tests/formulas/stage3FormulaTests.ts`](src/tests/formulas/stage3FormulaTests.ts:16)、[`src/tests/battle/stage3BattleRuleTests.ts`](src/tests/battle/stage3BattleRuleTests.ts:130)、[`src/tests/runStage3Tests.ts`](src/tests/runStage3Tests.ts:1) 中补齐 Stage3 自动化验证入口

### 2.3 明确不属于本次完成范围的内容

以下内容不要误判为 Stage3 已完成：

- [`src/screens/battle`](src/screens/battle) 下的正式战斗页面与交互 UI
- 玩家手动选技、目标指向、行动条展示与日志面板表现层
- 战斗入口正式接入 [`src/domain/run/resolveNode.ts`](src/domain/run/resolveNode.ts:79) 或 [`src/app/store/gameStore.ts`](src/app/store/gameStore.ts:41)
- 战斗失败/胜利后的结果页与完整整局闭环展示
- AI 生成战斗文本、敌人行为脚本或技能描述
- 数值平衡重构、章节化参数池、召唤物玩法扩展

因此，Stage3 当前完成的是“战斗规则内核闭环”，不是“战斗玩法展示闭环”。

---

## 3. 本次已完成内容概览

### 3.1 战斗契约与初始化已落地

[`createBattleState()`](src/domain/battle/createBattleState.ts:219) 已将 Stage1/Stage2 的模板与实例数据转换成统一的 [`BattleState`](src/domain/battle/createBattleState.ts:219) 运行态，主要完成了：

- 从角色/敌人模板导出战斗派生属性
- 初始化单位 HP、SP、Gauge、Burst、护盾、状态与运行标记
- 根据 [`realmGap`](src/domain/battle/createBattleState.ts:251) 生成双向阶段压制乘区
- 初始化战斗日志、阵营汇总、奖励配置与结果壳层
- 记录缺失属性映射与规则绑定 gaps，便于后续补数值或补模板

### 3.2 公式层已独立成可复用纯函数

Stage3 已将伤害、治疗、护盾公式独立放在 [`src/domain/formulas`](src/domain/formulas) 下，供 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41)、[`applyStatusEffect()`](src/domain/battle/applyStatusEffects.ts:34) 等规则函数复用。

当前口径已覆盖：

- 命中率上下限
- 暴击率与暴伤倍率
- 减防后最终伤害乘算与保底 1 点伤害
- 治疗向下取整与有效治疗限制
- 护盾与治疗共享 `heal_shield` 乘区

### 3.3 战斗推进主链路已形成

[`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 已承担 Stage3 的核心推进职责，当前已经打通：

- 行动者校验与默认动作选择
- SP 不足时技能回退到普攻
- 普攻 / 技能 / 防御三类动作解析
- 命中、暴击、伤害、治疗、护盾、状态应用结算
- 行动后 SP 回复、Burst 变化、状态后处理
- 击杀判定、战斗结束判定、奖励载荷生成
- 结构化战斗日志持续写入

### 3.4 支撑规则模块已闭环

为了支撑主回合解析，本次还完成了这些独立规则模块：

- [`src/domain/battle/atb.ts`](src/domain/battle/atb.ts:1)：ATB 软上限与行动准备计算
- [`src/domain/battle/stageRules.ts`](src/domain/battle/stageRules.ts:3)：阶段压制预设、映射与净乘积口径
- [`src/domain/battle/bossCompensation.ts`](src/domain/battle/bossCompensation.ts:13)：Boss 人数补偿
- [`src/domain/battle/shields.ts`](src/domain/battle/shields.ts:53)：护盾统一管理
- [`src/domain/battle/applyStatusEffects.ts`](src/domain/battle/applyStatusEffects.ts:34)：状态附加与触发
- [`src/domain/battle/enemyAi.ts`](src/domain/battle/enemyAi.ts:76)：敌方自动出手策略

### 3.5 奖励载荷与 Stage2 已接成闭环

[`resolveTurn()`](src/domain/battle/resolveTurn.ts:198) 会在战斗结束且胜方为我方时生成 [`BattleRewardPayload`](src/domain/battle/resolveTurn.ts:198)；[`applyResourceRewards()`](src/domain/reward/applyRewards.ts:47) 会再把：

- 幸存者的 HP / SP / 生存状态
- 战斗掉落的碎晶与补给

回写到 Stage2 所使用的队伍数据结构中。

这意味着 Stage3 虽然尚未接入正式 UI，但规则层已经具备被 Stage4 直接接线的最小闭环能力。

---

## 4. 关键文件与职责说明

### 4.1 公式层

#### [`src/domain/formulas/damage.ts`](src/domain/formulas/damage.ts)

负责：

- 命中率计算
- 暴击率计算
- 暴击倍率计算
- 伤害减防与最终伤害计算

后续修改注意：

- 这是所有直接伤害与部分状态伤害的统一口径来源
- 不要在 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 或 [`applyStatusEffects.ts`](src/domain/battle/applyStatusEffects.ts:1) 中复制一份私有伤害公式
- 若要调整命中、暴击、保底伤害规则，优先改这里并同步补测试

#### [`src/domain/formulas/heal.ts`](src/domain/formulas/heal.ts)

负责：

- 计算理论治疗量
- 计算受缺失生命限制后的有效治疗量

后续修改注意：

- 所有治疗动作应统一复用这里
- 不要在技能分支里手写额外治疗取整逻辑

#### [`src/domain/formulas/shield.ts`](src/domain/formulas/shield.ts)

负责：

- 护盾值公式
- 护盾相关常量，例如默认持续自身行动次数、最小值、最大层数

后续修改注意：

- 护盾数值公式与护盾生命周期管理是两层职责
- 改公式看这里，改层数/覆盖/吸收规则看 [`src/domain/battle/shields.ts`](src/domain/battle/shields.ts:53)

### 4.2 战斗规则层

#### [`src/domain/battle/createBattleState.ts`](src/domain/battle/createBattleState.ts:219)

负责：

- 从队伍成员与敌人模板构造战斗运行态
- 导出战斗派生属性
- 设置阶段压制、初始日志、奖励配置与初始结果
- 为后续战斗推进提供唯一可信初始化入口

后续修改注意：

- 这是 Stage4 接战斗页前最重要的初始化入口
- 不要重新发明第二套 battle state 组装逻辑
- 若扩展战斗运行态字段，应先在这里补齐初始化默认值

#### [`src/domain/battle/atb.ts`](src/domain/battle/atb.ts:1)

负责：

- 定义初始 Gauge、阈值、速度软上限与折算斜率
- 计算有效速度与单 tick Gauge 增长
- 计算行动次数与余量

后续修改注意：

- 速度软上限、阈值与斜率属于全局口径
- 不要在 UI 或 AI 层自己推导一套近似 ATB 规则

#### [`src/domain/battle/stageRules.ts`](src/domain/battle/stageRules.ts:3)

负责：

- 定义 R0~R3 阶段压制预设
- 将 [`realmGap`](src/domain/battle/stageRules.ts:34) 映射到预设
- 处理负向差值时的 damage / taken / control / heal_shield 反向换算

后续修改注意：

- 这是 Stage3 数值口径里最容易被误改的文件之一
- 当前实现明确保留“正负阶段差净乘积对称”的现状，不要自行重构成别的模型

#### [`src/domain/battle/bossCompensation.ts`](src/domain/battle/bossCompensation.ts:13)

负责：

- 根据敌我人数差计算 Boss 的 HP、状态抗性与行动条补偿

后续修改注意：

- 这是独立补偿规则，不应散落在 Boss 模板或 AI 分支里重复实现
- 若要扩补偿项目，应继续保持集中在本模块

#### [`src/domain/battle/shields.ts`](src/domain/battle/shields.ts:53)

负责：

- 新护盾接入时的清洗、同源覆盖与排序
- 异源护盾最大 3 层限制
- 伤害进入 HP 前的逐层吸收
- 自身行动后的持续次数递减与过期清理

后续修改注意：

- 护盾规则是统一底层设施，不能由单个技能分支私自绕过
- 若未来要支持特殊护盾，也应先判断是否需要扩 [`BattleShield`](src/domain/battle/shields.ts:1) 契约，而不是直接硬编码

#### [`src/domain/battle/applyStatusEffects.ts`](src/domain/battle/applyStatusEffects.ts:34)

负责：

- 状态命中率计算
- 状态结构构造、合并与刷新
- 中毒在 `turn-start` 触发
- 充能在 `after-action` 到期
- 眩晕对 `canAct` / `isStunned` 标记的同步
- 护盾型状态的统一接线

后续修改注意：

- 这里承担“状态层”统一入口，不要把状态逻辑继续塞回 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41)
- 新增状态优先扩状态映射、生命周期与处理阶段，不要在技能效果里临时写 if-else

#### [`src/domain/battle/enemyAi.ts`](src/domain/battle/enemyAi.ts:76)

负责：

- 根据敌人模板特征、标签、当前 HP 比例与 SP 可用性决定行动
- 区分 Boss、前排、防御型与一般敌人的基础策略
- 输出可直接交给 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 的结构化动作

后续修改注意：

- 当前 AI 是规则模板驱动，不是脚本系统，也不是生成式 AI
- 若要增强复杂度，建议继续扩“规则式决策”，不要让 AI 直接改 battle state

#### [`src/domain/battle/resolveTurn.ts`](src/domain/battle/resolveTurn.ts:41)

负责：

- 串起回合结算主链路
- 调用公式层、状态层、护盾层、敌人 AI
- 生成结构化日志
- 判定战斗结束并生成奖励载荷

后续修改注意：

- 这是 Stage3 最核心文件
- 所有行为分支最终都应回到这里完成统一结算
- 不要让页面层、store 层或事件层直接拼装伤害/治疗结果

### 4.3 奖励与测试层

#### [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts:47)

负责：

- 把战斗幸存者快照回写到队伍成员 HP / SP
- 合并事件奖励与战斗奖励中的 shards / supply

后续修改注意：

- Stage2 与 Stage3 的奖励闭环目前主要依赖这里
- 若未来接入战斗节点，不要绕过这里直接手改队伍数值

#### [`src/tests/formulas/stage3FormulaTests.ts`](src/tests/formulas/stage3FormulaTests.ts:16)

负责公式层边界验证。

#### [`src/tests/battle/stage3BattleRuleTests.ts`](src/tests/battle/stage3BattleRuleTests.ts:130)

负责战斗规则层核心回归验证。

#### [`src/tests/runStage3Tests.ts`](src/tests/runStage3Tests.ts:1)

负责作为 Stage3 测试聚合入口，统一触发公式与战斗规则测试。

---

## 5. 核心规则实现口径摘要

### 5.1 战斗初始化与属性导出

当前 [`createBattleState()`](src/domain/battle/createBattleState.ts:219) 的口径是：

- 所有单位统一导出战斗派生属性，不区分角色和敌人两套公式
- 初始 Gauge 固定为 `0`，Burst 固定为 `0`
- 角色和敌人都保留运行态护盾、状态、行动能力、统计信息
- 敌方 [`realmTier`](src/domain/battle/createBattleState.ts:235) 直接取 [`realmGap`](src/domain/battle/createBattleState.ts:251) 的绝对值，用于阶段差表达
- 若模板缺少 Stage3 所需属性，会记录在 gaps，而不是静默吞掉

### 5.2 ATB 与资源循环

当前实现口径：

- ATB 行动阈值固定为 `1000`，见 [`ATB_THRESHOLD`](src/domain/battle/atb.ts:2)
- 初始行动条固定为 `0`，见 [`ATB_INITIAL_GAUGE`](src/domain/battle/atb.ts:1)
- 速度软上限固定为 `220`，超过部分按 `0.5` 斜率折算，见 [`calculateEffectiveSpeed()`](src/domain/battle/atb.ts:24)
- `GaugeBonus` 会乘到行动条增长上，用于 Boss 等补偿扩展，见 [`calculateGaugeGain()`](src/domain/battle/atb.ts:30)
- 技能 SP 不足时会 fallback 为普攻，见 [`resolveActionOption()`](src/domain/battle/resolveTurn.ts:138)
- 每次行动结束后都会按派生属性回复 SP，相关派生值在 [`deriveCombatStats()`](src/domain/battle/createBattleState.ts:51) 中生成
- Burst 增减是独立资源轨，记录在 [`resolveTurn.ts`](src/domain/battle/resolveTurn.ts:27) 的统一常量口径中

### 5.3 阶段压制口径

当前实现明确遵循：

- 只使用 R0~R3 四档预设，见 [`STAGE_PRESETS`](src/domain/battle/stageRules.ts:3)
- 正向阶段差直接取预设；负向阶段差按 damage/taken、control_out/control_in 互换，且 `heal_shield` 取倒数，见 [`resolveStageScale()`](src/domain/battle/stageRules.ts:44)
- 测试已明确锁定“按绝对阶段差对称”的净乘积现状，见 [`runStage3BattleRuleTests()`](src/tests/battle/stage3BattleRuleTests.ts:130)

这意味着后续如要改阶段压制，不只是调常量，还会影响：

- 直接伤害
- 状态命中
- 治疗/护盾
- 测试基线

### 5.4 护盾口径

当前实现统一遵循：

- 同 `sourceId` 护盾会覆盖旧层，见 [`applyShield()`](src/domain/battle/shields.ts:53)
- 异源护盾最多同时保留 3 层
- 护盾按 `value` 从大到小排序，超出上限时裁掉较小层
- 护盾在“自身行动后”递减持续次数，见 [`tickShieldsAfterSelfAction()`](src/domain/battle/shields.ts:72)
- 受到伤害时先逐层吸收，再结转剩余伤害到 HP，见 [`absorbDamageByShields()`](src/domain/battle/shields.ts:81)

### 5.5 状态处理口径

当前已明确支持并在测试中覆盖的关键状态包括：

- `poisoned`：在 `turn-start` 触发伤害，见 [`applyPoisonTick()`](src/domain/battle/applyStatusEffects.ts:209)
- `vulnerable` / `broken`：统一映射到破甲类脆弱状态，见 [`normalizeStatusKey()`](src/domain/battle/applyStatusEffects.ts:81)
- `stunned`：同步更新不可行动标记，见 [`syncFlags()`](src/domain/battle/applyStatusEffects.ts:200)
- `charged` / `focused`：归入充能类，在 `after-action` 生命周期处理

状态命中口径为：

- 以技能 `baseChance` 为基础
- 综合攻击方 [`AACC`](src/domain/battle/createBattleState.ts:65)、防守方 [`ARES`](src/domain/battle/createBattleState.ts:66)
- 再乘以阶段压制中的 `control_out` 与 `control_in`
- 最终夹到 `5% ~ 85%`，见 [`calculateStatusChance()`](src/domain/battle/applyStatusEffects.ts:122)

### 5.6 敌人 AI 口径

当前 [`decideEnemyAction()`](src/domain/battle/enemyAi.ts:76) 的规则式优先级大致为：

- Boss 优先 AOE / 控制 / 进攻压制
- 前排模板低血量优先护盾或防御
- 精英/Boss 模板会优先治疗残血友军或打控制
- 血线过低时偏防守
- SP 不足时回退普攻

这套 AI 的定位是“稳定、可测、可扩展的模板决策器”，不是最终复杂脚本系统。

### 5.7 奖励载荷口径

当前战斗结束后：

- 只有我方胜利才会生成奖励载荷，见 [`buildReward()`](src/domain/battle/resolveTurn.ts:198)
- 奖励中包含 shards、supply、survivors、defeatedEnemyIds 与 extra
- [`applyResourceRewards()`](src/domain/reward/applyRewards.ts:47) 会先用 survivors 回写队伍存活态，再叠加资源收益

这就是 Stage4 把战斗结果写回 run state 时应继续沿用的标准接口。

---

## 6. 测试覆盖说明

### 6.1 本次采用的验证方式

本次 Stage3 采用的验证主要包括：

1. 公式层单元验证
   - 入口见 [`src/tests/formulas/stage3FormulaTests.ts`](src/tests/formulas/stage3FormulaTests.ts:16)
2. 战斗规则层回归验证
   - 入口见 [`src/tests/battle/stage3BattleRuleTests.ts`](src/tests/battle/stage3BattleRuleTests.ts:130)
3. 测试聚合入口
   - 见 [`src/tests/runStage3Tests.ts`](src/tests/runStage3Tests.ts:1)

### 6.2 公式测试当前覆盖点

[`runStage3FormulaTests()`](src/tests/formulas/stage3FormulaTests.ts:16) 当前至少覆盖：

- 命中率 72% 下限与 98% 上限
- 暴击率 95% 上限与 0 下限
- `CDMG = 150 => 1.5x` 暴伤倍率口径
- 伤害先乘后取整
- 减防不足时仍保底 1 点伤害
- 治疗向下取整与有效治疗上限
- 护盾共享治疗乘区且结果最小为 0

### 6.3 战斗规则测试当前覆盖点

[`runStage3BattleRuleTests()`](src/tests/battle/stage3BattleRuleTests.ts:130) 当前至少覆盖：

- 阶段压制预设映射与正负差换算
- ATB 软上限、行动阈值与 GaugeBonus 影响
- Boss 人数补偿公式
- 同源护盾覆盖、异源 3 层上限、护盾吸收与过期清理
- 中毒、破甲、眩晕、充能等状态附加与生命周期
- 防御动作日志写入
- SP 不足时技能 fallback 到普攻
- 固定随机源下整场战斗结果可复现
- 战斗日志包含 action-start、hit-check、battle-end 等关键类型
- 战斗结束时可生成奖励载荷
- 奖励应用器能消费战斗奖励并保持队伍结构稳定
- 敌人 AI 返回合法动作

### 6.4 当前测试口径上的限制

需要明确：

- 当前测试主要证明“规则层可运行且关键口径被锁住”
- 还没有浏览器端战斗交互 E2E
- 还没有 Stage2 地图节点 -> 战斗 -> 回地图 的整链路自动化测试
- 还没有覆盖所有技能模板与所有敌人组合
- 还没有做大规模数值平衡测试

因此，当前可认定的结论是“Stage3 规则内核闭环已建立”，而不是“战斗系统所有边界都已完全稳定”。

---

## 7. 与 Stage2 / Stage4 的衔接说明

### 7.1 与 Stage2 的衔接

Stage2 提供的是正式单局主流程骨架，Stage3 提供的是可接入的战斗规则内核。当前衔接关系应理解为：

- Stage2 的 [`createRun()`](src/domain/run/createRun.ts:31) 继续负责正式 run 初始化
- Stage2 的 [`resolveNode()`](src/domain/run/resolveNode.ts:79) 目前仍是事件节点解析核心
- Stage3 的 [`createBattleState()`](src/domain/battle/createBattleState.ts:219) 是正式战斗初始化入口
- Stage3 的 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 是正式战斗推进入口
- Stage3 的 [`applyResourceRewards()`](src/domain/reward/applyRewards.ts:47) 是战斗结果回写入口

因此后续接战斗节点时，推荐方向是：

1. 由 Stage2 流程层触发战斗
2. 用 [`createBattleState()`](src/domain/battle/createBattleState.ts:219) 生成 battle state
3. 由 Stage4 页面/交互层驱动 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41)
4. 战斗结束后用 [`applyResourceRewards()`](src/domain/reward/applyRewards.ts:47) 回写 run state

### 7.2 与 Stage4 的衔接

Stage4 不应重新定义战斗规则，而应直接消费 Stage3 已定好的接口与数据：

- 页面要展示的单位状态，应来自 [`BattleState`](src/domain/battle/createBattleState.ts:219)
- 页面要展示的日志，应来自 [`state.logs`](src/domain/battle/resolveTurn.ts:89) 已写入的结构化日志
- 玩家行动应组织成 [`ResolveTurnInput`](src/domain/battle/resolveTurn.ts:41) 兼容的动作数据
- 战斗结束后的奖励与幸存者数据，应直接消费 [`BattleRewardPayload`](src/domain/battle/resolveTurn.ts:198)

不要在 Stage4：

- 重算伤害、治疗、状态、护盾结果
- 自己推导一套日志文本结构
- 绕开 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 直接改单位 HP / SP / 状态

---

## 8. 后续修改时必须注意的约束、风险点与不要轻易改动的地方

### 8.1 不要破坏“公式层 -> 规则层 -> 流程层/UI”单向依赖

继续保持：

- [`src/domain/formulas`](src/domain/formulas) 只提供基础数值公式
- [`src/domain/battle`](src/domain/battle) 负责规则组合与运行态推进
- [`src/domain/run`](src/domain/run) / [`src/app`](src/app) 负责流程装配
- [`src/screens`](src/screens) 只负责展示与交互

不要把：

- 公式散落回 [`resolveTurn.ts`](src/domain/battle/resolveTurn.ts:1)
- 战斗结算搬到页面组件里
- 页面临时状态塞回领域规则层

### 8.2 不要轻易改动的核心口径

以下内容一旦修改，会影响大量联动逻辑与测试，必须谨慎：

- [`ATB_THRESHOLD`](src/domain/battle/atb.ts:2)、[`ATB_SOFT_CAP`](src/domain/battle/atb.ts:3)、[`ATB_SOFT_CAP_SLOPE`](src/domain/battle/atb.ts:4)
- [`STAGE_PRESETS`](src/domain/battle/stageRules.ts:3) 的全部常量
- 护盾同源覆盖 + 异源最多 3 层的规则，见 [`applyShield()`](src/domain/battle/shields.ts:53)
- 状态命中率夹值 `5% ~ 85%`，见 [`STATUS_CHANCE_MIN`](src/domain/battle/applyStatusEffects.ts:18) 与 [`STATUS_CHANCE_MAX`](src/domain/battle/applyStatusEffects.ts:19)
- Burst 资源变化口径，见 [`BURST_GAIN`](src/domain/battle/resolveTurn.ts:27)
- 胜利奖励的标准结构，见 [`buildReward()`](src/domain/battle/resolveTurn.ts:198)

### 8.3 当前实现中的风险点

当前维护时要特别注意这些风险：

- [`createBattleState()`](src/domain/battle/createBattleState.ts:219) 中存在若干旧模板属性到 Stage3 属性的 fallback 映射；若直接删掉，可能导致旧数据无法进入战斗
- [`applyResourceRewards()`](src/domain/reward/applyRewards.ts:21) 通过 `templateId` 映射幸存者；若未来出现同模板多实例队伍，需要优先评估是否改为 `unitId` / `sourceInstanceId` 级映射
- [`decideEnemyAction()`](src/domain/battle/enemyAi.ts:76) 目前依赖技能 tags、模板类别与少量命名约定；扩模板时如果 tags 不规范，会直接影响 AI 行为
- [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 已承担较多职责；后续若新增大量新效果，需防止该文件继续失控膨胀
- 状态与护盾都依赖结构化 metadata；随意改字段名会影响现有效果结算

### 8.4 不要错误清理的内容

后续整理代码时，不要误删以下资产：

- [`src/tests/formulas/stage3FormulaTests.ts`](src/tests/formulas/stage3FormulaTests.ts:16)
- [`src/tests/battle/stage3BattleRuleTests.ts`](src/tests/battle/stage3BattleRuleTests.ts:130)
- [`src/tests/runStage3Tests.ts`](src/tests/runStage3Tests.ts:1)
- [`src/domain/battle/stageRules.ts`](src/domain/battle/stageRules.ts:3)
- [`src/domain/battle/bossCompensation.ts`](src/domain/battle/bossCompensation.ts:13)

这些文件虽然不直接产出 UI，但它们是当前 Stage3 规则真实性与可维护性的关键锚点。

---

## 9. 建议修改入口与推荐修改顺序

### 9.1 如果要新增或调整数值公式

推荐顺序：

1. 先改 [`src/domain/formulas/damage.ts`](src/domain/formulas/damage.ts) / [`src/domain/formulas/heal.ts`](src/domain/formulas/heal.ts) / [`src/domain/formulas/shield.ts`](src/domain/formulas/shield.ts)
2. 再检查 [`src/domain/battle/resolveTurn.ts`](src/domain/battle/resolveTurn.ts:41) 与 [`src/domain/battle/applyStatusEffects.ts`](src/domain/battle/applyStatusEffects.ts:34) 的调用是否仍匹配
3. 最后补或更新 [`src/tests/formulas/stage3FormulaTests.ts`](src/tests/formulas/stage3FormulaTests.ts:16) 与 [`src/tests/battle/stage3BattleRuleTests.ts`](src/tests/battle/stage3BattleRuleTests.ts:130)

### 9.2 如果要新增状态类型

推荐顺序：

1. 先扩状态契约与技能效果定义（必要时看 [`src/types`](src/types)）
2. 再改 [`normalizeStatusKey()`](src/domain/battle/applyStatusEffects.ts:81)、[`mapStatusKind()`](src/domain/battle/applyStatusEffects.ts:93)、[`getStatusTiming()`](src/domain/battle/applyStatusEffects.ts:110)
3. 再补具体触发/过期逻辑
4. 再让 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 或技能模板接入该状态
5. 最后补测试

### 9.3 如果要新增护盾或防御类机制

推荐顺序：

1. 先确认是“公式变化”还是“生命周期变化”
2. 公式变化改 [`src/domain/formulas/shield.ts`](src/domain/formulas/shield.ts)
3. 生命周期/覆盖/层数变化改 [`src/domain/battle/shields.ts`](src/domain/battle/shields.ts:53)
4. 再检查 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 与状态处理是否需要联动
5. 最后补测试

### 9.4 如果要扩敌人 AI

推荐顺序：

1. 先补技能 tags 或敌人模板特征
2. 再扩 [`src/domain/battle/enemyAi.ts`](src/domain/battle/enemyAi.ts:76) 的决策优先级
3. 避免直接在 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 里增加敌人特判
4. 最后补 AI 回归用例

### 9.5 如果要接入 Stage4 战斗页面

推荐顺序：

1. 先确认 UI 直接消费 [`BattleState`](src/domain/battle/createBattleState.ts:219)
2. 再在流程层接入 [`createBattleState()`](src/domain/battle/createBattleState.ts:219)
3. 页面交互只负责产出 action 输入，交给 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41)
4. 战斗结束后统一走 [`applyResourceRewards()`](src/domain/reward/applyRewards.ts:47)
5. 最后再补页面展示与手工回归

---

## 10. 简明判断标准

后续准备改 Stage3 相关内容时，可以先用下面这组判断：

1. 这是公式问题吗？
   - 是：先看 [`src/domain/formulas`](src/domain/formulas)
2. 这是战斗运行态初始化问题吗？
   - 是：先看 [`src/domain/battle/createBattleState.ts`](src/domain/battle/createBattleState.ts:219)
3. 这是行动、伤害、治疗、日志或胜负结算问题吗？
   - 是：先看 [`src/domain/battle/resolveTurn.ts`](src/domain/battle/resolveTurn.ts:41)
4. 这是状态生命周期问题吗？
   - 是：先看 [`src/domain/battle/applyStatusEffects.ts`](src/domain/battle/applyStatusEffects.ts:34)
5. 这是护盾叠加/吸收问题吗？
   - 是：先看 [`src/domain/battle/shields.ts`](src/domain/battle/shields.ts:53)
6. 这是敌人出手异常吗？
   - 是：先看 [`src/domain/battle/enemyAi.ts`](src/domain/battle/enemyAi.ts:76)
7. 这是战斗结果回写 run 的问题吗？
   - 是：先看 [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts:47)
8. 这次修改是不是把 Stage4 的页面逻辑倒灌回规则层了？
   - 如果是，应先停下来重新分层

---

## 11. 最终结论

Stage3 当前已经完成的不是“战斗页面”，而是“战斗规则内核”。

当前代码库已经具备：

- 正式战斗状态初始化入口
- 稳定可复用的公式层
- 可推进的回合解析与日志结构
- 阶段压制、Boss 补偿、护盾与状态规则
- 可复现的敌人 AI 决策
- 可回写 Stage2 队伍数据的奖励载荷闭环
- 覆盖关键规则口径的自动化测试

以后继续修改时，最重要的是：

- 继续承接 [`BattleState`](src/domain/battle/createBattleState.ts:219) 与 [`resolveTurn()`](src/domain/battle/resolveTurn.ts:41) 作为唯一可信规则入口
- 不要在 UI、事件层或模板层重写战斗结算
- 先维护公式与规则一致性，再做 Stage4 接线与表现扩展
