import { supabase } from '../../lib/supabase';
import { LevelSceneMeta, VocabItem } from './types';

const parseSceneMeta = (gameWorldConfig: unknown): { scene?: string; mechanic?: string } => {
  if (!gameWorldConfig || typeof gameWorldConfig !== 'object') return {};
  const config = gameWorldConfig as Record<string, unknown>;
  const scene = typeof config.scene === 'string' ? config.scene : undefined;
  const mechanic = typeof config.mechanic === 'string' ? config.mechanic : undefined;
  return { scene, mechanic };
};

export const loadLevelSceneMeta = async (levelId: number): Promise<LevelSceneMeta | null> => {
  const { data, error } = await supabase
    .from('levels')
    .select('id, environment_name, game_world_config')
    .eq('id', levelId)
    .maybeSingle();

  if (error || !data) return null;
  const parsed = parseSceneMeta(data.game_world_config);
  return {
    levelId,
    environmentName: data.environment_name ?? `Level ${levelId}`,
    ...parsed,
  };
};

export const loadLevelVocab = async (levelId: number, limit = 12): Promise<VocabItem[]> => {
  const levelVocab = await supabase
    .from('level_vocabulary')
    .select('display_order, vocabulary: vocabulary_id (id, thai_script, romanization, english_translation, part_of_speech, difficulty_level)')
    .eq('level_id', levelId)
    .order('display_order', { ascending: true })
    .limit(limit);

  const fromJoin =
    levelVocab.data
      ?.map((row: any) => row.vocabulary)
      .filter(Boolean)
      .slice(0, limit) ?? [];

  if (fromJoin.length > 0) {
    return fromJoin as VocabItem[];
  }

  const fallback = await supabase
    .from('vocabulary')
    .select('id, thai_script, romanization, english_translation, part_of_speech, difficulty_level')
    .eq('difficulty_level', levelId)
    .order('id', { ascending: true })
    .limit(limit);

  return (fallback.data ?? []) as VocabItem[];
};
