import React, { useEffect, useState, useRef } from 'react';
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
  FlatList,
  Modal,
  Vibration,
  Platform
} from 'react-native';
import { Colors } from '../theme/colors';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../api/apiClient';
import { initSocket, subscribeToChannel, unsubscribeFromChannel, getSocket } from '../utils/socket';
import { getCache, setCache } from '../utils/cache';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

export default function RestaurantDashboard({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [restaurantProfile, setRestaurantProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>({
    sales: 0,
    orders: 0,
    rating: 5.0,
    growth: 0,
    totalEarned: 0,
    commissionPaid: 0,
    monthlyOrders: 0
  });
  const [activeTab, setActiveTab] = useState<'orders' | 'earnings' | 'reviews'>('orders');
  const [reviews, setReviews] = useState<any[]>([]);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [socketStatus, setSocketStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  // New Order Alert State
  const [newOrderAlert, setNewOrderAlert] = useState<any>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadInitialData();
    setupSound();
    
    // Check socket connection status
    const interval = setInterval(() => {
      const socket = getSocket();
      if (socket && (socket as any).connection) {
        setSocketStatus((socket as any).connection.state === 'connected' ? 'connected' : 'disconnected');
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (userData?.restaurantId) {
        unsubscribeFromChannel(`restaurant-${userData.restaurantId}`);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const setupSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/notification.mp3'),
        { shouldPlay: false }
      );
      soundRef.current = sound;
    } catch (error) {
      console.log('Sound setup error:', error);
    }
  };

  const playNotificationSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
      Vibration.vibrate([0, 500, 200, 500]);
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      const data = await SecureStore.getItemAsync('user_data');
      if (data) {
        const user = JSON.parse(data);
        setUserData(user);
      }

      const cachedProfile = await SecureStore.getItemAsync('restaurant_profile');
      if (cachedProfile) {
        setRestaurantProfile(JSON.parse(cachedProfile));
      }

      // Fetch latest user data to check for suspension
      try {
        const userRes = await apiClient.get('/auth/me');
        const latestUser = userRes.data;
        setUserData(latestUser);
        await SecureStore.setItemAsync('user_data', JSON.stringify(latestUser));

        // Fetch restaurant details
        const res = await apiClient.get('/restaurants/my-restaurant');
        const restaurant = res.data;
        setRestaurantProfile(restaurant);
        await SecureStore.setItemAsync('restaurant_profile', JSON.stringify(restaurant));
        
        const updatedUser = { ...latestUser, restaurantId: restaurant._id };
        setUserData(updatedUser);
        
        // Initialize Socket & Subscribe
        initSocket(latestUser.id, 'restaurant');
        const channel = subscribeToChannel(`restaurant-${restaurant._id}`);
        
        if (channel) {
          channel.bind('newOrder', (newOrder: any) => {
            console.log('🔔 New Order Received:', newOrder._id);
            setOrders(prev => [newOrder, ...prev]);
            setNewOrderAlert(newOrder);
            playNotificationSound();
            fetchStats();
          });
          
          channel.bind('orderCancelled', (data: any) => {
            setOrders(prev => prev.filter(o => o._id !== data.orderId));
            if (newOrderAlert?._id === data.orderId) {
              setNewOrderAlert(null);
            }
            fetchStats();
            Alert.alert('Order Cancelled', 'An order has been cancelled by the customer.');
          });

          channel.bind('orderStatusUpdate', (data: any) => {
            setOrders(prev => {
              const index = prev.findIndex(o => o._id === data._id);
              if (index > -1) {
                const newOrders = [...prev];
                newOrders[index] = data;
                return newOrders;
              }
              return prev;
            });
            fetchStats();
          });

          channel.bind('newReview', (newReview: any) => {
            setReviews(prev => [newReview, ...prev]);
            fetchStats();
            Vibration.vibrate(100);
          });

          channel.bind('wallet_updated', () => {
            fetchStats();
          });

          channel.bind('statsUpdate', (data: any) => {
            setStats(prev => ({
              ...prev,
              rating: data.rating || prev.rating
            }));
          });
        }

        fetchOrders();
        fetchStats();
        fetchReviews(restaurant._id);
      } catch (apiErr) {
        console.error('API Error in loadInitialData:', apiErr);
      }
    } catch (err) {
      console.error('Error loading restaurant data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [dashRes, earnRes] = await Promise.all([
        apiClient.get('/dashboard/stats'),
        apiClient.get('/restaurants/earnings/stats')
      ]);

      if (dashRes.data && earnRes.data) {
        setStats({
          sales: dashRes.data.revenueToday || 0,
          orders: dashRes.data.ordersToday || 0,
          rating: dashRes.data.avgRating || 4.8,
          growth: earnRes.data.growth || 0,
          totalEarned: earnRes.data.totalEarned || 0,
          commissionPaid: earnRes.data.commissionPaid || 0,
          monthlyOrders: earnRes.data.monthlyOrders || 0
        });
        setEarningsHistory(earnRes.data.weeklyHistory || []);
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const fetchReviews = async (restaurantId: string) => {
    try {
      const res = await apiClient.get(`/restaurants/${restaurantId}/reviews`);
      setReviews(res.data);
    } catch (err) {
      console.error('Reviews error:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get('/orders/restaurant/my-orders');
      // Filter for active orders
      const activeOrders = res.data.filter((o: any) => 
        ['Pending', 'Preparing', 'Ready for Pickup', 'Picked Up'].includes(o.status)
      );
      setOrders(activeOrders);
    } catch (err) {
      console.error('Orders error:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const userRes = await apiClient.get('/auth/me');
      const latestUser = userRes.data;
      setUserData(latestUser);
      await SecureStore.setItemAsync('user_data', JSON.stringify(latestUser));

      const res = await apiClient.get('/restaurants/my-restaurant');
      const restaurant = res.data;
      setRestaurantProfile(restaurant);
      await SecureStore.setItemAsync('restaurant_profile', JSON.stringify(restaurant));
    } catch (err) {
      console.error('Refresh user data error:', err);
    }
    
    await Promise.all([
      fetchOrders(), 
      fetchStats(), 
      userData?.restaurantId ? fetchReviews(userData.restaurantId) : Promise.resolve()
    ]);
    setRefreshing(false);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      setLoading(true);
      await apiClient.put(`/orders/${orderId}/status`, { status });
      
      // Update local state immediately for better UX
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
      
      if (newOrderAlert?._id === orderId) {
        setNewOrderAlert(null);
      }

      // Success feedback
      Vibration.vibrate(100);
      
    } catch (err: any) {
      console.error('Update status error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to update order status');
    } finally {
      setLoading(false);
      fetchOrders(); // Refresh to be sure
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: async () => {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('user_data');
        navigation.replace('Home');
      }}
    ]);
  };

  const NewOrderModal = () => (
    <Modal
      visible={!!newOrderAlert}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.newOrderCard}>
          <View style={styles.newOrderHeader}>
            <View style={styles.pulseContainer}>
              <View style={styles.pulse} />
              <Ionicons name="notifications" size={24} color="#fff" />
            </View>
            <Text style={styles.newOrderTitle}>NEW ORDER RECEIVED!</Text>
          </View>

          <View style={styles.newOrderInfo}>
            <Text style={styles.orderAmount}>Rs. {newOrderAlert?.totalPrice}</Text>
            <Text style={styles.customerInfo}>{newOrderAlert?.user?.name || 'Customer'}</Text>
            <View style={styles.itemBadge}>
              <Text style={styles.itemBadgeText}>{newOrderAlert?.orderItems?.length || 0} ITEMS</Text>
            </View>
            
            <View style={styles.itemList}>
              {newOrderAlert?.orderItems?.slice(0, 3).map((item: any, i: number) => (
                <Text key={i} style={styles.itemText}>• {item.qty}x {item.name}</Text>
              ))}
              {newOrderAlert?.orderItems?.length > 3 && (
                <Text style={styles.moreItems}>+{newOrderAlert.orderItems.length - 3} more items...</Text>
              )}
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalBtn, styles.rejectBtnLarge]}
              onPress={() => updateOrderStatus(newOrderAlert._id, 'Cancelled')}
            >
              <Text style={styles.modalBtnText}>REJECT</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalBtn, styles.acceptBtnLarge]}
              onPress={() => updateOrderStatus(newOrderAlert._id, 'Preparing')}
            >
              <Text style={styles.modalBtnText}>ACCEPT ORDER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderOrderItem = ({ item: order }: { item: any }) => {
    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - orderTime.getTime()) / 60000);
    
    return (
      <TouchableOpacity 
        key={order._id} 
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderIdText}>Order #{String(order._id || '').slice(-6)}</Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color={Colors.gray} />
              <Text style={styles.orderTimeText}>
                {orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({diffMins}m ago)
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(order.status) + '15' }]}>
            <Text style={[styles.statusTextSmall, { color: getStatusColor(order.status) }]}>{order.status}</Text>
          </View>
        </View>
        
        <View style={styles.orderBody}>
          <View style={styles.customerRow}>
            <Ionicons name="person-circle-outline" size={20} color={Colors.gray} />
            <Text style={styles.customerNameText}>{order.user?.name || 'Customer'}</Text>
          </View>
          <Text style={styles.orderItemsSummary}>
            {order.orderItems?.map((i: any) => `${i.qty}x ${i.name}`).join(', ')}
          </Text>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.priceText}>Rs. {order.totalPrice}</Text>
          <View style={styles.quickActions}>
            {order.status === 'Pending' && (
              <>
                <TouchableOpacity 
                  style={[styles.miniActionBtn, { backgroundColor: '#FEE2E2' }]}
                  onPress={() => updateOrderStatus(order._id, 'Cancelled')}
                >
                  <Ionicons name="close" size={20} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.miniActionBtn, { backgroundColor: '#ECFDF5' }]}
                  onPress={() => updateOrderStatus(order._id, 'Preparing')}
                >
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                  <Text style={styles.miniActionText}>Accept</Text>
                </TouchableOpacity>
              </>
            )}
            {order.status === 'Preparing' && (
              <TouchableOpacity 
                style={[styles.miniActionBtn, { backgroundColor: '#E0F2FE', paddingHorizontal: 12 }]}
                onPress={() => updateOrderStatus(order._id, 'Ready for Pickup')}
              >
                <Ionicons name="restaurant" size={18} color="#0284C7" />
                <Text style={[styles.miniActionText, { color: '#0284C7' }]}>Mark Ready</Text>
              </TouchableOpacity>
            )}
            {order.status === 'Ready for Pickup' && (
              <View style={styles.waitingBadge}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.waitingText}>Waiting for Rider</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReviewItem = ({ item: review }: { item: any }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.miniAvatar}>
            <Text style={styles.miniAvatarText}>{review.user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <View>
            <Text style={styles.reviewerName}>{review.user?.name || 'Customer'}</Text>
            <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingValue}>{review.rating}</Text>
          <Ionicons name="star" size={12} color="#F59E0B" />
        </View>
      </View>
      <Text style={styles.reviewComment}>{review.comment || 'No comment provided'}</Text>
      {review.dish && (
        <View style={styles.reviewDish}>
          <Ionicons name="fast-food-outline" size={14} color={Colors.gray} />
          <Text style={styles.reviewDishText}>{review.dish.name}</Text>
        </View>
      )}
    </View>
  );

  const renderEarningItem = ({ item: week }: { item: any }) => (
    <View style={styles.earningCard}>
      <View style={styles.earningWeekInfo}>
        <Text style={styles.weekLabel}>Week {week.week}</Text>
        <Text style={styles.weekOrders}>{week.orders} Orders</Text>
      </View>
      <View style={styles.earningAmountInfo}>
        <Text style={styles.weekAmount}>Rs. {week.revenue}</Text>
        <View style={styles.statusBadgeGreen}>
          <Text style={styles.statusTextGreen}>Paid</Text>
        </View>
      </View>
    </View>
  );

  const SuspensionBanner = () => {
    const status = userData?.status || restaurantProfile?.owner?.status;
    const suspension = userData?.suspensionDetails || restaurantProfile?.owner?.suspensionDetails;

    if (status !== 'suspended') return null;

    return (
      <View style={styles.suspensionBanner}>
        <View style={styles.suspensionHeader}>
          <Ionicons name="alert-circle" size={24} color="#fff" />
          <Text style={styles.suspensionTitle}>ACCOUNT SUSPENDED</Text>
        </View>
        <Text style={styles.suspensionReason}>
          Reason: {suspension?.reason || 'Violation of terms'}
        </Text>
        {suspension?.unsuspendAt && (
          <Text style={styles.suspensionDate}>
            Auto-unsuspend on: {new Date(suspension.unsuspendAt).toLocaleDateString()}
          </Text>
        )}
        <Text style={styles.suspensionContact}>
          Please contact support if you think this is a mistake.
        </Text>
      </View>
    );
  };

  const VerificationBanner = () => {
    const status = restaurantProfile?.verificationStatus;
    const reason = restaurantProfile?.rejectionReason;

    if (status === 'approved' || !status) return null;

    return (
      <View style={[
        styles.verificationBanner, 
        { backgroundColor: status === 'rejected' ? '#FEE2E2' : '#FEF3C7' }
      ]}>
        <View style={styles.suspensionHeader}>
          <Ionicons 
            name={status === 'rejected' ? "close-circle" : "time"} 
            size={20} 
            color={status === 'rejected' ? "#EF4444" : "#D97706"} 
          />
          <Text style={[
            styles.verificationTitle, 
            { color: status === 'rejected' ? "#EF4444" : "#D97706" }
          ]}>
            {status === 'pending' ? 'VERIFICATION PENDING' : 'VERIFICATION REJECTED'}
          </Text>
        </View>
        <Text style={[
          styles.verificationText, 
          { color: status === 'rejected' ? "#991B1B" : "#92400E" }
        ]}>
          {status === 'pending' 
            ? 'Our team is reviewing your documents. You will be able to receive orders once approved.' 
            : `Reason: ${reason || 'Documents did not meet requirements'}`
          }
        </Text>
      </View>
    );
  };

  const DashboardHeader = () => (
    <View style={styles.dashboardHeaderContainer}>
      {/* Real-time Status Toggle */}
      <View style={styles.liveStatusContainer}>
        <View style={[styles.liveIndicator, { backgroundColor: socketStatus === 'connected' ? '#000' : '#EF4444' }]}>
          <View style={[styles.liveDot, { backgroundColor: socketStatus === 'connected' ? '#10B981' : '#fff' }]} />
          <Text style={styles.liveText}>
            {socketStatus === 'connected' ? 'Live Terminal' : 'Connection Lost'}
          </Text>
        </View>
        <Text style={styles.lastUpdate}>
          {socketStatus === 'connected' ? 'Updating in real-time' : 'Check internet connection'}
        </Text>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statTitle}>TODAY'S SALES</Text>
          <Text style={styles.statMainValue}>Rs. {stats.sales}</Text>
          <View style={styles.trendRow}>
            <Ionicons name="trending-up" size={14} color="#10B981" />
            <Text style={styles.trendText}>+{stats.growth}%</Text>
          </View>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statTitle}>ORDERS</Text>
          <Text style={styles.statMainValue}>{stats.orders}</Text>
          <Text style={styles.statSubText}>Completed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statTitle}>RATING</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.statMainValue}>{stats.rating}</Text>
            <Ionicons name="star" size={16} color="#F59E0B" />
          </View>
          <Text style={styles.statSubText}>Avg. Review</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Ionicons name="list" size={20} color={activeTab === 'orders' ? '#fff' : Colors.gray} />
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>Orders</Text>
          {orders.length > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{orders.length}</Text></View>}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'earnings' && styles.tabBtnActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <Ionicons name="wallet-outline" size={20} color={activeTab === 'earnings' ? '#fff' : Colors.gray} />
          <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>Earnings</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'reviews' && styles.tabBtnActive]}
          onPress={() => setActiveTab('reviews')}
        >
          <Ionicons name="star-outline" size={20} color={activeTab === 'reviews' ? '#fff' : Colors.gray} />
          <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>Reviews</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'earnings' && (
        <View style={styles.earningsOverview}>
          <View style={styles.earningsCardLarge}>
            <Text style={styles.earnLabel}>Total Net Earnings</Text>
            <Text style={styles.earnValueLarge}>Rs. {stats.totalEarned.toLocaleString()}</Text>
            <View style={styles.earnSplit}>
              <View style={styles.splitBox}>
                <Text style={styles.splitLabel}>Commission Paid</Text>
                <Text style={styles.splitValue}>Rs. {stats.commissionPaid.toLocaleString()}</Text>
              </View>
              <View style={styles.splitBox}>
                <Text style={styles.splitLabel}>Monthly Orders</Text>
                <Text style={styles.splitValue}>{stats.monthlyOrders}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.sectionHeading}>WEEKLY HISTORY</Text>
        </View>
      )}

      {activeTab === 'orders' && <Text style={styles.sectionHeading}>ACTIVE ORDERS</Text>}
      {activeTab === 'reviews' && <Text style={styles.sectionHeading}>CUSTOMER REVIEWS</Text>}
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'orders': return orders;
      case 'earnings': return earningsHistory;
      case 'reviews': return reviews;
      default: return [];
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    switch (activeTab) {
      case 'orders': return renderOrderItem({ item });
      case 'earnings': return renderEarningItem({ item });
      case 'reviews': return renderReviewItem({ item });
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SuspensionBanner />
      <VerificationBanner />
      <NewOrderModal />
      
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userData?.name?.charAt(0) || 'R'}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{userData?.name || 'Restaurant'}</Text>
            <Text style={styles.userRole}>Restaurant Partner</Text>
          </View>
        </View>
        <View style={styles.navActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={22} color={Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
            <Ionicons name="power" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={getListData()}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={renderItem}
        ListHeaderComponent={DashboardHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons 
                name={activeTab === 'orders' ? 'fast-food-outline' : activeTab === 'earnings' ? 'wallet-outline' : 'star-outline'} 
                size={50} 
                color={Colors.gray + '50'} 
              />
            </View>
            <Text style={styles.emptyTitleText}>
              {activeTab === 'orders' ? 'Kitchen is quiet' : activeTab === 'earnings' ? 'No earnings yet' : 'No reviews yet'}
            </Text>
            <Text style={styles.emptySubText}>
              {activeTab === 'orders' ? 'New orders will appear here in real-time' : 'Your data will show up as you grow'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
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
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  userRole: {
    fontSize: 12,
    color: Colors.gray,
  },
  navActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  dashboardHeaderContainer: {
    padding: 20,
  },
  liveStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  lastUpdate: {
    fontSize: 11,
    color: Colors.gray,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.gray,
    marginBottom: 6,
  },
  statMainValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statSubText: {
    fontSize: 10,
    color: Colors.gray,
    marginTop: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
    marginLeft: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  orderTimeText: {
    fontSize: 12,
    color: Colors.gray,
    marginLeft: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTextSmall: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  orderBody: {
    marginBottom: 16,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  orderItemsSummary: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  miniActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
    marginLeft: 4,
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 14,
    marginBottom: 20,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  // Earnings Styles
  earningsOverview: {
    marginBottom: 10,
  },
  earningsCardLarge: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  earnLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  earnValueLarge: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  earnSplit: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 15,
    gap: 20,
  },
  splitBox: {
    flex: 1,
  },
  splitLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  splitValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  earningCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  earningWeekInfo: {
    gap: 2,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  weekOrders: {
    fontSize: 12,
    color: Colors.gray,
  },
  earningAmountInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  weekAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  statusBadgeGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTextGreen: {
    color: '#166534',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Review Styles
  reviewCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  reviewDate: {
    fontSize: 10,
    color: Colors.gray,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D97706',
  },
  reviewComment: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  reviewDish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  reviewDishText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  waitingBadge: {  flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  waitingText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newOrderCard: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    padding: 24,
  },
  newOrderHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    opacity: 0.3,
  },
  newOrderTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 1,
  },
  newOrderInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  orderAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  customerInfo: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 16,
  },
  itemBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#475569',
  },
  itemList: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
  },
  itemText: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 4,
  },
  moreItems: {
    fontSize: 13,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtnLarge: {
    backgroundColor: '#F1F5F9',
  },
  acceptBtnLarge: {
    backgroundColor: Colors.primary,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  suspensionBanner: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DC2626',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  suspensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  suspensionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  suspensionReason: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.9,
  },
  suspensionDate: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.8,
  },
  suspensionContact: {
    color: '#fff',
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  verificationBanner: {
    padding: 15,
    margin: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  verificationText: {
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
});
