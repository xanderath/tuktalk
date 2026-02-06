import { GamePrompt, MiniGameDefinition, MiniGameState } from '../core/types';

export interface MechanicProps {
  definition: MiniGameDefinition;
  state: MiniGameState;
  currentPrompt: GamePrompt | null;
  showRomanization: boolean;
  showEnglishMeaning: boolean;
  voiceModeEnabled: boolean;
  publicModeEnabled: boolean;
  voiceSupported: boolean;
  voiceStatus: string;
  onIntentTap: (intent: string) => void;
  onVoicePress: () => void;
}
