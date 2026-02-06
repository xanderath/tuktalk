import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel20Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 20,
    title: 'Inbox Attack',
    scene: 'email_messages',
    mechanicType: 'runner' as const,
    vocab,
  });
