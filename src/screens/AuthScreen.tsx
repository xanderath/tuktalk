import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { fonts } from '../lib/themes';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { useTheme } from '../context/ThemeContext';

export function AuthScreen() {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.container}>
        <DecorativeBackground />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logoCard}>
            <Image
              source={require('../assets/brand/kamjai_logo_primary_light.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>Welcome to KamJai!</Text>
            <Text style={styles.brandSubtitle}>Learn Thai and English with heart.</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>{isSignUp ? 'Create your account' : 'Welcome back!'}</Text>
              <Text style={styles.formSubtitle}>Start with email and password.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@email.com"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{isSignUp ? 'Get Started' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.secondaryButtonText}>
                {isSignUp ? 'I Already Have an Account' : 'Create an Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any, shadows: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  logoCard: {
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.borderStrong,
    ...shadows.lift,
  },
  brandLogo: {
    width: 180,
    height: 140,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.blue,
    marginBottom: 4,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.textMedium,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.soft,
  },
  formHeader: {
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.blue,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: colors.textMedium,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.creamDark,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textDark,
    borderWidth: 2,
    borderColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.orange,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: colors.orangeDark,
    ...shadows.soft,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.display,
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.blue,
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    color: colors.blue,
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
  },
  error: {
    color: colors.error,
    marginBottom: 12,
    textAlign: 'center',
  },
});
