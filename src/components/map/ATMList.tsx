import React, { useCallback, useMemo } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import type { ATMWithDistance } from '../../hooks/useATMs'
import { getATMStatus, getATMColor, getATMStatusLabel } from '../../hooks/useATMs'
import { timeSince } from '../../lib/time'

interface ATMListProps {
  atms: ATMWithDistance[]
  onPress: (atm: ATMWithDistance) => void
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onRefresh?: () => void
  refreshing?: boolean
  lockedIds?: Set<string>
  isPremium?: boolean
  isLoggedIn?: boolean
}

const ATMListRow = React.memo(function ATMListRow({
  item,
  onPress,
  locked,
}: {
  item: ATMWithDistance
  onPress: (atm: ATMWithDistance) => void
  locked: boolean
}) {
  const status = locked ? 'locked' : getATMStatus(item)
  const color = locked ? '#9CA3AF' : getATMColor(status)

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`
    return `${km.toFixed(1)}km`
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginTop: 4 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{item.bank_name}</Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{item.address}</Text>
          {(item.cidade || item.provincia) && (
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {[item.cidade, item.provincia].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color }}>
          {locked ? '🔒 Bloqueado' : getATMStatusLabel(status)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {item.distance !== undefined && (
            <Text style={{ fontSize: 12, color: '#374151', fontWeight: '600' }}>
              {formatDistance(item.distance)}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
            {timeSince(item.last_updated)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
})

export function ATMList({
  atms,
  onPress,
  loading,
  error,
  onRetry,
  onRefresh,
  refreshing,
  lockedIds,
  isPremium,
  isLoggedIn,
}: ATMListProps) {
  const isLocked = useCallback(
    (atm: ATMWithDistance) => {
      if (isPremium) return false
      return !(isLoggedIn && lockedIds?.has(atm.id))
    },
    [isPremium, isLoggedIn, lockedIds]
  )

  const renderItem = useCallback(
    ({ item }: { item: ATMWithDistance }) => (
      <ATMListRow item={item} onPress={onPress} locked={isLocked(item)} />
    ),
    [onPress, isLocked]
  )

  const listContentStyle = useMemo(() => ({ padding: 16, paddingBottom: 140, gap: 10 }), [])

  const emptyComponent = useMemo(
    () => (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <Text style={{ fontSize: 28, marginBottom: 8 }}>🏧</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>Nenhum ATM encontrado</Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' }}>
          Tente ajustar a busca ou os filtros
        </Text>
      </View>
    ),
    []
  )

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#2094F3" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>A carregar ATMs...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#B91C1C', marginBottom: 8 }}>Erro ao carregar ATMs</Text>
        <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            style={{ backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Tentar novamente</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <FlatList
      data={atms}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={listContentStyle}
      ListEmptyComponent={emptyComponent}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="#2094F3" />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
      windowSize={7}
      removeClippedSubviews
    />
  )
}
