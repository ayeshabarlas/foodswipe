import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

import NetInfo from '@react-native-community/netinfo';
import { queueOfflineAction } from '../utils/cache';

const CheckoutScreen = ({ navigation }: any) => {
  const { cart, totalAmount, clearCart, appliedVoucher } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'jazzcash' | 'easypaisa'>('cod');
  const [address, setAddress] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [isQueuedOffline, setIsQueuedOffline] = useState(false);

  const deliveryFee = 40;
  const tax = Math.round(totalAmount * 0.05); // 5% tax
  const finalTotal = totalAmount + deliveryFee + tax - (appliedVoucher?.discount || 0);

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
        serviceFee: 0,
        discount: appliedVoucher?.discount || 0,
        totalAmount: finalTotal,
        deliveryAddress: `${houseNumber}, ${address}`,
        deliveryInstructions: instructions,
        deliveryLocation: {
          lat: 31.5204, // Placeholder for Lahore
          lng: 74.3587
        },
        city: 'Lahore',
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
          <View style={styles.successIcon}>
            <Ionicons 
              name={isQueuedOffline ? "cloud-upload" : "checkmark-circle"} 
              size={100} 
              color={isQueuedOffline ? Colors.primary : "#4CAF50"} 
            />
          </View>
          <Text style={styles.successTitle}>
            {isQueuedOffline ? 'Order Queued Offline' : 'Order Placed Successfully!'}
          </Text>
          <Text style={styles.successSubtitle}>
            {isQueuedOffline 
              ? "You're currently offline. Your order will be placed automatically as soon as you're back online."
              : `Your order #${placedOrder?._id?.slice(-6).toUpperCase()} has been received.`
            }
          </Text>
          
          <View style={styles.orderSummaryBox}>
            <Text style={styles.summaryTitle}>Order Details</Text>
            <Text style={styles.summaryText}>Total: Rs. {finalTotal}</Text>
            <Text style={styles.summaryText}>Payment: {paymentMethod.toUpperCase()}</Text>
            <Text style={styles.summaryText}>Delivery to: {houseNumber}, {address}</Text>
          </View>

          <TouchableOpacity 
            style={styles.trackBtn}
            onPress={() => navigation.navigate('CustomerDashboard')}
          >
            <Text style={styles.trackBtnText}>
              {isQueuedOffline ? 'Go to Dashboard' : 'Track My Order'}
            </Text>
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

  return (
    <SafeAreaView style={styles.container}>
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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Delivery Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
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
              <Text style={styles.inputLabel}>Area / Landmark</Text>
              <TextInput
                style={styles.input}
                placeholder="Search for your area..."
                value={address}
                onChangeText={setAddress}
              />
            </View>
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
              <Text style={styles.priceLabel}>Tax (5%)</Text>
              <Text style={styles.priceValue}>Rs. {tax}</Text>
            </View>
            {appliedVoucher && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: '#4CAF50' }]}>Voucher Discount</Text>
                <Text style={[styles.priceValue, { color: '#4CAF50' }]}>-Rs. {appliedVoucher.discount}</Text>
              </View>
            )}
            <View style={[styles.priceRow, { marginTop: 10 }]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rs. {finalTotal}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity 
              style={[styles.paymentOption, paymentMethod === 'cod' && styles.activePayment]}
              onPress={() => setPaymentMethod('cod')}
            >
              <Ionicons name="cash-outline" size={24} color={paymentMethod === 'cod' ? Colors.primary : '#666'} />
              <Text style={[styles.paymentText, paymentMethod === 'cod' && styles.activePaymentText]}>Cash on Delivery</Text>
              {paymentMethod === 'cod' && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.paymentOption, paymentMethod === 'card' && styles.activePayment]}
              onPress={() => setPaymentMethod('card')}
            >
              <Ionicons name="card-outline" size={24} color={paymentMethod === 'card' ? Colors.primary : '#666'} />
              <Text style={[styles.paymentText, paymentMethod === 'card' && styles.activePaymentText]}>Credit / Debit Card</Text>
              {paymentMethod === 'card' && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.paymentOption, paymentMethod === 'jazzcash' && styles.activePayment]}
              onPress={() => setPaymentMethod('jazzcash')}
            >
              <Image source={{ uri: 'https://via.placeholder.com/24' }} style={styles.paymentIcon} />
              <Text style={[styles.paymentText, paymentMethod === 'jazzcash' && styles.activePaymentText]}>JazzCash</Text>
              {paymentMethod === 'jazzcash' && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.paymentOption, paymentMethod === 'easypaisa' && styles.activePayment]}
              onPress={() => setPaymentMethod('easypaisa')}
            >
              <Image source={{ uri: 'https://via.placeholder.com/24' }} style={styles.paymentIcon} />
              <Text style={[styles.paymentText, paymentMethod === 'easypaisa' && styles.activePaymentText]}>EasyPaisa</Text>
              {paymentMethod === 'easypaisa' && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
            </TouchableOpacity>
          </View>
          
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[styles.placeOrderBtn, loading && styles.disabledBtn]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.placeOrderText}>Place Order</Text>
                <Text style={styles.placeOrderPrice}>Rs. {finalTotal}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
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
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  activePayment: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,106,0,0.05)',
  },
  paymentText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  activePaymentText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  paymentIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
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
    opacity: 0.7,
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
});

export default CheckoutScreen;