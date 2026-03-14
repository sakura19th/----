type TitleScreenProps = {
  onStart: () => void;
};

export function TitleScreen({ onStart }: TitleScreenProps) {
  return (
    <section className="screen-card">
      <span className="screen-card__eyebrow">Stage 0 / Title</span>
      <h1 className="screen-card__title">无限世界</h1>
      <p className="screen-card__description">
        这是 Stage 0 的标题页最小实现，用于验证应用启动、渲染与 screen 切换骨架已经连通。
      </p>
      <div className="screen-card__actions">
        <button className="primary-button" type="button" onClick={onStart}>
          开始冒险
        </button>
      </div>
    </section>
  );
}
