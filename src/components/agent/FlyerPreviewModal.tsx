import { Modal, View, Text, ScrollView, Image, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { AppButton } from '../ui/AppButton'
import { AppIcon } from '../ui/AppIcon'
import { colors, radius } from '../../theme/tokens'
import { FLYER_LANDING_URL, FLYER_ASSET_REQUIRE } from '../../lib/flyer'
import type { FlyerSettings } from '../../hooks/useFlyerReward'

interface FlyerPreviewModalProps {
  visible: boolean
  onClose: () => void
  settings: FlyerSettings
}

export function FlyerPreviewModal({ visible, onClose, settings }: FlyerPreviewModalProps) {
  const router = useRouter()

  const handleStart = () => {
    onClose()
    router.push('/agent/flyer')
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            maxHeight: '92%',
          }}
        >
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>
              Bónus de {settings.bonusKz} Kz
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <AppIcon name="close" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
            <View
              style={{
                borderRadius: radius.md,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
                backgroundColor: colors.surface,
              }}
            >
              <Image
                source={FLYER_ASSET_REQUIRE}
                style={{ width: '100%', aspectRatio: 1086 / 1448 }}
                resizeMode="contain"
              />
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 8 }}>
              Como funciona
            </Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {[
                `Baixa o flyer e imprime-o.`,
                `Cola-o junto a um ATM que te pertença e esteja aprovado.`,
                `Fotografa pelo app — com GPS no momento (máx. ${settings.proximityM} m de distância).`,
                `Recebes ${settings.bonusKz} Kz assim que o teu perfil atingir ${settings.viewsUnlock} views.`,
              ].map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: colors.brand[50],
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brand[600] }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text.secondary, lineHeight: 19 }}>{step}</Text>
                </View>
              ))}
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: colors.accent[50],
                borderRadius: radius.sm,
                padding: 10,
                marginBottom: 16,
              }}
            >
              <AppIcon name="link" size={15} color={colors.money} />
              <Text style={{ flex: 1, fontSize: 12, color: colors.accent[800] }}>
                O QR no flyer aponta para {FLYER_LANDING_URL}
              </Text>
            </View>

            <AppButton label="Continuar" icon="arrow-forward" iconRight="arrow-forward" haptic onPress={handleStart} />
            <AppButton label="Para depois" variant="ghost" onPress={onClose} style={{ marginTop: 8 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}