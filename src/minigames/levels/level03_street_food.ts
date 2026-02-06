import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel03Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 3,
    title: 'Spice Survivor',
    scene: 'street_food_stall',
    mechanicType: 'craft_sequence' as const,
    vocab,
  });
