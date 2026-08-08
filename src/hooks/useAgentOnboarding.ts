import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface AgentOnboardingProgress {
  agent_id: string
  onboarding_seen: boolean
  profile_completed: boolean
  first_atm_submitted: boolean
  first_atm_approved: boolean
  pending_atm_id: string | null
}

export function useAgentOnboarding() {
  const { user, isOnlyAgent } = useAuth()
  const [progress, setProgress] = useState<AgentOnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user || !isOnlyAgent) {
      setProgress(null)
      setLoading(false)
      return
    }
    setLoading(true)
    let { data, error } = await supabase
      .from('agent_onboarding_progress')
      .select('*')
      .eq('agent_id', user.id)
      .maybeSingle()

    if (!data && !error) {
      const { data: created } = await supabase
        .from('agent_onboarding_progress')
        .insert({
          agent_id: user.id,
          onboarding_seen: false,
          profile_completed: false,
          first_atm_submitted: false,
          first_atm_approved: false,
          pending_atm_id: null,
        })
        .select()
        .maybeSingle()
      data = created
    }

    setProgress(
      data
        ? {
            agent_id: data.agent_id,
            onboarding_seen: data.onboarding_seen,
            profile_completed: data.profile_completed,
            first_atm_submitted: data.first_atm_submitted,
            first_atm_approved: data.first_atm_approved,
            pending_atm_id: data.pending_atm_id,
          }
        : null
    )
    setLoading(false)
  }, [user, isOnlyAgent])

  useEffect(() => {
    fetch()
  }, [fetch])

  const update = useCallback(async (patch: Partial<AgentOnboardingProgress>) => {
    let uid: string | null | undefined = user?.id
    if (!uid) {
      const { data: authData } = await supabase.auth.getUser()
      uid = authData.user?.id ?? null
    }
    if (!uid) return
    const { data } = await supabase
      .from('agent_onboarding_progress')
      .update(patch)
      .eq('agent_id', uid)
      .select()
      .maybeSingle()
    if (data) {
      setProgress({
        agent_id: data.agent_id,
        onboarding_seen: data.onboarding_seen,
        profile_completed: data.profile_completed,
        first_atm_submitted: data.first_atm_submitted,
        first_atm_approved: data.first_atm_approved,
        pending_atm_id: data.pending_atm_id,
      })
    }
  }, [user])

  return { progress, loading, update, refresh: fetch }
}
