import type { CharacterTemplate, PartyMember, StatusEffectKey } from './character';
import type { Identifier } from './game';
import type { SkillTemplate } from './skill';

export type BattleActionType = 'attack' | 'skill' | 'guard' | 'item' | 'wait';

export type BattleSide = 'party' | 'enemy';

export type BattleStagePresetKey = 'R0' | 'R1' | 'R2' | 'R3';

export type BattleDamageScale = {
  damage: number;
  taken: number;
  control_out: number;
  control_in: number;
  heal_shield: number;
};

export type BattleUnitSnapshot = {
  unitId: Identifier;
  name: string;
  side: BattleSide;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  speed: number;
  statuses: readonly string[];
};

export type BattleActionOption = {
  id: Identifier;
  actionType: BattleActionType;
  label: string;
  skillId?: SkillTemplate['id'];
  spCost?: number;
};

export type EnemyTemplate = CharacterTemplate & {
  aiProfileId: Identifier;
  rewardShards: number;
  isBoss?: boolean;
};

export type BattleTemplate = {
  id: Identifier;
  key: string;
  name: string;
  recommendedPower: number;
  enemyIds: readonly EnemyTemplate['identity']['id'][];
  battlefieldTag: string;
};

export type BattleDerivedStats = {
  maxHp: number;
  maxSp: number;
  PATK: number;
  MATK: number;
  PDEF: number;
  MDEF: number;
  SPD: number;
  HIT: number;
  EVA: number;
  CRIT: number;
  CDMG: number;
  AACC: number;
  ARES: number;
  HEALP: number;
  LEAD: number;
  TeamAuraBonus: number;
  SummonInheritance: number;
  SPRegenPerAction: number;
};

export type BattleShield = {
  id: Identifier;
  sourceId: Identifier;
  sourceUnitId: Identifier;
  name: string;
  value: number;
  remainingSelfActions: number;
  createdAtTurn: number;
  metadata?: Record<string, unknown>;
};

export type BattleStatusKind =
  | 'poisoned'
  | 'burning'
  | 'stunned'
  | 'vulnerable'
  | 'charged'
  | 'custom';

export type BattleStatusTiming = 'instant' | 'turn-start' | 'turn-end' | 'after-action' | 'passive';

export type BattleStatus = {
  id: Identifier;
  key: StatusEffectKey | BattleStatusKind;
  name: string;
  sourceId: Identifier;
  sourceUnitId: Identifier;
  stacks: number;
  duration: number;
  remainingTurns: number;
  timing: BattleStatusTiming;
  dispellable: boolean;
  isControl: boolean;
  metadata?: Record<string, unknown>;
};

export type BattleLogEntryType =
  | 'action-start'
  | 'action-target'
  | 'action-resolution'
  | 'hit-check'
  | 'crit-check'
  | 'damage'
  | 'heal'
  | 'shield'
  | 'status-applied'
  | 'status-triggered'
  | 'status-expired'
  | 'burst-change'
  | 'unit-down'
  | 'battle-end'
  | 'system';

export type BattleLogEntry = {
  id: Identifier;
  turn: number;
  tick: number;
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

export type BattleRewardPayload = {
  shards: number;
  supply?: number;
  experience?: number;
  survivors: readonly {
    unitId: Identifier;
    templateId: Identifier;
    hp: number;
    maxHp: number;
    sp: number;
    maxSp: number;
    alive: boolean;
  }[];
  defeatedEnemyIds: readonly Identifier[];
  extra?: Record<string, unknown>;
};

export type BattleResultOutcome = 'victory' | 'defeat' | 'retreat' | 'ongoing';

export type BattleResult = {
  finished: boolean;
  outcome: BattleResultOutcome;
  winningSide: BattleSide | null;
  roundsElapsed: number;
  reward: BattleRewardPayload | null;
  survivorSnapshots: readonly BattleUnitSnapshot[];
  summary?: string;
};

export type BattleRandomContext = {
  unitId?: Identifier;
  actionId?: Identifier;
  phase?: string;
};

export type BattleRandomSource = {
  next(): number;
  nextInRange(min: number, max: number): number;
  factor(context?: BattleRandomContext): number;
};

export type BattleUnitTemplateSource = CharacterTemplate | PartyMember | EnemyTemplate;

export type BattleUnitState = {
  unitId: Identifier;
  templateId: Identifier;
  sourceInstanceId?: Identifier;
  name: string;
  title?: string;
  side: BattleSide;
  index: number;
  isLeader: boolean;
  isBoss: boolean;
  aiProfileId?: Identifier;
  realmTier: number;
  templateCategory: CharacterTemplate['identity']['category'];
  currentHp: number;
  maxHp: number;
  currentSp: number;
  maxSp: number;
  gauge: number;
  burst: number;
  derived: BattleDerivedStats;
  shields: readonly BattleShield[];
  statuses: readonly BattleStatus[];
  skillIds: readonly Identifier[];
  canAct: boolean;
  isStunned: boolean;
  isDead: boolean;
  hasActedThisRound: boolean;
  downedAtTurn?: number;
  runtime: {
    actionCount: number;
    receivedDamage: number;
    dealtDamage: number;
    healingDone: number;
    shieldGiven: number;
  };
  gaps?: {
    missingStatMappings: readonly string[];
    missingRuleBindings: readonly string[];
  };
};

export type BattlePartyState = {
  side: BattleSide;
  unitIds: readonly Identifier[];
  auraSourceUnitId: Identifier | null;
  totalAlive: number;
};

export type BattleState = {
  id: Identifier;
  battleId?: Identifier;
  seed?: string;
  turn: number;
  tick: number;
  queueVersion: number;
  realmGap: number;
  stagePreset: BattleStagePresetKey;
  stageModifiers: {
    partyToEnemy: BattleDamageScale;
    enemyToParty: BattleDamageScale;
  };
  party: BattlePartyState;
  enemy: BattlePartyState;
  units: readonly BattleUnitState[];
  logs: readonly BattleLogEntry[];
  result: BattleResult;
  rewardConfig: {
    baseShards: number;
    bonusSupply?: number;
    extra?: Record<string, unknown>;
  };
  random: BattleRandomSource;
  metadata?: Record<string, unknown>;
};

export type CreateBattleStateRewardConfig = {
  baseShards?: number;
  bonusSupply?: number;
  extra?: Record<string, unknown>;
};

export type CreateBattleStateInput = {
  battleId?: Identifier;
  seed?: string;
  party: readonly (PartyMember | CharacterTemplate)[];
  enemies: readonly EnemyTemplate[];
  skillTemplates: readonly SkillTemplate[];
  realmGap: number;
  random: BattleRandomSource;
  rewardConfig?: CreateBattleStateRewardConfig;
  metadata?: Record<string, unknown>;
};
