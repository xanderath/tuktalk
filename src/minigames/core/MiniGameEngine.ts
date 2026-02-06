import { GamePrompt, MiniGameDefinition, MiniGameResults, MiniGameState } from './types';

const nowMs = () => Date.now();

export class MiniGameEngine {
  private definition: MiniGameDefinition;

  private state: MiniGameState;

  constructor(definition: MiniGameDefinition) {
    this.definition = definition;
    this.state = {
      startedAtMs: null,
      endedAtMs: null,
      isPaused: false,
      isComplete: false,
      currentPromptIndex: 0,
      prompts: definition.intentMap
        .slice(0, definition.difficultyParams.promptCount)
        .map((target, index): GamePrompt => ({
          id: `${target.vocabularyId}-${index}`,
          intent: target.intent,
          labelThai: target.thaiScript,
          labelRomanization: target.romanization,
          labelEnglish: target.englishTranslation,
        })),
      correctCount: 0,
      incorrectCount: 0,
      usedIntents: [],
      remainingMs: definition.durationSeconds * 1000,
    };
  }

  start() {
    if (this.state.startedAtMs) return;
    this.state.startedAtMs = nowMs();
    this.state.endedAtMs = null;
    this.state.isPaused = false;
  }

  pause() {
    this.tick();
    this.state.isPaused = true;
  }

  resume() {
    if (!this.state.startedAtMs || this.state.isComplete) return;
    this.state.isPaused = false;
  }

  tick(currentTimeMs = nowMs()) {
    if (!this.state.startedAtMs || this.state.isPaused || this.state.isComplete) return;
    const elapsed = currentTimeMs - this.state.startedAtMs;
    const nextRemaining = Math.max(0, this.definition.durationSeconds * 1000 - elapsed);
    this.state.remainingMs = nextRemaining;
    if (nextRemaining <= 0) {
      this.end();
    }
  }

  submitIntent(intent: string) {
    this.tick();
    if (!this.state.startedAtMs || this.state.isComplete || this.state.isPaused) {
      return this.getState();
    }

    const prompt = this.state.prompts[this.state.currentPromptIndex];
    if (!prompt) {
      this.end();
      return this.getState();
    }

    this.state.usedIntents.push(intent);

    if (intent === prompt.intent) {
      this.state.correctCount += 1;
      this.state.currentPromptIndex += 1;
      if (this.state.currentPromptIndex >= this.state.prompts.length) {
        this.end();
      }
    } else {
      this.state.incorrectCount += 1;
      if (this.state.incorrectCount >= this.definition.difficultyParams.maxMistakes) {
        this.end();
      }
    }

    return this.getState();
  }

  end() {
    if (this.state.isComplete) return;
    this.state.isComplete = true;
    this.state.endedAtMs = nowMs();
    if (this.state.startedAtMs) {
      const elapsed = this.state.endedAtMs - this.state.startedAtMs;
      this.state.remainingMs = Math.max(0, this.definition.durationSeconds * 1000 - elapsed);
    }
  }

  getCurrentPrompt() {
    return this.state.prompts[this.state.currentPromptIndex] ?? null;
  }

  getState(): MiniGameState {
    return {
      ...this.state,
      prompts: [...this.state.prompts],
      usedIntents: [...this.state.usedIntents],
    };
  }

  reportResults(): MiniGameResults {
    const total = this.state.correctCount + this.state.incorrectCount;
    const accuracy = total > 0 ? Math.round((this.state.correctCount / total) * 100) : 0;

    const elapsedMs = this.state.startedAtMs
      ? (this.state.endedAtMs ?? nowMs()) - this.state.startedAtMs
      : 0;

    const speedBase = this.definition.durationSeconds * 1000;
    const speedScore = speedBase > 0 ? Math.max(0, Math.min(100, Math.round((this.state.remainingMs / speedBase) * 100))) : 0;

    return {
      levelId: this.definition.levelId,
      title: this.definition.title,
      scene: this.definition.scene,
      mechanicType: this.definition.mechanicType,
      accuracy,
      speedScore,
      usedVocabCount: new Set(this.state.usedIntents).size,
      usedIntents: [...new Set(this.state.usedIntents)],
      correctCount: this.state.correctCount,
      incorrectCount: this.state.incorrectCount,
      elapsedMs,
    };
  }
}
