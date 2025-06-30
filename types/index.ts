export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  items?: ListItem[];
  item_count?: number;
  purchased_count?: number;
}

export interface ListItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  quantity_unit: QuantityUnit; // New field for quantity type
  category: string;
  notes?: string;
  store?: string; // Store where the item will be purchased
  brand?: string; // Brand/manufacturer of the item
  price?: number; // Price of the item (stored in USD, displayed in user's currency)
  price_per_unit?: boolean; // Whether price is per unit/quantity or total price
  is_purchased: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreateListData {
  name: string;
  description?: string;
}

export interface CreateItemData {
  list_id: string;
  name: string;
  quantity?: number;
  quantity_unit?: QuantityUnit;
  category?: string;
  notes?: string;
  store?: string;
  brand?: string;
  price?: number;
  price_per_unit?: boolean;
  priority?: number;
}

export interface UpdateItemData {
  name?: string;
  quantity?: number;
  quantity_unit?: QuantityUnit;
  category?: string;
  notes?: string;
  store?: string;
  brand?: string;
  price?: number;
  price_per_unit?: boolean;
  is_purchased?: boolean;
  priority?: number;
}

export type ItemCategory = 
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'bakery'
  | 'frozen'
  | 'pantry'
  | 'beverages'
  | 'household'
  | 'personal'
  | 'other';

export const ITEM_CATEGORIES: { value: ItemCategory; label: string; emoji: string }[] = [
  { value: 'produce', label: 'Produce', emoji: '🥬' },
  { value: 'dairy', label: 'Dairy', emoji: '🥛' },
  { value: 'meat', label: 'Meat & Seafood', emoji: '🥩' },
  { value: 'bakery', label: 'Bakery', emoji: '🍞' },
  { value: 'frozen', label: 'Frozen', emoji: '🧊' },
  { value: 'pantry', label: 'Pantry', emoji: '🥫' },
  { value: 'beverages', label: 'Beverages', emoji: '🧃' },
  { value: 'household', label: 'Household', emoji: '🧽' },
  { value: 'personal', label: 'Personal Care', emoji: '🧴' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

// Quantity units for better UX
export type QuantityUnit = 
  | 'units'     // Default - individual items (1 apple, 2 phones)
  | 'kg'        // Kilograms (1 kg beef, 2.5 kg potatoes)
  | 'g'         // Grams (500 g flour, 250 g butter)
  | 'lb'        // Pounds (2 lb chicken, 1.5 lb ground beef)
  | 'oz'        // Ounces (8 oz cream cheese, 16 oz pasta)
  | 'l'         // Liters (2 l milk, 1.5 l orange juice)
  | 'ml'        // Milliliters (500 ml shampoo, 250 ml vanilla)
  | 'gal'       // Gallons (1 gal milk, 2 gal water)
  | 'qt'        // Quarts (1 qt heavy cream)
  | 'pt'        // Pints (1 pt blueberries)
  | 'fl_oz'     // Fluid ounces (12 fl oz soda)
  | 'cups'      // Cups (2 cups rice, 1 cup flour)
  | 'tbsp'      // Tablespoons (3 tbsp olive oil)
  | 'tsp'       // Teaspoons (1 tsp vanilla extract)
  | 'packs'     // Packages/packs (2 packs gum, 1 pack batteries)
  | 'boxes'     // Boxes (3 boxes cereal, 1 box tissues)
  | 'bottles'   // Bottles (2 bottles wine, 1 bottle ketchup)
  | 'cans'      // Cans (6 cans soda, 2 cans tomatoes)
  | 'jars'      // Jars (1 jar peanut butter, 2 jars jam)
  | 'bags'      // Bags (1 bag chips, 2 bags flour)
  | 'loaves'    // Loaves (2 loaves bread)
  | 'dozen'     // Dozen (1 dozen eggs, 2 dozen donuts)
  | 'pairs'     // Pairs (3 pairs socks, 1 pair shoes)
  | 'rolls'     // Rolls (1 roll paper towels, 2 rolls toilet paper)
  | 'sheets'    // Sheets (10 sheets aluminum foil)
  | 'slices'    // Slices (8 slices cheese, 4 slices ham)
  | 'bunches'   // Bunches (2 bunches bananas, 1 bunch cilantro)
  | 'heads'     // Heads (1 head lettuce, 2 heads garlic)
  | 'cloves'    // Cloves (3 cloves garlic)
  | 'stalks'    // Stalks (4 stalks celery)
  | 'sprigs'    // Sprigs (2 sprigs rosemary)
  | 'pieces';   // Pieces (4 pieces chicken, 2 pieces fruit)

export const QUANTITY_UNITS: { value: QuantityUnit; label: string; shortLabel: string; category: string }[] = [
  // Count/Units
  { value: 'units', label: 'Units', shortLabel: 'units', category: 'Count' },
  { value: 'pieces', label: 'Pieces', shortLabel: 'pcs', category: 'Count' },
  { value: 'dozen', label: 'Dozen', shortLabel: 'doz', category: 'Count' },
  { value: 'pairs', label: 'Pairs', shortLabel: 'pairs', category: 'Count' },
  
  // Weight - Metric
  { value: 'kg', label: 'Kilograms', shortLabel: 'kg', category: 'Weight' },
  { value: 'g', label: 'Grams', shortLabel: 'g', category: 'Weight' },
  
  // Weight - Imperial
  { value: 'lb', label: 'Pounds', shortLabel: 'lb', category: 'Weight' },
  { value: 'oz', label: 'Ounces', shortLabel: 'oz', category: 'Weight' },
  
  // Volume - Metric
  { value: 'l', label: 'Liters', shortLabel: 'L', category: 'Volume' },
  { value: 'ml', label: 'Milliliters', shortLabel: 'mL', category: 'Volume' },
  
  // Volume - Imperial
  { value: 'gal', label: 'Gallons', shortLabel: 'gal', category: 'Volume' },
  { value: 'qt', label: 'Quarts', shortLabel: 'qt', category: 'Volume' },
  { value: 'pt', label: 'Pints', shortLabel: 'pt', category: 'Volume' },
  { value: 'fl_oz', label: 'Fluid Ounces', shortLabel: 'fl oz', category: 'Volume' },
  { value: 'cups', label: 'Cups', shortLabel: 'cups', category: 'Volume' },
  { value: 'tbsp', label: 'Tablespoons', shortLabel: 'tbsp', category: 'Volume' },
  { value: 'tsp', label: 'Teaspoons', shortLabel: 'tsp', category: 'Volume' },
  
  // Packaging
  { value: 'packs', label: 'Packs', shortLabel: 'packs', category: 'Packaging' },
  { value: 'boxes', label: 'Boxes', shortLabel: 'boxes', category: 'Packaging' },
  { value: 'bottles', label: 'Bottles', shortLabel: 'bottles', category: 'Packaging' },
  { value: 'cans', label: 'Cans', shortLabel: 'cans', category: 'Packaging' },
  { value: 'jars', label: 'Jars', shortLabel: 'jars', category: 'Packaging' },
  { value: 'bags', label: 'Bags', shortLabel: 'bags', category: 'Packaging' },
  { value: 'loaves', label: 'Loaves', shortLabel: 'loaves', category: 'Packaging' },
  { value: 'rolls', label: 'Rolls', shortLabel: 'rolls', category: 'Packaging' },
  { value: 'sheets', label: 'Sheets', shortLabel: 'sheets', category: 'Packaging' },
  
  // Food-specific
  { value: 'slices', label: 'Slices', shortLabel: 'slices', category: 'Food' },
  { value: 'bunches', label: 'Bunches', shortLabel: 'bunches', category: 'Food' },
  { value: 'heads', label: 'Heads', shortLabel: 'heads', category: 'Food' },
  { value: 'cloves', label: 'Cloves', shortLabel: 'cloves', category: 'Food' },
  { value: 'stalks', label: 'Stalks', shortLabel: 'stalks', category: 'Food' },
  { value: 'sprigs', label: 'Sprigs', shortLabel: 'sprigs', category: 'Food' },
];

// Currency types and configurations
export type CurrencyCode = 
  | 'USD'  // US Dollar
  | 'EUR'  // Euro
  | 'GBP'  // British Pound
  | 'CAD'  // Canadian Dollar
  | 'AUD'  // Australian Dollar
  | 'JPY'  // Japanese Yen
  | 'CHF'  // Swiss Franc
  | 'CNY'  // Chinese Yuan
  | 'INR'  // Indian Rupee
  | 'BRL'  // Brazilian Real
  | 'MXN'  // Mexican Peso
  | 'KRW'  // South Korean Won
  | 'SGD'  // Singapore Dollar
  | 'HKD'  // Hong Kong Dollar
  | 'NOK'  // Norwegian Krone
  | 'SEK'  // Swedish Krona
  | 'DKK'  // Danish Krone
  | 'PLN'  // Polish Zloty
  | 'CZK'  // Czech Koruna
  | 'HUF'  // Hungarian Forint
  | 'RUB'  // Russian Ruble
  | 'TRY'  // Turkish Lira
  | 'ZAR'  // South African Rand
  | 'NZD'  // New Zealand Dollar
  | 'THB'  // Thai Baht
  | 'MYR'  // Malaysian Ringgit
  | 'IDR'  // Indonesian Rupiah
  | 'PHP'  // Philippine Peso
  | 'VND'  // Vietnamese Dong
  | 'AED'  // UAE Dirham
  | 'SAR'  // Saudi Riyal
  | 'QAR'  // Qatari Riyal
  | 'KWD'  // Kuwaiti Dinar
  | 'BHD'  // Bahraini Dinar
  | 'OMR'  // Omani Rial
  | 'JOD'  // Jordanian Dinar
  | 'LBP'  // Lebanese Pound
  | 'EGP'  // Egyptian Pound
  | 'MAD'  // Moroccan Dirham
  | 'TND'  // Tunisian Dinar
  | 'DZD'  // Algerian Dinar
  | 'NGN'  // Nigerian Naira
  | 'GHS'  // Ghanaian Cedi
  | 'KES'  // Kenyan Shilling
  | 'UGX'  // Ugandan Shilling
  | 'TZS'  // Tanzanian Shilling
  | 'ETB'  // Ethiopian Birr
  | 'XOF'  // West African CFA Franc
  | 'XAF'  // Central African CFA Franc
  | 'CLP'  // Chilean Peso
  | 'ARS'  // Argentine Peso
  | 'COP'  // Colombian Peso
  | 'PEN'  // Peruvian Sol
  | 'UYU'  // Uruguayan Peso
  | 'BOB'  // Bolivian Boliviano
  | 'PYG'  // Paraguayan Guarani
  | 'VES'  // Venezuelan Bolívar
  | 'GYD'  // Guyanese Dollar
  | 'SRD'  // Surinamese Dollar
  | 'TTD'  // Trinidad and Tobago Dollar
  | 'JMD'  // Jamaican Dollar
  | 'BBD'  // Barbadian Dollar
  | 'BSD'  // Bahamian Dollar
  | 'BZD'  // Belize Dollar
  | 'GTQ'  // Guatemalan Quetzal
  | 'HNL'  // Honduran Lempira
  | 'NIO'  // Nicaraguan Córdoba
  | 'CRC'  // Costa Rican Colón
  | 'PAB'  // Panamanian Balboa
  | 'DOP'  // Dominican Peso
  | 'HTG'  // Haitian Gourde
  | 'CUP'  // Cuban Peso
  | 'XCD'; // East Caribbean Dollar

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  region: string;
  flag: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  // Major Currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'United States', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', region: 'European Union', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'United Kingdom', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.', region: 'Japan', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Canada', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Australia', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: "'", decimalSeparator: '.', region: 'Switzerland', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'China', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'India', flag: '🇮🇳' },
  
  // European Currencies
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', region: 'Norway', flag: '🇳🇴' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', region: 'Sweden', flag: '🇸🇪' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', region: 'Denmark', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', region: 'Poland', flag: '🇵🇱' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', region: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', symbolPosition: 'after', decimalPlaces: 0, thousandsSeparator: ' ', decimalSeparator: ',', region: 'Hungary', flag: '🇭🇺' },
  
  // Asian Currencies
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.', region: 'South Korea', flag: '🇰🇷' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Singapore', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Hong Kong', flag: '🇭🇰' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Thailand', flag: '🇹🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Malaysia', flag: '🇲🇾' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: '.', decimalSeparator: ',', region: 'Indonesia', flag: '🇮🇩' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Philippines', flag: '🇵🇭' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', symbolPosition: 'after', decimalPlaces: 0, thousandsSeparator: '.', decimalSeparator: ',', region: 'Vietnam', flag: '🇻🇳' },
  
  // Middle Eastern Currencies
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Qatar', flag: '🇶🇦' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', symbolPosition: 'before', decimalPlaces: 3, thousandsSeparator: ',', decimalSeparator: '.', region: 'Kuwait', flag: '🇰🇼' },
  
  // Latin American Currencies
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', region: 'Brazil', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Mexico', flag: '🇲🇽' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', region: 'Argentina', flag: '🇦🇷' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: '.', decimalSeparator: ',', region: 'Chile', flag: '🇨🇱' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', symbolPosition: 'before', decimalPlaces: 0, thousandsSeparator: '.', decimalSeparator: ',', region: 'Colombia', flag: '🇨🇴' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Peru', flag: '🇵🇪' },
  
  // African Currencies
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: '.', region: 'South Africa', flag: '🇿🇦' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Nigeria', flag: '🇳🇬' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Egypt', flag: '🇪🇬' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: '.', region: 'Morocco', flag: '🇲🇦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'Kenya', flag: '🇰🇪' },
  
  // Oceania
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', region: 'New Zealand', flag: '🇳🇿' },
  
  // Other Notable Currencies
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', symbolPosition: 'after', decimalPlaces: 2, thousandsSeparator: ' ', decimalSeparator: ',', region: 'Russia', flag: '🇷🇺' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', symbolPosition: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', region: 'Turkey', flag: '🇹🇷' },
];

// Helper function to get currency info
export const getCurrencyInfo = (code: CurrencyCode): CurrencyInfo => {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0]; // Default to USD
};

// Helper function to convert currency using real-time exchange rates
export const convertCurrency = async (
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> => {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    // Import the conversion function from the currency conversion library
    const { convertCurrency: convert } = await import('@/lib/currencyConversion');
    return await convert(amount, fromCurrency, toCurrency);
  } catch (error) {
    console.error('Currency conversion failed:', error);
    return amount; // Return original amount if conversion fails
  }
};

// Helper function to format currency with real-time conversion
export const formatCurrency = (
  amount: number, 
  currencyCode: CurrencyCode = 'USD',
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
    fromCurrency?: CurrencyCode; // If provided, convert from this currency to currencyCode
  }
): string => {
  const currency = getCurrencyInfo(currencyCode);
  const { showSymbol = true, showCode = false, compact = false, fromCurrency } = options || {};
  
  // If we need to convert from a different currency, we'll need to handle this asynchronously
  // For now, we'll assume the amount is already in the target currency
  let displayAmount = amount;
  
  // Handle compact formatting for large numbers
  if (compact && displayAmount >= 1000) {
    if (displayAmount >= 1000000) {
      const millions = displayAmount / 1000000;
      const formatted = millions.toFixed(millions >= 10 ? 0 : 1);
      return `${showSymbol ? currency.symbol : ''}${formatted}M${showCode ? ` ${currency.code}` : ''}`;
    } else if (displayAmount >= 1000) {
      const thousands = displayAmount / 1000;
      const formatted = thousands.toFixed(thousands >= 10 ? 0 : 1);
      return `${showSymbol ? currency.symbol : ''}${formatted}K${showCode ? ` ${currency.code}` : ''}`;
    }
  }
  
  // Format the number with proper decimal places
  const formattedAmount = displayAmount.toFixed(currency.decimalPlaces);
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = formattedAmount.split('.');
  
  // Add thousands separators
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
  
  // Combine with decimal part if needed
  const finalAmount = currency.decimalPlaces > 0 && decimalPart 
    ? `${formattedInteger}${currency.decimalSeparator}${decimalPart}`
    : formattedInteger;
  
  // Apply symbol positioning
  let result = '';
  if (showSymbol) {
    if (currency.symbolPosition === 'before') {
      result = `${currency.symbol}${finalAmount}`;
    } else {
      result = `${finalAmount} ${currency.symbol}`;
    }
  } else {
    result = finalAmount;
  }
  
  // Add currency code if requested
  if (showCode) {
    result += ` ${currency.code}`;
  }
  
  return result;
};

// Helper function to format currency with async conversion
export const formatCurrencyAsync = async (
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  options?: {
    showSymbol?: boolean;
    showCode?: boolean;
    compact?: boolean;
  }
): Promise<string> => {
  const convertedAmount = await convertCurrency(amount, fromCurrency, toCurrency);
  return formatCurrency(convertedAmount, toCurrency, options);
};

// Helper function to parse currency input
export const parseCurrencyInput = (input: string, currencyCode: CurrencyCode = 'USD'): number => {
  const currency = getCurrencyInfo(currencyCode);
  
  // Remove currency symbols and codes
  let cleanInput = input
    .replace(new RegExp(currency.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    .replace(new RegExp(currency.code, 'gi'), '')
    .trim();
  
  // Replace decimal separator with standard dot
  if (currency.decimalSeparator !== '.') {
    cleanInput = cleanInput.replace(currency.decimalSeparator, '.');
  }
  
  // Remove thousands separators
  if (currency.thousandsSeparator !== '.') {
    cleanInput = cleanInput.replace(new RegExp(`\\${currency.thousandsSeparator}`, 'g'), '');
  }
  
  // Parse the number
  const parsed = parseFloat(cleanInput);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper function to get unit info
export const getQuantityUnitInfo = (unit: QuantityUnit) => {
  return QUANTITY_UNITS.find(u => u.value === unit) || QUANTITY_UNITS[0];
};

// Helper function to format quantity display
export const formatQuantityDisplay = (quantity: number, unit: QuantityUnit): string => {
  const unitInfo = getQuantityUnitInfo(unit);
  
  // Handle decimal quantities for weight/volume
  if (['kg', 'g', 'lb', 'oz', 'l', 'ml', 'gal', 'qt', 'pt', 'fl_oz', 'cups', 'tbsp', 'tsp'].includes(unit)) {
    const formattedQuantity = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
    return `${formattedQuantity} ${unitInfo.shortLabel}`;
  }
  
  // Handle whole numbers for count-based units
  const formattedQuantity = Math.round(quantity);
  if (formattedQuantity === 1 && unit === 'units') {
    return '1 unit';
  }
  
  return `${formattedQuantity} ${unitInfo.shortLabel}`;
};

// Helper function to format price display with per-unit pricing and currency conversion
export const formatPriceDisplay = async (
  price: number, 
  quantity: number, 
  unit: QuantityUnit, 
  pricePerUnit: boolean = false,
  fromCurrency: CurrencyCode = 'USD',
  toCurrency: CurrencyCode = 'USD'
): Promise<{ 
  unitPrice: string; 
  totalPrice: string; 
  priceLabel: string;
}> => {
  const unitInfo = getQuantityUnitInfo(unit);
  
  // Convert price to target currency
  const convertedPrice = await convertCurrency(price, fromCurrency, toCurrency);
  
  if (pricePerUnit) {
    // Price is per unit/quantity
    const totalPrice = convertedPrice * quantity;
    return {
      unitPrice: formatCurrency(convertedPrice, toCurrency),
      totalPrice: formatCurrency(totalPrice, toCurrency),
      priceLabel: `per ${unitInfo.shortLabel}`,
    };
  } else {
    // Price is total price
    const unitPrice = quantity > 0 ? convertedPrice / quantity : convertedPrice;
    return {
      unitPrice: formatCurrency(unitPrice, toCurrency),
      totalPrice: formatCurrency(convertedPrice, toCurrency),
      priceLabel: `per ${unitInfo.shortLabel}`,
    };
  }
};

// Helper function to calculate total cost for an item with currency conversion
export const calculateItemTotalCost = (
  price: number, 
  quantity: number, 
  pricePerUnit: boolean = false,
  fromCurrency: CurrencyCode = 'USD',
  toCurrency: CurrencyCode = 'USD'
): number => {
  // For synchronous calculations, we'll assume prices are already in the correct currency
  // The UI components will handle async conversion when needed
  if (pricePerUnit) {
    return price * quantity;
  }
  return price;
};

// Helper function to calculate total cost with async currency conversion
export const calculateItemTotalCostAsync = async (
  price: number, 
  quantity: number, 
  pricePerUnit: boolean = false,
  fromCurrency: CurrencyCode = 'USD',
  toCurrency: CurrencyCode = 'USD'
): Promise<number> => {
  const convertedPrice = await convertCurrency(price, fromCurrency, toCurrency);
  
  if (pricePerUnit) {
    return convertedPrice * quantity;
  }
  return convertedPrice;
};

// Helper function to suggest price per unit based on category and unit
export const suggestPricePerUnit = (category: ItemCategory, unit: QuantityUnit): boolean => {
  // Weight and volume items typically have per-unit pricing
  const perUnitUnits: QuantityUnit[] = ['kg', 'g', 'lb', 'oz', 'l', 'ml', 'gal', 'qt', 'pt', 'fl_oz'];
  
  // Categories that commonly use per-unit pricing
  const perUnitCategories: ItemCategory[] = ['produce', 'meat', 'dairy'];
  
  return perUnitUnits.includes(unit) || perUnitCategories.includes(category);
};

// Helper function to suggest appropriate units based on category and item name
export const suggestQuantityUnit = (itemName: string, category: ItemCategory): QuantityUnit => {
  const name = itemName.toLowerCase();
  
  // Weight-based items
  if (name.includes('meat') || name.includes('beef') || name.includes('chicken') || 
      name.includes('pork') || name.includes('fish') || name.includes('salmon') ||
      name.includes('flour') || name.includes('sugar') || name.includes('rice') ||
      name.includes('potato') || name.includes('onion') || name.includes('apple') ||
      category === 'meat' || category === 'produce') {
    if (name.includes('lb') || name.includes('pound')) return 'lb';
    if (name.includes('kg') || name.includes('kilo')) return 'kg';
    if (name.includes('g') || name.includes('gram')) return 'g';
    if (name.includes('oz') || name.includes('ounce')) return 'oz';
    return 'lb'; // Default for weight items
  }
  
  // Volume-based items
  if (name.includes('milk') || name.includes('juice') || name.includes('water') ||
      name.includes('oil') || name.includes('vinegar') || name.includes('sauce') ||
      category === 'beverages') {
    if (name.includes('gal') || name.includes('gallon')) return 'gal';
    if (name.includes('l') || name.includes('liter')) return 'l';
    if (name.includes('ml') || name.includes('milliliter')) return 'ml';
    if (name.includes('qt') || name.includes('quart')) return 'qt';
    if (name.includes('fl oz') || name.includes('fluid ounce')) return 'fl_oz';
    return 'l'; // Default for liquids
  }
  
  // Packaging-based items
  if (name.includes('pack') || name.includes('package')) return 'packs';
  if (name.includes('box') || name.includes('cereal') || name.includes('tissue')) return 'boxes';
  if (name.includes('bottle') || name.includes('wine') || name.includes('beer')) return 'bottles';
  if (name.includes('can') || name.includes('soda') || name.includes('tomato')) return 'cans';
  if (name.includes('jar') || name.includes('peanut butter') || name.includes('jam')) return 'jars';
  if (name.includes('bag') || name.includes('chips') || name.includes('frozen')) return 'bags';
  if (name.includes('loaf') || name.includes('bread')) return 'loaves';
  if (name.includes('roll') || name.includes('paper towel') || name.includes('toilet paper')) return 'rolls';
  
  // Food-specific
  if (name.includes('egg') || name.includes('donut') || name.includes('bagel')) return 'dozen';
  if (name.includes('lettuce') || name.includes('cabbage') || name.includes('cauliflower')) return 'heads';
  if (name.includes('garlic') && !name.includes('powder')) return 'cloves';
  if (name.includes('celery') || name.includes('asparagus')) return 'stalks';
  if (name.includes('herb') || name.includes('rosemary') || name.includes('thyme')) return 'sprigs';
  if (name.includes('banana') || name.includes('grape') || name.includes('cilantro')) return 'bunches';
  if (name.includes('cheese') || name.includes('ham') || name.includes('turkey')) return 'slices';
  
  // Clothing/accessories
  if (name.includes('sock') || name.includes('shoe') || name.includes('glove')) return 'pairs';
  
  // Default to units
  return 'units';
};

export interface SharedLink {
  id: string;
  list_id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface SharedListData {
  list: {
    id: string;
    name: string;
    created_at: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      quantity_unit: QuantityUnit;
      category: string;
      notes?: string;
      store?: string;
      brand?: string;
      is_purchased: boolean;
      priority: number;
      created_at: string;
    }>;
  };
  shared_at: string;
  expires_at: string | null;
  metadata: {
    is_shared: boolean;
    access_type: 'read_only';
    item_count: number;
    purchased_count: number;
  };
}

export interface CreateShareLinkRequest {
  expires_in?: number; // Optional expiration in seconds
}

export interface CreateShareLinkResponse {
  share_url: string;
  expires_at: string | null;
  list_name: string;
  token: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface ShoppingState {
  lists: ShoppingList[];
  currentList: ShoppingList | null;
  loading: boolean;
  error: string | null;
}

// Store grouping interfaces
export interface StoreGroup {
  storeName: string;
  items: ListItem[];
  totalPrice: number;
  categories: CategoryGroup[];
}

export interface CategoryGroup {
  categoryName: string;
  categoryInfo: { value: ItemCategory; label: string; emoji: string };
  items: ListItem[];
  totalPrice: number;
}

// User preferences interface
export interface UserPreferences {
  currency: CurrencyCode;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    enabled: boolean;
    shoppingReminders: boolean;
    priceAlerts: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    locationTracking: boolean;
  };
  shopping: {
    defaultQuantityUnit: QuantityUnit;
    autoSuggestUnits: boolean;
    autoSuggestPricing: boolean;
    showPriceBreakdown: boolean;
  };
}

// Default user preferences
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  currency: 'USD',
  language: 'en',
  theme: 'auto',
  notifications: {
    enabled: true,
    shoppingReminders: true,
    priceAlerts: true,
    weeklyReports: false,
  },
  privacy: {
    shareAnalytics: true,
    locationTracking: true,
  },
  shopping: {
    defaultQuantityUnit: 'units',
    autoSuggestUnits: true,
    autoSuggestPricing: true,
    showPriceBreakdown: true,
  },
};