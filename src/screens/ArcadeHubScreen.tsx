import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { useTheme } from '../context/ThemeContext';
import { fonts, radii, spacing } from '../lib/themes';
import { useAuth } from '../hooks/useAuth';
import { ensureUserProfileProgress, UserProfileProgress } from '../minigames/core/playerProgress';
import { levelGameTitles } from '../minigames/levels';
import { MiniGameScreen } from './MiniGameScreen';

type ArcadeMode = 'replay' | 'endless' | 'boss' | 'daily';

export function ArcadeHubScreen() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<UserProfileProgress | null>(null);
  const [mode, setMode] = useState<ArcadeMode>('replay');
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
      setProgress(null);
      setLoadError('No active session.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const value = await ensureUserProfileProgress(user.id);
      setProgress(value);
    } catch (error: any) {
      setProgress(fallbackProgressForUser(user.id));
      setLoadError('Profile progression unavailable. Using fallback unlocks.');
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
        mode="arcade"
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

  const unlockedLevels = (progress?.unlockedLevels ?? [1]).slice().sort((a, b) => a - b);

  return (
    <View style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Thai Arcade</Text>
        <Text style={styles.subtitle}>Replay unlocked mini-games. Endless and daily modes can layer in next.</Text>
        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        <View style={styles.modeRow}>
          <Pressable style={[styles.modeBtn, mode === 'replay' && styles.modeBtnActive]} onPress={() => setMode('replay')}>
            <Text style={styles.modeBtnText}>Replay</Text>
          </Pressable>
          <Pressable style={[styles.modeBtn, mode === 'endless' && styles.modeBtnActive]} onPress={() => setMode('endless')}>
            <Text style={styles.modeBtnText}>Endless</Text>
          </Pressable>
          <Pressable style={[styles.modeBtn, mode === 'boss' && styles.modeBtnActive]} onPress={() => setMode('boss')}>
            <Text style={styles.modeBtnText}>Boss Rush</Text>
          </Pressable>
          <Pressable style={[styles.modeBtn, mode === 'daily' && styles.modeBtnActive]} onPress={() => setMode('daily')}>
            <Text style={styles.modeBtnText}>Daily</Text>
          </Pressable>
        </View>

        {mode !== 'replay' ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>Coming next</Text>
            <Text style={styles.placeholderText}>
              {mode === 'endless' && 'Endless mode will randomize intents from unlocked levels for survival play.'}
              {mode === 'boss' && 'Boss Rush will chain scenarios into one fast run.'}
              {mode === 'daily' && 'Daily challenge will serve one rotating scenario each day.'}
            </Text>
          </View>
        ) : (
          unlockedLevels.map((levelId) => (
            <View key={levelId} style={styles.levelCard}>
              <View style={styles.levelTextWrap}>
                <Text style={styles.levelTitle}>Level {levelId}</Text>
                <Text style={styles.levelGame}>{levelGameTitles[levelId] ?? 'Mini-game'}</Text>
              </View>
              <Pressable style={styles.playBtn} onPress={() => setSelectedLevel(levelId)}>
                <Text style={styles.playBtnText}>Play</Text>
              </Pressable>
            </View>
          ))
        )}
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
    modeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    modeBtn: {
      minHeight: 34,
      borderWidth: 2,
      borderColor: brand.border,
      borderRadius: radii.md,
      backgroundColor: brand.white,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeBtnActive: {
      borderColor: brand.blue,
      backgroundColor: brand.creamDark,
    },
    modeBtnText: {
      fontSize: 11,
      lineHeight: 15,
      color: brand.textDark,
      fontFamily: fonts.bodyMedium,
    },
    placeholderCard: {
      borderWidth: 2,
      borderColor: brand.blue,
      borderRadius: radii.xl,
      backgroundColor: brand.white,
      padding: spacing.xl,
      ...shadows.soft,
    },
    placeholderTitle: {
      fontSize: 20,
      lineHeight: 25,
      color: brand.textDark,
      fontFamily: fonts.display,
    },
    placeholderText: {
      marginTop: spacing.sm,
      fontSize: 13,
      lineHeight: 18,
      color: brand.textMedium,
    },
    levelCard: {
      borderWidth: 2,
      borderColor: brand.border,
      borderRadius: radii.lg,
      backgroundColor: brand.white,
      padding: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...shadows.soft,
    },
    levelTextWrap: {
      flex: 1,
      marginRight: spacing.sm,
    },
    levelTitle: {
      fontSize: 13,
      lineHeight: 17,
      color: brand.textDark,
      fontFamily: fonts.display,
    },
    levelGame: {
      fontSize: 12,
      lineHeight: 16,
      color: brand.textMedium,
      marginTop: 2,
    },
    playBtn: {
      minHeight: 34,
      minWidth: 72,
      borderWidth: 2,
      borderColor: brand.orangeDark,
      borderRadius: radii.md,
      backgroundColor: brand.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
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
