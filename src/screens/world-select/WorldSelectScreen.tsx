import { WORLD_CATALOG } from '../../data';
import type { Identifier, PlayerProfile } from '../../types';

type WorldSelectScreenProps = {
  playerProfile: PlayerProfile | null;
  selectedWorldId: Identifier | null;
  onSelectWorld: (worldId: Identifier) => void;
  onConfirm: () => { ok: boolean; message?: string };
  onBack: () => void;
};

export function WorldSelectScreen({ playerProfile, selectedWorldId, onSelectWorld, onConfirm, onBack }: WorldSelectScreenProps) {
  const selectedWorld = WORLD_CATALOG.find((world) => world.id === selectedWorldId) ?? WORLD_CATALOG[0] ?? null;

  return (
    <section className="screen-card">
      <h2 className="screen-card__title">世界选择</h2>
      <p className="screen-card__description">当前只开放一个新世界，但页面结构已经按未来多世界扩展方式组织。</p>

      <div className="stage1-panel-grid" style={{ flex: 1, minHeight: 0 }}>
        <section className="data-panel">
          <h3 className="data-panel__title">可选世界</h3>
          <div className="party-list">
            {WORLD_CATALOG.map((world) => (
              <button
                key={world.id}
                type="button"
                className={`data-card map-node-card ${selectedWorldId === world.id ? 'map-node-card--selected' : ''}`}
                onClick={() => onSelectWorld(world.id)}
              >
                <strong>{world.title}</strong>
                <span>{world.subtitle}</span>
                <span>{world.unlockStatus === 'available' ? '可进入' : '未开放'}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">世界详情</h3>
          <div className="screen-scroll-column">
            {selectedWorld ? (
              <article className="data-card">
                <strong>{selectedWorld.title}</strong>
                <span>{selectedWorld.description}</span>
                <span>难度：{selectedWorld.difficultyLabel}</span>
                <span>预计时长：{selectedWorld.estimatedDuration}</span>
                <span>投送角色：{playerProfile?.name ?? '未创建角色'}</span>
              </article>
            ) : (
              <article className="data-card">
                <strong>暂无世界</strong>
                <span>当前没有可进入的世界配置。</span>
              </article>
            )}
          </div>

          <div className="screen-card__actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                const result = onConfirm();
                if (!result.ok && result.message) {
                  window.alert(result.message);
                }
              }}
              disabled={!selectedWorld || selectedWorld.unlockStatus !== 'available'}
            >
              确认进入
            </button>
            <button className="secondary-button" type="button" onClick={onBack}>
              返回主神世界
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
