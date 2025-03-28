import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

type AddGroupMemberScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddGroupMember'>;
type AddGroupMemberScreenRouteProp = RouteProp<RootStackParamList, 'AddGroupMember'>;

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export const AddGroupMemberScreen: React.FC = () => {
  const navigation = useNavigation<AddGroupMemberScreenNavigationProp>();
  const route = useRoute<AddGroupMemberScreenRouteProp>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const searchUser = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter an email address');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      // First get the user from auth.users using the existing function
      const { data: authData, error: authError } = await supabase.rpc('get_user_by_email', {
        email_address: email.trim().toLowerCase()
      });

      if (authError || !authData || authData.length === 0) {
        console.error('User search error:', authError);
        setErrorMessage('User not found');
        setShowErrorModal(true);
        setSearchedUser(null);
        return;
      }

      const authUser = authData[0];
      console.log('Found auth user:', authUser);

      // Get the profile data with detailed error logging
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Log the complete response for debugging
      console.log('Profile query response:', { profileData, profileError });

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log('No profile found for user');
        } else if (profileError.code === 'PGRST201') {
          console.log('Insufficient permissions to access profile');
        } else {
          console.error('Error fetching profile:', profileError);
        }
      }

      // Check if user is already a member of the group
      const { data: existingMember, error: memberError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', route.params.groupId)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (existingMember) {
        setErrorMessage('User is already a member of this group');
        setShowErrorModal(true);
        setSearchedUser(null);
        return;
      }

      // Set user data combining auth and profile information
      const userData = {
        id: authUser.id,
        email: authUser.email,
        full_name: profileData?.full_name || null,
        avatar_url: profileData?.avatar_url || null
      };

      console.log('Setting searched user data:', userData);
      setSearchedUser(userData);
      
    } catch (error: any) {
      console.error('Search error:', error);
      setErrorMessage(error.message || 'User not found. Please check the email address and try again.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    if (!searchedUser) return;
    if (!route.params.groupId) {
      setErrorMessage('Invalid group ID');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      // Check if user is already a member of the group
      const { data: existingMember, error: memberError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', route.params.groupId)
        .eq('user_id', searchedUser.id)
        .maybeSingle();

      if (existingMember) {
        setErrorMessage('User is already a member of this group');
        setShowErrorModal(true);
        return;
      }

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: route.params.groupId,  // Use the ID directly, no conversion needed
          user_id: searchedUser.id,
          role: 'member'
        });

      if (error) throw error;

      Alert.alert('Success', 'Member added successfully');
      navigation.goBack();
    } catch (error: any) {
      console.error('Error adding member:', error);
      setErrorMessage(error.message);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const ErrorModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showErrorModal}
      onRequestClose={() => setShowErrorModal(false)}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50 justify-center items-center"
        activeOpacity={1}
        onPress={() => setShowErrorModal(false)}
      >
        <View className="bg-white rounded-2xl p-6 m-4 w-[90%] max-w-sm">
          <View className="items-center mb-4">
            <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mb-2">
              <Ionicons name="alert-circle" size={32} color="#FF4444" />
            </View>
            <Text className="text-xl font-semibold text-gray-800">Error</Text>
          </View>
          <Text className="text-gray-600 text-center mb-6">{errorMessage}</Text>
          <TouchableOpacity
            onPress={() => setShowErrorModal(false)}
            className="bg-[#4B6BFB] py-3 px-6 rounded-xl"
          >
            <Text className="text-white text-center font-medium">OK</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
          <Text className="text-2xl font-semibold text-gray-800">Add Member</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <Text className="text-gray-500 text-sm mb-2">Search by Email</Text>
          <View className="flex-row space-x-2">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              className="flex-1 bg-gray-50 rounded-lg px-4 py-2 text-gray-800"
            />
            <TouchableOpacity
              onPress={searchUser}
              disabled={loading}
              className="bg-[#4B6BFB] rounded-lg px-6 py-2 items-center justify-center"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-medium">Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {searchedUser && (
          <View className="bg-white rounded-xl shadow-sm p-6">
            <Text className="text-lg font-semibold mb-4">Found User</Text>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-medium text-gray-800">
                  {searchedUser.full_name || searchedUser.email.split('@')[0]}
                </Text>
                <Text className="text-gray-500">{searchedUser.email}</Text>
              </View>
              <TouchableOpacity
                onPress={addMember}
                disabled={loading}
                className="bg-[#4B6BFB] rounded-lg px-6 py-2"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-medium">Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <ErrorModal />
    </SafeAreaView>
  );
}; 