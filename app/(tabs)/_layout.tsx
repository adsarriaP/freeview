import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  const isTV = Platform.isTV;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111',
          borderTopWidth: 0,
          // Hide tab bar on TV (we could build a custom side-menu for TV later)
          display: isTV ? 'none' : 'flex',
        },
        tabBarActiveTintColor: '#E6F4FE',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
