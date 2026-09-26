import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { subscribePostgresChanges } from '../lib/realtime-channel'
import { useAuth } from './useAuth'
import { haversineDistance } from '../lib/distance'
import { FLYER_SETTINGS_DEFAULTS } from '../lib/flyer'
import type { Database } from '../lib/supabase-types'

type FlyerSubmissionRow = Database['public']['Tables']['flyer_submissions']['Row']

export interface FlyerSettings {
  bonusKz: number
  proximityM: number
  viewsUnlock: number
}

export interface FlyerAtm {
  id: string
  bank_name: string
  address: string
  cidade: string | null
  provincia: string | null
  latitude: number
  longitude: number
  distanceKm: number | null
}

const SETTINGS_KEYS = ['flyer_bonus_kz', 'flyer_proximity_m', 'flyer_views_unlock'] as const

async function getCurrentPositionSafe(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { getCurrentPositionAsync, Accuracy } = await import('expo-location')
    const loc = await getCurrentPositionAsync({ accuracy: Accuracy.High })
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
  } catch (err) {
    console.warn('flyer gps error:', err)
    return null
  }
}

export function useFlyerReward() {
  const { user } = useAuth()
  const [submission, setSubmission] = useState<FlyerSubmissionRow | null>(null)
  const [settings, setSettings] = useState<FlyerSettings>(FLYER_SETTINGS_DEFAULTS)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    try {
      const [subRes, settingsRes] = await Promise.all([
        supabase
          .from('flyer_submissions')
          .select('*')
          .eq('agent_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('app_settings').select('key, value').in('key', [...SETTINGS_KEYS]),
      ])

      setSubmission((subRes.data as FlyerSubmissionRow | null) ?? null)
      if (subRes.error) {
        console.warn('useFlyerReward: flyer_submissions error:', subRes.error.message)
      }

      const next: FlyerSettings = { ...FLYER_SETTINGS_DEFAULTS }
      for (const row of settingsRes.data ?? []) {
        const num = Number(row.value)
        if (isNaN(num) || num <= 0) continue
        if (row.key === 'flyer_bonus_kz') next.bonusKz = num
        if (row.key === 'flyer_proximity_m') next.proximityM = num
        if (row.key === 'flyer_views_unlock') next.viewsUnlock = Math.round(num)
      }
      setSettings(next)
    } catch (err) {
      console.warn('useFlyerReward error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setLoading(true)
    setSubmission(null)
    fetchData()
  }, [fetchData])

  // A aprovação/rejeição acontece no painel web: sem isto o agente via o estado
  // antigo até reiniciar a app.
  useEffect(() => {
    if (!user) return
    return subscribePostgresChanges({
      key: 'flyer-submission',
      table: 'flyer_submissions',
      event: '*',
      filter: `agent_id=eq.${user.id}`,
      onChange: () => {
        void fetchData()
      },
    })
  }, [user, fetchData])

  return { submission, settings, loading, refetch: fetchData }
}

export function useFlyerAtms(userId: string | undefined) {
  const [atms, setAtms] = useState<FlyerAtm[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    try {
      const [rows, position] = await Promise.all([
        supabase
          .from('atms')
          .select('id, bank_name, address, cidade, provincia, latitude, longitude')
          .eq('agent_id', userId)
          .eq('status_approval', 'approved')
          .is('deleted_at', null),
        getCurrentPositionSafe(),
      ])

      type FlyerAtmRow = {
        id: string
        bank_name: string
        address: string
        cidade: string | null
        provincia: string | null
        latitude: number
        longitude: number
      }
      const list = ((rows.data ?? []) as FlyerAtmRow[]).map((atm) => ({
        ...atm,
        distanceKm:
          position && atm.latitude != null && atm.longitude != null
            ? haversineDistance(position.latitude, position.longitude, atm.latitude, atm.longitude)
            : null,
      }))

      list.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0
        if (a.distanceKm == null) return 1
        if (b.distanceKm == null) return -1
        return a.distanceKm - b.distanceKm
      })

      setAtms(list)
    } catch (err) {
      console.warn('useFlyerAtms error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    setLoading(true)
    setAtms([])
    fetchData()
  }, [fetchData])

  return { atms, loading, refetch: fetchData }
}