import { Stack } from 'expo-router'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'

export default function SupervisorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2094F3' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="pending"
        options={{
          title: 'ATMs Pendentes',
          headerLeft: () => <HeaderBackButton fallback="/(tabs)/supervisor" />,
        }}
      />
    </Stack>
  )
}
