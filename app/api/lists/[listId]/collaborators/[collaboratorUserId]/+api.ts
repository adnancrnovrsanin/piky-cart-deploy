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

// Helper function to check if user has permission to manage collaborators
async function canManageCollaborators(userId: string, listId: string): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from('list_collaborators')
    .select('role')
    .eq('user_id', userId)
    .eq('list_id', listId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.role === 'owner';
}

// PUT /api/lists/[listId]/collaborators/[collaboratorUserId] - Update collaborator role
export async function PUT(request: Request, context?: { params?: { listId: string; collaboratorUserId: string } }) {
  try {
    let listId = context?.params?.listId;
    let collaboratorUserId = context?.params?.collaboratorUserId;
    
    // Fallback: Extract parameters from URL if not available in context
    if (!listId || !collaboratorUserId) {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const listsIndex = pathSegments.findIndex(segment => segment === 'lists');
      if (listsIndex !== -1) {
        listId = listId || pathSegments[listsIndex + 1];
        const collaboratorsIndex = pathSegments.findIndex(segment => segment === 'collaborators');
        if (collaboratorsIndex !== -1) {
          collaboratorUserId = collaboratorUserId || pathSegments[collaboratorsIndex + 1];
        }
      }
    }
    
    if (!listId || !collaboratorUserId) {
      return new Response(JSON.stringify({ 
        error: 'PARAMETERS_REQUIRED',
        message: 'List ID and collaborator user ID are required' 
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

    // Check if user can manage collaborators (must be owner)
    const canManage = await canManageCollaborators(user.id, listId);
    if (!canManage) {
      return new Response(JSON.stringify({
        error: 'PERMISSION_DENIED',
        message: 'Only list owners can update collaborator roles'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return new Response(JSON.stringify({
        error: 'ROLE_REQUIRED',
        message: 'Role is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate role (cannot change someone to owner via this endpoint)
    if (!['editor', 'viewer'].includes(role)) {
      return new Response(JSON.stringify({
        error: 'INVALID_ROLE',
        message: 'Role must be either "editor" or "viewer"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if the collaborator exists
    const { data: existingCollaborator, error: checkError } = await supabaseServer
      .from('list_collaborators')
      .select('role')
      .eq('user_id', collaboratorUserId)
      .eq('list_id', listId)
      .single();

    if (checkError || !existingCollaborator) {
      return new Response(JSON.stringify({
        error: 'COLLABORATOR_NOT_FOUND',
        message: 'Collaborator not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent changing owner role
    if (existingCollaborator.role === 'owner') {
      return new Response(JSON.stringify({
        error: 'CANNOT_CHANGE_OWNER',
        message: 'Cannot change the role of the list owner'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update the collaborator role
    const { error: updateError } = await supabaseServer
      .from('list_collaborators')
      .update({ role: role })
      .eq('user_id', collaboratorUserId)
      .eq('list_id', listId);

    if (updateError) {
      console.error('Error updating collaborator role:', updateError);
      return new Response(JSON.stringify({
        error: 'UPDATE_FAILED',
        message: 'Failed to update collaborator role'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Collaborator role updated successfully',
      role: role
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in PUT /api/lists/[listId]/collaborators/[collaboratorUserId]:', error);
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE /api/lists/[listId]/collaborators/[collaboratorUserId] - Remove a collaborator
export async function DELETE(request: Request, context?: { params?: { listId: string; collaboratorUserId: string } }) {
  try {
    let listId = context?.params?.listId;
    let collaboratorUserId = context?.params?.collaboratorUserId;
    
    // Fallback: Extract parameters from URL if not available in context
    if (!listId || !collaboratorUserId) {
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const listsIndex = pathSegments.findIndex(segment => segment === 'lists');
      if (listsIndex !== -1) {
        listId = listId || pathSegments[listsIndex + 1];
        const collaboratorsIndex = pathSegments.findIndex(segment => segment === 'collaborators');
        if (collaboratorsIndex !== -1) {
          collaboratorUserId = collaboratorUserId || pathSegments[collaboratorsIndex + 1];
        }
      }
    }
    
    if (!listId || !collaboratorUserId) {
      return new Response(JSON.stringify({ 
        error: 'PARAMETERS_REQUIRED',
        message: 'List ID and collaborator user ID are required' 
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

    // Check if user can manage collaborators (must be owner)
    const canManage = await canManageCollaborators(user.id, listId);
    if (!canManage) {
      return new Response(JSON.stringify({
        error: 'PERMISSION_DENIED',
        message: 'Only list owners can remove collaborators'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if the collaborator exists and get their role
    const { data: existingCollaborator, error: checkError } = await supabaseServer
      .from('list_collaborators')
      .select('role')
      .eq('user_id', collaboratorUserId)
      .eq('list_id', listId)
      .single();

    if (checkError || !existingCollaborator) {
      return new Response(JSON.stringify({
        error: 'COLLABORATOR_NOT_FOUND',
        message: 'Collaborator not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent removing the owner
    if (existingCollaborator.role === 'owner') {
      return new Response(JSON.stringify({
        error: 'CANNOT_REMOVE_OWNER',
        message: 'Cannot remove the list owner'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Remove the collaborator
    const { error: deleteError } = await supabaseServer
      .from('list_collaborators')
      .delete()
      .eq('user_id', collaboratorUserId)
      .eq('list_id', listId);

    if (deleteError) {
      console.error('Error removing collaborator:', deleteError);
      return new Response(JSON.stringify({
        error: 'REMOVAL_FAILED',
        message: 'Failed to remove collaborator'
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

    return new Response(JSON.stringify({
      message: 'Collaborator removed successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in DELETE /api/lists/[listId]/collaborators/[collaboratorUserId]:', error);
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}