import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel21Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 21,
    title: 'Platform Puzzle',
    scene: 'train_station',
    mechanicType: 'sort_match' as const,
    vocab,
  });
