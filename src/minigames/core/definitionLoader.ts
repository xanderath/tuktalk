import { getLevelDefinitionBuilder } from '../levels';
import { loadLevelSceneMeta, loadLevelVocab } from './vocabLoader';
import { MiniGameDefinition } from './types';

export const loadMiniGameDefinition = async (levelId: number): Promise<MiniGameDefinition | null> => {
  const [sceneMeta, vocab] = await Promise.all([
    loadLevelSceneMeta(levelId),
    loadLevelVocab(levelId, 12),
  ]);

  if (!sceneMeta || vocab.length === 0) return null;

  const builder = getLevelDefinitionBuilder(levelId);
  if (!builder) return null;

  const definition = builder(vocab);
  return {
    ...definition,
    scene: sceneMeta.scene ?? definition.scene,
  };
};
