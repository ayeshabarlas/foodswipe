import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function AboutScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About FoodSwipe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoSection}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>FoodSwipe</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.description}>
            FoodSwipe is dedicated to bringing the best local flavors right to your doorstep. 
            We connect food lovers with their favorite local restaurants and home chefs, 
            ensuring a seamless and delicious experience every time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Us?</Text>
          
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="flash" size={20} color="#4CAF50" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Fast Delivery</Text>
              <Text style={styles.featureDesc}>Get your food delivered fresh and hot in record time.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="restaurant" size={20} color="#FF9800" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Wide Variety</Text>
              <Text style={styles.featureDesc}>From local desi to international cuisines, we have it all.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#2196F3" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Safe & Secure</Text>
              <Text style={styles.featureDesc}>Your safety and satisfaction are our top priorities.</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 FoodSwipe. All rights reserved.</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-instagram" size={24} color="#E4405F" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    padding: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 15,
  },
  version: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 16,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  featureDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  socialLinks: {
    flexDirection: 'row',
    marginTop: 20,
  },
  socialBtn: {
    marginHorizontal: 15,
    padding: 10,
    borderRadius: 50,
    backgroundColor: '#F9FAFB',
  }
});
