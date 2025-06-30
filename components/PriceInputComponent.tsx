import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { DollarSign, ToggleLeft, ToggleRight } from 'lucide-react-native';
import { QuantityUnit, getQuantityUnitInfo, suggestPricePerUnit, ItemCategory, formatCurrency, parseCurrencyInput } from '@/types';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';

interface PriceInputComponentProps {
  price: string;
  onPriceChange: (price: string) => void;
  pricePerUnit: boolean;
  onPricePerUnitChange: (pricePerUnit: boolean) => void;
  quantity: string;
  quantityUnit: QuantityUnit;
  category: ItemCategory;
  itemName?: string;
}

const PriceInputComponent = React.memo(({
  price,
  onPriceChange,
  pricePerUnit,
  onPricePerUnitChange,
  quantity,
  quantityUnit,
  category,
  itemName = '',
}: PriceInputComponentProps) => {
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const { preferences } = useUserPreferences();
  
  const unitInfo = getQuantityUnitInfo(quantityUnit);
  const numericPrice = parseCurrencyInput(price, preferences.currency);
  const numericQuantity = parseFloat(quantity) || 1;

  // Auto-suggest price per unit when quantity unit or category changes
  useEffect(() => {
    // Only auto-suggest if price is empty (new item) and auto-suggest is enabled
    if (!price.trim() && preferences.shopping.autoSuggestPricing) {
      const suggested = suggestPricePerUnit(category, quantityUnit);
      if (suggested !== pricePerUnit) {
        onPricePerUnitChange(suggested);
      }
    }
  }, [category, quantityUnit, price, pricePerUnit, onPricePerUnitChange, preferences.shopping.autoSuggestPricing]);

  // Calculate price breakdown
  const calculatePrices = () => {
    if (pricePerUnit) {
      const totalPrice = numericPrice * numericQuantity;
      return {
        unitPrice: numericPrice,
        totalPrice: totalPrice,
        unitLabel: `per ${unitInfo.shortLabel}`,
        totalLabel: 'total',
      };
    } else {
      const unitPrice = numericQuantity > 0 ? numericPrice / numericQuantity : numericPrice;
      return {
        unitPrice: unitPrice,
        totalPrice: numericPrice,
        unitLabel: `per ${unitInfo.shortLabel}`,
        totalLabel: 'total',
      };
    }
  };

  const priceBreakdown = calculatePrices();
  const shouldShowBreakdown = numericPrice > 0 && numericQuantity > 1 && preferences.shopping.showPriceBreakdown;

  const handlePriceChange = (value: string) => {
    // Remove any non-numeric characters except decimal point and currency symbols
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    
    // Handle different decimal separators based on currency
    let normalizedValue = cleanValue;
    if (preferences.currency === 'EUR' || preferences.currency === 'BRL') {
      // For currencies that use comma as decimal separator
      normalizedValue = cleanValue.replace(',', '.');
    }
    
    // Ensure only one decimal point
    const parts = normalizedValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to currency's decimal places
    const currencyInfo = require('@/types').getCurrencyInfo(preferences.currency);
    if (parts[1] && parts[1].length > currencyInfo.decimalPlaces) {
      return;
    }
    
    onPriceChange(normalizedValue);
  };

  const formatDisplayPrice = (amount: number) => {
    return formatCurrency(amount, preferences.currency, { showSymbol: false });
  };

  const getCurrencySymbol = () => {
    const currencyInfo = require('@/types').getCurrencyInfo(preferences.currency);
    return currencyInfo.symbol;
  };

  return (
    <View style={styles.container}>
      <View style={styles.priceInputRow}>
        <View style={styles.priceInputContainer}>
          <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="0.00"
            value={price}
            onChangeText={handlePriceChange}
            keyboardType="decimal-pad"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        <TouchableOpacity
          style={styles.toggleContainer}
          onPress={() => onPricePerUnitChange(!pricePerUnit)}
        >
          {pricePerUnit ? (
            <ToggleRight size={24} color="#3B82F6" />
          ) : (
            <ToggleLeft size={24} color="#9CA3AF" />
          )}
          <Text style={[
            styles.toggleLabel,
            pricePerUnit && styles.toggleLabelActive
          ]}>
            {pricePerUnit ? `per ${unitInfo.shortLabel}` : 'total'}
          </Text>
        </TouchableOpacity>
      </View>

      {shouldShowBreakdown && (
        <TouchableOpacity
          style={styles.breakdownContainer}
          onPress={() => setShowPriceBreakdown(!showPriceBreakdown)}
        >
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownTitle}>Price Breakdown</Text>
            <Text style={styles.breakdownToggle}>
              {showPriceBreakdown ? 'Hide' : 'Show'}
            </Text>
          </View>
          
          {showPriceBreakdown && (
            <View style={styles.breakdownDetails}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  {formatCurrency(priceBreakdown.unitPrice, preferences.currency)} {priceBreakdown.unitLabel}
                </Text>
                <Text style={styles.breakdownValue}>
                  <Text>× {numericQuantity} {unitInfo.shortLabel}</Text>
                </Text>
              </View>
              <View style={styles.breakdownDivider} />
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownTotalLabel}>Total Cost</Text>
                <Text style={styles.breakdownTotalValue}>
                  {formatCurrency(priceBreakdown.totalPrice, preferences.currency)}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.hintsContainer}>
        {pricePerUnit ? (
          <Text style={styles.hintText}>
            <Text>💡 Price per {unitInfo.shortLabel} • Total: {formatCurrency(priceBreakdown.totalPrice, preferences.currency)}</Text>
          </Text>
        ) : (
          <Text style={styles.hintText}>
            <Text>💡 Total price • Per {unitInfo.shortLabel}: {formatCurrency(priceBreakdown.unitPrice, preferences.currency)}</Text>
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 48,
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
  },
  toggleLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 4,
  },
  toggleLabelActive: {
    color: '#3B82F6',
  },
  breakdownContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  breakdownToggle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  breakdownDetails: {
    marginTop: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  breakdownTotalValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  hintsContainer: {
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default PriceInputComponent;