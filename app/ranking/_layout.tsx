import { Stack } from 'expo-router'

export default function RankingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#10B981' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ranking' }} />
    </Stack>
  )
}
