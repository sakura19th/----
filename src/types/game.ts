export type Identifier = string;

export type TemplateCategory = 'hero' | 'recruit' | 'enemy' | 'boss';

export type Rarity = 'common' | 'elite' | 'boss';

export type RelationshipLevel = 'support' | 'neutral' | 'dislike';

export type ResourcePool = {
  hp?: number;
  maxHp?: number;
  sp?: number;
  maxSp?: number;
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

export type GameStage = 'stage0' | 'stage1' | 'stage2';

export type AppFlowPhase = 'title' | 'characterCreation' | 'hub' | 'worldSelect' | 'worldTransition' | 'worldRun' | 'result';

export type PlayerTrait = 'steady' | 'reckless' | 'insightful';

export type PlayerCreationForm = {
  name: string;
  heroId: Identifier;
  trait: PlayerTrait;
};

export type PlayerProfile = {
  playerId: Identifier;
  name: string;
  heroId: Identifier;
  trait: PlayerTrait;
  createdAt: number;
};

export type HubDialogueLine = {
  id: Identifier;
  speaker: 'system' | 'lord-god' | 'guide';
  text: string;
};

export type WorldDefinition = {
  id: Identifier;
  title: string;
  subtitle: string;
  description: string;
  difficultyLabel: string;
  estimatedDuration: string;
  unlockStatus: 'available' | 'locked';
  introText: string;
  flowId: Identifier;
};

export type WorldEntryContext = {
  runId: Identifier;
  worldId: Identifier;
  flowId: Identifier;
  selectedAt: number;
  playerProfile: PlayerProfile;
};

export type GameSnapshot = {
  stage: GameStage;
  version: string;
  seed: SeedInfo;
};
