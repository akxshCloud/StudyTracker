import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Pressable,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type AddSessionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddSession'>;
type AddSessionScreenRouteProp = RouteProp<RootStackParamList, 'AddSession'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

export const AddSessionScreen: React.FC = () => {
  const navigation = useNavigation<AddSessionScreenNavigationProp>();
  const route = useRoute<AddSessionScreenRouteProp>();
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const isGroupSession = !!route.params?.groupId;
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState<Date>(new Date());
  const [tempSelectedTime, setTempSelectedTime] = useState<Date>(new Date());
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateDuration = () => {
    const diff = endDate.getTime() - startDate.getTime();
    return Math.max(0, diff / (1000 * 60)); // Convert to minutes
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

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      const newDate = new Date(tempStartDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setTempStartDate(newDate);
    }
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      const newDate = new Date(tempStartDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setTempStartDate(newDate);
    }
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      const newDate = new Date(tempEndDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setTempEndDate(newDate);
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      const newDate = new Date(tempEndDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setTempEndDate(newDate);
    }
  };

  const confirmStartDateTime = () => {
    setStartDate(tempStartDate);
  };

  const confirmEndDateTime = () => {
    setEndDate(tempEndDate);
  };

  const handleAddSession = async () => {
    if (!subject) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const durationInMinutes = Math.round(calculateDuration());
      const { error } = await supabase
        .from('study_sessions')
        .insert([
          {
            user_id: user.id,
            subject,
            duration: durationInMinutes,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            notes: notes || null,
            created_at: new Date().toISOString(),
            group_id: route.params?.groupId || null
          },
        ]);

      if (error) throw error;

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
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

    const handleDateOption = (option: 'today' | 'tomorrow' | 'next_week' | 'custom') => {
      switch (option) {
        case 'today':
          if (datePickerMode === 'start') {
            setStartDate(today);
          } else {
            setEndDate(today);
          }
          setShowDatePicker(false);
          break;
        case 'tomorrow':
          if (datePickerMode === 'start') {
            setStartDate(tomorrow);
          } else {
            setEndDate(tomorrow);
          }
          setShowDatePicker(false);
          break;
        case 'next_week':
          if (datePickerMode === 'start') {
            setStartDate(nextWeek);
          } else {
            setEndDate(nextWeek);
          }
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
                  <Text className="text-xl font-semibold text-gray-800">
                    Select {datePickerMode === 'start' ? 'Start' : 'End'} Date
                  </Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-500">Choose a date for your session</Text>
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
    const handleConfirm = () => {
      if (datePickerMode === 'start') {
        const newDate = new Date(startDate);
        newDate.setFullYear(tempSelectedDate.getFullYear(), tempSelectedDate.getMonth(), tempSelectedDate.getDate());
        setStartDate(newDate);
      } else {
        const newDate = new Date(endDate);
        newDate.setFullYear(tempSelectedDate.getFullYear(), tempSelectedDate.getMonth(), tempSelectedDate.getDate());
        setEndDate(newDate);
      }
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

  const TimePickerModal = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    const [selectedHour, setSelectedHour] = useState(
      timePickerMode === 'start' ? startDate.getHours() : endDate.getHours()
    );
    const [selectedMinute, setSelectedMinute] = useState(
      timePickerMode === 'start' ? startDate.getMinutes() : endDate.getMinutes()
    );

    const handleConfirm = () => {
      if (timePickerMode === 'start') {
        const newDate = new Date(startDate);
        newDate.setHours(selectedHour, selectedMinute);
        setStartDate(newDate);
      } else {
        const newDate = new Date(endDate);
        newDate.setHours(selectedHour, selectedMinute);
        setEndDate(newDate);
      }
      setShowCustomTimePicker(false);
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCustomTimePicker}
        onRequestClose={() => setShowCustomTimePicker(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowCustomTimePicker(false)}
        >
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl">
              <View className="p-6 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xl font-semibold text-gray-800">
                    Select {timePickerMode === 'start' ? 'Start' : 'End'} Time
                  </Text>
                  <TouchableOpacity onPress={() => setShowCustomTimePicker(false)}>
                    <Ionicons name="close" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-500">Choose a specific time</Text>
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
                    onPress={() => setShowCustomTimePicker(false)}
                    className="py-3 px-6 rounded-lg"
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
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

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
          <Text className="text-2xl font-semibold text-gray-800">
            {isGroupSession ? 'Add Group Session' : 'Add Study Session'}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={handleAddSession}
          disabled={loading}
          className="p-2 bg-[#4B6BFB] rounded-full"
        >
          <Ionicons name="checkmark" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 pt-4">
        {/* Session Details Card */}
        <View className="bg-white rounded-xl shadow-sm mx-4 flex-1">
          <View className="p-8">
            <View className="mb-8">
              <Text className="text-gray-500 text-sm mb-2">Subject *</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter subject"
                className="border border-gray-200 rounded-2xl px-4 h-12 text-gray-800 text-base bg-gray-50 flex items-center"
                placeholderTextColor="#999"
              />
            </View>

            <View className="space-y-8">
              <View>
                <Text className="text-gray-500 text-sm mb-2">Start Time</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDatePickerMode('start');
                    setShowDatePicker(true);
                  }}
                  className="border border-gray-200 rounded-2xl px-4 h-12 bg-gray-50 flex-row items-center justify-between"
                >
                  <Text className="text-gray-800">Start Time</Text>
                  <View className="flex-row items-center">
                    <Text className="text-[#4B6BFB] mr-2">{formatDate(startDate)}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setTimePickerMode('start');
                        setShowCustomTimePicker(true);
                      }}
                    >
                      <Text className="text-[#4B6BFB]">{formatTime(startDate)}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>

              <View>
                <Text className="text-gray-500 text-sm mb-2">End Time</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDatePickerMode('end');
                    setShowDatePicker(true);
                  }}
                  className="border border-gray-200 rounded-2xl px-4 h-12 bg-gray-50 flex-row items-center justify-between"
                >
                  <Text className="text-gray-800">End Time</Text>
                  <View className="flex-row items-center">
                    <Text className="text-[#4B6BFB] mr-2">{formatDate(endDate)}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setTimePickerMode('end');
                        setShowCustomTimePicker(true);
                      }}
                    >
                      <Text className="text-[#4B6BFB]">{formatTime(endDate)}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>

              <View>
                <Text className="text-gray-500 text-sm mb-2">Duration</Text>
                <View className="px-4 h-12 bg-gray-50 rounded-2xl flex-row items-center justify-between">
                  <Text className="text-gray-800">Total Duration</Text>
                  <Text className="text-[#4B6BFB]">{formatDuration(calculateDuration())}</Text>
                </View>
              </View>

              <View>
                <Text className="text-gray-500 text-sm mb-2">Notes (Optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about this session"
                  multiline
                  numberOfLines={4}
                  className="border border-gray-200 rounded-2xl px-4 py-2.5 text-gray-800 text-base bg-gray-50 min-h-[120px]"
                  placeholderTextColor="#999"
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <DatePickerModal />
      <CustomDatePickerModal />
      <TimePickerModal />
    </SafeAreaView>
  );
}; 