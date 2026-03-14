import type { BattleResult, BattleState, BattleTemplate } from './battle';
import type { PartyMember } from './character';
import type { EventChoice, EventNodeKind, EventTemplate } from './event';
import type { GameSnapshot, Identifier } from './game';

export type RunNodeStatus = 'locked' | 'available' | 'resolved';

export type RunNode = {
  id: Identifier;
  index: number;
  nodeType: EventNodeKind;
  refId: Identifier;
  status: RunNodeStatus;
};

export type RunMap = {
  chapter: number;
  nodes: readonly RunNode[];
};

export type RunResources = {
  shards: number;
  supply: number;
};

export type ResolvedNodeResult = {
  nodeId: Identifier;
  choiceId: Identifier;
  summary: string;
  battleResult?: BattleResult;
};

export type RunSaveMeta = {
  slotId: string;
  lastSavedAt: string | null;
  autoSaveCount: number;
};

export type RunScreen = 'title' | 'start' | 'map' | 'event' | 'recruit' | 'battle';

export type RunEncounterState = {
  nodeId: Identifier;
  eventId: Identifier;
  battleId?: Identifier;
  recruitId?: Identifier;
  battleState?: BattleState;
};

export type RunBattlePresentation = {
  battleId: Identifier;
  battleState: BattleState;
  awaitingUnitId: Identifier | null;
  selectedSkillId: Identifier | null;
  selectedTargetIds: readonly Identifier[];
};

export type RunPresentationState = {
  activeScreen: RunScreen;
  selectedNodeId: Identifier | null;
  pendingEncounter: RunEncounterState | null;
  currentEvent: EventTemplate | null;
  currentChoice: EventChoice | null;
  resultMessage: string | null;
  battleContext: RunBattlePresentation | null;
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
  completedNodeResults: readonly ResolvedNodeResult[];
  save: RunSaveMeta;
  presentation: RunPresentationState;
};
