import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  Dimensions, 
  ActivityIndicator, 
  StatusBar,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/apiClient';
import VideoCard from '../components/VideoCard';
import { subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import { useCart } from '../context/CartContext';
import CartDrawer from '../components/CartDrawer';
import DishDetailsModal from '../components/DishDetailsModal';

const { height, width } = Dimensions.get('window');

const VideoFeedScreen = () => {
  const { cartCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [videoSuggestions, setVideoSuggestions] = useState<any[]>([]);
  const [showVideoSuggestions, setShowVideoSuggestions] = useState(false);
  const [currentTab, setCurrentTab] = useState('foryou');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const categories = ['All', 'Burgers', 'Pizza', 'Pasta', 'Chinese', 'Desi', 'Desserts', 'Beverages', 'Breakfast', 'Lunch', 'Dinner', 'Fast Food'];
  
  const navigation = useNavigation<any>();

  const fetchActiveOrder = async () => {
    try {
      const userInfoStr = await SecureStore.getItemAsync('user_info');
      if (!userInfoStr) return;
      const response = await apiClient.get('/orders/user/active');
      if (response.data && response.data.length > 0) {
        setActiveOrder(response.data[0]);
      } else {
        setActiveOrder(null);
      }
    } catch (err) {
      console.log('Error fetching active order:', err);
    }
  };

  useEffect(() => {
    fetchActiveOrder();
    const interval = setInterval(fetchActiveOrder, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchVideos = async (tab = currentTab, category = selectedCategory, search = searchTerm) => {
    try {
      setLoading(true);
      
      if (tab === 'following') {
        const token = await SecureStore.getItemAsync('auth_token');
        if (!token) {
          setVideos([]);
          setFilteredVideos([]);
          setLoading(false);
          return;
        }
      }

      let endpoint = tab === 'following' ? '/videos/following' : '/videos/feed';
      const params = [];
      if (category !== 'All') {
        params.push(`category=${encodeURIComponent(category)}`);
      }
      if (search.trim()) {
        params.push(`search=${encodeURIComponent(search.trim())}`);
      }
      
      if (params.length > 0) {
        endpoint += `?${params.join('&')}`;
      }
      
      const response = await apiClient.get(endpoint);

      if (response.data && response.data.videos) {
        setVideos(response.data.videos);
        setFilteredVideos(response.data.videos);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      if (tab === 'following') {
        setVideos([]);
        setFilteredVideos([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(currentTab, selectedCategory, searchTerm);
  }, [currentTab, selectedCategory]);

  // Debounced search for video feed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchVideos(currentTab, selectedCategory, searchTerm);
        
        // Fetch suggestions for the dropdown
        if (searchTerm.trim()) {
          setShowVideoSuggestions(true);
          apiClient.get(`/videos/feed?search=${encodeURIComponent(searchTerm)}&limit=5`)
            .then(res => setVideoSuggestions(res.data.videos || []))
            .catch(err => console.error('Error fetching video suggestions:', err));
        } else {
          setShowVideoSuggestions(false);
          setVideoSuggestions([]);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSuggestionPress = (item: any) => {
    setSearchTerm(item.name);
    setShowVideoSuggestions(false);
    // Since it's a video feed, we just filter the feed by this item's name
    fetchVideos(currentTab, 'All', item.name);
  };

  const fetchComments = async (dishId: string) => {
    setLoadingComments(true);
    try {
      const res = await apiClient.get(`/videos/${dishId}/comments`);
      setComments(res.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        Alert.alert(
          'Login Required',
          'Please login to comment',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => {
              setShowComments(false);
              navigation.navigate('Login');
            }}
          ]
        );
        return;
      }

      const currentDish: any = videos[activeVideoIndex];
      const res = await apiClient.post(`/videos/${currentDish._id}/comment`, { text: commentText });
      setComments(prev => [res.data, ...prev]);
      setCommentText('');
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    }
  };

  useEffect(() => {
    // Subscribe to real-time feed updates (like web app)
    const channel = subscribeToChannel('public-feed');
    if (channel) {
      channel.bind('new_dish', (newDish: any) => {
        console.log('✨ New dish received via socket:', newDish.name);
        setVideos((prev: any) => [newDish, ...prev]);
      });

      channel.bind('dish_updated', (updatedDish: any) => {
        console.log('🔄 Dish updated via socket:', updatedDish.name);
        setVideos((prev: any) => prev.map((v: any) => 
          v._id === updatedDish._id ? { ...v, ...updatedDish } : v
        ));
      });
    }

    // Individual video channel will be handled inside VideoCard
    // But we can listen for general updates here if needed

    return () => {
      unsubscribeFromChannel('public-feed');
    };
  }, []);

  useEffect(() => {
    if (showComments && videos[activeVideoIndex]) {
      fetchComments((videos[activeVideoIndex] as any)._id);
    }
  }, [showComments, activeVideoIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveVideoIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6A00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Header Overlay (Matched with Web App) */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.menuBtn} 
            onPress={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
          >
            <Ionicons name="filter" color="#fff" size={24} />
          </TouchableOpacity>
          
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search dishes or restaurants..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchTerm}
              onChangeText={(text) => {
                setSearchTerm(text);
                if (text.trim() && selectedCategory !== 'All') {
                  setSelectedCategory('All');
                }
              }}
              onFocus={() => searchTerm.trim() && setShowVideoSuggestions(true)}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchTerm('');
                setShowVideoSuggestions(false);
                fetchVideos(currentTab, selectedCategory, '');
              }}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Suggestions Dropdown */}
          {showVideoSuggestions && videoSuggestions.length > 0 && (
            <View style={styles.videoSuggestions}>
              {videoSuggestions.map((item) => (
                <TouchableOpacity 
                  key={item._id} 
                  style={styles.videoSuggestionItem}
                  onPress={() => handleSuggestionPress(item)}
                >
                  <Ionicons name="fast-food-outline" size={18} color="#FF6A00" />
                  <View style={styles.suggestionTextContainer}>
                    <Text style={styles.suggestionMainText}>{item.name}</Text>
                    <Text style={styles.suggestionSubText} numberOfLines={1}>
                      {item.category} • {item.restaurant?.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.cartBtn} onPress={() => setIsCartOpen(true)}>
            <Ionicons name="cart-outline" color="#fff" size={24} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {activeOrder && (
            <TouchableOpacity 
              style={[styles.cartBtn, { marginLeft: 10, backgroundColor: '#4CAF50' }]} 
              onPress={() => navigation.navigate('OrderDetails', { orderId: activeOrder._id })}
            >
              <Ionicons name="map" color="#fff" size={20} />
              <View style={[styles.cartBadge, { backgroundColor: '#fff' }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' }} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setCurrentTab('foryou')}>
            <Text style={[styles.tabText, currentTab === 'foryou' && styles.activeTab]}>For You</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCurrentTab('following')}>
            <Text style={[styles.tabText, currentTab === 'following' && styles.activeTab]}>Following</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Dropdown */}
      {isCategoryDropdownOpen && (
        <View style={styles.categoryDropdown}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryItem,
                  selectedCategory === cat && styles.activeCategoryItem
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setSearchTerm(''); // Clear search when selecting category
                  setIsCategoryDropdownOpen(false);
                }}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === cat && styles.activeCategoryText
                ]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={filteredVideos}
        ListEmptyComponent={
          currentTab === 'following' ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>
                {searchTerm ? 'No results found' : 'Follow your favorite restaurants'}
              </Text>
              <Text style={[styles.emptyText, { fontSize: 14, marginTop: 10 }]}>
                {searchTerm 
                  ? 'Try searching for something else' 
                  : 'Follow restaurants to see their latest dishes and updates here.'}
              </Text>
              {!searchTerm && (
                <TouchableOpacity 
                  style={styles.loginBtn}
                  onPress={() => setCurrentTab('foryou')}
                >
                  <Text style={styles.loginBtnText}>Explore Restaurants</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="videocam-off-outline" size={64} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>No videos available</Text>
              <Text style={[styles.emptyText, { fontSize: 14, marginTop: 10 }]}>Try changing the category or search term</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <VideoCard 
            dish={item} 
            isActive={index === activeVideoIndex} 
            onOpenComments={() => setShowComments(true)}
          />
        )}
        keyExtractor={(item: any) => item._id}
        pagingEnabled
        vertical
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={1}
      />

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseArea} 
            onPress={() => setShowComments(false)} 
          />
          <View style={styles.commentsContainer}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>{comments.length} Comments</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.commentsList}>
              {loadingComments ? (
                <ActivityIndicator size="small" color="#FF6A00" style={{ marginTop: 20 }} />
              ) : comments.length === 0 ? (
                <Text style={styles.noComments}>No comments yet. Be the first!</Text>
              ) : (
                comments.map((comment, index) => (
                  <View key={index} style={styles.commentItem}>
                    <View style={styles.commentUserLogo}>
                      <Text style={styles.commentUserInitial}>
                        {comment.user?.name?.charAt(0) || 'U'}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUserName}>{comment.user?.name || 'User'}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                      <Text style={styles.commentTime}>Just now</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                />
                <TouchableOpacity 
                  onPress={handlePostComment}
                  disabled={!commentText.trim()}
                >
                  <Ionicons 
                    name="send" 
                    size={24} 
                    color={commentText.trim() ? "#FF6A00" : "#ccc"} 
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* Cart Drawer */}
      <CartDrawer 
        isVisible={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    padding: 0,
  },
  cartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6A00',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold', 
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 15,
    paddingVertical: 5,
  },
  activeTab: {
    color: '#fff',
    borderBottomWidth: 3,
    borderBottomColor: '#FF6A00',
  },
  categoryDropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 130,
    left: 0,
    right: 0,
    zIndex: 90,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  categoryItem: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activeCategoryItem: {
    backgroundColor: '#FF6A00',
    borderColor: '#FF6A00',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: '700',
  },
  videoSuggestions: {
    position: 'absolute',
    top: 50,
    left: 61,
    right: 61,
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 12,
    zIndex: 3000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  videoSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  suggestionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  suggestionSubText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCloseArea: {
    flex: 1,
  },
  commentsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.7,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  commentsList: {
    flex: 1,
    padding: 20,
  },
  noComments: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentUserLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6A00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  commentUserInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  commentContent: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
  },
  exploreBtn: {
    backgroundColor: '#FF6A00',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 30,
  },
  exploreBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VideoFeedScreen;
