import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel16Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 16,
    title: 'Answer Confidence',
    scene: 'job_interview',
    mechanicType: 'dialogue_tiles' as const,
    vocab,
  });
