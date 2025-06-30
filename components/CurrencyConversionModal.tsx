import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { X, DollarSign, TrendingUp, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from 'lucide-react-native';
import { CurrencyCode, formatCurrency, getCurrencyInfo } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface ConversionItem {
  itemId: string;
  listName: string;
  itemName: string;
  currentPrice: number;
  currentCurrency: CurrencyCode;
  quantity: number;
  quantityUnit: string;
  pricePerUnit: boolean;
  newPrice: number;
  savings: number;
}

interface CurrencyConversionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  items: Array<{
    itemId: string;
    listName: string;
    itemName: string;
    currentPrice: number;
    currentCurrency: CurrencyCode;
    quantity: number;
    quantityUnit: string;
    pricePerUnit: boolean;
  }>;
  loading?: boolean;
}

const CurrencyConversionModal = React.memo(({
  visible,
  onClose,
  onConfirm,
  fromCurrency,
  toCurrency,
  items,
  loading = false,
}: CurrencyConversionModalProps) => {
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [conversionItems, setConversionItems] = useState<ConversionItem[]>([]);
  const [loadingRate, setLoadingRate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fromCurrencyInfo = getCurrencyInfo(fromCurrency);
  const toCurrencyInfo = getCurrencyInfo(toCurrency);

  useEffect(() => {
    if (visible && user) {
      loadConversionData();
    }
  }, [visible, fromCurrency, toCurrency, user]);

  const loadConversionData = async () => {
    setLoadingRate(true);
    setError(null);

    try {
      const response = await fetch('/api/currency-conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user!.id,
          fromCurrency,
          toCurrency,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load conversion data: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Conversion API returned failure');
      }

      setExchangeRate(result.exchangeRate);

      const convertedItems: ConversionItem[] = result.itemsToConvert.map((item: any) => {
        const newPrice = Math.round(item.currentPrice * result.exchangeRate * 100) / 100;
        const totalCurrentPrice = item.pricePerUnit 
          ? item.currentPrice * item.quantity 
          : item.currentPrice;
        const totalNewPrice = item.pricePerUnit 
          ? newPrice * item.quantity 
          : newPrice;
        const savings = totalCurrentPrice - totalNewPrice;

        return {
          ...item,
          newPrice,
          savings,
        };
      });

      setConversionItems(convertedItems);
    } catch (err) {
      console.error('Error loading conversion data:', err);
      setError('Failed to load current exchange rates. Please try again.');
    } finally {
      setLoadingRate(false);
    }
  };

  const totalSavings = conversionItems.reduce((sum, item) => sum + item.savings, 0);
  const totalCurrentValue = conversionItems.reduce((sum, item) => {
    const totalPrice = item.pricePerUnit 
      ? item.currentPrice * item.quantity 
      : item.currentPrice;
    return sum + totalPrice;
  }, 0);
  const totalNewValue = conversionItems.reduce((sum, item) => {
    const totalPrice = item.pricePerUnit 
      ? item.newPrice * item.quantity 
      : item.newPrice;
    return sum + totalPrice;
  }, 0);

  const renderConversionItem = (item: ConversionItem, index: number) => {
    const currentTotal = item.pricePerUnit 
      ? item.currentPrice * item.quantity 
      : item.currentPrice;
    const newTotal = item.pricePerUnit 
      ? item.newPrice * item.quantity 
      : item.newPrice;

    return (
      <View key={item.itemId} style={styles.conversionItem}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.itemName}</Text>
          <Text style={styles.listName}>{item.listName}</Text>
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemQuantity}>
            {item.quantity} {item.quantityUnit}
          </Text>
          
          <View style={styles.priceComparison}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Current:</Text>
              <Text style={styles.currentPrice}>
                {formatCurrency(item.currentPrice, fromCurrency)}
                {item.pricePerUnit && ` per ${item.quantityUnit}`}
              </Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>New:</Text>
              <Text style={styles.newPrice}>
                {formatCurrency(item.newPrice, toCurrency)}
                {item.pricePerUnit && ` per ${item.quantityUnit}`}
              </Text>
            </View>
            
            {item.quantity > 1 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <View style={styles.totalComparison}>
                  <Text style={styles.totalCurrent}>
                    {formatCurrency(currentTotal, fromCurrency)}
                  </Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.totalNew}>
                    {formatCurrency(newTotal, toCurrency)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loadingRate) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading exchange rates...</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Currency Conversion</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={24} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={loadConversionData}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.conversionSummary}>
                <View style={styles.currencyHeader}>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyFlag}>{fromCurrencyInfo.flag}</Text>
                    <Text style={styles.currencyCode}>{fromCurrency}</Text>
                  </View>
                  <TrendingUp size={20} color="#3B82F6" />
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyFlag}>{toCurrencyInfo.flag}</Text>
                    <Text style={styles.currencyCode}>{toCurrency}</Text>
                  </View>
                </View>

                <View style={styles.exchangeRateInfo}>
                  <Text style={styles.exchangeRateLabel}>Exchange Rate:</Text>
                  <Text style={styles.exchangeRateValue}>
                    1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
                  </Text>
                </View>

                <View style={styles.summaryStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Items to Convert</Text>
                    <Text style={styles.statValue}>{conversionItems.length}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Current Total</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(totalCurrentValue, fromCurrency)}
                    </Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>New Total</Text>
                    <Text style={styles.statValue}>
                      {formatCurrency(totalNewValue, toCurrency)}
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
                <Text style={styles.itemsTitle}>Items to be converted:</Text>
                {conversionItems.map(renderConversionItem)}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.confirmButton, loading && styles.confirmButtonDisabled]} 
                  onPress={onConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <CheckCircle size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.confirmButtonText}>
                    {loading ? 'Converting...' : 'Convert Prices'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  conversionSummary: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  currencyFlag: {
    fontSize: 24,
    marginRight: 8,
  },
  currencyCode: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  exchangeRateInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  exchangeRateLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  exchangeRateValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
    marginTop: 4,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  itemsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginVertical: 16,
  },
  conversionItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemHeader: {
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  listName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  itemDetails: {
    gap: 8,
  },
  itemQuantity: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  priceComparison: {
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  currentPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
  },
  newPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  totalComparison: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalCurrent: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  arrow: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginHorizontal: 8,
  },
  totalNew: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default CurrencyConversionModal;