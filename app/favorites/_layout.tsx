import { Stack } from 'expo-router'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'
import { colors } from '../../src/theme/tokens'

export default function FavoritesLayout() {
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
        name="index"
        options={{
          title: 'Favoritos',
          headerLeft: () => <HeaderBackButton fallback="/(tabs)/map" color={colors.text.primary} />,
        }}
      />
    </Stack>
  )
}