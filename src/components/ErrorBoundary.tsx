import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { fonts } from '../lib/themes';
import { useTheme } from '../context/ThemeContext';

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

type ThemedProps = ErrorBoundaryProps & {
  colors: any;
  shadows: any;
};

class ThemedErrorBoundary extends React.Component<ThemedProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crash caught by ErrorBoundary', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    if (Platform.OS === 'web') {
      window.location.reload();
      return;
    }
    this.handleReset();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const styles = createStyles(this.props.colors, this.props.shadows);

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🧡</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app hit a snag. Try again, and if it keeps happening, reload the page.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={this.handleReset}>
              <Text style={styles.primaryButtonText}>Try again</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && (
              <TouchableOpacity style={styles.secondaryButton} onPress={this.handleReload}>
                <Text style={styles.secondaryButtonText}>Reload page</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const { colors, shadows } = useTheme();
  return (
    <ThemedErrorBoundary colors={colors} shadows={shadows}>
      {children}
    </ThemedErrorBoundary>
  );
}

const createStyles = (brand: any, shadows: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: brand.white,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: brand.borderStrong,
    padding: 24,
    alignItems: 'center',
    ...shadows.lift,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: brand.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: brand.textMedium,
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: brand.orange,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.orangeDark,
    marginBottom: 10,
  },
  primaryButtonText: {
    fontFamily: fonts.display,
    color: brand.onAccent,
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: brand.creamDark,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: brand.border,
  },
  secondaryButtonText: {
    fontFamily: fonts.bodyMedium,
    color: brand.textDark,
    fontSize: 13,
  },
});
