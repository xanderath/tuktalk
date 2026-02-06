import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel27Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 27,
    title: 'Wok Master',
    scene: 'thai_cooking_class',
    mechanicType: 'craft_sequence' as const,
    vocab,
  });
