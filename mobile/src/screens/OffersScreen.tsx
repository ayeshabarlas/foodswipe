import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import VoucherCard from '../components/VoucherCard';

export default function OffersScreen({ navigation }: any) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVouchers = async () => {
    try {
      const res = await apiClient.get('/vouchers');
      setVouchers(res.data || []);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVouchers();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Special Offers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        <View style={styles.infoBox}>
          <Ionicons name="gift-outline" size={24} color={Colors.primary} />
          <Text style={styles.infoText}>
            Use these voucher codes at checkout to save big on your favorite meals!
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : vouchers.length > 0 ? (
          <View style={styles.voucherGrid}>
            {vouchers.map((voucher) => (
              <VoucherCard 
                key={voucher._id} 
                voucher={voucher}
                onPress={() => Alert.alert(
                  'Voucher Code', 
                  `Use code ${voucher.code} to get ${voucher.discountType === 'percentage' ? voucher.discount + '%' : 'Rs.' + voucher.discount} off!\n\n${voucher.description}`
                )}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Offers Available</Text>
            <Text style={styles.emptySubtitle}>Check back later for exciting new deals and discounts.</Text>
            <TouchableOpacity 
              style={styles.refreshBtn}
              onPress={onRefresh}
            >
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
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
    flexGrow: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    padding: 15,
    borderRadius: 16,
    marginBottom: 25,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  voucherGrid: {
    gap: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  refreshBtn: {
    marginTop: 25,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
