import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { useAuth } from '../../src/hooks/useAuth'

export default function TabLayout() {
  const { isAgent, isSupervisor } = useAuth()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#10B981',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          headerTitle: 'ATM Connect',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>📍</Text>,
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          title: 'Fórum',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: 'Agente',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🏦</Text>,
          href: isAgent ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="supervisor"
        options={{
          title: 'Supervisor',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>👁️</Text>,
          href: isSupervisor ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>👤</Text>,
        }}
      />
    </Tabs>
  )
}
