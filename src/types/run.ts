import type { BattleTemplate } from './battle';
import type { PartyMember } from './character';
import type { EventTemplate, EventNodeKind } from './event';
import type { GameSnapshot, Identifier } from './game';

export type RunNode = {
  id: Identifier;
  index: number;
  nodeType: EventNodeKind;
  refId: Identifier;
  completed: boolean;
};

export type RunMap = {
  chapter: number;
  nodes: readonly RunNode[];
};

export type RunResources = {
  shards: number;
  supply: number;
};

export type RunState = {
  snapshot: GameSnapshot;
  leader: PartyMember;
  party: readonly PartyMember[];
  map: RunMap;
  currentNodeId: Identifier;
  resources: RunResources;
  availableEvents: readonly EventTemplate[];
  availableBattles: readonly BattleTemplate[];
};
