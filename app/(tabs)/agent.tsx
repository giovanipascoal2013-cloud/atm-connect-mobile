import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, AppState } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAgent } from '../../src/hooks/useAgent'
import { useAgentOnboarding } from '../../src/hooks/useAgentOnboarding'
import { useAuth } from '../../src/hooks/useAuth'
import { AgentATMCard } from '../../src/components/agent/AgentATMCard'
import { WithdrawalModal } from '../../src/components/agent/WithdrawalModal'
import { ReferralCard } from '../../src/components/agent/ReferralCard'
import { FlyerPreviewModal } from '../../src/components/agent/FlyerPreviewModal'
import { useFlyerReward } from '../../src/hooks/useFlyerReward'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppCard } from '../../src/components/ui/AppCard'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { Badge } from '../../src/components/ui/Badge'
import { AppIcon, type AppIconName } from '../../src/components/ui/AppIcon'
import { colors } from '../../src/theme/tokens'
import { formatKz } from '../../src/lib/format'
import type { Database } from '../../src/lib/supabase-types'

type FlyerSubmissionRow = Database['public']['Tables']['flyer_submissions']['Row']

function StatCard({
  label,
  value,
  icon,
  color,
  onPress,
  hint,
}: {
  label: string
  value: string | number
  icon: AppIconName
  color: string
  onPress?: () => void
  hint?: string
}) {
  return (
    <AppCard onPress={onPress} style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <AppIcon name={icon} size={13} color={colors.text.tertiary} />
        <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{label}</Text>
      </View>
      <Text
        style={{ fontSize: 18, fontWeight: '700', color, fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {hint ? (
        <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 3 }} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </AppCard>
  )
}

export default function AgentScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    atms,
    pendingAtms,
    pendingCount,
    hasApprovedAtm,
    stats,
    agentRating,
    commissionPct,
    referralCode,
    loading,
    updating,
    refetch,
    refetchSilent,
    toggleCash,
    togglePaper,
    setFila,
    setStatus,
    setObs,
    isAgent,
  } = useAgent()
  const [showWithdrawal, setShowWithdrawal] = useState(false)
  const { progress: onboarding, loading: onboardingLoading } = useAgentOnboarding()
  const { submission: flyerSubmission, settings: flyerSettings, refetch: refetchFlyer } = useFlyerReward()
  const [showFlyer, setShowFlyer] = useState(false)

  useEffect(() => {
    if (!onboardingLoading && !loading && onboarding && !onboarding.onboarding_seen && pendingCount === 0 && !hasApprovedAtm) {
      router.replace('/agent/onboarding')
    }
  }, [onboarding, onboardingLoading, loading, pendingCount, hasApprovedAtm, router])

  useFocusEffect(
    useCallback(() => {
      refetchSilent()
      refetchFlyer()
    }, [refetchSilent, refetchFlyer])
  )

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refetchSilent()
        refetchFlyer()
      }
    })
    return () => sub.remove()
  }, [refetchSilent, refetchFlyer])

  if (!isAgent) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 32 }}>
        <EmptyState
          icon="lock-closed"
          title="Acesso restrito"
          description="Esta secção é apenas para agentes ATM Connect."
        />
      </View>
    )
  }

  if (loading || onboardingLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text style={{ color: colors.text.secondary, marginTop: 12 }}>A carregar painel...</Text>
      </View>
    )
  }

  if (!hasApprovedAtm) {
    const pending = pendingCount > 0
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.brand[500]} />}
      >

        <EmptyState
          icon={pending ? 'hourglass-outline' : 'location-outline'}
          title={pending ? 'ATM em análise' : 'Regista o teu primeiro ATM'}
          description={
            pending
              ? `Submeteste ${pendingCount} ATM${pendingCount > 1 ? 's' : ''}. A equipa ATM Connect está a verificar as fotos. Assim que for aprovado, o teu painel é desbloqueado e podes começar a ganhar.`
              : 'O teu painel de agente desbloqueia assim que submeteres um ATM e ele for aprovado pela equipa. Só precisas de uma foto do local.'
          }
        />

        {pending && pendingAtms.length > 0 && (
          <View style={{ gap: 10, marginBottom: 16 }}>
            {pendingAtms.map((atm) => (
              <AppCard key={atm.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: colors.brand[50],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppIcon name="hourglass-outline" size={18} color={colors.brand[500]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{atm.bank_name}</Text>
                    <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }} numberOfLines={1}>
                      {atm.address}
                    </Text>
                  </View>
                  <Badge variant="neutral" label="Em análise" />
                </View>
              </AppCard>
            ))}
          </View>
        )}

        {pending && (
          <AppCard style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand[500], marginBottom: 6 }}>Próximos passos</Text>
            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
              1. Aguarda a aprovação (normalmente demora pouco tempo).{'\n'}2. Depois de aprovado, ganhas 0.15 Kz por cada visualização do teu ATM.{'\n'}3. Podes submeter mais ATMs para ganhar ainda mais.
            </Text>
          </AppCard>
        )}

        <AppButton
          label={pending ? '+ Registrar mais um ATM' : '+ Submeter o primeiro ATM'}
          onPress={() => router.push('/agent/submit-atm')}
          fullWidth
          icon="add-circle-outline"
          haptic
        />

        <AppButton
          label="Rever como ganhar dinheiro"
          variant="ghost"
          onPress={() => router.push('/agent/onboarding')}
          fullWidth
        />
      </ScrollView>
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.brand[500]} />}
    >
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <StatCard label="Meus ATMs" value={stats.totalATMs} icon="business-outline" color={colors.brand[500]} />
        <StatCard label="Views" value={stats.totalViews} icon="eye-outline" color="#3B82F6" />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <StatCard label="Total ganho" value={`${formatKz(stats.totalEarnings)} Kz`} icon="cash-outline" color="#399256" />
        <StatCard
          label="Disponível"
          value={`${formatKz(stats.availableBalance)} Kz`}
          icon="wallet-outline"
          color={colors.warning}
          onPress={stats.availableBalance > 0 ? () => setShowWithdrawal(true) : undefined}
          hint={stats.availableBalance > 0 ? 'Toca aqui para fazer levantamento' : undefined}
        />
      </View>

      <AppCard style={{ marginBottom: 12, backgroundColor: '#EAF3FF', borderColor: colors.brand[100] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: colors.brand[500],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon name="megaphone" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
              Ganha um bónus de {flyerSettings.bonusKz} Kz
            </Text>
            <Text style={{ fontSize: 12, color: colors.text.secondary }} numberOfLines={1}>
              Imprime e cola o nosso flyer junto ao teu ATM aprovado.
            </Text>
          </View>
        </View>
        {flyerSubmission ? (
          <FlyerStatusLine
            submission={flyerSubmission}
            totalViews={stats.totalViews}
            viewsUnlock={flyerSettings.viewsUnlock}
            onOpen={() => setShowFlyer(true)}
          />
        ) : (
          <AppButton
            label="Ver como funciona"
            variant="secondary"
            icon="arrow-forward"
            iconRight="arrow-forward"
            size="sm"
            onPress={() => setShowFlyer(true)}
          />
        )}
      </AppCard>

      {stats.availableBalance <= 0 && stats.totalEarnings > 0 && (
        <AppCard style={{ marginBottom: 16, backgroundColor: colors.accent[50], borderColor: colors.accent[200] }}>
          <Text style={{ fontSize: 13, color: colors.accent[800], lineHeight: 19 }}>
            Acumula 500 Kz para levantar — continua a ganhar por cada view no teu ATM!
          </Text>
        </AppCard>
      )}

      {agentRating && agentRating.total_ratings > 0 && (
        <AppCard style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>A tua reputação</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="thumbs-up" size={14} color={colors.money} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.money }}>{agentRating.likes}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="thumbs-down" size={14} color={colors.danger} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.danger }}>{agentRating.dislikes}</Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.text.tertiary }}>({agentRating.total_ratings} votos)</Text>
              </View>
            </View>
            <ReputationBadge likes={agentRating.likes} total={agentRating.total_ratings} />
          </View>
        </AppCard>
      )}

      <ReferralCard referralCode={referralCode} userId={user?.id ?? ''} commissionPct={commissionPct} />

      {stats.totalWithdrawn > 0 && (
        <AppCard style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, color: colors.text.secondary }}>Já levantado</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary, marginTop: 2, fontVariant: ['tabular-nums'] }}>
            {formatKz(stats.totalWithdrawn)} Kz
          </Text>
          <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: 4 }}>
            Comissão por view de utilizadores free
          </Text>
        </AppCard>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>Os meus ATMs</Text>
        <AppButton
          label="+ Submeter ATM"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/agent/submit-atm')}
          icon="add"
        />
      </View>

      {atms.length === 0 ? (
        <AppCard>
          <EmptyState
            icon="business-outline"
            title="Nenhum ATM atribuído"
            description="Regista o teu primeiro ATM para começar a ganhar."
            actionLabel="+ Submeter o primeiro"
            onAction={() => router.push('/agent/submit-atm')}
          />
        </AppCard>
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

      <FlyerPreviewModal
        visible={showFlyer}
        onClose={() => setShowFlyer(false)}
        settings={flyerSettings}
      />
    </ScrollView>
  )
}

function ReputationBadge({ likes, total }: { likes: number; total: number }) {
  const approvalPct = total > 0 ? Math.round((likes / total) * 100) : 0
  const label = approvalPct >= 80 ? 'Excelente' : approvalPct >= 60 ? 'Bom' : approvalPct >= 40 ? 'Regular' : 'A melhorar'
  const bg =
    approvalPct >= 80 ? '#EAF6EE' : approvalPct >= 60 ? colors.brand[50] : approvalPct >= 40 ? '#FEF3C7' : '#FEE2E2'
  const fg =
    approvalPct >= 80 ? colors.money : approvalPct >= 60 ? colors.brand[500] : approvalPct >= 40 ? colors.warning : colors.danger

  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: fg }}>{approvalPct}% · {label}</Text>
    </View>
  )
}

function FlyerStatusLine({
  submission,
  totalViews,
  viewsUnlock,
  onOpen,
}: {
  submission: FlyerSubmissionRow
  totalViews: number
  viewsUnlock: number
  onOpen: () => void
}) {
  const progress = Math.min(1, totalViews / viewsUnlock)
  const config =
    submission.status === 'rewarded'
      ? { icon: 'checkmark-circle' as const, color: colors.money, label: `Bónus de ${formatKz(submission.amount_kz)} Kz creditado` }
      : submission.status === 'approved'
        ? { icon: 'checkmark-circle' as const, color: colors.money, label: `Flyer aprovado · ${totalViews}/${viewsUnlock} views` }
        : { icon: 'hourglass-outline' as const, color: colors.warning, label: `Em análise · ${totalViews}/${viewsUnlock} views` }

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <AppIcon name={config.icon} size={16} color={config.color} />
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text.primary }}>{config.label}</Text>
        <AppButton label="Ver" variant="secondary" size="sm" onPress={onOpen} />
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.brand[100], overflow: 'hidden' }}>
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            borderRadius: 3,
            backgroundColor: submission.status === 'rewarded' ? colors.money : colors.brand[500],
          }}
        />
      </View>
    </>
  )
}
