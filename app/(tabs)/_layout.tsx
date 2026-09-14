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
          title: 'Inicio',
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: 'Peliculas',
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: 'Series',
        }}
      />
      <Tabs.Screen
        name="anime"
        options={{
          title: 'Anime',
        }}
      />
      <Tabs.Screen
        name="addons"
        options={{
          title: 'Addons',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Biblioteca',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
        }}
      />
    </Tabs>
  );
}
