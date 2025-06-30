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

// GET /api/share-invitations - Get pending invitations for the authenticated user
export async function GET(request: Request) {
  try {
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

    // Get all pending invitations for the user's email
    const { data: invitations, error } = await supabaseServer
      .from('share_invitations')
      .select(`
        id,
        list_id,
        role,
        created_at,
        expires_at,
        inviter_id
      `)
      .eq('invitee_email', user.email.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return new Response(JSON.stringify({
        error: 'FETCH_FAILED',
        message: 'Failed to fetch invitations'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!invitations || invitations.length === 0) {
      return new Response(JSON.stringify({
        invitations: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get list details and inviter information
    const listIds = invitations.map(inv => inv.list_id);
    const inviterIds = invitations.map(inv => inv.inviter_id);

    // Fetch lists data using direct database query
    const listsPromise = supabaseServer
      .from('shopping_lists')
      .select('id, name, description')
      .in('id', listIds);

    // Fetch inviter data using admin API with pagination
    // This replaces direct auth.users table access with proper admin API usage
    const invitersPromise = (async () => {
      try {
        const invitersData: Array<{ id: string; email: string }> = [];
        const targetInviterIds = new Set(inviterIds);
        let page = 1;
        const pageSize = 1000; // Admin API page size limit
        
        // Paginate through users until all inviter IDs are found or no more users exist
        while (invitersData.length < inviterIds.length) {
          const { data: usersPage, error } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: pageSize
          });

          if (error) {
            throw new Error(`Admin API error: ${error.message}`);
          }

          if (!usersPage?.users || usersPage.users.length === 0) {
            // No more users to fetch
            break;
          }

          // Filter users that match our inviter IDs and add to results
          const matchingUsers = usersPage.users
            .filter(user => targetInviterIds.has(user.id))
            .map(user => ({
              id: user.id,
              email: user.email || ''
            }));

          invitersData.push(...matchingUsers);

          // Remove found IDs from target set for efficiency
          matchingUsers.forEach(user => targetInviterIds.delete(user.id));

          // Break early if we've found all target users
          if (targetInviterIds.size === 0) {
            break;
          }

          page++;
        }

        return { data: invitersData, error: null };
      } catch (error) {
        console.error('Error fetching inviters via admin API:', error);
        return {
          data: null,
          error: error instanceof Error ? error : new Error('Unknown error fetching users')
        };
      }
    })();

    const [listsResult, invitersResult] = await Promise.all([
      listsPromise,
      invitersPromise
    ]);

    if (listsResult.error || invitersResult.error) {
      console.error('Error fetching related data:', listsResult.error || invitersResult.error);
      return new Response(JSON.stringify({
        error: 'FETCH_FAILED',
        message: 'Failed to fetch invitation details'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create maps for efficient lookup
    const listsMap = new Map(listsResult.data?.map(list => [list.id, list]) || []);
    const invitersMap = new Map(invitersResult.data?.map(user => [user.id, user]) || []);

    // Format the invitations with additional details
    const formattedInvitations = invitations.map(invitation => {
      const list = listsMap.get(invitation.list_id);
      const inviter = invitersMap.get(invitation.inviter_id);

      return {
        id: invitation.id,
        list_id: invitation.list_id,
        list_name: list?.name,
        list_description: list?.description,
        role: invitation.role,
        inviter_email: inviter?.email,
        created_at: invitation.created_at,
        expires_at: invitation.expires_at
      };
    });

    return new Response(JSON.stringify({
      invitations: formattedInvitations
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in GET /api/share-invitations:', error);
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}