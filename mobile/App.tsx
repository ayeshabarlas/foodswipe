import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { CartProvider } from './src/context/CartContext';
import NetInfo from '@react-native-community/netinfo';
import { processOfflineQueue } from './src/utils/cache';
import apiClient from './src/api/apiClient';

export default function App() {
  useEffect(() => {
    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('🌐 App is online, processing offline queue...');
        processOfflineQueue(apiClient);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <CartProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <AppNavigator />
          <StatusBar style="auto" />
        </View>
      </GestureHandlerRootView>
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
