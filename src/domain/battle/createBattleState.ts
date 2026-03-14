import type {
  BattleLogEntry,
  BattleResult,
  BattleSide,
  BattleState,
  BattleUnitState,
  BattleUnitTemplateSource,
  CreateBattleStateInput,
  EnemyTemplate,
} from '../../types';
import { deriveCombatStats } from '../formulas/deriveCombatStats';
import { ATB_INITIAL_GAUGE, ATB_THRESHOLD } from './atb';
import { resolveStageScale, toStagePresetKey } from './stageRules';

const DEFAULT_STATUS_DURATION = 0;
const DEFAULT_SHIELD_DURATION = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 从单位模板中提取属性并传给共享公式模块。
 */
function deriveUnitCombatStats(unit: BattleUnitTemplateSource) {
  const level = 'progression' in unit ? (unit.progression?.level ?? 1) : 1;
  return deriveCombatStats({
    ...unit.stats,
    level,
  });
}

function createUnitState(params: {
  unit: BattleUnitTemplateSource;
  side: BattleSide;
  index: number;
  realmTier: number;
  skillIds: readonly string[];
}): BattleUnitState {
  const { unit, side, index, realmTier, skillIds } = params;
  const derived = deriveUnitCombatStats(unit);

  // HP/SP：如果模板中已经有 hp/maxHp（由 createRun 公式计算写入），使用其比例；
  // 否则（如敌人模板，没有 hp/maxHp）默认满血满SP。
  const templateHp = unit.stats.hp ?? derived.maxHp;
  const templateMaxHp = unit.stats.maxHp ?? derived.maxHp;
  const hpRatio = templateMaxHp > 0 ? templateHp / templateMaxHp : 1;
  const currentHp = hpRatio >= 1
    ? derived.maxHp
    : clamp(Math.round(derived.maxHp * hpRatio), 1, derived.maxHp);

  const templateSp = unit.stats.sp ?? derived.maxSp;
  const templateMaxSp = unit.stats.maxSp ?? derived.maxSp;
  const spRatio = templateMaxSp > 0 ? templateSp / templateMaxSp : 1;
  const currentSp = spRatio >= 1
    ? derived.maxSp
    : clamp(Math.round(derived.maxSp * spRatio), 0, derived.maxSp);

  const missingStatMappings: string[] = [];
  const missingRuleBindings: string[] = [];

  if (unit.stats.strength === undefined) {
    missingStatMappings.push('strength<-attack fallback');
  }
  if (unit.stats.agility === undefined) {
    missingStatMappings.push('agility<-speed fallback');
  }
  if (unit.stats.intelligence === undefined) {
    missingStatMappings.push('intelligence<-spirit fallback');
  }
  if (unit.stats.spiritPower === undefined) {
    missingStatMappings.push('spiritPower<-spirit fallback');
  }
  if (unit.stats.charisma === undefined) {
    missingStatMappings.push('charisma<-spirit fallback');
  }
  if (unit.stats.luck === undefined) {
    missingStatMappings.push('luck<-0 fallback');
  }

  if (!unit.loadout.skillIds.length) {
    missingRuleBindings.push('no-skill-template-bound');
  }

  return {
    unitId: 'instanceId' in unit ? unit.instanceId : `${side}-${unit.identity.id}-${index + 1}`,
    templateId: unit.identity.id,
    sourceInstanceId: 'instanceId' in unit ? unit.instanceId : undefined,
    name: unit.identity.name,
    title: unit.identity.title,
    side,
    index,
    isLeader: side === 'party' && index === 0,
    isBoss: Boolean('isBoss' in unit && unit.isBoss),
    aiProfileId: 'aiProfileId' in unit ? unit.aiProfileId : undefined,
    realmTier,
    templateCategory: unit.identity.category,
    currentHp,
    maxHp: derived.maxHp,
    currentSp,
    maxSp: derived.maxSp,
    gauge: ATB_INITIAL_GAUGE,
    burst: 0,
    derived,
    shields: [],
    statuses: [],
    skillIds,
    canAct: true,
    isStunned: false,
    isDead: currentHp <= 0,
    hasActedThisRound: false,
    runtime: {
      actionCount: 0,
      receivedDamage: 0,
      dealtDamage: 0,
      healingDone: 0,
      shieldGiven: 0,
    },
    gaps: {
      missingStatMappings,
      missingRuleBindings: [
        ...missingRuleBindings,
        `shieldDurationPreset=${DEFAULT_SHIELD_DURATION}`,
        `defaultStatusDuration=${DEFAULT_STATUS_DURATION}`,
      ],
    },
  };
}

function createInitialLogs(input: CreateBattleStateInput, partyUnits: readonly BattleUnitState[], enemyUnits: readonly BattleUnitState[]): readonly BattleLogEntry[] {
  return [
    {
      id: `${input.battleId ?? 'battle'}-log-1`,
      turn: 0,
      tick: 0,
      type: 'system',
      detail: 'Battle state initialized for Stage3 contract layer.',
      payload: {
        gaugeThreshold: ATB_THRESHOLD,
        partyUnitIds: partyUnits.map((unit) => unit.unitId),
        enemyUnitIds: enemyUnits.map((unit) => unit.unitId),
      },
    },
  ];
}

function createResult(units: readonly BattleUnitState[]): BattleResult {
  return {
    finished: false,
    outcome: 'ongoing',
    winningSide: null,
    roundsElapsed: 0,
    reward: null,
    survivorSnapshots: units.map((unit) => ({
      unitId: unit.unitId,
      name: unit.name,
      side: unit.side,
      hp: unit.currentHp,
      maxHp: unit.maxHp,
      sp: unit.currentSp,
      maxSp: unit.maxSp,
      speed: unit.derived.SPD,
      statuses: unit.statuses.map((status) => status.key),
    })),
  };
}

function sumEnemyRewards(enemies: readonly EnemyTemplate[]) {
  return enemies.reduce((sum, enemy) => sum + enemy.rewardShards, 0);
}

export function createBattleState(input: CreateBattleStateInput): BattleState {
  const skillMap = new Map(input.skillTemplates.map((skill) => [skill.id, skill]));
  const partyUnits = input.party.map((member, index) =>
    createUnitState({
      unit: member,
      side: 'party',
      index,
      realmTier: 0,
      skillIds: member.loadout.skillIds.filter((skillId) => skillMap.has(skillId)),
    }),
  );
  const enemyUnits = input.enemies.map((enemy, index) =>
    createUnitState({
      unit: enemy,
      side: 'enemy',
      index,
      realmTier: Math.abs(Math.trunc(input.realmGap)),
      skillIds: enemy.loadout.skillIds.filter((skillId) => skillMap.has(skillId)),
    }),
  );
  const units = [...partyUnits, ...enemyUnits];
  const partyAlive = partyUnits.filter((unit) => !unit.isDead).length;
  const enemyAlive = enemyUnits.filter((unit) => !unit.isDead).length;
  const stagePreset = toStagePresetKey(input.realmGap);

  return {
    id: input.battleId ?? `battle-state-${Date.now()}`,
    battleId: input.battleId,
    seed: input.seed,
    turn: 0,
    tick: 0,
    queueVersion: 1,
    realmGap: input.realmGap,
    stagePreset,
    stageModifiers: {
      partyToEnemy: resolveStageScale(input.realmGap),
      enemyToParty: resolveStageScale(-input.realmGap),
    },
    party: {
      side: 'party',
      unitIds: partyUnits.map((unit) => unit.unitId),
      auraSourceUnitId: partyUnits[0]?.unitId ?? null,
      totalAlive: partyAlive,
    },
    enemy: {
      side: 'enemy',
      unitIds: enemyUnits.map((unit) => unit.unitId),
      auraSourceUnitId: enemyUnits[0]?.unitId ?? null,
      totalAlive: enemyAlive,
    },
    units,
    logs: createInitialLogs(input, partyUnits, enemyUnits),
    result: createResult(units),
    rewardConfig: {
      baseShards: input.rewardConfig?.baseShards ?? sumEnemyRewards(input.enemies),
      bonusSupply: input.rewardConfig?.bonusSupply,
      extra: input.rewardConfig?.extra,
    },
    random: input.random,
    metadata: {
      ...input.metadata,
      contractStage: 'stage3',
      unresolvedTodos: [
        'resolveTurn pending',
        'applyStatusEffects pending',
        'enemyAi pending',
        'shield/status tick lifecycle pending',
      ],
    },
  };
}
