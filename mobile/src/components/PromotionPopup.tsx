import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');

interface PromotionPopupProps {
  voucher: any;
  onClose: () => void;
}

export default function PromotionPopup({ voucher, onClose }: PromotionPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    if (voucher) {
      checkVisibility();
    }
  }, [voucher]);

  const checkVisibility = async () => {
    try {
      const lastShownId = await SecureStore.getItemAsync(`popup_shown_${voucher._id}`);
      if (!lastShownId) {
        setIsVisible(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
          })
        ]).start();
      }
    } catch (err) {
      console.log('Error checking popup visibility:', err);
    }
  };

  const handleDismiss = async () => {
    try {
      await SecureStore.setItemAsync(`popup_shown_${voucher._id}`, 'true');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setIsVisible(false);
        onClose();
      });
    } catch (err) {
      onClose();
    }
  };

  if (!isVisible || !voucher) return null;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={handleDismiss}
      pointerEvents="box-none"
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View 
          style={[
            styles.container, 
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#FF6A00', '#FF416C']}
            style={styles.gradient}
          >
            <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.content}>
              <View style={styles.iconCircle}>
                <Ionicons name="gift" size={40} color="#FF6A00" />
              </View>
              
              <Text style={styles.title}>Special Offer for You!</Text>
              
              <View style={styles.discountContainer}>
                <Text style={styles.discountValue}>
                  {voucher.discountType === 'percentage' ? `${voucher.discount}%` : `Rs.${voucher.discount}`}
                </Text>
                <Text style={styles.discountOff}>OFF</Text>
              </View>

              <Text style={styles.description}>{voucher.description}</Text>

              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Use Promo Code</Text>
                <Text style={styles.codeValue}>{voucher.code}</Text>
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleDismiss}>
                <Text style={styles.actionBtnText}>Claim Now</Text>
              </TouchableOpacity>

              <Text style={styles.terms}>* Valid for a limited time only. T&C apply.</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  discountValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
  },
  discountOff: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  description: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  codeBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  codeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  codeValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  actionBtn: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtnText: {
    color: '#FF416C',
    fontSize: 18,
    fontWeight: 'bold',
  },
  terms: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
  }
});
