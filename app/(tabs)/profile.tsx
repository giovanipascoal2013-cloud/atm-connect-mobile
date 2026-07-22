import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../src/hooks/useAuth'

export default function ProfileScreen() {
  const { profile, isPremium, signOut } = useAuth()
  const router = useRouter()

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ alignItems: 'center', paddingTop: 48, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#10B981' }}>
            {profile?.nome?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{profile?.nome || 'Sem nome'}</Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{profile?.role || 'user'}</Text>
        {profile?.provincia && (
          <Text style={{ fontSize: 12, color: '#D1D5DB', marginTop: 4 }}>{profile.provincia}</Text>
        )}
      </View>

      <View style={{ padding: 16 }}>
        <InfoRow label="Email" value={profile?.user_id || '—'} />
        <InfoRow label="Telefone" value={profile?.telefone || '—'} />

        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Estado</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isPremium ? '#F59E0B' : '#D1D5DB' }} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
              {isPremium ? 'Premium 👑' : 'Free'}
            </Text>
          </View>
        </View>

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
          onPress={() => router.push('/ranking')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>🏆</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Ranking de Agentes</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#9CA3AF' }}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16, marginTop: 'auto' }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#FEF2F2',
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#FECACA',
          }}
          onPress={signOut}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#DC2626' }}>Terminar sessão</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginTop: 2 }}>{value}</Text>
    </View>
  )
}
