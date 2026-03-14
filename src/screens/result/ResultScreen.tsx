import type { BattleResultOutcome, PartyMember, RunOutcome, RunState } from '../../types';
import { deriveCombatStats } from '../../domain/formulas/deriveCombatStats';

type ResultScreenProps = {
  run: RunState;
  onReturnToTitle: () => void;
};

function getOutcomeLabel(outcome: RunOutcome) {
  return outcome === 'victory' ? '胜利' : '失败';
}

function getBattleOutcomeLabel(outcome: BattleResultOutcome | undefined) {
  if (outcome === 'victory') {
    return '胜利';
  }

  if (outcome === 'defeat') {
    return '失败';
  }

  if (outcome === 'retreat') {
    return '撤退';
  }

  return null;
}

function getNodeResultLabel(summary: string, battleOutcome?: BattleResultOutcome) {
  const battleLabel = getBattleOutcomeLabel(battleOutcome);
  return battleLabel ? `${summary} · 战斗结果：${battleLabel}` : summary;
}

export function ResultScreen({ run, onReturnToTitle }: ResultScreenProps) {
  if (!run.result) {
    return null;
  }

  const result = run.result;
  const completedCount = run.completedNodeResults.length;
  const totalNodes = run.map.nodes.length;
  const resolvedNodeIds = new Set(run.completedNodeResults.map((item) => item.nodeId));
  const bossNode = run.map.nodes.find((node) => node.nodeType === 'boss') ?? null;
  const bossResolved = bossNode ? resolvedNodeIds.has(bossNode.id) : false;

  return (
    <section className="screen-card stage1-screen-card">
      <span className="screen-card__eyebrow">Stage 5 / Result</span>
      <h2 className="screen-card__title">本局结算</h2>
      <p className="screen-card__description">
        从标题页到终局的最小闭环已接通，当前页面用于汇总本局推进、队伍状态、资源结余与终局结果。
      </p>

      <div className="stage1-panel-grid">
        <section className="data-panel">
          <h3 className="data-panel__title">本局摘要</h3>
          <dl className="kv-list">
            <div>
              <dt>终局状态</dt>
              <dd>{getOutcomeLabel(result.outcome)}</dd>
            </div>
            <div>
              <dt>终局节点</dt>
              <dd>{result.finalNodeId ?? '无'}</dd>
            </div>
            <div>
              <dt>Boss 已完成</dt>
              <dd>{bossResolved ? '是' : '否'}</dd>
            </div>
            <div>
              <dt>完成节点</dt>
              <dd>{completedCount}/{totalNodes}</dd>
            </div>
            <div>
              <dt>Seed</dt>
              <dd>{run.snapshot.seed.runSeed}</dd>
            </div>
            <div>
              <dt>世界碎片</dt>
              <dd>{run.snapshot.seed.worldShard}</dd>
            </div>
          </dl>
          <p className="inline-result">{result.summary}</p>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">已完成节点摘要</h3>
          <div className="party-list">
            {run.completedNodeResults.map((item) => (
              <article className="data-card" key={`${item.nodeId}:${item.choiceId}`}>
                <strong>{item.nodeId}</strong>
                <span>{getNodeResultLabel(item.summary, item.battleResult?.outcome)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">队伍摘要</h3>
          <div className="party-list">
            {run.party.map((member) => (
              <article className="data-card" key={member.instanceId}>
                <strong>
                  {member.identity.name} / {member.identity.title}
                </strong>
                <span>
                  {member.classKey} · {member.role} · 关系 {member.currentRelationToLeader}
                </span>
                <span>
                  {(() => {
                    const d = deriveCombatStats({ ...member.stats, level: member.progression?.level ?? 1 });
                    const hp = member.stats.hp ?? d.maxHp;
                    const sp = member.stats.sp ?? d.maxSp;
                    return `HP ${Math.min(hp, d.maxHp)}/${d.maxHp} · SP ${Math.min(sp, d.maxSp)}/${d.maxSp}`;
                  })()}
                </span>
                <span>状态：{member.activeStatusEffects.length > 0 ? member.activeStatusEffects.join('、') : '无'}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">资源摘要</h3>
          <dl className="kv-list">
            <div>
              <dt>碎晶</dt>
              <dd>{run.resources.shards}</dd>
            </div>
            <div>
              <dt>补给</dt>
              <dd>{run.resources.supply}</dd>
            </div>
            <div>
              <dt>自动存档</dt>
              <dd>{run.save.autoSaveCount} 次</dd>
            </div>
            <div>
              <dt>最近存档</dt>
              <dd>{run.save.lastSavedAt ?? '未写入'}</dd>
            </div>
          </dl>
          <div className="screen-card__actions stage2-actions-inline">
            <button className="primary-button" type="button" onClick={onReturnToTitle}>
              返回标题页
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
