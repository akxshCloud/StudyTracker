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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface StatsCardProps {
  value: string | number;
  label: string;
}

const formatDuration = (minutes: number) => {
  const hours = minutes / 60;
  if (hours < 1) {
    return `${minutes} min`;
  } else if (Number.isInteger(hours)) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  return `${hours.toFixed(1)} hours`;
};

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

interface StudySession {
  id: number;
  subject: string;
  duration: number;
  created_at: string;
  user_id: string;
}

const SessionCard: React.FC<SessionCardProps> = ({ subject, date, duration }) => (
  <View className="bg-white rounded-xl p-4 shadow-sm mb-3 flex-row justify-between items-center">
    <View>
      <Text className="text-lg font-semibold text-gray-800">{subject}</Text>
      <Text className="text-gray-500">{date}</Text>
    </View>
    <Text className="text-[#4B6BFB] font-medium">{formatDuration(Number(duration))}</Text>
  </View>
);

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showMenu, setShowMenu] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const menuAnimation = new Animated.Value(0);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserData(user);

      // Fetch profile data including avatar_url
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserData(prev => ({ ...prev, ...profile }));
        }
      }
    };
    getUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (userData) {
        fetchSessions();
      }
    }, [userData])
  );

  const fetchSessions = async () => {
    try {
      // Fetch all sessions for the current user
      const { data: allSessions, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(allSessions || []);

      // Calculate weekly hours
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const weeklyTotalMinutes = (allSessions || [])
        .filter(session => new Date(session.created_at) >= oneWeekAgo)
        .reduce((total, session) => total + session.duration, 0);

      setWeeklyHours(weeklyTotalMinutes / 60); // Convert minutes to hours
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

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
    navigation.navigate('Profile');
  };

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setProfileData(profile);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  return (
    <View className="flex-1">
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView className="flex-1">
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
                    source={
                      profileData?.avatar_url
                        ? { uri: profileData.avatar_url }
                        : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData?.full_name || userData?.email?.split('@')[0] || 'User')}&background=random&size=128` }
                    }
                    className="w-10 h-10 rounded-full"
                    onError={() => {
                      console.error('Error loading avatar in HomeScreen');
                      // Reset to default avatar on error
                      if (profileData?.avatar_url) {
                        setProfileData(prev => ({ ...prev, avatar_url: null }));
                      }
                    }}
                  />
                </TouchableOpacity>
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
              <StatsCard value={weeklyHours.toFixed(1)} label="Hours this week" />
              <StatsCard value={sessions.length} label="Study sessions" />
            </View>

            {/* Recent Sessions */}
            <View className="mb-6">
              <Text className="text-xl font-semibold mb-4">Recent Sessions</Text>
              {sessions.length === 0 ? (
                <Text className="text-gray-500 text-center py-4">
                  No study sessions yet. Add your first one!
                </Text>
              ) : (
                sessions.slice(0, 3).map(session => (
                  <SessionCard
                    key={session.id}
                    subject={session.subject}
                    date={formatDate(session.created_at)}
                    duration={session.duration.toString()}
                  />
                ))
              )}
            </View>

            {/* Add New Session Button */}
            <TouchableOpacity 
              className="bg-[#4B6BFB] rounded-xl py-4 items-center"
              onPress={() => navigation.navigate('AddSession')}
            >
              <Text className="text-white font-semibold text-lg">
                Add New Session
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Menu and Backdrop as portal-like overlay */}
      {showMenu && (
        <View 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
          }}
        >
          <TouchableOpacity 
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          />
          
          <View 
            style={{ 
              position: 'absolute',
              top: Platform.OS === 'ios' ? 105 : 80,
              right: 20,
              backgroundColor: 'white',
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 5,
              width: 140,
              overflow: 'hidden',
              zIndex: 1001,
            }}
          >
            <TouchableOpacity 
              className="px-4 py-3 border-b border-gray-100 active:bg-gray-50"
              onPress={handleProfile}
            >
              <Text className="text-gray-800 font-medium">Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="px-4 py-3 active:bg-gray-50"
              onPress={handleLogout}
            >
              <Text className="text-red-500 font-medium">Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}; 