import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { UserPreferences, DEFAULT_USER_PREFERENCES, CurrencyCode } from '@/types';
import { OfflineStorage } from '@/lib/storage';

interface UserPreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;
  updateCurrency: (currency: CurrencyCode) => Promise<boolean>;
  resetPreferences: () => Promise<boolean>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  // Load preferences when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadPreferences();
    } else {
      // Load from local storage for non-authenticated users
      loadLocalPreferences();
    }
  }, [isAuthenticated, user]);

  const loadPreferences = async () => {
    setLoading(true);
    
    try {
      // Try to load from Supabase first
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('preferences')
        .eq('user_id', user!.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

      if (error) {
        throw error;
      }

      if (profile?.preferences) {
        // Merge with defaults to ensure all properties exist
        const mergedPreferences = {
          ...DEFAULT_USER_PREFERENCES,
          ...profile.preferences,
          notifications: {
            ...DEFAULT_USER_PREFERENCES.notifications,
            ...profile.preferences.notifications,
          },
          privacy: {
            ...DEFAULT_USER_PREFERENCES.privacy,
            ...profile.preferences.privacy,
          },
          shopping: {
            ...DEFAULT_USER_PREFERENCES.shopping,
            ...profile.preferences.shopping,
          },
        };
        
        setPreferences(mergedPreferences);
        await OfflineStorage.savePreferences(mergedPreferences);
      } else {
        // No preferences found, create default profile
        await createDefaultProfile();
      }
    } catch (error) {
      console.warn('Failed to load preferences from Supabase, using offline data:', error);
      const offlinePreferences = await OfflineStorage.getPreferences();
      setPreferences(offlinePreferences);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalPreferences = async () => {
    setLoading(true);
    
    try {
      const localPreferences = await OfflineStorage.getPreferences();
      setPreferences(localPreferences);
    } catch (error) {
      console.error('Error loading local preferences:', error);
      setPreferences(DEFAULT_USER_PREFERENCES);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user!.id,
          preferences: DEFAULT_USER_PREFERENCES,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences(DEFAULT_USER_PREFERENCES);
      await OfflineStorage.savePreferences(DEFAULT_USER_PREFERENCES);
    } catch (error) {
      console.error('Error creating default profile:', error);
      setPreferences(DEFAULT_USER_PREFERENCES);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>): Promise<boolean> => {
    try {
      const newPreferences = {
        ...preferences,
        ...updates,
        // Deep merge nested objects
        notifications: {
          ...preferences.notifications,
          ...updates.notifications,
        },
        privacy: {
          ...preferences.privacy,
          ...updates.privacy,
        },
        shopping: {
          ...preferences.shopping,
          ...updates.shopping,
        },
      };

      // Update local state immediately
      setPreferences(newPreferences);
      
      // Save to offline storage
      await OfflineStorage.savePreferences(newPreferences);

      // Update in Supabase if authenticated
      if (isAuthenticated && user) {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            preferences: newPreferences,
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error updating preferences in Supabase:', error);
          // Don't revert local changes, keep them for offline use
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  };

  const updateCurrency = async (newCurrency: CurrencyCode): Promise<boolean> => {
    // Simply update the currency preference - no database conversion needed
    return updatePreferences({ currency: newCurrency });
  };

  const resetPreferences = async (): Promise<boolean> => {
    try {
      setPreferences(DEFAULT_USER_PREFERENCES);
      await OfflineStorage.savePreferences(DEFAULT_USER_PREFERENCES);

      if (isAuthenticated && user) {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            preferences: DEFAULT_USER_PREFERENCES,
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error resetting preferences in Supabase:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error resetting preferences:', error);
      return false;
    }
  };

  const value: UserPreferencesContextType = {
    preferences,
    loading,
    updatePreferences,
    updateCurrency,
    resetPreferences,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}