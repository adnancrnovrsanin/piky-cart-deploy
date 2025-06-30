import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { COLORS, FONTS, FONT_SIZES, SPACING, SHADOWS, BORDER_RADIUS, TEXT_STYLES, BUTTON_STYLES, INPUT_STYLES } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting login process...');
      const { error: signInError } = await signIn(email.trim(), password);
      
      if (signInError) {
        console.error('Login failed:', signInError);
        
        // Handle specific error types
        if (signInError.includes('CORS') || signInError.includes('Failed to fetch')) {
          setError('Connection error. Please check your internet connection and try again.');
          
          // Show CORS configuration alert for development
          if (__DEV__) {
            Alert.alert(
              'Development Configuration Required',
              'It looks like there\'s a CORS issue. Please configure your Supabase project to allow requests from this domain:\n\nhttps://xooyx23as660cee.boltexpo.dev\n\nGo to your Supabase Dashboard → Authentication → URL Configuration and add this URL to the allowed origins.',
              [{ text: 'OK' }]
            );
          }
        } else if (signInError.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (signInError.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(signInError);
        }
      } else {
        console.log('Login successful');
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <ShoppingCart size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Welcome to PikyCart</Text>
            <Text style={styles.subtitle}>Sign in to manage your shopping lists</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={20} color={COLORS.error} style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color={COLORS.gray600} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null); // Clear error when user starts typing
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={COLORS.gray500}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color={COLORS.gray600} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError(null); // Clear error when user starts typing
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor={COLORS.gray500}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={20} color={COLORS.gray600} />
                ) : (
                  <Eye size={20} color={COLORS.gray600} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <Link href="/(auth)/reset-password" style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
            </Link>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register">
              <Text style={styles.linkText}>Sign up</Text>
            </Link>
          </View>

          {/* Development Info Panel */}
          {__DEV__ && (
            <View style={styles.devPanel}>
              <Text style={styles.devPanelTitle}>🔧 Development Info</Text>
              <Text style={styles.devPanelText}>Email: {email}</Text>
              <Text style={styles.devPanelText}>Password: {'•'.repeat(password.length)}</Text>
              <Text style={styles.devPanelText}>Loading: {loading.toString()}</Text>
              <Text style={styles.devPanelText}>Error: {error || 'None'}</Text>
              <Text style={styles.devPanelText}>
                Supabase URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
              </Text>
              <Text style={styles.devPanelText}>
                Supabase Key: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TEXT_STYLES.h1,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...TEXT_STYLES.body1,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}15`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorIcon: {
    marginRight: SPACING.sm,
  },
  errorText: {
    flex: 1,
    ...TEXT_STYLES.body2,
    color: COLORS.error,
    lineHeight: 20,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 56,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TEXT_STYLES.body1,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: SPACING.md,
    padding: 4,
  },
  loginButton: {
    ...BUTTON_STYLES.primary,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.gray500,
  },
  loginButtonText: {
    ...TEXT_STYLES.button,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: SPACING.md,
  },
  forgotPasswordText: {
    ...TEXT_STYLES.link,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...TEXT_STYLES.body2,
    color: COLORS.gray600,
  },
  linkText: {
    ...TEXT_STYLES.link,
  },
  devPanel: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  devPanelTitle: {
    ...TEXT_STYLES.h5,
    marginBottom: SPACING.xs,
  },
  devPanelText: {
    ...TEXT_STYLES.caption,
    marginBottom: 4,
  },
});