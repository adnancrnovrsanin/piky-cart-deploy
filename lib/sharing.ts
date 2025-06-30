import { supabaseServer } from './supabase-server';
import { ListItem, ShoppingList } from '@/types';

/**
 * Generates a secure, unique token for sharing
 * Uses crypto.randomUUID() for cryptographically secure random generation
 */
export function generateShareToken(): string {
  return crypto.randomUUID();
}

/**
 * Validates if a share token is valid and active
 * @param token - The share token to validate
 * @returns Object containing validation result and optional list data
 */
export async function validateShareToken(token: string) {
  try {
    const { data: sharedLink, error } = await supabaseServer
      .from('shared_links')
      .select(`
        *,
        shopping_lists!inner(
          id,
          name,
          created_at,
          list_items(
            id,
            name,
            quantity,
            quantity_unit,
            category,
            notes,
            store,
            brand,
            is_purchased,
            priority,
            created_at
          )
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (error || !sharedLink) {
      return {
        valid: false,
        error: 'TOKEN_NOT_FOUND',
        message: 'This sharing link doesn\'t exist or was deleted'
      };
    }

    // Check expiration
    if (sharedLink.expires_at && new Date(sharedLink.expires_at) < new Date()) {
      return {
        valid: false,
        error: 'TOKEN_EXPIRED',
        message: `This sharing link expired on ${new Date(sharedLink.expires_at).toLocaleDateString()}`
      };
    }

    return {
      valid: true,
      list: sharedLink.shopping_lists as any,
      sharedAt: sharedLink.created_at,
      expiresAt: sharedLink.expires_at
    };
  } catch (error) {
    console.error('Error validating share token:', error);
    return {
      valid: false,
      error: 'VALIDATION_ERROR',
      message: 'An error occurred while validating the sharing link'
    };
  }
}

/**
 * Creates a shared link for a shopping list
 * @param listId - The ID of the list to share
 * @param userId - The ID of the user creating the share
 * @param expiresIn - Optional expiration time in seconds (default: 30 days)
 * @returns Object containing the share URL and expiration info
 */
export async function createSharedLink(
  listId: string, 
  userId: string, 
  expiresIn?: number
) {
  try {
    // First, check if the list exists at all
    const { data: list, error: listError } = await supabaseServer
      .from('shopping_lists')
      .select('id, name, user_id')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      return {
        success: false,
        error: 'LIST_NOT_FOUND',
        message: 'The shopping list could not be found'
      };
    }

    // Then check if the user has permission to share it
    if (list.user_id !== userId) {
      return {
        success: false,
        error: 'PERMISSION_DENIED',
        message: 'You don\'t have permission to share this list'
      };
    }

    // Generate unique token
    const token = generateShareToken();
    
    // Calculate expiration date if provided
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Create the shared link
    const { data: sharedLink, error: createError } = await supabaseServer
      .from('shared_links')
      .insert({
        list_id: listId,
        token,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating shared link:', createError);
      return {
        success: false,
        error: 'CREATE_ERROR',
        message: 'Failed to create sharing link'
      };
    }

    return {
      success: true,
      token,
      share_url: `https://pikycart.app/shared/${token}`,
      expires_at: expiresAt,
      list_name: list.name
    };
  } catch (error) {
    console.error('Error in createSharedLink:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred'
    };
  }
}

/**
 * Deactivates a shared link
 * @param token - The token to deactivate
 * @param userId - The ID of the user requesting deactivation
 * @returns Success status
 */
export async function deactivateSharedLink(token: string, userId: string) {
  try {
    const { error } = await supabaseServer
      .from('shared_links')
      .update({ is_active: false })
      .eq('token', token)
      .eq('list_id', supabaseServer
        .from('shopping_lists')
        .select('id')
        .eq('user_id', userId)
      );

    if (error) {
      console.error('Error deactivating shared link:', error);
      return {
        success: false,
        error: 'DEACTIVATE_ERROR',
        message: 'Failed to deactivate sharing link'
      };
    }

    return {
      success: true,
      message: 'Sharing link deactivated successfully'
    };
  } catch (error) {
    console.error('Error in deactivateSharedLink:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred'
    };
  }
}

/**
 * Gets all shared links for a user's lists
 * @param userId - The user ID
 * @returns Array of shared links
 */
export async function getUserSharedLinks(userId: string) {
  try {
    const { data: sharedLinks, error } = await supabaseServer
      .from('shared_links')
      .select(`
        *,
        shopping_lists!inner(
          id,
          name,
          item_count
        )
      `)
      .eq('shopping_lists.user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user shared links:', error);
      return {
        success: false,
        error: 'FETCH_ERROR',
        message: 'Failed to fetch shared links'
      };
    }

    return {
      success: true,
      shared_links: sharedLinks || []
    };
  } catch (error) {
    console.error('Error in getUserSharedLinks:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred'
    };
  }
}