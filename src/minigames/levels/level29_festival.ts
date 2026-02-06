import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel29Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 29,
    title: 'Festival Flow',
    scene: 'local_festival',
    mechanicType: 'rhythm' as const,
    vocab,
  });
