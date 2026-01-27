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
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';
import apiClient from '../api/apiClient';
import { subscribeToChannel, unsubscribeFromChannel } from '../utils/socket';
import * as SecureStore from 'expo-secure-store';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '../utils/config';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('customer');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRiderId, setCurrentRiderId] = useState<string | null>(null);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [riderLocation, setRiderLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isRider, setIsRider] = useState(false);
  const [navigationSteps, setNavigationSteps] = useState<any[]>([]);
  const [currentNavStep, setCurrentNavStep] = useState<string>('');
  const [totalDistance, setTotalDistance] = useState<string>('');
  const [totalDuration, setTotalDuration] = useState<string>('');
  const [mapHeading, setMapHeading] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [directionsReady, setDirectionsReady] = useState(false);
  const mapRef = React.useRef<MapView>(null);

  useEffect(() => {
    fetchOrderDetails();
    getUserRole();

    let locationSubscription: any;

    const setupLocation = async () => {
      const userData = await SecureStore.getItemAsync('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.role === 'rider') {
          setIsRider(true);
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            locationSubscription = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                distanceInterval: 10,
                timeInterval: 5000,
              },
              (location) => {
                const newLocation = {
                  lat: location.coords.latitude,
                  lng: location.coords.longitude,
                };
                setRiderLocation(newLocation);
                
                if (location.coords.heading !== null && location.coords.heading !== undefined) {
                  setMapHeading(location.coords.heading);
                }

                // Auto-center map if in navigation mode
                if (isNavigating && mapRef.current) {
                  mapRef.current.animateCamera({
                    center: {
                      latitude: newLocation.lat,
                      longitude: newLocation.lng,
                    },
                    heading: location.coords.heading || 0,
                    pitch: 45,
                    altitude: 1000,
                    zoom: 18,
                  }, { duration: 1000 });
                }
              }
            );
          }
        }
      }
    };

    setupLocation();

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

    // Subscribe to rider location updates if it's a customer
    let userChannel: any;
    const setupUserChannel = async () => {
      const userData = await SecureStore.getItemAsync('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        userChannel = subscribeToChannel(`user-${user._id}`);
        if (userChannel) {
          userChannel.bind('riderLocationUpdate', (data: any) => {
            if (data.orderId === orderId) {
              console.log('📍 Rider location update received:', data.location);
              setRiderLocation(data.location);
            }
          });
        }
      }
    };
    setupUserChannel();

    return () => {
      unsubscribeFromChannel(`order-${orderId}`);
      if (userChannel) {
        // We don't unsubscribe from user channel as it might be used elsewhere, 
        // but we should unbind if needed. For now, keep it simple.
      }
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [orderId]);

  const getUserRole = async () => {
    const userData = await SecureStore.getItemAsync('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || 'customer');
      setCurrentUserId(user._id || user.id);

      if (user.role === 'rider') {
        try {
          const res = await apiClient.get('/riders/my-profile');
          setCurrentRiderId(res.data._id);
          setHasActiveOrder(!!res.data.currentOrder);
        } catch (err) {
          console.error('Error fetching rider profile:', err);
        }
      }
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/orders/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.error('Error fetching order details:', err);
      // Alert.alert('Error', 'Could not fetch order details');
      // navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'Accepted':
      case 'Confirmed': return 0;
      case 'Preparing': return 1;
      case 'Ready':
      case 'Ready for Pickup':
      case 'Arrived': return 2;
      case 'Picked Up':
      case 'OnTheWay': return 3;
      case 'ArrivedAtCustomer': return 4;
      case 'Delivered': return 5;
      default: return -1;
    }
  };

  const steps = [
    { label: 'Confirmed', icon: 'checkmark-circle', status: 'Accepted' },
    { label: 'Preparing', icon: 'restaurant', status: 'Preparing' },
    { label: 'Arrived', icon: 'location', status: 'Arrived' },
    { label: 'Picked Up', icon: 'bicycle', status: 'Picked Up' },
    { label: 'Arrived at Customer', icon: 'home', status: 'ArrivedAtCustomer' },
    { label: 'Delivered', icon: 'checkmark-done', status: 'Delivered' }
  ];

  const currentStep = getStatusStep(order?.status || 'Pending');

  const compareIds = (id1: any, id2: any) => {
    if (!id1 || !id2) return false;
    const s1 = typeof id1 === 'object' ? (id1._id || id1).toString() : id1.toString();
    const s2 = typeof id2 === 'object' ? (id2._id || id2).toString() : id2.toString();
    return s1 === s2;
  };

  const isAssignedToMe = () => {
    if (userRole !== 'rider') {
      console.log('DEBUG: User role is not rider:', userRole);
      return false;
    }
    if (!order?.rider) {
      console.log('DEBUG: Order has no rider assigned yet');
      return false;
    }

    // Extract all possible IDs from the order rider
    const orderRiderId = (order.rider?._id || (typeof order.rider === 'string' ? order.rider : '')).toString();
    const orderRiderUserId = (order.rider?.user?._id || order.rider?.user || '').toString();
    
    // Extract all possible IDs from current user/rider
    const myRiderId = (currentRiderId || '').toString();
    const myUserId = (currentUserId || '').toString();
    
    console.log('DEBUG: Assignment Check:', {
      orderRiderId,
      orderRiderUserId,
      myRiderId,
      myUserId
    });

    // Check if any order-related ID matches any of our IDs
    if (orderRiderId) {
      if (myRiderId && orderRiderId === myRiderId) return true;
      if (myUserId && orderRiderId === myUserId) return true;
    }
    
    if (orderRiderUserId) {
      if (myRiderId && orderRiderUserId === myRiderId) return true;
      if (myUserId && orderRiderUserId === myUserId) return true;
    }

    // One more check: if the rider object has a name and we have user data, maybe compare names? 
    // No, IDs are better. Let's see if the order object itself has a riderId field directly
    if (order.riderId) {
      const oRId = order.riderId.toString();
      if (myRiderId && oRId === myRiderId) return true;
      if (myUserId && oRId === myUserId) return true;
    }

    return false;
  };

  const handleStepPress = (index: number) => {
    if (userRole !== 'rider') return;

    // Robust rider check
    if (!isAssignedToMe()) {
      console.log('Rider ID mismatch debug:', {
        orderRider: order?.rider?._id || order?.rider,
        orderRiderUser: order?.rider?.user?._id || order?.rider?.user,
        currentRiderId,
        currentUserId
      });
      Alert.alert('Notice', 'Only the assigned rider can update status.');
      return;
    }

    const step = steps[index];
    
    // Can only update if it's the current or next step
    if (index < currentStep) {
      // Allow re-updating if status is same or just slightly different but in same step
      // For example, if it's 'Ready' but we want to mark 'Arrived'
    }

    if (index > currentStep + 1) {
      Alert.alert('Notice', 'Please complete the previous steps first.');
      return;
    }

    const statusToUpdate = step.status;
    
    // Check if rider is allowed to trigger this status
    const riderStatuses = ['Arrived', 'Picked Up', 'ArrivedAtCustomer', 'Delivered'];
    if (!riderStatuses.includes(statusToUpdate)) {
      // Special case: Arrived at restaurant is allowed if order is Preparing/Ready
      if (statusToUpdate === 'Arrived') {
        // Continue
      } else {
        Alert.alert('Notice', 'This status is typically updated by the restaurant.');
        return;
      }
    }

    Alert.alert(
      'Update Status',
      `Mark order as ${step.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => updateStatus(statusToUpdate) }
      ]
    );
  };

  const formatPrice = (price: any) => {
    const numericPrice = Number(price);
    return isNaN(numericPrice) ? '0' : numericPrice.toString();
  };

  const openMap = (targetAddress: string, lat?: number, lng?: number) => {
    if (!targetAddress && (!lat || !lng)) return;
    const encodedAddress = encodeURIComponent(targetAddress);
    
    // For directions, we use 'daddr' on iOS and 'google.navigation:q' on Android
    const url = Platform.select({
      ios: (lat && lng && lat !== 0 && lng !== 0)
        ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
        : `comgooglemaps://?daddr=${encodedAddress}&directionsmode=driving`,
      android: (lat && lng && lat !== 0 && lng !== 0)
        ? `google.navigation:q=${lat},${lng}`
        : `google.navigation:q=${encodedAddress}`
    });
    
    const appleMapsUrl = (lat && lng && lat !== 0 && lng !== 0)
      ? `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d` 
      : `http://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`;

    const googleMapsWebUrl = (lat && lng && lat !== 0 && lng !== 0)
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
    
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to Apple Maps on iOS or Web Browser
          if (Platform.OS === 'ios') {
            Linking.openURL(appleMapsUrl);
          } else {
            Linking.openURL(googleMapsWebUrl);
          }
        }
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#6B7280', marginBottom: 20 }}>Order not found or access denied.</Text>
          <TouchableOpacity 
            style={[styles.actionButton, { paddingHorizontal: 30 }]}
            onPress={fetchOrderDetails}
          >
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
        {/* Tracking Map */}
        {(userRole === 'customer' || userRole === 'rider') && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
          <View style={[
            styles.card, 
            { padding: 0, overflow: 'hidden', height: 250 },
            isNavigating && styles.fullScreenMapContainer
          ]}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: order.deliveryLocation?.lat || 31.5204,
                longitude: order.deliveryLocation?.lng || 74.3587,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              region={isNavigating ? undefined : (riderLocation ? {
                latitude: (riderLocation.lat + (
                  (userRole === 'rider' && !['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status))
                    ? (order.restaurant?.location?.coordinates?.[1] || order.deliveryLocation?.lat || 31.5204)
                    : (order.deliveryLocation?.lat || 31.5204)
                )) / 2,
                longitude: (riderLocation.lng + (
                  (userRole === 'rider' && !['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status))
                    ? (order.restaurant?.location?.coordinates?.[0] || order.deliveryLocation?.lng || 74.3587)
                    : (order.deliveryLocation?.lng || 74.3587)
                )) / 2,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              } : undefined)}
              showsUserLocation={userRole === 'rider'}
              followsUserLocation={isNavigating}
              showsCompass={true}
              rotateEnabled={true}
              scrollEnabled={!isNavigating}
              pitchEnabled={true}
            >
              {/* Delivery Location Marker */}
              <Marker
                coordinate={{
                  latitude: order.deliveryLocation?.lat || 31.5204,
                  longitude: order.deliveryLocation?.lng || 74.3587,
                }}
                title="Delivery Location"
              >
                <View style={styles.markerContainer}>
                  <Ionicons name="location" size={24} color={Colors.primary} />
                </View>
              </Marker>

              {/* Rider Marker */}
              {riderLocation && (
                <Marker
                  coordinate={{
                    latitude: riderLocation.lat,
                    longitude: riderLocation.lng,
                  }}
                  title={userRole === 'rider' ? "Your Location" : "Rider Location"}
                >
                  <View style={[styles.markerContainer, { backgroundColor: '#fff' }]}>
                    <Ionicons name="bicycle" size={24} color="#10B981" />
                  </View>
                </Marker>
              )}

              {/* Restaurant Marker */}
              {order.restaurant?.location?.coordinates && (
                <Marker
                  coordinate={{
                    latitude: order.restaurant.location.coordinates[1],
                    longitude: order.restaurant.location.coordinates[0],
                  }}
                  title={order.restaurant.name}
                >
                  <View style={[styles.markerContainer, { backgroundColor: '#fff' }]}>
                    <Ionicons name="restaurant" size={20} color="#FF6A00" />
                  </View>
                </Marker>
              )}

              {/* Route Line */}
              {riderLocation && (
                <>
                  <MapViewDirections
                    origin={{ latitude: riderLocation.lat, longitude: riderLocation.lng }}
                    destination={{ 
                      latitude: (userRole === 'rider' && !['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status))
                        ? (order.restaurant?.location?.coordinates?.[1] || order.deliveryLocation?.lat || 31.5204)
                        : (order.deliveryLocation?.lat || 31.5204), 
                      longitude: (userRole === 'rider' && !['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status))
                        ? (order.restaurant?.location?.coordinates?.[0] || order.deliveryLocation?.lng || 74.3587)
                        : (order.deliveryLocation?.lng || 74.3587) 
                    }}
                    apikey={GOOGLE_MAPS_API_KEY}
                    strokeWidth={4}
                    strokeColor={Colors.primary}
                    optimizeWaypoints={true}
                    mode="DRIVING"
                    onReady={(result) => {
                      setDirectionsReady(true);
                      setTotalDistance(result.distance.toFixed(1) + " km");
                      setTotalDuration(Math.ceil(result.duration) + " mins");
                      if (result.legs && result.legs[0] && result.legs[0].steps) {
                        setNavigationSteps(result.legs[0].steps);
                        // Clean HTML tags from step instructions
                        const firstStep = result.legs[0].steps[0].html_instructions.replace(/<[^>]*>?/gm, '');
                        setCurrentNavStep(firstStep);
                        
                        // Fit map to route if not currently in live navigation mode
                        if (!isNavigating && mapRef.current) {
                          mapRef.current.fitToCoordinates(result.coordinates, {
                            edgePadding: {
                              right: 50,
                              bottom: 100,
                              left: 50,
                              top: 150,
                            },
                            animated: true,
                          });
                        }
                      }
                    }}
                    onError={(errorMessage) => {
                      console.log('MapViewDirections Error:', errorMessage);
                      setDirectionsReady(false);
                    }}
                  />
                  {/* Fallback Polyline only if directions API fails */}
                  {!directionsReady && (
                    <Polyline
                      coordinates={[
                        { latitude: riderLocation.lat, longitude: riderLocation.lng },
                        { 
                          latitude: (userRole === 'rider' && !['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status))
                            ? (order.restaurant?.location?.coordinates?.[1] || order.deliveryLocation?.lat || 31.5204)
                            : (order.deliveryLocation?.lat || 31.5204), 
                          longitude: (userRole === 'rider' && !['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status))
                            ? (order.restaurant?.location?.coordinates?.[0] || order.deliveryLocation?.lng || 74.3587)
                            : (order.deliveryLocation?.lng || 74.3587) 
                        }
                      ]}
                      strokeColor={Colors.primary}
                      strokeWidth={3}
                      lineDashPattern={[5, 5]}
                      opacity={0.7}
                    />
                  )}
                </>
              )}
            </MapView>
            
            {isNavigating && (
              <View style={styles.mapControlsContainer}>
                <TouchableOpacity 
                  style={styles.mapControlBtn}
                  onPress={() => {
                    if (riderLocation && mapRef.current) {
                      mapRef.current.animateCamera({
                        center: {
                          latitude: riderLocation.lat,
                          longitude: riderLocation.lng,
                        },
                        heading: mapHeading,
                        pitch: 45,
                        zoom: 18,
                      }, { duration: 1000 });
                    }
                  }}
                >
                  <Ionicons name="locate" size={24} color={Colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.mapControlBtn, { marginTop: 10 }]}
                  onPress={() => {
                    if (mapRef.current) {
                      const destination = (userRole === 'rider' && !['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status))
                        ? { 
                            latitude: order.restaurant?.location?.coordinates?.[1] || 31.5204,
                            longitude: order.restaurant?.location?.coordinates?.[0] || 74.3587
                          }
                        : {
                            latitude: order.deliveryLocation?.lat || 31.5204,
                            longitude: order.deliveryLocation?.lng || 74.3587
                          };

                      if (riderLocation) {
                        mapRef.current.fitToCoordinates([
                          { latitude: riderLocation.lat, longitude: riderLocation.lng },
                          destination
                        ], {
                          edgePadding: { top: 150, right: 50, bottom: 100, left: 50 },
                          animated: true
                        });
                      }
                    }
                  }}
                >
                  <Ionicons name="map-outline" size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {riderLocation && userRole === 'customer' && (
              <View style={styles.mapOverlay}>
                <Text style={styles.mapOverlayText}>Rider is on the way!</Text>
              </View>
            )}
            {riderLocation && userRole === 'rider' && (
              <>
                {isNavigating && currentNavStep ? (
                  <View style={styles.navInstructionBox}>
                    <TouchableOpacity 
                      style={styles.gmapsCircleBtn}
                      onPress={() => {
                        const target = (['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status))
                          ? { addr: order.deliveryAddress, lat: order.deliveryLocation?.lat, lng: order.deliveryLocation?.lng }
                          : { addr: order.restaurant?.address, lat: order.restaurant?.location?.coordinates?.[1], lng: order.restaurant?.location?.coordinates?.[0] };
                        openMap(target.addr, target.lat, target.lng);
                      }}
                    >
                      <Ionicons name="logo-google" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.navInstructionText} numberOfLines={2}>{currentNavStep}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={styles.navStatsText}>{totalDistance}</Text>
                        <View style={styles.statsDot} />
                        <Text style={styles.navStatsText}>{totalDuration}</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.closeNavBtn}
                      onPress={() => setIsNavigating(false)}
                    >
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 4 }}>
                        <Ionicons name="close" size={24} color="#fff" />
                      </View>
                      <Text style={{ color: '#fff', fontSize: 10, textAlign: 'center' }}>Exit</Text>
                    </TouchableOpacity>
                  </View>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 4 }}>
                        <Ionicons name="close" size={24} color="#fff" />
                      </View>
                      <Text style={{ color: '#fff', fontSize: 10, textAlign: 'center' }}>Exit</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.mapOverlay}>
                    <Text style={styles.mapOverlayText}>
                      {['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status) 
                        ? "Heading to Customer" 
                        : "Heading to Restaurant"}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity 
                        style={styles.floatingNavButton}
                        onPress={() => setIsNavigating(true)}
                      >
                        <Ionicons name="navigate" size={20} color="#fff" />
                        <Text style={styles.floatingNavText}>Live Nav</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.floatingNavButton, { backgroundColor: '#4285F4' }]}
                        onPress={() => {
                          const isHeadingToCustomer = ['Picked Up', 'OnTheWay', 'ArrivedAtCustomer'].includes(order.status);
                          if (isHeadingToCustomer) {
                            openMap(order.shippingAddress?.address || order.deliveryAddress, order.deliveryLocation?.lat, order.deliveryLocation?.lng);
                          } else {
                            const lat = order.restaurant?.location?.coordinates?.[1];
                            const lng = order.restaurant?.location?.coordinates?.[0];
                            openMap(order.restaurant?.address, lat, lng);
                          }
                        }}
                      >
                        <Ionicons name="logo-google" size={18} color="#fff" />
                         <Text style={styles.floatingNavText}>Open G-Maps App</Text>
                       </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Status Tracker */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Status</Text>
          <View style={styles.trackerContainer}>
            {steps.map((step, index) => {
              const isCompleted = currentStep >= index;
              const isLast = index === steps.length - 1;
              return (
                <React.Fragment key={index}>
                  <TouchableOpacity 
                    style={styles.stepItem}
                    onPress={() => handleStepPress(index)}
                    disabled={userRole !== 'rider'}
                  >
                    <View style={[styles.iconCircle, isCompleted && styles.completedCircle]}>
                      <Ionicons 
                        name={step.icon as any} 
                        size={20} 
                        color={isCompleted ? '#fff' : '#9CA3AF'} 
                      />
                    </View>
                    <Text style={[styles.stepLabel, isCompleted && styles.activeLabel]}>{step.label}</Text>
                  </TouchableOpacity>
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

        {/* Order Completion Modal */}
        <Modal
          visible={showCompletionModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.completionOverlay}>
            <View style={styles.completionModal}>
              <LinearGradient
                colors={['#4ade80', '#22c55e']}
                style={styles.completionHeader}
              >
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={40} color="#fff" />
                </View>
                <Text style={styles.completionTitle}>Order Delivered!</Text>
                <Text style={styles.completionSubtitle}>Great job on completing this delivery</Text>
              </LinearGradient>

              <View style={styles.completionBody}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Order ID</Text>
                  <Text style={styles.summaryValue}>#{orderId.slice(-6).toUpperCase()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Earnings</Text>
                  <Text style={[styles.summaryValue, { color: '#22c55e' }]}>Rs. {order?.netRiderEarning || order?.riderEarning || 0}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Customer</Text>
                  <Text style={styles.summaryValue}>{order?.user?.name || 'Customer'}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.completionCloseBtn}
                  onPress={() => {
                    setShowCompletionModal(false);
                    navigation.navigate('RiderDashboard');
                  }}
                >
                  <Text style={styles.completionCloseBtnText}>Go to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delivery Info */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}> Pickup From (Restaurant)</Text>
          </View>
          <Text style={styles.restaurantNameText}>{order.restaurant?.name}</Text>
          <Text style={styles.addressText}>{order.restaurant?.address}</Text>
          {userRole === 'rider' && (
            <TouchableOpacity 
              style={[styles.mapButton, { backgroundColor: '#10B981', marginBottom: 10 }]} 
              onPress={() => {
                const lat = order.restaurant?.location?.coordinates?.[1];
                const lng = order.restaurant?.location?.coordinates?.[0];
                openMap(order.restaurant?.address, lat, lng);
              }}
            >
              <Ionicons name="navigate-outline" size={20} color="#fff" />
              <Text style={styles.mapButtonText}>Navigate to Restaurant</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.divider, { marginVertical: 15 }]} />

          <View style={styles.row}>
            <Ionicons name="home" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}> Deliver To (Customer)</Text>
          </View>
          <Text style={styles.addressText}>{order.shippingAddress?.address || order.deliveryAddress}</Text>
          {order.shippingAddress?.city && <Text style={styles.addressText}>{order.shippingAddress.city}</Text>}
          {order.deliveryInstructions && (
            <Text style={styles.instructionsText}>Note: {order.deliveryInstructions}</Text>
          )}
          {userRole === 'rider' && (
            <TouchableOpacity 
              style={styles.mapButton} 
              onPress={() => openMap(order.shippingAddress?.address || order.deliveryAddress, order.deliveryLocation?.lat, order.deliveryLocation?.lng)}
            >
              <Ionicons name="map-outline" size={20} color="#fff" />
              <Text style={styles.mapButtonText}>Navigate to Customer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Earnings Info for Rider */}
        {userRole === 'rider' && (
          <View style={[styles.card, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <View style={styles.row}>
              <Ionicons name="cash" size={20} color="#059669" />
              <Text style={[styles.cardTitle, { color: '#065F46' }]}> Your Payout</Text>
            </View>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Total Earning for this order:</Text>
              <Text style={styles.earningsValueLarge}>Rs. {order.netRiderEarning || order.riderEarning || 0}</Text>
            </View>
          </View>
        )}

        {/* Rider Info (Show to Customer) */}
        {userRole === 'customer' && order.rider && (
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

        {/* Customer Info (Show to Rider) */}
        {userRole === 'rider' && order.user && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Customer Details</Text>
            <View style={styles.riderRow}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color={Colors.primary} />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{order.user.name || 'Customer'}</Text>
                <Text style={styles.riderPhone}>{order.user.phone || 'No phone provided'}</Text>
              </View>
              {order.user.phone && (
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${order.user.phone}`)}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Items</Text>
          {order.orderItems.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemMain}>
                <Text style={styles.itemQuantity}>{item.qty || item.quantity}x</Text>
                <View>
                  <Text style={styles.itemName}>{item.name || item.dish?.name || 'Dish'}</Text>
                  {item.variant && <Text style={styles.itemExtra}>{item.variant.name}</Text>}
                  {item.drinks?.map((d: any) => (
                    <Text key={d._id} style={styles.itemExtra}>+ {d.name}</Text>
                  ))}
                </View>
              </View>
              <Text style={styles.itemPrice}>Rs. {formatPrice(item.price * (item.qty || item.quantity))}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>Rs. {formatPrice(order.subtotal || (order.totalPrice - (order.deliveryFee || 50)))}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>Rs. {formatPrice(order.deliveryFee || 50)}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {formatPrice(order.totalPrice)}</Text>
          </View>
          <View style={[styles.paymentBadge, order.paymentMethod?.toLowerCase() === 'cod' && { backgroundColor: '#FEF3C7' }]}>
            <Ionicons 
              name={order.paymentMethod?.toLowerCase() === 'cod' ? "cash-outline" : "card-outline"} 
              size={16} 
              color={order.paymentMethod?.toLowerCase() === 'cod' ? "#D97706" : Colors.gray} 
            />
            <Text style={[styles.paymentText, order.paymentMethod?.toLowerCase() === 'cod' && { color: '#D97706' }]}>
              {order.paymentMethod?.toLowerCase() === 'cod' ? 'CASH ON DELIVERY' : `PAID VIA ${order.paymentMethod.toUpperCase()}`}
            </Text>
          </View>

          {order.paymentMethod?.toLowerCase() === 'cod' && (
            <View style={styles.codAlert}>
              <Ionicons name="alert-circle" size={20} color="#D97706" />
              <Text style={styles.codAlertText}>
                Collect <Text style={{ fontWeight: 'bold' }}>Rs. {formatPrice(order.totalPrice)}</Text> from customer
              </Text>
            </View>
          )}
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

      {/* RIDER: Accept Delivery Request (Only if no rider assigned and rider has no active order) */}
      {userRole === 'rider' && !order.rider && !hasActiveOrder && ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'Ready for Pickup'].includes(order.status) && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: Colors.primary }]}
            onPress={acceptOrder}
          >
            <Text style={styles.actionButtonText}>Accept Delivery Request</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RIDER: Alert if rider has another active order */}
      {userRole === 'rider' && !order.rider && hasActiveOrder && ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'Ready for Pickup'].includes(order.status) && (
        <View style={styles.footer}>
          <View style={[styles.actionButton, { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }]}>
            <Text style={[styles.actionButtonText, { color: '#6B7280' }]}>Complete current order first</Text>
          </View>
        </View>
      )}

      {/* RIDER: Arrived at Restaurant */}
      {userRole === 'rider' && isAssignedToMe() && 
       ['Accepted', 'Confirmed', 'Preparing', 'Ready', 'Ready for Pickup'].includes(order.status) && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.largeActionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => updateStatus('Arrived')}
          >
            <Ionicons name="restaurant" size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.largeActionButtonText}>Arrived at Restaurant</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RIDER: Confirm Pickup */}
      {userRole === 'rider' && isAssignedToMe() && 
       order.status === 'Arrived' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.largeActionButton, { backgroundColor: Colors.primary }]}
            onPress={() => updateStatus('Picked Up')}
          >
            <Ionicons name="bicycle" size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.largeActionButtonText}>Confirm Pickup</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RIDER: Arrived at Customer */}
      {userRole === 'rider' && isAssignedToMe() && 
       ['Picked Up', 'OnTheWay'].includes(order.status) && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.largeActionButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => updateStatus('ArrivedAtCustomer')}
          >
            <Ionicons name="home" size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.largeActionButtonText}>Arrived at Customer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RIDER: Mark as Delivered */}
      {userRole === 'rider' && isAssignedToMe() && 
       order.status === 'ArrivedAtCustomer' && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.largeActionButton, { backgroundColor: '#10B981' }]}
            onPress={() => updateStatus('Delivered')}
          >
            <Ionicons name="checkmark-done-circle" size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.largeActionButtonText}>Mark as Delivered</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );

  async function acceptOrder() {
    try {
      setLoading(true);
      // We need the rider ID. We can get it from my-profile or user data if stored.
      const profileRes = await apiClient.get('/riders/my-profile');
      const riderId = profileRes.data._id;
      
      await apiClient.post(`/riders/${riderId}/accept-order`, { orderId });
      
      // Refresh both order and rider profile to ensure local state is perfect
      await Promise.all([
        fetchOrderDetails(),
        getUserRole()
      ]);
      
      Alert.alert('Success', 'Order accepted!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept order');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      setLoading(true);
      await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });
      
      if (newStatus === 'Delivered') {
        setShowCompletionModal(true);
      } else {
        fetchOrderDetails();
        Alert.alert('Success', `Order status updated to ${newStatus}`);
      }
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
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completionModal: {
    backgroundColor: '#fff',
    borderRadius: 30,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  completionHeader: {
    padding: 30,
    alignItems: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 4,
    borderColor: '#fff',
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 5,
  },
  completionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  completionBody: {
    padding: 25,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.gray,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  completionCloseBtn: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 25,
  },
  completionCloseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
  restaurantNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#374151',
  },
  earningsValueLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
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
  codAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  codAlertText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 10,
    flex: 1,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  largeActionButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  largeActionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  markerContainer: {
    padding: 5,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  floatingNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4', // Google Maps Blue
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  floatingNavText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  navInstructionBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 10,
    right: 10,
    backgroundColor: '#0F5132', // Dark Google Maps Green
    padding: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 1100,
  },
  gmapsCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4285F4', // Google Blue
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  navInstructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navStatsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  statsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 8,
  },
  navDistanceText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  closeNavBtn: {
     padding: 5,
   },
   mapControlsContainer: {
     position: 'absolute',
     bottom: 30,
     right: 20,
     zIndex: 1100,
   },
   mapControlBtn: {
     backgroundColor: '#fff',
     padding: 12,
     borderRadius: 30,
     elevation: 5,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.25,
     shadowRadius: 3.84,
     marginBottom: 10,
   },
   fullScreenMapContainer: {
    position: 'absolute',
    top: -100, // Cover header
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === 'ios' ? 1000 : 2000, // High enough to cover screen
    zIndex: 1000,
    borderRadius: 0,
  },
});