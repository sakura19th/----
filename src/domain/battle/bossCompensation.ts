export type BossCompensationInput = {
  bossSideCount: number;
  enemyCount: number;
};

export type BossCompensation = {
  enemyCountAdvantage: number;
  hpBonus: number;
  statusResistBonus: number;
  actionGaugeBonus: number;
};

export function calculateBossCompensation(input: BossCompensationInput): BossCompensation {
  const enemyCountAdvantage = Math.max(0, input.enemyCount - input.bossSideCount);

  return {
    enemyCountAdvantage,
    hpBonus: 1 + 0.35 * enemyCountAdvantage,
    statusResistBonus: 1 + 0.2 * enemyCountAdvantage,
    actionGaugeBonus: 1 + 0.15 * enemyCountAdvantage,
  };
}
