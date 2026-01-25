import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import CustomerDashboard from '../screens/CustomerDashboard';
import RiderDashboard from '../screens/RiderDashboard';
import RestaurantDashboard from '../screens/RestaurantDashboard';
import VideoFeedScreen from '../screens/VideoFeedScreen';
import RestaurantDetails from '../screens/RestaurantDetails';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#fff' }
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="CustomerDashboard" component={CustomerDashboard} />
        <Stack.Screen name="RiderDashboard" component={RiderDashboard} />
        <Stack.Screen name="RestaurantDashboard" component={RestaurantDashboard} />
        <Stack.Screen name="VideoFeed" component={VideoFeedScreen} />
        <Stack.Screen name="RestaurantDetails" component={RestaurantDetails} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
