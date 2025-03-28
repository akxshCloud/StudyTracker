import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
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

      // First fetch the group details and total hours from sessions
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .select('*, study_sessions(duration)')
        .eq('id', route.params.groupId.toString())
        .single();

      if (groupError) throw groupError;
      if (!groupData) throw new Error('Group not found');

      // Calculate total hours from sessions
      const totalMinutes = (groupData.study_sessions || []).reduce(
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
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('group_id', route.params.groupId.toString())
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);
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

      // Get auth data (email) from auth_users_view
      const memberUserIds = membersData.map(member => member.user_id);
      const { data: authData, error: authError } = await supabase
        .from('auth_users_view')
        .select('id, email')
        .in('id', memberUserIds);

      if (authError) {
        console.error('Error fetching auth data:', authError);
        return [];
      }

      // Get profile data (full_name, avatar_url) from profiles
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

      // Transform the data
      const transformedMembers = membersData.map(member => {
        const auth = authDataMap[member.user_id] || {};
        const profile = profileDataMap[member.user_id] || {};
        return {
          user_id: member.user_id,
          role: member.role,
          user: {
            id: member.user_id,
            full_name: profile.full_name || null,
            email: auth.email || '',
            avatar_url: profile.avatar_url || null
          }
        };
      });

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
    if (!group?.id) {
      console.error('No group ID available');
      return;
    }
    console.log('Navigating to AddGroupMember with groupId:', group.id);
    navigation.navigate('AddGroupMember', { groupId: group.id });
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
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="px-4 py-2 flex-row justify-between items-center border-b border-gray-100 bg-white">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="mr-3 p-2"
            >
              <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
            </TouchableOpacity>
            <Text className="text-2xl font-semibold text-gray-800">{group?.name}</Text>
          </View>
          <View className="flex-row">
            {isAdmin && (
              <>
                <TouchableOpacity
                  onPress={handleAddMember}
                  className="p-2 mr-2 bg-gray-100 rounded-full"
                >
                  <Ionicons name="person-add-outline" size={22} color="#4B6BFB" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (group?.id) {
                      navigation.navigate('EditGroup', { groupId: group.id });
                    }
                  }}
                  className="p-2 bg-gray-100 rounded-full"
                >
                  <Ionicons name="create-outline" size={22} color="#4B6BFB" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View className="p-4">
          {/* Stats */}
          <View className="flex-row mb-6">
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

          {/* Sessions Section */}
          <View className="mb-6">
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
          <View className="mb-6">
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
          <View className="mb-6">
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}; 