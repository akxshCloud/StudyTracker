import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AddSessionScreen } from '../screens/sessions/AddSessionScreen';
import { StudyGroupScreen } from '../screens/groups/StudyGroupScreen';
import { CreateGroupScreen } from '../screens/groups/CreateGroupScreen';

export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  AddSession: undefined;
  StudyGroup: { groupId: string };
  CreateGroup: undefined;
  AddGroupTask: { groupId: string };
  AddGroupMember: { groupId: string };
  TaskDetails: { taskId: string };
  EditGroup: { groupId: string };
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
      {/* We'll add these screens later */}
      {/* <Stack.Screen name="AddGroupTask" component={AddGroupTaskScreen} />
      <Stack.Screen name="AddGroupMember" component={AddGroupMemberScreen} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
      <Stack.Screen name="EditGroup" component={EditGroupScreen} /> */}
    </Stack.Navigator>
  );
}; 