import React from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';

import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface CartDrawerProps {
  isVisible: boolean;
  onClose: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isVisible, onClose }) => {
  const navigation = useNavigation<any>();
  const { cart, removeFromCart, updateQuantity, clearCart, totalAmount } = useCart();

  const handleCheckout = () => {
    onClose();
    navigation.navigate('Checkout');
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeArea} onPress={onClose} />
        <View style={styles.drawerContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Cart</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={80} color="#ddd" />
              <Text style={styles.emptyText}>Your cart is empty</Text>
              <TouchableOpacity style={styles.browseBtn} onPress={onClose}>
                <Text style={styles.browseBtnText}>Browse Dishes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={styles.itemsList}>
                {cart.map((item) => (
                  <View key={item._id} style={styles.cartItem}>
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemRestaurant}>{item.restaurantName}</Text>
                      <Text style={styles.itemPrice}>Rs. {item.price}</Text>
                    </View>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        style={styles.qtyBtn} 
                        onPress={() => updateQuantity(item._id, item.quantity - 1)}
                      >
                        <Ionicons name="remove" size={16} color="#333" />
                      </TouchableOpacity>
                      <Text style={styles.quantity}>{item.quantity}</Text>
                      <TouchableOpacity 
                        style={styles.qtyBtn} 
                        onPress={() => updateQuantity(item._id, item.quantity + 1)}
                      >
                        <Ionicons name="add" size={16} color="#333" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteBtn}
                      onPress={() => removeFromCart(item._id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>Rs. {totalAmount}</Text>
                </View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                  <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
                  <Text style={styles.clearText}>Clear Cart</Text>
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
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: height * 0.8,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 10,
    marginBottom: 20,
  },
  browseBtn: {
    backgroundColor: '#FF6A00',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  browseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 15,
    marginBottom: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  itemRestaurant: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6A00',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 10,
  },
  qtyBtn: {
    padding: 4,
  },
  quantity: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 8,
    minWidth: 15,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 5,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  checkoutBtn: {
    backgroundColor: '#FF6A00',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  checkoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearText: {
    color: '#999',
    fontSize: 14,
  },
});

export default CartDrawer;
