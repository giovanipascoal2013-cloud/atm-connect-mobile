import { useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let NotificationsModule: any = null

function getNotifications(): any | null {
  if (NotificationsModule) return NotificationsModule
  try {
    NotificationsModule = require('expo-notifications')
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
    return NotificationsModule
  } catch {
    return null
  }
}

export function useNotifications() {
  const { user } = useAuth()
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const notificationListener = useRef<any>(null)
  const responseListener = useRef<any>(null)

  useEffect(() => {
    if (!user) return

    const Notifications = getNotifications()
    if (!Notifications) return

    const setup = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync()
        if (status !== 'granted') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync()
          if (newStatus !== 'granted') return
        }

        const token = await Notifications.getExpoPushTokenAsync()
        setExpoPushToken(token.data)
      } catch {
        // Push token not available in dev / Expo Go
      }

      notificationListener.current = Notifications.addNotificationReceivedListener(() => {})
      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {})
    }

    setup()

    return () => {
      const N = getNotifications()
      if (notificationListener.current && N) {
        N.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current && N) {
        N.removeNotificationSubscription(responseListener.current)
      }
    }
  }, [user])

  return { expoPushToken }
}
