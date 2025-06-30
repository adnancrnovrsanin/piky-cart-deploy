import { validateShareToken } from '@/lib/sharing';
import { ListItem } from '@/types';

export async function GET(request: Request, { params }: { params: { shareToken: string } }) {
  try {
    const { shareToken } = params;
    
    if (!shareToken) {
      return new Response(JSON.stringify({ 
        error: 'TOKEN_REQUIRED',
        message: 'Share token is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate the share token and get list data
    const result = await validateShareToken(shareToken);

    if (!result.valid) {
      let status = 404;
      if (result.error === 'TOKEN_EXPIRED') {
        status = 410; // Gone - link expired
      }
      
      return new Response(JSON.stringify({ 
        error: result.error,
        message: result.message 
      }), { 
        status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Transform the data to match the API response format
    const listData = {
      id: result.list.id,
      name: result.list.name,
      created_at: result.list.created_at,
      items: result.list.list_items?.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        quantity_unit: item.quantity_unit,
        category: item.category,
        notes: item.notes,
        store: item.store,
        brand: item.brand,
        is_purchased: item.is_purchased,
        priority: item.priority,
        created_at: item.created_at
        // Note: Intentionally excluding price fields for privacy
      })) || []
    };

    // Return successful response
    return new Response(JSON.stringify({
      list: listData,
      shared_at: result.sharedAt,
      expires_at: result.expiresAt,
      metadata: {
        is_shared: true,
        access_type: 'read_only',
        item_count: listData.items.length,
        purchased_count: listData.items.filter((item: any) => item.is_purchased).length
      }
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        // Add cache headers for shared content
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Access-Control-Allow-Origin': '*', // Allow cross-origin access for sharing
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error in GET /api/shared-lists/[shareToken]:', error);
    return new Response(JSON.stringify({ 
      error: 'INTERNAL_ERROR',
      message: 'Internal server error while accessing shared list' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

// Handle other HTTP methods
export async function POST(request: Request, { params }: { params: { shareToken: string } }) {
  return new Response(JSON.stringify({ 
    error: 'METHOD_NOT_ALLOWED',
    message: 'This is a read-only shared list. Only GET requests are allowed.' 
  }), { 
    status: 405,
    headers: { 
      'Content-Type': 'application/json',
      'Allow': 'GET, OPTIONS'
    }
  });
}

export async function PUT(request: Request, { params }: { params: { shareToken: string } }) {
  return new Response(JSON.stringify({ 
    error: 'METHOD_NOT_ALLOWED',
    message: 'This is a read-only shared list. Only GET requests are allowed.' 
  }), { 
    status: 405,
    headers: { 
      'Content-Type': 'application/json',
      'Allow': 'GET, OPTIONS'
    }
  });
}

export async function DELETE(request: Request, { params }: { params: { shareToken: string } }) {
  return new Response(JSON.stringify({ 
    error: 'METHOD_NOT_ALLOWED',
    message: 'This is a read-only shared list. Only GET requests are allowed.' 
  }), { 
    status: 405,
    headers: { 
      'Content-Type': 'application/json',
      'Allow': 'GET, OPTIONS'
    }
  });
}

export async function PATCH(request: Request, { params }: { params: { shareToken: string } }) {
  return new Response(JSON.stringify({ 
    error: 'METHOD_NOT_ALLOWED',
    message: 'This is a read-only shared list. Only GET requests are allowed.' 
  }), { 
    status: 405,
    headers: { 
      'Content-Type': 'application/json',
      'Allow': 'GET, OPTIONS'
    }
  });
}