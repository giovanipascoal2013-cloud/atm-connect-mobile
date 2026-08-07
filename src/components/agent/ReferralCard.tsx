import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Share, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'

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
        message: `Usa o meu código de convite ${referralCode} para te registares no ATM Connect!`,
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
      <View
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
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 }}>🎁 O Meu Código de Convite</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F9FAFB',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 8,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', letterSpacing: 1.5, flex: 1 }}>
            {referralCode}
          </Text>
          <TouchableOpacity
            onPress={handleShare}
            style={{ backgroundColor: '#EEF6FE', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#2094F3' }}>Partilhar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCopy}
            style={{ backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>Copiar</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 12, color: '#6B7280' }}>
          Partilhe este código com clientes. Ganhe <Text style={{ fontWeight: '700', color: '#10B981' }}>{commissionPct}%</Text> do valor da primeira subscrição deles!
        </Text>
      </View>

      {referralStats && Number(referralStats.total_referred) > 0 && (
        <View
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
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 }}>👥 Pessoas que Convidaste</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#EEF6FE', borderRadius: 10, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#2094F3' }}>{referralStats.total_referred}</Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Pessoas convidadas</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#10B981' }}>
                {Math.round(referralStats.total_earnings).toLocaleString()} Kz
              </Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Ganhos com referrals</Text>
            </View>
          </View>
        </View>
      )}
    </>
  )
}
