import type { CharacterClass, StatusEffectKey } from './character';
import type { Identifier, LocalizedText } from './game';

export type SkillTargetType = 'self' | 'ally' | 'enemy' | 'all-allies' | 'all-enemies';

export type SkillEffectType =
  | 'damage'
  | 'heal'
  | 'shield'
  | 'apply-status'
  | 'cleanse'
  | 'gain-sp';

export type SkillScalingStat = 'attack' | 'defense' | 'speed' | 'spirit';

export type SkillEffect = {
  type: SkillEffectType;
  ratio?: number;
  flat?: number;
  statusKey?: StatusEffectKey;
  duration?: number;
  stacks?: number;
};

export type SkillTemplate = {
  id: Identifier;
  key: string;
  name: string;
  classKey: CharacterClass;
  cost: number;
  cooldown: number;
  target: SkillTargetType;
  effects: readonly SkillEffect[];
  text: LocalizedText;
  tags: readonly string[];
};
