import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { AppButton } from '../ui/AppButton'
import { AppIcon } from '../ui/AppIcon'
import { SegmentedControl } from '../ui/SegmentedControl'
import { colors, radius, shadows } from '../../theme/tokens'

interface WithdrawalModalProps {
  visible: boolean
  onClose: () => void
  availableBalance: number
  onSuccess: () => void
}

type Step = 'form' | 'processing' | 'success'
type Method = 'iban' | 'multicaixa_express'

export function WithdrawalModal({ visible, onClose, availableBalance, onSuccess }: WithdrawalModalProps) {
  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Method>('iban')
  const [minAmount, setMinAmount] = useState(500)
  const [titular, setTitular] = useState('')
  const [iban, setIban] = useState('')
  const [banco, setBanco] = useState('')
  const [mcxPhone, setMcxPhone] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [hasProfileIban, setHasProfileIban] = useState(false)

  useEffect(() => {
    if (!visible || !user) return
    setStep('form')
    setAmount('')
    setMethod('iban')
    setMcxPhone('')
    setBanco('')

    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'min_withdrawal_amount')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const v = Number(data.value)
          if (!isNaN(v) && v > 0) setMinAmount(v)
        }
      })

    if (profile?.iban) {
      setIban(profile.iban)
      setTitular(profile.iban_titular || '')
      setHasProfileIban(true)
    } else {
      setIban('')
      setTitular('')
      setHasProfileIban(false)
    }
    setProfileLoaded(true)
  }, [visible, user, profile?.iban, profile?.iban_titular])

  const handleClose = () => {
    if (step === 'success') onSuccess()
    setStep('form')
    setTitular('')
    setIban('')
    setBanco('')
    setMcxPhone('')
    setProfileLoaded(false)
    onClose()
  }

  const handleSubmit = async () => {
    if (!user) return
    const amountNum = Number(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Valor inválido', 'Insira um valor válido.')
      return
    }
    if (amountNum < minAmount) {
      Alert.alert('Valor mínimo', `O valor mínimo de levantamento é ${minAmount.toLocaleString()} Kz.`)
      return
    }
    if (amountNum > availableBalance) {
      Alert.alert('Saldo insuficiente', 'O valor excede o teu saldo disponível.')
      return
    }

    if (method === 'iban') {
      if (!titular.trim() || !iban.trim()) {
        Alert.alert('Preencha os dados', 'Titular e IBAN são obrigatórios.')
        return
      }
    } else {
      if (!titular.trim() || !mcxPhone.trim()) {
        Alert.alert('Preencha os dados', 'Nome e telefone são obrigatórios.')
        return
      }
    }

    setStep('processing')

    const bankDetails = method === 'iban'
      ? { titular: titular.trim(), iban: iban.trim(), banco: banco.trim() || null }
      : { titular: titular.trim(), telefone: mcxPhone.trim() }

    try {
      const { error } = await supabase.rpc('request_withdrawal', {
        _agent_id: user.id,
        _amount_kz: amountNum,
        _method: method,
        _bank_details: bankDetails,
      })

      if (error) throw error

      if (refreshProfile) {
        await refreshProfile()
      }

      setStep('success')
    } catch (err) {
      const e = err as { message?: string }
      Alert.alert('Erro', e?.message || 'Erro inesperado. Tente novamente.')
      setStep('form')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            ...shadows.raised,
            paddingTop: 20,
            paddingBottom: 32,
            maxHeight: '85%',
          }}
        >
          <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 16 }} />
          </View>

          {step === 'form' && (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                <AppIcon name="cash" size={20} color={colors.brand[500]} />
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, textAlign: 'center' }}>
                  Levantar os teus ganhos
                </Text>
              </View>

              <View style={{ backgroundColor: colors.accent[50], borderRadius: radius.md, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: colors.accent[200] }}>
                <Text style={{ fontSize: 12, color: colors.accent[700] }}>Saldo disponível</Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.money, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  {Math.round(availableBalance).toLocaleString()} Kz
                </Text>
              </View>

              <View style={{ backgroundColor: colors.surface, borderRadius: radius.sm, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: colors.text.secondary }}>
                  Valor mínimo: <Text style={{ fontWeight: '600', color: colors.text.primary, fontVariant: ['tabular-nums'] }}>{minAmount.toLocaleString()} Kz</Text>
                </Text>
              </View>

              {profileLoaded && !hasProfileIban && method === 'iban' && (
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: radius.sm, padding: 12, marginBottom: 12, gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400E' }}>IBAN não configurado</Text>
                  <Text style={{ fontSize: 12, color: '#B45309' }}>
                    Configure o seu IBAN na página de perfil para pré-preencher automaticamente.
                  </Text>
                  <TouchableOpacity onPress={() => { handleClose(); router.push('/(tabs)/profile') }}>
                    <Text style={{ fontSize: 12, color: colors.brand[500], fontWeight: '600', textDecorationLine: 'underline', marginTop: 2 }}>
                      Ir para o perfil
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ marginBottom: 16 }}>
                <SegmentedControl
                  options={[
                    { key: 'iban', label: 'IBAN' },
                    { key: 'multicaixa_express', label: 'MCX Express' },
                  ]}
                  value={method}
                  onChange={setMethod}
                />
              </View>

              <Text style={{ fontSize: 13, color: colors.text.primary, fontWeight: '600', marginBottom: 6 }}>Valor a levantar (Kz)</Text>
              <TextInput
                style={inputStyle}
                value={amount}
                onChangeText={setAmount}
                placeholder={`Ex: ${minAmount}`}
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />

              <Text style={{ fontSize: 13, color: colors.text.primary, fontWeight: '600', marginBottom: 6 }}>Nome do titular</Text>
              <TextInput
                style={inputStyle}
                value={titular}
                onChangeText={setTitular}
                placeholder="Nome completo"
                placeholderTextColor={colors.text.tertiary}
              />

              {method === 'iban' ? (
                <>
                  <Text style={{ fontSize: 13, color: colors.text.primary, fontWeight: '600', marginBottom: 6 }}>IBAN</Text>
                  <TextInput
                    style={[inputStyle, { fontFamily: 'monospace' }]}
                    value={iban}
                    onChangeText={setIban}
                    placeholder="AO06 ..."
                    placeholderTextColor={colors.text.tertiary}
                    autoCapitalize="characters"
                  />
                  <Text style={{ fontSize: 13, color: colors.text.primary, fontWeight: '600', marginBottom: 6 }}>Banco (opcional)</Text>
                  <TextInput
                    style={inputStyle}
                    value={banco}
                    onChangeText={setBanco}
                    placeholder="Ex: BAI, BFA..."
                    placeholderTextColor={colors.text.tertiary}
                  />
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, color: colors.text.primary, fontWeight: '600', marginBottom: 6 }}>Telefone (Multicaixa Express)</Text>
                  <TextInput
                    style={[inputStyle, { fontFamily: 'monospace' }]}
                    value={mcxPhone}
                    onChangeText={setMcxPhone}
                    placeholder="+244 9XX XXX XXX"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="phone-pad"
                  />
                </>
              )}

              <AppButton
                label={`Levantar ${amount ? `${Number(amount).toLocaleString()} Kz` : ''}`}
                icon="cash"
                fullWidth
                haptic
                disabled={!amount}
                onPress={handleSubmit}
                style={{ marginTop: 16 }}
              />

              <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: colors.text.tertiary }}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {step === 'processing' && (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={colors.brand[500]} />
              <Text style={{ color: colors.text.secondary }}>A enviar solicitação...</Text>
            </View>
          )}

          {step === 'success' && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center', gap: 12 }}>
              <View style={{ backgroundColor: colors.accent[50], padding: 16, borderRadius: 40 }}>
                <AppIcon name="checkmark-circle" size={36} color={colors.money} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>Pedido enviado!</Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, textAlign: 'center' }}>
                A equipa vai processar o teu levantamento e avisa-te quando estiver pronto.
              </Text>
              <AppButton
                label="Entendido"
                fullWidth
                haptic
                onPress={handleClose}
                style={{ marginTop: 8 }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const inputStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.sm,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 12,
  paddingVertical: 12,
  fontSize: 14,
  color: colors.text.primary,
  marginBottom: 14,
}
