import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { resetPassword } = useAuth()
  const router = useRouter()

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Erro', 'Insira o seu email')
      return
    }
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      Alert.alert('Erro', error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-2xl font-bold text-brand-600 mb-4">Email enviado!</Text>
        <Text className="text-gray-500 text-center mb-8">
          Verifique a sua caixa de entrada e siga as instruções para redefinir a senha.
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="bg-brand-500 rounded-lg py-3 px-8">
            <Text className="text-white font-semibold">Voltar ao login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-2xl font-bold text-gray-800 mb-2">Recuperar senha</Text>
        <Text className="text-gray-500 mb-8">
          Insira o seu email e enviaremos instruções para redefinir a sua senha.
        </Text>

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

          <TouchableOpacity
            onPress={handleReset}
            disabled={loading}
            className="bg-brand-500 rounded-lg py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">
              {loading ? 'Enviando...' : 'Enviar instruções'}
            </Text>
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="items-center mt-6">
            <Text className="text-brand-600 text-sm">Voltar ao login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  )
}
