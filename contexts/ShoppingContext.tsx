import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { OfflineStorage } from '@/lib/storage';
import { useAuth } from './AuthContext';
import { useUserPreferences } from './UserPreferencesContext';
import { ShoppingList, ListItem, CreateListData, CreateItemData, UpdateItemData, ShoppingState } from '@/types';

interface ShoppingContextType extends ShoppingState {
  // Lists
  createList: (data: CreateListData) => Promise<ShoppingList | null>;
  updateList: (id: string, data: Partial<CreateListData>) => Promise<boolean>;
  deleteList: (id: string) => Promise<boolean>;
  archiveList: (id: string) => Promise<boolean>;
  completeList: (id: string) => Promise<boolean>;
  setCurrentList: (list: ShoppingList | null) => void;
  
  // Items
  addItem: (data: CreateItemData) => Promise<ListItem | null>;
  updateItem: (id: string, data: UpdateItemData) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  toggleItemPurchased: (id: string) => Promise<boolean>;
  
  // Sync
  syncData: () => Promise<void>;
  refreshLists: () => Promise<void>;
  loadArchivedLists: () => Promise<ShoppingList[]>;
  
  // History management
  archivedLists: ShoppingList[];
  refreshArchivedLists: () => Promise<void>;
  
  // Collaboration
  sharedLists: ShoppingList[];
  refreshSharedLists: () => Promise<void>;
}

type ShoppingAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LISTS'; payload: ShoppingList[] }
  | { type: 'ADD_LIST'; payload: ShoppingList }
  | { type: 'UPDATE_LIST'; payload: { id: string; data: Partial<ShoppingList> } }
  | { type: 'REMOVE_LIST'; payload: string }
  | { type: 'SET_CURRENT_LIST'; payload: ShoppingList | null }
  | { type: 'ADD_ITEM'; payload: { listId: string; item: ListItem } }
  | { type: 'UPDATE_ITEM'; payload: { listId: string; itemId: string; data: Partial<ListItem> } }
  | { type: 'REMOVE_ITEM'; payload: { listId: string; itemId: string } }
  | { type: 'SET_ARCHIVED_LISTS'; payload: ShoppingList[] }
  | { type: 'ADD_ARCHIVED_LIST'; payload: ShoppingList }
  | { type: 'SET_SHARED_LISTS'; payload: ShoppingList[] }
  | { type: 'ADD_SHARED_LIST'; payload: ShoppingList }
  | { type: 'REMOVE_SHARED_LIST'; payload: string };

const initialState: ShoppingState & { archivedLists: ShoppingList[]; sharedLists: ShoppingList[] } = {
  lists: [],
  currentList: null,
  loading: false,
  error: null,
  archivedLists: [],
  sharedLists: [],
};

function shoppingReducer(state: ShoppingState & { archivedLists: ShoppingList[]; sharedLists: ShoppingList[] }, action: ShoppingAction): ShoppingState & { archivedLists: ShoppingList[]; sharedLists: ShoppingList[] } {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_LISTS':
      return { ...state, lists: action.payload, loading: false };
    
    case 'ADD_LIST':
      return { 
        ...state, 
        lists: [action.payload, ...state.lists],
        loading: false 
      };
    
    case 'UPDATE_LIST':
      return {
        ...state,
        lists: state.lists.map(list =>
          list.id === action.payload.id 
            ? { ...list, ...action.payload.data }
            : list
        ),
        currentList: state.currentList?.id === action.payload.id
          ? { ...state.currentList, ...action.payload.data }
          : state.currentList,
      };
    
    case 'REMOVE_LIST':
      return {
        ...state,
        lists: state.lists.filter(list => list.id !== action.payload),
        currentList: state.currentList?.id === action.payload ? null : state.currentList,
      };
    
    case 'SET_CURRENT_LIST':
      return { ...state, currentList: action.payload };
    
    case 'ADD_ITEM':
      return {
        ...state,
        lists: state.lists.map(list =>
          list.id === action.payload.listId
            ? { 
                ...list, 
                items: [action.payload.item, ...(list.items || [])],
                item_count: (list.item_count || 0) + 1
              }
            : list
        ),
        currentList: state.currentList?.id === action.payload.listId
          ? { 
              ...state.currentList, 
              items: [action.payload.item, ...(state.currentList.items || [])],
              item_count: (state.currentList.item_count || 0) + 1
            }
          : state.currentList,
      };
    
    case 'UPDATE_ITEM':
      return {
        ...state,
        lists: state.lists.map(list =>
          list.id === action.payload.listId
            ? {
                ...list,
                items: list.items?.map(item =>
                  item.id === action.payload.itemId
                    ? { ...item, ...action.payload.data }
                    : item
                ) || [],
                purchased_count: list.items?.filter(item => 
                  item.id === action.payload.itemId 
                    ? action.payload.data.is_purchased ?? item.is_purchased
                    : item.is_purchased
                ).length || 0
              }
            : list
        ),
        currentList: state.currentList?.id === action.payload.listId
          ? {
              ...state.currentList,
              items: state.currentList.items?.map(item =>
                item.id === action.payload.itemId
                  ? { ...item, ...action.payload.data }
                  : item
              ) || [],
              purchased_count: state.currentList.items?.filter(item => 
                item.id === action.payload.itemId 
                  ? action.payload.data.is_purchased ?? item.is_purchased
                  : item.is_purchased
              ).length || 0
            }
          : state.currentList,
      };
    
    case 'REMOVE_ITEM':
      return {
        ...state,
        lists: state.lists.map(list =>
          list.id === action.payload.listId
            ? { 
                ...list, 
                items: list.items?.filter(item => item.id !== action.payload.itemId) || [],
                item_count: Math.max(0, (list.item_count || 0) - 1)
              }
            : list
        ),
        currentList: state.currentList?.id === action.payload.listId
          ? { 
              ...state.currentList, 
              items: state.currentList.items?.filter(item => item.id !== action.payload.itemId) || [],
              item_count: Math.max(0, (state.currentList.item_count || 0) - 1)
            }
          : state.currentList,
      };
    
    case 'SET_ARCHIVED_LISTS':
      return { ...state, archivedLists: action.payload };
    
    case 'ADD_ARCHIVED_LIST':
      return {
        ...state,
        archivedLists: [action.payload, ...state.archivedLists]
      };
    
    case 'SET_SHARED_LISTS':
      return { ...state, sharedLists: action.payload };
    
    case 'ADD_SHARED_LIST':
      return {
        ...state,
        sharedLists: [action.payload, ...state.sharedLists]
      };
    
    case 'REMOVE_SHARED_LIST':
      return {
        ...state,
        sharedLists: state.sharedLists.filter(list => list.id !== action.payload),
      };
    
    default:
      return state;
  }
}

const ShoppingContext = createContext<ShoppingContextType | undefined>(undefined);

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shoppingReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { preferences } = useUserPreferences();

  // Load initial data
  useEffect(() => {
    if (isAuthenticated && user) {
      loadLists();
      loadArchivedListsData();
      loadSharedListsData();
    } else {
      dispatch({ type: 'SET_LISTS', payload: [] });
      dispatch({ type: 'SET_ARCHIVED_LISTS', payload: [] });
      dispatch({ type: 'SET_SHARED_LISTS', payload: [] });
    }
  }, [isAuthenticated, user]);

  // Set up real-time subscriptions for collaborative lists
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const setupRealtimeSubscriptions = () => {
      // Subscribe to list items changes for collaborative lists
      const itemsSubscription = supabase
        .channel('list_items_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'list_items',
          },
          (payload: any) => {
            console.log('Real-time item change:', payload);
            // Handle granular updates instead of full refresh
            if (payload.eventType === 'INSERT') {
              const newItem: ListItem = payload.new as ListItem;
              dispatch({
                type: 'ADD_ITEM',
                payload: {
                  listId: newItem.list_id,
                  item: newItem
                }
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedItem: ListItem = payload.new as ListItem;
              dispatch({
                type: 'UPDATE_ITEM',
                payload: {
                  listId: updatedItem.list_id,
                  itemId: updatedItem.id,
                  data: updatedItem
                }
              });
            } else if (payload.eventType === 'DELETE') {
              const deletedItem: ListItem = payload.old as ListItem;
              dispatch({
                type: 'REMOVE_ITEM',
                payload: {
                  listId: deletedItem.list_id,
                  itemId: deletedItem.id
                }
              });
            }
          }
        )
        .subscribe();

      // Subscribe to shopping list changes
      const listsSubscription = supabase
        .channel('shopping_lists_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shopping_lists',
            filter: `is_collaborative=eq.true`,
          },
          (payload: any) => {
            console.log('Real-time list change:', payload);
            // Handle granular updates for lists
            if (payload.eventType === 'INSERT') {
              const newList: ShoppingList = payload.new as ShoppingList;
              dispatch({ type: 'ADD_SHARED_LIST', payload: newList });
            } else if (payload.eventType === 'UPDATE') {
              const updatedList: ShoppingList = payload.new as ShoppingList;
              dispatch({
                type: 'UPDATE_LIST',
                payload: { id: updatedList.id, data: updatedList }
              });
            } else if (payload.eventType === 'DELETE') {
              dispatch({ type: 'REMOVE_SHARED_LIST', payload: payload.old.id });
            }
            
            // Only refresh shared lists metadata
            loadSharedListsData();
          }
        )
        .subscribe();

      return () => {
        itemsSubscription.unsubscribe();
        listsSubscription.unsubscribe();
      };
    };

    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, [isAuthenticated, user]);

  const loadLists = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Load only active lists (not archived) for the main lists view
      const { data: lists, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          items:list_items(*)
        `)
        .eq('is_archived', false)
        .eq('user_id', user!.id) // CRITICAL FIX: Filter by current user ID
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (lists) {
        const formattedLists = lists.map(list => ({
          ...list,
          items: list.items || [],
          item_count: list.item_count || 0,
          purchased_count: list.purchased_count || 0,
        }));
        
        dispatch({ type: 'SET_LISTS', payload: formattedLists });
        await OfflineStorage.saveLists(formattedLists);
      }
    } catch (error) {
      // Fallback to offline storage
      console.warn('Failed to load from Supabase, using offline data:', error);
      const offlineLists = await OfflineStorage.getLists();
      dispatch({ type: 'SET_LISTS', payload: offlineLists });
    }
  };

  const loadArchivedListsData = async () => {
    try {
      // Load archived lists for history view
      const { data: archivedLists, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          items:list_items(*)
        `)
        .eq('is_archived', true)
        .eq('user_id', user!.id) // CRITICAL FIX: Filter by current user ID
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (archivedLists) {
        const formattedLists = archivedLists.map(list => ({
          ...list,
          items: list.items || [],
          item_count: list.item_count || 0,
          purchased_count: list.purchased_count || 0,
        }));
        
        dispatch({ type: 'SET_ARCHIVED_LISTS', payload: formattedLists });
      }
    } catch (error) {
      console.error('Failed to load archived lists:', error);
    }
  };

  const loadArchivedLists = async (): Promise<ShoppingList[]> => {
    return state.archivedLists;
  };

  const refreshArchivedLists = async () => {
    await loadArchivedListsData();
  };

  const loadSharedListsData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/lists/shared', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const formattedLists = (data.shared_lists || []).map((list: any) => ({
          ...list,
          items: list.items || [],
          item_count: list.item_count || 0,
          purchased_count: list.purchased_count || 0,
        }));
        
        dispatch({ type: 'SET_SHARED_LISTS', payload: formattedLists });
      }
    } catch (error) {
      console.error('Failed to load shared lists:', error);
    }
  };

  const refreshSharedLists = async () => {
    await loadSharedListsData();
  };

  const createList = async (data: CreateListData): Promise<ShoppingList | null> => {
    try {
      const newList: Omit<ShoppingList, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user!.id,
        name: data.name,
        description: data.description,
        is_archived: false,
        items: [],
        item_count: 0,
        purchased_count: 0,
      };

      // Try Supabase first
      const { data: createdList, error } = await supabase
        .from('shopping_lists')
        .insert([{
          user_id: user!.id,
          name: data.name,
          description: data.description,
          is_archived: false
        }])
        .select()
        .single();

      if (error) throw error;

      if (createdList) {
        const listWithItems = { 
          ...createdList, 
          items: [], 
          item_count: 0, 
          purchased_count: 0 
        };
        dispatch({ type: 'ADD_LIST', payload: listWithItems });
        return listWithItems;
      }
    } catch (error) {
      console.error('Error creating list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create list' });
    }
    
    return null;
  };

  const updateList = async (id: string, data: Partial<CreateListData>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      dispatch({ type: 'UPDATE_LIST', payload: { id, data } });
      return true;
    } catch (error) {
      console.error('Error updating list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update list' });
      return false;
    }
  };

  const deleteList = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      dispatch({ type: 'REMOVE_LIST', payload: id });
      return true;
    } catch (error) {
      console.error('Error deleting list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete list' });
      return false;
    }
  };

  const archiveList = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      dispatch({ type: 'REMOVE_LIST', payload: id });
      return true;
    } catch (error) {
      console.error('Error archiving list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to archive list' });
      return false;
    }
  };

  const completeList = async (id: string): Promise<boolean> => {
    try {
      // First get the list data before archiving
      const listToComplete = state.lists.find(list => list.id === id);
      
      const { error } = await supabase
        .from('shopping_lists')
        .update({ 
          is_archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Remove from active lists
      dispatch({ type: 'REMOVE_LIST', payload: id });
      
      // Add to archived lists if we have the list data
      if (listToComplete) {
        const archivedList = {
          ...listToComplete,
          is_archived: true,
          updated_at: new Date().toISOString()
        };
        dispatch({ type: 'ADD_ARCHIVED_LIST', payload: archivedList });
      } else {
        // If we don't have the list data, refresh archived lists
        await loadArchivedListsData();
      }
      
      return true;
    } catch (error) {
      console.error('Error completing list:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to complete list' });
      return false;
    }
  };

  const setCurrentList = (list: ShoppingList | null) => {
    dispatch({ type: 'SET_CURRENT_LIST', payload: list });
  };

  const addItem = async (data: CreateItemData): Promise<ListItem | null> => {
    try {
      const newItem: Omit<ListItem, 'id' | 'created_at' | 'updated_at'> = {
        list_id: data.list_id,
        name: data.name,
        quantity: data.quantity || 1,
        quantity_unit: data.quantity_unit || 'units',
        category: data.category || 'other',
        notes: data.notes,
        store: data.store,
        brand: data.brand,
        price: data.price,
        price_per_unit: data.price_per_unit || false,
        is_purchased: false,
        priority: data.priority || 0,
      };

      // Store prices in USD in the database, but don't add currency info
      // The UI will handle currency conversion for display
      const { data: createdItem, error } = await supabase
        .from('list_items')
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;

      if (createdItem) {
        dispatch({ 
          type: 'ADD_ITEM', 
          payload: { listId: data.list_id, item: createdItem } 
        });
        return createdItem;
      }
    } catch (error) {
      console.error('Error adding item:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add item' });
    }
    
    return null;
  };

  const updateItem = async (id: string, data: UpdateItemData): Promise<boolean> => {
    try {
      const { data: updatedItem, error } = await supabase
        .from('list_items')
        .update(data)
        .eq('id', id)
        .select('list_id')
        .single();

      if (error) throw error;

      if (updatedItem) {
        dispatch({ 
          type: 'UPDATE_ITEM', 
          payload: { listId: updatedItem.list_id, itemId: id, data } 
        });
        return true;
      }
    } catch (error) {
      console.error('Error updating item:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update item' });
    }
    
    return false;
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    try {
      const { data: deletedItem, error } = await supabase
        .from('list_items')
        .delete()
        .eq('id', id)
        .select('list_id')
        .single();

      if (error) throw error;

      if (deletedItem) {
        dispatch({ 
          type: 'REMOVE_ITEM', 
          payload: { listId: deletedItem.list_id, itemId: id } 
        });
        return true;
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete item' });
    }
    
    return false;
  };

  const toggleItemPurchased = async (id: string): Promise<boolean> => {
    const currentItem = state.currentList?.items?.find(item => item.id === id);
    if (!currentItem) return false;
    
    return updateItem(id, { is_purchased: !currentItem.is_purchased });
  };

  const syncData = async () => {
    if (!isAuthenticated) return;
    
    try {
      await loadLists();
      await loadArchivedListsData();
      await OfflineStorage.setSyncStatus(true);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const refreshLists = async () => {
    await loadLists();
  };

  const value: ShoppingContextType = {
    ...state,
    createList,
    updateList,
    deleteList,
    archiveList,
    completeList,
    setCurrentList,
    addItem,
    updateItem,
    deleteItem,
    toggleItemPurchased,
    syncData,
    refreshLists,
    loadArchivedLists,
    refreshArchivedLists,
    refreshSharedLists,
  };

  return (
    <ShoppingContext.Provider value={value}>
      {children}
    </ShoppingContext.Provider>
  );
}

export function useShopping() {
  const context = useContext(ShoppingContext);
  if (context === undefined) {
    throw new Error('useShopping must be used within a ShoppingProvider');
  }
  return context;
}