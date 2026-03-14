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
    <section className="screen-card">
      <h2 className="screen-card__title">世界投送</h2>
      <p className="screen-card__description">该页面作为主神世界与新世界之间的结构化过渡层，负责显示目标世界并完成初始化。</p>

      <div className="stage1-panel-grid" style={{ flex: 1, minHeight: 0 }}>
        <section className="data-panel">
          <h3 className="data-panel__title">目标世界</h3>
          <div className="screen-scroll-column">
            <article className="data-card">
              <strong>{world?.title ?? '未知世界'}</strong>
              <span>{world?.subtitle ?? '投送信息缺失'}</span>
              <span>{world?.introText ?? '正在准备世界数据……'}</span>
            </article>
          </div>
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">当前状态</h3>
          <div className="screen-scroll-column">
            <article className="data-card">
              <strong>{status === 'failed' ? '进入失败' : '正在投送中'}</strong>
              <span>{message ?? '正在准备中……'}</span>
            </article>
          </div>

          <div className="screen-card__actions">
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
        </section>
      </div>
    </section>
  );
}
