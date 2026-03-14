export const ATB_INITIAL_GAUGE = 0;
export const ATB_THRESHOLD = 1000;
export const ATB_SOFT_CAP = 220;
export const ATB_SOFT_CAP_SLOPE = 0.5;

export type AtbTickInput = {
  rawSpeed: number;
  gauge: number;
  gaugeBonus?: number;
};

export type AtbTickResult = {
  effectiveSpeed: number;
  gaugeGain: number;
  gaugeAfterTick: number;
  actionsReady: number;
  gaugeRemainder: number;
};

function toFiniteNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function calculateEffectiveSpeed(rawSpeed: number) {
  const safeRawSpeed = Math.max(0, rawSpeed);

  return Math.min(ATB_SOFT_CAP, safeRawSpeed) + Math.max(0, safeRawSpeed - ATB_SOFT_CAP) * ATB_SOFT_CAP_SLOPE;
}

export function calculateGaugeGain(rawSpeed: number, gaugeBonus = 1) {
  return calculateEffectiveSpeed(rawSpeed) * toFiniteNumber(gaugeBonus, 1);
}

export function advanceAtbGauge(input: AtbTickInput): AtbTickResult {
  const effectiveSpeed = calculateEffectiveSpeed(input.rawSpeed);
  const gaugeGain = effectiveSpeed * toFiniteNumber(input.gaugeBonus, 1);
  const gaugeAfterTick = Math.max(0, input.gauge) + gaugeGain;
  const actionsReady = Math.floor(gaugeAfterTick / ATB_THRESHOLD);
  const gaugeRemainder = gaugeAfterTick - actionsReady * ATB_THRESHOLD;

  return {
    effectiveSpeed,
    gaugeGain,
    gaugeAfterTick,
    actionsReady,
    gaugeRemainder,
  };
}
