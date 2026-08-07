import { Tabs, useRouter } from 'expo-router'
import { Text, TouchableOpacity } from 'react-native'
import { useAuth } from '../../src/hooks/useAuth'

export default function TabLayout() {
  const { user, isAgent, isSupervisor } = useAuth()
  const router = useRouter()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2094F3',
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
          backgroundColor: '#2094F3',
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
          headerRight: () =>
            !user ? (
              <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={{ paddingHorizontal: 16 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Entrar</Text>
              </TouchableOpacity>
            ) : undefined,
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
