import { useEffect, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useAgentOnboarding } from '../../src/hooks/useAgentOnboarding'
import { AppCard } from '../../src/components/ui/AppCard'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppIcon, type AppIconName } from '../../src/components/ui/AppIcon'
import { colors, radius, brandGradient } from '../../src/theme/tokens'

const SECTIONS: { icon: AppIconName; title: string; points: string[] }[] = [
  {
    icon: 'briefcase',
    title: 'O que é um Agente',
    points: [
      'É a pessoa de referência para registar e manter ATMs.',
      'Mantém a informação actualizada para os clientes.',
      'Pode gerir vários ATMs a partir do painel.',
    ],
  },
  {
    icon: 'cash',
    title: 'Como ganha dinheiro',
    points: [
      'Recebe 50 KZ por cada view consumida num ATM submetido por si.',
      'Quanto mais ATMs activos tiver, mais ganha.',
      'Ganha também 20% da primeira subscrição de quem usar o seu código de convite.',
    ],
  },
  {
    icon: 'camera',
    title: 'Como registar um ATM',
    points: [
      'Vai precisar de estar fisicamente em frente ao equipamento.',
      'Passo 1 — Foto: tire a foto do ATM com a câmara (fotos da galeria não são aceites).',
      'Passo 2 — GPS: a localização é capturada automaticamente e preenche o endereço.',
      'Passo 3 — Detalhes: nome, endereço e estado (dinheiro/papel).',
      'Após submissão, um administrador valida e aprova o ATM.',
    ],
  },
  {
    icon: 'card',
    title: 'Como levantar dinheiro',
    points: [
      'Os seus ganhos acumulam no painel do agente.',
      'Quando atingir o valor mínimo (500 KZ), pode solicitar o levantamento.',
      'Escolha IBAN (transferência) ou Multicaixa Express.',
      'O pedido fica pendente até o administrador processar.',
    ],
  },
]

export default function AgentOnboardingScreen() {
  const router = useRouter()
  const { update } = useAgentOnboarding()
  const markedRef = useRef(false)

  useEffect(() => {
    if (markedRef.current) return
    markedRef.current = true
    update({ onboarding_seen: true })
  }, [update])

  const handleContinue = () => {
    router.replace('/agent/submit-atm')
  }

  const handleExplore = () => {
    router.replace('/(tabs)/map')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <LinearGradient
        colors={brandGradient as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, alignItems: 'center' }}
      >
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <AppIcon name="rocket" size={28} color="#fff" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>Bem-vindo, Agente</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
          Leia com atenção como começar a ganhar com o ATM Connect.
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        {SECTIONS.map((section, i) => (
          <AppCard key={section.title} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name={section.icon} size={17} color={colors.brand[600]} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, flex: 1 }}>
                {i + 1}. {section.title}
              </Text>
            </View>
            {section.points.map((point) => (
              <View key={point} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                <View style={{ marginTop: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brand[400] }} />
                <Text style={{ fontSize: 14, color: colors.text.primary, lineHeight: 20, flex: 1 }}>{point}</Text>
              </View>
            ))}
          </AppCard>
        ))}

        <View style={{ backgroundColor: colors.brand[50], borderRadius: radius.md, padding: 14, marginTop: 4 }}>
          <Text style={{ fontSize: 13, color: colors.brand[700], lineHeight: 19 }}>
            O painel do agente só desbloqueia depois de ter pelo menos um ATM aprovado. Enquanto aguarda a aprovação, pode submeter mais ATMs.
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card }}>
        <AppButton
          label="Continuar para registar um ATM"
          icon="camera"
          iconRight="arrow-forward"
          fullWidth
          haptic
          onPress={handleContinue}
        />
        <TouchableOpacity onPress={handleExplore} style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Explorar o app primeiro</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
