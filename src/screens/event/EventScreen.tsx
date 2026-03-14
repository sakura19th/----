import type { EventChoice, RunState } from '../../types';

type EventScreenProps = {
  run: RunState;
  onChoose: (choice: EventChoice) => void;
};

function isChoiceDisabled(run: RunState, choice: EventChoice) {
  if (!choice.conditions?.minimumShards) {
    return false;
  }

  return run.resources.shards < choice.conditions.minimumShards;
}

export function EventScreen({ run, onChoose }: EventScreenProps) {
  const event = run.presentation.currentEvent;

  if (!event) {
    return null;
  }

  return (
    <section className="screen-card stage1-screen-card">
      <span className="screen-card__eyebrow">Stage 2 / Event</span>
      <h2 className="screen-card__title">{event.text.title}</h2>
      <p className="screen-card__description">{event.text.description}</p>

      <div className="stage2-choice-list">
        {event.choices.map((choice) => {
          const disabled = isChoiceDisabled(run, choice);
          return (
            <article className="data-card" key={choice.id}>
              <strong>{choice.text}</strong>
              <span>{choice.outcomeText}</span>
              {choice.conditions?.minimumShards ? <span>需要碎晶：{choice.conditions.minimumShards}</span> : null}
              <button className="primary-button" type="button" onClick={() => onChoose(choice)} disabled={disabled}>
                {disabled ? '碎晶不足' : '执行选项'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
