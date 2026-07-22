import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import type { ATMWithDistance } from '../../hooks/useATMs'
import { getATMStatus, getATMColor } from '../../hooks/useATMs'

interface ATMDetailSheetProps {
  atm: ATMWithDistance | null
  visible: boolean
  unlocked: boolean
  unlocking: boolean
  isPremium: boolean
  remainingViews: number
  onClose: () => void
  onUnlock: () => void
  onOpenPremium: () => void
}

export function ATMDetailSheet({
  atm,
  visible,
  unlocked,
  unlocking,
  isPremium,
  remainingViews,
  onClose,
  onUnlock,
  onOpenPremium,
}: ATMDetailSheetProps) {
  if (!visible || !atm) return null

  const status = getATMStatus(atm)
  const color = getATMColor(status)
  const statusLabel =
    status === 'cash' ? 'Com Dinheiro' :
    status === 'no_cash' ? 'Sem Dinheiro' :
    'Fora de Serviço'

  const timeSince = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `há ${minutes}min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `há ${hours}h`
    const days = Math.floor(hours / 24)
    return `há ${days}d`
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        maxHeight: unlocked ? '50%' : '30%',
      }}
    >
      <Pressable onPress={onClose} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
      </Pressable>

      {unlocked ? (
        <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{atm.bank_name}</Text>
              <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>{atm.address}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
              <Text style={{ fontSize: 13, fontWeight: '600', color }}>{statusLabel}</Text>
            </View>
          </View>

          {(atm.cidade || atm.provincia) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>
                {[atm.cidade, atm.provincia].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Dinheiro</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: atm.has_cash ? '#34A853' : '#EA4335', marginTop: 2 }}>
                {atm.has_cash ? 'Disponível' : 'Indisponível'}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Papel</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: atm.has_paper ? '#34A853' : '#EA4335', marginTop: 2 }}>
                {atm.has_paper ? 'Disponível' : 'Indisponível'}
              </Text>
            </View>
          </View>

          {atm.fila && (
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Fila</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 }}>{atm.fila}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
              Actualizado {timeSince(atm.last_updated)}
            </Text>
            {atm.distance !== undefined && (
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                {atm.distance < 1 ? `${Math.round(atm.distance * 1000)}m` : `${atm.distance.toFixed(1)}km`}
              </Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{atm.bank_name}</Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{atm.address}</Text>
            </View>
          </View>

          {isPremium ? (
            <TouchableOpacity
              style={{
                backgroundColor: '#10B981',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
              }}
              onPress={onUnlock}
              disabled={unlocking}
            >
              {unlocking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Ver Detalhes</Text>
              )}
            </TouchableOpacity>
          ) : remainingViews > 0 ? (
            <TouchableOpacity
              style={{
                backgroundColor: '#10B981',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
              }}
              onPress={onUnlock}
              disabled={unlocking}
            >
              {unlocking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                  Desbloquear ({remainingViews} restantes hoje)
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View>
              <View
                style={{
                  backgroundColor: '#FEF3C7',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontSize: 13, color: '#92400E', textAlign: 'center' }}>
                  Limite diário de views atingido
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#F59E0B',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={onOpenPremium}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                  👑 Upgrade Premium
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
