import { BATTLE_TEMPLATES, EVENT_TEMPLATES, HERO_ARCHETYPES, RECRUIT_ARCHETYPES } from '../../data';
import type { CharacterTemplate, PartyMember, RunState } from '../../types';
import { deriveCombatStats } from '../formulas/deriveCombatStats';
import { generateMap } from './generateMap';

export type CreateRunInput = {
  heroId?: string;
  seed?: string;
  playerName?: string;
  worldName?: string;
};

function computeResourceStats(template: CharacterTemplate, level: number) {
  const derived = deriveCombatStats({
    ...template.stats,
    level,
  });
  return {
    hp: derived.maxHp,
    maxHp: derived.maxHp,
    sp: derived.maxSp,
    maxSp: derived.maxSp,
  };
}

function toPartyMember(template: CharacterTemplate, index: number, playerName?: string): PartyMember {
  const level = 1;
  const resources = computeResourceStats(template, level);
  const identityName = index === 0 && playerName ? playerName : template.identity.name;

  return {
    ...template,
    identity: {
      ...template.identity,
      name: identityName,
    },
    stats: {
      ...template.stats,
      ...resources,
    },
    instanceId: `${template.identity.id}-run-${index + 1}`,
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

function buildSeed(seed?: string) {
  return seed ?? `RUN-${Date.now()}`;
}

export function createRun(input: CreateRunInput = {}): RunState {
  const leaderTemplate = HERO_ARCHETYPES.find((hero) => hero.identity.id === input.heroId) ?? HERO_ARCHETYPES[0];
  const leader = toPartyMember(leaderTemplate, 0, input.playerName);
  const map = generateMap();
  const firstNode = map.nodes.find((node) => node.status === 'available') ?? map.nodes[0];

  return {
    snapshot: {
      stage: 'stage2',
      version: '0.6.0-single-loop',
      seed: {
        runSeed: buildSeed(input.seed),
        worldShard: input.worldName ?? '废弃前哨站',
      },
    },
    leader,
    party: [leader],
    map,
    currentNodeId: firstNode.id,
    resources: {
      shards: 20,
      supply: 3,
    },
    availableEvents: EVENT_TEMPLATES,
    availableBattles: BATTLE_TEMPLATES,
    completedNodeResults: [],
    result: null,
    save: {
      slotId: 'autosave-stage5',
      lastSavedAt: null,
      autoSaveCount: 0,
    },
    presentation: {
      activeScreen: 'map',
      selectedNodeId: firstNode.id,
      pendingEncounter: null,
      currentEvent: null,
      currentChoice: null,
      resultMessage: null,
      battleContext: null,
    },
  };
}

export function buildRecruitMember(archetypeId: string, currentPartySize: number): PartyMember | null {
  const template = RECRUIT_ARCHETYPES.find((candidate) => candidate.identity.id === archetypeId);
  if (!template) {
    return null;
  }

  return toPartyMember(template, currentPartySize);
}
