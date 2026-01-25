import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList
} from 'react-native';
import { Colors } from '../theme/colors';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/apiClient';
import { initSocket, subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import { getCache, setCache } from '../utils/cache';

const { width } = Dimensions.get('window');

export default function RestaurantDashboard({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ sales: 0, orders: 0, rating: 0, growth: 12 });

  useEffect(() => {
    loadInitialData();
    return () => {
      if (userData?.restaurantId) {
        unsubscribeFromChannel(`restaurant-${userData.restaurantId}`);
      }
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const loadInitialData = async () => {
    try {
      const data = await SecureStore.getItemAsync('user_data');
      if (data) {
        const user = JSON.parse(data);
        setUserData(user);
        
        // Fetch restaurant details to get restaurantId if not in user_data
        const res = await apiClient.get('/restaurants/my-restaurant');
        const restaurant = res.data;
        
        const updatedUser = { ...user, restaurantId: restaurant._id };
        setUserData(updatedUser);
        
        // Initialize Socket & Subscribe
        initSocket(user.id, 'restaurant');
        const channel = subscribeToChannel(`restaurant-${restaurant._id}`);
        
        if (channel) {
          channel.bind('newOrder', (newOrder: any) => {
            console.log('🔔 New Order Received:', newOrder._id);
            setOrders(prev => [newOrder, ...prev]);
            Alert.alert('New Order!', `You have a new order from ${newOrder.user?.name || 'a customer'}`);
          });
          
          channel.bind('orderCancelled', (data: any) => {
            setOrders(prev => prev.filter(o => o._id !== data.orderId));
          });

          channel.bind('orderStatusUpdate', (data: any) => {
            console.log('📦 Order status updated via socket:', data.status);
            setOrders(prev => {
              const index = prev.findIndex(o => o._id === data._id);
              if (index > -1) {
                const newOrders = [...prev];
                newOrders[index] = data;
                return newOrders;
              }
              return prev;
            });
          });
        }

        // Fetch Orders
        fetchOrders();
      }
    } catch (err) {
      console.error('Error loading restaurant data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      // Try cache first
      const cached = await getCache('restaurant_orders');
      if (cached) {
        setOrders(cached);
        calculateStats(cached);
      }

      const res = await apiClient.get('/orders/restaurant/my-orders');
      setOrders(res.data);
      calculateStats(res.data);
      await setCache('restaurant_orders', res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const calculateStats = (ordersData: any[]) => {
    const deliveredOrders = ordersData.filter((o: any) => o.status === 'Delivered');
    const totalSales = deliveredOrders.reduce((sum: number, o: any) => sum + (o.totalPrice || 0), 0);
    
    setStats({
      sales: totalSales,
      orders: ordersData.length,
      rating: 4.5,
      growth: 12 // Simulated growth percentage
    });
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await apiClient.put(`/orders/${orderId}/status`, { status });
      fetchOrders();
    } catch (err) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
    navigation.replace('Home');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderOrderItem = ({ item: order }: { item: any }) => (
    <TouchableOpacity 
      key={order._id} 
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{order._id.slice(-6)}</Text>
        <Text style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>{order.status}</Text>
      </View>
      
      <View style={styles.orderInfo}>
        <Text style={styles.customerName}>{order.user?.name || 'Customer'}</Text>
        <Text style={styles.orderItems}>
          {order.orderItems?.length || 0} items • Rs. {order.totalPrice}
        </Text>
      </View>

      {order.status === 'Pending' && (
        <View style={styles.orderActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={(e) => {
              e.stopPropagation();
              updateOrderStatus(order._id, 'Preparing');
            }}
          >
            <Text style={styles.actionBtnText}>Accept Order</Text>
          </TouchableOpacity>
        </View>
      )}

      {order.status === 'Preparing' && (
        <View style={styles.orderActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.readyBtn]}
            onPress={(e) => {
              e.stopPropagation();
              updateOrderStatus(order._id, 'Ready for Pickup');
            }}
          >
            <Text style={styles.actionBtnText}>Ready for Pickup</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const DashboardHeader = () => (
    <>
      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today's Sales</Text>
          <Text style={styles.statValue}>Rs. {stats.sales}</Text>
          <View style={styles.growthBadge}>
            <Ionicons name="trending-up" size={12} color="#10B981" />
            <Text style={styles.growthText}>{stats.growth}%</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Orders</Text>
          <Text style={styles.statValue}>{stats.orders}</Text>
          <Text style={styles.statSubValue}>+3 from yesterday</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Avg. Rating</Text>
          <Text style={styles.statValue}>{stats.rating}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <Ionicons key={s} name="star" size={10} color="#F59E0B" />
            ))}
          </View>
        </View>
      </View>

      {/* Analytics Visualization Placeholder */}
      <View style={styles.analyticsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance Analytics</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Weekly</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chartPlaceholder}>
          {[40, 60, 45, 80, 55, 90, 70].map((h, i) => (
            <View key={i} style={styles.chartColumn}>
              <View style={[styles.chartBar, { height: h }]} />
              <Text style={styles.chartDay}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Orders Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Orders</Text>
        {orders.filter(o => o.status === 'Pending').length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{orders.filter(o => o.status === 'Pending').length} New</Text>
          </View>
        )}
      </View>
    </>
  );

  const DashboardFooter = () => (
    <>
      {/* Management Tools */}
      <Text style={styles.sectionTitle2}>Management</Text>
      <View style={styles.toolsGrid}>
        {[
          { name: 'Menu', icon: 'restaurant-outline', color: '#3B82F6' },
          { name: 'Analytics', icon: 'bar-chart-outline', color: '#8B5CF6' },
          { name: 'Reviews', icon: 'star-outline', color: '#F59E0B' },
          { name: 'Promos', icon: 'gift-outline', color: '#EC4899' },
          { name: 'Wallet', icon: 'wallet-outline', color: '#10B981' },
          { name: 'Support', icon: 'chatbubbles-outline', color: '#6B7280' }
        ].map((tool, i) => (
          <TouchableOpacity key={i} style={styles.toolItem}>
            <View style={[styles.toolIcon, { backgroundColor: tool.color + '15' }]}>
              <Ionicons name={tool.icon as any} size={24} color={tool.color} />
            </View>
            <Text style={styles.toolLabel}>{tool.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.restaurantNameHeader}>{userData?.name || 'Restaurant'}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Open</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.gray} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrderItem}
        ListHeaderComponent={DashboardHeader}
        ListFooterComponent={DashboardFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyOrders}>
            <Ionicons name="clipboard-outline" size={60} color={Colors.gray} />
            <Text style={styles.emptyTitle}>No active orders</Text>
            <Text style={styles.emptySubtitle}>Orders will appear here when customers place them.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Pending': return '#F59E0B';
    case 'Preparing': return '#3B82F6';
    case 'Ready for Pickup': return '#10B981';
    case 'Picked Up': return '#8B5CF6';
    case 'Delivered': return '#10B981';
    case 'Cancelled': return '#EF4444';
    default: return Colors.gray;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  restaurantNameHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statLabel: {
    fontSize: 11,
    color: Colors.gray,
    marginBottom: 5,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statSubValue: {
    fontSize: 10,
    color: Colors.gray,
    marginTop: 4,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  growthText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#059669',
    marginLeft: 2,
  },
  starsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  analyticsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  seeAll: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  chartPlaceholder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 20,
    height: 120,
    marginTop: 10,
  },
  chartColumn: {
    alignItems: 'center',
    width: 20,
  },
  chartBar: {
    width: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    opacity: 0.8,
  },
  chartDay: {
    fontSize: 10,
    color: Colors.gray,
    marginTop: 8,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionTitle2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 15,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyOrders: {
    marginHorizontal: 20,
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  ordersList: {
    paddingHorizontal: 20,
    gap: 15,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.gray,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderInfo: {
    marginBottom: 15,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  orderItems: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
  },
  readyBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 30,
  },
  toolItem: {
    width: (width - 24) / 3,
    padding: 12,
    alignItems: 'center',
  },
  toolIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
});
