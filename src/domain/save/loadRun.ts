import type { RunState } from '../../types';
import { STAGE2_AUTOSAVE_KEY } from './saveRun';

function hasLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadRun(): RunState | null {
  if (!hasLocalStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(STAGE2_AUTOSAVE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RunState;
  } catch {
    return null;
  }
}
