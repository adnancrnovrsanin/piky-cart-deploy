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

// POST /api/share-invitations/[invitationId]/decline - Decline invitation
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
      .select('id, list_id, invitee_email, status, expires_at')
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

    // Update invitation status to declined
    const { error: updateError } = await supabaseServer
      .from('share_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Error declining invitation:', updateError);
      return new Response(JSON.stringify({
        error: 'DECLINE_FAILED',
        message: 'Failed to decline invitation'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Invitation declined successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in POST /api/share-invitations/[invitationId]/decline:', error);
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}