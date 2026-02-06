import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel24Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 24,
    title: 'Bargain Battle',
    scene: 'night_market',
    mechanicType: 'dialogue_tiles' as const,
    vocab,
  });
