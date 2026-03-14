import {
  BATTLE_TEMPLATES,
  ENEMY_TEMPLATES,
  EVENT_TEMPLATES,
  HERO_ARCHETYPES,
  RECRUIT_ARCHETYPES,
} from '..';
import type { PartyMember, RunState } from '../../types';

function toPartyMember(template: (typeof HERO_ARCHETYPES | typeof RECRUIT_ARCHETYPES)[number], index: number): PartyMember {
  return {
    ...template,
    instanceId: `${template.identity.id}-instance-${index + 1}`,
    progression: {
      level: 1,
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
      { id: 'node-1', index: 1, nodeType: 'story', refId: 'event-broken-caravan', completed: true },
      { id: 'node-2', index: 2, nodeType: 'battle', refId: 'event-raider-trail', completed: false },
      { id: 'node-3', index: 3, nodeType: 'camp', refId: 'event-quiet-campfire', completed: false },
      { id: 'node-4', index: 4, nodeType: 'boss', refId: 'event-fallen-observatory', completed: false },
    ],
  },
  currentNodeId: 'node-2',
  resources: {
    shards: 28,
    supply: 2,
  },
  availableEvents: EVENT_TEMPLATES.slice(0, 4),
  availableBattles: BATTLE_TEMPLATES,
};

const mockEncounterEnemyIds = new Set<string>(BATTLE_TEMPLATES[0].enemyIds);

export const MOCK_ENCOUNTER_PREVIEW = ENEMY_TEMPLATES.filter((enemy) =>
  mockEncounterEnemyIds.has(enemy.identity.id),
);
