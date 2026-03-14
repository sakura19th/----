import type { PersonalityTag, StatusEffectKey } from './character';
import type { Identifier, LocalizedText } from './game';

export type EventNodeKind = 'story' | 'battle' | 'recruit' | 'camp' | 'boss';

export type EventEffect =
  | { type: 'grant-resource'; resource: 'hp' | 'sp' | 'shards'; amount: number }
  | { type: 'modify-relationship'; amount: number; target: 'leader' | 'party' }
  | { type: 'grant-status'; statusKey: StatusEffectKey; duration: number; target: 'leader' | 'party' }
  | { type: 'unlock-battle'; battleId: Identifier }
  | { type: 'unlock-recruit'; archetypeId: Identifier }
  | { type: 'grant-skill'; skillId: Identifier; target: 'leader' | 'party' };

export type EventChoiceCondition = {
  minimumShards?: number;
  requiredPersonality?: PersonalityTag;
};

export type EventChoice = {
  id: Identifier;
  text: string;
  outcomeText: string;
  conditions?: EventChoiceCondition;
  effects: readonly EventEffect[];
};

export type EventTemplate = {
  id: Identifier;
  key: string;
  nodeType: EventNodeKind;
  text: LocalizedText;
  tags: readonly string[];
  choices: readonly EventChoice[];
};
