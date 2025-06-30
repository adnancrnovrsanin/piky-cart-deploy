import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useShopping } from '@/contexts/ShoppingContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { 
  ShoppingList, 
  ListItem, 
  ITEM_CATEGORIES, 
  formatCurrency, 
  calculateItemTotalCost,
  formatQuantityDisplay,
  StoreGroup,
  CategoryGroup
} from '@/types';
import { ArrowLeft, Calendar, Package, CircleCheck as CheckCircle, DollarSign, TrendingDown, Store, ShoppingBag, PiggyBank, TriangleAlert as AlertTriangle, Sparkles, ChartBar as BarChart3, Clock, Target } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

export default function ArchivedListDetailsScreen() {
  const { listId, listName } = useLocalSearchParams<{
    listId: string;
    listName: string;
  }>();
  const { archivedLists } = useShopping();
  const { preferences } = useUserPreferences();
  const [archivedList, setArchivedList] = useState<ShoppingList | null>(null);

  useEffect(() => {
    if (listId) {
      const foundList = archivedLists.find((l) => l.id === listId);
      setArchivedList(foundList || null);
    }
  }, [listId, archivedLists]);

  // Calculate spending analytics
  const spendingAnalytics = useMemo(() => {
    if (!archivedList?.items) {
      return {
        totalSpent: 0,
        totalItems: 0,
        purchasedItems: 0,
        avgItemCost: 0,
        hasOptimizedItems: false,
        potentialSavings: 0,
        actualSavings: 0,
        optimizationUsed: false,
        categoryBreakdown: [],
        storeBreakdown: [],
        completionRate: 0,
      };
    }

    const items = archivedList.items;
    const totalItems = items.length;
    const purchasedItems = items.filter(item => item.is_purchased).length;
    const completionRate = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0;

    // Calculate total spent
    const totalSpent = items.reduce((total, item) => {
      if (item.is_purchased && item.price) {
        return total + calculateItemTotalCost(item.price, item.quantity, item.price_per_unit);
      }
      return total;
    }, 0);

    const avgItemCost = purchasedItems > 0 ? totalSpent / purchasedItems : 0;

    // Check if optimization was used (items have store assignments and prices)
    const optimizedItems = items.filter(item => item.store && item.price);
    const optimizationUsed = optimizedItems.length > totalItems * 0.5; // More than 50% have store/price data

    // Estimate potential savings (mock calculation - in real app this would come from optimization history)
    const potentialSavings = totalSpent * 0.15; // Assume 15% potential savings
    const actualSavings = optimizationUsed ? totalSpent * 0.12 : 0; // 12% if optimized, 0% if not

    // Category breakdown
    const categorySpending: Record<string, number> = {};
    items.forEach(item => {
      if (item.is_purchased && item.price) {
        const category = item.category || 'other';
        const cost = calculateItemTotalCost(item.price, item.quantity, item.price_per_unit);
        categorySpending[category] = (categorySpending[category] || 0) + cost;
      }
    });

    const categoryBreakdown = Object.entries(categorySpending)
      .map(([category, amount]) => {
        const categoryInfo = ITEM_CATEGORIES.find(cat => cat.value === category) || 
          { value: 'other', label: 'Other', emoji: '📦' };
        return {
          category: categoryInfo.label,
          emoji: categoryInfo.emoji,
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Store breakdown
    const storeSpending: Record<string, { amount: number; items: number }> = {};
    items.forEach(item => {
      if (item.is_purchased && item.store) {
        const store = item.store;
        const cost = item.price ? calculateItemTotalCost(item.price, item.quantity, item.price_per_unit) : 0;
        if (!storeSpending[store]) {
          storeSpending[store] = { amount: 0, items: 0 };
        }
        storeSpending[store].amount += cost;
        storeSpending[store].items += 1;
      }
    });

    const storeBreakdown = Object.entries(storeSpending)
      .map(([store, data]) => ({
        store,
        amount: data.amount,
        items: data.items,
        percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalSpent,
      totalItems,
      purchasedItems,
      avgItemCost,
      hasOptimizedItems: optimizedItems.length > 0,
      potentialSavings,
      actualSavings,
      optimizationUsed,
      categoryBreakdown,
      storeBreakdown,
      completionRate,
    };
  }, [archivedList]);

  // Group items by store and category
  const groupedItems = useMemo(() => {
    if (!archivedList?.items) return [];

    const storeGroups: Record<string, StoreGroup> = {};

    archivedList.items.forEach((item) => {
      const storeName = item.store || 'Items not assigned to a store';
      
      if (!storeGroups[storeName]) {
        storeGroups[storeName] = {
          storeName,
          items: [],
          totalPrice: 0,
          categories: [],
        };
      }

      storeGroups[storeName].items.push(item);
      if (item.price && item.is_purchased) {
        const totalCost = calculateItemTotalCost(item.price, item.quantity, item.price_per_unit);
        storeGroups[storeName].totalPrice += totalCost;
      }
    });

    // Group by category within each store
    Object.values(storeGroups).forEach((storeGroup) => {
      const categoryGroups: Record<string, CategoryGroup> = {};

      storeGroup.items.forEach((item) => {
        const categoryName = item.category;
        
        if (!categoryGroups[categoryName]) {
          const categoryInfo = ITEM_CATEGORIES.find(cat => cat.value === categoryName) || 
            { value: 'other', label: 'Other', emoji: '📦' };
          
          categoryGroups[categoryName] = {
            categoryName,
            categoryInfo,
            items: [],
            totalPrice: 0,
          };
        }

        categoryGroups[categoryName].items.push(item);
        if (item.price && item.is_purchased) {
          const totalCost = calculateItemTotalCost(item.price, item.quantity, item.price_per_unit);
          categoryGroups[categoryName].totalPrice += totalCost;
        }
      });

      storeGroup.categories = Object.values(categoryGroups).sort((a, b) => 
        a.categoryInfo.label.localeCompare(b.categoryInfo.label)
      );
    });

    return Object.values(storeGroups).sort((a, b) => {
      if (a.storeName === 'Items not assigned to a store' && b.storeName !== 'Items not assigned to a store') return 1;
      if (a.storeName !== 'Items not assigned to a store' && b.storeName === 'Items not assigned to a store') return -1;
      return a.storeName.localeCompare(b.storeName);
    });
  }, [archivedList]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!archivedList) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Oops! List Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>We couldn't find the shopping list you're looking for. It might have been moved or deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderSpendingSummary = () => (
    <Animated.View entering={FadeInUp.delay(100)} style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <DollarSign size={24} color="#10B981" />
        <Text style={styles.summaryTitle}>Your Trip Summary</Text>
      </View>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {formatCurrency(spendingAnalytics.totalSpent, preferences.currency)}
          </Text>
          <Text style={styles.summaryLabel}>You Spent</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {formatCurrency(spendingAnalytics.avgItemCost, preferences.currency)}
          </Text>
          <Text style={styles.summaryLabel}>Average Item Cost</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {spendingAnalytics.completionRate.toFixed(0)}%
          </Text>
          <Text style={styles.summaryLabel}>Items Purchased</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderOptimizationInsights = () => (
    <Animated.View entering={FadeInUp.delay(200)} style={styles.optimizationCard}>
      <View style={styles.optimizationHeader}>
        {spendingAnalytics.optimizationUsed ? (
          <>
            <PiggyBank size={24} color="#10B981" />
            <Text style={styles.optimizationTitle}>You Optimized & Saved!</Text>
            <View style={styles.optimizationBadge}>
              <Text style={styles.optimizationBadgeText}>Savvy Saver</Text>
            </View>
          </>
        ) : (
          <>
            <AlertTriangle size={24} color="#F59E0B" />
            <Text style={styles.optimizationTitle}>You Could Have Saved More!</Text>
          </>
        )}
      </View>
      
      {spendingAnalytics.optimizationUsed ? (
        <View style={styles.savingsContent}>
          <View style={styles.savingsRow}>
            <Text style={styles.savingsLabel}>You Saved:</Text>
            <Text style={styles.savingsAmount}>
              {formatCurrency(spendingAnalytics.actualSavings, preferences.currency)}
            </Text>
          </View>
          <Text style={styles.savingsDescription}>
            Awesome! Using PikyCart's optimization helped you save on this trip.
          </Text>
        </View>
      ) : (
        <View style={styles.missedSavingsContent}>
          <View style={styles.missedSavingsRow}>
            <Text style={styles.missedSavingsLabel}>You Could Have Saved:</Text>
            <Text style={styles.missedSavingsAmount}>
              {formatCurrency(spendingAnalytics.potentialSavings, preferences.currency)}
            </Text>
          </View>
          <Text style={styles.missedSavingsDescription}>
            Next time, try PikyCart's optimization to find the best deals and save money.
          </Text>
          <TouchableOpacity 
            style={styles.learnMoreButton}
            onPress={() => {
              Alert.alert(
                'Unlock More Savings!',
                'PikyCart\'s optimization feature helps you compare prices and find the smartest shopping route. Give it a try on your next list!',
                [{ text: 'Sounds Good!' }]
              );
            }}
          >
            <Sparkles size={16} color="#8B5CF6" />
            <Text style={styles.learnMoreButtonText}>Tell Me More</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  const renderCategoryBreakdown = () => (
    <Animated.View entering={FadeInUp.delay(300)} style={styles.breakdownCard}>
      <View style={styles.breakdownHeader}>
        <BarChart3 size={24} color="#3B82F6" />
        <Text style={styles.breakdownTitle}>What You Bought (By Category)</Text>
      </View>
      
      {spendingAnalytics.categoryBreakdown.length > 0 ? (
        <View style={styles.breakdownList}>
          {spendingAnalytics.categoryBreakdown.map((category, index) => (
            <View key={category.category} style={styles.breakdownItem}>
              <View style={styles.breakdownItemLeft}>
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={styles.categoryName}>{category.category}</Text>
              </View>
              <View style={styles.breakdownItemRight}>
                <Text style={styles.categoryAmount}>
                  {formatCurrency(category.amount, preferences.currency)}
                </Text>
                <Text style={styles.categoryPercentage}>
                  {category.percentage.toFixed(0)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noDataText}>No category spending info for this list.</Text>
      )}
    </Animated.View>
  );

  const renderStoreBreakdown = () => (
    <Animated.View entering={FadeInUp.delay(400)} style={styles.breakdownCard}>
      <View style={styles.breakdownHeader}>
        <Store size={24} color="#8B5CF6" />
        <Text style={styles.breakdownTitle}>Where You Shopped</Text>
      </View>
      
      {spendingAnalytics.storeBreakdown.length > 0 ? (
        <View style={styles.breakdownList}>
          {spendingAnalytics.storeBreakdown.map((store, index) => (
            <View key={store.store} style={styles.breakdownItem}>
              <View style={styles.breakdownItemLeft}>
                <Text style={styles.storeName}>{store.store}</Text>
                <Text style={styles.storeItems}>{store.items} items</Text>
              </View>
              <View style={styles.breakdownItemRight}>
                <Text style={styles.storeAmount}>
                  {formatCurrency(store.amount, preferences.currency)}
                </Text>
                <Text style={styles.storePercentage}>
                  {store.percentage.toFixed(0)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noDataText}>No store spending info for this list.</Text>
      )}
    </Animated.View>
  );

  const renderItemsList = () => (
    <Animated.View entering={FadeInUp.delay(500)} style={styles.itemsCard}>
      <View style={styles.itemsHeader}>
        <ShoppingBag size={24} color="#374151" />
        <Text style={styles.itemsTitle}>Your Purchased Items</Text>
        <Text style={styles.itemsCount}>
          {spendingAnalytics.purchasedItems} of {spendingAnalytics.totalItems}
        </Text>
      </View>

      {groupedItems.map((storeGroup, storeIndex) => (
        <View key={storeGroup.storeName} style={styles.storeSection}>
          <View style={styles.storeHeader}>
            <Text style={styles.storeTitle}>{storeGroup.storeName}</Text>
            {storeGroup.totalPrice > 0 && (
              <Text style={styles.storeTotal}>
                {formatCurrency(storeGroup.totalPrice, preferences.currency)}
              </Text>
            )}
          </View>

          {storeGroup.categories.map((categoryGroup) => (
            <View key={categoryGroup.categoryName} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>
                {categoryGroup.categoryInfo.emoji} {categoryGroup.categoryInfo.label}
              </Text>

              {categoryGroup.items.map((item) => {
                const totalCost = item.price ? calculateItemTotalCost(item.price, item.quantity, item.price_per_unit) : 0;
                
                return (
                  <View key={item.id} style={[
                    styles.itemRow,
                    !item.is_purchased && styles.itemRowNotPurchased
                  ]}>
                    <View style={styles.itemLeft}>
                      <View style={[
                        styles.itemCheckbox,
                        item.is_purchased && styles.itemCheckboxChecked
                      ]}>
                        {item.is_purchased && <CheckCircle size={16} color="#10B981" />}
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={[
                          styles.itemName,
                          !item.is_purchased && styles.itemNameNotPurchased
                        ]}>
                          {item.name}
                        </Text>
                        <View style={styles.itemMeta}>
                          <Text style={styles.itemQuantity}>
                            {formatQuantityDisplay(item.quantity, item.quantity_unit || 'units')}
                          </Text>
                          {item.brand && (
                            <Text style={styles.itemBrand}>{item.brand}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                    
                    {item.price && item.is_purchased && (
                      <View style={styles.itemRight}>
                        <Text style={styles.itemPrice}>
                          {formatCurrency(totalCost, preferences.currency)}
                        </Text>
                        {item.price_per_unit && (
                          <Text style={styles.itemPriceUnit}>
                            {formatCurrency(item.price, preferences.currency)} / {item.quantity_unit}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {archivedList.name}
          </Text>
          <View style={styles.headerMeta}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.headerDate}>
              {formatDate(archivedList.updated_at)}
            </Text>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.headerTime}>
              {formatTime(archivedList.updated_at)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {renderSpendingSummary()}
          {renderOptimizationInsights()}
          {renderCategoryBreakdown()}
          {renderStoreBreakdown()}
          {renderItemsList()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  headerDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  headerTime: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
  optimizationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optimizationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  optimizationTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  optimizationBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  optimizationBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  savingsContent: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  savingsLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#166534',
  },
  savingsAmount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  savingsDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#166534',
    lineHeight: 20,
  },
  missedSavingsContent: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
  },
  missedSavingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missedSavingsLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
  },
  missedSavingsAmount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
  },
  missedSavingsDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 12,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  learnMoreButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    marginLeft: 6,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownItemRight: {
    alignItems: 'flex-end',
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  categoryAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  categoryPercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  storeName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  storeItems: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  storeAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  storePercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  itemsCount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  storeSection: {
    marginBottom: 20,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  storeTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  storeTotal: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 6,
  },
  itemRowNotPurchased: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCheckboxChecked: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  itemNameNotPurchased: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  itemQuantity: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  itemBrand: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  itemPriceUnit: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
});