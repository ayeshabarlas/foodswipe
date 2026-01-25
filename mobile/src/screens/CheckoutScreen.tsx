import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  Platform,
  Image,
  KeyboardAvoidingView,
  FlatList,
  Modal
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useCart } from '../context/CartContext';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';
import ConfettiCannon from 'react-native-confetti-cannon';
import NetInfo from '@react-native-community/netinfo';
import { queueOfflineAction } from '../utils/cache';
import PhoneVerificationModal from '../components/PhoneVerificationModal';

const { width, height } = Dimensions.get('window');

// Google Maps API Key - Try to get from config first
const GOOGLE_MAPS_API_KEY = 
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 
  Constants.expoConfig?.ios?.config?.googleMapsApiKey;

const CheckoutScreen = ({ navigation }: any) => {
  const { cart, totalAmount, clearCart, appliedVoucher, setAppliedVoucher, discountAmount, finalTotal: cartFinalTotal } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'jazzcash' | 'easypaisa'>('cod');
  
  // Address States
  const [address, setAddress] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [cutlery, setCutlery] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [city, setCity] = useState('Lahore');
  const [sessionToken, setSessionToken] = useState('');
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 31.5204,
    longitude: 74.3587,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Voucher States
  const [promoCode, setPromoCode] = useState('');
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  // Order Success States
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [isQueuedOffline, setIsQueuedOffline] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  // Settings & Fees
  const [settings, setSettings] = useState<any>(null);
  const [deliveryFee, setDeliveryFee] = useState(40);
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
    loadSavedAddress();
    if (cart.length > 0) {
      fetchRestaurantDetails();
    }
    // Generate session token for Google Maps
    setSessionToken(Math.random().toString(36).substring(2, 15));
  }, []);

  const loadSavedAddress = async () => {
    try {
      const savedAddress = await SecureStore.getItemAsync('user_address');
      const savedLocation = await SecureStore.getItemAsync('user_location');
      if (savedAddress) setAddress(savedAddress);
      if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        setDeliveryLocation(loc);
        setMapRegion({
          ...mapRegion,
          latitude: loc.lat,
          longitude: loc.lng
        });
        updateDeliveryFee(loc);
      }
    } catch (err) {
      console.error('Error loading saved address:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchRestaurantDetails = async () => {
    try {
      const res = await apiClient.get(`/restaurants/${cart[0].restaurantId}`);
      setRestaurant(res.data);
    } catch (err) {
      console.error('Error fetching restaurant details:', err);
    }
  };

  // Google Maps Address Search
  const handleAddressSearch = async (val: string) => {
    setAddress(val);
    if (deliveryLocation) {
      setDeliveryLocation(null);
    }

    // Debounce search
    if ((global as any).addressSearchTimeout) {
      clearTimeout((global as any).addressSearchTimeout);
    }

    if (val.length > 2) {
      setLoadingAddress(true);
      setShowSuggestions(true);
      
      (global as any).addressSearchTimeout = setTimeout(async () => {
        try {
          const apiKey = settings?.googleMapsApiKey || GOOGLE_MAPS_API_KEY;
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(val)}&key=${apiKey}&components=country:pk&location=31.5204,74.3587&radius=50000&sessiontoken=${sessionToken}`
          );
          const data = await response.json();
          
          if (data.status === 'OK') {
            const formatted = data.predictions.map((p: any) => ({
              description: p.description,
              placeId: p.place_id,
              mainText: p.structured_formatting.main_text,
              secondaryText: p.structured_formatting.secondary_text
            }));
            setSuggestions(formatted);
          } else {
            // Fallback to Photon
            await fetchPhotonSuggestions(val);
          }
        } catch (err) {
          console.error('Address search error:', err);
          await fetchPhotonSuggestions(val);
        } finally {
          setLoadingAddress(false);
        }
      }, 300);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setLoadingAddress(false);
    }
  };

  const handleAddressBlur = async () => {
    // Small delay to allow suggestion click
    setTimeout(async () => {
      setShowSuggestions(false);
      if (address.length > 5 && !deliveryLocation) {
        setLoadingAddress(true);
        try {
          const response = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}, Pakistan&limit=1&lat=31.5204&lon=74.3587`
          );
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const loc = {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0]
            };
            setDeliveryLocation(loc);
            updateDeliveryFee(loc);
          }
        } catch (err) {
          console.error('Manual geocode error:', err);
        } finally {
          setLoadingAddress(false);
        }
      }
    }, 200);
  };

  const fetchPhotonSuggestions = async (val: string) => {
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&lat=31.5204&lon=74.3587&limit=5`
      );
      const data = await response.json();
      if (data.features) {
        const formatted = data.features.map((f: any) => ({
          description: f.properties.name + (f.properties.city ? `, ${f.properties.city}` : ''),
          mainText: f.properties.name,
          secondaryText: f.properties.city || f.properties.country,
          location: {
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0]
          }
        }));
        setSuggestions(formatted);
      }
    } catch (err) {
      console.error('Photon search error:', err);
    }
  };

  const handleSelectAddress = async (item: any) => {
    setAddress(item.description);
    setShowSuggestions(false);
    
    // Save to SecureStore for future use
    await SecureStore.setItemAsync('user_address', item.description);
    
    if (item.location) {
      setDeliveryLocation(item.location);
      updateDeliveryFee(item.location);
      await SecureStore.setItemAsync('user_location', JSON.stringify(item.location));
      // Update map region if map is used
      setMapRegion({
        latitude: item.location.lat,
        longitude: item.location.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    } else if (item.placeId) {
      try {
        const apiKey = settings?.googleMapsApiKey || GOOGLE_MAPS_API_KEY;
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.placeId}&key=${apiKey}`
        );
        const data = await response.json();
        if (data.status === 'OK') {
          const loc = data.result.geometry.location;
          const newLoc = { lat: loc.lat, lng: loc.lng };
          setDeliveryLocation(newLoc);
          updateDeliveryFee(newLoc);
          await SecureStore.setItemAsync('user_location', JSON.stringify(newLoc));
          
          setMapRegion({
            latitude: loc.lat,
            longitude: loc.lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });

          // Try to find city from address components
          const cityComp = data.result.address_components.find((c: any) => 
            c.types.includes('locality') || c.types.includes('administrative_area_level_2')
          );
          if (cityComp) setCity(cityComp.long_name);
        }
      } catch (err) {
        console.error('Place details error:', err);
      }
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to pick your address on map.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setMapRegion(newRegion);
      const newLoc = { lat: location.coords.latitude, lng: location.coords.longitude };
      setDeliveryLocation(newLoc);
      setIsMapVisible(true);
      
      // Save to SecureStore
      await SecureStore.setItemAsync('user_location', JSON.stringify(newLoc));
      
      // Reverse geocode
      reverseGeocode(location.coords.latitude, location.coords.longitude);
    } catch (err) {
      console.error('Error getting location:', err);
      Alert.alert('Error', 'Could not get your current location.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const apiKey = settings?.googleMapsApiKey || GOOGLE_MAPS_API_KEY;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const addr = data.results[0].formatted_address;
        setAddress(addr);
        updateDeliveryFee({ lat, lng });
        await SecureStore.setItemAsync('user_address', addr);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  };

  const handleMapPress = async (e: any) => {
    const coords = e.nativeEvent.coordinate;
    const newLoc = { lat: coords.latitude, lng: coords.longitude };
    setDeliveryLocation(newLoc);
    setMapRegion({
      ...mapRegion,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    await SecureStore.setItemAsync('user_location', JSON.stringify(newLoc));
    reverseGeocode(coords.latitude, coords.longitude);
  };

  const updateDeliveryFee = (custLoc: { lat: number, lng: number }) => {
    if (!restaurant || !restaurant.location?.coordinates) {
      setDeliveryFee(settings?.deliveryFeeBase || 40);
      return;
    }

    const restLoc = {
      lat: restaurant.location.coordinates[1],
      lng: restaurant.location.coordinates[0]
    };

    const dist = calculateDistance(restLoc.lat, restLoc.lng, custLoc.lat, custLoc.lng);
    
    const base = settings?.deliveryFeeBase || 40;
    const perKm = settings?.deliveryFeePerKm || 20;
    const max = settings?.deliveryFeeMax || 200;
    
    let fee = base + (dist * perKm);
    fee = Math.min(fee, max);
    setDeliveryFee(Math.round(fee));
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setVoucherError('Please enter a promo code');
      return;
    }
    
    // Webapp alignment: Check if voucher already applied
    if (appliedVoucher && appliedVoucher.code === promoCode.toUpperCase()) {
      setVoucherError('This promo code is already applied');
      return;
    }

    setApplyingVoucher(true);
    setVoucherError('');
    try {
      const response = await apiClient.post('/vouchers/verify', {
        code: promoCode.toUpperCase(),
        amount: totalAmount,
        restaurantId: cart[0]?.restaurantId // Webapp sends restaurantId for specific vouchers
      });
      if (response.data.valid) {
        setAppliedVoucher(response.data.voucher);
        setVoucherError('');
        
        // Calculate dynamic discount for the alert
        let displayDiscount = response.data.voucher.discount;
        if (response.data.voucher.type === 'percentage') {
          displayDiscount = (totalAmount * response.data.voucher.discount) / 100;
        }
        
        Alert.alert('Success', `Promo code applied! You saved Rs. ${Math.round(displayDiscount)}`);
      }
    } catch (error: any) {
      setVoucherError(error.response?.data?.message || 'Invalid promo code');
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setPromoCode('');
    setVoucherError('');
  };

  const isTaxEnabled = settings?.isTaxEnabled === true;
  const taxRate = isTaxEnabled ? (settings?.taxRate || 8) : 0;
  const tax = Math.round(totalAmount * (taxRate / 100));
  const serviceFee = settings?.serviceFee || 0;
  
  // Calculate voucher discount using context values
  const voucherDiscount = discountAmount;
  const finalTotal = Math.max(0, cartFinalTotal + deliveryFee + tax + serviceFee);

  const minOrderAmount = settings?.minimumOrderAmount || 0;
  const isBelowMinimum = totalAmount < minOrderAmount;

  const availablePaymentMethods = [
    { id: 'card', label: 'Credit/Debit Card', sub: 'Secure via Safepay', icon: 'card-outline', enabled: settings?.featureToggles?.enableSafepay !== false },
    { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when you receive', icon: 'cash-outline', enabled: settings?.featureToggles?.enableCOD !== false },
    { id: 'jazzcash', label: 'JazzCash', sub: 'Secure via Safepay', icon: 'wallet-outline', enabled: settings?.featureToggles?.enableJazzCash !== false },
    { id: 'easypaisa', label: 'EasyPaisa', sub: 'Secure via Safepay', icon: 'phone-portrait-outline', enabled: settings?.featureToggles?.enableEasyPaisa !== false },
  ].filter(m => m.enabled);

  useEffect(() => {
    if (settings && availablePaymentMethods.length > 0) {
      const currentMethodEnabled = availablePaymentMethods.some(m => m.id === paymentMethod);
      if (!currentMethodEnabled) {
        setPaymentMethod(availablePaymentMethods[0].id as any);
      }
    }
  }, [settings]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to your cart before checking out.');
      return;
    }

    if (!address || !houseNumber) {
      Alert.alert('Missing Information', 'Please provide your delivery address and house/flat number.');
      return;
    }

    try {
      setLoading(true);
      const netInfo = await NetInfo.fetch();
      
      const userData = await SecureStore.getItemAsync('user_data');
      if (!userData) {
        Alert.alert('Login Required', 'Please login to place an order.');
        navigation.navigate('Login');
        return;
      }

      const user = JSON.parse(userData);
      const isVerified = user.is_phone_verified === true || user.phoneVerified === true;
      
      if (!isVerified) {
        setShowPhoneVerification(true);
        setLoading(false);
        return;
      }

      const orderData = {
        items: cart.map(item => ({
          dish: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          variant: item.variant,
          drinks: item.drinks,
          image: item.imageUrl
        })),
        restaurant: cart[0].restaurantId,
        subtotal: totalAmount,
        deliveryFee: deliveryFee,
        tax: tax,
        serviceFee: serviceFee,
        discount: voucherDiscount,
        totalAmount: finalTotal,
        deliveryAddress: `${houseNumber}, ${address}`,
        deliveryInstructions: instructions,
        deliveryLocation: deliveryLocation || {
          lat: 31.5204, // Placeholder for Lahore
          lng: 74.3587
        },
        city: city || 'Lahore',
        cutlery: cutlery,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Awaiting Payment'
      };

      if (!netInfo.isConnected) {
        if (paymentMethod !== 'cod') {
          Alert.alert(
            'Offline', 
            'Digital payments require an active internet connection. Please use Cash on Delivery to place an order offline.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }

        // Queue order for later
        await queueOfflineAction({
          type: 'PLACE_ORDER',
          payload: orderData,
          endpoint: '/orders',
          method: 'POST'
        });

        setIsQueuedOffline(true);
        clearCart();
        return;
      }

      const response = await apiClient.post('/orders', orderData);
      
      // Background Address Sync (matches webapp)
      try {
        const userDataStr = await SecureStore.getItemAsync('user_data');
        if (userDataStr) {
          const currentUser = JSON.parse(userDataStr);
          if (currentUser.address !== address || currentUser.houseNumber !== houseNumber) {
            // Update local storage
            const updatedUser = { 
              ...currentUser, 
              address: address,
              houseNumber: houseNumber 
            };
            await SecureStore.setItemAsync('user_data', JSON.stringify(updatedUser));

            // Update backend - non-blocking
            apiClient.put('/auth/profile', { 
              address: address,
              houseNumber: houseNumber 
            }).catch(err => console.error('Background address sync failed:', err));
          }
        }
      } catch (err) {
        console.error('Failed to initiate background address sync:', err);
      }
      
      if (paymentMethod === 'cod') {
        setPlacedOrder(response.data);
        setOrderSuccess(true);
        clearCart();
      } else {
        // Handle Digital Payment (Safepay)
        const paymentRes = await apiClient.post(`/payments/safepay/checkout`, {
          orderId: response.data._id,
          method: paymentMethod
        });
        
        if (paymentRes.data.url) {
          setCheckoutUrl(paymentRes.data.url);
        } else {
          Alert.alert('Payment Error', 'Could not initiate digital payment. Please try COD.');
        }
      }
    } catch (error: any) {
      console.error('Order Error:', error);
      Alert.alert('Order Failed', error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess || isQueuedOffline) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} />
        <View style={styles.successContent}>
          <View style={styles.successIconWrapper}>
            <View style={[styles.successIconBg, { backgroundColor: isQueuedOffline ? Colors.primary : "#4CAF50" }]}>
              <Ionicons 
                name={isQueuedOffline ? "cloud-upload" : "checkmark"} 
                size={40} 
                color="#fff" 
              />
            </View>
          </View>
          
          <Text style={styles.successTitle}>
            {isQueuedOffline ? 'Order Queued Offline' : 'Order Placed Successfully!'}
          </Text>
          <Text style={styles.successSubtitle}>
            {isQueuedOffline 
              ? "You're currently offline. Your order will be placed automatically as soon as you're back online."
              : "Your delicious food is being prepared"
            }
          </Text>
          
          <View style={styles.orderSummaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryIconText}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="wallet-outline" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.summaryLabel}>Order Number</Text>
              </View>
              <Text style={styles.summaryValue}>
                #{isQueuedOffline ? 'QUEUED' : (placedOrder?._id?.slice(-6).toUpperCase() || '8703')}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryIconText}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="time-outline" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.summaryLabel}>Estimated Time</Text>
              </View>
              <Text style={styles.summaryValue}>25-35 min</Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryIconText}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="location-outline" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.summaryLabel}>Delivery to</Text>
              </View>
              <Text style={styles.summaryValue} numberOfLines={1}>
                {houseNumber}, {address.split(',')[0]}
              </Text>
            </View>
          </View>

          {/* Simple Progress Steps (Mobile Version) */}
          {!isQueuedOffline && (
            <View style={styles.progressStepsContainer}>
              <View style={styles.stepItem}>
                <View style={[styles.stepIcon, styles.stepIconActive]}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </View>
                <Text style={styles.stepTextActive}>Confirmed</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.stepItem}>
                <View style={styles.stepIcon}>
                  <Ionicons name="restaurant-outline" size={20} color="#999" />
                </View>
                <Text style={styles.stepText}>Preparing</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.stepItem}>
                <View style={styles.stepIcon}>
                  <Ionicons name="bicycle-outline" size={20} color="#999" />
                </View>
                <Text style={styles.stepText}>Delivered</Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={styles.trackOrderBtn}
            onPress={() => navigation.navigate('CustomerDashboard')}
          >
            <Text style={styles.trackOrderBtnText}>
              {isQueuedOffline ? 'Go to Dashboard' : 'Track Your Order'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backHomeBtn}
            onPress={() => navigation.navigate('VideoFeed')}
          >
            <Ionicons name="home-outline" size={20} color="#666" />
            <Text style={styles.backHomeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (checkoutUrl) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.webviewHeader}>
          <TouchableOpacity onPress={() => setCheckoutUrl(null)}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.webviewTitle}>Secure Payment</Text>
          <View style={{ width: 24 }} />
        </View>
        <WebView 
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={(navState) => {
            if (navState.url.includes('payment-success')) {
              setOrderSuccess(true);
              setCheckoutUrl(null);
              clearCart();
            } else if (navState.url.includes('payment-cancel')) {
              setCheckoutUrl(null);
              Alert.alert('Payment Cancelled', 'Your payment was cancelled.');
            }
          }}
        />
      </SafeAreaView>
    );
  }

  const handlePhoneVerificationSuccess = async (phoneNumber: string) => {
    try {
      const userDataStr = await SecureStore.getItemAsync('user_data');
      if (userDataStr) {
        const user = JSON.parse(userDataStr);
        const updatedUser = { ...user, phoneNumber, phoneVerified: true, is_phone_verified: true };
        await SecureStore.setItemAsync('user_data', JSON.stringify(updatedUser));
      }
      // Retry placing the order automatically after verification
      handlePlaceOrder();
    } catch (err) {
      console.error('Error updating user data after verification:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map Picker Modal */}
      <Modal
        visible={isMapVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsMapVisible(false)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.mapHeader}>
            <TouchableOpacity 
              style={styles.mapCloseBtn}
              onPress={() => setIsMapVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>Select Delivery Location</Text>
            <TouchableOpacity 
              style={styles.mapDoneBtn}
              onPress={() => setIsMapVisible(false)}
            >
              <Text style={styles.mapDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <MapView
              style={{ flex: 1 }}
              region={mapRegion}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {deliveryLocation && (
                <Marker
                  coordinate={{
                    latitude: deliveryLocation.lat,
                    longitude: deliveryLocation.lng,
                  }}
                  title="Delivery Here"
                />
              )}
            </MapView>
            
            {/* Address Overlay */}
            <View style={styles.addressOverlay}>
              <View style={styles.addressBox}>
                <Ionicons name="location" size={20} color={Colors.primary} />
                <Text style={styles.addressBoxText} numberOfLines={2}>
                  {address || 'Locating...'}
                </Text>
              </View>
              <Text style={styles.mapTip}>Tap on map to change location</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Delivery Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>House / Flat / Office Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Apartment 4B, Street 5"
                value={houseNumber}
                onChangeText={setHouseNumber}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Delivery Address</Text>
                <TouchableOpacity 
                  style={styles.mapLink} 
                  onPress={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="map-outline" size={14} color={Colors.primary} />
                      <Text style={styles.mapLinkText}>Pick on Map</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.searchContainer}>
                <Ionicons name="location" size={20} color={Colors.primary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for area, landmark, or street..."
                  value={address}
                  onChangeText={handleAddressSearch}
                  onBlur={handleAddressBlur}
                />
                {loadingAddress && <ActivityIndicator size="small" color={Colors.primary} />}
              </View>

              {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectAddress(item)}
                    >
                      <Ionicons name="location-outline" size={18} color="#999" />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionMainText} numberOfLines={1}>{item.mainText}</Text>
                        <Text style={styles.suggestionSubText} numberOfLines={1}>{item.secondaryText}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Cutlery Toggle */}
            <TouchableOpacity 
              style={styles.cutleryToggle}
              onPress={() => setCutlery(!cutlery)}
            >
              <View style={styles.cutleryIconContainer}>
                <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.cutleryTextContainer}>
                <Text style={styles.cutleryTitle}>Add Cutlery</Text>
                <Text style={styles.cutlerySubtitle}>Help us reduce waste, only ask for cutlery if you need it.</Text>
              </View>
              <View style={[styles.checkbox, cutlery && styles.checkboxActive]}>
                {cutlery && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Delivery Instructions (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="e.g. Ring the bell, don't call"
                multiline
                value={instructions}
                onChangeText={setInstructions}
              />
            </View>
          </View>

          {/* Payment Method Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentList}>
              {availablePaymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.paymentOption,
                    paymentMethod === method.id && styles.paymentOptionActive
                  ]}
                  onPress={() => setPaymentMethod(method.id as any)}
                >
                  <View style={styles.paymentOptionLeft}>
                    <View style={[
                      styles.paymentIconContainer,
                      paymentMethod === method.id && styles.paymentIconContainerActive
                    ]}>
                      <Ionicons 
                        name={method.icon as any} 
                        size={22} 
                        color={paymentMethod === method.id ? '#fff' : '#666'} 
                      />
                    </View>
                    <View>
                      <Text style={[
                        styles.paymentMethodLabel,
                        paymentMethod === method.id && styles.paymentMethodLabelActive
                      ]}>
                        {method.label}
                      </Text>
                      <Text style={styles.paymentMethodSub}>
                        {method.sub}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.radioCircle,
                    paymentMethod === method.id && styles.radioCircleActive
                  ]}>
                    {paymentMethod === method.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Promo Code Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Promo Code</Text>
            <View style={styles.promoContainer}>
              <TextInput
                style={[styles.promoInput, appliedVoucher && styles.appliedPromoInput]}
                placeholder="Enter promo code"
                value={promoCode}
                onChangeText={(text) => {
                  setPromoCode(text);
                  setVoucherError('');
                }}
                autoCapitalize="characters"
                editable={!appliedVoucher}
              />
              <TouchableOpacity 
                style={[
                  styles.promoBtn, 
                  (!promoCode || applyingVoucher) && styles.disabledPromoBtn,
                  appliedVoucher && styles.removePromoBtn
                ]}
                onPress={() => appliedVoucher ? handleRemoveVoucher() : handleApplyPromoCode()}
                disabled={!promoCode || applyingVoucher}
              >
                {applyingVoucher ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.promoBtnText}>{appliedVoucher ? 'Remove' : 'Apply'}</Text>
                )}
              </TouchableOpacity>
            </View>
            {voucherError ? <Text style={styles.errorText}>{voucherError}</Text> : null}
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            {cart.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
                  {item.variant && <Text style={styles.itemSubText}>Size: {item.variant.name}</Text>}
                  {item.drinks && item.drinks.length > 0 && (
                    <Text style={styles.itemSubText}>Drinks: {item.drinks.map((d: any) => d.name).join(', ')}</Text>
                  )}
                </View>
                <Text style={styles.itemPrice}>Rs. {item.price * item.quantity}</Text>
              </View>
            ))}
            
            <View style={styles.divider} />
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>Rs. {totalAmount}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee</Text>
              <Text style={styles.priceValue}>Rs. {deliveryFee}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Service Fee</Text>
              <Text style={styles.priceValue}>Rs. {serviceFee}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Tax ({taxRate}%)</Text>
              <Text style={styles.priceValue}>Rs. {tax}</Text>
            </View>
            {appliedVoucher && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: '#4CAF50' }]}>Voucher Discount</Text>
                <Text style={[styles.priceValue, { color: '#4CAF50' }]}>-Rs. {Math.round(voucherDiscount)}</Text>
              </View>
            )}
            <View style={[styles.priceRow, { marginTop: 10 }]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rs. {finalTotal}</Text>
            </View>
            {appliedVoucher && (
            <View style={styles.successPromoBox}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.successPromoText}>
                Code {appliedVoucher.code} applied! -Rs. {Math.round(voucherDiscount)}
              </Text>
            </View>
          )}

          {isBelowMinimum && (
            <View style={styles.minOrderWarning}>
              <Ionicons name="warning-outline" size={20} color="#FF5252" />
              <Text style={styles.minOrderWarningText}>
                Minimum order amount is Rs. {minOrderAmount.toLocaleString()}. 
                Add Rs. {(minOrderAmount - totalAmount).toLocaleString()} more to checkout.
              </Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[
            styles.placeOrderBtn, 
            (loading || isBelowMinimum) && styles.disabledBtn
          ]}
          onPress={handlePlaceOrder}
          disabled={loading || isBelowMinimum}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>
                {isBelowMinimum ? 'Below Minimum Amount' : 'Place Order'}
              </Text>
              {!isBelowMinimum && <Text style={styles.placeOrderPrice}>Rs. {finalTotal}</Text>}
            </>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      <PhoneVerificationModal 
        isVisible={showPhoneVerification}
        onClose={() => setShowPhoneVerification(false)}
        onSuccess={handlePhoneVerificationSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapLinkText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  mapCloseBtn: {
    padding: 4,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mapDoneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  mapDoneText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addressOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  addressBoxText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  mapTip: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#eee',
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  suggestionTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  suggestionSubText: {
    fontSize: 12,
    color: '#999',
  },
  promoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  appliedPromoInput: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0f9f0',
  },
  promoBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  disabledPromoBtn: {
    backgroundColor: '#ccc',
  },
  removePromoBtn: {
    backgroundColor: '#FF5252',
  },
  promoBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  successPromoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  successPromoText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  minOrderWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#FFEBEB',
  },
  minOrderWarningText: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemSubText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  paymentOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,106,0,0.05)',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  paymentIconContainerActive: {
    backgroundColor: Colors.primary,
  },
  paymentMethodLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  paymentMethodLabelActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  paymentMethodSub: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  cutleryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cutleryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cutleryTextContainer: {
    flex: 1,
  },
  cutleryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  cutlerySubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  placeOrderBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 15,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  placeOrderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  placeOrderPrice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  orderSummaryBox: {
    backgroundColor: '#f9f9f9',
    width: '100%',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
  },
  trackBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  trackBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successIconWrapper: {
    marginBottom: 25,
  },
  successIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  orderSummaryCard: {
    backgroundColor: 'rgba(255,106,0,0.05)',
    width: '100%',
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.1)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryIconText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  progressStepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: '100%',
  },
  stepItem: {
    alignItems: 'center',
    width: 70,
  },
  stepIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIconActive: {
    backgroundColor: '#4CAF50',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#eee',
    marginBottom: 25,
    marginHorizontal: -5,
  },
  stepText: {
    fontSize: 11,
    color: '#999',
  },
  stepTextActive: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  trackOrderBtn: {
    backgroundColor: Colors.primary,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  trackOrderBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  backHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  backHomeBtnText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  webviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  webviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  minOrderWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  minOrderText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
});

export default CheckoutScreen;