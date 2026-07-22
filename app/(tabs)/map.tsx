import { useState, useCallback } from 'react'
import { View, ActivityIndicator, Text } from 'react-native'
import { useLocation } from '../../src/hooks/useLocation'
import { useATMs, type ATMWithDistance, type ATMStatus } from '../../src/hooks/useATMs'
import { useViews } from '../../src/hooks/useViews'
import { ATMMapView } from '../../src/components/map/ATMMapView'
import { MapFilters } from '../../src/components/map/MapFilters'
import { ATMDetailSheet } from '../../src/components/map/ATMDetailSheet'
import { PremiumModal } from '../../src/components/premium/PremiumModal'

export default function MapScreen() {
  const { location, permission, loading: locationLoading } = useLocation()
  const { balance, consumeView } = useViews()
  const [search, setSearch] = useState('')
  const [bank, setBank] = useState('all')
  const [status, setStatus] = useState<ATMStatus | 'all'>('all')
  const [selectedATM, setSelectedATM] = useState<ATMWithDistance | null>(null)
  const [sheetVisible, setSheetVisible] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [premiumVisible, setPremiumVisible] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())

  const { atms, loading: atmsLoading } = useATMs({
    search,
    bank,
    status,
    userLocation: location,
  })

  const handleATMPress = useCallback(async (atm: ATMWithDistance) => {
    setSelectedATM(atm)
    setSheetVisible(true)

    if (unlockedIds.has(atm.id)) {
      setUnlocked(true)
      return
    }

    setUnlocked(false)
  }, [unlockedIds])

  const handleUnlock = useCallback(async () => {
    if (!selectedATM) return
    setUnlocking(true)
    const result = await consumeView(selectedATM.id)
    if (result) {
      setUnlocked(true)
      setUnlockedIds((prev) => new Set(prev).add(selectedATM.id))
    }
    setUnlocking(false)
  }, [selectedATM, consumeView])

  const handleCloseSheet = () => {
    setSheetVisible(false)
    setUnlocked(false)
  }

  if (locationLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#10B981" />
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
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <ATMMapView
        atms={atms}
        userLocation={location}
        selectedATMId={selectedATM?.id || null}
        onATMPress={handleATMPress}
      />

      <MapFilters
        search={search}
        onSearchChange={setSearch}
        bank={bank}
        onBankChange={setBank}
        status={status}
        onStatusChange={setStatus}
      />

      {atmsLoading && (
        <View
          style={{
            position: 'absolute',
            bottom: sheetVisible ? 240 : 20,
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

      {!atmsLoading && atms.length === 0 && (
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
          <Text style={{ fontSize: 13, color: '#6B7280' }}>Nenhum ATM encontrado</Text>
        </View>
      )}

      {!balance.isPremium && !sheetVisible && (
        <View
          style={{
            position: 'absolute',
            top: 60,
            alignSelf: 'center',
            backgroundColor: balance.remaining > 0 ? 'rgba(255,255,255,0.9)' : 'rgba(254,243,199,0.95)',
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 12, color: balance.remaining > 0 ? '#6B7280' : '#92400E', fontWeight: '500' }}>
            {balance.remaining > 0
              ? `${balance.remaining}/${balance.dailyLimit} views hoje`
              : 'Limite atingido'}
          </Text>
        </View>
      )}

      <ATMDetailSheet
        atm={selectedATM}
        visible={sheetVisible}
        unlocked={unlocked || balance.isPremium}
        unlocking={unlocking}
        isPremium={balance.isPremium}
        remainingViews={balance.remaining}
        onClose={handleCloseSheet}
        onUnlock={handleUnlock}
        onOpenPremium={() => { setSheetVisible(false); setPremiumVisible(true) }}
      />

      <PremiumModal visible={premiumVisible} onClose={() => setPremiumVisible(false)} />
    </View>
  )
}
