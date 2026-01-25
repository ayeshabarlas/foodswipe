import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
  Dimensions
} from 'react-native';
import apiClient from '../api/apiClient';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { initSocket } from '../utils/socket';
import PhoneVerificationModal from '../components/PhoneVerificationModal';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [mode, setMode] = useState<'login' | 'signup' | 'select'>('login');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'restaurant' | 'rider'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [tempAuthData, setTempAuthData] = useState<{token: string, user: any} | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Real implementation would use expo-auth-session
      // For now, we simulate a successful Google login for demonstration
      Alert.alert(
        'Google Login',
        'In a production environment, this would open the Google Sign-In portal. For now, do you want to simulate a successful login?',
        [
          { text: 'Cancel', onPress: () => setLoading(false), style: 'cancel' },
          { 
            text: 'Simulate', 
            onPress: async () => {
              try {
                // Mock API call for social login
                const response = await apiClient.post('/auth/social-login', {
                  email: 'google-user@example.com',
                  name: 'Google User',
                  provider: 'google',
                  role: selectedRole
                });
                const { token, ...userData } = response.data;
                await saveAuthData(token, userData);
              } catch (err: any) {
                Alert.alert('Error', 'Failed to simulate Google login');
              } finally {
                setLoading(false);
              }
            } 
          }
        ]
      );
    } catch (error) {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email || !password || (mode === 'signup' && (!firstName || !lastName))) {
      Alert.alert('Missing Info', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const fullName = `${firstName} ${lastName}`.trim();
        const response = await apiClient.post('/auth/register', { 
          name: fullName, 
          email, 
          password,
          role: selectedRole 
        });
        const { token, ...userData } = response.data;
        
        // After signup, we show phone verification
        setTempAuthData({ token, user: userData });
        setShowPhoneVerification(true);
      } else {
        const response = await apiClient.post('/auth/login', { 
          identifier: email, 
          password,
          role: selectedRole
        });
        const { token, ...userData } = response.data;
        await saveAuthData(token, userData);
      }
    } catch (error: any) {
      console.error('Auth Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });
      
      let message = 'Authentication failed.';
      if (error.response?.status === 503) {
        message = 'Server database is currently offline. Please try again later.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message.includes('Network Error')) {
        message = 'Cannot reach server. Check your connection or server IP.';
      }
      
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerificationSuccess = async (verifiedPhone: string) => {
    if (tempAuthData) {
      const { token, user } = tempAuthData;
      // Update user object with verified phone info
      const updatedUser = { ...user, phoneNumber: verifiedPhone, phoneVerified: true };
      await saveAuthData(token, updatedUser);
      setTempAuthData(null);
    }
  };

  const saveAuthData = async (token: string, user: any) => {
    try {
      if (!token) throw new Error('No token received');
      await SecureStore.setItemAsync('auth_token', String(token));
      if (user) {
        await SecureStore.setItemAsync('user_data', JSON.stringify(user));
        initSocket(user.id || user._id, user.role);
      }
      Alert.alert('Success!', `Welcome, ${user?.name || 'User'}`);
    
    // Redirect based on role
    const role = user?.role || selectedRole;
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
  } catch (err: any) {
      console.error('Save Auth Data Error:', err);
      Alert.alert('Error', 'Failed to save login session');
    }
  };

  const checkConnectivity = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/health');
      const data = response.data;
      Alert.alert(
        'Server Status',
        `Backend: ${data.status || 'OK'}\nDB: ${data.db || 'Offline'}\nFirebase: ${data.firebase || 'OK'}\nURL: ${apiClient.defaults.baseURL}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Server Unreachable',
        `Error: ${error.message}\nURL: ${apiClient.defaults.baseURL}\n\nCheck if your computer and phone are on the same Wi-Fi.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.orangeStart, Colors.orangeEnd]}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.brandContainer}>
              <View style={styles.logoBlur1} />
              <View style={styles.logoBlur2} />
              <Text style={styles.brandText}>FoodSwipe</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>
                {mode === 'select' ? "Let's get started" :
                 mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={styles.subtitle}>
                Order food, track orders, and more.
              </Text>

              {/* Role Selection Tabs */}
              <View style={styles.roleContainer}>
                <TouchableOpacity 
                  style={[styles.roleTab, selectedRole === 'customer' && styles.activeRoleTab]} 
                  onPress={() => setSelectedRole('customer')}
                >
                  <Text style={[styles.roleEmoji, selectedRole === 'customer' && styles.activeRoleText]}>👤</Text>
                  <Text style={[styles.roleLabel, selectedRole === 'customer' && styles.activeRoleText]}>Customer</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.roleTab, selectedRole === 'restaurant' && styles.activeRoleTab]} 
                  onPress={() => setSelectedRole('restaurant')}
                >
                  <Text style={[styles.roleEmoji, selectedRole === 'restaurant' && styles.activeRoleText]}>🏪</Text>
                  <Text style={[styles.roleLabel, selectedRole === 'restaurant' && styles.activeRoleText]}>Restaurant</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.roleTab, selectedRole === 'rider' && styles.activeRoleTab]} 
                  onPress={() => setSelectedRole('rider')}
                >
                  <Text style={[styles.roleEmoji, selectedRole === 'rider' && styles.activeRoleText]}>🏍️</Text>
                  <Text style={[styles.roleLabel, selectedRole === 'rider' && styles.activeRoleText]}>Rider</Text>
                </TouchableOpacity>
              </View>

              {mode === 'select' ? (
                <View style={styles.selectContainer}>
                  <TouchableOpacity 
                    style={styles.googleButton}
                    onPress={handleGoogleLogin}
                  >
                    <Text style={styles.googleButtonText}>G</Text>
                    <Text style={styles.googleButtonLabel}>Continue with Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.emailButton}
                    onPress={() => setMode('login')}
                  >
                    <Text style={styles.emailButtonText}>✉  Continue with Email</Text>
                  </TouchableOpacity>

                  <Text style={styles.termsText}>
                    By continuing, you agree to our Terms of Service & Privacy Policy.
                  </Text>

                  <TouchableOpacity 
                    style={styles.checkConnButton}
                    onPress={checkConnectivity}
                  >
                    <Text style={styles.checkConnText}>Check Server Connectivity</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.form}>
                  {mode === 'signup' && (
                    <View style={styles.row}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>First Name</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="John"
                          value={firstName}
                          onChangeText={setFirstName}
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Last Name</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Doe"
                          value={lastName}
                          onChangeText={setLastName}
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="name@example.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {mode === 'login' && (
                    <TouchableOpacity style={styles.forgotPassword}>
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={[styles.primaryButton, loading && styles.disabledButton]}
                    onPress={handleAuth}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {mode === 'login' ? 'Login' : 'Sign Up'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>
                      {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    </Text>
                    <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                      <Text style={styles.switchText}>
                        {mode === 'login' ? 'Sign Up' : 'Login'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {mode !== 'select' && (
                    <TouchableOpacity 
                      style={styles.backToSelect}
                      onPress={() => setMode('select')}
                    >
                      <Text style={styles.backToSelectText}>Back to options</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <PhoneVerificationModal 
        isVisible={showPhoneVerification}
        onClose={() => setShowPhoneVerification(false)}
        onSuccess={handlePhoneVerificationSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  brandContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  logoBlur1: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 60,
  },
  logoBlur2: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 60,
  },
  brandText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: -1,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    justifyContent: 'center',
  },
  roleTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  activeRoleTab: {
    borderColor: Colors.orangeStart,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
  },
  roleEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  activeRoleText: {
    color: Colors.orangeStart,
  },
  selectContainer: {
    spaceY: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  googleButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EA4335',
    marginRight: 10,
  },
  googleButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emailButton: {
    backgroundColor: Colors.orangeStart,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.orangeStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: Colors.orangeStart,
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: Colors.orangeStart,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.orangeStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  switchText: {
    color: Colors.orangeStart,
    fontSize: 14,
    fontWeight: 'bold',
  },
  backToSelect: {
    alignItems: 'center',
    marginTop: 16,
  },
  backToSelectText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  checkConnButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  checkConnText: {
    color: Colors.orangeStart,
    fontSize: 12,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
