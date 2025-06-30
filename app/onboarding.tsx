import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import OnboardingFlow from '@/components/OnboardingFlow';
import { useOnboarding } from '@/contexts/OnboardingContext';

export default function OnboardingScreen() {
  const { completeOnboarding, setForceShowOnboarding } = useOnboarding();

  const handleOnboardingComplete = async () => {
    await completeOnboarding();
    setForceShowOnboarding(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingFlow onComplete={handleOnboardingComplete} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});