import { CurrencyCode } from '@/types';

// Exchange rate API configuration
const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest';
const FALLBACK_API_URL = 'https://api.fixer.io/latest'; // Backup API

// Cache for exchange rates (valid for 1 hour)
interface ExchangeRateCache {
  rates: Record<string, number>;
  timestamp: number;
  baseCurrency: CurrencyCode;
}

let exchangeRateCache: ExchangeRateCache | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Common exchange rates as fallback (approximate rates, updated periodically)
const FALLBACK_RATES: Record<CurrencyCode, Record<CurrencyCode, number>> = {
  USD: {
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    JPY: 110,
    CAD: 1.25,
    AUD: 1.35,
    CHF: 0.92,
    CNY: 6.45,
    INR: 74.5,
    BRL: 5.2,
    MXN: 20.1,
    KRW: 1180,
    SGD: 1.35,
    HKD: 7.8,
    NOK: 8.6,
    SEK: 8.9,
    DKK: 6.3,
    PLN: 3.9,
    CZK: 21.5,
    HUF: 295,
    RUB: 73.5,
    TRY: 8.4,
    ZAR: 14.2,
    NZD: 1.42,
    THB: 31.2,
    MYR: 4.1,
    IDR: 14250,
    PHP: 49.5,
    VND: 23100,
    AED: 3.67,
    SAR: 3.75,
    QAR: 3.64,
    KWD: 0.30,
    BHD: 0.38,
    OMR: 0.38,
    JOD: 0.71,
    LBP: 1507,
    EGP: 15.7,
    MAD: 8.9,
    TND: 2.8,
    DZD: 133,
    NGN: 411,
    GHS: 5.8,
    KES: 108,
    UGX: 3530,
    TZS: 2310,
    ETB: 43.5,
    XOF: 558,
    XAF: 558,
    CLP: 715,
    ARS: 98.5,
    COP: 3650,
    PEN: 3.6,
    UYU: 43.2,
    BOB: 6.9,
    PYG: 6850,
    VES: 4.18,
    GYD: 209,
    SRD: 14.2,
    TTD: 6.8,
    JMD: 146,
    BBD: 2.0,
    BSD: 1.0,
    BZD: 2.0,
    GTQ: 7.7,
    HNL: 24.1,
    NIO: 35.2,
    CRC: 620,
    PAB: 1.0,
    DOP: 56.5,
    HTG: 87.2,
    CUP: 24.0,
    XCD: 2.7,
  },
  EUR: {} as Record<CurrencyCode, number>,
  GBP: {} as Record<CurrencyCode, number>,
  // Add more base currencies as needed
};

// Initialize fallback rates for EUR and GBP
Object.keys(FALLBACK_RATES.USD).forEach(currency => {
  const currencyCode = currency as CurrencyCode;
  FALLBACK_RATES.EUR[currencyCode] = FALLBACK_RATES.USD[currencyCode] / FALLBACK_RATES.USD.EUR;
  FALLBACK_RATES.GBP[currencyCode] = FALLBACK_RATES.USD[currencyCode] / FALLBACK_RATES.USD.GBP;
});

/**
 * Fetches current exchange rates from API
 */
export async function fetchExchangeRates(baseCurrency: CurrencyCode = 'USD'): Promise<Record<string, number> | null> {
  try {
    // Check cache first
    if (exchangeRateCache && 
        exchangeRateCache.baseCurrency === baseCurrency &&
        Date.now() - exchangeRateCache.timestamp < CACHE_DURATION) {
      return exchangeRateCache.rates;
    }

    // Try primary API
    let response = await fetch(`${EXCHANGE_RATE_API_URL}/${baseCurrency}`);
    
    if (!response.ok) {
      // Try fallback API
      response = await fetch(`${FALLBACK_API_URL}?base=${baseCurrency}`);
    }

    if (response.ok) {
      const data = await response.json();
      const rates = data.rates || {};
      
      // Cache the results
      exchangeRateCache = {
        rates,
        timestamp: Date.now(),
        baseCurrency,
      };
      
      return rates;
    }
    
    throw new Error('API request failed');
  } catch (error) {
    console.warn('Failed to fetch exchange rates from API, using fallback rates:', error);
    return FALLBACK_RATES[baseCurrency] || FALLBACK_RATES.USD;
  }
}

/**
 * Converts an amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    // Get exchange rates with USD as base
    const rates = await fetchExchangeRates('USD');
    
    if (!rates) {
      throw new Error('No exchange rates available');
    }

    // Convert to USD first, then to target currency
    const usdAmount = fromCurrency === 'USD' ? amount : amount / (rates[fromCurrency] || 1);
    const convertedAmount = toCurrency === 'USD' ? usdAmount : usdAmount * (rates[toCurrency] || 1);
    
    // Round to 2 decimal places
    return Math.round(convertedAmount * 100) / 100;
  } catch (error) {
    console.error('Currency conversion failed:', error);
    
    // Use fallback rates
    try {
      const fallbackRates = FALLBACK_RATES.USD;
      const usdAmount = fromCurrency === 'USD' ? amount : amount / (fallbackRates[fromCurrency] || 1);
      const convertedAmount = toCurrency === 'USD' ? usdAmount : usdAmount * (fallbackRates[toCurrency] || 1);
      
      return Math.round(convertedAmount * 100) / 100;
    } catch (fallbackError) {
      console.error('Fallback conversion failed:', fallbackError);
      return amount; // Return original amount if all conversions fail
    }
  }
}

/**
 * Gets the exchange rate between two currencies
 */
export async function getExchangeRate(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  try {
    const rates = await fetchExchangeRates('USD');
    
    if (!rates) {
      throw new Error('No exchange rates available');
    }

    // Calculate rate: from -> USD -> to
    const fromRate = fromCurrency === 'USD' ? 1 : rates[fromCurrency] || 1;
    const toRate = toCurrency === 'USD' ? 1 : rates[toCurrency] || 1;
    
    return toRate / fromRate;
  } catch (error) {
    console.error('Failed to get exchange rate:', error);
    
    // Use fallback rates
    const fallbackRates = FALLBACK_RATES.USD;
    const fromRate = fromCurrency === 'USD' ? 1 : fallbackRates[fromCurrency] || 1;
    const toRate = toCurrency === 'USD' ? 1 : fallbackRates[toCurrency] || 1;
    
    return toRate / fromRate;
  }
}

/**
 * Batch convert multiple amounts
 */
export async function batchConvertCurrency(
  conversions: Array<{
    amount: number;
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
  }>
): Promise<Array<{ originalAmount: number; convertedAmount: number; rate: number }>> {
  const results = [];
  
  for (const conversion of conversions) {
    const convertedAmount = await convertCurrency(
      conversion.amount,
      conversion.fromCurrency,
      conversion.toCurrency
    );
    
    const rate = await getExchangeRate(conversion.fromCurrency, conversion.toCurrency);
    
    results.push({
      originalAmount: conversion.amount,
      convertedAmount,
      rate,
    });
  }
  
  return results;
}

/**
 * Validates if a currency code is supported
 */
export function isSupportedCurrency(currency: string): currency is CurrencyCode {
  return Object.keys(FALLBACK_RATES.USD).includes(currency);
}

/**
 * Gets a list of all supported currencies
 */
export function getSupportedCurrencies(): CurrencyCode[] {
  return Object.keys(FALLBACK_RATES.USD) as CurrencyCode[];
}

/**
 * Clears the exchange rate cache (useful for testing or forcing refresh)
 */
export function clearExchangeRateCache(): void {
  exchangeRateCache = null;
}