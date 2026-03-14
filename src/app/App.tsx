import { useMemo, useState } from 'react';
import { ScreenFrame } from '../components/layout/ScreenFrame';
import { MOCK_ENCOUNTER_PREVIEW, MOCK_RUN_STATE } from '../data/templates/mockRun';
import { StartScreen } from '../screens/start/StartScreen';
import { TitleScreen } from '../screens/title/TitleScreen';

export type Stage0Screen = 'title' | 'start';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<Stage0Screen>('title');

  const screen = useMemo(() => {
    switch (currentScreen) {
      case 'start':
        return (
          <StartScreen
            run={MOCK_RUN_STATE}
            encounterNames={MOCK_ENCOUNTER_PREVIEW.map((enemy) => enemy.identity.name)}
            onBackToTitle={() => setCurrentScreen('title')}
          />
        );
      case 'title':
      default:
        return <TitleScreen onStart={() => setCurrentScreen('start')} />;
    }
  }, [currentScreen]);

  return <ScreenFrame>{screen}</ScreenFrame>;
}
