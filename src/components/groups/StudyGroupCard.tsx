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

interface Member {
  id: string;
  user: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const StudyGroupCard: React.FC<StudyGroupCardProps> = ({ group, index, onPress }) => {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const fetchCreatorAndMembers = async () => {
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

        // Fetch group members with their profiles
        const { data: membersData } = await supabase
          .from('group_members')
          .select(`
            id,
            user:profiles!user_id (
              full_name,
              avatar_url
            )
          `)
          .eq('group_id', group.id);

        if (membersData) {
          // Transform the data to match our Member type
          const transformedMembers: Member[] = membersData.map((member: any) => ({
            id: member.id,
            user: {
              full_name: member.user?.full_name || null,
              avatar_url: member.user?.avatar_url || null
            }
          }));
          setMembers(transformedMembers);
        }
      } catch (error) {
        console.error('Error fetching creator/members:', error);
      }
    };

    fetchCreatorAndMembers();
  }, [group.id, group.creator_id]);

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
        <Text className="text-lg font-semibold text-gray-800 mb-3">{group.name}</Text>
        <View className="flex-row justify-between items-center">
          {/* Member Avatars */}
          <View className="flex-row">
            {members.slice(0, 5).map((member, idx) => (
              <View
                key={member.id}
                className="rounded-full overflow-hidden border-2 border-white"
                style={{
                  width: 24,
                  height: 24,
                  marginLeft: idx === 0 ? 0 : -8,
                  zIndex: 5 - idx,
                }}
              >
                <Image
                  source={{ uri: getAvatarUrl(member.user.full_name, member.user.avatar_url) }}
                  className="w-full h-full"
                />
              </View>
            ))}
            {members.length > 5 && (
              <View 
                className="rounded-full bg-gray-200 border-2 border-white justify-center items-center"
                style={{
                  width: 24,
                  height: 24,
                  marginLeft: -8,
                }}
              >
                <Text className="text-xs text-gray-600">+{members.length - 5}</Text>
              </View>
            )}
          </View>

          {/* Creator Info */}
          {creator && (
            <View className="flex-row items-center">
              <View className="rounded-full overflow-hidden" style={{ width: 24, height: 24 }}>
                <Image
                  source={{ uri: getAvatarUrl(creator.full_name, creator.avatar_url) }}
                  className="w-full h-full"
                />
              </View>
              <Text className="text-gray-500 text-sm ml-2">
                {creator.full_name || 'User'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}; 