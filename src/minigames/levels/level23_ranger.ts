import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel23Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 23,
    title: 'Ranger Sort',
    scene: 'national_park',
    mechanicType: 'sort_match' as const,
    vocab,
  });
