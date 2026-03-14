import type { PersonalityTag } from './character';
import type { Identifier } from './game';

export type AIBehaviorStyle = 'aggressive' | 'defensive' | 'tactical' | 'supportive';

export type AIProfile = {
  id: Identifier;
  key: string;
  displayName: string;
  behaviorStyle: AIBehaviorStyle;
  preferredSkillTags: readonly string[];
  personalityBias: readonly PersonalityTag[];
};
