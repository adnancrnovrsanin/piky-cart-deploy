import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { ShoppingCart, Sparkles, ChartBar as BarChart3, Archive, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react-native';
import Animated, { 
  FadeInUp, 
  FadeOutDown, 
  SlideInRight, 
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { COLORS, FONTS, FONT_SIZES, SPACING, BORDER_RADIUS, TEXT_STYLES, BUTTON_STYLES, SHADOWS } from '@/constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  backgroundColor: string;
  imageUrl?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to PikyCart',
    subtitle: 'Smart Shopping Made Simple',
    description: 'Transform your shopping experience with AI-powered lists, price optimization, and intelligent organization.',
    icon: ShoppingCart,
    color: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
    imageUrl: 'https://images.pexels.com/photos/264547/pexels-photo-264547.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'smart-lists',
    title: 'Smart List Creation',
    subtitle: 'AI-Powered Shopping Lists',
    description: 'Create lists instantly by taking photos of receipts, scanning handwritten notes, or simply describing what you need.',
    icon: Sparkles,
    color: COLORS.secondary,
    backgroundColor: `${COLORS.secondary}15`,
    imageUrl: 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'optimization',
    title: 'Price Optimization',
    subtitle: 'Save Money Automatically',
    description: 'Our AI finds the best prices across stores and suggests optimal shopping routes to maximize your savings.',
    icon: BarChart3,
    color: COLORS.success,
    backgroundColor: `${COLORS.success}15`,
    imageUrl: 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'organization',
    title: 'Smart Organization',
    subtitle: 'Stay Organized Effortlessly',
    description: 'Items are automatically categorized and grouped by store. Track your shopping history and spending patterns.',
    icon: Archive,
    color: COLORS.accent,
    backgroundColor: `${COLORS.accent}15`,
    imageUrl: 'https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'ready',
    title: "You're All Set!",
    subtitle: 'Start Shopping Smarter',
    description: "Ready to revolutionize your shopping experience? Let's create your first smart shopping list!",
    icon: CheckCircle,
    color: COLORS.success,
    backgroundColor: `${COLORS.success}15`,
    imageUrl: 'https://images.pexels.com/photos/4386370/pexels-photo-4386370.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow = React.memo(({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const progressValue = useSharedValue(0);

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${progressValue.value}%`, {
        damping: 15,
        stiffness: 100,
      }),
    };
  });

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      progressValue.value = ((nextStep + 1) / ONBOARDING_STEPS.length) * 100;
      
      scrollViewRef.current?.scrollTo({
        x: nextStep * screenWidth,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      progressValue.value = ((prevStep + 1) / ONBOARDING_STEPS.length) * 100;
      
      scrollViewRef.current?.scrollTo({
        x: prevStep * screenWidth,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  React.useEffect(() => {
    progressValue.value = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  }, [currentStep, progressValue]);

  const renderStep = (step: OnboardingStep, index: number) => {
    const IconComponent = step.icon;
    
    return (
      <View key={step.id} style={[styles.stepContainer, { backgroundColor: step.backgroundColor }]}>
        <View style={styles.stepContent}>
          {/* Hero Image */}
          <Animated.View 
            entering={FadeInUp.delay(200)}
            style={styles.imageContainer}
          >
            <Image
              source={{ uri: step.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={[styles.iconOverlay, { backgroundColor: step.color }]}>
              <IconComponent size={32} color={COLORS.white} />
            </View>
          </Animated.View>

          {/* Content */}
          <Animated.View 
            entering={FadeInUp.delay(400)}
            style={styles.textContent}
          >
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={[styles.stepSubtitle, { color: step.color }]}>
              {step.subtitle}
            </Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </Animated.View>

          {/* Features List for specific steps */}
          {step.id === 'smart-lists' && (
            <Animated.View 
              entering={FadeInUp.delay(600)}
              style={styles.featuresList}
            >
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: step.color }]} />
                <Text style={styles.featureText}>📸 Photo scanning</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: step.color }]} />
                <Text style={styles.featureText}>✍️ Handwriting recognition</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: step.color }]} />
                <Text style={styles.featureText}>🗣️ Voice descriptions</Text>
              </View>
            </Animated.View>
          )}

          {step.id === 'optimization' && (
            <Animated.View 
              entering={FadeInUp.delay(600)}
              style={styles.featuresList}
            >
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: step.color }]} />
                <Text style={styles.featureText}>💰 Best price finder</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: step.color }]} />
                <Text style={styles.featureText}>🗺️ Optimal routes</Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureDot, { backgroundColor: step.color }]} />
                <Text style={styles.featureText}>📊 Savings tracking</Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Progress and Skip */}
      <Animated.View entering={FadeInUp} style={styles.headerContainer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} / {ONBOARDING_STEPS.length}
          </Text>
        </View>
        
        {/* Skip Button - Only show if not on last step */}
        {currentStep < ONBOARDING_STEPS.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Steps ScrollView */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {ONBOARDING_STEPS.map((step, index) => renderStep(step, index))}
      </ScrollView>

      {/* Navigation */}
      <Animated.View entering={FadeInUp.delay(200)} style={styles.navigationContainer}>
        <TouchableOpacity
          onPress={handlePrevious}
          style={[
            styles.navButton,
            styles.prevButton,
            currentStep === 0 && styles.navButtonDisabled,
          ]}
          disabled={currentStep === 0}
        >
          <ArrowLeft size={20} color={currentStep === 0 ? COLORS.gray400 : COLORS.gray600} />
          <Text style={[
            styles.navButtonText,
            currentStep === 0 && styles.navButtonTextDisabled,
          ]}>
            Previous
          </Text>
        </TouchableOpacity>

        <View style={styles.stepIndicators}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.stepIndicator,
                index === currentStep && styles.stepIndicatorActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.navButton, styles.nextButton]}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <ArrowRight size={20} color={COLORS.white} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  progressBar: {
    flex: 1,
    height: SPACING.xs,
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.xs / 2,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xs / 2,
  },
  progressText: {
    ...TEXT_STYLES.body2,
    fontFamily: FONTS.heading.semiBold,
    minWidth: SPACING.xl + SPACING.sm,
  },
  skipButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.xl,
  },
  skipButtonText: {
    ...TEXT_STYLES.body2,
    fontFamily: FONTS.heading.semiBold,
    color: COLORS.gray600,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: SPACING.xl,
  },
  heroImage: {
    width: 280,
    height: 200,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.medium,
  },
  iconOverlay: {
    position: 'absolute',
    bottom: -SPACING.md,
    right: -SPACING.md,
    width: SPACING.xxl + SPACING.xl,
    height: SPACING.xxl + SPACING.xl,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  textContent: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  stepTitle: {
    ...TEXT_STYLES.h1,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    ...TEXT_STYLES.h4,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  stepDescription: {
    ...TEXT_STYLES.body1,
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: FONT_SIZES.body1 * 1.5,
    maxWidth: screenWidth - (SPACING.xl * 2) - SPACING.lg,
  },
  featuresList: {
    alignSelf: 'stretch',
    maxWidth: screenWidth - (SPACING.xl * 3),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureDot: {
    width: SPACING.sm,
    height: SPACING.sm,
    borderRadius: SPACING.xs,
    marginRight: SPACING.sm,
  },
  featureText: {
    ...TEXT_STYLES.body1,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  prevButton: {
    backgroundColor: COLORS.gray200,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    ...TEXT_STYLES.body1,
    fontFamily: FONTS.heading.semiBold,
    color: COLORS.gray600,
    marginLeft: SPACING.sm,
  },
  navButtonTextDisabled: {
    color: COLORS.gray400,
  },
  nextButtonText: {
    ...TEXT_STYLES.body1,
    fontFamily: FONTS.heading.semiBold,
    color: COLORS.white,
    marginRight: SPACING.sm,
  },
  stepIndicators: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  stepIndicator: {
    width: SPACING.sm,
    height: SPACING.sm,
    borderRadius: SPACING.xs,
    backgroundColor: COLORS.gray300,
  },
  stepIndicatorActive: {
    backgroundColor: COLORS.primary,
  },
});

export default OnboardingFlow;