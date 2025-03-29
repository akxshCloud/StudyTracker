import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoadingScreen from '../components/LoadingScreen';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export type RootStackParamList = {
  Loading: undefined;
  Auth: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const checkProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking profile:', error);
      }
      
      setHasProfile(!!data);
      return !!data;
    } catch (error) {
      console.error('Error in checkProfile:', error);
      setHasProfile(false);
      return false;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error);
        }
        setSession(session);
        if (session?.user) {
          await checkProfile(session.user.id);
        }
      })
      .catch((error) => {
        console.error('Error in getSession:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      
      if (event === 'SIGNED_OUT') {
        setHasProfile(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        await checkProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade'
      }}
    >
      {!session ? (
        <>
          <Stack.Screen name="Loading" component={LoadingScreen} />
          <Stack.Screen name="Auth" component={AuthNavigator} />
        </>
      ) : hasProfile ? (
        <Stack.Screen name="App" component={AppNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}; 