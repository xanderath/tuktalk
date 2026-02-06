import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { useTheme } from '../context/ThemeContext';
import { fonts, radii, spacing } from '../lib/themes';
import { useAuth } from '../hooks/useAuth';
import {
  ensureUserProfileProgress,
  RuntimeSettings,
  unlockAllContentForUser,
  updateRuntimeSettings,
} from '../minigames/core/playerProgress';

const settingLabels: Record<keyof RuntimeSettings, { title: string; subtitle: string }> = {
  voiceModeEnabled: {
    title: 'Voice Mode',
    subtitle: 'Enable push-to-talk intent input.',
  },
  publicModeEnabled: {
    title: 'Public Mode',
    subtitle: 'Force tap-only controls in public places.',
  },
  showRomanization: {
    title: 'Romanization',
    subtitle: 'Show RTGS under Thai script.',
  },
  showEnglishMeaning: {
    title: 'English Meaning',
    subtitle: 'Reveal English meaning in game prompts.',
  },
};

const runtimeSettingKeys: Array<keyof RuntimeSettings> = [
  'voiceModeEnabled',
  'publicModeEnabled',
  'showRomanization',
  'showEnglishMeaning',
];

export function SettingsScreen() {
  const { colors, shadows, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<RuntimeSettings | null>(null);
  const showDevUnlock = __DEV__;

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      const progress = await ensureUserProfileProgress(user.id);
      setSettings(progress.settings);
      setLoading(false);
    };
    void load();
  }, [user?.id]);

  const toggleSetting = async (key: keyof RuntimeSettings) => {
    if (!user?.id || !settings || saving) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    try {
      await updateRuntimeSettings(user.id, next);
    } finally {
      setSaving(false);
    }
  };

  const cycleThemeMode = () => {
    if (mode === 'auto') setMode('light');
    else if (mode === 'light') setMode('dark');
    else setMode('auto');
  };

  const unlockAllForAccount = async () => {
    if (!showDevUnlock) return;
    if (!user?.id || unlocking) return;
    setUnlocking(true);
    setUnlockMessage(null);
    try {
      await unlockAllContentForUser(user.id);
      setUnlockMessage('All 30 levels unlocked for this account.');
    } catch (error: any) {
      setUnlockMessage(error?.message ?? 'Unlock failed.');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading || !settings) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Gameplay Settings</Text>
        <Text style={styles.subtitle}>Dual-input controls for mini-games and visibility options.</Text>

        <Pressable style={styles.themeCard} onPress={cycleThemeMode}>
          <Text style={styles.settingTitle}>Theme Mode</Text>
          <Text style={styles.settingSubtitle}>
            auto {'->'} light {'->'} dark
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{mode.toUpperCase()}</Text>
          </View>
        </Pressable>

        {runtimeSettingKeys.map((key) => {
          const meta = settingLabels[key];
          const value = settings[key];
          return (
            <Pressable key={key} style={styles.settingCard} onPress={() => toggleSetting(key)}>
              <Text style={styles.settingTitle}>{meta.title}</Text>
              <Text style={styles.settingSubtitle}>{meta.subtitle}</Text>
              <View style={styles.switchRow}>
                <View style={[styles.switchPill, value && styles.switchPillOn]}>
                  <Text style={styles.switchText}>{value ? 'ON' : 'OFF'}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        {showDevUnlock ? (
          <Pressable style={styles.unlockCard} onPress={unlockAllForAccount} disabled={unlocking}>
            <Text style={styles.settingTitle}>Unlock All Content</Text>
            <Text style={styles.settingSubtitle}>Unlock all levels and arcade games for this account.</Text>
            <View style={styles.switchRow}>
              <View style={[styles.switchPill, styles.unlockPill, unlocking && styles.unlockPillBusy]}>
                <Text style={styles.switchText}>{unlocking ? 'WORKING' : 'UNLOCK'}</Text>
              </View>
            </View>
          </Pressable>
        ) : null}

        {saving && <Text style={styles.savingText}>Saving...</Text>}
        {showDevUnlock && unlockMessage ? <Text style={styles.savingText}>{unlockMessage}</Text> : null}
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
    themeCard: {
      borderWidth: 2,
      borderColor: brand.blue,
      borderRadius: radii.lg,
      backgroundColor: brand.white,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.soft,
    },
    settingCard: {
      borderWidth: 2,
      borderColor: brand.border,
      borderRadius: radii.lg,
      backgroundColor: brand.white,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.soft,
    },
    unlockCard: {
      borderWidth: 2,
      borderColor: brand.orangeDark,
      borderRadius: radii.lg,
      backgroundColor: brand.orangeLight,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.soft,
    },
    settingTitle: {
      fontSize: 15,
      lineHeight: 20,
      color: brand.textDark,
      fontFamily: fonts.display,
    },
    settingSubtitle: {
      marginTop: 2,
      fontSize: 11,
      lineHeight: 15,
      color: brand.textMedium,
    },
    switchRow: {
      marginTop: spacing.sm,
      alignItems: 'flex-start',
    },
    switchPill: {
      minHeight: 28,
      minWidth: 64,
      borderRadius: radii.pill,
      borderWidth: 2,
      borderColor: brand.border,
      backgroundColor: brand.creamDark,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    switchPillOn: {
      borderColor: brand.orangeDark,
      backgroundColor: brand.orange,
    },
    unlockPill: {
      borderColor: brand.orangeDark,
      backgroundColor: brand.orange,
    },
    unlockPillBusy: {
      opacity: 0.75,
    },
    switchText: {
      fontSize: 11,
      lineHeight: 14,
      color: brand.textDark,
      fontFamily: fonts.bodyMedium,
    },
    savingText: {
      marginTop: spacing.sm,
      fontSize: 11,
      lineHeight: 15,
      color: brand.textMedium,
    },
  });
