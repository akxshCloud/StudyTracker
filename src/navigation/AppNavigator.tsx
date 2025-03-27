import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AddSessionScreen } from '../screens/sessions/AddSessionScreen';
import { StudyGroupScreen } from '../screens/groups/StudyGroupScreen';
import { CreateGroupScreen } from '../screens/groups/CreateGroupScreen';
import { AddGroupTaskScreen } from '../screens/groups/AddGroupTaskScreen';
import { TaskDetailsScreen } from '../screens/groups/TaskDetailsScreen';
import { SessionDetailsScreen } from '../screens/sessions/SessionDetailsScreen';
import { AddGroupMemberScreen } from '../screens/groups/AddGroupMemberScreen';
import { EditGroupScreen } from '../screens/groups/EditGroupScreen';

export type RootStackParamList = {
  Loading: undefined;
  Auth: undefined;
  Home: undefined;
  Profile: undefined;
  AddSession: { groupId?: string } | undefined;
  StudyGroup: { groupId: string };
  CreateGroup: undefined;
  EditGroup: { groupId: string };
  AddGroupMember: { groupId: string };
  AddGroupTask: { groupId: string };
  TaskDetails: { taskId: number };
  SessionDetails: { sessionId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="AddSession" component={AddSessionScreen} />
      <Stack.Screen name="StudyGroup" component={StudyGroupScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="EditGroup" component={EditGroupScreen} />
      <Stack.Screen name="AddGroupTask" component={AddGroupTaskScreen} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="SessionDetails" component={SessionDetailsScreen} />
      <Stack.Screen
        name="AddGroupMember"
        component={AddGroupMemberScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}; 