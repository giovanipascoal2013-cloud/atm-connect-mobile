import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { ATMWithDistance } from './useATMs'

export function useFavorites() {
  const { user } = useAuth()
  const [favoriteAtms, setFavoriteAtms] = useState<ATMWithDistance[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteAtms([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('atm_favorites')
      .select('atm_id, atms(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const atms = data
        .map((row) => row.atms as unknown as ATMWithDistance)
        .filter((a): a is ATMWithDistance => !!a && (a as any).status_approval === 'approved' && !(a as any).deleted_at)
      setFavoriteAtms(atms)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const isFavorite = useCallback(
    (atmId: string) => favoriteAtms.some((a) => a.id === atmId),
    [favoriteAtms]
  )

  const toggleFavorite = useCallback(
    async (atmId: string) => {
      if (!user) return false
      const exists = favoriteAtms.some((a) => a.id === atmId)
      setFavoriteAtms((prev) =>
        exists ? prev.filter((a) => a.id !== atmId) : [...prev, { id: atmId } as ATMWithDistance]
      )

      if (exists) {
        const { error } = await supabase.from('atm_favorites').delete().eq('user_id', user.id).eq('atm_id', atmId)
        if (error) {
          await fetchFavorites()
          return false
        }
      } else {
        const { error } = await supabase.from('atm_favorites').insert({ user_id: user.id, atm_id: atmId })
        if (error) {
          await fetchFavorites()
          return false
        }
      }
      return true
    },
    [user, favoriteAtms, fetchFavorites]
  )

  return { favoriteAtms, loading, isFavorite, toggleFavorite, refetch: fetchFavorites }
}