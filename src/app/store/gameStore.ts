import { BATTLE_TEMPLATES, ENEMY_TEMPLATES, SKILL_TEMPLATES } from '../../data';
import { createBattleState } from '../../domain/battle/createBattleState';
import { resolveTurn } from '../../domain/battle/resolveTurn';
import { applyResourceRewards } from '../../domain/reward/applyRewards';
import { createRun } from '../../domain/run/createRun';
import { getRecruitTemplate, getResolvableEvent, resolveNode } from '../../domain/run/resolveNode';
import { loadRun } from '../../domain/save/loadRun';
import { saveRun } from '../../domain/save/saveRun';
import type { BattleState, EnemyTemplate, EventChoice, Identifier, RunEncounterState, RunScreen, RunState } from '../../types';

export type BattleCommand = {
  actionType: 'attack' | 'skill' | 'guard';
  skillId?: Identifier;
  targetUnitIds?: readonly Identifier[];
};

export type GameStore = {
  screen: RunScreen;
  run: RunState | null;
  boot: () => void;
  enterStart: () => void;
  startNewRun: () => void;
  returnToTitle: () => void;
  selectNode: (nodeId: Identifier) => void;
  openCurrentNode: () => void;
  chooseEvent: (choice: EventChoice) => void;
  dismissRecruitNotice: () => void;
  submitBattleAction: (command: BattleCommand) => void;
  leaveBattleToMap: () => void;
};

type Listener = () => void;

type BattleDecisionPoint = {
  state: BattleState;
  actorUnitId: Identifier;
  reason: 'player-input';
} | {
  state: BattleState;
  actorUnitId: null;
  reason: 'battle-ended';
};

function createInitialStore(): GameStore {
  return {
    screen: 'title',
    run: null,
    boot: () => undefined,
    enterStart: () => undefined,
    startNewRun: () => undefined,
    returnToTitle: () => undefined,
    selectNode: () => undefined,
    openCurrentNode: () => undefined,
    chooseEvent: () => undefined,
    dismissRecruitNotice: () => undefined,
    submitBattleAction: () => undefined,
    leaveBattleToMap: () => undefined,
  };
}

function deriveScreen(run: RunState | null, fallback: RunScreen): RunScreen {
  return run?.presentation.activeScreen ?? fallback;
}

function createDeterministicRandom(seedText: string) {
  let state = seedText.split('').reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261) || 123456789;

  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  return {
    next,
    nextInRange: (min: number, max: number) => min + (max - min) * next(),
    factor: () => next(),
  };
}

function getBattleTemplate(battleId: Identifier) {
  return BATTLE_TEMPLATES.find((candidate) => candidate.id === battleId) ?? null;
}

function getBattleEnemies(encounter: RunEncounterState): readonly EnemyTemplate[] {
  if (!encounter.battleId) {
    return [];
  }

  const template = getBattleTemplate(encounter.battleId);
  if (!template) {
    return [];
  }

  const enemies: EnemyTemplate[] = [];
  for (const enemyId of template.enemyIds) {
    const enemy = ENEMY_TEMPLATES.find((candidate) => candidate.identity.id === enemyId);
    if (enemy) {
      enemies.push(enemy);
    }
  }

  return enemies;
}

function getNextReadyUnitId(state: BattleState) {
  const sortedUnits = [...state.units].sort(
    (left, right) => left.runtime.actionCount - right.runtime.actionCount || right.derived.SPD - left.derived.SPD || left.index - right.index,
  );

  return sortedUnits.find((unit) => !unit.isDead && unit.canAct)?.unitId ?? null;
}

function advanceBattleToDecision(state: BattleState): BattleDecisionPoint {
  let nextState = state;

  while (!nextState.result.finished) {
    const actorUnitId = getNextReadyUnitId(nextState);
    if (!actorUnitId) {
      return { state: nextState, actorUnitId: null, reason: 'battle-ended' };
    }

    const actor = nextState.units.find((unit) => unit.unitId === actorUnitId) ?? null;
    if (!actor) {
      return { state: nextState, actorUnitId: null, reason: 'battle-ended' };
    }

    if (actor.side === 'party') {
      return { state: nextState, actorUnitId, reason: 'player-input' };
    }

    nextState = resolveTurn({
      state: nextState,
      actorUnitId,
      skillTemplates: SKILL_TEMPLATES,
    }).state;
  }

  return { state: nextState, actorUnitId: null, reason: 'battle-ended' };
}

function createBattleEncounter(run: RunState, encounter: RunEncounterState) {
  if (!encounter.battleId) {
    return null;
  }

  const template = getBattleTemplate(encounter.battleId);
  const enemies = getBattleEnemies(encounter);
  if (!template || enemies.length === 0) {
    return null;
  }

  const createdState = createBattleState({
    battleId: template.id,
    party: run.party,
    enemies,
    skillTemplates: SKILL_TEMPLATES,
    realmGap: 0,
    rewardConfig: {
      baseShards: enemies.reduce((sum, enemy) => sum + enemy.rewardShards, 0),
    },
    random: createDeterministicRandom(`${run.snapshot.seed.runSeed}:${template.id}`),
    metadata: {
      battlefieldTag: template.battlefieldTag,
      battleName: template.name,
    },
  });

  return advanceBattleToDecision(createdState);
}

function finishBattle(run: RunState, battleState: BattleState): RunState {
  const rewardResult = applyResourceRewards(run.party, {
    battleReward: battleState.result.reward,
  });

  const outcomeText = battleState.result.outcome === 'victory' ? '战斗胜利，已回收本次奖励。' : '队伍败退，已返回地图。';

  return {
    ...run,
    leader: rewardResult.party[0] ?? run.leader,
    party: rewardResult.party,
    resources: {
      shards: run.resources.shards + rewardResult.gainedShards,
      supply: run.resources.supply + rewardResult.gainedSupply,
    },
    completedNodeResults: run.completedNodeResults.map((result) =>
      result.nodeId === run.presentation.pendingEncounter?.nodeId
        ? {
            ...result,
            battleResult: battleState.result,
            summary: `${result.summary} ${outcomeText}`,
          }
        : result,
    ),
    presentation: {
      ...run.presentation,
      activeScreen: 'map',
      pendingEncounter: null,
      battleContext: null,
      resultMessage:
        battleState.result.outcome === 'victory'
          ? `${battleState.metadata?.battleName ?? '战斗'} 胜利，获得碎晶 ${rewardResult.gainedShards}${rewardResult.gainedSupply ? `，补给 ${rewardResult.gainedSupply}` : ''}。`
          : `${battleState.metadata?.battleName ?? '战斗'} 失败，队伍状态已同步回地图。`,
    },
  };
}

export function createGameStore() {
  let state = createInitialStore();
  const listeners = new Set<Listener>();

  const setState = (updater: (current: GameStore) => GameStore) => {
    state = updater(state);
    listeners.forEach((listener) => listener());
  };

  const updateRun = (updater: (run: RunState) => RunState) => {
    setState((current) => {
      if (!current.run) {
        return current;
      }

      const nextRun = saveRun(updater(current.run));
      return {
        ...current,
        run: nextRun,
        screen: deriveScreen(nextRun, current.screen),
      };
    });
  };

  state = {
    ...state,
    boot: () => {
      const savedRun = loadRun();
      if (!savedRun) {
        return;
      }

      setState((current) => ({
        ...current,
        run: savedRun,
        screen: deriveScreen(savedRun, 'title'),
      }));
    },
    enterStart: () => {
      setState((current) => ({
        ...current,
        screen: 'start',
      }));
    },
    startNewRun: () => {
      const nextRun = saveRun(createRun());
      setState((current) => ({
        ...current,
        run: nextRun,
        screen: 'map',
      }));
    },
    returnToTitle: () => {
      setState((current) => ({
        ...current,
        screen: 'title',
      }));
    },
    selectNode: (nodeId) => {
      updateRun((run) => ({
        ...run,
        presentation: {
          ...run.presentation,
          selectedNodeId: nodeId,
        },
      }));
    },
    openCurrentNode: () => {
      updateRun((run) => {
        const encounter = run.presentation.pendingEncounter;
        if (encounter?.battleId) {
          const decision = createBattleEncounter(run, encounter);
          if (!decision) {
            return {
              ...run,
              presentation: {
                ...run.presentation,
                pendingEncounter: null,
                battleContext: null,
                resultMessage: '未能初始化战斗，已回到地图。',
              },
            };
          }

          const battleRun: RunState = {
            ...run,
            presentation: {
              ...run.presentation,
              activeScreen: 'battle',
              currentEvent: null,
              resultMessage: null,
              battleContext: {
                battleId: encounter.battleId,
                battleState: decision.state,
                awaitingUnitId: decision.actorUnitId,
                selectedSkillId: null,
                selectedTargetIds: [],
              },
            },
          };

          return decision.reason === 'battle-ended' ? finishBattle(battleRun, decision.state) : battleRun;
        }

        const selectedNodeId = run.presentation.selectedNodeId ?? run.currentNodeId;
        const event = getResolvableEvent(run, selectedNodeId);
        if (!event) {
          return run;
        }

        return {
          ...run,
          currentNodeId: selectedNodeId,
          presentation: {
            ...run.presentation,
            activeScreen: event.nodeType === 'recruit' ? 'recruit' : 'event',
            currentEvent: event,
            currentChoice: null,
            resultMessage: null,
          },
        };
      });
    },
    chooseEvent: (choice) => {
      updateRun((run) => resolveNode(run, run.currentNodeId, choice.id));
    },
    dismissRecruitNotice: () => {
      updateRun((run) => {
        const recruitId = run.presentation.pendingEncounter?.recruitId;
        const recruit = recruitId ? getRecruitTemplate(recruitId) : null;

        return {
          ...run,
          presentation: {
            ...run.presentation,
            pendingEncounter: null,
            resultMessage: recruit ? `${recruit.identity.name} 已完成招募并编入当前队伍。` : run.presentation.resultMessage,
          },
        };
      });
    },
    submitBattleAction: (command) => {
      updateRun((run) => {
        const battleContext = run.presentation.battleContext;
        if (!battleContext?.battleState || !battleContext.awaitingUnitId || battleContext.battleState.result.finished) {
          return run;
        }

        const playerResolved = resolveTurn({
          state: battleContext.battleState,
          actorUnitId: battleContext.awaitingUnitId,
          skillTemplates: SKILL_TEMPLATES,
          action: command,
        }).state;

        const decision = advanceBattleToDecision(playerResolved);

        if (decision.reason === 'battle-ended' || decision.state.result.finished) {
          return finishBattle(
            {
              ...run,
              presentation: {
                ...run.presentation,
                battleContext: {
                  ...battleContext,
                  battleState: decision.state,
                  awaitingUnitId: null,
                  selectedSkillId: null,
                  selectedTargetIds: [],
                },
              },
            },
            decision.state,
          );
        }

        return {
          ...run,
          presentation: {
            ...run.presentation,
            activeScreen: 'battle',
            battleContext: {
              ...battleContext,
              battleState: decision.state,
              awaitingUnitId: decision.actorUnitId,
              selectedSkillId: null,
              selectedTargetIds: [],
            },
          },
        };
      });
    },
    leaveBattleToMap: () => {
      updateRun((run) => {
        const battleState = run.presentation.battleContext?.battleState;
        if (!battleState?.result.finished) {
          return run;
        }

        return {
          ...run,
          presentation: {
            ...run.presentation,
            activeScreen: 'map',
            battleContext: null,
          },
        };
      });
    },
  };

  return {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
