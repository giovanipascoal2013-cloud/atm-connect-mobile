import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'
import { supabase } from '../../src/lib/supabase'
import { PROVINCIAS_ANGOLA } from '../../src/constants/provinces'
import { AccountTypeSelector, type AccountType } from '../../src/components/auth/AccountTypeSelector'
import { formatPhone, isValidPhone, phoneToEmail } from '../../src/lib/phone'
import { friendlyAuthError } from '../../src/lib/errors'

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

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/map')
  }

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
        router.replace('/agent/onboarding')
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
        <TouchableOpacity
          onPress={goBack}
          className="absolute top-12 left-4 z-10 p-2"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-2xl text-brand-600">←</Text>
        </TouchableOpacity>
        <View className="flex-1 justify-center px-8 py-12">
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-brand-600">Criar Conta</Text>
            <Text className="text-base text-gray-500 mt-2">Junte-se ao ATM Connect</Text>
          </View>

          <View className="space-y-4">
            <AccountTypeSelector value={accountType} onChange={setAccountType} />

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Código de convite <Text className="text-gray-400 font-normal">(opcional)</Text>
              </Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-4">
                <TextInput
                  className="flex-1 py-3 text-base uppercase"
                  placeholder="Ex: ATM-X7K3"
                  placeholderTextColor="#9CA3AF"
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
                {inviteCodeStatus === 'validating' && <ActivityIndicator size="small" color="#2094F3" />}
                {inviteCodeStatus === 'valid' && <Text style={{ fontSize: 16, color: '#10B981', fontWeight: '700' }}>✓</Text>}
                {inviteCodeStatus === 'invalid' && <Text style={{ fontSize: 16, color: '#EF4444', fontWeight: '700' }}>✕</Text>}
              </View>
              {inviteCodeStatus === 'valid' && inviteCodeAgent && (
                <Text className="text-xs text-green-600 mt-1">Convidado por: {inviteCodeAgent}</Text>
              )}
              {inviteCodeStatus === 'invalid' && inviteCode.length > 0 && (
                <Text className="text-xs text-red-500 mt-1">Código inválido</Text>
              )}
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Nome *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Seu nome"
                placeholderTextColor="#9CA3AF"
                value={nome}
                onChangeText={setNome}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Telefone *</Text>
              <View className="flex-row items-center border border-gray-300 rounded-lg px-4">
                <Text className="text-gray-500 font-medium">+244</Text>
                <TextInput
                  className="flex-1 px-2 py-3 text-base"
                  placeholder="9XX XXX XXX"
                  placeholderTextColor="#9CA3AF"
                  value={telefone}
                  onChangeText={(v) => setTelefone(formatPhone(v))}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Província</Text>
              <View className="border border-gray-300 rounded-lg overflow-hidden">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {PROVINCIAS_ANGOLA.map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setProvincia(p)}
                      className={`px-4 py-3 ${provincia === p ? 'bg-brand-500' : 'bg-white'}`}
                    >
                      <Text className={`text-sm ${provincia === p ? 'text-white font-semibold' : 'text-gray-700'}`}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Cidade</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Ex: Viana"
                placeholderTextColor="#9CA3AF"
                value={cidade}
                onChangeText={setCidade}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Senha *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Confirmar senha *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Repita a senha"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              className="bg-brand-500 rounded-lg py-4 items-center mt-2"
            >
              <Text className="text-white font-semibold text-base">
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8">
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
