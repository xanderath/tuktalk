import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel28Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 28,
    title: 'Muay Combo',
    scene: 'muay_thai_gym',
    mechanicType: 'rhythm' as const,
    vocab,
  });
