import { useEffect } from 'react';
import { WORLD_CATALOG } from '../../data';
import type { WorldEntryContext } from '../../types';

type WorldTransitionScreenProps = {
  entry: WorldEntryContext | null;
  status: 'idle' | 'ready' | 'failed';
  message: string | null;
  onCommit: () => void;
  onRetry: () => void;
  onBack: () => void;
};

export function WorldTransitionScreen({ entry, status, message, onCommit, onRetry, onBack }: WorldTransitionScreenProps) {
  const world = WORLD_CATALOG.find((candidate) => candidate.id === entry?.worldId) ?? null;

  useEffect(() => {
    if (status === 'ready') {
      const timer = window.setTimeout(() => {
        onCommit();
      }, 600);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [onCommit, status]);

  return (
    <section className="stage-screen">
      <div className="stage-screen__card">
        <header className="stage-screen__hero">
          <div className="stage-screen__hero-main">
            <span className="screen-card__eyebrow">World Transition / 投送舞台</span>
            <h2 className="screen-card__title">世界投送</h2>
            <p className="screen-card__description">该页面作为主神世界与新世界之间的结构化过渡层，采用全屏双栏舞台突出目标世界与投送状态。</p>
            <div className="stage-screen__meta">
              <span className="stage-screen__meta-chip">目标世界：{world?.title ?? '未知世界'}</span>
              <span className="stage-screen__meta-chip">状态：{status === 'failed' ? '失败' : status === 'ready' ? '准备完成' : '初始化中'}</span>
              <span className="stage-screen__meta-chip">入口编号：{entry?.worldId ?? '缺失'}</span>
            </div>
          </div>
          <aside className="stage-screen__hero-side">
            <div className="stage-screen__list-card">
              <strong>过渡说明</strong>
              <span>宽屏保持左主右辅结构，低高度时仍只在内部栏目产生滚动。</span>
            </div>
          </aside>
        </header>

        <div className="stage-screen__grid stage-screen__grid--two">
          <section className="stage-screen__panel stage-screen__panel--emphasis">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">目标世界</h3>
                <p className="stage-screen__panel-copy">左侧主栏展示核心世界情报与投送文本。</p>
              </div>
            </div>
            <div className="stage-screen__panel-content">
              <article className="stage-screen__list-card">
                <strong>{world?.title ?? '未知世界'}</strong>
                <span>{world?.subtitle ?? '投送信息缺失'}</span>
                <span>{world?.introText ?? '正在准备世界数据……'}</span>
                <span>{world?.description ?? '尚未加载完整世界描述。'}</span>
              </article>
            </div>
          </section>

          <section className="stage-screen__panel">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">当前状态</h3>
                <p className="stage-screen__panel-copy">右侧承载状态提示与进入动作，保证布局统一。</p>
              </div>
            </div>
            <div className="stage-screen__panel-content">
              <article className="stage-screen__list-card">
                <strong>{status === 'failed' ? '进入失败' : '正在投送中'}</strong>
                <span>{message ?? '正在准备中……'}</span>
              </article>
              <article className="stage-screen__list-card">
                <strong>操作提示</strong>
                <span>{status === 'ready' ? '世界已就绪，可立即提交进入。' : '如初始化异常，可返回主神世界或重新尝试。'}</span>
              </article>
            </div>
            <div className="stage-screen__panel-actions">
              <div className="stage-screen__actions">
                {status === 'failed' ? (
                  <button className="primary-button" type="button" onClick={onRetry}>
                    重试进入
                  </button>
                ) : (
                  <button className="primary-button" type="button" onClick={onCommit}>
                    立即进入
                  </button>
                )}
                <button className="secondary-button" type="button" onClick={onBack}>
                  返回主神世界
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
