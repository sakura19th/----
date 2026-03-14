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

export type SkillScalingStat = 'attack' | 'defense' | 'speed' | 'spirit' | 'patk' | 'matk' | 'healp';

export type SkillDamageType = 'physical' | 'magical' | 'pure';

export type SkillEffect = {
  type: SkillEffectType;
  ratio?: number;
  flat?: number;
  statusKey?: StatusEffectKey;
  duration?: number;
  stacks?: number;
  scalingStat?: SkillScalingStat;
  damageType?: SkillDamageType;
  extraCrit?: number;
  extraCritDamage?: number;
  burstGain?: number;
  metadata?: Record<string, unknown>;
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
