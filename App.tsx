import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 py-6">
        <Text className="text-2xl font-bold text-primary">
          Study Assistant
        </Text>
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}
