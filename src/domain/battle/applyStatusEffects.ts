import { DEFAULT_SHIELD_SELF_ACTIONS } from '../formulas/shield';
import type {
  BattleActionType,
  BattleLogEntry,
  BattleLogEntryType,
  BattleRandomSource,
  BattleShield,
  BattleState,
  BattleStatus,
  BattleStatusKind,
  BattleUnitState,
  Identifier,
  SkillEffect,
} from '../../types';
import { calculateDamage } from '../formulas/damage';
import { applyShield, cleanupShields, tickShieldsAfterSelfAction } from './shields';

const STATUS_CHANCE_MIN = 5;
const STATUS_CHANCE_MAX = 85;

type StatusLifecyclePhase = 'apply' | 'turn-start' | 'after-action';

type StatusProcessingLog = {
  type: BattleLogEntryType;
  actorUnitId?: Identifier;
  targetUnitId?: Identifier;
  value?: number;
  detail: string;
  payload?: Record<string, unknown>;
};

type BattleUnitCollection = readonly BattleUnitState[];

type ApplyStatusEffectInput = {
  state: BattleState;
  actor: BattleUnitState;
  target: BattleUnitState;
  effect: SkillEffect;
  skillId?: Identifier;
  actionType?: BattleActionType;
};

type ApplyStatusEffectResult = {
  units: BattleUnitCollection;
  logs: readonly StatusProcessingLog[];
};

type ProcessStatusEffectsInput = {
  state: BattleState;
  actorUnitId: Identifier;
  phase: StatusLifecyclePhase;
  actionType?: BattleActionType;
  skillId?: Identifier;
};

type ProcessStatusEffectsResult = {
  units: BattleUnitCollection;
  logs: readonly StatusProcessingLog[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getUnit(units: BattleUnitCollection, unitId: Identifier) {
  return units.find((unit) => unit.unitId === unitId) ?? null;
}

function replaceUnit(units: BattleUnitCollection, nextUnit: BattleUnitState): BattleUnitCollection {
  return units.map((unit) => (unit.unitId === nextUnit.unitId ? nextUnit : unit));
}

function createLog(log: StatusProcessingLog): StatusProcessingLog {
  return log;
}

function normalizeStatusKey(key: SkillEffect['statusKey']): BattleStatus['key'] | null {
  if (!key) {
    return null;
  }

  if (key === 'broken') {
    return 'vulnerable';
  }

  return key;
}

function mapStatusKind(key: BattleStatus['key']): BattleStatusKind {
  switch (key) {
    case 'poisoned':
      return 'poisoned';
    case 'stunned':
      return 'stunned';
    case 'vulnerable':
    case 'broken':
      return 'vulnerable';
    case 'charged':
    case 'focused':
      return 'charged';
    default:
      return 'custom';
  }
}

function getStatusTiming(key: BattleStatus['key']) {
  switch (key) {
    case 'poisoned':
      return 'turn-start' as const;
    case 'charged':
    case 'focused':
      return 'after-action' as const;
    default:
      return 'passive' as const;
  }
}

function calculateStatusChance(params: {
  actor: BattleUnitState;
  target: BattleUnitState;
  effect: SkillEffect;
  state: BattleState;
}) {
  const baseChance = toFiniteNumber(params.effect.metadata?.baseChance, 0);
  if (baseChance <= 0) {
    return null;
  }

  const targetStage = params.actor.side === 'party' ? params.state.stageModifiers.partyToEnemy : params.state.stageModifiers.enemyToParty;
  const rawChance =
    baseChance *
    Math.sqrt(Math.max(0.0001, params.actor.derived.AACC) / Math.max(0.0001, params.target.derived.ARES)) *
    targetStage.control_out *
    targetStage.control_in;

  return clamp(rawChance, STATUS_CHANCE_MIN, STATUS_CHANCE_MAX);
}

function buildStatus(params: {
  actor: BattleUnitState;
  effect: SkillEffect;
  key: BattleStatus['key'];
  state: BattleState;
}): BattleStatus | null {
  const duration = Math.max(0, Math.floor(toFiniteNumber(params.effect.duration, 0)));
  const stacks = Math.max(1, Math.floor(toFiniteNumber(params.effect.stacks, 1)));
  const name = String(params.effect.metadata?.statusName ?? params.key);

  if (duration <= 0 && params.key !== 'charged' && params.key !== 'focused') {
    return null;
  }

  return {
    id: `${params.actor.unitId}-${params.key}-${params.state.turn}-${params.state.tick}-${params.state.logs.length}`,
    key: params.key,
    name,
    sourceId: String(params.effect.metadata?.sourceId ?? params.effect.statusKey ?? params.key),
    sourceUnitId: params.actor.unitId,
    stacks,
    duration,
    remainingTurns: duration,
    timing: getStatusTiming(params.key),
    dispellable: params.effect.metadata?.dispellable === false ? false : true,
    isControl: params.key === 'stunned',
    metadata: {
      ...params.effect.metadata,
      kind: mapStatusKind(params.key),
    },
  };
}

function mergeStatus(statuses: readonly BattleStatus[], incoming: BattleStatus) {
  const existing = statuses.find((status) => status.sourceId === incoming.sourceId && status.key === incoming.key);
  if (!existing) {
    return [...statuses, incoming];
  }

  return statuses.map((status) => {
    if (status.id !== existing.id) {
      return status;
    }

    return {
      ...status,
      stacks: Math.max(status.stacks, incoming.stacks),
      duration: incoming.duration,
      remainingTurns: incoming.remainingTurns,
      metadata: {
        ...status.metadata,
        ...incoming.metadata,
      },
    };
  });
}

function syncFlags(unit: BattleUnitState): BattleUnitState {
  const isStunned = unit.statuses.some((status) => status.key === 'stunned' && status.remainingTurns > 0);
  return {
    ...unit,
    isStunned,
    canAct: !unit.isDead && !isStunned,
  };
}

function applyPoisonTick(target: BattleUnitState, status: BattleStatus, state: BattleState) {
  const poisonRatio = toFiniteNumber(status.metadata?.poisonRatio, NaN);
  const poisonFlat = toFiniteNumber(status.metadata?.poisonFlat, 0);
  if (!Number.isFinite(poisonRatio) && poisonFlat <= 0) {
    return {
      unit: target,
      log: createLog({
        type: 'status-triggered',
        actorUnitId: status.sourceUnitId,
        targetUnitId: target.unitId,
        detail: `${target.name} 的中毒因缺少参数未生效。`,
        payload: { statusKey: status.key, reason: 'missing-poison-parameters' },
      }),
    };
  }

  const source = getUnit(state.units, status.sourceUnitId) ?? target;
  const stage = source.side === 'party' ? state.stageModifiers.partyToEnemy : state.stageModifiers.enemyToParty;
  const ratio = Number.isFinite(poisonRatio) ? poisonRatio : 0;
  const damageResult = calculateDamage({
    attack: source.derived.MATK,
    defense: target.derived.MDEF,
    skillRate: ratio,
    randomFactor: 1,
    finalBonus: source.derived.TeamAuraBonus,
    critMultiplier: 1,
    stageDamageMultiplier: stage.damage,
    stageTakenMultiplier: stage.taken,
  });
  const value = Math.max(0, damageResult.finalDamage + Math.floor(poisonFlat));
  const nextHp = Math.max(0, target.currentHp - value);

  return {
    unit: {
      ...target,
      currentHp: nextHp,
      isDead: nextHp <= 0,
      canAct: nextHp > 0 && !target.isStunned,
      runtime: {
        ...target.runtime,
        receivedDamage: target.runtime.receivedDamage + value,
      },
    },
    log: createLog({
      type: 'status-triggered',
      actorUnitId: status.sourceUnitId,
      targetUnitId: target.unitId,
      value,
      detail: `${target.name} 受到中毒结算 ${value} 点伤害。`,
      payload: { statusKey: status.key },
    }),
  };
}

function decrementStatuses(unit: BattleUnitState, phase: StatusLifecyclePhase) {
  const expired: BattleStatus[] = [];
  const statuses = unit.statuses
    .map((status) => {
      const shouldTick =
        (phase === 'turn-start' && (status.key === 'poisoned' || status.key === 'stunned' || status.key === 'vulnerable')) ||
        (phase === 'after-action' && (status.key === 'charged' || status.key === 'focused'));

      if (!shouldTick) {
        return status;
      }

      const remainingTurns = status.remainingTurns - 1;
      if (remainingTurns <= 0) {
        expired.push(status);
        return null;
      }

      return {
        ...status,
        remainingTurns,
      };
    })
    .filter((status): status is BattleStatus => Boolean(status));

  return {
    unit: syncFlags({
      ...unit,
      statuses,
      shields: cleanupShields(unit.shields),
    }),
    expired,
  };
}

export function applyStatusEffect(input: ApplyStatusEffectInput): ApplyStatusEffectResult {
  const key = normalizeStatusKey(input.effect.statusKey);
  if (!key) {
    return {
      units: input.state.units,
      logs: [],
    };
  }

  let units = input.state.units;
  const target = getUnit(units, input.target.unitId);
  if (!target || target.isDead) {
    return { units, logs: [] };
  }

  if (key === 'shielded') {
    const shieldValue = toFiniteNumber(input.effect.metadata?.shieldValue, 0);
    if (shieldValue <= 0) {
      return {
        units,
        logs: [
          createLog({
            type: 'system',
            actorUnitId: input.actor.unitId,
            targetUnitId: target.unitId,
            detail: `${target.name} 的护盾状态缺少 shieldValue，已跳过。`,
            payload: { effectType: input.effect.type, statusKey: key },
          }),
        ],
      };
    }

    const nextShield: BattleShield = {
      id: `${input.actor.unitId}-shield-${input.state.turn}-${input.state.tick}-${target.shields.length}`,
      sourceId: String(input.effect.metadata?.sourceId ?? input.skillId ?? key),
      sourceUnitId: input.actor.unitId,
      name: String(input.effect.metadata?.shieldName ?? 'shielded'),
      value: shieldValue,
      remainingSelfActions: Math.max(1, Math.floor(toFiniteNumber(input.effect.metadata?.remainingSelfActions, DEFAULT_SHIELD_SELF_ACTIONS))),
      createdAtTurn: input.state.turn,
      metadata: input.effect.metadata,
    };

    const nextUnit = {
      ...target,
      shields: applyShield({ shields: target.shields, newShield: nextShield }),
    };
    units = replaceUnit(units, nextUnit);

    return {
      units,
      logs: [
        createLog({
          type: 'shield',
          actorUnitId: input.actor.unitId,
          targetUnitId: target.unitId,
          value: shieldValue,
          detail: `${target.name} 获得 ${shieldValue} 点护盾。`,
          payload: { skillId: input.skillId, actionType: input.actionType },
        }),
      ],
    };
  }

  const chance = calculateStatusChance({ actor: input.actor, target, effect: input.effect, state: input.state });
  if (chance !== null) {
    const roll = input.state.random.factor({ unitId: input.actor.unitId, actionId: input.skillId, phase: `status-${key}` }) * 100;
    if (roll >= chance) {
      return {
        units,
        logs: [
          createLog({
            type: 'status-triggered',
            actorUnitId: input.actor.unitId,
            targetUnitId: target.unitId,
            detail: `${target.name} 抵抗了 ${key}。`,
            payload: { statusKey: key, chance, roll },
          }),
        ],
      };
    }
  }

  const status = buildStatus({ actor: input.actor, effect: input.effect, key, state: input.state });
  if (!status) {
    return {
      units,
      logs: [
        createLog({
          type: 'system',
          actorUnitId: input.actor.unitId,
          targetUnitId: target.unitId,
          detail: `${target.name} 的状态 ${key} 缺少有效 duration，未生效。`,
          payload: { statusKey: key },
        }),
      ],
    };
  }

  const nextTarget = syncFlags({
    ...target,
    statuses: mergeStatus(target.statuses, status),
  });

  return {
    units: replaceUnit(units, nextTarget),
    logs: [
      createLog({
        type: 'status-applied',
        actorUnitId: input.actor.unitId,
        targetUnitId: target.unitId,
        detail: `${target.name} 获得状态 ${status.name}。`,
        payload: {
          statusKey: status.key,
          duration: status.duration,
          stacks: status.stacks,
          skillId: input.skillId,
        },
      }),
    ],
  };
}

export function processStatusEffects(input: ProcessStatusEffectsInput): ProcessStatusEffectsResult {
  let units = input.state.units;
  const actor = getUnit(units, input.actorUnitId);
  if (!actor) {
    return { units, logs: [] };
  }

  const logs: StatusProcessingLog[] = [];
  let workingActor = actor;

  if (input.phase === 'turn-start') {
    for (const status of workingActor.statuses) {
      if (status.key !== 'poisoned') {
        continue;
      }
      const poisonResult = applyPoisonTick(workingActor, status, input.state);
      workingActor = poisonResult.unit;
      units = replaceUnit(units, workingActor);
      logs.push(poisonResult.log);
      if (workingActor.isDead) {
        break;
      }
    }
  }

  if (input.phase === 'after-action') {
    workingActor = {
      ...workingActor,
      shields: tickShieldsAfterSelfAction(workingActor.shields),
    };
    units = replaceUnit(units, workingActor);
  }

  const decremented = decrementStatuses(workingActor, input.phase);
  units = replaceUnit(units, decremented.unit);

  for (const expired of decremented.expired) {
    logs.push(
      createLog({
        type: 'status-expired',
        actorUnitId: expired.sourceUnitId,
        targetUnitId: decremented.unit.unitId,
        detail: `${decremented.unit.name} 的状态 ${expired.name} 已到期。`,
        payload: { statusKey: expired.key, actionType: input.actionType, skillId: input.skillId },
      }),
    );
  }

  return { units, logs };
}
