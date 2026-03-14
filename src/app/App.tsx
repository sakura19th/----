import { useEffect } from 'react';
import { ScreenFrame } from '../components/layout/ScreenFrame';
import { BattleScreen } from '../screens/battle/BattleScreen';
import { EventScreen } from '../screens/event/EventScreen';
import { MapScreen } from '../screens/map/MapScreen';
import { RecruitScreen } from '../screens/recruit/RecruitScreen';
import { ResultScreen } from '../screens/result/ResultScreen';
import { StartScreen } from '../screens/start/StartScreen';
import { TitleScreen } from '../screens/title/TitleScreen';
import { getGameStore, useGameStore } from './store/useGameStore';

export function App() {
  const store = useGameStore();

  useEffect(() => {
    getGameStore().getState().boot();
  }, []);

  let screen = <TitleScreen onStart={store.enterStart} onDeleteSave={store.deleteSave} hasSave={store.run !== null} />;

  if (store.screen === 'start') {
    screen = <StartScreen onStartRun={store.startNewRun} onBackToTitle={store.returnToTitle} />;
  } else if (store.screen === 'map' && store.run) {
    screen = (
      <MapScreen
        run={store.run}
        onSelectNode={store.selectNode}
        onOpenNode={store.openCurrentNode}
        onBackToTitle={store.returnToTitle}
      />
    );
  } else if (store.screen === 'event' && store.run) {
    screen = <EventScreen run={store.run} onChoose={store.chooseEvent} />;
  } else if (store.screen === 'recruit' && store.run) {
    screen = <RecruitScreen run={store.run} onChoose={store.chooseEvent} />;
  } else if (store.screen === 'battle' && store.run) {
    screen = <BattleScreen run={store.run} onSubmitAction={store.submitBattleAction} onBackToMap={store.leaveBattleToMap} onFleeBattle={store.fleeBattle} />;
  } else if (store.screen === 'result' && store.run) {
    screen = <ResultScreen run={store.run} onReturnToTitle={store.returnToTitle} />;
  }

  return <ScreenFrame>{screen}</ScreenFrame>;
}
