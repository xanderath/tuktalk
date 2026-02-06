import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel30Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 30,
    title: 'Social Links',
    scene: 'making_thai_friends',
    mechanicType: 'dialogue_tiles' as const,
    vocab,
  });
