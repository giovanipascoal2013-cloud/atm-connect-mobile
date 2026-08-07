import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'
import { useViews } from '../../src/hooks/useViews'
import { supabase } from '../../src/lib/supabase'
import { timeSince, timeUntil } from '../../src/lib/time'

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
  const { user } = useAuth()
  const { balance, loading: viewsLoading } = useViews()
  const router = useRouter()
  const [views, setViews] = useState<ActiveView[]>([])
  const [loading, setLoading] = useState(true)

  const fetchViews = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: vws, error: vwsErr } = await supabase
        .from('atm_views')
        .select('id, atm_id, granted_at, expires_at')
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

      setViews((vws ?? []).map((v) => ({ ...v, atm: atmsMap.get(v.atm_id) ?? null })))
    } catch (err) {
      console.error('Error fetching views:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchViews()
  }, [fetchViews])

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Inicia sessão</Text>
        <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
          Inicia sessão para ver as tuas views activas.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={{ backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      contentContainerStyle={{ padding: 16 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchViews} tintColor="#2094F3" />}
    >
      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
        Acessos a ATMs activos por 24h
      </Text>

      <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF6FE', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>👁️</Text>
        </View>
        <View>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Views hoje</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>
            {viewsLoading || balance.isPremium
              ? balance.isPremium ? 'Ilimitado' : '—'
              : `${balance.remaining}/${balance.dailyLimit} restantes`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2094F3" />
        </View>
      ) : views.length === 0 ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' }}>
          <Text style={{ fontSize: 28, marginBottom: 8 }}>👁️</Text>
          <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
            Ainda não desbloqueaste nenhum ATM.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/map')}
            style={{ backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Explorar mapa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        views.map((v) => (
          <View key={v.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F3F4F6' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{v.atm?.bank_name ?? 'ATM'}</Text>
                {v.atm?.address && (
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{v.atm.address}</Text>
                )}
              </View>
              <View style={{ backgroundColor: '#EEF6FE', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
                <Text style={{ fontSize: 10, color: '#1A7ED6', fontWeight: '600' }}>expira {timeUntil(v.expires_at)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Info label="Dinheiro" value={v.atm?.has_cash ? 'Com dinheiro' : 'Sem dinheiro'} />
              <Info label="Papel" value={v.atm?.has_paper ? 'Sim' : 'Não'} />
              <Info label="Fila" value={v.atm?.fila ?? '—'} />
              <Info label="Operação" value={v.atm?.status ?? 'Operacional'} />
            </View>
            <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8 }}>
              Última actualização: {v.atm?.last_updated ? timeSince(v.atm.last_updated) : '—'}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
      <Text style={{ fontSize: 9, color: '#9CA3AF' }}>{label}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#111827', marginTop: 1 }}>{value}</Text>
    </View>
  )
}
