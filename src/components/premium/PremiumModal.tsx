import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, Linking } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: 32,
            maxHeight: '80%',
          }}
        >
          <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginBottom: 16 }} />
          </View>

          {step === 'plan' ? (
            <View style={{ paddingHorizontal: 20 }}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>👑</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                  Upgrade Premium
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>
                  Views ilimitadas e sem anúncios
                </Text>
              </View>

              {PLANS.map((plan) => (
                <TouchableOpacity
                  key={plan.type}
                  style={{
                    backgroundColor: selectedPlan === plan.type ? '#EEF6FE' : '#F9FAFB',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 2,
                    borderColor: selectedPlan === plan.type ? '#2094F3' : '#E5E7EB',
                  }}
                  onPress={() => setSelectedPlan(plan.type)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{plan.label}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{plan.period}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#10B981' }}>
                        {plan.price.toLocaleString()} Kz
                      </Text>
                      {plan.savings && (
                        <Text style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>
                          Economia {plan.savings}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={{
                  backgroundColor: '#2094F3',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 8,
                  opacity: creating ? 0.7 : 1,
                }}
                onPress={() => handleSelectPlan(selectedPlan)}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                    Continuar
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Agora não</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
                  Pagamento via Multicaixa Express
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>
                  Siga os passos abaixo para efectuar o pagamento
                </Text>
              </View>

              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Step number={1} text="Abra o Multicaixa Express" />
                <Step number={2} text="Entidade: 00930" />
                <Step number={3} text={`Referência: ${paymentRef}`} highlight />
                <Step number={4} text={`Valor: ${priceKz.toLocaleString()} Kz`} />
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: '#F3F4F6',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
                onPress={handleCopyRef}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                  Copiar Referência
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: '#25D366',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
                onPress={handleSendProof}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                  Enviar Comprovativo (WhatsApp)
                </Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 12 }}>
                A subscrição será activada após confirmação do pagamento (até 24h)
              </Text>

              <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Fechar</Text>
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
          backgroundColor: highlight ? '#10B981' : '#E5E7EB',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: highlight ? '#fff' : '#6B7280' }}>{number}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: highlight ? '600' : '400', color: highlight ? '#111827' : '#374151', flex: 1 }}>
        {text}
      </Text>
    </View>
  )
}
