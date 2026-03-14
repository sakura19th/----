type TitleScreenProps = {
  onStart: () => void;
};

export function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <section className="screen-card">
      <span className="screen-card__eyebrow">Stage 2 / Title</span>
      <h1 className="screen-card__title">无限世界</h1>
      <p className="screen-card__description">
        当前已进入 Stage2 最小单局骨架，可从标题页进入新局初始化、地图推进、事件结算与招募返回地图的真实流程。
      </p>
      <p className="screen-card__description">
        构建产物支持直接本地打开，请在执行构建后使用 <code>dist/index.html</code> 作为离线入口；源码根目录下的 <code>index.html</code> 仅供 Vite 开发与构建流程使用。
      </p>
      <div className="screen-card__actions">
        <button className="primary-button" type="button" onClick={onStart}>
          开始冒险
        </button>
      </div>
    </section>
  );
}
