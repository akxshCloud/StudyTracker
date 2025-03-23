import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Image, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';

type LoadingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Loading'>;

const { width, height } = Dimensions.get('window');

const LoadingScreen = () => {
  const navigation = useNavigation<LoadingScreenNavigationProp>();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Continuous floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.timing(buttonScale, {
      toValue: 0.95,
      duration: 100,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 100,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  };

  const handleStart = () => {
    navigation.replace('Auth');
  };

  const floatTransform = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10]
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.imageContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: floatTransform }]
          }
        ]}
      >
        <Image 
          source={require('../assets/start-screen-collage.png')}
          style={styles.collageImage}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.bottomContainer}>
        <View style={styles.bottomBackground}>
          <Animated.View 
            style={[
              styles.contentWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })}]
              }
            ]}
          >
            <Text style={styles.title}>
              Right-Track
            </Text>
            <Animated.View 
              style={[
                styles.startButtonContainer,
                {
                  transform: [{ scale: buttonScale }]
                }
              ]}
            >
              <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleStart}
                style={styles.startButtonPressable}
              >
                <Text style={styles.startText}>➜</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0A0B1E', // Deep navy background
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 100,
  },
  collageImage: {
    bottom: 50,
    width: width * 1,
    height: height * 0.5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  bottomBackground: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 48,
    justifyContent: 'flex-end',
    backgroundColor: '#0A0B1E', // Match container background
  },
  contentWrapper: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#6966ff',
    borderRadius: 50,
    paddingVertical: 5,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(15, 16, 37, 0.3)',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: width - 24,
    alignSelf: 'center',
    shadowColor: '#6966ff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_400Regular',
    color: '#ffffff',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(255, 255, 255, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  startButtonContainer: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  startButtonPressable: {
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 50,
    backgroundColor: 'transparent',
  },
  startText: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  }
});

export default LoadingScreen; 