export const HIT_CHANCE_MIN = 72;
export const HIT_CHANCE_MAX = 98;
export const CRIT_CHANCE_MIN = 0;
export const CRIT_CHANCE_MAX = 95;
export const DAMAGE_FLOOR = 1;

export type HitChanceInput = {
  HIT: number;
  EVA: number;
};

export type CritChanceInput = {
  CRIT: number;
  skillExtraCrit?: number;
};

export type CritMultiplierInput = {
  CDMG: number;
  skillExtraCritDamage?: number;
  didCrit: boolean;
};

export type DamageFormulaInput = {
  attack: number;
  defense: number;
  skillRate: number;
  randomFactor?: number;
  finalBonus?: number;
  critMultiplier?: number;
  stageDamageMultiplier?: number;
  stageTakenMultiplier?: number;
};

export type DamageFormulaResult = {
  mitigated: number;
  finalDamageRaw: number;
  finalDamage: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toFiniteNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function calculateHitChance(input: HitChanceInput) {
  return clamp(90 + input.HIT - input.EVA, HIT_CHANCE_MIN, HIT_CHANCE_MAX);
}

export function calculateCritChance(input: CritChanceInput) {
  return clamp(input.CRIT + toFiniteNumber(input.skillExtraCrit, 0), CRIT_CHANCE_MIN, CRIT_CHANCE_MAX);
}

export function calculateCritMultiplier(input: CritMultiplierInput) {
  if (!input.didCrit) {
    return 1;
  }

  return (input.CDMG + toFiniteNumber(input.skillExtraCritDamage, 0)) / 100;
}

export function calculateDamage(input: DamageFormulaInput): DamageFormulaResult {
  const mitigated = Math.max(0, input.attack * input.skillRate - input.defense);
  const randomFactor = toFiniteNumber(input.randomFactor, 1);
  const finalBonus = toFiniteNumber(input.finalBonus, 1);
  const critMultiplier = toFiniteNumber(input.critMultiplier, 1);
  const stageDamageMultiplier = toFiniteNumber(input.stageDamageMultiplier, 1);
  const stageTakenMultiplier = toFiniteNumber(input.stageTakenMultiplier, 1);
  const finalDamageRaw = mitigated * randomFactor * finalBonus * critMultiplier * stageDamageMultiplier * stageTakenMultiplier;

  return {
    mitigated,
    finalDamageRaw,
    finalDamage: Math.max(DAMAGE_FLOOR, Math.floor(finalDamageRaw)),
  };
}
