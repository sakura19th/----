export const HEAL_MIN = 0;

export type HealFormulaInput = {
  healPower: number;
  skillRate: number;
  finalBonus?: number;
  stageHealShieldMultiplier?: number;
};

export type ActualHealInput = {
  targetCurrentHp: number;
  targetMaxHp: number;
  finalHeal: number;
};

function toFiniteNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function calculateHeal(input: HealFormulaInput) {
  const finalBonus = toFiniteNumber(input.finalBonus, 1);
  const stageHealShieldMultiplier = toFiniteNumber(input.stageHealShieldMultiplier, 1);
  const finalHeal = Math.max(
    HEAL_MIN,
    Math.floor(input.healPower * input.skillRate * finalBonus * stageHealShieldMultiplier),
  );

  return finalHeal;
}

export function calculateActualHeal(input: ActualHealInput) {
  const missingHp = Math.max(0, input.targetMaxHp - input.targetCurrentHp);

  return Math.min(missingHp, Math.max(HEAL_MIN, Math.floor(input.finalHeal)));
}
