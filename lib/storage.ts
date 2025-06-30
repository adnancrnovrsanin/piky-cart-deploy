import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ShoppingList, ListItem, UserPreferences, DEFAULT_USER_PREFERENCES } from '@/types';

const LISTS_KEY = 'shopping_lists';
const ITEMS_KEY = 'list_items';
const PREFERENCES_KEY = 'user_preferences';

// Web-compatible storage wrapper
class WebCompatibleStorage {
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

  static async getAllKeys(): Promise<string[]> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return Object.keys(localStorage);
    }
    return AsyncStorage.getAllKeys();
  }

  static async multiRemove(keys: string[]): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      keys.forEach(key => localStorage.removeItem(key));
      return;
    }
    await AsyncStorage.multiRemove(keys);
  }
}

export class OfflineStorage {
  // Shopping Lists
  static async saveLists(lists: ShoppingList[]): Promise<void> {
    try {
      await WebCompatibleStorage.setItem(LISTS_KEY, JSON.stringify(lists));
    } catch (error) {
      console.error('Error saving lists to storage:', error);
    }
  }

  static async getLists(): Promise<ShoppingList[]> {
    try {
      const data = await WebCompatibleStorage.getItem(LISTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting lists from storage:', error);
      return [];
    }
  }

  // List Items
  static async saveItems(listId: string, items: ListItem[]): Promise<void> {
    try {
      const key = `${ITEMS_KEY}_${listId}`;
      await WebCompatibleStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving items to storage:', error);
    }
  }

  static async getItems(listId: string): Promise<ListItem[]> {
    try {
      const key = `${ITEMS_KEY}_${listId}`;
      const data = await WebCompatibleStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting items from storage:', error);
      return [];
    }
  }

  // User Preferences
  static async savePreferences(preferences: UserPreferences): Promise<void> {
    try {
      await WebCompatibleStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences to storage:', error);
    }
  }

  static async getPreferences(): Promise<UserPreferences> {
    try {
      const data = await WebCompatibleStorage.getItem(PREFERENCES_KEY);
      if (data) {
        const stored = JSON.parse(data);
        // Merge with defaults to ensure all properties exist
        return {
          ...DEFAULT_USER_PREFERENCES,
          ...stored,
          notifications: {
            ...DEFAULT_USER_PREFERENCES.notifications,
            ...stored.notifications,
          },
          privacy: {
            ...DEFAULT_USER_PREFERENCES.privacy,
            ...stored.privacy,
          },
          shopping: {
            ...DEFAULT_USER_PREFERENCES.shopping,
            ...stored.shopping,
          },
        };
      }
      return DEFAULT_USER_PREFERENCES;
    } catch (error) {
      console.error('Error getting preferences from storage:', error);
      return DEFAULT_USER_PREFERENCES;
    }
  }

  // Clear storage
  static async clearAll(): Promise<void> {
    try {
      const keys = await WebCompatibleStorage.getAllKeys();
      const appKeys = keys.filter(key => 
        key.startsWith(LISTS_KEY) || 
        key.startsWith(ITEMS_KEY) || 
        key.startsWith(PREFERENCES_KEY)
      );
      await WebCompatibleStorage.multiRemove(appKeys);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Sync status
  static async setSyncStatus(synced: boolean): Promise<void> {
    try {
      await WebCompatibleStorage.setItem('last_sync', synced ? Date.now().toString() : '0');
    } catch (error) {
      console.error('Error setting sync status:', error);
    }
  }

  static async getLastSync(): Promise<number> {
    try {
      const data = await WebCompatibleStorage.getItem('last_sync');
      return data ? parseInt(data, 10) : 0;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return 0;
    }
  }
}