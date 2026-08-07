import { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { supabase } from '../../src/lib/supabase'

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

  const medal = (pos: number) => {
    if (pos === 1) return '🥇'
    if (pos === 2) return '🥈'
    if (pos === 3) return '🥉'
    return `#${pos}`
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#2094F3" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>A carregar ranking...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRanking} tintColor="#2094F3" />}
    >
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 28, marginBottom: 4 }}>🏆</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Ranking de Agentes</Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Top agentes por fiabilidade</Text>
      </View>

      {ranking.length === 0 ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' }}>
          <Text style={{ color: '#6B7280', textAlign: 'center' }}>
            Ainda não há avaliações suficientes para o ranking.
          </Text>
        </View>
      ) : (
        ranking.map((entry) => (
          <View
            key={entry.agent_id}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: '#F3F4F6',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22, width: 36, textAlign: 'center' }}>
                {entry.rank_position <= 3 ? medal(entry.rank_position) : `#${entry.rank_position}`}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{entry.agent_name}</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  {entry.total_atms} ATM{entry.total_atms !== 1 ? 's' : ''} · {entry.total_ratings} avaliação{entry.total_ratings !== 1 ? 'ões' : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: entry.approval_pct >= 80 ? '#10B981' : entry.approval_pct >= 50 ? '#F59E0B' : '#EF4444' }}>
                  {entry.approval_pct}%
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                  <Text style={{ fontSize: 12, color: '#34A853' }}>👍 {entry.likes}</Text>
                  <Text style={{ fontSize: 12, color: '#EA4335' }}>👎 {entry.dislikes}</Text>
                </View>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}
