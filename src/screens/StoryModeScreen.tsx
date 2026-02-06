import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { fonts, radii, spacing } from '../lib/themes';
import { useTheme } from '../context/ThemeContext';
import { ensureUserProfileProgress, UserProfileProgress } from '../minigames/core/playerProgress';
import { levelGameTitles } from '../minigames/levels';
import { MiniGameScreen } from './MiniGameScreen';

type LevelRow = {
  id: number;
  level_number: number;
  stage_id: number;
  environment_name: string;
  is_free: boolean | null;
};

export function StoryModeScreen() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [progress, setProgress] = useState<UserProfileProgress | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fallbackProgressForUser = (userId: string): UserProfileProgress => ({
    userId,
    tokens: 0,
    unlockedLevels: [1],
    unlockedCosmetics: [],
    settings: {
      voiceModeEnabled: true,
      publicModeEnabled: false,
      showRomanization: true,
      showEnglishMeaning: false,
    },
  });

  const refresh = async () => {
    if (!user?.id) {
      setLoading(false);
      setLevels([]);
      setProgress(null);
      setLoadError('No active session.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [levelRes, profileRes] = await Promise.allSettled([
        supabase
          .from('levels')
          .select('id, level_number, stage_id, environment_name, is_free')
          .order('level_number', { ascending: true }),
        ensureUserProfileProgress(user.id),
      ]);

      if (levelRes.status !== 'fulfilled' || levelRes.value.error) {
        throw (levelRes.status === 'fulfilled' ? levelRes.value.error : levelRes.reason);
      }

      setLevels((levelRes.value.data ?? []) as LevelRow[]);

      if (profileRes.status === 'fulfilled') {
        setProgress(profileRes.value);
      } else {
        setProgress(fallbackProgressForUser(user.id));
        setLoadError('Profile progression unavailable. Using fallback unlocks.');
      }
    } catch (error: any) {
      setLevels([]);
      setProgress(fallbackProgressForUser(user.id));
      setLoadError(error?.message ?? 'Failed to load story mode.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [user?.id]);

  if (selectedLevel) {
    return (
      <MiniGameScreen
        levelId={selectedLevel}
        mode="story"
        onBack={() => setSelectedLevel(null)}
        onFinished={() => {
          void refresh();
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  const unlockedLevels = new Set(progress?.unlockedLevels ?? [1]);

  return (
    <View style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Story Mode</Text>
        <Text style={styles.subtitle}>Language is the controller. Tap or speak Thai to act.</Text>
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Tokens</Text>
            <Text style={styles.summaryValue}>{progress?.tokens ?? 0}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Unlocked</Text>
            <Text style={styles.summaryValue}>{unlockedLevels.size}/30</Text>
          </View>
        </View>

        {levels.map((level) => {
          const unlocked = unlockedLevels.has(level.id);
          return (
            <View key={level.id} style={[styles.levelCard, !unlocked && styles.levelCardLocked]}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelTitle}>Level {level.level_number}</Text>
                <Text style={styles.levelScene}>{level.environment_name}</Text>
              </View>
              <Text style={styles.levelGame}>{levelGameTitles[level.id] ?? 'Mini-game'}</Text>

              <View style={styles.levelFooter}>
                <Text style={styles.levelMeta}>{unlocked ? 'Unlocked' : 'Locked'}</Text>
                <Pressable
                  onPress={() => unlocked && setSelectedLevel(level.id)}
                  disabled={!unlocked}
                  style={({ pressed }) => [
                    styles.playBtn,
                    !unlocked && styles.playBtnDisabled,
                    pressed && unlocked && styles.playBtnPressed,
                  ]}
                >
                  <Text style={styles.playBtnText}>{unlocked ? 'Play' : 'Locked'}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (brand: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: brand.cream,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: brand.cream,
    },
    content: {
      paddingTop: 64,
      paddingHorizontal: spacing.lg,
      paddingBottom: 128,
    },
    title: {
      fontSize: 29,
      lineHeight: 34,
      color: brand.textDark,
      fontFamily: fonts.display,
    },
    subtitle: {
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      fontSize: 13,
      lineHeight: 18,
      color: brand.textMedium,
    },
    summaryRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    summaryCard: {
      flex: 1,
      borderWidth: 2,
      borderColor: brand.blue,
      borderRadius: radii.lg,
      backgroundColor: brand.white,
      padding: spacing.md,
      ...shadows.soft,
    },
    summaryLabel: {
      fontSize: 10,
      lineHeight: 14,
      color: brand.textMedium,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    summaryValue: {
      fontSize: 20,
      lineHeight: 25,
      color: brand.textDark,
      fontFamily: fonts.display,
      marginTop: 2,
    },
    levelCard: {
      borderWidth: 2,
      borderColor: brand.border,
      borderRadius: radii.lg,
      backgroundColor: brand.white,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.soft,
    },
    levelCardLocked: {
      opacity: 0.62,
    },
    levelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    levelTitle: {
      fontSize: 14,
      lineHeight: 18,
      color: brand.textDark,
      fontFamily: fonts.display,
    },
    levelScene: {
      fontSize: 11,
      lineHeight: 15,
      color: brand.textMedium,
    },
    levelGame: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 16,
      color: brand.textDark,
      fontFamily: fonts.bodyMedium,
    },
    levelFooter: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    levelMeta: {
      fontSize: 11,
      lineHeight: 15,
      color: brand.textMedium,
    },
    playBtn: {
      minHeight: 34,
      minWidth: 76,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: brand.orangeDark,
      backgroundColor: brand.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playBtnDisabled: {
      borderColor: brand.border,
      backgroundColor: brand.creamDark,
    },
    playBtnPressed: {
      transform: [{ scale: 0.985 }],
    },
    playBtnText: {
      color: brand.onAccent,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: fonts.bodyMedium,
    },
    errorText: {
      marginBottom: spacing.md,
      fontSize: 11,
      lineHeight: 15,
      color: brand.error,
      fontFamily: fonts.bodyMedium,
    },
  });
