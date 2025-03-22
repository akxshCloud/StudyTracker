import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthInput } from '../../components/auth/AuthInput';
import { AuthButton } from '../../components/auth/AuthButton';
import { supabase } from '../../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const emailShakeAnim = useRef(new Animated.Value(0)).current;
  const passwordShakeAnim = useRef(new Animated.Value(0)).current;

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

  const handleLogin = async () => {
    // Reset error states
    setEmailError(false);
    setPasswordError(false);
    setEmailErrorMessage('');
    setPasswordErrorMessage('');

    if (!email && !password) {
      setEmailError(true);
      setPasswordError(true);
      setEmailErrorMessage('Email is required');
      setPasswordErrorMessage('Password is required');
      shakeAnimation(emailShakeAnim);
      shakeAnimation(passwordShakeAnim);
      return;
    }

    if (!email) {
      setEmailError(true);
      setEmailErrorMessage('Email is required');
      shakeAnimation(emailShakeAnim);
      return;
    }

    if (!password) {
      setPasswordError(true);
      setPasswordErrorMessage('Password is required');
      shakeAnimation(passwordShakeAnim);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email')) {
          setEmailError(true);
          setEmailErrorMessage('Invalid email address');
          shakeAnimation(emailShakeAnim);
        } else if (error.message.toLowerCase().includes('password')) {
          setPasswordError(true);
          setPasswordErrorMessage('Incorrect password');
          shakeAnimation(passwordShakeAnim);
        } else {
          // If we can't determine which field caused the error, show a general error
          setEmailError(true);
          setPasswordError(true);
          setEmailErrorMessage('Invalid credentials');
          setPasswordErrorMessage('Invalid credentials');
          shakeAnimation(emailShakeAnim);
          shakeAnimation(passwordShakeAnim);
        }
        throw error;
      }
    } catch (error: any) {
      // Error is already handled above
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
                fontSize: 50, 
                color: '#000', 
                marginBottom: 4, 
                fontWeight: '800',
                textAlign: 'center',
              }}
            >
              Right-Track
            </Text>
            <Text 
              style={{ 
                fontSize: 18, 
                color: '#666', 
                fontWeight: '300',
                textAlign: 'center',
              }}
            >
              Welcome back!
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

          <AuthButton
            title="Login"
            loading={loading}
            onPress={handleLogin}
            className="mb-4"
          />

          <View className="flex-row justify-between items-center">
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text 
                style={{ 
                  fontSize: 15, 
                  color: '#4B6BFB', 
                  fontWeight: '600',
                }}
              >
                New here?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text 
                style={{ 
                  fontSize: 15, 
                  color: '#4B6BFB', 
                  fontWeight: '500',
                }}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}; 