import React, { useState, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import type { ForumPost, ForumComment } from '../../hooks/useForum'
import { useForum } from '../../hooks/useForum'
import { useAuth } from '../../hooks/useAuth'
import { timeSince } from '../../lib/time'
import { AppIcon, type AppIconName } from '../ui/AppIcon'
import { colors } from '@/theme/tokens'

interface PostCardProps {
  post: ForumPost
  onCommentFocus?: (inputWindowY: number) => void
}

export function PostCard({ post, onCommentFocus }: PostCardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { fetchComments, addComment } = useForum(post.provincia)
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState<ForumComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const commentInputRef = useRef<TextInput>(null)

  const handleCommentFocus = useCallback(() => {
    if (!onCommentFocus) return
    requestAnimationFrame(() => {
      commentInputRef.current?.measureInWindow((_x, y, _w, _h) => {
        onCommentFocus(y)
      })
    })
  }, [onCommentFocus])

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

  const iconName: AppIconName = post.type === 'admin' ? 'megaphone' : post.type === 'system' ? 'sync' : 'chatbubble'
  const iconBg = post.type === 'admin' ? colors.brand[50] : post.type === 'system' ? colors.accent[50] : '#F1F3F5'
  const iconColor = post.type === 'admin' ? colors.brand[500] : post.type === 'system' ? colors.accent[500] : colors.text.secondary

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        borderCurve: 'continuous',
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <TouchableOpacity onPress={handleExpand} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: iconBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon name={iconName} size={18} color={iconColor} />
          </View>
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
                ref={commentInputRef}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 13,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Comentar..."
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={handleAddComment}
                onFocus={handleCommentFocus}
              />
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: commentText.trim() ? colors.brand[500] : '#E5E7EB',
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  justifyContent: 'center',
                }}
                onPress={handleAddComment}
                disabled={!commentText.trim()}
              >
                <AppIcon name="send" size={14} color={commentText.trim() ? '#fff' : '#9CA3AF'} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: commentText.trim() ? '#fff' : '#9CA3AF' }}>
                  Enviar
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!user && (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={{ backgroundColor: colors.brand[50], borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ fontSize: 13, color: colors.brand[600], fontWeight: '600' }}>
                Inicia sessão para comentar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}
