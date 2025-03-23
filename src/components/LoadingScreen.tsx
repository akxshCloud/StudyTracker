import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Image, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/RootNavigator';

type LoadingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Loading'>;

const { width, height } = Dimensions.get('window');

const LoadingScreen = () => {
  const navigation = useNavigation<LoadingScreenNavigationProp>();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

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

  return (
    <LinearGradient
      colors={['#0f1025', '#1a1b35']}
      style={styles.container}
    >
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
        <LinearGradient
          colors={['rgba(15, 16, 37, 0)', 'rgba(15, 16, 37, 1)']}
          style={styles.bottomGradient}
        >
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
        </LinearGradient>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
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
  bottomGradient: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 48,
    justifyContent: 'flex-end',
  },
  contentWrapper: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#6966ff',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(15, 16, 37, 0.3)',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: width - 48,
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
    fontWeight: '900',
    color: '#ffffff',
    textShadowColor: 'rgba(255, 255, 255, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  startButtonContainer: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  startButtonPressable: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 50,
    backgroundColor: 'transparent',
  },
  startText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
  }
});

export default LoadingScreen; 