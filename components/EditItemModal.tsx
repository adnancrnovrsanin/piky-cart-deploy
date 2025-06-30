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
import { ITEM_CATEGORIES, ItemCategory, ListItem, QuantityUnit, suggestQuantityUnit } from '@/types';
import QuantityUnitPicker from './QuantityUnitPicker';
import PriceInputComponent from './PriceInputComponent';

// Props for the CategoryPicker
interface CategoryPickerProps {
  selectedCategory: ItemCategory;
  onSelectCategory: (category: ItemCategory) => void;
}

// Props for the main EditItemModal
interface EditItemModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdateItem: () => void;
  item: ListItem | null;
  itemName: string;
  setItemName: (name: string) => void;
  itemQuantity: string;
  setItemQuantity: (qty: string) => void;
  itemQuantityUnit: QuantityUnit;
  setItemQuantityUnit: (unit: QuantityUnit) => void;
  itemCategory: ItemCategory;
  setItemCategory: (category: ItemCategory) => void;
  itemNotes: string;
  setItemNotes: (notes: string) => void;
  itemStore: string;
  setItemStore: (store: string) => void;
  itemBrand: string;
  setItemBrand: (brand: string) => void;
  itemPrice: string;
  setItemPrice: (price: string) => void;
  itemPricePerUnit: boolean;
  setItemPricePerUnit: (pricePerUnit: boolean) => void;
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

// Main EditItemModal component
const EditItemModal = React.memo(
  ({
    visible,
    onClose,
    onUpdateItem,
    item,
    itemName,
    setItemName,
    itemQuantity,
    setItemQuantity,
    itemQuantityUnit,
    setItemQuantityUnit,
    itemCategory,
    setItemCategory,
    itemNotes,
    setItemNotes,
    itemStore,
    setItemStore,
    itemBrand,
    setItemBrand,
    itemPrice,
    setItemPrice,
    itemPricePerUnit,
    setItemPricePerUnit,
    loading,
    error,
  }: EditItemModalProps) => {
    
    // Auto-suggest quantity unit when item name changes (only if current unit is default)
    const handleItemNameChange = (name: string) => {
      setItemName(name);
      
      // Only auto-suggest if current unit is 'units' (default) and we have a name
      if (itemQuantityUnit === 'units' && name.trim()) {
        const suggestedUnit = suggestQuantityUnit(name, itemCategory);
        if (suggestedUnit !== 'units') {
          setItemQuantityUnit(suggestedUnit);
        }
      }
    };

    // Auto-suggest quantity unit when category changes (only if current unit is default)
    const handleCategoryChange = (category: ItemCategory) => {
      setItemCategory(category);
      
      // Only auto-suggest if current unit is 'units' and we have an item name
      if (itemQuantityUnit === 'units' && itemName.trim()) {
        const suggestedUnit = suggestQuantityUnit(itemName, category);
        if (suggestedUnit !== 'units') {
          setItemQuantityUnit(suggestedUnit);
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
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Edit Item</Text>
                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    loading && styles.modalSaveButtonDisabled,
                  ]}
                  onPress={onUpdateItem}
                  disabled={loading}
                >
                  <Text style={styles.modalSaveButtonText}>
                    {loading ? 'Saving...' : 'Save'}
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
                    value={itemName}
                    onChangeText={handleItemNameChange}
                    placeholderTextColor="#9CA3AF"
                    autoFocus
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Quantity & Unit</Text>
                  <View style={styles.quantityRow}>
                    <TextInput
                      style={styles.quantityInput}
                      placeholder="1"
                      value={itemQuantity}
                      onChangeText={setItemQuantity}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#9CA3AF"
                    />
                    <QuantityUnitPicker
                      selectedUnit={itemQuantityUnit}
                      onSelectUnit={setItemQuantityUnit}
                    />
                  </View>
                </View>

                <CategoryPicker
                  selectedCategory={itemCategory}
                  onSelectCategory={handleCategoryChange}
                />

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Price (Optional)</Text>
                  <PriceInputComponent
                    price={itemPrice}
                    onPriceChange={setItemPrice}
                    pricePerUnit={itemPricePerUnit}
                    onPricePerUnitChange={setItemPricePerUnit}
                    quantity={itemQuantity}
                    quantityUnit={itemQuantityUnit}
                    category={itemCategory}
                    itemName={itemName}
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
                      value={itemStore}
                      onChangeText={setItemStore}
                      placeholderTextColor="#9CA3AF"
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
                      value={itemBrand}
                      onChangeText={setItemBrand}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.modalTextArea}
                    placeholder="Add any notes about this item..."
                    value={itemNotes}
                    onChangeText={setItemNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholderTextColor="#9CA3AF"
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Platform.OS === 'web' ? ('80vh' as any) : '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalSaveButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  modalContent: {
    padding: 16,
    ...(Platform.OS === 'web'
      ? {
          maxHeight: '70vh' as any,
          overflow: 'scroll',
        }
      : {}),
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    textAlign: 'center',
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  modalTextArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    flex: 1,
  },
  categoryPicker: {
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  categoryOptionSelected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  categoryLabelSelected: {
    color: '#3B82F6',
  },
});

export default EditItemModal;