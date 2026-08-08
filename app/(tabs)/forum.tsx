import { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useForum } from '../../src/hooks/useForum'
import { PostCard } from '../../src/components/forum/PostCard'
import { ProvinceSelector } from '../../src/components/forum/ProvinceSelector'
import { useAuth } from '../../src/hooks/useAuth'
import { AppButton } from '../../src/components/ui/AppButton'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { AppIcon } from '../../src/components/ui/AppIcon'
import { colors } from '../../src/theme/tokens'

export default function ForumScreen() {
  const { user, profile, isAdmin } = useAuth()
  const router = useRouter()
  const [provincia, setProvincia] = useState(profile?.provincia || 'Luanda')
  const [provinciaTouched, setProvinciaTouched] = useState(false)
  const { posts, loading, refetch, createPost } = useForum(provincia)

  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)

  const listRef = useRef<ScrollView>(null)
  const scrollOffsetRef = useRef(0)

  const handleCommentFocus = useCallback((inputY: number) => {
    const scroller = listRef.current
    if (!scroller) return
    const measureInWindow = (scroller as unknown as {
      measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void
    }).measureInWindow
    requestAnimationFrame(() => {
      measureInWindow.call(scroller, (_x, sy, _w, _h) => {
        const contentY = scrollOffsetRef.current + (inputY - sy)
        const target = Math.max(0, contentY - 120)
        scroller.scrollTo({ y: target, animated: true })
      })
    })
  }, [])

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ProvinceSelector selected={provincia} onSelect={handleSelectProvince} />

      {!user || isAdmin ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          {!user ? (
            <View style={{ backgroundColor: colors.brand[50], borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, color: colors.brand[600], flex: 1 }}>
                Inicia sessão para comentar e criar posts
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={{ backgroundColor: colors.brand[500], borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 12 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Entrar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <AppButton
              label="Criar post"
              onPress={() => setShowCreate(true)}
              fullWidth
              icon="create-outline"
              haptic
            />
          )}
        </View>
      ) : null}

      <ScrollView
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y }}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.brand[500]} />}
      >
        {posts.length === 0 && !loading ? (
          <EmptyState
            icon="chatbubbles-outline"
            title={`Sê o primeiro a falar sobre ${provincia}`}
            description="Os posts expiram após 2 dias — partilha novidades enquanto são actuais."
          />
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onCommentFocus={handleCommentFocus} />
          ))
        )}
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <AppIcon name="create-outline" size={18} color={colors.brand[500]} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Criar post em {provincia}</Text>
              </View>
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
                <AppButton label="Cancelar" variant="outline" onPress={() => setShowCreate(false)} disabled={creating} style={{ flex: 1 }} />
                <AppButton
                  label="Publicar"
                  onPress={handleCreate}
                  loading={creating}
                  disabled={creating || !title.trim() || !message.trim()}
                  style={{ flex: 1.4 }}
                  icon="send"
                  haptic
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

const inputStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: colors.text.primary,
  marginBottom: 12,
}
