import * as WebBrowser from 'expo-web-browser';
import React, { useState, useEffect } from 'react';
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
import * as Google from 'expo-auth-session/providers/google';
import apiClient from '../api/apiClient';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { initSocket } from '../utils/socket';
import PhoneVerificationModal from '../components/PhoneVerificationModal';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: "975401301298-6hvoo0ch3glki4m84j6dqkblrm5m7m1k.apps.googleusercontent.com",
    androidClientId: "975401301298-6hvoo0ch3glki4m84j6dqkblrm5m7m1k.apps.googleusercontent.com",
    iosClientId: "975401301298-6hvoo0ch3glki4m84j6dqkblrm5m7m1k.apps.googleusercontent.com",
  }, {
    projectNameForProxy: "@ayeshabarlas/mobile",
  });

  const [mode, setMode] = useState<'login' | 'signup' | 'select'>('select');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'restaurant' | 'rider'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [tempAuthData, setTempAuthData] = useState<{token: string, user: any} | null>(null);

  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleAuthSuccess(authentication?.accessToken);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (token: string | undefined) => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userProfile = await userInfoResponse.json();

      const res = await apiClient.post('/auth/social-login', {
        email: userProfile.email,
        name: userProfile.name,
        picture: userProfile.picture,
        provider: 'google',
        role: selectedRole
      });
      const { token: authToken, ...userData } = res.data;
      await saveAuthData(authToken, userData);
    } catch (err) {
      Alert.alert('Error', 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await promptAsync();
    } catch (error) {
      Alert.alert('Error', 'Could not open Google Login');
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
        
        // After signup, we need to save the token so the phone verification modal can use it
        // because the /users/send-otp route is protected.
        await SecureStore.setItemAsync('auth_token', String(token));
        
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
      } else if (error.message.includes('timeout')) {
        message = 'Connection timeout. The server is taking too long to respond. Please check if your backend is running and you are on the same network.';
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

                  <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                    <Text style={styles.termsText}>
                      By continuing, you agree to our Terms of Service & Privacy Policy.
                    </Text>
                  </TouchableOpacity>

                  <Modal visible={showTermsModal} animationType="slide" transparent={false}>
                    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6'
                      }}>
                        <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                          <Ionicons name="close" size={28} color="#111827" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Terms of Service</Text>
                        <View style={{ width: 28 }} />
                      </View>
                      <ScrollView contentContainerStyle={{ padding: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 }}>1. Business Information</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8 }}>Registered Name: FoodSwipe (Private) Limited</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8 }}>Business Address: Allama Iqbal Town, Lahore</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 }}>Contact: +923295599855 | Email: app.foodswipehelp@gmail.com</Text>

                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 }}>2. Service Usage</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 }}>You must be 18 years or older to use FoodSwipe. Provide accurate information during registration. Keep your account credentials secure. FoodSwipe reserves the right to suspend accounts for violations.</Text>

                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 }}>3. Orders & Payments</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 }}>All orders are subject to restaurant availability. Prices may vary and are confirmed at checkout. Payment is processed securely through our platform. Taxes and delivery fees are calculated based on location.</Text>

                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 }}>4. Refund & Cancellation Policy</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8 }}>Order Cancellation: Orders can only be cancelled before the restaurant accepts them.</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8 }}>Refunds: Refunds are processed within 5-7 business days for eligible cancelled orders.</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8 }}>Incorrect Orders: If you receive an incorrect or damaged item, please report it via the Support section within 2 hours.</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 }}>Delivery Failure: If a delivery fails due to incorrect address or unavailability, no refund will be issued.</Text>

                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 }}>5. Customer Complaint Handling</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8 }}>We value your feedback and take complaints seriously.</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8 }}>Mechanism: You can lodge a complaint via the "Support" tab in the app or email us at app.foodswipehelp@gmail.com.</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 8 }}>Resolution: Our team will acknowledge your complaint within 24 hours and aim for resolution within 48-72 hours.</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 }}>Appeals: If unsatisfied with the resolution, you may escalate to app.foodswipehelp@gmail.com.</Text>

                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 }}>6. Jurisdiction & Governing Law</Text>
                        <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 16 }}>These Terms and Conditions shall be governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. Any dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Lahore, Pakistan.</Text>
                      </ScrollView>
                    </SafeAreaView>
                  </Modal>

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
                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                      <TouchableOpacity 
                        style={styles.backToSelect}
                        onPress={() => setMode('select')}
                      >
                        <Text style={styles.backToSelectText}>Back to options</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={{ marginTop: 20 }}
                        onPress={checkConnectivity}
                      >
                        <Text style={{ color: '#9CA3AF', fontSize: 12, textDecorationLine: 'underline' }}>
                          Check Connection Status
                        </Text>
                      </TouchableOpacity>
                    </View>
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
