import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel14Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 14,
    title: 'Fitness Flow',
    scene: 'gym_floor',
    mechanicType: 'rhythm' as const,
    vocab,
  });
