import React, { useEffect, useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
  Modal,
  Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../api/apiClient';
import { Video } from 'expo-av';
import { getMediaUrl } from '../utils/config';
import { subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import { getCache, setCache } from '../utils/cache';
import MapView, { Marker } from 'react-native-maps';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import LocationAccessModal from '../components/LocationAccessModal';
import { calculateDistance, formatDistance } from '../utils/location';

const { width, height } = Dimensions.get('window');

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 
  Constants.expoConfig?.ios?.config?.googleMapsApiKey;

export default function CustomerDashboard({ navigation }: any) {
  const [userData, setUserData] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [featuredVideo, setFeaturedVideo] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  // Address States
  const [address, setAddress] = useState('Current Location');
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 31.5204,
    longitude: 74.3587,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // Address Search States
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [restaurantSuggestions, setRestaurantSuggestions] = useState<any[]>([]);
  const [showRestaurantSuggestions, setShowRestaurantSuggestions] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);

  const categories = ['All', 'Pizza', 'Burger', 'Asian', 'Desi', 'Italian', 'Fast Food', 'Dessert', 'Healthy'];

  useEffect(() => {
    loadUserData();
    fetchRestaurants();
    fetchFeaturedVideo();
    fetchActiveOrders();
    loadSavedAddress();
    fetchSettings();
    fetchVouchers();
    checkLocationPermission();
    setSessionToken(Math.random().toString(36).substring(2, 15));

    // Subscribe to restaurant updates
    const restChannel = subscribeToChannel('restaurants');
    if (restChannel) {
      restChannel.bind('restaurantUpdate', () => {
        fetchRestaurants();
      });
      restChannel.bind('newRestaurant', () => {
        fetchRestaurants();
      });
    }

    // Subscribe to public channel for vouchers
    const publicChannel = subscribeToChannel('public');
    if (publicChannel) {
      publicChannel.bind('new_voucher', (data: any) => {
        console.log('🎁 New voucher received via socket:', data);
        fetchVouchers();
      });
    }

    return () => {
      unsubscribeFromChannel('restaurants');
      unsubscribeFromChannel('public');
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSavedAddress();
    }, [])
  );

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

  const fetchVouchers = async () => {
    try {
      const res = await apiClient.get('/vouchers');
      setVouchers(res.data || []);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const hasSeenModal = await SecureStore.getItemAsync('has_seen_location_modal');
        if (!hasSeenModal) {
          setShowLocationModal(true);
        }
      } else {
        // Already granted, get current location
        getCurrentLocation();
      }
    } catch (err) {
      console.error('Error checking location permission:', err);
    }
  };

  const handleAllowLocation = async () => {
    setShowLocationModal(false);
    await SecureStore.setItemAsync('has_seen_location_modal', 'true');
    getCurrentLocation();
  };

  const handleSkipLocation = async () => {
    setShowLocationModal(false);
    await SecureStore.setItemAsync('has_seen_location_modal', 'true');
  };

  const handleAddressSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length > 2) {
      setLoadingAddress(true);
      setShowSuggestions(true);
      
      if ((global as any).dashAddressSearchTimeout) {
        clearTimeout((global as any).dashAddressSearchTimeout);
      }

      (global as any).dashAddressSearchTimeout = setTimeout(async () => {
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
          }
        } catch (err) {
          console.error('Address search error:', err);
        } finally {
          setLoadingAddress(false);
        }
      }, 300);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleSelectAddress = async (item: any) => {
    setAddress(item.description);
    setSearchQuery('');
    setShowSuggestions(false);
    
    if (item.placeId) {
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
          setMapRegion({
            ...mapRegion,
            latitude: loc.lat,
            longitude: loc.lng,
          });
          await SecureStore.setItemAsync('user_address', item.description);
          await SecureStore.setItemAsync('user_location', JSON.stringify(newLoc));
        }
      } catch (err) {
        console.error('Place details error:', err);
      }
    }
  };

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const loc = { lat: latitude, lng: longitude };
    setDeliveryLocation(loc);
    reverseGeocode(latitude, longitude);
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
        await SecureStore.setItemAsync('user_address', addr);
        await SecureStore.setItemAsync('user_location', JSON.stringify({ lat, lng }));
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to find your address');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const loc = { lat: location.coords.latitude, lng: location.coords.longitude };
      setDeliveryLocation(loc);
      setUserCoords(loc);
      setMapRegion({
        ...mapRegion,
        latitude: loc.lat,
        longitude: loc.lng,
      });
      reverseGeocode(loc.lat, loc.lng);
    } catch (err) {
      console.error('Get location error:', err);
    } finally {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    if (userData?.id) {
      const userChannel = subscribeToChannel(`user-${userData.id}`);
      if (userChannel) {
        userChannel.bind('orderStatusUpdate', (data: any) => {
          console.log('📦 Order status updated via socket:', data.status);
          fetchActiveOrders();
          const orderId = data._id || data.orderId;
          if (orderId) {
            Alert.alert('Order Update', `Your order #${orderId.slice(-6).toUpperCase()} is now ${data.status}`);
          }
        });

        userChannel.bind('newOrder', () => {
          fetchActiveOrders();
        });
      }

      return () => {
        unsubscribeFromChannel(`user-${userData.id}`);
      };
    }
  }, [userData]);

  const loadUserData = async () => {
    try {
      const data = await SecureStore.getItemAsync('user_data');
      if (data) setUserData(JSON.parse(data));
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const res = await apiClient.get('/orders/my-orders');
      const active = res.data.filter((o: any) => 
        !['Delivered', 'Cancelled'].includes(o.status)
      );
      setActiveOrders(active);
    } catch (err) {
      console.log('Error fetching active orders:', err);
    }
  };

  const fetchRestaurants = async (search = '', category = 'All') => {
    try {
      setLoading(true);
      
      // If we're filtering by category, search takes priority if present
      const queryParam = search || (category !== 'All' ? category : '');
      
      // Only use cache if no search/category query
      if (!queryParam) {
        const cached = await getCache('restaurants');
        if (cached) setRestaurants(cached);
      }

      const res = await apiClient.get(`/restaurants?search=${encodeURIComponent(queryParam)}`);
      const restaurantsData = res.data.restaurants || [];
      const activeRestaurants = restaurantsData.filter((r: any) => 
        r.verificationStatus === 'approved' && r.isActive !== false
      );
      
      setRestaurants(activeRestaurants);
      if (!queryParam) {
        await setCache('restaurants', activeRestaurants);
      }
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (restaurantSearch !== undefined) {
        // When searching, we reset the active category to 'All' unless search is empty
        if (restaurantSearch.trim()) {
          setActiveCategory('All');
          setShowRestaurantSuggestions(true);
          // Fetch suggestions (limited to 5 for the dropdown)
          apiClient.get(`/restaurants?search=${encodeURIComponent(restaurantSearch)}&limit=5`)
            .then(res => {
              setRestaurantSuggestions(res.data.restaurants || []);
            })
            .catch(err => console.error('Error fetching suggestions:', err));
        } else {
          setShowRestaurantSuggestions(false);
          setRestaurantSuggestions([]);
        }
        fetchRestaurants(restaurantSearch, restaurantSearch.trim() ? 'All' : activeCategory);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [restaurantSearch]);

  const handleSuggestionPress = (item: any) => {
    setRestaurantSearch(item.name);
    setShowRestaurantSuggestions(false);
    navigation.navigate('RestaurantDetails', { restaurantId: item._id });
  };

  const fetchFeaturedVideo = async () => {
    try {
      const cached = await getCache('featured_video');
      if (cached) setFeaturedVideo(cached);

      const res = await apiClient.get('/videos/feed?limit=1');
      if (res.data && res.data.videos && res.data.videos.length > 0) {
        setFeaturedVideo(res.data.videos[0]);
        await setCache('featured_video', res.data.videos[0]);
      }
    } catch (err) {
      console.error('Error fetching featured video:', err);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setRestaurantSearch('');
    setActiveCategory('All');
    fetchRestaurants();
    fetchFeaturedVideo();
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
    navigation.replace('Home');
  };

  const getProgressWidth = (status: string) => {
    switch (status) {
      case 'Pending': return '20%';
      case 'Preparing': return '50%';
      case 'Ready for Pickup': return '70%';
      case 'Picked Up': return '85%';
      case 'Delivered': return '100%';
      default: return '10%';
    }
  };

  const renderRestaurantItem = ({ item }: { item: any }) => {
    const distance = deliveryLocation && item.location?.coordinates ? 
      calculateDistance(deliveryLocation.lat, deliveryLocation.lng, item.location.coordinates[1], item.location.coordinates[0]) : null;

    return (
      <TouchableOpacity 
        style={styles.restaurantCard}
        onPress={() => navigation.navigate('RestaurantDetails', { restaurantId: item._id })}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: getMediaUrl(item.logo) || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800' }}
            style={styles.restaurantImage}
          />
          {item.businessType === 'home-chef' && (
            <View style={styles.homeChefBadge}>
              <Ionicons name="home" size={10} color="#fff" />
              <Text style={styles.homeChefBadgeText}>Homechef</Text>
            </View>
          )}
          {distance !== null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={10} color="#fff" />
              <Text style={styles.distanceBadgeText}>{formatDistance(distance)}</Text>
            </View>
          )}
        </View>
        <View style={styles.restaurantInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>
                {item.rating && item.rating > 0 ? item.rating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>
          <View style={styles.detailsRow}>
            <Text style={styles.restaurantDetails} numberOfLines={1}>
              {item.cuisineTypes && item.cuisineTypes.length > 0 ? item.cuisineTypes[0] : (item.businessType === 'home-chef' ? 'Home Chef' : 'Restaurant')} • {item.address || 'Local'}
            </Text>
          </View>
          {/* Display promo if available */}
          {vouchers.some(v => v.restaurant === item._id || v.createdBy === 'platform') && (
            <View style={styles.promoContainer}>
              <Ionicons name="pricetag" size={12} color={Colors.primary} />
              <Text style={styles.promoText} numberOfLines={1}>
                {vouchers.find(v => v.restaurant === item._id)?.description || vouchers.find(v => v.createdBy === 'platform')?.description}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDashboardHeader = () => (
    <>
      {/* Suspension Banner */}
      {userData?.status === 'suspended' && (
        <View style={styles.suspensionBanner}>
          <View style={styles.suspensionHeader}>
            <Ionicons name="alert-circle" size={20} color="#fff" />
            <Text style={styles.suspensionTitle}>ACCOUNT SUSPENDED</Text>
          </View>
          {userData.suspensionDetails?.unsuspendAt && (
            <Text style={styles.suspensionDate}>
              Auto-unsuspend on: {new Date(userData.suspensionDetails.unsuspendAt).toLocaleDateString()}
            </Text>
          )}
          <Text style={styles.suspensionReason}>
            Reason: {userData.suspensionDetails?.reason || 'Violation of terms'}
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={[styles.searchContainer, { zIndex: 2000 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.gray} />
          <TextInput 
            placeholder="Search for restaurants, dishes..." 
            style={styles.searchInput}
            value={restaurantSearch}
            onChangeText={setRestaurantSearch}
            onFocus={() => restaurantSearch.trim() && setShowRestaurantSuggestions(true)}
          />
          {restaurantSearch.length > 0 && (
            <TouchableOpacity onPress={() => {
              setRestaurantSearch('');
              setShowRestaurantSuggestions(false);
            }}>
              <Ionicons name="close-circle" size={18} color={Colors.gray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Suggestions Dropdown */}
        {showRestaurantSuggestions && restaurantSuggestions.length > 0 && (
          <View style={styles.dashboardSuggestions}>
            {restaurantSuggestions.map((item) => (
              <TouchableOpacity 
                key={item._id} 
                style={styles.dashboardSuggestionItem}
                onPress={() => handleSuggestionPress(item)}
              >
                <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionMainText}>{item.name}</Text>
                  <Text style={styles.suggestionSubText} numberOfLines={1}>
                    {item.cuisineTypes?.join(', ') || item.businessType} • {item.address}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {categories.map((cat, i) => (
          <TouchableOpacity 
            key={i} 
            style={[styles.categoryItem, activeCategory === cat && styles.activeCategory]}
            onPress={() => {
              setActiveCategory(cat);
              setRestaurantSearch(''); // Clear search when selecting a category
              fetchRestaurants('', cat);
            }}
          >
            <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Watch & Order - Video Feed Entry */}
      <View style={styles.videoSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Watch & Order</Text>
          <TouchableOpacity onPress={() => navigation.navigate('VideoFeed')}>
            <Text style={styles.seeAll}>Full Screen</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.videoPreviewCard}
          onPress={() => navigation.navigate('VideoFeed')}
        >
          <Image 
            source={{ uri: featuredVideo ? getMediaUrl(featuredVideo.imageUrl) : 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800' }}
            style={styles.videoPreviewImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.videoGradient}
          />
          <View style={styles.playIconContainer}>
            <Ionicons name="play" size={30} color="#fff" />
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle}>{featuredVideo ? featuredVideo.name : 'Foodie Reels'}</Text>
            <Text style={styles.videoSubtitle}>{featuredVideo ? featuredVideo.restaurant?.name : 'Swipe to discover new tastes'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Vouchers & Promotions */}
      {vouchers.length > 0 && (
        <View style={styles.vouchersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Discounts & Offers</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vouchersList}>
            {vouchers.map((voucher) => (
              <TouchableOpacity 
                key={voucher._id} 
                style={styles.voucherCard}
                onPress={() => Alert.alert('Voucher Code', `Use code ${voucher.code} to get ${voucher.discount}% off!\n\n${voucher.description}`)}
              >
                <LinearGradient
                  colors={['#FF6A00', '#FF416C']}
                  style={styles.voucherGradient}
                >
                  <View style={styles.voucherLeft}>
                    <Text style={styles.voucherDiscount}>{voucher.discount}%</Text>
                    <Text style={styles.voucherOff}>OFF</Text>
                  </View>
                  <View style={styles.voucherDivider} />
                  <View style={styles.voucherRight}>
                    <Text style={styles.voucherCode}>{voucher.code}</Text>
                    <Text style={styles.voucherDesc} numberOfLines={1}>{voucher.description}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Active Orders - Real-time Status */}
      {activeOrders.length > 0 && (
        <View style={styles.activeOrdersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Track Orders</Text>
            <Text style={styles.orderCountBadge}>{activeOrders.length} Active</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeOrdersList}>
            {activeOrders.map((order) => (
              <TouchableOpacity 
                key={order._id} 
                style={styles.activeOrderCard}
                onPress={() => navigation.navigate('OrderDetails', { orderId: order._id })}
              >
                <View style={styles.orderCardHeader}>
                  <Ionicons 
                    name={order.status === 'Preparing' ? 'restaurant' : 'bicycle'} 
                    size={20} 
                    color={Colors.primary} 
                  />
                  <Text style={styles.orderStatusText}>{order.status}</Text>
                </View>
                <Text style={styles.orderRestaurantName}>{order.restaurant?.name || 'Restaurant'}</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: getProgressWidth(order.status) }]} />
                </View>
                <Text style={styles.orderIdText}>Order #{String(order._id || '').slice(-6)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured Section Header */}
      <View style={[styles.sectionHeader, { paddingHorizontal: 20, marginTop: 10 }]}>
        <Text style={styles.sectionTitle}>Featured Restaurants</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const openWhatsApp = () => {
    const phone = settings?.supportPhone || '+923295599855';
    const message = 'Hello FoodSwipe Support, I need help with...';
    const url = `whatsapp://send?phone=${phone.replace(/\+/g, '')}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/${phone.replace(/\+/g, '')}`);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <LocationAccessModal 
        isOpen={showLocationModal}
        onAllow={handleAllowLocation}
        onSkip={handleSkipLocation}
      />

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
            <View style={styles.searchBarWrapper}>
              <Ionicons name="search" size={18} color={Colors.gray} style={styles.searchIcon} />
              <TextInput
                style={styles.mapSearchInput}
                placeholder="Search delivery address..."
                value={searchQuery}
                onChangeText={handleAddressSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.gray} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              style={styles.mapDoneBtn}
              onPress={() => setIsMapVisible(false)}
            >
              <Text style={styles.mapDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.suggestionItem}
                      onPress={() => handleSelectAddress(item)}
                    >
                      <Ionicons name="location-outline" size={20} color={Colors.gray} />
                      <View style={styles.suggestionTextContainer}>
                        <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                        <Text style={styles.suggestionSubText}>{item.secondaryText}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
            
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
              <TouchableOpacity 
                style={styles.currentLocationBtn}
                onPress={getCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="locate" size={20} color={Colors.primary} />
                    <Text style={styles.currentLocationText}>Use Current Location</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.mapTip}>Tap on map to change location</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Deliver to</Text>
          <TouchableOpacity 
            style={styles.locationContainer}
            onPress={() => setIsMapVisible(true)}
          >
            <Text style={styles.locationText} numberOfLines={1}>{address}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={[styles.profileButton, { marginRight: 10 }]} onPress={() => navigation.navigate('Helpline')}>
            <Ionicons name="help-circle-outline" size={28} color={Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
            <Ionicons name="person-circle-outline" size={32} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item._id}
        renderItem={renderRestaurantItem}
        ListHeaderComponent={renderDashboardHeader()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>No restaurants found</Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
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
  },
  greeting: {
    fontSize: 14,
    color: Colors.gray,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  profileButton: {
    padding: 4,
  },
  suspensionBanner: {
    backgroundColor: '#DC2626',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  suspensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  suspensionTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  suspensionDate: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    fontWeight: '500',
  },
  suspensionReason: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.8,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  categories: {
    paddingLeft: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  categoryItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    height: 40,
  },
  activeCategory: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    fontWeight: '600',
    color: Colors.gray,
  },
  activeCategoryText: {
    color: '#fff',
  },
  videoSection: {
    marginTop: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  videoPreviewCard: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 10,
  },
  videoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  videoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 40,
    padding: 10,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 15,
    left: 15,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  videoSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  promoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    gap: 6,
  },
  promoText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  vouchersSection: {
    marginTop: 15,
    marginBottom: 10,
  },
  vouchersList: {
    paddingLeft: 20,
    marginTop: 10,
  },
  voucherCard: {
    width: 240,
    height: 80,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  voucherGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  voucherLeft: {
    alignItems: 'center',
    width: 60,
  },
  voucherDiscount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  voucherOff: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -4,
  },
  voucherDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  voucherRight: {
    flex: 1,
  },
  voucherCode: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  voucherDesc: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.9,
    marginTop: 2,
  },
  activeOrdersSection: {
    marginBottom: 20,
    paddingLeft: 20,
  },
  activeOrdersList: {
    marginTop: 10,
  },
  activeOrderCard: {
    width: width * 0.7,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 8,
  },
  orderRestaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  orderIdText: {
    fontSize: 12,
    color: Colors.gray,
  },
  orderCountBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mapCloseBtn: {
    padding: 5,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 5,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
    maxHeight: 300,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dashboardSuggestions: {
    position: 'absolute',
    top: 55, // Height of search bar + margin
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 15,
    zIndex: 3000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  dashboardSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  suggestionSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  mapDoneBtn: {
    padding: 5,
  },
  mapDoneText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  addressOverlay: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
  },
  addressBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 10,
  },
  addressBoxText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  currentLocationBtn: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 10,
  },
  currentLocationText: {
    marginLeft: 8,
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  mapTip: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  seeAll: {
    color: Colors.primary,
    fontWeight: '600',
  },
  restaurantCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    width: '100%',
  },
  restaurantImage: {
    width: '100%',
    height: '100%',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  homeChefBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  homeChefBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  restaurantInfo: {
    padding: 15,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#854D0E',
    marginLeft: 2,
  },
  restaurantDetails: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray,
    marginTop: 10,
  }
});