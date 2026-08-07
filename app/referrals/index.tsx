import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Share, Alert } from 'react-native'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/hooks/useAuth'
import { timeSince } from '../../src/lib/time'

interface ReferralEntry {
  id: string
  referred_user_id: string
  amount_kz: number
  created_at: string
  referred_name?: string
  referred_phone?: string
}

interface ReferralStats {
  total_referred: number
  total_earnings: number
}

export default function ReferralsScreen() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<ReferralStats>({ total_referred: 0, total_earnings: 0 })
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [commissionPct, setCommissionPct] = useState(20)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const [statsRes, earningsRes, commissionRes] = await Promise.all([
        supabase.rpc('get_agent_referral_stats', { _agent_id: user.id }),
        supabase.from('referral_earnings').select('id, referred_user_id, amount_kz, created_at').eq('agent_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('app_settings').select('value').eq('key', 'referral_commission_pct').maybeSingle(),
      ])

      if (commissionRes.data?.value) {
        const pct = Number(commissionRes.data.value)
        if (!isNaN(pct) && pct > 0) setCommissionPct(pct)
      }

      if (statsRes.data) {
        const s = statsRes.data as Record<string, unknown>
        setStats({
          total_referred: Number(s.total_referred ?? 0),
          total_earnings: Number(s.total_earnings ?? 0),
        })
      }

      const entries = (earningsRes.data ?? []) as ReferralEntry[]

      if (entries.length > 0) {
        const userIds = [...new Set(entries.map((e) => e.referred_user_id))]
        const { data: profiles } = await supabase.from('profiles').select('user_id, nome, telefone').in('user_id', userIds)
        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, { nome: p.nome, telefone: p.telefone }]))

        setReferrals(entries.map((e) => ({
          ...e,
          referred_name: profileMap.get(e.referred_user_id)?.nome || 'Desconhecido',
          referred_phone: profileMap.get(e.referred_user_id)?.telefone || '',
        })))
      } else {
        setReferrals(entries)
      }
    } catch (err) {
      console.error('Error fetching referrals:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#2094F3" />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#2094F3" />}
    >
      {profile?.referral_code && (
        <View style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#065F46', marginBottom: 4 }}>O teu código de referral</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#10B981', letterSpacing: 2 }}>{profile.referral_code}</Text>
          <Text style={{ fontSize: 12, color: '#047857', marginTop: 6, textAlign: 'center' }}>
            Ganha {commissionPct}% do valor da primeira subscrição dos teus convidados!
          </Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                await Share.share({
                  message: `Usa o meu código de convite ${profile.referral_code} para te registares no ATM Connect!`,
                  title: 'ATM Connect',
                })
              } catch {
                Alert.alert('Erro', 'Não foi possível partilhar o código.')
              }
            }}
            style={{
              backgroundColor: '#10B981',
              borderRadius: 10,
              paddingHorizontal: 20,
              paddingVertical: 10,
              marginTop: 12,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Partilhar código</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F3F4F6' }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Referidos</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#3B82F6', marginTop: 4 }}>{stats.total_referred}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F3F4F6' }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Ganhos totais</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981', marginTop: 4 }}>{Math.round(stats.total_earnings).toLocaleString()} Kz</Text>
        </View>
      </View>

      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 }}>Referidos recentes</Text>

      {referrals.length === 0 ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' }}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>🔗</Text>
          <Text style={{ color: '#6B7280', textAlign: 'center' }}>Ainda não tens referidos.</Text>
          <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 4, fontSize: 13 }}>
            Partilha o teu código para começar a ganhar!
          </Text>
        </View>
      ) : (
        referrals.map((r) => (
          <View
            key={r.id}
            style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{r.referred_name}</Text>
                {r.referred_phone && <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{r.referred_phone}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#10B981' }}>+{Math.round(r.amount_kz).toLocaleString()} Kz</Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{timeSince(r.created_at)}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}
