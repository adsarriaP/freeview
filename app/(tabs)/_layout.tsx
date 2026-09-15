import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

const ACTIVE_COLOR = '#E6F4FE';
const INACTIVE_COLOR = '#555';
const ICON_SIZE = 24;

export default function TabLayout() {
  const isTV = Platform.isTV;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111',
          borderTopWidth: 0,
          // Ocultar tab bar en TV (se puede construir un menu lateral mas adelante)
          display: isTV ? 'none' : 'flex',
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name="house.fill"
              size={ICON_SIZE}
              tintColor={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: 'Peliculas',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name="film.fill"
              size={ICON_SIZE}
              tintColor={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: 'Series',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name="tv.fill"
              size={ICON_SIZE}
              tintColor={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="anime"
        options={{
          title: 'Anime',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name="star.fill"
              size={ICON_SIZE}
              tintColor={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name="magnifyingglass"
              size={ICON_SIZE}
              tintColor={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="addons"
        options={{
          title: 'Addons',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name="puzzlepiece.fill"
              size={ICON_SIZE}
              tintColor={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Biblioteca',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name="books.vertical.fill"
              size={ICON_SIZE}
              tintColor={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ focused }) => (
            <SymbolView
              name="gearshape.fill"
              size={ICON_SIZE}
              tintColor={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
    </Tabs>
  );
}
