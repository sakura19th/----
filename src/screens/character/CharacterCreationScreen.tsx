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
    <section className="screen-card">
      <h2 className="screen-card__title">自定义新建人物</h2>
      <p className="screen-card__description">
        本轮先采用最小可用闭环方案：输入角色名、选择一名主角原型与基础倾向，然后直接进入主神世界。
      </p>

      <div className="stage1-panel-grid" style={{ flex: 1, minHeight: 0 }}>
        <section className="data-panel">
          <h3 className="data-panel__title">创建信息</h3>
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
                  className={`data-card map-node-card ${heroId === hero.identity.id ? 'map-node-card--selected' : ''}`}
                  onClick={() => setHeroId(hero.identity.id)}
                >
                  <strong>{hero.identity.title}</strong>
                  <span>{hero.identity.name}</span>
                  <span>{hero.classKey} / {hero.role}</span>
                </button>
              ))}
            </div>

            <h4 className="data-panel__title">基础倾向</h4>
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
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">预览</h3>
          <div className="screen-scroll-column">
            {selectedHero && (
              <article className="data-card">
                <strong>{name.trim() || selectedHero.identity.name}</strong>
                <span>{selectedHero.identity.title}</span>
                <span>{selectedHero.narrative.background}</span>
                <span>战斗定位：{selectedHero.classKey} / {selectedHero.role}</span>
                <span>
                  属性：攻击 {selectedHero.stats.attack} / 防御 {selectedHero.stats.defense} / 速度 {selectedHero.stats.speed} / 灵力 {selectedHero.stats.spirit}
                </span>
                <span>倾向：{TRAIT_OPTIONS.find((option) => option.value === trait)?.label}</span>
              </article>
            )}

            {errorMessage && <p className="inline-result inline-result--warning">{errorMessage}</p>}
          </div>

          <div className="screen-card__actions">
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
        </section>
      </div>
    </section>
  );
}
