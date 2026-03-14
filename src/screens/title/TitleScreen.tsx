type TitleScreenProps = {
  onStart: () => void;
  onDeleteSave: () => void;
  hasSave: boolean;
};

export function TitleScreen({ onStart, onDeleteSave, hasSave }: TitleScreenProps) {
  return (
    <div className="screen-shell__title-wrap">
      <div className="screen-card screen-card--title">
        <div className="screen-card__title-block">
          <h1 className="screen-card__title screen-card__title--gradient">无限世界</h1>
          <p className="screen-card__subtitle">Infinite World</p>
        </div>
        <p className="screen-card__description">
          当前已进入 Stage2 最小单局骨架，可从标题页进入新局初始化、地图推进、事件结算与招募返回地图的真实流程。
        </p>
        <div className="screen-card__actions screen-card__actions--stack">
          <button className="primary-button primary-button--full" type="button" onClick={onStart}>
            开始冒险
          </button>
          {hasSave && (
            <button
              className="secondary-button secondary-button--full"
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
        <div className="screen-card__footer">
          版本 1.0.0
        </div>
      </div>
    </div>
  );
}
