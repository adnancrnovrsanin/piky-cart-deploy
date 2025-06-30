import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

// Schema for AI-generated shopping tips
const ShoppingTipsSchema = z.object({
  tips: z.array(
    z.object({
      id: z.string().describe('Unique identifier for the tip'),
      type: z.enum(['savings', 'efficiency', 'health', 'budget', 'optimization']).describe('Category of the tip'),
      title: z.string().describe('Short, catchy title for the tip'),
      description: z.string().describe('Detailed explanation of the tip'),
      impact: z.enum(['low', 'medium', 'high']).describe('Expected impact level'),
      actionable: z.boolean().describe('Whether this tip has specific actionable steps'),
      emoji: z.string().describe('Relevant emoji for the tip'),
      priority: z.number().min(1).max(10).describe('Priority ranking (1-10, 10 being highest)'),
    })
  ),
  summary: z.object({
    totalSpent: z.number().describe('Total amount spent in the analyzed period'),
    avgOrderValue: z.number().describe('Average order value'),
    topCategory: z.string().describe('Most spent category'),
    topStore: z.string().describe('Most frequented store'),
    optimizationOpportunity: z.string().describe('Main area for improvement'),
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, shoppingHistory, timeframe = 'last_month' } = body;

    if (!userId || !shoppingHistory || !Array.isArray(shoppingHistory)) {
      return new Response('Missing required data: userId and shoppingHistory', { status: 400 });
    }

    console.log(`Generating tips for user ${userId} with ${shoppingHistory.length} shopping trips`);

    // Analyze the shopping history data
    const analysisData = analyzeShoppingHistory(shoppingHistory);
    
    // Generate AI tips based on the analysis
    const result = await generateObject({
      model: google('gemini-2.0-flash', {
        structuredOutputs: true,
      }),
      messages: [
        {
          role: 'user',
          content: `You are a smart shopping advisor AI. Analyze this user's shopping history from the ${timeframe} and generate personalized, actionable tips to help them save money, shop more efficiently, and make better purchasing decisions.

          Shopping History Analysis:
          ${JSON.stringify(analysisData, null, 2)}

          Generate 3-5 high-quality tips that are:
          1. Specific to their shopping patterns
          2. Actionable with clear next steps
          3. Focused on real savings opportunities
          4. Relevant to their spending habits
          5. Encouraging and positive in tone

          Consider these aspects:
          - Spending patterns and frequency
          - Store preferences and optimization opportunities
          - Category spending distribution
          - Price optimization usage
          - Seasonal trends and bulk buying opportunities
          - Budget management strategies
          - Health and sustainability considerations

          Make the tips personal, practical, and valuable. Use data-driven insights to support your recommendations.`,
        },
      ],
      schema: ShoppingTipsSchema,
      temperature: 0.7, // Slightly higher for more creative tips
    });

    console.log('AI tips generated successfully:', result.object.tips.length, 'tips');

    return Response.json({
      success: true,
      tips: result.object.tips,
      summary: result.object.summary,
      metadata: {
        userId,
        timeframe,
        tripsAnalyzed: shoppingHistory.length,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Error generating shopping tips:', error);
    return new Response('Internal server error during tip generation', { status: 500 });
  }
}

// Helper function to analyze shopping history
function analyzeShoppingHistory(shoppingHistory: any[]) {
  const analysis = {
    totalTrips: shoppingHistory.length,
    totalSpent: 0,
    totalItems: 0,
    avgOrderValue: 0,
    categorySpending: {} as Record<string, number>,
    storeFrequency: {} as Record<string, number>,
    storeSpending: {} as Record<string, number>,
    optimizationUsage: 0,
    completionRates: [] as number[],
    shoppingFrequency: 0,
    topCategories: [] as string[],
    topStores: [] as string[],
    savingsOpportunities: [] as string[],
    spendingTrends: {
      increasing: false,
      stable: true,
      decreasing: false,
    },
    budgetInsights: {
      averageWeeklySpend: 0,
      monthlyProjection: 0,
      seasonalVariation: 'low',
    },
  };

  // Analyze each shopping trip
  shoppingHistory.forEach((trip) => {
    const tripTotal = trip.items?.reduce((total: number, item: any) => {
      if (item.is_purchased && item.price) {
        const itemCost = item.price_per_unit 
          ? item.price * item.quantity 
          : item.price;
        
        // Category spending
        const category = item.category || 'other';
        analysis.categorySpending[category] = (analysis.categorySpending[category] || 0) + itemCost;
        
        // Store analysis
        if (item.store) {
          analysis.storeFrequency[item.store] = (analysis.storeFrequency[item.store] || 0) + 1;
          analysis.storeSpending[item.store] = (analysis.storeSpending[item.store] || 0) + itemCost;
        }
        
        return total + itemCost;
      }
      return total;
    }, 0) || 0;

    analysis.totalSpent += tripTotal;
    analysis.totalItems += trip.item_count || 0;
    
    // Completion rate
    const completionRate = trip.item_count > 0 
      ? (trip.purchased_count || 0) / trip.item_count 
      : 0;
    analysis.completionRates.push(completionRate);
    
    // Check if optimization was used (items have store assignments and prices)
    const optimizedItems = trip.items?.filter((item: any) => item.store && item.price) || [];
    if (optimizedItems.length > (trip.item_count || 0) * 0.5) {
      analysis.optimizationUsage++;
    }
  });

  // Calculate derived metrics
  analysis.avgOrderValue = analysis.totalTrips > 0 ? analysis.totalSpent / analysis.totalTrips : 0;
  analysis.shoppingFrequency = analysis.totalTrips; // trips per month
  
  // Top categories and stores
  analysis.topCategories = Object.entries(analysis.categorySpending)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);
    
  analysis.topStores = Object.entries(analysis.storeSpending)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([store]) => store);

  // Budget insights
  analysis.budgetInsights.averageWeeklySpend = analysis.totalSpent / 4; // Assuming monthly data
  analysis.budgetInsights.monthlyProjection = analysis.totalSpent;

  // Identify savings opportunities
  if (analysis.optimizationUsage / analysis.totalTrips < 0.3) {
    analysis.savingsOpportunities.push('cart_optimization');
  }
  
  if (analysis.storeFrequency && Object.keys(analysis.storeFrequency).length > 3) {
    analysis.savingsOpportunities.push('store_consolidation');
  }
  
  const avgCompletionRate = analysis.completionRates.reduce((sum, rate) => sum + rate, 0) / analysis.completionRates.length;
  if (avgCompletionRate < 0.8) {
    analysis.savingsOpportunities.push('better_planning');
  }

  return analysis;
}