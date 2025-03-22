import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type LoadingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Loading'>;

const LoadingScreen = () => {
  const navigation = useNavigation<LoadingScreenNavigationProp>();

  const handleStart = () => {
    navigation.replace('Auth');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Right-Track</Text>
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startText}>Start →</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.decorativeElementone} />
      <View style={styles.decorativeElementtwo} />
      <View style={styles.decorativeElementthree} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c16',
    position: 'relative',
    padding: 10,
  },
  title: {
    fontSize: 64,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 250,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  textContainer: {
    flex: 1,
    marginRight: 20,
  },
  subtitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 44,
  },
  highlightText: {
    color: '#6966ff',
  },
  startButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#6966ff',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  startText: {
    color: '#6966ff',
    fontSize: 16,
    fontWeight: '600',
  },
  decorativeElementone: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6966ff',
    opacity: 0.1,
  },
  decorativeElementtwo: {
    position: 'absolute',
    bottom: 100,
    left: 320,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6966ff',
    opacity: 0.1,
  },
  decorativeElementthree: {
    position: 'absolute',
    bottom: 420,
    left: 20,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#6966ff',
    opacity: 0.1,
  },
});

export default LoadingScreen; 