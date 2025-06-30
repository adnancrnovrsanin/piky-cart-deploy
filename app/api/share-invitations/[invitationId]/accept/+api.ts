import { supabaseAuth, supabaseServer } from '@/lib/supabase-server';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

// POST /api/share-invitations/[invitationId]/accept - Accept invitation
export async function POST(request: Request, context?: { params?: { invitationId: string } }) {
  try {
    let invitationId = context?.params?.invitationId;
    
    // Fallback: Extract invitationId from URL if not available in context
    if (!invitationId) {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const invitationsIndex = pathSegments.findIndex(segment => segment === 'share-invitations');
      if (invitationsIndex !== -1 && pathSegments[invitationsIndex + 1]) {
        invitationId = pathSegments[invitationsIndex + 1];
      }
    }
    
    if (!invitationId) {
      return new Response(JSON.stringify({ 
        error: 'INVITATION_ID_REQUIRED',
        message: 'Invitation ID is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!user.email) {
      return new Response(JSON.stringify({
        error: 'EMAIL_REQUIRED',
        message: 'User email is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the invitation details
    const { data: invitation, error: invitationError } = await supabaseServer
      .from('share_invitations')
      .select('id, list_id, role, invitee_email, status, expires_at')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return new Response(JSON.stringify({
        error: 'INVITATION_NOT_FOUND',
        message: 'Invitation not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the invitation is for this user
    if (invitation.invitee_email.toLowerCase() !== user.email.toLowerCase()) {
      return new Response(JSON.stringify({
        error: 'PERMISSION_DENIED',
        message: 'This invitation is not for your email address'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check invitation status
    if (invitation.status !== 'pending') {
      return new Response(JSON.stringify({
        error: 'INVITATION_ALREADY_PROCESSED',
        message: `Invitation has already been ${invitation.status}`
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(JSON.stringify({
        error: 'INVITATION_EXPIRED',
        message: 'Invitation has expired'
      }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify list exists and is active
    const { data: targetList, error: listError } = await supabaseServer
      .from('shopping_lists')
      .select('id, is_archived')
      .eq('id', invitation.list_id)
      .single();

    if (listError || !targetList) {
      return new Response(JSON.stringify({
        error: 'LIST_NOT_FOUND',
        message: 'The list for this invitation does not exist'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (targetList.is_archived) {
      return new Response(JSON.stringify({
        error: 'LIST_ARCHIVED',
        message: 'This list has been archived and cannot be modified'
      }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is already a collaborator on this list
    const { data: existingCollaborator } = await supabaseServer
      .from('list_collaborators')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('list_id', invitation.list_id)
      .single();

    if (existingCollaborator) {
      // Update invitation status to accepted anyway
      await supabaseServer
        .from('share_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      return new Response(JSON.stringify({
        error: 'ALREADY_COLLABORATOR',
        message: 'You are already a collaborator on this list',
        current_role: existingCollaborator.role
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Start a transaction-like operation
    try {
      // Add user as collaborator
      const { error: collaboratorError } = await supabaseServer
        .from('list_collaborators')
        .insert({
          user_id: user.id,
          list_id: invitation.list_id,
          role: invitation.role
        });

      if (collaboratorError) {
        console.error('Error adding collaborator:', collaboratorError);
        return new Response(JSON.stringify({
          error: 'COLLABORATION_FAILED',
          message: 'Failed to add you as a collaborator'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update invitation status
      const { error: updateError } = await supabaseServer
        .from('share_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
        // Try to rollback by removing the collaborator
        await supabaseServer
          .from('list_collaborators')
          .delete()
          .eq('user_id', user.id)
          .eq('list_id', invitation.list_id);

        return new Response(JSON.stringify({
          error: 'UPDATE_FAILED',
          message: 'Failed to update invitation status'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Mark list as collaborative
      await supabaseServer
        .from('shopping_lists')
        .update({ 
          is_collaborative: true,
          last_updated_by_collaborator_at: new Date().toISOString()
        })
        .eq('id', invitation.list_id);

      // Get list details for response
      const { data: listDetails } = await supabaseServer
        .from('shopping_lists')
        .select('id, name, description')
        .eq('id', invitation.list_id)
        .single();

      return new Response(JSON.stringify({
        message: 'Invitation accepted successfully',
        list: {
          id: invitation.list_id,
          name: listDetails?.name,
          description: listDetails?.description
        },
        role: invitation.role
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error in accept invitation transaction:', error);
      return new Response(JSON.stringify({
        error: 'ACCEPT_FAILED',
        message: 'Failed to accept invitation'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in POST /api/share-invitations/[invitationId]/accept:', error);
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}