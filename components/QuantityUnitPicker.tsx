import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { ChevronDown, Search, X, CheckCircle } from 'lucide-react-native';
import { QuantityUnit, QUANTITY_UNITS, getQuantityUnitInfo } from '@/types';
import { COLORS, SPACING, BORDER_RADIUS, TEXT_STYLES, FONTS } from '@/constants/theme';

interface QuantityUnitPickerProps {
  selectedUnit: QuantityUnit;
  onSelectUnit: (unit: QuantityUnit) => void;
  style?: any;
}

const QuantityUnitPicker = React.memo(({ selectedUnit, onSelectUnit, style }: QuantityUnitPickerProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedUnitInfo = getQuantityUnitInfo(selectedUnit);

  // Group units by category
  const groupedUnits = QUANTITY_UNITS.reduce((groups, unit) => {
    const category = unit.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(unit);
    return groups;
  }, {} as Record<string, typeof QUANTITY_UNITS>);

  // Filter units based on search
  const filteredUnits = searchQuery.trim()
    ? QUANTITY_UNITS.filter(unit =>
        unit.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.shortLabel.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleSelectUnit = (unit: QuantityUnit) => {
    onSelectUnit(unit);
    setIsModalVisible(false);
    setSearchQuery('');
  };

  const renderUnitOption = (unit: typeof QUANTITY_UNITS[0]) => (
    <TouchableOpacity
      key={unit.value}
      style={[
        styles.unitOption,
        selectedUnit === unit.value && styles.unitOptionSelected,
      ]}
      onPress={() => handleSelectUnit(unit.value)}
    >
      <View style={styles.unitOptionContent}>
        <Text
          style={[
            styles.unitOptionLabel,
            selectedUnit === unit.value && styles.unitOptionLabelSelected,
          ]}
        >
          {unit.label}
        </Text>
        <Text
          style={[
            styles.unitOptionShort,
            selectedUnit === unit.value && styles.unitOptionShortSelected,
          ]}
        >
          {unit.shortLabel}
        </Text>
      </View>
      {selectedUnit === unit.value && (
        <CheckCircle size={16} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.picker, style]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.pickerText}>{selectedUnitInfo.shortLabel}</Text>
        <ChevronDown size={16} color={COLORS.gray600} />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <X size={24} color={COLORS.gray600} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color={COLORS.gray600} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search units..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.gray500}
              />
            </View>

            <ScrollView style={styles.unitsContainer} showsVerticalScrollIndicator={false}>
              {filteredUnits ? (
                // Show filtered results
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>Search Results</Text>
                  <View style={styles.unitsGrid}>
                    {filteredUnits.map(renderUnitOption)}
                  </View>
                </View>
              ) : (
                // Show grouped results
                Object.entries(groupedUnits).map(([category, units]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <View style={styles.unitsGrid}>
                      {units.map(renderUnitOption)}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minWidth: 80,
    justifyContent: 'space-between',
  },
  pickerText: {
    ...TEXT_STYLES.body2,
    fontFamily: FONTS.heading.medium,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    ...TEXT_STYLES.h3,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TEXT_STYLES.body1,
  },
  unitsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  categorySection: {
    marginBottom: SPACING.lg,
  },
  categoryTitle: {
    ...TEXT_STYLES.body1,
    fontFamily: FONTS.heading.semiBold,
    marginBottom: SPACING.sm,
    paddingHorizontal: 4,
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  unitOption: {
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitOptionSelected: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: COLORS.primary,
  },
  unitOptionContent: {
    flex: 1,
  },
  unitOptionLabel: {
    ...TEXT_STYLES.caption,
    color: COLORS.gray600,
  },
  unitOptionLabelSelected: {
    color: COLORS.primary,
  },
  unitOptionShort: {
    ...TEXT_STYLES.body2,
    fontFamily: FONTS.heading.semiBold,
  },
  unitOptionShortSelected: {
    color: COLORS.primary,
  },
});

export default QuantityUnitPicker;