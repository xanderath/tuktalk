import { MiniGameDefinition, VocabItem } from '../core/types';
import { createLevelDefinition } from './levelFactory';

export const createLevel07Definition = (vocab: VocabItem[]): MiniGameDefinition =>
  createLevelDefinition({
    levelId: 7,
    title: 'WiFi Wars',
    scene: 'cowork_wifi',
    mechanicType: 'rhythm' as const,
    vocab,
  });
