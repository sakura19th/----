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
    <section className="game-layout__card">
      <h2 className="screen-card__title">地图推进</h2>
      <p className="screen-card__description">
        可用节点可进入，已完成节点会记录结果，节点结算后自动回到地图并触发自动存档。
      </p>

      <div className="map-screen__grid">
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

        <section className="data-panel map-screen__current">
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
