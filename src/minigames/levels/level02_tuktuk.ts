import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel02Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 2,
    title: 'TukTuk Run: Monitor Lizard Escape',
    scene: 'tuktuk_run',
    mechanicType: 'runner' as const,
    vocab,
  });
