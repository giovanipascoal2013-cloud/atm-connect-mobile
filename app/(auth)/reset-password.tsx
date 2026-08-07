import { View, Text, TouchableOpacity, Linking } from 'react-native'
import { Link } from 'expo-router'

const SUPPORT_WHATSAPP = 'https://wa.me/244933986318?text=' + encodeURIComponent(
  'Olá, preciso de ajuda para recuperar a senha da minha conta no ATM Connect.'
)

export default function ResetPasswordScreen() {
  return (
    <View className="flex-1 justify-center bg-white px-8">
      <Text className="text-2xl font-bold text-brand-600 mb-2">Recuperar senha</Text>
      <Text className="text-gray-500 mb-8">
        Para redefinir a sua senha, contacte o nosso suporte via WhatsApp. A nossa equipa irá ajudar o mais rápido possível.
      </Text>

      <TouchableOpacity
        onPress={() => Linking.openURL(SUPPORT_WHATSAPP)}
        className="bg-brand-500 rounded-lg py-4 items-center"
      >
        <Text className="text-white font-semibold text-base">Contactar suporte via WhatsApp</Text>
      </TouchableOpacity>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity className="items-center mt-6">
          <Text className="text-brand-600 text-sm">Voltar ao login</Text>
        </TouchableOpacity>
      </Link>
    </View>
  )
}
