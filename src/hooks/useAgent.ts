import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

interface AgentATM {
  id: string
  bank_name: string
  address: string
  has_cash: boolean
  has_paper: boolean | null
  fila: string | null
  status: string | null
  obs: string | null
  last_updated: string
  agent_id: string | null
}

interface AgentStats {
  totalATMs: number
  totalEarnings: number
  totalViews: number
  totalWithdrawn: number
  availableBalance: number
}

export function useAgent() {
  const { user, profile } = useAuth()
  const [atms, setAtms] = useState<AgentATM[]>([])
  const [stats, setStats] = useState<AgentStats>({
    totalATMs: 0,
    totalEarnings: 0,
    totalViews: 0,
    totalWithdrawn: 0,
    availableBalance: 0,
  })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [atmsRes, earningsRes, withdrawalsRes] = await Promise.all([
        supabase
          .from('atms')
          .select('id, bank_name, address, has_cash, has_paper, fila, status, obs, last_updated, agent_id')
          .eq('agent_id', user.id)
          .eq('status_approval', 'approved'),
        supabase
          .from('agent_earnings')
          .select('amount_kz')
          .eq('agent_id', user.id),
        supabase
          .from('withdrawals')
          .select('amount_kz, status')
          .eq('agent_id', user.id),
      ])

      const agentAtms = (atmsRes.data ?? []) as AgentATM[]
      const totalEarnings = (earningsRes.data ?? []).reduce((s, e) => s + Number(e.amount_kz), 0)
      const totalViews = earningsRes.data?.length ?? 0
      const totalWithdrawn = (withdrawalsRes.data ?? [])
        .filter((w) => w.status === 'completed')
        .reduce((s, w) => s + Number(w.amount_kz), 0)

      setAtms(agentAtms)
      setStats({
        totalATMs: agentAtms.length,
        totalEarnings,
        totalViews,
        totalWithdrawn,
        availableBalance: Math.max(0, (profile?.agent_balance_kz ?? 0)),
      })
    } catch (err) {
      console.error('Error fetching agent data:', err)
    } finally {
      setLoading(false)
    }
  }, [user, profile?.agent_balance_kz])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateATM = useCallback(async (atmId: string, updates: Partial<AgentATM>) => {
    setUpdating(atmId)
    const { error } = await supabase
      .from('atms')
      .update({
        ...updates,
        last_updated: new Date().toISOString(),
      })
      .eq('id', atmId)

    if (!error) {
      setAtms((prev) =>
        prev.map((a) =>
          a.id === atmId
            ? { ...a, ...updates, last_updated: new Date().toISOString() }
            : a
        )
      )
      if (user) {
        supabase
          .from('agent_activity_log')
          .insert({ agent_id: user.id, atm_id: atmId, action: 'update' })
          .then(() => {})
      }
    }
    setUpdating(null)
    return { error }
  }, [user])

  const toggleCash = useCallback(async (atmId: string) => {
    const atm = atms.find((a) => a.id === atmId)
    if (atm) return updateATM(atmId, { has_cash: !atm.has_cash })
  }, [atms, updateATM])

  const togglePaper = useCallback(async (atmId: string) => {
    const atm = atms.find((a) => a.id === atmId)
    if (atm) return updateATM(atmId, { has_paper: !atm.has_paper })
  }, [atms, updateATM])

  const setFila = useCallback(async (atmId: string, fila: string | null) => {
    return updateATM(atmId, { fila })
  }, [updateATM])

  const setStatus = useCallback(async (atmId: string, status: string) => {
    return updateATM(atmId, { status })
  }, [updateATM])

  const setObs = useCallback(async (atmId: string, obs: string | null) => {
    return updateATM(atmId, { obs })
  }, [updateATM])

  return {
    atms,
    stats,
    loading,
    updating,
    refetch: fetchData,
    toggleCash,
    togglePaper,
    setFila,
    setStatus,
    setObs,
    isAgent: profile?.role === 'agent',
  }
}
