import { Stack } from 'expo-router'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'
import { colors } from '../../src/theme/tokens'

export default function RankingLayout() {
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
          title: 'Ranking',
          headerLeft: () => <HeaderBackButton fallback="/(tabs)/profile" color={colors.text.primary} />,
        }}
      />
    </Stack>
  )
}
