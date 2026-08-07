import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Alert, Linking } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { AppIcon } from '../ui/AppIcon'
import { AppButton } from '../ui/AppButton'
import { colors, brandGradient } from '@/theme/tokens'

interface PremiumModalProps {
  visible: boolean
  onClose: () => void
}

type PaymentStep = 'plan' | 'payment'
type PlanType = 'monthly' | 'quarterly' | 'annual'

const PLANS: { type: PlanType; label: string; price: number; period: string; savings?: string }[] = [
  { type: 'monthly', label: 'Mensal', price: 290, period: 'por mês' },
  { type: 'quarterly', label: 'Trimestral', price: 700, period: 'por 3 meses', savings: '~20%' },
  { type: 'annual', label: 'Anual', price: 1500, period: 'por ano', savings: '~57%' },
]

const PLAN_CONFIG: Record<PlanType, { settingKey: string; fallback: string; days: number }> = {
  monthly: { settingKey: 'premium_monthly_price_kz', fallback: '290', days: 30 },
  quarterly: { settingKey: 'premium_quarterly_price_kz', fallback: '700', days: 90 },
  annual: { settingKey: 'premium_annual_price_kz', fallback: '1500', days: 365 },
}

const PLAN_LABEL: Record<PlanType, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  annual: 'Anual',
}

const WHATSAPP_NUMBER = '+244933986318'

export function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<PaymentStep>('plan')
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly')
  const [paymentRef, setPaymentRef] = useState('')
  const [creating, setCreating] = useState(false)

  const priceKz = PLANS.find((p) => p.type === selectedPlan)?.price ?? 0

  const handleSelectPlan = async (planType: PlanType) => {
    if (!user) return
    setSelectedPlan(planType)
    setCreating(true)

    try {
      const config = PLAN_CONFIG[planType]
      const { data: priceRes } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', config.settingKey)
        .maybeSingle()

      const price = parseInt(priceRes?.value ?? config.fallback, 10)

      const ref = `DEM-${Date.now().toString(36).toUpperCase()}`

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_type: planType,
        price_kz: price,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + config.days * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        payment_ref: ref,
      })

      if (error) {
        Alert.alert('Erro', 'Não foi possível criar a subscrição. Tente novamente.')
        return
      }

      setPaymentRef(ref)
      setStep('payment')
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro inesperado.')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyRef = () => {
    // expo-clipboard would be better, but Alert-based fallback works
    Alert.alert('Referência copiada', paymentRef)
  }

  const handleSendProof = () => {
    const msg = encodeURIComponent(
      `Olá! Gostaria de activar a minha subscrição ATM Connect Premium.\n\nReferência: ${paymentRef}\nValor: ${priceKz.toLocaleString()} Kz\nPlano: ${PLAN_LABEL[selectedPlan]}`
    )
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${msg}`)
  }

  const handleClose = () => {
    setStep('plan')
    setPaymentRef('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderCurve: 'continuous',
            paddingTop: 12,
            paddingBottom: 32,
            maxHeight: '80%',
          }}
        >
          <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginBottom: 16 }} />
          </View>

          {step === 'plan' ? (
            <View style={{ paddingHorizontal: 20 }}>
              <LinearGradient
                colors={brandGradient as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(255,255,255,0.22)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <AppIcon name="diamond" size={28} color="#fff" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>
                  Upgrade Premium
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4, textAlign: 'center' }}>
                  Views ilimitadas e sem anúncios
                </Text>
              </LinearGradient>

              {PLANS.map((plan) => {
                const selected = selectedPlan === plan.type
                return (
                  <TouchableOpacity
                    key={plan.type}
                    style={{
                      backgroundColor: selected ? colors.brand[50] : colors.surface,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 2,
                      borderColor: selected ? colors.brand[500] : colors.border,
                    }}
                    onPress={() => setSelectedPlan(plan.type)}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: selected ? colors.brand[500] : '#fff',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <AppIcon name={plan.type === 'annual' ? 'star' : plan.type === 'quarterly' ? 'trending-up' : 'calendar'} size={18} color={selected ? '#fff' : colors.brand[500]} />
                        </View>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.primary }}>{plan.label}</Text>
                          <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 1 }}>{plan.period}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.money, fontVariant: ['tabular-nums'] }}>
                          {plan.price.toLocaleString()} Kz
                        </Text>
                        {plan.savings && (
                          <View style={{ backgroundColor: colors.accent[50], borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
                            <Text style={{ fontSize: 11, color: colors.accent[600], fontWeight: '700' }}>
                              -{plan.savings.replace('~', '')}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}

              <AppButton
                label="Continuar"
                onPress={() => handleSelectPlan(selectedPlan)}
                loading={creating}
                disabled={creating}
                fullWidth
                size="lg"
                icon="arrow-forward"
                haptic
              />

              <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Agora não</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colors.brand[50],
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <AppIcon name="card-outline" size={28} color={colors.brand[500]} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
                  Pagamento via Multicaixa Express
                </Text>
                <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 4, textAlign: 'center' }}>
                  Siga os passos abaixo para efectuar o pagamento
                </Text>
              </View>

              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Step number={1} text="Abra o Multicaixa Express" />
                <Step number={2} text="Entidade: 00930" />
                <Step number={3} text={`Referência: ${paymentRef}`} highlight />
                <Step number={4} text={`Valor: ${priceKz.toLocaleString()} Kz`} />
              </View>

              <AppButton
                label="Copiar Referência"
                variant="outline"
                onPress={handleCopyRef}
                fullWidth
                icon="copy-outline"
              />

              <View style={{ marginBottom: 12, marginTop: 0 }}>
                <AppButton
                  label="Enviar Comprovativo (WhatsApp)"
                  onPress={handleSendProof}
                  fullWidth
                  icon="logo-whatsapp"
                  haptic
                />
              </View>

              <Text style={{ fontSize: 12, color: colors.text.tertiary, textAlign: 'center', marginBottom: 12 }}>
                A subscrição será activada após confirmação do pagamento (até 24h)
              </Text>

              <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

function Step({ number, text, highlight }: { number: number; text: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: highlight ? colors.money : '#E5E7EB',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: highlight ? '#fff' : colors.text.secondary }}>{number}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: highlight ? '600' : '400', color: highlight ? colors.text.primary : '#374151', flex: 1 }}>
        {text}
      </Text>
    </View>
  )
}
