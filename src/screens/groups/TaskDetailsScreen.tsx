import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { GroupTask, GroupMember, UserProfile } from '../../types/studyGroup';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type TaskDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskDetails'>;
type TaskDetailsScreenRouteProp = RouteProp<RootStackParamList, 'TaskDetails'>;

type TaskStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed';
type LegacyTaskStatus = TaskStatus | 'pending';
type DateOption = 'today' | 'tomorrow' | 'next_week' | 'custom';

export const TaskDetailsScreen: React.FC = () => {
  const navigation = useNavigation<TaskDetailsScreenNavigationProp>();
  const route = useRoute<TaskDetailsScreenRouteProp>();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<GroupTask | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStatus, setEditedStatus] = useState<TaskStatus>('not_started');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editedDueDate, setEditedDueDate] = useState<Date | null>(null);
  const [assignedMember, setAssignedMember] = useState<UserProfile | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, [route.params.taskId]);

  const fetchTaskDetails = async () => {
    try {
      console.log('Fetching task details for ID:', route.params.taskId); // Debug log
      // First fetch the task data
      const { data: taskData, error: taskError } = await supabase
        .from('group_tasks')
        .select('*')
        .eq('id', route.params.taskId)
        .single();

      if (taskError) {
        console.error('Task fetch error:', taskError); // Debug log
        throw taskError;
      }
      if (!taskData) throw new Error('Task not found');

      console.log('Found task data:', taskData); // Debug log

      // Map old 'pending' status to 'in_progress' if needed
      const status = taskData.status === 'pending' ? 'in_progress' : taskData.status as TaskStatus;

      // If there's an assigned user, fetch their profile
      let assignedUserProfile = null;
      if (taskData.assigned_to) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', taskData.assigned_to)
          .single();
        
        if (profileData) {
          assignedUserProfile = profileData;
        }
      }

      // First get group members
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', taskData.group_id);

      if (membersError) throw membersError;

      // Then get their profiles
      const memberIds = members?.map(member => member.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      // Transform the members data to match our types
      const transformedMembers = members?.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          id: member.id,
          group_id: member.group_id,
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          user: {
            id: profile?.id || member.user_id,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null
          }
        };
      }) as GroupMember[];

      // Set all the state
      setTask({
        ...taskData,
        assignee: assignedUserProfile
      });
      setEditedTitle(taskData.title);
      setEditedDescription(taskData.description);
      setEditedStatus(status);
      setEditedDueDate(taskData.due_date ? new Date(taskData.due_date) : null);
      setAssignedMember(assignedUserProfile);
      setGroupMembers(transformedMembers || []);

    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Convert status to database-friendly format
      const statusToSave = editedStatus.toLowerCase().replace(/ /g, '_');
      
      console.log('Saving status:', statusToSave); // Debug log
      
      const { error } = await supabase
        .from('group_tasks')
        .update({
          title: editedTitle,
          description: editedDescription,
          status: statusToSave,
          due_date: editedDueDate,
          assigned_to: assignedMember?.id || null
        })
        .eq('id', route.params.taskId);

      if (error) {
        console.error('Update error:', error); // Debug log
        throw error;
      }
      
      await fetchTaskDetails();
      setIsEditing(false);
      Alert.alert('Success', 'Task updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('group_tasks')
                .delete()
                .eq('id', route.params.taskId);

              if (error) throw error;
              
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: TaskStatus | 'pending') => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-600' };
      case 'in_progress':
      case 'pending':
        return { bg: 'bg-blue-100', text: 'text-blue-600' };
      case 'on_hold':
        return { bg: 'bg-orange-100', text: 'text-orange-600' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600' };
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
          {/* Empty spaces for first week */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <View key={`empty-${index}`} className="w-[14.28%] h-10" />
          ))}

          {/* Days of the month */}
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
                  <Text
                    className={`text-base ${
                      isSelected
                        ? 'text-white font-medium'
                        : isTodayDate
                        ? 'text-[#4B6BFB] font-medium'
                        : 'text-gray-800'
                    }`}
                  >
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
          setEditedDueDate(new Date());
          setShowDatePicker(false);
          break;
        case 'tomorrow':
          setEditedDueDate(tomorrow);
          setShowDatePicker(false);
          break;
        case 'next_week':
          setEditedDueDate(nextWeek);
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
    const [tempSelectedDate, setTempSelectedDate] = useState<Date>(editedDueDate || new Date());

    const handleConfirm = () => {
      setEditedDueDate(tempSelectedDate);
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

  if (!task) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-500">Task not found</Text>
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
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 p-2"
          >
            <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold text-gray-800">Task Details</Text>
        </View>
        <View className="flex-row">
          {isEditing ? (
            <TouchableOpacity 
              onPress={handleSave}
              className="p-2 bg-[#4B6BFB] rounded-full"
            >
              <Ionicons name="checkmark" size={22} color="white" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                onPress={() => setIsEditing(true)}
                className="p-2 mr-2 bg-gray-100 rounded-full"
              >
                <Ionicons name="create-outline" size={22} color="#4B6BFB" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleDelete}
                className="p-2 bg-gray-100 rounded-full"
              >
                <Ionicons name="trash-outline" size={20} color="#FF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 pt-4">
        {/* Task Details Card */}
        <View className="bg-white rounded-xl shadow-sm mx-4 flex-1">
          <View className="p-8">
            <View className="mb-8">
              <Text className="text-gray-500 text-sm mb-2">Title</Text>
              {isEditing ? (
                <TextInput
                  value={editedTitle}
                  onChangeText={setEditedTitle}
                  className="border border-gray-200 rounded-2xl px-4 h-12 text-gray-800 text-base bg-gray-50 flex items-center"
                  placeholder="Enter task title"
                />
              ) : (
                <View className="px-4 h-12 bg-gray-50 rounded-2xl flex flex-row items-center">
                  <Text className="text-base text-gray-800">{task.title}</Text>
                </View>
              )}
            </View>

            <View className="mb-8">
              <Text className="text-gray-500 text-sm mb-2">Description</Text>
              {isEditing ? (
                <TextInput
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  multiline
                  numberOfLines={4}
                  className="border border-gray-200 rounded-2xl px-4 py-2.5 text-gray-800 text-base bg-gray-50 min-h-[120px]"
                  placeholder="Enter task description"
                  textAlignVertical="top"
                />
              ) : (
                <View className="px-4 py-2.5 bg-gray-50 rounded-2xl">
                  <Text className="text-base text-gray-800">{task.description}</Text>
                </View>
              )}
            </View>

            <View className="mb-8">
              <Text className="text-gray-500 text-sm mb-2">Status</Text>
              {isEditing ? (
                <TouchableOpacity
                  onPress={() => setShowStatusPicker(true)}
                  className="border border-gray-200 rounded-2xl px-4 h-12 bg-gray-50 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <View className="w-4 h-4 items-center justify-center">
                      <Ionicons
                        name={
                          editedStatus === 'completed'
                            ? 'checkmark-circle-outline'
                            : editedStatus === 'in_progress'
                            ? 'time-outline'
                            : editedStatus === 'on_hold'
                            ? 'pause-circle-outline'
                            : 'ellipse-outline'
                        }
                        size={15}
                        color={getStatusColor(editedStatus).text.replace('text-', '')}
                      />
                    </View>
                    <Text className={`${getStatusColor(editedStatus).text} font-medium ml-2`}>
                      {editedStatus === 'not_started' ? 'Not Started' :
                       editedStatus === 'in_progress' ? 'In Progress' :
                       editedStatus === 'on_hold' ? 'On Hold' : 'Completed'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ) : (
                <View className="px-4 h-12 bg-gray-50 rounded-2xl flex-row items-center">
                  <View className="w-4 h-4 items-center justify-center">
                    <Ionicons
                      name={
                        task.status === 'completed'
                          ? 'checkmark-circle-outline'
                          : (task.status as LegacyTaskStatus) === 'in_progress' || (task.status as LegacyTaskStatus) === 'pending'
                          ? 'time-outline'
                          : (task.status as LegacyTaskStatus) === 'on_hold'
                          ? 'pause-circle-outline'
                          : 'ellipse-outline'
                      }
                      size={15}
                      color={getStatusColor(task.status as LegacyTaskStatus).text.replace('text-', '')}
                    />
                  </View>
                  <Text className={`${
                    getStatusColor(task.status as LegacyTaskStatus).text
                  } font-medium ml-2`}>
                    {(() => {
                      const status = task.status as LegacyTaskStatus;
                      if (status === 'pending' || status === 'in_progress') return 'In Progress';
                      if (status === 'not_started') return 'Not Started';
                      if (status === 'on_hold') return 'On Hold';
                      if (status === 'completed') return 'Completed';
                      return 'Not Started';
                    })()}
                  </Text>
                </View>
              )}
              
              <Modal
                animationType="slide"
                transparent={true}
                visible={showStatusPicker}
                onRequestClose={() => setShowStatusPicker(false)}
              >
                <TouchableOpacity
                  className="flex-1 bg-black/50"
                  activeOpacity={1}
                  onPress={() => setShowStatusPicker(false)}
                >
                  <View className="flex-1 justify-end">
                    <View className="bg-white rounded-t-3xl">
                      <View className="p-6 border-b border-gray-100">
                        <View className="flex-row justify-between items-center mb-2">
                          <Text className="text-xl font-semibold text-gray-800">Select Status</Text>
                          <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                            <Ionicons name="close" size={24} color="#9CA3AF" />
                          </TouchableOpacity>
                        </View>
                        <Text className="text-gray-500">Choose a status for this task</Text>
                      </View>
                      
                      <View className="p-6">
                        {(['not_started', 'in_progress', 'on_hold', 'completed'] as TaskStatus[]).map((status) => {
                          const colors = getStatusColor(status);
                          const displayText = status === 'not_started' ? 'Not Started' :
                                           status === 'in_progress' ? 'In Progress' :
                                           status === 'on_hold' ? 'On Hold' : 'Completed';
                          return (
                            <TouchableOpacity
                              key={status}
                              onPress={() => {
                                setEditedStatus(status);
                                setShowStatusPicker(false);
                              }}
                              className="flex-row items-center justify-between p-4 mb-3 bg-gray-50 rounded-xl"
                            >
                              <View className="flex-row items-center">
                                <View className="w-10 h-10 rounded-full bg-white items-center justify-center mr-4">
                                  <Ionicons
                                    name={
                                      status === 'completed'
                                        ? 'checkmark-circle-outline'
                                        : status === 'in_progress'
                                        ? 'time-outline'
                                        : status === 'on_hold'
                                        ? 'pause-circle-outline'
                                        : 'ellipse-outline'
                                    }
                                    size={20}
                                    color={colors.text.replace('text-', '')}
                                  />
                                </View>
                                <Text className={`text-base font-medium ${colors.text}`}>
                                  {displayText}
                                </Text>
                              </View>
                              {editedStatus === status && (
                                <Ionicons name="checkmark" size={24} color="#4B6BFB" />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            <View className="mb-8">
              <Text className="text-gray-500 text-sm mb-2">Due Date</Text>
              {isEditing ? (
                <>
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
                      {editedDueDate ? formatDate(editedDueDate) : 'Set due date'}
                    </Text>
                  </TouchableOpacity>
                  <DatePickerModal />
                  <CustomDatePickerModal />
                </>
              ) : (
                <Text className="text-base text-gray-800">
                  {task.due_date ? formatDate(new Date(task.due_date)) : 'No due date'}
                </Text>
              )}
            </View>

            <View>
              <Text className="text-gray-500 text-sm mb-2">Assigned To</Text>
              <View className="flex-row items-center bg-gray-50 p-4 rounded-2xl">
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color="#4B6BFB" 
                  style={{ marginRight: 8 }}
                />
                <Text className="text-base text-gray-800">
                  {assignedMember?.full_name || 'Unassigned'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}; 