import type {
  BattleActionOption,
  BattleActionType,
  BattleLogEntry,
  BattleLogEntryType,
  BattleResult,
  BattleRewardPayload,
  BattleSide,
  BattleState,
  BattleUnitState,
  Identifier,
  SkillEffect,
  SkillTemplate,
} from '../../types';
import {
  calculateCritChance,
  calculateCritMultiplier,
  calculateDamage,
  calculateHitChance,
} from '../formulas/damage';
import { calculateActualHeal, calculateHeal } from '../formulas/heal';
import { calculateShield } from '../formulas/shield';
import { decideEnemyAction } from './enemyAi';
import { applyStatusEffect, processStatusEffects } from './applyStatusEffects';
import { absorbDamageByShields, applyShield, cleanupShields } from './shields';

const BURST_GAIN = {
  basicHit: 12,
  skillUse: 8,
  takeDamage: 6,
  kill: 20,
  crit: 6,
} as const;

type TurnActionInput = {
  actionType?: BattleActionType;
  skillId?: Identifier;
  targetUnitIds?: readonly Identifier[];
};

export type ResolveTurnInput = {
  state: BattleState;
  actorUnitId: Identifier;
  skillTemplates: readonly SkillTemplate[];
  action?: TurnActionInput;
};

export type ResolveTurnResult = {
  state: BattleState;
  logs: readonly BattleLogEntry[];
  finished: boolean;
  outcome: BattleResult['outcome'];
  reward: BattleRewardPayload | null;
};

type PendingLog = {
  type: BattleLogEntryType;
  actorUnitId?: Identifier;
  targetUnitId?: Identifier;
  actionType?: BattleActionType;
  skillId?: Identifier;
  value?: number;
  tags?: readonly string[];
  detail: string;
  payload?: Record<string, unknown>;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function floorFinite(value: number, min = 0) {
  return Math.max(min, Math.floor(Number.isFinite(value) ? value : min));
}

function getUnit(state: BattleState, unitId: Identifier) {
  return state.units.find((unit) => unit.unitId === unitId) ?? null;
}

function replaceUnit(units: readonly BattleUnitState[], nextUnit: BattleUnitState) {
  return units.map((unit) => (unit.unitId === nextUnit.unitId ? nextUnit : unit));
}

function replaceManyUnits(units: readonly BattleUnitState[], nextUnits: readonly BattleUnitState[]) {
  const map = new Map(nextUnits.map((unit) => [unit.unitId, unit]));
  return units.map((unit) => map.get(unit.unitId) ?? unit);
}

function appendLogs(state: BattleState, pendingLogs: readonly PendingLog[]) {
  const start = state.logs.length;
  return pendingLogs.map((log, index) => ({
    id: `${state.id}-log-${start + index + 1}`,
    turn: state.turn,
    tick: state.tick,
    type: log.type,
    actorUnitId: log.actorUnitId,
    targetUnitId: log.targetUnitId,
    actionType: log.actionType,
    skillId: log.skillId,
    value: log.value,
    tags: log.tags,
    detail: log.detail,
    payload: log.payload,
  })) satisfies BattleLogEntry[];
}

function getAllies(state: BattleState, side: BattleSide) {
  return state.units.filter((unit) => unit.side === side && !unit.isDead);
}

function getEnemies(state: BattleState, side: BattleSide) {
  return state.units.filter((unit) => unit.side !== side && !unit.isDead);
}

function getLowestHpUnit(units: readonly BattleUnitState[]) {
  return [...units].sort((left, right) => left.currentHp - right.currentHp || left.index - right.index)[0] ?? null;
}

function chooseDefaultAction(actor: BattleUnitState, state: BattleState, skillMap: ReadonlyMap<Identifier, SkillTemplate>) {
  if (actor.side === 'enemy') {
    return decideEnemyAction({ state, actorUnitId: actor.unitId, skillMap });
  }

  const enemies = getEnemies(state, actor.side);
  return {
    actionType: 'attack' as const,
    targetUnitIds: enemies[0] ? [enemies[0].unitId] : [],
    reason: 'default-party-attack',
  };
}

function getTargetUnits(units: readonly BattleUnitState[], targetUnitIds: readonly Identifier[]) {
  return targetUnitIds
    .map((targetUnitId) => units.find((unit) => unit.unitId === targetUnitId) ?? null)
    .filter((unit): unit is BattleUnitState => Boolean(unit));
}

function resolveActionOption(params: {
  actor: BattleUnitState;
  action: TurnActionInput | undefined;
  state: BattleState;
  skillMap: ReadonlyMap<Identifier, SkillTemplate>;
}) {
  const chosen = params.action ?? chooseDefaultAction(params.actor, params.state, params.skillMap);
  const actionType = chosen.actionType ?? 'attack';
  const skill = chosen.skillId ? params.skillMap.get(chosen.skillId) ?? null : null;

  if (actionType === 'skill' && skill && params.actor.currentSp < skill.cost) {
    const fallbackTarget = getEnemies(params.state, params.actor.side)[0]?.unitId ?? params.actor.unitId;
    return {
      actionType: 'attack' as const,
      skill: null,
      targetUnitIds: [fallbackTarget],
      fallbackReason: 'insufficient-sp-fallback-attack',
    };
  }

  let targetUnitIds = chosen.targetUnitIds ?? [];
  if (targetUnitIds.length === 0) {
    if (actionType === 'guard') {
      targetUnitIds = [params.actor.unitId];
    } else if (skill) {
      switch (skill.target) {
        case 'self':
          targetUnitIds = [params.actor.unitId];
          break;
        case 'ally':
          targetUnitIds = [getLowestHpUnit(getAllies(params.state, params.actor.side))?.unitId ?? params.actor.unitId];
          break;
        case 'all-allies':
          targetUnitIds = getAllies(params.state, params.actor.side).map((unit) => unit.unitId);
          break;
        case 'all-enemies':
          targetUnitIds = getEnemies(params.state, params.actor.side).map((unit) => unit.unitId);
          break;
        case 'enemy':
        default:
          targetUnitIds = [getLowestHpUnit(getEnemies(params.state, params.actor.side))?.unitId ?? params.actor.unitId];
          break;
      }
    } else {
      targetUnitIds = [getLowestHpUnit(getEnemies(params.state, params.actor.side))?.unitId ?? params.actor.unitId];
    }
  }

  return {
    actionType,
    skill,
    targetUnitIds,
    fallbackReason: null,
  };
}

function getStageScale(state: BattleState, actor: BattleUnitState) {
  return actor.side === 'party' ? state.stageModifiers.partyToEnemy : state.stageModifiers.enemyToParty;
}

function buildReward(state: BattleState): BattleRewardPayload | null {
  if (!state.result.finished || state.result.winningSide !== 'party') {
    return null;
  }

  return {
    shards: state.rewardConfig.baseShards,
    supply: state.rewardConfig.bonusSupply,
    experience: 0,
    survivors: state.units
      .filter((unit) => unit.side === 'party')
      .map((unit) => ({
        unitId: unit.unitId,
        sourceInstanceId: unit.sourceInstanceId,
        templateId: unit.templateId,
        hp: unit.currentHp,
        maxHp: unit.maxHp,
        sp: unit.currentSp,
        maxSp: unit.maxSp,
        alive: !unit.isDead,
      })),
    defeatedEnemyIds: state.units.filter((unit) => unit.side === 'enemy' && unit.isDead).map((unit) => unit.templateId),
    extra: state.rewardConfig.extra,
  };
}

function updatePartyState(state: BattleState) {
  const partyAlive = state.units.filter((unit) => unit.side === 'party' && !unit.isDead).length;
  const enemyAlive = state.units.filter((unit) => unit.side === 'enemy' && !unit.isDead).length;
  return {
    ...state,
    party: {
      ...state.party,
      totalAlive: partyAlive,
    },
    enemy: {
      ...state.enemy,
      totalAlive: enemyAlive,
    },
  };
}

function finalizeResult(state: BattleState, pendingLogs: PendingLog[]) {
  const partyAlive = state.units.some((unit) => unit.side === 'party' && !unit.isDead);
  const enemyAlive = state.units.some((unit) => unit.side === 'enemy' && !unit.isDead);
  let result = state.result;

  if (!partyAlive || !enemyAlive) {
    const winningSide = partyAlive ? 'party' : 'enemy';
    const outcome = partyAlive ? 'victory' : 'defeat';
    pendingLogs.push({
      type: 'battle-end',
      detail: `战斗结束，${winningSide} 获胜。`,
      payload: { winningSide, outcome },
    });

    result = {
      finished: true,
      outcome,
      winningSide,
      roundsElapsed: state.turn,
      reward: null,
      survivorSnapshots: state.units.filter((unit) => !unit.isDead).map((unit) => ({
        unitId: unit.unitId,
        name: unit.name,
        side: unit.side,
        hp: unit.currentHp,
        maxHp: unit.maxHp,
        sp: unit.currentSp,
        maxSp: unit.maxSp,
        speed: unit.derived.SPD,
        statuses: unit.statuses.map((status) => String(status.key)),
      })),
      summary: `${winningSide} win`,
    };
  }

  return {
    ...state,
    result,
  };
}

function applyBurst(unit: BattleUnitState, gain: number) {
  return {
    ...unit,
    burst: clamp(unit.burst + gain, 0, 100),
  };
}

function spendSkillCost(actor: BattleUnitState, skill: SkillTemplate | null) {
  if (!skill) {
    return actor;
  }
  return {
    ...actor,
    currentSp: clamp(actor.currentSp - skill.cost, 0, actor.maxSp),
  };
}

// SP 回复机制已移除：技能消耗 SP 是唯一的 SP 变动途径

function createGuardStatus(actor: BattleUnitState, state: BattleState) {
  return {
    id: `${actor.unitId}-guard-${state.turn}-${state.tick}`,
    key: 'guarded' as const,
    name: 'guarded',
    sourceId: 'guard-action',
    sourceUnitId: actor.unitId,
    stacks: 1,
    duration: 1,
    remainingTurns: 1,
    timing: 'passive' as const,
    dispellable: true,
    isControl: false,
    metadata: {
      actionType: 'guard',
      mitigationMultiplier: 0.75,
    },
  };
}

function calculateAttackProfile(effect: SkillEffect | null, actor: BattleUnitState, target: BattleUnitState) {
  const isMagical =
    effect?.damageType === 'magical' ||
    effect?.scalingStat === 'matk' ||
    actor.skillIds.some((skillId) => String(skillId).includes('ether') || String(skillId).includes('starfall'));
  return {
    attack: isMagical ? actor.derived.MATK : actor.derived.PATK,
    defense: isMagical ? target.derived.MDEF : target.derived.PDEF,
    skillRate: effect?.ratio ?? 1,
    extraCrit: effect?.extraCrit ?? 0,
    extraCritDamage: effect?.extraCritDamage ?? 0,
  };
}

function hasStatus(unit: BattleUnitState, key: string) {
  return unit.statuses.some((status) => status.key === key && status.remainingTurns > 0);
}

function applyDamageEffect(params: {
  state: BattleState;
  units: readonly BattleUnitState[];
  actor: BattleUnitState;
  target: BattleUnitState;
  effect: SkillEffect | null;
  actionType: BattleActionType;
  skillId?: Identifier;
  pendingLogs: PendingLog[];
}) {
  const stage = getStageScale(params.state, params.actor);
  const attackProfile = calculateAttackProfile(params.effect, params.actor, params.target);
  const hitChance = calculateHitChance({ HIT: params.actor.derived.HIT, EVA: params.target.derived.EVA });
  const hitRoll = params.state.random.factor({ unitId: params.actor.unitId, actionId: params.skillId, phase: 'hit' }) * 100;
  const didHit = hitRoll < hitChance;

  params.pendingLogs.push({
    type: 'hit-check',
    actorUnitId: params.actor.unitId,
    targetUnitId: params.target.unitId,
    actionType: params.actionType,
    skillId: params.skillId,
    detail: `${params.actor.name} 对 ${params.target.name} 的命中判定：${didHit ? '命中' : '未命中'}。`,
    payload: { hitChance, hitRoll },
  });

  if (!didHit) {
    return {
      units: params.units,
      actor: params.actor,
      target: params.target,
      damage: 0,
      didCrit: false,
      killed: false,
    };
  }

  const critChance = calculateCritChance({ CRIT: params.actor.derived.CRIT, skillExtraCrit: attackProfile.extraCrit });
  const critRoll = params.state.random.factor({ unitId: params.actor.unitId, actionId: params.skillId, phase: 'crit' }) * 100;
  const didCrit = critRoll < critChance;
  const critMultiplier = calculateCritMultiplier({
    CDMG: params.actor.derived.CDMG,
    skillExtraCritDamage: attackProfile.extraCritDamage,
    didCrit,
  });

  params.pendingLogs.push({
    type: 'crit-check',
    actorUnitId: params.actor.unitId,
    targetUnitId: params.target.unitId,
    actionType: params.actionType,
    skillId: params.skillId,
    detail: `${params.actor.name} 对 ${params.target.name} 的暴击判定：${didCrit ? '暴击' : '未暴击'}。`,
    payload: { critChance, critRoll, critMultiplier },
  });

  const vulnerableMultiplier = hasStatus(params.target, 'vulnerable') ? clamp(Number(params.target.statuses.find((status) => status.key === 'vulnerable')?.metadata?.damageTakenMultiplier ?? 1.15), 1, 10) : 1;
  const guardedMultiplier = hasStatus(params.target, 'guarded') ? clamp(Number(params.target.statuses.find((status) => status.key === 'guarded')?.metadata?.mitigationMultiplier ?? 0.75), 0, 1) : 1;
  const randomFactor = 0.92 + 0.16 * params.state.random.factor({ unitId: params.actor.unitId, actionId: params.skillId, phase: 'damage' });
  const damageResult = calculateDamage({
    attack: attackProfile.attack,
    defense: attackProfile.defense,
    skillRate: attackProfile.skillRate,
    randomFactor,
    finalBonus: params.actor.derived.TeamAuraBonus * vulnerableMultiplier,
    critMultiplier,
    stageDamageMultiplier: stage.damage,
    stageTakenMultiplier: stage.taken * guardedMultiplier,
  });
  const absorbed = absorbDamageByShields({ shields: params.target.shields, incomingDamage: damageResult.finalDamage });
  const hpDamage = Math.max(0, absorbed.remainingDamage);
  const nextHp = Math.max(0, params.target.currentHp - hpDamage);

  const nextTarget = {
    ...params.target,
    currentHp: nextHp,
    isDead: nextHp <= 0,
    canAct: nextHp > 0 && !params.target.isStunned,
    shields: absorbed.updatedShields,
    runtime: {
      ...params.target.runtime,
      receivedDamage: params.target.runtime.receivedDamage + hpDamage,
    },
  };
  const nextActor = {
    ...params.actor,
    runtime: {
      ...params.actor.runtime,
      dealtDamage: params.actor.runtime.dealtDamage + hpDamage,
    },
  };

  let units = replaceManyUnits(params.units, [nextActor, nextTarget]);
  if (hasStatus(nextTarget, 'vulnerable')) {
    const cleanedTarget = {
      ...nextTarget,
      statuses: nextTarget.statuses.filter((status) => status.key !== 'vulnerable'),
    };
    units = replaceUnit(units, cleanedTarget);
  }

  params.pendingLogs.push({
    type: 'damage',
    actorUnitId: params.actor.unitId,
    targetUnitId: params.target.unitId,
    actionType: params.actionType,
    skillId: params.skillId,
    value: hpDamage,
    detail: `${params.actor.name} 对 ${params.target.name} 造成 ${hpDamage} 点伤害。`,
    payload: { shieldAbsorbed: absorbed.absorbedDamage, rawDamage: damageResult.finalDamage },
  });

  if (absorbed.absorbedDamage > 0) {
    params.pendingLogs.push({
      type: 'shield',
      actorUnitId: params.actor.unitId,
      targetUnitId: params.target.unitId,
      value: absorbed.absorbedDamage,
      detail: `${params.target.name} 的护盾吸收了 ${absorbed.absorbedDamage} 点伤害。`,
      payload: { actionType: params.actionType, skillId: params.skillId },
    });
  }

  return {
    units,
    actor: nextActor,
    target: nextTarget,
    damage: hpDamage,
    didCrit,
    killed: nextTarget.isDead,
  };
}

function applyHealEffect(params: {
  state: BattleState;
  units: readonly BattleUnitState[];
  actor: BattleUnitState;
  target: BattleUnitState;
  effect: SkillEffect;
  actionType: BattleActionType;
  skillId?: Identifier;
  pendingLogs: PendingLog[];
}) {
  const stage = getStageScale(params.state, params.actor);
  const finalHeal = calculateHeal({
    healPower: params.actor.derived.HEALP,
    skillRate: params.effect.ratio ?? 0,
    finalBonus: params.actor.derived.TeamAuraBonus,
    stageHealShieldMultiplier: stage.heal_shield,
  });
  const actualHeal = calculateActualHeal({
    targetCurrentHp: params.target.currentHp,
    targetMaxHp: params.target.maxHp,
    finalHeal,
  });

  const nextTarget = {
    ...params.target,
    currentHp: clamp(params.target.currentHp + actualHeal, 0, params.target.maxHp),
  };
  const nextActor = {
    ...params.actor,
    runtime: {
      ...params.actor.runtime,
      healingDone: params.actor.runtime.healingDone + actualHeal,
    },
  };

  params.pendingLogs.push({
    type: 'heal',
    actorUnitId: params.actor.unitId,
    targetUnitId: params.target.unitId,
    actionType: params.actionType,
    skillId: params.skillId,
    value: actualHeal,
    detail: `${params.actor.name} 为 ${params.target.name} 回复 ${actualHeal} 点生命。`,
  });

  return {
    units: replaceManyUnits(params.units, [nextActor, nextTarget]),
    actor: nextActor,
    target: nextTarget,
  };
}

function applyShieldEffect(params: {
  state: BattleState;
  units: readonly BattleUnitState[];
  actor: BattleUnitState;
  target: BattleUnitState;
  effect: SkillEffect;
  actionType: BattleActionType;
  skillId?: Identifier;
  pendingLogs: PendingLog[];
}) {
  const stage = getStageScale(params.state, params.actor);
  const shieldValue = calculateShield({
    healPower: params.actor.derived.HEALP,
    skillRate: params.effect.ratio ?? 0,
    flatShield: Number(params.effect.flat ?? 0),
    finalBonus: params.actor.derived.TeamAuraBonus,
    stageHealShieldMultiplier: stage.heal_shield,
  });
  const nextTarget = {
    ...params.target,
    shields: applyShield({
      shields: params.target.shields,
      newShield: {
        id: `${params.actor.unitId}-${params.skillId ?? 'shield'}-${params.state.turn}-${params.state.tick}-${params.target.shields.length}`,
        sourceId: String(params.skillId ?? 'shield-effect'),
        sourceUnitId: params.actor.unitId,
        name: String(params.skillId ?? 'shield'),
        value: shieldValue,
        remainingSelfActions: floorFinite(params.effect.metadata?.remainingSelfActions as number, 3) || 3,
        createdAtTurn: params.state.turn,
        metadata: params.effect.metadata,
      },
    }),
  };
  const nextActor = {
    ...params.actor,
    runtime: {
      ...params.actor.runtime,
      shieldGiven: params.actor.runtime.shieldGiven + shieldValue,
    },
  };

  params.pendingLogs.push({
    type: 'shield',
    actorUnitId: params.actor.unitId,
    targetUnitId: params.target.unitId,
    actionType: params.actionType,
    skillId: params.skillId,
    value: shieldValue,
    detail: `${params.actor.name} 为 ${params.target.name} 提供 ${shieldValue} 点护盾。`,
  });

  return {
    units: replaceManyUnits(params.units, [nextActor, nextTarget]),
    actor: nextActor,
    target: nextTarget,
  };
}

export function resolveTurn(input: ResolveTurnInput): ResolveTurnResult {
  const skillMap = new Map(input.skillTemplates.map((skill) => [skill.id, skill]));
  const actor = getUnit(input.state, input.actorUnitId);
  if (!actor) {
    return {
      state: input.state,
      logs: [],
      finished: input.state.result.finished,
      outcome: input.state.result.outcome,
      reward: input.state.result.reward,
    };
  }

  const pendingLogs: PendingLog[] = [];
  let state: BattleState = {
    ...input.state,
    turn: input.state.turn + 1,
    tick: input.state.tick + 1,
  };

  const turnStart = processStatusEffects({ state, actorUnitId: actor.unitId, phase: 'turn-start' });
  state = {
    ...state,
    units: turnStart.units,
  };
  pendingLogs.push(...turnStart.logs.map((log) => ({ ...log })));

  let currentActor = getUnit(state, actor.unitId);
  if (!currentActor || currentActor.isDead || currentActor.isStunned || !currentActor.canAct) {
    pendingLogs.push({
      type: 'system',
      actorUnitId: actor.unitId,
      detail: `${actor.name} 当前无法行动。`,
    });
    const finalState = finalizeResult(updatePartyState(state), pendingLogs);
    const committedLogs = appendLogs(finalState, pendingLogs);
    const nextState = {
      ...finalState,
      logs: [...finalState.logs, ...committedLogs],
    };
    return {
      state: nextState,
      logs: committedLogs,
      finished: nextState.result.finished,
      outcome: nextState.result.outcome,
      reward: nextState.result.reward,
    };
  }

  const action = resolveActionOption({ actor: currentActor, action: input.action, state, skillMap });
  pendingLogs.push({
    type: 'action-start',
    actorUnitId: currentActor.unitId,
    actionType: action.actionType,
    skillId: action.skill?.id,
    detail: `${currentActor.name} 开始行动：${action.actionType}${action.fallbackReason ? `（${action.fallbackReason}）` : ''}`,
  });

  const targets = getTargetUnits(state.units, action.targetUnitIds).filter((target) => !target.isDead);
  targets.forEach((target) => {
    pendingLogs.push({
      type: 'action-target',
      actorUnitId: currentActor!.unitId,
      targetUnitId: target.unitId,
      actionType: action.actionType,
      skillId: action.skill?.id,
      detail: `${currentActor!.name} 选择 ${target.name} 为目标。`,
    });
  });

  currentActor = spendSkillCost(currentActor, action.actionType === 'skill' ? action.skill : null);
  state = {
    ...state,
    units: replaceUnit(state.units, currentActor),
  };

  if (action.actionType === 'guard') {
    currentActor = {
      ...currentActor,
      statuses: [...currentActor.statuses.filter((status) => status.sourceId !== 'guard-action'), createGuardStatus(currentActor, state)],
    };
    state = {
      ...state,
      units: replaceUnit(state.units, currentActor),
    };
    pendingLogs.push({
      type: 'action-resolution',
      actorUnitId: currentActor.unitId,
      targetUnitId: currentActor.unitId,
      actionType: 'guard',
      detail: `${currentActor.name} 进入防御姿态。`,
    });
  }

  const baseEffects: readonly SkillEffect[] = action.skill?.effects ?? (action.actionType === 'attack' ? [{ type: 'damage', ratio: 1 }] : []);

  for (const targetRef of targets) {
    let liveActor = getUnit(state, currentActor.unitId) ?? currentActor;
    let liveTarget = getUnit(state, targetRef.unitId) ?? targetRef;
    if (liveTarget.isDead) {
      continue;
    }

    for (const effect of baseEffects) {
      if (effect.type === 'damage') {
        const damageResult = applyDamageEffect({
          state,
          units: state.units,
          actor: liveActor,
          target: liveTarget,
          effect,
          actionType: action.actionType,
          skillId: action.skill?.id,
          pendingLogs,
        });
        state = { ...state, units: damageResult.units };
        liveActor = getUnit(state, liveActor.unitId) ?? damageResult.actor;
        liveTarget = getUnit(state, liveTarget.unitId) ?? damageResult.target;

        if (damageResult.damage > 0) {
          liveActor = applyBurst(liveActor, action.actionType === 'skill' ? BURST_GAIN.skillUse : BURST_GAIN.basicHit);
          liveTarget = applyBurst(liveTarget, BURST_GAIN.takeDamage);
          if (damageResult.didCrit) {
            liveActor = applyBurst(liveActor, BURST_GAIN.crit);
          }
          if (damageResult.killed) {
            liveActor = applyBurst(liveActor, BURST_GAIN.kill);
            pendingLogs.push({
              type: 'unit-down',
              actorUnitId: liveActor.unitId,
              targetUnitId: liveTarget.unitId,
              value: damageResult.damage,
              detail: `${liveTarget.name} 被击倒。`,
            });
          }
          state = {
            ...state,
            units: replaceManyUnits(state.units, [liveActor, liveTarget]),
          };
          pendingLogs.push({
            type: 'burst-change',
            actorUnitId: liveActor.unitId,
            targetUnitId: liveTarget.unitId,
            detail: `${liveActor.name}/${liveTarget.name} 的 Burst 已更新。`,
            payload: { actorBurst: liveActor.burst, targetBurst: liveTarget.burst },
          });
        }
      }

      if (effect.type === 'heal') {
        const healResult = applyHealEffect({
          state,
          units: state.units,
          actor: liveActor,
          target: liveTarget,
          effect,
          actionType: action.actionType,
          skillId: action.skill?.id,
          pendingLogs,
        });
        state = { ...state, units: healResult.units };
        liveActor = getUnit(state, liveActor.unitId) ?? healResult.actor;
        liveTarget = getUnit(state, liveTarget.unitId) ?? healResult.target;
      }

      if (effect.type === 'shield') {
        const shieldResult = applyShieldEffect({
          state,
          units: state.units,
          actor: liveActor,
          target: liveTarget,
          effect,
          actionType: action.actionType,
          skillId: action.skill?.id,
          pendingLogs,
        });
        state = { ...state, units: shieldResult.units };
        liveActor = getUnit(state, liveActor.unitId) ?? shieldResult.actor;
        liveTarget = getUnit(state, liveTarget.unitId) ?? shieldResult.target;
      }

      if (effect.type === 'gain-sp') {
        liveTarget = {
          ...liveTarget,
          currentSp: clamp(liveTarget.currentSp + Number(effect.flat ?? 0), 0, liveTarget.maxSp),
        };
        state = { ...state, units: replaceUnit(state.units, liveTarget) };
        pendingLogs.push({
          type: 'action-resolution',
          actorUnitId: liveActor.unitId,
          targetUnitId: liveTarget.unitId,
          actionType: action.actionType,
          skillId: action.skill?.id,
          value: Number(effect.flat ?? 0),
          detail: `${liveTarget.name} 回复 ${Number(effect.flat ?? 0)} 点 SP。`,
        });
      }

      if (effect.type === 'apply-status') {
        const statusResult = applyStatusEffect({
          state,
          actor: liveActor,
          target: liveTarget,
          effect,
          skillId: action.skill?.id,
          actionType: action.actionType,
        });
        state = { ...state, units: statusResult.units };
        pendingLogs.push(...statusResult.logs.map((log) => ({ ...log, actionType: action.actionType, skillId: action.skill?.id })));
        liveTarget = getUnit(state, liveTarget.unitId) ?? liveTarget;
      }
    }
  }

  currentActor = getUnit(state, currentActor.unitId) ?? currentActor;
  currentActor = {
    ...currentActor,
    runtime: {
      ...currentActor.runtime,
      actionCount: currentActor.runtime.actionCount + 1,
    },
    hasActedThisRound: true,
    shields: cleanupShields(currentActor.shields),
  };
  state = {
    ...state,
    units: replaceUnit(state.units, currentActor),
  };

  const afterAction = processStatusEffects({
    state,
    actorUnitId: currentActor.unitId,
    phase: 'after-action',
    actionType: action.actionType,
    skillId: action.skill?.id,
  });
  state = {
    ...state,
    units: afterAction.units,
  };
  pendingLogs.push(...afterAction.logs.map((log) => ({ ...log })));

  state = updatePartyState(state);
  state = finalizeResult(state, pendingLogs);
  const committedLogs = appendLogs(state, pendingLogs);
  let nextState = {
    ...state,
    logs: [...state.logs, ...committedLogs],
  };

  if (nextState.result.finished) {
    const reward = buildReward(nextState);
    nextState = {
      ...nextState,
      result: {
        ...nextState.result,
        reward,
      },
    };
    return {
      state: nextState,
      logs: committedLogs,
      finished: nextState.result.finished,
      outcome: nextState.result.outcome,
      reward,
    };
  }

  return {
    state: nextState,
    logs: committedLogs,
    finished: false,
    outcome: nextState.result.outcome,
    reward: null,
  };
}
