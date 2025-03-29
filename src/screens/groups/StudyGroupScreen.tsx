import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { GroupTask, StudySession } from '../../types/studyGroup';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

type StudyGroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'StudyGroup'>;
type StudyGroupScreenRouteProp = RouteProp<RootStackParamList, 'StudyGroup'>;

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface Member {
  user_id: string;
  role: string;
  user: Profile;
}

interface Group {
  id: string;
  name: string;
  members: Member[];
  total_hours: number;
}

interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  creator_id: string;
}

interface StudyGroupWithMembers extends Group {
  tasks: any[];
}

interface GroupMemberWithProfile {
  user_id: string;
  role: string;
  auth_users_view: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TransformedMember {
  user_id: string;
  role: string;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export const StudyGroupScreen: React.FC = () => {
  const navigation = useNavigation<StudyGroupScreenNavigationProp>();
  const route = useRoute<StudyGroupScreenRouteProp>();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<StudyGroupWithMembers | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ id: string; email: string; full_name: string | null } | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshData();
      
      // Set up realtime subscriptions
      const studySessionSubscription = supabase
        .channel('study-sessions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'study_sessions' }, (payload) => {
          refreshData();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            refreshData();
          }
        });

      const taskSubscription = supabase
        .channel('tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
          refreshData();
        })
        .subscribe();

      const memberSubscription = supabase
        .channel('group_members')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, (payload) => {
          refreshData();
        })
        .subscribe();

      return () => {
        studySessionSubscription.unsubscribe();
        taskSubscription.unsubscribe();
        memberSubscription.unsubscribe();
      };
    }, [])
  );

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchGroupDetails(),
        fetchGroupSessions(),
        fetchGroupMembers(route.params.groupId),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // First fetch the group details
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', route.params.groupId.toString())
        .single();

      if (groupError) throw groupError;
      if (!groupData) throw new Error('Group not found');

      // Fetch all study sessions for the group
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('group_id', route.params.groupId.toString());

      if (sessionsError) throw sessionsError;

      // Calculate total hours from all sessions
      const totalMinutes = (sessionsData || []).reduce(
        (sum: number, session: { duration: number }) => sum + (session.duration || 0),
        0
      );
      const totalHours = totalMinutes / 60;

      // Then fetch the members
      const members = await fetchGroupMembers(route.params.groupId.toString());

      // Finally fetch the tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('group_tasks')
        .select('id, title, description, status, due_date, created_at, group_id, assigned_to')
        .eq('group_id', route.params.groupId.toString());

      if (tasksError) throw tasksError;

      // Update the group data with calculated total hours
      const fullGroupData: StudyGroupWithMembers = {
        ...groupData,
        total_hours: totalHours,
        members: members,
        tasks: tasks || []
      };

      setGroup(fullGroupData);
      
      // Check if current user is admin
      const userMember = members.find(member => member.user_id === user.id);
      setIsAdmin(userMember?.role === 'admin');
    } catch (error: any) {
      console.error('Error fetching group data:', error);
      Alert.alert('Error', 'Failed to load group data');
    }
  };

  const fetchGroupSessions = async () => {
    try {
      // First fetch all sessions for the group
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('group_id', route.params.groupId.toString())
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessionsData) return;

      // Get unique user IDs from sessions
      const userIds = [...new Set(sessionsData.map(session => session.user_id))];

      // Get user data from auth_users_view
      const { data: authData, error: authError } = await supabase
        .from('auth_users_view')
        .select('id, email')
        .in('id', userIds);

      if (authError) {
        console.error('Error fetching auth data:', authError);
        return;
      }

      // Get profile data separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        return;
      }

      // Create lookup maps
      const authMap = (authData || []).reduce((acc, auth) => {
        acc[auth.id] = auth;
        return acc;
      }, {} as Record<string, any>);

      const profileMap = (profileData || []).reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Combine the data
      const sessionsWithUserData = sessionsData.map(session => {
        const auth = authMap[session.user_id];
        const profile = profileMap[session.user_id] || {};

        return {
          ...session,
          user: auth ? {
            id: auth.id,
            email: auth.email,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null
          } : null
        };
      });

      setSessions(sessionsWithUserData);
    } catch (error: any) {
      console.error('Error fetching group sessions:', error);
    }
  };

  const fetchGroupMembers = async (groupId: string): Promise<TransformedMember[]> => {
    try {
      // First get the group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', groupId);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        return [];
      }

      if (!membersData || membersData.length === 0) {
        return [];
      }

      const memberUserIds = membersData.map(member => member.user_id);

      // Get user data from auth_users_view
      const { data: authData, error: authError } = await supabase
        .from('auth_users_view')
        .select('id, email')
        .in('id', memberUserIds);

      if (authError) {
        console.error('Error fetching auth data:', authError);
        return [];
      }

      // Get only full_name and avatar_url from profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberUserIds);

      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        return [];
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

      // Transform the data, prioritizing auth_users_view for id and email
      const transformedMembers = membersData.map(member => {
        const auth = authDataMap[member.user_id];
        const profile = profileDataMap[member.user_id] || {};

        if (!auth) {
          console.error('No auth data found for user:', member.user_id);
          return null;
        }

        return {
          user_id: auth.id,
          role: member.role,
          user: {
            id: auth.id,
            full_name: profile.full_name || null,
            email: auth.email,
            avatar_url: profile.avatar_url || null
          }
        };
      }).filter(Boolean) as TransformedMember[];

      return transformedMembers;
    } catch (error) {
      console.error('Error in fetchGroupMembers:', error);
      return [];
    }
  };

  const handleAddTask = () => {
    if (!group?.id) return;
    navigation.navigate('AddGroupTask', { groupId: group.id });
  };

  const handleAddMember = () => {
    setShowAddMemberModal(true);
  };

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    
    setSearching(true);
    setSearchResult(null);
    
    try {
      // First get the user from auth_users_view
      const { data: userData, error: userError } = await supabase
        .from('auth_users_view')
        .select('id, email')
        .ilike('email', searchEmail.trim())
        .single();

      if (userError) throw userError;
      
      if (userData) {
        // Check if user is already a member
        const isMember = group?.members.some(member => member.user_id === userData.id);
        if (isMember) {
          Alert.alert('Error', 'This user is already a member of the group');
          return;
        }

        // Then get their profile information
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userData.id)
          .single();
        
        setSearchResult({
          id: userData.id,
          email: userData.email,
          full_name: profileData?.full_name || null
        });
      } else {
        Alert.alert('Not Found', 'No user found with this email address');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      Alert.alert('Error', 'Failed to search for user');
    } finally {
      setSearching(false);
    }
  };

  const handleAddFoundMember = async () => {
    if (!searchResult || !group?.id) return;
    
    setAddingMember(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: searchResult.id,
          role: 'member'
        });

      if (error) throw error;

      // Refresh group data
      await refreshData();
      
      // Reset and close modal
      setSearchEmail('');
      setSearchResult(null);
      setShowAddMemberModal(false);
      Alert.alert('Success', 'Member added successfully');
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert('Error', 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleAddSession = () => {
    if (!group?.id) return;
    navigation.navigate('AddSession', { groupId: group.id });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    if (hours === 0) {
      return `${remainingMinutes} min`;
    } else if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-50', text: 'text-green-600' };
      case 'in_progress':
      case 'pending':
        return { bg: 'bg-blue-50', text: 'text-blue-600' };
      case 'on_hold':
        return { bg: 'bg-orange-50', text: 'text-orange-600' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle-outline';
      case 'in_progress':
      case 'pending':
        return 'time-outline';
      case 'on_hold':
        return 'pause-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
      case 'pending':
        return 'In Progress';
      case 'on_hold':
        return 'On Hold';
      case 'completed':
        return 'Completed';
      default:
        return 'Not Started';
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <LottieView
          source={Platform.select({
            ios: require('../../assets/animations/loading.lottie'),
            android: require('../../assets/animations/loading.json'),
          })}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
      </View>
    );
  }

  if (!group) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-500">Group not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View 
        style={{ 
          height: Platform.OS === 'ios' ? 54 : 56,
          paddingTop: Platform.OS === 'ios' ? 10 : 0,
          backgroundColor: 'white'
        }}
        className="px-3 flex-row justify-between items-center"
      >
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold text-gray-800 flex-1" numberOfLines={1}>
            {group?.name || 'Study Group'}
          </Text>
        </View>
        {isAdmin && (
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={handleAddMember}
              className="mr-2 p-2"
            >
              <Ionicons name="person-add-outline" size={24} color="#4B6BFB" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => navigation.navigate('EditGroup', { groupId: route.params.groupId })}
              className="p-2"
            >
              <Ionicons name="settings-outline" size={24} color="#4B6BFB" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main Content */}
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Stats Cards */}
        <View className="flex-row px-4 py-4 space-x-4">
          <View className="bg-white rounded-xl p-4 shadow-sm flex-1 mr-2">
            <Text className="text-[#4B6BFB] text-3xl font-semibold mb-1">
              {group?.total_hours.toFixed(1)}
            </Text>
            <Text className="text-gray-500 text-sm">Total Hours</Text>
          </View>
          <View className="bg-white rounded-xl p-4 shadow-sm flex-1 ml-2">
            <Text className="text-[#4B6BFB] text-3xl font-semibold mb-1">
              {group?.members.length}
            </Text>
            <Text className="text-gray-500 text-sm">Members</Text>
          </View>
        </View>

        {/* Study Sessions Section */}
        <View className="px-4 mt-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-gray-800">Study Sessions</Text>
            <TouchableOpacity onPress={handleAddSession}>
              <Text className="text-[#4B6BFB]">Add Session</Text>
            </TouchableOpacity>
          </View>
          {sessions.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">No study sessions yet</Text>
          ) : (
            sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                className="bg-white rounded-xl p-4 shadow-sm mb-3"
                onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}
              >
                <Text className="text-lg font-semibold text-gray-800 mb-1">{session.subject}</Text>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500">
                    {new Date(session.created_at).toLocaleDateString()}
                  </Text>
                  <Text className="text-[#4B6BFB]">
                    {formatDuration(session.duration)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Tasks Section */}
        <View className="px-4 mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-gray-800">Tasks</Text>
            <TouchableOpacity onPress={handleAddTask}>
              <Text className="text-[#4B6BFB]">Add Task</Text>
            </TouchableOpacity>
          </View>
          {group.tasks.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">No tasks yet</Text>
          ) : (
            group.tasks.map((task: GroupTask) => (
              <TouchableOpacity
                key={task.id}
                className="bg-white rounded-xl p-4 shadow-sm mb-3"
                onPress={() => {
                  console.log('Task clicked:', task);  // Debug log
                  navigation.navigate('TaskDetails', { taskId: task.id });
                }}
              >
                <Text className="text-lg font-semibold text-gray-800 mb-1">{task.title}</Text>
                <View className="flex-row justify-between items-center">
                  <View className={`flex-row items-center px-3 py-1 rounded-full ${getStatusColor(task.status).bg}`}>
                    <View className="w-4 h-4 items-center justify-center">
                      <Ionicons
                        name={getStatusIcon(task.status)}
                        size={15}
                        color={getStatusColor(task.status).text.replace('text-', '')}
                      />
                    </View>
                    <Text className={`${getStatusColor(task.status).text} font-medium ml-2`}>
                      {getDisplayStatus(task.status)}
                    </Text>
                  </View>
                  {task.due_date && (
                    <Text className="text-[#4B6BFB]">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Members Section */}
        <View className="px-4 mt-8">
          <Text className="text-xl font-semibold text-gray-800 mb-4">Members</Text>
          {group.members.map((member) => (
            <View key={member.user_id} className="bg-white rounded-xl p-4 shadow-sm mb-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-gray-800">
                  {member.user.full_name || member.user.email.split('@')[0]}
                </Text>
                <Text className="text-[#4B6BFB] capitalize">{member.role}</Text>
              </View>
              <Text className="text-gray-500 text-sm">{member.user.email}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showAddMemberModal}
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 items-center justify-center"
          activeOpacity={1}
          onPress={() => setShowAddMemberModal(false)}
        >
          <View className="w-[90%] max-w-[400px] bg-white rounded-2xl overflow-hidden">
            <TouchableOpacity activeOpacity={1}>
              <View className="p-6 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xl font-semibold text-gray-800">Add Member</Text>
                  <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-500">Search for a user by email address</Text>
              </View>

              <View className="p-6">
                <View className="flex-row items-center space-x-2 mb-6">
                  <View className="flex-1 flex-row items-center bg-gray-50 rounded-xl">
                    <TextInput
                      value={searchEmail}
                      onChangeText={setSearchEmail}
                      placeholder="Enter email address"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="flex-1 px-4 h-12 text-base text-gray-800"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      onPress={handleSearchUser}
                      disabled={searching || !searchEmail.trim()}
                      className={`p-2 mr-2 rounded-full ${
                        searching || !searchEmail.trim() ? 'opacity-50' : ''
                      }`}
                    >
                      {searching ? (
                        <ActivityIndicator color="#4B6BFB" />
                      ) : (
                        <Ionicons 
                          name="search" 
                          size={22} 
                          color={searchEmail.trim() ? "#4B6BFB" : "#9CA3AF"} 
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {searchResult && (
                  <View className="bg-gray-50 rounded-xl p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-4">
                        <Text className="text-base font-medium text-gray-800">
                          {searchResult.full_name || searchResult.email.split('@')[0]}
                        </Text>
                        <Text className="text-sm text-gray-500">{searchResult.email}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleAddFoundMember}
                        disabled={addingMember}
                        className={`p-2 rounded-full bg-[#4B6BFB] ${addingMember ? 'opacity-50' : ''}`}
                      >
                        {addingMember ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Ionicons name="person-add" size={20} color="white" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Chat Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('GroupMessages', { groupId: route.params.groupId })}
        className="absolute bottom-6 right-6 w-14 h-14 bg-[#4B6BFB] rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: '#4B6BFB',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 8
        }}
      >
        <Ionicons name="chatbubble-outline" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}; 