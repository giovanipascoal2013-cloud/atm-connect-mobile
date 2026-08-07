import { Stack } from 'expo-router'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'

export default function AgentStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2094F3' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="submit-atm"
        options={{
          title: 'Submeter ATM',
          headerLeft: () => <HeaderBackButton fallback="/(tabs)/agent" />,
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          title: 'Bem-vindo, Agente',
          headerShown: false,
        }}
      />
    </Stack>
  )
}
