import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';

interface UserProfile {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Error states
  const [fullNameError, setFullNameError] = useState(false);

  useEffect(() => {
    getUserData();
  }, []);

  const getUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserData(user);

      // Fetch user profile data
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setFullName(profile.full_name || '');
          setBio(profile.bio || '');
          setAvatarUrl(profile.avatar_url);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      setFullNameError(true);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userData.id,
          full_name: fullName.trim(),
          bio: bio.trim(),
        });

      if (error) throw error;
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploadingImage(true);

      // Compress and resize image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // Upload to Supabase Storage with user ID as folder name
      const filePath = `${userData.id}/avatar-${Date.now()}.jpg`;
      
      // Convert base64 to Uint8Array
      const base64Data = manipulatedImage.base64 || '';
      const byteString = atob(base64Data);
      const byteNumbers = new Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        byteNumbers[i] = byteString.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, byteArray, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Generated URL:', publicUrl);

      // Delete old avatar if it exists
      if (avatarUrl) {
        try {
          const oldFilePath = avatarUrl.split('/').slice(-2).join('/');
          await supabase.storage
            .from('avatars')
            .remove([oldFilePath]);
        } catch (error) {
          console.error('Error deleting old avatar:', error);
        }
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: userData.id,
          avatar_url: publicUrl
        });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      Alert.alert('Success', 'Profile picture updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-4">
          {/* Profile Picture Section - Fixed at top */}
          <View className="items-center mt-12 mb-16">
            <View className="relative">
              {uploadingImage ? (
                <View className="w-32 h-32 rounded-full bg-gray-200 items-center justify-center">
                  <ActivityIndicator color="#4B6BFB" />
                </View>
              ) : (
                <>
                  <Image
                    source={
                      avatarUrl
                        ? { uri: avatarUrl }
                        : { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || userData?.email?.split('@')[0] || 'User')}&background=random&size=128` }
                    }
                    className="w-32 h-32 rounded-full bg-gray-200"
                    onError={(error) => {
                      console.error('Error loading image:', error.nativeEvent.error);
                      console.error('Failed URL:', avatarUrl);
                      setAvatarUrl(null); // Reset to default on error
                    }}
                  />
                  <TouchableOpacity
                    onPress={pickImage}
                    className="absolute bottom-0 right-0 bg-[#4B6BFB] rounded-full p-2 shadow-lg"
                  >
                    <Ionicons name="pencil" size={16} color="white" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Main Content Container */}
          <View className="flex-1">
            {/* Profile Information Section */}
            <View className="bg-white rounded-2xl p-5 shadow-sm mb-8">
              <Text className="text-base font-semibold text-gray-800 mb-4">Profile Information</Text>
              <AuthInput
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  setFullNameError(false);
                }}
                error={fullNameError}
                errorMessage="Full name is required"
              />
              <AuthInput
                label="Bio"
                placeholder="Tell us about yourself"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                className="min-h-[80px]"
              />
            </View>

            {/* Buttons Section */}
            <View className="space-y-3 mb-8">
              <AuthButton
                title="Update Profile"
                onPress={handleUpdateProfile}
                loading={loading}
                className="py-3 bg-[#4B6BFB]"
                textClassName="text-sm font-medium"
              />
              <AuthButton
                title="Cancel"
                onPress={() => navigation.goBack()}
                className="py-3 bg-[#FFE4E4]"
                textClassName="text-[#EF4444] text-sm font-medium"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}; 