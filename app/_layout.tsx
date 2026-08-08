import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../src/hooks/useAuth'
import { useNotifications } from '../src/hooks/useNotifications'
import { getPendingAgentRedirect, setPendingAgentRedirect } from '../src/lib/navigation-flag'
import '../global.css'

function RootLayoutNav() {
  const { user, loading } = useAuth()
  useNotifications()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (user && inAuthGroup && !getPendingAgentRedirect()) {
      router.replace('/(tabs)/map')
    } else if (!inAuthGroup && getPendingAgentRedirect()) {
      setPendingAgentRedirect(false)
    }
  }, [user, loading, segments, router])

  return (
    <>
      <StatusBar style="auto" />
      <Slot />
    </>
  )
}

export default function RootLayout() {
  return <RootLayoutNav />
}
