import { supabase } from './supabase';
import type { Database } from '../types/database';

const PRONUNCIATION_BUCKET = 'user-pronunciations';

export type UserPronunciationRow =
  Database['public']['Tables']['user_pronunciations']['Row'];

export async function uploadUserPronunciation(input: {
  userId: string;
  vocabularyId: string;
  audioBlob: Blob;
  pronunciationScore: number;
  transcript?: string;
  recognizedRomanization?: string;
}): Promise<UserPronunciationRow | null> {
  const path = `${input.userId}/${input.vocabularyId}/latest.webm`;
  const { error: uploadError } = await supabase.storage
    .from(PRONUNCIATION_BUCKET)
    .upload(path, input.audioBlob, {
      upsert: true,
      contentType: input.audioBlob.type || 'audio/webm',
      cacheControl: '3600',
    });

  if (uploadError) {
    throw uploadError;
  }

  const payload: Database['public']['Tables']['user_pronunciations']['Insert'] = {
    user_id: input.userId,
    vocabulary_id: input.vocabularyId,
    storage_path: path,
    pronunciation_score: input.pronunciationScore,
    transcript: input.transcript ?? null,
    recognized_romanization: input.recognizedRomanization ?? null,
  };

  const { data, error } = await supabase
    .from('user_pronunciations')
    .upsert(payload, { onConflict: 'user_id,vocabulary_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as UserPronunciationRow;
}

export async function listUserPronunciationsByVocabulary(input: {
  userId: string;
  vocabularyIds: string[];
}): Promise<UserPronunciationRow[]> {
  if (!input.vocabularyIds.length) return [];
  const { data, error } = await supabase
    .from('user_pronunciations')
    .select('*')
    .eq('user_id', input.userId)
    .in('vocabulary_id', input.vocabularyIds);

  if (error) throw error;
  return (data ?? []) as UserPronunciationRow[];
}

export async function getUserPronunciationByVocabulary(input: {
  userId: string;
  vocabularyId: string;
}): Promise<UserPronunciationRow | null> {
  const { data, error } = await supabase
    .from('user_pronunciations')
    .select('*')
    .eq('user_id', input.userId)
    .eq('vocabulary_id', input.vocabularyId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as UserPronunciationRow | null;
}

export async function getUserPronunciationSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from(PRONUNCIATION_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}
