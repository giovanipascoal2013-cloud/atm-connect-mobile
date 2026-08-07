import { useState, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'
import { useViews } from '../../src/hooks/useViews'
import { supabase } from '../../src/lib/supabase'
import { formatPhone } from '../../src/lib/phone'
import { PROVINCIAS_ANGOLA } from '../../src/constants/provinces'
import { PremiumModal } from '../../src/components/premium/PremiumModal'

export default function ProfileScreen() {
  const { user, profile, role, isPremium, isAgent, signOut, refreshProfile } = useAuth()
  const { balance, loading: viewsLoading } = useViews()
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [premiumVisible, setPremiumVisible] = useState(false)
  const [nome, setNome] = useState('')
  const [provincia, setProvincia] = useState('')
  const [cidade, setCidade] = useState('')
  const [iban, setIban] = useState('')
  const [ibanTitular, setIbanTitular] = useState('')
  const [provinciaModal, setProvinciaModal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '')
      setProvincia(profile.provincia || '')
      setCidade(profile.cidade || '')
      setIban(profile.iban || '')
      setIbanTitular(profile.iban_titular || '')
    }
  }, [profile])

  const handleSave = useCallback(async () => {
    if (!user) return
    setSaving(true)
    const updateData: {
      nome: string | null
      provincia: string | null
      cidade: string | null
      iban?: string | null
      iban_titular?: string | null
    } = {
      nome: nome.trim() || null,
      provincia: provincia || null,
      cidade: cidade.trim() || null,
    }
    if (isAgent) {
      updateData.iban = iban.trim() || null
      updateData.iban_titular = ibanTitular.trim() || null
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('user_id', user.id)

    setSaving(false)
    if (error) {
      Alert.alert('Erro ao guardar', error.message)
    } else {
      Alert.alert('Perfil actualizado', 'As suas informações foram guardadas.')
      setEditing(false)
      refreshProfile()
    }
  }, [user, isAgent, nome, provincia, cidade, iban, ibanTitular, refreshProfile])

  const handleSignOut = useCallback(async () => {
    await signOut()
    router.replace('/(tabs)/map')
  }, [signOut, router])

  const roleLabel =
    role === 'agent' ? 'Agente' :
    role === 'supervisor' ? 'Supervisor' :
    role === 'admin' ? 'Administrador' :
    'Utilizador'

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>Inicia sessão</Text>
        <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
          Inicia sessão para ver o teu perfil, as tuas views e muito mais.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={{ backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingHorizontal: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#2094F3' }}>
            {profile?.nome?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{profile?.nome || 'Sem nome'}</Text>
        <Text style={{ fontSize: 13, color: '#2094F3', marginTop: 2, fontWeight: '600' }}>{roleLabel}</Text>
        {profile?.provincia && (
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            {profile.provincia}{profile.cidade ? ` · ${profile.cidade}` : ''}
          </Text>
        )}
      </View>

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Estado</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isPremium ? '#F59E0B' : '#D1D5DB' }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                {isPremium ? 'Premium 👑' : 'Free'}
              </Text>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Views hoje</Text>
            {viewsLoading ? (
              <ActivityIndicator size="small" color="#2094F3" style={{ marginTop: 6 }} />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 4 }}>
                {balance.isPremium ? 'Ilimitado' : `${balance.remaining}/${balance.dailyLimit}`}
              </Text>
            )}
          </View>
        </View>

        <InfoRow label="Telefone" value={profile?.telefone ? formatPhone(profile.telefone) : '—'} />
        <InfoRow label="Província" value={profile?.provincia || '—'} />
        <InfoRow label="Cidade" value={profile?.cidade || '—'} />

        {!editing && (
          <TouchableOpacity
            style={{ backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 10 }}
            onPress={() => setEditing(true)}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Editar perfil</Text>
          </TouchableOpacity>
        )}

        {editing && (
          <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Editar perfil</Text>

            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Nome</Text>
            <TextInput
              style={inputStyle}
              value={nome}
              onChangeText={setNome}
              placeholder="Seu nome"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />

            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Província</Text>
            <TouchableOpacity style={inputStyle} onPress={() => setProvinciaModal(true)}>
              <Text style={{ fontSize: 14, color: provincia ? '#111827' : '#9CA3AF' }}>
                {provincia || 'Selecionar...'}
              </Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Cidade</Text>
            <TextInput
              style={inputStyle}
              value={cidade}
              onChangeText={setCidade}
              placeholder="Ex: Viana"
              placeholderTextColor="#9CA3AF"
              maxLength={80}
            />

            {isAgent && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 12, marginBottom: 4 }}>
                  Dados Bancários (Levantamentos)
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
                  Estes dados serão usados nas suas solicitações de levantamento.
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Titular da conta</Text>
                <TextInput
                  style={inputStyle}
                  value={ibanTitular}
                  onChangeText={setIbanTitular}
                  placeholder="Nome completo do titular"
                  placeholderTextColor="#9CA3AF"
                  maxLength={120}
                />
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>IBAN</Text>
                <TextInput
                  style={inputStyle}
                  value={iban}
                  onChangeText={setIban}
                  placeholder="AO06 ..."
                  placeholderTextColor="#9CA3AF"
                  maxLength={34}
                />
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
                onPress={() => setEditing(false)}
                disabled={saving}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1.4, backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <SectionLink icon="👁️" label="As minhas views" onPress={() => router.push('/my-views')} />
        <SectionLink icon="👑" label={isPremium ? 'Premium activo' : 'Upgrade Premium'} onPress={() => setPremiumVisible(true)} />
        <SectionLink icon="🏆" label="Ranking de Agentes" onPress={() => router.push('/ranking')} />
        <SectionLink icon="🔗" label="Referências" onPress={() => router.push('/referrals')} />

        <HelpSection isAgent={isAgent} />
      </View>

      <View style={{ padding: 16 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#FEF2F2',
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#FECACA',
          }}
          onPress={handleSignOut}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626' }}>Terminar sessão</Text>
        </TouchableOpacity>
      </View>

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

      <PremiumModal visible={premiumVisible} onClose={() => setPremiumVisible(false)} />
    </ScrollView>
  )
}

const inputStyle = {
  backgroundColor: '#fff',
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginTop: 2 }} selectable>{value}</Text>
    </View>
  )
}

const USER_STEPS = [
  'Encontra ATMs no mapa ou na lista ao lado.',
  'Os ATMs bloqueados 🔒 precisam de 1 view para mostrar o estado real.',
  'Compra views em "As minhas views" — cada view desbloqueia 1 ATM por 24h.',
  'Vê o estado: 💵 dinheiro, 🧾 papel, fila e status do ATM.',
  'Depois de desbloquear, avalia o agente com 👍 ou 👎.',
]

const AGENT_STEPS = [
  'Regista ATMs submetendo foto tirada no local (galeria não é aceite).',
  'O teu painel desbloqueia quando tiveres pelo menos 1 ATM aprovado.',
  'Ganhas 50 Kz por cada view consumida num ATM teu.',
  'Ganhas 20% da primeira subscrição de quem usar o teu código de convite.',
  'Quando o saldo atingir 500 Kz, pede o levantamento no painel.',
  'Mantém os dados do ATM actualizados para receber boas avaliações.',
]

function HelpSection({ isAgent }: { isAgent: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setOpen((v) => !v)}
      style={{
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F3F4F6',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18 }}>📘</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Como usar o app</Text>
        </View>
        <Text style={{ fontSize: 14, color: '#9CA3AF' }}>{open ? '▴' : '▾'}</Text>
      </View>

      {open && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>
            Para utilizadores
          </Text>
          {USER_STEPS.map((s) => (
            <View key={s} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: '#2094F3', marginTop: 1 }}>•</Text>
              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19, flex: 1 }}>{s}</Text>
            </View>
          ))}

          {isAgent && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 12, marginBottom: 8, textTransform: 'uppercase' }}>
                Para agentes — como lucrar
              </Text>
              {AGENT_STEPS.map((s) => (
                <View key={s} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: '#10B981', marginTop: 1 }}>•</Text>
                  <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19, flex: 1 }}>{s}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

function SectionLink({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 14, color: '#9CA3AF' }}>→</Text>
    </TouchableOpacity>
  )
}
