import type { RunState } from '../../types';

export const STAGE2_AUTOSAVE_KEY = 'infinite-world-stage2-autosave';

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function saveRun(run: RunState): RunState {
  const timestamp = new Date().toISOString();
  const nextRun: RunState = {
    ...run,
    save: {
      ...run.save,
      lastSavedAt: timestamp,
      autoSaveCount: run.save.autoSaveCount + 1,
    },
  };

  if (hasLocalStorage()) {
    window.localStorage.setItem(STAGE2_AUTOSAVE_KEY, JSON.stringify(nextRun));
  }

  return nextRun;
}
