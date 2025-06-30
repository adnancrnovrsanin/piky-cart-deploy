import { supabaseAuth, supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

// Helper function to check if user can view collaborators
async function canViewCollaborators(userId: string, listId: string): Promise<boolean> {
  // Check if user is a collaborator
  const { data: collaboratorData, error: collaboratorError } = await supabaseServer
    .from('list_collaborators')
    .select('role')
    .eq('user_id', userId)
    .eq('list_id', listId)
    .single();

  if (!collaboratorError && collaboratorData) {
    return true;
  }

  // Check if user is the original list owner
  const { data: listData, error: listError } = await supabaseServer
    .from('shopping_lists')
    .select('user_id')
    .eq('id', listId)
    .single();

  if (!listError && listData && listData.user_id === userId) {
    return true;
  }

  return false;
}

// POST /api/lists/[listId]/collaborators - Create share invitation
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

    // Check if user can manage collaborators (must be owner)
    const canManage = await canManageCollaborators(user.id, listId);
    if (!canManage) {
      return new Response(JSON.stringify({
        error: 'PERMISSION_DENIED',
        message: 'Only list owners can invite collaborators'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    const { email, role = 'editor' } = body;

    if (!email) {
      return new Response(JSON.stringify({
        error: 'EMAIL_REQUIRED',
        message: 'Invitee email is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate role
    if (!['editor', 'viewer'].includes(role)) {
      return new Response(JSON.stringify({
        error: 'INVALID_ROLE',
        message: 'Role must be either "editor" or "viewer"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is trying to invite themselves
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return new Response(JSON.stringify({
        error: 'CANNOT_INVITE_SELF',
        message: 'Cannot invite yourself'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabaseServer
      .from('share_invitations')
      .select('id')
      .eq('invitee_email', email.toLowerCase())
      .eq('list_id', listId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return new Response(JSON.stringify({
        error: 'INVITATION_EXISTS',
        message: 'A pending invitation already exists for this email'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is already a collaborator
    // Use admin API to find user by email with pagination support
    let existingUser: { id: string } | null = null;
    let page = 1;
    const perPage = 1000; // Max users per page
    
    while (true) {
      const { data: usersPage, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        break;
      }
      
      // Find user with matching email (case-insensitive)
      const foundUser = usersPage.users.find(u =>
        u.email?.toLowerCase() === email.toLowerCase()
      );
      
      if (foundUser) {
        existingUser = { id: foundUser.id };
        break;
      }
      
      // Break if we've seen all users
      if (usersPage.users.length < perPage) {
        break;
      }
      
      page++;
    }

    if (existingUser) {
      const { data: existingCollaborator } = await supabaseServer
        .from('list_collaborators')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('list_id', listId)
        .single();

      if (existingCollaborator) {
        return new Response(JSON.stringify({
          error: 'ALREADY_COLLABORATOR',
          message: 'User is already a collaborator on this list'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Create the invitation
    const { data: invitation, error: invitationError } = await supabaseServer
      .from('share_invitations')
      .insert({
        inviter_id: user.id,
        invitee_email: email.toLowerCase(),
        list_id: listId,
        role: role
      })
      .select('id, expires_at')
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return new Response(JSON.stringify({
        error: 'INVITATION_FAILED',
        message: 'Failed to create invitation'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      invitation_id: invitation.id,
      expires_at: invitation.expires_at,
      message: 'Invitation sent successfully'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in POST /api/lists/[listId]/collaborators:', error);
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET /api/lists/[listId]/collaborators - List collaborators for a specific list
export async function GET(request: Request, context?: { params?: { listId: string } }) {
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

    // Check if user can view collaborators
    const canView = await canViewCollaborators(user.id, listId);
    if (!canView) {
      return new Response(JSON.stringify({
        error: 'PERMISSION_DENIED',
        message: 'You do not have access to this list'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all collaborators for the list with user emails
    const { data: collaborators, error } = await supabaseServer
      .from('list_collaborators')
      .select('id, role, created_at, user_id')
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching collaborators:', error);
      return new Response(JSON.stringify({
        error: 'FETCH_FAILED',
        message: 'Failed to fetch collaborators'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user emails separately using admin API to access auth.users
    const userIds = collaborators.map(c => c.user_id);
    const users: { id: string; email?: string }[] = [];
    let usersError: any = null;
    
    // Use admin API with pagination to find users by IDs
    let page = 1;
    const perPage = 1000; // Max users per page
    const foundUserIds = new Set<string>();
    
    while (foundUserIds.size < userIds.length) {
      const { data: usersPage, error: pageError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });
      
      if (pageError) {
        usersError = pageError;
        console.error('Error fetching users page:', pageError);
        break;
      }
      
      // Filter users that match our required IDs
      const matchingUsers = usersPage.users.filter(u =>
        userIds.includes(u.id) && !foundUserIds.has(u.id)
      );
      
      // Add matching users to our result
      matchingUsers.forEach(u => {
        users.push({ id: u.id, email: u.email });
        foundUserIds.add(u.id);
      });
      
      // Break if we've seen all users or found all required users
      if (usersPage.users.length < perPage || foundUserIds.size === userIds.length) {
        break;
      }
      
      page++;
    }

    if (usersError) {
      console.error('Error fetching user emails:', usersError);
      return new Response(JSON.stringify({
        error: 'FETCH_FAILED',
        message: 'Failed to fetch user information'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create a map of user_id to email
    const userEmailMap = new Map(users?.map(u => [u.id, u.email]) || []);

    const formattedCollaborators = collaborators.map(collab => ({
      id: collab.id,
      user_id: collab.user_id,
      email: userEmailMap.get(collab.user_id),
      role: collab.role,
      created_at: collab.created_at
    }));

    return new Response(JSON.stringify({
      collaborators: formattedCollaborators
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in GET /api/lists/[listId]/collaborators:', error);
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}