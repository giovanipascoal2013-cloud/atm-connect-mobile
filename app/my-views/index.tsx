import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'
import { supabase } from '../../src/lib/supabase'
import { timeSince, timeUntil } from '../../src/lib/time'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppCard } from '../../src/components/ui/AppCard'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { colors } from '../../src/theme/tokens'

interface ActiveView {
  id: string
  atm_id: string
  granted_at: string
  expires_at: string
  atm: {
    bank_name: string
    address: string
    cidade: string | null
    has_cash: boolean
    has_paper: boolean | null
    fila: string | null
    status: string | null
    last_updated: string
  } | null
}

export default function MyViewsScreen() {
  const { user, isPremium } = useAuth()
  const router = useRouter()
  const [views, setViews] = useState<ActiveView[]>([])
  const [loading, setLoading] = useState(true)

  const fetchViews = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: vws, error: vwsErr } = await supabase
        .from('ad_unlocks')
        .select('id, atm_id, created_at, expires_at')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })

      if (vwsErr) throw vwsErr

      const ids = (vws ?? []).map((v) => v.atm_id)
      const atmsMap = new Map<string, ActiveView['atm']>()
      if (ids.length > 0) {
        const { data: atms, error: atmsErr } = await supabase
          .from('atms')
          .select('id, bank_name, address, cidade, has_cash, has_paper, fila, status, last_updated')
          .in('id', ids)
        if (atmsErr) throw atmsErr
        ;(atms ?? []).forEach((a) => atmsMap.set(a.id, a as ActiveView['atm']))
      }

      setViews((vws ?? []).map((v) => ({ ...v, granted_at: v.created_at, atm: atmsMap.get(v.atm_id) ?? null })))
    } catch (err) {
      console.error('Error fetching ad unlocks:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchViews()
  }, [fetchViews])

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 32 }}>
        <EmptyState
          icon="eye-outline"
          title="Inicia sessão"
          description="Inicia sessão para ver os teus desbloqueios activos."
        />
        <AppButton label="Entrar" onPress={() => router.push('/(auth)/login')} icon="log-in-outline" size="lg" />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchViews} tintColor={colors.brand[500]} />}
    >
      <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 12 }}>
        Os teus desbloqueios activos
      </Text>

      <AppCard style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name="eye" size={22} color={colors.brand[500]} />
        </View>
        <View>
          <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Desbloqueios activos</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
            {isPremium ? 'Ilimitado' : `${views.length} ATM${views.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      </AppCard>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand[500]} />
        </View>
      ) : views.length === 0 ? (
        <AppCard>
          <EmptyState
            icon="eye-outline"
            title="Sem desbloqueios ainda"
            description="Explora o mapa e desbloqueia o teu primeiro ATM."
            actionLabel="Explorar mapa"
            onAction={() => router.replace('/(tabs)/map')}
          />
        </AppCard>
      ) : (
        views.map((v) => (
          <AppCard key={v.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{v.atm?.bank_name ?? 'ATM'}</Text>
                {v.atm?.address && (
                  <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>{v.atm.address}</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.brand[50], borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
                <AppIcon name="time-outline" size={10} color={colors.brand[600]} />
                <Text style={{ fontSize: 10, color: colors.brand[600], fontWeight: '600' }}>por mais {timeUntil(v.expires_at).replace(/^em /, '')}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Info label="Dinheiro" value={v.atm?.has_cash ? 'Com dinheiro' : 'Sem dinheiro'} ok={!!v.atm?.has_cash} />
              <Info label="Papel" value={v.atm?.has_paper ? 'Sim' : 'Não'} ok={!!v.atm?.has_paper} />
              <Info label="Fila" value={v.atm?.fila ?? '—'} />
              <Info label="Operação" value={v.atm?.status ?? 'Operacional'} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
              <AppIcon name="refresh-outline" size={11} color={colors.text.tertiary} />
              <Text style={{ fontSize: 10, color: colors.text.tertiary }}>
                Última actualização: {v.atm?.last_updated ? timeSince(v.atm.last_updated) : '—'}
              </Text>
            </View>
          </AppCard>
        ))
      )}
    </ScrollView>
  )
}

function Info({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
      <Text style={{ fontSize: 9, color: colors.text.tertiary }}>{label}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: ok === false ? colors.danger : colors.text.primary, marginTop: 1 }}>
        {value}
      </Text>
    </View>
  )
}
