import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      Alert.alert('Erro de login', error.message)
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
        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-12">
            <Text className="text-4xl font-bold text-brand-600">ATM Connect</Text>
            <Text className="text-base text-gray-500 mt-2">Localizador de ATMs</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Senha</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Sua senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-brand-500 rounded-lg py-4 items-center mt-2"
            >
              <Text className="text-white font-semibold text-base">
                {loading ? 'Entrando...' : 'Entrar'}
              </Text>
            </TouchableOpacity>

            <Link href="/(auth)/reset-password" asChild>
              <TouchableOpacity className="items-center mt-4">
                <Text className="text-brand-600 text-sm">Esqueceu a senha?</Text>
              </TouchableOpacity>
            </Link>
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
