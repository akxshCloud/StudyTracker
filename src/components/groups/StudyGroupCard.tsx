import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { StudyGroup } from '../../types/studyGroup';
import { supabase } from '../../lib/supabase';

interface StudyGroupCardProps {
  group: StudyGroup;
  index: number;
  onPress: (group: StudyGroup) => void;
}

interface Creator {
  full_name: string | null;
  avatar_url: string | null;
}

interface GroupMember {
  user_id: string;
  role: string;
  user: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const StudyGroupCard: React.FC<StudyGroupCardProps> = ({ group, index, onPress }) => {
  const [creator, setCreator] = useState<Creator | null>(null);

  useEffect(() => {
    const fetchCreator = async () => {
      try {
        // Fetch creator's profile
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', group.creator_id)
          .single();

        if (creatorData) {
          setCreator(creatorData);
        }
      } catch (error) {
        console.error('Error fetching creator:', error);
      }
    };

    fetchCreator();
  }, [group.creator_id]);

  const getAvatarUrl = (name: string | null, avatarUrl: string | null) => {
    return avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&size=128`;
  };

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
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-semibold text-gray-800">{group.name}</Text>
          
          {/* Member Avatars */}
          <View className="flex-row">
            {group.group_members && group.group_members.slice(0, 3).map((member: GroupMember, idx: number) => (
              <View
                key={member.user_id}
                className="rounded-full overflow-hidden border-2 border-white"
                style={{
                  width: 32,
                  height: 32,
                  marginLeft: idx === 0 ? 0 : -12,
                  zIndex: 3 - idx,
                }}
              >
                <Image
                  source={{ uri: getAvatarUrl(member.user?.full_name, member.user?.avatar_url) }}
                  className="w-full h-full"
                />
              </View>
            ))}
            {group.group_members && group.group_members.length > 3 && (
              <View 
                className="rounded-full bg-gray-200 border-2 border-white justify-center items-center"
                style={{
                  width: 32,
                  height: 32,
                  marginLeft: -12,
                }}
              >
                <Text className="text-xs text-gray-600">+{group.group_members.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}; 