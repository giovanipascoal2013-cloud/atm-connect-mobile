import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Alert, Share } from 'react-native'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/hooks/useAuth'
import { timeSince } from '../../src/lib/time'
import { AppCard } from '../../src/components/ui/AppCard'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { Badge } from '../../src/components/ui/Badge'
import { colors, typography } from '../../src/theme/tokens'

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brand[500]} />
      </View>
    )
  }

  const handleShare = async () => {
    if (!profile?.referral_code) return
    try {
      await Share.share({
        message: `Usa o meu código de convite ${profile.referral_code} para te registares no ATM Connect!`,
        title: 'ATM Connect',
      })
    } catch {
      Alert.alert('Erro', 'Não foi possível partilhar o código.')
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={colors.brand[500]} />}
    >
      {profile?.referral_code && (
        <AppCard style={{ marginBottom: 16, alignItems: 'center', backgroundColor: colors.accent[50], borderColor: colors.accent[200] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <AppIcon name="gift" size={18} color={colors.accent[600]} />
            <Text style={[typography.label, { color: colors.accent[700] }]}>O teu código de referral</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.money, letterSpacing: 3, fontVariant: ['tabular-nums'] }}>
            {profile.referral_code}
          </Text>
          <Text style={{ fontSize: 13, color: colors.accent[800], marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
            Ganha {commissionPct}% do valor da primeira subscrição dos teus convidados!
          </Text>
          <AppButton
            label="Partilhar código"
            variant="success"
            icon="share-social"
            haptic
            onPress={handleShare}
            style={{ marginTop: 14 }}
          />
        </AppCard>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <AppCard style={{ flex: 1, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <AppIcon name="people" size={16} color={colors.text.tertiary} />
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Referidos</Text>
          </View>
          <Text style={[typography.title, { color: colors.brand[600] }]}>{stats.total_referred}</Text>
        </AppCard>
        <AppCard style={{ flex: 1, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <AppIcon name="cash" size={16} color={colors.text.tertiary} />
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Ganhos totais</Text>
          </View>
          <Text style={[typography.title, { color: colors.money, fontVariant: ['tabular-nums'] }]}>
            {Math.round(stats.total_earnings).toLocaleString()} Kz
          </Text>
        </AppCard>
      </View>

      <Text style={[typography.heading, { marginBottom: 12 }]}>Referidos recentes</Text>

      {referrals.length === 0 ? (
        <AppCard>
          <EmptyState
            icon="link"
            title="Ainda não tens referidos."
            description="Partilha o teu código para começar a ganhar!"
          />
        </AppCard>
      ) : (
        referrals.map((r) => (
          <AppCard key={r.id} style={{ marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{r.referred_name}</Text>
              {r.referred_phone && <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>{r.referred_phone}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Badge variant="success" label={`+${Math.round(r.amount_kz).toLocaleString()} Kz`} />
              <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 4 }}>{timeSince(r.created_at)}</Text>
            </View>
          </AppCard>
        ))
      )}
    </ScrollView>
  )
}
