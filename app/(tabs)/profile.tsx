import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useShopping } from '@/contexts/ShoppingContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { router } from 'expo-router';
import { User, Settings, Bell, Shield, LogOut, Moon, Globe, CircleHelp as HelpCircle, Mail, Star, RotateCcw, DollarSign } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import CurrencySelector from '@/components/CurrencySelector';
import { formatCurrency, CurrencyCode } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, TEXT_STYLES, BUTTON_STYLES, SHADOWS, FONTS } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();
  const { lists, archivedLists } = useShopping();
  const { resetOnboarding } = useOnboarding();
  const { preferences, updatePreferences } = useUserPreferences();
  const [signingOut, setSigningOut] = useState(false);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);

  const totalLists = lists.length + archivedLists.length;
  const totalItems = lists.reduce((total, list) => total + (list.item_count || 0), 0);
  const completedLists = archivedLists.length;

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out of PikyCart?',
      'You can always sign back in anytime to access your lists.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Sign Out',
          style: 'destructive', 
          onPress: async () => {
            try {
              setSigningOut(true);
              console.log('Starting sign out process...');
              await signOut();
              console.log('Sign out completed successfully');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert(
                'Oops!',
                'We couldn\'t sign you out right now. Please give it another try.',
                [{ text: 'Got it' }]
              );
            } finally {
              setSigningOut(false);
            }
          }
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Show App Tour Again?',
      'This will take you through the PikyCart welcome tour again to help you get familiar with features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Show Tour',
          onPress: async () => {
            try {
              setResettingOnboarding(true);
              console.log('Resetting onboarding...');
              await resetOnboarding();
              console.log('Onboarding reset, navigating to onboarding screen...');
              router.replace('/onboarding');
            } catch (error) {
              console.error('Error resetting onboarding:', error);
              Alert.alert(
                'Oops!',
                'We couldn\'t restart the tour right now. Please try again.',
                [{ text: 'Got it' }]
              );
            } finally {
              setResettingOnboarding(false);
            }
          }
        },
      ]
    );
  };

  const handleCurrencyChange = async (currency: CurrencyCode) => {
    try {
      const success = await updatePreferences({ currency });
      if (success) {
        Alert.alert(
          'Currency Updated!',
          `Perfect! Your default currency is now ${currency}. All prices will be shown in ${currency} going forward.`,
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert(
          'Couldn\'t Update Currency',
          'Something went wrong while changing your currency. Please give it another try.',
          [{ text: 'Got it' }]
        );
      }
    } catch (error) {
      console.error('Error handling currency change:', error);
      Alert.alert(
        'Couldn\'t Update Currency',
        'Something went wrong while changing your currency. Please give it another try.',
        [{ text: 'Got it' }]
      );
    }
  };

  const handleNotificationToggle = async (key: keyof typeof preferences.notifications, value: boolean) => {
    await updatePreferences({
      notifications: {
        ...preferences.notifications,
        [key]: value,
      },
    });
  };

  const handlePrivacyToggle = async (key: keyof typeof preferences.privacy, value: boolean) => {
    await updatePreferences({
      privacy: {
        ...preferences.privacy,
        [key]: value,
      },
    });
  };

  const handleSupport = () => {
    Alert.alert(
      'We\'re Here to Help!',
      'Have questions or need assistance? Reach out to our friendly support team at support@pikycart.com or browse our help center.',
      [
        { text: 'Email Support', onPress: () => {} },
        { text: 'Help Center', onPress: () => {} },
        { text: 'Maybe Later', style: 'cancel' },
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Loving PikyCart?',
      'If you\'re enjoying the app, we\'d be thrilled if you could leave us a review on the App Store. It really helps!',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Happy to Rate!', onPress: () => {} },
      ]
    );
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement,
    danger = false,
    disabled = false,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        disabled && styles.settingItemDisabled,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress || disabled}
    >
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Icon size={20} color={danger ? COLORS.error : COLORS.gray600} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      {rightElement}
    </TouchableOpacity>
  );

  const StatsCard = ({ value, label, color = COLORS.primary }: { value: string | number; label: string; color?: string }) => (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <Animated.View entering={FadeInUp} style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={32} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.userName}>
            {user?.display_name || user?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </Animated.View>

        {/* Quick Stats */}
        <Animated.View entering={FadeInUp.delay(100)} style={styles.statsContainer}>
          <StatsCard value={totalLists} label="Your Lists" color={COLORS.primary} />
          <StatsCard value={totalItems} label="Items to Get" color={COLORS.success} />
          <StatsCard value={completedLists} label="Lists Finished" color={COLORS.accent} />
        </Animated.View>

        {/* Currency & Regional Settings */}
        <Animated.View entering={FadeInUp.delay(150)} style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Currency & Language</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={DollarSign}
              title="Your Currency"
              subtitle={`Currently set to ${preferences.currency} • Example: ${formatCurrency(99.99, preferences.currency)}`}
              rightElement={
                <CurrencySelector
                  selectedCurrency={preferences.currency}
                  onSelectCurrency={handleCurrencyChange}
                />
              }
            />
            <SettingItem
              icon={Globe}
              title="App Language"
              subtitle="English (US)"
              onPress={() => Alert.alert('Coming Soon', 'More language options are coming in a future update!')}
            />
          </View>
        </Animated.View>

        {/* Notification Preferences */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Notifications & Alerts</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={Bell}
              title="Allow Notifications"
              subtitle="Turn all notifications on or off"
              rightElement={
                <Switch
                  value={preferences.notifications.enabled}
                  onValueChange={(value) => handleNotificationToggle('enabled', value)}
                  trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <SettingItem
              icon={Bell}
              title="Shopping Reminders"
              subtitle="Get gentle reminders about your lists"
              rightElement={
                <Switch
                  value={preferences.notifications.shoppingReminders}
                  onValueChange={(value) => handleNotificationToggle('shoppingReminders', value)}
                  trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                  disabled={!preferences.notifications.enabled}
                />
              }
            />
            <SettingItem
              icon={DollarSign}
              title="Price Drop Alerts"
              subtitle="Get notified when items go on sale"
              rightElement={
                <Switch
                  value={preferences.notifications.priceAlerts}
                  onValueChange={(value) => handleNotificationToggle('priceAlerts', value)}
                  trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                  disabled={!preferences.notifications.enabled}
                />
              }
            />
            <SettingItem
              icon={Star}
              title="Weekly Summary"
              subtitle="See how you did with your shopping goals"
              rightElement={
                <Switch
                  value={preferences.notifications.weeklyReports}
                  onValueChange={(value) => handleNotificationToggle('weeklyReports', value)}
                  trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                  disabled={!preferences.notifications.enabled}
                />
              }
            />
          </View>
        </Animated.View>

        {/* Privacy & Security */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={Shield}
              title="Help Improve PikyCart"
              subtitle="Share anonymous usage data to help us make the app better"
              rightElement={
                <Switch
                  value={preferences.privacy.shareAnalytics}
                  onValueChange={(value) => handlePrivacyToggle('shareAnalytics', value)}
                  trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <SettingItem
              icon={Globe}
              title="Location Services"
              subtitle="Help us suggest nearby stores and deals"
              rightElement={
                <Switch
                  value={preferences.privacy.locationTracking}
                  onValueChange={(value) => handlePrivacyToggle('locationTracking', value)}
                  trackColor={{ false: COLORS.gray300, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <SettingItem
              icon={Shield}
              title="Privacy Policy"
              subtitle="Learn how we protect your information"
              onPress={() => Alert.alert('Privacy Policy', 'Our full privacy policy will be available soon.')}
            />
            <SettingItem
              icon={Settings}
              title="Account Management"
              subtitle="Update your account details and preferences"
              onPress={() => Alert.alert('Coming Soon', 'Advanced account settings are coming in a future update!')}
            />
          </View>
        </Animated.View>

        {/* Support */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={HelpCircle}
              title="Help Center"
              subtitle="Find answers and helpful tutorials"
              onPress={handleSupport}
            />
            <SettingItem
              icon={Mail}
              title="Contact Us"
              subtitle="Get personalized help from our support team"
              onPress={handleSupport}
            />
            <SettingItem
              icon={Star}
              title="Rate the App"
              subtitle="Tell others about your PikyCart experience"
              onPress={handleRateApp}
            />
          </View>
        </Animated.View>

        {/* Development Section - Only show in development */}
        {__DEV__ && (
          <Animated.View entering={FadeInUp.delay(500)} style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Developer Options</Text>
            <View style={styles.settingsCard}>
              <SettingItem
                icon={RotateCcw}
                title={resettingOnboarding ? "Resetting..." : "Show App Tour Again"}
                subtitle="Replay the welcome tutorial (for testing)"
                onPress={handleResetOnboarding}
                disabled={resettingOnboarding}
              />
            </View>
          </Animated.View>
        )}

        {/* Sign Out */}
        <Animated.View entering={FadeInUp.delay(600)} style={styles.settingsSection}>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={LogOut}
              title={signingOut ? "Signing You Out..." : "Sign Out"}
              onPress={handleSignOut}
              danger
              disabled={signingOut || loading}
            />
          </View>
        </Animated.View>

        {/* App Version */}
        <Animated.View entering={FadeInUp.delay(700)} style={styles.footer}>
          <Text style={styles.versionText}>PikyCart v1.0.0</Text>
          <Text style={styles.footerText}>Built with ❤️ to make shopping smarter</Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    ...TEXT_STYLES.h2,
    marginBottom: 4,
  },
  userEmail: {
    ...TEXT_STYLES.body1,
    color: COLORS.gray600,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statValue: {
    ...TEXT_STYLES.h2,
    marginBottom: 4,
  },
  statLabel: {
    ...TEXT_STYLES.caption,
    color: COLORS.gray600,
  },
  settingsSection: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TEXT_STYLES.h4,
    marginBottom: SPACING.sm,
    marginLeft: 4,
  },
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.gray200,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  settingIconDanger: {
    backgroundColor: `${COLORS.error}15`,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...TEXT_STYLES.body1,
    fontFamily: FONTS.heading.medium,
  },
  settingTitleDanger: {
    color: COLORS.error,
  },
  settingSubtitle: {
    ...TEXT_STYLES.body2,
    color: COLORS.gray600,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  versionText: {
    ...TEXT_STYLES.body2,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  footerText: {
    ...TEXT_STYLES.caption,
    color: COLORS.gray500,
  },
});