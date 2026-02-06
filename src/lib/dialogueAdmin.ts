import { supabase } from './supabase';
import type { DialogueOption } from './dialogues';
import type { Json } from '../types/database';

export type DialogueRow = {
  id: string;
  level_id: number;
  display_order: number;
  speaker: string;
  speaker_thai: string | null;
  emoji: string | null;
  thai: string;
  roman: string | null;
  english: string | null;
  correct: string | null;
  options: DialogueOption[];
};

export type DialogueInput = Omit<DialogueRow, 'id'> & { id?: string };

const normalizeOptions = (value: unknown): DialogueOption[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      return {
        thai: String(candidate.thai ?? '').trim(),
        roman: String(candidate.roman ?? '').trim(),
        english: String(candidate.english ?? '').trim(),
      };
    })
    .filter((item): item is DialogueOption => Boolean(item?.thai));
};

export async function listDialoguesByLevel(levelId: number): Promise<DialogueRow[]> {
  const { data, error } = await supabase
    .from('dialogues')
    .select('id, level_id, display_order, speaker, speaker_thai, emoji, thai, roman, english, correct, options')
    .eq('level_id', levelId)
    .order('display_order', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    level_id: row.level_id,
    display_order: row.display_order,
    speaker: row.speaker,
    speaker_thai: row.speaker_thai,
    emoji: row.emoji,
    thai: row.thai,
    roman: row.roman,
    english: row.english,
    correct: row.correct,
    options: normalizeOptions(row.options),
  }));
}

export async function upsertDialogue(input: DialogueInput): Promise<void> {
  const payload = {
    id: input.id,
    level_id: input.level_id,
    display_order: input.display_order,
    speaker: input.speaker,
    speaker_thai: input.speaker_thai,
    emoji: input.emoji,
    thai: input.thai,
    roman: input.roman,
    english: input.english,
    correct: input.correct,
    options: input.options as unknown as Json,
  };

  const { error } = await supabase.from('dialogues').upsert(payload, {
    onConflict: 'id',
  });
  if (error) throw error;
}

export async function deleteDialogue(id: string): Promise<void> {
  const { error } = await supabase.from('dialogues').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderDialogues(levelId: number, orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    level_id: levelId,
    display_order: index + 1,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('dialogues')
      .update({ display_order: update.display_order })
      .eq('id', update.id)
      .eq('level_id', update.level_id);
    if (error) throw error;
  }
}
