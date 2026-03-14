import type {
  BaseAttributes,
  Identifier,
  RelationshipLevel,
  ResourcePool,
  TagSet,
  TemplateCategory,
  WeightedValue,
} from './game';

export type CharacterClass =
  | 'vanguard'
  | 'support'
  | 'scholar'
  | 'assassin'
  | 'guardian'
  | 'mystic';

export type PersonalityTag =
  | 'calm'
  | 'impulsive'
  | 'pragmatic'
  | 'idealistic'
  | 'arrogant'
  | 'kind'
  | 'suspicious'
  | 'loyal'
  | 'greedy'
  | 'pessimistic';

export type StatusEffectKey =
  | 'guarded'
  | 'burning'
  | 'poisoned'
  | 'stunned'
  | 'focused'
  | 'regen'
  | 'vulnerable'
  | 'shielded'
  | 'broken'
  | 'charged';

export type CharacterRole = 'frontline' | 'controller' | 'healer' | 'striker';

export type CharacterIdentity = {
  id: Identifier;
  name: string;
  title: string;
  archetypeId: Identifier;
  category: TemplateCategory;
};

export type CharacterNarrativeProfile = {
  background: string;
  speechStyle: string;
  personalities: TagSet<PersonalityTag>;
};

export type CharacterProgression = {
  level: number;
  xp: number;
  growthBias: WeightedValue<keyof BaseAttributes>;
};

export type CharacterStats = BaseAttributes &
  ResourcePool & {
    strength?: number;
    agility?: number;
    intelligence?: number;
    spiritPower?: number;
    charisma?: number;
    luck?: number;
  };

export type CharacterLoadout = {
  skillIds: readonly Identifier[];
  passiveEffectIds: readonly Identifier[];
};

export type CharacterTemplate = {
  identity: CharacterIdentity;
  classKey: CharacterClass;
  role: CharacterRole;
  rarity: 'common' | 'elite';
  stats: CharacterStats;
  loadout: CharacterLoadout;
  narrative: CharacterNarrativeProfile;
  recruitCost: number;
};

export type PartyMember = CharacterTemplate & {
  instanceId: Identifier;
  progression: CharacterProgression;
  currentRelationToLeader: RelationshipLevel;
  activeStatusEffects: readonly StatusEffectKey[];
};
