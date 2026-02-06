import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel05Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 5,
    title: 'Lobby Logic',
    scene: 'hotel_lobby',
    mechanicType: 'dialogue_tiles' as const,
    vocab,
  });
