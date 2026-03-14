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
    <section className="screen-card">
      <h2 className="screen-card__title">主神世界</h2>
      <p className="screen-card__description">角色创建完成后，先通过一段固定开场对话建立本局目标，再进入世界选择。</p>

      <div className="stage1-panel-grid" style={{ flex: 1, minHeight: 0 }}>
        <section className="data-panel">
          <h3 className="data-panel__title">开场对话</h3>
          <div className="screen-scroll-column">
            {currentLine ? (
              <article className="data-card">
                <strong>{getSpeakerLabel(currentLine.speaker)}</strong>
                <span>{currentLine.text}</span>
                <span>进度：{Math.min(dialogueIndex + 1, HUB_DIALOGUE_LINES.length)}/{HUB_DIALOGUE_LINES.length}</span>
              </article>
            ) : (
              <article className="data-card">
                <strong>系统</strong>
                <span>欢迎来到主神世界，请选择要进入的世界。</span>
              </article>
            )}
          </div>

          <div className="screen-card__actions">
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
        </section>

        <section className="data-panel">
          <h3 className="data-panel__title">当前角色</h3>
          <div className="screen-scroll-column">
            {playerProfile ? (
              <article className="data-card">
                <strong>{playerProfile.name}</strong>
                <span>初始角色：{playerProfile.heroId}</span>
                <span>基础倾向：{playerProfile.trait}</span>
                <span>状态：等待进入第一个试炼世界</span>
              </article>
            ) : (
              <article className="data-card">
                <strong>角色数据缺失</strong>
                <span>请返回标题页重新创建角色。</span>
              </article>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
