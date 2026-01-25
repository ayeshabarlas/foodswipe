import React, { useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Dimensions, 
  TouchableOpacity, 
  Image,
  Platform,
  ActivityIndicator,
  Share,
  Alert
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import apiClient from '../api/apiClient';
import { getMediaUrl } from '../utils/config';
import { useNavigation } from '@react-navigation/native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';
import { useCart } from '../context/CartContext';
import DishDetailsModal from './DishDetailsModal';

const { width, height } = Dimensions.get('window');

interface VideoCardProps {
  dish: any;
  isActive: boolean;
  onOpenComments?: () => void;
}

const VideoCard = ({ dish, isActive, onOpenComments }: VideoCardProps) => {
  const { addToCart } = useCart();
  const videoRef = useRef<Video>(null);
  const navigation = useNavigation<any>();
  const [distance, setDistance] = useState<string>('1.2 km');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(dish.likes?.length || 0);
  const [sharesCount, setSharesCount] = useState(dish.shares || 0);
  const [loading, setLoading] = useState(true);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  useEffect(() => {
    // Calculate distance if coordinates available
    const calculateRealDistance = async () => {
      try {
        const userLocString = await SecureStore.getItemAsync('userLocation');
        if (userLocString && dish.restaurant?.location?.coordinates) {
          const userLoc = JSON.parse(userLocString);
          const [restLng, restLat] = dish.restaurant.location.coordinates;
          
          // Haversine formula
          const R = 6371; // Earth's radius in km
          const dLat = (restLat - userLoc.latitude) * Math.PI / 180;
          const dLon = (restLng - userLoc.longitude) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(userLoc.latitude * Math.PI / 180) * Math.cos(restLat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const d = R * c;
          
          setDistance(d < 1 ? `${(d * 1000).toFixed(0)}m away` : `${d.toFixed(1)} km away`);
        }
      } catch (err) {
        console.log('Error calculating distance:', err);
      }
    };
    calculateRealDistance();
  }, [dish]);

  const [isPlaying, setIsPlaying] = useState(true);

  // Gesture handling for swipe right to restaurant profile
  const onGestureEvent = (event: any) => {
    // Increase threshold to 150 for more deliberate swipes
    if (event.nativeEvent.translationX > 150 && event.nativeEvent.state === State.END) {
      const resId = dish.restaurant?._id || (typeof dish.restaurant === 'string' ? dish.restaurant : null);
      if (resId) {
        navigation.navigate('RestaurantDetails', { restaurantId: resId });
      }
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pauseAsync();
    } else {
      videoRef.current.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoPress = () => {
    // Web-like behavior: Clicking the dish opens details
    setIsDetailsVisible(true);
  };

  useEffect(() => {
    // Configure audio to play even in silent mode
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (e) {
        console.log('Error setting up audio mode:', e);
      }
    };
    setupAudio();

    // Real-time updates for this video
    const channel = subscribeToChannel(`video-${dish._id}`);
    if (channel) {
      channel.bind('videoUpdate', (data: any) => {
        if (data.likes !== undefined) setLikesCount(data.likes);
        if (data.shares !== undefined) setSharesCount(data.shares);
      });
    }

    return () => {
      unsubscribeFromChannel(`video-${dish._id}`);
    };
  }, [dish._id]);

  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRef.current.playAsync();
    } else {
      videoRef.current.pauseAsync();
      videoRef.current.setPositionAsync(0);
    }
  }, [isActive]);

  const toggleLike = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        Alert.alert(
          'Login Required',
          'Please login to like videos',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => navigation.navigate('Login') }
          ]
        );
        return;
      }

      const prevLiked = liked;
      const prevCount = likesCount;

      // Optimistic update
      setLiked(!prevLiked);
      setLikesCount(prev => prevLiked ? prev - 1 : prev + 1);
      
      const response = await apiClient.post(`/videos/${dish._id}/like`);
      
      if (response.data) {
        setLiked(response.data.isLiked);
        setLikesCount(response.data.likes);
      }
    } catch (err: any) {
      console.error('Error liking video:', err);
      // Revert UI on error
      // Note: We already set it optimistically, so if it fails, we should revert
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this delicious dish: ${dish.name} from ${dish.restaurant?.name} on FoodSwipe!`,
        url: `https://foodswipe.pk/dish/${dish._id}`, // Deep link to web app
      });

      if (result.action === Share.sharedAction) {
        setSharesCount(prev => prev + 1);
        await apiClient.post(`/videos/${dish._id}/share`);
      }
    } catch (err) {
      console.error('Error sharing video:', err);
    }
  };

  return (
    <PanGestureHandler 
      onHandlerStateChange={onGestureEvent}
      activeOffsetX={[-100, 100]}
      failOffsetY={[-20, 20]}
    >
      <View style={styles.container}>
        {dish.videoUrl ? (
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.videoWrapper} 
            onPress={handleVideoPress}
          >
            <Video
              ref={videoRef}
              style={styles.video}
              source={{ uri: getMediaUrl(dish.videoUrl) }}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay={isActive}
              isMuted={false}
              onLoadStart={() => setLoading(true)}
              onLoad={() => {
                console.log('Video Loaded:', dish.name);
                setLoading(false);
              }}
              onError={(err) => {
                console.error('Video Load Error:', dish.name, err);
                setLoading(false);
              }}
              onPlaybackStatusUpdate={status => setStatus(() => status)}
            />
            {loading && (
              <View style={styles.videoPlaceholder}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.videoWrapper}
            onPress={handleVideoPress}
          >
            <Image 
              source={{ uri: getMediaUrl(dish.imageUrl) }} 
              style={styles.video} 
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />

        {/* Top Restaurant Info (Matched with Web) */}
        <View style={styles.topInfo}>
          <TouchableOpacity 
            style={styles.restaurantBadge}
            onPress={() => {
              const resId = dish.restaurant?._id || (typeof dish.restaurant === 'string' ? dish.restaurant : null);
              if (resId) {
                navigation.navigate('RestaurantDetails', { restaurantId: resId });
              }
            }}
          >
            <Image 
              source={{ uri: getMediaUrl(dish.restaurant?.logo) || 'https://via.placeholder.com/40' }} 
              style={styles.restaurantLogo} 
            />
            <View>
              <Text style={styles.topRestaurantName}>{dish.restaurant?.name}</Text>
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Right Side Actions (Matched with Web) */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionItem}>
            <TouchableOpacity style={styles.actionCircle} onPress={toggleLike}>
              <Ionicons 
                name={liked ? "heart" : "heart-outline"} 
                size={24} 
                color={liked ? '#ff4b4b' : '#fff'} 
              />
            </TouchableOpacity>
            <Text style={styles.actionCount}>{likesCount}</Text>
          </View>

          <View style={styles.actionItem}>
            <TouchableOpacity style={styles.actionCircle} onPress={onOpenComments}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionCount}>{dish.commentsCount || 0}</Text>
          </View>

          <View style={styles.actionItem}>
            <TouchableOpacity style={styles.actionCircle} onPress={handleShare}>
              <Ionicons name="share-social" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.actionCount}>{sharesCount}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.actionCircle, styles.cartCircle]}
            onPress={async () => {
              try {
                // Track cart click
                apiClient.post(`/videos/${dish._id}/track-cart-click`).catch(e => console.log('Tracking error:', e));
                
                addToCart({
                  _id: dish._id,
                  name: dish.name,
                  price: dish.price,
                  quantity: 1,
                  restaurantId: dish.restaurant?._id,
                  restaurantName: dish.restaurant?.name,
                  imageUrl: dish.imageUrl
                });
                Alert.alert('Added to Cart', `${dish.name} has been added to your cart.`);
              } catch (err) {
                console.error('Cart error:', err);
              }
            }}
          >
            <Ionicons name="cart" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom Info (Matched with Web) */}
        <TouchableOpacity 
          style={styles.bottomInfo}
          onPress={() => setIsDetailsVisible(true)}
          activeOpacity={0.9}
        >
          <Text style={styles.dishName}>{dish.name}</Text>
          <Text style={styles.dishDescription} numberOfLines={2}>
            {dish.description}
          </Text>
          
          <View style={styles.viewDetailsBtn}>
            <Text style={styles.viewDetailsText}>View Details & Ingredients</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <DishDetailsModal 
          isVisible={isDetailsVisible}
          onClose={() => setIsDetailsVisible(false)}
          dish={dish}
        />
      </View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  videoWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 0,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  topInfo: {
    position: 'absolute',
    top: 135, // Moved down to align with tags/search
    left: 15, 
    zIndex: 10,
  },
  restaurantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  restaurantLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff', 
    marginRight: 10,
  },
  topRestaurantName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  distanceText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  actionsContainer: {
    position: 'absolute',
    right: 15,
    bottom: 120,
    alignItems: 'center',
    zIndex: 10,
  },
  actionItem: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center', 
    marginBottom: 5,
  },
  cartCircle: {
    backgroundColor: '#FF6A00',
    marginTop: 10,
  },
  actionCount: {
    color: '#fff',
    fontSize: 12, 
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 40, 
    left: 15,
    right: 80,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dishName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  dishDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 15,
    lineHeight: 18,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6A00',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginTop: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  viewDetailsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13, 
    marginRight: 5,
  },
});

export default VideoCard;