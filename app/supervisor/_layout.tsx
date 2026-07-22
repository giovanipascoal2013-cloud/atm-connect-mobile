import { Stack } from 'expo-router'

export default function SupervisorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#10B981' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="pending" options={{ title: 'ATMs Pendentes' }} />
    </Stack>
  )
}
