import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native'
import { useRouter, Link, useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'
import { formatPhone, isValidPhone, phoneToEmail } from '../../src/lib/phone'
import { friendlyAuthError } from '../../src/lib/errors'

type LoginMethod = 'phone' | 'email'

const SUPPORT_WHATSAPP = 'https://wa.me/244933986318?text=' + encodeURIComponent(
  'Olá, preciso de ajuda para recuperar a senha da minha conta no ATM Connect.'
)

export default function LoginScreen() {
  const [method, setMethod] = useState<LoginMethod>('phone')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ telefone?: string }>()

  useEffect(() => {
    if (params.telefone) {
      setTelefone(formatPhone(params.telefone))
      setMethod('phone')
    }
  }, [params.telefone])

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(tabs)/map')
  }

  const handleLogin = async () => {
    if (method === 'phone') {
      if (!isValidPhone(telefone)) {
        Alert.alert('Erro', 'Número de telefone inválido (formato: 9XX XXX XXX)')
        return
      }
    } else if (!email.trim()) {
      Alert.alert('Erro', 'Insira o seu email')
      return
    }
    if (!password) {
      Alert.alert('Erro', 'Insira a sua senha')
      return
    }

    const authEmail = method === 'phone' ? phoneToEmail(telefone) : email.trim()

    setLoading(true)
    const { error } = await signIn(authEmail, password)
    setLoading(false)
    if (error) {
      Alert.alert('Erro de login', friendlyAuthError(error.message))
    } else {
      router.replace('/(tabs)/map')
    }
  }

  const methodButton = (m: LoginMethod, label: string) => (
    <TouchableOpacity
      onPress={() => setMethod(m)}
      className={`flex-1 py-2.5 rounded-lg ${method === m ? 'bg-brand-500' : 'bg-gray-100'}`}
    >
      <Text className={`text-sm font-medium text-center ${method === m ? 'text-white' : 'text-gray-500'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  )

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
        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-12">
            <Text className="text-4xl font-bold text-brand-600">ATM Connect</Text>
            <Text className="text-base text-gray-500 mt-2">Localizador de ATMs</Text>
          </View>

          <View className="space-y-4">
            <View className="flex-row rounded-lg overflow-hidden mb-1">
              {methodButton('phone', 'Telefone')}
              {methodButton('email', 'Email')}
            </View>

            {method === 'phone' ? (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Número de telefone</Text>
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
            ) : (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                  placeholder="seu@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            )}

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Senha</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Sua senha"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              onPress={() => Linking.openURL(SUPPORT_WHATSAPP)}
              className="items-center mt-1"
            >
              <Text className="text-brand-600 text-sm">Esqueceu a senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-brand-500 rounded-lg py-4 items-center mt-2"
            >
              <Text className="text-white font-semibold text-base">
                {loading ? 'Entrando...' : 'Entrar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-gray-500 text-sm">Não tem conta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-brand-600 text-sm font-semibold">Criar conta</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
