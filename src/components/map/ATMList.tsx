import React, { useCallback, useMemo } from 'react'
import { View, Text, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native'
import type { ATMWithDistance } from '../../hooks/useATMs'
import { getATMStatus, getATMColor, getATMStatusLabel } from '../../hooks/useATMs'
import { timeSince } from '../../lib/time'
import { AppCard } from '../ui/AppCard'
import { AppIcon } from '../ui/AppIcon'
import { EmptyState } from '../ui/EmptyState'
import { AppButton } from '../ui/AppButton'
import { colors } from '@/theme/tokens'

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
  const color = locked ? colors.brand[500] : getATMColor(status)

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`
    return `${km.toFixed(1)}km`
  }

  return (
    <AppCard onPress={() => onPress(item)} style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
            {item.bank_name}
          </Text>
          <Text style={{ fontSize: 13, color: colors.money, marginTop: 2 }}>{item.address}</Text>
          {(item.cidade || item.provincia) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <AppIcon name="location-outline" size={12} color={colors.text.tertiary} />
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                {[item.cidade, item.provincia].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardFooter}>
        {locked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <AppIcon name="eye-outline" size={14} color={color} />
            <Text style={{ fontSize: 13, fontWeight: '600', color }}>
              Ver detalhes
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[styles.miniDot, { backgroundColor: color }]} />
            <Text style={{ fontSize: 13, fontWeight: '600', color }}>
              {getATMStatusLabel(status)}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {item.distance !== undefined && (
            <Text style={{ fontSize: 12, color: '#374151', fontWeight: '600' }}>
              {formatDistance(item.distance)}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <AppIcon name="time-outline" size={12} color={colors.text.tertiary} />
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
              {timeSince(item.last_updated)}
            </Text>
          </View>
        </View>
      </View>
    </AppCard>
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
      <EmptyState
        icon="search"
        title="Nenhum ATM encontrado"
        description="Tente ajustar a busca ou os filtros"
      />
    ),
    []
  )

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text style={{ color: colors.text.secondary, marginTop: 12 }}>A carregar ATMs...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 32 }}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Erro ao carregar ATMs"
          description={error}
        />
        {onRetry && <AppButton label="Tentar novamente" onPress={onRetry} icon="refresh" />}
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
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
      windowSize={7}
      removeClippedSubviews
    />
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
})
