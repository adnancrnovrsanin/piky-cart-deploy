import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Clipboard,
  ScrollView,
  TextInput,
} from 'react-native';
import { Link, Users, Mail, UserPlus, Share } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/constants/theme';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  listName: string;
  listId: string;
  shareUrl: string | null;
  shareExpiresAt: string | null;
  shareError: string | null;
  shareLoading: boolean;
}

export default function ShareModal({
  visible,
  onClose,
  listName,
  listId,
  shareUrl,
  shareExpiresAt,
  shareError,
  shareLoading,
}: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'collaborate'>('collaborate');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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
    setInviteError(null);

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
      setInviteError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    
    try {
      await Clipboard.setString(shareUrl);
      Alert.alert('Copied!', 'Share link copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Share List</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'collaborate' && styles.tabActive]}
            onPress={() => setActiveTab('collaborate')}
          >
            <Users size={20} color={activeTab === 'collaborate' ? COLORS.secondary : COLORS.border} />
            <Text style={[
              styles.tabText,
              activeTab === 'collaborate' && styles.tabTextActive
            ]}>
              Collaborate
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'link' && styles.tabActive]}
            onPress={() => setActiveTab('link')}
          >
            <Link size={20} color={activeTab === 'link' ? COLORS.secondary : COLORS.border} />
            <Text style={[
              styles.tabText,
              activeTab === 'link' && styles.tabTextActive
            ]}>
              Share Link
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'collaborate' ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Invite Collaborators</Text>
                <Text style={styles.description}>
                  Invite others to collaborate on "{listName}". They can edit items and help you manage the list.
                </Text>
              </View>

              {inviteError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{inviteError}</Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Send Invitation</Text>
                <View style={styles.inviteForm}>
                  <View style={styles.inputContainer}>
                    <Mail size={20} color={COLORS.border} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor={COLORS.border}
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
                      <Text style={[
                        styles.roleOptionText,
                        inviteRole === 'editor' && styles.roleOptionTextSelected
                      ]}>
                        Editor - Can add and edit items
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.roleOption,
                        inviteRole === 'viewer' && styles.roleOptionSelected
                      ]}
                      onPress={() => setInviteRole('viewer')}
                    >
                      <Text style={[
                        styles.roleOptionText,
                        inviteRole === 'viewer' && styles.roleOptionTextSelected
                      ]}>
                        Viewer - Can only view the list
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.inviteButton, inviting && styles.inviteButtonDisabled]}
                    onPress={handleInviteCollaborator}
                    disabled={inviting}
                  >
                    {inviting ? (
                      <ActivityIndicator size={20} color={COLORS.white} />
                    ) : (
                      <UserPlus size={20} color={COLORS.white} />
                    )}
                    <Text style={styles.inviteButtonText}>
                      {inviting ? 'Sending...' : 'Send Invitation'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>How it works</Text>
                <Text style={styles.infoText}>
                  • Invitations are sent via the app - recipients will see them in their "Pending Invitations"
                </Text>
                <Text style={styles.infoText}>
                  • Editors can add, edit, and check off items in real-time
                </Text>
                <Text style={styles.infoText}>
                  • Viewers can only see the list and its progress
                </Text>
                <Text style={styles.infoText}>
                  • You can manage collaborators from the list details page
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Share "{listName}"</Text>
                <Text style={styles.description}>
                  Anyone with this link can view your shopping list in read-only mode. 
                  They won't be able to edit or modify the list.
                </Text>
              </View>

              {shareError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{shareError}</Text>
                </View>
              )}

              {shareLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.secondary} />
                  <Text style={styles.loadingText}>Creating share link...</Text>
                </View>
              )}

              {shareUrl && !shareLoading && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Share Link</Text>
                  <View style={styles.urlContainer}>
                    <Text style={styles.urlText} numberOfLines={2}>{shareUrl}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopyShareLink}
                  >
                    <Text style={styles.copyButtonText}>Copy Link</Text>
                  </TouchableOpacity>

                  {shareExpiresAt && (
                    <Text style={styles.expiryText}>
                      Expires: {new Date(shareExpiresAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Privacy</Text>
                <Text style={styles.privacyText}>
                  • Prices and personal notes are hidden from viewers
                </Text>
                <Text style={styles.privacyText}>
                  • Link expires automatically in 30 days
                </Text>
                <Text style={styles.privacyText}>
                  • You can revoke access by deleting the list
                </Text>
              </View>
            </>
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
  closeText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  headerSpacer: {
    width: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  urlContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  urlText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 16,
  },
  copyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  expiryText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  privacyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
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
    gap: 8,
  },
  roleOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  roleOptionSelected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  roleOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  roleOptionTextSelected: {
    color: '#3B82F6',
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
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
});