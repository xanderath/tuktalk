import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Share,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { fonts, spacing, radii, layout } from '../lib/themes';
import { supabase } from '../lib/supabase';
import { useSessionStats } from '../context/SessionStatsContext';
import { useTheme } from '../context/ThemeContext';
import {
  cancelDailyReminders,
  getDailyReminderIds,
  getDailyReminderSchedule,
  rescheduleDailyReminder,
  scheduleDailyReminder,
} from '../lib/notifications';

export function ProfileScreen() {
  const { colors, shadows, mode, setMode, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { user, signOut } = useAuth();
  const displayName = user?.email ? user.email.split('@')[0] : 'Sarah';
  const { lastSession } = useSessionStats();
  const [toastMessage, setToastMessage] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d');
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [scoreData, setScoreData] = useState<{ label: string; value: number }[]>([]);
  const [streakBars, setStreakBars] = useState<{ label: string; value: number }[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [srsBoxes, setSrsBoxes] = useState<number[]>([0, 0, 0, 0, 0]);
  const [srsDue, setSrsDue] = useState(0);
  const [srsProblem, setSrsProblem] = useState(0);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderTime, setReminderTime] = useState({ hour: 19, minute: 0 });
  const leechThreshold = 5;
  const leechActive = srsProblem >= leechThreshold;
  const lastLeechActive = useRef(false);
  const [leechOnlyReminder, setLeechOnlyReminder] = useState(false);
  const streakAnim = useRef(new Animated.Value(1)).current;
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminLevel, setAdminLevel] = useState(1);
  const [adminJson, setAdminJson] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const maxScore = Math.max(1, ...scoreData.map((point) => point.value));

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    const padded = minute.toString().padStart(2, '0');
    return `${hour12}:${padded} ${period}`;
  };

  const buildReminderBody = () => {
    if (leechActive) {
      return `You have ${srsProblem} tricky words waiting. Quick leech review?`;
    }
    return 'Quick review to keep your streak alive!';
  };

  const adjustReminderTime = async (deltaMinutes: number) => {
    const total = (reminderTime.hour * 60 + reminderTime.minute + deltaMinutes + 1440) % 1440;
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    setReminderTime({ hour, minute });
    if (reminderEnabled) {
      if (leechOnlyReminder && !leechActive) {
        await cancelDailyReminders();
        showToast('Leech-only reminder armed. We will ping you when tricky words appear.');
      } else {
        await rescheduleDailyReminder(hour, minute, buildReminderBody());
        showToast(`Reminder updated to ${formatTime(hour, minute)}.`);
      }
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(1600),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadAdminDialogues = async () => {
    setAdminLoading(true);
    const { data, error } = await supabase
      .from('dialogues')
      .select('speaker, speaker_thai, emoji, thai, roman, english, correct, options, display_order')
      .eq('level_id', adminLevel)
      .order('display_order', { ascending: true });

    if (error) {
      showToast('Failed to load dialogues.');
      setAdminLoading(false);
      return;
    }

    const payload = (data ?? []).map((row: any) => ({
      speaker: row.speaker,
      speakerThai: row.speaker_thai,
      emoji: row.emoji,
      thai: row.thai,
      roman: row.roman,
      english: row.english,
      correct: row.correct,
      options: Array.isArray(row.options) ? row.options : [],
    }));

    setAdminJson(JSON.stringify(payload, null, 2));
    setAdminLoading(false);
  };

  const saveAdminDialogues = async () => {
    if (!adminJson.trim()) {
      showToast('Paste dialogue JSON before saving.');
      return;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(adminJson);
    } catch (error) {
      showToast('Invalid JSON. Please fix the format.');
      return;
    }

    if (!Array.isArray(parsed)) {
      showToast('Dialogues JSON must be an array.');
      return;
    }

    const rows = parsed.map((item, index) => ({
      level_id: adminLevel,
      display_order: index + 1,
      speaker: item.speaker ?? '',
      speaker_thai: item.speakerThai ?? '',
      emoji: item.emoji ?? '',
      thai: item.thai ?? '',
      roman: item.roman ?? '',
      english: item.english ?? '',
      correct: item.correct ?? '',
      options: Array.isArray(item.options) ? item.options : [],
    }));

    if (rows.some((row) => !row.speaker || !row.thai)) {
      showToast('Each row needs a speaker and Thai text.');
      return;
    }

    setAdminLoading(true);
    const { error: upsertError } = await supabase
      .from('dialogues')
      .upsert(rows, { onConflict: 'level_id,display_order' });

    if (upsertError) {
      showToast('Failed to save dialogues.');
      setAdminLoading(false);
      return;
    }

    await supabase
      .from('dialogues')
      .delete()
      .eq('level_id', adminLevel)
      .gt('display_order', rows.length);

    showToast('Dialogues updated.');
    setAdminLoading(false);
  };

  useEffect(() => {
    const loadReminder = async () => {
      const ids = await getDailyReminderIds();
      setReminderEnabled(ids.length > 0);
      const schedule = await getDailyReminderSchedule();
      if (schedule) {
        setReminderTime(schedule);
      }
    };
    loadReminder();
  }, []);

  useEffect(() => {
    if (adminOpen) {
      loadAdminDialogues();
    }
  }, [adminLevel, adminOpen]);

  useEffect(() => {
    if (!reminderEnabled) return;
    if (leechOnlyReminder && !leechActive) {
      cancelDailyReminders();
      return;
    }
    if (lastLeechActive.current !== leechActive) {
      lastLeechActive.current = leechActive;
      rescheduleDailyReminder(reminderTime.hour, reminderTime.minute, buildReminderBody());
    }
  }, [leechActive, reminderEnabled, reminderTime, leechOnlyReminder]);

  useEffect(() => {
    if (currentStreak <= 0) {
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
  }, [currentStreak, streakAnim]);

  const handleReminderToggle = async () => {
    if (reminderLoading) return;
    setReminderLoading(true);
    if (reminderEnabled) {
      await cancelDailyReminders();
      setReminderEnabled(false);
      showToast('Daily reminder paused.');
    } else {
      setReminderEnabled(true);
      if (leechOnlyReminder && !leechActive) {
        showToast('Leech-only reminder armed. We will ping you when tricky words appear.');
      } else {
        const result = await scheduleDailyReminder(
          reminderTime.hour,
          reminderTime.minute,
          buildReminderBody()
        );
        if (result.status === 'denied') {
          showToast('Enable notifications in Settings to get reminders.');
        } else if (result.status === 'unsupported') {
          showToast('Reminders are available on iOS/Android only.');
        } else {
          showToast(`Daily reminder set for ${formatTime(reminderTime.hour, reminderTime.minute)}.`);
        }
      }
    }
    setReminderLoading(false);
  };

  useEffect(() => {
    const loadChart = async () => {
      if (!user?.id) return;
      const days = chartRange === '7d' ? 7 : 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('session_stats')
        .select('accuracy, score, created_at')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      const accuracyBuckets: { [key: string]: { sum: number; count: number } } = {};
      const scoreBuckets: { [key: string]: { sum: number; count: number } } = {};
      const order: string[] = [];
      (data ?? []).forEach((row) => {
        const d = new Date(row.created_at);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        if (!accuracyBuckets[label]) {
          accuracyBuckets[label] = { sum: 0, count: 0 };
          scoreBuckets[label] = { sum: 0, count: 0 };
          order.push(label);
        }
        accuracyBuckets[label].sum += row.accuracy ?? 0;
        accuracyBuckets[label].count += 1;
        scoreBuckets[label].sum += row.score ?? 0;
        scoreBuckets[label].count += 1;
      });
      const accuracyPoints = order.map((label) => {
        const bucket = accuracyBuckets[label];
        const avg = bucket.sum / Math.max(1, bucket.count);
        return { label, value: Math.round(avg) };
      });
      const scorePoints = order.map((label) => {
        const bucket = scoreBuckets[label];
        const avg = bucket.sum / Math.max(1, bucket.count);
        return { label, value: Math.round(avg) };
      });
      setChartData(accuracyPoints);
      setScoreData(scorePoints);

      const streakDays = 7;
      const today = new Date();
      const dayKeys = Array.from({ length: streakDays }).map((_, idx) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (streakDays - 1 - idx));
        const key = d.toISOString().slice(0, 10);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return { key, label };
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
      const bars = dayKeys.map((day) => ({
        label: day.label,
        value: reviewsByDay[day.key] ?? 0,
      }));
      setStreakBars(bars);
      const todayKey = dayKeys[dayKeys.length - 1]?.key;
      const todayCount = todayKey ? reviewsByDay[todayKey] ?? 0 : 0;
      const yesterdayKey = dayKeys[dayKeys.length - 2]?.key;
      const yesterdayCount = yesterdayKey ? reviewsByDay[yesterdayKey] ?? 0 : 0;
      let streak = 0;
      for (let i = dayKeys.length - 1; i >= 0; i -= 1) {
        const day = dayKeys[i];
        if ((reviewsByDay[day.key] ?? 0) > 0) streak += 1;
        else break;
      }
      if (todayCount === 0 && yesterdayCount > 0) {
        streak = Math.max(0, streak);
      }
      setCurrentStreak(streak);

      const { data: srsData } = await supabase
        .from('user_vocabulary_progress')
        .select('srs_box, next_review_date, is_problem_word')
        .eq('user_id', user.id);
      const boxCounts = [0, 0, 0, 0, 0];
      let due = 0;
      let problem = 0;
      const now = new Date();
      (srsData ?? []).forEach((row) => {
        const idx = Math.min(5, Math.max(1, row.srs_box ?? 1)) - 1;
        boxCounts[idx] += 1;
        if (row.is_problem_word) problem += 1;
        if (!row.next_review_date || new Date(row.next_review_date) <= now) due += 1;
      });
      setSrsBoxes(boxCounts);
      setSrsDue(due);
      setSrsProblem(problem);
    };
    loadChart();
  }, [chartRange, user?.id]);

  const handleInvite = async () => {
    try {
      const referralCode = user?.id ? `KAMJAI${user.id.slice(0, 4).toUpperCase()}` : 'KAMJAI10';
      const message =
        `Join me on KamJai to learn Thai with heart. Use code ${referralCode} for 10% off your first month.`;
      const url = `https://kamjai.com?ref=${referralCode}`;
      const result = await Share.share({
        message: `${message} ${url}`,
      });
      if (result.action === Share.sharedAction) {
        showToast('Thanks for sharing KamJai!');
        if (user?.id) {
          await supabase.from('share_events').insert({
            user_id: user.id,
            share_context: 'invite_friends',
            share_channel: result.activityType ?? 'share_sheet',
          });
        }
      }
    } catch (error) {
      console.error('Share error', error);
    }
  };

  return (
    <View style={styles.container}>
      <DecorativeBackground />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            opacity: toastAnim,
            transform: [
              {
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.levelCard}>
          <Text style={styles.levelTitle}>Level 2</Text>
          <View style={styles.levelRow}>
            <Text style={styles.levelStat}>⭐ 720</Text>
            <Text style={styles.levelStat}>320/500</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>My Progress</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>🔥 5 Days</Text>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>⭐ 720 Stars</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
          </View>
        </View>

        <View style={styles.themeCard}>
          <Text style={styles.themeTitle}>Theme</Text>
          <View style={styles.themeOptions}>
            {(['light', 'auto', 'dark'] as const).map((option) => (
              <Pressable
                key={option}
                style={({ pressed }) => [
                  styles.themeOption,
                  mode === option && styles.themeOptionActive,
                  pressed && styles.pressScale,
                ]}
                onPress={() => setMode(option)}
                accessibilityRole="button"
                accessibilityLabel={`Set theme to ${option}`}
              >
                <Text style={[styles.themeOptionText, mode === option && styles.themeOptionTextActive]}>
                  {option === 'auto' ? 'Auto' : option === 'dark' ? 'Dark' : 'Light'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.themeHint}>
            {mode === 'auto'
              ? `Auto switches at 7pm / 7am. Currently ${isDark ? 'Dark' : 'Light'}.`
              : `Locked to ${mode === 'dark' ? 'Dark' : 'Light'} mode.`}
          </Text>
        </View>

        <Animated.View
          style={[
            styles.streakBadge,
            currentStreak > 0 && styles.streakBadgeActive,
            { transform: [{ scale: streakAnim }] },
          ]}
        >
          <Text style={styles.streakBadgeIcon}>🔥</Text>
          <View>
            <Text style={styles.streakBadgeTitle}>
              {currentStreak > 0 ? `${currentStreak} day review streak` : 'Start your review streak'}
            </Text>
            <Text style={styles.streakBadgeSubtitle}>
              {currentStreak > 0 ? 'Reviews keep your momentum' : 'Complete reviews to earn streaks'}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.sessionCard}>
          <Text style={styles.sessionTitle}>Last Session</Text>
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
            <Text style={styles.sessionEmpty}>Complete a lesson to see your latest stats.</Text>
          )}
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <Text style={styles.reminderTitle}>Daily Reminder</Text>
            <View style={styles.reminderPill}>
              <Text style={styles.reminderPillText}>{reminderEnabled ? 'On' : 'Off'}</Text>
            </View>
          </View>
          <Text style={styles.reminderText}>
            We will nudge you at {formatTime(reminderTime.hour, reminderTime.minute)} local time.
          </Text>
          <View style={styles.timePicker}>
            <View style={styles.timePickerRow}>
              <Pressable
                style={({ pressed }) => [styles.timeAdjustButton, pressed && styles.pressScale]}
                onPress={() => adjustReminderTime(-60)}
                accessibilityRole="button"
                accessibilityLabel="Decrease reminder by 1 hour"
              >
                <Text style={styles.timeAdjustText}>-1h</Text>
              </Pressable>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeDisplayText}>{formatTime(reminderTime.hour, reminderTime.minute)}</Text>
                <Text style={styles.timeDisplayHint}>Custom time</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.timeAdjustButton, pressed && styles.pressScale]}
                onPress={() => adjustReminderTime(60)}
                accessibilityRole="button"
                accessibilityLabel="Increase reminder by 1 hour"
              >
                <Text style={styles.timeAdjustText}>+1h</Text>
              </Pressable>
            </View>
            <View style={styles.timePickerRow}>
              <Pressable
                style={({ pressed }) => [styles.timeAdjustButton, pressed && styles.pressScale]}
                onPress={() => adjustReminderTime(-15)}
                accessibilityRole="button"
                accessibilityLabel="Decrease reminder by 15 minutes"
              >
                <Text style={styles.timeAdjustText}>-15m</Text>
              </Pressable>
              <Text style={styles.timeDisplayHint}>Fine tune minutes</Text>
              <Pressable
                style={({ pressed }) => [styles.timeAdjustButton, pressed && styles.pressScale]}
                onPress={() => adjustReminderTime(15)}
                accessibilityRole="button"
                accessibilityLabel="Increase reminder by 15 minutes"
              >
                <Text style={styles.timeAdjustText}>+15m</Text>
              </Pressable>
            </View>
          </View>
          {leechActive && (
            <View style={styles.leechReminderPill}>
              <Text style={styles.leechReminderText}>
                Leech priority reminder enabled ({srsProblem} tricky words)
              </Text>
            </View>
          )}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Leech-only reminder</Text>
            <Pressable
              style={[
                styles.toggleSwitch,
                leechOnlyReminder && styles.toggleSwitchActive,
              ]}
              onPress={() => setLeechOnlyReminder((v) => !v)}
              accessibilityRole="switch"
              accessibilityLabel="Leech-only reminder"
              accessibilityState={{ checked: leechOnlyReminder }}
            >
              <View style={[styles.toggleKnob, leechOnlyReminder && styles.toggleKnobActive]} />
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.reminderButton,
              reminderEnabled && styles.reminderButtonActive,
              pressed && styles.pressScale,
            ]}
            onPress={handleReminderToggle}
            accessibilityRole="button"
            accessibilityLabel={reminderEnabled ? 'Pause daily reminder' : 'Enable daily reminder'}
          >
            <Text style={styles.reminderButtonText}>
              {reminderLoading ? 'Working...' : reminderEnabled ? 'Pause Reminder' : 'Enable Reminder'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Accuracy Trend</Text>
            <View style={styles.chartTabs}>
              {(['7d', '30d'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setChartRange(tab)}
                  style={({ pressed }) => [
                    styles.chartTab,
                    chartRange === tab && styles.chartTabActive,
                    pressed && styles.pressScale,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${tab.toUpperCase()} chart`}
                >
                  <Text style={[styles.chartTabText, chartRange === tab && styles.chartTabTextActive]}>
                    {tab.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.chartArea}>
            {chartData.length === 0 ? (
              <Text style={styles.chartEmpty}>Complete a few lessons to see your trend.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chartRow}>
                  {chartData.map((point) => (
                    <View key={point.label} style={styles.chartCol}>
                      <View style={[styles.chartBar, { height: Math.max(10, (point.value / 100) * 80) }]} />
                      <Text style={styles.chartValue}>{point.value}%</Text>
                      <Text style={styles.chartLabel}>{point.label}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Score Trend</Text>
            <View style={styles.chartRangePill}>
              <Text style={styles.chartRangeText}>{chartRange.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.chartArea}>
            {scoreData.length === 0 ? (
              <Text style={styles.chartEmpty}>Complete a few lessons to see your scores.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chartRow}>
                  {scoreData.map((point) => (
                    <View key={`score-${point.label}`} style={styles.chartCol}>
                      <View
                        style={[
                          styles.chartBarScore,
                          { height: Math.max(10, (point.value / maxScore) * 80) },
                        ]}
                      />
                      <Text style={styles.chartValue}>{point.value}</Text>
                      <Text style={styles.chartLabel}>{point.label}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>SRS Health</Text>
            <View style={styles.chartRangePill}>
              <Text style={styles.chartRangeText}>Due {srsDue}</Text>
            </View>
          </View>
          <View style={styles.srsRow}>
            {srsBoxes.map((count, idx) => (
              <View key={`srs-${idx}`} style={styles.srsCol}>
                <View style={[styles.srsBar, { height: Math.max(8, Math.min(70, count * 6)) }]} />
                <Text style={styles.srsLabel}>Box {idx + 1}</Text>
                <Text style={styles.srsValue}>{count}</Text>
              </View>
            ))}
          </View>
          <View style={styles.srsMetaRow}>
            <View style={styles.srsPill}>
              <Text style={styles.srsPillText}>Problem {srsProblem}</Text>
            </View>
            <View style={styles.srsPill}>
              <Text style={styles.srsPillText}>Total {srsBoxes.reduce((a, b) => a + b, 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Streak Activity</Text>
            <View style={styles.chartRangePill}>
              <Text style={styles.chartRangeText}>{currentStreak} day streak</Text>
            </View>
          </View>
          <View style={styles.chartArea}>
            <View style={styles.streakRow}>
              {streakBars.map((bar) => (
                <View key={`streak-${bar.label}`} style={styles.streakCol}>
                  <View
                    style={[
                      styles.streakBar,
                      bar.value > 0 && styles.streakBarActive,
                      { height: Math.max(8, Math.min(60, bar.value * 14)) },
                    ]}
                  />
                  <Text style={styles.chartLabel}>{bar.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {['English Vocabulary', 'Thai Grammar', 'Favorites', 'Achievements', 'Settings'].map((item) => (
          <Pressable
            key={item}
            style={({ pressed }) => [styles.menuItem, pressed && styles.pressScale]}
            accessibilityRole="button"
            accessibilityLabel={item}
          >
            <Text style={styles.menuText}>{item}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [styles.adminToggle, pressed && styles.pressScale]}
          onPress={() => setAdminOpen((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel="Dialogues admin tools"
        >
          <Text style={styles.adminToggleText}>Dialogues Admin</Text>
          <Text style={styles.adminToggleBadge}>{adminOpen ? 'Hide' : 'Edit'}</Text>
        </Pressable>

        {adminOpen && (
          <View style={styles.adminCard}>
            <View style={styles.adminRow}>
              <Pressable
                style={({ pressed }) => [styles.adminIconButton, pressed && styles.pressScale]}
                onPress={() => setAdminLevel((value) => Math.max(1, value - 1))}
                accessibilityRole="button"
                accessibilityLabel="Previous level"
              >
                <Text style={styles.adminIconText}>−</Text>
              </Pressable>
              <Text style={styles.adminLevelText}>Level {adminLevel}</Text>
              <Pressable
                style={({ pressed }) => [styles.adminIconButton, pressed && styles.pressScale]}
                onPress={() => setAdminLevel((value) => Math.min(30, value + 1))}
                accessibilityRole="button"
                accessibilityLabel="Next level"
              >
                <Text style={styles.adminIconText}>＋</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.adminLoadButton, pressed && styles.pressScale]}
                onPress={loadAdminDialogues}
                accessibilityRole="button"
                accessibilityLabel="Load dialogues"
              >
                {adminLoading ? (
                  <ActivityIndicator size="small" color={colors.textDark} />
                ) : (
                  <Text style={styles.adminLoadText}>Load</Text>
                )}
              </Pressable>
            </View>
            <Text style={styles.adminHint}>
              Paste a JSON array of dialogues with speaker, thai, roman, english, correct, and options.
            </Text>
            <TextInput
              style={styles.adminInput}
              value={adminJson}
              onChangeText={setAdminJson}
              placeholder="[{ speaker: '', thai: '', options: [...] }]"
              placeholderTextColor={colors.textLight}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.adminActions}>
              <Pressable
                style={({ pressed }) => [styles.adminSaveButton, pressed && styles.pressScale]}
                onPress={saveAdminDialogues}
                accessibilityRole="button"
                accessibilityLabel="Save dialogues"
              >
                <Text style={styles.adminSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.inviteCard, pressed && styles.pressScale]}
          onPress={handleInvite}
          accessibilityRole="button"
          accessibilityLabel="Invite friends"
        >
          <Text style={styles.inviteTitle}>Invite Friends</Text>
          <Text style={styles.inviteText}>Earn bonus stars together.</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressScale]}
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const createStyles = (brand: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.cream },
  toast: {
    position: 'absolute',
    top: 18,
    left: 20,
    right: 20,
    backgroundColor: brand.white,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: brand.blue,
    zIndex: 10,
    ...shadows.soft,
  },
  toastText: { fontSize: 12, lineHeight: 16, color: brand.textDark, textAlign: 'center', fontFamily: fonts.bodyMedium },
  content: {
    paddingTop: layout.contentTop,
    paddingHorizontal: layout.contentPadding,
    paddingBottom: layout.contentBottom,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.white,
    borderRadius: radii.jumbo,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    ...shadows.soft,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brand.white,
  },
  avatarText: { color: brand.onAccent, fontSize: 20, fontFamily: fonts.display },
  headerInfo: { marginLeft: 12, justifyContent: 'center' },
  name: { fontSize: 18, lineHeight: 22, fontFamily: fonts.display, color: brand.blue },
  email: { fontSize: 12, lineHeight: 16, color: brand.textMedium, marginTop: 2 },
  levelCard: {
    backgroundColor: brand.blue,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.orangeDark,
    marginTop: spacing.lg,
    ...shadows.soft,
  },
  levelTitle: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display, color: brand.onAccent },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  levelStat: { color: brand.onAccent, fontSize: 14, lineHeight: 18 },
  progressCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    marginTop: spacing.lg,
    ...shadows.soft,
  },
  progressTitle: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display, color: brand.blue, marginBottom: 10 },
  progressRow: { marginBottom: 12 },
  progressLabel: { fontSize: 12, lineHeight: 16, color: brand.textMedium, marginBottom: 8 },
  progressBar: {
    height: 10,
    borderRadius: 6,
    backgroundColor: brand.creamDark,
    borderWidth: 1,
    borderColor: brand.blue,
  },
  progressFill: {
    width: '75%',
    height: '100%',
    backgroundColor: brand.orange,
    borderRadius: 6,
  },
  themeCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    marginTop: spacing.lg,
    ...shadows.soft,
  },
  themeTitle: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display, color: brand.blue, marginBottom: 10 },
  themeOptions: { flexDirection: 'row', gap: 8 },
  themeOption: {
    flex: 1,
    backgroundColor: brand.creamDark,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.blue,
    minHeight: 36,
  },
  themeOptionActive: {
    backgroundColor: brand.orangeLight,
    borderColor: brand.orangeDark,
  },
  themeOptionText: { fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyMedium, color: brand.textMedium },
  themeOptionTextActive: { color: brand.textDark },
  themeHint: { fontSize: 11, lineHeight: 16, color: brand.textMedium, marginTop: 8 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: brand.creamDark,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
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
  streakBadgeTitle: { fontSize: 12, lineHeight: 16, fontFamily: fonts.display, color: brand.blue },
  streakBadgeSubtitle: { fontSize: 10, lineHeight: 14, color: brand.textMedium, marginTop: 2, maxWidth: 200 },
  sessionCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.blue,
    marginTop: spacing.lg,
    ...shadows.soft,
  },
  sessionTitle: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display, color: brand.blue, marginBottom: 10 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  sessionLabel: { fontSize: 12, lineHeight: 16, color: brand.textMedium },
  sessionValue: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark },
  sessionEmpty: { fontSize: 12, lineHeight: 16, color: brand.textLight, marginTop: 4 },
  reminderCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.border,
    marginTop: spacing.lg,
    ...shadows.soft,
  },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderTitle: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display, color: brand.textDark },
  reminderPill: {
    backgroundColor: brand.creamDark,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: brand.border,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderPillText: { fontSize: 10, lineHeight: 12, fontFamily: fonts.bodyMedium, color: brand.textDark, textAlignVertical: 'center' },
  reminderText: { fontSize: 12, lineHeight: 16, color: brand.textMedium, marginTop: 8 },
  timePicker: { marginTop: 12, gap: 8 },
  timePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeAdjustButton: {
    backgroundColor: brand.creamDark,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: brand.border,
    minHeight: 34,
    justifyContent: 'center',
  },
  timeAdjustText: { fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyMedium, color: brand.textDark },
  timeDisplay: { alignItems: 'center', flex: 1 },
  timeDisplayText: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display, color: brand.textDark },
  timeDisplayHint: { fontSize: 10, lineHeight: 14, color: brand.textMedium },
  leechReminderPill: {
    marginTop: 12,
    backgroundColor: brand.coral,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: brand.borderStrong,
    alignItems: 'center',
  },
  leechReminderText: { fontSize: 10, lineHeight: 14, fontFamily: fonts.bodyMedium, color: brand.onAccent, textAlignVertical: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  toggleLabel: { fontSize: 12, lineHeight: 16, color: brand.textMedium },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: brand.creamDark,
    borderWidth: 2,
    borderColor: brand.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: brand.mint,
    borderColor: brand.borderStrong,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: brand.white,
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 18 }],
  },
  reminderButton: {
    marginTop: 12,
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.orangeDark,
    minHeight: 40,
    justifyContent: 'center',
  },
  reminderButtonActive: {
    backgroundColor: brand.creamDark,
    borderColor: brand.borderStrong,
  },
  reminderButtonText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark, textAlignVertical: 'center' },
  chartCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.border,
    marginTop: spacing.lg,
    ...shadows.soft,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chartTitle: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display, color: brand.textDark },
  chartTabs: { flexDirection: 'row', gap: 6 },
  chartRangePill: {
    backgroundColor: brand.creamDark,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: brand.border,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartRangeText: { fontSize: 10, lineHeight: 12, color: brand.textMedium, fontFamily: fonts.bodyMedium, textAlignVertical: 'center' },
  chartTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: brand.border,
    backgroundColor: brand.creamDark,
    minHeight: 30,
    justifyContent: 'center',
  },
  chartTabActive: { backgroundColor: brand.orangeLight, borderColor: brand.orangeDark },
  chartTabText: { fontSize: 10, lineHeight: 12, color: brand.textMedium, fontFamily: fonts.bodyMedium, textAlignVertical: 'center' },
  chartTabTextActive: { color: brand.textDark },
  chartArea: {
    backgroundColor: brand.cream,
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: brand.border,
  },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingRight: 8 },
  chartCol: { alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: {
    width: 16,
    backgroundColor: brand.orange,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: brand.orangeDark,
    marginBottom: 6,
  },
  chartBarScore: {
    width: 16,
    backgroundColor: brand.blue,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: brand.borderStrong,
    marginBottom: 6,
  },
  chartValue: { fontSize: 10, lineHeight: 12, color: brand.textDark, marginBottom: 4 },
  chartLabel: { fontSize: 9, lineHeight: 12, color: brand.textMedium },
  chartEmpty: { fontSize: 12, lineHeight: 16, color: brand.textMedium, textAlign: 'center' },
  srsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: brand.cream,
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: brand.border,
  },
  srsCol: { alignItems: 'center', flex: 1 },
  srsBar: {
    width: 18,
    backgroundColor: brand.orange,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: brand.orangeDark,
    marginBottom: 6,
  },
  srsLabel: { fontSize: 9, lineHeight: 12, color: brand.textMedium },
  srsValue: { fontSize: 10, lineHeight: 12, color: brand.textDark, fontFamily: fonts.bodyMedium },
  srsMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  srsPill: {
    flex: 1,
    backgroundColor: brand.creamDark,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.border,
    justifyContent: 'center',
    minHeight: 32,
  },
  srsPillText: { fontSize: 11, lineHeight: 14, fontFamily: fonts.bodyMedium, color: brand.textDark, textAlignVertical: 'center' },
  streakRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  streakCol: { alignItems: 'center', flex: 1 },
  streakBar: {
    width: 14,
    backgroundColor: brand.creamDark,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: brand.border,
    marginBottom: 6,
  },
  streakBarActive: {
    backgroundColor: brand.mint,
    borderColor: brand.borderStrong,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: brand.white,
    borderRadius: radii.xl,
    padding: 14,
    borderWidth: 2,
    borderColor: brand.blue,
    marginTop: spacing.md,
    minHeight: 44,
    ...shadows.soft,
  },
  menuText: { fontSize: 14, lineHeight: 18, color: brand.blue, textAlignVertical: 'center' },
  menuArrow: { fontSize: 18, color: brand.blue },
  adminToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: brand.white,
    borderRadius: radii.xl,
    padding: 14,
    borderWidth: 2,
    borderColor: brand.borderStrong,
    marginTop: spacing.md,
    minHeight: 44,
    ...shadows.soft,
  },
  adminToggleText: { fontSize: 14, lineHeight: 18, fontFamily: fonts.display, color: brand.textDark },
  adminToggleBadge: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.bodyMedium,
    color: brand.textDark,
    backgroundColor: brand.creamDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.border,
  },
  adminCard: {
    backgroundColor: brand.white,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.borderStrong,
    marginTop: spacing.md,
    ...shadows.soft,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminIconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.creamDark,
  },
  adminIconText: { fontSize: 16, color: brand.textDark },
  adminLevelText: { flex: 1, fontSize: 14, lineHeight: 18, fontFamily: fonts.display, color: brand.textDark },
  adminLoadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: brand.orangeDark,
    backgroundColor: brand.orangeLight,
  },
  adminLoadText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark },
  adminHint: { marginTop: 10, fontSize: 11, lineHeight: 16, color: brand.textMedium },
  adminInput: {
    marginTop: 10,
    minHeight: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: brand.border,
    padding: 10,
    fontSize: 12,
    lineHeight: 16,
    color: brand.textDark,
    backgroundColor: brand.cream,
  },
  adminActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  adminSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: brand.blue,
    backgroundColor: brand.blueLight,
  },
  adminSaveText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bodyMedium, color: brand.textDark },
  inviteCard: {
    backgroundColor: brand.peach,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: brand.orangeDark,
    marginTop: spacing.lg,
    ...shadows.soft,
  },
  pressScale: { transform: [{ scale: 0.985 }] },
  inviteTitle: { fontSize: 16, lineHeight: 20, fontFamily: fonts.display, color: brand.blue },
  inviteText: { fontSize: 12, lineHeight: 16, color: brand.textMedium, marginTop: 4 },
  signOutButton: {
    backgroundColor: brand.orangeLight,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.orangeDark,
    marginTop: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    ...shadows.soft,
  },
  signOutText: { fontSize: 14, lineHeight: 18, fontFamily: fonts.display, color: brand.textDark, textAlignVertical: 'center' },
});
