import { supabaseServer } from './supabase-server';

export interface CollaboratorPermissions {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean; // Can invite/remove collaborators
  role?: 'owner' | 'editor' | 'viewer';
}

export interface ListCollaborator {
  id: string;
  user_id: string;
  list_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
  updated_at: string;
}

export interface ShareInvitation {
  id: string;
  inviter_id: string;
  invitee_email: string;
  list_id: string;
  status: 'pending' | 'accepted' | 'declined';
  role: 'editor' | 'viewer';
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/**
 * Check if a user has specific permissions for a list
 */
export async function getUserListPermissions(
  userId: string, 
  listId: string
): Promise<CollaboratorPermissions> {
  try {
    const { data: collaboration, error } = await supabaseServer
      .from('list_collaborators')
      .select('role')
      .eq('user_id', userId)
      .eq('list_id', listId)
      .single();

    if (error || !collaboration) {
      return {
        canView: false,
        canEdit: false,
        canManage: false
      };
    }

    const role = collaboration.role as 'owner' | 'editor' | 'viewer';

    return {
      canView: true,
      canEdit: role === 'owner' || role === 'editor',
      canManage: role === 'owner',
      role
    };
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return {
      canView: false,
      canEdit: false,
      canManage: false
    };
  }
}

/**
 * Check if a user is the owner of a list
 */
export async function isListOwner(userId: string, listId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseServer
      .from('list_collaborators')
      .select('role')
      .eq('user_id', userId)
      .eq('list_id', listId)
      .eq('role', 'owner')
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking list ownership:', error);
    return false;
  }
}

/**
 * Get all lists that a user has access to
 */
export async function getUserAccessibleListIds(userId: string): Promise<string[]> {
  try {
    const { data: collaborations, error } = await supabaseServer
      .from('list_collaborators')
      .select('list_id')
      .eq('user_id', userId);

    if (error || !collaborations) {
      return [];
    }

    return collaborations.map(collab => collab.list_id);
  } catch (error) {
    console.error('Error getting accessible lists:', error);
    return [];
  }
}

/**
 * Get all collaborators for a specific list
 */
export async function getListCollaborators(listId: string): Promise<ListCollaborator[]> {
  try {
    const { data: collaborators, error } = await supabaseServer
      .from('list_collaborators')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    if (error || !collaborators) {
      return [];
    }

    return collaborators;
  } catch (error) {
    console.error('Error getting list collaborators:', error);
    return [];
  }
}

/**
 * Add a user as a collaborator to a list
 */
export async function addCollaborator(
  listId: string, 
  userId: string, 
  role: 'editor' | 'viewer'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseServer
      .from('list_collaborators')
      .insert({
        user_id: userId,
        list_id: listId,
        role: role
      });

    if (error) {
      console.error('Error adding collaborator:', error);
      return { success: false, error: error.message };
    }

    // Mark list as collaborative
    await supabaseServer
      .from('shopping_lists')
      .update({ 
        is_collaborative: true,
        last_updated_by_collaborator_at: new Date().toISOString()
      })
      .eq('id', listId);

    return { success: true };
  } catch (error) {
    console.error('Error in addCollaborator:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Remove a collaborator from a list
 */
export async function removeCollaborator(
  listId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseServer
      .from('list_collaborators')
      .delete()
      .eq('user_id', userId)
      .eq('list_id', listId)
      .neq('role', 'owner'); // Prevent removing owners

    if (error) {
      console.error('Error removing collaborator:', error);
      return { success: false, error: error.message };
    }

    // Check if list should remain collaborative
    const { data: remainingCollabs } = await supabaseServer
      .from('list_collaborators')
      .select('id')
      .eq('list_id', listId)
      .neq('role', 'owner');

    if (!remainingCollabs || remainingCollabs.length === 0) {
      await supabaseServer
        .from('shopping_lists')
        .update({ is_collaborative: false })
        .eq('id', listId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeCollaborator:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Update a collaborator's role
 */
export async function updateCollaboratorRole(
  listId: string, 
  userId: string, 
  newRole: 'editor' | 'viewer'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseServer
      .from('list_collaborators')
      .update({ role: newRole })
      .eq('user_id', userId)
      .eq('list_id', listId)
      .neq('role', 'owner'); // Prevent changing owner role

    if (error) {
      console.error('Error updating collaborator role:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateCollaboratorRole:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Create a share invitation
 */
export async function createShareInvitation(
  inviterId: string,
  inviteeEmail: string,
  listId: string,
  role: 'editor' | 'viewer' = 'editor'
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  try {
    // Check for existing pending invitation
    const { data: existing } = await supabaseServer
      .from('share_invitations')
      .select('id')
      .eq('invitee_email', inviteeEmail.toLowerCase())
      .eq('list_id', listId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existing) {
      return { success: false, error: 'Pending invitation already exists' };
    }

    const { data: invitation, error } = await supabaseServer
      .from('share_invitations')
      .insert({
        inviter_id: inviterId,
        invitee_email: inviteeEmail.toLowerCase(),
        list_id: listId,
        role: role
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return { success: false, error: error.message };
    }

    return { success: true, invitationId: invitation.id };
  } catch (error) {
    console.error('Error in createShareInvitation:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Get pending invitations for a user by email
 */
export async function getPendingInvitations(email: string): Promise<ShareInvitation[]> {
  try {
    const { data: invitations, error } = await supabaseServer
      .from('share_invitations')
      .select('*')
      .eq('invitee_email', email.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error || !invitations) {
      return [];
    }

    return invitations;
  } catch (error) {
    console.error('Error getting pending invitations:', error);
    return [];
  }
}

/**
 * Accept a share invitation
 */
export async function acceptInvitation(
  invitationId: string, 
  userId: string
): Promise<{ success: boolean; listId?: string; error?: string }> {
  try {
    // Get invitation details
    const { data: invitation, error: invError } = await supabaseServer
      .from('share_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invError || !invitation) {
      return { success: false, error: 'Invalid or expired invitation' };
    }

    // Add as collaborator
    const addResult = await addCollaborator(invitation.list_id, userId, invitation.role);
    if (!addResult.success) {
      return addResult;
    }

    // Update invitation status
    await supabaseServer
      .from('share_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    return { success: true, listId: invitation.list_id };
  } catch (error) {
    console.error('Error in acceptInvitation:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Decline a share invitation
 */
export async function declineInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseServer
      .from('share_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error declining invitation:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in declineInvitation:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Clean up expired invitations (utility function)
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  try {
    const { data, error } = await supabaseServer
      .from('share_invitations')
      .delete()
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up expired invitations:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error in cleanupExpiredInvitations:', error);
    return 0;
  }
}