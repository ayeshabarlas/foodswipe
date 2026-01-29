import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Colors } from '../theme/colors';
import SplashScreen from '../components/SplashScreen';
import * as SecureStore from 'expo-secure-store';
import { initSocket } from '../utils/socket';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const GradientText = ({ text, style }: { text: string, style: any }) => {
  return (
    <View style={style}>
      <Text style={{
        fontSize: 40,
        fontWeight: 'bold',
        color: Colors.primary,
        textAlign: 'center',
      }}>
        {text}
      </Text>
    </View>
  );
};

export default function HomeScreen({ navigation }: any) {
  const [showSplash, setShowSplash] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userData = await SecureStore.getItemAsync('user_data');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        initSocket(user.id || user._id, user.role);
        redirectUser(user.role);
      }
    } catch (err) {
      console.error('Check Auth Error:', err);
    } finally {
      setCheckingAuth(false);
    }
  };

  const redirectUser = (role: string) => {
    switch (role) {
      case 'rider':
        navigation.replace('RiderDashboard');
        break;
      case 'restaurant':
        navigation.replace('RestaurantDashboard');
        break;
      default:
        navigation.replace('CustomerDashboard');
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (checkingAuth) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800' }}
          style={styles.heroImage}
        />
        
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>FoodSwipe</Text>
          <Text style={styles.subtitle}>
            Order from your favorite local restaurants and home chefs with just a swipe.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Login to Start</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  heroImage: {
    width: width - 48,
    height: width - 48,
    borderRadius: 24,
    marginTop: 20,
  },
  textContainer: {
    marginTop: 10,
  },
  titleGradient: {
    marginBottom: 5,
    alignItems: 'center',
    width: '100%',
  },
  titleText: {
    fontSize: 40,
    fontWeight: '500',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.gray,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir' : 'sans-serif-light',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif-medium',
  },
});
