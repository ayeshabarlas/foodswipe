import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Animated, 
  Dimensions, 
  Image, 
  Text,
  StatusBar,
  Platform
} from 'react-native';
import { Colors } from '../theme/colors';
import { Svg, Path, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const GradientText = ({ text, style }: { text: string, style: any }) => {
  return (
    <View style={style}>
      <Svg height="60" width="300">
        <Defs>
          <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FF416C" stopOpacity="1" />
            <Stop offset="1" stopColor="#FF4B2B" stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <SvgText
          fill="url(#grad)"
          fontSize="48"
          fontWeight="900"
          x="150"
          y="45"
          textAnchor="middle"
          fontFamily={Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'sans-serif-condensed'}
        >
          {text}
        </SvgText>
      </Svg>
    </View>
  );
};

// Subtle floating elements for background
const BackgroundElement = ({ icon, style, delay }: any) => {
  const move = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(move, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.timing(move, {
          toValue: 0,
          duration: 3000 + Math.random() * 2000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  const translateY = move.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15]
  });

  return (
    <Animated.View style={[style, { transform: [{ translateY }], opacity: 0.1 }]}>
      <Ionicons name={icon} size={40} color="#fff" />
    </Animated.View>
  );
};

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textMove = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Phase 1: Logo entry with rotation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Text appearance
    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textMove, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Final fade out
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => onComplete());
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '0deg']
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Image with Blur (Matching Web App) */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1080&q=80' }}
        style={StyleSheet.absoluteFill}
        blurRadius={Platform.OS === 'ios' ? 15 : 8}
      />

      {/* Gradient Overlay (Matching Web App) */}
      <LinearGradient
        colors={['rgba(249, 115, 22, 0.9)', 'rgba(239, 68, 68, 0.9)', 'rgba(236, 72, 153, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <Animated.View 
        style={[
          styles.logoWrapper,
          {
            transform: [
              { scale: logoScale },
              { rotate: spin }
            ]
          }
        ]}
      >
        <View style={styles.logoImageContainer}>
          <Image 
            source={require('../../assets/favicon.png')} 
            style={styles.logoImage}
            resizeMode="cover"
          />
          <View style={styles.logoOverlay} />
        </View>
        
        <Animated.View 
          style={{ 
            opacity: textOpacity,
            transform: [{ translateY: textMove }],
            alignItems: 'center',
            marginTop: 25
          }}
        >
          <Text style={styles.appName}>FoodSwipe</Text>
          <Text style={styles.tagline}>FASTEST DELIVERY</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)', 
  },
  appName: {
    fontSize: 40,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: -1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    letterSpacing: 4,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Light' : 'sans-serif-light',
  }
});
