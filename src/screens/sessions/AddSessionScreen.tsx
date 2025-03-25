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

  const renderIOSPickerModal = (
    visible: boolean,
    value: Date,
    mode: 'date' | 'time',
    onChange: (event: DateTimePickerEvent, date?: Date) => void,
    onClose: () => void,
    onConfirm: () => void
  ) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 bg-black/50"
        onPress={onClose}
      >
        <View className="flex-1 justify-end">
          <Pressable onPress={e => e.stopPropagation()}>
            <View className="bg-gray-100 rounded-t-xl">
              <View className="flex-row justify-between items-center p-4 bg-gray-50 rounded-t-xl border-b border-gray-200">
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-[#4B6BFB] text-base font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  onConfirm();
                  onClose();
                }}>
                  <Text className="text-[#4B6BFB] text-base font-medium">Done</Text>
                </TouchableOpacity>
              </View>

              <View className="bg-white px-4">
                <View className="items-center justify-center">
                  <DateTimePicker
                    value={value}
                    mode={mode}
                    display={mode === 'date' ? 'inline' : 'spinner'}
                    onChange={(event, date) => {
                      if (date) {
                        onChange(event, date);
                      }
                    }}
                    minuteInterval={5}
                    textColor="#000000"
                    style={{ 
                      width: mode === 'date' ? 320 : 200,
                      height: mode === 'date' ? 390 : 200
                    }}
                  />
                </View>
              </View>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-2">
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-3"
          >
            <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
          </TouchableOpacity>
          <Text className="text-2xl font-semibold text-gray-800">
            {isGroupSession ? 'Add Group Session' : 'Add Study Session'}
          </Text>
        </View>

        {/* Form */}
        <View className="space-y-4">
          <View>
            <Text className="text-gray-600 mb-1">Subject</Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-gray-200"
              placeholder="Enter subject"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          {/* Start Date/Time */}
          <View>
            <Text className="text-gray-600 mb-1">Start</Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity 
                onPress={() => setShowStartDate(true)}
                className="flex-1 bg-white p-3 rounded-lg border border-gray-200"
              >
                <Text className="text-gray-600">{formatDate(startDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowStartTime(true)}
                className="flex-1 bg-white p-3 rounded-lg border border-gray-200"
              >
                <Text className="text-gray-600">{formatTime(startDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* End Date/Time */}
          <View>
            <Text className="text-gray-600 mb-1">End</Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity 
                onPress={() => setShowEndDate(true)}
                className="flex-1 bg-white p-3 rounded-lg border border-gray-200"
              >
                <Text className="text-gray-600">{formatDate(endDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowEndTime(true)}
                className="flex-1 bg-white p-3 rounded-lg border border-gray-200"
              >
                <Text className="text-gray-600">{formatTime(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View>
            <Text className="text-gray-600 mb-1">Notes (Optional)</Text>
            <TextInput
              className="bg-white p-3 rounded-lg border border-gray-200 min-h-[100]"
              placeholder="Add any notes about this session"
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Duration Display */}
          <View className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <Text className="text-gray-600 text-center">
              Duration: {formatDuration(calculateDuration())}
            </Text>
          </View>

          <TouchableOpacity
            className="bg-[#4B6BFB] p-4 rounded-lg mt-4"
            onPress={handleAddSession}
          >
            <Text className="text-white text-center font-semibold">
              {isGroupSession ? 'Add Group Session' : 'Add Session'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* iOS Date/Time Pickers */}
      {Platform.OS === 'ios' && (
        <>
          {renderIOSPickerModal(
            showStartDate,
            tempStartDate,
            'date',
            handleStartDateChange,
            () => setShowStartDate(false),
            confirmStartDateTime
          )}
          {renderIOSPickerModal(
            showStartTime,
            tempStartDate,
            'time',
            handleStartTimeChange,
            () => setShowStartTime(false),
            confirmStartDateTime
          )}
          {renderIOSPickerModal(
            showEndDate,
            tempEndDate,
            'date',
            handleEndDateChange,
            () => setShowEndDate(false),
            confirmEndDateTime
          )}
          {renderIOSPickerModal(
            showEndTime,
            tempEndDate,
            'time',
            handleEndTimeChange,
            () => setShowEndTime(false),
            confirmEndDateTime
          )}
        </>
      )}

      {/* Android Date/Time Pickers */}
      {Platform.OS === 'android' && (
        <>
          {showStartDate && (
            <DateTimePicker
              value={tempStartDate}
              mode="date"
              onChange={(event, date) => {
                if (date) {
                  handleStartDateChange(event, date);
                  confirmStartDateTime();
                }
                setShowStartDate(false);
              }}
            />
          )}
          {showStartTime && (
            <DateTimePicker
              value={tempStartDate}
              mode="time"
              onChange={(event, date) => {
                if (date) {
                  handleStartTimeChange(event, date);
                  confirmStartDateTime();
                }
                setShowStartTime(false);
              }}
              minuteInterval={5}
            />
          )}
          {showEndDate && (
            <DateTimePicker
              value={tempEndDate}
              mode="date"
              onChange={(event, date) => {
                if (date) {
                  handleEndDateChange(event, date);
                  confirmEndDateTime();
                }
                setShowEndDate(false);
              }}
            />
          )}
          {showEndTime && (
            <DateTimePicker
              value={tempEndDate}
              mode="time"
              onChange={(event, date) => {
                if (date) {
                  handleEndTimeChange(event, date);
                  confirmEndDateTime();
                }
                setShowEndTime(false);
              }}
              minuteInterval={5}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}; 