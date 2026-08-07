import { useState, useCallback, useEffect } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native'
import { useRouter } from 'expo-router'
import { useForum } from '../../src/hooks/useForum'
import { PostCard } from '../../src/components/forum/PostCard'
import { ProvinceSelector } from '../../src/components/forum/ProvinceSelector'
import { useAuth } from '../../src/hooks/useAuth'

export default function ForumScreen() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [provincia, setProvincia] = useState(profile?.provincia || 'Luanda')
  const [provinciaTouched, setProvinciaTouched] = useState(false)
  const { posts, loading, refetch, createPost } = useForum(provincia)

  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (profile?.provincia && !provinciaTouched) {
      setProvincia(profile.provincia)
    }
  }, [profile?.provincia, provinciaTouched])

  const handleSelectProvince = useCallback((p: string) => {
    setProvinciaTouched(true)
    setProvincia(p)
  }, [])

  const handleCreate = useCallback(async () => {
    if (!title.trim() || !message.trim()) return
    setCreating(true)
    const errorMessage = await createPost(title.trim(), message.trim())
    setCreating(false)
    if (errorMessage) {
      Alert.alert('Erro ao publicar', errorMessage)
    } else {
      setTitle('')
      setMessage('')
      setShowCreate(false)
    }
  }, [title, message, createPost])

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ProvinceSelector selected={provincia} onSelect={handleSelectProvince} />

      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        {!user ? (
          <View style={{ backgroundColor: '#EEF6FE', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: '#1A7ED6', flex: 1 }}>
              Inicia sessão para comentar e criar posts
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={{ backgroundColor: '#2094F3', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Entrar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={{ backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>✏️ Criar post</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#2094F3" />}
      >
        {posts.length === 0 && !loading ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>💬</Text>
            <Text style={{ color: '#6B7280', textAlign: 'center' }}>
              Nenhum post em {provincia} nas últimas 48h
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>Criar post em {provincia}</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>As mensagens expiram após 2 dias</Text>

              <TextInput
                style={inputStyle}
                value={title}
                onChangeText={setTitle}
                placeholder="Título"
                placeholderTextColor="#9CA3AF"
                maxLength={120}
              />
              <TextInput
                style={[inputStyle, { height: 100, textAlignVertical: 'top' }]}
                value={message}
                onChangeText={setMessage}
                placeholder="Escreve a tua mensagem..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={500}
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
                  onPress={() => setShowCreate(false)}
                  disabled={creating}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#6B7280' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1.4, backgroundColor: '#2094F3', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                  onPress={handleCreate}
                  disabled={creating || !title.trim() || !message.trim()}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Publicar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>
    </View>
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
}
