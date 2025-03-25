import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { GroupMember } from '../../types/studyGroup';

type AddGroupTaskScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddGroupTask'>;
type AddGroupTaskScreenRouteProp = RouteProp<RootStackParamList, 'AddGroupTask'>;

export const AddGroupTaskScreen: React.FC = () => {
  const navigation = useNavigation<AddGroupTaskScreenNavigationProp>();
  const route = useRoute<AddGroupTaskScreenRouteProp>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchGroupMembers();
  }, []);

  const fetchGroupMembers = async () => {
    try {
      if (!route.params.groupId) {
        console.log('No group ID provided');
        setMembers([]);
        return;
      }

      const { data: membersData, error } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          role,
          user:profiles!inner(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('group_id', route.params.groupId);

      if (error) {
        console.log('No members found or error fetching members:', error.message);
        setMembers([]);
        return;
      }

      if (membersData && membersData.length > 0) {
        const transformedMembers: GroupMember[] = membersData.map((member: any) => ({
          id: member.id,
          group_id: route.params.groupId,
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at || new Date().toISOString(),
          user: {
            id: member.user_id,
            full_name: member.user?.full_name || null,
            avatar_url: member.user?.avatar_url || null
          }
        }));
        setMembers(transformedMembers);
      } else {
        console.log('No members found for this group');
        setMembers([]);
      }
    } catch (error) {
      console.log('Error in fetchGroupMembers:', error);
      setMembers([]);
    }
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a task description');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { error } = await supabase
        .from('group_tasks')
        .insert({
          group_id: route.params.groupId,
          title: title.trim(),
          description: description.trim(),
          assigned_to: assignedTo,
          due_date: dueDate?.toISOString(),
          created_by: user.id,
          status: 'not_started'
        });

      if (error) throw error;

      navigation.goBack();
    } catch (error: any) {
      console.error('Task creation error:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

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
              <Text className="text-2xl font-semibold text-gray-800">New Task</Text>
            </View>
          </View>

          {/* Form */}
          <View className="space-y-4">
            {/* Title Input */}
            <View>
              <Text className="text-gray-700 text-sm mb-1">Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Enter task title"
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200"
                placeholderTextColor="#999"
              />
            </View>

            {/* Description Input */}
            <View>
              <Text className="text-gray-700 text-sm mb-1">Description *</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Enter task description"
                multiline
                numberOfLines={4}
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200"
                placeholderTextColor="#999"
                textAlignVertical="top"
              />
            </View>

            {/* Only show member assignment if there are members */}
            {members.length > 0 && (
              <View>
                <Text className="text-gray-700 text-sm mb-1">Assign To (Optional)</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  className="flex-row space-x-2"
                >
                  {members.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => setAssignedTo(assignedTo === member.user_id ? null : member.user_id)}
                      className={`px-4 py-2 rounded-full border ${
                        assignedTo === member.user_id
                          ? 'bg-[#4B6BFB] border-[#4B6BFB]'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <Text
                        className={`${
                          assignedTo === member.user_id ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {member.user.full_name || 'Unknown User'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Due Date Picker */}
            <View>
              <Text className="text-gray-700 text-sm mb-1">Due Date (Optional)</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200"
              >
                <Text className="text-gray-700">
                  {dueDate ? dueDate.toLocaleDateString() : 'Select due date'}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {/* Create Button */}
            <TouchableOpacity
              onPress={handleCreateTask}
              disabled={loading}
              className={`w-full py-3 rounded-lg bg-[#4B6BFB] flex-row justify-center items-center mt-4 ${
                loading ? 'opacity-50' : 'opacity-100'
              }`}
            >
              <Text className="text-white font-semibold text-lg">
                {loading ? 'Creating...' : 'Create Task'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}; 