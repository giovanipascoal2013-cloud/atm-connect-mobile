import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import type { ForumPost, ForumComment } from '../../hooks/useForum'
import { useForum } from '../../hooks/useForum'
import { useAuth } from '../../hooks/useAuth'
import { timeSince } from '../../lib/time'

interface PostCardProps {
  post: ForumPost
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { fetchComments, addComment } = useForum(post.provincia)
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState<ForumComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)

  const handleExpand = useCallback(async () => {
    if (!expanded) {
      setLoadingComments(true)
      const cmts = await fetchComments(post.id)
      setComments(cmts)
      setLoadingComments(false)
    }
    setExpanded(!expanded)
  }, [expanded, fetchComments, post.id])

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return
    await addComment(post.id, commentText)
    setCommentText('')
    const cmts = await fetchComments(post.id)
    setComments(cmts)
  }, [commentText, addComment, fetchComments, post.id])

  const icon = post.type === 'admin' ? '📢' : post.type === 'system' ? '🔄' : '💬'

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <TouchableOpacity onPress={handleExpand} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }} numberOfLines={expanded ? undefined : 2}>
              {post.title}
            </Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }} numberOfLines={expanded ? undefined : 3}>
              {post.message}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{post.author_name}</Text>
              <Text style={{ fontSize: 12, color: '#D1D5DB' }}>·</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{timeSince(post.created_at)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
          {loadingComments ? (
            <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 }}>
              A carregar comentários...
            </Text>
          ) : comments.length === 0 ? (
            <Text style={{ fontSize: 13, color: '#D1D5DB', textAlign: 'center', paddingVertical: 8 }}>
              Sem comentários ainda
            </Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280' }}>
                    {(c.author_name || 'A')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>{c.author_name}</Text>
                    <Text style={{ fontSize: 11, color: '#D1D5DB' }}>·</Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{timeSince(c.created_at)}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{c.message}</Text>
                </View>
              </View>
            ))
          )}

          {user && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#F9FAFB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 13,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Comentar..."
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={handleAddComment}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: commentText.trim() ? '#2094F3' : '#E5E7EB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  justifyContent: 'center',
                }}
                onPress={handleAddComment}
                disabled={!commentText.trim()}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: commentText.trim() ? '#fff' : '#9CA3AF' }}>
                  Enviar
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!user && (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={{ backgroundColor: '#EEF6FE', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ fontSize: 13, color: '#1A7ED6', fontWeight: '600' }}>
                Inicia sessão para comentar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}
