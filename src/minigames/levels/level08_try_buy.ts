import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel08Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 8,
    title: 'Try & Buy',
    scene: 'weekend_market',
    mechanicType: 'sort_match' as const,
    vocab,
  });
