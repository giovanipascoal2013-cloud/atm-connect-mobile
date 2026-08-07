import { Stack } from 'expo-router'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'
import { colors } from '../../src/theme/tokens'

export default function AgentStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen
        name="submit-atm"
        options={{
          title: 'Submeter ATM',
          headerLeft: () => <HeaderBackButton fallback="/(tabs)/agent" color={colors.text.primary} />,
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
