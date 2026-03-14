import { HUB_DIALOGUE_LINES } from '../../data';
import type { PlayerProfile } from '../../types';

function getSpeakerLabel(speaker: 'system' | 'lord-god' | 'guide') {
  switch (speaker) {
    case 'lord-god':
      return '主神';
    case 'guide':
      return '引导终端';
    case 'system':
    default:
      return '系统';
  }
}

type HubScreenProps = {
  playerProfile: PlayerProfile | null;
  dialogueIndex: number;
  onNext: () => void;
  onSkip: () => void;
  onEnterWorldSelect: () => void;
};

export function HubScreen({ playerProfile, dialogueIndex, onNext, onSkip, onEnterWorldSelect }: HubScreenProps) {
  const currentLine = HUB_DIALOGUE_LINES[Math.min(dialogueIndex, HUB_DIALOGUE_LINES.length - 1)] ?? null;
  const isLastLine = dialogueIndex >= HUB_DIALOGUE_LINES.length - 1;

  return (
    <section className="stage-screen">
      <div className="stage-screen__card">
        <header className="stage-screen__hero">
          <div className="stage-screen__hero-main">
            <span className="screen-card__eyebrow">Hub / 主神世界</span>
            <h2 className="screen-card__title">主神世界</h2>
            <p className="screen-card__description">开场对话、角色状态与下一步入口统一置于全屏舞台，不再停留在左上角窄卡片。</p>
            <div className="stage-screen__meta">
              <span className="stage-screen__meta-chip">对话进度：{Math.min(dialogueIndex + 1, HUB_DIALOGUE_LINES.length)}/{HUB_DIALOGUE_LINES.length}</span>
              <span className="stage-screen__meta-chip">当前角色：{playerProfile?.name ?? '未创建角色'}</span>
              <span className="stage-screen__meta-chip">下个流程：{isLastLine ? '世界选择' : '继续对话'}</span>
            </div>
          </div>
          <aside className="stage-screen__hero-side">
            <div className="stage-screen__list-card">
              <strong>舞台说明</strong>
              <span>宽屏为双栏主舞台，核心对话占主区域，角色信息作为右侧辅助列展示。</span>
            </div>
            <div className="stage-screen__list-card">
              <strong>当前状态</strong>
              <span>{isLastLine ? '对话完成，可进入世界选择。' : '继续阅读固定开场对话。'}</span>
            </div>
          </aside>
        </header>

        <div className="stage-screen__grid stage-screen__grid--two">
          <section className="stage-screen__panel stage-screen__panel--emphasis">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">开场对话</h3>
                <p className="stage-screen__panel-copy">主区域承载叙事内容，并把操作按钮固定在栏底部。</p>
              </div>
            </div>
            <div className="stage-screen__panel-content">
              {currentLine ? (
                <article className="stage-screen__list-card">
                  <strong>{getSpeakerLabel(currentLine.speaker)}</strong>
                  <span>{currentLine.text}</span>
                  <span>进度：{Math.min(dialogueIndex + 1, HUB_DIALOGUE_LINES.length)}/{HUB_DIALOGUE_LINES.length}</span>
                </article>
              ) : (
                <article className="stage-screen__list-card">
                  <strong>系统</strong>
                  <span>欢迎来到主神世界，请选择要进入的世界。</span>
                </article>
              )}
            </div>
            <div className="stage-screen__panel-actions">
              <div className="stage-screen__actions">
                {!isLastLine ? (
                  <button className="primary-button" type="button" onClick={onNext}>
                    下一句
                  </button>
                ) : (
                  <button className="primary-button" type="button" onClick={onEnterWorldSelect}>
                    前往世界选择
                  </button>
                )}
                {!isLastLine && (
                  <button className="secondary-button" type="button" onClick={onSkip}>
                    跳过对话
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="stage-screen__panel">
            <div className="stage-screen__panel-header">
              <div>
                <h3 className="data-panel__title">当前角色</h3>
                <p className="stage-screen__panel-copy">右侧信息列在宽屏下保持存在，窄屏时自动下折。</p>
              </div>
            </div>
            <div className="stage-screen__panel-content">
              {playerProfile ? (
                <>
                  <article className="stage-screen__list-card">
                    <strong>{playerProfile.name}</strong>
                    <span>初始角色：{playerProfile.heroId}</span>
                    <span>基础倾向：{playerProfile.trait}</span>
                    <span>状态：等待进入第一个试炼世界</span>
                  </article>
                  <article className="stage-screen__list-card">
                    <strong>流程提示</strong>
                    <span>完成固定开场对话后，直接进入世界选择主舞台。</span>
                  </article>
                </>
              ) : (
                <article className="stage-screen__list-card">
                  <strong>角色数据缺失</strong>
                  <span>请返回标题页重新创建角色。</span>
                </article>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
