import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { useTheme } from '../context/ThemeContext';
import { fonts, radii, spacing } from '../lib/themes';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { MiniGameEngine } from '../minigames/core/MiniGameEngine';
import { loadMiniGameDefinition } from '../minigames/core/definitionLoader';
import { awardLevelCompletion, defaultRuntimeSettings, ensureUserProfileProgress, RuntimeSettings } from '../minigames/core/playerProgress';
import { MiniGameDefinition, MiniGameResults, MiniGameState } from '../minigames/core/types';
import { VoiceInputAdapter } from '../minigames/input/VoiceInputAdapter';
import { CraftSequenceMechanic } from '../minigames/mechanics/CraftSequenceMechanic';
import { DialogueTilesMechanic } from '../minigames/mechanics/DialogueTilesMechanic';
import { RhythmMechanic } from '../minigames/mechanics/RhythmMechanic';
import { RunnerMechanic } from '../minigames/mechanics/RunnerMechanic';
import { SortMatchMechanic } from '../minigames/mechanics/SortMatchMechanic';

interface MiniGameScreenProps {
  levelId: number;
  mode: 'story' | 'arcade';
  onBack: () => void;
  onFinished?: () => void;
}

const mechanicComponentMap = {
  runner: RunnerMechanic,
  sort_match: SortMatchMechanic,
  rhythm: RhythmMechanic,
  craft_sequence: CraftSequenceMechanic,
  dialogue_tiles: DialogueTilesMechanic,
} as const;

export function MiniGameScreen({ levelId, mode, onBack, onFinished }: MiniGameScreenProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [definition, setDefinition] = useState<MiniGameDefinition | null>(null);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>(defaultRuntimeSettings);
  const [state, setState] = useState<MiniGameState | null>(null);
  const [results, setResults] = useState<MiniGameResults | null>(null);
  const [voiceStatus, setVoiceStatus] = useState('idle');
  const [voiceSupported, setVoiceSupported] = useState(false);

  const engineRef = useRef<MiniGameEngine | null>(null);
  const voiceAdapterRef = useRef<VoiceInputAdapter | null>(null);
  const finalizedRef = useRef(false);

  const finalizeRun = useCallback(async () => {
    if (finalizedRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;

    finalizedRef.current = true;
    const nextResults = engine.reportResults();
    setResults(nextResults);

    if (!user?.id) return;

    await supabase.from('session_stats').insert({
      user_id: user.id,
      level_id: levelId,
      score: nextResults.correctCount * 100,
      words_learned: nextResults.usedVocabCount,
      accuracy: nextResults.accuracy,
      time_seconds: Math.max(1, Math.floor(nextResults.elapsedMs / 1000)),
    });

    if (mode === 'story') {
      await awardLevelCompletion(user.id, levelId);
    }
  }, [levelId, mode, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      finalizedRef.current = false;
      setResults(null);
      setVoiceStatus('idle');

      const loadedDefinition = await loadMiniGameDefinition(levelId);
      if (!loadedDefinition || cancelled) {
        setDefinition(null);
        setState(null);
        setLoading(false);
        return;
      }

      setDefinition(loadedDefinition);

      if (user?.id) {
        try {
          const progress = await ensureUserProfileProgress(user.id);
          if (!cancelled) {
            setRuntimeSettings(progress.settings);
          }
        } catch {
          if (!cancelled) {
            setRuntimeSettings(defaultRuntimeSettings);
          }
        }
      }

      const engine = new MiniGameEngine(loadedDefinition);
      engine.start();
      engineRef.current = engine;
      setState(engine.getState());

      const voiceAdapter = new VoiceInputAdapter(loadedDefinition.intentMap, (match) => {
        if (!match.matched || !match.intent || match.confidence < 0.65) {
          setVoiceStatus('No clear match. Retry voice or use tap.');
          return;
        }
        setVoiceStatus(`${match.matchedBy} ${(match.confidence * 100).toFixed(0)}%`);
        const next = engine.submitIntent(match.intent);
        setState(next);
        if (next.isComplete) {
          void finalizeRun();
        }
      });

      voiceAdapterRef.current = voiceAdapter;
      setVoiceSupported(voiceAdapter.isSupported());
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
      voiceAdapterRef.current?.stop();
    };
  }, [levelId, user?.id, finalizeRun]);

  useEffect(() => {
    if (!state || state.isComplete) return;
    const id = setInterval(() => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.tick();
      const next = engine.getState();
      setState(next);
      if (next.isComplete) {
        void finalizeRun();
      }
    }, 250);
    return () => clearInterval(id);
  }, [state, finalizeRun]);

  const submitIntent = useCallback(
    (intent: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      const next = engine.submitIntent(intent);
      setState(next);
      if (next.isComplete) {
        void finalizeRun();
      }
    },
    [finalizeRun]
  );

  const onVoicePress = useCallback(() => {
    if (!runtimeSettings.voiceModeEnabled) {
      setVoiceStatus('Voice mode disabled in settings.');
      return;
    }
    if (runtimeSettings.publicModeEnabled) {
      setVoiceStatus('Public mode is on. Tap mode only.');
      return;
    }
    const adapter = voiceAdapterRef.current;
    if (!adapter || !adapter.isSupported()) {
      setVoiceStatus('Voice is not supported on this browser/device.');
      return;
    }
    setVoiceStatus('listening...');
    adapter.start();
  }, [runtimeSettings]);

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.cream }]}> 
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  if (!definition || !state) {
    return (
      <View style={styles.container}>
        <DecorativeBackground />
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Mini-game unavailable</Text>
          <Text style={styles.emptySubtitle}>This level does not have a playable config yet.</Text>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const Mechanic = mechanicComponentMap[definition.mechanicType] ?? DialogueTilesMechanic;

  return (
    <View style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable style={styles.topBtn} onPress={onBack}>
            <Text style={styles.topBtnText}>Back</Text>
          </Pressable>
          <Text style={styles.topMode}>{mode === 'story' ? 'Story Mode' : 'Thai Arcade'}</Text>
          <View style={styles.topRight} />
        </View>

        {!results ? (
          <Mechanic
            definition={definition}
            state={state}
            currentPrompt={engineRef.current?.getCurrentPrompt() ?? null}
            showRomanization={runtimeSettings.showRomanization}
            showEnglishMeaning={runtimeSettings.showEnglishMeaning}
            voiceModeEnabled={runtimeSettings.voiceModeEnabled}
            publicModeEnabled={runtimeSettings.publicModeEnabled}
            voiceSupported={voiceSupported}
            voiceStatus={voiceStatus}
            onIntentTap={submitIntent}
            onVoicePress={onVoicePress}
          />
        ) : (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Run Complete</Text>
            <Text style={styles.resultLine}>Accuracy: {results.accuracy}%</Text>
            <Text style={styles.resultLine}>Speed score: {results.speedScore}</Text>
            <Text style={styles.resultLine}>Vocab used: {results.usedVocabCount}</Text>
            <Text style={styles.resultLine}>Correct / wrong: {results.correctCount} / {results.incorrectCount}</Text>
            {mode === 'story' && <Text style={styles.resultLine}>Tokens earned: +25</Text>}

            <Pressable
              style={styles.continueBtn}
              onPress={() => {
                onFinished?.();
                onBack();
              }}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </Pressable>
          </View>
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
    },
    content: {
      paddingTop: 64,
      paddingBottom: 140,
      paddingHorizontal: spacing.lg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    topBtn: {
      minHeight: 34,
      minWidth: 68,
      borderWidth: 2,
      borderColor: brand.blue,
      borderRadius: radii.md,
      backgroundColor: brand.white,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      ...shadows.soft,
    },
    topBtnText: {
      color: brand.textDark,
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
    },
    topMode: {
      color: brand.textDark,
      fontFamily: fonts.display,
      fontSize: 16,
      lineHeight: 21,
    },
    topRight: {
      width: 68,
    },
    emptyCard: {
      marginTop: 120,
      marginHorizontal: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 2,
      borderColor: brand.blue,
      backgroundColor: brand.white,
      padding: spacing.xl,
      ...shadows.soft,
    },
    emptyTitle: {
      fontSize: 20,
      lineHeight: 25,
      fontFamily: fonts.display,
      color: brand.textDark,
    },
    emptySubtitle: {
      marginTop: spacing.sm,
      fontSize: 13,
      lineHeight: 18,
      color: brand.textMedium,
    },
    backBtn: {
      marginTop: spacing.lg,
      minHeight: 40,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: brand.blue,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: brand.creamDark,
    },
    backBtnText: {
      fontSize: 13,
      lineHeight: 18,
      color: brand.textDark,
      fontFamily: fonts.bodyMedium,
    },
    resultCard: {
      borderRadius: radii.xl,
      borderWidth: 2,
      borderColor: brand.blue,
      backgroundColor: brand.white,
      padding: spacing.xl,
      ...shadows.soft,
    },
    resultTitle: {
      fontSize: 23,
      lineHeight: 28,
      fontFamily: fonts.display,
      color: brand.textDark,
      marginBottom: spacing.md,
    },
    resultLine: {
      fontSize: 13,
      lineHeight: 18,
      color: brand.textDark,
      marginBottom: spacing.xs,
    },
    continueBtn: {
      marginTop: spacing.lg,
      minHeight: 44,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: brand.orangeDark,
      backgroundColor: brand.orange,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.soft,
    },
    continueBtnText: {
      color: brand.onAccent,
      fontFamily: fonts.display,
      fontSize: 16,
      lineHeight: 20,
    },
  });
