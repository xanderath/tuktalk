import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel19Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 19,
    title: 'Signal Panic',
    scene: 'phone_call',
    mechanicType: 'rhythm' as const,
    vocab,
  });
