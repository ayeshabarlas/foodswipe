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
  Alert,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import { getMediaUrl } from '../utils/config';
import * as SecureStore from 'expo-secure-store';
import { subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';

import DishDetailsModal from '../components/DishDetailsModal';
import VoucherCard from '../components/VoucherCard';

const { width } = Dimensions.get('window');

export default function RestaurantDetails({ route, navigation }: any) {
  const { restaurantId, selectedDishId } = route.params;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [dishes, setDishes] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [activeDish, setActiveDish] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'reviews', 'info'
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [userReview, setUserReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
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
        const dishesData = dishesRes.data || [];
        setDishes(dishesData);
        
        // Extract categories
        if (dishesData.length > 0) {
          const uniqueCategories = ['All', ...new Set(dishesData.map((d: any) => d.category || 'Other'))];
          setCategories(uniqueCategories);
        }
      } catch (e: any) {
        console.error(`❌ [RestaurantDetails] Error fetching dishes for ${cleanId}:`, e.message);
        setDishes([]);
      }

      // Fetch vouchers for this restaurant
      try {
        const vouchersRes = await apiClient.get(`/vouchers/restaurant/${cleanId}`);
        setVouchers(vouchersRes.data || []);
      } catch (e: any) {
        console.error(`❌ [RestaurantDetails] Error fetching vouchers for ${cleanId}:`, e.message);
      }

      // Fetch deals for this restaurant
      try {
        const dealsRes = await apiClient.get(`/deals/restaurant/${cleanId}`);
        setDeals(dealsRes.data || []);
      } catch (e: any) {
        console.error(`❌ [RestaurantDetails] Error fetching deals for ${cleanId}:`, e.message);
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

  const isRestaurantOpen = () => {
    if (!restaurant) return false;
    if (restaurant.storeStatus === 'closed') return false;
    
    // Check operating hours
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const today = days[now.getDay()];
    
    // Check openingHours object (standard format)
    const hours = restaurant.openingHours?.[today];
    
    if (hours) {
      if (hours.isClosed) return false;
      
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [openH, openM] = (hours.open || '09:00').split(':').map(Number);
      const [closeH, closeM] = (hours.close || '23:00').split(':').map(Number);
      
      const openTime = openH * 60 + openM;
      const closeTime = closeH * 60 + closeM;
      
      // Handle cases where close time is after midnight (e.g., 2:00 AM)
      if (closeTime < openTime) {
        return currentTime >= openTime || currentTime <= closeTime;
      }
      
      return currentTime >= openTime && currentTime <= closeTime;
    }
    
    return restaurant.storeStatus === 'open' || restaurant.storeStatus === 'busy';
  };

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(isRestaurantOpen());
    
    // Refresh open status every minute
    const interval = setInterval(() => {
      setIsOpen(isRestaurantOpen());
    }, 60000);
    
    return () => clearInterval(interval);
  }, [restaurant]);

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

  const handleAddReview = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        Alert.alert('Login Required', 'Please login to write a review', [
          { text: 'Cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]);
        return;
      }

      if (!userReview.comment.trim()) {
        Alert.alert('Required', 'Please write a comment');
        return;
      }

      setIsSubmittingReview(true);
      
      let cleanId = restaurantId;
      if (typeof restaurantId === 'object' && restaurantId?._id) {
        cleanId = restaurantId._id;
      }

      const res = await apiClient.post(`/restaurants/${cleanId}/reviews`, {
        rating: userReview.rating,
        comment: userReview.comment
      });

      setReviews(prev => [res.data, ...prev]);
      setIsReviewModalVisible(false);
      setUserReview({ rating: 5, comment: '' });
      Alert.alert('Success', 'Thank you for your review!');
      
      // Refresh restaurant details for updated rating
      fetchRestaurantDetails();
    } catch (err: any) {
      console.error('Error adding review:', err);
      Alert.alert('Error', err.response?.data?.message || 'Could not post review');
    } finally {
      setIsSubmittingReview(false);
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
            source={{ uri: getMediaUrl(restaurant.coverImage) || getMediaUrl(restaurant.logo) || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800' }} 
            style={styles.banner} 
          />
          <View style={styles.headerOverlay} />
          
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.profilePicContainer}>
            <View style={styles.logoWrapper}>
              <Image 
                source={{ uri: getMediaUrl(restaurant.logo) || 'https://via.placeholder.com/100' }} 
                style={styles.profilePic} 
              />
              <View style={[styles.statusIndicator, { backgroundColor: isOpen ? (restaurant.storeStatus === 'busy' ? '#F59E0B' : '#10B981') : '#EF4444' }]} />
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.nameContainer}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{restaurant.name}</Text>
                {restaurant.businessType === 'home-chef' && (
                  <View style={styles.homeChefLabel}>
                    <Text style={styles.homeChefLabelText}>Homechef</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.metaRow}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingBadgeText}>
                    {restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'New'}
                  </Text>
                </View>
                <Text style={styles.metaDivider}>•</Text>
                <Text style={styles.cuisineText}>
                  {restaurant.cuisineTypes && restaurant.cuisineTypes.length > 0 
                    ? restaurant.cuisineTypes[0] 
                    : (restaurant.businessType === 'home-chef' ? 'Home Chef' : 'Restaurant')}
                </Text>
                <Text style={styles.metaDivider}>•</Text>
                <Text style={[styles.openStatus, { color: isOpen ? (restaurant.storeStatus === 'busy' ? '#F59E0B' : '#10B981') : '#EF4444' }]}>
                  {isOpen ? (restaurant.storeStatus === 'busy' ? 'Busy' : 'Open') : 'Closed'}
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

          <View style={styles.addressRow}>
            <Ionicons name="location-sharp" size={14} color="#9CA3AF" />
            <Text style={styles.addressText} numberOfLines={1}>{restaurant.address}</Text>
          </View>
          
          {/* Real-time Analytics Bar */}
          <View style={styles.analyticsBar}>
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>
                {restaurant.analytics?.followersCount ?? restaurant.followersCount ?? 0}
              </Text>
              <Text style={styles.analyticLabel}>Followers</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>
                {restaurant.deliveryTime || restaurant.estimatedDeliveryTime || (restaurant.businessType === 'home-chef' ? '45-60' : '25-35')}
              </Text>
              <Text style={styles.analyticLabel}>Mins</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>
                {restaurant.analytics?.totalOrders || restaurant.totalOrders || 0}
              </Text>
              <Text style={styles.analyticLabel}>Orders</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.analyticItem}>
              <Text style={styles.analyticValue}>
                {reviews.length || restaurant.reviewCount || 0}
              </Text>
              <Text style={styles.analyticLabel}>Reviews</Text>
            </View>
          </View>
        </View>

        {/* Deals Section */}
        {deals.length > 0 && (
          <View style={styles.vouchersSection}>
            <Text style={styles.sectionTitleSmall}>Today's Deals</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.vouchersList}
            >
              {deals.map((deal) => (
                <TouchableOpacity 
                  key={deal._id} 
                  style={styles.dealCard}
                  activeOpacity={0.9}
                  onPress={() => Alert.alert(
                    deal.title,
                    `${deal.description}\n\nDiscount: ${deal.discountType === 'percentage' ? deal.discount + '%' : 'Rs.' + deal.discount} OFF`
                  )}
                >
                  <View style={styles.dealContent}>
                    <View style={styles.dealBadge}>
                      <Text style={styles.dealBadgeText}>DEAL</Text>
                    </View>
                    <Text style={styles.dealTitle} numberOfLines={1}>{deal.title}</Text>
                    <Text style={styles.dealDiscount}>
                      {deal.discountType === 'percentage' ? `${deal.discount}%` : `Rs.${deal.discount}`} OFF
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Vouchers Section */}
        {vouchers.length > 0 && (
          <View style={styles.vouchersSection}>
            <Text style={styles.sectionTitleSmall}>Available Offers</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.vouchersList}
            >
              {vouchers.map((voucher) => (
                <VoucherCard 
                  key={voucher._id} 
                  voucher={voucher}
                  style={styles.restaurantVoucherCard}
                  onPress={() => Alert.alert(
                    'Apply Voucher', 
                    `Use code ${voucher.code} at checkout to get ${voucher.discountType === 'percentage' ? voucher.discount + '%' : 'Rs.' + voucher.discount} off!`
                  )}
                />
              ))}
            </ScrollView>
          </View>
        )}

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
            <View style={styles.menuHeader}>
              <Text style={styles.sectionTitle}>Full Menu</Text>
              <Text style={styles.menuCount}>{dishes.length} Items</Text>
            </View>

            {/* Categories Selector */}
            {categories.length > 1 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.categoriesContainer}
                contentContainerStyle={styles.categoriesContent}
              >
                {categories.map((cat) => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.categoryTab, activeCategory === cat && styles.activeCategoryTab]}
                    onPress={() => setActiveCategory(cat)}
                  >
                    <Text style={[styles.categoryTabText, activeCategory === cat && styles.activeCategoryTabText]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {dishes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="restaurant-outline" size={48} color="#E5E7EB" />
                <Text style={styles.emptyText}>No dishes available yet</Text>
              </View>
            ) : (
              dishes
                .filter(dish => activeCategory === 'All' || dish.category === activeCategory)
                .map((dish) => (
                <TouchableOpacity 
                  key={dish._id} 
                  style={styles.dishCard}
                  onPress={() => {
                    setActiveDish(dish);
                    setIsDetailsVisible(true);
                  }}
                >
                  <View style={styles.dishInfo}>
                    <View style={styles.dishTitleRow}>
                      <Text style={styles.dishName}>{dish.name}</Text>
                      {dish.discount > 0 && (
                        <View style={styles.discountBadgeSmall}>
                          <Text style={styles.discountBadgeTextSmall}>-{dish.discount}%</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.dishDescription} numberOfLines={2}>{dish.description}</Text>
                    <View style={styles.dishFooter}>
                      <View style={styles.priceContainer}>
                        <Text style={styles.dishPrice}>Rs. {dish.discount > 0 ? (dish.price * (1 - dish.discount / 100)).toFixed(0) : dish.price}</Text>
                        {dish.discount > 0 && (
                          <Text style={styles.originalPrice}>Rs. {dish.price}</Text>
                        )}
                      </View>
                      {dish.variants && dish.variants.length > 0 && (
                        <View style={styles.variantBadge}>
                          <Text style={styles.variantBadgeText}>Options</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.dishImageContainer}>
                    <Image 
                      source={{ uri: getMediaUrl(dish.imageUrl) || 'https://via.placeholder.com/100' }} 
                      style={styles.dishImage} 
                    />
                    <TouchableOpacity 
                      style={styles.addDishBtn}
                      onPress={() => {
                        setActiveDish(dish);
                        setIsDetailsVisible(true);
                      }}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Customer Reviews</Text>
                <TouchableOpacity 
                  style={styles.writeReviewBtn}
                  onPress={() => setIsReviewModalVisible(true)}
                >
                  <Ionicons name="create-outline" size={16} color={Colors.primary} />
                  <Text style={styles.writeReviewBtnText}>Write a review</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.overallRating}>
                <Text style={styles.ratingBig}>{restaurant.rating > 0 ? restaurant.rating.toFixed(1) : '5.0'}</Text>
                <View>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons 
                        key={s} 
                        name={s <= (restaurant.rating || 5) ? "star" : "star-outline"} 
                        size={12} 
                        color="#FFD700" 
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewCount}>{reviews.length} reviews</Text>
                </View>
              </View>
            </View>
            
            {reviews.length === 0 ? (
              <View style={styles.emptyReviews}>
                <Ionicons name="chatbubbles-outline" size={48} color="#E5E7EB" />
                <Text style={styles.emptyText}>No reviews yet. Be the first!</Text>
              </View>
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
                  <Text style={styles.infoValue}>
                    {(() => {
                      if (typeof restaurant.openingHours === 'string') return restaurant.openingHours;
                      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                      const today = days[new Date().getDay()];
                      const hours = restaurant.openingHours?.[today];
                      if (!hours || hours.isClosed) return 'Closed Today';
                      return `${hours.open || '09:00'} - ${hours.close || '23:00'}`;
                    })()}
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="call-outline" size={20} color={Colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Contact</Text>
                  <Text style={styles.infoValue}>{restaurant.contact || restaurant.phone || 'Not available'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={isReviewModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate your experience</Text>
              <TouchableOpacity onPress={() => setIsReviewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.starsSelection}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity 
                  key={star} 
                  onPress={() => setUserReview({ ...userReview, rating: star })}
                >
                  <Ionicons 
                    name={star <= userReview.rating ? "star" : "star-outline"} 
                    size={40} 
                    color="#FFD700" 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Tell us about your food and experience..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={userReview.comment}
              onChangeText={(text) => setUserReview({ ...userReview, comment: text })}
            />

            <TouchableOpacity 
              style={[styles.submitReviewBtn, isSubmittingReview && styles.disabledBtn]}
              onPress={handleAddReview}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitReviewBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {activeDish && (
        <DishDetailsModal 
          isVisible={isDetailsVisible}
          onClose={() => setIsDetailsVisible(false)}
          dish={activeDish}
          isRestaurantOpen={isOpen}
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
    height: 220,
    position: 'relative',
    backgroundColor: '#000',
  },
  banner: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 10,
    borderRadius: 25,
    zIndex: 10,
  },
  profilePicContainer: {
    position: 'absolute',
    bottom: -40,
    left: 20,
    zIndex: 5,
  },
  logoWrapper: {
    position: 'relative',
    padding: 4,
    backgroundColor: '#fff',
    borderRadius: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
  },
  infoSection: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginRight: 10,
    letterSpacing: -0.5,
  },
  homeChefLabel: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  homeChefLabelText: {
    color: '#EA580C',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#854D0E',
    marginLeft: 4,
  },
  metaDivider: {
    marginHorizontal: 8,
    color: '#9CA3AF',
    fontSize: 14,
  },
  cuisineText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  openStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  addressText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  followBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  followingBtn: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
  },
  followBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  followingBtnText: {
    color: '#4B5563',
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
  vouchersSection: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitleSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 20,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vouchersList: {
    paddingLeft: 20,
    paddingRight: 5,
  },
  restaurantVoucherCard: {
    width: width * 0.7,
    height: 80,
    marginRight: 12,
  },
  dealCard: {
    width: width * 0.55,
    height: 85,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginRight: 15,
    borderWidth: 1.5,
    borderColor: '#FF416C',
    overflow: 'hidden',
    shadowColor: '#FF416C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dealContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  dealBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF416C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 10,
  },
  dealBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  dealDiscount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF416C',
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
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 10,
    textAlign: 'center',
  },
  dishCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dishInfo: {
    flex: 1,
    paddingRight: 12,
  },
  dishTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  discountBadgeSmall: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountBadgeTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  dishName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  dishDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  dishFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  dishPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 8,
  },
  writeReviewBtnText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reviewModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  starsSelection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  reviewInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#111827',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  submitReviewBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitReviewBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  variantBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  variantBadgeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  dishImageContainer: {
    position: 'relative',
  },
  dishImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  addDishBtn: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoriesContainer: {
    marginBottom: 20,
    marginTop: -5,
  },
  categoriesContent: {
    paddingRight: 20,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeCategoryTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeCategoryTabText: {
    color: '#fff',
  },
});
