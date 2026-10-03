import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { subscribePostgresChanges } from '../lib/realtime-channel'
import { getDeviceId } from '../lib/device'
import { readAnonUnlocks, writeAnonUnlock } from '../lib/ad-unlocks-store'
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

  // Sem sessão os unlocks vivem no dispositivo (expo-secure-store) — não há
  // user_id para os consultar na BD. Com sessão a BD é autoritativa
  // (ad_unlocks) e sincroniza entre dispositivos via realtime.
  const fetchUnlocks = useCallback(async () => {
    if (!user) {
      setUnlocks(await readAnonUnlocks())
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
      if (user) {
        try {
          const { data, error } = await supabase.rpc('create_ad_unlock', {
            p_atm_id: atmId,
          })

          if (error || data !== true) {
            console.error('Error creating ad_unlock:', error?.message ?? 'RPC returned false')
            return false
          }

          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
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
      }

      // Anónimo: o servidor devolve o expires_at efectivo, por isso o
      // cliente não estima as 24 h (o TTL pode mudar no servidor).
      try {
        const deviceId = await getDeviceId()
        const { data, error } = await supabase.rpc('create_ad_unlock_anon', {
          p_device_id: deviceId,
          p_atm_id: atmId,
        })

        if (error || !data) {
          console.error('Error creating anon ad_unlock:', error?.message ?? 'RPC sem retorno')
          return false
        }

        const expiresAt = String(data)
        await writeAnonUnlock(atmId, expiresAt)
        setUnlocks((prev) => {
          const next = new Map(prev)
          next.set(atmId, expiresAt)
          return next
        })
        return true
      } catch (e) {
        console.error('Failed to create anon ad_unlock:', e)
        return false
      }
    },
    [user]
  )

  return { unlocks, hasValidUnlock, createUnlock, loading, refetch: fetchUnlocks }
}
