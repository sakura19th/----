# Stage 3 实施规格说明

## 1. 文档目的

本文档用于细化 [`plans/MVP_videcoding_实施计划.md`](plans/MVP_videcoding_实施计划.md) 中 Stage 3“战斗纯逻辑内核”的实现要求，作为后续在 [`src/domain`](src/domain) 与 [`src/tests`](src/tests) 内推进编码、测试与验收的直接依据。

本文档默认前提：

- 严格承接 Stage 2 已完成的单局主流程骨架
- 本阶段只实现战斗规则闭环，不接入战斗页面交互
- 所有涉及数值、公式、阈值、乘区、上下限、计算顺序的内容，均以 [`数值验算/数值公式v1.1.md`](数值验算/数值公式v1.1.md) 为唯一依据
- 本阶段目标是形成可纯函数运行、可测试、可日志回放、可被 Stage 4 直接接线的战斗规则内核

---

## 2. 阶段目标

Stage 3 的目标不是先把战斗“做出来”，而是先把战斗“算正确”。

本阶段必须交付：

- 可稳定初始化的战斗状态
- 可独立推进的 ATB 行动顺序
- 普攻、技能、防御三类基础行动解析
- 护盾、中毒、破甲、充能、眩晕五种机制的统一状态结算
- 可复现的敌人行为模板
- 可供后续页面直接消费的战斗日志输出结构
- 可回写单局状态的胜负结果与奖励载荷
- 覆盖关键公式与状态流转的自动化测试

本阶段不负责：

- [`src/screens/battle`](src/screens/battle) 内的交互页面实现
- AI 生成战斗内容、敌人行为或技能文本
- 人物驱动反馈、关系值变化与角色语音表现
- 动效、演出、音频与视觉反馈
- 对现有数值模型进行平衡性重构

---

## 3. 实现范围

### 3.1 目录范围

本阶段实现应集中在以下目录：

- [`src/domain/formulas`](src/domain/formulas)
- [`src/domain/battle`](src/domain/battle)
- [`src/domain/reward`](src/domain/reward)
- [`src/tests/formulas`](src/tests/formulas)
- [`src/tests/battle`](src/tests/battle)

### 3.2 模块范围

本阶段优先模块如下：

- [`src/domain/formulas/damage.ts`](src/domain/formulas/damage.ts)
- [`src/domain/formulas/heal.ts`](src/domain/formulas/heal.ts)
- [`src/domain/formulas/shield.ts`](src/domain/formulas/shield.ts)
- [`src/domain/battle/createBattleState.ts`](src/domain/battle/createBattleState.ts)
- [`src/domain/battle/resolveTurn.ts`](src/domain/battle/resolveTurn.ts)
- [`src/domain/battle/applyStatusEffects.ts`](src/domain/battle/applyStatusEffects.ts)
- [`src/domain/battle/enemyAi.ts`](src/domain/battle/enemyAi.ts)
- [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts)

### 3.3 阶段边界

必须坚持：

- 规则实现放在 [`src/domain`](src/domain)
- 测试落在 [`src/tests`](src/tests)
- 页面接线留给 Stage 4
- AI 接口留给 Stage 6
- 人物驱动增强留给 Stage 7

---

## 4. 战斗状态与契约

### 4.1 战斗状态目标

战斗状态必须先定义稳定契约，再进入具体结算实现。

Stage 3 中的 battle state 应满足以下要求：

- 能完整表示一场战斗中的单位状态、资源状态、阶段压制状态、日志状态与战斗结果
- 能被纯函数反复推进，不依赖页面层或外部副作用
- 能在固定输入与固定随机因子下输出稳定一致的结果

### 4.2 单位最小运行态

每个战斗单位至少应包含以下字段：

- 基础标识、模板来源、阵营、站位
- 当前生命、最大生命
- 当前 SP、最大 SP
- 当前 ATB、当前 Burst
- 阶段位阶
- 战斗派生属性：`PATK`、`MATK`、`PDEF`、`MDEF`、`SPD`、`HIT`、`EVA`、`CRIT`、`CDMG`、`AACC`、`ARES`、`HEALP`、`LEAD`
- 护盾列表
- 状态列表
- 技能列表
- 是否可行动、是否被眩晕、是否死亡等运行标记

### 4.3 输入输出边界

本阶段战斗纯函数接口至少应支持以下输入输出：

输入：

- 队伍列表
- 敌人列表
- 技能模板与静态配置
- 阶段位阶或 `realmGap`
- 固定随机因子或可控随机源
- 战斗奖励配置

输出：

- 新的 battle state
- 本次行动或本次推进生成的日志片段
- 是否结束
- 胜负结果
- 奖励载荷
- 可回写 run state 的单位存活与资源状态

### 4.4 日志结构要求

战斗日志必须是规则层直接输出，而不是 UI 层二次推导。

日志至少应覆盖：

- 行动开始
- 行动者与目标
- 命中或未命中
- 暴击或未暴击
- 伤害、治疗、护盾变化
- 状态附加
- 状态触发
- 状态到期
- Burst 变化
- 单位死亡
- 战斗结束

---

## 5. 属性导出与基础公式

### 5.1 基础导出公式

所有单位在进入战斗前，必须先由基础属性导出战斗面板。

正式公式如下：

```text
MaxHP = 100 + STR * 9 + SPI * 5 + Level * 4 + FlatHPBonus

MaxSP = 40 + INT * 4 + SPI * 8 + Level * 2 + FlatSPBonus

PATK = 10 + STR * 2.6 + AGI * 0.7 + Level * 0.5 + WeaponATK + FlatPATKBonus

MATK = 10 + INT * 2.6 + SPI * 0.8 + Level * 0.5 + WeaponMATK + FlatMATKBonus

PDEF = 5 + STR * 1.2 + AGI * 0.5 + Level * 0.3 + ArmorBonus

MDEF = 5 + SPI * 1.6 + INT * 0.6 + Level * 0.3 + ResistBonus

SPD = 80 + AGI * 2.2 + SPI * 0.3 + LUK * 0.2 + SpeedBonus

HIT = 100 + AGI * 1.0 + INT * 0.4 + Level * 0.2 + HitBonus

EVA = AGI * 0.9 + LUK * 0.6 + Level * 0.1 + EvadeBonus

CRIT = 5 + AGI * 0.08 + LUK * 0.18 + CritBonus

CDMG = 150 + STR * 0.12 + INT * 0.12 + LUK * 0.10 + CritDamageBonus

AACC = 100 + INT * 0.8 + SPI * 0.8 + CHA * 0.6 + LUK * 0.2 + StatusHitBonus

ARES = 100 + SPI * 1.2 + CHA * 0.5 + LUK * 0.3 + StatusResistBonus

HEALP = SPI * 1.8 + INT * 0.7 + CHA * 0.7 + HealBonus

LEAD = CHA * 1.8 + SPI * 0.6 + LUK * 0.2 + LeadBonus
```

### 5.2 `LEAD` 导出附加值

战斗中还必须导出以下附加值：

```text
TeamAuraBonus = 1 + min(0.20, LEAD / 1000)

SummonInheritance = 0.5 + min(0.35, LEAD / 1000)

SPRegenPerAction = 4 + SPI * 0.15 + RegenBonus
```

### 5.3 实现要求

必须满足：

- 所有战斗单位统一走同一套属性导出流程
- `TeamAuraBonus` 进入最终乘区，不混入基础面板
- `SummonInheritance` 在本阶段保留为规则接口，不扩展召唤玩法表现
- `SPRegenPerAction` 直接用于每次自身行动后的 SP 回复

---

## 6. ATB 行动顺序与资源循环

### 6.1 ATB 规则

本阶段采用 ATB 行动条。

正式规则如下：

```text
InitialGauge = 0

EffectiveSPD = RawSPD

EffectiveSPD = min(220, RawSPD) + max(0, RawSPD - 220) * 0.5

PerTickGaugeGain = EffectiveSPD * GaugeBonus

当 Gauge >= 1000 时：
  Gauge -= 1000
  获得 1 次行动
```

### 6.2 ATB 实现要求

必须满足：

- 所有单位初始 `Gauge` 固定为 `0`
- 行动阈值固定为 `1000`
- 速度软上限阈值固定为 `220`
- 启用软上限时，`220` 以上速度按 `0.5` 斜率折算
- `GaugeBonus` 作为 ATB 获取速度乘区预留给 Boss 人数补偿等机制

### 6.3 SP 规则

正式规则如下：

```text
行动前判断是否够支付 SkillCost
若足够：先扣除 SkillCost
无论是否成功施放技能，行动结束后：
SP = min(MaxSP, SP + SPRegenPerAction)
```

实现要求：

- SP 回复发生在每次自身行动后
- 即使 `SP = 0`，角色也不会死锁
- 资源不足时，技能选择必须 fallback 到可执行基础行动

### 6.4 Burst 规则

正式规则如下：

```text
basicHit   => +12
skillUse   => +8
takeDamage => +6
kill       => +20
crit       => +6
```

基础变化规则如下：

```text
Burst = min(100, Burst + Gain)
Spend 时：Burst = max(0, Burst - Cost)
```

实现要求：

- Burst 作为独立资源轨，不与 SP 混用
- 每次 Burst 增减都应进入日志
- 本阶段只实现资源变化与判定，不扩展演出表现

---

## 7. 行动解析与结算顺序

### 7.1 基础行动类型

本阶段基础行动至少包含：

- 普攻
- 技能
- 防御

### 7.2 统一结算顺序

行动解析应尽量保持统一流程。

推荐顺序如下：

1. 判定行动者是否可行动
2. 选择行动与目标
3. 判断资源是否足够
4. 若可支付则先扣除 `SkillCost`
5. 进行命中判定
6. 若命中则进入暴击判定
7. 结算伤害、治疗或护盾
8. 结算状态附加与状态触发
9. 结算击杀与 Burst 变化
10. 执行行动后 SP 回复
11. 推进护盾与状态持续计时
12. 写入日志
13. 判定战斗是否结束

### 7.3 防御动作约束

本阶段可保留防御作为基础行动类型之一。

但必须注意：

- 若当前数值文档未对防御动作给出固定减伤系数或其他精确定量规则，则不应在 Stage 3 中擅自发明全局数值常量
- 若需要实现防御动作，应作为行动解析骨架预留，并由后续技能或行为模板参数驱动

---

## 8. 命中、暴击、伤害、治疗与护盾

### 8.1 命中公式

```text
HitChance = clamp(90 + HIT - EVA, 72, 98)
```

实现要求：

- 命中下限固定为 `72%`
- 命中上限固定为 `98%`

### 8.2 暴击公式

```text
CritChance = clamp(CRIT + SkillExtraCrit, 0, 95)

CritDamageMultiplier = (CDMG + SkillExtraCritDamage) / 100

IfCrit = random(0,100) < CritChance

CritMultiplier = IfCrit ? CritDamageMultiplier : 1
```

实现要求：

- 暴击率上限固定为 `95%`
- `CDMG = 150` 表示 `1.5x`
- 技能可附加 `SkillExtraCrit` 与 `SkillExtraCritDamage`

### 8.3 伤害公式

```text
Mitigated = max(0, ATK * SkillRate - DEF)

FinalDamageRaw = Mitigated * RandomFactor * FinalBonus * CritMultiplier * StageDamageMultiplier * StageTakenMultiplier

FinalDamage = floorMin(FinalDamageRaw, 1)
```

字段映射如下：

```text
ATK = PATK 或 MATK，取决于技能 scaling
DEF = PDEF 或 MDEF，取决于技能 damageType
SkillRate = 技能倍率
RandomFactor = 随机波动；公式测试固定为 1，战斗模拟为 0.92 ~ 1.08
FinalBonus = 团队光环等最终乘区
CritMultiplier = 暴击倍率，非暴击为 1
StageDamageMultiplier / StageTakenMultiplier = 阶段压制乘区
```

实现要求：

- 若 `ATK * SkillRate <= DEF`，仍保底造成 `1` 点伤害
- 最终伤害先完成全部乘算，再向下取整
- 公式测试固定 `RandomFactor = 1`
- 战斗模拟使用 `0.92 ~ 1.08`

### 8.4 治疗公式

```text
FinalHeal = max(0, floor(HEALP * SkillRate * FinalBonus * StageHealShieldMultiplier))
```

战斗中的有效治疗量：

```text
ActualHeal = min(TargetMissingHP, FinalHeal)
```

实现要求：

- 治疗结果向下取整
- 治疗结果最小为 `0`

### 8.5 护盾公式

```text
FinalShield = max(0, floor((HEALP * SkillRate + FlatShield) * FinalBonus * StageHealShieldMultiplier))
```

实现要求：

- 护盾与治疗共享 `heal_shield` 阶段乘区
- 护盾结果向下取整
- 护盾结果最小为 `0`

### 8.6 护盾结算规则

必须严格实现以下规则：

```text
1. 同 sourceId 的护盾重复施加时，旧护盾被新护盾覆盖
2. 不同 sourceId 的护盾最多同时保留 3 层
3. 护盾列表按 value 从大到小排序，超出 3 层时移除较小层
4. 护盾按 remainingSelfActions 计时，持续 3 次“自身行动后”
5. 受到伤害时按当前护盾列表顺序逐层吸收
6. value <= 0 或 remainingSelfActions <= 0 的护盾会被移除
```

---

## 9. 阶段压制

### 9.1 固定预设

阶段压制采用以下固定预设：

```text
R0 = {
  damage: 1.00,
  taken: 1.00,
  control_out: 1.00,
  control_in: 1.00,
  heal_shield: 1.00
}

R1 = {
  damage: 1.25,
  taken: 0.80,
  control_out: 0.85,
  control_in: 0.85,
  heal_shield: 1.10
}

R2 = {
  damage: 1.70,
  taken: 0.45,
  control_out: 0.45,
  control_in: 0.35,
  heal_shield: 1.18
}

R3 = {
  damage: 2.40,
  taken: 0.20,
  control_out: 0.10,
  control_in: 0.10,
  heal_shield: 1.25
}
```

### 9.2 换算规则

```text
当 realmGap = 0：直接使用对应档位
当 realmGap > 0：表示施加/攻击方高阶，直接使用对应档位
当 realmGap < 0：
  damage      = preset.taken
  taken       = preset.damage
  control_out = preset.control_in
  control_in  = preset.control_out
  heal_shield = 1 / preset.heal_shield
```

### 9.3 伤害线实现口径

本阶段必须忠实实现当前伤害线，而不是重构为新的方向性模型。

当前净乘积如下：

```text
realmGap = +1 => 1.25 * 0.80 = 1.00
realmGap = +2 => 1.70 * 0.45 = 0.765
realmGap = +3 => 2.40 * 0.20 = 0.48

realmGap = -1 => 0.80 * 1.25 = 1.00
realmGap = -2 => 0.45 * 1.70 = 0.765
realmGap = -3 => 0.20 * 2.40 = 0.48
```

结论：

- 当前伤害线具备双边乘区结构
- 但净乘积按绝对阶段差对称
- 本阶段不改写该规则

---

## 10. 状态机制结算框架

### 10.1 本阶段覆盖的五种机制

Stage 3 只落实以下五种机制：

- 护盾
- 中毒
- 破甲
- 充能
- 眩晕

### 10.2 控制命中公式

```text
StatusChanceRaw = BaseChance * sqrt(max(0.0001, AACC) / max(0.0001, ARES)) * StageControlOutMultiplier * StageControlInMultiplier

StatusChance = clamp(StatusChanceRaw, 5, 85)
```

实现要求：

- 控制成功率最低为 `5%`
- 控制成功率最高为 `85%`

### 10.3 控制阶段压制的正式口径

必须保留当前实现结论：

```text
R1 = 0.85 * 0.85 = 0.7225
R2 = 0.45 * 0.35 = 0.1575
R3 = 0.10 * 0.10 = 0.01
```

结论如下：

- 当前控制阶段压制按绝对阶段差生效
- `realmGap = +2` 与 `realmGap = -2` 的最终阶段乘积一致
- 当前实现并未形成“高阶施控更容易、低阶施控更困难”的方向性差异
- 本阶段不改写该规则

### 10.4 机制落地要求

必须满足：

- 护盾按独立列表结算
- 中毒、破甲、眩晕统一纳入状态列表
- 充能作为状态或资源标记管理
- 状态支持附加、触发、计时、到期移除的统一流程

约束如下：

- 中毒伤害系数不在本阶段发明全局常量
- 破甲比例不在本阶段发明全局常量
- 眩晕持续回合数不在本阶段发明全局常量
- 上述具体参数应由技能或状态模板提供

---

## 11. Boss 人数补偿

### 11.1 正式规则

```text
EnemyCountAdvantage = 敌方人数 - Boss 所在方人数

BossHPBonus = 1 + 0.35 * EnemyCountAdvantage

BossStatusResistBonus = 1 + 0.20 * EnemyCountAdvantage

BossActionGaugeBonus = 1 + 0.15 * EnemyCountAdvantage
```

### 11.2 实现要求

必须满足：

- `BossHPBonus` 进入 Boss 生命侧装配
- `BossStatusResistBonus` 进入 Boss 异常抗性侧装配
- `BossActionGaugeBonus` 直接乘到每 tick 的 `ATB` 获取速度
- 该补偿只适用于 Boss 单位

---

## 12. 敌人行为模板

### 12.1 实现目标

Stage 3 的敌人行为只做模板化决策，不做 AI 生成。

### 12.2 最低要求

必须实现：

- 基于当前生命、当前 SP、可用技能与目标状态选择一个合法动作
- 资源不足时自动 fallback 到普攻或其他基础行动
- 普通敌人、精英敌人、Boss 可使用不同优先级模板
- 行为结果可预测、可复现、可测试

### 12.3 推荐模板维度

可按以下维度设计：

- 优先攻击最低生命目标
- 优先释放满足条件且可支付的技能
- 低生命时优先防御或治疗
- Boss 可附加固定阶段脚本

### 12.4 约束

必须坚持：

- 敌方行为为模板化规则，不得引入 AI provider
- 敌方行为只负责选动作，不得绕过正式结算公式
- 决策逻辑必须 deterministic，或可由固定随机种子完全复现

---

## 13. 胜负判定、奖励与回写

### 13.1 胜负判定

最小闭环规则如下：

- 任一方全部单位死亡时，战斗立即结束
- 结束时输出 battle result
- battle result 必须包含胜负、存活单位、阵亡单位、日志列表、奖励载荷

### 13.2 奖励输出

本阶段奖励结果至少应支持：

- 经验或成长点
- 金币或局内资源
- 掉落条目
- 战斗后单位生命、SP、存活状态的回写信息

### 13.3 与 run state 的衔接

必须满足：

- 本阶段只输出规则层结果对象
- 奖励结果必须可被 [`src/domain/reward/applyRewards.ts`](src/domain/reward/applyRewards.ts) 消费
- 结果结构必须兼容 Stage 2 的单局状态骨架
- 本阶段不负责页面跳转、地图回退与结算页展示

---

## 14. 执行步骤

### 14.1 推荐执行顺序

1. 先定义 battle state 与日志结构
2. 再完成属性导出与公式模块
3. 再完成 ATB 推进与行动顺序
4. 再完成普攻、技能、防御三类行动解析
5. 再完成治疗、护盾与状态机制结算
6. 再完成敌人行为模板
7. 再完成战斗结束判定与奖励结果输出
8. 最后补公式测试、流程测试与边界测试

### 14.2 依赖关系

本阶段依赖以下已完成内容：

- Stage 1 的类型系统与静态数据契约
- Stage 2 的 run state、节点推进与奖励回写骨架

本阶段输出将直接供以下阶段消费：

- Stage 4 的战斗 UI 接线
- Stage 5 的完整战斗节点闭环
- Stage 6 的 AI 文本增强接口
- Stage 7 的人物驱动反馈增强

---

## 15. 测试要求

### 15.1 公式测试

[`src/tests/formulas`](src/tests/formulas) 至少应覆盖：

- 基础属性导出
- `LEAD` 附加值导出
- 命中下限 `72%`
- 命中上限 `98%`
- 暴击上限 `95%`
- 伤害保底 `1`
- 治疗最小值 `0`
- 护盾最小值 `0`
- 护盾同源覆盖
- 异源护盾最多 `3` 层
- ATB 阈值 `1000`
- 速度软上限 `220`
- SP 行动后回复
- Burst 增减规则
- 阶段压制乘区
- Boss 人数补偿

### 15.2 流程测试

[`src/tests/battle`](src/tests/battle) 至少应覆盖：

- 固定队伍对固定敌人的整场纯函数战斗
- 普攻、技能、防御三类行动的完整结算
- 中毒、破甲、护盾、眩晕、充能五种机制的触发与移除
- 资源不足 fallback
- 击杀后胜负判定
- 战斗日志完整性
- 奖励结果输出一致性

### 15.3 边界测试

必须覆盖：

- 极端大数输入仍返回有限数值
- 负值输入可计算、不崩溃
- 长战斗过程下状态推进不丢失
- 固定随机因子下重复运行结果一致

---

## 16. 验收标准

本阶段完成标志如下：

- 给定固定队伍、固定敌人、固定随机因子，可纯函数跑完整场战斗
- 能输出完整日志
- 战斗结果可直接回写 run state
- 关键公式、状态机制、Boss 补偿与奖励结算均有自动化测试覆盖
- Stage 4 可直接接线，不需要重写公式与状态机

---

## 17. 风险与约束

本阶段必须明确以下边界：

- 伤害公式当前采用纯减法防御，先保持样例一致
- 阶段压制当前净乘积按绝对阶段差对称，先保持测试平台一致
- 控制压制当前表现为绝对阶段差惩罚，先保持既有实现一致
- 状态机制具体参数优先由技能模板提供，不额外发明全局通用常量
- 所有涉及数值、公式、阈值、上下限、乘区、计算顺序的实现，必须以 [`数值验算/数值公式v1.1.md`](数值验算/数值公式v1.1.md) 为唯一依据

禁止直接跳到：

- [`src/screens/battle`](src/screens/battle) 的交互细节
- AI 接口与生成逻辑
- 动效与表现层演出
- 人物驱动反馈扩展
- 未经验证的平衡性重构方案

---

## 18. 交付结果口径

当 Stage 3 完成时，后续 Code 模式应能基于以下事实继续推进：

- [`src/domain/formulas`](src/domain/formulas) 已形成可验证公式层
- [`src/domain/battle`](src/domain/battle) 已形成可回放状态机
- [`src/tests/formulas`](src/tests/formulas) 与 [`src/tests/battle`](src/tests/battle) 已形成核心自动化验证
- Stage 4 只需接 UI，不再改写 Stage 3 的规则实现
- Stage 5 可直接在本规则内核上补完整战斗节点闭环