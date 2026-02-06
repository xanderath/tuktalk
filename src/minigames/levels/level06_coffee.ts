import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel06Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 6,
    title: 'Sweetness Chaos',
    scene: 'coffee_shop',
    mechanicType: 'craft_sequence' as const,
    vocab,
  });
