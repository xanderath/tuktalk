import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel01Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 1,
    title: 'Passport Panic',
    scene: 'airport_arrival',
    mechanicType: 'sort_match' as const,
    vocab,
  });
