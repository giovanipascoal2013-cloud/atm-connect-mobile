import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase-types'
import { haversineDistance } from '../lib/distance'

type ATM = Database['public']['Tables']['atms']['Row']

export type ATMWithDistance = ATM & { distance?: number }

export type ATMStatus = 'cash' | 'no_cash' | 'offline' | 'locked'

export type SortMode = 'proximity' | 'alphabetic'

export function getATMStatus(atm: ATM): ATMStatus {
  if (atm.status === 'Fora de Serviço') return 'offline'
  if (!atm.has_cash) return 'no_cash'
  return 'cash'
}

export function getATMColor(status: ATMStatus): string {
  switch (status) {
    case 'cash': return '#34A853'
    case 'no_cash': return '#EA4335'
    case 'offline': return '#7F8C8D'
    case 'locked': return '#4285F4'
  }
}

export function getATMStatusLabel(status: ATMStatus): string {
  switch (status) {
    case 'cash': return 'Com Dinheiro'
    case 'no_cash': return 'Sem Dinheiro'
    case 'offline': return 'Fora de Serviço'
    case 'locked': return 'Bloqueado'
  }
}

interface UseATMsOptions {
  search?: string
  status?: ATMStatus | 'all'
  city?: string
  sortMode?: SortMode
  userLocation?: { latitude: number; longitude: number } | null
}

export function useATMs(options: UseATMsOptions = {}) {
  const { userLocation } = options
  const [atms, setAtms] = useState<ATMWithDistance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchATMs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('atms')
        .select('*')
        .eq('status_approval', 'approved')
        .is('deleted_at', null)
        .order('bank_name')

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      let result = (data || []) as ATMWithDistance[]

      if (userLocation) {
        result = result.map((atm) => ({
          ...atm,
          distance: haversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            atm.latitude,
            atm.longitude
          ),
        }))
      }

      setAtms(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [userLocation])

  useEffect(() => {
    fetchATMs()
  }, [fetchATMs])

  const cities = useMemo(
    () => Array.from(new Set(atms.map((a) => a.cidade).filter(Boolean) as string[])).sort(),
    [atms]
  )

  const filtered = useMemo(() => {
    let result = atms.filter((atm) => {
      if (options.search) {
        const q = options.search.toLowerCase()
        const match =
          atm.bank_name.toLowerCase().includes(q) ||
          atm.address.toLowerCase().includes(q) ||
          (atm.cidade && atm.cidade.toLowerCase().includes(q)) ||
          (atm.provincia && atm.provincia.toLowerCase().includes(q))
        if (!match) return false
      }
      if (options.city && options.city !== 'all') {
        if (atm.cidade !== options.city) return false
      }
      if (options.status && options.status !== 'all') {
        if (getATMStatus(atm) !== options.status) return false
      }
      return true
    })

    if (options.sortMode === 'alphabetic') {
      result = [...result].sort((a, b) => {
        const nameCmp = a.bank_name.localeCompare(b.bank_name)
        if (nameCmp !== 0) return nameCmp
        return (a.cidade || '').localeCompare(b.cidade || '')
      })
    } else if (options.sortMode === 'proximity' && userLocation) {
      result = [...result].sort((a, b) => (a.distance || 0) - (b.distance || 0))
    }

    return result
  }, [atms, options.search, options.city, options.status, options.sortMode, userLocation])

  return {
    atms: filtered,
    allAtms: atms,
    cities,
    loading,
    error,
    refetch: fetchATMs,
  }
}
