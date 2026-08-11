import { useState, useCallback, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Alert, ActivityIndicator, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../src/hooks/useAuth'
import { useViews } from '../../src/hooks/useViews'
import { supabase } from '../../src/lib/supabase'
import { formatPhone } from '../../src/lib/phone'
import { supportWhatsAppUrl } from '../../src/lib/support'
import { PROVINCIAS_ANGOLA } from '../../src/constants/provinces'
import { PremiumModal } from '../../src/components/premium/PremiumModal'
import { AppButton } from '../../src/components/ui/AppButton'
import { AppCard } from '../../src/components/ui/AppCard'
import { Badge } from '../../src/components/ui/Badge'
import { AppIcon, type AppIconName } from '../../src/components/ui/AppIcon'
import { colors, brandGradient } from '../../src/theme/tokens'

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
      Alert.alert('Perfil actualizado', 'As tuas informações foram guardadas.')
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

  const roleVariant =
    role === 'agent' ? 'success' :
    role === 'supervisor' ? 'brand' :
    role === 'admin' ? 'premium' :
    'neutral'

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 32 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.brand[50],
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          <AppIcon name="person" size={34} color={colors.brand[500]} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 8 }}>Inicia sessão</Text>
        <Text style={{ color: colors.text.secondary, textAlign: 'center', marginBottom: 18, lineHeight: 20 }}>
          Inicia sessão para ver o teu perfil, as tuas views e muito mais.
        </Text>
        <AppButton label="Entrar" onPress={() => router.push('/(auth)/login')} icon="log-in-outline" size="lg" />
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
      <LinearGradient
        colors={brandGradient as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 24, paddingBottom: 44, alignItems: 'center', paddingHorizontal: 16 }}
      >
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: 'rgba(255,255,255,0.22)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.5)',
          }}
        >
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff' }}>
            {profile?.nome?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={{ fontSize: 19, fontWeight: '700', color: '#fff' }}>{profile?.nome || 'Sem nome'}</Text>
        <View style={{ marginTop: 6 }}>
          <Badge variant={roleVariant} label={roleLabel} icon="shield-checkmark-outline" />
        </View>
        {profile?.provincia && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <AppIcon name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              {profile.provincia}{profile.cidade ? ` · ${profile.cidade}` : ''}
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={{ marginTop: -28, paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <AppCard style={{ flex: 1 }} raised>
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Estado</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
              <AppIcon name={isPremium ? 'diamond' : 'person'} size={15} color={isPremium ? colors.warning : '#9CA3AF'} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>
                {isPremium ? 'Premium' : 'Plano gratuito'}
              </Text>
            </View>
          </AppCard>
          <AppCard style={{ flex: 1 }} raised>
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Desbloqueios hoje</Text>
            {viewsLoading ? (
              <ActivityIndicator size="small" color={colors.brand[500]} style={{ marginTop: 8 }} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                <AppIcon name="eye" size={15} color={colors.brand[500]} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, fontVariant: ['tabular-nums'] }}>
                  {balance.isPremium ? 'Ilimitado' : `${balance.remaining} restante${balance.remaining !== 1 ? 's' : ''}`}
                </Text>
              </View>
            )}
          </AppCard>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <InfoCard icon="call-outline" label="Telefone" value={profile?.telefone ? formatPhone(profile.telefone) : '—'} />
          <InfoCard icon="business-outline" label="Província" value={profile?.provincia || '—'} />
        </View>
        <InfoCard icon="home-outline" label="Cidade" value={profile?.cidade || '—'} />

        {!editing && (
          <AppButton
            label="Editar perfil"
            onPress={() => setEditing(true)}
            fullWidth
            variant="secondary"
            icon="create-outline"
            haptic
          />
        )}

        {editing && (
          <AppCard style={{ marginBottom: 10 }} raised>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 12 }}>
              Editar perfil
            </Text>

            <Text style={editLabel}>Nome</Text>
            <TextInput
              style={inputStyle}
              value={nome}
              onChangeText={setNome}
              placeholder="Teu nome"
              placeholderTextColor={colors.text.tertiary}
              maxLength={100}
            />

            <Text style={editLabel}>Província</Text>
            <TouchableOpacity style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setProvinciaModal(true)}>
              <Text style={{ fontSize: 14, color: provincia ? colors.text.primary : colors.text.tertiary }}>
                {provincia || 'Selecionar...'}
              </Text>
              <AppIcon name="chevron-down" size={15} color={colors.text.tertiary} />
            </TouchableOpacity>

            <Text style={editLabel}>Cidade</Text>
            <TextInput
              style={inputStyle}
              value={cidade}
              onChangeText={setCidade}
              placeholder="Ex: Viana"
              placeholderTextColor={colors.text.tertiary}
              maxLength={80}
            />

            {isAgent && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary, marginTop: 12, marginBottom: 4 }}>
                  Dados Bancários (Levantamentos)
                </Text>
                <Text style={{ fontSize: 11, color: colors.text.tertiary, marginBottom: 8 }}>
                  Estes dados serão usados nas tuas solicitações de levantamento.
                </Text>
                <Text style={editLabel}>Titular da conta</Text>
                <TextInput
                  style={inputStyle}
                  value={ibanTitular}
                  onChangeText={setIbanTitular}
                  placeholder="Nome completo do titular"
                  placeholderTextColor={colors.text.tertiary}
                  maxLength={120}
                />
                <Text style={editLabel}>IBAN</Text>
                <TextInput
                  style={inputStyle}
                  value={iban}
                  onChangeText={setIban}
                  placeholder="AO06 ..."
                  placeholderTextColor={colors.text.tertiary}
                  maxLength={34}
                />
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <AppButton label="Cancelar" variant="outline" onPress={() => setEditing(false)} disabled={saving} style={{ flex: 1 }} />
              <AppButton label="Guardar" onPress={handleSave} loading={saving} style={{ flex: 1.4 }} icon="checkmark" haptic />
            </View>
          </AppCard>
        )}

        <AppCard padded={false} style={{ marginBottom: 10, overflow: 'hidden' }}>
          <SettingsRow icon="eye-outline" label="As minhas views" onPress={() => router.push('/my-views')} first />
          <SettingsRow icon="diamond-outline" label={isPremium ? 'Premium activo' : 'Upgrade Premium'} onPress={() => setPremiumVisible(true)} />
          <SettingsRow icon="trophy-outline" label="Ranking de Agentes" onPress={() => router.push('/ranking')} />
          <SettingsRow icon="link-outline" label="Referências" onPress={() => router.push('/referrals')} />
          <SettingsRow icon="logo-whatsapp" label="Apoio ao Cliente" onPress={() => Linking.openURL(supportWhatsAppUrl())} />

          <HelpRow isAgent={isAgent} />
        </AppCard>

        <AppButton
          label="Terminar sessão"
          variant="danger"
          onPress={handleSignOut}
          fullWidth
          icon="log-out-outline"
          haptic
        />
      </View>

      <Modal visible={provinciaModal} transparent animationType="slide" onRequestClose={() => setProvinciaModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
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
                    <Text style={{ fontSize: 15, color: active ? colors.brand[600] : '#374151', fontWeight: active ? '600' : '400' }}>
                      {p}
                    </Text>
                    {active && <AppIcon name="checkmark" size={16} color={colors.brand[500]} />}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <PremiumModal visible={premiumVisible} onClose={() => setPremiumVisible(false)} />
    </ScrollView>
  )
}

const editLabel = {
  fontSize: 12,
  color: colors.text.secondary,
  marginBottom: 6,
}

const inputStyle = {
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.text.primary,
  marginBottom: 12,
  justifyContent: 'center' as const,
}

function InfoCard({ icon, label, value }: { icon: AppIconName; label: string; value: string }) {
  return (
    <AppCard style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <AppIcon name={icon} size={13} color={colors.text.tertiary} />
        <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text.primary }} selectable numberOfLines={1}>
        {value}
      </Text>
    </AppCard>
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
  'Ganhas 0.15 Kz por cada view consumida num ATM teu.',
  'Ganhas 20% da primeira subscrição de quem usar o teu código de convite.',
  'Quando o saldo atingir 500 Kz, pede o levantamento no painel.',
  'Mantém os dados do ATM actualizados para receber boas avaliações.',
]

function SettingsRow({ icon, label, onPress, first }: { icon: AppIconName; label: string; onPress: () => void; first?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.brand[50],
          borderWidth: 1,
          borderColor: colors.brand[100],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={icon} size={17} color={colors.brand[500]} />
      </View>
      <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text.primary, flex: 1 }}>{label}</Text>
      <AppIcon name="chevron-forward" size={16} color={colors.text.tertiary} />
    </TouchableOpacity>
  )
}

function HelpRow({ isAgent }: { isAgent: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.brand[50],
            borderWidth: 1,
            borderColor: colors.brand[100],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name="book-outline" size={17} color={colors.brand[500]} />
        </View>
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: colors.text.primary, flex: 1 }}>Como usar o app</Text>
        <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.tertiary} />
      </TouchableOpacity>

      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.secondary, marginBottom: 8, textTransform: 'uppercase' }}>
            Para utilizadores
          </Text>
          {USER_STEPS.map((s) => (
            <View key={s} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: colors.brand[500], marginTop: 1 }}>•</Text>
              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19, flex: 1 }}>{s}</Text>
            </View>
          ))}

          {isAgent && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.secondary, marginTop: 12, marginBottom: 8, textTransform: 'uppercase' }}>
                Para agentes — como lucrar
              </Text>
              {AGENT_STEPS.map((s) => (
                <View key={s} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontSize: 13, color: colors.money, marginTop: 1 }}>•</Text>
                  <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19, flex: 1 }}>{s}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </>
  )
}
