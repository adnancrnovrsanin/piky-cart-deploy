import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useShopping } from '@/contexts/ShoppingContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingList } from '@/types';
import { Archive, Calendar, Package, CircleCheck as CheckCircle, ListFilter as Filter, Import as SortAsc, X, ChevronDown, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { COLORS, FONTS, FONT_SIZES, SPACING, BORDER_RADIUS } from '@/constants/theme';

type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'items_desc' | 'items_asc';
type DateFilter = 'all' | 'last_week' | 'last_month' | 'last_3_months' | 'last_year';
type ItemCountFilter = 'all' | 'small' | 'medium' | 'large';

interface FilterState {
  dateFilter: DateFilter;
  itemCountFilter: ItemCountFilter;
  sortBy: SortOption;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date_desc', label: 'Date: Newest to Oldest' },
  { value: 'date_asc', label: 'Date: Oldest to Newest' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
  { value: 'items_desc', label: 'Items: Most to Fewest' },
  { value: 'items_asc', label: 'Items: Fewest to Most' },
];

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Any Date' },
  { value: 'last_week', label: 'Past Week' },
  { value: 'last_month', label: 'Past Month' },
  { value: 'last_3_months', label: 'Past 3 Months' },
  { value: 'last_year', label: 'Past Year' },
];

const ITEM_COUNT_FILTERS: { value: ItemCountFilter; label: string }[] = [
  { value: 'all', label: 'Any Size' },
  { value: 'small', label: 'Small Lists (1-5 items)' },
  { value: 'medium', label: 'Medium Lists (6-15 items)' },
  { value: 'large', label: 'Large Lists (16+ items)' },
];

export default function HistoryScreen() {
  const { user } = useAuth();
  const { archivedLists, refreshArchivedLists } = useShopping();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    dateFilter: 'all',
    itemCountFilter: 'all',
    sortBy: 'date_desc',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await refreshArchivedLists();
    } catch (error) {
      console.error('Error loading archived lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshArchivedLists();
    setRefreshing(false);
  };

  // Filter and sort logic
  const filteredAndSortedLists = useMemo(() => {
    // CRITICAL FIX: Filter lists to only include those owned by the current user
    let filtered = [...archivedLists].filter(list => list.user_id === user?.id);

    // Date filtering
    if (filters.dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filters.dateFilter) {
        case 'last_week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'last_month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'last_3_months':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'last_year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(list => 
        new Date(list.updated_at) >= cutoffDate
      );
    }

    // Item count filtering
    if (filters.itemCountFilter !== 'all') {
      filtered = filtered.filter(list => {
        const itemCount = list.item_count || 0;
        
        switch (filters.itemCountFilter) {
          case 'small':
            return itemCount >= 1 && itemCount <= 5;
          case 'medium':
            return itemCount >= 6 && itemCount <= 15;
          case 'large':
            return itemCount >= 16;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date_desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'date_asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'items_desc':
          return (b.item_count || 0) - (a.item_count || 0);
        case 'items_asc':
          return (a.item_count || 0) - (b.item_count || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [archivedLists, filters, user?.id]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.dateFilter !== 'all') count++;
    if (filters.itemCountFilter !== 'all') count++;
    return count;
  }, [filters]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const clearAllFilters = () => {
    setFilters({
      dateFilter: 'all',
      itemCountFilter: 'all',
      sortBy: 'date_desc',
    });
  };

  const handleListPress = (list: ShoppingList) => {
    router.push({
      pathname: '/archived-list-details',
      params: { 
        listId: list.id, 
        listName: list.name 
      }
    });
  };

  const FilterOption = ({ 
    title, 
    options, 
    selectedValue, 
    onSelect 
  }: {
    title: string;
    options: { value: string; label: string }[];
    selectedValue: string;
    onSelect: (value: any) => void;
  }) => (
    <View style={styles.filterOption}>
      <Text style={styles.filterOptionTitle}>{title}</Text>
      <View style={styles.filterButtons}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterButton,
              selectedValue === option.value && styles.filterModalButtonActive,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedValue === option.value && styles.filterButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderHistoryItem = ({ item, index }: { item: ShoppingList; index: number }) => {
    const totalItems = item.item_count || 0;
    const purchasedItems = item.purchased_count || 0;
    const completionRate = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 100)}
        layout={Layout.springify()}
        style={styles.historyCard}
      >
        <TouchableOpacity
          style={styles.historyCardContent}
          onPress={() => handleListPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.historyHeader}>
            <View style={styles.historyIconContainer}>
              <Archive size={20} color={COLORS.text} />
            </View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description && (
                <Text style={styles.historyDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
            </View>
            <View style={styles.historyDate}>
              <Calendar size={14} color={COLORS.border} />
              <Text style={styles.historyDateText}>
                {formatDate(item.updated_at)}
              </Text>
            </View>
            <ChevronRight size={16} color={COLORS.border} style={styles.chevronIcon} />
          </View>

          <View style={styles.historyStats}>
            <View style={styles.statItem}>
              <Package size={16} color={COLORS.text} />
              <Text style={styles.statText}>
                {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <CheckCircle size={16} color={COLORS.success} />
              <Text style={styles.statText}>
                {purchasedItems} Purchased
              </Text>
            </View>

            <View style={styles.completionRate}>
              <Text style={styles.completionText}>
                {completionRate.toFixed(0)}% Complete
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${completionRate}%` }
                  ]} 
                />
              </View>
            </View>
          </View>

          {item.items && item.items.length > 0 && (
            <View style={styles.itemsPreview}>
              <Text style={styles.itemsPreviewTitle}>Top Items:</Text>
              <Text style={styles.itemsPreviewText} numberOfLines={2}>
                {item.items
                  .slice(0, 5)
                  .map(item => item.name)
                  .join(', ')}
                {item.items.length > 5 && ` & ${item.items.length - 5} more`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <Animated.View entering={FadeInUp} style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Archive size={64} color={COLORS.gray300} />
      </View>
      <Text style={styles.emptyTitle}>
        {activeFiltersCount > 0 ? 'No Lists Match Your Filters' : 'Your Shopping History is Empty'}
      </Text>
      <Text style={styles.emptyDescription}>
        {activeFiltersCount > 0
          ? 'Try changing or clearing your filters to see more of your past lists.'
          : 'Once you complete a shopping list, it will show up here for your records.'
        }
      </Text>
      {activeFiltersCount > 0 && (
        <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
          <Text style={styles.clearFiltersButtonText}>Show All Lists</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Past Lists</Text>
          <Text style={styles.headerSubtitle}>Getting your shopping history...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Fetching your completed lists...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Your Past Lists</Text>
          <Text style={styles.headerSubtitle}>
            Showing {filteredAndSortedLists.length} of {archivedLists.filter(list => list.user_id === user?.id).length} completed {archivedLists.filter(list => list.user_id === user?.id).length === 1 ? 'list' : 'lists'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortModal(true)}
          >
            <SortAsc size={20} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButtonStyle, activeFiltersCount > 0 && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={20} color={activeFiltersCount > 0 ? COLORS.secondary : COLORS.text} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {filteredAndSortedLists.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={filteredAndSortedLists}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.secondary}
            />
          }
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Your History</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    filters.sortBy === option.value && styles.sortOptionActive,
                  ]}
                  onPress={() => {
                    setFilters(prev => ({ ...prev, sortBy: option.value }));
                    setShowSortModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      filters.sortBy === option.value && styles.sortOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {filters.sortBy === option.value && (
                    <CheckCircle size={20} color={COLORS.secondary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filtersModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Your History</Text>
              <View style={styles.modalHeaderActions}>
                {activeFiltersCount > 0 && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearAllFilters}
                  >
                    <Text style={styles.clearButtonText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <FilterOption
                title="Filter by Date Completed"
                options={DATE_FILTERS}
                selectedValue={filters.dateFilter}
                onSelect={(value) => setFilters(prev => ({ ...prev, dateFilter: value }))}
              />
              
              <FilterOption
                title="Filter by List Size (Number of Items)"
                options={ITEM_COUNT_FILTERS}
                selectedValue={filters.itemCountFilter}
                onSelect={(value) => setFilters(prev => ({ ...prev, itemCountFilter: value }))}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundAlt,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray300,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.h2,
    fontFamily: FONTS.heading.bold,
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.body2,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sortButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonStyle: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: COLORS.secondaryLight,
    borderColor: COLORS.secondary,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.secondary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: FONT_SIZES.caption,
    fontFamily: FONTS.heading.bold,
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZES.body1,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
  },
  listContainer: {
    padding: SPACING.md,
  },
  historyCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  historyCardContent: {
    padding: SPACING.md,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  historyIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: FONT_SIZES.body1,
    fontFamily: FONTS.heading.semiBold,
    color: COLORS.text,
  },
  historyDescription: {
    fontSize: FONT_SIZES.body2,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    marginTop: 2,
  },
  historyDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  historyDateText: {
    fontSize: FONT_SIZES.caption,
    fontFamily: FONTS.body.medium,
    color: COLORS.border,
    marginLeft: SPACING.xs,
  },
  chevronIcon: {
    marginLeft: SPACING.xs,
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: FONT_SIZES.caption,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  completionRate: {
    flex: 1,
    alignItems: 'flex-end',
  },
  completionText: {
    fontSize: FONT_SIZES.caption,
    fontFamily: FONTS.heading.semiBold,
    color: COLORS.success,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.gray300,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 2,
  },
  itemsPreview: {
    borderTopWidth: 1,
    borderTopColor: COLORS.backgroundAlt,
    paddingTop: SPACING.sm,
  },
  itemsPreviewTitle: {
    fontSize: FONT_SIZES.caption,
    fontFamily: FONTS.heading.semiBold,
    color: '#374151',
    marginBottom: SPACING.xs,
  },
  itemsPreviewText: {
    fontSize: FONT_SIZES.caption,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.h3,
    fontFamily: FONTS.heading.semiBold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyDescription: {
    fontSize: FONT_SIZES.body1,
    fontFamily: FONTS.body.regular,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  clearFiltersButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  clearFiltersButtonText: {
    fontSize: FONT_SIZES.body1,
    fontFamily: FONTS.heading.semiBold,
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  filtersModalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray300,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.h4,
    fontFamily: FONTS.heading.semiBold,
    color: COLORS.text,
  },
  clearButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: BORDER_RADIUS.sm,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.body2,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
  },
  modalContent: {
    padding: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  sortOptionActive: {
    backgroundColor: COLORS.secondaryLight,
  },
  sortOptionText: {
    fontSize: FONT_SIZES.body1,
    fontFamily: FONTS.body.medium,
    color: '#374151',
  },
  sortOptionTextActive: {
    color: COLORS.secondary,
    fontFamily: FONTS.heading.semiBold,
  },
  filterOption: {
    marginBottom: SPACING.xl,
  },
  filterOptionTitle: {
    fontSize: FONT_SIZES.body1,
    fontFamily: FONTS.heading.semiBold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  filterButtons: {
    gap: SPACING.sm,
  },
  filterButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  filterModalButtonActive: {
    backgroundColor: COLORS.secondaryLight,
    borderColor: COLORS.secondary,
  },
  filterButtonText: {
    fontSize: FONT_SIZES.body2,
    fontFamily: FONTS.body.medium,
    color: COLORS.text,
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: COLORS.secondary,
    fontFamily: FONTS.heading.semiBold,
  },
});