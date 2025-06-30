import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Users, Mail, UserPlus, UserMinus, Settings, X, Crown, Edit3, Eye } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Collaborator {
  id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  user_email?: string;
  user_display_name?: string;
  created_at: string;
}

interface CollaboratorModalProps {
  visible: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  isOwner: boolean;
}

export default function CollaboratorModal({
  visible,
  onClose,
  listId,
  listName,
  isOwner,
}: CollaboratorModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchCollaborators();
    }
  }, [visible, listId]);

  const fetchCollaborators = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`/api/lists/${listId}/collaborators`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch collaborators');

      setCollaborators(data.collaborators || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      setError(error instanceof Error ? error.message : 'Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCollaborator = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setInviting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`/api/lists/${listId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send invitation');

      Alert.alert(
        'Invitation Sent',
        `An invitation has been sent to ${inviteEmail}. They will be able to accept it from their app.`
      );
      
      setInviteEmail('');
      setInviteRole('editor');
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      setError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (collaboratorUserId: string, newRole: 'editor' | 'viewer') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`/api/lists/${listId}/collaborators/${collaboratorUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update role');

      // Update local state
      setCollaborators(prev => 
        prev.map(collab => 
          collab.user_id === collaboratorUserId 
            ? { ...collab, role: newRole }
            : collab
        )
      );

      Alert.alert('Success', 'Collaborator role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleRemoveCollaborator = async (collaboratorUserId: string, userName: string) => {
    Alert.alert(
      'Remove Collaborator',
      `Are you sure you want to remove ${userName} from this list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) throw new Error('Not authenticated');

              const response = await fetch(`/api/lists/${listId}/collaborators/${collaboratorUserId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });

              const data = await response.json();
              if (!response.ok) throw new Error(data.message || 'Failed to remove collaborator');

              // Update local state
              setCollaborators(prev => prev.filter(collab => collab.user_id !== collaboratorUserId));
              Alert.alert('Success', 'Collaborator removed successfully');
            } catch (error) {
              console.error('Error removing collaborator:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove collaborator');
            }
          }
        }
      ]
    );
  };

  const handleLeaveList = async () => {
    Alert.alert(
      'Leave List',
      `Are you sure you want to leave "${listName}"? You will no longer have access to this list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) throw new Error('Not authenticated');

              const response = await fetch(`/api/lists/${listId}/leave`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                },
              });

              const data = await response.json();
              if (!response.ok) throw new Error(data.message || 'Failed to leave list');

              Alert.alert('Success', 'You have left the list successfully');
              onClose();
            } catch (error) {
              console.error('Error leaving list:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to leave list');
            }
          }
        }
      ]
    );
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

  const renderCollaborator = ({ item }: { item: Collaborator }) => (
    <View style={styles.collaboratorItem}>
      <View style={styles.collaboratorInfo}>
        <View style={styles.collaboratorHeader}>
          <Text style={styles.collaboratorName}>
            {item.user_display_name || item.user_email || 'Unknown User'}
          </Text>
          <View style={[styles.roleChip, { backgroundColor: `${getRoleColor(item.role)}20` }]}>
            {getRoleIcon(item.role)}
            <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          </View>
        </View>
        {item.user_email && item.user_display_name && (
          <Text style={styles.collaboratorEmail}>{item.user_email}</Text>
        )}
      </View>

      {isOwner && item.role !== 'owner' && (
        <View style={styles.collaboratorActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                'Change Role',
                `Change role for ${item.user_display_name || item.user_email}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Make Editor',
                    onPress: () => handleUpdateRole(item.user_id, 'editor'),
                    style: item.role === 'editor' ? 'cancel' : 'default'
                  },
                  {
                    text: 'Make Viewer',
                    onPress: () => handleUpdateRole(item.user_id, 'viewer'),
                    style: item.role === 'viewer' ? 'cancel' : 'default'
                  }
                ]
              );
            }}
          >
            <Settings size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => handleRemoveCollaborator(
              item.user_id,
              item.user_display_name || item.user_email || 'Unknown User'
            )}
          >
            <UserMinus size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Collaborators</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>"{listName}"</Text>
            <Text style={styles.sectionDescription}>
              Manage who can access and edit this shopping list
            </Text>
          </View>

          {isOwner && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Invite Collaborator</Text>
              <View style={styles.inviteForm}>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      inviteRole === 'editor' && styles.roleOptionSelected
                    ]}
                    onPress={() => setInviteRole('editor')}
                  >
                    <Edit3 size={16} color={inviteRole === 'editor' ? '#FFFFFF' : '#10B981'} />
                    <Text style={[
                      styles.roleOptionText,
                      inviteRole === 'editor' && styles.roleOptionTextSelected
                    ]}>
                      Editor
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      inviteRole === 'viewer' && styles.roleOptionSelected
                    ]}
                    onPress={() => setInviteRole('viewer')}
                  >
                    <Eye size={16} color={inviteRole === 'viewer' ? '#FFFFFF' : '#6B7280'} />
                    <Text style={[
                      styles.roleOptionText,
                      inviteRole === 'viewer' && styles.roleOptionTextSelected
                    ]}>
                      Viewer
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.inviteButton, inviting && styles.inviteButtonDisabled]}
                  onPress={handleInviteCollaborator}
                  disabled={inviting}
                >
                  {inviting ? (
                    <ActivityIndicator size={20} color="#FFFFFF" />
                  ) : (
                    <UserPlus size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.inviteButtonText}>
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Collaborators</Text>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading collaborators...</Text>
              </View>
            ) : (
              <FlatList
                data={collaborators}
                keyExtractor={(item) => item.id}
                renderItem={renderCollaborator}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Users size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No collaborators yet</Text>
                    <Text style={styles.emptySubtext}>
                      {isOwner ? 'Invite people to collaborate on this list' : 'Only you have access to this list'}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>

          {!isOwner && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={handleLeaveList}
              >
                <UserMinus size={20} color="#EF4444" />
                <Text style={styles.leaveButtonText}>Leave List</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  inviteForm: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  roleOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  roleOptionTextSelected: {
    color: '#FFFFFF',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 12,
  },
  collaboratorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  collaboratorInfo: {
    flex: 1,
  },
  collaboratorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  collaboratorName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    flex: 1,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  collaboratorEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  collaboratorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removeButton: {
    backgroundColor: '#FEF2F2',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  leaveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginLeft: 8,
  },
});