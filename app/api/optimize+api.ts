import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Schema for store identification
const StoreIdentificationSchema = z.object({
  stores: z.array(
    z.object({
      name: z.string().describe('The name of the retailer'),
      website: z.string().describe('The website URL of the retailer'),
      type: z.string().describe('Type of store (grocery, pharmacy, department, etc.)'),
      likelihood: z.number().min(1).max(10).describe('Likelihood this store has the items (1-10)'),
    })
  ),
});

// Schema for price research results
const PriceResearchSchema = z.object({
  results: z.array(
    z.object({
      itemName: z.string().describe('The name of the item'),
      brand: z.string().optional().describe('The brand of the item if specified'),
      quantity: z.number().describe('The quantity of the item'),
      quantity_unit: z.string().describe('The unit of measurement'),
      storeName: z.string().describe('The name of the store'),
      price: z.number().describe('The estimated price in dollars'),
      price_per_unit: z.boolean().describe('Whether the price is per unit (true) or total (false)'),
      availability: z.enum(['available', 'likely_available', 'uncertain', 'unavailable']).describe('Availability status'),
      confidence: z.number().min(1).max(10).describe('Confidence in this price estimate (1-10)'),
      notes: z.string().optional().describe('Additional notes about the item or price'),
    })
  ),
});

// Schema for optimization results
const OptimizationResultSchema = z.object({
  optimizedGroups: z.array(
    z.object({
      storeName: z.string(),
      storeAddress: z.string().optional(),
      items: z.array(
        z.object({
          itemId: z.string(),
          itemName: z.string(),
          brand: z.string().optional(),
          quantity: z.number(),
          quantity_unit: z.string(),
          originalPrice: z.number().optional(),
          optimizedPrice: z.number(),
          price_per_unit: z.boolean(),
          savings: z.number(),
          confidence: z.number(),
        })
      ),
      totalSavings: z.number(),
      travelDistance: z.string().optional(),
    })
  ),
  totalPotentialSavings: z.number(),
  recommendedRoute: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, location, constraints = {} } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response('Items array is required', { status: 400 });
    }

    if (!location || !location.latitude || !location.longitude) {
      return new Response('Location is required', { status: 400 });
    }

    console.log('Starting optimization for', items.length, 'items at location:', location);

    // Step 1: Identify relevant stores
    const storeIdentificationResult = await generateObject({
      model: google('gemini-2.0-flash', {
        structuredOutputs: true,
      }),
      messages: [
        {
          role: 'user',
          content: `Based on the location (latitude: ${location.latitude}, longitude: ${location.longitude}) and these shopping items: ${items.map(item => `${item.name}${item.brand ? ` (${item.brand})` : ''} - ${item.quantity} ${item.quantity_unit || 'units'} (${item.category})`).join(', ')}, identify the top 4-5 physical retail stores in this area that would likely carry these items. Focus on major chains and local stores that typically stock these categories. Consider grocery stores, pharmacies, department stores, and specialty retailers.`,
        },
      ],
      schema: StoreIdentificationSchema,
      temperature: 0.3,
    });

    console.log('Identified stores:', storeIdentificationResult.object.stores);

    // Step 2: Research prices for each store
    const priceResearchPromises = storeIdentificationResult.object.stores.map(async (store) => {
      try {
        const result = await generateObject({
          model: google('gemini-2.0-flash', {
            structuredOutputs: true,
          }),
          messages: [
            {
              role: 'user',
              content: `You are a price research assistant. For the store "${store.name}" (${store.type}), estimate realistic prices for these items: ${items.map(item => `${item.name}${item.brand ? ` (brand: ${item.brand})` : ''} - ${item.quantity} ${item.quantity_unit || 'units'} (category: ${item.category})`).join(', ')}. 

              Consider:
              - Typical pricing for this store type
              - Regional pricing variations
              - Current market conditions
              - Store positioning (budget, mid-range, premium)
              - Brand preferences and availability (if brand is specified, prioritize that brand's pricing)
              - Generic vs brand name pricing differences
              - Quantity and unit considerations (bulk pricing, per-unit costs)
              - Whether prices are typically per-unit (per kg, per pack) or total prices
              
              For pricing type, determine:
              - price_per_unit: true for items typically sold by weight/volume (meat, produce, liquids)
              - price_per_unit: false for packaged items with fixed prices (boxes, cans, individual items)
              
              Provide realistic price estimates in USD. Consider whether the price should be per unit or total based on how the item is typically sold. If an item is unlikely to be available at this store, mark it as unavailable. Be conservative with availability - only mark as available if the store type typically carries that category. When a specific brand is mentioned, consider whether this store typically stocks that brand.`,
            },
          ],
          schema: PriceResearchSchema,
          temperature: 0.2,
        });

        return {
          store: store.name,
          results: result.object.results,
        };
      } catch (error) {
        console.error(`Error researching prices for ${store.name}:`, error);
        return {
          store: store.name,
          results: [],
        };
      }
    });

    const priceResearchResults = await Promise.all(priceResearchPromises);
    console.log('Price research completed for', priceResearchResults.length, 'stores');

    // Step 3: Aggregate and optimize
    const aggregationResult = await generateObject({
      model: google('gemini-2.0-flash', {
        structuredOutputs: true,
      }),
      messages: [
        {
          role: 'user',
          content: `You are an optimization engine. Analyze these price research results and create an optimized shopping plan:

          Original Items: ${JSON.stringify(items, null, 2)}
          
          Price Research Results: ${JSON.stringify(priceResearchResults, null, 2)}
          
          User Constraints: ${JSON.stringify(constraints, null, 2)}
          
          Create an optimization that:
          1. Groups items by store to minimize trips
          2. Maximizes savings while respecting user constraints
          3. Considers realistic travel between stores
          4. Only includes items with high confidence availability
          5. Provides meaningful savings (at least $0.50 per item or 10% savings)
          6. Respects brand preferences when specified - if a user has a specific brand preference, prioritize that unless significant savings justify a brand switch
          7. Consider brand loyalty constraints from user preferences
          8. Maintains quantity and unit information accurately
          9. Considers bulk pricing and unit economics
          10. Properly handles per-unit vs total pricing:
              - For per-unit items (price_per_unit: true): calculate total cost as price × quantity
              - For total price items (price_per_unit: false): use price as-is for the specified quantity
          11. Ensure price_per_unit flag is correctly set based on how the item is typically sold
          
          For each optimized group, calculate total savings and provide store addresses if possible. Estimate travel distances between stores. Only recommend this optimization if total savings exceed $5.00.
          
          IMPORTANT: For each item in the optimization results, include the itemId from the original items array so we can update the correct items in the database. Also include the brand information, quantity, quantity_unit, and price_per_unit when available.`,
        },
      ],
      schema: OptimizationResultSchema,
      temperature: 0.1,
    });

    console.log('Optimization completed:', aggregationResult.object);

    // Return the optimization results
    return Response.json({
      success: true,
      optimization: aggregationResult.object,
      metadata: {
        storesResearched: storeIdentificationResult.object.stores.length,
        itemsAnalyzed: items.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error in optimization API:', error);
    return new Response('Internal server error during optimization', { status: 500 });
  }
}