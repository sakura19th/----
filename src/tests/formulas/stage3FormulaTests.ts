import {
  calculateCritChance,
  calculateCritMultiplier,
  calculateDamage,
  calculateHitChance,
} from '../../domain/formulas/damage';
import { calculateActualHeal, calculateHeal } from '../../domain/formulas/heal';
import { calculateShield } from '../../domain/formulas/shield';

function invariant(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runStage3FormulaTests() {
  invariant(calculateHitChance({ HIT: -100, EVA: 999 }) === 72, '命中率应命中 72% 下限');
  invariant(calculateHitChance({ HIT: 500, EVA: 0 }) === 98, '命中率应命中 98% 上限');

  invariant(calculateCritChance({ CRIT: 120, skillExtraCrit: 50 }) === 95, '暴击率应命中 95% 上限');
  invariant(calculateCritChance({ CRIT: -5 }) === 0, '暴击率应命中 0 下限');
  invariant(calculateCritMultiplier({ CDMG: 150, didCrit: true }) === 1.5, 'CDMG=150 时暴击倍率应为 1.5');
  invariant(
    calculateCritMultiplier({ CDMG: 150, skillExtraCritDamage: 30, didCrit: true }) === 1.8,
    '技能额外暴伤应叠加到暴击倍率',
  );
  invariant(calculateCritMultiplier({ CDMG: 150, didCrit: false }) === 1, '非暴击倍率应为 1');

  const damage = calculateDamage({
    attack: 120,
    defense: 30,
    skillRate: 1.5,
    randomFactor: 1,
    finalBonus: 1.1,
    critMultiplier: 1.5,
    stageDamageMultiplier: 1.25,
    stageTakenMultiplier: 0.8,
  });
  invariant(damage.mitigated === 150, '伤害减防结果应正确');
  invariant(Math.abs(damage.finalDamageRaw - 247.5) < 0.0000001, '伤害原始值应先乘后算');
  invariant(damage.finalDamage === 247, '伤害应先乘后取整');

  const floorDamage = calculateDamage({
    attack: 50,
    defense: 100,
    skillRate: 1,
    randomFactor: 1,
  });
  invariant(floorDamage.mitigated === 0, '减防后伤害可为 0');
  invariant(floorDamage.finalDamage === 1, '伤害应保底为 1');

  const heal = calculateHeal({
    healPower: 123,
    skillRate: 1.2,
    finalBonus: 1.1,
    stageHealShieldMultiplier: 1.18,
  });
  invariant(heal === 191, '治疗应向下取整');
  invariant(
    calculateHeal({ healPower: -100, skillRate: 1, finalBonus: 1, stageHealShieldMultiplier: 1 }) === 0,
    '治疗结果最小为 0',
  );
  invariant(
    calculateActualHeal({ targetCurrentHp: 90, targetMaxHp: 100, finalHeal: 191 }) === 10,
    '有效治疗应受目标缺失生命限制',
  );

  const shield = calculateShield({
    healPower: 80,
    skillRate: 1.5,
    flatShield: 25,
    finalBonus: 1.1,
    stageHealShieldMultiplier: 1.18,
  });
  invariant(shield === 188, '护盾应共享治疗乘区并向下取整');
  invariant(
    calculateShield({ healPower: -10, skillRate: 1, flatShield: -1, finalBonus: 1, stageHealShieldMultiplier: 1 }) === 0,
    '护盾结果最小为 0',
  );

  return 'stage3-formula-tests: ok';
}

console.log(runStage3FormulaTests());
