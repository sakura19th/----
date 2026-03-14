type StartScreenProps = {
  onBackToTitle: () => void;
};

export function StartScreen({ onBackToTitle }: StartScreenProps) {
  return (
    <section className="screen-card">
      <span className="screen-card__eyebrow">Stage 0 / Start</span>
      <h2 className="screen-card__title">开局页占位</h2>
      <p className="screen-card__description">
        这里保留为 Stage 0 的最小占位页面，仅用于确认标题页已经可以进入开局页。
      </p>
      <div className="screen-card__actions">
        <button className="secondary-button" type="button" onClick={onBackToTitle}>
          返回标题页
        </button>
      </div>
    </section>
  );
}
