import { Tabs, useRouter } from 'expo-router'
import { View, Text, TouchableOpacity } from 'react-native'
import { useAuth } from '../../src/hooks/useAuth'
import { AppIcon, type AppIconName } from '../../src/components/ui/AppIcon'
import { colors } from '../../src/theme/tokens'

export default function TabLayout() {
  const { user, isAgent, isSupervisor } = useAuth()
  const router = useRouter()

  const tabIcon = (focused: boolean, outline: AppIconName, filled: AppIconName) => (
    <AppIcon name={focused ? filled : outline} size={22} color={focused ? colors.brand[500] : '#6B7280'} />
  )

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand[500],
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: colors.border,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerShadowVisible: false,
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          headerTitle: 'ATM Connect',
          headerStyle: {
            backgroundColor: colors.brand[500],
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
            color: '#FFFFFF',
          },
          tabBarIcon: ({ focused }) => tabIcon(focused, 'map-outline', 'map'),
          headerRight: () =>
            user ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
                <TouchableOpacity onPress={() => router.push('/favorites')} style={{ padding: 4 }} hitSlop={8}>
                  <AppIcon name="star-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={{ paddingHorizontal: 16 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Entrar</Text>
              </TouchableOpacity>
            ),
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          title: 'Fórum',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'chatbubbles-outline', 'chatbubbles'),
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: 'Agente',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'business-outline', 'business'),
          href: isAgent ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="supervisor"
        options={{
          title: 'Supervisor',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'eye-outline', 'eye'),
          href: isSupervisor ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'person-outline', 'person'),
        }}
      />
    </Tabs>
  )
}
