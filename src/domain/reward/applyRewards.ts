import type { BattleRewardPayload, PartyMember } from '../../types';
import { deriveCombatStats } from '../formulas/deriveCombatStats';

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

/**
 * 用公式计算成员的 maxHp / maxSp（与战斗中一致）。
 */
function getMemberResourceCaps(member: PartyMember) {
  const derived = deriveCombatStats({
    ...member.stats,
    level: member.progression?.level ?? 1,
  });
  return { maxHp: derived.maxHp, maxSp: derived.maxSp };
}

function applyBattleSurvivorState(party: readonly PartyMember[], battleReward: BattleRewardPayload | null | undefined) {
  if (!battleReward) {
    return party;
  }

  const survivorByInstanceId = new Map(
    battleReward.survivors
      .filter((survivor): survivor is typeof survivor & { sourceInstanceId: string } => Boolean(survivor.sourceInstanceId))
      .map((survivor) => [survivor.sourceInstanceId, survivor]),
  );
  const survivorByUnitId = new Map(battleReward.survivors.map((survivor) => [survivor.unitId, survivor]));
  const survivorByTemplateId = new Map(battleReward.survivors.map((survivor) => [survivor.templateId, survivor]));

  return party.map((member) => {
    const survivor = survivorByInstanceId.get(member.instanceId)
      ?? survivorByUnitId.get(member.instanceId)
      ?? survivorByTemplateId.get(member.identity.id);
    if (!survivor) {
      return member;
    }

    // 战斗后直接使用公式体系的值回写到 stats
    // survivor.hp / survivor.maxHp 就是战斗公式体系的值
    const caps = getMemberResourceCaps(member);

    return {
      ...member,
      stats: {
        ...member.stats,
        hp: clamp(survivor.hp, 0, caps.maxHp),
        maxHp: caps.maxHp,
        sp: clamp(survivor.sp, 0, caps.maxSp),
        maxSp: caps.maxSp,
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
  const nextParty = battlePatchedParty.map((member) => {
    const caps = getMemberResourceCaps(member);
    const currentHp = member.stats.hp ?? caps.maxHp;
    const currentSp = member.stats.sp ?? caps.maxSp;

    return {
      ...member,
      stats: {
        ...member.stats,
        hp: rewards.hp === undefined ? currentHp : clamp(currentHp + rewards.hp, 0, caps.maxHp),
        maxHp: caps.maxHp,
        sp: rewards.sp === undefined ? currentSp : clamp(currentSp + rewards.sp, 0, caps.maxSp),
        maxSp: caps.maxSp,
      },
    };
  });

  return {
    party: nextParty,
    gainedShards: (rewards.shards ?? 0) + (rewards.battleReward?.shards ?? 0),
    gainedSupply: (rewards.supply ?? 0) + (rewards.battleReward?.supply ?? 0),
  };
}
