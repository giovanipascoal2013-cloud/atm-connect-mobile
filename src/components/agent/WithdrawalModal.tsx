import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, TextInput, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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
      Alert.alert('Saldo insuficiente', 'O valor excede o seu saldo disponível.')
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
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: 32,
            maxHeight: '85%',
          }}
        >
          <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginBottom: 16 }} />
          </View>

          {step === 'form' && (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' }}>
                Levantar Saldo
              </Text>

              <View style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#047857' }}>Saldo disponível</Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#10B981', marginTop: 2 }}>
                  {Math.round(availableBalance).toLocaleString()} Kz
                </Text>
              </View>

              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>
                  Valor mínimo: <Text style={{ fontWeight: '600', color: '#111827' }}>{minAmount.toLocaleString()} Kz</Text>
                </Text>
              </View>

              {profileLoaded && !hasProfileIban && method === 'iban' && (
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12, marginBottom: 12, gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400E' }}>IBAN não configurado</Text>
                  <Text style={{ fontSize: 12, color: '#B45309' }}>
                    Configure o seu IBAN na página de perfil para pré-preencher automaticamente.
                  </Text>
                  <TouchableOpacity onPress={() => { handleClose(); router.push('/(tabs)/profile') }}>
                    <Text style={{ fontSize: 12, color: '#2094F3', fontWeight: '600', textDecorationLine: 'underline', marginTop: 2 }}>
                      Ir para o perfil
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: method === 'iban' ? '#EEF6FE' : '#F9FAFB',
                    borderWidth: 1.5,
                    borderColor: method === 'iban' ? '#2094F3' : '#E5E7EB',
                  }}
                  onPress={() => setMethod('iban')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: method === 'iban' ? '#2094F3' : '#6B7280' }}>IBAN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: method === 'multicaixa_express' ? '#EEF6FE' : '#F9FAFB',
                    borderWidth: 1.5,
                    borderColor: method === 'multicaixa_express' ? '#2094F3' : '#E5E7EB',
                  }}
                  onPress={() => setMethod('multicaixa_express')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: method === 'multicaixa_express' ? '#2094F3' : '#6B7280' }}>
                    MCX Express
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>Valor a levantar (Kz)</Text>
              <TextInput
                style={inputStyle}
                value={amount}
                onChangeText={setAmount}
                placeholder={`Ex: ${minAmount}`}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />

              <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>Nome do titular</Text>
              <TextInput
                style={inputStyle}
                value={titular}
                onChangeText={setTitular}
                placeholder="Nome completo"
                placeholderTextColor="#9CA3AF"
              />

              {method === 'iban' ? (
                <>
                  <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>IBAN</Text>
                  <TextInput
                    style={[inputStyle, { fontFamily: 'monospace' }]}
                    value={iban}
                    onChangeText={setIban}
                    placeholder="AO06 ..."
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                  />
                  <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>Banco (opcional)</Text>
                  <TextInput
                    style={inputStyle}
                    value={banco}
                    onChangeText={setBanco}
                    placeholder="Ex: BAI, BFA..."
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>Telefone (Multicaixa Express)</Text>
                  <TextInput
                    style={[inputStyle, { fontFamily: 'monospace' }]}
                    value={mcxPhone}
                    onChangeText={setMcxPhone}
                    placeholder="+244 9XX XXX XXX"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                  />
                </>
              )}

              <TouchableOpacity
                style={{
                  backgroundColor: '#2094F3',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 16,
                  opacity: !amount ? 0.6 : 1,
                }}
                onPress={handleSubmit}
                disabled={!amount}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                  Levantar {amount ? `${Number(amount).toLocaleString()} Kz` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {step === 'processing' && (
            <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color="#2094F3" />
              <Text style={{ color: '#6B7280' }}>A enviar solicitação...</Text>
            </View>
          )}

          {step === 'success' && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center', gap: 12 }}>
              <View style={{ backgroundColor: '#ECFDF5', padding: 16, borderRadius: 40 }}>
                <Text style={{ fontSize: 36 }}>✅</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Solicitação enviada!</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
                O administrador irá processar o seu levantamento. Será notificado quando for concluído.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: '#2094F3', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, alignSelf: 'stretch' }}
                onPress={handleClose}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Entendido</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const inputStyle = {
  backgroundColor: '#F9FAFB',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  paddingHorizontal: 12,
  paddingVertical: 12,
  fontSize: 14,
  color: '#111827',
  marginBottom: 14,
}
