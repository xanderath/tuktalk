import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel25Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 25,
    title: 'Reef Explorer',
    scene: 'island_hopping',
    mechanicType: 'runner' as const,
    vocab,
  });
