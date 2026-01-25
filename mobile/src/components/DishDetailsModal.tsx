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
}

const DishDetailsModal = ({ isVisible, onClose, dish }: DishDetailsModalProps) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'reviews'>('ingredients');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedDrinks, setSelectedDrinks] = useState<Drink[]>([]);
  const [currentDish, setCurrentDish] = useState(dish);
  const [videoLoading, setVideoLoading] = useState(true);

  useEffect(() => {
    setCurrentDish(dish);
  }, [dish]);

  useEffect(() => {
    if (isVisible && currentDish?._id) {
      fetchReviews();
      if (currentDish.variants && currentDish.variants.length > 0) {
        setSelectedVariant(currentDish.variants[0]);
      }
      
      // Real-time updates for this dish
      const channel = subscribeToChannel(`video-${currentDish._id}`);
      if (channel) {
        channel.bind('newComment', (newReview: any) => {
          console.log('💬 New review via socket in modal:', newReview);
          setReviews(prev => [newReview, ...prev]);
        });

        channel.bind('videoUpdate', (data: any) => {
          console.log('🔄 Dish data updated via socket in modal:', data);
          // Update currentDish with any new data (price, etc.)
          setCurrentDish((prev: any) => ({ ...prev, ...data }));
        });
      }

      return () => {
        unsubscribeFromChannel(`video-${currentDish._id}`);
      };
    }
  }, [isVisible, currentDish?._id]);

  const priceToDisplay = selectedVariant ? selectedVariant.price : currentDish?.price;
  const drinksTotal = selectedDrinks.reduce((sum, d) => sum + d.price, 0);
  const totalPrice = (priceToDisplay + drinksTotal) * quantity;

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
      name: selectedVariant ? `${currentDish.name} (${selectedVariant.name})` : currentDish.name,
      price: priceToDisplay + drinksTotal,
      quantity: quantity,
      restaurantId: currentDish.restaurant?._id || (typeof currentDish.restaurant === 'string' ? currentDish.restaurant : null),
      restaurantName: currentDish.restaurant?.name || 'Restaurant',
      imageUrl: currentDish.imageUrl,
      variant: selectedVariant,
      drinks: selectedDrinks
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
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header Media (Video or Image) */}
            <View style={styles.mediaContainer}>
              {currentDish.videoUrl ? (
                <>
                  <Video
                    source={{ uri: getMediaUrl(currentDish.videoUrl) }}
                    style={styles.dishMedia}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={isVisible}
                    isLooping
                    isMuted={false}
                    onLoad={() => setVideoLoading(false)}
                  />
                  {videoLoading && (
                    <View style={styles.mediaPlaceholder}>
                      <ActivityIndicator size="large" color={Colors.primary} />
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
              <View style={styles.mediaOverlay} />
            </View>

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
                  <Text style={styles.ratingText}>5.0 ({reviews.length})</Text>
                </View>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.price}>Rs. {priceToDisplay}</Text>
                {selectedVariant && (
                  <View style={styles.variantBadge}>
                    <Text style={styles.variantBadgeText}>{selectedVariant.name}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.description}>
                {currentDish.description || 'No description available for this delicious dish.'}
              </Text>

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
                          Rs. {variant.price}
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
                  <View style={styles.drinksRow}>
                    {currentDish.drinks.map((drink: Drink, index: number) => {
                      const isSelected = selectedDrinks.find(d => d.name === drink.name);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.drinkBtn,
                            isSelected && styles.activeDrinkBtn
                          ]}
                          onPress={() => toggleDrink(drink)}
                        >
                          <Ionicons 
                            name={isSelected ? "checkbox" : "square-outline"} 
                            size={20} 
                            color={isSelected ? Colors.primary : "#999"} 
                          />
                          <Text style={styles.drinkText}>{drink.name}</Text>
                          <Text style={styles.drinkPrice}>+Rs. {drink.price}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Combos Section (if any) */}
              {currentDish.combos && currentDish.combos.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Available Combos</Text>
                  {currentDish.combos.map((combo: any, index: number) => (
                    <View key={index} style={styles.comboCard}>
                      <View style={styles.comboInfo}>
                        <Text style={styles.comboTitle}>{combo.title}</Text>
                        <Text style={styles.comboPrice}>Rs. {combo.price}</Text>
                      </View>
                      <TouchableOpacity style={styles.addComboBtn}>
                        <Text style={styles.addComboText}>Add Combo</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Tabs for Ingredients/Reviews */}
              <View style={styles.tabHeader}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'ingredients' && styles.activeTab]}
                  onPress={() => setActiveTab('ingredients')}
                >
                  <Text style={[styles.tabLabel, activeTab === 'ingredients' && styles.activeTabLabel]}>Ingredients</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
                  onPress={() => setActiveTab('reviews')}
                >
                  <Text style={[styles.tabLabel, activeTab === 'reviews' && styles.activeTabLabel]}>Reviews ({reviews.length})</Text>
                </TouchableOpacity>
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
                ) : (
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
                             <Text style={styles.reviewDate}>Just now</Text>
                           </View>
                           <Text style={styles.reviewComment}>{review.comment || review.text}</Text>
                         </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={styles.quantityBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color="#000" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity 
                style={styles.quantityBtn}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
              <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.addToCartText}>Add to Cart • Rs. {totalPrice}</Text>
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
  dishImage: {
    width: '100%',
    height: 250,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  infoContainer: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dishName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  restaurantName: {
    fontSize: 16,
    color: '#666',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  ratingText: {
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 14,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 15,
  },
  description: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 25,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  comboCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  comboInfo: {
    flex: 1,
  },
  comboTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  comboPrice: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  addComboBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
  },
  addComboText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  tabHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabLabel: {
    fontSize: 15,
    color: '#999',
    fontWeight: '600',
  },
  activeTabLabel: {
    color: '#111',
  },
  tabContent: {
    paddingBottom: 100,
  },
  variantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variantBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    minWidth: 100,
    alignItems: 'center',
  },
  activeVariantBtn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10', // 10% opacity
  },
  variantText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeVariantText: {
    color: Colors.primary,
  },
  variantPrice: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  activeVariantPrice: {
    color: Colors.primary,
    fontWeight: '600',
  },
  drinksRow: {
    gap: 10,
  },
  drinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  activeDrinkBtn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  drinkText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  drinkPrice: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ingredientItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  ingredientText: {
    fontSize: 14,
    color: '#555',
    textTransform: 'capitalize',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 35 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 5,
    marginRight: 15,
  },
  quantityBtn: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 15,
  },
  addToCartBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DishDetailsModal;
