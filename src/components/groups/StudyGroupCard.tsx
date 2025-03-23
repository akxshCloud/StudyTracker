import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StudyGroup } from '../../types/studyGroup';

interface StudyGroupCardProps {
  group: StudyGroup;
  index: number;
  onPress: (group: StudyGroup) => void;
}

export const StudyGroupCard: React.FC<StudyGroupCardProps> = ({ group, index, onPress }) => {
  return (
    <TouchableOpacity
      onPress={() => onPress(group)}
      className={`bg-white rounded-xl shadow-sm mb-3 ${index > 0 ? '-mt-12' : ''}`}
      style={{
        transform: [{ scale: 1 - index * 0.05 }],
        zIndex: 10 - index,
      }}
    >
      <View className="p-4">
        <Text className="text-lg font-semibold text-gray-800 mb-1">{group.name}</Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-500">Total Hours</Text>
          <Text className="text-[#4B6BFB] font-medium">{group.total_hours.toFixed(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}; 