import { useEffect } from 'react';
import { GameLayout } from '../components/layout/GameLayout';
import { ScreenFrame } from '../components/layout/ScreenFrame';
import { CharacterCreationScreen } from '../screens/character/CharacterCreationScreen';
import { HubScreen } from '../screens/hub/HubScreen';
import { BattleScreen } from '../screens/battle/BattleScreen';
import { EventScreen } from '../screens/event/EventScreen';
import { MapScreen } from '../screens/map/MapScreen';
import { RecruitScreen } from '../screens/recruit/RecruitScreen';
import { ResultScreen } from '../screens/result/ResultScreen';
import { TitleScreen } from '../screens/title/TitleScreen';
import { WorldSelectScreen } from '../screens/world-select/WorldSelectScreen';
import { WorldTransitionScreen } from '../screens/world-transition/WorldTransitionScreen';
import { getGameStore, useGameStore } from './store/useGameStore';

export function App() {
  const store = useGameStore();

  useEffect(() => {
    getGameStore().getState().boot();
  }, []);

  const isGameScreen = store.appPhase !== 'title';

  let screen = <TitleScreen onStart={store.enterCharacterCreation} onDeleteSave={store.deleteSave} hasSave={store.run !== null} />;

  if (store.appPhase === 'characterCreation') {
    screen = <CharacterCreationScreen onConfirm={store.confirmCharacterCreation} onBackToTitle={store.returnToTitle} />;
  } else if (store.appPhase === 'hub') {
    screen = (
      <HubScreen
        playerProfile={store.playerProfile}
        dialogueIndex={store.hubDialogueIndex}
        onNext={store.advanceHubDialogue}
        onSkip={store.skipHubDialogue}
        onEnterWorldSelect={store.enterWorldSelect}
      />
    );
  } else if (store.appPhase === 'worldSelect') {
    screen = (
      <WorldSelectScreen
        playerProfile={store.playerProfile}
        selectedWorldId={store.selectedWorldId}
        onSelectWorld={store.selectWorld}
        onConfirm={store.confirmWorldSelection}
        onBack={store.backToHub}
      />
    );
  } else if (store.appPhase === 'worldTransition') {
    screen = (
      <WorldTransitionScreen
        entry={store.worldEntry}
        status={store.worldTransitionStatus}
        message={store.worldTransitionMessage}
        onCommit={store.commitWorldTransition}
        onRetry={store.retryWorldTransition}
        onBack={store.backToHub}
      />
    );
  } else if (store.appPhase === 'worldRun' && store.run) {
    if (store.run.presentation.activeScreen === 'map') {
      screen = (
        <GameLayout run={store.run}>
          <MapScreen
            run={store.run}
            onSelectNode={store.selectNode}
            onOpenNode={store.openCurrentNode}
            onBackToTitle={store.returnToTitle}
          />
        </GameLayout>
      );
    } else if (store.run.presentation.activeScreen === 'event') {
      screen = (
        <GameLayout run={store.run}>
          <EventScreen run={store.run} onChoose={store.chooseEvent} />
        </GameLayout>
      );
    } else if (store.run.presentation.activeScreen === 'recruit') {
      screen = (
        <GameLayout run={store.run}>
          <RecruitScreen run={store.run} onChoose={store.chooseEvent} />
        </GameLayout>
      );
    } else if (store.run.presentation.activeScreen === 'battle') {
      screen = (
        <GameLayout run={store.run}>
          <BattleScreen
            run={store.run}
            onSubmitAction={store.submitBattleAction}
            onBackToMap={store.leaveBattleToMap}
            onFleeBattle={store.fleeBattle}
          />
        </GameLayout>
      );
    }
  } else if (store.appPhase === 'result' && store.run) {
    screen = (
      <GameLayout run={store.run}>
        <ResultScreen run={store.run} onReturnToTitle={store.returnToTitle} />
      </GameLayout>
    );
  }

  return <ScreenFrame fill={isGameScreen}>{screen}</ScreenFrame>;
}
