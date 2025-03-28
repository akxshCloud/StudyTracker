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

const StatsCircle: React.FC<{
  label: string;
  value: string | number;
  color: string;
}> = ({ label, value, color }) => (
  <View className="items-center flex-1 mx-2">
    <View 
      className="items-center justify-center rounded-full w-[100px] h-[100px]"
      style={{ backgroundColor: color }}
    >
      <Text 
        className="text-2xl font-semibold text-gray-800 mb-1" 
        numberOfLines={1} 
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <View className="px-3">
        <Text 
          className="text-xs text-gray-600 text-center" 
          numberOfLines={2} 
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      </View>
    </View>
  </View>
);

interface MemberWithProfile {
  user_id: string;
  role: string;
  group_id: string;
  auth_users_view: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [showMenu, setShowMenu] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [mostStudiedSubject, setMostStudiedSubject] = useState('');
  const [bestMonth, setBestMonth] = useState({ month: '', hours: 0 });
  const menuAnimation = new Animated.Value(0);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserData(session?.user ? session.user : null);
      if (session?.user) {
        fetchProfileData(session.user.id);
      } else {
        setUserData(null);
        setProfileData(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileData = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      if (profileData) setProfileData(profileData);
    } catch (error) {
      console.error('Error in fetchProfileData:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (userData?.id) {
        fetchProfileData(userData.id);
        fetchSessions();
        fetchStudyGroups();
      }
      return () => {};
    }, [userData])
  );

  const getCurrentDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const formatMonthName = (monthStr: string) => {
    const fullMonthNames: Record<string, string> = {
      'Jan': 'January',
      'Feb': 'February',
      'Mar': 'March',
      'Apr': 'April',
      'May': 'May',
      'Jun': 'June',
      'Jul': 'July',
      'Aug': 'August',
      'Sep': 'September',
      'Oct': 'October',
      'Nov': 'November',
      'Dec': 'December'
    };
    
    const fullName = fullMonthNames[monthStr] || monthStr;
    return fullName.length <= 5 ? fullName : monthStr;
  };

  const fetchSessions = async () => {
    try {
      if (!userData?.id) return;
      
      // Fetch all individual and group sessions
      const { data: individualSessions, error: individualError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userData.id)
        .is('group_id', null)
        .order('created_at', { ascending: false });

      if (individualError) throw individualError;

      const { data: groupSessions, error: groupError } = await supabase
        .from('study_sessions')
        .select('*, group_id')
        .eq('user_id', userData.id)
        .not('group_id', 'is', null)
        .order('created_at', { ascending: false });

      if (groupError) throw groupError;

      // Combine all sessions
      const allSessions = [...(individualSessions || []), ...(groupSessions || [])];
      
      setSessions(allSessions);

      // Calculate metrics
      const today = new Date();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      // Today's hours
      const todaySessions = allSessions.filter(session => {
        const sessionDate = new Date(session.created_at);
        return sessionDate.toDateString() === today.toDateString();
      });
      const todayMinutes = todaySessions.reduce((total, session) => total + session.duration, 0);
      setTodayHours(todayMinutes / 60);

      // Weekly hours
      const weeklyTotalMinutes = allSessions
        .filter(session => new Date(session.created_at) >= oneWeekAgo)
        .reduce((total, session) => total + session.duration, 0);
      setWeeklyHours(weeklyTotalMinutes / 60);

      // Most studied subject
      const subjectMap = allSessions.reduce((acc: Record<string, number>, session) => {
        acc[session.subject] = (acc[session.subject] || 0) + session.duration;
        return acc;
      }, {} as Record<string, number>);
      
      const mostStudied = Object.entries(subjectMap).reduce((a: [string, number], b: [string, number]) => 
        b[1] > a[1] ? b : a, ['', 0]);
      setMostStudiedSubject(mostStudied[0]);

      // Best month
      const monthMap = allSessions.reduce((acc: Record<string, number>, session) => {
        const date = new Date(session.created_at);
        const monthKey = date.toLocaleString('default', { month: 'short' });
        acc[monthKey] = (acc[monthKey] || 0) + session.duration;
        return acc;
      }, {} as Record<string, number>);

      const bestMonthEntry = Object.entries(monthMap).reduce((a: [string, number], b: [string, number]) => 
        b[1] > a[1] ? b : a, ['', 0]);
      setBestMonth({ 
        month: formatMonthName(bestMonthEntry[0]), 
        hours: Math.round(bestMonthEntry[1] / 60) 
      });

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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
      }
    } catch (error) {
      console.error('Error in handleLogout:', error);
    }
  };

  const handleProfile = () => {
    setShowMenu(false);
    navigation.navigate('Profile');
  };

  const fetchStudyGroups = async () => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userData?.id);

      if (memberError) {
        console.error('Error fetching member groups:', memberError);
        return;
      }

      if (!memberData || memberData.length === 0) return;

      const groupIds = memberData.map(member => member.group_id);

      const { data: groupsData, error: groupsError } = await supabase
        .from('study_groups')
        .select('*')
        .in('id', groupIds);

      if (groupsError) {
        console.error('Error fetching groups:', groupsError);
        return;
      }

      // 3. Get all members for these groups
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, role, group_id')
        .in('group_id', groupIds);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        return;
      }

      // 4. Get auth data (email) from auth_users_view
      const memberUserIds = [...new Set((membersData || []).map(m => m.user_id))];
      const { data: authData, error: authError } = await supabase
        .from('auth_users_view')
        .select('id, email')
        .in('id', memberUserIds);

      if (authError) {
        console.error('Error fetching auth data:', authError);
        return;
      }

      // 5. Get profile data (full_name, avatar_url) from profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberUserIds);

      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        return;
      }

      // Create maps for quick lookups
      const authDataMap = (authData || []).reduce((acc, auth) => {
        acc[auth.id] = auth;
        return acc;
      }, {} as Record<string, any>);

      const profileDataMap = (profileData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // 6. Fetch all study sessions for these groups
      const { data: groupSessions, error: groupSessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .in('group_id', groupIds);

      if (groupSessionsError) {
        console.error('Error fetching group sessions:', groupSessionsError);
        return;
      }

      // Calculate total hours for each group
      const groupHours = (groupSessions || []).reduce((acc: Record<string, number>, session) => {
        if (session.group_id) {
          acc[session.group_id] = (acc[session.group_id] || 0) + session.duration;
        }
        return acc;
      }, {});

      // Combine all the data
      const transformedGroups = groupsData.map(group => {
        const groupMembers = (membersData || [])
          .filter(member => member.group_id === group.id)
          .map(member => {
            const auth = authDataMap[member.user_id] || {};
            const profile = profileDataMap[member.user_id] || {};
            return {
              user_id: member.user_id,
              role: member.role,
              user: {
                full_name: profile.full_name || null,
                avatar_url: profile.avatar_url || null,
                email: auth.email || null
              }
            };
          });

        return {
          id: group.id,
          name: group.name,
          created_at: group.created_at,
          creator_id: group.creator_id,
          total_hours: (groupHours[group.id] || 0) / 60, // Convert minutes to hours
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
      <SafeAreaView className="flex-1 bg-white">
        <ScrollView className="flex-1">
          <View className="px-4 py-2">
            {/* Header with Date and Avatar */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-gray-400 text-lg">{getCurrentDate()}</Text>
              <TouchableOpacity 
                onPress={() => setShowMenu(!showMenu)}
                className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden"
              >
                <Image
                  source={
                    profileData?.avatar_url
                      ? { uri: profileData.avatar_url }
                      : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.email?.split('@')[0] || 'User')}&background=random&size=128` }
                  }
                  className="w-10 h-10 rounded-full"
                  onError={() => {
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

            {/* Welcome Message */}
            <View className="mb-6">
              <Text className="text-3xl font-bold text-gray-800">
                Hello {profileData?.full_name?.split(' ')[0] || userData?.email?.split('@')[0] || 'there'}!
              </Text>
            </View>

            {/* Start Studying Button */}
            <TouchableOpacity
              onPress={() => navigation.navigate('AddSession')}
              className="bg-black rounded-full py-4 mb-8"
            >
              <View className="flex-row justify-center items-center">
                <Text className="text-white text-lg font-semibold mr-2">Start Studying</Text>
                <Text className="text-white text-lg">→</Text>
              </View>
            </TouchableOpacity>

            {/* Stats Circles */}
            <View className="flex-row justify-between px-2 mb-8">
              <StatsCircle
                label="Today's Study Time"
                value={`${todayHours.toFixed(1)}hrs`}
                color="#FFE5E5"
              />
              <StatsCircle
                label="Weekly Study Time"
                value={`${weeklyHours.toFixed(1)}hrs`}
                color="#F8E4FF"
              />
              <StatsCircle
                label="Most Time Spent on"
                value={mostStudiedSubject || 'N/A'}
                color="#E4F1FF"
              />
              <StatsCircle
                label="Your Best Month"
                value={bestMonth.month || 'N/A'}
                color="#E4FFE4"
              />
            </View>

            {/* Study Groups Section */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-2xl font-bold text-gray-800">Study Groups</Text>
                <TouchableOpacity onPress={handleCreateGroup}>
                  <Text className="text-[#4B6BFB] text-base">+ New</Text>
                </TouchableOpacity>
              </View>
              
              {studyGroups.length === 0 ? (
                <Text className="text-gray-500 text-center py-4">
                  No study groups yet. Create your first one!
                </Text>
              ) : (
                <View className="space-y-3 px-1">
                  {[...studyGroups]
                    .sort((a, b) => b.total_hours - a.total_hours)
                    .map((group, index) => (
                      <TouchableOpacity
                        key={group.id}
                        onPress={() => navigation.navigate('StudyGroup', { groupId: group.id })}
                        className="bg-[#4B6BFB] rounded-[24px] p-4"
                        style={{
                          height: 180 // Fixed height for consistency
                        }}
                      >
                        <Text className="text-white/70 text-sm">
                          Created on {new Date(group.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <Text className="text-white text-3xl font-bold mt-2 mb-auto">{group.name}</Text>
                        
                        <View className="flex-row justify-between items-end">
                          <View>
                            <Text className="text-white/70 text-sm mb-1">Members</Text>
                            <View className="flex-row">
                              {group.group_members?.slice(0, 3).map((member, idx) => (
                                <View
                                  key={member.user_id}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    marginLeft: idx === 0 ? 0 : -12,
                                    zIndex: 3 - idx,
                                    borderRadius: 18,
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                  }}
                                >
                                  <View
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      overflow: 'hidden',
                                      margin: 2,
                                    }}
                                  >
                                    <Image
                                      source={{
                                        uri: member.user?.avatar_url ||
                                          `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user?.full_name || 'User')}&background=random&size=128`
                                      }}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                      }}
                                      resizeMode="cover"
                                    />
                                  </View>
                                </View>
                              ))}
                              {(group.group_members?.length || 0) > 3 && (
                                <View 
                                  style={{
                                    width: 36,
                                    height: 36,
                                    marginLeft: -12,
                                    borderRadius: 18,
                                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                                    padding: 2,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      borderRadius: 16,
                                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Text className="text-xs text-white">+{(group.group_members?.length || 0) - 3}</Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          </View>
                          <View>
                            <Text className="text-white/70 text-sm mb-1">Total Hours</Text>
                            <Text className="text-white font-semibold text-2xl">
                              {group.total_hours.toFixed(1)} hrs
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                </View>
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