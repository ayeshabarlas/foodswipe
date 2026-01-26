import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function RiderDocumentUploadScreen({ navigation, route }: any) {
  const { riderId } = route.params;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  
  const [documents, setDocuments] = useState({
    cnicFront: null as string | null,
    cnicBack: null as string | null,
    drivingLicense: null as string | null,
    vehicleRegistration: null as string | null,
    profileSelfie: null as string | null,
  });

  const pickImage = async (docKey: keyof typeof documents) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your gallery to upload documents.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      handleUpload(docKey, `data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleUpload = async (docKey: string, base64Image: string) => {
    setUploading(docKey);
    try {
      // In a real scenario, you might upload to S3/Cloudinary and get a URL
      // For now, we'll send the base64 to our updateDocuments endpoint
      await apiClient.put(`/riders/${riderId}/documents`, {
        [docKey]: base64Image
      });
      
      setDocuments(prev => ({ ...prev, [docKey]: base64Image }));
      Alert.alert('Success', 'Document uploaded successfully');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async () => {
    if (!documents.cnicFront || !documents.cnicBack || !documents.drivingLicense || !documents.profileSelfie) {
      Alert.alert('Missing Documents', 'Please upload CNIC (Front & Back), License, and Profile Selfie.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.put(`/riders/${riderId}/submit-verification`);
      Alert.alert(
        'Success', 
        'Documents submitted! Our team will review your application within 24-48 hours.',
        [{ text: 'OK', onPress: () => navigation.replace('RiderDashboard') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit for verification');
    } finally {
      setLoading(false);
    }
  };

  const DocCard = ({ title, docKey, value }: { title: string, docKey: keyof typeof documents, value: string | null }) => (
    <View style={styles.docCard}>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.docSubtitle}>Clear photo of {title}</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.uploadArea, value && styles.uploadAreaActive]} 
        onPress={() => pickImage(docKey)}
        disabled={uploading === docKey}
      >
        {uploading === docKey ? (
          <ActivityIndicator color={Colors.primary} />
        ) : value ? (
          <Image source={{ uri: value }} style={styles.previewImage} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            <Text style={styles.uploadText}>Upload</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, '#f43f5e']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Document Upload</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={24} color="#fff" />
            <Text style={styles.infoText}>
              Please ensure photos are clear and all text is readable for faster verification.
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            <DocCard title="CNIC Front" docKey="cnicFront" value={documents.cnicFront} />
            <DocCard title="CNIC Back" docKey="cnicBack" value={documents.cnicBack} />
            <DocCard title="Driving License" docKey="drivingLicense" value={documents.drivingLicense} />
            <DocCard title="Vehicle Registration" docKey="vehicleRegistration" value={documents.vehicleRegistration} />
            <DocCard title="Profile Selfie" docKey="profileSelfie" value={documents.profileSelfie} />

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Submit Application</Text>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
  cardsContainer: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docInfo: {
    flex: 1,
    marginRight: 15,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  docSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  uploadArea: {
    width: 80,
    height: 80,
    backgroundColor: Colors.primary + '10',
    borderRadius: 15,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadAreaActive: {
    borderStyle: 'solid',
    borderWidth: 0,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  uploadText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    height: 55,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    gap: 10,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
