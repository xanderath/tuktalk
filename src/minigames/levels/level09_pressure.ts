import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel09Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 9,
    title: 'Pressure Balance',
    scene: 'yoga_studio',
    mechanicType: 'rhythm' as const,
    vocab,
  });
