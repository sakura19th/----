import { useSyncExternalStore } from 'react';
import { createGameStore } from './gameStore';

const gameStore = createGameStore();

export function useGameStore() {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getState, gameStore.getState);
}

export function getGameStore() {
  return gameStore;
}
