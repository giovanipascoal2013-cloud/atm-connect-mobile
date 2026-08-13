import { View, Text, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useFavorites } from '../../src/hooks/useFavorites'
import { useAuth } from '../../src/hooks/useAuth'
import { ATMList } from '../../src/components/map/ATMList'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { AppButton } from '../../src/components/ui/AppButton'
import { colors } from '../../src/theme/tokens'

export default function FavoritesScreen() {
  const router = useRouter()
  const { user, isPremium } = useAuth()
  const { favoriteAtms, loading, toggleFavorite, refetch } = useFavorites()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text style={{ color: colors.text.secondary, marginTop: 12 }}>A carregar favoritos...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 32 }}>
        <EmptyState
          icon="heart-outline"
          title="Inicia sessão"
          description="Entra para guardar os teus ATMs favoritos."
        />
        <AppButton label="Entrar" onPress={() => router.push('/(auth)/login')} icon="log-in-outline" />
      </View>
    )
  }

  return (
    <ATMList
      atms={favoriteAtms}
      onPress={(atm) => router.push({ pathname: '/(tabs)/map', params: { openAtm: atm.id } })}
      loading={false}
      onRefresh={refetch}
      refreshing={loading}
      lockedIds={new Set()}
      isPremium={isPremium}
      isLoggedIn={!!user}
      favoriteIds={new Set(favoriteAtms.map((a) => a.id))}
      onToggleFavorite={(atmId) => { void toggleFavorite(atmId) }}
    />
  )
}