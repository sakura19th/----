import type {
  BattleActionType,
  CharacterClass,
  EventNodeKind,
  PersonalityTag,
  RelationshipLevel,
  StatusEffectKey,
} from '../../types';

export const CHARACTER_CLASSES = [
  'vanguard',
  'support',
  'scholar',
  'assassin',
  'guardian',
  'mystic',
] as const satisfies readonly CharacterClass[];

export const PERSONALITY_TAGS = [
  'calm',
  'impulsive',
  'pragmatic',
  'idealistic',
  'arrogant',
  'kind',
  'suspicious',
  'loyal',
  'greedy',
  'pessimistic',
] as const satisfies readonly PersonalityTag[];

export const STATUS_EFFECT_KEYS = [
  'guarded',
  'burning',
  'poisoned',
  'stunned',
  'focused',
  'regen',
  'vulnerable',
  'shielded',
] as const satisfies readonly StatusEffectKey[];

export const BATTLE_ACTION_TYPES = [
  'attack',
  'skill',
  'guard',
  'item',
  'wait',
] as const satisfies readonly BattleActionType[];

export const NODE_TYPES = [
  'story',
  'battle',
  'recruit',
  'camp',
  'boss',
] as const satisfies readonly EventNodeKind[];

export const RELATIONSHIP_LEVELS = [
  'support',
  'neutral',
  'dislike',
] as const satisfies readonly RelationshipLevel[];
