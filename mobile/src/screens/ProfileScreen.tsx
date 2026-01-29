import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/apiClient';

export default function ProfileScreen({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userInfo = await SecureStore.getItemAsync('user_info');
      if (userInfo) {
        setUserData(JSON.parse(userInfo));
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('user_token');
              await SecureStore.deleteItemAsync('user_info');
              navigation.replace('Login');
            } catch (err) {
              console.error('Error during logout:', err);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={50} color="#fff" />
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.userName}>{userData?.name || 'User Name'}</Text>
            <Text style={styles.userEmail}>{userData?.email || 'email@example.com'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{userData?.role?.toUpperCase() || 'CUSTOMER'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="person-outline" size={22} color="#1976D2" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Edit Profile</Text>
              <Text style={styles.menuItemSubtitle}>Change your name and personal info</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('OrderHistory')}>
            <View style={[styles.menuIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="receipt-outline" size={22} color="#4F46E5" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Order History</Text>
              <Text style={styles.menuItemSubtitle}>View all your past orders</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="location-outline" size={22} color="#16A34A" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Saved Addresses</Text>
              <Text style={styles.menuItemSubtitle}>Manage your delivery locations</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Helpline')}>
            <View style={[styles.menuIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="help-circle-outline" size={22} color="#EA580C" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>Help Center</Text>
              <Text style={styles.menuItemSubtitle}>Get help with your orders</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#F9FAFB' }]}>
              <Ionicons name="information-circle-outline" size={22} color="#4B5563" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>About Us</Text>
              <Text style={styles.menuItemSubtitle}>Terms, Privacy and more</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#111827',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  infoContainer: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 40,
  }
});
