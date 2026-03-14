import type { BattleShield } from '../../types';
import { DEFAULT_SHIELD_SELF_ACTIONS, MAX_ACTIVE_SHIELDS, SHIELD_MIN } from '../formulas/shield';

export type ApplyShieldInput = {
  shields: readonly BattleShield[];
  newShield: BattleShield;
};

export type AbsorbDamageByShieldsInput = {
  shields: readonly BattleShield[];
  incomingDamage: number;
};

export type ShieldAbsorbResult = {
  remainingDamage: number;
  absorbedDamage: number;
  updatedShields: readonly BattleShield[];
};

function sortShields(shields: readonly BattleShield[]) {
  return [...shields].sort((left, right) => {
    if (right.value !== left.value) {
      return right.value - left.value;
    }

    return left.createdAtTurn - right.createdAtTurn;
  });
}

export function sanitizeShield(shield: BattleShield): BattleShield | null {
  const nextValue = Math.max(SHIELD_MIN, Math.floor(shield.value));
  const nextRemainingSelfActions = Math.max(0, Math.floor(shield.remainingSelfActions));

  if (nextValue <= 0 || nextRemainingSelfActions <= 0) {
    return null;
  }

  return {
    ...shield,
    value: nextValue,
    remainingSelfActions: nextRemainingSelfActions,
  };
}

export function cleanupShields(shields: readonly BattleShield[]) {
  return sortShields(
    shields
      .map((shield) => sanitizeShield(shield))
      .filter((shield): shield is BattleShield => shield !== null),
  );
}

export function applyShield(input: ApplyShieldInput) {
  const sanitizedNewShield = sanitizeShield({
    ...input.newShield,
    remainingSelfActions:
      input.newShield.remainingSelfActions > 0
        ? input.newShield.remainingSelfActions
        : DEFAULT_SHIELD_SELF_ACTIONS,
  });

  if (!sanitizedNewShield) {
    return cleanupShields(input.shields);
  }

  const withoutSameSource = cleanupShields(input.shields).filter((shield) => shield.sourceId !== sanitizedNewShield.sourceId);
  const nextShields = sortShields([...withoutSameSource, sanitizedNewShield]);

  return nextShields.slice(0, MAX_ACTIVE_SHIELDS);
}

export function tickShieldsAfterSelfAction(shields: readonly BattleShield[]) {
  return cleanupShields(
    shields.map((shield) => ({
      ...shield,
      remainingSelfActions: shield.remainingSelfActions - 1,
    })),
  );
}

export function absorbDamageByShields(input: AbsorbDamageByShieldsInput): ShieldAbsorbResult {
  let remainingDamage = Math.max(0, Math.floor(input.incomingDamage));
  let absorbedDamage = 0;
  const updatedShields: BattleShield[] = [];

  for (const shield of cleanupShields(input.shields)) {
    if (remainingDamage <= 0) {
      updatedShields.push(shield);
      continue;
    }

    const absorbed = Math.min(shield.value, remainingDamage);
    const nextShield = sanitizeShield({
      ...shield,
      value: shield.value - absorbed,
    });

    absorbedDamage += absorbed;
    remainingDamage -= absorbed;

    if (nextShield) {
      updatedShields.push(nextShield);
    }
  }

  return {
    remainingDamage,
    absorbedDamage,
    updatedShields: cleanupShields(updatedShields),
  };
}
