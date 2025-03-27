import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { GroupMember } from '../../types/studyGroup';

type EditGroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditGroup'>;
type EditGroupScreenRouteProp = RouteProp<RootStackParamList, 'EditGroup'>;

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const EditGroupScreen: React.FC = () => {
  const navigation = useNavigation<EditGroupScreenNavigationProp>();
  const route = useRoute<EditGroupScreenRouteProp>();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isPremiumUser, setIsPremiumUser] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [route.params.groupId]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigation.goBack();
        return;
      }
      setCurrentUserId(user.id);

      // Check if user is admin of the group
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', route.params.groupId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !memberData) {
        Alert.alert('Error', 'You do not have permission to edit this group');
        navigation.goBack();
        return;
      }

      if (memberData.role !== 'admin') {
        Alert.alert('Error', 'Only admins can edit group settings');
        navigation.goBack();
        return;
      }

      setIsAdmin(true);

      // Check if user is premium (placeholder for now)
      const { data: userData } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', user.id)
        .single();

      setIsPremiumUser(userData?.is_premium || false);

      // Proceed with fetching group details
      await fetchGroupDetails();
      await fetchMembers();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigation.goBack();
    }
  };

  const fetchGroupDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select('name, description')
        .eq('id', route.params.groupId)
        .single();

      if (error) throw error;
      if (data) {
        setGroupName(data.name);
        setDescription(data.description || '');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load group details');
      console.error('Error fetching group details:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      // First get all group members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', route.params.groupId);

      if (membersError) {
        console.error('Error fetching members:', membersError.message);
        return;
      }

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Then get their profiles
      const memberIds = membersData.map(member => member.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', memberIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError.message);
        return;
      }

      // Transform the data
      const transformedMembers = membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          id: member.id,
          group_id: route.params.groupId,
          user_id: member.user_id,
          role: member.role as 'admin' | 'member',
          joined_at: member.joined_at || new Date().toISOString(),
          user: {
            id: member.user_id,
            full_name: profile?.full_name || 'Unknown User',
            avatar_url: profile?.avatar_url || null
          }
        };
      });

      setMembers(transformedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      setMembers([]);
    }
  };

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('study_groups')
        .update({
          name: groupName.trim(),
          description: description.trim() || null,
        })
        .eq('id', route.params.groupId);

      if (error) throw error;

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (memberRole === 'admin') {
      Alert.alert('Error', 'Cannot remove the group admin');
      return;
    }

    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', route.params.groupId)
                .eq('user_id', memberId);

              if (error) throw error;
              await fetchMembers();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    if (!isPremiumUser) {
      Alert.alert('Premium Feature', 'Only premium users can have multiple admins in a group');
      return;
    }

    Alert.alert(
      'Promote to Admin',
      'Are you sure you want to promote this member to admin?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('group_members')
                .update({ role: 'admin' })
                .eq('group_id', route.params.groupId)
                .eq('user_id', memberId);

              if (error) throw error;
              await fetchMembers();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  if (initialLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text>You don't have permission to edit this group</Text>
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
          <Text className="text-2xl font-semibold text-gray-800">Edit Group</Text>
        </View>
        <TouchableOpacity 
          onPress={handleUpdateGroup}
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
          <View className="bg-white rounded-xl shadow-sm mx-4 mb-4">
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

          {/* Members Management Section */}
          <View className="bg-white rounded-xl shadow-sm mx-4">
            <View className="p-8">
              <Text className="text-xl font-semibold text-gray-800 mb-4">Members</Text>
              {members.map((member) => (
                <View 
                  key={member.id}
                  className="flex-row items-center justify-between py-4 border-b border-gray-100"
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 mr-3">
                      <Image
                        source={
                          member.user.avatar_url
                            ? { uri: member.user.avatar_url }
                            : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user.full_name || 'User')}&background=random` }
                        }
                        className="w-full h-full"
                      />
                    </View>
                    <View className="flex-1 mr-4">
                      <Text className="text-base font-medium text-gray-800">
                        {member.user.full_name || 'Unknown User'}
                      </Text>
                      <Text className="text-sm text-gray-500 capitalize">
                        {member.role}
                      </Text>
                    </View>
                  </View>
                  
                  {member.user_id !== currentUserId && (
                    <View className="flex-row">
                      {member.role !== 'admin' && (
                        <TouchableOpacity
                          onPress={() => handlePromoteToAdmin(member.user_id)}
                          className="p-2 mr-2"
                        >
                          <Ionicons name="shield-outline" size={22} color="#4B6BFB" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(member.user_id, member.role)}
                        className="p-2"
                      >
                        <Ionicons name="person-remove-outline" size={22} color="#FF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}; 