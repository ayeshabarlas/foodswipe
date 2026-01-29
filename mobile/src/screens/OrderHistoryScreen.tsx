import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';

export default function OrderHistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get('/orders/my-orders');
      setOrders(res.data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'pending': return '#F59E0B';
      case 'preparing': return '#3B82F6';
      case 'picked_up': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { orderId: item._id })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{item.restaurant?.name || 'Restaurant'}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: '2-digit', 
              year: 'numeric' 
            })} • {new Date(item.createdAt).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: true 
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <Text style={styles.itemsSummary} numberOfLines={1}>
          {item.items.map((i: any) => i.name).join(', ')}
        </Text>
        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>Rs. {item.totalAmount}</Text>
          <TouchableOpacity 
            style={styles.reorderButton}
            onPress={() => navigation.navigate('RestaurantDetails', { restaurantId: item.restaurant?._id })}
          >
            <Text style={styles.reorderText}>View Restaurant</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={80} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>Hungry? Start exploring restaurants nearby!</Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => navigation.navigate('CustomerDashboard')}
          >
            <Text style={styles.exploreText}>Explore Food</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        />
      )}
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
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  orderBody: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  itemsSummary: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  reorderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  reorderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});