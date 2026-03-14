import { BATTLE_TEMPLATES, ENEMY_TEMPLATES, HERO_ARCHETYPES, HUB_DIALOGUE_LINES, SKILL_TEMPLATES, WORLD_CATALOG } from '../../data';
import {
  ATB_ACTION_ANIMATION_MS,
  ATB_ACTION_MIN_INTERVAL_MS,
  ATB_THRESHOLD,
  advanceAtbTimeline,
} from '../../domain/battle/atb';
import { createBattleState } from '../../domain/battle/createBattleState';
import { resolveTurn } from '../../domain/battle/resolveTurn';
import { applyResourceRewards } from '../../domain/reward/applyRewards';
import { createRun } from '../../domain/run/createRun';
import { getRecruitTemplate, getResolvableEvent, resolveNode } from '../../domain/run/resolveNode';
import { deleteRun, loadRun } from '../../domain/save/loadRun';
import { saveRun } from '../../domain/save/saveRun';
import type {
  BattleState,
  EnemyTemplate,
  EventChoice,
  Identifier,
  PlayerCreationForm,
  PlayerProfile,
  RunEncounterState,
  RunState,
  WorldDefinition,
  WorldEntryContext,
} from '../../types';

export type BattleCommand = {
  actionType: 'attack' | 'skill' | 'guard';
  skillId?: Identifier;
  targetUnitIds?: readonly Identifier[];
};

export type GameStore = {
  appPhase: 'title' | 'characterCreation' | 'hub' | 'worldSelect' | 'worldTransition' | 'worldRun' | 'result';
  run: RunState | null;
  playerProfile: PlayerProfile | null;
  selectedWorldId: Identifier | null;
  worldEntry: WorldEntryContext | null;
  hubDialogueIndex: number;
  worldTransitionStatus: 'idle' | 'ready' | 'failed';
  worldTransitionMessage: string | null;
  boot: () => void;
  enterCharacterCreation: () => void;
  confirmCharacterCreation: (form: PlayerCreationForm) => { ok: boolean; message?: string };
  returnToTitle: () => void;
  advanceHubDialogue: () => void;
  skipHubDialogue: () => void;
  enterWorldSelect: () => void;
  selectWorld: (worldId: Identifier) => void;
  confirmWorldSelection: () => { ok: boolean; message?: string };
  commitWorldTransition: () => void;
  retryWorldTransition: () => void;
  backToHub: () => void;
  selectNode: (nodeId: Identifier) => void;
  openCurrentNode: () => void;
  chooseEvent: (choice: EventChoice) => void;
  dismissRecruitNotice: () => void;
  submitBattleAction: (command: BattleCommand) => void;
  leaveBattleToMap: () => void;
  deleteSave: () => void;
  fleeBattle: () => void;
};

type Listener = () => void;

type BattleDecisionPoint =
  | {
      state: BattleState;
      actorUnitId: Identifier;
      reason: 'player-input';
    }
  | {
      state: BattleState;
      actorUnitId: null;
      reason: 'battle-ended';
    };

function createInitialStore(): GameStore {
  return {
    appPhase: 'title',
    run: null,
    playerProfile: null,
    selectedWorldId: WORLD_CATALOG[0]?.id ?? null,
    worldEntry: null,
    hubDialogueIndex: 0,
    worldTransitionStatus: 'idle',
    worldTransitionMessage: null,
    boot: () => undefined,
    enterCharacterCreation: () => undefined,
    confirmCharacterCreation: () => ({ ok: false, message: '未初始化' }),
    returnToTitle: () => undefined,
    advanceHubDialogue: () => undefined,
    skipHubDialogue: () => undefined,
    enterWorldSelect: () => undefined,
    selectWorld: () => undefined,
    confirmWorldSelection: () => ({ ok: false, message: '未初始化' }),
    commitWorldTransition: () => undefined,
    retryWorldTransition: () => undefined,
    backToHub: () => undefined,
    selectNode: () => undefined,
    openCurrentNode: () => undefined,
    chooseEvent: () => undefined,
    dismissRecruitNotice: () => undefined,
    submitBattleAction: () => undefined,
    leaveBattleToMap: () => undefined,
    deleteSave: () => undefined,
    fleeBattle: () => undefined,
  };
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

function refreshAtbQueue(state: BattleState): BattleState {
  if (state.result.finished) {
    return {
      ...state,
      timeline: {
        ...state.timeline,
        awaitingUnitId: null,
        readyQueue: [],
        animationPhase: 'idle',
      },
    };
  }

  if (state.timeline.readyQueue.length > 0) {
    const nextReadyUnitId = state.timeline.readyQueue.find((unitId) => {
      const unit = state.units.find((candidate) => candidate.unitId === unitId);
      return Boolean(unit && !unit.isDead && unit.canAct && unit.gauge >= ATB_THRESHOLD);
    }) ?? null;

    return {
      ...state,
      timeline: {
        ...state.timeline,
        awaitingUnitId: nextReadyUnitId,
        readyQueue: nextReadyUnitId ? state.timeline.readyQueue : [],
        animationPhase: nextReadyUnitId ? 'queued' : 'idle',
      },
    };
  }

  let workingState = state;
  let safety = 0;

  while (!workingState.result.finished && workingState.timeline.readyQueue.length === 0 && safety < 240) {
    const timeline = advanceAtbTimeline(
      workingState.units.map((unit) => ({
        unitId: unit.unitId,
        rawSpeed: unit.derived.SPD,
        gauge: unit.gauge,
        canAct: unit.canAct,
        isDead: unit.isDead,
      })),
    );

    const nextUnits = workingState.units.map((unit) => {
      const advanced = timeline.advancedUnits.find((candidate) => candidate.unitId === unit.unitId);
      return advanced ? { ...unit, gauge: advanced.gaugeAfterClamp } : unit;
    });

    workingState = {
      ...workingState,
      tick: workingState.tick + 1,
      units: nextUnits,
      timeline: {
        ...workingState.timeline,
        readyQueue: timeline.readyUnitIds,
        awaitingUnitId: timeline.readyUnitIds[0] ?? null,
        animationPhase: timeline.readyUnitIds.length > 0 ? 'queued' : 'idle',
      },
    };
    safety += 1;
  }

  return workingState;
}

function advanceBattleToDecision(state: BattleState): BattleDecisionPoint {
  let nextState = refreshAtbQueue(state);
  let safety = 0;

  while (!nextState.result.finished && safety < 64) {
    const now = Date.now();
    const lockUntil = nextState.timeline.presentationLockUntil ?? 0;
    if (lockUntil > now) {
      nextState = {
        ...nextState,
        timeline: {
          ...nextState.timeline,
          presentationLockUntil: now,
        },
      };
    }

    const actorUnitId = nextState.timeline.awaitingUnitId ?? nextState.timeline.readyQueue[0] ?? null;
    if (!actorUnitId) {
      nextState = refreshAtbQueue(nextState);
      if (!nextState.timeline.awaitingUnitId) {
        return { state: nextState, actorUnitId: null, reason: 'battle-ended' };
      }
      safety += 1;
      continue;
    }

    const actor = nextState.units.find((unit) => unit.unitId === actorUnitId) ?? null;
    if (!actor) {
      return { state: nextState, actorUnitId: null, reason: 'battle-ended' };
    }

    if (actor.side === 'party') {
      return {
        state: {
          ...nextState,
          timeline: {
            ...nextState.timeline,
            awaitingUnitId: actorUnitId,
            animationPhase: 'queued',
          },
        },
        actorUnitId,
        reason: 'player-input',
      };
    }

    const enemyResolved = resolveTurn({
      state: nextState,
      actorUnitId,
      skillTemplates: SKILL_TEMPLATES,
    }).state;

    nextState = refreshAtbQueue({
      ...enemyResolved,
      timeline: {
        ...enemyResolved.timeline,
        lastActionAt: Date.now(),
        presentationLockUntil: Date.now() + Math.max(ATB_ACTION_MIN_INTERVAL_MS, ATB_ACTION_ANIMATION_MS),
      },
    });
    safety += 1;
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

function findWorld(worldId: Identifier | null): WorldDefinition | null {
  if (!worldId) {
    return null;
  }

  return WORLD_CATALOG.find((world) => world.id === worldId) ?? null;
}

function buildPlayerProfile(form: PlayerCreationForm): PlayerProfile | null {
  const trimmedName = form.name.trim();
  if (!trimmedName || trimmedName.length > 12) {
    return null;
  }

  const hero = HERO_ARCHETYPES.find((candidate) => candidate.identity.id === form.heroId);
  if (!hero) {
    return null;
  }

  return {
    playerId: `player-${Date.now()}`,
    name: trimmedName,
    heroId: hero.identity.id,
    trait: form.trait,
    createdAt: Date.now(),
  };
}

function finishBattle(run: RunState, battleState: BattleState): RunState {
  const rewardResult = applyResourceRewards(run.party, {
    battleReward: battleState.result.reward,
  });
  const isBossEncounter = run.presentation.pendingEncounter?.battleId === 'battle-fallen-observatory';
  const isVictory = battleState.result.outcome === 'victory';
  const outcomeText = isVictory ? '战斗胜利，已回收本次奖励。' : '队伍败退，已返回地图。';
  const bossResultSummary = isVictory
    ? `${battleState.metadata?.battleName ?? '终局战斗'} 已完成，队伍成功打通本局闭环。`
    : `${battleState.metadata?.battleName ?? '终局战斗'} 失败，本局在 Boss 节点结束。`;

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
            summary: isBossEncounter ? bossResultSummary : `${result.summary} ${outcomeText}`,
          }
        : result,
    ),
    result: isBossEncounter
      ? {
          outcome: isVictory ? 'victory' : 'defeat',
          summary: bossResultSummary,
          finalNodeId: run.presentation.pendingEncounter?.nodeId ?? null,
        }
      : run.result,
    presentation: {
      ...run.presentation,
      activeScreen: isBossEncounter ? 'result' : 'map',
      pendingEncounter: null,
      battleContext: null,
      currentEvent: null,
      resultMessage: isBossEncounter
        ? bossResultSummary
        : isVictory
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
        appPhase: nextRun.presentation.activeScreen === 'result' ? 'result' : 'worldRun',
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
        appPhase: savedRun.presentation.activeScreen === 'result' ? 'result' : 'worldRun',
        playerProfile: current.playerProfile,
      }));
    },
    enterCharacterCreation: () => {
      setState((current) => ({
        ...current,
        appPhase: 'characterCreation',
        run: null,
        playerProfile: null,
        worldEntry: null,
        worldTransitionStatus: 'idle',
        worldTransitionMessage: null,
      }));
    },
    confirmCharacterCreation: (form) => {
      const profile = buildPlayerProfile(form);
      if (!profile) {
        return { ok: false, message: '请输入 1-12 个字的名称，并选择一个初始角色。' };
      }

      setState((current) => ({
        ...current,
        appPhase: 'hub',
        playerProfile: profile,
        hubDialogueIndex: 0,
        selectedWorldId: WORLD_CATALOG[0]?.id ?? null,
        worldEntry: null,
        worldTransitionStatus: 'idle',
        worldTransitionMessage: null,
        run: null,
      }));

      return { ok: true };
    },
    returnToTitle: () => {
      setState((current) => ({
        ...current,
        appPhase: 'title',
        run: null,
        playerProfile: null,
        selectedWorldId: WORLD_CATALOG[0]?.id ?? null,
        worldEntry: null,
        hubDialogueIndex: 0,
        worldTransitionStatus: 'idle',
        worldTransitionMessage: null,
      }));
    },
    advanceHubDialogue: () => {
      setState((current) => {
        const lastIndex = Math.max(HUB_DIALOGUE_LINES.length - 1, 0);
        const nextIndex = Math.min(current.hubDialogueIndex + 1, lastIndex);
        return {
          ...current,
          hubDialogueIndex: nextIndex,
        };
      });
    },
    skipHubDialogue: () => {
      setState((current) => ({
        ...current,
        hubDialogueIndex: Math.max(HUB_DIALOGUE_LINES.length - 1, 0),
      }));
    },
    enterWorldSelect: () => {
      setState((current) => ({
        ...current,
        appPhase: 'worldSelect',
      }));
    },
    selectWorld: (worldId) => {
      setState((current) => ({
        ...current,
        selectedWorldId: worldId,
      }));
    },
    confirmWorldSelection: () => {
      const selectedWorld = findWorld(state.selectedWorldId);
      if (!state.playerProfile) {
        return { ok: false, message: '角色数据缺失，无法进入世界。' };
      }

      if (!selectedWorld || selectedWorld.unlockStatus !== 'available') {
        return { ok: false, message: '当前未找到可进入的世界。' };
      }

      const entry: WorldEntryContext = {
        runId: `run-${Date.now()}`,
        worldId: selectedWorld.id,
        flowId: selectedWorld.flowId,
        selectedAt: Date.now(),
        playerProfile: state.playerProfile,
      };

      setState((current) => ({
        ...current,
        appPhase: 'worldTransition',
        worldEntry: entry,
        worldTransitionStatus: 'ready',
        worldTransitionMessage: `正在投送至 ${selectedWorld.title}……`,
      }));

      return { ok: true };
    },
    commitWorldTransition: () => {
      const selectedWorld = findWorld(state.worldEntry?.worldId ?? state.selectedWorldId);
      if (!selectedWorld || !state.playerProfile) {
        setState((current) => ({
          ...current,
          worldTransitionStatus: 'failed',
          worldTransitionMessage: '世界初始化失败，请返回主神世界重试。',
        }));
        return;
      }

      const nextRun = saveRun(
        createRun({
          heroId: state.playerProfile.heroId,
          seed: state.worldEntry?.runId,
          playerName: state.playerProfile.name,
          worldName: selectedWorld.title,
        }),
      );

      setState((current) => ({
        ...current,
        run: nextRun,
        appPhase: 'worldRun',
        worldTransitionStatus: 'ready',
        worldTransitionMessage: `${selectedWorld.title} 已完成投送。`,
      }));
    },
    retryWorldTransition: () => {
      setState((current) => ({
        ...current,
        appPhase: 'worldTransition',
        worldTransitionStatus: 'ready',
        worldTransitionMessage: current.worldEntry ? `重新准备进入 ${findWorld(current.worldEntry.worldId)?.title ?? '目标世界'}……` : '重新准备进入世界……',
      }));
    },
    backToHub: () => {
      setState((current) => ({
        ...current,
        appPhase: 'hub',
        worldTransitionStatus: 'idle',
        worldTransitionMessage: null,
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
    deleteSave: () => {
      deleteRun();
      setState((current) => ({
        ...current,
        run: null,
        appPhase: 'title',
      }));
    },
    fleeBattle: () => {
      updateRun((run) => {
        if (!run.presentation.battleContext?.battleState) {
          return run;
        }

        return {
          ...run,
          presentation: {
            ...run.presentation,
            activeScreen: 'map',
            battleContext: null,
            pendingEncounter: null,
            resultMessage: '队伍撤退，已返回地图。',
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
