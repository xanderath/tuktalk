import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { trackEvent } from '../lib/analytics';

export type SessionStats = {
  completedAt: number;
  levelId: number;
  score: number;
  wordsLearned: number;
  accuracy: number;
  timeSeconds: number;
};

type SessionStatsContextValue = {
  lastSession: SessionStats | null;
  setLastSession: (stats: SessionStats) => void;
};

const SessionStatsContext = createContext<SessionStatsContextValue | null>(null);

export function SessionStatsProvider({ children }: { children: React.ReactNode }) {
  const [lastSession, setLastSession] = useState<SessionStats | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('session_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setLastSession({
          completedAt: new Date(data.created_at).getTime(),
          levelId: data.level_id ?? 0,
          score: data.score ?? 0,
          wordsLearned: data.words_learned ?? 0,
          accuracy: data.accuracy ?? 0,
          timeSeconds: data.time_seconds ?? 0,
        });
      }
    };
    load();
  }, [user?.id]);

  const setAndPersist = async (stats: SessionStats) => {
    setLastSession(stats);
    if (!user?.id) return;
    await supabase.from('session_stats').insert({
      user_id: user.id,
      level_id: stats.levelId,
      score: stats.score,
      words_learned: stats.wordsLearned,
      accuracy: stats.accuracy,
      time_seconds: stats.timeSeconds,
    });
    trackEvent(
      'session_completed',
      {
        level_id: stats.levelId,
        score: stats.score,
        words_learned: stats.wordsLearned,
        accuracy: stats.accuracy,
        time_seconds: stats.timeSeconds,
      },
      user.id
    );
  };
  const value = useMemo(
    () => ({ lastSession, setLastSession: setAndPersist }),
    [lastSession, user?.id]
  );

  return <SessionStatsContext.Provider value={value}>{children}</SessionStatsContext.Provider>;
}

export function useSessionStats() {
  const ctx = useContext(SessionStatsContext);
  if (!ctx) {
    throw new Error('useSessionStats must be used within SessionStatsProvider');
  }
  return ctx;
}
