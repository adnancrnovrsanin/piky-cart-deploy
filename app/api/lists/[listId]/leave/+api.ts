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

// POST /api/lists/[listId]/leave - Allow a user to leave a list they are a collaborator on
export async function POST(request: Request, context?: { params?: { listId: string } }) {
  try {
    let listId = context?.params?.listId;
    
    // Fallback: Extract listId from URL if not available in context
    if (!listId) {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const listsIndex = pathSegments.findIndex(segment => segment === 'lists');
      if (listsIndex !== -1 && pathSegments[listsIndex + 1]) {
        listId = pathSegments[listsIndex + 1];
      }
    }
    
    if (!listId) {
      return new Response(JSON.stringify({ 
        error: 'LIST_ID_REQUIRED',
        message: 'List ID is required' 
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

    // Check if user is a collaborator on this list
    const { data: collaboration, error: collaborationError } = await supabaseServer
      .from('list_collaborators')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('list_id', listId)
      .single();

    if (collaborationError || !collaboration) {
      return new Response(JSON.stringify({
        error: 'NOT_COLLABORATOR',
        message: 'You are not a collaborator on this list'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent the owner from leaving their own list
    if (collaboration.role === 'owner') {
      return new Response(JSON.stringify({
        error: 'OWNER_CANNOT_LEAVE',
        message: 'List owners cannot leave their own list. Transfer ownership first or delete the list.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Remove the user from collaborators
    const { error: removeError } = await supabaseServer
      .from('list_collaborators')
      .delete()
      .eq('user_id', user.id)
      .eq('list_id', listId);

    if (removeError) {
      console.error('Error removing user from collaborators:', removeError);
      return new Response(JSON.stringify({
        error: 'LEAVE_FAILED',
        message: 'Failed to leave the list'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if there are any remaining collaborators (excluding owner)
    const { data: remainingCollaborators, error: countError } = await supabaseServer
      .from('list_collaborators')
      .select('id')
      .eq('list_id', listId)
      .neq('role', 'owner');

    if (!countError && remainingCollaborators && remainingCollaborators.length === 0) {
      // No more collaborators, mark list as non-collaborative
      await supabaseServer
        .from('shopping_lists')
        .update({ is_collaborative: false })
        .eq('id', listId);
    }

    // Get list name for response
    const { data: listDetails } = await supabaseServer
      .from('shopping_lists')
      .select('name')
      .eq('id', listId)
      .single();

    return new Response(JSON.stringify({
      message: 'Successfully left the list',
      list_name: listDetails?.name
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in POST /api/lists/[listId]/leave:', error);
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}