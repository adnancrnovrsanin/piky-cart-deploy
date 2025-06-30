import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS, SPACING, BORDER_RADIUS, TEXT_STYLES, BUTTON_STYLES, FONTS } from '@/constants/theme';
import { ITEM_CATEGORIES, ItemCategory, QuantityUnit, suggestQuantityUnit } from '@/types';
import QuantityUnitPicker from './QuantityUnitPicker';
import PriceInputComponent from './PriceInputComponent';

// Props for the CategoryPicker
interface CategoryPickerProps {
  selectedCategory: ItemCategory;
  onSelectCategory: (category: ItemCategory) => void;
}

// Props for the main AddItemModal
interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAddItem: () => void;
  newItemName: string;
  setNewItemName: (name: string) => void;
  newItemQuantity: string;
  setNewItemQuantity: (qty: string) => void;
  newItemQuantityUnit: QuantityUnit;
  setNewItemQuantityUnit: (unit: QuantityUnit) => void;
  newItemCategory: ItemCategory;
  setNewItemCategory: (category: ItemCategory) => void;
  newItemNotes: string;
  setNewItemNotes: (notes: string) => void;
  newItemStore: string;
  setNewItemStore: (store: string) => void;
  newItemBrand: string;
  setNewItemBrand: (brand: string) => void;
  newItemPrice: string;
  setNewItemPrice: (price: string) => void;
  newItemPricePerUnit: boolean;
  setNewItemPricePerUnit: (pricePerUnit: boolean) => void;
  loading: boolean;
  error: string | null;
}

interface Styles {
  modalOverlay: ViewStyle;
  modalContainer: ViewStyle;
  modalHeader: ViewStyle;
  modalCloseButton: ViewStyle;
  modalTitle: TextStyle;
  modalSaveButton: ViewStyle;
  modalSaveButtonDisabled: ViewStyle;
  modalSaveButtonText: TextStyle;
  modalContent: ViewStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  modalInputGroup: ViewStyle;
  modalRow: ViewStyle;
  modalLabel: TextStyle;
  modalInput: TextStyle;
  modalTextArea: TextStyle;
  quantityRow: ViewStyle;
  quantityInput: ViewStyle;
  categoryPicker: ViewStyle;
  categoryGrid: ViewStyle;
  categoryOption: ViewStyle;
  categoryOptionSelected: ViewStyle;
  categoryEmoji: TextStyle;
  categoryLabel: TextStyle;
  categoryLabelSelected: TextStyle;
}

// Memoized CategoryPicker component
const CategoryPicker = React.memo(
  ({ selectedCategory, onSelectCategory }: CategoryPickerProps) => (
    <View style={styles.categoryPicker}>
      <Text style={styles.modalLabel}>Category</Text>
      <View style={styles.categoryGrid}>
        {ITEM_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.value}
            style={[
              styles.categoryOption,
              selectedCategory === category.value &&
                styles.categoryOptionSelected,
            ]}
            onPress={() => onSelectCategory(category.value)}
          >
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === category.value &&
                  styles.categoryLabelSelected,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
);

// Main AddItemModal component
const AddItemModal = React.memo(
  ({
    visible,
    onClose,
    onAddItem,
    newItemName,
    setNewItemName,
    newItemQuantity,
    setNewItemQuantity,
    newItemQuantityUnit,
    setNewItemQuantityUnit,
    newItemCategory,
    setNewItemCategory,
    newItemNotes,
    setNewItemNotes,
    newItemStore,
    setNewItemStore,
    newItemBrand,
    setNewItemBrand,
    newItemPrice,
    setNewItemPrice,
    newItemPricePerUnit,
    setNewItemPricePerUnit,
    loading,
    error,
  }: AddItemModalProps) => {
    
    // Auto-suggest quantity unit when item name changes
    const handleItemNameChange = (name: string) => {
      setNewItemName(name);
      
      // Only auto-suggest if current unit is 'units' (default)
      if (newItemQuantityUnit === 'units' && name.trim()) {
        const suggestedUnit = suggestQuantityUnit(name, newItemCategory);
        if (suggestedUnit !== 'units') {
          setNewItemQuantityUnit(suggestedUnit);
        }
      }
    };

    // Auto-suggest quantity unit when category changes
    const handleCategoryChange = (category: ItemCategory) => {
      setNewItemCategory(category);
      
      // Only auto-suggest if current unit is 'units' and we have an item name
      if (newItemQuantityUnit === 'units' && newItemName.trim()) {
        const suggestedUnit = suggestQuantityUnit(newItemName, category);
        if (suggestedUnit !== 'units') {
          setNewItemQuantityUnit(suggestedUnit);
        }
      }
    };

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback
          onPress={Platform.OS === 'web' ? undefined : () => Keyboard.dismiss()}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={onClose}
                >
                  <X size={24} color={COLORS.gray600} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add Item</Text>
                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    loading && styles.modalSaveButtonDisabled,
                  ]}
                  onPress={onAddItem}
                  disabled={loading}
                >
                  <Text style={styles.modalSaveButtonText}>
                    {loading ? 'Adding...' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Item Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g., Milk, Bread, Apples"
                    value={newItemName}
                    onChangeText={handleItemNameChange}
                    placeholderTextColor={COLORS.gray500}
                    autoFocus
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Quantity & Unit</Text>
                  <View style={styles.quantityRow}>
                    <TextInput
                      style={styles.quantityInput}
                      placeholder="1"
                      value={newItemQuantity}
                      onChangeText={setNewItemQuantity}
                      keyboardType="decimal-pad"
                      placeholderTextColor={COLORS.gray500}
                    />
                    <QuantityUnitPicker
                      selectedUnit={newItemQuantityUnit}
                      onSelectUnit={setNewItemQuantityUnit}
                    />
                  </View>
                </View>

                <CategoryPicker
                  selectedCategory={newItemCategory}
                  onSelectCategory={handleCategoryChange}
                />

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Price (Optional)</Text>
                  <PriceInputComponent
                    price={newItemPrice}
                    onPriceChange={setNewItemPrice}
                    pricePerUnit={newItemPricePerUnit}
                    onPricePerUnitChange={setNewItemPricePerUnit}
                    quantity={newItemQuantity}
                    quantityUnit={newItemQuantityUnit}
                    category={newItemCategory}
                    itemName={newItemName}
                  />
                </View>

                <View style={styles.modalRow}>
                  <View
                    style={[
                      styles.modalInputGroup,
                      { flex: 1, marginRight: 8 },
                    ]}
                  >
                    <Text style={styles.modalLabel}>Store (Optional)</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g., Target, Walmart"
                      value={newItemStore}
                      onChangeText={setNewItemStore}
                      placeholderTextColor={COLORS.gray500}
                    />
                  </View>
                  
                  <View
                    style={[
                      styles.modalInputGroup,
                      { flex: 1, marginLeft: 8 },
                    ]}
                  >
                    <Text style={styles.modalLabel}>Brand (Optional)</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g., Coca-Cola, Nike"
                      value={newItemBrand}
                      onChangeText={setNewItemBrand}
                      placeholderTextColor={COLORS.gray500}
                    />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.modalTextArea}
                    placeholder="Add any notes about this item..."
                    value={newItemNotes}
                    onChangeText={setNewItemNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholderTextColor={COLORS.gray500}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }
);

const styles = StyleSheet.create<Styles>({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.backgroundAlt,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Platform.OS === 'web' ? ('80vh' as any) : '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalCloseButton: {
    padding: SPACING.sm,
  },
  modalTitle: {
    ...TEXT_STYLES.h3,
  },
  modalSaveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  modalSaveButtonDisabled: {
    backgroundColor: COLORS.gray500,
  },
  modalSaveButtonText: {
    ...TEXT_STYLES.button,
  },
  modalContent: {
    padding: SPACING.md,
    ...(Platform.OS === 'web'
      ? {
          maxHeight: '70vh' as any,
          overflow: 'scroll',
        }
      : {}),
  },
  errorContainer: {
    backgroundColor: `${COLORS.error}15`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    ...TEXT_STYLES.body2,
    color: COLORS.error,
    textAlign: 'center',
  },
  modalInputGroup: {
    marginBottom: SPACING.md,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLabel: {
    ...TEXT_STYLES.body2,
    fontFamily: FONTS.heading.medium,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalInput: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TEXT_STYLES.body1,
  },
  modalTextArea: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TEXT_STYLES.body1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quantityInput: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TEXT_STYLES.body1,
    flex: 1,
  },
  categoryPicker: {
    marginBottom: SPACING.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: SPACING.xs,
  },
  categoryOptionSelected: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    ...TEXT_STYLES.caption,
    color: COLORS.gray600,
  },
  categoryLabelSelected: {
    color: COLORS.primary,
    fontFamily: FONTS.heading.semiBold,
  },
});

export default AddItemModal;