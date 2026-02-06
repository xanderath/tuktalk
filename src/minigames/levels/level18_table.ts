import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel18Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 18,
    title: 'Table Manners',
    scene: 'client_dinner',
    mechanicType: 'dialogue_tiles' as const,
    vocab,
  });
