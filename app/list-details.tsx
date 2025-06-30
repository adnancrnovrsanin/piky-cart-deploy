import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useShopping } from '@/contexts/ShoppingContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ListItem, ITEM_CATEGORIES, ItemCategory, StoreGroup, CategoryGroup, QuantityUnit, formatQuantityDisplay, calculateItemTotalCost, formatCurrency } from '@/types';
import { ArrowLeft, Plus, Check, Trash2, Search, CircleCheck as CheckCircle, ShoppingBag, Sparkles, TrendingDown, Store, DollarSign, LocationEdit as Edit3, Share, Users } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import AddItemModal from '@/components/AddItemModal';
import EditItemModal from '@/components/EditItemModal';
import EasyInputModal from '@/components/EasyInputModal';
import EmptyListState from '@/components/EmptyListState';
import OptimizeCartModal from '@/components/OptimizeCartModal';
import ShareModal from '@/components/ShareModal';
import CollaboratorModal from '@/components/CollaboratorModal';

export default function ListDetailsScreen() {
  const { listId, listName } = useLocalSearchParams<{
    listId: string;
    listName: string;
  }>();
  const {
    currentList,
    setCurrentList,
    lists,
    addItem,
    updateItem,
    deleteItem,
    toggleItemPurchased,
    completeList,
  } = useShopping();
  const { preferences } = useUserPreferences();
  const { user } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEasyInputModal, setShowEasyInputModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  
  // Add item states
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemQuantityUnit, setNewItemQuantityUnit] = useState<QuantityUnit>('units');
  const [newItemCategory, setNewItemCategory] = useState<ItemCategory>('other');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemStore, setNewItemStore] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemPricePerUnit, setNewItemPricePerUnit] = useState(false);
  
  // Edit item states
  const [editItemName, setEditItemName] = useState('');
  const [editItemQuantity, setEditItemQuantity] = useState('1');
  const [editItemQuantityUnit, setEditItemQuantityUnit] = useState<QuantityUnit>('units');
  const [editItemCategory, setEditItemCategory] = useState<ItemCategory>('other');
  const [editItemNotes, setEditItemNotes] = useState('');
  const [editItemStore, setEditItemStore] = useState('');
  const [editItemBrand, setEditItemBrand] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemPricePerUnit, setEditItemPricePerUnit] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Share-related state
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<'owner' | 'editor' | 'viewer'>('owner');

  // Find the list only when listId changes or lists are updated
  useEffect(() => {
    if (listId) {
      const foundList = lists.find((l) => l.id === listId);
      if (foundList && (!currentList || currentList.id !== foundList.id)) {
        setCurrentList(foundList);
      }
    }
  }, [listId, lists, currentList, setCurrentList]);

  // Check user permissions for the list
  useEffect(() => {
    const checkUserPermissions = async () => {
      if (!listId || !user) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`/api/lists/${listId}/collaborators`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const currentUserCollab = data.collaborators?.find((c: any) => c.user_id === user.id);
          if (currentUserCollab) {
            setUserRole(currentUserCollab.role);
            setIsOwner(currentUserCollab.role === 'owner');
          } else {
            // If not found in collaborators, assume owner (fallback for existing lists)
            setUserRole('owner');
            setIsOwner(true);
          }
        }
      } catch (error) {
        console.error('Error checking user permissions:', error);
        // Fallback to owner if there's an error
        setUserRole('owner');
        setIsOwner(true);
      }
    };

    checkUserPermissions();
  }, [listId, user]);

  const filteredItems =
    currentList?.items?.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.store && item.store.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];

  // Group items by store first, then by category within each store
  const groupedByStore = React.useMemo(() => {
    const storeGroups: Record<string, StoreGroup> = {};

    filteredItems.forEach((item) => {
      const storeName = item.store || 'Items not yet assigned to a store';
      
      if (!storeGroups[storeName]) {
        storeGroups[storeName] = {
          storeName,
          items: [],
          totalPrice: 0,
          categories: [],
        };
      }

      storeGroups[storeName].items.push(item);
      if (item.price) {
        const totalCost = calculateItemTotalCost(item.price, item.quantity, item.price_per_unit);
        storeGroups[storeName].totalPrice += totalCost;
      }
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
            totalPrice: 0,
          };
        }

        categoryGroups[categoryName].items.push(item);
        if (item.price) {
          const totalCost = calculateItemTotalCost(item.price, item.quantity, item.price_per_unit);
          categoryGroups[categoryName].totalPrice += totalCost;
        }
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
  }, [filteredItems]);

  // Check if all items are checked (ready to complete)
  const totalItems = currentList?.item_count || 0;
  const purchasedItems = currentList?.purchased_count || 0;
  const allItemsChecked = totalItems > 0 && purchasedItems === totalItems;

  // Check if cart has enough items for optimization (minimum 3 items)
  const canOptimize = filteredItems.length >= 3;

  // Calculate total estimated cost
  const totalEstimatedCost = filteredItems.reduce((total, item) => {
    if (item.price) {
      return total + calculateItemTotalCost(item.price, item.quantity, item.price_per_unit);
    }
    return total;
  }, 0);

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      setError('What item are you adding?');
      return;
    }

    // Check if user can edit
    if (userRole === 'viewer') {
      Alert.alert('View-Only Access', 'You can see this list, but you\'ll need to ask the owner to make changes.');
      return;
    }

    setLoading(true);
    setError(null);
    
    const price = newItemPrice.trim() ? parseFloat(newItemPrice.replace(/[^0-9.]/g, '')) : undefined;
    const quantity = parseFloat(newItemQuantity) || 1;
    
    const newItem = await addItem({
      list_id: listId!,
      name: newItemName.trim(),
      quantity: quantity,
      quantity_unit: newItemQuantityUnit,
      category: newItemCategory,
      notes: newItemNotes.trim() || undefined,
      store: newItemStore.trim() || undefined,
      brand: newItemBrand.trim() || undefined,
      price: price,
      price_per_unit: newItemPricePerUnit,
    });
    setLoading(false);

    if (newItem) {
      setNewItemName('');
      setNewItemQuantity('1');
      setNewItemQuantityUnit('units');
      setNewItemCategory('other');
      setNewItemNotes('');
      setNewItemStore('');
      setNewItemBrand('');
      setNewItemPrice('');
      setNewItemPricePerUnit(false);
      setShowAddModal(false);
    } else {
      setError('Couldn\'t add the item. Please try again.');
    }
  };

  const handleEditItem = (item: ListItem) => {
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemQuantity(item.quantity.toString());
    setEditItemQuantityUnit(item.quantity_unit || 'units');
    setEditItemCategory(item.category as ItemCategory);
    setEditItemNotes(item.notes || '');
    setEditItemStore(item.store || '');
    setEditItemBrand(item.brand || '');
    setEditItemPrice(item.price ? item.price.toString() : '');
    setEditItemPricePerUnit(item.price_per_unit || false);
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editItemName.trim()) {
      setEditError('What\'s the new name for this item?');
      return;
    }

    // Check if user can edit
    if (userRole === 'viewer') {
      Alert.alert('View-Only Access', 'You can see this list, but you\'ll need to ask the owner to make changes.');
      return;
    }

    setEditLoading(true);
    setEditError(null);
    
    const price = editItemPrice.trim() ? parseFloat(editItemPrice.replace(/[^0-9.]/g, '')) : undefined;
    const quantity = parseFloat(editItemQuantity) || 1;
    
    const success = await updateItem(editingItem.id, {
      name: editItemName.trim(),
      quantity: quantity,
      quantity_unit: editItemQuantityUnit,
      category: editItemCategory,
      notes: editItemNotes.trim() || undefined,
      store: editItemStore.trim() || undefined,
      brand: editItemBrand.trim() || undefined,
      price: price,
      price_per_unit: editItemPricePerUnit,
    });
    
    setEditLoading(false);

    if (success) {
      setShowEditModal(false);
      setEditingItem(null);
    } else {
      setEditError('Couldn\'t update the item. Please try again.');
    }
  };

  const handleEasyInputComplete = async (
    items: Array<{ name: string; quantity: number; category: string; brand?: string; quantity_unit?: string }>
  ) => {
    console.log('Easy input items:', items);
    // Add all items from AI parsing
    for (const item of items) {
      await addItem({
        list_id: listId!,
        name: item.name,
        quantity: item.quantity,
        quantity_unit: (item.quantity_unit as QuantityUnit) || 'units',
        category: item.category as ItemCategory,
        brand: item.brand,
      });
    }
    setShowEasyInputModal(false);
  };

  const handleOptimizationComplete = (optimization: any) => {
    // Here you would update the list with optimized prices/stores
    // For now, we'll just show a success message
    Alert.alert(
      'List Optimized!',
      `You're set to save ${formatCurrency(optimization.totalPotentialSavings, preferences.currency)}! Your list is updated with the best prices and stores.`,
      [{ text: 'Awesome!' }]
    );
  };

  const handleToggleItem = async (item: ListItem) => {
    // Check if user can edit
    if (userRole === 'viewer') {
      Alert.alert('View-Only Access', 'You can see this list, but you\'ll need to ask the owner to make changes.');
      return;
    }
    await toggleItemPurchased(item.id);
  };

  const handleDeleteItem = (item: ListItem) => {
    // Check if user can edit
    if (userRole === 'viewer') {
      Alert.alert('View-Only Access', 'You can see this list, but you\'ll need to ask the owner to make changes.');
      return;
    }

    Alert.alert('Remove Item?', `Are you sure you want to remove "${item.name}" from your list?`, [
      {
        text: 'Keep it',
        style: 'cancel',
      },
      {
        text: 'Yes, Remove',
        style: 'destructive',
        onPress: () => deleteItem(item.id),
      },
    ]);
  };

  const handleCompleteList = () => {
    // Only owners can complete lists
    if (!isOwner) {
      Alert.alert('Owner Action Only', 'Only the person who created this list can mark it as complete.');
      return;
    }

    Alert.alert(
      'Finish This List?',
      `Ready to mark "${listName}" as done? It'll be saved in your history.`,
      [
        {
          text: 'Not Yet',
          style: 'cancel',
        },
        {
          text: 'Yes, Finish',
          style: 'default',
          onPress: () => {
            completeList(listId!);
            router.back();
          },
        },
      ]
    );
  };

  const handleShareList = async () => {
    // Validate that we have a valid list before attempting to share
    if (!listId) {
      Alert.alert('Sharing Error', 'Which list do you want to share?');
      return;
    }

    if (!currentList || currentList.id !== listId) {
      Alert.alert(
        'List Not Found',
        'We can\'t find this list to share. Try refreshing or pick another list.',
        [{ text: 'Got it' }]
      );
      return;
    }
    
    setShareLoading(true);
    setShareError(null);
    
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setShareError('Please sign in to share lists.');
        setShareLoading(false);
        return;
      }

      // Call the share API
      const response = await fetch(`/api/lists/${listId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          expires_in: 30 * 24 * 60 * 60, // 30 days
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Couldn\'t create a share link. Please try again.');
      }

      setShareUrl(data.share_url);
      setShareExpiresAt(data.expires_at);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error sharing list:', error);
      setShareError(error instanceof Error ? error.message : 'Couldn\'t create a share link. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setShareUrl(null);
    setShareExpiresAt(null);
    setShareError(null);
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
          {storeGroup.totalPrice > 0 && (
            <View style={styles.storeTotalContainer}>
              <DollarSign size={16} color="#10B981" />
              <Text style={styles.storeTotal}>
                {formatCurrency(storeGroup.totalPrice, preferences.currency)}
              </Text>
            </View>
          )}
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
            <View style={styles.categoryHeaderRight}>
              {categoryGroup.totalPrice > 0 && (
                <Text style={styles.categoryTotal}>
                  {formatCurrency(categoryGroup.totalPrice, preferences.currency)}
                </Text>
              )}
              <Text style={styles.categoryCount}>
                {categoryGroup.items.length} {categoryGroup.items.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>

          {categoryGroup.items.map((item, itemIndex) => {
            const totalCost = item.price ? calculateItemTotalCost(item.price, item.quantity, item.price_per_unit) : 0;
            
            return (
              <Animated.View
                key={item.id}
                entering={FadeInUp.delay(index * 100 + categoryIndex * 50 + itemIndex * 25)}
                layout={Layout.springify()}
                style={[
                  styles.itemCard,
                  item.is_purchased && styles.itemCardPurchased,
                ]}
              >
                <TouchableOpacity
                  style={styles.itemContent}
                  onPress={() => handleToggleItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        item.is_purchased && styles.checkboxChecked,
                      ]}
                    >
                      {item.is_purchased && <Check size={16} color="#FFFFFF" />}
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
                        {item.price && (
                          <Text style={styles.itemPrice}>
                            {item.price_per_unit 
                              ? `${formatCurrency(item.price, preferences.currency)} per ${item.quantity_unit || 'unit'}`
                              : `${formatCurrency(item.price, preferences.currency)} total`
                            }
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

                  <View style={styles.itemRight}>
                    {item.price && (
                      <Text style={styles.itemTotalPrice}>
                        {formatCurrency(totalCost, preferences.currency)}
                      </Text>
                    )}
                    {userRole !== 'viewer' && (
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleEditItem(item);
                          }}
                        >
                          <Edit3 size={16} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item);
                          }}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
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
            {listName}
          </Text>
          <View style={styles.headerSubtitleContainer}>
            <Text
              style={[
                styles.headerSubtitle,
                allItemsChecked && styles.headerSubtitleReady,
              ]}
            >
              {filteredItems.length}{' '}
              {filteredItems.length === 1 ? 'item' : 'items'}
              {allItemsChecked && ' • Ready to complete!'}
            </Text>
            {totalEstimatedCost > 0 && (
              <Text style={styles.headerTotal}>
                Est. {formatCurrency(totalEstimatedCost, preferences.currency)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          {canOptimize && userRole !== 'viewer' && (
            <TouchableOpacity
              style={styles.optimizeButton}
              onPress={() => setShowOptimizeModal(true)}
            >
              <TrendingDown size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              style={styles.collaboratorButton}
              onPress={() => setShowCollaboratorModal(true)}
            >
              <Users size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareList}
            disabled={shareLoading}
          >
            {shareLoading ? (
              <ActivityIndicator size={20} color="#FFFFFF" />
            ) : (
              <Share size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          {userRole !== 'viewer' && (
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => setShowEasyInputModal(true)}
            >
              <Sparkles size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {userRole !== 'viewer' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {allItemsChecked && isOwner && (
        <Animated.View entering={FadeInUp} style={styles.readyToCompleteBanner}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconContainer}>
              <CheckCircle size={20} color="#F59E0B" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>All items checked!</Text>
              <Text style={styles.bannerSubtitle}>
                Ready to finish your shopping trip?
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.finishShoppingBannerButton}
            onPress={handleCompleteList}
          >
            <ShoppingBag size={16} color="#FFFFFF" />
            <Text style={styles.finishShoppingBannerButtonText}>
              Finish Shopping
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {allItemsChecked && !isOwner && (
        <Animated.View entering={FadeInUp} style={styles.readyToCompleteBanner}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerIconContainer}>
              <CheckCircle size={20} color="#F59E0B" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>All items checked!</Text>
              <Text style={styles.bannerSubtitle}>
                Waiting for the list owner to complete the shopping trip.
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {filteredItems.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <EmptyListState
            onAddItem={() => setShowAddModal(true)}
            onEasyInput={() => setShowEasyInputModal(true)}
          />
        </View>
      ) : (
        <>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Find items in this list..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <FlatList
            data={groupedByStore}
            keyExtractor={(item) => item.storeName}
            renderItem={renderStoreSection}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {userRole !== 'viewer' && (
        <AddItemModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddItem={handleAddItem}
          newItemName={newItemName}
          setNewItemName={setNewItemName}
          newItemQuantity={newItemQuantity}
          setNewItemQuantity={setNewItemQuantity}
          newItemQuantityUnit={newItemQuantityUnit}
          setNewItemQuantityUnit={setNewItemQuantityUnit}
          newItemCategory={newItemCategory}
          setNewItemCategory={setNewItemCategory}
          newItemNotes={newItemNotes}
          setNewItemNotes={setNewItemNotes}
          newItemStore={newItemStore}
          setNewItemStore={setNewItemStore}
          newItemBrand={newItemBrand}
          setNewItemBrand={setNewItemBrand}
          newItemPrice={newItemPrice}
          setNewItemPrice={setNewItemPrice}
          newItemPricePerUnit={newItemPricePerUnit}
          setNewItemPricePerUnit={setNewItemPricePerUnit}
          loading={loading}
          error={error}
        />
      )}

      {userRole !== 'viewer' && (
        <EditItemModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onUpdateItem={handleUpdateItem}
          item={editingItem}
          itemName={editItemName}
          setItemName={setEditItemName}
          itemQuantity={editItemQuantity}
          setItemQuantity={setEditItemQuantity}
          itemQuantityUnit={editItemQuantityUnit}
          setItemQuantityUnit={setEditItemQuantityUnit}
          itemCategory={editItemCategory}
          setItemCategory={setEditItemCategory}
          itemNotes={editItemNotes}
          setItemNotes={setEditItemNotes}
          itemStore={editItemStore}
          setItemStore={setEditItemStore}
          itemBrand={editItemBrand}
          setItemBrand={setEditItemBrand}
          itemPrice={editItemPrice}
          setItemPrice={setEditItemPrice}
          itemPricePerUnit={editItemPricePerUnit}
          setItemPricePerUnit={setEditItemPricePerUnit}
          loading={editLoading}
          error={editError}
        />
      )}

      {userRole !== 'viewer' && (
        <EasyInputModal
          visible={showEasyInputModal}
          onClose={() => setShowEasyInputModal(false)}
          onComplete={handleEasyInputComplete}
        />
      )}

      {userRole !== 'viewer' && (
        <OptimizeCartModal
          visible={showOptimizeModal}
          onClose={() => setShowOptimizeModal(false)}
          items={filteredItems}
          onOptimizationComplete={handleOptimizationComplete}
        />
      )}

      <ShareModal
        visible={showShareModal}
        onClose={handleCloseShareModal}
        listName={listName}
        listId={listId!}
        shareUrl={shareUrl}
        shareExpiresAt={shareExpiresAt}
        shareError={shareError}
        shareLoading={shareLoading}
      />

      <CollaboratorModal
        visible={showCollaboratorModal}
        onClose={() => setShowCollaboratorModal(false)}
        listId={listId!}
        listName={listName}
        isOwner={isOwner}
      />
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
  headerSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginRight: 8,
  },
  headerSubtitleReady: {
    color: '#F59E0B',
    fontFamily: 'Inter-SemiBold',
  },
  headerTotal: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  optimizeButton: {
    width: 40,
    height: 40,
    backgroundColor: '#10B981',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButton: {
    width: 40,
    height: 40,
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collaboratorButton: {
    width: 40,
    height: 40,
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyToCompleteBanner: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#FBBF24',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
  },
  bannerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#B45309',
    marginTop: 2,
  },
  finishShoppingBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  finishShoppingBannerButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  emptyStateContainer: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
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
  storeTotalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeTotal: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginLeft: 4,
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
  categoryHeaderRight: {
    alignItems: 'flex-end',
  },
  categoryTotal: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
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
    backgroundColor: '#10B981',
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
  itemPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
    marginRight: 12,
  },
  itemNotes: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemTotalPrice: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginBottom: 4,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
});