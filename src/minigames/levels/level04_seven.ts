import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel04Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 4,
    title: 'Seven Shift',
    scene: 'seven_counter',
    mechanicType: 'dialogue_tiles' as const,
    vocab,
  });
