import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase-types'
import { haversineDistance } from '../lib/distance'

type ATM = Database['public']['Tables']['atms']['Row']

export type ATMWithDistance = ATM & { distance?: number }

export type ATMStatus = 'cash' | 'no_cash' | 'offline' | 'locked'

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

interface UseATMsOptions {
  search?: string
  bank?: string
  status?: ATMStatus | 'all'
  userLocation?: { latitude: number; longitude: number } | null
}

export function useATMs(options: UseATMsOptions = {}) {
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

      if (options.userLocation) {
        result = result.map((atm) => ({
          ...atm,
          distance: haversineDistance(
            options.userLocation!.latitude,
            options.userLocation!.longitude,
            atm.latitude,
            atm.longitude
          ),
        }))
        result.sort((a, b) => (a.distance || 0) - (b.distance || 0))
      }

      setAtms(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchATMs()
  }, [fetchATMs])

  const filtered = atms.filter((atm) => {
    if (options.search) {
      const q = options.search.toLowerCase()
      const match =
        atm.bank_name.toLowerCase().includes(q) ||
        atm.address.toLowerCase().includes(q) ||
        (atm.cidade && atm.cidade.toLowerCase().includes(q)) ||
        (atm.provincia && atm.provincia.toLowerCase().includes(q))
      if (!match) return false
    }
    if (options.bank && options.bank !== 'all') {
      if (atm.bank_name !== options.bank) return false
    }
    if (options.status && options.status !== 'all') {
      if (getATMStatus(atm) !== options.status) return false
    }
    return true
  })

  return { atms: filtered, allAtms: atms, loading, error, refetch: fetchATMs }
}
