import { useCallback, useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useRouter, useRootNavigationState } from 'expo-router'
import Constants from 'expo-constants'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import type { Href } from 'expo-router'

// Notificações adiadas: Firebase/FCM ainda não configurado. Gate estático para
// não tentar registo de push nem spammar warnings até à versão de notificações.
const PUSH_ENABLED = process.env.EXPO_PUBLIC_ENABLE_PUSH === 'true'

let NotificationsModule: any = null
let DeviceModule: any = null

function getNotifications(): any | null {
  if (NotificationsModule) return NotificationsModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NotificationsModule = require('expo-notifications')
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
    if (NotificationsModule.setNotificationChannelAsync) {
      NotificationsModule.setNotificationChannelAsync('default', {
        name: 'Atividades',
        importance: NotificationsModule.AndroidImportance?.MAX ?? 4,
      }).catch(() => {})
    }
    return NotificationsModule
  } catch {
    return null
  }
}

function getDevice(): any | null {
  if (DeviceModule) return DeviceModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    DeviceModule = require('expo-device')
    return DeviceModule
  } catch {
    return null
  }
}

const TYPE_HREF: Record<string, Href> = {
  atm_approved: '/(tabs)/agent',
  atm_rejected: '/(tabs)/agent',
  subscription_approved: '/(tabs)/profile',
  subscription_rejected: '/(tabs)/profile',
  withdrawal_approved: '/(tabs)/agent',
  withdrawal_rejected: '/(tabs)/agent',
  view_commission: '/(tabs)/agent',
  ad_commission: '/(tabs)/agent',
  flyer_bonus: '/(tabs)/agent',
  flyer_submission_approved: '/(tabs)/agent',
  flyer_submission_rejected: '/(tabs)/agent',
  atm_rating: '/(tabs)/map',
  referral_new: '/referrals',
  forum_reply: '/(tabs)/forum',
}

function routeForNotification(notification: any): Href {
  const type = notification?.request?.content?.data?.type
  return (type && TYPE_HREF[type]) || ('/(tabs)/map' as Href)
}

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId
    || Constants.easConfig?.projectId
    || undefined
  )
}

async function upsertPushToken(userId: string, token: string, platform: string | null) {
  const { error } = await supabase.from('push_tokens').upsert(
    { user_id: userId, token, platform },
    { onConflict: 'user_id' }
  )
  if (error) {
    // tabela pode não existir ainda no staging — visível para diagnóstico
    console.warn('[useNotifications] upsert push_tokens falhou:', error.message)
  }
}

export function useNotifications() {
  const { user } = useAuth()
  const router = useRouter()
  const rootNavigationState = useRootNavigationState()
  const responseListener = useRef<any>(null)
  const pendingRouteRef = useRef<Href | null>(null)
  const navigationReadyRef = useRef(false)
  const tokenRegisteredForUser = useRef<string | null>(null)
  const tokenRegistrationBusy = useRef(false)

  useEffect(() => {
    navigationReadyRef.current = rootNavigationState?.key != null
  }, [rootNavigationState?.key])

  const navigate = useCallback((route: Href) => {
    if (navigationReadyRef.current) {
      router.push(route)
    } else {
      pendingRouteRef.current = route
    }
  }, [router])

  useEffect(() => {
    if (navigationReadyRef.current && pendingRouteRef.current) {
      const route = pendingRouteRef.current
      pendingRouteRef.current = null
      router.push(route)
    }
  }, [rootNavigationState?.key, router])

  // Regista o push token no dispositivo e grava-o em push_tokens (1 por user).
  // Erros são visíveis (console.warn) para diagnóstico — antes eram engolidos.
  const registerPushToken = useCallback(async (userId: string) => {
    if (tokenRegistrationBusy.current) return
    tokenRegistrationBusy.current = true
    try {
      const Notifications = getNotifications()
      if (!Notifications) {
        console.warn('[useNotifications] expo-notifications indisponível (Expo Go/web?) — sem push token')
        return
      }

      const { status } = await Notifications.getPermissionsAsync()
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync()
        if (newStatus !== 'granted') {
          console.warn('[useNotifications] permissão de notificações negada — sem push token (ativa em Definições)')
          return
        }
      }

      const Device = getDevice()
      if (!Device?.isDevice) {
        console.warn('[useNotifications] expo-device indica não-device (emulador?) — sem push token')
        return
      }

      const projectId = resolveProjectId()
      if (!projectId) {
        console.warn('[useNotifications] projectId não resolvido (Constants) — getExpoPushTokenAsync sem projectId')
      }
      const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
      if (token?.data) {
        await upsertPushToken(userId, token.data, Device.platform ?? null)
        tokenRegisteredForUser.current = userId
        console.log('[useNotifications] push token registado para', userId, '| projectId:', projectId ?? '(ausente)')
      } else {
        console.warn('[useNotifications] getExpoPushTokenAsync não devolveu token.data')
      }
    } catch (e) {
      console.warn('[useNotifications] falha ao obter push token:', e instanceof Error ? e.message : String(e))
    } finally {
      tokenRegistrationBusy.current = false
    }
  }, [])

  // No foreground (AppState active), re-regista o token se a permissão tiver sido
  // concedida entretanto e ainda não houver token registado para o user atual.
  const tryRegisterOnForeground = useCallback((userId: string) => {
    if (tokenRegisteredForUser.current === userId) return
    void registerPushToken(userId)
  }, [registerPushToken])

  useEffect(() => {
    if (!PUSH_ENABLED) return
    if (!user) return

    const Notifications = getNotifications()
    if (!Notifications) return

    // Listener de toque registado SEMPRE, mesmo sem permissão de push — o deep-link
    // por tipo não deve depender do estado da permissão.
    if (!responseListener.current) {
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        navigate(routeForNotification(response))
      })
    }

    void registerPushToken(user.id)

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') tryRegisterOnForeground(user.id)
    })

    // Cold start (app morto + toque na notificação)
    try {
      const last = Notifications.getLastNotificationResponse?.() ?? null
      if (last) {
        navigate(routeForNotification(last))
      }
    } catch {
      // ignore
    }

    return () => {
      sub.remove()
      if (responseListener.current) {
        responseListener.current.remove()
        responseListener.current = null
      }
    }
  }, [user, router, navigate, registerPushToken, tryRegisterOnForeground])

  return null
}
