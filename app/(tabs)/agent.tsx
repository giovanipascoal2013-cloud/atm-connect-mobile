import { useState, useEffect } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useAgent } from '../../src/hooks/useAgent'
import { useAgentOnboarding } from '../../src/hooks/useAgentOnboarding'
import { useAuth } from '../../src/hooks/useAuth'
import { AgentATMCard } from '../../src/components/agent/AgentATMCard'
import { WithdrawalModal } from '../../src/components/agent/WithdrawalModal'
import { ReferralCard } from '../../src/components/agent/ReferralCard'

function StatCard({ label, value, color, onPress }: { label: string; value: string | number; color: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: onPress ? '#FDE68A' : '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color }}>{value}</Text>
    </TouchableOpacity>
  )
}

export default function AgentScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    atms,
    pendingCount,
    hasApprovedAtm,
    stats,
    agentRating,
    commissionPct,
    referralCode,
    loading,
    updating,
    refetch,
    toggleCash,
    togglePaper,
    setFila,
    setStatus,
    setObs,
    isAgent,
  } = useAgent()
  const [showWithdrawal, setShowWithdrawal] = useState(false)
  const { progress: onboarding, loading: onboardingLoading } = useAgentOnboarding()

  useEffect(() => {
    if (!onboardingLoading && onboarding && !onboarding.onboarding_seen) {
      router.replace('/agent/onboarding')
    }
  }, [onboarding, onboardingLoading, router])

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

  if (loading || onboardingLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#2094F3" />
        <Text style={{ color: '#6B7280', marginTop: 12 }}>A carregar painel...</Text>
      </View>
    )
  }

  if (!hasApprovedAtm) {
    const pending = pendingCount > 0
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F9FAFB' }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#2094F3" />}
      >
        <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 20 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>{pending ? '⏳' : '📍'}</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 8 }}>
            {pending ? 'ATM em análise' : 'Regista o teu primeiro ATM'}
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
            {pending
              ? `Submeteste ${pendingCount} ATM${pendingCount > 1 ? 's' : ''}. A equipa ATM Connect está a verificar as fotos. Assim que for aprovado, o teu painel é desbloqueado e podes começar a ganhar.`
              : 'O teu painel de agente desbloqueia assim que submeteres um ATM e ele for aprovado pela equipa. Só precisas de uma foto do local.'}
          </Text>
        </View>

        {pending && (
          <View
            style={{
              backgroundColor: '#EEF6FE',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#BFDBFE',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#2094F3', marginBottom: 6 }}>Próximos passos</Text>
            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
              1. Aguarda a aprovação (normalmente demora pouco tempo).{'\n'}2. Depois de aprovado, ganhas 50 Kz por cada visualização do teu ATM.{'\n'}3. Podes submeter mais ATMs para ganhar ainda mais.
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push('/agent/submit-atm')}
          style={{
            backgroundColor: '#2094F3',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
            {pending ? '+ Registrar mais um ATM' : '+ Submeter o primeiro ATM'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/agent/onboarding')}
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#2094F3' }}>Rever como ganhar dinheiro</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      contentContainerStyle={{ padding: 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#2094F3" />}
    >
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <StatCard label="Meus ATMs" value={stats.totalATMs} color="#2094F3" />
        <StatCard label="Views" value={stats.totalViews} color="#3B82F6" />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total ganho" value={`${Math.round(stats.totalEarnings).toLocaleString()} Kz`} color="#059669" />
        <StatCard
          label="Disponível"
          value={`${Math.round(stats.availableBalance).toLocaleString()} Kz`}
          color="#D97706"
          onPress={stats.availableBalance > 0 ? () => setShowWithdrawal(true) : undefined}
        />
      </View>

      {agentRating && agentRating.total_ratings > 0 && (
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#F3F4F6',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 }}>A sua reputação</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#10B981' }}>👍 {agentRating.likes}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#EF4444' }}>👎 {agentRating.dislikes}</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>({agentRating.total_ratings} votos)</Text>
            </View>
          </View>
          <ReputationBadge likes={agentRating.likes} total={agentRating.total_ratings} />
        </View>
      )}

      <ReferralCard referralCode={referralCode} userId={user?.id ?? ''} commissionPct={commissionPct} />

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
        <TouchableOpacity
          onPress={() => router.push('/agent/submit-atm')}
          style={{
            backgroundColor: '#EEF6FE',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#2094F3' }}>+ Submeter ATM</Text>
        </TouchableOpacity>
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
          <TouchableOpacity
            onPress={() => router.push('/agent/submit-atm')}
            style={{
              backgroundColor: '#2094F3',
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginTop: 14,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>+ Submeter o primeiro</Text>
          </TouchableOpacity>
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

      <WithdrawalModal
        visible={showWithdrawal}
        onClose={() => setShowWithdrawal(false)}
        availableBalance={stats.availableBalance}
        onSuccess={refetch}
      />
    </ScrollView>
  )
}

function ReputationBadge({ likes, total }: { likes: number; total: number }) {
  const approvalPct = total > 0 ? Math.round((likes / total) * 100) : 0
  const label = approvalPct >= 80 ? 'Excelente' : approvalPct >= 60 ? 'Bom' : approvalPct >= 40 ? 'Regular' : 'Fraco'
  const bg =
    approvalPct >= 80 ? '#ECFDF5' : approvalPct >= 60 ? '#EEF6FE' : approvalPct >= 40 ? '#FEF3C7' : '#FEE2E2'
  const fg =
    approvalPct >= 80 ? '#10B981' : approvalPct >= 60 ? '#2094F3' : approvalPct >= 40 ? '#D97706' : '#EF4444'

  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: fg }}>{approvalPct}% · {label}</Text>
    </View>
  )
}
