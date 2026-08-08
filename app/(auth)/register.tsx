import { useState, type ReactNode } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../src/hooks/useAuth'
import { supabase } from '../../src/lib/supabase'
import { PROVINCIAS_ANGOLA } from '../../src/constants/provinces'
import { AccountTypeSelector, type AccountType } from '../../src/components/auth/AccountTypeSelector'
import { formatPhone, isValidPhone, phoneToEmail } from '../../src/lib/phone'
import { friendlyAuthError } from '../../src/lib/errors'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'
import { setPendingAgentRedirect } from '../../src/lib/navigation-flag'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppIcon, type AppIconName } from '../../src/components/ui/AppIcon'
import { colors, brandGradient } from '../../src/theme/tokens'

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  maxLength,
  autoCapitalize,
  required,
  rightNode,
}: {
  label: string
  icon: AppIconName
  value: string
  onChangeText: (v: string) => void
  placeholder: string
  secureTextEntry?: boolean
  keyboardType?: 'phone-pad' | 'email-address'
  maxLength?: number
  autoCapitalize?: 'none' | 'characters'
  required?: boolean
  rightNode?: ReactNode
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1">
        {label} {required && <Text className="text-brand-600">*</Text>}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
        }}
      >
        <AppIcon name={icon} size={17} color={colors.text.tertiary} />
        <TextInput
          style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 15 }}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {rightNode}
      </View>
    </View>
  )
}

export default function RegisterScreen() {
  const [accountType, setAccountType] = useState<AccountType>('user')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [provincia, setProvincia] = useState('')
  const [cidade, setCidade] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [inviteCodeStatus, setInviteCodeStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [inviteCodeAgent, setInviteCodeAgent] = useState<string | null>(null)
  const [inviteCodeAgentId, setInviteCodeAgentId] = useState<string | null>(null)
  const { signUp } = useAuth()
  const router = useRouter()

  const validateInviteCode = async (code: string) => {
    const trimmed = (code || '').trim()
    if (!trimmed) {
      setInviteCodeStatus('idle')
      setInviteCodeAgent(null)
      setInviteCodeAgentId(null)
      return
    }
    setInviteCodeStatus('validating')
    try {
      const { data, error } = await supabase.rpc('validate_referral_code', { codigo: trimmed })
      if (error) throw error
      const result = (data ?? {}) as { valid?: boolean; agent_id?: string; agent_name?: string }
      if (result.valid && result.agent_id) {
        setInviteCodeStatus('valid')
        setInviteCodeAgent(result.agent_name || 'Agente')
        setInviteCodeAgentId(result.agent_id)
      } else {
        setInviteCodeStatus('invalid')
        setInviteCodeAgent(null)
        setInviteCodeAgentId(null)
      }
    } catch {
      setInviteCodeStatus('invalid')
      setInviteCodeAgent(null)
      setInviteCodeAgentId(null)
    }
  }

  const handleRegister = async () => {
    if (!nome.trim() || !telefone || !password) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios')
      return
    }
    if (!isValidPhone(telefone)) {
      Alert.alert('Erro', 'Número de telefone inválido (formato: 9XX XXX XXX)')
      return
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem')
      return
    }

    setLoading(true)
    const { error, session } = await signUp(phoneToEmail(telefone), password, {
      nome: nome.trim(),
      telefone: `+244${telefone.replace(/\D/g, '')}`,
      provincia: provincia || null,
      cidade: cidade.trim() || null,
      account_type: accountType,
      ...(inviteCodeStatus === 'valid' && inviteCodeAgentId ? { invited_by: inviteCodeAgentId } : {}),
    })
    setLoading(false)
    if (error) {
      if ((error.message || '').toLowerCase().includes('user already registered')) {
        Alert.alert(
          'Conta já registada',
          'Já existe uma conta com este número. Quer entrar?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir para login', onPress: () => router.replace({ pathname: '/(auth)/login', params: { telefone } }) },
          ]
        )
      } else {
        Alert.alert('Erro no registo', friendlyAuthError(error.message))
      }
    } else if (accountType === 'agent') {
      if (session) {
        setPendingAgentRedirect(true)
        router.replace('/agent/welcome')
      } else {
        Alert.alert(
          'Conta criada!',
          'Confirme o email na sua caixa de entrada e entre. Depois do login verá o onboarding de agente.'
        )
        router.replace('/(auth)/login')
      }
    } else {
      Alert.alert('Sucesso', 'Conta criada! Agora pode entrar.')
      router.replace('/(auth)/login')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={brandGradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingHorizontal: 24, paddingBottom: 32 }}
        >
          <HeaderBackButton fallback="/(tabs)/map" color="#fff" />
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.4 }}>
              Criar Conta
            </Text>
            <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
              Junte-se ao ATM Connect
            </Text>
          </View>
        </LinearGradient>

        <View style={{ marginTop: -22, paddingHorizontal: 24 }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              borderCurve: 'continuous',
              padding: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 20,
              elevation: 4,
              marginBottom: 24,
            }}
          >
            <AccountTypeSelector value={accountType} onChange={setAccountType} />

            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Código de convite <Text className="text-gray-400 font-normal">(opcional)</Text>
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                }}
              >
                <AppIcon name="gift-outline" size={17} color={colors.text.tertiary} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 15, textTransform: 'uppercase' }}
                  placeholder="Ex: ATM-X7K3"
                  placeholderTextColor={colors.text.tertiary}
                  value={inviteCode}
                  onChangeText={(v) => {
                    setInviteCode(v.toUpperCase())
                    setInviteCodeStatus('idle')
                    setInviteCodeAgent(null)
                    setInviteCodeAgentId(null)
                  }}
                  onBlur={() => validateInviteCode(inviteCode)}
                  maxLength={8}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                {inviteCodeStatus === 'validating' && <ActivityIndicator size="small" color={colors.brand[500]} />}
                {inviteCodeStatus === 'valid' && <AppIcon name="checkmark-circle" size={18} color={colors.money} />}
                {inviteCodeStatus === 'invalid' && <AppIcon name="close-circle" size={18} color={colors.danger} />}
              </View>
              {inviteCodeStatus === 'valid' && inviteCodeAgent && (
                <Text style={{ fontSize: 12, color: colors.accent[600], marginTop: 4 }}>
                  Convidado por: {inviteCodeAgent}
                </Text>
              )}
              {inviteCodeStatus === 'invalid' && inviteCode.length > 0 && (
                <Text style={{ fontSize: 12, color: colors.danger, marginTop: 4 }}>Código inválido</Text>
              )}
            </View>

            <View className="mt-4">
              <Field
                label="Nome"
                icon="person-outline"
                value={nome}
                onChangeText={setNome}
                placeholder="Seu nome"
                required
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Telefone <Text className="text-brand-600">*</Text>
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                }}
              >
                <AppIcon name="call-outline" size={17} color={colors.text.tertiary} />
                <Text style={{ color: colors.text.secondary, fontWeight: '600', marginLeft: 8 }}>+244</Text>
                <TextInput
                  style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 8, fontSize: 15 }}
                  placeholder="9XX XXX XXX"
                  placeholderTextColor={colors.text.tertiary}
                  value={telefone}
                  onChangeText={(v) => setTelefone(formatPhone(v))}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Província</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PROVINCIAS_ANGOLA.map((p) => {
                  const selected = provincia === p
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setProvincia(p)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        borderCurve: 'continuous',
                        backgroundColor: selected ? colors.brand[500] : '#fff',
                        borderWidth: 1,
                        borderColor: selected ? colors.brand[500] : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#fff' : '#374151' }}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            <View className="mt-4">
              <Field
                label="Cidade"
                icon="business-outline"
                value={cidade}
                onChangeText={setCidade}
                placeholder="Ex: Viana"
              />
            </View>

            <Field
              label="Senha"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              required
            />

            <Field
              label="Confirmar senha"
              icon="shield-checkmark-outline"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repita a senha"
              secureTextEntry
              required
            />

            <AppButton
              label={loading ? 'Criando conta...' : 'Criar Conta'}
              onPress={handleRegister}
              disabled={loading}
              loading={loading}
              fullWidth
              size="lg"
              icon="person-add-outline"
              haptic
            />
          </View>

          <View className="flex-row justify-center mb-10">
            <Text className="text-gray-500 text-sm">Já tem conta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-brand-600 text-sm font-semibold">Entrar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
