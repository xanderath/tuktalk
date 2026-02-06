import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { StoryModeScreen } from '../screens/StoryModeScreen';
import { ArcadeHubScreen } from '../screens/ArcadeHubScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { GlossaryScreen } from '../screens/GlossaryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { fonts } from '../lib/themes';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTab } from '../context/TabContext';
import { useTheme } from '../context/ThemeContext';

const tabs = [
  { key: 'story', label: 'Story', icon: '🎮' },
  { key: 'arcade', label: 'Arcade', icon: '🕹️' },
  { key: 'review', label: 'Review', icon: '📝' },
  { key: 'glossary', label: 'Glossary', icon: '📘' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
  { key: 'profile', label: 'Profile', icon: '👤' },
];

export function Tabs() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const { activeTab, setActiveTab } = useTab();
  const { user } = useAuth();
  const [dueCount, setDueCount] = useState(0);

  const fetchDueCount = async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const { count } = await supabase
      .from('user_vocabulary_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or(`next_review_date.lte.${now},next_review_date.is.null`);
    setDueCount(count ?? 0);
  };

  useEffect(() => {
    fetchDueCount();
  }, [user?.id, activeTab]);

  useEffect(() => {
    if (!user?.id) return;
    const id = setInterval(fetchDueCount, 60000);
    return () => clearInterval(id);
  }, [user?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {(activeTab === 'story' || activeTab === 'home') && <StoryModeScreen />}
        {activeTab === 'arcade' && <ArcadeHubScreen />}
        {activeTab === 'review' && <ReviewScreen />}
        {activeTab === 'glossary' && <GlossaryScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </View>

      <View style={styles.bottomBar}>
        {tabs.map((item) => {
          const isActive = activeTab === item.key;
          const showBadge = item.key === 'review' && dueCount > 0;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.bottomItem, isActive && styles.bottomItemActive]}
              onPress={() => setActiveTab(item.key)}
            >
              <View style={styles.iconWrap}>
                <Text style={[styles.bottomIcon, isActive && styles.bottomIconActive]}>{item.icon}</Text>
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{dueCount > 9 ? '9+' : dueCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.bottomLabel, isActive && styles.bottomLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: colors.blue,
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...shadows.lift,
  },
  bottomItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
  },
  bottomItemActive: {
    backgroundColor: colors.creamDark,
    borderWidth: 1,
    borderColor: colors.blue,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomIcon: {
    fontSize: 18,
    color: colors.textMedium,
  },
  bottomIconActive: {
    color: colors.blue,
    transform: [{ translateY: -1 }],
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
  },
  bottomLabel: {
    fontSize: 9,
    color: colors.textMedium,
    marginTop: 2,
    fontFamily: fonts.body,
    textAlign: 'center',
  },
  bottomLabelActive: {
    color: colors.blue,
    fontFamily: fonts.bodyMedium,
  },
});
