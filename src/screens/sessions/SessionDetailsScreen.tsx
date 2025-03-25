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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

type SessionDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SessionDetails'>;
type SessionDetailsScreenRouteProp = RouteProp<RootStackParamList, 'SessionDetails'>;

interface StudySession {
  id: number;
  subject: string;
  duration: number;
  created_at: string;
  start_time: string;
  end_time: string;
  user_id: string;
}

type TimePickerMode = 'start' | 'end';

export const SessionDetailsScreen: React.FC = () => {
  const navigation = useNavigation<SessionDetailsScreenNavigationProp>();
  const route = useRoute<SessionDetailsScreenRouteProp>();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StudySession | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedStartTime, setEditedStartTime] = useState<Date>(new Date());
  const [editedEndTime, setEditedEndTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timePickerMode, setTimePickerMode] = useState<TimePickerMode>('start');

  useEffect(() => {
    fetchSessionDetails();
  }, [route.params.sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const { data: sessionData, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('id', route.params.sessionId)
        .single();

      if (error) throw error;
      if (!sessionData) throw new Error('Session not found');

      setSession(sessionData);
      setEditedSubject(sessionData.subject);
      setEditedStartTime(new Date(sessionData.start_time || sessionData.created_at));
      setEditedEndTime(new Date(sessionData.end_time || new Date(new Date(sessionData.created_at).getTime() + sessionData.duration * 60000)));
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
      
      // Calculate duration in minutes
      const durationInMinutes = Math.round((editedEndTime.getTime() - editedStartTime.getTime()) / 60000);
      
      if (durationInMinutes <= 0) {
        Alert.alert('Error', 'End time must be after start time');
        return;
      }

      const { error } = await supabase
        .from('study_sessions')
        .update({
          subject: editedSubject.trim(),
          duration: durationInMinutes,
          start_time: editedStartTime.toISOString(),
          end_time: editedEndTime.toISOString()
        })
        .eq('id', route.params.sessionId);

      if (error) throw error;

      await fetchSessionDetails();
      setIsEditing(false);
      Alert.alert('Success', 'Session updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('study_sessions')
                .delete()
                .eq('id', route.params.sessionId);

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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) {
      return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(hours);
    newDate.setMinutes(minutes);

    if (timePickerMode === 'start') {
      setEditedStartTime(newDate);
    } else {
      setEditedEndTime(newDate);
    }
    setShowTimePicker(false);
  };

  const TimePickerModal = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const [selectedHour, setSelectedHour] = useState(
      timePickerMode === 'start' ? editedStartTime.getHours() : editedEndTime.getHours()
    );
    const [selectedMinute, setSelectedMinute] = useState(
      timePickerMode === 'start' ? editedStartTime.getMinutes() : editedEndTime.getMinutes()
    );

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTimePicker}
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl">
              <View className="p-6 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xl font-semibold text-gray-800">
                    Select {timePickerMode === 'start' ? 'Start' : 'End'} Time
                  </Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="p-6">
                <View className="flex-row justify-center space-x-8">
                  {/* Hours */}
                  <View className="flex-1">
                    <Text className="text-center text-gray-500 mb-4">Hour</Text>
                    <FlatList
                      data={hours}
                      keyExtractor={(item) => item.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => setSelectedHour(item)}
                          className={`py-2 px-4 rounded-lg ${
                            selectedHour === item ? 'bg-[#4B6BFB]' : ''
                          }`}
                        >
                          <Text
                            className={`text-center text-lg ${
                              selectedHour === item ? 'text-white' : 'text-gray-800'
                            }`}
                          >
                            {item.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                      className="h-40"
                    />
                  </View>

                  {/* Minutes */}
                  <View className="flex-1">
                    <Text className="text-center text-gray-500 mb-4">Minute</Text>
                    <FlatList
                      data={minutes}
                      keyExtractor={(item) => item.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => setSelectedMinute(item)}
                          className={`py-2 px-4 rounded-lg ${
                            selectedMinute === item ? 'bg-[#4B6BFB]' : ''
                          }`}
                        >
                          <Text
                            className={`text-center text-lg ${
                              selectedMinute === item ? 'text-white' : 'text-gray-800'
                            }`}
                          >
                            {item.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                      className="h-40"
                    />
                  </View>
                </View>

                <View className="mt-6 flex-row justify-end space-x-4">
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    className="py-3 px-6 rounded-lg"
                  >
                    <Text className="text-gray-600 font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleTimeSelect(selectedHour, selectedMinute)}
                    className="bg-[#4B6BFB] py-3 px-6 rounded-lg"
                  >
                    <Text className="text-white font-medium">Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const DatePickerModal = () => {
    const [tempDate, setTempDate] = useState(selectedDate);
    
    const getDaysInMonth = (year: number, month: number) => {
      return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
      return new Date(year, month, 1).getDay();
    };

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    const handleDateSelect = (date: Date) => {
      setSelectedDate(date);
      if (timePickerMode === 'start') {
        const newDate = new Date(editedStartTime);
        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        setEditedStartTime(newDate);
      } else {
        const newDate = new Date(editedEndTime);
        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        setEditedEndTime(newDate);
      }
      setShowDatePicker(false);
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
                  <Text className="text-xl font-semibold text-gray-800">Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="p-6">
                {/* Month and Year Header */}
                <View className="flex-row justify-between items-center mb-6">
                  <TouchableOpacity
                    onPress={() => setTempDate(new Date(year, month - 1, 1))}
                    className="w-12 h-12 items-center justify-center"
                  >
                    <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
                  </TouchableOpacity>
                  <Text className="text-2xl font-semibold text-gray-800">
                    {months[month]} {year}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setTempDate(new Date(year, month + 1, 1))}
                    className="w-12 h-12 items-center justify-center"
                  >
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
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();

                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleDateSelect(date)}
                        className="w-[14.28%] h-10 items-center justify-center"
                      >
                        <View
                          className={`w-10 h-10 items-center justify-center rounded-full ${
                            isSelected ? 'bg-[#4B6BFB]' : ''
                          }`}
                        >
                          <Text
                            className={`text-base ${
                              isSelected
                                ? 'text-white font-medium'
                                : isToday
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
            </View>
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

  if (!session) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-500">Session not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-2 flex-row justify-between items-center border-b border-gray-100 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3 p-2"
          >
            <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold text-gray-800">Session Details</Text>
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
        {/* Session Details Card */}
        <View className="bg-white rounded-xl shadow-sm mx-4 flex-1">
          <View className="p-8">
            <View className="mb-8">
              <Text className="text-gray-500 text-sm mb-2">Subject</Text>
              {isEditing ? (
                <TextInput
                  value={editedSubject}
                  onChangeText={setEditedSubject}
                  className="border border-gray-200 rounded-2xl px-4 h-12 text-gray-800 text-base bg-gray-50 flex items-center"
                  placeholder="Enter session subject"
                />
              ) : (
                <View className="px-4 h-12 bg-gray-50 rounded-2xl flex flex-row items-center">
                  <Text className="text-base text-gray-800">{session.subject}</Text>
                </View>
              )}
            </View>

            {isEditing ? (
              <View className="space-y-8">
                <View>
                  <Text className="text-gray-500 text-sm mb-2">Start Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setTimePickerMode('start');
                      setSelectedDate(editedStartTime);
                      setShowDatePicker(true);
                    }}
                    className="border border-gray-200 rounded-2xl px-4 h-12 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-800">Start Time</Text>
                    <View className="flex-row items-center">
                      <Text className="text-[#4B6BFB] mr-2">{formatDate(editedStartTime)}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setTimePickerMode('start');
                          setShowTimePicker(true);
                        }}
                      >
                        <Text className="text-[#4B6BFB]">{formatTime(editedStartTime)}</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className="text-gray-500 text-sm mb-2">End Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setTimePickerMode('end');
                      setSelectedDate(editedEndTime);
                      setShowDatePicker(true);
                    }}
                    className="border border-gray-200 rounded-2xl px-4 h-12 bg-gray-50 flex-row items-center justify-between"
                  >
                    <Text className="text-gray-800">End Time</Text>
                    <View className="flex-row items-center">
                      <Text className="text-[#4B6BFB] mr-2">{formatDate(editedEndTime)}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setTimePickerMode('end');
                          setShowTimePicker(true);
                        }}
                      >
                        <Text className="text-[#4B6BFB]">{formatTime(editedEndTime)}</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="space-y-8">
                <View>
                  <Text className="text-gray-500 text-sm mb-2">Start Time</Text>
                  <View className="px-4 h-12 bg-gray-50 rounded-2xl flex-row items-center justify-between">
                    <Text className="text-gray-800">Start Time</Text>
                    <View className="flex-row items-center">
                      <Text className="text-[#4B6BFB] mr-2">{formatDate(new Date(session.start_time || session.created_at))}</Text>
                      <Text className="text-[#4B6BFB]">{formatTime(new Date(session.start_time || session.created_at))}</Text>
                    </View>
                  </View>
                </View>

                <View>
                  <Text className="text-gray-500 text-sm mb-2">End Time</Text>
                  <View className="px-4 h-12 bg-gray-50 rounded-2xl flex-row items-center justify-between">
                    <Text className="text-gray-800">End Time</Text>
                    <View className="flex-row items-center">
                      <Text className="text-[#4B6BFB] mr-2">{formatDate(new Date(session.end_time || new Date(new Date(session.created_at).getTime() + session.duration * 60000)))}</Text>
                      <Text className="text-[#4B6BFB]">{formatTime(new Date(session.end_time || new Date(new Date(session.created_at).getTime() + session.duration * 60000)))}</Text>
                    </View>
                  </View>
                </View>

                <View>
                  <Text className="text-gray-500 text-sm mb-2">Duration</Text>
                  <View className="px-4 h-12 bg-gray-50 rounded-2xl flex-row items-center justify-between">
                    <Text className="text-gray-800">Total Duration</Text>
                    <Text className="text-[#4B6BFB]">{formatDuration(session.duration)}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <DatePickerModal />
      <TimePickerModal />
    </SafeAreaView>
  );
}; 