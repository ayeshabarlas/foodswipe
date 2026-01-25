import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import { Ionicons } from '@expo/vector-icons';

interface PhoneVerificationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: (phoneNumber: string) => void;
  initialPhoneNumber?: string;
}

export default function PhoneVerificationModal({
  isVisible,
  onClose,
  onSuccess,
  initialPhoneNumber = ''
}: PhoneVerificationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // Clean phone number (Pakistan format)
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '92' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('92')) {
        formattedPhone = '92' + formattedPhone;
      }

      const response = await apiClient.post('/users/send-otp', {
        phoneNumber: formattedPhone
      });

      setStep('otp');
      setTimer(60);
      
      if (response.data.otp) {
        // In development, we show the OTP for testing
        Alert.alert('Development OTP', `Your OTP is: ${response.data.otp}`);
      } else {
        Alert.alert('OTP Sent', 'A verification code has been sent to your phone.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6 && otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter a valid verification code');
      return;
    }

    setLoading(true);
    try {
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '92' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('92')) {
        formattedPhone = '92' + formattedPhone;
      }

      const response = await apiClient.post('/users/verify-otp', {
        phoneNumber: formattedPhone,
        otp: otp
      });

      if (response.data.success || response.data.phoneVerified) {
        onSuccess(formattedPhone);
        onClose();
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.card}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons 
                  name={step === 'phone' ? "phone-portrait-outline" : "shield-checkmark-outline"} 
                  size={32} 
                  color={Colors.orangeStart} 
                />
              </View>
              <Text style={styles.title}>
                {step === 'phone' ? 'Phone Verification' : 'Enter OTP'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'phone' 
                  ? 'We need to verify your phone number to continue.' 
                  : `Enter the code sent to ${phoneNumber}`}
              </Text>
            </View>

            {step === 'phone' ? (
              <View style={styles.inputContainer}>
                <View style={styles.phoneInputWrapper}>
                  <Text style={styles.countryCode}>+92</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="300 1234567"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabledButton]}
                  onPress={handleSendOTP}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="••••••"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  letterSpacing={10}
                  textAlign="center"
                />
                
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabledButton]}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.resendButton} 
                  onPress={handleSendOTP}
                  disabled={timer > 0 || loading}
                >
                  <Text style={[styles.resendText, timer > 0 && styles.disabledText]}>
                    {timer > 0 ? `Resend code in ${timer}s` : "Didn't receive code? Resend"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={() => setStep('phone')}>
                  <Text style={styles.backButtonText}>Change Phone Number</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    gap: 16,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
  },
  otpInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    fontSize: 24,
    fontWeight: 'bold',
  },
  primaryButton: {
    backgroundColor: Colors.orangeStart,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.7,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  resendText: {
    color: Colors.orangeStart,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
