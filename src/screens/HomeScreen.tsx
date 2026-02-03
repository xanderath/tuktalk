import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export function HomeScreen() {
  const { user, signOut } = useAuth();
  const [levels, setLevels] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [levelsRes, stagesRes] = await Promise.all([
      supabase.from('levels').select('*').order('level_number'),
      supabase.from('stages').select('*').order('id'),
    ]);
    if (levelsRes.data) setLevels(levelsRes.data);
    if (stagesRes.data) setStages(stagesRes.data);
    setLoading(false);
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#FF6B35" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>สวัสดี!</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        {stages.map((stage) => (
          <View key={stage.id} style={styles.stageSection}>
            <Text style={styles.stageName}>{stage.name}</Text>
            <View style={styles.levelsGrid}>
              {levels.filter((l) => l.stage_id === stage.id).map((level) => (
                <TouchableOpacity key={level.id} style={[styles.levelCard, level.is_free && styles.levelCardFree]}>
                  <Text style={styles.levelNumber}>{level.level_number}</Text>
                  <Text style={styles.levelName}>{level.environment_name}</Text>
                  {level.is_free && <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: '#2d2d44' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#FF6B35' },
  email: { fontSize: 14, color: '#999', marginTop: 4 },
  signOutButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#3d3d5c' },
  signOutText: { color: '#fff', fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  stageSection: { marginBottom: 32 },
  stageName: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 16 },
  levelsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  levelCard: { width: '47%', backgroundColor: '#2d2d44', borderRadius: 16, padding: 16, position: 'relative' },
  levelCardFree: { borderColor: '#FF6B35', borderWidth: 2 },
  levelNumber: { fontSize: 32, fontWeight: 'bold', color: '#FF6B35' },
  levelName: { fontSize: 14, color: '#ccc', marginTop: 4 },
  freeBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#FF6B35', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  freeBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
