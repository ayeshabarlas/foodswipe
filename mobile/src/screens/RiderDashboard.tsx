import React, { useEffect, useState, useCallback } from 'react';
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
  FlatList,
  Image,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import { Colors } from '../theme/colors';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/apiClient';
import { initSocket, subscribeToChannel, unsubscribeFromChannel, getSocket } from '../utils/socket';
import { getCache, setCache } from '../utils/cache';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function RiderDashboard({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'earnings' | 'profile'>('home');
  const [orderFilter, setOrderFilter] = useState<'all' | 'nearby' | 'high_pay'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ earnings: 0, orders: 0, rating: 5.0, wallet: 0, cod_balance: 0 });
  const [locationSubscription, setLocationSubscription] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState({ bankName: '', accountTitle: '', accountNumber: '' });
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    loadInitialData();
    return () => {
      stopLocationUpdates();
      unsubscribeFromChannel('riders');
      if (userData?.id) {
        unsubscribeFromChannel(`user-${userData.id}`);
      }
      if (riderProfile?._id) {
        unsubscribeFromChannel(`rider-${riderProfile._id}`);
      }
    };
  }, [userData?.id, riderProfile?._id]);

  useEffect(() => {
    if (activeTab === 'earnings' && riderProfile?._id) {
      fetchEarningsData();
    }
  }, [activeTab, riderProfile?._id]);

  const fetchEarningsData = async () => {
    try {
      const [earningsRes, transRes] = await Promise.all([
        apiClient.get(`/riders/${riderProfile._id}/earnings`),
        apiClient.get(`/riders/${riderProfile._id}/transactions`)
      ]);
      setStats(prev => ({
        ...prev,
        earnings: earningsRes.data.todayEarnings || 0,
        wallet: earningsRes.data.walletBalance || 0,
        cod_balance: riderProfile.cod_balance || 0
      }));
      setTransactions(transRes.data || []);
      if (riderProfile.bankDetails) {
        setBankDetails(riderProfile.bankDetails);
      }
    } catch (err) {
      console.error('Error fetching earnings data:', err);
    }
  };

  const handleSaveBankDetails = async () => {
    setSavingBank(true);
    try {
      await apiClient.put(`/riders/${riderProfile._id}/bank-details`, bankDetails);
      setIsEditingBank(false);
      Alert.alert('Success', 'Bank details updated');
    } catch (err) {
      Alert.alert('Error', 'Failed to update bank details');
    } finally {
      setSavingBank(false);
    }
  };

  const handleCashout = async () => {
    if (stats.wallet < 500) {
      Alert.alert('Notice', 'Minimum cashout amount is Rs. 500');
      return;
    }
    if (!bankDetails.accountNumber) {
      Alert.alert('Notice', 'Please add bank details first');
      setIsEditingBank(true);
      return;
    }
    try {
      await apiClient.post(`/riders/${riderProfile._id}/cashout`, {});
      Alert.alert('Success', 'Cashout request submitted successfully!');
      fetchEarningsData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to process cashout');
    }
  };

  const startLocationUpdates = async (riderId: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 10000, // Or every 10 seconds
        },
        async (location) => {
          const { latitude, longitude } = location.coords;
          console.log('📍 Sending rider location update:', latitude, longitude);
          try {
            await apiClient.put(`/riders/${riderId}/location`, {
              lat: latitude,
              lng: longitude,
            });
          } catch (err) {
            console.error('Failed to update rider location:', err);
          }
        }
      );
      setLocationSubscription(subscription);
    } catch (err) {
      console.error('Error starting location updates:', err);
    }
  };

  const stopLocationUpdates = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
  };

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

        if (res.data.isOnline) {
          startLocationUpdates(res.data._id);
        }
        
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
        const active = cached.myOrders.find((o: any) => 
          ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'Picked Up', 'OnTheWay', 'Arrived', 'ArrivedAtCustomer'].includes(o.status)
        );
        setActiveOrder(active || null);
      }

      const [ordersRes, availableRes, earningsRes] = await Promise.all([
        apiClient.get(`/riders/${riderId}/orders`),
        apiClient.get(`/riders/${riderId}/available-orders`),
        apiClient.get(`/riders/${riderId}/earnings`)
      ]);
      
      const allMyOrders = ordersRes.data;
      const activeMyOrders = allMyOrders.filter((o: any) => o.status !== 'Delivered' && o.status !== 'Cancelled');
      const newAvailableOrders = availableRes.data;
      
      // Find active order for tracking
      const active = activeMyOrders.find((o: any) => 
        ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'Picked Up', 'OnTheWay', 'Arrived', 'ArrivedAtCustomer'].includes(o.status)
      );
      setActiveOrder(active || null);

      const newStats = {
        earnings: earningsRes.data.todayEarnings || 0,
        orders: allMyOrders.filter((o: any) => o.status === 'Delivered').length,
        rating: riderProfile?.stats?.rating || 5.0,
        wallet: earningsRes.data.walletBalance || 0,
        cod_balance: riderProfile?.cod_balance || 0
      };

      setMyOrders(allMyOrders);
      setAvailableOrders(newAvailableOrders);
      setStats(newStats);

      await setCache(`rider_data_${riderId}`, {
        myOrders: allMyOrders,
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
        startLocationUpdates(riderProfile._id);
      } else {
        setAvailableOrders([]);
        stopLocationUpdates();
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

  const DashboardHeader = () => (
    <LinearGradient
      colors={[Colors.primary, '#f43f5e']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <View style={styles.riderInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{userData?.name?.[0] || 'R'}</Text>
          </View>
          <View>
            <Text style={styles.riderName}>Hi, {userData?.name || 'Rider'}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={styles.ratingText}>{stats.rating.toFixed(1)} Rating</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusTitle}>You are {isOnline ? 'Online' : 'Offline'}</Text>
          <Text style={styles.statusSubtitle}>
            {isOnline ? 'Accepting delivery requests' : 'Go online to start earning'}
          </Text>
        </View>
        <Switch 
          value={isOnline}
          onValueChange={toggleOnline}
          trackColor={{ false: '#D1D5DB', true: '#4ade80' }}
          thumbColor={'#fff'}
        />
      </View>
    </LinearGradient>
  );

  const VerificationBanner = () => {
    if (riderProfile?.verificationStatus === 'approved') return null;
    
    return (
      <TouchableOpacity 
        style={styles.verifyBanner}
        onPress={() => riderProfile?.verificationStatus !== 'pending' && Alert.alert('Registration', 'Please complete your registration on our website.')}
      >
        <Ionicons name="alert-circle" size={20} color="#9A3412" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.verifyText}>
            {riderProfile?.verificationStatus === 'pending' 
              ? 'Your profile is under review.'
              : 'Complete your registration to start accepting orders.'}
          </Text>
        </View>
        {riderProfile?.verificationStatus !== 'pending' && (
          <Ionicons name="chevron-forward" size={16} color="#9A3412" />
        )}
      </TouchableOpacity>
    );
  };

  const ActiveOrderTracking = () => {
    if (!activeOrder) return null;

    const steps = [
      { id: 1, label: 'Pickup', status: ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'Arrived'].includes(activeOrder.status) },
      { id: 2, label: 'Picked Up', status: activeOrder.status === 'Picked Up' },
      { id: 3, label: 'Delivery', status: ['OnTheWay', 'ArrivedAtCustomer'].includes(activeOrder.status) }
    ];

    const currentStep = steps.findLastIndex(s => s.status) + 1;

    return (
      <View style={styles.activeOrderCard}>
        <View style={styles.activeOrderHeader}>
          <View style={styles.activeOrderBadge}>
            <MaterialCommunityIcons name="moped" size={16} color={Colors.primary} />
            <Text style={styles.activeOrderBadgeText}>Active Delivery</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('OrderDetails', { orderId: activeOrder._id })}>
            <Text style={styles.viewMapText}>View Map</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activeOrderMain}>
          <Text style={styles.activeRestName}>{activeOrder.restaurant?.name}</Text>
          <Text style={styles.activeOrderAddress} numberOfLines={1}>{activeOrder.deliveryAddress}</Text>
        </View>

        <View style={styles.progressContainer}>
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <View style={styles.stepWrapper}>
                <View style={[
                  styles.stepCircle,
                  currentStep >= step.id && styles.stepCircleActive
                ]}>
                  {currentStep > step.id ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={[styles.stepNum, currentStep >= step.id && styles.stepNumActive]}>{step.id}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, currentStep >= step.id && styles.stepLabelActive]}>{step.label}</Text>
              </View>
              {index < steps.length - 1 && (
                <View style={[styles.stepLine, currentStep > step.id && styles.stepLineActive]} />
              )}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.manageBtn}
          onPress={() => navigation.navigate('OrderDetails', { orderId: activeOrder._id })}
        >
          <Text style={styles.manageBtnText}>Manage Order</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderHomeTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <DashboardHeader />
      <VerificationBanner />
      
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="cash-outline" size={20} color="#059669" />
          </View>
          <Text style={styles.statVal}>Rs. {stats.earnings}</Text>
          <Text style={styles.statLab}>Today's Pay</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="checkmark-done" size={20} color="#2563EB" />
          </View>
          <Text style={styles.statVal}>{stats.orders}</Text>
          <Text style={styles.statLab}>Completed</Text>
        </View>
      </View>

      <ActiveOrderTracking />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('orders')}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="bicycle" size={24} color="#EF4444" />
          </View>
          <Text style={styles.quickActionLabel}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab('earnings')}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="wallet" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.quickActionLabel}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#E0E7FF' }]}>
            <Ionicons name="time" size={24} color="#6366F1" />
          </View>
          <Text style={styles.quickActionLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#F3F4F6' }]}>
            <Ionicons name="help-circle" size={24} color="#4B5563" />
          </View>
          <Text style={styles.quickActionLabel}>Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderOrdersTab = () => {
    const filteredOrders = availableOrders.filter(o => {
      if (orderFilter === 'nearby') return (o.distance || 0) < 5;
      if (orderFilter === 'high_pay') return (o.riderEarning || 0) > 150;
      return true;
    });

    return (
      <View style={styles.tabContent}>
        <LinearGradient colors={[Colors.primary, '#f43f5e']} style={styles.tabHeader}>
          <Text style={styles.tabHeaderTitle}>Available Orders</Text>
          <View style={styles.filterRow}>
            {['all', 'nearby', 'high_pay'].map((f) => (
              <TouchableOpacity 
                key={f} 
                style={[styles.filterBtn, orderFilter === f && styles.filterBtnActive]}
                onPress={() => setOrderFilter(f as any)}
              >
                <Text style={[styles.filterBtnText, orderFilter === f && styles.filterBtnTextActive]}>
                  {f === 'all' ? 'All' : f === 'nearby' ? 'Nearby' : 'High Pay'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        <FlatList
          data={isOnline ? filteredOrders : []}
          keyExtractor={(item) => item._id}
          renderItem={renderAvailableOrderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name={isOnline ? "bicycle-outline" : "moon-outline"} size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>
                {!isOnline ? 'Go online to see available orders' : 'No orders available right now'}
              </Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderEarningsTab = () => (
    <ScrollView style={styles.tabContent}>
      <LinearGradient colors={[Colors.primary, '#f43f5e']} style={styles.tabHeader}>
        <Text style={styles.tabHeaderTitle}>Earnings & Wallet</Text>
        <View style={styles.earningsMain}>
          <Text style={styles.earningsLabel}>Current Balance</Text>
          <Text style={styles.earningsValue}>Rs. {stats.wallet}</Text>
        </View>
      </LinearGradient>

      <View style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <View>
            <Text style={styles.payoutTitle}>Pending Payout</Text>
            <Text style={styles.payoutSubtitle}>Minimum Rs. 500 required</Text>
          </View>
          <Ionicons name="wallet-outline" size={32} color={Colors.primary} />
        </View>
        <TouchableOpacity 
          style={[styles.cashoutBtn, stats.wallet < 500 && styles.cashoutBtnDisabled]}
          onPress={handleCashout}
          disabled={stats.wallet < 500}
        >
          <Text style={styles.cashoutBtnText}>Cash Out Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>COD Balance</Text>
      </View>
      <View style={styles.codCard}>
        <View style={styles.codInfo}>
          <Text style={styles.codLabel}>Cash to be deposited</Text>
          <Text style={styles.codValue}>Rs. {stats.cod_balance}</Text>
        </View>
        <TouchableOpacity style={styles.depositBtn}>
          <Text style={styles.depositBtnText}>Deposit Cash</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bank Account</Text>
        <TouchableOpacity onPress={() => setIsEditingBank(true)}>
          <Text style={styles.editText}>Change</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bankCard}>
        <View style={styles.bankIconContainer}>
          <Ionicons name="business" size={24} color={Colors.gray} />
        </View>
        <View style={styles.bankInfo}>
          <Text style={styles.bankName}>{bankDetails.bankName || 'Add Bank Account'}</Text>
          <Text style={styles.accountInfo}>
            {bankDetails.accountNumber ? `**** ${bankDetails.accountNumber.slice(-4)}` : 'No account set'} • {bankDetails.accountTitle || 'No title'}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
      </View>
      <View style={styles.transactionsList}>
        {transactions.length > 0 ? transactions.map((tx, idx) => (
          <View key={idx} style={styles.transactionItem}>
            <View style={styles.txIcon}>
              <Ionicons name="arrow-up-circle" size={24} color="#059669" />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txTitle}>Earnings for #{tx.orderId?.slice(-6)}</Text>
              <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.txAmount}>+Rs. {tx.amount}</Text>
          </View>
        )) : (
          <View style={styles.emptyTx}>
            <Text style={styles.emptyTxText}>No transactions found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderProfileTab = () => (
    <ScrollView style={styles.tabContent}>
      <LinearGradient colors={[Colors.primary, '#f43f5e']} style={styles.tabHeader}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarLarge}>
            <Text style={styles.profileAvatarTextLarge}>{userData?.name?.[0] || 'R'}</Text>
          </View>
          <Text style={styles.profileNameLarge}>{userData?.name}</Text>
          <Text style={styles.profileEmailLarge}>{userData?.email}</Text>
        </View>
      </LinearGradient>

      <View style={styles.profileMenu}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={22} color={Colors.gray} />
          <Text style={styles.menuText}>Personal Details</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text-outline" size={22} color={Colors.gray} />
          <Text style={styles.menuText}>My Documents</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={22} color={Colors.gray} />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={22} color={Colors.gray} />
          <Text style={styles.menuText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { marginTop: 20 }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={[styles.menuText, { color: '#EF4444' }]}>Log Out</Text>
          <Ionicons name="chevron-forward" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const BottomNav = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => setActiveTab('home')}
      >
        <Ionicons 
          name={activeTab === 'home' ? "home" : "home-outline"} 
          size={24} 
          color={activeTab === 'home' ? Colors.primary : Colors.gray} 
        />
        <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => setActiveTab('orders')}
      >
        <Ionicons 
          name={activeTab === 'orders' ? "bicycle" : "bicycle-outline"} 
          size={24} 
          color={activeTab === 'orders' ? Colors.primary : Colors.gray} 
        />
        <Text style={[styles.navText, activeTab === 'orders' && styles.navTextActive]}>Orders</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => setActiveTab('earnings')}
      >
        <Ionicons 
          name={activeTab === 'earnings' ? "wallet" : "wallet-outline"} 
          size={24} 
          color={activeTab === 'earnings' ? Colors.primary : Colors.gray} 
        />
        <Text style={[styles.navText, activeTab === 'earnings' && styles.navTextActive]}>Earnings</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => setActiveTab('profile')}
      >
        <Ionicons 
          name={activeTab === 'profile' ? "person" : "person-outline"} 
          size={24} 
          color={activeTab === 'profile' ? Colors.primary : Colors.gray} 
        />
        <Text style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>Profile</Text>
      </TouchableOpacity>
    </View>
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
      
      <View style={styles.mainContent}>
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'orders' && renderOrdersTab()}
        {activeTab === 'earnings' && renderEarningsTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </View>

      <BottomNav />

      {/* Bank Details Modal */}
      <Modal visible={isEditingBank} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bank Details</Text>
              <TouchableOpacity onPress={() => setIsEditingBank(false)}>
                <Ionicons name="close" size={24} color={Colors.gray} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput 
                style={styles.input}
                value={bankDetails.bankName}
                onChangeText={(text) => setBankDetails({ ...bankDetails, bankName: text })}
                placeholder="e.g. HBL, Meezan"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Account Title</Text>
              <TextInput 
                style={styles.input}
                value={bankDetails.accountTitle}
                onChangeText={(text) => setBankDetails({ ...bankDetails, accountTitle: text })}
                placeholder="Name on account"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Account Number / IBAN</Text>
              <TextInput 
                style={styles.input}
                value={bankDetails.accountNumber}
                onChangeText={(text) => setBankDetails({ ...bankDetails, accountNumber: text })}
                placeholder="Account number"
              />
            </View>

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSaveBankDetails}
              disabled={savingBank}
            >
              {savingBank ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Details</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  mainContent: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  header: {
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
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  riderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    opacity: 0.9,
  },
  logoutBtn: {
    padding: 8,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusSubtitle: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  verifyText: {
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLab: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  activeOrderCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  activeOrderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeOrderBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 6,
  },
  viewMapText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  activeRestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  activeOrderAddress: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  stepWrapper: {
    alignItems: 'center',
    zIndex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.gray,
  },
  stepNumActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 10,
    color: Colors.gray,
    marginTop: 6,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#F3F4F6',
    marginTop: -16,
    marginHorizontal: -5,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  manageBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
    gap: 8,
  },
  manageBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  quickAction: {
    width: (width - 20) / 4,
    alignItems: 'center',
    padding: 10,
  },
  quickActionIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  bottomNav: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    paddingTop: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 10,
    color: Colors.gray,
    marginTop: 4,
    fontWeight: '500',
  },
  navTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  tabHeader: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  tabHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  filterBtnActive: {
    backgroundColor: '#fff',
  },
  filterBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  filterBtnTextActive: {
    color: Colors.primary,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  earningsMain: {
    alignItems: 'center',
    marginTop: 10,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  earningsValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  payoutCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  payoutTitle: {
    fontSize: 16,
    color: Colors.gray,
    fontWeight: '500',
  },
  payoutSubtitle: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  cashoutBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  cashoutBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  cashoutBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  codCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  codInfo: {
    flex: 1,
  },
  codLabel: {
    fontSize: 12,
    color: Colors.gray,
  },
  codValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 4,
  },
  depositBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  depositBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
  },
  editText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  bankCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  bankIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  accountInfo: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  transactionsList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  txDate: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  emptyTx: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTxText: {
    fontSize: 14,
    color: Colors.gray,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  profileAvatarTextLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileNameLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileEmailLarge: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  profileMenu: {
    padding: 20,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    marginLeft: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.gray,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: 15,
  },
  availableCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
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
  restInfo: {
    flex: 1,
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
});