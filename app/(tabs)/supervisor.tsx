import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useSupervisor } from '../../src/hooks/useSupervisor'
import { AppCard } from '../../src/components/ui/AppCard'
import { AppIcon, type AppIconName } from '../../src/components/ui/AppIcon'
import { colors } from '../../src/theme/tokens'

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: AppIconName }) {
  return (
    <AppCard style={{ flex: 1, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <AppIcon name={icon} size={15} color={colors.text.tertiary} />
        <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </AppCard>
  )
}

export default function SupervisorScreen() {
  const { stats, loading, refetch, isSupervisor } = useSupervisor()
  const router = useRouter()

  if (!isSupervisor) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 32 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <AppIcon name="lock-closed" size={30} color={colors.brand[400]} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>Acesso restrito</Text>
        <Text style={{ color: colors.text.secondary, textAlign: 'center' }}>Esta secção é apenas para supervisores.</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text style={{ color: colors.text.secondary, marginTop: 12 }}>A carregar painel...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.brand[500]} />}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <StatCard label="ATMs Aprovados" value={stats.totalATMs} color={colors.brand[600]} icon="checkmark-done-circle" />
        <StatCard label="Pendentes" value={stats.pendingATMs} color={colors.warning} icon="time" />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <StatCard label="Agentes" value={stats.totalAgents} color={colors.brand[500]} icon="people" />
      </View>

      <AppCard
        raised
        onPress={() => router.push('/supervisor/pending')}
        style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name="time" size={20} color="#92400E" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E' }}>ATMs Pendentes</Text>
          <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>{stats.pendingATMs} aguardando aprovação</Text>
        </View>
        <AppIcon name="chevron-forward" size={16} color="#B45309" />
      </AppCard>

      <AppCard
        raised
        onPress={() => router.push('/referrals')}
        style={{ backgroundColor: colors.accent[50], borderColor: colors.accent[200], marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent[100], alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name="link" size={20} color={colors.accent[700]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accent[800] }}>As minhas Referências</Text>
          <Text style={{ fontSize: 12, color: colors.accent[700], marginTop: 2 }}>Ver código e referidos</Text>
        </View>
        <AppIcon name="chevron-forward" size={16} color={colors.accent[700]} />
      </AppCard>
    </ScrollView>
  )
}
