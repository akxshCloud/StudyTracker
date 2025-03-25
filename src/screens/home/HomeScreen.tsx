import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { StudyGroup } from '../../types/studyGroup';
import { StudyGroupCard } from '../../components/groups/StudyGroupCard';
import { UserData, UserProfile } from '../../types/user';

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
  id: number;
  subject: string;
  date: string;
  duration: string;
  onPress: () => void;
}

interface StudySession {
  id: number;
  subject: string;
  duration: number;
  created_at: string;
  user_id: string;
}

const SessionCard: React.FC<SessionCardProps> = ({ id, subject, date, duration, onPress }) => (
  <TouchableOpacity 
    onPress={onPress}
    className="bg-white rounded-xl p-4 shadow-sm mb-3"
  >
    <Text className="text-lg font-semibold text-gray-800">{subject}</Text>
    <View className="flex-row justify-between items-center">
      <Text className="text-gray-500">{date}</Text>
      <Text className="text-[#4B6BFB] font-medium">{duration}</Text>
    </View>
  </TouchableOpacity>
);

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showMenu, setShowMenu] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const menuAnimation = new Animated.Value(0);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserData(user);

      // Fetch profile data including avatar_url
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, bio, created_at, updated_at')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUserData({ ...user, ...profileData });
        setProfileData({
          id: user.id,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          bio: profileData.bio
        });
      }
    };
    getUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (userData?.id) {
        // Fetch profile data including avatar_url
        const fetchProfileData = async () => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, bio, created_at, updated_at')
            .eq('id', userData.id)
            .single();

          if (profileData) {
            setProfileData({
              id: userData.id,
              full_name: profileData.full_name,
              avatar_url: profileData.avatar_url,
              bio: profileData.bio
            });
          }
        };

        fetchProfileData();
        fetchSessions();
        fetchStudyGroups();
      }
      // Adding an empty cleanup function to satisfy the useCallback hook
      return () => {};
    }, [userData]) // Only depend on userData to prevent unnecessary refreshes
  );

  const fetchSessions = async () => {
    try {
      if (!userData?.id) return;
      
      // Fetch all sessions for the current user that are not group sessions
      const { data: allSessions, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userData.id)
        .is('group_id', null) // Only fetch sessions that are not part of any group
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(allSessions || []);

      // Calculate weekly hours (only from individual sessions)
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

  const fetchStudyGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        return;
      }

      // 1. First get the group IDs where the user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching member groups:', memberError);
        return;
      }

      if (!memberGroups || memberGroups.length === 0) {
        setStudyGroups([]);
        return;
      }

      const groupIds = memberGroups.map(mg => mg.group_id);

      // 2. Then get the study groups data for these IDs
      const { data: groups, error: groupsError } = await supabase
        .from('study_groups')
        .select('*')
        .in('id', groupIds);

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
        return;
      }

      if (!groups) {
        setStudyGroups([]);
        return;
      }

      // 3. Get all members for these groups
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .in('group_id', groupIds);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        return;
      }

      // 4. Get profiles for all members
      const memberUserIds = membersData?.map(member => member.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberUserIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // 5. Get auth users data
      const { data: authUsersData, error: authUsersError } = await supabase
        .from('auth_users_view')
        .select('*')
        .in('id', memberUserIds);

      if (authUsersError) {
        console.error('Error fetching auth users:', authUsersError);
        return;
      }

      // Combine all the data
      const transformedGroups = groups.map(group => {
        const groupMembers = membersData
          ?.filter(member => member.group_id === group.id)
          .map(member => {
            const profile = profilesData?.find(p => p.id === member.user_id);
            const authUser = authUsersData?.find(u => u.id === member.user_id);
            
            return {
              user_id: member.user_id,
              role: member.role,
              user: {
                full_name: profile?.full_name || null,
                avatar_url: profile?.avatar_url || null,
                email: authUser?.email || null
              }
            };
          }) || [];

        return {
          id: group.id,
          name: group.name,
          created_at: group.created_at,
          creator_id: group.creator_id,
          total_hours: group.total_hours,
          group_members: groupMembers
        };
      });

      setStudyGroups(transformedGroups);
    } catch (error) {
      console.error('Error fetching study groups:', error);
      setStudyGroups([]);
    }
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
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
                        setProfileData(prev => prev ? {
                          ...prev,
                          avatar_url: null
                        } : null);
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
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-semibold">Recent Sessions</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('AddSession')}
                  className="flex-row items-center"
                >
                  <Text className="text-[#4B6BFB] font-medium mr-1">New</Text>
                  <Text className="text-[#4B6BFB] font-medium text-lg">+</Text>
                </TouchableOpacity>
              </View>
              {sessions.length === 0 ? (
                <Text className="text-gray-500 text-center py-4">
                  No study sessions yet. Add your first one!
                </Text>
              ) : (
                sessions.slice(0, 3).map((session) => (
                  <SessionCard
                    key={session.id}
                    id={session.id}
                    subject={session.subject}
                    date={formatDate(session.created_at)}
                    duration={formatDuration(session.duration)}
                    onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}
                  />
                ))
              )}
            </View>

            {/* Study Groups */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-semibold">Study Groups</Text>
                <TouchableOpacity 
                  onPress={handleCreateGroup}
                  className="flex-row items-center"
                >
                  <Text className="text-[#4B6BFB] font-medium mr-1">New</Text>
                  <Text className="text-[#4B6BFB] font-medium text-lg">+</Text>
                </TouchableOpacity>
              </View>
              {studyGroups.length === 0 ? (
                <Text className="text-gray-500 text-center py-4">
                  No study groups yet. Create your first one!
                </Text>
              ) : (
                studyGroups.slice(0, 3).map((group, index) => (
                  <StudyGroupCard
                    key={group.id}
                    group={group}
                    index={index}
                    onPress={(group) => navigation.navigate('StudyGroup', { groupId: group.id })}
                  />
                ))
              )}
            </View>
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