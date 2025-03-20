import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

interface ForgotPasswordScreenProps {
  navigation: ForgotPasswordScreenNavigationProp;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const emailShakeAnim = useRef(new Animated.Value(0)).current;

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
  }, []);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError(false);
  };

  const shakeAnimation = (target: Animated.Value) => {
    target.setValue(0);
    Animated.sequence([
      Animated.timing(target, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(target, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(target, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(target, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      setEmailError(true);
      shakeAnimation(emailShakeAnim);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'studytracker://reset-password',
      });

      if (error) {
        setEmailError(true);
        shakeAnimation(emailShakeAnim);
        throw error;
      }

      Alert.alert(
        'Success',
        'If an account exists with this email, you will receive password reset instructions.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
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
              Reset Password
            </Text>
            <Text 
              style={{ 
                fontSize: 16, 
                color: '#666', 
                fontWeight: '400',
                textAlign: 'center',
              }}
            >
              Enter your email to receive reset instructions
            </Text>
          </View>

          <Animated.View style={{ transform: [{ translateX: emailShakeAnim }] }}>
            <AuthInput
              label="Email"
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={handleEmailChange}
              error={emailError}
              autoFocus={false}
            />
          </Animated.View>

          <AuthButton
            title="Send Reset Link"
            loading={loading}
            onPress={handleResetPassword}
            className="mb-4"
          />

          <View className="flex-row justify-center items-center">
            <Text 
              style={{ 
                fontSize: 15, 
                color: '#666', 
                fontWeight: '400',
              }}
            >
              Remember your password?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text 
                style={{ 
                  fontSize: 15, 
                  color: '#4B6BFB', 
                  fontWeight: '600',
                }}
              >
                Login
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}; 