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
          // O ranking passou a ser alcançável a partir do mapa (público), por isso o
// fallback do botão de voltar é o mapa e não o perfil (que é login-gated).
headerLeft: () => <HeaderBackButton fallback="/(tabs)/map" color={colors.text.primary} />,
        }}
      />
    </Stack>
  )
}
