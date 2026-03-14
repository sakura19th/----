import { useMemo, useState } from 'react';
import { HERO_ARCHETYPES } from '../../data';
import type { PlayerCreationForm, PlayerTrait } from '../../types';

const TRAIT_OPTIONS: readonly { value: PlayerTrait; label: string; detail: string }[] = [
  { value: 'steady', label: '稳健', detail: '默认推荐，强调稳定推进。' },
  { value: 'reckless', label: '果决', detail: '倾向主动出击，强调试炼者意志。' },
  { value: 'insightful', label: '洞察', detail: '更关注信息与世界线索。' },
];

type CharacterCreationScreenProps = {
  onConfirm: (form: PlayerCreationForm) => { ok: boolean; message?: string };
  onBackToTitle: () => void;
};

export function CharacterCreationScreen({ onConfirm, onBackToTitle }: CharacterCreationScreenProps) {
  const [name, setName] = useState('');
  const [heroId, setHeroId] = useState<string>(HERO_ARCHETYPES[0]?.identity.id ?? '');
  const [trait, setTrait] = useState<PlayerTrait>('steady');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedHero = useMemo(
    () => HERO_ARCHETYPES.find((hero) => hero.identity.id === heroId) ?? HERO_ARCHETYPES[0],
    [heroId],
  );

  return (
    <section className="stage-screen">
      <div className="stage-screen__card">
        <header className="stage-screen__hero">
          <div className="stage-screen__hero-main">
            <span className="screen-card__eyebrow">Character Setup / 主舞台</span>
            <h2 className="screen-card__title">自定义新建人物</h2>
            <p className="screen-card__description">
              输入角色名、选择主角原型与基础倾向的流程被提升为全屏舞台，让创建、预览与说明信息在宽屏下横向并列展开。
            </p>
            <div className="stage-screen__meta">
              <span className="stage-screen__meta-chip">原型数量：{HERO_ARCHETYPES.length}</span>
              <span className="stage-screen__meta-chip">当前倾向：{TRAIT_OPTIONS.find((option) => option.value === trait)?.label}</span>
              <span className="stage-screen__meta-chip">角色名：{name.trim() || '未命名'}</span>
            </div>
          </div>
          <aside className="stage-screen__hero-side">
            <div className="stage-screen__list-card">
              <strong>创建说明</strong>
              <span>宽屏展示左侧配置、中间预览、右侧补充信息；窄屏自动折叠为纵向流程。</span>
            </div>
            <div className="stage-screen__list-card">
              <strong>当前原型</strong>
              <span>{selectedHero?.identity.title ?? '暂无原型'}</span>
            </div>
          </aside>
        </header>

        <div className="stage-screen__grid">
          <section className="stage-screen__panel">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">创建信息</h3>
                <p className="stage-screen__panel-copy">左栏负责基础输入与原型切换。</p>
              </div>
            </div>
            <div className="stage-screen__panel-content">
              <div className="screen-scroll-column">
                <label className="field-label" htmlFor="player-name-input">
                  角色名
                </label>
                <input
                  id="player-name-input"
                  className="text-input"
                  maxLength={12}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="请输入 1-12 个字"
                />

                <h4 className="data-panel__title">初始原型</h4>
                <div className="party-list">
                  {HERO_ARCHETYPES.map((hero) => (
                    <button
                      key={hero.identity.id}
                      type="button"
                      className={`stage-screen__list-card stage-screen__list-button ${heroId === hero.identity.id ? 'stage-screen__list-button--selected' : ''}`}
                      onClick={() => setHeroId(hero.identity.id)}
                    >
                      <strong>{hero.identity.title}</strong>
                      <span>{hero.identity.name}</span>
                      <span>
                        {hero.classKey} / {hero.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="stage-screen__panel stage-screen__panel--emphasis">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">预览</h3>
                <p className="stage-screen__panel-copy">中栏作为主要视觉焦点，承担当前角色构建结果。</p>
              </div>
            </div>
            <div className="stage-screen__panel-content">
              {selectedHero && (
                <>
                  <article className="stage-screen__list-card">
                    <strong>{name.trim() || selectedHero.identity.name}</strong>
                    <span>{selectedHero.identity.title}</span>
                    <span>{selectedHero.narrative.background}</span>
                    <span>
                      战斗定位：{selectedHero.classKey} / {selectedHero.role}
                    </span>
                  </article>
                  <div className="stage-screen__stats">
                    <div className="stage-screen__stat">
                      <span className="stage-screen__stat-label">攻击</span>
                      <span className="stage-screen__stat-value">{selectedHero.stats.attack}</span>
                    </div>
                    <div className="stage-screen__stat">
                      <span className="stage-screen__stat-label">防御</span>
                      <span className="stage-screen__stat-value">{selectedHero.stats.defense}</span>
                    </div>
                    <div className="stage-screen__stat">
                      <span className="stage-screen__stat-label">速度</span>
                      <span className="stage-screen__stat-value">{selectedHero.stats.speed}</span>
                    </div>
                    <div className="stage-screen__stat">
                      <span className="stage-screen__stat-label">灵力</span>
                      <span className="stage-screen__stat-value">{selectedHero.stats.spirit}</span>
                    </div>
                  </div>
                  {errorMessage && <p className="inline-result inline-result--warning">{errorMessage}</p>}
                </>
              )}
            </div>
            <div className="stage-screen__panel-actions">
              <div className="stage-screen__actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    const result = onConfirm({ name, heroId, trait });
                    setErrorMessage(result.ok ? null : result.message ?? '创建失败');
                  }}
                >
                  确认创建
                </button>
                <button className="secondary-button" type="button" onClick={onBackToTitle}>
                  返回标题页
                </button>
              </div>
            </div>
          </section>

          <aside className="stage-screen__panel">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">基础倾向</h3>
                <p className="stage-screen__panel-copy">右栏补充倾向与创建提示，形成统一三栏舞台。</p>
              </div>
            </div>
            <div className="stage-screen__panel-content">
              <div className="tag-list">
                {TRAIT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`tag-chip ${trait === option.value ? 'tag-chip--active' : ''}`}
                    onClick={() => setTrait(option.value)}
                    title={option.detail}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <article className="stage-screen__list-card">
                <strong>倾向说明</strong>
                <span>{TRAIT_OPTIONS.find((option) => option.value === trait)?.detail}</span>
              </article>
              <article className="stage-screen__list-card">
                <strong>创建结果</strong>
                <span>确认后将直接进入主神世界开场流程。</span>
              </article>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
