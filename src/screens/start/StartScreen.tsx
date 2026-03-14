import type { RunState } from '../../types';

type StartScreenProps = {
  run: RunState;
  encounterNames: readonly string[];
  onBackToTitle: () => void;
};

export function StartScreen({ run, encounterNames, onBackToTitle }: StartScreenProps) {
  return (
    <section className="screen-card stage1-screen-card">
      <span className="screen-card__eyebrow">Stage 1 / Mock Run Preview</span>
      <h2 className="screen-card__title">类型与静态数据占位验证</h2>
      <p className="screen-card__description">
        当前页面仍是 Stage 0 壳层中的最小接入，只用于证明强类型静态模板已经可以驱动队伍与地图占位渲染。
      </p>
      <p className="screen-card__description">
        如需离线查看，请先执行构建，再打开 <code>dist/index.html</code>；源码目录中的 <code>index.html</code> 不是离线入口。
      </p>

      <div className="stage1-panel-grid">
        <section className="data-panel">
          <h3 className="data-panel__title">本局概览</h3>
          <dl className="kv-list">
            <div>
              <dt>Seed</dt>
              <dd>{run.snapshot.seed.runSeed}</dd>
            </div>
            <div>
              <dt>世界碎片</dt>
              <dd>{run.snapshot.seed.worldShard}</dd>
            </div>
            <div>
              <dt>碎晶</dt>
              <dd>{run.resources.shards}</dd>
            </div>
            <div>
              <dt>补给</dt>
              <dd>{run.resources.supply}</dd>
            </div>
          </dl>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">队伍占位</h3>
          <div className="party-list">
            {run.party.map((member) => (
              <article className="data-card" key={member.instanceId}>
                <strong>
                  {member.identity.name} / {member.identity.title}
                </strong>
                <span>
                  {member.classKey} · {member.role}
                </span>
                <span>
                  HP {member.stats.hp}/{member.stats.maxHp} · SP {member.stats.sp}/{member.stats.maxSp}
                </span>
                <span>技能：{member.loadout.skillIds.join('、')}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">地图节点占位</h3>
          <div className="map-node-list">
            {run.map.nodes.map((node) => (
              <article className="data-card" key={node.id}>
                <strong>
                  #{node.index} · {node.nodeType}
                </strong>
                <span>引用：{node.refId}</span>
                <span>{node.completed ? '已完成' : node.id === run.currentNodeId ? '当前节点' : '待进入'}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">遭遇预览</h3>
          <div className="tag-list">
            {encounterNames.map((name) => (
              <span className="tag-chip" key={name}>
                {name}
              </span>
            ))}
          </div>
        </section>
      </div>

      <div className="screen-card__actions">
        <button className="secondary-button" type="button" onClick={onBackToTitle}>
          返回标题页
        </button>
      </div>
    </section>
  );
}
