import { RECRUIT_ARCHETYPES } from '../../data';
import type { EventChoice, EventTemplate, PartyMember, RelationshipLevel, RunNode, RunState, StatusEffectKey } from '../../types';
import { applyResourceRewards } from '../reward/applyRewards';
import { buildRecruitMember } from './createRun';

function updatePartyStatuses(
  party: readonly PartyMember[],
  statusKey: StatusEffectKey,
  target: 'leader' | 'party',
): readonly PartyMember[] {
  return party.map((member, index) => {
    if (target === 'leader' && index !== 0) {
      return member;
    }

    if (member.activeStatusEffects.includes(statusKey)) {
      return member;
    }

    return {
      ...member,
      activeStatusEffects: [...member.activeStatusEffects, statusKey],
    };
  });
}

function updateRelationships(
  party: readonly PartyMember[],
  amount: number,
  target: 'leader' | 'party',
): readonly PartyMember[] {
  if (amount <= 0) {
    return party;
  }

  const relation: RelationshipLevel = 'support';

  return party.map((member, index) => {
    if (target === 'leader') {
      return index === 0 ? { ...member, currentRelationToLeader: relation } : member;
    }

    return { ...member, currentRelationToLeader: relation };
  });
}

function grantSkill(party: readonly PartyMember[], skillId: string, target: 'leader' | 'party') {
  return party.map((member, index) => {
    if (target === 'leader' && index !== 0) {
      return member;
    }

    if (member.loadout.skillIds.includes(skillId)) {
      return member;
    }

    return {
      ...member,
      loadout: {
        ...member.loadout,
        skillIds: [...member.loadout.skillIds, skillId],
      },
    };
  });
}

function getNextNodeId(nodes: readonly RunNode[], currentNodeIndex: number) {
  return nodes.find((node) => node.index === currentNodeIndex + 1)?.id ?? nodes[currentNodeIndex - 1]?.id ?? nodes[0]?.id;
}

function getResultMessage(event: EventTemplate, choice: EventChoice, recruitName?: string) {
  if (recruitName) {
    return `${choice.outcomeText} ${recruitName} 已加入队伍。`;
  }

  return `${event.text.title}：${choice.outcomeText}`;
}

export function resolveNode(run: RunState, nodeId: string, choiceId: string): RunState {
  const node = run.map.nodes.find((candidate) => candidate.id === nodeId);
  const event = run.availableEvents.find((candidate) => candidate.id === node?.refId);

  if (!node || !event) {
    return run;
  }

  const choice = event.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) {
    return run;
  }

  let nextParty = [...run.party];
  let nextShards = run.resources.shards;
  const nextSupply = run.resources.supply;
  let pendingBattleId: string | undefined;
  let pendingRecruitId: string | undefined;
  let recruitedName: string | undefined;

  for (const effect of choice.effects) {
    switch (effect.type) {
      case 'grant-resource': {
        if (effect.resource === 'shards') {
          nextShards += effect.amount;
        } else if (effect.resource === 'hp') {
          const rewardResult = applyResourceRewards(nextParty, { hp: effect.amount });
          nextParty = [...rewardResult.party];
        } else if (effect.resource === 'sp') {
          const rewardResult = applyResourceRewards(nextParty, { sp: effect.amount });
          nextParty = [...rewardResult.party];
        }
        break;
      }
      case 'modify-relationship': {
        nextParty = [...updateRelationships(nextParty, effect.amount, effect.target)];
        break;
      }
      case 'grant-status': {
        nextParty = [...updatePartyStatuses(nextParty, effect.statusKey, effect.target)];
        break;
      }
      case 'unlock-battle': {
        pendingBattleId = effect.battleId;
        break;
      }
      case 'unlock-recruit': {
        pendingRecruitId = effect.archetypeId;
        break;
      }
      case 'grant-skill': {
        nextParty = [...grantSkill(nextParty, effect.skillId, effect.target)];
        break;
      }
    }
  }

  if (pendingRecruitId) {
    const recruit = buildRecruitMember(pendingRecruitId, nextParty.length);
    if (recruit && !nextParty.some((member) => member.identity.id === recruit.identity.id)) {
      nextParty.push(recruit);
      nextShards = Math.max(0, nextShards - recruit.recruitCost);
      recruitedName = recruit.identity.name;
    }
  }

  const currentIndex = run.map.nodes.findIndex((candidate) => candidate.id === nodeId) + 1;
  const nextNodeId = getNextNodeId(run.map.nodes, currentIndex);

  return {
    ...run,
    leader: nextParty[0],
    party: nextParty,
    currentNodeId: nextNodeId,
    resources: {
      shards: nextShards,
      supply: nextSupply,
    },
    map: {
      ...run.map,
      nodes: run.map.nodes.map((candidate) => {
        if (candidate.id === nodeId) {
          return { ...candidate, status: 'resolved' };
        }

        if (candidate.id === nextNodeId && candidate.status === 'locked') {
          return { ...candidate, status: 'available' };
        }

        return candidate;
      }),
    },
    completedNodeResults: [
      ...run.completedNodeResults,
      {
        nodeId,
        choiceId,
        summary: getResultMessage(event, choice, recruitedName),
      },
    ],
    presentation: {
      activeScreen: 'map',
      selectedNodeId: nextNodeId,
      pendingEncounter: pendingBattleId || pendingRecruitId ? { nodeId, eventId: event.id, battleId: pendingBattleId, recruitId: pendingRecruitId } : null,
      currentEvent: null,
      currentChoice: choice,
      resultMessage: getResultMessage(event, choice, recruitedName),
    },
  };
}

export function getResolvableEvent(run: RunState, nodeId: string): EventTemplate | null {
  const node = run.map.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return null;
  }

  return run.availableEvents.find((candidate) => candidate.id === node.refId) ?? null;
}

export function getRecruitTemplate(recruitId: string) {
  return RECRUIT_ARCHETYPES.find((candidate) => candidate.identity.id === recruitId) ?? null;
}
