export const SHIELD_MIN = 0;
export const MAX_ACTIVE_SHIELDS = 3;
export const DEFAULT_SHIELD_SELF_ACTIONS = 3;

export type ShieldFormulaInput = {
  healPower: number;
  skillRate: number;
  flatShield?: number;
  finalBonus?: number;
  stageHealShieldMultiplier?: number;
};

function toFiniteNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function calculateShield(input: ShieldFormulaInput) {
  const flatShield = toFiniteNumber(input.flatShield, 0);
  const finalBonus = toFiniteNumber(input.finalBonus, 1);
  const stageHealShieldMultiplier = toFiniteNumber(input.stageHealShieldMultiplier, 1);

  return Math.max(
    SHIELD_MIN,
    Math.floor((input.healPower * input.skillRate + flatShield) * finalBonus * stageHealShieldMultiplier),
  );
}
