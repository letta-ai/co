import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AgentsDrawerContent from '../components/AgentsDrawerContent';
import useAppStore from '../store/appStore';

export type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
};

export type MainDrawerParamList = {
  Chat: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<MainDrawerParamList>();

function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <AgentsDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        drawerPosition: 'left',
        drawerStyle: {
          width: '80%',
          maxWidth: 350,
        },
      }}
    >
      <Drawer.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerTitle: 'Letta Chat',
          drawerLabel: 'Chat',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: 'Settings',
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated } = useAppStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainDrawer} />
        ) : (
          <Stack.Screen name="Settings" component={SettingsScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;