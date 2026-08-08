import { useEffect, useRef, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useAgentOnboarding } from '../../src/hooks/useAgentOnboarding'
import { AppCard } from '../../src/components/ui/AppCard'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppIcon, type AppIconName } from '../../src/components/ui/AppIcon'
import { colors, radius, brandGradient } from '../../src/theme/tokens'
import { setPendingAgentRedirect } from '../../src/lib/navigation-flag'

const STEPS: { icon: AppIconName; title: string; text: string }[] = [
  {
    icon: 'camera',
    title: '1. Tire a foto',
    text: 'Fotografe o ATM com a câmara. Fotos da galeria não são aceites.',
  },
  {
    icon: 'location',
    title: '2. GPS preenche a morada',
    text: 'A localização é capturada automaticamente e preenche o endereço.',
  },
  {
    icon: 'send',
    title: '3. Detalhes e submeter',
    text: 'Confirme o nome, estado (dinheiro/papel) e submeta para aprovação.',
  },
]

export default function AgentWelcomeScreen() {
  const router = useRouter()
  const { update } = useAgentOnboarding()
  const markedRef = useRef(false)

  const markSeen = useCallback(() => {
    if (markedRef.current) return
    markedRef.current = true
    update({ onboarding_seen: true })
  }, [update])

  useEffect(() => {
    markSeen()
  }, [markSeen])

  const handleContinue = () => {
    markSeen()
    setPendingAgentRedirect(false)
    router.replace('/agent/submit-atm')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <LinearGradient
        colors={brandGradient as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28, alignItems: 'center' }}
      >
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <AppIcon name="add-circle" size={28} color="#fff" />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff' }}>Vamos registar o teu primeiro ATM</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
          Em menos de um minuto podes começar a ganhar.
        </Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        {STEPS.map((step) => (
          <AppCard key={step.title} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name={step.icon} size={17} color={colors.brand[600]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>{step.title}</Text>
                <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 19, marginTop: 2 }}>{step.text}</Text>
              </View>
            </View>
          </AppCard>
        ))}

        <View style={{ backgroundColor: colors.brand[50], borderRadius: radius.md, padding: 14, marginTop: 4 }}>
          <Text style={{ fontSize: 13, color: colors.brand[700], lineHeight: 19 }}>
            Após submeter, o ATM fica em análise. Assim que for aprovado, o teu painel de agente desbloqueia e podes começar a ganhar 50 Kz por view.
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
        <TouchableOpacity onPress={() => router.replace('/(tabs)/map')} style={{ paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Primeiro quero explorar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
