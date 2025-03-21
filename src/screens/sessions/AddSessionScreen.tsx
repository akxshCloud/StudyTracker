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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type AddSessionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddSession'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);

export const AddSessionScreen: React.FC = () => {
  const navigation = useNavigation<AddSessionScreenNavigationProp>();
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

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
    setShowStartDate(false);
    if (date) {
      const newDate = new Date(startDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setStartDate(newDate);
    }
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowStartTime(false);
    if (date) {
      const newDate = new Date(startDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setStartDate(newDate);
    }
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowEndDate(false);
    if (date) {
      const newDate = new Date(endDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setEndDate(newDate);
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowEndTime(false);
    if (date) {
      const newDate = new Date(endDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setEndDate(newDate);
    }
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
    onClose: () => void
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
              {/* Toolbar */}
              <View className="flex-row justify-between items-center p-4 bg-gray-50 rounded-t-xl border-b border-gray-200">
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-[#4B6BFB] text-base font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  onChange({ type: 'set', nativeEvent: { timestamp: value.getTime() } }, value);
                  onClose();
                }}>
                  <Text className="text-[#4B6BFB] text-base font-medium">Done</Text>
                </TouchableOpacity>
              </View>

              {/* Picker */}
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
    <Pressable 
      className="flex-1 justify-center items-center bg-black/50"
      onPress={() => navigation.goBack()}
    >
      <Pressable 
        className="bg-white rounded-3xl p-6 mx-4"
        style={{ maxWidth: 400, width: '100%' }}
        onPress={e => e.stopPropagation()}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text className="text-[#4B6BFB] font-medium text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-xl font-semibold">Add Session</Text>
            <TouchableOpacity 
              onPress={handleAddSession}
              disabled={loading}
              className="opacity-100 disabled:opacity-50"
            >
              <Text className="text-[#4B6BFB] font-medium text-base">
                {loading ? 'Adding...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View className="space-y-5">
            {/* Subject Input */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Subject</Text>
              <TextInput
                className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                placeholder="Enter subject name"
                value={subject}
                onChangeText={setSubject}
                autoCapitalize="words"
              />
            </View>

            {/* Start Date/Time */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Start</Text>
              <View className="flex-row space-x-2">
                <TouchableOpacity 
                  onPress={() => setShowStartDate(true)}
                  className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200"
                >
                  <Text className="text-gray-600">{formatDate(startDate)}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowStartTime(true)}
                  className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200"
                >
                  <Text className="text-gray-600">{formatTime(startDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* End Date/Time */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">End</Text>
              <View className="flex-row space-x-2">
                <TouchableOpacity 
                  onPress={() => setShowEndDate(true)}
                  className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200"
                >
                  <Text className="text-gray-600">{formatDate(endDate)}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setShowEndTime(true)}
                  className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200"
                >
                  <Text className="text-gray-600">{formatTime(endDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notes */}
            <View>
              <Text className="text-gray-700 font-medium mb-2">Notes (Optional)</Text>
              <TextInput
                className="bg-gray-50 p-4 rounded-xl border border-gray-200 min-h-[100]"
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
          </View>
        </ScrollView>

        {/* iOS Date/Time Pickers */}
        {Platform.OS === 'ios' && (
          <>
            {renderIOSPickerModal(
              showStartDate,
              startDate,
              'date',
              handleStartDateChange,
              () => setShowStartDate(false)
            )}
            {renderIOSPickerModal(
              showStartTime,
              startDate,
              'time',
              handleStartTimeChange,
              () => setShowStartTime(false)
            )}
            {renderIOSPickerModal(
              showEndDate,
              endDate,
              'date',
              handleEndDateChange,
              () => setShowEndDate(false)
            )}
            {renderIOSPickerModal(
              showEndTime,
              endDate,
              'time',
              handleEndTimeChange,
              () => setShowEndTime(false)
            )}
          </>
        )}

        {/* Android Date/Time Pickers */}
        {Platform.OS === 'android' && (
          <>
            {showStartDate && (
              <DateTimePicker
                value={startDate}
                mode="date"
                onChange={(event, date) => {
                  setShowStartDate(false);
                  if (date) handleStartDateChange(event, date);
                }}
              />
            )}
            {showStartTime && (
              <DateTimePicker
                value={startDate}
                mode="time"
                onChange={(event, date) => {
                  setShowStartTime(false);
                  if (date) handleStartTimeChange(event, date);
                }}
                minuteInterval={5}
              />
            )}
            {showEndDate && (
              <DateTimePicker
                value={endDate}
                mode="date"
                onChange={(event, date) => {
                  setShowEndDate(false);
                  if (date) handleEndDateChange(event, date);
                }}
              />
            )}
            {showEndTime && (
              <DateTimePicker
                value={endDate}
                mode="time"
                onChange={(event, date) => {
                  setShowEndTime(false);
                  if (date) handleEndTimeChange(event, date);
                }}
                minuteInterval={5}
              />
            )}
          </>
        )}
      </Pressable>
    </Pressable>
  );
}; 