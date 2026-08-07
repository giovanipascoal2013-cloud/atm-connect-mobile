import { useEffect, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useAgentOnboarding } from '../../src/hooks/useAgentOnboarding'

const SECTIONS = [
  {
    icon: '💼',
    title: 'O que é um Agente',
    points: [
      'É a pessoa de referência para registar e manter ATMs.',
      'Mantém a informação actualizada para os clientes.',
      'Pode gerir vários ATMs a partir do painel.',
    ],
  },
  {
    icon: '💰',
    title: 'Como ganha dinheiro',
    points: [
      'Recebe 50 KZ por cada view consumida num ATM submetido por si.',
      'Quanto mais ATMs activos tiver, mais ganha.',
      'Ganha também 20% da primeira subscrição de quem usar o seu código de convite.',
    ],
  },
  {
    icon: '📷',
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
    icon: '🏦',
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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View
        style={{
          backgroundColor: '#2094F3',
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 28,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 40, marginBottom: 8 }}>🤝</Text>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>Bem-vindo, Agente</Text>
        <Text style={{ fontSize: 14, color: '#DBEAFE', marginTop: 6, textAlign: 'center' }}>
          Leia com atenção como começar a ganhar com o ATM Connect.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        {SECTIONS.map((section, i) => (
          <View
            key={section.title}
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#F3F4F6',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEF6FE', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 17 }}>{section.icon}</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 }}>
                {i + 1}. {section.title}
              </Text>
            </View>
            {section.points.map((point) => (
              <View key={point} style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 14, color: '#2094F3', marginTop: 1 }}>•</Text>
                <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20, flex: 1 }}>{point}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={{ backgroundColor: '#EEF6FE', borderRadius: 12, padding: 14, marginTop: 4 }}>
          <Text style={{ fontSize: 13, color: '#1A7ED6', lineHeight: 19 }}>
            O painel do agente só desbloqueia depois de ter pelo menos um ATM aprovado. Enquanto aguarda a aprovação, pode submeter mais ATMs.
          </Text>
        </View>
      </ScrollView>

      <View style={{ padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
        <TouchableOpacity
          onPress={handleContinue}
          style={{ backgroundColor: '#2094F3', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Continuar para registar um ATM 📷</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleExplore} style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Explorar o app primeiro</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
