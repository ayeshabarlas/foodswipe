import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Animated, 
  Dimensions, 
  Image, 
  Text 
} from 'react-native';
import { Colors } from '../theme/colors';
import { Svg, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onComplete());
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Blurred Background Mockup */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=80' }}
        style={styles.backgroundImage}
        blurRadius={10}
      />
      <View style={styles.overlay} />

      <Animated.View 
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.whiteCircle}>
          {/* Fork and Spoon Icon - Simplified for SVG */}
          <View style={styles.iconRow}>
            <Text style={styles.iconText}>🍴</Text>
          </View>
        </View>
        
        <Text style={styles.appName}>FoodSwipe</Text>
        <Text style={styles.tagline}>Deliciousness delivered</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: width,
    height: height,
    opacity: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 106, 0, 0.85)', // primary with opacity
  },
  logoContainer: {
    alignItems: 'center',
  },
  whiteCircle: {
    width: 120,
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 50,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  }
});
