import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import { getMediaUrl } from '../utils/config';
import * as SecureStore from 'expo-secure-store';
import { subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';

import DishDetailsModal from '../components/DishDetailsModal';

const { width } = Dimensions.get('window');

export default function RestaurantDetails({ route, navigation }: any) {
  const { restaurantId, selectedDishId } = route.params;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [activeDish, setActiveDish] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'reviews', 'info'
  const [reviews, setReviews] = useState<any[]>([]);
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    if (!restaurantId) {
      console.log('⚠️ [RestaurantDetails] No restaurantId provided in route params');
      return;
    }

    fetchRestaurantDetails();
    fetchReviews();

    // Handle different formats of restaurantId for socket
    let cleanId = restaurantId;
    if (typeof restaurantId === 'object' && restaurantId?._id) {
      cleanId = restaurantId._id;
    }

    if (cleanId && cleanId !== 'undefined') {
      // Real-time updates for this restaurant's menu
      const channel = subscribeToChannel(`restaurant-${cleanId}`);
      if (channel) {
        channel.bind('menu_updated', (data: any) => {
          console.log('🍴 Menu updated via socket in RestaurantDetails:', data.action);
          fetchRestaurantDetails();
        });
        
        channel.bind('restaurantUpdate', (updatedRest: any) => {
          console.log('🏠 Restaurant updated via socket:', updatedRest.name);
          setRestaurant(prev => ({ ...prev, ...updatedRest }));
        });

        channel.bind('newReview', (review: any) => {
          console.log('⭐ New review received via socket');
          setReviews(prev => [review, ...prev]);
          // Update restaurant rating if included in payload
          if (review.newAverageRating) {
            setRestaurant(prev => ({ ...prev, rating: review.newAverageRating }));
          }
        });
      }

      return () => {
        unsubscribeFromChannel(`restaurant-${cleanId}`);
      };
    }
  }, [restaurantId]);

  const fetchReviews = async () => {
    try {
      let cleanId = restaurantId;
      if (typeof restaurantId === 'object' && restaurantId?._id) {
        cleanId = restaurantId._id;
      }
      
      if (!cleanId || cleanId === 'undefined') return;

      const res = await apiClient.get(`/restaurants/${cleanId}/reviews`);
      setReviews(res.data || []);
    } catch (err) {
      console.log('Error fetching reviews:', err);
    }
  };

  useEffect(() => {
    if (dishes.length > 0 && selectedDishId) {
      const dish = dishes.find(d => d._id === selectedDishId);
      if (dish) {
        setActiveDish(dish);
        setIsDetailsVisible(true);
      }
    }
  }, [dishes, selectedDishId]);

  const fetchRestaurantDetails = async () => {
    try {
      console.log('🔍 [RestaurantDetails] Fetching details for ID:', restaurantId);
      
      // Handle different formats of restaurantId
      let cleanId = restaurantId;
      if (typeof restaurantId === 'object' && restaurantId?._id) {
        cleanId = restaurantId._id;
      }
      
      if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
        console.error('❌ [RestaurantDetails] Invalid restaurantId provided:', restaurantId);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      // Fetch restaurant and dishes separately to avoid one failure blocking the other
      try {
        const restRes = await apiClient.get(`/restaurants/${cleanId}`);
        if (restRes.data) {
          setRestaurant(restRes.data);
        } else {
          setRestaurant(null);
        }
      } catch (e: any) {
        console.error(`❌ [RestaurantDetails] Error fetching restaurant ${cleanId}:`, e.message);
        setRestaurant(null);
      }

      try {
        const dishesRes = await apiClient.get(`/dishes/restaurant/${cleanId}`);
        setDishes(dishesRes.data || []);
      } catch (e: any) {
        console.error(`❌ [RestaurantDetails] Error fetching dishes for ${cleanId}:`, e.message);
        setDishes([]);
      }

      // Check if following (if logged in)
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        try {
          const userRes = await apiClient.get('/users/profile');
          const isFollowingRest = userRes.data.following?.some((f: any) => {
            const followId = typeof f === 'string' ? f : (f._id || f.id);
            return followId === cleanId;
          });
          setIsFollowing(!!isFollowingRest);
        } catch (userErr) {
          console.log('⚠️ [RestaurantDetails] Could not fetch user profile for following status');
        }
      }
    } catch (err: any) {
      console.error('🔥 [RestaurantDetails] Final fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        Alert.alert('Login Required', 'Please login to follow restaurants', [
          { text: 'Cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]);
        return;
      }

      // Ensure we use a clean ID
      let cleanId = restaurantId;
      if (typeof restaurantId === 'object' && restaurantId?._id) {
        cleanId = restaurantId._id;
      }

      const res = await apiClient.post(`/videos/restaurant/${cleanId}/follow`);
      setIsFollowing(res.data.isFollowing);
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Text>Restaurant not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: Colors.primary, marginTop: 10 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner & Header */}
        <View style={styles.header}>
          <Image 
            source={{ uri: getMediaUrl(restaurant.logo) || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800' }} 
            style={styles.banner} 
          />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{restaurant.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{restaurant.rating || '5.0'} • </Text>
                <Text style={styles.categoryText}>{restaurant.businessType || 'Restaurant'}</Text>
                <View style={[styles.statusDot, { backgroundColor: restaurant.isOpen !== false ? '#10B981' : '#EF4444', marginLeft: 10 }]} />
                <Text style={[styles.statusText, { color: restaurant.isOpen !== false ? '#10B981' : '#EF4444' }]}>
                  {restaurant.isOpen !== false ? 'Open' : 'Closed'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.followBtn, isFollowing && styles.followingBtn]} 
              onPress={toggleFollow}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.address}>{restaurant.address}</Text>
          
          {/* Real-time Analytics Bar */}
          <View style={styles.analyticsBar}>
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>{restaurant.totalOrders || '1.2k+'}</Text>
              <Text style={styles.analyticLabel}>Orders</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>{restaurant.deliveryTime || '25-35'}</Text>
              <Text style={styles.analyticLabel}>Min</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>{restaurant.reviewsCount || reviews.length}</Text>
              <Text style={styles.analyticLabel}>Reviews</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {['menu', 'reviews', 'info'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'menu' && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Full Menu</Text>
            {dishes.length === 0 ? (
              <Text style={styles.emptyText}>No dishes available yet</Text>
            ) : (
              dishes.map((dish) => (
                <TouchableOpacity 
                  key={dish._id} 
                  style={styles.dishCard}
                  onPress={() => {
                    setActiveDish(dish);
                    setIsDetailsVisible(true);
                  }}
                >
                  <View style={styles.dishInfo}>
                    <Text style={styles.dishName}>{dish.name}</Text>
                    <Text style={styles.dishDescription} numberOfLines={2}>{dish.description}</Text>
                    <Text style={styles.dishPrice}>Rs. {dish.price}</Text>
                  </View>
                  <Image 
                    source={{ uri: getMediaUrl(dish.imageUrl) || 'https://via.placeholder.com/100' }} 
                    style={styles.dishImage} 
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Customer Reviews</Text>
              <View style={styles.overallRating}>
                <Text style={styles.ratingBig}>{restaurant.rating || '5.0'}</Text>
                <View>
                  <View style={styles.starsRow}>
                    {[1,2,3,4,5].map(s => (
                      <Ionicons key={s} name="star" size={12} color="#FFD700" />
                    ))}
                  </View>
                  <Text style={styles.reviewCount}>{reviews.length} reviews</Text>
                </View>
              </View>
            </View>
            
            {reviews.length === 0 ? (
              <Text style={styles.emptyText}>No reviews yet. Be the first!</Text>
            ) : (
              reviews.map((review, idx) => (
                <View key={review._id || idx} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{review.user?.name?.charAt(0) || 'U'}</Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>{review.user?.name || 'User'}</Text>
                        <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <View style={styles.reviewRating}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.ratingTextSmall}>{review.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'info' && (
          <View style={styles.infoTabSection}>
            <Text style={styles.sectionTitle}>Restaurant Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={20} color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{restaurant.address}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={20} color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Opening Hours</Text>
                  <Text style={styles.infoValue}>{restaurant.openingHours || '09:00 AM - 11:00 PM'}</Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={20} color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Contact</Text>
                  <Text style={styles.infoValue}>{restaurant.phone || '+92 300 1234567'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {activeDish && (
        <DishDetailsModal 
          isVisible={isDetailsVisible}
          onClose={() => setIsDetailsVisible(false)}
          dish={activeDish}
        />
      )}
    </SafeAreaView>
  );
}

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 250,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  infoSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  followBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingBtn: {
    backgroundColor: '#eee',
  },
  followBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  followingBtnText: {
    color: '#666',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  categoryText: {
    fontSize: 16,
    color: '#666',
  },
  address: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  analyticsBar: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  analyticItem: {
    alignItems: 'center',
  },
  analyticValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  analyticLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  tab: {
    paddingVertical: 15,
    marginRight: 25,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: Colors.primary,
  },
  reviewsSection: {
    padding: 20,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  overallRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
  },
  ratingBig: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 10,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingTextSmall: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#854D0E',
    marginLeft: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  infoTabSection: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTextContainer: {
    marginLeft: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  selectedDishSection: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  selectedDishCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedDishImage: {
    width: '100%',
    height: 200,
  },
  selectedDishInfo: {
    padding: 15,
  },
  selectedDishName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedDishPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginVertical: 5,
  },
  selectedDishDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  addToCartBtn: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  addToCartBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dishInfo: {
    flex: 1,
    paddingRight: 10,
  },
  dishName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dishDescription: {
    fontSize: 14,
    color: '#777',
    marginVertical: 5,
  },
  dishPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  dishImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  }
});
