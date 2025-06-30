import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Users, Crown, LocationEdit as Edit3, Eye, ShoppingCart } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface SharedList {
  id: string;
  name: string;
  description?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  item_count?: number;
  purchased_count?: number;
  my_role: 'owner' | 'editor' | 'viewer';
  owner?: {
    id: string;
    email?: string;
  };
  is_owner: boolean;
  is_collaborative: boolean;
}

interface SharedListsSectionProps {
  refreshTrigger?: number;
}

export default function SharedListsSection({ refreshTrigger }: SharedListsSectionProps) {
  const [sharedLists, setSharedLists] = useState<SharedList[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSharedLists();
  }, [refreshTrigger]);

  const fetchSharedLists = async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/lists/shared?is_archived=false', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch shared lists:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      setSharedLists(data.shared_lists || []);
    } catch (error) {
      console.error('Error fetching shared lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleListPress = (list: SharedList) => {
    router.push({
      pathname: '/list-details',
      params: { listId: list.id, listName: list.name }
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} color="#F59E0B" />;
      case 'editor':
        return <Edit3 size={16} color="#10B981" />;
      case 'viewer':
        return <Eye size={16} color="#6B7280" />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return '#F59E0B';
      case 'editor':
        return '#10B981';
      case 'viewer':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const renderSharedList = ({ item, index }: { item: SharedList; index: number }) => {
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
            <View style={styles.listIconContainer}>
              <Users size={20} color="#8B5CF6" />
            </View>
            <View style={styles.listInfo}>
              <View style={styles.listTitleRow}>
                <Text style={styles.listName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={[styles.roleChip, { backgroundColor: `${getRoleColor(item.my_role)}20` }]}>
                  {getRoleIcon(item.my_role)}
                  <Text style={[styles.roleText, { color: getRoleColor(item.my_role) }]}>
                    {item.my_role.charAt(0).toUpperCase() + item.my_role.slice(1)}
                  </Text>
                </View>
              </View>
              {item.description && (
                <Text style={styles.listDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
              {item.owner?.email && !item.is_owner && (
                <Text style={styles.ownerText}>
                  Owned by {item.owner.email}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.listStats}>
            <Text style={[
              styles.statsText,
              allItemsChecked && styles.statsTextReady
            ]}>
              {purchasedItems} of {totalItems} items
              {allItemsChecked && ' • Ready to complete!'}
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

          {allItemsChecked && item.is_owner && (
            <View style={styles.readyToCompleteActions}>
              <View style={styles.readyBadge}>
                <ShoppingCart size={16} color="#F59E0B" />
                <Text style={styles.readyBadgeText}>Ready to complete</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Users size={20} color="#8B5CF6" />
            <Text style={styles.sectionTitle}>Shared Lists</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading shared lists...</Text>
        </View>
      </View>
    );
  }

  if (sharedLists.length === 0) {
    return null; // Don't show section if no shared lists
  }

  return (
    <Animated.View entering={FadeInUp.delay(100)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Users size={20} color="#8B5CF6" />
          <Text style={styles.sectionTitle}>Shared Lists</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Lists shared with you by others
        </Text>
      </View>
      <FlatList
        data={sharedLists}
        keyExtractor={(item) => item.id}
        renderItem={renderSharedList}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 28,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 12,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listContent: {
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  listIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#F3E8FF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listInfo: {
    flex: 1,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  listDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  ownerText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
  },
  listStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginRight: 12,
  },
  statsTextReady: {
    color: '#F59E0B',
    fontFamily: 'Inter-SemiBold',
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  progressFillReady: {
    backgroundColor: '#F59E0B',
  },
  readyToCompleteActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  readyBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
    marginLeft: 6,
  },
  separator: {
    height: 12,
  },
});