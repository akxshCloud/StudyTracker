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
      {/* Header with back button */}
      <View className="flex-row items-center px-4 py-2 border-b border-gray-200">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="p-2 -ml-2"
        >
          <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
        </TouchableOpacity>
        <Text className="text-xl font-semibold ml-2">Create Group</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          <View className="px-4 py-2">
            <View className="mb-6">
              <Text className="text-gray-500">
                Create a new study group and invite your friends
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">Group Name</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-xl px-4 py-3"
                placeholder="Enter group name"
                value={groupName}
                onChangeText={setGroupName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              className={`bg-[#4B6BFB] rounded-xl py-4 items-center ${
                loading ? 'opacity-50' : ''
              }`}
              onPress={handleCreateGroup}
              disabled={loading}
            >
              <Text className="text-white font-semibold text-lg">
                {loading ? 'Creating...' : 'Create Group'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}; 