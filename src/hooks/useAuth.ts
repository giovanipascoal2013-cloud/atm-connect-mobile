import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  user_id: string
  nome: string | null
  telefone: string
  role: string
  views_balance: number
  agent_balance_kz: number
  account_active: boolean
  banned: boolean
  is_demo: boolean
  support_disabled: boolean
  cidade: string | null
  provincia: string | null
  iban: string | null
  iban_titular: string | null
  referral_code: string | null
  invited_by: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

interface PostgrestErrorLike {
  code?: string
  message?: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [roles, setRoles] = useState<string[]>([])

  const isJwtFutureError = useCallback((err: PostgrestErrorLike | null) => {
    return !!err && (err.code === 'PGRST303' || (err.message || '').includes('JWT issued at future'))
  }, [])

  const runWithSessionRefresh = useCallback(async <T,>(
    fn: () => PromiseLike<{ data: T | null; error: PostgrestErrorLike | null }>
  ): Promise<{ data: T | null; error: PostgrestErrorLike | null }> => {
    let result = await fn()
    if (isJwtFutureError(result.error)) {
      const { data: refreshed, error } = await supabase.auth.refreshSession()
      if (!error && refreshed.session) {
        result = await fn()
      } else {
        await supabase.auth.signOut()
      }
    }
    return result
  }, [isJwtFutureError])

  const checkPremium = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .maybeSingle()

    setIsPremium(!!data)
  }, [])

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await runWithSessionRefresh(() =>
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
      )

      if (error) {
        console.error('Error fetching roles:', error)
      } else {
        setRoles((data ?? []).map((r) => r.role as string))
      }
    } catch (err) {
      console.error('Error fetching roles:', err)
    }
  }, [runWithSessionRefresh])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await runWithSessionRefresh(() =>
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
      )

      if (error) {
        console.error('Error fetching profile:', error)
      } else if (data) {
        setProfile(data)
        await checkPremium(userId)
      }
      await fetchRoles(userId)
    } finally {
      setLoading(false)
    }
  }, [checkPremium, fetchRoles, runWithSessionRefresh])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setRoles([])
        setIsPremium(false)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })
    return { error, session: data?.session ?? null }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error }
  }, [])

  const isAdmin = roles.includes('admin')
  const isSupervisor = roles.includes('supervisor') || isAdmin
  const isAgent = roles.includes('agent') || isSupervisor
  const isOnlyAgent = isAgent && !isSupervisor
  const role = isAdmin ? 'admin' : roles.includes('supervisor') ? 'supervisor' : isAgent ? 'agent' : 'user'

  return {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
    roles,
    role,
    isAdmin,
    isAgent,
    isOnlyAgent,
    isSupervisor,
    isPremium,
  }
}
