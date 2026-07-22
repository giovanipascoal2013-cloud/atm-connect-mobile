import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface PendingATM {
  id: string
  bank_name: string
  address: string
  latitude: number
  longitude: number
  has_cash: boolean
  has_paper: boolean | null
  obs: string | null
  photo_url: string | null
  submitted_by: string | null
  created_at: string
}

export interface SupervisorStats {
  totalATMs: number
  pendingATMs: number
  totalAgents: number
}

export function useSupervisor() {
  const { user, isSupervisor } = useAuth()
  const [pendingATMs, setPendingATMs] = useState<PendingATM[]>([])
  const [stats, setStats] = useState<SupervisorStats>({ totalATMs: 0, pendingATMs: 0, totalAgents: 0 })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user || !isSupervisor) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [atmsRes, pendingRes, agentsRes] = await Promise.all([
        supabase.from('atms').select('id', { count: 'exact', head: true }).eq('status_approval', 'approved').is('deleted_at', null),
        supabase.from('atms').select('id, bank_name, address, latitude, longitude, has_cash, has_paper, obs, photo_url, submitted_by, created_at').eq('status_approval', 'pending').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).eq('role', 'agent'),
      ])

      setStats({
        totalATMs: atmsRes.count ?? 0,
        pendingATMs: pendingRes.data?.length ?? 0,
        totalAgents: agentsRes.count ?? 0,
      })
      setPendingATMs((pendingRes.data ?? []) as PendingATM[])
    } catch (err) {
      console.error('Error fetching supervisor data:', err)
    } finally {
      setLoading(false)
    }
  }, [user, isSupervisor])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const approveATM = useCallback(async (atmId: string) => {
    const { error } = await supabase.rpc('approve_pending_atm', { _atm_id: atmId })
    if (!error) {
      setPendingATMs((prev) => prev.filter((a) => a.id !== atmId))
      setStats((prev) => ({ ...prev, pendingATMs: Math.max(0, prev.pendingATMs - 1), totalATMs: prev.totalATMs + 1 }))
    }
    return { error }
  }, [])

  const rejectATM = useCallback(async (atmId: string, reason: string) => {
    const { error } = await supabase.rpc('reject_pending_atm', { _atm_id: atmId, _reason: reason })
    if (!error) {
      setPendingATMs((prev) => prev.filter((a) => a.id !== atmId))
      setStats((prev) => ({ ...prev, pendingATMs: Math.max(0, prev.pendingATMs - 1) }))
    }
    return { error }
  }, [])

  return {
    pendingATMs,
    stats,
    loading,
    refetch: fetchData,
    approveATM,
    rejectATM,
    isSupervisor,
  }
}
