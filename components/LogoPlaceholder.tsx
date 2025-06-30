import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import { COLORS } from '@/constants/theme';

interface LogoPlaceholderProps {
  size?: number;
}

const LogoPlaceholder = ({ size = 40 }: LogoPlaceholderProps) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.cartBackground, { width: size * 0.8, height: size * 0.8, borderRadius: size * 0.2 }]}>
        <ShoppingCart 
          size={size * 0.5} 
          color={COLORS.white} 
          strokeWidth={2}
        />
      </View>
      <View style={[styles.accent, { 
        width: size * 0.3, 
        height: size * 0.3, 
        borderRadius: size * 0.15,
        right: size * 0.05,
        top: size * 0.05
      }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBackground: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  accent: {
    position: 'absolute',
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default LogoPlaceholder;