import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MechanicProps } from './types';
import { useTheme } from '../../context/ThemeContext';
import { fonts, spacing, radii } from '../../lib/themes';

interface Props extends MechanicProps {
  accent: string;
  titlePrefix: string;
}

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export function CommonMechanicView({
  accent,
  titlePrefix,
  definition,
  state,
  currentPrompt,
  showRomanization,
  showEnglishMeaning,
  voiceModeEnabled,
  publicModeEnabled,
  voiceSupported,
  voiceStatus,
  onIntentTap,
  onVoicePress,
}: Props) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows, accent), [colors, shadows, accent]);

  const promptIntent = currentPrompt?.intent;
  const actionTiles = definition.intentMap.slice(0, 6);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.modeTitle}>{titlePrefix}: {definition.title}</Text>
        <Text style={styles.timer}>{formatTime(state.remainingMs)}</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusText}>Correct {state.correctCount}</Text>
        <Text style={styles.statusText}>Mistakes {state.incorrectCount}</Text>
        <Text style={styles.statusText}>Step {Math.min(state.currentPromptIndex + 1, state.prompts.length)}/{state.prompts.length}</Text>
      </View>

      <View style={styles.promptCard}>
        <Text style={styles.promptLabel}>Current action</Text>
        <Text style={styles.promptThai}>{currentPrompt?.labelThai ?? 'Ready...'}</Text>
        {showRomanization && <Text style={styles.promptRoman}>{currentPrompt?.labelRomanization ?? '-'}</Text>}
        {showEnglishMeaning && <Text style={styles.promptEnglish}>{currentPrompt?.labelEnglish ?? '-'}</Text>}
      </View>

      <View style={styles.grid}>
        {actionTiles.map((tile) => {
          const isActive = tile.intent === promptIntent;
          return (
            <Pressable
              key={tile.vocabularyId}
              onPress={() => onIntentTap(tile.intent)}
              style={({ pressed }) => [
                styles.tile,
                isActive && styles.tileActive,
                pressed && styles.tilePressed,
              ]}
            >
              <Text style={styles.tileThai}>{tile.thaiScript}</Text>
              {showRomanization && <Text style={styles.tileRoman}>{tile.romanization}</Text>}
              {showEnglishMeaning && <Text style={styles.tileEnglish}>{tile.englishTranslation}</Text>}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.voiceBox}>
        <Text style={styles.voiceText}>
          {publicModeEnabled
            ? 'Public mode enabled: tap mode only.'
            : voiceModeEnabled
              ? `Voice mode: ${voiceStatus}`
              : 'Voice mode is off in settings.'}
        </Text>
        <Pressable
          onPress={onVoicePress}
          disabled={!voiceModeEnabled || publicModeEnabled || !voiceSupported}
          style={({ pressed }) => [
            styles.voiceButton,
            (!voiceModeEnabled || publicModeEnabled || !voiceSupported) && styles.voiceButtonDisabled,
            pressed && styles.tilePressed,
          ]}
        >
          <Text style={styles.voiceButtonText}>Push To Talk</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (brand: any, shadows: any, accent: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      borderWidth: 2,
      borderColor: accent,
      borderRadius: radii.xl,
      padding: spacing.lg,
      backgroundColor: brand.white,
      ...shadows.soft,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    modeTitle: {
      fontSize: 17,
      lineHeight: 22,
      fontFamily: fonts.display,
      color: brand.textDark,
      flex: 1,
      marginRight: spacing.sm,
    },
    timer: {
      minWidth: 64,
      textAlign: 'right',
      fontSize: 16,
      lineHeight: 22,
      fontFamily: fonts.display,
      color: accent,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    statusText: {
      fontSize: 11,
      lineHeight: 15,
      color: brand.textMedium,
      fontFamily: fonts.bodyMedium,
    },
    promptCard: {
      borderWidth: 2,
      borderColor: accent,
      borderRadius: radii.lg,
      backgroundColor: brand.creamDark,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    promptLabel: {
      fontSize: 10,
      lineHeight: 13,
      color: brand.textMedium,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    promptThai: {
      fontSize: 28,
      lineHeight: 34,
      color: brand.textDark,
      fontFamily: fonts.display,
    },
    promptRoman: {
      fontSize: 14,
      lineHeight: 18,
      color: accent,
      marginTop: 2,
      fontFamily: fonts.bodyMedium,
    },
    promptEnglish: {
      fontSize: 12,
      lineHeight: 16,
      color: brand.textMedium,
      marginTop: 2,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    tile: {
      width: '48.5%',
      borderWidth: 2,
      borderColor: brand.border,
      borderRadius: radii.lg,
      backgroundColor: brand.white,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      minHeight: 88,
      justifyContent: 'center',
      ...shadows.soft,
    },
    tileActive: {
      borderColor: accent,
      backgroundColor: brand.creamDark,
    },
    tilePressed: {
      transform: [{ scale: 0.985 }],
    },
    tileThai: {
      fontSize: 20,
      lineHeight: 24,
      fontFamily: fonts.display,
      color: brand.textDark,
      textAlign: 'center',
    },
    tileRoman: {
      fontSize: 11,
      lineHeight: 14,
      color: accent,
      textAlign: 'center',
      marginTop: 2,
      fontFamily: fonts.bodyMedium,
    },
    tileEnglish: {
      fontSize: 10,
      lineHeight: 13,
      color: brand.textMedium,
      textAlign: 'center',
      marginTop: 3,
    },
    voiceBox: {
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: brand.border,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    voiceText: {
      fontSize: 11,
      lineHeight: 15,
      color: brand.textMedium,
    },
    voiceButton: {
      minHeight: 38,
      borderWidth: 2,
      borderColor: accent,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: brand.creamDark,
    },
    voiceButtonDisabled: {
      opacity: 0.5,
    },
    voiceButtonText: {
      fontSize: 12,
      lineHeight: 16,
      color: brand.textDark,
      fontFamily: fonts.bodyMedium,
    },
  });
