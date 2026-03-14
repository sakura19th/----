import type { BattleUnitState, RunState, SkillTemplate } from '../../types';
import type { BattleCommand } from '../../app/store/gameStore';
import { SKILL_TEMPLATES } from '../../data';
import {
  ATB_ACTION_ANIMATION_MS,
  ATB_ACTION_MIN_INTERVAL_MS,
  ATB_TARGET_ACTION_SECONDS,
  ATB_THRESHOLD,
  getAtbFillRatio,
} from '../../domain/battle/atb';

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

function UnitAtbCard({ unit, isActor, wasLastActor, isQueued }: { unit: BattleUnitState; isActor: boolean; wasLastActor: boolean; isQueued: boolean }) {
  const atbPercent = Math.round(getAtbFillRatio(unit.gauge) * 100);
  const classes = [
    'data-card',
    'battle-unit-card',
    isActor ? 'battle-unit-card--active' : '',
    wasLastActor ? 'battle-unit-card--recent' : '',
    isQueued ? 'battle-unit-card--queued' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={classes}>
      <strong>{unit.name}</strong>
      <span>HP {unit.currentHp}/{unit.maxHp} · SP {unit.currentSp}/{unit.maxSp}</span>
      <span>速度 {unit.derived.SPD} · 行动 {unit.runtime.actionCount}</span>
      <span>状态：{formatStatuses(unit)}</span>
      <div className="atb-strip">
        <div className="atb-strip__meta">
          <strong>ATB</strong>
          <span>{Math.min(unit.gauge, ATB_THRESHOLD).toFixed(0)} / {ATB_THRESHOLD}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar__fill progress-bar__fill--atb" style={{ width: `${atbPercent}%` }} />
        </div>
      </div>
    </article>
  );
}

type BattleScreenProps = {
  run: RunState;
  onSubmitAction: (command: BattleCommand) => void;
  onBackToMap: () => void;
  onFleeBattle: () => void;
};

export function BattleScreen({ run, onSubmitAction, onBackToMap, onFleeBattle }: BattleScreenProps) {
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
  const readySet = new Set(battleState.timeline.readyQueue);

  return (
    <section className="game-layout__card battle-screen-card">
      <h2 className="screen-card__title">{String(battleState.metadata?.battleName ?? '战斗遭遇')}</h2>
      <p className="screen-card__description">
        战场：{String(battleState.metadata?.battlefieldTag ?? '未知')} · 回合 {battleState.turn} · 存活 {battleState.party.totalAlive}/{partyUnits.length} vs {battleState.enemy.totalAlive}/{enemyUnits.length}
      </p>

      <div className="battle-header-meta">
        <span className="tag-chip">平均行动节奏：约 {ATB_TARGET_ACTION_SECONDS} 秒 / 次</span>
        <span className="tag-chip">最短结算间隔：{ATB_ACTION_MIN_INTERVAL_MS}ms</span>
        <span className="tag-chip">表现缓冲：{ATB_ACTION_ANIMATION_MS}ms</span>
      </div>

      <div className="battle-flow-indicator">
        <strong>战斗节奏</strong>
        <div>阶段：{battleState.timeline.animationPhase} · 待行动单位：{battleState.timeline.awaitingUnitId ?? '无'} · 已排队：{battleState.timeline.readyQueue.length}</div>
      </div>

      <div className="battle-layout">
        <section className="data-panel">
          <h3 className="data-panel__title">我方队伍</h3>
          <div className="battle-unit-list">
            {partyUnits.map((unit) => (
              <UnitAtbCard
                key={unit.unitId}
                unit={unit}
                isActor={actor?.unitId === unit.unitId}
                wasLastActor={battleState.timeline.lastActedUnitId === unit.unitId}
                isQueued={readySet.has(unit.unitId)}
              />
            ))}
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title data-panel__title--enemy">敌方信息</h3>
          <div className="battle-unit-list">
            {enemyUnits.map((unit) => (
              <UnitAtbCard
                key={unit.unitId}
                unit={unit}
                isActor={actor?.unitId === unit.unitId}
                wasLastActor={battleState.timeline.lastActedUnitId === unit.unitId}
                isQueued={readySet.has(unit.unitId)}
              />
            ))}
          </div>
        </section>

        <section className="data-panel battle-command-panel">
          <h3 className="data-panel__title">当前行动</h3>
          {battleState.result.finished ? (
            <div className={`data-card battle-result--${battleState.result.outcome === 'victory' ? 'victory' : 'defeat'}`}>
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
                <span>ATB 已蓄满，当前排在行动序列前列。</span>
                <span>可选技能 {actorSkills.length} 个，默认攻击目标为敌方单体；守御会作用于自身。</span>
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
              <strong>等待节奏推进</strong>
              <span>当前没有玩家可操作单位，系统会依据 ATB 排队与节奏缓冲继续推进。</span>
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
          {!battleState.result.finished && (
            <div style={{ marginTop: '0.5rem' }}>
              <button
                className="secondary-button destructive-button"
                type="button"
                onClick={() => {
                  if (window.confirm('确认退出战斗？当前战斗进度将丢失。')) {
                    onFleeBattle();
                  }
                }}
              >
                退出战斗
              </button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
