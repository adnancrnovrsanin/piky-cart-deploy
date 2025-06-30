import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { ITEM_CATEGORIES, ItemCategory, StoreGroup, CategoryGroup, formatQuantityDisplay, SharedListData } from '@/types';
import { ArrowLeft, CheckCircle, Store, ExternalLink } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

export default function SharedListScreen() {
  const { shareToken } = useLocalSearchParams<{ shareToken: string }>();
  const { preferences } = useUserPreferences();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedListData, setSharedListData] = useState<SharedListData | null>(null);

  useEffect(() => {
    if (shareToken) {
      fetchSharedList();
    }
  }, [shareToken]);

  const fetchSharedList = async () => {
    if (!shareToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/shared-lists/${shareToken}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError('Oops! This link isn\'t working. It might have been removed or changed.');
        } else if (response.status === 410) {
          setError('This link has expired. Please ask for a new one.');
        } else {
          setError(data.message || 'Couldn\'t load the list right now.');
        }
        return;
      }

      setSharedListData(data);
    } catch (error) {
      console.error('Error fetching shared list:', error);
      setError('We\'re having trouble connecting. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Group items by store first, then by category within each store
  const groupedByStore = React.useMemo(() => {
    if (!sharedListData?.list.items) return [];

    const storeGroups: Record<string, StoreGroup> = {};

    sharedListData.list.items.forEach((item: any) => {
      const storeName = item.store || 'Items not yet assigned to a store';
      
      if (!storeGroups[storeName]) {
        storeGroups[storeName] = {
          storeName,
          items: [],
          totalPrice: 0, // We don't show prices in shared view
          categories: [],
        };
      }

      storeGroups[storeName].items.push(item);
    });

    // Now group by category within each store
    Object.values(storeGroups).forEach((storeGroup) => {
      const categoryGroups: Record<string, CategoryGroup> = {};

      storeGroup.items.forEach((item) => {
        const categoryName = item.category;
        
        if (!categoryGroups[categoryName]) {
          const categoryInfo = ITEM_CATEGORIES.find(cat => cat.value === categoryName) || 
            { value: 'other' as ItemCategory, label: 'Other', emoji: '📦' };
          
          categoryGroups[categoryName] = {
            categoryName,
            categoryInfo,
            items: [],
            totalPrice: 0, // We don't show prices in shared view
          };
        }

        categoryGroups[categoryName].items.push(item);
      });

      storeGroup.categories = Object.values(categoryGroups).sort((a, b) => 
        a.categoryInfo.label.localeCompare(b.categoryInfo.label)
      );
    });

    return Object.values(storeGroups).sort((a, b) => {
      // Sort by: 1) Items with stores first, 2) Alphabetically
      if (a.storeName === 'Items not yet assigned to a store' && b.storeName !== 'Items not yet assigned to a store') return 1;
      if (a.storeName !== 'Items not yet assigned to a store' && b.storeName === 'Items not yet assigned to a store') return -1;
      return a.storeName.localeCompare(b.storeName);
    });
  }, [sharedListData]);

  const handleOpenApp = () => {
    Alert.alert(
      'Try PikyCart!',
      'Ready to organize your own shopping? Get the PikyCart app to create and manage your lists!',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Get PikyCart', onPress: () => {
          // In a real app, this would open the app store
          console.log('Open app store');
        }}
      ]
    );
  };

  const renderStoreSection = ({
    item: storeGroup,
    index,
  }: {
    item: StoreGroup;
    index: number;
  }) => (
    <Animated.View
      entering={FadeInUp.delay(index * 100)}
      layout={Layout.springify()}
      style={styles.storeSection}
    >
      <View style={styles.storeHeader}>
        <View style={styles.storeHeaderLeft}>
          <Store size={20} color="#3B82F6" />
          <Text style={styles.storeTitle}>{storeGroup.storeName}</Text>
        </View>
        <View style={styles.storeHeaderRight}>
          <Text style={styles.storeItemCount}>
            {storeGroup.items.length} {storeGroup.items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {storeGroup.categories.map((categoryGroup, categoryIndex) => (
        <View key={categoryGroup.categoryName} style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>
              {categoryGroup.categoryInfo.emoji} {categoryGroup.categoryInfo.label}
            </Text>
            <Text style={styles.categoryCount}>
              {categoryGroup.items.length} {categoryGroup.items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {categoryGroup.items.map((item, itemIndex) => (
            <Animated.View
              key={item.id}
              entering={FadeInUp.delay(index * 100 + categoryIndex * 50 + itemIndex * 25)}
              layout={Layout.springify()}
              style={[
                styles.itemCard,
                item.is_purchased && styles.itemCardPurchased,
              ]}
            >
              <View style={styles.itemContent}>
                <View style={styles.itemLeft}>
                  <View
                    style={[
                      styles.checkbox,
                      item.is_purchased && styles.checkboxChecked,
                    ]}
                  >
                    {item.is_purchased && <CheckCircle size={16} color="#10B981" />}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text
                      style={[
                        styles.itemName,
                        item.is_purchased && styles.itemNamePurchased,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemQuantity}>
                        {formatQuantityDisplay(item.quantity, item.quantity_unit || 'units')}
                      </Text>
                      {item.brand && (
                        <Text style={styles.itemBrand}>
                          {item.brand}
                        </Text>
                      )}
                      {item.notes && (
                        <Text style={styles.itemNotes} numberOfLines={1}>
                          {item.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      ))}
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading the list...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shared List</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Couldn't Load List</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchSharedList}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!sharedListData) {
    return null;
  }

  const { list, metadata } = sharedListData;

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
            {list.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            Shared List • {metadata.item_count} {metadata.item_count === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.getAppButton}
          onPress={handleOpenApp}
        >
          <ExternalLink size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.sharedBanner}>
        <Text style={styles.sharedBannerText}>
          You're viewing a shared list. To make changes, open it in the PikyCart app.
        </Text>
      </View>

      {groupedByStore.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>This List is Empty</Text>
          <Text style={styles.emptyMessage}>Looks like nothing's here yet. The list owner can add items in the app!</Text>
        </View>
      ) : (
        <FlatList
          data={groupedByStore}
          keyExtractor={(item) => item.storeName}
          renderItem={renderStoreSection}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Shared via PikyCart
        </Text>
        <TouchableOpacity onPress={handleOpenApp}>
          <Text style={styles.footerLink}>Get PikyCart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
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
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  headerSpacer: {
    width: 48,
  },
  getAppButton: {
    padding: 8,
  },
  sharedBanner: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  sharedBannerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E40AF',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  storeSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  storeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  storeHeaderRight: {
    alignItems: 'flex-end',
  },
  storeItemCount: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  categorySection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  categoryCount: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  itemCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardPurchased: {
    opacity: 0.6,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  itemNamePurchased: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  itemQuantity: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginRight: 12,
  },
  itemBrand: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    marginRight: 12,
  },
  itemNotes: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginRight: 8,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
});