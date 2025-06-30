import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Mail, Check, X, Users, Clock } from 'lucide-react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/theme';

interface ShareInvitation {
  id: string;
  inviter_id: string;
  invitee_email: string;
  list_id: string;
  status: 'pending' | 'accepted' | 'declined';
  role: 'editor' | 'viewer';
  created_at: string;
  expires_at: string;
  list_name?: string;
  inviter_name?: string;
}

interface ShareInvitationsSectionProps {
  onInvitationAccepted?: () => void;
}

export default function ShareInvitationsSection({ onInvitationAccepted }: ShareInvitationsSectionProps) {
  const [invitations, setInvitations] = useState<ShareInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/share-invitations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setInvitations(data.invitations || []);
      } else {
        console.error('Failed to fetch invitations:', data.message);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string, listName: string) => {
    setActionLoading(invitationId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`/api/share-invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to accept invitation');

      // Remove invitation from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      Alert.alert(
        'Invitation Accepted',
        `You now have access to "${listName}". You can find it in your shared lists.`
      );

      onInvitationAccepted?.();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string, listName: string) => {
    Alert.alert(
      'Decline Invitation',
      `Are you sure you want to decline the invitation to "${listName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(invitationId);
            
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) throw new Error('Not authenticated');

              const response = await fetch(`/api/share-invitations/${invitationId}/decline`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });

              const data = await response.json();
              if (!response.ok) throw new Error(data.message || 'Failed to decline invitation');

              // Remove invitation from list
              setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
              
              Alert.alert('Invitation Declined', `You have declined the invitation to "${listName}".`);
            } catch (error) {
              console.error('Error declining invitation:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to decline invitation');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const renderInvitation = ({ item, index }: { item: ShareInvitation; index: number }) => {
    const expired = isExpired(item.expires_at);
    const isLoading = actionLoading === item.id;

    return (
      <Animated.View
        entering={FadeInUp.delay(index * 100)}
        layout={Layout.springify()}
        style={[styles.invitationCard, expired && styles.invitationCardExpired]}
      >
        <View style={styles.invitationContent}>
          <View style={styles.invitationHeader}>
            <View style={styles.invitationIconContainer}>
              <Mail size={20} color={COLORS.secondary} />
            </View>
            <View style={styles.invitationInfo}>
              <Text style={styles.invitationTitle} numberOfLines={1}>
                {item.list_name || 'Shopping List'}
              </Text>
              <Text style={styles.invitationSubtitle}>
                Invited by {item.inviter_name || 'someone'} • {formatTimeAgo(item.created_at)}
              </Text>
              <View style={styles.invitationMeta}>
                <View style={[styles.roleChip, { backgroundColor: item.role === 'editor' ? COLORS.success + '15' : COLORS.gray100 }]}>
                  <Text style={[
                    styles.roleText,
                    { color: item.role === 'editor' ? COLORS.success : COLORS.border }
                  ]}>
                    {item.role === 'editor' ? 'Can Edit' : 'View Only'}
                  </Text>
                </View>
                {expired && (
                  <View style={styles.expiredChip}>
                    <Clock size={12} color={COLORS.error} />
                    <Text style={styles.expiredText}>Expired</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {!expired && (
            <View style={styles.invitationActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => handleDeclineInvitation(item.id, item.list_name || 'Shopping List')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size={16} color={COLORS.border} />
                ) : (
                  <X size={16} color={COLORS.border} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptInvitation(item.id, item.list_name || 'Shopping List')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size={16} color={COLORS.white} />
                ) : (
                  <Check size={16} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Mail size={20} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Pending Invitations</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.loadingText}>Loading invitations...</Text>
        </View>
      </View>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show section if no invitations
  }

  return (
    <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Mail size={20} color={COLORS.secondary} />
          <Text style={styles.sectionTitle}>Pending Invitations</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Accept invitations to collaborate on shared lists
        </Text>
      </View>
      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id}
        renderItem={renderInvitation}
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
  invitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  invitationCardExpired: {
    opacity: 0.6,
  },
  invitationContent: {
    padding: 16,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  invitationIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#EBF4FF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  invitationSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  invitationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  expiredChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  expiredText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginLeft: 4,
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#F3F4F6',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  separator: {
    height: 12,
  },
});