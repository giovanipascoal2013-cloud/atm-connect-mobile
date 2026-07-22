import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useRouter, Link } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'
import { PROVINCIAS_ANGOLA } from '../../src/constants/provinces'

export default function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [provincia, setProvincia] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleRegister = async () => {
    if (!email || !password || !nome || !telefone) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios')
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password, {
      nome,
      telefone,
      provincia,
      role: 'user',
    })
    setLoading(false)
    if (error) {
      Alert.alert('Erro no registo', error.message)
    } else {
      Alert.alert('Sucesso', 'Conta criada! Verifique o seu email para confirmar.')
      router.replace('/(auth)/login')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-8 py-12">
          <View className="items-center mb-8">
            <Text className="text-3xl font-bold text-brand-600">Criar Conta</Text>
            <Text className="text-base text-gray-500 mt-2">Junte-se ao ATM Connect</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Nome *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Seu nome"
                value={nome}
                onChangeText={setNome}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Telefone *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="9XX XXX XXX"
                value={telefone}
                onChangeText={setTelefone}
                keyboardType="phone-pad"
              />
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
              <Text className="text-sm font-medium text-gray-700 mb-1">Email *</Text>
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
              <Text className="text-sm font-medium text-gray-700 mb-1">Senha *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
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
