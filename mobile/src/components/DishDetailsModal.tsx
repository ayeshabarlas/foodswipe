import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getMediaUrl } from '../utils/config';
import { useCart } from '../context/CartContext';
import { subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import apiClient from '../api/apiClient';
import { API_URL } from '../utils/config';

import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { queueOfflineAction } from '../utils/cache';
import NetInfo from '@react-native-community/netinfo';

const { width, height } = Dimensions.get('window');

interface Variant {
  name: string;
  price: number;
}

interface Drink {
  name: string;
  price: number;
}

interface DishDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  dish: any;
  isRestaurantOpen?: boolean;
}

const DishDetailsModal = ({ isVisible, onClose, dish, isRestaurantOpen = true }: DishDetailsModalProps) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'reviews' | 'nutrition'>('ingredients');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedDrinks, setSelectedDrinks] = useState<Drink[]>([]);
  const [selectedCombo, setSelectedCombo] = useState<any>(null);
  const [currentDish, setCurrentDish] = useState(dish);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = React.useRef<Video>(null);

  useEffect(() => {
    setCurrentDish(dish);
    if (dish?.variants && dish.variants.length > 0) {
      setSelectedVariant(dish.variants[0]);
    }
  }, [dish]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (isVisible && currentDish?._id) {
      fetchReviews();
      
      // Real-time updates for this dish
      const channel = subscribeToChannel(`video-${currentDish._id}`);
      if (channel) {
        channel.bind('newComment', (newReview: any) => {
          console.log('💬 New review via socket in modal:', newReview);
          setReviews(prev => [newReview, ...prev]);
        });

        channel.bind('videoUpdate', (data: any) => {
          console.log('🔄 Dish data updated via socket in modal:', data);
          setCurrentDish((prev: any) => ({ ...prev, ...data }));
        });
      }

      return () => {
        unsubscribeFromChannel(`video-${currentDish._id}`);
      };
    }
  }, [isVisible, currentDish?._id]);

  const priceToDisplay = selectedVariant ? selectedVariant.price : (currentDish?.price || 0);
  const drinksTotal = selectedDrinks.reduce((sum, d) => sum + (d.price || 0), 0);
  const comboTotal = selectedCombo ? selectedCombo.price : 0;
  const totalPrice = (priceToDisplay + drinksTotal + comboTotal) * quantity;

  const toggleDrink = (drink: Drink) => {
    setSelectedDrinks(prev => 
      prev.find(d => d.name === drink.name)
        ? prev.filter(d => d.name !== drink.name)
        : [...prev, drink]
    );
  };

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const response = await apiClient.get(`/videos/${currentDish._id}/comments`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleAddToCart = async () => {
    // Track order/cart click with offline support
    const trackingPayload = { dishId: currentDish._id };
    const trackingEndpoint = `/videos/${currentDish._id}/track-order-click`;
    
    try {
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        apiClient.post(trackingEndpoint).catch(e => {
          console.log('Tracking error, queueing offline:', e.message);
          queueOfflineAction({
            type: 'TRACK_ORDER_CLICK',
            payload: trackingPayload,
            endpoint: trackingEndpoint,
            method: 'POST'
          });
        });
      } else {
        queueOfflineAction({
          type: 'TRACK_ORDER_CLICK',
          payload: trackingPayload,
          endpoint: trackingEndpoint,
          method: 'POST'
        });
      }
    } catch (err) {
      console.log('Network check error:', err);
    }
    
    const cartItem = {
      _id: currentDish._id,
      name: currentDish.name,
      price: priceToDisplay + drinksTotal + comboTotal,
      quantity: quantity,
      restaurantId: currentDish.restaurant?._id || (typeof currentDish.restaurant === 'string' ? currentDish.restaurant : null),
      restaurantName: currentDish.restaurant?.name || 'Restaurant',
      imageUrl: currentDish.imageUrl,
      variant: selectedVariant,
      drinks: selectedDrinks,
      combo: selectedCombo
    };
    addToCart(cartItem);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header Sticky */}
          <View style={styles.stickyHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.stickyTitle} numberOfLines={1}>{currentDish.name}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            bounces={true}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Media (Video or Image) */}
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={togglePlay}
              style={styles.mediaContainer}
            >
              {currentDish.videoUrl ? (
                <>
                  <Video
                    ref={videoRef}
                    source={{ uri: getMediaUrl(currentDish.videoUrl) }}
                    style={styles.dishMedia}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={isVisible && isPlaying}
                    isLooping
                    isMuted={false}
                    onLoad={() => setVideoLoading(false)}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'transparent']}
                    style={styles.mediaGradient}
                  />
                  {videoLoading && (
                    <View style={styles.mediaPlaceholder}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                  )}
                  {!isPlaying && (
                    <View style={styles.playOverlay}>
                      <View style={styles.playIconContainer}>
                        <Ionicons name="play" size={40} color="#fff" style={{ marginLeft: 5 }} />
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <Image
                  source={{ uri: getMediaUrl(currentDish.imageUrl) || 'https://via.placeholder.com/400' }}
                  style={styles.dishMedia}
                  resizeMode="cover"
                />
              )}
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <View style={styles.handle} />
              
              {/* Dish Info */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishName}>{currentDish.name}</Text>
                  <Text style={styles.restaurantName}>{currentDish.restaurant?.name}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {currentDish.rating || currentDish.restaurant?.rating || '5.0'}
                  </Text>
                  <Text style={styles.reviewCountSmall}> ({reviews.length})</Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>Rs. {priceToDisplay.toLocaleString()}</Text>
                {selectedVariant && (
                  <View style={styles.variantBadge}>
                    <Text style={styles.variantBadgeText}>{selectedVariant.name}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.description}>{currentDish.description}</Text>

              {/* Combos Section */}
              {currentDish.combos && currentDish.combos.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Make it a Meal (Combos)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                    {currentDish.combos.map((combo: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.comboCard,
                          selectedCombo?.title === combo.title && styles.activeComboCard
                        ]}
                        onPress={() => setSelectedCombo(selectedCombo?.title === combo.title ? null : combo)}
                      >
                        <Text style={[styles.comboTitle, selectedCombo?.title === combo.title && styles.activeComboTitle]}>
                          {combo.title}
                        </Text>
                        <Text style={styles.comboPrice}>+ Rs. {combo.price}</Text>
                        {combo.items && (
                          <Text style={styles.comboItems} numberOfLines={2}>
                            {Array.isArray(combo.items) ? combo.items.join(' + ') : combo.items}
                          </Text>
                        )}
                        {selectedCombo?.title === combo.title && (
                          <View style={styles.selectedCheck}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Variants Section */}
              {currentDish.variants && currentDish.variants.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Select Size</Text>
                  <View style={styles.variantsRow}>
                    {currentDish.variants.map((variant: Variant, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.variantBtn,
                          selectedVariant?.name === variant.name && styles.activeVariantBtn
                        ]}
                        onPress={() => setSelectedVariant(variant)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.variantText,
                          selectedVariant?.name === variant.name && styles.activeVariantText
                        ]}>
                          {variant.name}
                        </Text>
                        <Text style={[
                          styles.variantPrice,
                          selectedVariant?.name === variant.name && styles.activeVariantPrice
                        ]}>
                          Rs. {variant.price.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Drinks Section */}
              {currentDish.drinks && currentDish.drinks.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Add Drinks</Text>
                  <View style={styles.drinksGrid}>
                    {currentDish.drinks.map((drink: Drink, index: number) => {
                      const isSelected = selectedDrinks.find(d => d.name === drink.name);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.drinkCard,
                            isSelected && styles.activeDrinkCard
                          ]}
                          onPress={() => toggleDrink(drink)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.drinkName, isSelected && styles.activeDrinkName]}>{drink.name}</Text>
                          <Text style={styles.drinkPriceText}>+Rs. {drink.price.toLocaleString()}</Text>
                          {isSelected && (
                            <View style={styles.addedBadge}>
                              <Ionicons name="checkmark-circle" size={14} color="#fff" />
                              <Text style={styles.addedBadgeText}>Added</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Tabs for Ingredients/Reviews/Nutrition */}
              <View style={styles.tabHeader}>
                {['ingredients', 'reviews', 'nutrition'].map((tab) => (
                  <TouchableOpacity 
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.activeTab]}
                    onPress={() => setActiveTab(tab as any)}
                  >
                    <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {tab === 'reviews' ? ` (${reviews.length})` : ''}
                    </Text>
                    {activeTab === tab && <View style={styles.activeTabUnderline} />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tabContent}>
                {activeTab === 'ingredients' ? (
                  <View style={styles.ingredientsGrid}>
                    {currentDish.ingredients && currentDish.ingredients.length > 0 ? (
                      currentDish.ingredients.map((item: string, i: number) => (
                        <View key={i} style={styles.ingredientItem}>
                          <View style={styles.dot} />
                          <Text style={styles.ingredientText}>{item}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No ingredients listed.</Text>
                    )}
                  </View>
                ) : activeTab === 'reviews' ? (
                  <View style={styles.reviewsList}>
                    {loadingReviews ? (
                      <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
                    ) : reviews.length === 0 ? (
                      <View style={styles.emptyReviews}>
                        <Ionicons name="chatbubble-outline" size={48} color="#ddd" />
                        <Text style={styles.emptyReviewsText}>No reviews yet. Be the first to review!</Text>
                      </View>
                    ) : (
                      reviews.map((review: any, index: number) => (
                        <View key={index} style={styles.reviewItem}>
                           <View style={styles.reviewHeader}>
                             <View style={styles.userAvatar}>
                               {review.user?.profilePicture ? (
                                 <Image source={{ uri: getMediaUrl(review.user.profilePicture) }} style={styles.avatarImage} />
                               ) : (
                                 <Text style={styles.avatarInitial}>{review.user?.name?.charAt(0) || 'U'}</Text>
                               )}
                             </View>
                             <View style={styles.userInfo}>
                               <Text style={styles.userName}>{review.user?.name || 'User'}</Text>
                               <View style={styles.starRow}>
                                 {[1, 2, 3, 4, 5].map((s) => (
                                   <Ionicons 
                                     key={s} 
                                     name={s <= (review.rating || 5) ? "star" : "star-outline"} 
                                     size={12} 
                                     color="#FFD700" 
                                   />
                                 ))}
                               </View>
                             </View>
                             <Text style={styles.reviewDate}>
                               {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Just now'}
                             </Text>
                           </View>
                           <Text style={styles.reviewComment}>{review.comment || review.text}</Text>
                         </View>
                      ))
                    )}
                  </View>
                ) : (
                  <View style={styles.nutritionContent}>
                    {currentDish.nutrition ? (
                      Object.entries(currentDish.nutrition).map(([key, value]: [string, any], idx) => (
                        <View key={idx} style={styles.nutritionRow}>
                          <Text style={styles.nutritionKey}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                          <Text style={styles.nutritionValue}>{value}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyNutrition}>
                        <Ionicons name="fitness-outline" size={48} color="#ddd" />
                        <Text style={styles.emptyText}>Nutrition info not available for this dish.</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              
              <View style={{ height: 120 }} />
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={styles.quantityBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color="#333" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity 
                style={styles.quantityBtn}
                onPress={() => setQuantity(quantity + 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.addToCartBtn, !isRestaurantOpen && styles.disabledBtn]} 
              onPress={isRestaurantOpen ? handleAddToCart : undefined}
              activeOpacity={isRestaurantOpen ? 0.9 : 1}
            >
              <LinearGradient
                colors={isRestaurantOpen ? ['#FF8C00', '#FF4500'] : ['#9CA3AF', '#6B7280']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Ionicons 
                  name={isRestaurantOpen ? "cart-outline" : "lock-closed-outline"} 
                  size={20} 
                  color="#fff" 
                  style={{ marginRight: 8 }} 
                />
                <Text style={styles.addToCartText}>
                  {isRestaurantOpen 
                    ? `Add to Cart • Rs. ${totalPrice.toLocaleString()}` 
                    : 'Restaurant Closed'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: height * 0.85,
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  mediaContainer: {
    width: '100%',
    height: 350,
    position: 'relative',
    backgroundColor: '#000',
  },
  dishMedia: {
    width: '100%',
    height: '100%',
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  mediaPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dishName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  restaurantName: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '700',
    fontSize: 14,
    color: '#1A1A1A',
  },
  reviewCountSmall: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '800', 
    color: Colors.primary,
  },
  variantBadge: {
    backgroundColor: '#FFF0E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  variantBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A', 
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionContent: {
    paddingVertical: 10,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  nutritionKey: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
  nutritionValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  emptyNutrition: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  horizontalScroll: {
    paddingRight: 20,
  },
  comboCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 200,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeComboCard: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF7ED',
  },
  comboTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  activeComboTitle: {
    color: Colors.primary,
  },
  comboPrice: {
    fontSize: 14,
    fontWeight: '600',    color: Colors.primary,
    marginBottom: 8,
  },
  comboItems: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  selectedCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1A1A1A',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  activeTabLabel: {
    color: '#1A1A1A',
  },
  tabContent: {
    paddingBottom: 100,
  },
  variantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  variantBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14, 
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center', 
    gap: 8,
  },
  activeVariantBtn: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF0E6',
  },
  variantText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeVariantText: {
    color: Colors.primary,
  },
  variantPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  activeVariantPrice: {
    color: Colors.primary,
  },
  drinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  drinkCard: {
    width: (width - 60) / 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activeDrinkCard: {
    backgroundColor: '#FFF7ED',
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  drinkName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  activeDrinkName: {
    color: Colors.primary,
  },
  drinkPriceText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  addedBadge: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 12,
    paddingVertical: 8, 
    borderRadius: 10,
    width: (width - 60) / 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: '#4A4A4A',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 16,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  addToCartBtn: {
    flex: 1,
    height: 55,
    borderRadius: 15,
    overflow: 'hidden',
  },
  disabledBtn: {
    opacity: 0.8,
  },
  gradientBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DishDetailsModal;
