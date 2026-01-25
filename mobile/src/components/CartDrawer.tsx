import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../api/apiClient';

const { width, height } = Dimensions.get('window');

interface CartDrawerProps {
  isVisible: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isVisible, onClose }) => {
  const navigation = useNavigation<any>();
  const { cart, removeFromCart, updateQuantity, clearCart, totalAmount } = useCart();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchSettings();
    }
  }, [isVisible]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/settings');
      setSettings(res.data);
    } catch (err) {
      console.log('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    onClose();
    navigation.navigate('Checkout');
  };

  const subtotal = totalAmount;
  const serviceFee = settings?.serviceFee || 0;
  const minOrderAmount = settings?.minimumOrderAmount || 0;
  const isBelowMinimum = subtotal < minOrderAmount;

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('en-IN');
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.closeArea} 
          onPress={onClose} 
          activeOpacity={1} 
        />
        <View style={styles.drawerContent}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Shopping Cart</Text>
              <Text style={styles.itemCount}>{cart.length} {cart.length === 1 ? 'item' : 'items'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size="24" color="#111827" />
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="cart-outline" size={60} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Your cart is empty</Text>
              <Text style={styles.emptySubtitle}>Add items from restaurant menus to start an order</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={onClose}>
                <LinearGradient
                  colors={['#FF8C00', '#FF4500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.browseGradient}
                >
                  <Text style={styles.browseBtnText}>Browse Restaurants</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView 
                style={styles.itemList} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {cart.map((item) => (
                  <View key={item._id} style={styles.cartItem}>
                    <Image 
                      source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop' }} 
                      style={styles.itemImage} 
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemRestaurant}>{item.restaurantName}</Text>
                      <Text style={styles.itemPrice}>Rs. {formatPrice(item.price)}</Text>
                      
                      {item.variant && (
                        <Text style={styles.itemExtra}>• {item.variant.name}</Text>
                      )}
                      {item.combo && (
                        <Text style={styles.itemExtra}>• {item.combo.title} (Combo)</Text>
                      )}
                      {item.drinks && item.drinks.length > 0 && (
                        <Text style={styles.itemExtra}>
                          • {item.drinks.map(d => d.name).join(', ')}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        style={styles.removeBtn}
                        onPress={() => removeFromCart(item._id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                      
                      <View style={styles.qtyActions}>
                        <TouchableOpacity 
                          style={styles.qtyBtn}
                          onPress={() => item.quantity > 1 && updateQuantity(item._id, item.quantity - 1)}
                        >
                          <Ionicons name="remove" size={16} color="#4B5563" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity 
                          style={styles.qtyBtn}
                          onPress={() => updateQuantity(item._id, item.quantity + 1)}
                        >
                          <Ionicons name="add" size={16} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>Rs. {formatPrice(subtotal)}</Text>
                </View>
                
                {serviceFee > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service Fee</Text>
                    <Text style={styles.summaryValue}>Rs. {formatPrice(serviceFee)}</Text>
                  </View>
                )}
                
                <Text style={styles.taxNote}>* Delivery fee and tax calculated at checkout</Text>
                
                {isBelowMinimum && (
                  <View style={styles.minOrderWarning}>
                    <Ionicons name="warning" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.minOrderText}>
                      Min. order Rs. {formatPrice(minOrderAmount)}. Add Rs. {formatPrice(minOrderAmount - subtotal)} more.
                    </Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.checkoutBtn, isBelowMinimum && styles.disabledBtn]}
                  onPress={handleCheckout}
                  disabled={isBelowMinimum}
                >
                  <LinearGradient
                    colors={isBelowMinimum ? ['#9CA3AF', '#9CA3AF'] : ['#FF8C00', '#FF4500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.checkoutGradient}
                  >
                    <Text style={styles.checkoutBtnText}>
                      {isBelowMinimum ? 'Below Minimum Amount' : 'Proceed to Checkout'}
                    </Text>
                    {!isBelowMinimum && <Ionicons name="arrow-forward" size={20} color="#fff" />}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  closeArea: {
    flex: 1,
  },
  drawerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    minHeight: height * 0.5,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  itemCount: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  itemList: {
    padding: 20,
  },
  cartItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  itemRestaurant: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 4,
  },
  itemExtra: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  quantityControls: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  removeBtn: {
    padding: 4,
  },
  qtyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  taxNote: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  minOrderWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  minOrderText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
  },
  checkoutBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  disabledBtn: {
    elevation: 0,
    shadowOpacity: 0,
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: height * 0.4,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  browseBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  browseGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  browseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CartDrawer;
