import { createGameStore } from '../../app/store/gameStore';
import { createRun } from '../../domain/run/createRun';
import { resolveNode } from '../../domain/run/resolveNode';
import type { RunState } from '../../types';

function invariant(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function primeStore(run: RunState) {
  const store = createGameStore();
  const current = store.getState();
  current.startNewRun();
  return store;
}

export function runStage4BattleSmokeTest() {
  const baseRun = createRun({ seed: 'stage4-smoke' });
  const afterFirstNode = resolveNode(baseRun, 'node-1', 'choice-search-supplies');
  const battleReadyRun = resolveNode(afterFirstNode, 'node-2', 'choice-engage-raiders');

  invariant(battleReadyRun.presentation.pendingEncounter?.battleId === 'battle-gate-ambush', '第二节点结算后应挂起 gate ambush 战斗');

  const store = primeStore(battleReadyRun);
  const internal = store.getState() as typeof store.getState extends () => infer T ? T : never;
  internal.boot = () => undefined;
  internal.run = battleReadyRun;
  internal.screen = battleReadyRun.presentation.activeScreen;

  internal.openCurrentNode();
  const afterOpen = store.getState();
  invariant(afterOpen.screen === 'battle', '地图进入挂起战斗后应切到 battle screen');
  invariant(afterOpen.run?.presentation.battleContext?.battleState.battleId === 'battle-gate-ambush', '应初始化对应 battle state');
  invariant(Boolean(afterOpen.run?.presentation.battleContext?.awaitingUnitId), '应停在玩家可决策单位');

  let safety = 0;
  while (store.getState().screen === 'battle' && !(store.getState().run?.presentation.battleContext?.battleState.result.finished) && safety < 20) {
    store.getState().submitBattleAction({ actionType: 'attack' });
    safety += 1;
  }

  const completed = store.getState();
  invariant(completed.screen === 'map', '战斗结束后应返回地图');
  invariant(completed.run?.presentation.pendingEncounter === null, '战斗结束后应清空 pending encounter');
  invariant((completed.run?.completedNodeResults[1]?.battleResult?.finished ?? false) === true, '节点结果中应写回 battle result');
  invariant((completed.run?.resources.shards ?? 0) > battleReadyRun.resources.shards, '胜利后应回写碎晶奖励');

  return 'stage4-battle-smoke-test: ok';
}

console.log(runStage4BattleSmokeTest());
