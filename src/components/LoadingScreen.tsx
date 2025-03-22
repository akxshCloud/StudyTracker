import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { RootStackParamList } from '../navigation/RootNavigator';

type LoadingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Loading'>;

const { width, height } = Dimensions.get('window');

const DECORATIVE_EMOJIS = [
  { emoji: '📚', style: 'books' },         // Stack of books
  { emoji: '✏️', style: 'pencilTop' },     // Pencil
  { emoji: '📊', style: 'chart' },         // Chart
  { emoji: '🎓', style: 'graduationCap' }, // Graduation cap
  { emoji: '💡', style: 'lightBulb' },     // Light bulb
  { emoji: '📝', style: 'memo' }           // Memo
];

const SHAPES = [
  {
    // Long rounded rectangle
    path: "M10,10 h200 a12,12 0 0 1 0,24 h-200 a12,12 0 0 1 0,-24",
    color: "#6966ff"
  },
  {
    // Circle
    path: "M60,60 m-45,0 a45,45 0 1,0 90,0 a45,45 0 1,0 -90,0",
    color: "#ffffff"
  },
  {
    // Medium rectangle
    path: "M10,10 h160 v80 h-160 v-80",
    color: "#6966ff"
  },
  {
    // Small circle
    path: "M35,35 m-30,0 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0",
    color: "#ffffff"
  },
  {
    // Medium rounded rectangle
    path: "M10,10 h120 a10,10 0 0 1 0,40 h-120 a10,10 0 0 1 0,-40",
    color: "#6966ff"
  },
  {
    // Small rounded rectangle
    path: "M10,10 h100 a8,8 0 0 1 0,16 h-100 a8,8 0 0 1 0,-16",
    color: "#ffffff"
  },
  {
    // Thin long rectangle
    path: "M10,10 h180 v12 h-180 v-12",
    color: "#6966ff"
  }
];

const FloatingEmoji = ({ emoji, style }: { emoji: string; style: any }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <Animated.Text
      style={[
        styles.decorativeEmoji,
        style,
        {
          transform: [{ scale }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
};

const FloatingShape = ({ path, color, style }: { path: string; color: string; style: any }) => {
  return (
    <View style={[styles.shapeContainer, style]}>
      <Svg width={200} height={200} viewBox="0 0 200 200">
        <Path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      </Svg>
    </View>
  );
};

const LoadingScreen = () => {
  const navigation = useNavigation<LoadingScreenNavigationProp>();
  const [text, setText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [hideCursor, setHideCursor] = useState(false);
  const fullText = 'Right-Track';
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonGlow = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(buttonScale, {
        toValue: 1.05,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(buttonGlow, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(buttonGlow, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  };

  useEffect(() => {
    const typeText = async () => {
      // Initial typing with fade and scale effect for each character
      for (let i = 0; i <= fullText.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 150));
        setText(fullText.slice(0, i));
        // Pulse effect for new character
        Animated.sequence([
          Animated.timing(textOpacity, {
            toValue: 0.7,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Wait before backspacing
      await new Promise(resolve => setTimeout(resolve, 800));

      // Backspace 'ght' from 'Right' with fade effect
      for (let i = fullText.length; i > 2; i--) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setText(fullText.slice(0, i - 1));
        Animated.timing(textOpacity, {
          toValue: 0.7,
          duration: 50,
          useNativeDriver: true,
        }).start();
      }

      // Wait before typing 'ght' back
      await new Promise(resolve => setTimeout(resolve, 400));

      // Type 'ght' back and continue with '-Track'
      for (let i = 2; i <= fullText.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 150));
        setText(fullText.slice(0, i));
        Animated.sequence([
          Animated.timing(textOpacity, {
            toValue: 0.7,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Wait 2 seconds after completing the word before hiding cursor
      await new Promise(resolve => setTimeout(resolve, 2000));
      setHideCursor(true);
    };

    typeText();

    // Start cursor blinking
    const cursorInterval = setInterval(() => {
      if (!hideCursor) {
        setShowCursor(prev => !prev);
      }
    }, 530);

    return () => {
      clearInterval(cursorInterval);
    };
  }, []);

  const handleStart = () => {
    navigation.replace('Auth');
  };

  return (
    <LinearGradient
      colors={['#0f1025', '#1a1b35']}
      style={styles.container}
    >
      <View style={styles.titleContainer}>
        <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
          {text}
          {!hideCursor && <Text style={[styles.cursor, { opacity: showCursor ? 1 : 0 }]}>|</Text>}
        </Animated.Text>
      </View>

      {DECORATIVE_EMOJIS.map((item, index) => (
        <FloatingEmoji
          key={index}
          emoji={item.emoji}
          style={styles[item.style as keyof typeof styles]}
        />
      ))}

      <View style={styles.bottomContainer}>
        <Animated.View style={styles.startButtonContainer}>
          <Animated.View
            style={{
              backgroundColor: buttonGlow.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(105, 102, 255, 0.1)', 'rgba(105, 102, 255, 0.2)']
              }),
              shadowOpacity: buttonGlow.interpolate({
                inputRange: [0, 1],
                outputRange: [0.25, 0.4]
              }),
              borderRadius: 24,
            }}
          >
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={handleStart}
              style={styles.startButton}
            >
              <Text style={styles.startText}>Start →</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    padding: 10,
    overflow: 'hidden',
  },
  titleContainer: {
    position: 'absolute',
    top: 60,
    right: 30,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'right',
    textShadowColor: 'rgba(255, 255, 255, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cursor: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '700',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  startButtonContainer: {
    overflow: 'hidden',
    borderRadius: 24,
  },
  startButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#6966ff',
    borderRadius: 24,
    backgroundColor: 'rgba(105, 102, 255, 0.1)',
    shadowColor: '#6966ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  startText: {
    color: '#6966ff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  decorativeEmoji: {
    position: 'absolute',
    fontSize: 42,
    opacity: 0.9,
    backgroundColor: 'transparent',
  },
  books: {
    top: '32%',
    left: '28%',
    transform: [{ rotate: '-15deg' }],
  },
  pencilTop: {
    top: '28%',
    left: '42%',
    transform: [{ rotate: '35deg' }],
  },
  chart: {
    top: '35%',
    left: '38%',
    transform: [{ rotate: '-5deg' }],
  },
  graduationCap: {
    top: '40%',
    left: '35%',
    transform: [{ rotate: '20deg' }],
  },
  lightBulb: {
    top: '38%',
    left: '45%',
    transform: [{ rotate: '-25deg' }],
  },
  memo: {
    top: '42%',
    left: '40%',
    transform: [{ rotate: '15deg' }],
  },
  shapeContainer: {
    position: 'absolute',
    width: 250,
    height: 250,
    opacity: 0.2,
  },
  shapeTopLeft: {
    top: '15%',
    left: '10%',
    transform: [{ rotate: '25deg' }],
  },
  shapeTopRight: {
    top: '20%',
    right: '15%',
    transform: [{ rotate: '-15deg' }],
  },
  shapeBottomLeft: {
    bottom: '30%',
    left: '5%',
    transform: [{ rotate: '-20deg' }],
  },
  shapeBottomRight: {
    bottom: '25%',
    right: '10%',
    transform: [{ rotate: '10deg' }],
  },
  shapeCenter: {
    top: '45%',
    left: '25%',
    transform: [{ rotate: '-5deg' }],
  },
  shapeMiddleRight: {
    top: '35%',
    right: '20%',
    transform: [{ rotate: '15deg' }],
  },
  shape1: {
    top: '28%',
    left: '30%',
    transform: [{ rotate: '35deg' }],
  },
});

export default LoadingScreen; 