import type { EventChoice, RunState } from '../../types';

type RecruitScreenProps = {
  run: RunState;
  onChoose: (choice: EventChoice) => void;
};

export function RecruitScreen({ run, onChoose }: RecruitScreenProps) {
  const event = run.presentation.currentEvent;

  if (!event) {
    return null;
  }

  return (
    <section className="game-layout__card">
      <h2 className="screen-card__title">{event.text.title}</h2>
      <p className="screen-card__description">{event.text.description}</p>
      <p className="screen-card__description">本页只接通最小招募结算：满足条件时将队员加入队伍并返回地图，不进入更复杂的确认流程。</p>

      <div className="stage2-choice-list">
        {event.choices.map((choice) => {
          const requiredShards = choice.conditions?.minimumShards ?? 0;
          const disabled = run.resources.shards < requiredShards;

          return (
            <article className="data-card" key={choice.id}>
              <strong>{choice.text}</strong>
              <span>{choice.outcomeText}</span>
              <span>所需碎晶：{requiredShards}</span>
              <button className="primary-button" type="button" onClick={() => onChoose(choice)} disabled={disabled}>
                {disabled ? '碎晶不足' : '执行招募'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
