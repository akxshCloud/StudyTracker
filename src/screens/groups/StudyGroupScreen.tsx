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
import { StudyGroupWithMembers, GroupTask, GroupMember } from '../../types/studyGroup';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

type StudyGroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'StudyGroup'>;
type StudyGroupScreenRouteProp = RouteProp<RootStackParamList, 'StudyGroup'>;

export const StudyGroupScreen: React.FC = () => {
  const navigation = useNavigation<StudyGroupScreenNavigationProp>();
  const route = useRoute<StudyGroupScreenRouteProp>();
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<StudyGroupWithMembers | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const minimumLoadingTime = 3000; // 3 seconds

    fetchGroupDetails().then(() => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minimumLoadingTime - elapsedTime);
      
      // Wait for the remaining time before hiding the loading screen
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    });
  }, []);

  const fetchGroupDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // First fetch the group details
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .select('*')
        .eq('id', route.params.groupId)
        .single();

      if (groupError) throw groupError;
      if (!groupData) throw new Error('Group not found');

      // Then fetch the members
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', route.params.groupId);

      if (membersError) throw membersError;

      // Fetch profiles for all members
      const memberIds = members?.map(member => member.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      // Finally fetch the tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('group_tasks')
        .select('*')
        .eq('group_id', route.params.groupId);

      if (tasksError) throw tasksError;

      // Transform the members data to match our types
      const transformedMembers = members?.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          ...member,
          user: {
            id: member.user_id,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null
          }
        } as GroupMember;
      }) || [];

      // Combine all the data
      const fullGroupData: StudyGroupWithMembers = {
        ...groupData,
        members: transformedMembers,
        tasks: tasks || []
      };

      setGroup(fullGroupData);
      
      // Check if current user is admin
      const userMember = transformedMembers.find(member => member.user_id === user.id);
      setIsAdmin(userMember?.role === 'admin');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAddTask = () => {
    // Navigate to add task screen
    navigation.navigate('AddGroupTask', { groupId: route.params.groupId });
  };

  const handleAddMember = () => {
    // Navigate to add member screen
    navigation.navigate('AddGroupMember', { groupId: route.params.groupId });
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
        <View className="px-4 py-2">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="mr-3"
              >
                <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
              </TouchableOpacity>
              <Text className="text-2xl font-semibold text-gray-800">{group.name}</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => navigation.navigate('EditGroup', { groupId: group.id })}
                className="p-2"
              >
                <Text className="text-[#4B6BFB]">Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          <View className="flex-row mb-6">
            <View className="bg-white rounded-xl p-4 shadow-sm flex-1 mr-2">
              <Text className="text-[#4B6BFB] text-3xl font-semibold mb-1">
                {group.total_hours.toFixed(1)}
              </Text>
              <Text className="text-gray-500 text-sm">Total Hours</Text>
            </View>
            <View className="bg-white rounded-xl p-4 shadow-sm flex-1 ml-2">
              <Text className="text-[#4B6BFB] text-3xl font-semibold mb-1">
                {group.members.length}
              </Text>
              <Text className="text-gray-500 text-sm">Members</Text>
            </View>
          </View>

          {/* Tasks Section */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-800">Tasks</Text>
              {isAdmin && (
                <TouchableOpacity onPress={handleAddTask}>
                  <Text className="text-[#4B6BFB]">Add Task</Text>
                </TouchableOpacity>
              )}
            </View>
            {group.tasks.length === 0 ? (
              <Text className="text-gray-500 text-center py-4">No tasks yet</Text>
            ) : (
              group.tasks.map((task: GroupTask) => (
                <TouchableOpacity
                  key={task.id}
                  className="bg-white rounded-xl p-4 shadow-sm mb-3"
                  onPress={() => navigation.navigate('TaskDetails', { taskId: task.id })}
                >
                  <Text className="text-lg font-semibold text-gray-800 mb-1">{task.title}</Text>
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-500">{task.status}</Text>
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
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-800">Members</Text>
              {isAdmin && (
                <TouchableOpacity onPress={handleAddMember}>
                  <Text className="text-[#4B6BFB]">Add Member</Text>
                </TouchableOpacity>
              )}
            </View>
            {group.members.map((member) => (
              <View key={member.id} className="bg-white rounded-xl p-4 shadow-sm mb-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-lg font-semibold text-gray-800">
                    {member.user.full_name || 'Unknown User'}
                  </Text>
                  <Text className="text-[#4B6BFB] capitalize">{member.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}; 