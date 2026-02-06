import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel22Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 22,
    title: 'Safety Surf',
    scene: 'beach_resort',
    mechanicType: 'runner' as const,
    vocab,
  });
