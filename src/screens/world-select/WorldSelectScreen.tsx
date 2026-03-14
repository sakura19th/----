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
    <section className="stage-screen">
      <div className="stage-screen__card">
        <header className="stage-screen__hero">
          <div className="stage-screen__hero-main">
            <span className="screen-card__eyebrow">World Gate / 主舞台</span>
            <h2 className="screen-card__title">世界选择</h2>
            <p className="screen-card__description">
              不再以左上角窄卡片承载入口流程，而是以全屏舞台展开世界列表、核心情报与投送角色信息，方便后续扩展多世界分流。
            </p>
            <div className="stage-screen__meta">
              <span className="stage-screen__meta-chip">已加载世界：{WORLD_CATALOG.length}</span>
              <span className="stage-screen__meta-chip">投送角色：{playerProfile?.name ?? '未创建角色'}</span>
              <span className="stage-screen__meta-chip">当前状态：{selectedWorld?.unlockStatus === 'available' ? '可进入' : '待开放'}</span>
              <span className="stage-screen__meta-chip">主栏占比：世界详情优先</span>
            </div>
          </div>
          <aside className="stage-screen__hero-side">
            <div className="stage-screen__list-card">
              <strong>投送提示</strong>
              <span>宽屏下采用三栏舞台：左侧世界列表、中间世界详情、右侧角色与辅助信息。</span>
            </div>
            <div className="stage-screen__list-card">
              <strong>当前目标</strong>
              <span>{selectedWorld?.title ?? '暂无可用世界'}</span>
            </div>
          </aside>
        </header>

        <div className="stage-screen__grid">
          <section className="stage-screen__panel">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">可选世界</h3>
                <p className="stage-screen__panel-copy">左侧固定承担导航，列表内部滚动，不再压缩为左上角小块。</p>
              </div>
            </div>
            <div className="stage-screen__panel-content">
              <div className="party-list">
                {WORLD_CATALOG.map((world) => (
                  <button
                    key={world.id}
                    type="button"
                    className={`stage-screen__list-card stage-screen__list-button ${selectedWorldId === world.id ? 'stage-screen__list-button--selected' : ''}`}
                    onClick={() => onSelectWorld(world.id)}
                  >
                    <strong>{world.title}</strong>
                    <span>{world.subtitle}</span>
                    <span>{world.unlockStatus === 'available' ? '可进入' : '未开放'}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="stage-screen__panel stage-screen__panel--emphasis">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">世界详情</h3>
                  <p className="stage-screen__panel-copy">中间主栏承担主要叙事与确认动作，在大屏下占据最大列宽，避免页面只挤在左侧。</p>
</div>
            </div>
            <div className="stage-screen__panel-content">
              {selectedWorld ? (
                <>
                  <article className="stage-screen__list-card">
                    <strong>{selectedWorld.title}</strong>
                    <span>{selectedWorld.description}</span>
                    <span>{selectedWorld.introText}</span>
                  </article>
                  <div className="stage-screen__stats">
                    <div className="stage-screen__stat">
                      <span className="stage-screen__stat-label">难度</span>
                      <span className="stage-screen__stat-value">{selectedWorld.difficultyLabel}</span>
                    </div>
                    <div className="stage-screen__stat">
                      <span className="stage-screen__stat-label">预计时长</span>
                      <span className="stage-screen__stat-value">{selectedWorld.estimatedDuration}</span>
                    </div>
                    <div className="stage-screen__stat">
                      <span className="stage-screen__stat-label">解锁状态</span>
                      <span className="stage-screen__stat-value">{selectedWorld.unlockStatus === 'available' ? '已开放' : '未开放'}</span>
                    </div>
                    <div className="stage-screen__stat">
                      <span className="stage-screen__stat-label">投送编号</span>
                      <span className="stage-screen__stat-value">{selectedWorld.id}</span>
                    </div>
                  </div>
                </>
              ) : (
                <article className="stage-screen__list-card">
                  <strong>暂无世界</strong>
                  <span>当前没有可进入的世界配置。</span>
                </article>
              )}
            </div>
            <div className="stage-screen__panel-actions">
              <div className="stage-screen__actions">
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
            </div>
          </section>

          <aside className="stage-screen__panel">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">角色与辅助信息</h3>
                <p className="stage-screen__panel-copy">右栏承载角色信息与投送说明，补足横向舞台第三列。</p>
              </div>
            </div>
            <div className="stage-screen__panel-content">
              <article className="stage-screen__list-card">
                <strong>{playerProfile?.name ?? '未创建角色'}</strong>
                <span>初始角色：{playerProfile?.heroId ?? '缺失'}</span>
                <span>基础倾向：{playerProfile?.trait ?? '缺失'}</span>
              </article>
              <article className="stage-screen__list-card">
                <strong>进入须知</strong>
                <span>页面根层保持无浏览器滚动条，仅各栏内部在低高度时滚动。</span>
                <span>窄屏将自动折叠为纵向堆叠，优先保留中间详情与操作区可见性。</span>
              </article>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
