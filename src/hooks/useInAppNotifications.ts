import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { subscribePostgresChanges } from '../lib/realtime-channel'
import { useAuth } from './useAuth'
import type { Database } from '../lib/supabase-types'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

export function useInAppNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error && data) {
      setNotifications(data as NotificationRow[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!user) return

    return subscribePostgresChanges({
      key: 'in-app-notifications',
      table: 'notifications',
      event: 'INSERT',
      filter: `user_id=eq.${user.id}`,
      onChange: () => {
        void fetchNotifications()
      },
    })
  }, [user, fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user?.id ?? '')
  }, [user?.id])

  const markAllRead = useCallback(async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id)
    if (ids.length === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', user?.id ?? '').in('id', ids)
  }, [notifications, user?.id])

  return { notifications, loading, unreadCount, markRead, markAllRead, refetch: fetchNotifications }
}