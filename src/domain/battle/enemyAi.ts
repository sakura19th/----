import type { BattleActionType, BattleState, BattleUnitState, Identifier, SkillTemplate } from '../../types';

export type EnemyDecision = {
  actionType: BattleActionType;
  skillId?: Identifier;
  targetUnitIds: readonly Identifier[];
  reason: string;
};

export type EnemyDecisionInput = {
  state: BattleState;
  actorUnitId: Identifier;
  skillMap: ReadonlyMap<Identifier, SkillTemplate>;
};

function getUnit(state: BattleState, unitId: Identifier) {
  return state.units.find((unit) => unit.unitId === unitId) ?? null;
}

function getAliveOpponents(state: BattleState, side: BattleUnitState['side']) {
  return state.units.filter((unit) => unit.side !== side && !unit.isDead);
}

function getAliveAllies(state: BattleState, side: BattleUnitState['side']) {
  return state.units.filter((unit) => unit.side === side && !unit.isDead);
}

function sortByLowestHp(units: readonly BattleUnitState[]) {
  return [...units].sort((left, right) => left.currentHp - right.currentHp || left.index - right.index);
}

function hasAnyTag(skill: SkillTemplate, tags: readonly string[]) {
  return tags.some((tag) => skill.tags.includes(tag));
}

function canUseSkill(actor: BattleUnitState, skill: SkillTemplate) {
  return actor.currentSp >= skill.cost;
}

function buildAttackDecision(actor: BattleUnitState, targets: readonly BattleUnitState[], reason: string): EnemyDecision {
  const target = sortByLowestHp(targets)[0];
  return {
    actionType: 'attack',
    targetUnitIds: target ? [target.unitId] : [],
    reason: `${actor.name}:${reason}`,
  };
}

function buildGuardDecision(actor: BattleUnitState, reason: string): EnemyDecision {
  return {
    actionType: 'guard',
    targetUnitIds: [actor.unitId],
    reason: `${actor.name}:${reason}`,
  };
}

function buildSkillDecision(actor: BattleUnitState, skill: SkillTemplate, allies: readonly BattleUnitState[], enemies: readonly BattleUnitState[], reason: string): EnemyDecision {
  const lowestAlly = sortByLowestHp(allies)[0];
  const lowestEnemy = sortByLowestHp(enemies)[0];

  switch (skill.target) {
    case 'self':
      return { actionType: 'skill', skillId: skill.id, targetUnitIds: [actor.unitId], reason: `${actor.name}:${reason}` };
    case 'ally':
      return { actionType: 'skill', skillId: skill.id, targetUnitIds: lowestAlly ? [lowestAlly.unitId] : [actor.unitId], reason: `${actor.name}:${reason}` };
    case 'all-allies':
      return { actionType: 'skill', skillId: skill.id, targetUnitIds: allies.map((unit) => unit.unitId), reason: `${actor.name}:${reason}` };
    case 'all-enemies':
      return { actionType: 'skill', skillId: skill.id, targetUnitIds: enemies.map((unit) => unit.unitId), reason: `${actor.name}:${reason}` };
    case 'enemy':
    default:
      return { actionType: 'skill', skillId: skill.id, targetUnitIds: lowestEnemy ? [lowestEnemy.unitId] : [], reason: `${actor.name}:${reason}` };
  }
}

export function decideEnemyAction(input: EnemyDecisionInput): EnemyDecision {
  const actor = getUnit(input.state, input.actorUnitId);
  if (!actor || actor.side !== 'enemy' || actor.isDead) {
    return {
      actionType: 'wait',
      targetUnitIds: [],
      reason: 'enemy-missing-or-dead',
    };
  }

  const allies = getAliveAllies(input.state, actor.side);
  const enemies = getAliveOpponents(input.state, actor.side);
  const skills = actor.skillIds
    .map((skillId) => input.skillMap.get(skillId) ?? null)
    .filter((skill): skill is SkillTemplate => Boolean(skill));
  const usableSkills = skills.filter((skill) => canUseSkill(actor, skill));
  const hpRatio = actor.maxHp <= 0 ? 0 : actor.currentHp / actor.maxHp;
  const lowestEnemy = sortByLowestHp(enemies)[0];

  const healSkill = usableSkills.find((skill) => hasAnyTag(skill, ['heal']));
  const shieldSkill = usableSkills.find((skill) => hasAnyTag(skill, ['shield', 'tank']));
  const controlSkill = usableSkills.find((skill) => hasAnyTag(skill, ['control']));
  const aoeSkill = usableSkills.find((skill) => hasAnyTag(skill, ['aoe']));
  const attackSkill = usableSkills.find((skill) => hasAnyTag(skill, ['attack', 'magic', 'poison', 'burn']));

  if (actor.isBoss) {
    if (aoeSkill && enemies.length > 1) {
      return buildSkillDecision(actor, aoeSkill, allies, enemies, 'boss-aoe-script');
    }
    if (controlSkill && lowestEnemy && !lowestEnemy.statuses.some((status) => status.key === 'stunned')) {
      return buildSkillDecision(actor, controlSkill, allies, enemies, 'boss-control-priority');
    }
    if (attackSkill) {
      return buildSkillDecision(actor, attackSkill, allies, enemies, 'boss-pressure');
    }
  }

  if (actor.templateCategory === 'boss') {
    if (aoeSkill) {
      return buildSkillDecision(actor, aoeSkill, allies, enemies, 'template-boss-aoe');
    }
  }

  const isFrontlineTemplate = actor.aiProfileId?.includes('guard') || actor.skillIds.some((skillId) => String(skillId).includes('bastion'));
  if (actor.templateCategory === 'enemy' && isFrontlineTemplate) {
    if (hpRatio <= 0.45 && shieldSkill) {
      return buildSkillDecision(actor, shieldSkill, allies, enemies, 'frontline-shield');
    }
    if (hpRatio <= 0.25) {
      return buildGuardDecision(actor, 'frontline-low-hp-guard');
    }
  }

  const isEliteTemplate = actor.isBoss || actor.templateCategory === 'boss' || actor.aiProfileId?.includes('boss');
  if (isEliteTemplate) {
    if (healSkill && allies.some((unit) => unit.currentHp / unit.maxHp <= 0.5)) {
      return buildSkillDecision(actor, healSkill, allies, enemies, 'elite-support');
    }
    if (controlSkill && lowestEnemy && !lowestEnemy.statuses.some((status) => status.key === 'stunned')) {
      return buildSkillDecision(actor, controlSkill, allies, enemies, 'elite-control');
    }
  }

  if (hpRatio <= 0.35) {
    if (shieldSkill) {
      return buildSkillDecision(actor, shieldSkill, allies, enemies, 'defensive-skill');
    }
    return buildGuardDecision(actor, 'fallback-guard');
  }

  if (attackSkill) {
    return buildSkillDecision(actor, attackSkill, allies, enemies, 'offensive-skill');
  }

  if (skills.length > 0 && usableSkills.length === 0) {
    return buildAttackDecision(actor, enemies, 'sp-fallback-attack');
  }

  return buildAttackDecision(actor, enemies, 'default-attack');
}
