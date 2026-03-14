import type { PropsWithChildren } from 'react';
import type { RunState } from '../../types';
import { deriveCombatStats } from '../../domain/formulas/deriveCombatStats';

type GameLayoutProps = PropsWithChildren<{
  run: RunState;
}>;

function getMemberResources(member: RunState['party'][number]) {
  const derived = deriveCombatStats({ ...member.stats, level: member.progression?.level ?? 1 });
  const maxHp = derived.maxHp;
  const maxSp = derived.maxSp;
  const hp = member.stats.hp ?? maxHp;
  const sp = member.stats.sp ?? maxSp;
  return { hp: Math.min(hp, maxHp), maxHp, sp: Math.min(sp, maxSp), maxSp };
}

function PartyPanel({ run }: { run: RunState }) {
  return (
    <div className="game-layout__sidebar game-layout__sidebar--left">
      <div className="game-layout__panel">
        <h3 className="data-panel__title">队伍</h3>
        <div className="party-list">
          {run.party.map((member) => {
            const r = getMemberResources(member);
            return (
              <article className="data-card" key={member.instanceId}>
                <strong>
                  {member.identity.name} / {member.identity.title}
                </strong>
                <span>
                  {member.classKey} · {member.role}
                </span>
                <span className="text-gray-400">
                  HP {r.hp}/{r.maxHp} · SP {r.sp}/{r.maxSp}
                </span>
                <span>
                  状态：{member.activeStatusEffects.length > 0 ? member.activeStatusEffects.join('、') : '无'}
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ResourcePanel({ run }: { run: RunState }) {
  return (
    <div className="game-layout__sidebar game-layout__sidebar--right">
      <div className="game-layout__panel">
        <h3 className="data-panel__title">本局概览</h3>
        <dl className="kv-list">
          <div>
            <dt>Seed</dt>
            <dd>{run.snapshot.seed.runSeed}</dd>
          </div>
          <div>
            <dt>世界碎片</dt>
            <dd>{run.snapshot.seed.worldShard}</dd>
          </div>
          <div>
            <dt>碎晶</dt>
            <dd>{run.resources.shards}</dd>
          </div>
          <div>
            <dt>补给</dt>
            <dd>{run.resources.supply}</dd>
          </div>
          <div>
            <dt>自动存档</dt>
            <dd>{run.save.autoSaveCount} 次</dd>
          </div>
        </dl>
        {run.presentation.resultMessage ? <p className="inline-result">{run.presentation.resultMessage}</p> : null}
      </div>
    </div>
  );
}

export function GameLayout({ run, children }: GameLayoutProps) {
  return (
    <div className="game-layout">
      <PartyPanel run={run} />
      <main className="game-layout__center">{children}</main>
      <ResourcePanel run={run} />
    </div>
  );
}
