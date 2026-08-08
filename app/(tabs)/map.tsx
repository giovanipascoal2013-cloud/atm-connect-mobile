import { useState, useCallback } from 'react'
import { View, ActivityIndicator, Text, Keyboard, TouchableWithoutFeedback, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'
import { useLocation } from '../../src/hooks/useLocation'
import { useATMs, type ATMWithDistance, type ATMStatus, type SortMode } from '../../src/hooks/useATMs'
import { useViews } from '../../src/hooks/useViews'
import { supabase } from '../../src/lib/supabase'
import { ATMMapView } from '../../src/components/map/ATMMapView'
import { MapFilters } from '../../src/components/map/MapFilters'
import { ATMList } from '../../src/components/map/ATMList'
import { ATMDetailSheet } from '../../src/components/map/ATMDetailSheet'
import { PremiumModal } from '../../src/components/premium/PremiumModal'
import { LogoPin } from '../../src/components/ui/LogoPin'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { colors, shadows } from '../../src/theme/tokens'

type ViewMode = 'map' | 'list'

export default function MapScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { location, permission, loading: locationLoading, requestAgain } = useLocation()
  const { balance, consumeView } = useViews()
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
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [agentRating, setAgentRating] = useState<{ likes: number; dislikes: number } | null>(null)
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null)

  const { atms, cities, loading: atmsLoading, error, refetch } = useATMs({
    search,
    status,
    city,
    sortMode,
    userLocation: location,
  })

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
    setUnlocked(unlockedIds.has(atm.id))
    fetchRating(atm)
  }, [unlockedIds, fetchRating])

  const handleUnlock = useCallback(async () => {
    if (!selectedATM) return
    if (unlocking) return
    if (!user) {
      router.push('/(auth)/login')
      return
    }
    setUnlocking(true)
    const result = await consumeView(selectedATM.id)
    if (result) {
      setUnlocked(true)
      setUnlockedIds((prev) => new Set(prev).add(selectedATM.id))
    }
    setUnlocking(false)
  }, [selectedATM, consumeView, user, router, unlocking])

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

  const viewsBadge = user && !balance.isPremium && (
    <TouchableOpacity
      onPress={() => router.push('/my-views')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: balance.remaining > 0 ? colors.brand[50] : '#FEF3C7',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <AppIcon name="eye" size={13} color={balance.remaining > 0 ? colors.brand[600] : '#B45309'} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: balance.remaining > 0 ? colors.brand[600] : '#B45309' }}>
        {balance.remaining}
      </Text>
    </TouchableOpacity>
  )

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingTop: 12, paddingHorizontal: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }} />
          <SegmentedControl
            options={[
              { key: 'map', label: 'Mapa' },
              { key: 'list', label: 'Lista' },
            ]}
            value={viewMode}
            onChange={(m) => setViewMode(m)}
            style={{ width: 180 }}
          />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>{viewsBadge}</View>
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
            isPremium={balance.isPremium}
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
            isPremium={balance.isPremium}
            isLoggedIn={!!user}
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
        unlocked={unlocked || balance.isPremium}
        unlocking={unlocking}
        isPremium={balance.isPremium}
        isLoggedIn={!!user}
        remainingViews={balance.remaining}
        userVote={userVote}
        agentRating={agentRating}
        onVote={handleVote}
        onClose={handleCloseSheet}
        onUnlock={handleUnlock}
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
