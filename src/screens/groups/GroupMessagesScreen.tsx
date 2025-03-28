import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { GroupMessage } from '../../types/studyGroup';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type GroupMessagesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GroupMessages'>;
type GroupMessagesScreenRouteProp = RouteProp<RootStackParamList, 'GroupMessages'>;

export const GroupMessagesScreen: React.FC = () => {
  const navigation = useNavigation<GroupMessagesScreenNavigationProp>();
  const route = useRoute<GroupMessagesScreenRouteProp>();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const messagesRef = useRef<GroupMessage[]>([]);

  // Keep messagesRef in sync with messages state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setup = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        // Fetch initial messages
        await fetchMessages();

        // Set up real-time subscription
        channel = supabase.channel(`group-messages-${route.params.groupId}`);
        
        channel
          .on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'group_messages',
              filter: `group_id=eq.${route.params.groupId}`
            }, 
            async (payload: RealtimePostgresChangesPayload<{
              id: string;
              group_id: string;
              sender_id: string;
              content: string;
              created_at: string;
            }> & { new: {
              id: string;
              group_id: string;
              sender_id: string;
              content: string;
              created_at: string;
            }}) => {
              try {
                console.log('New message received:', payload);
                const newMessage = payload.new;

                // Use messagesRef for the latest state
                if (messagesRef.current.some(msg => msg.id === newMessage.id)) {
                  console.log('Message already exists, skipping...');
                  return;
                }
                  
                // Fetch the sender's profile
                const { data: senderProfile, error: profileError } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', newMessage.sender_id)
                  .single();

                if (profileError) throw profileError;

                // Add sender information to the message
                const messageWithSender: GroupMessage = {
                  id: newMessage.id,
                  group_id: newMessage.group_id,
                  sender_id: newMessage.sender_id,
                  content: newMessage.content,
                  created_at: newMessage.created_at,
                  sender: senderProfile ? {
                    id: senderProfile.id,
                    full_name: senderProfile.full_name,
                    avatar_url: senderProfile.avatar_url
                  } : undefined
                };

                // Update messages state
                setMessages(prevMessages => [...prevMessages, messageWithSender]);
                  
                // Scroll to bottom on new message
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              } catch (error) {
                console.error('Error handling real-time message:', error);
              }
            }
          )
          .subscribe((status: 'SUBSCRIBED' | 'CLOSED' | 'TIMED_OUT' | 'CHANNEL_ERROR') => {
            console.log('Subscription status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to real-time updates');
            }
          });
      } catch (error) {
        console.error('Error in setup:', error);
      }
    };

    setup();

    return () => {
      if (channel) {
        console.log('Unsubscribing from channel...');
        channel.unsubscribe();
      }
    };
  }, [route.params.groupId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    const messageToSend = newMessage.trim();
    try {
      setSending(true);
      setNewMessage(''); // Clear input immediately

      // Get the current user's profile first
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', currentUserId)
        .single();

      // Insert the message
      const { data: insertedMessage, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: route.params.groupId,
          sender_id: currentUserId,
          content: messageToSend,
        })
        .select()
        .single();

      if (error) throw error;

      if (insertedMessage) {
        // Immediately add the message to the UI
        const messageWithSender: GroupMessage = {
          ...insertedMessage,
          sender: senderProfile || undefined
        };
        
        setMessages(prev => [...prev, messageWithSender]);
        
        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }

      // Refresh messages to ensure consistency
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageToSend); // Restore the message if sending failed
    } finally {
      setSending(false);
    }
  };

  // Add periodic refresh
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (!sending) {
        fetchMessages();
      }
    }, 1000); // Refresh every 1 second

    return () => clearInterval(refreshInterval);
  }, [sending, route.params.groupId]);

  // Modify fetchMessages to prevent unnecessary updates
  const fetchMessages = async () => {
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', route.params.groupId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // If no new messages, don't proceed
      if (!messagesData || messagesData.length === messages.length) {
        return;
      }

      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      if (profilesError) throw profilesError;

      const messagesWithSenders = messagesData.map(message => ({
        ...message,
        sender: profilesData?.find(profile => profile.id === message.sender_id)
      }));

      // Only update if the messages are actually different
      const currentIds = new Set(messages.map(m => m.id));
      const newIds = new Set(messagesWithSenders.map(m => m.id));
      const hasChanges = messagesWithSenders.length !== messages.length || 
        [...newIds].some(id => !currentIds.has(id));

      if (hasChanges) {
        setMessages(messagesWithSenders);
        
        // Scroll to bottom for new messages
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatarUrl = (name: string | null | undefined, avatarUrl: string | null | undefined) => {
    const safeName = name || 'User';
    return avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=random&size=128`;
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-3 py-1 flex-row items-center border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-2"
        >
          <Ionicons name="chevron-back" size={24} color="#4B6BFB" />
        </TouchableOpacity>
        <Text className="text-2xl font-semibold text-gray-800">Group Chat</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 2 : 0}
      >
        <View className="flex-1">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#4B6BFB" />
            </View>
          ) : (
            <>
              <ScrollView
                ref={scrollViewRef}
                className="flex-1"
                contentContainerStyle={{ 
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                }}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
              >
                {messages.map((message, index) => (
                  <View
                    key={message.id}
                    className={`flex-row ${
                      message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                    } ${index > 0 ? 'mt-3' : ''}`}
                  >
                    {message.sender_id !== currentUserId && (
                      <Image
                        source={{
                          uri: getAvatarUrl(
                            message.sender?.full_name,
                            message.sender?.avatar_url
                          ),
                        }}
                        className="w-10 h-10 rounded-full mr-2"
                      />
                    )}
                    <View className="max-w-[80%] flex-shrink">
                      {message.sender_id !== currentUserId && (
                        <Text className="text-sm text-gray-600 mb-1 ml-1 font-medium">
                          {message.sender?.full_name || 'Unknown User'}
                        </Text>
                      )}
                      <View
                        className={`rounded-2xl px-4 py-2.5 ${
                          message.sender_id === currentUserId
                            ? 'bg-[#4B6BFB]'
                            : 'bg-gray-100'
                        }`}
                        style={{
                          alignSelf: message.sender_id === currentUserId ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <Text
                          className={`text-base ${
                            message.sender_id === currentUserId
                              ? 'text-white'
                              : 'text-gray-800'
                          }`}
                        >
                          {message.content}
                        </Text>
                      </View>
                      <Text className={`text-xs text-gray-500 mt-1.5 ${
                        message.sender_id === currentUserId ? 'text-right mr-1' : 'ml-1'
                      }`}>
                        {formatTime(message.created_at)}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View className="border-t border-gray-100">
                <View className="flex-row items-center space-x-2 px-4 py-3">
                  <TextInput
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Type a message..."
                    multiline
                    className="flex-1 bg-gray-100 rounded-full px-5 py-3 min-h-[44px] max-h-32 text-base"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    onPress={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className={`p-2.5 rounded-full ${
                      sending || !newMessage.trim() ? 'opacity-50' : ''
                    }`}
                  >
                    <Ionicons
                      name="send"
                      size={26}
                      color="#4B6BFB"
                    />
                  </TouchableOpacity>
                </View>
                {Platform.OS === 'ios' && <View className="h-1" />}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}; 