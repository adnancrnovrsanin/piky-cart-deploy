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
} from 'react-native';
import { router } from 'expo-router';
import { useShopping } from '@/contexts/ShoppingContext';
import { ShoppingCart, FileText, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import EasyInputModal from '@/components/EasyInputModal';
import { COLORS, SPACING, BORDER_RADIUS, TEXT_STYLES, BUTTON_STYLES, SHADOWS } from '@/constants/theme';

export default function AddListScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showEasyInputModal, setShowEasyInputModal] = useState(false);
  const { createList, addItem } = useShopping();

  const handleCreateList = async () => {
    if (!name.trim()) {
      setError('What would you like to call your list?');
      return;
    }

    setLoading(true);
    setError(null);
    const newList = await createList({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setLoading(false);

    if (newList) {
      setSuccess(true);
      setTimeout(() => {
        setName('');
        setDescription('');
        setSuccess(false);
        router.push('/(tabs)');
      }, 1500);
    } else {
      setError('Something went wrong. Could you try creating your list again?');
    }
  };

  const handleEasyInputComplete = async (items: Array<{ name: string; quantity: number; category: string; brand?: string; quantity_unit?: string }>) => {
    // First create the list
    const listName = name.trim() || 'Smart Shopping List';
    const newList = await createList({
      name: listName,
      description: description.trim() || 'Created with AI assistance',
    });

    if (newList) {
      // Add all items from AI parsing
      for (const item of items) {
        await addItem({
          list_id: newList.id,
          name: item.name,
          quantity: item.quantity,
          category: item.category as any,
          quantity_unit: item.quantity_unit as any,
          brand: item.brand,
        });
      }
      
      setShowEasyInputModal(false);
      setSuccess(true);
      setTimeout(() => {
        setName('');
        setDescription('');
        setSuccess(false);
        router.push({
          pathname: '/list-details',
          params: { listId: newList.id, listName: newList.name }
        });
      }, 1500);
    } else {
      setError('Something went wrong. Could you try creating your list again?');
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeInUp} style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <ShoppingCart size={48} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Your List is Ready!</Text>
          <Text style={styles.successText}>Perfect! Your shopping list has been created and is ready to use.</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={COLORS.gray600} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New List</Text>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => setShowEasyInputModal(true)}
          >
            <Sparkles size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp} style={styles.content}>
            <View style={styles.iconContainer}>
              <ShoppingCart size={48} color={COLORS.primary} />
            </View>

            <Text style={styles.title}>Start Your Shopping List</Text>
            <Text style={styles.subtitle}>
              Name your list and add a description, or let our AI help you build it instantly from text or photos
            </Text>

            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle size={20} color={COLORS.error} style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={styles.smartCreateButton}
                onPress={() => setShowEasyInputModal(true)}
              >
                <Sparkles size={24} color={COLORS.white} />
                <View style={styles.smartCreateContent}>
                  <Text style={styles.smartCreateTitle}>AI-Powered Creation</Text>
                  <Text style={styles.smartCreateSubtitle}>
                    Let AI build your list from text, photos, or recipes
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or build it yourself</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>What's this list for? *</Text>
                <View style={styles.inputContainer}>
                  <FileText size={20} color={COLORS.gray600} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Weekly Groceries"
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor={COLORS.gray500}
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Add any notes (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Add any notes about this shopping list..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor={COLORS.gray500}
                />
              </View>

              <TouchableOpacity
                style={[styles.createButton, loading && styles.createButtonDisabled]}
                onPress={handleCreateList}
                disabled={loading}
              >
                <Text style={styles.createButtonText}>
                  {loading ? 'Creating List...' : 'Create List'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <EasyInputModal
        visible={showEasyInputModal}
        onClose={() => setShowEasyInputModal(false)}
        onComplete={handleEasyInputComplete}
        isCreatingList={true}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    ...TEXT_STYLES.h3,
  },
  aiButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    alignItems: 'center',
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
    ...TEXT_STYLES.h2,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TEXT_STYLES.body1,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: `${COLORS.success}15`,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  successTitle: {
    ...TEXT_STYLES.h2,
    marginBottom: SPACING.xs,
  },
  successText: {
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
    width: '100%',
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
  quickActionsContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  smartCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  smartCreateContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  smartCreateTitle: {
    ...TEXT_STYLES.h4,
    color: COLORS.white,
    marginBottom: 4,
  },
  smartCreateSubtitle: {
    ...TEXT_STYLES.body2,
    color: '#E0E7FF',
    lineHeight: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray300,
  },
  dividerText: {
    ...TEXT_STYLES.body2,
    color: COLORS.gray600,
    marginHorizontal: SPACING.md,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TEXT_STYLES.body2,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  textArea: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...TEXT_STYLES.body1,
    minHeight: 96,
  },
  createButton: {
    ...BUTTON_STYLES.primary,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.gray500,
  },
  createButtonText: {
    ...TEXT_STYLES.button,
  },
});