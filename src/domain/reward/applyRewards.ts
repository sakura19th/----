import type { PartyMember } from '../../types';

export type ResourceRewardInput = {
  shards?: number;
  hp?: number;
  sp?: number;
  supply?: number;
};

export type RewardApplicationResult = {
  party: readonly PartyMember[];
  gainedShards: number;
  gainedSupply: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function applyResourceRewards(
  party: readonly PartyMember[],
  rewards: ResourceRewardInput,
): RewardApplicationResult {
  const nextParty = party.map((member) => ({
    ...member,
    stats: {
      ...member.stats,
      hp: rewards.hp === undefined ? member.stats.hp : clamp(member.stats.hp + rewards.hp, 1, member.stats.maxHp),
      sp: rewards.sp === undefined ? member.stats.sp : clamp(member.stats.sp + rewards.sp, 0, member.stats.maxSp),
    },
  }));

  return {
    party: nextParty,
    gainedShards: rewards.shards ?? 0,
    gainedSupply: rewards.supply ?? 0,
  };
}
