import { Stack } from 'expo-router'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'
import { colors } from '../../src/theme/tokens'

export default function SupervisorLayout() {
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
        name="pending"
        options={{
          title: 'ATMs Pendentes',
          headerLeft: () => <HeaderBackButton fallback="/(tabs)/supervisor" color={colors.text.primary} />,
        }}
      />
    </Stack>
  )
}
