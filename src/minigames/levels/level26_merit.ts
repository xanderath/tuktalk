import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel26Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 26,
    title: 'Merit Flow',
    scene: 'temple_visit',
    mechanicType: 'dialogue_tiles' as const,
    vocab,
  });
