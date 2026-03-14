type TitleScreenProps = {
  onStart: () => void;
  onDeleteSave: () => void;
  hasSave: boolean;
};

export function TitleScreen({ onStart, onDeleteSave, hasSave }: TitleScreenProps) {
  return (
    <section className="screen-card">
      <span className="screen-card__eyebrow">Stage 2 / Title</span>
      <h1 className="screen-card__title">无限世界</h1>
      <p className="screen-card__description">
        当前已进入 Stage2 最小单局骨架，可从标题页进入新局初始化、地图推进、事件结算与招募返回地图的真实流程。
      </p>
      <div className="screen-card__actions">
        <button className="primary-button" type="button" onClick={onStart}>
          开始冒险
        </button>
        {hasSave && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              if (window.confirm('确认删除存档？此操作不可恢复。')) {
                onDeleteSave();
              }
            }}
          >
            删除存档
          </button>
        )}
      </div>
    </section>
  );
}
