import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native'
import type { ATMWithDistance } from '../../hooks/useATMs'
import { getATMStatus } from '../../hooks/useATMs'
import { timeSince } from '../../lib/time'
import { AppIcon } from '../ui/AppIcon'
import { AppButton } from '../ui/AppButton'
import { Badge } from '../ui/Badge'
import { AdBanner } from '../ads/AdBanner'
import { colors } from '@/theme/tokens'

interface ATMDetailSheetProps {
  atm: ATMWithDistance | null
  visible: boolean
  unlocked: boolean
  unlocking: boolean
  isLoggedIn: boolean
  userVote?: 'like' | 'dislike' | null
  agentRating?: { likes: number; dislikes: number } | null
  isFavorite?: boolean
  onToggleFavorite?: () => void
  onVote?: (value: 'like' | 'dislike') => void
  onClose: () => void
  onWatchAd: () => void
  adLoading?: boolean
  onLogin: () => void
}

export function ATMDetailSheet({
  atm,
  visible,
  unlocked,
  unlocking,
  isLoggedIn,
  userVote,
  agentRating,
  isFavorite,
  onToggleFavorite,
  onVote,
  onClose,
  onWatchAd,
  adLoading = false,
  onLogin,
}: ATMDetailSheetProps) {
  if (!visible || !atm) return null

  const status = getATMStatus(atm)
  const statusLabel =
    status === 'cash' ? 'Com Dinheiro' :
    status === 'no_cash' ? 'Sem Dinheiro' :
    'Fora de Serviço'

  const infoTile = (label: string, value: string, ok: boolean) => (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderCurve: 'continuous',
        padding: 12,
      }}
    >
      <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <AppIcon name={ok ? 'checkmark-circle' : 'close-circle'} size={14} color={ok ? '#4CAF6B' : '#EA4335'} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: ok ? '#4CAF6B' : '#EA4335' }}>
          {value}
        </Text>
      </View>
    </View>
  )

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderCurve: 'continuous',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 10,
        maxHeight: unlocked ? '50%' : '42%',
      }}
    >
      <Pressable onPress={onClose} style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' }} />
      </Pressable>

      {unlocked ? (
        <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 24 }} contentContainerStyle={{ paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>{atm.bank_name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <AppIcon name="location-outline" size={14} color={colors.text.secondary} />
                <Text style={{ fontSize: 14, color: colors.text.secondary, flex: 1 }}>{atm.address}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {isLoggedIn && onToggleFavorite && (
                <TouchableOpacity
                  onPress={onToggleFavorite}
                  hitSlop={10}
                  style={{ padding: 2 }}
                >
                  <AppIcon name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#EA4335' : colors.text.secondary} />
                </TouchableOpacity>
              )}
              <Badge
                variant={status === 'cash' ? 'success' : status === 'no_cash' ? 'danger' : 'neutral'}
                label={statusLabel}
              />
            </View>
          </View>

          {(atm.cidade || atm.provincia) && (
            <Text style={{ fontSize: 13, color: colors.text.tertiary, marginBottom: 12 }}>
              {[atm.cidade, atm.provincia].filter(Boolean).join(', ')}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            {infoTile('Dinheiro', atm.has_cash ? 'Disponível' : 'Indisponível', !!atm.has_cash)}
            {infoTile('Papel', atm.has_paper ? 'Disponível' : 'Indisponível', !!atm.has_paper)}
          </View>

          {atm.fila && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <AppIcon name="people-outline" size={16} color={colors.text.secondary} />
              <View>
                <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Fila</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>{atm.fila}</Text>
              </View>
            </View>
          )}

          {atm.agent_id && agentRating && (
            <View style={{ backgroundColor: colors.brand[50], borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 8 }}>
                Avalie a fiabilidade deste ATM — ajude a comunidade!
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => onVote?.('like')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: userVote === 'like' ? '#4CAF6B' : '#fff',
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: userVote === 'like' ? '#4CAF6B' : colors.border,
                  }}
                >
                  <AppIcon name="thumbs-up" size={15} color={userVote === 'like' ? '#fff' : '#4CAF6B'} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: userVote === 'like' ? '#fff' : '#4CAF6B' }}>
                    {agentRating.likes}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onVote?.('dislike')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: userVote === 'dislike' ? '#EF4444' : '#fff',
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: userVote === 'dislike' ? '#EF4444' : colors.border,
                  }}
                >
                  <AppIcon name="thumbs-down" size={15} color={userVote === 'dislike' ? '#fff' : '#EF4444'} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: userVote === 'dislike' ? '#fff' : '#EF4444' }}>
                    {agentRating.dislikes}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppIcon name="time-outline" size={13} color={colors.text.tertiary} />
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                Actualizado {timeSince(atm.last_updated)}
              </Text>
            </View>
            {atm.distance !== undefined && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppIcon name="navigate-outline" size={13} color={colors.text.tertiary} />
                <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                  {atm.distance < 1 ? `${Math.round(atm.distance * 1000)}m` : `${atm.distance.toFixed(1)}km`}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 24 }} contentContainerStyle={{ paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#6B7280' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>{atm.bank_name}</Text>
              <Text style={{ fontSize: 13, color: colors.text.tertiary }}>{atm.address}</Text>
              {(atm.cidade || atm.provincia) && (
                <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>
                  {[atm.cidade, atm.provincia].filter(Boolean).join(', ')}
                </Text>
              )}
            </View>
            {isLoggedIn && onToggleFavorite && (
              <TouchableOpacity
                onPress={onToggleFavorite}
                hitSlop={10}
                style={{ padding: 2 }}
              >
                <AppIcon name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? '#EA4335' : colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {!isLoggedIn ? (
            <AppButton
              label="Entrar para ver detalhes"
              onPress={onLogin}
              fullWidth
              size="lg"
              style={{ backgroundColor: colors.brand[600] }}
              icon="log-in-outline"
              haptic
            />
          ) : (
            <AppButton
              label={adLoading ? 'A carregar anúncio...' : 'Ver anúncio para desbloquear'}
              onPress={onWatchAd}
              fullWidth
              size="lg"
              style={{ backgroundColor: colors.brand[600] }}
              loading={unlocking || adLoading}
              disabled={adLoading}
              icon="play-circle-outline"
              haptic
            />
          )}
        </ScrollView>
      )}

      <View style={{ alignItems: 'center', paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
        <AdBanner />
      </View>
    </View>
  )
}
