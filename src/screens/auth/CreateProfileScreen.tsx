import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing } from 'react-native';

type CreateProfileScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'CreateProfile'>;

interface CreateProfileScreenProps {
  navigation: CreateProfileScreenNavigationProp;
}

export const CreateProfileScreen: React.FC<CreateProfileScreenProps> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fullNameError, setFullNameError] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserData(session.user);
      } else if (event === 'SIGNED_OUT') {
        navigation.replace('SignUp');
      }
    });

    // Get initial user data
    getUserData();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getUserData = async () => {
    try {
      // First try to get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserData(session.user);
        return;
      }

      // If no session, try to get the user directly
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserData(user);
        return;
      }

      // If still no user data, wait a bit and try one last time
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retrySession = await supabase.auth.getSession();
      
      if (retrySession.data.session?.user) {
        setUserData(retrySession.data.session.user);
      } else {
        throw new Error('No user data available');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Unable to get user data. Please try signing in again.');
      navigation.replace('SignUp');
    }
  };

  const pickImage = async () => {
    if (!userData?.id) {
      Alert.alert('Error', 'Please wait while we load your profile data.');
      return;
    }

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
    if (!userData?.id) {
      Alert.alert('Error', 'Please wait while we load your profile data.');
      return;
    }

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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, byteArray, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!userData?.id) {
      Alert.alert('Error', 'Unable to create profile. Please try again.');
      return;
    }

    if (!fullName.trim()) {
      setFullNameError(true);
      return;
    }

    try {
      setLoading(true);
      console.log('Creating profile for user:', userData.id);
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userData.id,
          full_name: fullName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl,
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Profile created successfully');
      
      // Navigate to App screen in root navigator
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.navigate('App');
      } else {
        // Fallback: refresh the session to trigger the auth state change
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1" 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <Animated.View 
            className="flex-1 justify-center px-6"
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View className="mb-8">
              <Text 
                style={{ 
                  fontSize: 28, 
                  color: '#000', 
                  marginBottom: 4, 
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                Create Your Profile
              </Text>
              <Text 
                style={{ 
                  fontSize: 16, 
                  color: '#666', 
                  fontWeight: '400',
                  textAlign: 'center',
                }}
              >
                Let's personalize your study experience
              </Text>
            </View>

            {/* Profile Picture Section */}
            <View className="items-center mb-8">
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
                        setAvatarUrl(null);
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

            {/* Profile Information Section */}
            <View className="space-y-4">
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

              <AuthButton
                title="Create Profile"
                loading={loading}
                onPress={handleCreateProfile}
                className="mt-4"
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}; 