import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type AddGroupTaskScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddGroupTask'>;
type AddGroupTaskScreenRouteProp = RouteProp<RootStackParamList, 'AddGroupTask'>;
type DateOption = 'today' | 'tomorrow' | 'next_week' | 'custom';

interface GroupMember {
  user_id: string;
  role: string;
  group_id: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const AddGroupTaskScreen: React.FC = () => {
  const navigation = useNavigation<AddGroupTaskScreenNavigationProp>();
  const route = useRoute<AddGroupTaskScreenRouteProp>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    fetchGroupMembers();
  }, [route.params.groupId]);

  const fetchGroupMembers = async () => {
    if (!route.params.groupId) return;

    try {
      // Get group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', route.params.groupId);

      if (membersError) throw membersError;
      if (!membersData || membersData.length === 0) return;

      // Get member profiles for assignee options
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', membersData.map(member => member.user_id));

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      if (!profiles) return;

      // Set up assignee options
      const memberOptions = profiles.map(profile => ({
        label: profile.full_name || 'Unnamed User',
        value: profile.id,
      }));

      setAssigneeOptions(memberOptions);

      // Transform the data for members list
      const transformedMembers = membersData.map(member => {
        const profile = profiles.find(p => p.id === member.user_id);
        return {
          user_id: member.user_id,
          role: member.role,
          group_id: route.params.groupId,
          user: {
            id: member.user_id,
            full_name: profile?.full_name || 'Unknown User',
            avatar_url: profile?.avatar_url || null
          }
        };
      });

      setMembers(transformedMembers);
    } catch (error) {
      console.error('Error in fetchGroupMembers:', error);
      Alert.alert('Error', 'Failed to fetch group members');
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

  const formatDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const CustomCalendar = ({
    selectedDate,
    onSelectDate,
  }: {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
  }) => {
    const [displayDate, setDisplayDate] = useState(selectedDate);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    const goToPreviousMonth = () => {
      setDisplayDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
      setDisplayDate(new Date(year, month + 1, 1));
    };

    const isSelectedDate = (date: Date) => {
      return date.toDateString() === selectedDate.toDateString();
    };

    const isToday = (date: Date) => {
      return date.toDateString() === new Date().toDateString();
    };

    return (
      <View className="w-full">
        {/* Month and Year Header */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity onPress={goToPreviousMonth} className="w-12 h-12 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold text-gray-800">
            {months[month]} {year}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} className="w-12 h-12 items-center justify-center">
            <Ionicons name="chevron-forward" size={24} color="#4B6BFB" />
          </TouchableOpacity>
        </View>

        {/* Weekday Headers */}
        <View className="flex-row justify-between mb-2">
          {weekDays.map((day) => (
            <View key={day} className="flex-1 items-center">
              <Text className="text-sm font-medium text-gray-500">{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View className="flex-row flex-wrap">
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <View key={`empty-${index}`} className="w-[14.28%] h-10" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const date = new Date(year, month, index + 1);
            const isSelected = isSelectedDate(date);
            const isTodayDate = isToday(date);

            return (
              <TouchableOpacity
                key={index}
                onPress={() => onSelectDate(date)}
                className="w-[14.28%] h-10 items-center justify-center"
              >
                <View className={`w-10 h-10 items-center justify-center rounded-full ${
                  isSelected ? 'bg-[#4B6BFB]' : ''
                }`}>
                  <Text className={`text-base ${
                    isSelected
                      ? 'text-white font-medium'
                      : isTodayDate
                      ? 'text-[#4B6BFB] font-medium'
                      : 'text-gray-800'
                  }`}>
                    {index + 1}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const DatePickerModal = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const handleDateOption = (option: DateOption) => {
      switch (option) {
        case 'today':
          setDueDate(new Date());
          setShowDatePicker(false);
          break;
        case 'tomorrow':
          setDueDate(tomorrow);
          setShowDatePicker(false);
          break;
        case 'next_week':
          setDueDate(nextWeek);
          setShowDatePicker(false);
          break;
        case 'custom':
          setShowDatePicker(false);
          setShowCustomDatePicker(true);
          break;
      }
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showDatePicker}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl">
              <View className="p-6 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xl font-semibold text-gray-800">Select Due Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-500">Choose a due date for this task</Text>
              </View>
              
              <View className="p-6">
                <TouchableOpacity
                  onPress={() => handleDateOption('today')}
                  className="flex-row items-center justify-between p-4 mb-3 bg-gray-50 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-4">
                      <Ionicons name="today-outline" size={20} color="#4B6BFB" />
                    </View>
                    <Text className="text-base font-medium text-gray-800">Today</Text>
                  </View>
                  <Text className="text-gray-500">{formatDate(today)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDateOption('tomorrow')}
                  className="flex-row items-center justify-between p-4 mb-3 bg-gray-50 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-4">
                      <Ionicons name="calendar-outline" size={20} color="#4B6BFB" />
                    </View>
                    <Text className="text-base font-medium text-gray-800">Tomorrow</Text>
                  </View>
                  <Text className="text-gray-500">{formatDate(tomorrow)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDateOption('next_week')}
                  className="flex-row items-center justify-between p-4 mb-3 bg-gray-50 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-4">
                      <Ionicons name="calendar-outline" size={20} color="#4B6BFB" />
                    </View>
                    <Text className="text-base font-medium text-gray-800">Next week</Text>
                  </View>
                  <Text className="text-gray-500">{formatDate(nextWeek)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDateOption('custom')}
                  className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl"
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-4">
                      <Ionicons name="calendar" size={20} color="#4B6BFB" />
                    </View>
                    <Text className="text-base font-medium text-gray-800">Custom date</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const CustomDatePickerModal = () => {
    const [tempSelectedDate, setTempSelectedDate] = useState<Date>(dueDate || new Date());

    const handleConfirm = () => {
      setDueDate(tempSelectedDate);
      setShowCustomDatePicker(false);
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCustomDatePicker}
        onRequestClose={() => setShowCustomDatePicker(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowCustomDatePicker(false)}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity 
              activeOpacity={1}
              className="bg-white rounded-t-3xl"
            >
              <View className="p-6 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xl font-semibold text-gray-800">Choose Date</Text>
                  <TouchableOpacity onPress={() => setShowCustomDatePicker(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-500">Select a specific date</Text>
              </View>
              
              <View className="px-4 pt-4 pb-6">
                <CustomCalendar
                  selectedDate={tempSelectedDate}
                  onSelectDate={setTempSelectedDate}
                />
                
                <View className="mt-4 flex-row justify-end border-t border-gray-100 pt-4">
                  <TouchableOpacity
                    onPress={() => setShowCustomDatePicker(false)}
                    className="py-3 px-6 rounded-lg mr-2"
                  >
                    <Text className="text-gray-600 font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className="bg-[#4B6BFB] py-3 px-6 rounded-lg"
                  >
                    <Text className="text-white font-medium">Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

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
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 p-2"
          >
            <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold text-gray-800">New Task</Text>
        </View>
        <TouchableOpacity 
          onPress={handleCreateTask}
          disabled={loading}
          className="p-2 bg-[#4B6BFB] rounded-full"
        >
          <Ionicons name="checkmark" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 pt-4">
        {/* Task Details Card */}
        <View className="bg-white rounded-xl shadow-sm mx-4 flex-1">
          <View className="p-8">
            <View className="mb-8">
              <Text className="text-gray-500 text-sm mb-2">Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Enter task title"
                className="border border-gray-200 rounded-2xl px-4 h-12 text-gray-800 text-base bg-gray-50 flex items-center"
                placeholderTextColor="#999"
              />
            </View>

            <View className="mb-8">
              <Text className="text-gray-500 text-sm mb-2">Description *</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Enter task description"
                multiline
                numberOfLines={4}
                className="border border-gray-200 rounded-2xl px-4 py-2.5 text-gray-800 text-base bg-gray-50 min-h-[120px]"
                placeholderTextColor="#999"
                textAlignVertical="top"
              />
            </View>

            {members.length > 0 && (
              <View className="mb-8">
                <Text className="text-gray-500 text-sm mb-2">Assign To (Optional)</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  className="flex-row space-x-2"
                >
                  {members.map((member) => (
                    <TouchableOpacity
                      key={member.user_id}
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

            <View>
              <Text className="text-gray-500 text-sm mb-2">Due Date (Optional)</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="border border-gray-200 rounded-2xl p-4 flex-row items-center bg-gray-50"
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={20} 
                  color="#4B6BFB" 
                  style={{ marginRight: 8 }}
                />
                <Text className="text-gray-800 text-base">
                  {dueDate ? formatDate(dueDate) : 'Set due date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <DatePickerModal />
      <CustomDatePickerModal />
    </SafeAreaView>
  );
}; 