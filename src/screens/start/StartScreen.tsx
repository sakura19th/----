type StartScreenProps = {
  onStartRun: () => void;
  onBackToTitle: () => void;
};

export function StartScreen({ onStartRun, onBackToTitle }: StartScreenProps) {
  return (
    <section className="screen-card">
      <span className="screen-card__eyebrow">Stage 2 / New Run</span>
      <h2 className="screen-card__title">新局初始化</h2>
      <p className="screen-card__description">
        本页不再只是 Stage1 的 mock 占位，而是 Stage2 的正式入口：点击后会创建 run、生成最小地图并进入真实主流程。
      </p>
      <p className="screen-card__description">
        当前范围只覆盖最小单局循环，不包含真实战斗与 AI；战斗节点会以结构化事件结算和待接入提示形式保留到后续阶段。
      </p>
      <div className="stage2-info-grid">
        <section className="data-panel">
          <h3 className="data-panel__title">本阶段已接通</h3>
          <div className="tag-list">
            <span className="tag-chip">createRun</span>
            <span className="tag-chip">generateMap</span>
            <span className="tag-chip">resolveNode</span>
            <span className="tag-chip">autoSave</span>
          </div>
        </section>
      </div>
      <div className="screen-card__actions">
        <button className="primary-button" type="button" onClick={onStartRun}>
          创建新局
        </button>
        <button className="secondary-button" type="button" onClick={onBackToTitle}>
          返回标题页
        </button>
      </div>
    </section>
  );
}
