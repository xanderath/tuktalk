import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { playAudioFromUri, playThaiAudio } from '../lib/audio';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { fonts } from '../lib/themes';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import {
  getUserPronunciationSignedUrl,
  listUserPronunciationsByVocabulary,
} from '../lib/pronunciation';

type VocabItem = {
  id: string;
  thai_script: string;
  romanization: string;
  english_translation: string;
  icon_url?: string | null;
};

export function GlossaryScreen() {
  const { user } = useAuth();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [items, setItems] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [userPronunciationUrls, setUserPronunciationUrls] = useState<Record<string, string>>({});
  const [loadingUserPronunciations, setLoadingUserPronunciations] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('vocabulary')
        .select('id, thai_script, romanization, english_translation, icon_url')
        .order('english_translation')
        .limit(60);
      if (data) setItems(data as VocabItem[]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!user?.id || items.length === 0) {
      setUserPronunciationUrls({});
      setLoadingUserPronunciations(false);
      return;
    }

    let cancelled = false;
    const loadUserPronunciations = async () => {
      setLoadingUserPronunciations(true);
      try {
        const rows = await listUserPronunciationsByVocabulary({
          userId: user.id,
          vocabularyIds: items.map((item) => item.id),
        });
        const urls = await Promise.all(
          rows.map(async (row) => {
            const signedUrl = await getUserPronunciationSignedUrl(row.storage_path);
            if (!signedUrl) return null;
            return [row.vocabulary_id, signedUrl] as const;
          })
        );
        if (!cancelled) {
          const mapped: Record<string, string> = {};
          urls.forEach((entry) => {
            if (entry) mapped[entry[0]] = entry[1];
          });
          setUserPronunciationUrls(mapped);
        }
      } catch {
        if (!cancelled) setUserPronunciationUrls({});
      } finally {
        if (!cancelled) setLoadingUserPronunciations(false);
      }
    };

    void loadUserPronunciations();
    return () => {
      cancelled = true;
    };
  }, [user?.id, items]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((item) =>
      item.thai_script?.includes(q) ||
      item.romanization?.toLowerCase().includes(q) ||
      item.english_translation?.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <View style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Glossary</Text>
        <Text style={styles.subtitle}>Every word shows Thai, RTGS, English, and an icon.</Text>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search Thai, RTGS, or English"
            placeholderTextColor={colors.textLight}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.orange} />
            <Text style={styles.loadingText}>Loading vocabulary...</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.iconBubble}>
                  {item.icon_url ? (
                    <Image source={{ uri: item.icon_url }} style={styles.iconImage} />
                  ) : (
                    <Text style={styles.iconFallback}>🧠</Text>
                  )}
                </View>
                <Text style={styles.thai}>{item.thai_script}</Text>
                <Text style={styles.roman}>RTGS: {item.romanization}</Text>
                <Text style={styles.english}>{item.english_translation}</Text>
                <View style={styles.audioRow}>
                  <TouchableOpacity style={styles.audioBtn} onPress={() => void playThaiAudio(item.thai_script)}>
                    <Text style={styles.audioBtnText}>Play TTS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.audioBtn,
                      (!userPronunciationUrls[item.id] || loadingUserPronunciations) && styles.audioBtnDisabled,
                    ]}
                    disabled={!userPronunciationUrls[item.id] || loadingUserPronunciations}
                    onPress={() => {
                      const url = userPronunciationUrls[item.id];
                      if (url) void playAudioFromUri(url);
                    }}
                  >
                    <Text style={styles.audioBtnText}>
                      {loadingUserPronunciations
                        ? 'Loading...'
                        : userPronunciationUrls[item.id]
                          ? 'Play Mine'
                          : 'No Recording'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.tapHint}>Save your voice by reaching 100% in Listen & Learn.</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (brand: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.cream },
  content: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 140 },
  title: { fontSize: 28, fontFamily: fonts.display, color: brand.blue },
  subtitle: { fontSize: 14, color: brand.textMedium, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brand.creamDark,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: brand.blue,
    marginBottom: 18,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, marginLeft: 8, color: brand.textDark },
  loadingBox: {
    backgroundColor: brand.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: brand.blue,
    alignItems: 'center',
    ...shadows.soft,
  },
  loadingText: { marginTop: 8, color: brand.textMedium, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    backgroundColor: brand.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 2,
    borderColor: brand.blue,
    marginBottom: 14,
    ...shadows.soft,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: brand.blue,
    marginBottom: 8,
  },
  iconImage: { width: 24, height: 24, resizeMode: 'contain' },
  iconFallback: { fontSize: 16 },
  thai: { fontSize: 20, fontFamily: fonts.display, color: brand.textDark },
  roman: { fontSize: 11, color: brand.orange, marginTop: 2 },
  english: { fontSize: 12, color: brand.textMedium, marginTop: 6 },
  audioRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  audioBtn: {
    flex: 1,
    minHeight: 30,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: brand.blue,
    backgroundColor: brand.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBtnDisabled: {
    opacity: 0.45,
  },
  audioBtnText: {
    fontSize: 10,
    color: brand.textDark,
    fontFamily: fonts.bodyMedium,
  },
  tapHint: { fontSize: 10, color: brand.textLight, marginTop: 8 },
});
