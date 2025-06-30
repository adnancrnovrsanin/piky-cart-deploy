import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useShopping } from '@/contexts/ShoppingContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingList } from '@/types';
import { ShoppingCart, Plus, MoreVertical, CheckCircle, Archive, Trash2, RotateCcw, Clock, TrendingUp, Calendar, X, Package, Copy } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import ShareInvitationsSection from '@/components/ShareInvitationsSection';
import SharedListsSection from '@/components/SharedListsSection';
import { COLORS, SPACING, BORDER_RADIUS, TEXT_STYLES, BUTTON_STYLES, SHADOWS, FONTS, FONT_SIZES } from '@/constants/theme';

interface RepeatedList {
  list: ShoppingList;
  repetitionCount: number;
  lastCompleted: string;
  averageItemCount: number;
}

interface RecentList {
  list: ShoppingList;
  completedDate: string;
  itemCount: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { lists, loading, refreshLists, deleteList, completeList, archivedLists, refreshArchivedLists, createList, addItem } = useShopping();
  const [refreshing, setRefreshing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedList, setSelectedList] = useState<{ list: ShoppingList; source: 'repeated' | 'recent' } | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [sharedListsRefreshTrigger, setSharedListsRefreshTrigger] = useState(0);

  useEffect(() => {
    if (user) {
      refreshArchivedLists();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshLists(), refreshArchivedLists()]);
    // Trigger refresh of shared lists
    setSharedListsRefreshTrigger(prev => prev + 1);
    setRefreshing(false);
  };

  const handleInvitationAccepted = () => {
    // Refresh shared lists when an invitation is accepted
    setSharedListsRefreshTrigger(prev => prev + 1);
    // Also refresh regular lists in case it affects the main list view
    refreshLists();
  };

  // Calculate frequently repeated lists from history
  const frequentlyRepeatedLists = useMemo(() => {
    if (!archivedLists.length) return [];

    // Group lists by name (assuming similar names indicate repeated shopping patterns)
    const listGroups: Record<string, ShoppingList[]> = {};
    
    archivedLists.forEach(list => {
      const normalizedName = list.name.toLowerCase().trim();
      if (!listGroups[normalizedName]) {
        listGroups[normalizedName] = [];
      }
      listGroups[normalizedName].push(list);
    });

    // Calculate repetition data for each group
    const repeatedLists: RepeatedList[] = Object.entries(listGroups)
      .filter(([_, lists]) => lists.length >= 2) // Only show lists that were repeated at least once
      .map(([name, lists]) => {
        const sortedLists = lists.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        
        const mostRecentList = sortedLists[0];
        const averageItemCount = lists.reduce((sum, list) => sum + (list.item_count || 0), 0) / lists.length;
        
        return {
          list: mostRecentList,
          repetitionCount: lists.length,
          lastCompleted: mostRecentList.updated_at,
          averageItemCount: Math.round(averageItemCount),
        };
      })
      .sort((a, b) => {
        // Sort by repetition count first, then by recency
        if (b.repetitionCount !== a.repetitionCount) {
          return b.repetitionCount - a.repetitionCount;
        }
        return new Date(b.lastCompleted).getTime() - new Date(a.lastCompleted).getTime();
      })
      .slice(0, 3); // Show max 3 repeated lists

    return repeatedLists;
  }, [archivedLists]);

  // Calculate recent unrepeated lists
  const recentUnrepeatedLists = useMemo(() => {
    if (!archivedLists.length || frequentlyRepeatedLists.length > 0) return [];

    // Get list names that have been repeated
    const repeatedListNames = new Set(
      frequentlyRepeatedLists.map(item => item.list.name.toLowerCase().trim())
    );

    // Find recent lists that haven't been repeated
    const recentLists: RecentList[] = archivedLists
      .filter(list => {
        const normalizedName = list.name.toLowerCase().trim();
        return !repeatedListNames.has(normalizedName);
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4) // Show max 4 recent lists
      .map(list => ({
        list,
        completedDate: list.updated_at,
        itemCount: list.item_count || 0,
      }));

    return recentLists;
  }, [archivedLists, frequentlyRepeatedLists]);

  // Show suggestion section when user has 5 or fewer active lists
  const showSuggestions = lists.length <= 5 && (frequentlyRepeatedLists.length > 0 || recentUnrepeatedLists.length > 0);

  const handleListPress = (list: ShoppingList) => {
    router.push({
      pathname: '/list-details',
      params: { listId: list.id, listName: list.name }
    });
  };

  const handleDeleteList = (list: ShoppingList) => {
    Alert.alert(
      'Delete This List?',
      `Are you sure you want to permanently delete "${list.name}"? You won't be able to get it back.`,
      [
        {
          text: 'Keep It',
          style: 'cancel',
        },
        {
          text: 'Yes, Delete It',
          style: 'destructive',
          onPress: () => deleteList(list.id),
        },
      ]
    );
  };

  const handleCompleteList = (list: ShoppingList) => {
    Alert.alert(
      'Finish This List?',
      `Ready to mark "${list.name}" as done? It'll be saved in your shopping history.`,
      [
        {
          text: 'Not Yet',
          style: 'cancel',
        },
        {
          text: 'Yes, Finish',
          style: 'default',
          onPress: () => completeList(list.id),
        },
      ]
    );
  };

  const handleMenuPress = (list: ShoppingList) => {
    Alert.alert(
      list.name,
      'What would you like to do with this list?',
      [
        {
          text: 'Nevermind',
          style: 'cancel',
        },
        {
          text: 'Finish & Archive',
          onPress: () => handleCompleteList(list),
        },
        {
          text: 'Delete List',
          style: 'destructive',
          onPress: () => handleDeleteList(list),
        },
      ]
    );
  };

  const handleSuggestedListPress = (list: ShoppingList, source: 'repeated' | 'recent') => {
    setSelectedList({ list, source });
    setShowConfirmModal(true);
  };

  const handleConfirmRecreate = async () => {
    if (!selectedList) return;

    setIsCreatingList(true);
    try {
      const { list, source } = selectedList;
      
      // Create a new list based on the selected list
      const newList = await createList({
        name: list.name,
        description: list.description || `Based on your list from ${new Date(list.updated_at).toLocaleDateString()}`,
      });

      if (newList && list.items) {
        // Add all items from the original list
        for (const item of list.items) {
          await addItem({
            list_id: newList.id,
            name: item.name,
            quantity: item.quantity,
            quantity_unit: item.quantity_unit,
            category: item.category,
            notes: item.notes,
            store: item.store,
            brand: item.brand,
            price: item.price,
            price_per_unit: item.price_per_unit,
            priority: item.priority,
          });
        }

        setShowConfirmModal(false);
        setSelectedList(null);

        // Navigate to the new list
        router.push({
          pathname: '/list-details',
          params: { listId: newList.id, listName: newList.name }
        });
      }
    } catch (error) {
      console.error('Error recreating list:', error);
      Alert.alert('Oops!', 'Something went wrong while recreating the list. Please give it another try.');
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleCancelRecreate = () => {
    setShowConfirmModal(false);
    setSelectedList(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    const weeks = Math.ceil(diffDays / 7);
    if (weeks === 1) return '1 week ago';
    if (weeks < 5) return `${weeks} weeks ago`; // Up to 4 weeks
    const months = Math.ceil(diffDays / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;
    const years = Math.ceil(diffDays / 365);
    if (years === 1) return '1 year ago';
    return `${years} years ago`;
  };

  // Helper function to get display name with proper truncation
  const getDisplayName = () => {
    if (!user) return 'Shopper';
    
    // Try display_name first, then extract from email, then fallback
    const name = user.display_name || user.email?.split('@')[0] || 'Shopper';
    
    // Truncate if too long (more than 15 characters)
    if (name.length > 15) {
      return name.substring(0, 12) + '...';
    }
    
    return name;
  };

  const renderListItem = ({ item, index }: { item: ShoppingList; index: number }) => {
    const totalItems = item.item_count || 0;
    const purchasedItems = item.purchased_count || 0;
    const progress = totalItems > 0 ? purchasedItems / totalItems : 0;
    const allItemsChecked = progress === 1 && totalItems > 0;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 100)}
        layout={Layout.springify()}
        style={styles.listCard}
      >
        <TouchableOpacity
          style={styles.listContent}
          onPress={() => handleListPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.listHeader}>
            <View style={[
              styles.listIconContainer,
              allItemsChecked && styles.listIconContainerReady
            ]}>
              {allItemsChecked ? (
                <CheckCircle size={20} color={COLORS.accent} />
              ) : (
                <ShoppingCart size={20} color={COLORS.primary} />
              )}
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description && (
                <Text style={styles.listDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => handleMenuPress(item)}
            >
              <MoreVertical size={16} color={COLORS.gray600} />
            </TouchableOpacity>
          </View>

          <View style={styles.listStats}>
            <Text style={[
              styles.statsText,
              allItemsChecked && styles.statsTextReady
            ]}>
              {purchasedItems} of {totalItems} items
              {allItemsChecked && ' • All set!'}
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` },
                    allItemsChecked && styles.progressFillReady
                  ]}
                />
              </View>
            </View>
          </View>

          {allItemsChecked && (
            <View style={styles.readyToCompleteActions}>
              <TouchableOpacity
                style={styles.finishShoppingButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCompleteList(item);
                }}
              >
                <CheckCircle size={16} color={COLORS.white} />
                <Text style={styles.finishShoppingButtonText}>Finish & Archive</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRepeatedListItem = ({ item: repeatedList, index }: { item: RepeatedList; index: number }) => (
    <Animated.View
      entering={FadeInUp.delay((lists.length + index) * 100)}
      layout={Layout.springify()}
      style={styles.repeatedListCard}
    >
      <TouchableOpacity
        style={styles.repeatedListContent}
        onPress={() => handleSuggestedListPress(repeatedList.list, 'repeated')}
        activeOpacity={0.7}
      >
        <View style={styles.repeatedListHeader}>
          <View style={styles.repeatedListIconContainer}>
            <RotateCcw size={20} color={COLORS.secondary} />
          </View>
          <View style={styles.repeatedListInfo}>
            <Text style={styles.repeatedListName} numberOfLines={1}>
              {repeatedList.list.name}
            </Text>
            <View style={styles.repeatedListMeta}>
              <View style={styles.repeatedListMetaItem}>
                <TrendingUp size={12} color={COLORS.secondary} />
                <Text style={styles.repeatedListMetaText}>
                  Used {repeatedList.repetitionCount} times
                </Text>
              </View>
              <View style={styles.repeatedListMetaItem}>
                <Clock size={12} color={COLORS.gray600} />
                <Text style={styles.repeatedListMetaText}>
                  Last used {formatDate(repeatedList.lastCompleted)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.repeatedListStats}>
            <Text style={styles.repeatedListItemCount}>
              About {repeatedList.averageItemCount} items
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderRecentListItem = ({ item: recentList, index }: { item: RecentList; index: number }) => (
    <Animated.View
      entering={FadeInUp.delay((lists.length + frequentlyRepeatedLists.length + index) * 100)}
      layout={Layout.springify()}
      style={styles.recentListCard}
    >
      <TouchableOpacity
        style={styles.recentListContent}
        onPress={() => handleSuggestedListPress(recentList.list, 'recent')}
        activeOpacity={0.7}
      >
        <View style={styles.recentListHeader}>
          <View style={styles.recentListIconContainer}>
            <Calendar size={20} color={COLORS.success} />
          </View>
          <View style={styles.recentListInfo}>
            <Text style={styles.recentListName} numberOfLines={1}>
              {recentList.list.name}
            </Text>
            <View style={styles.recentListMeta}>
              <View style={styles.recentListMetaItem}>
                <Clock size={12} color={COLORS.gray600} />
                <Text style={styles.recentListMetaText}>
                  Finished {formatDate(recentList.completedDate)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.recentListStats}>
            <Text style={styles.recentListItemCount}>
              {recentList.itemCount} {recentList.itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderConfirmationModal = () => {
    if (!selectedList) return null;

    const { list, source } = selectedList;
    const isRepeated = source === 'repeated';

    return (
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelRecreate}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[
                  styles.modalIconContainer,
                  { backgroundColor: isRepeated ? '#F3E8FF' : '#ECFDF5' }
                ]}>
                  {isRepeated ? (
                    <RotateCcw size={24} color={COLORS.secondary} />
                  ) : (
                    <Copy size={24} color={COLORS.success} />
                  )}
                </View>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>
                    {isRepeated ? 'Start This List Again?' : 'Use This List Again?'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    This will create a new, active list based on "{list.name}".
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleCancelRecreate}
              >
                <X size={24} color={COLORS.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.listPreview}>
                <View style={styles.listPreviewHeader}>
                  <Text style={styles.listPreviewTitle}>{list.name}</Text>
                  {list.description && (
                    <Text style={styles.listPreviewDescription}>{list.description}</Text>
                  )}
                  <View style={styles.listPreviewMeta}>
                    <View style={styles.listPreviewMetaItem}>
                      <Package size={16} color={COLORS.gray600} />
                      <Text style={styles.listPreviewMetaText}>
                        {list.item_count || 0} items
                      </Text>
                    </View>
                    <View style={styles.listPreviewMetaItem}>
                      <Clock size={16} color={COLORS.gray600} />
                      <Text style={styles.listPreviewMetaText}>
                        Completed {formatDate(list.updated_at)}
                      </Text>
                    </View>
                  </View>
                </View>

                {list.items && list.items.length > 0 && (
                  <View style={styles.itemsPreview}>
                    <Text style={styles.itemsPreviewTitle}>Items to be added:</Text>
                    <View style={styles.itemsPreviewList}>
                      {list.items.slice(0, 8).map((item, index) => (
                        <View key={item.id} style={styles.previewItem}>
                          <Text style={styles.previewItemName}>{item.name}</Text>
                          <Text style={styles.previewItemQuantity}>
                            {item.quantity} {item.quantity_unit || 'units'}
                          </Text>
                        </View>
                      ))}
                      {list.items.length > 8 && (
                        <Text style={styles.moreItemsText}>
                          +{list.items.length - 8} more items
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.confirmationNote}>
                <Text style={styles.confirmationNoteText}>
                  {isRepeated 
                    ? 'This will create a new shopping list with all the items from your frequently repeated list. You can modify it after creation.'
                    : 'This will create a new shopping list with all the items from your previous list. You can modify it after creation.'
                  }
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelRecreate}
                disabled={isCreatingList}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: isRepeated ? COLORS.secondary : COLORS.success },
                  isCreatingList && styles.confirmButtonDisabled
                ]}
                onPress={handleConfirmRecreate}
                disabled={isCreatingList}
              >
                {isCreatingList ? (
                  <Text style={styles.confirmButtonText}>Creating...</Text>
                ) : (
                  <>
                    {isRepeated ? (
                      <RotateCcw size={20} color={COLORS.white} />
                    ) : (
                      <Copy size={20} color={COLORS.white} />
                    )}
                    <Text style={styles.confirmButtonText}>
                      {isRepeated ? 'Repeat List' : 'Recreate List'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const EmptyState = () => (
    <Animated.View entering={FadeInUp} style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <ShoppingCart size={64} color={COLORS.gray400} />
      </View>
      <Text style={styles.emptyTitle}>No Shopping Lists Yet</Text>
      <Text style={styles.emptyDescription}>
        Create your first shopping list to get started organizing your shopping
      </Text>
      <TouchableOpacity
        style={styles.createFirstListButton}
        onPress={() => router.push('/(tabs)/add-list')}
      >
        <Plus size={20} color={COLORS.white} />
        <Text style={styles.createFirstListButtonText}>Create Your First List</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting} numberOfLines={1}>
            Hello, {getDisplayName()}!
          </Text>
          <Text style={styles.subtitle}>Manage your shopping lists</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/add-list')}
        >
          <Plus size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {lists.length === 0 && !showSuggestions ? (
        <EmptyState />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={styles.listsContainer}>
              {/* Share Invitations Section */}
              <ShareInvitationsSection onInvitationAccepted={handleInvitationAccepted} />
              
              {/* Shared Lists Section */}
              <SharedListsSection refreshTrigger={sharedListsRefreshTrigger} />

              {/* Active Lists Section */}
              {lists.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Active Lists</Text>
                  {lists.map((item, index) => (
                    <View key={item.id}>
                      {renderListItem({ item, index })}
                    </View>
                  ))}
                </View>
              )}

              {/* Frequently Repeated Lists Section */}
              {frequentlyRepeatedLists.length > 0 && (
                <Animated.View 
                  entering={FadeInUp.delay(lists.length * 100 + 200)} 
                  style={styles.section}
                >
                  <View style={styles.suggestionSectionHeader}>
                    <View style={styles.suggestionSectionTitleContainer}>
                      <RotateCcw size={20} color={COLORS.secondary} />
                      <Text style={styles.suggestionSectionTitle}>Frequently Repeated</Text>
                    </View>
                    <Text style={styles.suggestionSectionSubtitle}>
                      Tap to recreate your common shopping lists
                    </Text>
                  </View>
                  {frequentlyRepeatedLists.map((item, index) => (
                    <View key={`repeated-${item.list.id}-${index}`}>
                      {renderRepeatedListItem({ item, index })}
                    </View>
                  ))}
                </Animated.View>
              )}

              {/* Recent Lists Section (shown when no repeated lists) */}
              {recentUnrepeatedLists.length > 0 && frequentlyRepeatedLists.length === 0 && (
                <Animated.View 
                  entering={FadeInUp.delay(lists.length * 100 + 200)} 
                  style={styles.section}
                >
                  <View style={styles.suggestionSectionHeader}>
                    <View style={styles.suggestionSectionTitleContainer}>
                      <Calendar size={20} color={COLORS.success} />
                      <Text style={styles.suggestionSectionTitle}>Recent Lists</Text>
                    </View>
                    <Text style={styles.suggestionSectionSubtitle}>
                      Recreate from your shopping history
                    </Text>
                  </View>
                  {recentUnrepeatedLists.map((item, index) => (
                    <View key={`recent-${item.list.id}-${index}`}>
                      {renderRecentListItem({ item, index })}
                    </View>
                  ))}
                </Animated.View>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {renderConfirmationModal()}
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerContent: {
    flex: 1,
    minWidth: 0, // Allow flex child to shrink
  },
  greeting: {
    ...TEXT_STYLES.h2,
    // Ensure text doesn't overflow
    flexShrink: 1,
  },
  subtitle: {
    ...TEXT_STYLES.body2,
    color: COLORS.gray600,
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md, // Add margin to ensure spacing
    flexShrink: 0, // Prevent button from shrinking
    ...SHADOWS.small,
  },
  listsContainer: {
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TEXT_STYLES.h3,
    marginBottom: SPACING.sm,
    marginLeft: 4,
  },
  suggestionSectionHeader: {
    marginBottom: SPACING.md,
  },
  suggestionSectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionSectionTitle: {
    ...TEXT_STYLES.h3,
    marginLeft: SPACING.sm,
  },
  suggestionSectionSubtitle: {
    ...TEXT_STYLES.body2,
    color: COLORS.gray600,
    marginLeft: 28,
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  listContent: {
    padding: SPACING.md,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  listIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  listIconContainerReady: {
    backgroundColor: `${COLORS.accent}15`,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    ...TEXT_STYLES.h5,
  },
  listDescription: {
    ...TEXT_STYLES.body2,
    color: COLORS.gray600,
    marginTop: 2,
  },
  menuButton: {
    padding: SPACING.sm,
  },
  listStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statsText: {
    ...TEXT_STYLES.caption,
    color: COLORS.gray600,
    marginRight: SPACING.sm,
  },
  statsTextReady: {
    color: COLORS.accent,
    fontFamily: FONTS.heading.semiBold,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 2,
  },
  progressFillReady: {
    backgroundColor: COLORS.accent,
  },
  readyToCompleteActions: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.accent}20`,
  },
  finishShoppingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  finishShoppingButtonText: {
    ...TEXT_STYLES.button,
    marginLeft: 6,
  },
  repeatedListCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}20`,
    ...SHADOWS.small,
  },
  repeatedListContent: {
    padding: SPACING.sm,
  },
  repeatedListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repeatedListIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: `${COLORS.secondary}15`,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  repeatedListInfo: {
    flex: 1,
  },
  repeatedListName: {
    ...TEXT_STYLES.h5,
    fontSize: FONT_SIZES.body1,
    marginBottom: 4,
  },
  repeatedListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  repeatedListMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repeatedListMetaText: {
    ...TEXT_STYLES.caption,
    color: COLORS.gray600,
    marginLeft: 4,
  },
  repeatedListStats: {
    alignItems: 'flex-end',
  },
  repeatedListItemCount: {
    ...TEXT_STYLES.caption,
    color: COLORS.secondary,
    fontFamily: FONTS.heading.medium,
  },
  recentListCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: `${COLORS.success}20`,
    ...SHADOWS.small,
  },
  recentListContent: {
    padding: SPACING.sm,
  },
  recentListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentListIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: `${COLORS.success}15`,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  recentListInfo: {
    flex: 1,
  },
  recentListName: {
    ...TEXT_STYLES.h5,
    fontSize: FONT_SIZES.body1,
    marginBottom: 4,
  },
  recentListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentListMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentListMetaText: {
    ...TEXT_STYLES.caption,
    color: COLORS.gray600,
    marginLeft: 4,
  },
  recentListStats: {
    alignItems: 'flex-end',
  },
  recentListItemCount: {
    ...TEXT_STYLES.caption,
    color: COLORS.success,
    fontFamily: FONTS.heading.medium,
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
    backgroundColor: COLORS.gray200,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TEXT_STYLES.h2,
    marginBottom: SPACING.sm,
  },
  emptyDescription: {
    ...TEXT_STYLES.body1,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  createFirstListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  createFirstListButtonText: {
    ...TEXT_STYLES.button,
    marginLeft: SPACING.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
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
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    ...TEXT_STYLES.h3,
  },
  modalSubtitle: {
    ...TEXT_STYLES.body2,
    color: COLORS.gray600,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  listPreview: {
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.md,
  },
  listPreviewHeader: {
    marginBottom: SPACING.md,
  },
  listPreviewTitle: {
    ...TEXT_STYLES.h4,
    marginBottom: 4,
  },
  listPreviewDescription: {
    ...TEXT_STYLES.body2,
    color: COLORS.gray600,
    marginBottom: SPACING.sm,
  },
  listPreviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  listPreviewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listPreviewMetaText: {
    ...TEXT_STYLES.body2,
    color: COLORS.text,
    marginLeft: 6,
  },
  itemsPreview: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: SPACING.md,
  },
  itemsPreviewTitle: {
    ...TEXT_STYLES.h5,
    marginBottom: SPACING.sm,
  },
  itemsPreviewList: {
    gap: SPACING.sm,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
  },
  previewItemName: {
    ...TEXT_STYLES.body2,
    color: COLORS.text,
    flex: 1,
  },
  previewItemQuantity: {
    ...TEXT_STYLES.caption,
    color: COLORS.gray600,
  },
  moreItemsText: {
    ...TEXT_STYLES.body2,
    color: COLORS.secondary,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  confirmationNote: {
    backgroundColor: `${COLORS.secondary}10`,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  confirmationNoteText: {
    ...TEXT_STYLES.body2,
    color: COLORS.secondary,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    gap: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray200,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...TEXT_STYLES.button,
    color: COLORS.text,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    ...TEXT_STYLES.button,
    marginLeft: SPACING.sm,
  },
});