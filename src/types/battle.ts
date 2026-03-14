import type { CharacterTemplate, StatusEffectKey } from './character';
import type { SkillTemplate } from './skill';
import type { Identifier } from './game';

export type BattleActionType = 'attack' | 'skill' | 'guard' | 'item' | 'wait';

export type BattleSide = 'party' | 'enemy';

export type BattleUnitSnapshot = {
  unitId: Identifier;
  name: string;
  side: BattleSide;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  speed: number;
  statuses: readonly StatusEffectKey[];
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
