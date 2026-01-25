import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import { subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import * as SecureStore from 'expo-secure-store';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('customer');

  useEffect(() => {
    fetchOrderDetails();
    getUserRole();

    const channel = subscribeToChannel(`order-${orderId}`);
    if (channel) {
      channel.bind('orderStatusUpdate', (data: any) => {
        console.log('📦 Order status updated via socket:', data.status);
        setOrder((prev: any) => ({ ...prev, ...data }));
      });

      channel.bind('riderAssigned', (data: any) => {
        console.log('🚴 Rider assigned via socket:', data.rider.name);
        setOrder((prev: any) => ({ 
          ...prev, 
          rider: data.rider, 
          status: data.status || 'Rider Assigned' 
        }));
      });
    }

    return () => {
      unsubscribeFromChannel(`order-${orderId}`);
    };
  }, [orderId]);

  const getUserRole = async () => {
    const userData = await SecureStore.getItemAsync('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || 'customer');
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/orders/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.error('Error fetching order details:', err);
      Alert.alert('Error', 'Could not fetch order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'Pending': return 0;
      case 'Preparing': return 1;
      case 'Ready for Pickup': return 2;
      case 'Picked Up': return 3;
      case 'Delivered': return 4;
      default: return 0;
    }
  };

  const steps = [
    { label: 'Confirmed', icon: 'checkmark-circle' },
    { label: 'Preparing', icon: 'restaurant' },
    { label: 'On the Way', icon: 'bicycle' },
    { label: 'Delivered', icon: 'home' }
  ];

  const currentStep = getStatusStep(order?.status || 'Pending');

  const openMap = () => {
    if (!order?.deliveryAddress) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${order.deliveryAddress}`,
      android: `geo:0,0?q=${order.deliveryAddress}`
    });
    if (url) Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{orderId.slice(-6)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status Tracker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Status</Text>
          <View style={styles.trackerContainer}>
            {steps.map((step, index) => {
              const isCompleted = currentStep >= index;
              const isLast = index === steps.length - 1;
              return (
                <React.Fragment key={index}>
                  <View style={styles.stepItem}>
                    <View style={[styles.iconCircle, isCompleted && styles.completedCircle]}>
                      <Ionicons 
                        name={step.icon as any} 
                        size={20} 
                        color={isCompleted ? '#fff' : '#9CA3AF'} 
                      />
                    </View>
                    <Text style={[styles.stepLabel, isCompleted && styles.activeLabel]}>{step.label}</Text>
                  </View>
                  {!isLast && (
                    <View style={[styles.line, currentStep > index && styles.completedLine]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
          <View style={styles.statusBadgeContainer}>
            <Text style={styles.currentStatusText}>Current Status: <Text style={{ color: Colors.primary }}>{order.status}</Text></Text>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}> Delivery Address</Text>
          </View>
          <Text style={styles.addressText}>{order.deliveryAddress}</Text>
          {order.deliveryInstructions && (
            <Text style={styles.instructionsText}>Note: {order.deliveryInstructions}</Text>
          )}
          {userRole === 'rider' && (
            <TouchableOpacity style={styles.mapButton} onPress={openMap}>
              <Ionicons name="map-outline" size={20} color="#fff" />
              <Text style={styles.mapButtonText}>Open in Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Rider Info */}
        {order.rider && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery Rider</Text>
            <View style={styles.riderRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{order.rider.name}</Text>
                <Text style={styles.riderPhone}>{order.rider.phone || '+92 3XX XXXXXXX'}</Text>
              </View>
              <TouchableOpacity 
                style={styles.callButton}
                onPress={() => Linking.openURL(`tel:${order.rider.phone}`)}
              >
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Items</Text>
          {order.orderItems.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemMain}>
                <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                <View>
                  <Text style={styles.itemName}>{item.dish?.name || 'Dish'}</Text>
                  {item.variant && <Text style={styles.itemExtra}>{item.variant.name}</Text>}
                  {item.drinks?.map((d: any) => (
                    <Text key={d._id} style={styles.itemExtra}>+ {d.name}</Text>
                  ))}
                </View>
              </View>
              <Text style={styles.itemPrice}>Rs. {item.price * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>Rs. {order.totalPrice - 50}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>Rs. 50</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {order.totalPrice}</Text>
          </View>
          <View style={styles.paymentBadge}>
            <Ionicons name="card-outline" size={16} color={Colors.gray} />
            <Text style={styles.paymentText}>Paid via {order.paymentMethod.toUpperCase()}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons for Rider/Restaurant */}
      {userRole === 'restaurant' && order.status === 'Pending' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => updateStatus('Preparing')}
          >
            <Text style={styles.actionButtonText}>Accept & Start Preparing</Text>
          </TouchableOpacity>
        </View>
      )}

      {userRole === 'rider' && order.status === 'Ready for Pickup' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => updateStatus('Picked Up')}
          >
            <Text style={styles.actionButtonText}>Confirm Pickup</Text>
          </TouchableOpacity>
        </View>
      )}

      {userRole === 'rider' && order.status === 'Picked Up' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => updateStatus('Delivered')}
          >
            <Text style={styles.actionButtonText}>Mark as Delivered</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );

  async function updateStatus(newStatus: string) {
    try {
      setLoading(true);
      await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrderDetails();
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  trackerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  completedCircle: {
    backgroundColor: Colors.primary,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#F3F4F6',
    marginTop: -25,
  },
  completedLine: {
    backgroundColor: Colors.primary,
  },
  stepLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  activeLabel: {
    color: '#111827',
    fontWeight: '600',
  },
  statusBadgeContainer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 15,
  },
  currentStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  instructionsText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  riderPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#10B981',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemMain: {
    flexDirection: 'row',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 10,
  },
  itemName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  itemExtra: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 15,
  },
  paymentText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 6,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});