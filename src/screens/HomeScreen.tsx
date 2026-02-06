import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { LevelScreen } from './LevelScreen';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { fonts, getTheme, defaultTheme, spacing, radii, layout } from '../lib/themes';
import { useSessionStats } from '../context/SessionStatsContext';
import { useTab } from '../context/TabContext';
import { useTheme } from '../context/ThemeContext';

export function HomeScreen() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { user, signOut } = useAuth();
  const { lastSession } = useSessionStats();
  const { setActiveTab } = useTab();
  const [dailyTarget, setDailyTarget] = useState(8);
  const [todayCount, setTodayCount] = useState(0);
  const [reviewStreak, setReviewStreak] = useState(0);
  const [dueReviews, setDueReviews] = useState(0);
  const streakAnim = useRef(new Animated.Value(1)).current;
  const [levels, setLevels] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<'intro' | 'video' | null>(null);
  const stageAnimsRef = useRef<Animated.Value[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading && stages.length) {
      runStageAnimation();
    }
  }, [loading, stages.length]);

  const loadData = async () => {
    const [levelsRes, stagesRes] = await Promise.all([
      supabase.from('levels').select('*').order('level_number'),
      supabase.from('stages').select('*').order('id'),
    ]);
    if (levelsRes.data) setLevels(levelsRes.data);
    if (stagesRes.data) setStages(stagesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    const loadDaily = async () => {
      if (!user?.id) return;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('review_sessions')
        .select('created_at, reviewed_count')
        .eq('user_id', user.id)
        .gte('created_at', start.toISOString());
      const count = (data ?? []).reduce((sum, row) => sum + (row.reviewed_count ?? 0), 0);
      setTodayCount(count);
      const target = Math.max(6, Math.min(12, 8));
      setDailyTarget(target);

      const streakDays = 7;
      const today = new Date();
      const dayKeys = Array.from({ length: streakDays }).map((_, idx) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (streakDays - 1 - idx));
        return d.toISOString().slice(0, 10);
      });
      const { data: reviewDays } = await supabase
        .from('review_sessions')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(today.getTime() - streakDays * 24 * 60 * 60 * 1000).toISOString());
      const reviewsByDay: Record<string, number> = {};
      (reviewDays ?? []).forEach((row) => {
        const key = new Date(row.created_at).toISOString().slice(0, 10);
        reviewsByDay[key] = (reviewsByDay[key] ?? 0) + 1;
      });
      let streak = 0;
      for (let i = dayKeys.length - 1; i >= 0; i -= 1) {
        const key = dayKeys[i];
        if ((reviewsByDay[key] ?? 0) > 0) streak += 1;
        else break;
      }
      setReviewStreak(streak);
    };
    loadDaily();
  }, [user?.id, lastSession?.completedAt]);

  useEffect(() => {
    if (reviewStreak <= 0) {
      streakAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(streakAnim, {
          toValue: 1.06,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(streakAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [reviewStreak, streakAnim]);

  useEffect(() => {
    const loadDue = async () => {
      if (!user?.id) return;
      const now = new Date().toISOString();
      const { count } = await supabase
        .from('user_vocabulary_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .or(`next_review_date.lte.${now},next_review_date.is.null`);
      setDueReviews(count ?? 0);
    };
    loadDue();
  }, [user?.id, lastSession?.completedAt]);

  const getStageAnim = (index: number) => {
    if (!stageAnimsRef.current[index]) {
      stageAnimsRef.current[index] = new Animated.Value(0);
    }
    return stageAnimsRef.current[index];
  };

  const runStageAnimation = () => {
    stageAnimsRef.current = stages.map((_, idx) => stageAnimsRef.current[idx] ?? new Animated.Value(0));
    stageAnimsRef.current.forEach((anim) => anim.setValue(0));
    Animated.stagger(
      80,
      stageAnimsRef.current.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  };

  if (selectedLevel !== null) {
    return (
      <LevelScreen
        levelId={selectedLevel}
        startPhase={selectedPhase ?? undefined}
        onBack={() => {
          setSelectedLevel(null);
          setSelectedPhase(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  const displayName = user?.email ? user.email.split('@')[0] : 'friend';
  const initial = displayName.charAt(0).toUpperCase();

  const nextLevel = levels.find((l) => l.is_free) ?? levels[0];
  const heroTheme = nextLevel ? getTheme(nextLevel.id) : defaultTheme;
  const videoAvailable = Boolean(nextLevel?.video_intro_url);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <View style={styles.container}>
      <DecorativeBackground />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroBanner}>
              <View style={styles.heroBannerRow}>
                <Text style={styles.heroHello}>Hi, {displayName}!</Text>
                <Text style={styles.heroBannerIcon}>🔔</Text>
              </View>
              <Text style={styles.heroReady}>Ready to learn?</Text>
            </View>
            <View style={styles.heroBadgeStack}>
              <Pressable
                style={({ pressed }) => [
                  styles.dueBadge,
                  dueReviews > 0 && styles.dueBadgeActive,
                  pressed && styles.pressScale,
                ]}
                onPress={() => setActiveTab('review')}
                accessibilityRole="button"
                accessibilityLabel={`You have ${dueReviews} reviews due. Open Review.`}
              >
                <Text style={[styles.dueBadgeCount, dueReviews > 0 && styles.dueBadgeCountActive]}>{dueReviews}</Text>
                <Text style={[styles.dueBadgeLabel, dueReviews > 0 && styles.dueBadgeLabelActive]}>Due</Text>
              </Pressable>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            </View>
          </View>

          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder="Search lessons..."
              placeholderTextColor={colors.textMedium}
              style={styles.searchInput}
              accessibilityLabel="Search lessons"
              accessibilityHint="Search lessons and stages"
            />
          </View>

          <View style={styles.lessonQuickRow}>
            <View style={[styles.lessonQuickCard, styles.lessonQuickCardOrange]}>
              <View style={styles.lessonQuickTitleRow}>
                <Text style={styles.lessonQuickFlag}>🇺🇸</Text>
                <Text style={styles.lessonQuickLabel}>English Lessons</Text>
              </View>
              <View style={styles.lessonQuickProgress}>
                <View style={styles.lessonQuickTrack}>
                  <View style={[styles.lessonQuickFill, { width: '60%' }]} />
                </View>
                <Text style={styles.lessonQuickMeta}>Lesson 8/20</Text>
              </View>
            </View>
            <View style={[styles.lessonQuickCard, styles.lessonQuickCardBlue]}>
              <View style={styles.lessonQuickTitleRow}>
                <Text style={styles.lessonQuickFlag}>🇹🇭</Text>
                <Text style={styles.lessonQuickLabel}>Thai Lessons</Text>
              </View>
              <View style={styles.lessonQuickProgress}>
                <View style={styles.lessonQuickTrack}>
                  <View style={[styles.lessonQuickFill, { width: '45%' }]} />
                </View>
                <Text style={styles.lessonQuickMeta}>Lesson 6/20</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Level</Text>
              <Text style={styles.heroStatValue}>{nextLevel?.level_number ?? 1}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Stars</Text>
              <Text style={styles.heroStatValue}>⭐ 320</Text>
            </View>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={signOut}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          <Animated.View
            style={[
              styles.streakBadge,
              reviewStreak > 0 && styles.streakBadgeActive,
              { transform: [{ scale: streakAnim }] },
            ]}
          >
            <Text style={styles.streakBadgeIcon}>🔥</Text>
            <View>
              <Text style={styles.streakBadgeTitle}>
                {reviewStreak > 0 ? `${reviewStreak} day streak` : 'Start your streak'}
              </Text>
              <Text style={styles.streakBadgeSubtitle}>
                {reviewStreak > 0 ? 'Keep it alive with a quick review' : 'Complete reviews daily to level up'}
              </Text>
            </View>
          </Animated.View>
        </View>

        {nextLevel && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Video Intro</Text>
            <Pressable
              style={({ pressed }) => [
                styles.videoTile,
                !videoAvailable && styles.videoTileDisabled,
                pressed && videoAvailable && styles.pressScale,
              ]}
              onPress={() => {
                if (videoAvailable) {
                  setSelectedPhase('video');
                  setSelectedLevel(nextLevel.id);
                }
              }}
              disabled={!videoAvailable}
              accessibilityRole="button"
              accessibilityLabel={`Video intro for ${nextLevel.environment_name} ${videoAvailable ? 'available' : 'coming soon'}`}
              accessibilityState={{ disabled: !videoAvailable }}
            >
              <View>
                <Text style={styles.videoTileTitle}>Watch the scene setup</Text>
                <Text style={styles.videoTileSubtitle}>
                  {videoAvailable ? '2–3 min with a native speaker' : 'Intro video coming soon'}
                </Text>
                <View style={styles.videoProgressRow}>
                  <View style={styles.videoProgressTrack}>
                    <View style={[styles.videoProgressFill, { width: videoAvailable ? '15%' : '0%' }]} />
                  </View>
                  <Text style={styles.videoProgressText}>{videoAvailable ? '0/1 watched' : '0/0'}</Text>
                </View>
              </View>
              <View style={styles.videoCTA}>
                <Text style={styles.videoCTAText}>{videoAvailable ? 'Play' : 'Soon'}</Text>
              </View>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews Waiting</Text>
          <Pressable
            style={({ pressed }) => [styles.reviewBadgeCard, pressed && styles.pressScale]}
            onPress={() => setActiveTab('review')}
            accessibilityRole="button"
            accessibilityLabel={`Reviews waiting. ${dueReviews} due.`}
          >
            <View style={styles.reviewBadgeLeft}>
              <Text style={styles.reviewBadgeCount}>{dueReviews}</Text>
              <Text style={styles.reviewBadgeLabel}>Reviews due</Text>
            </View>
            <View style={styles.reviewBadgePill}>
              <Text style={styles.reviewBadgeText}>
                {dueReviews === 0 ? 'All caught up' : 'Open Review tab'}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Session</Text>
          <View style={styles.sessionCard}>
            {lastSession ? (
              <>
                <View style={styles.sessionRow}>
                  <Text style={styles.sessionLabel}>Level</Text>
                  <Text style={styles.sessionValue}>Level {lastSession.levelId}</Text>
                </View>
                <View style={styles.sessionRow}>
                  <Text style={styles.sessionLabel}>Accuracy</Text>
                  <Text style={styles.sessionValue}>{lastSession.accuracy}%</Text>
                </View>
                <View style={styles.sessionRow}>
                  <Text style={styles.sessionLabel}>Time</Text>
                  <Text style={styles.sessionValue}>{formatDuration(lastSession.timeSeconds)}</Text>
                </View>
                <View style={styles.sessionRow}>
                  <Text style={styles.sessionLabel}>Words</Text>
                  <Text style={styles.sessionValue}>{lastSession.wordsLearned}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.sessionEmpty}>Finish a lesson to see your latest stats.</Text>
            )}
          </View>
          <View style={styles.targetCard}>
            <View style={styles.targetHeader}>
              <Text style={styles.targetTitle}>Daily Review Target</Text>
              <Text style={styles.targetValue}>{todayCount}/{dailyTarget}</Text>
            </View>
            <View style={styles.targetTrack}>
              <View
                style={[
                  styles.targetFill,
                  { width: `${Math.min(100, (todayCount / Math.max(1, dailyTarget)) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.targetHint}>
              {Math.max(0, dailyTarget - todayCount) === 0
                ? reviewStreak > 0
                  ? `Goal complete! ${reviewStreak} day streak.`
                  : 'Goal complete! Keep it up tomorrow.'
                : reviewStreak > 0
                  ? `Only ${Math.max(0, dailyTarget - todayCount)} reviews left to protect your streak.`
                  : `Do ${Math.max(0, dailyTarget - todayCount)} reviews to start your streak.`}
            </Text>
          </View>
        </View>

        {nextLevel && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            <Pressable
              style={({ pressed }) => [
                styles.continueCard,
                { borderColor: heroTheme.cardBorder },
                pressed && nextLevel.is_free && styles.pressScale,
              ]}
              onPress={() => {
                if (nextLevel.is_free) {
                  setSelectedPhase('intro');
                  setSelectedLevel(nextLevel.id);
                }
              }}
              disabled={!nextLevel.is_free}
              accessibilityRole="button"
              accessibilityLabel={`Continue learning: ${nextLevel.environment_name}. Lesson ${nextLevel.level_number}. ${nextLevel.is_free ? 'Free' : 'Locked'}.`}
              accessibilityState={{ disabled: !nextLevel.is_free }}
            >
              <View style={styles.continueHeader}>
                <Text style={styles.continueTitle}>{nextLevel.environment_name}</Text>
                <View style={styles.continueTag}>
                  <Text style={styles.continueTagText}>Lesson {nextLevel.level_number}</Text>
                </View>
              </View>
              <Text style={styles.continueSubtitle}>Tap to practice a new scene</Text>
              <View style={styles.continueFooter}>
                <Text style={styles.continueBadge}>{nextLevel.is_free ? 'Free' : 'Locked'}</Text>
                <View style={styles.continueButton}>
                  <Text style={styles.continueButtonText}>Start →</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Learning</Text>
          {stages.map((stage, index) => {
            const stageLevels = levels.filter((l) => l.stage_id === stage.id);
            const nextStageLevel = stageLevels.find((l) => l.is_free) ?? stageLevels[0];
            const theme = nextStageLevel ? getTheme(nextStageLevel.id) : defaultTheme;
            const isLocked = nextStageLevel ? !nextStageLevel.is_free : true;
            const anim = getStageAnim(index);

            return (
              <Animated.View
                key={stage.id}
                style={{
                  opacity: anim,
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.stageCard,
                    { borderColor: theme.cardBorder },
                    pressed && nextStageLevel?.is_free && styles.pressScale,
                  ]}
                  onPress={() => {
                    if (nextStageLevel?.is_free) {
                      setSelectedPhase('intro');
                      setSelectedLevel(nextStageLevel.id);
                    }
                  }}
                  disabled={!nextStageLevel?.is_free}
                  accessibilityRole="button"
                  accessibilityLabel={`Stage ${stage.id}: ${stage.name}. Lesson ${nextStageLevel?.level_number ?? '-'}. ${isLocked ? 'Locked' : 'Free'}.`}
                  accessibilityState={{ disabled: !nextStageLevel?.is_free }}
                >
                  <View style={[styles.stageBadge, { backgroundColor: theme.primaryLight, borderColor: theme.cardBorder }]}>
                    <Text style={styles.stageBadgeText}>{stage.id}</Text>
                  </View>
                  <View style={styles.stageInfo}>
                    <Text style={styles.stageName}>{stage.name}</Text>
                    <Text style={styles.stageDesc}>{stage.description}</Text>
                    <View style={styles.stageMeta}>
                      <View style={styles.levelPill}>
                        <Text style={styles.levelPillText}>Lesson {nextStageLevel?.level_number ?? '-'}</Text>
                      </View>
                      {isLocked ? (
                        <View style={styles.lockedPill}>
                          <Text style={styles.lockedPillText}>Locked</Text>
                        </View>
                      ) : (
                        <View style={styles.freePill}>
                          <Text style={styles.freePillText}>Free</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={styles.stageArrow}>›</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

    </View>
  );
}

const createStyles = (brand: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brand.cream,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: layout.contentTop,
    paddingHorizontal: layout.contentPadding,
    paddingBottom: layout.contentBottom,
  },
  heroCard: {
    backgroundColor: brand.white,
    borderRadius: 28,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.lift,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroBanner: {
    flex: 1,
    backgroundColor: brand.orangeLight,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: brand.orangeDark,
  },
  heroBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroBannerIcon: {
    fontSize: 16,
    color: brand.blue,
  },
  heroHello: {
    fontSize: 25,
    lineHeight: 30,
    fontFamily: fonts.display,
    color: brand.blue,
  },
  heroReady: {
    fontSize: 13,
    lineHeight: 18,
    color: brand.blue,
    marginTop: 2,
  },
  heroBadgeStack: {
    alignItems: 'flex-end',
    gap: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brand.white,
  },
  dueBadge: {
    backgroundColor: brand.creamDark,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: brand.border,
    alignItems: 'center',
    minWidth: 48,
    minHeight: 36,
  },
  dueBadgeActive: {
    backgroundColor: brand.coral,
    borderColor: brand.borderStrong,
  },
  dueBadgeCount: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: fonts.display,
    color: brand.textDark,
  },
  dueBadgeLabel: {
    fontSize: 10,
    lineHeight: 12,
    color: brand.textMedium,
    marginTop: 2,
  },
  dueBadgeCountActive: {
    color: brand.onAccent,
  },
  dueBadgeLabelActive: {
    color: brand.onAccent,
  },
  avatarText: {
    color: brand.onAccent,
    fontSize: 18,
    fontFamily: fonts.display,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: brand.blue,
    marginTop: 12,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: brand.textDark,
    fontSize: 14,
    lineHeight: 18,
  },
  lessonQuickRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  lessonQuickCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    ...shadows.soft,
  },
  lessonQuickCardOrange: {
    backgroundColor: brand.orange,
    borderColor: brand.orangeDark,
  },
  lessonQuickCardBlue: {
    backgroundColor: brand.blue,
    borderColor: brand.blue,
  },
  lessonQuickTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  lessonQuickFlag: {
    fontSize: 14,
  },
  lessonQuickLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.display,
    color: brand.onAccent,
  },
  lessonQuickProgress: {
    gap: 6,
  },
  lessonQuickTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  lessonQuickFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: brand.white,
  },
  lessonQuickMeta: {
    fontSize: 10,
    lineHeight: 12,
    color: brand.onAccent,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: spacing.lg,
  },
  heroStat: {
    backgroundColor: brand.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: brand.blue,
    minHeight: 36,
  },
  heroStatLabel: {
    fontSize: 10,
    lineHeight: 12,
    color: brand.textMedium,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroStatValue: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: fonts.display,
    color: brand.textDark,
    marginTop: 2,
  },
  signOutButton: {
    backgroundColor: brand.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: brand.blue,
    minHeight: 36,
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.bodyMedium,
    color: brand.textDark,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: brand.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: brand.blue,
    marginTop: spacing.lg,
  },
  streakBadgeActive: {
    backgroundColor: brand.orangeLight,
    borderColor: brand.orangeDark,
  },
  streakBadgeIcon: { fontSize: 18 },
  streakBadgeTitle: { fontSize: 12, lineHeight: 16, fontFamily: fonts.display, color: brand.textDark },
  streakBadgeSubtitle: { fontSize: 10, lineHeight: 14, color: brand.textMedium, marginTop: 2, maxWidth: 180 },
  section: {
    marginTop: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: fonts.display,
    color: brand.blue,
    marginBottom: spacing.md,
  },
  videoTile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.border,
    ...shadows.soft,
  },
  videoTileDisabled: {
    opacity: 0.6,
  },
  videoTileTitle: { fontSize: 15, lineHeight: 20, fontFamily: fonts.display, color: brand.textDark },
  videoTileSubtitle: { fontSize: 12, lineHeight: 16, color: brand.textMedium, marginTop: 4 },
  videoProgressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  videoProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 4,
    backgroundColor: brand.creamDark,
    borderWidth: 1,
    borderColor: brand.border,
    marginRight: 8,
  },
  videoProgressFill: { height: '100%', borderRadius: 4, backgroundColor: brand.orange },
  videoProgressText: { fontSize: 10, lineHeight: 12, color: brand.textMedium, width: 60 },
  videoCTA: {
    backgroundColor: brand.orangeLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: brand.orangeDark,
    minHeight: 36,
    justifyContent: 'center',
  },
  videoCTAText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark, textAlignVertical: 'center' },
  pressScale: { transform: [{ scale: 0.985 }] },
  reviewBadgeCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.soft,
  },
  reviewBadgeLeft: {
    justifyContent: 'center',
  },
  reviewBadgeCount: { fontSize: 26, lineHeight: 30, fontFamily: fonts.display, color: brand.textDark },
  reviewBadgeLabel: { fontSize: 12, lineHeight: 16, color: brand.textMedium, marginTop: 2 },
  reviewBadgePill: {
    backgroundColor: brand.orangeLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: brand.orangeDark,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBadgeText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark, textAlignVertical: 'center' },
  sessionCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.soft,
  },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  sessionLabel: { fontSize: 12, lineHeight: 16, color: brand.textMedium },
  sessionValue: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark },
  sessionEmpty: { fontSize: 12, lineHeight: 16, color: brand.textMedium },
  targetCard: {
    marginTop: spacing.md,
    backgroundColor: brand.white,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.soft,
  },
  targetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetTitle: { fontSize: 13, lineHeight: 18, fontFamily: fonts.display, color: brand.textDark },
  targetValue: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark },
  targetTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: brand.creamDark,
    borderWidth: 1,
    borderColor: brand.border,
    marginTop: 12,
  },
  targetFill: { height: '100%', borderRadius: 6, backgroundColor: brand.mint },
  targetHint: { fontSize: 11, lineHeight: 16, color: brand.textMedium, marginTop: 8 },

  continueCard: {
    backgroundColor: brand.white,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 2,
    ...shadows.soft,
  },
  continueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  continueTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: fonts.display,
    color: brand.textDark,
  },
  continueTag: {
    backgroundColor: brand.gold,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  continueTagText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.bodyMedium,
    color: brand.textDark,
  },
  continueSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: brand.textMedium,
    marginBottom: 12,
  },
  continueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  continueBadge: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.bodyMedium,
    color: brand.textDark,
  },
  continueButton: {
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: brand.orangeDark,
    minHeight: 36,
    justifyContent: 'center',
  },
  continueButtonText: {
    color: brand.onAccent,
    fontFamily: fonts.bodyMedium,
    lineHeight: 16,
  },
  stageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
    ...shadows.soft,
  },
  stageBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  stageBadgeText: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: brand.textDark,
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.display,
    color: brand.textDark,
  },
  stageDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: brand.textMedium,
    marginTop: 4,
  },
  stageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  levelPill: {
    backgroundColor: brand.creamDark,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: brand.border,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelPillText: {
    fontSize: 10,
    lineHeight: 12,
    color: brand.textMedium,
    textAlignVertical: 'center',
  },
  freePill: {
    backgroundColor: brand.mint,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: brand.borderStrong,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freePillText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.bodyMedium,
    color: brand.textDark,
    textAlignVertical: 'center',
  },
  lockedPill: {
    backgroundColor: brand.creamDeep,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: brand.borderStrong,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedPillText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.bodyMedium,
    color: brand.textMedium,
    textAlignVertical: 'center',
  },
  stageArrow: {
    fontSize: 22,
    color: brand.textMedium,
    marginLeft: 8,
  },




});
