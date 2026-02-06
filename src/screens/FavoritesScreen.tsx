import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { fonts } from '../lib/themes';
import { useTheme } from '../context/ThemeContext';

const favorites = [
  { thai: 'ขอบคุณ', roman: 'khawp-khun', english: 'Thank you' },
  { thai: 'สวัสดี', roman: 'sa-wat-dii', english: 'Hello' },
  { thai: 'ใช่', roman: 'chai', english: 'Yes' },
];

export function FavoritesScreen() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  return (
    <View style={styles.container}>
      <DecorativeBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>Your bookmarked words and phrases.</Text>

        {favorites.map((item) => (
          <View key={item.thai} style={styles.card}>
            <View>
              <Text style={styles.thai}>{item.thai}</Text>
              <Text style={styles.roman}>{item.roman}</Text>
            </View>
            <Text style={styles.english}>{item.english}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Add more favorites</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (brand: any, shadows: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.cream },
  content: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 140 },
  title: { fontSize: 28, fontFamily: fonts.display, color: brand.textDark },
  subtitle: { fontSize: 14, color: brand.textMedium, marginBottom: 20 },
  card: {
    backgroundColor: brand.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: brand.border,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.soft,
  },
  thai: { fontSize: 18, fontFamily: fonts.display, color: brand.textDark },
  roman: { fontSize: 12, color: brand.orange },
  english: { fontSize: 14, color: brand.textMedium },
  actionButton: {
    backgroundColor: brand.orange,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.orangeDark,
    marginTop: 6,
    ...shadows.soft,
  },
  actionText: { color: brand.onAccent, fontFamily: fonts.display, fontSize: 16 },
});
