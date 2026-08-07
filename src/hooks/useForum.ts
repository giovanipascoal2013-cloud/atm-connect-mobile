import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface ForumPost {
  id: string
  provincia: string
  title: string
  message: string
  type: string
  reference_type: string | null
  reference_id: string | null
  created_by: string | null
  created_at: string
  author_name?: string
  comments?: ForumComment[]
  comment_count?: number
}

export interface ForumComment {
  id: string
  post_id: string
  user_id: string
  message: string
  created_at: string
  author_name?: string
}

export function useForum(provincia: string) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

      const { data: postsData } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('provincia', provincia)
        .gte('created_at', twoDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!postsData || postsData.length === 0) {
        setPosts([])
        setLoading(false)
        return
      }

      const authorIds = [...new Set(postsData.map((p) => p.created_by).filter(Boolean) as string[])]
      const { data: profiles } = authorIds.length > 0
        ? await supabase.from('profiles').select('user_id, nome').in('user_id', authorIds)
        : { data: [] }

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nome]))

      const postsWithAuthors = postsData.map((post) => ({
        ...post,
        author_name: profileMap.get(post.created_by!) || 'Anónimo',
      }))

      setPosts(postsWithAuthors as ForumPost[])
    } catch (err) {
      console.error('Error fetching forum posts:', err)
    } finally {
      setLoading(false)
    }
  }, [provincia])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const fetchComments = useCallback(async (postId: string): Promise<ForumComment[]> => {
    const { data: comments } = await supabase
      .from('forum_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50)

    if (!comments || comments.length === 0) return []

    const userIds = [...new Set(comments.map((c) => c.user_id))]
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('user_id, nome').in('user_id', userIds)
      : { data: [] }

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.nome]))

    return comments.map((c) => ({
      ...c,
      author_name: profileMap.get(c.user_id) || 'Anónimo',
    }))
  }, [])

  const addComment = useCallback(async (postId: string, message: string) => {
    if (!user) return
    const { error } = await supabase.from('forum_comments').insert({
      post_id: postId,
      user_id: user.id,
      message: message.trim(),
    })
    if (error) {
      console.error('Error adding comment:', error)
    }
  }, [user])

  const createPost = useCallback(async (title: string, message: string): Promise<string | null> => {
    if (!user) return null
    const { error } = await supabase.rpc('create_forum_post', {
      p_provincia: provincia,
      p_title: title,
      p_message: message,
      p_type: 'admin',
    })
    if (error) {
      console.error('Error creating post:', error)
      return error.message
    }
    await fetchPosts()
    return null
  }, [user, provincia, fetchPosts])

  return {
    posts,
    loading,
    refetch: fetchPosts,
    fetchComments,
    addComment,
    createPost,
  }
}
