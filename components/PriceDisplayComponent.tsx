import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import { convertCurrency } from '@/lib/currencyConversion';
import { formatCurrency, CurrencyCode } from '@/types';

interface PriceDisplayComponentProps {
  price: number;
  fromCurrency?: CurrencyCode;
  toCurrency: CurrencyCode;
  style?: any;
  compact?: boolean;
  showCode?: boolean;
}

const PriceDisplayComponent = React.memo(({
  price,
  fromCurrency = 'USD',
  toCurrency,
  style,
  compact = false,
  showCode = false,
}: PriceDisplayComponentProps) => {
  const [convertedPrice, setConvertedPrice] = useState<number>(price);
  const [loading, setLoading] = useState(fromCurrency !== toCurrency);

  useEffect(() => {
    const convertPrice = async () => {
      if (fromCurrency === toCurrency) {
        setConvertedPrice(price);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const converted = await convertCurrency(price, fromCurrency, toCurrency);
        setConvertedPrice(converted);
      } catch (error) {
        console.error('Price conversion failed:', error);
        setConvertedPrice(price); // Fallback to original price
      } finally {
        setLoading(false);
      }
    };

    convertPrice();
  }, [price, fromCurrency, toCurrency]);

  if (loading) {
    return (
      <Text style={[styles.loadingText, style]}>
        {formatCurrency(price, fromCurrency, { compact, showCode })}
      </Text>
    );
  }

  return (
    <Text style={style}>
      {formatCurrency(convertedPrice, toCurrency, { compact, showCode })}
    </Text>
  );
});

const styles = StyleSheet.create({
  loadingText: {
    opacity: 0.6,
  },
});

export default PriceDisplayComponent;