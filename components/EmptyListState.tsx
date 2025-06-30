import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Sparkles } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, TEXT_STYLES, BUTTON_STYLES, SHADOWS } from '@/constants/theme';

interface EmptyListStateProps {
  onAddItem: () => void;
  onEasyInput?: () => void;
}

const EmptyListState = React.memo(({ onAddItem, onEasyInput }: EmptyListStateProps) => (
  <Animated.View entering={FadeInUp} style={styles.emptyState}>
    {/* REPLACE WITH FINAL ILLUSTRATION ASSETS */}
    <View style={styles.illustrationContainer}>
      <LinearGradient
        colors={[COLORS.primary, '#12B886']}
        style={styles.mainCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={[COLORS.secondary, '#364FC7']}
        style={styles.secondaryCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.accentSquare} />
    </View>
    <Text style={styles.emptyTitle}>No Items Yet</Text>
    <Text style={styles.emptyDescription}>
      Add your first item to get started with this shopping list
    </Text>
    
    <View style={styles.buttonContainer}>
      {onEasyInput && (
        <TouchableOpacity
          style={styles.aiButton}
          onPress={onEasyInput}
        >
          <Sparkles size={20} color={COLORS.white} />
          <Text style={styles.aiButtonText}>Smart Add</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={[styles.addFirstItemButton, onEasyInput && styles.addFirstItemButtonSecondary]}
        onPress={onAddItem}
      >
        <Plus size={20} color={COLORS.white} />
        <Text style={styles.addFirstItemButtonText}>Add Manually</Text>
      </TouchableOpacity>
    </View>
    
    {onEasyInput && (
      <Text style={styles.smartAddHint}>
        Try "Smart Add" to add items with AI or scan receipts!
      </Text>
    )}
  </Animated.View>
));

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  illustrationContainer: {
    width: 120,
    height: 120,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  mainCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'absolute',
    top: 20,
    left: 20,
  },
  secondaryCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.8,
  },
  accentSquare: {
    width: 30,
    height: 30,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.xs,
    position: 'absolute',
    bottom: 15,
    left: 15,
    opacity: 0.9,
  },
  emptyTitle: {
    ...TEXT_STYLES.h2,
    marginBottom: SPACING.xs,
  },
  emptyDescription: {
    ...TEXT_STYLES.body1,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  aiButtonText: {
    ...TEXT_STYLES.button,
    marginLeft: SPACING.sm,
  },
  addFirstItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  addFirstItemButtonSecondary: {
    backgroundColor: COLORS.gray600,
  },
  addFirstItemButtonText: {
    ...TEXT_STYLES.button,
    marginLeft: SPACING.sm,
  },
  smartAddHint: {
    ...TEXT_STYLES.body2,
    color: COLORS.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});

export default EmptyListState;