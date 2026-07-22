import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { useAgent } from '../../src/hooks/useAgent'
import { AgentATMCard } from '../../src/components/agent/AgentATMCard'

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View
      style={{
        flex: 1,
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
      }}
    >
      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color }}>{value}</Text>
    </View>
  )
}

export default function AgentScreen() {
  const { atms, stats, loading, updating, refetch, toggleCash, togglePaper, setFila, setStatus, setObs, isAgent } = useAgent()

  if (!isAgent) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          Acesso restrito
        </Text>
        <Text style={{ color: '#6B7280', textAlign: 'center' }}>
          Esta secção é apenas para agentes ATM Connect.
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>A carregar painel...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#10B981" />}
    >
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <StatCard label="Meus ATMs" value={stats.totalATMs} color="#10B981" />
        <StatCard label="Views" value={stats.totalViews} color="#3B82F6" />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total ganho" value={`${Math.round(stats.totalEarnings).toLocaleString()} Kz`} color="#059669" />
        <StatCard label="Disponível" value={`${Math.round(stats.availableBalance).toLocaleString()} Kz`} color="#D97706" />
      </View>

      {stats.totalWithdrawn > 0 && (
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#F3F4F6',
          }}
        >
          <Text style={{ fontSize: 13, color: '#6B7280' }}>Já levantado</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 2 }}>
            {Math.round(stats.totalWithdrawn).toLocaleString()} Kz
          </Text>
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            Comissão por view de utilizadores free
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Os meus ATMs</Text>
      </View>

      {atms.length === 0 ? (
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#F3F4F6',
          }}
        >
          <Text style={{ fontSize: 28, marginBottom: 8 }}>📍</Text>
          <Text style={{ color: '#6B7280', textAlign: 'center' }}>
            Nenhum ATM atribuído ainda.
          </Text>
        </View>
      ) : (
        atms.map((atm) => (
          <AgentATMCard
            key={atm.id}
            atm={atm}
            updating={updating === atm.id}
            onToggleCash={() => toggleCash(atm.id)}
            onTogglePaper={() => togglePaper(atm.id)}
            onSetFila={(fila) => setFila(atm.id, fila)}
            onSetStatus={(status) => setStatus(atm.id, status)}
            onSetObs={(obs) => setObs(atm.id, obs)}
          />
        ))
      )}
    </ScrollView>
  )
}
