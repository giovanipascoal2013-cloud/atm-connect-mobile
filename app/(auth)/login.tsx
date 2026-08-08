import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Linking, Image } from 'react-native'
import { useRouter, Link, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../src/hooks/useAuth'
import { formatPhone, isValidPhone, phoneToEmail } from '../../src/lib/phone'
import { friendlyAuthError } from '../../src/lib/errors'
import { supportWhatsAppUrl } from '../../src/lib/support'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'
import { SegmentedControl } from '../../src/components/ui/SegmentedControl'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { colors, brandGradient } from '../../src/theme/tokens'

type LoginMethod = 'phone' | 'email'

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
          style={{ paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingHorizontal: 24, paddingBottom: 44 }}
        >
          <HeaderBackButton fallback="/(tabs)/map" color="#fff" />
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 46, height: 46, resizeMode: 'contain' }}
              />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.4 }}>
              ATM Connect
            </Text>
            <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>
              Localizador de ATMs em tempo real
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
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary, marginBottom: 16 }}>
              Bem-vindo de volta
            </Text>

            <SegmentedControl
              options={[
                { key: 'phone', label: 'Telefone' },
                { key: 'email', label: 'Email' },
              ]}
              value={method}
              onChange={setMethod}
              style={{ marginBottom: 16 }}
            />

            {method === 'phone' ? (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Número de telefone</Text>
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
            ) : (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
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
                  <AppIcon name="mail-outline" size={17} color={colors.text.tertiary} />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 15 }}
                    placeholder="seu@email.com"
                    placeholderTextColor={colors.text.tertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>
            )}

            <View className="mb-2">
              <Text className="text-sm font-medium text-gray-700 mb-1">Senha</Text>
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
                <AppIcon name="lock-closed-outline" size={17} color={colors.text.tertiary} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 15 }}
                  placeholder="Sua senha"
                  placeholderTextColor={colors.text.tertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={() => Linking.openURL(supportWhatsAppUrl('Olá, preciso de ajuda para recuperar a senha da minha conta no ATM Connect.'))}
              className="items-center mt-1 mb-4"
            >
              <Text style={{ color: colors.brand[500], fontSize: 14 }}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <AppButton
              label={loading ? 'Entrando...' : 'Entrar'}
              onPress={handleLogin}
              disabled={loading}
              loading={loading}
              fullWidth
              size="lg"
              icon="log-in-outline"
              haptic
            />
          </View>

          <View className="flex-row justify-center mt-6 mb-10">
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
