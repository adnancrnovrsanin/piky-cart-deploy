import { createSharedLink } from '@/lib/sharing';
import { supabaseAuth } from '@/lib/supabase-server';

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

    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Authentication token required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the authenticated user using the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Invalid authentication token'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body for optional expiration
    let expiresIn: number | undefined;
    try {
      const body = await request.json();
      expiresIn = body.expires_in;
    } catch (error) {
      // Body is optional, ignore JSON parse errors
    }

    // Default to 30 days if no expiration specified
    if (!expiresIn) {
      expiresIn = 30 * 24 * 60 * 60; // 30 days in seconds
    }

    // Validate expiration range (1 hour to 365 days)
    const MIN_EXPIRATION = 60 * 60; // 1 hour
    const MAX_EXPIRATION = 365 * 24 * 60 * 60; // 1 year
    
    if (expiresIn < MIN_EXPIRATION || expiresIn > MAX_EXPIRATION) {
      return new Response(JSON.stringify({ 
        error: 'INVALID_EXPIRATION',
        message: 'Expiration must be between 1 hour and 365 days' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create the shared link
    const result = await createSharedLink(listId, user.id, expiresIn);

    if (!result.success) {
      let status = 500;
      if (result.error === 'LIST_NOT_FOUND') {
        status = 404;
      } else if (result.error === 'PERMISSION_DENIED') {
        status = 403;
      }
      
      return new Response(JSON.stringify({ 
        error: result.error,
        message: result.message 
      }), { 
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return successful response
    return new Response(JSON.stringify({
      share_url: result.share_url,
      expires_at: result.expires_at,
      list_name: result.list_name,
      token: result.token
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in POST /api/lists/[listId]/share:', error);
    return new Response(JSON.stringify({ 
      error: 'INTERNAL_ERROR',
      message: 'Internal server error during share link creation' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Optional: Handle other HTTP methods
export async function GET(request: Request, context?: { params?: { listId: string } }) {
  return new Response(JSON.stringify({ 
    error: 'METHOD_NOT_ALLOWED',
    message: 'Use POST to create a share link' 
  }), { 
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT(request: Request, context?: { params?: { listId: string } }) {
  return new Response(JSON.stringify({ 
    error: 'METHOD_NOT_ALLOWED',
    message: 'Use POST to create a share link' 
  }), { 
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE(request: Request, context?: { params?: { listId: string } }) {
  return new Response(JSON.stringify({ 
    error: 'METHOD_NOT_ALLOWED',
    message: 'Use POST to create a share link' 
  }), { 
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}