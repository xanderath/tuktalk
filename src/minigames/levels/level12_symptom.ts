import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel12Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 12,
    title: 'Symptom Match',
    scene: 'pharmacy',
    mechanicType: 'sort_match' as const,
    vocab,
  });
