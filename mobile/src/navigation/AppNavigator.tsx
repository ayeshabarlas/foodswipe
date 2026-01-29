import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import CustomerDashboard from '../screens/CustomerDashboard';
import RiderDashboard from '../screens/RiderDashboard';
import RiderRegistrationScreen from '../screens/RiderRegistrationScreen';
import RiderDocumentUploadScreen from '../screens/RiderDocumentUploadScreen';
import RestaurantDashboard from '../screens/RestaurantDashboard';
import VideoFeedScreen from '../screens/VideoFeedScreen';
import RestaurantDetails from '../screens/RestaurantDetails';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import HelplineScreen from '../screens/HelplineScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AboutScreen from '../screens/AboutScreen';
import OffersScreen from '../screens/OffersScreen';

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
        <Stack.Screen name="RiderRegistration" component={RiderRegistrationScreen} />
        <Stack.Screen name="RiderDocumentUpload" component={RiderDocumentUploadScreen} />
        <Stack.Screen name="RestaurantDashboard" component={RestaurantDashboard} />
        <Stack.Screen name="VideoFeed" component={VideoFeedScreen} />
        <Stack.Screen name="RestaurantDetails" component={RestaurantDetails} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
        <Stack.Screen name="Helpline" component={HelplineScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="Offers" component={OffersScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
