export type Identifier = string;

export type TemplateCategory = 'hero' | 'recruit' | 'enemy' | 'boss';

export type Rarity = 'common' | 'elite' | 'boss';

export type RelationshipLevel = 'support' | 'neutral' | 'dislike';

export type ResourcePool = {
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
};

export type BaseAttributes = {
  attack: number;
  defense: number;
  speed: number;
  spirit: number;
};

export type WeightedValue<T extends string> = {
  value: T;
  weight: number;
};

export type TagSet<T extends string> = readonly T[];

export type LocalizedText = {
  title: string;
  description: string;
};

export type ChoiceText = {
  label: string;
  detail?: string;
};

export type SeedInfo = {
  runSeed: string;
  worldShard: string;
};

export type GameStage = 'stage0' | 'stage1';

export type GameSnapshot = {
  stage: GameStage;
  version: string;
  seed: SeedInfo;
};
