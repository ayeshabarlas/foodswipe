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
  Switch,
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

export default function RiderDashboard({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ earnings: 0, orders: 0 });

  useEffect(() => {
    loadInitialData();
    return () => {
      unsubscribeFromChannel('riders');
      if (userData?.id) {
        unsubscribeFromChannel(`user-${userData.id}`);
      }
      if (riderProfile?._id) {
        unsubscribeFromChannel(`rider-${riderProfile._id}`);
      }
    };
  }, [userData?.id, riderProfile?._id]);

  const onRefresh = async () => {
    if (riderProfile?._id) {
      setRefreshing(true);
      await fetchData(riderProfile._id);
      setRefreshing(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const data = await SecureStore.getItemAsync('user_data');
      if (data) {
        const user = JSON.parse(data);
        setUserData(user);
        
        // Fetch Rider Profile
        const res = await apiClient.get('/riders/my-profile');
        setRiderProfile(res.data);
        setIsOnline(res.data.isOnline || false);
        
        // Initialize Socket
        initSocket(user.id, 'rider');
        const ridersChannel = subscribeToChannel('riders');
        const personalChannel = subscribeToChannel(`user-${user.id}`);
        const riderChannel = subscribeToChannel(`rider-${res.data._id}`);

        if (ridersChannel) {
          ridersChannel.bind('newOrderAvailable', (order: any) => {
            console.log('🔔 New Delivery Request:', order._id);
            if (isOnline) {
              setAvailableOrders(prev => [order, ...prev]);
              Alert.alert('New Delivery Request!', `Order from ${order.restaurant?.name || 'Restaurant'}`);
            }
          });
        }

        if (riderChannel) {
          riderChannel.bind('orderStatusUpdate', (data: any) => {
            console.log('📦 Rider Order updated via socket:', data.status);
            setMyOrders(prev => {
              const index = prev.findIndex(o => o._id === data._id);
              if (index > -1) {
                const newOrders = [...prev];
                newOrders[index] = data;
                // If delivered, remove from active orders
                if (data.status === 'Delivered' || data.status === 'Cancelled') {
                  return newOrders.filter(o => o._id !== data._id);
                }
                return newOrders;
              }
              return prev;
            });
          });
        }

        if (personalChannel) {
          personalChannel.bind('orderAssigned', (order: any) => {
            setMyOrders(prev => [order, ...prev]);
            setAvailableOrders(prev => prev.filter(o => o._id !== order._id));
            Alert.alert('Order Assigned!', `Order #${order._id.slice(-6).toUpperCase()} has been assigned to you.`);
          });
        }

        // Fetch Initial Orders & Stats
        fetchData(res.data._id);
      }
    } catch (err) {
      console.error('Error loading rider data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (riderId: string) => {
    try {
      // Try cache first
      const cached = await getCache(`rider_data_${riderId}`);
      if (cached) {
        setMyOrders(cached.myOrders);
        setAvailableOrders(cached.availableOrders);
        setStats(cached.stats);
      }

      const [ordersRes, availableRes, earningsRes] = await Promise.all([
        apiClient.get(`/riders/${riderId}/orders`),
        apiClient.get(`/riders/${riderId}/available-orders`),
        apiClient.get(`/riders/${riderId}/earnings`)
      ]);
      
      const newMyOrders = ordersRes.data.filter((o: any) => o.status !== 'Delivered');
      const newAvailableOrders = availableRes.data;
      const newStats = {
        earnings: earningsRes.data.todayEarnings || 0,
        orders: ordersRes.data.filter((o: any) => o.status === 'Delivered').length
      };

      setMyOrders(newMyOrders);
      setAvailableOrders(newAvailableOrders);
      setStats(newStats);

      await setCache(`rider_data_${riderId}`, {
        myOrders: newMyOrders,
        availableOrders: newAvailableOrders,
        stats: newStats
      });
    } catch (err) {
      console.error('Error fetching rider data:', err);
    }
  };

  const toggleOnline = async (value: boolean) => {
    try {
      setIsOnline(value);
      await apiClient.put(`/riders/${riderProfile._id}/status`, { isOnline: value });
      if (value) {
        fetchData(riderProfile._id);
      } else {
        setAvailableOrders([]);
      }
    } catch (err) {
      setIsOnline(!value);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      await apiClient.post(`/riders/${riderProfile._id}/accept-order`, { orderId });
      Alert.alert('Success', 'Order accepted!');
      fetchData(riderProfile._id);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept order');
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
    navigation.replace('Home');
  };

  const renderMyOrderItem = ({ item: order }: { item: any }) => (
    <View key={order._id} style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Order #{order._id.slice(-6)}</Text>
        <Text style={styles.orderStatus}>{order.status}</Text>
      </View>
      <Text style={styles.restaurantName}>{order.restaurant?.name || 'Restaurant'}</Text>
      <Text style={styles.address} numberOfLines={1}>
        {order.deliveryAddress || 'Delivery Address'}
      </Text>
      <TouchableOpacity 
        style={styles.detailsBtn}
        onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })}
      >
        <Text style={styles.detailsBtnText}>View Details & Map</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAvailableOrderItem = ({ item: order }: { item: any }) => (
    <View key={order._id} style={styles.availableCard}>
      <View style={styles.orderMainInfo}>
        <View style={styles.restInfo}>
          <Text style={styles.restName}>{order.restaurant?.name}</Text>
          <Text style={styles.distanceText}>
            {order.distance ? `${order.distance.toFixed(1)} km away` : 'New Request'}
          </Text>
        </View>
        <View style={styles.earningBadge}>
          <Text style={styles.earningText}>Rs. {order.riderEarning || 45}</Text>
        </View>
      </View>
      
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color={Colors.primary} />
        <Text style={styles.locationText} numberOfLines={1}>{order.deliveryAddress}</Text>
      </View>

      <TouchableOpacity 
        style={styles.acceptBtn}
        onPress={() => acceptOrder(order._id)}
      >
        <Text style={styles.acceptBtnText}>Accept Delivery</Text>
      </TouchableOpacity>
    </View>
  );

  const DashboardHeader = () => (
    <>
      {/* Earnings Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Today's Earnings</Text>
          <Text style={styles.statValue}>Rs. {stats.earnings}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statValue}>{stats.orders}</Text>
        </View>
      </View>

      {/* My Active Orders Section */}
      {myOrders.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Active Orders</Text>
          </View>
          {myOrders.map(order => renderMyOrderItem({ item: order }))}
        </>
      )}

      {/* Available Orders Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Delivery Requests</Text>
        <TouchableOpacity onPress={() => fetchData(riderProfile._id)}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </>
  );

  const DashboardFooter = () => (
    <>
      {/* Quick Actions */}
      <Text style={styles.sectionTitle2}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { name: 'History', icon: 'time-outline', color: '#3B82F6' },
          { name: 'Wallet', icon: 'wallet-outline', color: '#10B981' },
          { name: 'Profile', icon: 'person-outline', color: '#8B5CF6' },
          { name: 'Support', icon: 'help-circle-outline', color: '#6B7280' }
        ].map((action, i) => (
          <TouchableOpacity key={i} style={styles.actionItem}>
            <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Rider Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.riderName}>Hi, {userData?.name || 'Rider'}</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>You are {isOnline ? 'Online' : 'Offline'}</Text>
            <Text style={styles.statusSubtitle}>
              {isOnline ? 'Waiting for orders...' : 'Go online to start earning'}
            </Text>
          </View>
          <Switch 
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: '#D1D5DB', true: '#4ade80' }}
            thumbColor={'#fff'}
          />
        </View>
      </View>

      <FlatList
        data={isOnline ? availableOrders : []}
        keyExtractor={(item) => item._id}
        renderItem={renderAvailableOrderItem}
        ListHeaderComponent={DashboardHeader}
        ListFooterComponent={DashboardFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        contentContainerStyle={styles.contentContainer}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        ListEmptyComponent={
          !isOnline ? (
            <View style={styles.emptyState}>
              <Ionicons name="moon-outline" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>Go online to see available orders</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bicycle-outline" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>No orders available right now</Text>
              <Text style={styles.emptySubtitle}>We'll notify you when a new order comes in!</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  riderName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  contentContainer: {
    paddingBottom: 30,
    marginTop: -20,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 25,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    marginTop: 20,
    marginBottom: 15,
  },
  ordersList: {
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  availableCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  restName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  distanceText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  earningBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  earningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
  },
  locationText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 30,
  },
  actionItem: {
    width: (width - 20) / 4,
    padding: 10,
    alignItems: 'center',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.gray,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  address: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
    marginBottom: 12,
  },
  detailsBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  detailsBtnText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
});