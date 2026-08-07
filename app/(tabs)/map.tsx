import { useState, useCallback } from 'react'
import { View, ActivityIndicator, Text, TouchableOpacity, Keyboard, TouchableWithoutFeedback } from 'react-native'
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
import { AdBanner } from '../../src/components/ads/AdBanner'
import { useInterstitial } from '../../src/hooks/useInterstitial'

type ViewMode = 'map' | 'list'

export default function MapScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { location, permission, loading: locationLoading, requestAgain } = useLocation()
  const { balance, consumeView } = useViews()
  const { showInterstitial } = useInterstitial()
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
      showInterstitial()
    }
    setUnlocking(false)
  }, [selectedATM, consumeView, user, router, unlocking, showInterstitial])

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

  const handleStatusChange = useCallback(
    (nextStatus: ATMStatus | 'all') => {
      setStatus(nextStatus)
      if (nextStatus === 'cash') {
        showInterstitial()
      }
    },
    [showInterstitial]
  )

  if (locationLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2094F3" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>A obter localização...</Text>
      </View>
    )
  }

  if (permission === 'denied') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          Localização necessária
        </Text>
        <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
          Permita o acesso à localização para encontrar ATMs próximos
        </Text>
        <TouchableOpacity
          onPress={requestAgain}
          style={{ backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const viewsBadge = user && !balance.isPremium && (
    <View
      style={{
        backgroundColor: balance.remaining > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(254,243,199,0.95)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
      }}
    >
      <Text style={{ fontSize: 11, color: balance.remaining > 0 ? '#6B7280' : '#92400E', fontWeight: '500' }}>
        {balance.remaining > 0 ? `${balance.remaining}/${balance.dailyLimit} views` : 'Limite atingido'}
      </Text>
    </View>
  )

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ paddingTop: 12, paddingHorizontal: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 2 }}>
            {(['map', 'list'] as ViewMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setViewMode(m)}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: viewMode === m ? '#fff' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === m ? '#2094F3' : '#6B7280' }}>
                  {m === 'map' ? '🗺️ Mapa' : '📋 Lista'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>{viewsBadge}</View>
        </View>

        <MapFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={handleStatusChange}
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
          <View
            style={{
              position: 'absolute',
              bottom: 20,
              alignSelf: 'center',
              backgroundColor: 'rgba(255,255,255,0.9)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 13, color: '#6B7280' }}>A carregar ATMs...</Text>
          </View>
        )}

        {viewMode === 'map' && !atmsLoading && atms.length === 0 && (
          <View
            style={{
              position: 'absolute',
              bottom: error ? 96 : 20,
              alignSelf: 'center',
              backgroundColor: error ? 'rgba(254,226,226,0.95)' : 'rgba(255,255,255,0.9)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 13, color: error ? '#B91C1C' : '#6B7280' }}>
              {error ? 'Erro ao carregar ATMs' : 'Nenhum ATM encontrado'}
            </Text>
          </View>
        )}

        {viewMode === 'map' && error && !atmsLoading && (
          <View
            style={{
              position: 'absolute',
              bottom: 20,
              alignSelf: 'center',
              backgroundColor: 'rgba(255,255,255,0.95)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <TouchableOpacity onPress={refetch}>
              <Text style={{ fontSize: 13, color: '#2094F3', fontWeight: '600' }}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {viewMode === 'map' && !balance.isPremium && <AdBanner />}

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
