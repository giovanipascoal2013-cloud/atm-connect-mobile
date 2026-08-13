import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { subscribePostgresChanges } from '../lib/realtime-channel'
import { useAuth } from './useAuth'

export interface UseAdUnlocksResult {
  unlocks: Map<string, string> // atmId -> expiresAt (ISO string)
  hasValidUnlock: (atmId: string) => boolean
  createUnlock: (atmId: string) => Promise<boolean>
  loading: boolean
  refetch: () => Promise<void>
}

export function useAdUnlocks(): UseAdUnlocksResult {
  const { user } = useAuth()
  const [unlocks, setUnlocks] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  const fetchUnlocks = useCallback(async () => {
    if (!user) {
      setUnlocks(new Map())
      setLoading(false)
      return
    }

    try {
      const nowIso = new Date().toISOString()
      const { data, error } = await supabase
        .from('ad_unlocks')
        .select('atm_id, expires_at')
        .eq('user_id', user.id)
        .gt('expires_at', nowIso)

      if (error) {
        console.warn('Error fetching ad_unlocks:', error.message)
      } else if (data) {
        const nextMap = new Map<string, string>()
        data.forEach((row) => {
          nextMap.set(row.atm_id, row.expires_at)
        })
        setUnlocks(nextMap)
      }
    } catch (e) {
      console.warn('Failed to fetch ad_unlocks:', e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchUnlocks()
  }, [fetchUnlocks])

  // Realtime subscription (canal partilhado — evita colisões com várias instâncias)
  useEffect(() => {
    if (!user) return

    return subscribePostgresChanges({
      key: 'ad-unlocks-sync',
      table: 'ad_unlocks',
      event: '*',
      filter: `user_id=eq.${user.id}`,
      onChange: () => {
        void fetchUnlocks()
      },
    })
  }, [user, fetchUnlocks])

  const hasValidUnlock = useCallback(
    (atmId: string): boolean => {
      const expiresAt = unlocks.get(atmId)
      if (!expiresAt) return false
      return new Date(expiresAt).getTime() > Date.now()
    },
    [unlocks]
  )

  const createUnlock = useCallback(
    async (atmId: string): Promise<boolean> => {
      if (!user) return false

      try {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        const { error } = await supabase.from('ad_unlocks').upsert(
          {
            user_id: user.id,
            atm_id: atmId,
            expires_at: expiresAt,
          },
          { onConflict: 'user_id,atm_id' }
        )

        if (error) {
          console.error('Error creating ad_unlock:', error.message)
          return false
        }

        setUnlocks((prev) => {
          const next = new Map(prev)
          next.set(atmId, expiresAt)
          return next
        })
        return true
      } catch (e) {
        console.error('Failed to create ad_unlock:', e)
        return false
      }
    },
    [user]
  )

  return { unlocks, hasValidUnlock, createUnlock, loading, refetch: fetchUnlocks }
}
