import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/home/HomeScreen';
import { AddSessionScreen } from '../screens/sessions/AddSessionScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  AddSession: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AddSession" 
        component={AddSessionScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: '#F9FAFB',
          },
        }}
      />
    </Stack.Navigator>
  );
}; 