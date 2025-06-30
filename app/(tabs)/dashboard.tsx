import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useShopping } from '@/contexts/ShoppingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import { ShoppingCart, Package, CircleCheck as CheckCircle, TrendingUp, TrendingDown, DollarSign, Calendar, Store, Target, PiggyBank, ChartBar as BarChart3, Clock, Award, Zap, Sparkles, RefreshCw } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ITEM_CATEGORIES, formatCurrency, calculateItemTotalCost } from '@/types';
import { COLORS, FONTS, FONT_SIZES, TEXT_STYLES, SPACING, BORDER_RADIUS, CHART_COLOR_PALETTE } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

interface AITip {
  id: string;
  type: 'savings' | 'efficiency' | 'health' | 'budget' | 'optimization';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  emoji: string;
  priority: number;
}

interface TipsSummary {
  totalSpent: number;
  avgOrderValue: number;
  topCategory: string;
  topStore: string;
  optimizationOpportunity: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { lists, archivedLists, refreshLists, refreshArchivedLists } = useShopping();
  const { preferences } = useUserPreferences();
  
  const [aiTips, setAiTips] = useState<AITip[]>([]);
  const [tipsSummary, setTipsSummary] = useState<TipsSummary | null>(null);
  const [loadingTips, setLoadingTips] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastTipsUpdate, setLastTipsUpdate] = useState<Date | null>(null);

  // Real dashboard data calculated from actual database
  const dashboardData = useMemo(() => {
    const activeLists = lists.filter(list => !list.is_archived);
    const completedLists = archivedLists;
    const allLists = [...activeLists, ...completedLists];
    
    const totalItems = activeLists.reduce((sum, list) => sum + (list.item_count || 0), 0);
    const purchasedItems = activeLists.reduce((sum, list) => sum + (list.purchased_count || 0), 0);
    const pendingItems = totalItems - purchasedItems;

    // Calculate real spending analytics from completed lists
    const totalSpent = completedLists.reduce((total, list) => {
      return total + (list.items?.reduce((listTotal, item) => {
        return listTotal + (item.is_purchased && item.price ? calculateItemTotalCost(item.price, item.quantity, item.price_per_unit) : 0);
      }, 0) || 0);
    }, 0);

    const monthlySpending = calculateRealMonthlySpending(completedLists);
    const avgOrderValue = completedLists.length > 0 ? totalSpent / completedLists.length : 0;
    
    // Real store analytics
    const storeAnalytics = calculateRealStoreAnalytics(allLists);
    const topStores = storeAnalytics.slice(0, 5);
    
    // Real category spending
    const categorySpending = calculateRealCategorySpending(allLists);
    
    // Real savings analytics (based on optimization usage)
    const savingsAnalytics = calculateRealSavings(completedLists);
    
    // Real shopping frequency
    const shoppingFrequency = calculateRealShoppingFrequency(completedLists);
    
    // Real price insights
    const priceInsights = calculateRealPriceInsights(allLists);

    // Convert category spending to chart data
    const categoryChartData = Object.entries(categorySpending)
      .filter(([_, amount]) => amount > 0)
      .map(([category, amount], index) => {
        const categoryInfo = ITEM_CATEGORIES.find(cat => cat.value === category);
        return {
          name: categoryInfo?.label || category,
          population: amount,
          color: CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length],
          legendFontColor: COLORS.text,
          legendFontSize: FONT_SIZES.caption,
        };
      })
      .sort((a, b) => b.population - a.population)
      .slice(0, 6);

    return {
      activeLists: activeLists.length,
      completedLists: completedLists.length,
      totalItems,
      purchasedItems,
      pendingItems,
      totalSpent,
      monthlySpending,
      avgOrderValue,
      storeAnalytics: topStores,
      categoryChartData,
      categorySpending,
      savingsAnalytics,
      shoppingFrequency,
      priceInsights,
    };
  }, [lists, archivedLists]);

  // Load AI tips on component mount and when data changes significantly
  useEffect(() => {
    if (user && archivedLists.length > 0) {
      // Only generate new tips if we don't have recent ones
      const shouldGenerateNewTips = !lastTipsUpdate || 
        Date.now() - lastTipsUpdate.getTime() > 24 * 60 * 60 * 1000; // 24 hours
      
      if (shouldGenerateNewTips) {
        generateAITips();
      }
    }
  }, [user, archivedLists.length]);

  const generateAITips = async () => {
    if (!user || archivedLists.length === 0) return;

    setLoadingTips(true);
    try {
      // Get last month's shopping history
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const recentHistory = archivedLists.filter(list => 
        new Date(list.updated_at) >= oneMonthAgo
      );

      if (recentHistory.length === 0) {
        console.log('No recent shopping history found for AI tips');
        setLoadingTips(false);
        return;
      }

      const response = await fetch('/api/generate-tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          shoppingHistory: recentHistory,
          timeframe: 'last_month',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate tips: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setAiTips(result.tips);
        setTipsSummary(result.summary);
        setLastTipsUpdate(new Date());
        console.log('AI tips generated successfully:', result.tips.length, 'tips');
      } else {
        throw new Error('AI tip generation failed');
      }
    } catch (error) {
      console.error('Error generating AI tips:', error);
      // Set fallback tips if AI generation fails
      setAiTips([
        {
          id: 'fallback-1',
          type: 'savings',
          title: 'Try Cart Optimization',
          description: 'Use our AI-powered cart optimization to compare prices across stores and save money on your next shopping trip.',
          impact: 'high',
          actionable: true,
          emoji: '💰',
          priority: 8,
        },
      ]);
    } finally {
      setLoadingTips(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshLists(),
        refreshArchivedLists(),
      ]);
      // Regenerate tips with fresh data
      await generateAITips();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper functions for real data calculations
  function calculateRealMonthlySpending(completedLists: any[]) {
    const monthlyData: Record<string, number> = {};
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toISOString().slice(0, 7);
    }).reverse();

    last6Months.forEach(month => {
      monthlyData[month] = 0;
    });

    completedLists.forEach(list => {
      const listMonth = new Date(list.updated_at).toISOString().slice(0, 7);
      if (monthlyData.hasOwnProperty(listMonth)) {
        const listSpending = list.items?.reduce((total: number, item: any) => {
          return total + (item.is_purchased && item.price ? calculateItemTotalCost(item.price, item.quantity, item.price_per_unit) : 0);
        }, 0) || 0;
        monthlyData[listMonth] += listSpending;
      }
    });

    return {
      labels: last6Months.map(month => {
        const [year, monthNum] = month.split('-');
        return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short' });
      }),
      datasets: [{
        data: last6Months.map(month => monthlyData[month]),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
      }]
    };
  }

  function calculateRealStoreAnalytics(allLists: any[]) {
    const storeData: Record<string, { spent: number; visits: number; items: number }> = {};

    allLists.forEach(list => {
      if (list.items) {
        const storesInList = new Set<string>();
        
        list.items.forEach((item: any) => {
          if (item.store && item.is_purchased) {
            if (!storeData[item.store]) {
              storeData[item.store] = { spent: 0, visits: 0, items: 0 };
            }
            const cost = item.price ? calculateItemTotalCost(item.price, item.quantity, item.price_per_unit) : 0;
            storeData[item.store].spent += cost;
            storeData[item.store].items += item.quantity;
            storesInList.add(item.store);
          }
        });
        
        // Count visits (one visit per completed list per store)
        if (list.is_archived) {
          storesInList.forEach(store => {
            if (storeData[store]) {
              storeData[store].visits += 1;
            }
          });
        }
      }
    });

    return Object.entries(storeData)
      .map(([store, data]) => ({
        name: store,
        spent: data.spent,
        visits: data.visits,
        items: data.items,
        avgPerVisit: data.visits > 0 ? data.spent / data.visits : 0,
      }))
      .sort((a, b) => b.spent - a.spent);
  }

  function calculateRealCategorySpending(allLists: any[]) {
    const categoryData: Record<string, number> = {};

    allLists.forEach(list => {
      if (list.items) {
        list.items.forEach((item: any) => {
          if (item.is_purchased && item.price) {
            const category = item.category || 'other';
            const cost = calculateItemTotalCost(item.price, item.quantity, item.price_per_unit);
            categoryData[category] = (categoryData[category] || 0) + cost;
          }
        });
      }
    });

    return categoryData;
  }

  function calculateRealSavings(completedLists: any[]) {
    let totalSavings = 0;
    let optimizationsUsed = 0;
    let totalSpent = 0;

    completedLists.forEach(list => {
      if (list.items) {
        const optimizedItems = list.items.filter((item: any) => item.store && item.price);
        const listSpent = list.items.reduce((total: number, item: any) => {
          return total + (item.is_purchased && item.price ? calculateItemTotalCost(item.price, item.quantity, item.price_per_unit) : 0);
        }, 0);
        
        totalSpent += listSpent;
        
        // If more than 50% of items were optimized, count as optimization used
        if (optimizedItems.length > list.items.length * 0.5) {
          optimizationsUsed++;
          // Estimate 12% savings when optimization is used
          totalSavings += listSpent * 0.12;
        }
      }
    });

    const avgSavingsPerTrip = completedLists.length > 0 ? totalSavings / completedLists.length : 0;
    const savingsRate = totalSpent > 0 ? (totalSavings / (totalSpent + totalSavings)) * 100 : 0;

    return {
      totalSavings,
      avgSavingsPerTrip,
      optimizationsUsed,
      savingsRate,
    };
  }

  function calculateRealShoppingFrequency(completedLists: any[]) {
    if (completedLists.length < 2) return { frequency: 0, trend: 'stable' };

    const sortedLists = completedLists
      .filter(list => list.updated_at)
      .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());

    if (sortedLists.length < 2) return { frequency: 0, trend: 'stable' };

    const intervals = [];
    for (let i = 1; i < sortedLists.length; i++) {
      const prev = new Date(sortedLists[i - 1].updated_at);
      const curr = new Date(sortedLists[i].updated_at);
      intervals.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const frequency = 7 / avgInterval; // trips per week

    // Determine trend
    const recentIntervals = intervals.slice(-3);
    const olderIntervals = intervals.slice(0, -3);
    
    if (recentIntervals.length === 0 || olderIntervals.length === 0) {
      return { frequency, trend: 'stable' };
    }
    
    const recentAvg = recentIntervals.reduce((sum, interval) => sum + interval, 0) / recentIntervals.length;
    const olderAvg = olderIntervals.reduce((sum, interval) => sum + interval, 0) / olderIntervals.length;
    
    let trend = 'stable';
    if (recentAvg < olderAvg * 0.9) trend = 'increasing';
    else if (recentAvg > olderAvg * 1.1) trend = 'decreasing';

    return { frequency, trend };
  }

  function calculateRealPriceInsights(allLists: any[]) {
    const itemPrices: Record<string, number[]> = {};

    allLists.forEach(list => {
      if (list.items) {
        list.items.forEach((item: any) => {
          if (item.price && item.is_purchased) {
            const key = item.name.toLowerCase();
            if (!itemPrices[key]) itemPrices[key] = [];
            itemPrices[key].push(item.price);
          }
        });
      }
    });

    const insights = Object.entries(itemPrices)
      .filter(([_, prices]) => prices.length > 1)
      .map(([item, prices]) => {
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const variance = maxPrice - minPrice;
        const variancePercent = avgPrice > 0 ? (variance / avgPrice) * 100 : 0;

        return {
          item,
          avgPrice,
          minPrice,
          maxPrice,
          variance,
          variancePercent,
          purchases: prices.length,
        };
      })
      .sort((a, b) => b.variancePercent - a.variancePercent)
      .slice(0, 5);

    return insights;
  }

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    color = 'COLORS.secondary',
    delay = 0,
    trend,
    onPress,
  }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    delay?: number;
    trend?: 'up' | 'down' | 'stable';
    onPress?: () => void;
  }) => (
    <Animated.View entering={FadeInUp.delay(delay)} style={styles.statCard}>
      <TouchableOpacity 
        style={styles.statCardContent} 
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
          <Icon size={24} color={color} />
        </View>
        <View style={styles.statContent}>
          <View style={styles.statValueContainer}>
            <Text style={styles.statValue}>{value}</Text>
            {trend && (
              <View style={styles.trendContainer}>
                {trend === 'up' && <TrendingUp size={16} color="COLORS.success" />}
                {trend === 'down' && <TrendingDown size={16} color="COLORS.error" />}
                {trend === 'stable' && <View style={styles.stableTrend} />}
              </View>
            )}
          </View>
          <Text style={styles.statTitle}>{title}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const SpendingInsightsHub = () => (
    <Animated.View entering={FadeInUp.delay(400)} style={styles.insightsHub}>
      <View style={styles.insightsHeader}>
        <BarChart3 size={24} color="COLORS.secondary" />
        <Text style={styles.insightsTitle}>Spending Insights</Text>
      </View>
      
      <View style={styles.insightsGrid}>
        <View style={styles.insightCard}>
          <Text style={styles.insightValue}>
            {formatCurrency(dashboardData.totalSpent, preferences.currency)}
          </Text>
          <Text style={styles.insightLabel}>Total Spent</Text>
        </View>
        
        <View style={styles.insightCard}>
          <Text style={styles.insightValue}>
            {formatCurrency(dashboardData.avgOrderValue, preferences.currency)}
          </Text>
          <Text style={styles.insightLabel}>Avg per Trip</Text>
        </View>
        
        <View style={styles.insightCard}>
          <Text style={styles.insightValue}>
            {dashboardData.savingsAnalytics.savingsRate.toFixed(1)}%
          </Text>
          <Text style={styles.insightLabel}>Savings Rate</Text>
        </View>
      </View>
    </Animated.View>
  );

  const SavingsHub = () => (
    <Animated.View entering={FadeInUp.delay(600)} style={styles.savingsHub}>
      <View style={styles.savingsHeader}>
        <PiggyBank size={24} color="COLORS.success" />
        <Text style={styles.savingsTitle}>Smart Savings</Text>
        {dashboardData.savingsAnalytics.savingsRate > 10 && (
          <View style={styles.savingsBadge}>
            <Award size={16} color="COLORS.accent" />
            <Text style={styles.savingsBadgeText}>Pro Saver</Text>
          </View>
        )}
      </View>
      
      <View style={styles.savingsGrid}>
        <View style={styles.savingsCard}>
          <Text style={styles.savingsAmount}>
            {formatCurrency(dashboardData.savingsAnalytics.totalSavings, preferences.currency)}
          </Text>
          <Text style={styles.savingsLabel}>Total Saved</Text>
        </View>
        
        <View style={styles.savingsCard}>
          <Text style={styles.savingsAmount}>
            {formatCurrency(dashboardData.savingsAnalytics.avgSavingsPerTrip, preferences.currency)}
          </Text>
          <Text style={styles.savingsLabel}>Avg per Trip</Text>
        </View>
        
        <View style={styles.savingsCard}>
          <Text style={styles.savingsAmount}>
            {dashboardData.savingsAnalytics.optimizationsUsed}
          </Text>
          <Text style={styles.savingsLabel}>Optimizations</Text>
        </View>
      </View>
      
      <Text style={styles.savingsDescription}>
        {dashboardData.savingsAnalytics.savingsRate > 0 
          ? `You're saving ${dashboardData.savingsAnalytics.savingsRate.toFixed(1)}% on average through smart shopping! Keep using cart optimization to maximize your savings.`
          : 'Start using cart optimization to save money on your shopping trips!'
        }
      </Text>
    </Animated.View>
  );

  const AITipsSection = () => (
    <Animated.View entering={FadeInUp.delay(1600)} style={styles.aiTipsSection}>
      <View style={styles.aiTipsHeader}>
        <Sparkles size={24} color="#8B5CF6" />
        <Text style={styles.aiTipsTitle}>AI Shopping Tips</Text>
        <TouchableOpacity 
          style={styles.refreshTipsButton}
          onPress={generateAITips}
          disabled={loadingTips}
        >
          {loadingTips ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <RefreshCw size={16} color="#8B5CF6" />
          )}
        </TouchableOpacity>
      </View>
      
      {loadingTips ? (
        <View style={styles.loadingTips}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingTipsText}>Analyzing your shopping patterns...</Text>
        </View>
      ) : aiTips.length > 0 ? (
        <View style={styles.tipsList}>
          {aiTips.slice(0, 3).map((tip, index) => (
            <View key={tip.id} style={styles.tipItem}>
              <View style={styles.tipHeader}>
                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                <View style={styles.tipHeaderText}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <View style={styles.tipMeta}>
                    <View style={[
                      styles.tipImpact,
                      tip.impact === 'high' ? styles.tipImpactHigh :
                      tip.impact === 'medium' ? styles.tipImpactMedium :
                      styles.tipImpactLow
                    ]}>
                      <Text style={styles.tipImpactText}>{tip.impact} impact</Text>
                    </View>
                    <Text style={styles.tipType}>{tip.type}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.tipDescription}>{tip.description}</Text>
            </View>
          ))}
          
          {lastTipsUpdate && (
            <Text style={styles.tipsTimestamp}>
              Last updated: {lastTipsUpdate.toLocaleDateString()}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.noTips}>
          <Text style={styles.noTipsText}>
            Complete a few shopping trips to get personalized AI tips!
          </Text>
        </View>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Welcome back, {user?.display_name || 'there'}!
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="COLORS.secondary"
          />
        }
      >
        <View style={styles.content}>
          <Animated.View entering={FadeInUp} style={styles.statsGrid}>
            <StatCard
              icon={ShoppingCart}
              title="Active Lists"
              value={dashboardData.activeLists}
              subtitle="Currently active"
              color="COLORS.secondary"
              delay={0}
            />
            <StatCard
              icon={Package}
              title="Total Items"
              value={dashboardData.totalItems}
              subtitle="To purchase"
              color="COLORS.success"
              delay={100}
            />
            <StatCard
              icon={CheckCircle}
              title="Purchased"
              value={dashboardData.purchasedItems}
              subtitle="Items completed"
              color="#059669"
              delay={200}
            />
            <StatCard
              icon={DollarSign}
              title="Saved"
              value={`${formatCurrency(dashboardData.savingsAnalytics.totalSavings, preferences.currency, { showSymbol: false })}`}
              subtitle="Through optimization"
              color="COLORS.accent"
              delay={300}
            />
          </Animated.View>

          <SpendingInsightsHub />
          <SavingsHub />
          <AITipsSection />

          {dashboardData.storeAnalytics.length > 0 && (
            <Animated.View entering={FadeInUp.delay(800)} style={styles.storeAnalytics}>
              <View style={styles.sectionHeader}>
                <Store size={24} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Store Analytics</Text>
              </View>
              
              <View style={styles.storeList}>
                {dashboardData.storeAnalytics.map((store, index) => (
                  <View key={store.name} style={styles.storeItem}>
                    <View style={styles.storeInfo}>
                      <Text style={styles.storeName}>{store.name}</Text>
                      <Text style={styles.storeStats}>
                        {store.visits} visits • {store.items} items
                      </Text>
                    </View>
                    <View style={styles.storeSpending}>
                      <Text style={styles.storeAmount}>
                        {formatCurrency(store.spent, preferences.currency)}
                      </Text>
                      <Text style={styles.storeAvg}>
                        {formatCurrency(store.avgPerVisit, preferences.currency)}/visit
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {dashboardData.monthlySpending.datasets[0].data.some(val => val > 0) && (
            <Animated.View entering={FadeInUp.delay(1000)} style={styles.trendsSection}>
              <Text style={styles.sectionTitle}>Monthly Spending Trends</Text>
              <Text style={styles.sectionSubtitle}>
                Your actual spending patterns over the last 6 months
              </Text>
              
              <View style={styles.chartContainer}>
                <LineChart
                  data={dashboardData.monthlySpending}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={{
                    backgroundColor: COLORS.background,
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
                    style: {
                      borderRadius: BORDER_RADIUS.xs,
                    },
                    propsForDots: {
                      r: '6',
                      strokeWidth: '2',
                      stroke: 'COLORS.secondary',
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: BORDER_RADIUS.xs,
                  }}
                />
              </View>
            </Animated.View>
          )}

          {dashboardData.categoryChartData.length > 0 && (
            <Animated.View entering={FadeInUp.delay(1100)} style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Category Spending</Text>
              <Text style={styles.sectionSubtitle}>
                Where your money actually goes across different categories
              </Text>
              
              <View style={styles.chartContainer}>
                <PieChart
                  data={dashboardData.categoryChartData}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={{
                    backgroundColor: COLORS.background,
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  center={[10, 10]}
                  absolute
                />
              </View>
            </Animated.View>
          )}

          {dashboardData.priceInsights.length > 0 && (
            <Animated.View entering={FadeInUp.delay(1200)} style={styles.priceInsights}>
              <View style={styles.sectionHeader}>
                <Target size={24} color="COLORS.accent" />
                <Text style={styles.sectionTitle}>Price Insights</Text>
              </View>
              
              <View style={styles.priceList}>
                {dashboardData.priceInsights.map((insight, index) => (
                  <View key={insight.item} style={styles.priceItem}>
                    <View style={styles.priceInfo}>
                      <Text style={styles.priceItemName}>
                        {insight.item.charAt(0).toUpperCase() + insight.item.slice(1)}
                      </Text>
                      <Text style={styles.priceStats}>
                        {insight.purchases} purchases • {insight.variancePercent.toFixed(1)}% variance
                      </Text>
                    </View>
                    <View style={styles.priceRange}>
                      <Text style={styles.priceAvg}>
                        {formatCurrency(insight.avgPrice, preferences.currency)} avg
                      </Text>
                      <Text style={styles.priceMinMax}>
                        {formatCurrency(insight.minPrice, preferences.currency)} - {formatCurrency(insight.maxPrice, preferences.currency)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.delay(1400)} style={styles.habitsSection}>
            <View style={styles.sectionHeader}>
              <Clock size={24} color="#EC4899" />
              <Text style={styles.sectionTitle}>Shopping Habits</Text>
            </View>
            
            <View style={styles.habitsGrid}>
              <View style={styles.habitCard}>
                <Text style={styles.habitValue}>
                  {dashboardData.shoppingFrequency.frequency.toFixed(1)}x
                </Text>
                <Text style={styles.habitLabel}>Per Week</Text>
                <View style={styles.habitTrend}>
                  {dashboardData.shoppingFrequency.trend === 'increasing' && (
                    <>
                      <TrendingUp size={14} color="COLORS.success" />
                      <Text style={[styles.habitTrendText, { color: 'COLORS.success' }]}>Increasing</Text>
                    </>
                  )}
                  {dashboardData.shoppingFrequency.trend === 'decreasing' && (
                    <>
                      <TrendingDown size={14} color="COLORS.error" />
                      <Text style={[styles.habitTrendText, { color: 'COLORS.error' }]}>Decreasing</Text>
                    </>
                  )}
                  {dashboardData.shoppingFrequency.trend === 'stable' && (
                    <Text style={[styles.habitTrendText, { color: '#6B7280' }]}>Stable</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.habitCard}>
                <Text style={styles.habitValue}>{dashboardData.completedLists}</Text>
                <Text style={styles.habitLabel}>Trips Completed</Text>
              </View>
              
              <View style={styles.habitCard}>
                <Text style={styles.habitValue}>
                  {dashboardData.completedLists > 0 
                    ? Math.round(dashboardData.totalItems / Math.max(dashboardData.completedLists, 1))
                    : '0'
                  }
                </Text>
                <Text style={styles.habitLabel}>Items per Trip</Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.heading.bold,
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xs,
    width: (screenWidth - 44) / 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.heading.bold,
    color: '#111827',
  },
  trendContainer: {
    marginLeft: 8,
  },
  stableTrend: {
    width: 16,
    height: 2,
    backgroundColor: '#6B7280',
    borderRadius: 1,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: FONTS.body.medium,
    color: '#6B7280',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    fontFamily: FONTS.body.regular,
    color: '#9CA3AF',
    marginTop: 1,
  },
  insightsHub: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.lg,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.semiBold,
    color: '#111827',
    marginLeft: 8,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightCard: {
    alignItems: 'center',
    flex: 1,
  },
  insightValue: {
    fontSize: 24,
    fontFamily: FONTS.heading.bold,
    color: 'COLORS.secondary',
  },
  insightLabel: {
    fontSize: 12,
    fontFamily: FONTS.body.medium,
    color: '#6B7280',
    marginTop: 4,
  },
  savingsHub: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.lg,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  savingsTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.semiBold,
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.heading.semiBold,
    color: 'COLORS.accent',
    marginLeft: 4,
  },
  savingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  savingsCard: {
    alignItems: 'center',
    flex: 1,
  },
  savingsAmount: {
    fontSize: 24,
    fontFamily: FONTS.heading.bold,
    color: 'COLORS.success',
  },
  savingsLabel: {
    fontSize: 12,
    fontFamily: FONTS.body.medium,
    color: '#6B7280',
    marginTop: 4,
  },
  savingsDescription: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  aiTipsSection: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.lg,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  aiTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiTipsTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.semiBold,
    color: '#111827',
    marginLeft: 8,
    flex: 1,
  },
  refreshTipsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  loadingTips: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingTipsText: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: '#6B7280',
    marginTop: 12,
  },
  tipsList: {
    gap: 16,
  },
  tipItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipEmoji: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  tipHeaderText: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontFamily: FONTS.heading.semiBold,
    color: '#111827',
    marginBottom: 4,
  },
  tipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipImpact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tipImpactHigh: {
    backgroundColor: '#FEE2E2',
  },
  tipImpactMedium: {
    backgroundColor: '#FEF3C7',
  },
  tipImpactLow: {
    backgroundColor: '#E0F2FE',
  },
  tipImpactText: {
    fontSize: 10,
    fontFamily: FONTS.heading.semiBold,
    color: '#374151',
  },
  tipType: {
    fontSize: 10,
    fontFamily: FONTS.body.medium,
    color: '#8B5CF6',
    textTransform: 'uppercase',
  },
  tipDescription: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: '#374151',
    lineHeight: 20,
  },
  tipsTimestamp: {
    fontSize: 12,
    fontFamily: FONTS.body.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  noTips: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noTipsText: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  storeAnalytics: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.lg,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading.semiBold,
    color: '#111827',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.body.regular,
    color: '#6B7280',
    marginBottom: 20,
  },
  storeList: {
    gap: 12,
  },
  storeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontFamily: FONTS.heading.semiBold,
    color: '#111827',
  },
  storeStats: {
    fontSize: 12,
    fontFamily: FONTS.body.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  storeSpending: {
    alignItems: 'flex-end',
  },
  storeAmount: {
    fontSize: 16,
    fontFamily: FONTS.heading.bold,
    color: 'COLORS.success',
  },
  storeAvg: {
    fontSize: 12,
    fontFamily: FONTS.body.medium,
    color: '#6B7280',
    marginTop: 2,
  },
  trendsSection: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.lg,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartSection: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.lg,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartContainer: {
    alignItems: 'center',
  },
  priceInsights: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.lg,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  priceList: {
    gap: 12,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  priceInfo: {
    flex: 1,
  },
  priceItemName: {
    fontSize: 16,
    fontFamily: FONTS.heading.semiBold,
    color: '#111827',
  },
  priceStats: {
    fontSize: 12,
    fontFamily: FONTS.body.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  priceRange: {
    alignItems: 'flex-end',
  },
  priceAvg: {
    fontSize: 16,
    fontFamily: FONTS.heading.bold,
    color: 'COLORS.accent',
  },
  priceMinMax: {
    fontSize: 12,
    fontFamily: FONTS.body.medium,
    color: '#6B7280',
    marginTop: 2,
  },
  habitsSection: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.xs,
    padding: SPACING.lg,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  habitsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  habitCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: SPACING.md,
  },
  habitValue: {
    fontSize: 24,
    fontFamily: FONTS.heading.bold,
    color: '#EC4899',
  },
  habitLabel: {
    fontSize: 12,
    fontFamily: FONTS.body.medium,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  habitTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  habitTrendText: {
    fontSize: 10,
    fontFamily: FONTS.heading.semiBold,
    marginLeft: 4,
  },
});