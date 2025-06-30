import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';

export default function AuthLayout() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { hasCompletedOnboarding, loading: onboardingLoading, forceShowOnboarding } = useOnboarding();

  if (authLoading || onboardingLoading) {
    return null; // Could show a loading screen here
  }

  if (isAuthenticated) {
    // If user is authenticated but hasn't completed onboarding OR we're forcing onboarding, show onboarding
    if (!hasCompletedOnboarding || forceShowOnboarding) {
      return <Redirect href="/onboarding" />;
    }
    // If user is authenticated and has completed onboarding, go to main app
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}