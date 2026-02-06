import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { supabase } from '../lib/supabase';
import { playThaiAudio } from '../lib/audio';
import { fonts, spacing, radii, layout } from '../lib/themes';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

type VocabItem = {
  id: string;
  thai_script: string;
  romanization: string;
  english_translation: string;
  icon_url?: string | null;
};

type DueRecord = {
  vocabulary: VocabItem;
  is_problem_word?: boolean;
  incorrect_streak?: number;
  srs_box?: number;
  next_review_date?: string | null;
};

export function ReviewScreen() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { user } = useAuth();
  const [dueRecords, setDueRecords] = useState<DueRecord[]>([]);
  const [queue, setQueue] = useState<VocabItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mode, setMode] = useState<'list' | 'session' | 'complete'>('list');
  const [reviewMode, setReviewMode] = useState<'all' | 'leech'>('all');
  const [sessionScore, setSessionScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [todayReviews, setTodayReviews] = useState(0);
  const [dailyTarget, setDailyTarget] = useState(8);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('user_vocabulary_progress')
        .select(
          'id, next_review_date, is_problem_word, incorrect_streak, srs_box, vocabulary: vocabulary_id (id, thai_script, romanization, english_translation, icon_url)'
        )
        .eq('user_id', user.id)
        .or(`next_review_date.lte.${now},next_review_date.is.null`)
        .order('is_problem_word', { ascending: false })
        .order('incorrect_streak', { ascending: false })
        .order('next_review_date', { ascending: true, nullsFirst: true })
        .order('srs_box', { ascending: true })
        .limit(20);

      const sorted = (data ?? []).sort((a: any, b: any) => {
        if (a.is_problem_word !== b.is_problem_word) return a.is_problem_word ? -1 : 1;
        const aStreak = a.incorrect_streak ?? 0;
        const bStreak = b.incorrect_streak ?? 0;
        if (aStreak !== bStreak) return bStreak - aStreak;
        const aDate = a.next_review_date ? new Date(a.next_review_date).getTime() : 0;
        const bDate = b.next_review_date ? new Date(b.next_review_date).getTime() : 0;
        if (aDate !== bDate) return aDate - bDate;
        const aBox = a.srs_box ?? 1;
        const bBox = b.srs_box ?? 1;
        return aBox - bBox;
      });

      const due: DueRecord[] = sorted
        .map((row: any) => ({
          vocabulary: row.vocabulary,
          is_problem_word: row.is_problem_word,
          incorrect_streak: row.incorrect_streak,
          srs_box: row.srs_box,
          next_review_date: row.next_review_date,
        }))
        .filter((row: any) => row.vocabulary);
      if (due.length === 0) {
        setEmptyMessage('You are all caught up! No reviews due right now.');
      } else {
        setEmptyMessage('');
      }
      setDueRecords(due);
      const streakDays = 7;
      const today = new Date();
      const dayKeys = Array.from({ length: streakDays }).map((_, idx) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (streakDays - 1 - idx));
        return d.toISOString().slice(0, 10);
      });
      const { data: reviews } = await supabase
        .from('review_sessions')
        .select('created_at, reviewed_count')
        .eq('user_id', user.id)
        .gte('created_at', new Date(today.getTime() - streakDays * 24 * 60 * 60 * 1000).toISOString());
      const reviewsByDay: Record<string, number> = {};
      (reviews ?? []).forEach((row) => {
        const key = new Date(row.created_at).toISOString().slice(0, 10);
        reviewsByDay[key] = (reviewsByDay[key] ?? 0) + (row.reviewed_count ?? 0);
      });
      const todayKey = dayKeys[dayKeys.length - 1];
      const todayCount = reviewsByDay[todayKey] ?? 0;
      setTodayReviews(todayCount);
      const baseTarget = due.length > 0 ? Math.min(8, due.length) : 8;
      setDailyTarget(baseTarget);
      let streak = 0;
      for (let i = dayKeys.length - 1; i >= 0; i -= 1) {
        const key = dayKeys[i];
        if ((reviewsByDay[key] ?? 0) > 0) streak += 1;
        else break;
      }
      setCurrentStreak(streak);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const allItems = useMemo(() => dueRecords.map((row) => row.vocabulary), [dueRecords]);
  const leechRecords = useMemo(
    () =>
      dueRecords.filter(
        (row) => row.is_problem_word || (row.incorrect_streak ?? 0) >= 2
      ),
    [dueRecords]
  );
  const leechItems = useMemo(() => leechRecords.map((row) => row.vocabulary), [leechRecords]);

  const startSession = () => {
    const desired = 8;
    const source = reviewMode === 'leech' ? leechItems : allItems;
    setQueue(source.slice(0, desired));
    setActiveIndex(0);
    setSessionScore(0);
    setMode('session');
  };

  const currentItem = queue[activeIndex];

  const getIntervalDays = (box: number, rating: 'again' | 'hard' | 'good' | 'easy') => {
    const intervals = [1, 3, 7, 14, 30];
    const base = intervals[Math.max(0, Math.min(intervals.length - 1, box - 1))];
    if (rating === 'hard') return Math.max(1, Math.round(base * 0.5));
    if (rating === 'easy') return Math.round(base * 1.5);
    return base;
  };

  const getNextBox = (currentBox: number, rating: 'again' | 'hard' | 'good' | 'easy', incorrectStreak: number) => {
    if (rating === 'again') return 1;
    if (rating === 'hard') return Math.max(1, currentBox - (incorrectStreak >= 2 ? 1 : 0));
    if (rating === 'good') return Math.min(5, currentBox + 1);
    return Math.min(5, currentBox + 2);
  };

  const updateSrs = async (wordId: string, rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!user?.id) return;
    const now = new Date();
    const { data } = await supabase
      .from('user_vocabulary_progress')
      .select('id, srs_box, times_correct, times_incorrect, incorrect_streak')
      .eq('user_id', user.id)
      .eq('vocabulary_id', wordId)
      .maybeSingle();
    const currentBox = data?.srs_box ?? 1;
    const timesCorrect = data?.times_correct ?? 0;
    const timesIncorrect = data?.times_incorrect ?? 0;
    const incorrectStreak = data?.incorrect_streak ?? 0;
    const newIncorrectStreak = rating === 'again' ? incorrectStreak + 1 : 0;
    const nextBox = getNextBox(currentBox, rating, newIncorrectStreak);
    const newCorrect = rating === 'again' ? timesCorrect : timesCorrect + 1;
    const newIncorrect = rating === 'again' ? timesIncorrect + 1 : timesIncorrect;
    const nextReview = new Date(now.getTime() + getIntervalDays(nextBox, rating) * 24 * 60 * 60 * 1000);
    const isProblem = newIncorrect >= 3;

    await supabase.from('user_vocabulary_progress').upsert(
      {
        user_id: user.id,
        vocabulary_id: wordId,
        srs_box: nextBox,
        times_correct: newCorrect,
        times_incorrect: newIncorrect,
        incorrect_streak: newIncorrectStreak,
        last_reviewed: now.toISOString(),
        next_review_date: nextReview.toISOString(),
        is_problem_word: isProblem,
      },
      { onConflict: 'user_id,vocabulary_id' }
    );
  };

  const handleRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentItem) return;
    await updateSrs(currentItem.id, rating);
    const scoreMap = { again: 0, hard: 4, good: 8, easy: 12 };
    setSessionScore((s) => s + scoreMap[rating]);
    if (activeIndex < queue.length - 1) {
      setActiveIndex((i) => i + 1);
    } else {
      if (user?.id) {
        await supabase.from('review_sessions').insert({
          user_id: user.id,
          reviewed_count: queue.length,
        });
      }
      setTodayReviews((t) => t + queue.length);
      if (todayReviews === 0) {
        setCurrentStreak((s) => s + 1);
      }
      setMode('complete');
    }
  };

  const progressPercent = useMemo(() => {
    if (queue.length === 0) return 0;
    return Math.round(((activeIndex + 1) / queue.length) * 100);
  }, [activeIndex, queue.length]);

  return (
    <View style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Review</Text>
        <Text style={styles.subtitle}>Tap a card to hear the Thai pronunciation.</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.orange} />
            <Text style={styles.loadingText}>Preparing your review...</Text>
          </View>
        ) : mode === 'session' && currentItem ? (
          <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionTitle}>Review Session</Text>
              <View style={styles.sessionProgressPill}>
                <Text style={styles.sessionProgressText}>
                  {activeIndex + 1}/{queue.length}
                </Text>
              </View>
            </View>
            <View style={styles.sessionProgressTrack}>
              <View style={[styles.sessionProgressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Pressable
              style={({ pressed }) => [styles.sessionWordCard, pressed && styles.pressScale]}
              onPress={() => playThaiAudio(currentItem.thai_script)}
              accessibilityRole="button"
              accessibilityLabel={`Play audio for ${currentItem.english_translation}`}
            >
              <Text style={styles.sessionThai}>{currentItem.thai_script}</Text>
              <Text style={styles.sessionRoman}>{currentItem.romanization}</Text>
              <Text style={styles.sessionEnglish}>{currentItem.english_translation}</Text>
              <Text style={styles.tapHint}>🔊 Tap to hear</Text>
            </Pressable>
            <Text style={styles.sessionPrompt}>How well did you remember it?</Text>
            <View style={styles.srsGrid}>
              <Pressable
                style={({ pressed }) => [
                  styles.srsButton,
                  styles.srsAgain,
                  pressed && styles.pressScale,
                ]}
                onPress={() => handleRating('again')}
                accessibilityRole="button"
                accessibilityLabel="Rate: Again"
              >
                <Text style={styles.srsText}>Again</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.srsButton,
                  styles.srsHard,
                  pressed && styles.pressScale,
                ]}
                onPress={() => handleRating('hard')}
                accessibilityRole="button"
                accessibilityLabel="Rate: Hard"
              >
                <Text style={styles.srsText}>Hard</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.srsButton,
                  styles.srsGood,
                  pressed && styles.pressScale,
                ]}
                onPress={() => handleRating('good')}
                accessibilityRole="button"
                accessibilityLabel="Rate: Good"
              >
                <Text style={styles.srsText}>Good</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.srsButton,
                  styles.srsEasy,
                  pressed && styles.pressScale,
                ]}
                onPress={() => handleRating('easy')}
                accessibilityRole="button"
                accessibilityLabel="Rate: Easy"
              >
                <Text style={styles.srsText}>Easy</Text>
              </Pressable>
            </View>
          </View>
        ) : mode === 'complete' ? (
          <View style={styles.sessionComplete}>
            <Text style={styles.completeTitle}>Review Complete!</Text>
            <Text style={styles.completeSubtitle}>You reviewed {queue.length} words.</Text>
            {currentStreak > 0 && (
              <View style={styles.bonusPill}>
                <Text style={styles.bonusText}>Streak Bonus +5</Text>
              </View>
            )}
            <View style={styles.completeScore}>
              <Text style={styles.completeScoreLabel}>Session Score</Text>
              <Text style={styles.completeScoreValue}>{sessionScore + (currentStreak > 0 ? 5 : 0)}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressScale]}
              onPress={() => setMode('list')}
              accessibilityRole="button"
              accessibilityLabel="Back to review list"
            >
              <Text style={styles.primaryButtonText}>Back to Review</Text>
            </Pressable>
          </View>
        ) : allItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>You are all caught up</Text>
            <Text style={styles.emptyText}>{emptyMessage || 'Come back later for more review.'}</Text>
          </View>
        ) : (
          <>
            <View style={styles.modeRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.modeChip,
                  reviewMode === 'all' && styles.modeChipActive,
                  pressed && styles.pressScale,
                ]}
                onPress={() => setReviewMode('all')}
                accessibilityRole="button"
                accessibilityLabel={`All due reviews ${allItems.length}`}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    reviewMode === 'all' && styles.modeChipTextActive,
                  ]}
                >
                  All Due ({allItems.length})
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modeChip,
                  reviewMode === 'leech' && styles.modeChipActive,
                  leechItems.length === 0 && styles.modeChipDisabled,
                  pressed && styles.pressScale,
                ]}
                onPress={() => leechItems.length > 0 && setReviewMode('leech')}
                accessibilityRole="button"
                accessibilityLabel={`Leech mode ${leechItems.length}`}
                accessibilityState={{ disabled: leechItems.length === 0 }}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    reviewMode === 'leech' && styles.modeChipTextActive,
                  ]}
                >
                  Leech Mode ({leechItems.length})
                </Text>
              </Pressable>
            </View>
            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>Daily Review Goal</Text>
                <Text style={styles.goalValue}>{todayReviews}/{dailyTarget}</Text>
              </View>
              <View style={styles.goalTrack}>
                <View
                  style={[
                    styles.goalFill,
                    { width: `${Math.min(100, (todayReviews / Math.max(1, dailyTarget)) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.goalHint}>
                {Math.max(0, dailyTarget - todayReviews) === 0
                  ? 'Goal complete! Your streak is safe.'
                  : `Only ${Math.max(0, dailyTarget - todayReviews)} reviews left to hit today's goal.`}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                reviewMode === 'leech' && leechItems.length === 0 && styles.primaryButtonDisabled,
                pressed && styles.pressScale,
              ]}
              onPress={startSession}
              disabled={reviewMode === 'leech' && leechItems.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Start review session"
              accessibilityState={{ disabled: reviewMode === 'leech' && leechItems.length === 0 }}
            >
              <Text style={styles.primaryButtonText}>Start Review Session</Text>
            </Pressable>
            {dueRecords.map((row) => {
              const item = row.vocabulary;
              const isLeech = row.is_problem_word || (row.incorrect_streak ?? 0) >= 2;
              return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.card, pressed && styles.pressScale]}
                onPress={() => playThaiAudio(item.thai_script)}
                accessibilityRole="button"
                accessibilityLabel={`${item.english_translation}. Tap to hear Thai.`}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconBubble}>
                    <Text style={styles.iconFallback}>✨</Text>
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.thai}>{item.thai_script}</Text>
                    <Text style={styles.roman}>RTGS: {item.romanization}</Text>
                  </View>
                  {isLeech && (
                    <View style={styles.leechTag}>
                      <Text style={styles.leechText}>Leech</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.english}>{item.english_translation}</Text>
              </Pressable>
            );})}
          </>
        )}

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Tip of the day</Text>
          <Text style={styles.tipText}>Short daily reviews beat long cramming sessions.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (brand: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.cream },
  content: {
    paddingTop: layout.contentTop,
    paddingHorizontal: layout.contentPadding,
    paddingBottom: layout.contentBottom,
  },
  title: { fontSize: 26, lineHeight: 32, fontFamily: fonts.display, color: brand.blue },
  subtitle: { fontSize: 13, lineHeight: 18, color: brand.textMedium, marginBottom: 16 },
  loadingBox: {
    backgroundColor: brand.white,
    borderRadius: 18,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: brand.blue,
    alignItems: 'center',
    ...shadows.soft,
  },
  loadingText: { marginTop: 8, color: brand.textMedium, fontSize: 12 },
  primaryButton: {
    backgroundColor: brand.orange,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.orangeDark,
    marginBottom: spacing.md,
    minHeight: 44,
    ...shadows.soft,
  },
  primaryButtonText: { color: brand.onAccent, fontSize: 14, lineHeight: 18, fontFamily: fonts.display },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeChip: {
    flex: 1,
    backgroundColor: brand.creamDark,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.blue,
    minHeight: 34,
  },
  modeChipActive: {
    backgroundColor: brand.orangeLight,
    borderColor: brand.orangeDark,
  },
  modeChipDisabled: {
    opacity: 0.5,
  },
  modeChipText: { fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyMedium, color: brand.textMedium },
  modeChipTextActive: { color: brand.textDark },
  goalCard: {
    backgroundColor: brand.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 2,
    borderColor: brand.blue,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalTitle: { fontSize: 13, lineHeight: 18, fontFamily: fonts.display, color: brand.blue },
  goalValue: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark },
  goalTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: brand.creamDark,
    borderWidth: 1,
    borderColor: brand.border,
    marginTop: 10,
  },
  goalFill: { height: '100%', borderRadius: 6, backgroundColor: brand.mint },
  goalHint: { fontSize: 11, lineHeight: 16, color: brand.textMedium, marginTop: 6 },
  emptyBox: {
    backgroundColor: brand.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: brand.blue,
    alignItems: 'center',
    ...shadows.soft,
  },
  emptyTitle: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display, color: brand.blue, marginBottom: 6 },
  emptyText: { fontSize: 12, lineHeight: 16, color: brand.textMedium, textAlign: 'center' },
  leechTag: {
    backgroundColor: brand.coral,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: brand.borderStrong,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  leechText: { fontSize: 9, lineHeight: 12, fontFamily: fonts.bodyMedium, color: brand.onAccent, textAlignVertical: 'center' },
  sessionCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.soft,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sessionTitle: { fontSize: 16, lineHeight: 22, fontFamily: fonts.display, color: brand.blue },
  sessionProgressPill: {
    backgroundColor: brand.creamDark,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: brand.blue,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionProgressText: { fontSize: 10, lineHeight: 12, fontFamily: fonts.bodyMedium, color: brand.textDark, textAlignVertical: 'center' },
  sessionProgressTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: brand.creamDark,
    borderWidth: 1,
    borderColor: brand.border,
    marginBottom: 12,
  },
  sessionProgressFill: { height: '100%', borderRadius: 6, backgroundColor: brand.orange },
  sessionWordCard: {
    backgroundColor: brand.cream,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: brand.blue,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sessionThai: { fontSize: 26, lineHeight: 32, fontFamily: fonts.display, color: brand.blue },
  sessionRoman: { fontSize: 13, lineHeight: 18, color: brand.orange, marginTop: 2 },
  sessionEnglish: { fontSize: 13, lineHeight: 18, color: brand.textMedium, marginTop: 8 },
  tapHint: { fontSize: 11, lineHeight: 14, color: brand.textMedium, marginTop: 10 },
  sessionPrompt: { fontSize: 12, lineHeight: 16, color: brand.textMedium, textAlign: 'center', marginBottom: 12 },
  sessionComplete: {
    backgroundColor: brand.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: brand.blue,
    alignItems: 'center',
    ...shadows.soft,
  },
  completeTitle: { fontSize: 18, lineHeight: 22, fontFamily: fonts.display, color: brand.blue, marginBottom: 6 },
  completeSubtitle: { fontSize: 12, lineHeight: 16, color: brand.textMedium, marginBottom: 16 },
  bonusPill: {
    backgroundColor: brand.mint,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: brand.borderStrong,
    marginBottom: 12,
    alignItems: 'center',
  },
  bonusText: { fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyMedium, color: brand.textDark, textAlignVertical: 'center' },
  completeScore: {
    backgroundColor: brand.creamDark,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: brand.blue,
    marginBottom: 16,
    alignItems: 'center',
  },
  completeScoreLabel: { fontSize: 11, lineHeight: 14, color: brand.textMedium, marginBottom: 4, textAlignVertical: 'center' },
  completeScoreValue: { fontSize: 18, lineHeight: 22, fontFamily: fonts.display, color: brand.textDark, textAlign: 'center' },
  srsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  srsButton: {
    width: '48%',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    ...shadows.soft,
  },
  srsText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark, textAlignVertical: 'center' },
  srsAgain: { backgroundColor: '#FFEBEE', borderColor: brand.error },
  srsHard: { backgroundColor: brand.orangeLight, borderColor: brand.orangeDark },
  srsGood: { backgroundColor: '#E8F5E9', borderColor: brand.success },
  srsEasy: { backgroundColor: brand.blueLight, borderColor: brand.blue },
  card: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: brand.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brand.border,
    marginRight: 12,
    marginTop: 2,
  },
  iconFallback: { fontSize: 18 },
  headerText: { flex: 1, paddingTop: 1 },
  thai: { fontSize: 19, lineHeight: 24, fontFamily: fonts.display, color: brand.textDark },
  roman: { fontSize: 12, lineHeight: 16, color: brand.orange, marginTop: 2 },
  english: { fontSize: 13, lineHeight: 18, color: brand.textMedium, marginTop: 10 },
  tipCard: {
    backgroundColor: brand.blueLight,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.border,
    marginTop: spacing.md,
    ...shadows.soft,
  },
  pressScale: { transform: [{ scale: 0.985 }] },
  tipTitle: { fontSize: 14, lineHeight: 18, fontFamily: fonts.display, color: brand.textDark, marginBottom: 6 },
  tipText: { fontSize: 12, lineHeight: 16, color: brand.textMedium },
});
