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
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
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
                backgroundColor: step === s ? '#2094F3' : stepIndex > i ? '#93C5FD' : '#E5E7EB',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: step === s || stepIndex > i ? '#fff' : '#9CA3AF' }}>
                {i + 1}
              </Text>
            </View>
            {i < steps.length - 1 && <View style={{ flex: 1, height: 2, backgroundColor: stepIndex > i ? '#93C5FD' : '#E5E7EB' }} />}
          </View>
        ))}
      </View>

      {step === 'photo' && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
          <View style={{ height: 320, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111827', marginBottom: 16 }}>
            {cameraPermission?.granted ? (
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📷</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', textAlign: 'center' }}>
                  Permita o acesso à câmara
                </Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4, marginBottom: 12 }}>
                  A câmara é usada para fotografar o ATM e validar a localização.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24 }}
                  onPress={() => requestCameraPermission()}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Pedir permissão</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 6 }}>Fotografe o ATM</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>
            Tire uma foto clara do ATM para validar a localização.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#2094F3',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: cameraPermission?.granted ? 1 : 0.5,
            }}
            onPress={capturePhoto}
            disabled={!cameraPermission?.granted}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Tirar foto</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'gps' && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
          {photoUri && (
            <Image
              source={{ uri: photoUri }}
              style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 16, backgroundColor: '#F3F4F6' }}
              resizeMode="cover"
            />
          )}
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ fontSize: 32, marginBottom: 12 }}>📍</Text>
            {geocoding ? (
              <>
                <ActivityIndicator size="large" color="#2094F3" />
                <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 12 }}>A obter localização...</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>Localização não obtida</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
                  {permission === 'denied' ? 'Permita o acesso ao GPS nas definições do dispositivo.' : 'Tente novamente.'}
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: '#2094F3', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 }}
                  onPress={retryGps}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Tentar novamente</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {step === 'details' && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' }}>
          <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>Nome do ATM *</Text>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={setName}
            placeholder="Ex: ATM BAI Kilamba"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: -6, marginBottom: 12 }}>
            Use uma referência próxima conhecida.
          </Text>

          <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>Endereço *</Text>
          <TextInput
            style={inputStyle}
            value={address}
            onChangeText={setAddress}
            placeholder="Auto-preenchido a partir do GPS"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>Província</Text>
          <TouchableOpacity style={inputStyle} onPress={() => setProvinciaModal(true)}>
            <Text style={{ fontSize: 14, color: provincia ? '#111827' : '#9CA3AF' }}>
              {provincia || 'Selecionar...'}
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>Cidade</Text>
          <TextInput
            style={inputStyle}
            value={cidade}
            onChangeText={setCidade}
            placeholder="Ex: Viana"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6 }}>Coordenadas</Text>
          <TextInput
            style={[inputStyle, { fontFamily: 'monospace' }]}
            value={coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : ''}
            editable={false}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F9FAFB' }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Tem dinheiro?</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Estado actual do ATM</Text>
            </View>
            <Switch
              value={hasCash}
              onValueChange={setHasCash}
              trackColor={{ false: '#D1D5DB', true: '#34D399' }}
              thumbColor={hasCash ? '#10B981' : '#fff'}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F9FAFB' }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Tem papel?</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Para imprimir recibos</Text>
            </View>
            <Switch
              value={hasPaper}
              onValueChange={setHasPaper}
              trackColor={{ false: '#D1D5DB', true: '#34D399' }}
              thumbColor={hasPaper ? '#10B981' : '#fff'}
            />
          </View>

          <Text style={{ fontSize: 13, color: '#374151', fontWeight: '600', marginBottom: 6, marginTop: 8 }}>Observações</Text>
          <TextInput
            style={[inputStyle, { minHeight: 70, textAlignVertical: 'top' }]}
            value={obs}
            onChangeText={setObs}
            placeholder="Informações adicionais (opcional)"
            placeholderTextColor="#9CA3AF"
            multiline
          />

          <TouchableOpacity
            style={{
              backgroundColor: '#2094F3',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 8,
              opacity: submitting ? 0.7 : 1,
            }}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Submeter para aprovação</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={provinciaModal} transparent animationType="slide" onRequestClose={() => setProvinciaModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Selecionar Província</Text>
              <TouchableOpacity onPress={() => setProvinciaModal(false)}>
                <Text style={{ fontSize: 14, color: '#2094F3', fontWeight: '600' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {PROVINCIAS_ANGOLA.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F9FAFB',
                    backgroundColor: p === provincia ? '#EEF6FE' : 'transparent',
                  }}
                  onPress={() => { setProvincia(p); setProvinciaModal(false) }}
                >
                  <Text style={{ fontSize: 15, color: p === provincia ? '#2094F3' : '#374151', fontWeight: p === provincia ? '600' : '400' }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const inputStyle = {
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: '#111827',
  marginBottom: 12,
  justifyContent: 'center' as const,
}
