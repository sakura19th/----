import type { BattleDamageScale, BattleStagePresetKey } from '../../types';

export const STAGE_PRESETS: Record<BattleStagePresetKey, BattleDamageScale> = {
  R0: {
    damage: 1,
    taken: 1,
    control_out: 1,
    control_in: 1,
    heal_shield: 1,
  },
  R1: {
    damage: 1.25,
    taken: 0.8,
    control_out: 0.85,
    control_in: 0.85,
    heal_shield: 1.1,
  },
  R2: {
    damage: 1.7,
    taken: 0.45,
    control_out: 0.45,
    control_in: 0.35,
    heal_shield: 1.18,
  },
  R3: {
    damage: 2.4,
    taken: 0.2,
    control_out: 0.1,
    control_in: 0.1,
    heal_shield: 1.25,
  },
};

export function toStagePresetKey(realmGap: number): BattleStagePresetKey {
  const absoluteGap = Math.min(3, Math.abs(Math.trunc(realmGap)));

  if (absoluteGap <= 0) {
    return 'R0';
  }

  return `R${absoluteGap}` as BattleStagePresetKey;
}

export function resolveStageScale(realmGap: number): BattleDamageScale {
  const preset = STAGE_PRESETS[toStagePresetKey(realmGap)];

  if (realmGap >= 0) {
    return preset;
  }

  return {
    damage: preset.taken,
    taken: preset.damage,
    control_out: preset.control_in,
    control_in: preset.control_out,
    heal_shield: 1 / preset.heal_shield,
  };
}

export function getStageDamageNetMultiplier(realmGap: number) {
  const scale = resolveStageScale(realmGap);

  return scale.damage * scale.taken;
}

export function getStageControlNetMultiplier(realmGap: number) {
  const scale = resolveStageScale(realmGap);

  return scale.control_out * scale.control_in;
}
