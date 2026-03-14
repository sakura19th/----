import { createRun } from '../../domain/run/createRun';
import { getRecruitTemplate, getResolvableEvent, resolveNode } from '../../domain/run/resolveNode';
import { loadRun } from '../../domain/save/loadRun';
import { saveRun } from '../../domain/save/saveRun';
import type { EventChoice, Identifier, RunScreen, RunState } from '../../types';

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
};

type Listener = () => void;

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
  };
}

function deriveScreen(run: RunState | null, fallback: RunScreen): RunScreen {
  return run?.presentation.activeScreen ?? fallback;
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
  };

  return {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
