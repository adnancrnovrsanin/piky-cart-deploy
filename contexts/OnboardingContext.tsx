import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>; // For development testing
  loading: boolean;
  forceShowOnboarding: boolean;
  setForceShowOnboarding: (show: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_KEY = 'has_completed_onboarding';

// Web-compatible storage wrapper
class OnboardingStorage {
  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  }

  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  }

  static async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  }
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await OnboardingStorage.getItem(ONBOARDING_KEY);
      setHasCompletedOnboarding(completed === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setHasCompletedOnboarding(false);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await OnboardingStorage.setItem(ONBOARDING_KEY, 'true');
      setHasCompletedOnboarding(true);
      setForceShowOnboarding(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const resetOnboarding = async () => {
    try {
      await OnboardingStorage.removeItem(ONBOARDING_KEY);
      setHasCompletedOnboarding(false);
      setForceShowOnboarding(true);
      console.log('Onboarding reset successfully');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  const value: OnboardingContextType = {
    hasCompletedOnboarding,
    completeOnboarding,
    resetOnboarding,
    loading,
    forceShowOnboarding,
    setForceShowOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}