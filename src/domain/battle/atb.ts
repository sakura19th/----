export const ATB_INITIAL_GAUGE = 0;
export const ATB_THRESHOLD = 1000;
export const ATB_SOFT_CAP = 220;
export const ATB_SOFT_CAP_SLOPE = 0.5;
export const ATB_TARGET_ACTION_SECONDS = 4;
export const ATB_TICK_MS = 100;
export const ATB_TICKS_PER_ACTION = Math.round((ATB_TARGET_ACTION_SECONDS * 1000) / ATB_TICK_MS);
export const ATB_ACTION_MIN_INTERVAL_MS = 650;
export const ATB_ACTION_ANIMATION_MS = 900;

export type AtbTickInput = {
  rawSpeed: number;
  gauge: number;
  gaugeBonus?: number;
};

export type AtbTimelineUnit = {
  unitId: string;
  rawSpeed: number;
  gauge: number;
  gaugeBonus?: number;
  canAct?: boolean;
  isDead?: boolean;
};

export type AtbTickResult = {
  effectiveSpeed: number;
  gaugeGain: number;
  gaugeAfterTick: number;
  actionsReady: number;
  gaugeRemainder: number;
};

export type AtbTimelineProfile = {
  averageEffectiveSpeed: number;
  baselineGaugeGainPerTick: number;
  targetTicksPerAction: number;
  targetActionSeconds: number;
  tickMs: number;
};

export type AtbTimelineAdvanceResult = {
  profile: AtbTimelineProfile;
  advancedUnits: readonly {
    unitId: string;
    effectiveSpeed: number;
    gaugeBefore: number;
    gaugeGain: number;
    gaugeAfterTick: number;
    gaugeAfterClamp: number;
    isReady: boolean;
  }[];
  readyUnitIds: readonly string[];
};

function toFiniteNumber(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function calculateEffectiveSpeed(rawSpeed: number) {
  const safeRawSpeed = Math.max(0, rawSpeed);

  return Math.min(ATB_SOFT_CAP, safeRawSpeed) + Math.max(0, safeRawSpeed - ATB_SOFT_CAP) * ATB_SOFT_CAP_SLOPE;
}

export function createAtbTimelineProfile(units: readonly Pick<AtbTimelineUnit, 'rawSpeed' | 'canAct' | 'isDead'>[]): AtbTimelineProfile {
  const activeSpeeds = units
    .filter((unit) => !unit.isDead && unit.canAct !== false)
    .map((unit) => calculateEffectiveSpeed(unit.rawSpeed))
    .filter((speed) => speed > 0);

  const averageEffectiveSpeed = activeSpeeds.length > 0
    ? activeSpeeds.reduce((sum, speed) => sum + speed, 0) / activeSpeeds.length
    : 1;
  const baselineGaugeGainPerTick = ATB_THRESHOLD / ATB_TICKS_PER_ACTION;

  return {
    averageEffectiveSpeed,
    baselineGaugeGainPerTick,
    targetTicksPerAction: ATB_TICKS_PER_ACTION,
    targetActionSeconds: ATB_TARGET_ACTION_SECONDS,
    tickMs: ATB_TICK_MS,
  };
}

export function calculateGaugeGain(rawSpeed: number, gaugeBonus = 1, profile?: AtbTimelineProfile) {
  const effectiveSpeed = calculateEffectiveSpeed(rawSpeed);
  const resolvedProfile = profile ?? createAtbTimelineProfile([{ rawSpeed, canAct: true, isDead: false }]);
  const normalizedSpeed = effectiveSpeed / Math.max(resolvedProfile.averageEffectiveSpeed, 1);
  return resolvedProfile.baselineGaugeGainPerTick * normalizedSpeed * toFiniteNumber(gaugeBonus, 1);
}

export function advanceAtbGauge(input: AtbTickInput, profile?: AtbTimelineProfile): AtbTickResult {
  const effectiveSpeed = calculateEffectiveSpeed(input.rawSpeed);
  const gaugeGain = calculateGaugeGain(input.rawSpeed, input.gaugeBonus, profile);
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

export function advanceAtbTimeline(units: readonly AtbTimelineUnit[]): AtbTimelineAdvanceResult {
  const profile = createAtbTimelineProfile(units);
  const advancedUnits = units.map((unit) => {
    if (unit.isDead || unit.canAct === false) {
      return {
        unitId: unit.unitId,
        effectiveSpeed: calculateEffectiveSpeed(unit.rawSpeed),
        gaugeBefore: Math.max(0, unit.gauge),
        gaugeGain: 0,
        gaugeAfterTick: Math.max(0, unit.gauge),
        gaugeAfterClamp: Math.max(0, unit.gauge),
        isReady: false,
      };
    }

    const result = advanceAtbGauge({ rawSpeed: unit.rawSpeed, gauge: unit.gauge, gaugeBonus: unit.gaugeBonus }, profile);
    const gaugeAfterClamp = result.actionsReady > 0 ? ATB_THRESHOLD : result.gaugeAfterTick;

    return {
      unitId: unit.unitId,
      effectiveSpeed: result.effectiveSpeed,
      gaugeBefore: Math.max(0, unit.gauge),
      gaugeGain: result.gaugeGain,
      gaugeAfterTick: result.gaugeAfterTick,
      gaugeAfterClamp,
      isReady: result.actionsReady > 0,
    };
  });

  const readyUnitIds = advancedUnits
    .filter((unit) => unit.isReady)
    .sort((left, right) => right.effectiveSpeed - left.effectiveSpeed || right.gaugeAfterTick - left.gaugeAfterTick)
    .map((unit) => unit.unitId);

  return {
    profile,
    advancedUnits,
    readyUnitIds,
  };
}

export function consumeAtbTurn(gauge: number) {
  return Math.max(0, gauge - ATB_THRESHOLD);
}

export function getAtbFillRatio(gauge: number) {
  return Math.max(0, Math.min(1, gauge / ATB_THRESHOLD));
}
