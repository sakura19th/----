import type { BattleUnitState, RunState, SkillTemplate } from '../../types';
import type { BattleCommand } from '../../app/store/gameStore';
import { SKILL_TEMPLATES } from '../../data';

type BattleScreenProps = {
  run: RunState;
  onSubmitAction: (command: BattleCommand) => void;
  onBackToMap: () => void;
};

function formatStatuses(unit: BattleUnitState) {
  return unit.statuses.length > 0 ? unit.statuses.map((status) => status.name).join('、') : '无';
}

function formatActionLabel(skill: SkillTemplate) {
  return `${skill.name} · SP ${skill.cost}`;
}

function getTargetCandidates(actor: BattleUnitState | null, skill: SkillTemplate | null, units: readonly BattleUnitState[]) {
  if (!actor) {
    return [];
  }

  if (!skill) {
    return units.filter((unit) => unit.side !== actor.side && !unit.isDead);
  }

  switch (skill.target) {
    case 'self':
      return units.filter((unit) => unit.unitId === actor.unitId);
    case 'ally':
    case 'all-allies':
      return units.filter((unit) => unit.side === actor.side && !unit.isDead);
    case 'all-enemies':
    case 'enemy':
    default:
      return units.filter((unit) => unit.side !== actor.side && !unit.isDead);
  }
}

export function BattleScreen({ run, onSubmitAction, onBackToMap }: BattleScreenProps) {
  const battleContext = run.presentation.battleContext;
  if (!battleContext) {
    return null;
  }

  const battleState = battleContext.battleState;
  const actor = battleState.units.find((unit) => unit.unitId === battleContext.awaitingUnitId) ?? null;
  const partyUnits = battleState.units.filter((unit) => unit.side === 'party');
  const enemyUnits = battleState.units.filter((unit) => unit.side === 'enemy');
  const actorSkills: SkillTemplate[] = [];
  if (actor) {
    for (const skillId of actor.skillIds) {
      const skill = SKILL_TEMPLATES.find((candidate) => candidate.id === skillId);
      if (skill) {
        actorSkills.push(skill);
      }
    }
  }
  const logs = battleState.logs.slice(-10).reverse();

  return (
    <section className="screen-card battle-screen-card">
      <span className="screen-card__eyebrow">Stage 4 / Battle</span>
      <h2 className="screen-card__title">{String(battleState.metadata?.battleName ?? '战斗遭遇')}</h2>
      <p className="screen-card__description">
        战场：{String(battleState.metadata?.battlefieldTag ?? '未知')} · 回合 {battleState.turn} · 存活 {battleState.party.totalAlive}/{partyUnits.length} vs {battleState.enemy.totalAlive}/{enemyUnits.length}
      </p>

      <div className="battle-layout">
        <section className="data-panel">
          <h3 className="data-panel__title">我方队伍</h3>
          <div className="battle-unit-list">
            {partyUnits.map((unit) => (
              <article className={`data-card battle-unit-card ${actor?.unitId === unit.unitId ? 'battle-unit-card--active' : ''}`} key={unit.unitId}>
                <strong>{unit.name}</strong>
                <span>HP {unit.currentHp}/{unit.maxHp} · SP {unit.currentSp}/{unit.maxSp}</span>
                <span>速度 {unit.derived.SPD} · 行动 {unit.runtime.actionCount}</span>
                <span>状态：{formatStatuses(unit)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">敌方信息</h3>
          <div className="battle-unit-list">
            {enemyUnits.map((unit) => (
              <article className="data-card battle-unit-card" key={unit.unitId}>
                <strong>{unit.name}</strong>
                <span>HP {unit.currentHp}/{unit.maxHp} · SP {unit.currentSp}/{unit.maxSp}</span>
                <span>速度 {unit.derived.SPD} · 行动 {unit.runtime.actionCount}</span>
                <span>状态：{formatStatuses(unit)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="data-panel battle-command-panel">
          <h3 className="data-panel__title">当前行动</h3>
          {battleState.result.finished ? (
            <div className="data-card">
              <strong>{battleState.result.outcome === 'victory' ? '战斗胜利' : '战斗失败'}</strong>
              <span>{battleState.result.summary ?? '战斗已结束。'}</span>
              <button className="primary-button" type="button" onClick={onBackToMap}>
                返回地图
              </button>
            </div>
          ) : actor ? (
            <>
              <div className="data-card">
                <strong>{actor.name} 待命</strong>
                <span>可选技能 {actorSkills.length} 个</span>
                <span>默认攻击目标为敌方单体；守御会作用于自身。</span>
              </div>

              <div className="battle-action-grid">
                <button className="primary-button" type="button" onClick={() => onSubmitAction({ actionType: 'attack' })}>
                  普通攻击
                </button>
                <button className="secondary-button" type="button" onClick={() => onSubmitAction({ actionType: 'guard', targetUnitIds: [actor.unitId] })}>
                  防御
                </button>
                {actorSkills.map((skill) => {
                  const targetCandidates = getTargetCandidates(actor, skill, battleState.units);
                  const firstTargetId = targetCandidates[0]?.unitId;
                  const targetUnitIds = skill.target === 'all-allies' || skill.target === 'all-enemies'
                    ? targetCandidates.map((unit) => unit.unitId)
                    : firstTargetId
                      ? [firstTargetId]
                      : [];

                  return (
                    <button
                      className="secondary-button"
                      key={skill.id}
                      type="button"
                      disabled={actor.currentSp < skill.cost || targetUnitIds.length === 0}
                      onClick={() => onSubmitAction({ actionType: 'skill', skillId: skill.id, targetUnitIds })}
                    >
                      {formatActionLabel(skill)}
                    </button>
                  );
                })}
              </div>

              <div className="battle-target-panel">
                <strong>默认目标预览</strong>
                <div className="tag-list">
                  {getTargetCandidates(actor, null, battleState.units).map((unit) => (
                    <span className="tag-chip" key={unit.unitId}>{unit.name}</span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="data-card">
              <strong>等待自动推进</strong>
              <span>当前没有玩家可操作单位，战斗将继续自动处理。</span>
            </div>
          )}
        </section>

        <section className="data-panel battle-log-panel">
          <h3 className="data-panel__title">行动日志</h3>
          <div className="battle-log-list">
            {logs.map((log) => (
              <article className="data-card" key={log.id}>
                <strong>{log.type}</strong>
                <span>{log.detail}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
