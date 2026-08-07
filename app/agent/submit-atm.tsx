import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch, Modal, Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { File } from 'expo-file-system'
import { supabase } from '../../src/lib/supabase'
import { useAuth } from '../../src/hooks/useAuth'
import { useLocation } from '../../src/hooks/useLocation'
import { reverseGeocode } from '../../src/lib/geocode'
import { PROVINCIAS_ANGOLA } from '../../src/constants/provinces'
import { AppCard } from '../../src/components/ui/AppCard'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { colors, radius, typography } from '../../src/theme/tokens'

type Step = 'photo' | 'gps' | 'details'

export default function SubmitATMScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { permission, requestAgain } = useLocation()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)

  const [step, setStep] = useState<Step>('photo')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [provincia, setProvincia] = useState('')
  const [cidade, setCidade] = useState('')
  const [hasCash, setHasCash] = useState(true)
  const [hasPaper, setHasPaper] = useState(true)
  const [obs, setObs] = useState('')
  const [provinciaModal, setProvinciaModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const geocodingRef = useRef(false)

  useEffect(() => {
    if (step !== 'gps' || coords || geocodingRef.current) return
    geocodingRef.current = true
    setGeocoding(true)
    requestAgain()
      .then(async () => {
        const loc = await getLocationSafe()
        if (loc) {
          setCoords({ lat: loc.latitude, lng: loc.longitude })
          const { provincia: p, cidade: c, address: addr } = await reverseGeocode(loc.latitude, loc.longitude)
          if (addr) setAddress(addr)
          if (p) setProvincia(p)
          setCidade(c || '')
          setStep('details')
        }
      })
      .catch(() => {})
      .finally(() => {
        setGeocoding(false)
        geocodingRef.current = false
      })
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  async function getLocationSafe() {
    try {
      const { getCurrentPositionAsync } = await import('expo-location')
      const loc = await getCurrentPositionAsync({ accuracy: 1 })
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
    } catch (err) {
      console.warn('getLocationSafe error:', err)
      return null
    }
  }

  const capturePhoto = async () => {
    if (!cameraPermission?.granted) {
      const res = await requestCameraPermission()
      if (!res.granted) {
        Alert.alert('Permissão da câmara', 'A câmara é necessária para fotografar o ATM.')
        return
      }
    }
    if (!cameraRef.current) return
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.8 })
      if (pic?.uri) {
        setPhotoUri(pic.uri)
        setStep('gps')
      }
    } catch (err) {
      console.warn('takePictureAsync error:', err)
      Alert.alert('Erro na câmara', 'Não foi possível tirar a foto. Tente novamente.')
    }
  }

  const retryGps = async () => {
    geocodingRef.current = true
    setGeocoding(true)
    try {
      const loc = await getLocationSafe()
      if (loc) {
        setCoords({ lat: loc.latitude, lng: loc.longitude })
        const { provincia: p, cidade: c, address: addr } = await reverseGeocode(loc.latitude, loc.longitude)
        if (addr) setAddress(addr)
        if (p) setProvincia(p)
        setCidade(c || '')
        setStep('details')
      } else {
        Alert.alert('Localização não disponível', 'Verifique as permissões de GPS e tente novamente.')
      }
    } finally {
      setGeocoding(false)
      geocodingRef.current = false
    }
  }

  const submit = async () => {
    if (!user || !photoUri || !coords) return
    if (!name.trim() || !address.trim()) {
      Alert.alert('Preencha os dados', 'O nome e o endereço são obrigatórios.')
      return
    }
    setSubmitting(true)
    try {
      const file = new File(photoUri)
      const arrayBuffer = await file.arrayBuffer()
      const path = `${user.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from('atm-photos')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false })
      if (upErr) throw upErr

      const { data: atm, error: insErr } = await supabase
        .from('atms')
        .insert({
          bank_name: name.trim(),
          address: address.trim(),
          latitude: coords.lat,
          longitude: coords.lng,
          has_cash: hasCash,
          has_paper: hasPaper,
          cidade: cidade.trim() || null,
          provincia: provincia || null,
          obs: obs.trim() || null,
          status: 'Operacional',
          status_approval: 'pending',
          submitted_by: user.id,
          agent_id: user.id,
          photo_url: path,
        })
        .select('id')
        .maybeSingle()
      if (insErr) throw insErr

      await supabase
        .from('agent_onboarding_progress')
        .update({ first_atm_submitted: true, pending_atm_id: atm?.id })
        .eq('agent_id', user.id)

      await supabase.rpc('notify_users_by_role', {
        _role: 'admin',
        _title: 'Novo ATM para aprovar',
        _message: `Um agente submeteu o ATM "${name.trim()}". Reveja na fila de aprovações.`,
        _type: 'info',
      })
      await supabase.rpc('notify_users_by_role', {
        _role: 'supervisor',
        _title: 'Novo ATM para aprovar',
        _message: `Um agente submeteu o ATM "${name.trim()}". Reveja na fila de aprovações.`,
        _type: 'info',
      })

      Alert.alert(
        'ATM submetido!',
        `O seu ATM "${name.trim()}" foi enviado para aprovação. Será notificado quando for aprovado.`,
        [{ text: 'Entendido', onPress: () => router.back() }]
      )
    } catch (err) {
      const e = err as { message?: string }
      Alert.alert('Erro ao submeter', e?.message || 'Não foi possível submeter o ATM. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const steps: Step[] = ['photo', 'gps', 'details']
  const stepIndex = steps.indexOf(step)

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        {steps.map((s, i) => (
          <View key={s} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: step === s ? colors.brand[500] : stepIndex > i ? colors.brand[300] : '#E5E7EB',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: step === s || stepIndex > i ? '#fff' : colors.text.tertiary }}>
                {i + 1}
              </Text>
            </View>
            {i < steps.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: stepIndex > i ? colors.brand[300] : '#E5E7EB' }} />}
          </View>
        ))}
      </View>

      {step === 'photo' && (
        <AppCard>
          <View style={{ height: 320, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.text.primary, marginBottom: 16 }}>
            {cameraPermission?.granted ? (
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <AppIcon name="camera" size={30} color="#fff" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', textAlign: 'center' }}>
                  Permita o acesso à câmara
                </Text>
                <Text style={{ fontSize: 12, color: colors.text.tertiary, textAlign: 'center', marginTop: 4, marginBottom: 12 }}>
                  A câmara é usada para fotografar o ATM e validar a localização.
                </Text>
                <AppButton
                  label="Pedir permissão"
                  icon="camera"
                  onPress={() => requestCameraPermission()}
                />
              </View>
            )}
          </View>
          <Text style={[typography.heading, { marginBottom: 6 }]}>Fotografe o ATM</Text>
          <Text style={{ fontSize: 12, color: colors.text.secondary, marginBottom: 14 }}>
            Tire uma foto clara do ATM para validar a localização.
          </Text>
          <AppButton
            label="Tirar foto"
            icon="camera"
            iconRight="arrow-forward"
            fullWidth
            haptic
            disabled={!cameraPermission?.granted}
            onPress={capturePhoto}
          />
        </AppCard>
      )}

      {step === 'gps' && (
        <AppCard>
          {photoUri && (
            <Image
              source={{ uri: photoUri }}
              style={{ width: '100%', height: 160, borderRadius: radius.md, marginBottom: 16, backgroundColor: colors.border }}
              resizeMode="cover"
            />
          )}
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <AppIcon name="location" size={30} color={colors.brand[500]} />
            </View>
            {geocoding ? (
              <>
                <ActivityIndicator size="large" color={colors.brand[500]} />
                <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 12 }}>A obter localização...</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 6 }}>Localização não obtida</Text>
                <Text style={{ fontSize: 13, color: colors.text.secondary, textAlign: 'center', marginBottom: 16 }}>
                  {permission === 'denied' ? 'Permita o acesso ao GPS nas definições do dispositivo.' : 'Tente novamente.'}
                </Text>
                <AppButton
                  label="Tentar novamente"
                  icon="refresh"
                  haptic
                  onPress={retryGps}
                />
              </>
            )}
          </View>
        </AppCard>
      )}

      {step === 'details' && (
        <AppCard>
          <Text style={fieldLabel}>Nome do ATM *</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="Ex: ATM BAI Kilamba"
            placeholderTextColor={colors.text.tertiary}
          />
          <Text style={{ fontSize: 11, color: colors.text.tertiary, marginTop: -6, marginBottom: 12 }}>
            Use uma referência próxima conhecida.
          </Text>

          <Text style={fieldLabel}>Endereço *</Text>
          <TextInput
            style={inputStyle}
            value={address}
            onChangeText={setAddress}
            placeholder="Auto-preenchido a partir do GPS"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={fieldLabel}>Província</Text>
          <TouchableOpacity style={inputStyle} onPress={() => setProvinciaModal(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: provincia ? colors.text.primary : colors.text.tertiary }}>
                {provincia || 'Selecionar...'}
              </Text>
              <AppIcon name="chevron-down" size={16} color={colors.text.tertiary} />
            </View>
          </TouchableOpacity>

          <Text style={fieldLabel}>Cidade</Text>
          <TextInput
            style={inputStyle}
            value={cidade}
            onChangeText={setCidade}
            placeholder="Ex: Viana"
            placeholderTextColor={colors.text.tertiary}
          />

          <Text style={fieldLabel}>Coordenadas</Text>
          <TextInput
            style={[inputStyle, { fontFamily: 'monospace' }]}
            value={coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : ''}
            editable={false}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.surface }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>Tem dinheiro?</Text>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Estado actual do ATM</Text>
            </View>
            <Switch
              value={hasCash}
              onValueChange={setHasCash}
              trackColor={{ false: '#D1D5DB', true: colors.accent[400] }}
              thumbColor={hasCash ? colors.money : '#fff'}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.surface }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>Tem papel?</Text>
              <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Para imprimir recibos</Text>
            </View>
            <Switch
              value={hasPaper}
              onValueChange={setHasPaper}
              trackColor={{ false: '#D1D5DB', true: colors.accent[400] }}
              thumbColor={hasPaper ? colors.money : '#fff'}
            />
          </View>

          <Text style={[fieldLabel, { marginTop: 8 }]}>Observações</Text>
          <TextInput
            style={[inputStyle, { minHeight: 70, textAlignVertical: 'top' }]}
            value={obs}
            onChangeText={setObs}
            placeholder="Informações adicionais (opcional)"
            placeholderTextColor={colors.text.tertiary}
            multiline
          />

          <AppButton
            label="Submeter para aprovação"
            icon="send"
            fullWidth
            haptic
            loading={submitting}
            onPress={submit}
            style={{ marginTop: 8 }}
          />
        </AppCard>
      )}

      <Modal visible={provinciaModal} transparent animationType="slide" onRequestClose={() => setProvinciaModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '60%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>Selecionar Província</Text>
              <TouchableOpacity onPress={() => setProvinciaModal(false)}>
                <Text style={{ fontSize: 14, color: colors.brand[500], fontWeight: '600' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {PROVINCIAS_ANGOLA.map((p) => {
                const active = p === provincia
                return (
                  <TouchableOpacity
                    key={p}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.surface,
                      backgroundColor: active ? colors.brand[50] : 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => { setProvincia(p); setProvinciaModal(false) }}
                  >
                    <Text style={{ fontSize: 15, color: active ? colors.brand[600] : colors.text.primary, fontWeight: active ? '600' : '400' }}>
                      {p}
                    </Text>
                    {active && <AppIcon name="checkmark" size={18} color={colors.brand[600]} />}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const fieldLabel = {
  fontSize: 13,
  color: colors.text.primary,
  fontWeight: '600' as const,
  marginBottom: 6,
}

const inputStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.sm,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.text.primary,
  marginBottom: 12,
  justifyContent: 'center' as const,
}
