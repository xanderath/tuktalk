import React from 'react';
import { useFonts } from 'expo-font';
import { Mitr_600SemiBold } from '@expo-google-fonts/mitr';
import { Sarabun_400Regular, Sarabun_700Bold } from '@expo-google-fonts/sarabun';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { useAuth } from './src/hooks/useAuth';
import { AuthScreen } from './src/screens/AuthScreen';
import { Tabs } from './src/navigation/Tabs';
import { brand } from './src/lib/themes';
import { SessionStatsProvider } from './src/context/SessionStatsContext';
import { TabProvider } from './src/context/TabContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/context/ThemeContext';
import { useTheme } from './src/context/ThemeContext';

if (__DEV__) {
  LogBox.ignoreLogs([
    'shadow* style props are deprecated. Use "boxShadow".',
    '[expo-av]',
    '[expo-notifications] Listening to push token changes is not yet fully supported on web.',
  ]);
}

function AppContent() {
  const { colors } = useTheme();
  const [fontsLoaded] = useFonts({
    Mitr_600SemiBold,
    Sarabun_400Regular,
    Sarabun_700Bold,
  });

  const { user, loading } = useAuth();

  if (!fontsLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.cream }]}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.cream }]}>
        <ActivityIndicator size="large" color={colors.orange} />
      </View>
    );
  }

  return user ? <Tabs /> : <AuthScreen />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <SessionStatsProvider>
          <TabProvider>
            <AppContent />
          </TabProvider>
        </SessionStatsProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brand.cream,
  },
});
