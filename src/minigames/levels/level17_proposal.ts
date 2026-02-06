import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel17Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 17,
    title: 'Proposal Stack',
    scene: 'meeting_room',
    mechanicType: 'craft_sequence' as const,
    vocab,
  });
