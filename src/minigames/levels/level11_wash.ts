import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel11Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 11,
    title: 'Wash Quest',
    scene: 'laundry_shop',
    mechanicType: 'sort_match' as const,
    vocab,
  });
