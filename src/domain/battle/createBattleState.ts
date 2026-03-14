import type {
  BattleDerivedStats,
  BattleLogEntry,
  BattleResult,
  BattleSide,
  BattleState,
  BattleUnitState,
  BattleUnitTemplateSource,
  CreateBattleStateInput,
  EnemyTemplate,
} from '../../types';
import { ATB_INITIAL_GAUGE, ATB_THRESHOLD } from './atb';
import { resolveStageScale, toStagePresetKey } from './stageRules';

const DEFAULT_STATUS_DURATION = 0;
const DEFAULT_SHIELD_DURATION = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function floorMin(value: number, min: number) {
  return Math.max(min, Math.floor(value));
}


function safeStat(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function extractPrimaryAttributes(unit: BattleUnitTemplateSource) {
  const strength = safeStat(unit.stats.strength, unit.stats.attack);
  const agility = safeStat(unit.stats.agility, unit.stats.speed);
  const intelligence = safeStat(unit.stats.intelligence, unit.stats.spirit);
  const spirit = safeStat(unit.stats.spiritPower, unit.stats.spirit);
  const charisma = safeStat(unit.stats.charisma, spirit);
  const luck = safeStat(unit.stats.luck, 0);
  const level = 'progression' in unit ? safeStat(unit.progression.level, 1) : 1;

  return {
    strength,
    agility,
    intelligence,
    spirit,
    charisma,
    luck,
    level,
  };
}

function deriveCombatStats(unit: BattleUnitTemplateSource): BattleDerivedStats {
  const { strength, agility, intelligence, spirit, charisma, luck, level } = extractPrimaryAttributes(unit);

  const maxHp = floorMin(100 + strength * 9 + spirit * 5 + level * 4, 1);
  const maxSp = floorMin(40 + intelligence * 4 + spirit * 8 + level * 2, 0);
  const PATK = floorMin(10 + strength * 2.6 + agility * 0.7 + level * 0.5, 0);
  const MATK = floorMin(10 + intelligence * 2.6 + spirit * 0.8 + level * 0.5, 0);
  const PDEF = floorMin(5 + strength * 1.2 + agility * 0.5 + level * 0.3, 0);
  const MDEF = floorMin(5 + spirit * 1.6 + intelligence * 0.6 + level * 0.3, 0);
  const SPD = floorMin(80 + agility * 2.2 + spirit * 0.3 + luck * 0.2, 1);
  const HIT = floorMin(100 + agility * 1 + intelligence * 0.4 + level * 0.2, 1);
  const EVA = floorMin(agility * 0.9 + luck * 0.6 + level * 0.1, 0);
  const CRIT = 5 + agility * 0.08 + luck * 0.18;
  const CDMG = 150 + strength * 0.12 + intelligence * 0.12 + luck * 0.1;
  const AACC = 100 + intelligence * 0.8 + spirit * 0.8 + charisma * 0.6 + luck * 0.2;
  const ARES = 100 + spirit * 1.2 + charisma * 0.5 + luck * 0.3;
  const HEALP = floorMin(spirit * 1.8 + intelligence * 0.7 + charisma * 0.7, 0);
  const LEAD = floorMin(charisma * 1.8 + spirit * 0.6 + luck * 0.2, 0);
  const TeamAuraBonus = 1 + Math.min(0.2, LEAD / 1000);
  const SummonInheritance = 0.5 + Math.min(0.35, LEAD / 1000);
  const SPRegenPerAction = 4 + spirit * 0.15;

  return {
    maxHp,
    maxSp,
    PATK,
    MATK,
    PDEF,
    MDEF,
    SPD,
    HIT,
    EVA,
    CRIT,
    CDMG,
    AACC,
    ARES,
    HEALP,
    LEAD,
    TeamAuraBonus,
    SummonInheritance,
    SPRegenPerAction,
  };
}

function createUnitState(params: {
  unit: BattleUnitTemplateSource;
  side: BattleSide;
  index: number;
  realmTier: number;
  skillIds: readonly string[];
}): BattleUnitState {
  const { unit, side, index, realmTier, skillIds } = params;
  const derived = deriveCombatStats(unit);
  const currentHp = clamp(unit.stats.hp, 1, derived.maxHp);
  const currentSp = clamp(unit.stats.sp, 0, derived.maxSp);
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
