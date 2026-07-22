import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useSupervisor } from '../../src/hooks/useSupervisor'

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color }}>{value}</Text>
    </View>
  )
}

export default function SupervisorScreen() {
  const { stats, pendingATMs, loading, refetch, isSupervisor } = useSupervisor()
  const router = useRouter()

  if (!isSupervisor) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Acesso restrito</Text>
        <Text style={{ color: '#6B7280', textAlign: 'center' }}>Esta secção é apenas para supervisores.</Text>
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
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#10B981" />}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <StatCard label="ATMs Aprovados" value={stats.totalATMs} color="#10B981" />
        <StatCard label="Pendentes" value={stats.pendingATMs} color="#F59E0B" />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <StatCard label="Agentes" value={stats.totalAgents} color="#3B82F6" />
      </View>

      <TouchableOpacity
        style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        onPress={() => router.push('/supervisor/pending')}
      >
        <Text style={{ fontSize: 22 }}>⏳</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E' }}>ATMs Pendentes</Text>
          <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>{stats.pendingATMs} aguardando aprovação</Text>
        </View>
        <Text style={{ fontSize: 14, color: '#B45309' }}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        onPress={() => router.push('/referrals')}
      >
        <Text style={{ fontSize: 22 }}>🔗</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#065F46' }}>As minhas Referências</Text>
          <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>Ver código e referidos</Text>
        </View>
        <Text style={{ fontSize: 14, color: '#047857' }}>→</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
