import type { BattleRewardPayload, PartyMember } from '../../types';

export type ResourceRewardInput = {
  shards?: number;
  hp?: number;
  sp?: number;
  supply?: number;
  battleReward?: BattleRewardPayload | null;
};

export type RewardApplicationResult = {
  party: readonly PartyMember[];
  gainedShards: number;
  gainedSupply: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function applyBattleSurvivorState(party: readonly PartyMember[], battleReward: BattleRewardPayload | null | undefined) {
  if (!battleReward) {
    return party;
  }

  const survivorMap = new Map(battleReward.survivors.map((survivor) => [survivor.templateId, survivor]));
  return party.map((member) => {
    const survivor = survivorMap.get(member.identity.id);
    if (!survivor) {
      return member;
    }

    return {
      ...member,
      stats: {
        ...member.stats,
        hp: clamp(survivor.hp, 0, survivor.maxHp),
        maxHp: survivor.maxHp,
        sp: clamp(survivor.sp, 0, survivor.maxSp),
        maxSp: survivor.maxSp,
      },
      activeStatusEffects: survivor.alive ? member.activeStatusEffects : [],
    };
  });
}

export function applyResourceRewards(
  party: readonly PartyMember[],
  rewards: ResourceRewardInput,
): RewardApplicationResult {
  const battlePatchedParty = applyBattleSurvivorState(party, rewards.battleReward);
  const nextParty = battlePatchedParty.map((member) => ({
    ...member,
    stats: {
      ...member.stats,
      hp: rewards.hp === undefined ? member.stats.hp : clamp(member.stats.hp + rewards.hp, 0, member.stats.maxHp),
      sp: rewards.sp === undefined ? member.stats.sp : clamp(member.stats.sp + rewards.sp, 0, member.stats.maxSp),
    },
  }));

  return {
    party: nextParty,
    gainedShards: (rewards.shards ?? 0) + (rewards.battleReward?.shards ?? 0),
    gainedSupply: (rewards.supply ?? 0) + (rewards.battleReward?.supply ?? 0),
  };
}
