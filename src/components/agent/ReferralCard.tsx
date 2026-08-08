import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Share, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'
import { AppIcon } from '../ui/AppIcon'
import { AppCard } from '../ui/AppCard'
import { colors } from '@/theme/tokens'

interface ReferralStats {
  total_referred: number
  total_earnings: number
}

interface ReferralCardProps {
  referralCode: string | null
  userId: string
  commissionPct?: number
}

export function ReferralCard({ referralCode, userId, commissionPct = 20 }: ReferralCardProps) {
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null)

  useEffect(() => {
    if (!userId) return
    supabase.rpc('get_agent_referral_stats', { _agent_id: userId }).then(({ data }) => {
      if (data) {
        const stats = data as unknown as ReferralStats
        if (Number(stats.total_referred) > 0) setReferralStats(stats)
      }
    })
  }, [userId])

  if (!referralCode) return null

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Usa o meu código de convite ${referralCode} para veres ATMs com dinheiro em tempo real no ATM Connect!`,
        title: 'ATM Connect',
      })
    } catch {
      Alert.alert('Erro', 'Não foi possível partilhar o código.')
    }
  }

  const handleCopy = () => {
    Alert.alert('Código de convite', referralCode)
  }

  return (
    <>
      <AppCard style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <AppIcon name="gift" size={18} color={colors.brand[500]} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>O Meu Código de Convite</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 8,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, letterSpacing: 1.5, flex: 1 }}>
            {referralCode}
          </Text>
          <TouchableOpacity
            onPress={handleShare}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand[50], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <AppIcon name="share-social-outline" size={13} color={colors.brand[500]} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brand[500] }}>Partilhar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCopy}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E9ECEF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <AppIcon name="copy-outline" size={13} color="#374151" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>Copiar</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 12, color: colors.text.secondary }}>
          Partilha este código com clientes. Ganha <Text style={{ fontWeight: '700', color: colors.money }}>{commissionPct}%</Text> do valor da primeira subscrição deles!
        </Text>
      </AppCard>

      {referralStats && Number(referralStats.total_referred) > 0 && (
        <AppCard style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AppIcon name="people" size={18} color={colors.brand[500]} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>Pessoas que Convidaste</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: colors.brand[50], borderRadius: 10, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.brand[500], fontVariant: ['tabular-nums'] }}>{referralStats.total_referred}</Text>
              <Text style={{ fontSize: 11, color: colors.text.secondary, marginTop: 2 }}>Pessoas convidadas</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.accent[50], borderRadius: 10, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.money, fontVariant: ['tabular-nums'] }}>
                {Math.round(referralStats.total_earnings).toLocaleString()} Kz
              </Text>
              <Text style={{ fontSize: 11, color: colors.text.secondary, marginTop: 2 }}>Ganhos com referrals</Text>
            </View>
          </View>
        </AppCard>
      )}
    </>
  )
}
