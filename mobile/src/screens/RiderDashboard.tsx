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
  Platform,
  Linking
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
  const [showHistory, setShowHistory] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'nearby' | 'high_pay'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCashoutLoading, setIsCashoutLoading] = useState(false);
  const [stats, setStats] = useState({ earnings: 0, orders: 0, rating: 5.0, wallet: 0, cod_balance: 0, totalEarnings: 0 });
  const [locationSubscription, setLocationSubscription] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState({ bankName: '', accountTitle: '', accountNumber: '' });
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const isOnlineRef = React.useRef(isOnline);
  const riderProfileRef = React.useRef(riderProfile);
  const activeOrderRef = React.useRef(activeOrder);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    riderProfileRef.current = riderProfile;
  }, [riderProfile]);

  useEffect(() => {
    activeOrderRef.current = activeOrder;
  }, [activeOrder]);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [newOrderPopup, setNewOrderPopup] = useState<any>(null);
  const [completionPopup, setCompletionPopup] = useState<any>(null);
  const [timer, setTimer] = useState(60);

  // New Order Popup Timer Logic
  useEffect(() => {
    let interval: any;
    if (newOrderPopup && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setNewOrderPopup(null);
      setTimer(60);
    }
    return () => clearInterval(interval);
  }, [newOrderPopup, timer]);

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
    const profile = riderProfileRef.current || riderProfile;
    if (!profile?._id) {
      console.log('DEBUG: Cannot fetch earnings, riderProfile is null');
      return;
    }
    
    try {
      const [earningsRes, transRes] = await Promise.all([
        apiClient.get(`/riders/${profile._id}/earnings`),
        apiClient.get(`/riders/${profile._id}/transactions`)
      ]);
      setStats(prev => ({
        ...prev,
        earnings: earningsRes.data.today || 0,
        wallet: earningsRes.data.pendingPayout || 0,
        cod_balance: earningsRes.data.cod_balance ?? prev.cod_balance,
        orders: earningsRes.data.deliveries ?? prev.orders,
        totalEarnings: earningsRes.data.total || 0
      }));
      setTransactions(transRes.data || []);
      if (profile.bankDetails) {
        setBankDetails(profile.bankDetails);
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

    Alert.alert(
      'Confirm Cashout',
      `Are you sure you want to cash out Rs. ${stats.wallet}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Cash Out', 
          onPress: async () => {
            setIsCashoutLoading(true);
            try {
              await apiClient.post(`/riders/${riderProfile._id}/cashout`, {});
              Alert.alert('Success', 'Cashout request submitted successfully!');
              fetchEarningsData();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to process cashout');
            } finally {
              setIsCashoutLoading(false);
            }
          }
        }
      ]
    );
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
            // Check if token exists before making request
            const token = await SecureStore.getItemAsync('auth_token');
            if (!token) {
              console.log('📍 Token missing, stopping location updates');
              stopLocationUpdates();
              return;
            }

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
      // Fetch latest user data
      try {
        const userRes = await apiClient.get('/auth/me');
        const latestUser = userRes.data;
        setUserData(latestUser);
        await SecureStore.setItemAsync('user_data', JSON.stringify(latestUser));
      } catch (userErr) {
        console.error('Error refreshing user data:', userErr);
      }
      
      await fetchData(riderProfile._id);
      setRefreshing(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const data = await SecureStore.getItemAsync('user_data');
      if (data) {
        const user = JSON.parse(data);
        console.log('👤 User data loaded:', { id: user.id, _id: user._id, role: user.role });
        const userId = user._id || user.id || user.userId;
        setUserData(user);

        // Fetch latest user data to check for suspension
        try {
          const userRes = await apiClient.get('/auth/me');
          const latestUser = userRes.data;
          setUserData(latestUser);
          await SecureStore.setItemAsync('user_data', JSON.stringify(latestUser));
        } catch (userErr) {
          console.error('Error fetching latest user data:', userErr);
        }
        
        // Fetch Rider Profile
        const res = await apiClient.get('/riders/my-profile');
        setRiderProfile(res.data);
        setIsOnline(res.data.isOnline || false);

        if (res.data.isOnline) {
          startLocationUpdates(res.data._id);
        }
        
        // Initialize Socket
        initSocket(userId, 'rider');
        const ridersChannel = subscribeToChannel('riders');
        const personalChannel = subscribeToChannel(`user-${userId}`);
        const riderChannel = subscribeToChannel(`rider-${res.data._id}`);

        if (ridersChannel) {
          ridersChannel.bind('newOrderAvailable', (order: any) => {
            console.log('🔔 New Delivery Request:', order._id, 'Rider Online Status (ref):', isOnlineRef.current);
            if (isOnlineRef.current) {
              setAvailableOrders(prev => {
                const exists = prev.some(o => o._id === order._id);
                if (exists) return prev;
                return [order, ...prev];
              });
              setNewOrderPopup(order);
              setTimer(60); // Set timer for the popup
            }
          });

          ridersChannel.bind('orderStatusUpdate', (updatedOrder: any) => {
            console.log('📦 Order update on riders channel:', updatedOrder._id, updatedOrder.status);
            // If order now has a rider, remove it from available orders for everyone else
            if (updatedOrder.rider) {
              setAvailableOrders(prev => prev.filter(o => o._id !== updatedOrder._id));
              // If this was the order currently showing in the popup, close it
              setNewOrderPopup(current => (current?._id === updatedOrder._id ? null : current));
            }
          });
        }

        if (riderChannel) {
          riderChannel.bind('orderStatusUpdate', (data: any) => {
            console.log('📦 Rider Order updated via socket:', data.status);
            
            // Show completion popup if order is delivered
            if (data.status === 'Delivered') {
              setCompletionPopup(data);
              fetchEarningsData(); // Refresh earnings
            }

            setMyOrders(prev => {
              const index = prev.findIndex(o => o._id === data._id);
              if (index > -1) {
                const newOrders = [...prev];
                newOrders[index] = data;
                // If delivered, remove from active orders
                if (data.status === 'Delivered' || data.status === 'Cancelled') {
                  if (activeOrderRef.current?._id === data._id) {
                    setActiveOrder(null);
                  }
                  return newOrders.filter(o => o._id !== data._id);
                }
                return newOrders;
              }
              return prev;
            });
            // Update active order if it's the one being tracked and not completed
            if (activeOrderRef.current?._id === data._id && !['Delivered', 'Cancelled'].includes(data.status)) {
              setActiveOrder(data);
            } else if (activeOrderRef.current?._id === data._id && ['Delivered', 'Cancelled'].includes(data.status)) {
              setActiveOrder(null);
            }
          });

          riderChannel.bind('verificationStatusUpdated', (data: any) => {
            console.log('✅ Verification status updated via socket:', data.verificationStatus);
            setRiderProfile(data);
            if (data.verificationStatus === 'approved') {
              Alert.alert('Congratulations!', 'Your account has been verified. You can now go online.');
            } else if (data.verificationStatus === 'rejected') {
              Alert.alert('Verification Update', 'Your registration was not approved. Please check your documents.');
            }
          });

          riderChannel.bind('wallet_updated', async (data: any) => {
            console.log('💰 Wallet updated via socket:', data);
            
            // Clear cache to ensure next full fetch is fresh
            if (riderProfile?._id) {
              await setCache(`rider_data_${riderProfile._id}`, null);
            }

            setStats(prev => ({
              ...prev,
              wallet: data.walletBalance || data.earnings_balance || prev.wallet,
              cod_balance: data.cod_balance !== undefined ? data.cod_balance : prev.cod_balance,
              earnings: data.earnings?.today || data.stats?.totalEarnings || prev.earnings
            }));
            // Optionally refetch earnings data to be sure
            fetchEarningsData();
          });
        }

        if (personalChannel) {
          personalChannel.bind('orderAssigned', (order: any) => {
            setMyOrders(prev => [order, ...prev]);
            setAvailableOrders(prev => prev.filter(o => o._id !== order._id));
            setNewOrderPopup(order);
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

      const [profileRes, ordersRes, availableRes, earningsRes, historyRes] = await Promise.all([
        apiClient.get('/riders/my-profile'),
        apiClient.get(`/riders/${riderId}/orders`),
        apiClient.get(`/riders/${riderId}/available-orders`),
        apiClient.get(`/riders/${riderId}/earnings`),
        apiClient.get(`/riders/${riderId}/deliveries`)
      ]);
      
      const updatedProfile = profileRes.data;
      setRiderProfile(updatedProfile);
      
      const allMyOrders = ordersRes.data;
      const activeMyOrders = allMyOrders.filter((o: any) => o.status !== 'Delivered' && o.status !== 'Cancelled');
      const newAvailableOrders = availableRes.data;
      const historyData = historyRes.data;
      
      // Find active order for tracking
      const active = activeMyOrders.find((o: any) => 
        ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'Picked Up', 'OnTheWay', 'Arrived', 'ArrivedAtCustomer'].includes(o.status)
      );
      setActiveOrder(active || null);

      const newStats = {
        earnings: earningsRes.data.today || 0,
        orders: historyData.filter((o: any) => o.status === 'Delivered' || o.status === 'Completed').length,
        rating: riderProfile?.stats?.rating || 5.0,
        wallet: earningsRes.data.pendingPayout || 0,
        cod_balance: earningsRes.data.cod_balance ?? 0
      };

      setMyOrders(allMyOrders);
      setAvailableOrders(newAvailableOrders);
      setHistoryOrders(historyData);
      setStats(newStats);

      await setCache(`rider_data_${riderId}`, {
        myOrders: allMyOrders,
        availableOrders: newAvailableOrders,
        historyOrders: historyData,
        stats: newStats
      });
    } catch (err) {
      console.error('Error fetching rider data:', err);
    }
  };

  const toggleOnline = async (value: boolean) => {
    const maxRetries = 3;
    let attempt = 0;
    
    const tryUpdate = async (): Promise<boolean> => {
      try {
        if (value && riderProfile?.verificationStatus !== 'approved') {
          Alert.alert('Verification Required', 'Please complete your registration and wait for admin approval before going online.');
          setIsOnline(false);
          return true;
        }
        
        await apiClient.put(`/riders/${riderProfile._id}/status`, { isOnline: value });
        setIsOnline(value);
        
        if (value) {
          fetchData(riderProfile._id);
          startLocationUpdates(riderProfile._id);
        } else {
          setAvailableOrders([]);
          stopLocationUpdates();
        }
        return true;
      } catch (err) {
        console.error(`Toggle online attempt ${attempt + 1} failed:`, err);
        return false;
      }
    };

    while (attempt < maxRetries) {
      const success = await tryUpdate();
      if (success) return;
      attempt++;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // If all retries fail
    setIsOnline(!value);
    Alert.alert('Connection Error', 'Failed to update online status. Please check your internet connection and try again.');
  };

  const acceptOrder = async (orderId: string) => {
    if (isAccepting) return;
    setIsAccepting(true);
    try {
      const res = await apiClient.post(`/riders/${riderProfile._id}/accept-order`, { orderId });
      Alert.alert('Success', 'Order accepted!');
      setNewOrderPopup(null);
      fetchData(riderProfile._id);
      // Navigate to order details immediately
      navigation.navigate('OrderDetails', { orderId });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept order');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLogout = async () => {
    stopLocationUpdates();
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

  const SuspensionBanner = () => {
    const status = userData?.status || riderProfile?.user?.status;
    const suspension = userData?.suspensionDetails || riderProfile?.user?.suspensionDetails;

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
    // If approved, don't show the banner
    if (riderProfile?.verificationStatus === 'approved') return null;
    
    // Determine the message and navigation
    let message = 'Complete your registration to start accepting orders.';
    let showChevron = true;

    if (riderProfile?.verificationStatus === 'pending') {
      message = 'Your profile is under review.';
      showChevron = false;
    } else if (riderProfile?.verificationStatus === 'rejected') {
      message = 'Your registration was rejected. Tap to fix.';
    }

    return (
      <TouchableOpacity 
        style={styles.verifyBanner}
        onPress={() => {
          if (riderProfile?.verificationStatus === 'pending') {
            Alert.alert('Status', 'Your profile is under review. Please wait for admin approval.');
          } else if (riderProfile?.verificationStatus === 'rejected') {
            navigation.navigate('RiderRegistration');
          } else if (riderProfile?._id) {
            // If profile exists but not approved/pending, go to documents
            navigation.navigate('RiderDocumentUpload', { riderId: riderProfile._id });
          } else {
            // No profile at all
            navigation.navigate('RiderRegistration');
          }
        }}
      >
        <Ionicons name="alert-circle" size={20} color="#9A3412" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.verifyText}>{message}</Text>
        </View>
        {showChevron && (
          <Ionicons name="chevron-forward" size={16} color="#9A3412" />
        )}
      </TouchableOpacity>
    );
  };

  const ActiveOrderTracking = () => {
    if (!activeOrder) return null;

    const openMap = (targetAddress: string, lat?: number, lng?: number) => {
      if (!targetAddress && (!lat || !lng)) {
        console.log('📍 openMap: No address or coordinates provided');
        return;
      }
      
      // Normalize coordinates
      const latitude = Number(lat);
      const longitude = Number(lng);
      const hasCoords = !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0;

      console.log('📍 Opening Map:', { targetAddress, latitude, longitude, hasCoords });

      // Official Google Maps Universal Link (Very reliable)
      let url = "";
      if (hasCoords) {
        url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
      } else {
        const encodedAddress = encodeURIComponent(targetAddress);
        url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
      }

      // Platform specific deep links
      let googleMapsAppUrl = "";
      if (Platform.OS === 'android') {
        // geo:lat,lng?q=lat,lng(Label) is very precise and shows a labeled pin
        // This is often better than google.navigation because it shows the exact destination
        googleMapsAppUrl = hasCoords 
          ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(targetAddress)})` 
          : `geo:0,0?q=${encodeURIComponent(targetAddress)}`;
      } else {
        // iOS: comgooglemaps://?daddr=lat,lng is standard for directions
        googleMapsAppUrl = hasCoords 
          ? `comgooglemaps://?daddr=${latitude},${longitude}&q=${latitude},${longitude}&directionsmode=driving` 
          : `comgooglemaps://?daddr=${encodeURIComponent(targetAddress)}&directionsmode=driving`;
      }

      Linking.canOpenURL(googleMapsAppUrl).then(supported => {
        if (supported) {
          console.log('📍 Opening via Google Maps App Scheme');
          Linking.openURL(googleMapsAppUrl);
        } else {
          Linking.canOpenURL(url).then(supportedUrl => {
            if (supportedUrl) {
              console.log('📍 Opening via Universal Link');
              Linking.openURL(url);
            } else {
              // Fallback to Apple Maps on iOS
              console.log('📍 Falling back to Apple Maps');
              const appleUrl = hasCoords
                ? `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d` 
                : `http://maps.apple.com/?daddr=${encodeURIComponent(targetAddress)}&dirflg=d`;
              Linking.openURL(appleUrl);
            }
          });
        }
      }).catch((err) => {
        console.error('📍 Error opening map:', err);
        Linking.openURL(url);
      });
    };

    const steps = [
      { id: 1, label: 'Pickup', status: ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'Arrived'].includes(activeOrder.status), backendStatus: 'Arrived' },
      { id: 2, label: 'Picked Up', status: activeOrder.status === 'Picked Up', backendStatus: 'Picked Up' },
      { id: 3, label: 'Delivery', status: ['OnTheWay', 'ArrivedAtCustomer'].includes(activeOrder.status), backendStatus: 'ArrivedAtCustomer' }
    ];

    const currentStepIndex = steps.findLastIndex(s => s.status);
    const currentStep = currentStepIndex + 1;

    const handleQuickStatusUpdate = async () => {
      if (!activeOrder || isUpdatingStatus) return;

      let nextStatus = '';
      let statusLabel = '';

      if (['Accepted', 'Confirmed', 'Preparing', 'Ready'].includes(activeOrder.status)) {
        nextStatus = 'Arrived';
        statusLabel = 'Arrived at Restaurant';
      } else if (activeOrder.status === 'Arrived') {
        nextStatus = 'Picked Up';
        statusLabel = 'Picked Up';
      } else if (activeOrder.status === 'Picked Up' || activeOrder.status === 'OnTheWay') {
        nextStatus = 'ArrivedAtCustomer';
        statusLabel = 'Arrived at Customer';
      } else if (activeOrder.status === 'ArrivedAtCustomer') {
        nextStatus = 'Delivered';
        statusLabel = 'Delivered';
      }

      if (!nextStatus) {
        navigation.navigate('OrderDetails', { orderId: activeOrder._id });
        return;
      }

      Alert.alert(
        'Update Status',
        `Mark order as ${statusLabel}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Yes', 
            onPress: async () => {
              setIsUpdatingStatus(true);
              const maxRetries = 3;
              let attempt = 0;

              while (attempt < maxRetries) {
                try {
                  await apiClient.put(`/orders/${activeOrder._id}/status`, { 
                    status: nextStatus,
                    distanceKm: 0 // Fallback distance
                  });
                  // Socket will handle the UI update
                  break;
                } catch (err) {
                  console.error(`Status update attempt ${attempt + 1} failed:`, err);
                  attempt++;
                  if (attempt === maxRetries) {
                    Alert.alert('Error', 'Failed to update status. Please try from Order Details page.');
                  } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                }
              }
              setIsUpdatingStatus(false);
            }
          }
        ]
      );
    };

    return (
      <View style={styles.activeOrderCard}>
        <View style={styles.activeOrderHeader}>
          <View style={styles.activeOrderBadge}>
            <MaterialCommunityIcons name="moped" size={16} color={Colors.primary} />
            <Text style={styles.activeOrderBadgeText}>Active Delivery</Text>
          </View>
          <TouchableOpacity 
            style={styles.directionsButtonHeader}
            onPress={() => {
              const isHeadingToCustomer = ['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(activeOrder.status);
              if (isHeadingToCustomer) {
                openMap(activeOrder.deliveryAddress, activeOrder.deliveryLocation?.lat, activeOrder.deliveryLocation?.lng);
              } else {
                const lat = activeOrder.restaurant?.location?.coordinates?.[1];
                const lng = activeOrder.restaurant?.location?.coordinates?.[0];
                openMap(activeOrder.restaurant?.address, lat, lng);
              }
            }}
          >
            <Ionicons name="logo-google" size={18} color={Colors.primary} />
            <Text style={styles.viewMapText}> G-Maps</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activeOrderMain}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeRestName}>{activeOrder.restaurant?.name}</Text>
            <Text style={styles.activeOrderAddress} numberOfLines={1}>{activeOrder.deliveryAddress}</Text>
          </View>
          <TouchableOpacity 
            style={styles.detailsBtnSmall}
            onPress={() => navigation.navigate('OrderDetails', { orderId: activeOrder._id })}
          >
            <Text style={styles.detailsBtnSmallText}>Details</Text>
          </TouchableOpacity>
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
          style={[styles.manageBtnLarge, isUpdatingStatus && { opacity: 0.7 }]}
          onPress={handleQuickStatusUpdate}
          disabled={isUpdatingStatus}
        >
          <View style={styles.manageBtnContent}>
            <View>
              {isUpdatingStatus ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.manageBtnTitle}>
                    {['Accepted', 'Confirmed', 'Preparing', 'Ready'].includes(activeOrder.status) ? 'Mark Arrived' :
                     activeOrder.status === 'Arrived' ? 'Mark Picked Up' :
                     (activeOrder.status === 'Picked Up' || activeOrder.status === 'OnTheWay') ? 'Mark Arrived at Customer' :
                     activeOrder.status === 'ArrivedAtCustomer' ? 'Mark Delivered' : 'View Details'}
                  </Text>
                  <Text style={styles.manageBtnSubtitle}>Status: {activeOrder.status}</Text>
                </>
              )}
            </View>
            <View style={styles.manageBtnIconContainer}>
              <Ionicons name={isUpdatingStatus ? "sync" : "arrow-forward"} size={24} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHistoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetails', { orderId: item._id })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.restaurantInfo}>
          <View style={[styles.statIcon, { backgroundColor: item.status === 'Delivered' ? '#ECFDF5' : '#FEF2F2' }]}>
            <Ionicons 
              name={item.status === 'Delivered' ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={item.status === 'Delivered' ? "#059669" : "#EF4444"} 
            />
          </View>
          <View>
            <Text style={styles.restaurantName}>{item.restaurant?.name || 'Restaurant'}</Text>
            <Text style={styles.distanceText}>{new Date(item.createdAt).toLocaleDateString()} • {item.status}</Text>
          </View>
        </View>
        <View style={styles.earningBadge}>
          <Text style={styles.earningText}>Rs. {item.riderEarning || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAvailableOrderItem = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.restaurantInfo}>
          <Image 
            source={{ uri: item.restaurant?.image || 'https://via.placeholder.com/100' }} 
            style={styles.restaurantImage} 
          />
          <View>
            <Text style={styles.restaurantName}>{item.restaurant?.name || 'Restaurant'}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={14} color={Colors.primary} />
              <Text style={styles.distanceText}>{(item.distance || 0).toFixed(1)} km away</Text>
            </View>
          </View>
        </View>
        <View style={styles.earningBadge}>
          <Text style={styles.earningText}>Rs. {item.riderEarning || 0}</Text>
        </View>
      </View>

      <View style={styles.orderDivider} />

      <View style={styles.addressInfo}>
        <View style={styles.addressRow}>
          <View style={styles.dot} />
          <Text style={styles.addressText} numberOfLines={1}>{item.restaurant?.address}</Text>
        </View>
        <View style={[styles.addressRow, { marginTop: 10 }]}>
          <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.addressText} numberOfLines={1}>{item.deliveryAddress}</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <TouchableOpacity 
          style={styles.detailsBtn}
          onPress={() => navigation.navigate('OrderDetails', { orderId: item._id })}
        >
          <Text style={styles.detailsBtnText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.acceptBtn}
          onPress={() => acceptOrder(item._id)}
        >
          <Text style={styles.acceptBtnText}>Accept Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHomeTab = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      <DashboardHeader />
      
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
        <TouchableOpacity style={styles.quickAction} onPress={() => {
          setActiveTab('orders');
          setShowHistory(true);
        }}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="time" size={24} color="#0EA5E9" />
          </View>
          <Text style={styles.quickActionLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={() => Linking.openURL('https://wa.me/923001234567')}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="help-buoy" size={24} color="#10B981" />
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
          <View style={styles.tabToggleRow}>
            <TouchableOpacity 
              style={[styles.tabToggleBtn, !showHistory && styles.tabToggleBtnActive]}
              onPress={() => setShowHistory(false)}
            >
              <Text style={[styles.tabToggleText, !showHistory && styles.tabToggleTextActive]}>Available</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabToggleBtn, showHistory && styles.tabToggleBtnActive]}
              onPress={() => setShowHistory(true)}
            >
              <Text style={[styles.tabToggleText, showHistory && styles.tabToggleTextActive]}>History</Text>
            </TouchableOpacity>
          </View>

          {!showHistory && (
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
          )}
        </LinearGradient>

        <FlatList
          data={showHistory ? historyOrders : (isOnline ? filteredOrders : [])}
          keyExtractor={(item) => item._id}
          renderItem={showHistory ? renderHistoryItem : renderAvailableOrderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons 
                name={showHistory ? "time-outline" : (isOnline ? "bicycle-outline" : "moon-outline")} 
                size={64} 
                color={Colors.gray} 
              />
              <Text style={styles.emptyText}>
                {showHistory 
                  ? 'No order history yet' 
                  : (!isOnline ? 'Go online to see available orders' : 'No orders available right now')}
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
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsValue}>Rs. {stats.totalEarnings}</Text>
        </View>
        <View style={styles.earningsSubRow}>
          <View style={styles.earningSubBox}>
            <Text style={styles.earningSubLabel}>Current Wallet</Text>
            <Text style={styles.earningSubValue}>Rs. {stats.wallet}</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.earningSubBox}>
            <Text style={styles.earningSubLabel}>Today</Text>
            <Text style={styles.earningSubValue}>Rs. {stats.earnings}</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.earningSubBox}>
            <Text style={styles.earningSubLabel}>Deliveries</Text>
            <Text style={styles.earningSubValue}>{stats.orders}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.payoutCard}>
        <View style={styles.payoutHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.payoutTitle}>Current Balance</Text>
            <Text style={styles.payoutSubtitle}>Payouts are processed automatically every week to your bank account.</Text>
          </View>
          <View style={styles.walletIconContainer}>
            <Ionicons name="wallet-outline" size={32} color={Colors.primary} />
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceBadgeText}>Rs. {stats.wallet}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>COD Balance</Text>
      </View>
      <View style={styles.codCard}>
        <View style={styles.codInfo}>
          <Text style={styles.codLabel}>Cash to be deposited</Text>
          <Text style={styles.codValue}>Rs. {stats.cod_balance}</Text>
        </View>
        <TouchableOpacity style={styles.depositBtn} onPress={() => setShowDepositModal(true)}>
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
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowProfileModal(true)}>
          <Ionicons name="person-outline" size={22} color={Colors.gray} />
          <Text style={styles.menuText}>Personal Details</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('RiderRegistration')}>
          <Ionicons name="document-text-outline" size={22} color={Colors.gray} />
          <Text style={styles.menuText}>My Documents</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowSettingsModal(true)}>
          <Ionicons name="settings-outline" size={22} color={Colors.gray} />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowPrivacyModal(true)}>
          <Ionicons name="shield-checkmark-outline" size={22} color={Colors.gray} />
          <Text style={styles.menuText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => setShowTermsModal(true)}>
          <Ionicons name="document-attach-outline" size={22} color={Colors.gray} />
          <Text style={styles.menuText}>Terms of Service</Text>
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
      
      <SuspensionBanner />
      <VerificationBanner />

      <View style={styles.mainContent}>
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'orders' && renderOrdersTab()}
        {activeTab === 'earnings' && renderEarningsTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </View>

      {/* Order Completion Popup */}
      <Modal
        visible={!!completionPopup}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.completionOverlay}>
          <View style={styles.completionModal}>
            <LinearGradient
              colors={['#4ade80', '#22c55e']}
              style={styles.completionHeader}
            >
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </View>
              <Text style={styles.completionTitle}>Order Delivered!</Text>
              <Text style={styles.completionSubtitle}>Great job on completing this delivery</Text>
            </LinearGradient>

            <View style={styles.completionBody}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Order ID</Text>
                <Text style={styles.summaryValue}>#{completionPopup?._id?.slice(-6).toUpperCase()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Earnings</Text>
                <Text style={[styles.summaryValue, { color: '#22c55e' }]}>Rs. {completionPopup?.netRiderEarning || completionPopup?.riderEarning || 0}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Customer</Text>
                <Text style={styles.summaryValue}>{completionPopup?.user?.name || 'Customer'}</Text>
              </View>

              <TouchableOpacity 
                style={styles.completionCloseBtn}
                onPress={() => setCompletionPopup(null)}
              >
                <Text style={styles.completionCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalFullContent}>
          <View style={styles.modalHeaderFull}>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitleFull}>Privacy Policy</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.policyHeading}>1. Information We Collect</Text>
            <Text style={styles.policyText}>We collect information you provide directly to us, such as when you create or modify your account, request delivery services, contact customer support, or otherwise communicate with us.</Text>
            
            <Text style={styles.policyHeading}>2. How We Use Information</Text>
            <Text style={styles.policyText}>We use the information we collect to provide, maintain, and improve our Services, including to facilitate payments, send receipts, provide products and services you request (and send related information), and develop new features.</Text>
            
            <Text style={styles.policyHeading}>3. Location Information</Text>
            <Text style={styles.policyText}>To facilitate delivery, we collect precise location data of the rider when the FoodSwipe app is running in the foreground or background.</Text>
            
            <Text style={styles.policyHeading}>4. Data Security</Text>
            <Text style={styles.policyText}>We use appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing.</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal visible={showTermsModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalFullContent}>
          <View style={styles.modalHeaderFull}>
            <TouchableOpacity onPress={() => setShowTermsModal(false)}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitleFull}>Terms of Service</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.policyHeading}>1. Business Information</Text>
            <Text style={styles.policyText}>Registered Name: FoodSwipe (Private) Limited</Text>
            <Text style={styles.policyText}>Business Address: Allama Iqbal Town, Lahore</Text>
            <Text style={styles.policyText}>Contact: +923295599855 | Email: app.foodswipehelp@gmail.com</Text>

            <Text style={styles.policyHeading}>2. Service Usage</Text>
            <Text style={styles.policyText}>You must be 18 years or older to use FoodSwipe. Provide accurate information during registration. Keep your account credentials secure. FoodSwipe reserves the right to suspend accounts for violations.</Text>

            <Text style={styles.policyHeading}>3. Orders & Payments</Text>
            <Text style={styles.policyText}>All orders are subject to restaurant availability. Prices may vary and are confirmed at checkout. Payment is processed securely through our platform. Taxes and delivery fees are calculated based on location.</Text>

            <Text style={styles.policyHeading}>4. Refund & Cancellation Policy</Text>
            <Text style={styles.policyText}>Order Cancellation: Orders can only be cancelled before the restaurant accepts them.</Text>
            <Text style={styles.policyText}>Refunds: Refunds are processed within 5-7 business days for eligible cancelled orders.</Text>
            <Text style={styles.policyText}>Incorrect Orders: If you receive an incorrect or damaged item, please report it via the Support section within 2 hours.</Text>
            <Text style={styles.policyText}>Delivery Failure: If a delivery fails due to incorrect address or unavailability, no refund will be issued.</Text>

            <Text style={styles.policyHeading}>5. Customer Complaint Handling</Text>
            <Text style={styles.policyText}>We value your feedback and take complaints seriously.</Text>
            <Text style={styles.policyText}>Mechanism: You can lodge a complaint via the "Support" tab in the app or email us at app.foodswipehelp@gmail.com.</Text>
            <Text style={styles.policyText}>Resolution: Our team will acknowledge your complaint within 24 hours and aim for resolution within 48-72 hours.</Text>
            <Text style={styles.policyText}>Appeals: If unsatisfied with the resolution, you may escalate to app.foodswipehelp@gmail.com.</Text>

            <Text style={styles.policyHeading}>6. Jurisdiction & Governing Law</Text>
            <Text style={styles.policyText}>These Terms and Conditions shall be governed by and construed in accordance with the laws of the Islamic Republic of Pakistan. Any dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Lahore, Pakistan.</Text>
            
            <Text style={styles.policyHeading}>7. Rider Conduct</Text>
            <Text style={styles.policyText}>Riders must maintain a professional demeanor, follow traffic laws, and ensure food safety during transit. Failure to do so may result in account suspension.</Text>
            
            <Text style={styles.policyHeading}>8. Payments and Earnings</Text>
            <Text style={styles.policyText}>Earnings are calculated based on distance and order value. Payouts are processed weekly to the provided bank account, subject to minimum balance requirements.</Text>
            
            <Text style={styles.policyHeading}>9. Account Termination</Text>
            <Text style={styles.policyText}>FoodSwipe reserves the right to terminate or suspend your account at any time for violations of these terms or for any other reason at our sole discretion.</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* New Order Popup (TikTok Style) */}
      <Modal visible={!!newOrderPopup} transparent={true} animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={styles.modernPopupContainer}>
            <LinearGradient
              colors={['#ffffff', '#fdfdfd']}
              style={styles.modernPopupContent}
            >
              {/* Top Banner with Pulse Effect */}
              <View style={styles.popupHeader}>
                <View>
                  <Text style={styles.popupMainTitle}>New Order!</Text>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE REQUEST</Text>
                  </View>
                </View>
                <View style={styles.timerBadge}>
                  <Text style={styles.timerText}>{timer}s</Text>
                </View>
              </View>

              {/* Earnings Card - Very Prominent */}
              <View style={styles.earningsHighlight}>
                <LinearGradient
                  colors={[Colors.primary, '#f43f5e']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.earningsInfo}
                >
                  <View style={styles.earningsIconBg}>
                    <Ionicons name="wallet" size={26} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.earningsLabel, { color: 'rgba(255,255,255,0.8)' }]}>YOUR ESTIMATED PAY</Text>
                    <Text style={[styles.earningsValue, { color: '#fff', fontSize: 24 }]}>
                      Rs. {newOrderPopup?.netRiderEarning || newOrderPopup?.riderEarning || Math.round(40 + ((newOrderPopup?.distanceKm || 0) * 20))}
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              <ScrollView style={styles.popupScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.popupInfoSection}>
                  {/* Restaurant Info */}
                  <View style={styles.popupInfoRow}>
                    <View style={[styles.infoIconBg, { backgroundColor: '#FFF7ED' }]}>
                      <Ionicons name="restaurant" size={18} color="#F97316" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>PICKUP FROM</Text>
                      <Text style={styles.infoTitle}>{newOrderPopup?.restaurant?.name || 'Restaurant'}</Text>
                      <Text style={styles.infoSubtitle} numberOfLines={1}>{newOrderPopup?.restaurant?.address || 'Restaurant Address'}</Text>
                    </View>
                  </View>

                  {/* Delivery Info */}
                  <View style={styles.popupInfoRow}>
                    <View style={[styles.infoIconBg, { backgroundColor: '#EFF6FF' }]}>
                      <Ionicons name="location" size={18} color="#3B82F6" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>DELIVER TO</Text>
                      <Text style={styles.infoTitle} numberOfLines={2}>{newOrderPopup?.shippingAddress?.address || newOrderPopup?.deliveryAddress || 'Customer Address'}</Text>
                      <View style={styles.distanceTag}>
                        <Ionicons name="navigate-circle" size={14} color="#3B82F6" />
                        <Text style={styles.distanceText}>
                          {typeof newOrderPopup?.distanceKm === 'number' ? `${newOrderPopup.distanceKm.toFixed(1)} km away` : 'Calculating distance...'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Payment Info */}
                  <View style={styles.popupInfoRow}>
                    <View style={[styles.infoIconBg, { backgroundColor: '#F5F3FF' }]}>
                      <Ionicons name="card" size={18} color="#8B5CF6" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>PAYMENT METHOD</Text>
                      <Text style={styles.infoTitle}>{newOrderPopup?.paymentMethod?.toUpperCase() === 'COD' ? 'Cash on Delivery' : 'Paid Online'}</Text>
                      {newOrderPopup?.paymentMethod?.toUpperCase() === 'COD' && (
                        <Text style={styles.collectAmount}>Collect from customer: Rs. {newOrderPopup?.totalPrice}</Text>
                      )}
                    </View>
                  </View>

                  {/* Order Items Summary */}
                  {newOrderPopup?.orderItems && (
                    <View style={styles.popupInfoRow}>
                      <View style={[styles.infoIconBg, { backgroundColor: '#F0FDF4' }]}>
                        <Ionicons name="basket" size={18} color="#22C55E" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>ORDER ITEMS ({newOrderPopup.orderItems.length})</Text>
                        <View style={styles.itemsContainer}>
                          {newOrderPopup.orderItems.map((item: any, idx: number) => (
                            <View key={idx} style={styles.itemTag}>
                              <Text style={styles.itemTagText}>{item.qty}x {item.name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.popupActions}>
                <TouchableOpacity 
                  style={styles.declineBtn}
                  onPress={() => setNewOrderPopup(null)}
                >
                  <Text style={styles.declineBtnText}>DECLINE</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.acceptBtn}
                  onPress={() => acceptOrder(newOrderPopup?._id)}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <LinearGradient
                      colors={['#22C55E', '#16A34A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.acceptBtnGradient}
                    >
                      <Text style={[styles.acceptBtnText, { fontSize: 16 }]}>ACCEPT ORDER</Text>
                      <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

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

      {/* Deposit Cash Modal */}
      <Modal visible={showDepositModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit Cash</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <Ionicons name="close" size={24} color={Colors.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: height * 0.6 }}>
              <Text style={styles.depositInfoText}>
                Please deposit the cash collected from COD orders to any of the following accounts:
              </Text>
              
              <View style={styles.accountCard}>
                <Text style={styles.accountName}>JazzCash</Text>
                <Text style={styles.accountNumber}>0300 1234567</Text>
                <Text style={styles.accountHolder}>FoodSwipe Pvt Ltd</Text>
              </View>

              <View style={styles.accountCard}>
                <Text style={styles.accountName}>EasyPaisa</Text>
                <Text style={styles.accountNumber}>0311 7654321</Text>
                <Text style={styles.accountHolder}>FoodSwipe Pvt Ltd</Text>
              </View>

              <Text style={[styles.depositInfoText, { marginTop: 15, fontWeight: 'bold' }]}>
                Important:
              </Text>
              <Text style={styles.depositInfoText}>
                After depositing, please send a screenshot of the receipt to our support WhatsApp with your Rider ID (#{riderProfile?._id?.slice(-6).toUpperCase()}).
              </Text>
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.saveBtn, { marginTop: 20 }]} 
              onPress={() => {
                setShowDepositModal(false);
                Linking.openURL('https://wa.me/923001234567?text=Deposit%20Receipt%20for%20Rider%20ID:%20' + riderProfile?._id?.slice(-6).toUpperCase());
              }}
            >
              <Text style={styles.saveBtnText}>Send Receipt via WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Personal Details Modal */}
      <Modal visible={showProfileModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personal Details</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Ionicons name="close" size={24} color={Colors.gray} />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.input} value={userData?.name} editable={false} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput style={styles.input} value={userData?.email} editable={false} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput style={styles.input} value={riderProfile?.phone || 'Not provided'} editable={false} />
            </View>
            <Text style={styles.noteText}>Note: Contact support to change your profile information.</Text>
            <TouchableOpacity 
              style={[styles.saveBtn, { marginTop: 20 }]} 
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={styles.saveBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color={Colors.gray} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingDesc}>Get order alerts</Text>
              </View>
              <Switch value={true} trackColor={{ false: '#D1D5DB', true: Colors.primary }} />
            </View>

            <View style={styles.settingItem}>
              <View>
                <Text style={styles.settingLabel}>Order Auto-Accept</Text>
                <Text style={styles.settingDesc}>Automatically accept nearby orders</Text>
              </View>
              <Switch value={false} trackColor={{ false: '#D1D5DB', true: Colors.primary }} />
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { marginTop: 20 }]} 
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.saveBtnText}>Save Settings</Text>
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
  suspensionBanner: {
    backgroundColor: '#EF4444',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  suspensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  suspensionTitle: {
    color: '#fff',
    fontSize: 16,
    fontBold: 'bold',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  suspensionReason: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  suspensionDate: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  suspensionContact: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
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
  directionsButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
  manageBtnLarge: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    marginTop: 15,
    padding: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  manageBtnContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeOrderMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  detailsBtnSmall: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailsBtnSmallText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  manageBtnTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manageBtnSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  manageBtnIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 4,
    marginBottom: 15,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabToggleBtnActive: {
    backgroundColor: '#fff',
  },
  tabToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  tabToggleTextActive: {
    color: Colors.primary,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  earningsSubRow: {
    flexDirection: 'row',
    marginTop: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 15,
  },
  earningSubBox: {
    flex: 1,
    alignItems: 'center',
  },
  earningSubLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  earningSubValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  dividerVertical: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
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
  walletIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  balanceBadgeText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
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
    fontSize: 14,
    color: Colors.gray,
    marginTop: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  distanceText: {
    fontSize: 11,
    color: Colors.gray,
    marginLeft: 4,
  },
  earningBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  earningText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 15,
  },
  addressInfo: {
    gap: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginRight: 10,
  },
  addressText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  detailsBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalFullContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeaderFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitleFull: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalScroll: {
    padding: 20,
  },
  policyHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 20,
    marginBottom: 10,
  },
  policyText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modernPopupContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: height * 0.85,
  },
  modernPopupContent: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  popupMainTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    textTransform: 'uppercase',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#22C55E',
    letterSpacing: 1,
  },
  timerBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F97316',
  },
  earningsHighlight: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  earningsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  earningsIconBg: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.gray,
    letterSpacing: 0.5,
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  popupScroll: {
    maxHeight: height * 0.4,
  },
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completionModal: {
    backgroundColor: '#fff',
    borderRadius: 30,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  completionHeader: {
    padding: 30,
    alignItems: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 4,
    borderColor: '#fff',
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 5,
  },
  completionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  completionBody: {
    padding: 25,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  completionCloseBtn: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 25,
  },
  completionCloseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  popupInfoSection: {
    gap: 16,
  },
  popupInfoRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.gray,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 20,
  },
  infoSubtitle: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
  distanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  collectAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 6,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  itemTag: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  itemTagText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  popupActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  declineBtn: {
    flex: 1,
    height: 64,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  acceptBtn: {
    flex: 2,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  popupContent: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 25,
    width: '100%',
    alignItems: 'center',
  },
  popupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },
  popupSubtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 20,
  },
  popupDetails: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
  },
  popupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  popupDetailText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  popupActionBtn: {
    backgroundColor: Colors.primary,
    width: '100%',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  popupActionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  popupCloseBtn: {
    paddingVertical: 10,
  },
  popupCloseBtnText: {
    color: Colors.gray,
    fontSize: 14,
    fontWeight: '500',
  },
  depositInfoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 10,
  },
  accountCard: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 12,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  accountNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginVertical: 4,
  },
  accountHolder: {
    fontSize: 12,
    color: Colors.gray,
  },
  noteText: {
    fontSize: 12,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
});