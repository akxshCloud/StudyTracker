import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type SignUpScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

interface SignUpScreenProps {
  navigation: SignUpScreenNavigationProp;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [confirmPasswordErrorMessage, setConfirmPasswordErrorMessage] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const emailShakeAnim = useRef(new Animated.Value(0)).current;
  const passwordShakeAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordShakeAnim = useRef(new Animated.Value(0)).current;

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

  // Clear errors when user starts typing
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailError(false);
    setEmailErrorMessage('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setPasswordError(false);
    setPasswordErrorMessage('');
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    setConfirmPasswordError(false);
    setConfirmPasswordErrorMessage('');
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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Success',
        'Please check your email for verification. After verifying, you will be asked to create your profile.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleSignUp:', error);
      Alert.alert('Error', 'An unexpected error occurred');
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
              Create Account
            </Text>
            <Text 
              style={{ 
                fontSize: 16, 
                color: '#666', 
                fontWeight: '400',
                textAlign: 'center',
              }}
            >
              Start tracking your study progress
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
              errorMessage={emailErrorMessage}
              autoFocus={false}
            />
          </Animated.View>

          <Animated.View style={{ transform: [{ translateX: passwordShakeAnim }] }}>
            <AuthInput
              label="Password"
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={handlePasswordChange}
              error={passwordError}
              errorMessage={passwordErrorMessage}
              autoFocus={false}
            />
          </Animated.View>

          <Animated.View style={{ transform: [{ translateX: confirmPasswordShakeAnim }] }}>
            <AuthInput
              label="Confirm Password"
              placeholder="Confirm Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              error={confirmPasswordError}
              errorMessage={confirmPasswordErrorMessage}
              autoFocus={false}
            />
          </Animated.View>

          <AuthButton
            title="Sign Up"
            loading={loading}
            onPress={handleSignUp}
            className="mb-4"
          />

          <View className="flex-row justify-center items-center">
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text 
                style={{ 
                  fontSize: 15, 
                  color: '#4B6BFB', 
                  fontWeight: '600',
                }}
              >
                Already have an account?
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}; 