import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function RiderRegistrationScreen({ navigation }: any) {
  const [formData, setFormData] = useState({
    fullName: '',
    cnicNumber: '',
    dateOfBirth: '',
    vehicleType: 'Bike' as 'Bike' | 'Car',
  });
  const [loading, setLoading] = useState(false);

  const formatCNIC = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limitedDigits = digits.slice(0, 13);
    if (limitedDigits.length <= 5) return limitedDigits;
    if (limitedDigits.length <= 12) return `${limitedDigits.slice(0, 5)}-${limitedDigits.slice(5, 12)}`;
    return `${limitedDigits.slice(0, 5)}-${limitedDigits.slice(5, 12)}-${limitedDigits.slice(12)}`;
  };

  const handleCNICChange = (text: string) => {
    setFormData({ ...formData, cnicNumber: formatCNIC(text) });
  };

  const formatDOB = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limitedDigits = digits.slice(0, 8);
    
    if (limitedDigits.length <= 4) return limitedDigits;
    if (limitedDigits.length <= 6) return `${limitedDigits.slice(0, 4)}-${limitedDigits.slice(4, 6)}`;
    return `${limitedDigits.slice(0, 4)}-${limitedDigits.slice(4, 6)}-${limitedDigits.slice(6, 8)}`;
  };

  const handleDOBChange = (text: string) => {
    setFormData({ ...formData, dateOfBirth: formatDOB(text) });
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.cnicNumber || !formData.dateOfBirth) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const cnicDigits = formData.cnicNumber.replace(/\D/g, '');
    if (cnicDigits.length !== 13) {
      Alert.alert('Error', 'Invalid CNIC number');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/riders/register', formData);
      Alert.alert('Success', 'Profile details saved. Now please upload your documents.');
      navigation.navigate('RiderDocumentUpload', { riderId: res.data._id });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, '#f43f5e']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <FontAwesome5 name="bicycle" size={30} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Rider Portal</Text>
              <Text style={styles.subtitle}>Join our delivery team</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Your Details</Text>
              <Text style={styles.sectionSubtitle}>Complete your profile to continue</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Muhammad Ali"
                    value={formData.fullName}
                    onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CNIC Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="12345-1234567-1"
                    keyboardType="numeric"
                    value={formData.cnicNumber}
                    onChangeText={handleCNICChange}
                    maxLength={15}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD (e.g. 1995-05-25)"
                    keyboardType="numeric"
                    value={formData.dateOfBirth}
                    onChangeText={handleDOBChange}
                    maxLength={10}
                  />
                </View>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4, marginLeft: 2 }}>
                  Format: Year-Month-Day (e.g. 1998-12-31)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Type</Text>
                <View style={styles.vehicleTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.vehicleTypeBtn,
                      formData.vehicleType === 'Bike' && styles.vehicleTypeBtnActive
                    ]}
                    onPress={() => setFormData({ ...formData, vehicleType: 'Bike' })}
                  >
                    <FontAwesome5 
                      name="bicycle" 
                      size={24} 
                      color={formData.vehicleType === 'Bike' ? Colors.primary : '#9CA3AF'} 
                    />
                    <Text style={[
                      styles.vehicleTypeText,
                      formData.vehicleType === 'Bike' && styles.vehicleTypeTextActive
                    ]}>Bike</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.vehicleTypeBtn,
                      formData.vehicleType === 'Car' && styles.vehicleTypeBtnActive
                    ]}
                    onPress={() => setFormData({ ...formData, vehicleType: 'Car' })}
                  >
                    <Ionicons 
                      name="car-outline" 
                      size={26} 
                      color={formData.vehicleType === 'Car' ? Colors.primary : '#9CA3AF'} 
                    />
                    <Text style={[
                      styles.vehicleTypeText,
                      formData.vehicleType === 'Car' && styles.vehicleTypeTextActive
                    ]}>Car</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Save & Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: '#1F2937',
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  vehicleTypeBtn: {
    flex: 1,
    height: 100,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  vehicleTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
    borderWidth: 2,
  },
  vehicleTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  vehicleTypeTextActive: {
    color: Colors.primary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 55,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
