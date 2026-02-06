import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel13Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 13,
    title: 'Style Matcher',
    scene: 'hair_salon',
    mechanicType: 'dialogue_tiles' as const,
    vocab,
  });
