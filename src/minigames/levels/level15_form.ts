import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel15Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 15,
    title: 'Form Frenzy',
    scene: 'bank_forms',
    mechanicType: 'craft_sequence' as const,
    vocab,
  });
