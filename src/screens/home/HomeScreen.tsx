import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface StatsCardProps {
  value: string | number;
  label: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ value, label }) => (
  <View className="bg-white rounded-xl p-4 shadow-sm flex-1 mr-2">
    <Text className="text-[#4B6BFB] text-3xl font-semibold mb-1">{value}</Text>
    <Text className="text-gray-500 text-sm">{label}</Text>
  </View>
);

interface SessionCardProps {
  subject: string;
  date: string;
  duration: string;
}

const SessionCard: React.FC<SessionCardProps> = ({ subject, date, duration }) => (
  <View className="bg-white rounded-xl p-4 shadow-sm mb-3 flex-row justify-between items-center">
    <View>
      <Text className="text-lg font-semibold text-gray-800">{subject}</Text>
      <Text className="text-gray-500">{date}</Text>
    </View>
    <Text className="text-[#4B6BFB] font-medium">{duration}</Text>
  </View>
);

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showMenu, setShowMenu] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const menuAnimation = new Animated.Value(0);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserData(user);
    };
    getUserData();
  }, []);

  useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: showMenu ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showMenu]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Navigate back to loading screen
      navigation.getParent()?.navigate('Loading');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleProfile = () => {
    setShowMenu(false);
    // We'll implement profile navigation later
    // navigation.navigate('Profile');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" scrollEnabled={!showMenu}>
        <View className="px-4 py-2">
          {/* Header with Avatar Menu */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-semibold">Study Tracker</Text>
            <View>
              <TouchableOpacity 
                onPress={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden"
              >
                <Image
                  source={{ uri: `https://ui-avatars.com/api/?name=${userData?.email?.split('@')[0] || 'User'}&background=random` }}
                  className="w-full h-full"
                />
              </TouchableOpacity>

              {/* Dropdown Menu */}
              <Animated.View 
                className="absolute top-10 right-0 bg-white rounded-xl shadow-lg w-36 overflow-hidden"
                style={[
                  Platform.select({
                    ios: {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                    },
                    android: {
                      elevation: 5,
                    },
                  }),
                  {
                    opacity: menuAnimation,
                    transform: [{
                      translateY: menuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    }],
                    zIndex: showMenu ? 50 : -1,
                  },
                ]}
              >
                <TouchableOpacity 
                  className="px-4 py-3 border-b border-gray-100"
                  onPress={handleProfile}
                >
                  <Text className="text-gray-800 font-medium">Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="px-4 py-3"
                  onPress={handleLogout}
                >
                  <Text className="text-red-500 font-medium">Logout</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

          {/* Welcome Message */}
          <View className="mb-6">
            <Text className="text-2xl font-semibold text-gray-800 mb-1">
              Welcome back, {userData?.email?.split('@')[0] || 'User'}!
            </Text>
            <Text className="text-gray-500">Track your study progress</Text>
          </View>

          {/* Stats Cards */}
          <View className="flex-row mb-6">
            <StatsCard value="6.5" label="Hours this week" />
            <StatsCard value="3" label="Study sessions" />
          </View>

          {/* Recent Sessions */}
          <View className="mb-6">
            <Text className="text-xl font-semibold mb-4">Recent Sessions</Text>
            <SessionCard
              subject="Mathematics"
              date="Today"
              duration="2 hours"
            />
            <SessionCard
              subject="Physics"
              date="Yesterday"
              duration="1.5 hours"
            />
            <SessionCard
              subject="Computer Science"
              date="2 days ago"
              duration="3 hours"
            />
          </View>

          {/* Add New Session Button */}
          <TouchableOpacity 
            className="bg-[#4B6BFB] rounded-xl py-4 items-center"
            onPress={() => {/* We'll implement this later */}}
          >
            <Text className="text-white font-semibold text-lg">
              Add New Session
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Backdrop for closing menu */}
      {showMenu && (
        <TouchableOpacity 
          className="absolute inset-0 bg-transparent"
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        />
      )}
    </SafeAreaView>
  );
}; 