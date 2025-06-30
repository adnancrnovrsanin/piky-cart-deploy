import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, MapPin, Lock, Clock as Unlock, Sparkles, TrendingDown, Store, DollarSign, LocationEdit as Edit3 } from 'lucide-react-native';
import { ListItem, calculateItemTotalCost } from '@/types';
import * as Location from 'expo-location';
import { useShopping } from '@/contexts/ShoppingContext';

interface OptimizeCartModalProps {
  visible: boolean;
  onClose: () => void;
  items: ListItem[];
  onOptimizationComplete: (optimization: any) => void;
}

interface ItemConstraints {
  [itemId: string]: {
    priceLocked: boolean;
    storeLocked: boolean;
    brandLocked: boolean;
    lockedStore?: string;
    lockedBrand?: string;
    maxPrice?: number;
  };
}

type OptimizationStep = 'location' | 'constraints' | 'processing' | 'results';

const OptimizeCartModal = React.memo(({
  visible,
  onClose,
  items,
  onOptimizationComplete,
}: OptimizeCartModalProps) => {
  const [currentStep, setCurrentStep] = useState<OptimizationStep>('location');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [constraints, setConstraints] = useState<ItemConstraints>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [optimization, setOptimization] = useState<any>(null);
  const { updateItem } = useShopping();

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setCurrentStep('location');
      setLocation(null);
      setConstraints({});
      setOptimization(null);
      setIsProcessing(false);
    }
  }, [visible]);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'We need your location to find nearby stores and optimize your shopping cart.',
          [{ text: 'OK' }]
        );
        return;
      }

      setProcessingStatus('Getting your location...');
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setCurrentStep('constraints');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }
  };

  const toggleItemConstraint = (itemId: string, type: 'price' | 'store' | 'brand') => {
    setConstraints(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [`${type}Locked`]: !prev[itemId]?.[`${type}Locked`],
      },
    }));
  };

  const startOptimization = async () => {
    if (!location) return;

    setCurrentStep('processing');
    setIsProcessing(true);
    
    try {
      setProcessingStatus('Identifying nearby stores...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProcessingStatus('Researching prices across stores...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setProcessingStatus('Calculating optimal shopping route...');
      
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            quantity_unit: item.quantity_unit,
            category: item.category,
            brand: item.brand,
            price: item.price,
            price_per_unit: item.price_per_unit,
          })),
          location,
          constraints,
        }),
      });

      if (!response.ok) {
        throw new Error(`Optimization failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.optimization) {
        setOptimization(result.optimization);
        setCurrentStep('results');
      } else {
        throw new Error('No optimization results received');
      }
    } catch (error) {
      console.error('Optimization error:', error);
      Alert.alert(
        'Optimization Failed',
        'We encountered an issue while optimizing your cart. Please try again.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const acceptOptimization = async () => {
    if (!optimization) return;

    try {
      // Update each item with the optimized store, price, and pricing type
      for (const group of optimization.optimizedGroups) {
        for (const optimizedItem of group.items) {
          // Find the original item by matching the itemId
          const originalItem = items.find(item => item.id === optimizedItem.itemId);
          if (originalItem) {
            await updateItem(originalItem.id, {
              store: group.storeName,
              price: optimizedItem.optimizedPrice,
              price_per_unit: optimizedItem.price_per_unit,
              brand: optimizedItem.brand || originalItem.brand,
            });
          }
        }
      }

      onOptimizationComplete(optimization);
      onClose();
      
      Alert.alert(
        'Optimization Applied!',
        `Your cart has been optimized with potential savings of $${optimization.totalPotentialSavings.toFixed(2)}. Items have been updated with optimized store assignments, prices, and pricing types.`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('Error applying optimization:', error);
      Alert.alert(
        'Error',
        'Failed to apply optimization. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <MapPin size={32} color="#3B82F6" />
        <Text style={styles.stepTitle}>Enable Location</Text>
        <Text style={styles.stepSubtitle}>
          We'll use your location to find nearby stores and compare prices
        </Text>
      </View>
      
      <View style={styles.locationBenefits}>
        <Text style={styles.benefitsTitle}>What we'll do:</Text>
        <Text style={styles.benefitItem}>• Find stores within 10 miles of your location</Text>
        <Text style={styles.benefitItem}>• Compare prices across multiple retailers</Text>
        <Text style={styles.benefitItem}>• Consider brand preferences and availability</Text>
        <Text style={styles.benefitItem}>• Analyze per-unit vs total pricing for best deals</Text>
        <Text style={styles.benefitItem}>• Suggest the most cost-effective shopping route</Text>
        <Text style={styles.benefitItem}>• Calculate potential savings</Text>
        <Text style={styles.benefitItem}>• Update your list with optimized store assignments, prices, and pricing types</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={requestLocation}>
        <MapPin size={20} color="#FFFFFF" />
        <Text style={styles.primaryButtonText}>Get My Location</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConstraintsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Optimization Preferences</Text>
        <Text style={styles.stepSubtitle}>
          Lock any items you don't want to change, then we'll optimize the rest
        </Text>
      </View>

      <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const itemConstraints = constraints[item.id];
          const totalCost = item.price ? calculateItemTotalCost(item.price, item.quantity, item.price_per_unit) : 0;
          
          return (
            <View key={item.id} style={styles.itemConstraintCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                  Qty: {item.quantity} {item.quantity_unit || 'units'} • {item.category}
                  {item.brand && ` • ${item.brand}`}
                  {item.store && ` • ${item.store}`}
                  {item.price && ` • $${totalCost.toFixed(2)} ${item.price_per_unit ? `($${item.price.toFixed(2)} per ${item.quantity_unit})` : 'total'}`}
                </Text>
              </View>
              
              <View style={styles.constraintButtons}>
                <TouchableOpacity
                  style={[
                    styles.constraintButton,
                    itemConstraints?.priceLocked && styles.constraintButtonActive,
                  ]}
                  onPress={() => toggleItemConstraint(item.id, 'price')}
                >
                  {itemConstraints?.priceLocked ? (
                    <Lock size={16} color="#3B82F6" />
                  ) : (
                    <Unlock size={16} color="#6B7280" />
                  )}
                  <Text
                    style={[
                      styles.constraintButtonText,
                      itemConstraints?.priceLocked && styles.constraintButtonTextActive,
                    ]}
                  >
                    Price
                  </Text>
                </TouchableOpacity>

                {item.brand && (
                  <TouchableOpacity
                    style={[
                      styles.constraintButton,
                      itemConstraints?.brandLocked && styles.constraintButtonActive,
                    ]}
                    onPress={() => toggleItemConstraint(item.id, 'brand')}
                  >
                    {itemConstraints?.brandLocked ? (
                      <Lock size={16} color="#8B5CF6" />
                    ) : (
                      <Unlock size={16} color="#6B7280" />
                    )}
                    <Text
                      style={[
                        styles.constraintButtonText,
                        itemConstraints?.brandLocked && styles.constraintButtonTextActive,
                      ]}
                    >
                      Brand
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.primaryButton} onPress={startOptimization}>
        <Sparkles size={20} color="#FFFFFF" />
        <Text style={styles.primaryButtonText}>Start Optimization</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.processingTitle}>Optimizing Your Cart</Text>
        <Text style={styles.processingStatus}>{processingStatus}</Text>
        
        <View style={styles.processingSteps}>
          <View style={styles.processingStep}>
            <View style={styles.processingStepIcon}>
              <Text style={styles.processingStepNumber}>1</Text>
            </View>
            <Text style={styles.processingStepText}>Finding nearby stores</Text>
          </View>
          
          <View style={styles.processingStep}>
            <View style={styles.processingStepIcon}>
              <Text style={styles.processingStepNumber}>2</Text>
            </View>
            <Text style={styles.processingStepText}>Researching prices & brands</Text>
          </View>
          
          <View style={styles.processingStep}>
            <View style={styles.processingStepIcon}>
              <Text style={styles.processingStepNumber}>3</Text>
            </View>
            <Text style={styles.processingStepText}>Calculating savings</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderResultsStep = () => {
    if (!optimization) return null;

    const { optimizedGroups, totalPotentialSavings } = optimization;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.resultsHeader}>
          <TrendingDown size={32} color="#10B981" />
          <Text style={styles.resultsTitle}>Optimization Complete!</Text>
          <Text style={styles.resultsSavings}>
            Potential Savings: ${totalPotentialSavings.toFixed(2)}
          </Text>
        </View>

        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
          {optimizedGroups.map((group, index) => (
            <View key={index} style={styles.storeGroup}>
              <View style={styles.storeHeader}>
                <Text style={styles.storeName}>{group.storeName}</Text>
                {group.storeAddress && (
                  <Text style={styles.storeAddress}>{group.storeAddress}</Text>
                )}
                <Text style={styles.storeSavings}>
                  Save ${group.totalSavings.toFixed(2)}
                </Text>
              </View>
              
              {group.items.map((item, itemIndex) => {
                const totalCost = item.price_per_unit 
                  ? item.optimizedPrice * item.quantity 
                  : item.optimizedPrice;
                
                return (
                  <View key={itemIndex} style={styles.optimizedItem}>
                    <View style={styles.optimizedItemInfo}>
                      <Text style={styles.optimizedItemName}>{item.itemName}</Text>
                      {item.brand && (
                        <Text style={styles.optimizedItemBrand}>{item.brand}</Text>
                      )}
                      <Text style={styles.optimizedItemQuantity}>
                        {item.quantity} {item.quantity_unit}
                      </Text>
                    </View>
                    <View style={styles.optimizedItemPricing}>
                      <Text style={styles.optimizedPrice}>
                        ${item.optimizedPrice.toFixed(2)} {item.price_per_unit ? `per ${item.quantity_unit}` : 'total'}
                      </Text>
                      <Text style={styles.optimizedTotalCost}>
                        Total: ${totalCost.toFixed(2)}
                      </Text>
                      <Text style={styles.optimizedSavings}>
                        Save ${item.savings.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={styles.resultsActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Keep Original</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.primaryButton} onPress={acceptOptimization}>
            <Text style={styles.primaryButtonText}>Accept Optimization</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'location':
        return renderLocationStep();
      case 'constraints':
        return renderConstraintsStep();
      case 'processing':
        return renderProcessingStep();
      case 'results':
        return renderResultsStep();
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={isProcessing}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Optimize Cart</Text>
            <View style={{ width: 24 }} />
          </View>

          {renderCurrentStep()}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  locationBenefits: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  itemsList: {
    flex: 1,
    marginBottom: 20,
  },
  itemConstraintCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  itemDetails: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
  constraintButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  constraintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  constraintButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EBF4FF',
  },
  constraintButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 4,
  },
  constraintButtonTextActive: {
    color: '#3B82F6',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  processingStatus: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 40,
  },
  processingSteps: {
    width: '100%',
    maxWidth: 300,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  processingStepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  processingStepNumber: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  processingStepText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  resultsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  resultsSavings: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  resultsList: {
    flex: 1,
    marginBottom: 20,
  },
  storeGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  storeHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  storeName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  storeAddress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  storeSavings: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    marginTop: 4,
  },
  optimizedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optimizedItemInfo: {
    flex: 1,
  },
  optimizedItemName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  optimizedItemBrand: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8B5CF6',
    marginTop: 2,
  },
  optimizedItemQuantity: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  optimizedItemPricing: {
    alignItems: 'flex-end',
  },
  optimizedPrice: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  optimizedTotalCost: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
    marginTop: 2,
  },
  optimizedSavings: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  resultsActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
});

export default OptimizeCartModal;