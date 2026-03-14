import {
  BATTLE_TEMPLATES,
  ENEMY_TEMPLATES,
  EVENT_TEMPLATES,
  HERO_ARCHETYPES,
  RECRUIT_ARCHETYPES,
} from '..';
import type { CharacterTemplate, PartyMember, RunState } from '../../types';
import { deriveCombatStats } from '../../domain/formulas/deriveCombatStats';

function toPartyMember(template: CharacterTemplate, index: number): PartyMember {
  const level = 1;
  const derived = deriveCombatStats({ ...template.stats, level });

  return {
    ...template,
    stats: {
      ...template.stats,
      hp: derived.maxHp,
      maxHp: derived.maxHp,
      sp: derived.maxSp,
      maxSp: derived.maxSp,
    },
    instanceId: `${template.identity.id}-instance-${index + 1}`,
    progression: {
      level,
      xp: 0,
      growthBias: {
        value: 'attack',
        weight: 1,
      },
    },
    currentRelationToLeader: index === 0 ? 'support' : 'neutral',
    activeStatusEffects: [],
  };
}

const leader = toPartyMember(HERO_ARCHETYPES[0], 0);
const recruitA = toPartyMember(RECRUIT_ARCHETYPES[1], 1);
const recruitB = toPartyMember(RECRUIT_ARCHETYPES[2], 2);

export const MOCK_RUN_STATE: RunState = {
  snapshot: {
    stage: 'stage1',
    version: '0.1.0-stage1',
    seed: {
      runSeed: 'STAGE1-MOCK-001',
      worldShard: '碎片世界-北境回廊',
    },
  },
  leader,
  party: [leader, recruitA, recruitB],
  map: {
    chapter: 1,
    nodes: [
      { id: 'node-1', index: 1, nodeType: 'story', refId: 'event-broken-caravan', status: 'resolved' },
      { id: 'node-2', index: 2, nodeType: 'battle', refId: 'event-raider-trail', status: 'available' },
      { id: 'node-3', index: 3, nodeType: 'camp', refId: 'event-quiet-campfire', status: 'locked' },
      { id: 'node-4', index: 4, nodeType: 'boss', refId: 'event-fallen-observatory', status: 'locked' },
    ],
  },
  currentNodeId: 'node-2',
  resources: {
    shards: 28,
    supply: 2,
  },
  availableEvents: EVENT_TEMPLATES.slice(0, 4),
  availableBattles: BATTLE_TEMPLATES,
  completedNodeResults: [
    {
      nodeId: 'node-1',
      choiceId: 'choice-search-supplies',
      summary: 'Stage1 mock：断裂商队节点已作为已完成占位。',
    },
  ],
  result: null,
  save: {
    slotId: 'stage1-mock-slot',
    lastSavedAt: null,
    autoSaveCount: 0,
  },
  presentation: {
    activeScreen: 'map',
    selectedNodeId: 'node-2',
    pendingEncounter: null,
    currentEvent: null,
    currentChoice: null,
    resultMessage: 'Stage1 mock 数据仍保留，供向后兼容展示或验证使用。',
    battleContext: null,
  },
};

const mockEncounterEnemyIds = new Set<string>(BATTLE_TEMPLATES[0].enemyIds);

export const MOCK_ENCOUNTER_PREVIEW = ENEMY_TEMPLATES.filter((enemy) =>
  mockEncounterEnemyIds.has(enemy.identity.id),
);
