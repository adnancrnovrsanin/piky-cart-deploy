import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Define the schema for shopping list items, mirroring the backend
const ShoppingListSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe('The name of the item'),
      quantity: z.number().min(1).describe('The quantity needed'),
      quantity_unit: z.string().optional().describe('The unit of measurement (kg, g, lb, oz, l, ml, units, packs, etc.)'),
      category: z
        .string()
        .describe(
          'The category of the item (produce, dairy, meat, bakery, frozen, pantry, beverages, household, personal, other)'
        ),
      brand: z.string().optional().describe('The brand or manufacturer of the item if mentioned'),
      price: z.number().optional().describe('The price of the item if mentioned'),
      price_per_unit: z.boolean().optional().describe('Whether the price is per unit/quantity (true) or total price (false)'),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, content } = body;
    console.log(
      'Received request - Type:',
      type,
      'Content snippet:',
      typeof content === 'string' && content.length > 100
        ? content.substring(0, 100) + '...'
        : content
    );

    if (!type || !content) {
      return new Response('Missing type or content', { status: 400 });
    }

    let prompt = '';
    let messages: any[] = [];

    if (type === 'text') {
      prompt = `Extract shopping list items from this text. Parse the text and identify individual items, their quantities with appropriate units, categories, brands/manufacturers if mentioned, and prices with pricing type if mentioned. 

      For quantities, detect and extract the appropriate unit:
      - Weight: kg, g, lb, oz (e.g., "2 kg beef", "500g flour", "1 lb chicken")
      - Volume: l, ml, gal, qt, pt, fl_oz, cups, tbsp, tsp (e.g., "2L milk", "500ml shampoo", "1 gal water")
      - Count: units, pieces, dozen, pairs (e.g., "6 apples", "1 dozen eggs", "2 pairs socks")
      - Packaging: packs, boxes, bottles, cans, jars, bags, loaves, rolls (e.g., "2 packs gum", "1 box cereal")
      - Food-specific: slices, bunches, heads, cloves, stalks, sprigs (e.g., "1 head lettuce", "2 bunches bananas")

      For prices, determine if the price is:
      - Per unit/quantity (price_per_unit: true): "$2 per kg", "$1.50 per pack", "$3 per bottle"
      - Total price (price_per_unit: false): "$5 total", "$10 for 2 items", "costs $15"

      If no quantity is specified, assume 1. If no unit is specified, use "units" as default.
      Categories should be one of: produce, dairy, meat, bakery, frozen, pantry, beverages, household, personal, other.
      Extract brand names when they are explicitly mentioned (e.g., "Coca-Cola", "Nike", "Apple iPhone", etc.).
      Extract prices when mentioned and determine if they are per-unit or total prices.

      Text: "${content}"

      Return a structured list of items with name, quantity, quantity_unit, category, brand (if mentioned), price (if mentioned), and price_per_unit (if price is mentioned).`;

      messages = [
        {
          role: 'user',
          content: prompt,
        },
      ];
    } else if (type === 'image') {
      // Handle base64 image
      const base64Data = content.replace(/^data:image\/[a-z]+;base64,/, '');

      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract all items, quantities with units, categories, brands, and prices from this image. This could be a receipt, shopping list, menu, or recipe. 

              For each item, identify:
              1. Name of the item
              2. Quantity with appropriate unit (kg, g, lb, oz, l, ml, units, packs, boxes, etc.)
              3. Category (produce, dairy, meat, bakery, frozen, pantry, beverages, household, personal, other)
              4. Brand (if visible on packaging, receipts, or labels)
              5. Price (if visible) and determine if it's per-unit or total:
                 - Per unit: "$2/kg", "$1.50 each", "$3 per bottle" (price_per_unit: true)
                 - Total: "$5.99", "$10.00 total", line item prices (price_per_unit: false)

              If no quantity is visible, assume 1. If no unit is specified, use "units" as default.
              Extract brand information when clearly visible on packaging, receipts, or labels.
              Extract pricing information from receipts, price tags, or menus when visible.`,
            },
            {
              type: 'image',
              image: base64Data,
            },
          ],
        },
      ];
      console.log(
        'Constructed messages for AI:',
        JSON.stringify(messages, null, 2)
      );
    } else {
      return new Response('Invalid type. Must be "text" or "image"', {
        status: 400,
      });
    }

    // Generate structured object using Gemini 2.0 Flash with structured outputs
    const result = await generateObject({
      model: google('gemini-2.0-flash', {
        structuredOutputs: true, // Enable structured outputs for Google provider
      }),
      messages,
      schema: ShoppingListSchema,
      temperature: 0.1, // Lower temperature for more consistent parsing
    });

    console.log(
      'Received object from generateObject:',
      JSON.stringify(result.object, null, 2)
    );

    // Check if the result has the expected structure
    if (!result.object || !Array.isArray(result.object.items)) {
      console.error(
        'generateObject did not return the expected structure. Result:',
        JSON.stringify(result.object, null, 2)
      );
    }

    return Response.json(result.object);
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response('Internal server error', { status: 500 });
  }
}