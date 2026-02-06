import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel10Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 10,
    title: 'Bill Breaker',
    scene: 'rooftop_bar',
    mechanicType: 'rhythm' as const,
    vocab,
  });
