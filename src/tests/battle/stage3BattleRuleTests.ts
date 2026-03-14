import { HERO_ARCHETYPES } from '../../data/archetypes/templates';
import { ENEMY_TEMPLATES } from '../../data/enemies/templates';
import { SKILL_TEMPLATES } from '../../data/skills/templates';
import { advanceAtbGauge, calculateEffectiveSpeed, calculateGaugeGain } from '../../domain/battle/atb';
import { calculateBossCompensation } from '../../domain/battle/bossCompensation';
import { applyStatusEffect, processStatusEffects } from '../../domain/battle/applyStatusEffects';
import { createBattleState } from '../../domain/battle/createBattleState';
import { decideEnemyAction } from '../../domain/battle/enemyAi';
import { resolveTurn } from '../../domain/battle/resolveTurn';
import { applyShield, absorbDamageByShields, cleanupShields, tickShieldsAfterSelfAction } from '../../domain/battle/shields';
import { getStageControlNetMultiplier, getStageDamageNetMultiplier, resolveStageScale, toStagePresetKey } from '../../domain/battle/stageRules';
import { applyResourceRewards } from '../../domain/reward/applyRewards';
import type { BattleRandomSource, BattleShield, PartyMember } from '../../types';

function invariant(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function createShield(partial: Partial<BattleShield> & Pick<BattleShield, 'id' | 'sourceId' | 'sourceUnitId' | 'name' | 'value' | 'createdAtTurn'>): BattleShield {
  return {
    remainingSelfActions: 3,
    metadata: undefined,
    ...partial,
  };
}

function createDeterministicRandom(values: readonly number[]): BattleRandomSource {
  let index = 0;
  const nextValue = () => {
    const value = values[index % values.length] ?? 0.5;
    index += 1;
    return value;
  };

  return {
    next() {
      return nextValue();
    },
    nextInRange(min: number, max: number) {
      return min + (max - min) * nextValue();
    },
    factor() {
      return nextValue();
    },
  };
}

function createParty(): readonly PartyMember[] {
  return HERO_ARCHETYPES.map((hero, index) => ({
    ...hero,
    instanceId: `party-${hero.identity.id}-${index}`,
    progression: {
      level: 1,
      xp: 0,
      growthBias: { value: 'attack', weight: 1 },
    },
    currentRelationToLeader: 'support',
    activeStatusEffects: [],
  }));
}

function createBattle(randomValues: readonly number[], enemyIds: readonly string[]) {
  return createBattleState({
    battleId: 'stage3-loop-test',
    seed: 'seed-stage3',
    party: createParty(),
    enemies: ENEMY_TEMPLATES.filter((enemy) => enemyIds.includes(enemy.identity.id)),
    skillTemplates: SKILL_TEMPLATES,
    random: createDeterministicRandom(randomValues),
    realmGap: 0,
    rewardConfig: {
      baseShards: 21,
      bonusSupply: 3,
    },
    metadata: { source: 'test' },
  });
}

function runBattleToEnd(randomValues: readonly number[]) {
  const skillMap = new Map(SKILL_TEMPLATES.map((skill) => [skill.id, skill]));
  let state = createBattle(randomValues, ['enemy-dust-raider', 'enemy-iron-sentinel']);
  const actionPlan = [
    { actorIndex: 0, action: { actionType: 'skill' as const, skillId: 'skill-rally-standard' } },
    { actorIndex: 1, action: { actionType: 'guard' as const } },
    { actorIndex: 2, action: { actionType: 'skill' as const, skillId: 'skill-ether-bolt' } },
    { actorIndex: 0, action: { actionType: 'attack' as const } },
    { actorIndex: 1, action: { actionType: 'skill' as const, skillId: 'skill-field-treatment', targetUnitIds: [state.party.unitIds[0]] } },
    { actorIndex: 2, action: { actionType: 'attack' as const } },
  ];

  let step = 0;
  while (!state.result.finished && step < 20) {
    const partyActorId = state.party.unitIds[step % state.party.unitIds.length];
    const enemyActorId = state.enemy.unitIds[step % state.enemy.unitIds.length];
    const partyPlan = actionPlan[step % actionPlan.length];

    const partyActor = state.units.find((unit) => unit.unitId === partyActorId);
    if (partyActor && !partyActor.isDead) {
      state = resolveTurn({
        state,
        actorUnitId: partyActor.unitId,
        skillTemplates: SKILL_TEMPLATES,
        action: partyPlan.action,
      }).state;
    }

    if (state.result.finished) {
      break;
    }

    const enemyActor = state.units.find((unit) => unit.unitId === enemyActorId);
    if (enemyActor && !enemyActor.isDead) {
      const decision = decideEnemyAction({ state, actorUnitId: enemyActor.unitId, skillMap });
      state = resolveTurn({
        state,
        actorUnitId: enemyActor.unitId,
        skillTemplates: SKILL_TEMPLATES,
        action: decision,
      }).state;
    }

    step += 1;
  }

  return state;
}

export function runStage3BattleRuleTests() {
  invariant(toStagePresetKey(0) === 'R0', 'realmGap=0 应映射到 R0');
  invariant(toStagePresetKey(5) === 'R3', 'realmGap 超过 3 应封顶到 R3');

  const plusTwo = resolveStageScale(2);
  invariant(plusTwo.damage === 1.7 && plusTwo.taken === 0.45, '正向阶段压制应直接取预设');

  const minusTwo = resolveStageScale(-2);
  invariant(minusTwo.damage === 0.45, '负向阶段压制 damage 应取 taken');
  invariant(minusTwo.taken === 1.7, '负向阶段压制 taken 应取 damage');
  invariant(minusTwo.control_out === 0.35, '负向阶段压制 control_out 应取 control_in');
  invariant(minusTwo.heal_shield === 1 / 1.18, '负向阶段压制 heal_shield 应取倒数');
  invariant(getStageDamageNetMultiplier(2) === getStageDamageNetMultiplier(-2), '伤害阶段净乘积应按绝对阶段差对称');
  invariant(getStageControlNetMultiplier(2) === getStageControlNetMultiplier(-2), '控制阶段净乘积应按绝对阶段差对称');

  invariant(calculateEffectiveSpeed(180) === 180, '软上限以下有效速度不变');
  invariant(calculateEffectiveSpeed(260) === 240, '220 以上速度应按 0.5 斜率折算');
  invariant(calculateGaugeGain(200, 1.3) === 260, 'GaugeBonus 应乘到 ATB 获取速度');

  const atb = advanceAtbGauge({ rawSpeed: 260, gauge: 900, gaugeBonus: 1 });
  invariant(atb.gaugeAfterTick === 1140, 'ATB 应从 0 阈值线性累积');
  invariant(atb.actionsReady === 1, 'Gauge>=1000 时应获得 1 次行动');
  invariant(atb.gaugeRemainder === 140, '行动后应扣除 1000 保留余量');

  const bossCompensation = calculateBossCompensation({ bossSideCount: 1, enemyCount: 3 });
  invariant(bossCompensation.enemyCountAdvantage === 2, 'Boss 人数补偿应按敌方人数差计算');
  invariant(bossCompensation.hpBonus === 1.7, 'BossHPBonus 应正确计算');
  invariant(bossCompensation.statusResistBonus === 1.4, 'BossStatusResistBonus 应正确计算');
  invariant(bossCompensation.actionGaugeBonus === 1.3, 'BossActionGaugeBonus 应正确计算');

  const sameSource = applyShield({
    shields: [
      createShield({ id: 's1', sourceId: 'skill-a', sourceUnitId: 'u1', name: 'A', value: 40, createdAtTurn: 1 }),
    ],
    newShield: createShield({ id: 's2', sourceId: 'skill-a', sourceUnitId: 'u1', name: 'A2', value: 60, createdAtTurn: 2 }),
  });
  invariant(sameSource.length === 1, '同源护盾应覆盖旧护盾');
  invariant(sameSource[0].id === 's2' && sameSource[0].value === 60, '同源覆盖后应保留新护盾');

  const cappedShields = applyShield({
    shields: [
      createShield({ id: 's1', sourceId: 'a', sourceUnitId: 'u1', name: 'A', value: 40, createdAtTurn: 1 }),
      createShield({ id: 's2', sourceId: 'b', sourceUnitId: 'u1', name: 'B', value: 80, createdAtTurn: 1 }),
      createShield({ id: 's3', sourceId: 'c', sourceUnitId: 'u1', name: 'C', value: 20, createdAtTurn: 1 }),
    ],
    newShield: createShield({ id: 's4', sourceId: 'd', sourceUnitId: 'u1', name: 'D', value: 70, createdAtTurn: 2 }),
  });
  invariant(cappedShields.length === 3, '异源护盾最多保留 3 层');
  invariant(cappedShields.map((shield) => shield.value).join(',') === '80,70,40', '护盾应按 value 从大到小排序并移除较小层');

  const cleaned = cleanupShields([
    createShield({ id: 's1', sourceId: 'a', sourceUnitId: 'u1', name: 'A', value: 0, createdAtTurn: 1 }),
    createShield({ id: 's2', sourceId: 'b', sourceUnitId: 'u1', name: 'B', value: 30, createdAtTurn: 1, remainingSelfActions: 0 }),
    createShield({ id: 's3', sourceId: 'c', sourceUnitId: 'u1', name: 'C', value: 50, createdAtTurn: 1 }),
  ]);
  invariant(cleaned.length === 1 && cleaned[0].id === 's3', 'value<=0 或 remainingSelfActions<=0 的护盾应被移除');

  const ticked = tickShieldsAfterSelfAction([
    createShield({ id: 's1', sourceId: 'a', sourceUnitId: 'u1', name: 'A', value: 40, createdAtTurn: 1, remainingSelfActions: 1 }),
    createShield({ id: 's2', sourceId: 'b', sourceUnitId: 'u1', name: 'B', value: 60, createdAtTurn: 1, remainingSelfActions: 3 }),
  ]);
  invariant(ticked.length === 1 && ticked[0].id === 's2' && ticked[0].remainingSelfActions === 2, '护盾应按自身行动后递减并过滤到期层');

  const absorbed = absorbDamageByShields({
    shields: [
      createShield({ id: 's1', sourceId: 'a', sourceUnitId: 'u1', name: 'A', value: 80, createdAtTurn: 1 }),
      createShield({ id: 's2', sourceId: 'b', sourceUnitId: 'u1', name: 'B', value: 50, createdAtTurn: 1 }),
    ],
    incomingDamage: 100,
  });
  invariant(absorbed.absorbedDamage === 100, '护盾应逐层吸收伤害');
  invariant(absorbed.remainingDamage === 0, '护盾足够时剩余伤害应为 0');
  invariant(absorbed.updatedShields.length === 1, '吸收完归零的护盾应移除');
  invariant(absorbed.updatedShields[0].id === 's2' && absorbed.updatedShields[0].value === 30, '应先消耗排序靠前的高值护盾');

  const statusBattle = createBattle([0.01, 0.01, 0.01, 0.01], ['enemy-dust-raider']);
  const actor = statusBattle.units.find((unit) => unit.side === 'party')!;
  const target = statusBattle.units.find((unit) => unit.side === 'enemy')!;
  const applyPoison = applyStatusEffect({
    state: statusBattle,
    actor,
    target,
    effect: {
      type: 'apply-status',
      statusKey: 'poisoned',
      duration: 2,
      metadata: { baseChance: 100, poisonRatio: 0.3 },
    },
    skillId: 'test-poison',
    actionType: 'skill',
  });
  const poisonedTarget = applyPoison.units.find((unit) => unit.unitId === target.unitId)!;
  invariant(poisonedTarget.statuses.some((status) => status.key === 'poisoned'), '中毒应可附加');
  const poisonTick = processStatusEffects({ state: { ...statusBattle, units: applyPoison.units }, actorUnitId: poisonedTarget.unitId, phase: 'turn-start' });
  const afterPoisonTick = poisonTick.units.find((unit) => unit.unitId === target.unitId)!;
  invariant(afterPoisonTick.currentHp < poisonedTarget.currentHp, '中毒应在 turn-start 触发');

  const applyBreak = applyStatusEffect({
    state: statusBattle,
    actor,
    target,
    effect: {
      type: 'apply-status',
      statusKey: 'vulnerable',
      duration: 1,
      metadata: { baseChance: 100, damageTakenMultiplier: 1.2 },
    },
    skillId: 'test-break',
    actionType: 'skill',
  });
  invariant(applyBreak.units.find((unit) => unit.unitId === target.unitId)!.statuses.some((status) => status.key === 'vulnerable'), '破甲应可附加');

  const applyStun = applyStatusEffect({
    state: statusBattle,
    actor,
    target,
    effect: {
      type: 'apply-status',
      statusKey: 'stunned',
      duration: 1,
      metadata: { baseChance: 100 },
    },
    skillId: 'test-stun',
    actionType: 'skill',
  });
  invariant(applyStun.units.find((unit) => unit.unitId === target.unitId)!.isStunned, '眩晕应更新行动标记');

  const applyCharge = applyStatusEffect({
    state: statusBattle,
    actor,
    target: actor,
    effect: {
      type: 'apply-status',
      statusKey: 'charged',
      duration: 1,
      metadata: { chargeValue: 1 },
    },
    skillId: 'test-charge',
    actionType: 'skill',
  });
  const chargedActor = applyCharge.units.find((unit) => unit.unitId === actor.unitId)!;
  invariant(chargedActor.statuses.some((status) => status.key === 'charged'), '充能应可附加');
  const chargeExpire = processStatusEffects({ state: { ...statusBattle, units: applyCharge.units }, actorUnitId: actor.unitId, phase: 'after-action' });
  invariant(!chargeExpire.units.find((unit) => unit.unitId === actor.unitId)!.statuses.some((status) => status.key === 'charged'), '充能应在 after-action 到期移除');

  const defendTurn = resolveTurn({
    state: createBattle([0.01, 0.01, 0.01, 0.01], ['enemy-dust-raider']),
    actorUnitId: createBattle([0.01, 0.01, 0.01, 0.01], ['enemy-dust-raider']).party.unitIds[0],
    skillTemplates: SKILL_TEMPLATES,
    action: { actionType: 'guard' },
  });
  invariant(defendTurn.logs.some((log) => log.type === 'action-resolution' && log.actionType === 'guard'), '防御应写入日志');

  const fallbackBattle = createBattle([0.01, 0.01, 0.01, 0.01], ['enemy-dust-raider']);
  const lowSpActor = {
    ...fallbackBattle.units.find((unit) => unit.side === 'party')!,
    currentSp: 0,
  };
  const fallbackState = { ...fallbackBattle, units: fallbackBattle.units.map((unit) => (unit.unitId === lowSpActor.unitId ? lowSpActor : unit)) };
  const fallbackTurn = resolveTurn({
    state: fallbackState,
    actorUnitId: lowSpActor.unitId,
    skillTemplates: SKILL_TEMPLATES,
    action: { actionType: 'skill', skillId: 'skill-rally-standard' },
  });
  invariant(fallbackTurn.logs.some((log) => log.type === 'action-start' && log.detail.includes('insufficient-sp-fallback-attack')), '资源不足时应 fallback');

  const battleA = runBattleToEnd([0.03, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85]);
  const battleB = runBattleToEnd([0.03, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85]);
  invariant(JSON.stringify(battleA.result) === JSON.stringify(battleB.result), '固定随机源下战斗结果应可复现');
  invariant(battleA.logs.some((log) => log.type === 'action-start'), '整场战斗应包含行动开始日志');
  invariant(battleA.logs.some((log) => log.type === 'hit-check'), '整场战斗应包含命中日志');
  invariant(battleA.logs.some((log) => log.type === 'battle-end'), '整场战斗应包含结束日志');
  invariant(battleA.result.finished, '整场战斗应能结束');
  invariant(battleA.result.reward !== null, '胜利时应输出奖励载荷');

  const rewardResult = applyResourceRewards(createParty(), { battleReward: battleA.result.reward, shards: 2, supply: 1 });
  invariant(rewardResult.gainedShards >= 2, '奖励应用器应消费战斗奖励 shards');
  invariant(rewardResult.gainedSupply >= 1, '奖励应用器应消费战斗奖励 supply');
  invariant(rewardResult.party.length === createParty().length, '奖励应用后队伍数量应保持一致');

  const enemyDecisionState = createBattle([0.2, 0.2, 0.2], ['enemy-iron-sentinel', 'enemy-boss-shard-tyrant']);
  const enemyDecision = decideEnemyAction({
    state: enemyDecisionState,
    actorUnitId: enemyDecisionState.enemy.unitIds[1],
    skillMap: new Map(SKILL_TEMPLATES.map((skill) => [skill.id, skill])),
  });
  invariant(enemyDecision.actionType === 'skill' || enemyDecision.actionType === 'attack' || enemyDecision.actionType === 'guard', '敌人 AI 应返回合法动作');

  return 'stage3-battle-rule-tests: ok';
}

console.log(runStage3BattleRuleTests());
