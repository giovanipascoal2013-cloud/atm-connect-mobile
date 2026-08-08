import { View, Text, TouchableOpacity, Linking, Platform } from 'react-native'
import { Link } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { HeaderBackButton } from '../../src/components/navigation/HeaderBackButton'
import { supportWhatsAppUrl } from '../../src/lib/support'
import { colors, brandGradient } from '../../src/theme/tokens'

export default function ResetPasswordScreen() {
  return (
    <View className="flex-1 bg-white">
      <LinearGradient
        colors={brandGradient as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingHorizontal: 24, paddingBottom: 32 }}
      >
        <HeaderBackButton fallback="/(tabs)/map" color="#fff" />
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.4 }}>
            Recuperar senha
          </Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
            Estamos aqui para ajudar
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
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.brand[50],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <AppIcon name="chatbubble-ellipses-outline" size={30} color={colors.brand[500]} />
          </View>
          <Text style={{ fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 }}>
            Para redefinir a tua senha, contacta o nosso suporte via WhatsApp. A nossa equipa irá ajudar o mais rápido possível.
          </Text>

          <View style={{ marginTop: 20, width: '100%' }}>
            <AppButton
              label="Contactar suporte via WhatsApp"
              onPress={() => Linking.openURL(supportWhatsAppUrl('Olá, preciso de ajuda para recuperar a senha da minha conta no ATM Connect.'))}
              fullWidth
              icon="logo-whatsapp"
              haptic
            />
          </View>
        </View>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="items-center mt-6">
            <Text className="text-brand-600 text-sm">Voltar ao login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  )
}
