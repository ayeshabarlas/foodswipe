import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Modal, 
  Dimensions, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface LocationAccessModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onSkip: () => void;
}

export default function LocationAccessModal({ isOpen, onAllow, onSkip }: LocationAccessModalProps) {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      pointerEvents="box-none"
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.container}>
          <LinearGradient
            colors={['#FF6A00', '#FF416C']}
            style={styles.iconContainer}
          >
            <Ionicons name="location" size={40} color="#fff" />
          </LinearGradient>

          <Text style={styles.title}>Find Food Near You</Text>
          <Text style={styles.description}>
            We need your location to show you restaurants nearby and calculate delivery distances.
          </Text>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
              <Text style={styles.featureText}>See distance to each restaurant</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
              <Text style={styles.featureText}>Accurate delivery time estimates</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
              <Text style={styles.featureText}>Discover nearby hidden gems</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.allowButton} onPress={onAllow}>
            <LinearGradient
              colors={['#FF6A00', '#FF416C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons name="location" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.allowButtonText}>Allow Location Access</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Ionicons name="lock-closed" size={12} color="#9CA3AF" />
            <Text style={styles.footerText}>
              Your location is only used to show nearby restaurants and is never shared with third parties.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 32,
    padding: 30,
    width: '100%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  features: {
    width: '100%',
    marginBottom: 35,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  allowButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
    marginBottom: 24,
  },
  skipButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  footerText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 6,
    flex: 1,
  },
});
