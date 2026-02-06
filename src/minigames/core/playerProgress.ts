import { supabase } from '../../lib/supabase';
import { RuntimeSettings } from './types';
import type { Json } from '../../types/database';

export interface UserProfileProgress {
  userId: string;
  tokens: number;
  unlockedLevels: number[];
  unlockedCosmetics: string[];
  settings: RuntimeSettings;
}

export const defaultRuntimeSettings: RuntimeSettings = {
  voiceModeEnabled: true,
  publicModeEnabled: false,
  showRomanization: true,
  showEnglishMeaning: false,
};

const runtimeSettingsToJson = (settings: RuntimeSettings): Json => ({
  voiceModeEnabled: settings.voiceModeEnabled,
  publicModeEnabled: settings.publicModeEnabled,
  showRomanization: settings.showRomanization,
  showEnglishMeaning: settings.showEnglishMeaning,
});

const normalizeSettings = (raw: unknown): RuntimeSettings => {
  if (!raw || typeof raw !== 'object') return defaultRuntimeSettings;
  const settings = raw as Record<string, unknown>;
  return {
    voiceModeEnabled:
      typeof settings.voiceModeEnabled === 'boolean'
        ? settings.voiceModeEnabled
        : defaultRuntimeSettings.voiceModeEnabled,
    publicModeEnabled:
      typeof settings.publicModeEnabled === 'boolean'
        ? settings.publicModeEnabled
        : defaultRuntimeSettings.publicModeEnabled,
    showRomanization:
      typeof settings.showRomanization === 'boolean'
        ? settings.showRomanization
        : defaultRuntimeSettings.showRomanization,
    showEnglishMeaning:
      typeof settings.showEnglishMeaning === 'boolean'
        ? settings.showEnglishMeaning
        : defaultRuntimeSettings.showEnglishMeaning,
  };
};

const normalizeUnlockedLevels = (raw: unknown) => {
  if (!Array.isArray(raw)) return [1];
  const values = raw
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 30);
  if (!values.includes(1)) values.push(1);
  return [...new Set(values)].sort((a, b) => a - b);
};

export const ensureUserProfileProgress = async (userId: string): Promise<UserProfileProgress> => {
  const { data, error } = await supabase
    .from('user_profile')
    .select('user_id, tokens, unlocked_levels, unlocked_cosmetics, settings')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const payload = {
      user_id: userId,
      tokens: 0,
      unlocked_levels: [1],
      unlocked_cosmetics: [],
      settings: runtimeSettingsToJson(defaultRuntimeSettings),
    };
    const { data: inserted, error: insertError } = await supabase
      .from('user_profile')
      .insert(payload)
      .select('user_id, tokens, unlocked_levels, unlocked_cosmetics, settings')
      .single();

    if (insertError || !inserted) {
      throw insertError ?? new Error('Failed to initialize profile progression');
    }

    return {
      userId: inserted.user_id,
      tokens: inserted.tokens ?? 0,
      unlockedLevels: normalizeUnlockedLevels(inserted.unlocked_levels),
      unlockedCosmetics: Array.isArray(inserted.unlocked_cosmetics)
        ? inserted.unlocked_cosmetics
        : [],
      settings: normalizeSettings(inserted.settings),
    };
  }

  return {
    userId: data.user_id,
    tokens: data.tokens ?? 0,
    unlockedLevels: normalizeUnlockedLevels(data.unlocked_levels),
    unlockedCosmetics: Array.isArray(data.unlocked_cosmetics) ? data.unlocked_cosmetics : [],
    settings: normalizeSettings(data.settings),
  };
};

export const updateRuntimeSettings = async (userId: string, settings: RuntimeSettings) => {
  const { error } = await supabase
    .from('user_profile')
    .upsert({ user_id: userId, settings: runtimeSettingsToJson(settings) }, { onConflict: 'user_id' });
  if (error) throw error;
};

export const awardLevelCompletion = async (userId: string, completedLevelId: number) => {
  const progress = await ensureUserProfileProgress(userId);
  const nextLevel = Math.min(30, completedLevelId + 1);
  const unlockedLevels = [...progress.unlockedLevels];
  if (!unlockedLevels.includes(nextLevel)) unlockedLevels.push(nextLevel);
  if (!unlockedLevels.includes(completedLevelId)) unlockedLevels.push(completedLevelId);

  const updated = {
    user_id: userId,
    unlocked_levels: [...new Set(unlockedLevels)].sort((a, b) => a - b),
    tokens: (progress.tokens ?? 0) + 25,
  };

  const { error } = await supabase
    .from('user_profile')
    .upsert(updated, { onConflict: 'user_id' });

  if (error) throw error;
};

export const unlockAllContentForUser = async (userId: string) => {
  const progress = await ensureUserProfileProgress(userId);
  const allLevels = Array.from({ length: 30 }, (_, idx) => idx + 1);

  const { error } = await supabase
    .from('user_profile')
    .upsert(
      {
        user_id: userId,
        unlocked_levels: allLevels,
        tokens: Math.max(progress.tokens ?? 0, 3000),
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
};

export type { RuntimeSettings };
