import { buildIntentTargetsFromVocab } from '../core/intentMatching';
import { MechanicType, MiniGameDefinition, VocabItem } from '../core/types';

export interface LevelDefinitionArgs {
  levelId: number;
  title: string;
  scene: string;
  mechanicType: MechanicType;
  vocab: VocabItem[];
}

export const createLevelDefinition = ({
  levelId,
  title,
  scene,
  mechanicType,
  vocab,
}: LevelDefinitionArgs): MiniGameDefinition => {
  const promptCount = Math.max(4, Math.min(10, Math.min(vocab.length, 5 + Math.floor(levelId / 3))));
  const maxMistakes = Math.max(2, 4 - Math.floor(levelId / 12));
  const durationSeconds = Math.max(30, Math.min(90, 45 + Math.floor(levelId / 2)));

  return {
    levelId,
    title,
    scene,
    mechanicType,
    durationSeconds,
    difficultyParams: {
      promptCount,
      maxMistakes,
      speedFactor: 1 + levelId * 0.03,
    },
    intentMap: buildIntentTargetsFromVocab(vocab),
  };
};
