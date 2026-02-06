export type MechanicType =
  | 'runner'
  | 'sort_match'
  | 'rhythm'
  | 'craft_sequence'
  | 'dialogue_tiles';

export type InputMode = 'tap' | 'voice';

export interface VocabItem {
  id: string;
  thai_script: string;
  romanization: string;
  english_translation: string;
  part_of_speech?: string | null;
  difficulty_level?: number | null;
}

export interface LevelSceneMeta {
  levelId: number;
  environmentName: string;
  scene?: string;
  mechanic?: string;
}

export interface IntentTarget {
  intent: string;
  thaiScript: string;
  romanization: string;
  englishTranslation: string;
  vocabularyId: string;
}

export interface GamePrompt {
  id: string;
  intent: string;
  labelThai: string;
  labelRomanization: string;
  labelEnglish: string;
}

export interface MiniGameDifficulty {
  promptCount: number;
  maxMistakes: number;
  speedFactor: number;
}

export interface MiniGameDefinition {
  levelId: number;
  title: string;
  scene: string;
  mechanicType: MechanicType;
  durationSeconds: number;
  difficultyParams: MiniGameDifficulty;
  intentMap: IntentTarget[];
}

export interface MiniGameState {
  startedAtMs: number | null;
  endedAtMs: number | null;
  isPaused: boolean;
  isComplete: boolean;
  currentPromptIndex: number;
  prompts: GamePrompt[];
  correctCount: number;
  incorrectCount: number;
  usedIntents: string[];
  remainingMs: number;
}

export interface MiniGameResults {
  levelId: number;
  title: string;
  scene: string;
  mechanicType: MechanicType;
  accuracy: number;
  speedScore: number;
  usedVocabCount: number;
  usedIntents: string[];
  correctCount: number;
  incorrectCount: number;
  elapsedMs: number;
}

export interface IntentMatchResult {
  matched: boolean;
  intent: string | null;
  vocabularyId: string | null;
  confidence: number;
  matchedBy: 'exact_thai' | 'exact_romanization' | 'fuzzy_thai' | 'fuzzy_romanization' | 'none';
  normalizedTranscript: string;
}

export interface RuntimeSettings {
  voiceModeEnabled: boolean;
  publicModeEnabled: boolean;
  showRomanization: boolean;
  showEnglishMeaning: boolean;
}
