/**
 * 共享的战斗属性公式计算模块。
 * 从 6 大基础属性（attack, defense, speed, spirit + 扩展属性）推导出所有战斗/资源数值。
 * 供角色创建、战斗初始化、UI 显示等多处复用。
 */

import type { BattleDerivedStats } from '../../types';

export type DeriveStatsInput = {
  attack: number;
  defense: number;
  speed: number;
  spirit: number;
  strength?: number;
  agility?: number;
  intelligence?: number;
  spiritPower?: number;
  charisma?: number;
  luck?: number;
  level?: number;
};

function safeStat(value: number | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function floorMin(value: number, min: number) {
  return Math.max(min, Math.floor(value));
}

/**
 * 从基础属性推导完整战斗属性（包括 maxHp / maxSp）。
 */
export function deriveCombatStats(input: DeriveStatsInput): BattleDerivedStats {
  const strength = safeStat(input.strength, input.attack);
  const agility = safeStat(input.agility, input.speed);
  const intelligence = safeStat(input.intelligence, input.spirit);
  const spirit = safeStat(input.spiritPower, input.spirit);
  const charisma = safeStat(input.charisma, spirit);
  const luck = safeStat(input.luck, 0);
  const level = safeStat(input.level, 1);

  const maxHp = floorMin(100 + strength * 9 + spirit * 5 + level * 4, 1);
  const maxSp = floorMin(40 + intelligence * 4 + spirit * 8 + level * 2, 0);
  const PATK = floorMin(10 + strength * 2.6 + agility * 0.7 + level * 0.5, 0);
  const MATK = floorMin(10 + intelligence * 2.6 + spirit * 0.8 + level * 0.5, 0);
  const PDEF = floorMin(5 + strength * 1.2 + agility * 0.5 + level * 0.3, 0);
  const MDEF = floorMin(5 + spirit * 1.6 + intelligence * 0.6 + level * 0.3, 0);
  const SPD = floorMin(80 + agility * 2.2 + spirit * 0.3 + luck * 0.2, 1);
  const HIT = floorMin(100 + agility * 1 + intelligence * 0.4 + level * 0.2, 1);
  const EVA = floorMin(agility * 0.9 + luck * 0.6 + level * 0.1, 0);
  const CRIT = 5 + agility * 0.08 + luck * 0.18;
  const CDMG = 150 + strength * 0.12 + intelligence * 0.12 + luck * 0.1;
  const AACC = 100 + intelligence * 0.8 + spirit * 0.8 + charisma * 0.6 + luck * 0.2;
  const ARES = 100 + spirit * 1.2 + charisma * 0.5 + luck * 0.3;
  const HEALP = floorMin(spirit * 1.8 + intelligence * 0.7 + charisma * 0.7, 0);
  const LEAD = floorMin(charisma * 1.8 + spirit * 0.6 + luck * 0.2, 0);
  const TeamAuraBonus = 1 + Math.min(0.2, LEAD / 1000);
  const SummonInheritance = 0.5 + Math.min(0.35, LEAD / 1000);
  const SPRegenPerAction = 0; // SP 回复机制已移除

  return {
    maxHp,
    maxSp,
    PATK,
    MATK,
    PDEF,
    MDEF,
    SPD,
    HIT,
    EVA,
    CRIT,
    CDMG,
    AACC,
    ARES,
    HEALP,
    LEAD,
    TeamAuraBonus,
    SummonInheritance,
    SPRegenPerAction,
  };
}

/**
 * 快速计算 maxHp / maxSp，用于非战斗界面的轻量显示。
 */
export function deriveResourceCaps(input: DeriveStatsInput): { maxHp: number; maxSp: number } {
  const derived = deriveCombatStats(input);
  return { maxHp: derived.maxHp, maxSp: derived.maxSp };
}
