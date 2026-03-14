import type { RunState } from '../../types';

type MapScreenProps = {
  run: RunState;
  onSelectNode: (nodeId: string) => void;
  onOpenNode: () => void;
  onBackToTitle: () => void;
};

function getNodeLabel(status: RunState['map']['nodes'][number]['status']) {
  switch (status) {
    case 'resolved':
      return '已完成';
    case 'available':
      return '可进入';
    case 'locked':
    default:
      return '未解锁';
  }
}

export function MapScreen({ run, onSelectNode, onOpenNode, onBackToTitle }: MapScreenProps) {
  const selectedNodeId = run.presentation.selectedNodeId ?? run.currentNodeId;
  const selectedNode = run.map.nodes.find((node) => node.id === selectedNodeId) ?? run.map.nodes[0];

  return (
    <section className="screen-card stage1-screen-card">
      <span className="screen-card__eyebrow">Stage 2 / Run Map</span>
      <h2 className="screen-card__title">地图推进</h2>
      <p className="screen-card__description">
        这里展示正式 run state：可用节点可进入，已完成节点会记录结果，节点结算后自动回到地图并触发自动存档骨架。
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
            <div>
              <dt>自动存档</dt>
              <dd>{run.save.autoSaveCount} 次</dd>
            </div>
          </dl>
          {run.presentation.resultMessage ? <p className="inline-result">{run.presentation.resultMessage}</p> : null}
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">队伍</h3>
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
                  HP {member.stats.hp}/{member.stats.maxHp} · SP {member.stats.sp}/{member.stats.maxSp}
                </span>
                <span>状态：{member.activeStatusEffects.length > 0 ? member.activeStatusEffects.join('、') : '无'}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">地图节点</h3>
          <div className="map-node-list">
            {run.map.nodes.map((node) => (
              <button
                className={`data-card map-node-card ${selectedNodeId === node.id ? 'map-node-card--selected' : ''}`}
                key={node.id}
                type="button"
                onClick={() => onSelectNode(node.id)}
              >
                <strong>
                  #{node.index} · {node.nodeType}
                </strong>
                <span>引用：{node.refId}</span>
                <span>{getNodeLabel(node.status)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">当前选择</h3>
          <div className="data-card">
            <strong>
              #{selectedNode.index} · {selectedNode.nodeType}
            </strong>
            <span>状态：{getNodeLabel(selectedNode.status)}</span>
            <span>引用事件：{selectedNode.refId}</span>
          </div>
          <div className="screen-card__actions stage2-actions-inline">
            <button className="primary-button" type="button" onClick={onOpenNode} disabled={selectedNode.status !== 'available'}>
              进入节点
            </button>
            <button className="secondary-button" type="button" onClick={onBackToTitle}>
              返回标题页
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
