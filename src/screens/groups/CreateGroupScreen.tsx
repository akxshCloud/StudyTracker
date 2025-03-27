import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';

type CreateGroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>;

export const CreateGroupScreen: React.FC = () => {
  const navigation = useNavigation<CreateGroupScreenNavigationProp>();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('study_groups')
        .insert([
          {
            name: groupName.trim(),
            description: description.trim() || null,
            creator_id: user.id,
          },
        ])
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          {
            group_id: group.id,
            user_id: user.id,
            role: 'admin',
          },
        ]);

      if (memberError) throw memberError;

      navigation.navigate('StudyGroup', { groupId: group.id });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
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
          <Text className="text-2xl font-semibold text-gray-800">Create Group</Text>
        </View>
        <TouchableOpacity 
          onPress={handleCreateGroup}
          disabled={loading}
          className="p-2 bg-[#4B6BFB] rounded-full"
        >
          <Ionicons name="checkmark" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 pt-4">
          {/* Group Details Card */}
          <View className="bg-white rounded-xl shadow-sm mx-4 flex-1">
            <View className="p-8">
              <View className="mb-8">
                <Text className="text-gray-500 text-sm mb-2">Group Name *</Text>
                <TextInput
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Enter group name"
                  className="border border-gray-200 rounded-2xl px-4 h-12 text-gray-800 text-base bg-gray-50 flex items-center"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View>
                <Text className="text-gray-500 text-sm mb-2">Description (Optional)</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add a description for your group"
                  multiline
                  numberOfLines={4}
                  className="border border-gray-200 rounded-2xl px-4 py-2.5 text-gray-800 text-base bg-gray-50 min-h-[120px]"
                  placeholderTextColor="#999"
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}; 