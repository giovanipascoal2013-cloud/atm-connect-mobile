import { useState, useCallback, useMemo } from 'react'
import { View, ActivityIndicator, Text, Keyboard, TouchableWithoutFeedback } from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'
import { useLocation } from '../../src/hooks/useLocation'
import { useATMs, type ATMWithDistance, type ATMStatus, type SortMode } from '../../src/hooks/useATMs'
import { useAdMob } from '../../src/hooks/useAdMob'
import { useAdUnlocks } from '../../src/hooks/useAdUnlocks'
import { useFavorites } from '../../src/hooks/useFavorites'
import { supabase } from '../../src/lib/supabase'
import { ATMMapView } from '../../src/components/map/ATMMapView'
import { MapFilters } from '../../src/components/map/MapFilters'
import { ATMList } from '../../src/components/map/ATMList'
import { ATMDetailSheet } from '../../src/components/map/ATMDetailSheet'
import { PremiumModal } from '../../src/components/premium/PremiumModal'
import { LogoPin } from '../../src/components/ui/LogoPin'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { AppButton } from '../../src/components/ui/AppButton'
import { colors, shadows } from '../../src/theme/tokens'

type ViewMode = 'map' | 'list'

export default function MapScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ openAtm?: string }>()
  const { user, isPremium } = useAuth()
  const { location, permission, loading: locationLoading, requestAgain } = useLocation()
  const { showRewarded, isLoaded, loading: adLoading, loadRewarded } = useAdMob()
  const { unlocks, hasValidUnlock, createUnlock } = useAdUnlocks()
  const { favoriteAtms, isFavorite, toggleFavorite } = useFavorites()
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ATMStatus | 'all'>('all')
  const [city, setCity] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('proximity')
  const [selectedATM, setSelectedATM] = useState<ATMWithDistance | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [premiumVisible, setPremiumVisible] = useState(false)
  const [agentRating, setAgentRating] = useState<{ likes: number; dislikes: number } | null>(null)
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null)

  const { atms, cities, loading: atmsLoading, error, refetch } = useATMs({
    search,
    status,
    city,
    sortMode,
    userLocation: location,
  })

  const unlockedIds = useMemo(() => {
    const set = new Set<string>()
    unlocks.forEach((_, atmId) => {
      if (hasValidUnlock(atmId)) set.add(atmId)
    })
    return set
  }, [unlocks, hasValidUnlock])

  const fetchRating = useCallback(async (atm: ATMWithDistance) => {
    setAgentRating(null)
    setUserVote(null)
    if (!atm.agent_id) return
    const { data } = await supabase.rpc('get_agent_rating_stats', {
      _agent_id: atm.agent_id,
      _user_id: user?.id,
    })
    if (data) {
      const parsed = data as unknown as { likes: number; dislikes: number; total: number }
      setAgentRating({ likes: parsed.likes ?? 0, dislikes: parsed.dislikes ?? 0 })
    }
  }, [user?.id])

  const handleATMPress = useCallback(async (atm: ATMWithDistance) => {
    setSelectedATM(atm)
    setSheetVisible(true)
    setUnlocked(hasValidUnlock(atm.id))
    fetchRating(atm)
  }, [hasValidUnlock, fetchRating])

  useFocusEffect(
    useCallback(() => {
      const openAtm = params.openAtm
      if (!openAtm) return
      const target = atms.find((a) => a.id === openAtm)
      if (target) {
        handleATMPress(target)
        router.setParams({ openAtm: undefined })
      }
    }, [params.openAtm, atms, handleATMPress, router])
  )

  const handleWatchAd = useCallback(async () => {
    if (!selectedATM) return
    if (!user) {
      router.push('/(auth)/login')
      return
    }
    if (unlocking) return
    if (adLoading) return
    if (!isLoaded) {
      // Anúncio ainda não carregado: (re)carrega e dá feedback no botão
      loadRewarded()
      return
    }
    setUnlocking(true)
    try {
      const watched = await showRewarded()
      if (watched) {
        const success = await createUnlock(selectedATM.id)
        if (success) {
          setUnlocked(true)
        }
      }
    } catch (e) {
      console.warn('Watch ad error:', e)
    } finally {
      setUnlocking(false)
    }
  }, [selectedATM, user, unlocking, adLoading, isLoaded, showRewarded, createUnlock, loadRewarded, router])

  const handleVote = useCallback(async (value: 'like' | 'dislike') => {
    if (!selectedATM) return
    if (!user) {
      router.push('/(auth)/login')
      return
    }
    if (userVote === value) return
    const prevVote = userVote
    setUserVote(value)
    const { error } = await supabase.rpc('vote_agent', {
      _user_id: user.id,
      _atm_id: selectedATM.id,
      _vote: value === 'like',
    })
    if (error) {
      setUserVote(prevVote)
      return
    }
    if (selectedATM.agent_id) fetchRating(selectedATM)
  }, [selectedATM, user, userVote, fetchRating, router])

  const handleCloseSheet = () => {
    setSheetVisible(false)
    setUnlocked(false)
  }

  if (locationLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text style={{ color: colors.text.secondary, marginTop: 12 }}>A obter localização...</Text>
      </View>
    )
  }

  if (permission === 'denied') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 32 }}>
        <LogoPin size={64} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 8, marginTop: 10 }}>
          Localização necessária
        </Text>
        <Text style={{ color: colors.text.secondary, textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>
          Permita o acesso à localização para encontrar ATMs próximos
        </Text>
        <AppButton label="Tentar novamente" onPress={requestAgain} icon="refresh" />
      </View>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingTop: 12, paddingHorizontal: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <SegmentedControl
            options={[
              { key: 'map', label: 'Mapa' },
              { key: 'list', label: 'Lista' },
            ]}
            value={viewMode}
            onChange={(m) => setViewMode(m)}
            style={{ width: 180 }}
          />
        </View>

        <MapFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          city={city}
          cities={cities}
          onCityChange={setCity}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />

        <View style={{ paddingHorizontal: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280' }}>
            {atms.length > 0
              ? `${atms.length} ATM${atms.length !== 1 ? 's' : ''}`
              : 'Nenhum ATM'}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, position: 'relative', marginTop: 8 }}>
        {viewMode === 'map' ? (
          <ATMMapView
            atms={atms}
            userLocation={location}
            selectedATMId={selectedATM?.id || null}
            onATMPress={handleATMPress}
            lockedIds={unlockedIds}
            isPremium={isPremium}
            isLoggedIn={!!user}
          />
        ) : (
          <ATMList
            atms={atms}
            onPress={handleATMPress}
            loading={atmsLoading && atms.length === 0}
            refreshing={atmsLoading && atms.length > 0}
            error={error}
            onRetry={refetch}
            onRefresh={refetch}
            lockedIds={unlockedIds}
            isPremium={isPremium}
            isLoggedIn={!!user}
            favoriteIds={new Set(favoriteAtms.map((a) => a.id))}
            onToggleFavorite={(atmId) => { void toggleFavorite(atmId) }}
          />
        )}

        {viewMode === 'map' && atmsLoading && (
          <View style={[styles.floatingPill, shadows.floating]}>
            <Text style={{ fontSize: 13, color: colors.text.secondary }}>A carregar ATMs...</Text>
          </View>
        )}

        {viewMode === 'map' && !atmsLoading && atms.length === 0 && (
          <View
            style={[
              styles.floatingPill,
              shadows.floating,
              { backgroundColor: error ? '#FEE2E2' : '#FFFFFF', bottom: error ? 96 : 20, borderColor: error ? '#FCA5A5' : colors.border },
            ]}
          >
            <Text style={{ fontSize: 13, color: error ? '#B91C1C' : colors.text.secondary }}>
              {error ? 'Erro ao carregar ATMs' : 'Nenhum ATM encontrado'}
            </Text>
          </View>
        )}

        {viewMode === 'map' && error && !atmsLoading && (
          <View style={[styles.floatingPill, shadows.floating]}>
            <AppButton label="Tentar novamente" size="sm" variant="secondary" onPress={refetch} icon="refresh" />
          </View>
        )}
      </View>

      <ATMDetailSheet
        atm={selectedATM}
        visible={sheetVisible}
        unlocked={unlocked || isPremium || (selectedATM ? hasValidUnlock(selectedATM.id) : false)}
        unlocking={unlocking}
        isLoggedIn={!!user}
        userVote={userVote}
        agentRating={agentRating}
        isFavorite={selectedATM ? isFavorite(selectedATM.id) : false}
        onToggleFavorite={() => { if (selectedATM) void toggleFavorite(selectedATM.id) }}
        onVote={handleVote}
        onClose={handleCloseSheet}
        onWatchAd={handleWatchAd}
        adLoading={adLoading}
        onLogin={() => router.push('/(auth)/login')}
        onOpenPremium={() => { setSheetVisible(false); setPremiumVisible(true) }}
      />

      <PremiumModal visible={premiumVisible} onClose={() => setPremiumVisible(false)} />
      </View>
    </TouchableWithoutFeedback>
  )
}

const styles = {
  floatingPill: {
    position: 'absolute' as const,
    alignSelf: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
}
