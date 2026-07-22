import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

interface ViewBalance {
  isPremium: boolean
  dailyUsed: number
  dailyLimit: number
  remaining: number
}

interface ConsumeResult {
  viewId: string
  expiresAt: string
  reused: boolean
}

export function useViews() {
  const { user, isPremium } = useAuth()
  const [balance, setBalance] = useState<ViewBalance>({
    isPremium: false,
    dailyUsed: 0,
    dailyLimit: 3,
    remaining: 3,
  })
  const [loading, setLoading] = useState(true)

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]

      if (isPremium) {
        setBalance({ isPremium: true, dailyUsed: 0, dailyLimit: Infinity, remaining: Infinity })
        setLoading(false)
        return
      }

      const [usageRes, limitRes] = await Promise.all([
        supabase
          .from('daily_view_usage')
          .select('view_count')
          .eq('user_id', user.id)
          .eq('view_date', today)
          .maybeSingle(),
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'daily_free_views_limit')
          .maybeSingle(),
      ])

      const dailyUsed = usageRes.data?.view_count ?? 0
      const dailyLimit = parseInt(limitRes.data?.value ?? '3', 10)

      setBalance({
        isPremium: false,
        dailyUsed,
        dailyLimit,
        remaining: Math.max(0, dailyLimit - dailyUsed),
      })
    } catch (err) {
      console.error('Error fetching view balance:', err)
    } finally {
      setLoading(false)
    }
  }, [user, isPremium])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  const consumeView = useCallback(async (atmId: string): Promise<ConsumeResult | null> => {
    if (!user || isPremium) {
      return { viewId: '', expiresAt: '', reused: true }
    }

    const { data, error } = await supabase.rpc('consume_atm_view', { _atm_id: atmId })

    if (error) {
      const msg = error.message || ''
      if (msg.includes('Daily view limit reached') || msg.includes('P0002')) {
        return null
      }
      console.error('Error consuming view:', error)
      return null
    }

    const result = data as { view_id: string; expires_at: string; reused: boolean }

    if (!result.reused) {
      setBalance((prev) => ({
        ...prev,
        dailyUsed: prev.dailyUsed + 1,
        remaining: Math.max(0, prev.remaining - 1),
      }))
    }

    return {
      viewId: result.view_id,
      expiresAt: result.expires_at,
      reused: result.reused,
    }
  }, [user, isPremium])

  return {
    balance,
    loading,
    consumeView,
    refetch: fetchBalance,
  }
}
