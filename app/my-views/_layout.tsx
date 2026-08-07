import { Stack } from 'expo-router'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'

export default function MyViewsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2094F3' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'As Minhas Views',
          headerLeft: () => <HeaderBackButton fallback="/(tabs)/profile" />,
        }}
      />
    </Stack>
  )
}
