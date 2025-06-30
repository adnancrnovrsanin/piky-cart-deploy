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
import { ChevronDown, Search, X, Check } from 'lucide-react-native';
import { CurrencyCode, CURRENCIES, getCurrencyInfo } from '@/types';

interface CurrencySelectorProps {
  selectedCurrency: CurrencyCode;
  onSelectCurrency: (currency: CurrencyCode) => void;
  style?: any;
}

const CurrencySelector = React.memo(({ selectedCurrency, onSelectCurrency, style }: CurrencySelectorProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCurrencyInfo = getCurrencyInfo(selectedCurrency);

  // Filter currencies based on search
  const filteredCurrencies = searchQuery.trim()
    ? CURRENCIES.filter(currency =>
        currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        currency.region.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CURRENCIES;

  // Group currencies by region for better organization
  const groupedCurrencies = filteredCurrencies.reduce((groups, currency) => {
    // Determine region group
    let regionGroup = 'Other';
    
    if (['USD', 'CAD', 'MXN'].includes(currency.code)) {
      regionGroup = 'North America';
    } else if (['EUR', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF'].includes(currency.code)) {
      regionGroup = 'Europe';
    } else if (['JPY', 'CNY', 'KRW', 'SGD', 'HKD', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'INR'].includes(currency.code)) {
      regionGroup = 'Asia Pacific';
    } else if (['AED', 'SAR', 'QAR', 'KWD', 'EGP', 'MAD'].includes(currency.code)) {
      regionGroup = 'Middle East & Africa';
    } else if (['BRL', 'ARS', 'CLP', 'COP', 'PEN'].includes(currency.code)) {
      regionGroup = 'Latin America';
    } else if (['AUD', 'NZD'].includes(currency.code)) {
      regionGroup = 'Oceania';
    }
    
    if (!groups[regionGroup]) {
      groups[regionGroup] = [];
    }
    groups[regionGroup].push(currency);
    return groups;
  }, {} as Record<string, typeof CURRENCIES>);

  const handleSelectCurrency = (currency: CurrencyCode) => {
    onSelectCurrency(currency);
    setIsModalVisible(false);
    setSearchQuery('');
  };

  const renderCurrencyOption = (currency: typeof CURRENCIES[0]) => (
    <TouchableOpacity
      key={currency.code}
      style={[
        styles.currencyOption,
        selectedCurrency === currency.code && styles.currencyOptionSelected,
      ]}
      onPress={() => handleSelectCurrency(currency.code)}
    >
      <View style={styles.currencyOptionContent}>
        <View style={styles.currencyInfo}>
          <Text style={styles.currencyFlag}>{currency.flag}</Text>
          <View style={styles.currencyDetails}>
            <Text
              style={[
                styles.currencyName,
                selectedCurrency === currency.code && styles.currencyNameSelected,
              ]}
            >
              {currency.name}
            </Text>
            <Text
              style={[
                styles.currencyCode,
                selectedCurrency === currency.code && styles.currencyCodeSelected,
              ]}
            >
              {currency.code} • {currency.symbol}
            </Text>
          </View>
        </View>
        {selectedCurrency === currency.code && (
          <Check size={20} color="#3B82F6" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.selector, style]}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.selectorFlag}>{selectedCurrencyInfo.flag}</Text>
          <View style={styles.selectorInfo}>
            <Text style={styles.selectorCurrency}>{selectedCurrencyInfo.code}</Text>
            <Text style={styles.selectorSymbol}>{selectedCurrencyInfo.symbol}</Text>
          </View>
        </View>
        <ChevronDown size={16} color="#6B7280" />
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
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search currencies..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <ScrollView style={styles.currenciesContainer} showsVerticalScrollIndicator={false}>
              {searchQuery.trim() ? (
                // Show filtered results without grouping
                <View style={styles.regionSection}>
                  <Text style={styles.regionTitle}>Search Results</Text>
                  {filteredCurrencies.map(renderCurrencyOption)}
                </View>
              ) : (
                // Show grouped results
                Object.entries(groupedCurrencies)
                  .sort(([a], [b]) => {
                    // Sort regions: Major currencies first, then alphabetically
                    const order = ['North America', 'Europe', 'Asia Pacific', 'Oceania', 'Middle East & Africa', 'Latin America', 'Other'];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(([region, currencies]) => (
                    <View key={region} style={styles.regionSection}>
                      <Text style={styles.regionTitle}>{region}</Text>
                      {currencies
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(renderCurrencyOption)}
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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
    justifyContent: 'space-between',
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorFlag: {
    fontSize: 18,
    marginRight: 8,
  },
  selectorInfo: {
    alignItems: 'flex-start',
  },
  selectorCurrency: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  selectorSymbol: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '70%',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  currenciesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  regionSection: {
    marginBottom: 24,
  },
  regionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  currencyOption: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencyOptionSelected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  currencyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  currencyDetails: {
    flex: 1,
  },
  currencyName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  currencyNameSelected: {
    color: '#3B82F6',
    fontFamily: 'Inter-SemiBold',
  },
  currencyCode: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  currencyCodeSelected: {
    color: '#3B82F6',
  },
});

export default CurrencySelector;