import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { File } from 'expo-file-system'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/hooks/useAuth'
import { useAgent } from '../../src/hooks/useAgent'
import { useFlyerReward, useFlyerAtms, type FlyerAtm } from '../../src/hooks/useFlyerReward'
import { saveFlyerToLibrary, FLYER_ASSET_REQUIRE, FLYER_PHOTO_BUCKET, FLYER_LANDING_URL } from '../../src/lib/flyer'
import { supportWhatsAppUrl } from '../../src/lib/support'
import { AppCard } from '../../src/components/ui/AppCard'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { colors, radius } from '../../src/theme/tokens'

const FLYER_ASPECT = 1086 / 1448

function formatDistance(km: number | null): string {
  if (km == null) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export default function FlyerScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { stats } = useAgent()
  const { submission, settings, loading: settingsLoading, refetch: refetchSubmission } = useFlyerReward()
  const { atms, loading: atmsLoading } = useFlyerAtms(user?.id)

  const [downloaded, setDownloaded] = useState(false)
  const [savingFlyer, setSavingFlyer] = useState(false)
  const [selectedAtm, setSelectedAtm] = useState<FlyerAtm | null>(null)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (submission?.status === 'rejected') {
      setSelectedAtm(null)
      setPhotoUri(null)
      setCoords(null)
    }
  }, [submission])

  // A decisão do admin chega pelo painel web: refetch ao voltar ao ecrã.
  useFocusEffect(
    useCallback(() => {
      refetchSubmission()
    }, [refetchSubmission])
  )

  const handleSaveFlyer = async () => {
    if (savingFlyer) return
    setSavingFlyer(true)
    try {
      await saveFlyerToLibrary()
      setDownloaded(true)
    } catch {
      Alert.alert(
        'Não foi possível guardar',
        'Permite o acesso às fotos do telemóvel para guardar o flyer. Se já permitiste, verifica as definições.'
      )
    } finally {
      setSavingFlyer(false)
    }
  }

  async function getLocationSafe() {
    try {
      const { getCurrentPositionAsync, Accuracy } = await import('expo-location')
      const loc = await getCurrentPositionAsync({ accuracy: Accuracy.High })
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
    } catch (err) {
      console.warn('flyer getLocationSafe error:', err)
      return null
    }
  }

  async function ensureLocationPermission() {
    try {
      const { requestForegroundPermissionsAsync } = await import('expo-location')
      const { status } = await requestForegroundPermissionsAsync()
      return status === 'granted'
    } catch (err) {
      console.warn('flyer location permission error:', err)
      return false
    }
  }

  const capturePhoto = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission()
      if (!res.granted) {
        Alert.alert('Permissão da câmara', 'A câmara é necessária para fotografar o flyer junto ao ATM.')
        return
      }
    }
    // O bónus exige GPS no momento (gate de proximity no servidor): pedir antes
    // de gastar a foto.
    if (!(await ensureLocationPermission())) {
      Alert.alert(
        'Localização necessária',
        'O bónus do flyer exige a tua localização no momento da foto. Permite o acesso nas definições do telemóvel e tenta novamente.'
      )
      return
    }
    if (!cameraRef.current) return
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8 })
      if (pic?.uri) {
        setPhotoUri(pic.uri)
        setGeocoding(true)
        setGpsError(null)
        const loc = await getLocationSafe()
        if (loc) {
          setCoords({ lat: loc.latitude, lng: loc.longitude })
        } else {
          setGpsError('GPS não disponível. Permite a localização nas definições e tira a foto novamente.')
        }
        setGeocoding(false)
      }
    } catch (err) {
      console.warn('flyer takePictureAsync error:', err)
      Alert.alert('Erro na câmara', 'Não foi possível tirar a foto. Tente novamente.')
    }
  }

  const submit = async () => {
    if (!user || !photoUri || !coords || !selectedAtm) return
    setSubmitting(true)
    let uploadedPath: string | null = null
    try {
      const file = new File(photoUri)
      const arrayBuffer = await file.arrayBuffer()
      const path = `${user.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from(FLYER_PHOTO_BUCKET)
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw upErr
      uploadedPath = path

      const { error: rpcErr } = await supabase.rpc('create_flyer_submission', {
        p_atm_id: selectedAtm.id,
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_photo_url: path,
      })
      if (rpcErr) throw rpcErr

      setPhotoUri(null)
      setCoords(null)
      setSelectedAtm(null)
      Alert.alert(
        'Flyer submetido!',
        'A tua foto foi enviada para verificação. Assim que for aprovada, o bónus é creditado automaticamente.',
        [{ text: 'Entendido', onPress: () => router.back() }]
      )
    } catch (err) {
      // A foto já foi para o bucket: se o RPC recusou (distância, dedupe, ATM não
      // aprovado) fica órfã. Best-effort — requer a policy de DELETE no bucket.
      if (uploadedPath) {
        supabase.storage
          .from(FLYER_PHOTO_BUCKET)
          .remove([uploadedPath])
          .then(
            () => {},
            () => {}
          )
      }
      const e = err as { message?: string }
      Alert.alert('Erro ao submeter', e?.message || 'Não foi possível submeter a foto. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (settingsLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brand[500]} />
      </View>
    )
  }

  const { bonusKz, proximityM, viewsUnlock } = settings
  const totalViews = stats.totalViews
  const progress = Math.min(1, totalViews / viewsUnlock)
  const hasSubmission = submission != null && submission.status !== 'rejected'

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          marginBottom: 12,
        }}
      >
        <Image
          source={FLYER_ASSET_REQUIRE}
          style={{ width: '100%', aspectRatio: FLYER_ASPECT }}
          resizeMode="contain"
        />
      </View>

      <AppCard style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 4 }}>
          Ganha um bónus de {bonusKz} Kz
        </Text>
        <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 20 }}>
          Imprime e cola o nosso flyer junto a um ATM que te pertença e esteja aprovado. Recebes {bonusKz} Kz
          assim que o teu perfil atingir {viewsUnlock} views.
        </Text>
      </AppCard>

      {hasSubmission ? (
        <SubmissionStatus
          status={submission.status}
          amountKz={submission.amount_kz}
          reviewNotes={submission.review_notes}
          bonusKz={bonusKz}
          viewsUnlock={viewsUnlock}
          totalViews={totalViews}
          progress={progress}
          onBack={() => router.back()}
        />
      ) : (
        <>
          {submission?.status === 'rejected' && (
            <View
              style={{
                backgroundColor: '#FEE2E2',
                borderRadius: radius.md,
                padding: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <AppIcon name="alert-circle" size={18} color={colors.danger} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#B91C1C' }}>
                  O teu pedido anterior foi rejeitado
                </Text>
                {submission.review_notes ? (
                  <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                    Motivo: {submission.review_notes}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>Podes tentar de novo abaixo.</Text>
              </View>
            </View>
          )}

          <AppCard style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 10 }}>
              Como funciona
            </Text>
            {[
              `Guarda o flyer no telemóvel`,
              `Imprime (a cores) e cola junto ao ATM `,
              `Escolhe um dos teus ATMs aprovados`,
              `Tira a foto pelo app com GPS no momento (máx. ${proximityM} m)`,
              `Recebe ${bonusKz} Kz após ${viewsUnlock} views no teu perfil`,
            ].map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
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
          </AppCard>

          <AppCard style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>1 · Guarda o flyer</Text>
              {downloaded && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="checkmark-circle" size={15} color={colors.money} />
                  <Text style={{ fontSize: 12, color: colors.money, fontWeight: '600' }}>Guardado</Text>
                </View>
              )}
            </View>
            <AppButton
              label={downloaded ? 'Guardado na galeria ✓' : 'Guardar o flyer no telemóvel'}
              icon="download"
              fullWidth
              loading={savingFlyer}
              disabled={downloaded}
              variant={downloaded ? 'outline' : 'primary'}
              onPress={handleSaveFlyer}
            />
          </AppCard>

          <AppCard style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 6 }}>
              2 · Imprime e cola
            </Text>
            <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 20 }}>
              Imprime o flyer a cores e cola-o junto ao ATM escolhido (a máquina ou a montra próxima). O QR no
              flyer aponta para {FLYER_LANDING_URL}.
            </Text>
          </AppCard>

          <AppCard style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>3 · Escolhe o teu ATM</Text>
              {selectedAtm && (
                <AppIcon name="checkmark-circle" size={20} color={colors.money} />
              )}
            </View>

            {atmsLoading ? (
              <ActivityIndicator size="small" color={colors.brand[500]} />
            ) : atms.length === 0 ? (
              <EmptyState
                icon="business-outline"
                title="Sem ATMs aprovados"
                description="O bónus é aplicado a ATMs teus já aprovados. Submete e aprova um ATM primeiro."
                actionLabel="+ Submeter ATM"
                onAction={() => router.push('/agent/submit-atm')}
              />
            ) : (
              <View style={{ gap: 8 }}>
                {atms.map((atm) => {
                  const active = selectedAtm?.id === atm.id
                  return (
                    <TouchableOpacity
                      key={atm.id}
                      onPress={() => setSelectedAtm(atm)}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        borderWidth: 1,
                        borderColor: active ? colors.brand[400] : colors.border,
                        backgroundColor: active ? colors.brand[50] : colors.surface,
                        borderRadius: radius.sm,
                        padding: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: active ? colors.brand[500] : colors.brand[100],
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <AppIcon name="business" size={16} color={active ? '#fff' : colors.brand[600]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}
                          numberOfLines={1}
                        >
                          {atm.bank_name}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.text.tertiary }} numberOfLines={1}>
                          {[atm.cidade, atm.provincia].filter(Boolean).join(', ') || atm.address}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: colors.card,
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <AppIcon name="navigate" size={11} color={colors.brand[500]} />
                        <Text style={{ fontSize: 11, color: colors.text.secondary }}>{formatDistance(atm.distanceKm)}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </AppCard>

          <AppCard style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 10 }}>
              4 · Foto + GPS no momento
            </Text>

            {!selectedAtm ? (
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                Escolhe primeiro o ATM acima para desbloquear este passo.
              </Text>
            ) : photoUri ? (
              <>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: '100%', height: 150, borderRadius: radius.md, marginBottom: 12, backgroundColor: colors.border }}
                  resizeMode="cover"
                />
                {geocoding ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <ActivityIndicator size="small" color={colors.brand[500]} />
                    <Text style={{ fontSize: 13, color: colors.text.secondary }}>A capturar GPS...</Text>
                  </View>
                ) : gpsError ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, color: colors.danger, marginBottom: 6 }}>{gpsError}</Text>
                    <AppButton label="Tirar foto novamente" icon="camera" variant="secondary" onPress={capturePhoto} />
                  </View>
                ) : coords ? (
                  <>
                    <Text style={[fieldLabel, { color: colors.money }]}>
                      GPS capturado ✓ ({coords.lat.toFixed(6)}, {coords.lng.toFixed(6)})
                    </Text>
                    <Text style={[fieldLabel, { marginTop: 2 }]}>
                      Distância ao ATM: ~{selectedAtm.distanceKm != null ? formatDistance(selectedAtm.distanceKm) : '—'} (máx. {proximityM} m)
                    </Text>
                    <AppButton
                      label={`Submeter e receber ${bonusKz} Kz`}
                      icon="send"
                      fullWidth
                      haptic
                      loading={submitting}
                      onPress={submit}
                      style={{ marginTop: 10 }}
                    />
                  </>
                ) : null}
              </>
            ) : cameraPermission?.granted ? (
              <View style={{ height: 240, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.text.primary, marginBottom: 12 }}>
                <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, color: colors.text.secondary, marginBottom: 12 }}>
                  Permite o acesso à câmara para fotografar o flyer junto ao ATM.
                </Text>
                <AppButton label="Pedir permissão" icon="camera" onPress={() => requestCameraPermission()} />
              </View>
            )}

            {!photoUri && selectedAtm && cameraPermission?.granted && (
              <AppButton
                label="Tirar foto do flyer no ATM"
                icon="camera"
                iconRight="arrow-forward"
                fullWidth
                haptic
                onPress={capturePhoto}
              />
            )}
          </AppCard>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: 14,
            }}
          >
            <AppIcon name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={{ flex: 1, fontSize: 12, color: colors.text.secondary }}>
              Precisas de ajuda a imprimir ou colar? Fala connosco no WhatsApp.
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(supportWhatsAppUrl()).catch(() => {})}>
              <Text style={{ fontSize: 13, color: colors.brand[500], fontWeight: '600' }}>Apoio</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ProgressCard
        bonusKz={bonusKz}
        viewsUnlock={viewsUnlock}
        totalViews={totalViews}
        progress={progress}
        rewarded={submission?.status === 'rewarded'}
      />
    </ScrollView>
  )
}

function ProgressCard({
  bonusKz,
  viewsUnlock,
  totalViews,
  progress,
  rewarded,
}: {
  bonusKz: number
  viewsUnlock: number
  totalViews: number
  progress: number
  rewarded: boolean
}) {
  return (
    <AppCard>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 4 }}>
        {rewarded ? 'Bónus creditado' : 'Progresso do bónus'}
      </Text>
      <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 10 }}>
        {totalViews} de {viewsUnlock} views — {rewarded ? `` : `recebes ${bonusKz} Kz assim que atingires ${viewsUnlock}`}
      </Text>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            borderRadius: 4,
            backgroundColor: rewarded ? colors.money : colors.brand[500],
          }}
        />
      </View>
    </AppCard>
  )
}

function SubmissionStatus({
  status,
  amountKz,
  reviewNotes,
  bonusKz,
  viewsUnlock,
  totalViews,
  progress,
  onBack,
}: {
  status: string
  amountKz: number
  reviewNotes: string | null
  bonusKz: number
  viewsUnlock: number
  totalViews: number
  progress: number
  onBack: () => void
}) {
  const config =
    status === 'rewarded'
      ? {
          icon: 'checkmark-circle' as const,
          color: colors.money,
          title: 'Bónus creditado',
          text: `Recebeste ${amountKz} Kz no teu saldo. Obrigado por divulgares o ATM Connect.`,
        }
      : status === 'approved'
        ? {
            icon: 'checkmark-circle' as const,
            color: colors.money,
            title: 'Flyer aprovado',
            text: 'A tua foto foi aprovada. O bónus é creditado automaticamente assim que atingires as views necessárias.',
          }
        : {
            icon: 'hourglass-outline' as const,
            color: colors.warning,
            title: 'Pedido em análise',
            text: 'A equipa vai verificar a tua foto (flyer + ATM). Serás notificado assim que for aprovado.',
          }

  return (
    <>
      <AppCard style={{ marginBottom: 12 }}>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.brand[50],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <AppIcon name={config.icon} size={28} color={config.color} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 6 }}>
            {config.title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.text.secondary, textAlign: 'center', lineHeight: 20 }}>
            {config.text}
            {reviewNotes && status === 'approved' ? `\n${reviewNotes}` : ''}
          </Text>
          <AppButton label="Voltar ao painel" variant="ghost" onPress={onBack} style={{ marginTop: 14 }} />
        </View>
      </AppCard>

      <ProgressCard
        bonusKz={bonusKz}
        viewsUnlock={viewsUnlock}
        totalViews={totalViews}
        progress={progress}
        rewarded={status === 'rewarded'}
      />
    </>
  )
}

const fieldLabel = {
  fontSize: 12,
  color: colors.text.secondary,
  marginBottom: 6,
}