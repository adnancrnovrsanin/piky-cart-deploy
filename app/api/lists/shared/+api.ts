import { supabaseAuth, supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

// GET /api/lists/shared - Get all lists shared with the authenticated user
export async function GET(request: Request) {
  try {
    // Check if supabaseAdmin is properly configured
    if (!supabaseAdmin) {
      console.error('Supabase admin client not properly configured');
      return new Response(
        JSON.stringify({
          error: 'CONFIGURATION_ERROR',
          message:
            'Server configuration error. Please check environment variables.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get all lists where the user is a collaborator (including as owner)
    const { data: collaborations, error: collaborationsError } =
      await supabaseServer
        .from('list_collaborators')
        .select('list_id, role, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (collaborationsError) {
      console.error('Error fetching collaborations:', collaborationsError);
      return new Response(
        JSON.stringify({
          error: 'FETCH_FAILED',
          message: 'Failed to fetch shared lists',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!collaborations || collaborations.length === 0) {
      return new Response(
        JSON.stringify({
          shared_lists: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get list details for all collaborations
    const listIds = collaborations.map((collab) => collab.list_id);
    const { data: lists, error: listsError } = await supabaseServer
      .from('shopping_lists')
      .select(
        `
        id,
        name,
        description,
        is_archived,
        item_count,
        purchased_count,
        created_at,
        updated_at,
        user_id,
        is_collaborative,
        last_updated_by_collaborator_at
      `
      )
      .in('id', listIds)
      .order('updated_at', { ascending: false });

    if (listsError) {
      console.error('Error fetching list details:', listsError);
      return new Response(
        JSON.stringify({
          error: 'FETCH_FAILED',
          message: 'Failed to fetch list details',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get owner details for lists using admin client to access auth schema
    const ownerIds = [...new Set(lists?.map((list) => list.user_id) || [])];

    let owners: { id: string; email: string }[] = [];
    if (ownerIds.length > 0) {
      try {
        // Use admin.listUsers instead of direct table access
        // Note: listUsers returns paginated results with a maximum of 1000 users per page
        let ownersData: { id: string; email: string }[] = [];
        let ownersError: any = null;
        
        try {
          let page = 1;
          let hasMore = true;
          const foundOwnerIds = new Set();
          
          // Continue fetching pages until we have all required owners or no more pages
          while (hasMore && foundOwnerIds.size < ownerIds.length) {
            const { data: usersPage, error: pageError } = await supabaseAdmin.auth.admin.listUsers({
              page,
              perPage: 1000, // Maximum allowed per page
            });
            
            if (pageError) {
              ownersError = pageError;
              break;
            }
            
            if (usersPage?.users) {
              // Filter users to only include those in our ownerIds array
              const relevantUsers = usersPage.users
                .filter(user => ownerIds.includes(user.id))
                .map(user => ({
                  id: user.id,
                  email: user.email || 'Unknown'
                }));
              
              // Add found users to our results
              relevantUsers.forEach(user => {
                if (!foundOwnerIds.has(user.id)) {
                  ownersData.push(user);
                  foundOwnerIds.add(user.id);
                }
              });
            }
            
            // Check if we have more pages (listUsers doesn't provide total count directly)
            // We'll continue if we got a full page and haven't found all owners yet
            hasMore = usersPage?.users && usersPage.users.length === 1000;
            page++;
            
            // Safety check to prevent infinite loops
            if (page > 100) {
              console.warn('Reached maximum page limit (100) when fetching users');
              break;
            }
          }
        } catch (adminError) {
          ownersError = adminError;
        }

        if (ownersError) {
          console.error('Error fetching owner details:', ownersError);
          // Don't fail the entire request, just log the error and continue without owner emails
          console.warn(
            'Continuing without owner email information due to auth access error'
          );
        } else {
          owners = ownersData || [];
        }
      } catch (adminError) {
        console.error('Error using admin client:', adminError);
        console.warn(
          'Continuing without owner email information due to admin client error'
        );
      }
    }

    // Create maps for efficient lookup
    const collaborationMap = new Map(
      collaborations.map((collab) => [collab.list_id, collab])
    );
    const ownerMap = new Map(owners.map((owner) => [owner.id, owner]));

    // Format the response
    const sharedLists =
      lists?.map((list) => {
        const collaboration = collaborationMap.get(list.id);
        const owner = ownerMap.get(list.user_id);

        return {
          id: list.id,
          name: list.name,
          description: list.description,
          is_archived: list.is_archived,
          item_count: list.item_count,
          purchased_count: list.purchased_count,
          created_at: list.created_at,
          updated_at: list.updated_at,
          is_collaborative: list.is_collaborative,
          last_updated_by_collaborator_at: list.last_updated_by_collaborator_at,
          my_role: collaboration?.role,
          joined_at: collaboration?.created_at,
          owner: {
            id: list.user_id,
            email: owner?.email || 'Unknown',
          },
          is_owner: list.user_id === user.id,
        };
      }) || [];

    // Parse URL for filtering options
    const url = new URL(request.url);
    const includeOwned = url.searchParams.get('include_owned') === 'true';
    const roleFilter = url.searchParams.get('role');
    const isArchivedFilter = url.searchParams.get('is_archived');

    // Apply filters
    let filteredLists = sharedLists;

    // Filter by ownership
    if (!includeOwned) {
      filteredLists = filteredLists.filter((list) => !list.is_owner);
    }

    // Filter by role
    if (roleFilter && ['owner', 'editor', 'viewer'].includes(roleFilter)) {
      filteredLists = filteredLists.filter(
        (list) => list.my_role === roleFilter
      );
    }

    // Filter by archived status
    if (isArchivedFilter !== null) {
      const isArchived = isArchivedFilter === 'true';
      filteredLists = filteredLists.filter(
        (list) => list.is_archived === isArchived
      );
    }

    return new Response(
      JSON.stringify({
        shared_lists: filteredLists,
        total_count: filteredLists.length,
        filters_applied: {
          include_owned: includeOwned,
          role: roleFilter,
          is_archived: isArchivedFilter,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/lists/shared:', error);

    // Check if it's a configuration error
    if (
      error instanceof Error &&
      error.message.includes('SUPABASE_SERVICE_ROLE_KEY')
    ) {
      return new Response(
        JSON.stringify({
          error: 'CONFIGURATION_ERROR',
          message:
            'Server configuration error: Missing or invalid Supabase service role key. Please check your environment variables.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}