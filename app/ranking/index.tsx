import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { supabase } from '../../src/lib/supabase'
import { AppCard } from '../../src/components/ui/AppCard'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { colors } from '../../src/theme/tokens'

interface RankingEntry {
  agent_id: string
  agent_name: string
  likes: number
  dislikes: number
  total_ratings: number
  total_atms: number
  approval_pct: number
  rank_position: number
}

export default function RankingScreen() {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRanking = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_agent_ranking', { _limit: 20 })
      if (error) {
        console.error('Error fetching ranking:', error)
        return
      }
      const rows = (data ?? []) as Record<string, unknown>[]
      const mapped: RankingEntry[] = rows.map((r, i) => ({
        agent_id: String(r.agent_id ?? ''),
        agent_name: String(r.agent_name ?? 'Agente'),
        likes: Number(r.likes ?? 0),
        dislikes: Number(r.dislikes ?? 0),
        total_ratings: Number(r.total_ratings ?? 0),
        total_atms: Number(r.total_atms ?? 0),
        approval_pct: Number(r.approval_pct ?? 0),
        rank_position: Number(r.rank_position ?? i + 1),
      }))
      setRanking(mapped)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRanking()
  }, [])

  const medalColor = (pos: number) => {
    if (pos === 1) return '#D97706'
    if (pos === 2) return '#9CA3AF'
    if (pos === 3) return '#B45309'
    return undefined
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text style={{ color: colors.text.secondary, marginTop: 12 }}>A carregar ranking...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRanking} tintColor={colors.brand[500]} />}
    >
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.brand[50],
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <AppIcon name="trophy" size={32} color={colors.brand[500]} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>Ranking de Agentes</Text>
        <Text style={{ fontSize: 13, color: colors.text.tertiary, marginTop: 4 }}>Top agentes por fiabilidade</Text>
      </View>

      {ranking.length === 0 ? (
        <AppCard>
          <EmptyState
            icon="podium-outline"
            title="O ranking está a começar"
            description="Sê o primeiro a avaliar e a aparecer aqui."
          />
        </AppCard>
      ) : (
        ranking.map((entry) => {
          const rankColor = medalColor(entry.rank_position)
          const isPodium = entry.rank_position <= 3
          return (
            <AppCard key={entry.agent_id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isPodium ? colors.brand[50] : colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isPodium ? (
                    <AppIcon name="trophy" size={17} color={rankColor} />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.secondary }}>#{entry.rank_position}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }}>{entry.agent_name}</Text>
                  <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>
                    {entry.total_atms} ATM{entry.total_atms !== 1 ? 's' : ''} · {entry.total_ratings} avaliação{entry.total_ratings !== 1 ? 'ões' : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: entry.approval_pct >= 80 ? colors.money : entry.approval_pct >= 50 ? '#D97706' : colors.danger, fontVariant: ['tabular-nums'] }}>
                    {entry.approval_pct}%
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <AppIcon name="thumbs-up" size={12} color="#34A853" />
                      <Text style={{ fontSize: 12, color: '#34A853' }}>{entry.likes}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <AppIcon name="thumbs-down" size={12} color="#EA4335" />
                      <Text style={{ fontSize: 12, color: '#EA4335' }}>{entry.dislikes}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </AppCard>
          )
        })
      )}
    </ScrollView>
  )
}
