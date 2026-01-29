import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface VoucherCardProps {
  voucher: {
    _id: string;
    code: string;
    discount: number;
    discountType: 'percentage' | 'fixed';
    description: string;
    name?: string;
    fundedBy: 'platform' | 'restaurant';
  };
  onPress?: () => void;
  style?: any;
}

export default function VoucherCard({ voucher, onPress, style }: VoucherCardProps) {
  const isPlatform = voucher.fundedBy === 'platform';
  
  const colors = isPlatform 
    ? ['#FF6A00', '#FF416C'] // Warm orange/red for platform
    : ['#10B981', '#059669']; // Emerald for restaurant

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={colors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.leftSection}>
          <Text style={styles.discountValue}>
            {voucher.discountType === 'percentage' ? `${voucher.discount}%` : `Rs.${voucher.discount}`}
          </Text>
          <Text style={styles.discountLabel}>OFF</Text>
        </View>
        
        <View style={styles.divider}>
          <View style={styles.dotTop} />
          <View style={styles.line} />
          <View style={styles.dotBottom} />
        </View>
        
        <View style={styles.rightSection}>
          <View style={styles.typeBadge}>
            <Ionicons 
              name={isPlatform ? "globe-outline" : "restaurant-outline"} 
              size={10} 
              color="#fff" 
            />
            <Text style={styles.typeText}>
              {isPlatform ? 'PLATFORM' : 'RESTAURANT'}
            </Text>
          </View>
          <Text style={styles.code} numberOfLines={1}>{voucher.code}</Text>
          <Text style={styles.description} numberOfLines={1}>{voucher.description}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width * 0.75,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
  },
  leftSection: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '30%',
  },
  discountValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  discountLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -2,
  },
  divider: {
    width: 20,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  line: {
    width: 1,
    height: '70%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  dotTop: {
    position: 'absolute',
    top: -18,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6', // Should match background color
  },
  dotBottom: {
    position: 'absolute',
    bottom: -18,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6', // Should match background color
  },
  rightSection: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  typeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  code: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    marginTop: 2,
  },
});
