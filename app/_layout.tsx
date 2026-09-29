import { useEffect, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '../src/hooks/useAuth'
import { useNotifications } from '../src/hooks/useNotifications'
import { getPendingAgentRedirect, setPendingAgentRedirect } from '../src/lib/navigation-flag'
import { AnimatedSplash } from '../src/components/ui/AnimatedSplash'
import '../global.css'

SplashScreen.preventAutoHideAsync().catch(() => {})

function RootLayoutNav() {
  const { user, loading } = useAuth()
  useNotifications()
  const segments = useSegments()
  const router = useRouter()
  const [animDone, setAnimDone] = useState(false)

  // A splash nativa é escondida assim que o overlay React (AnimatedSplash)
  // monta — o que se vê passa a ser o overlay (branco + logo/Lottie), nunca a
  // splash nativa. Evita o comportamento inconsistente dev vs release.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (user && inAuthGroup && !getPendingAgentRedirect()) {
      router.replace('/(tabs)/map')
    } else if (!inAuthGroup && getPendingAgentRedirect()) {
      setPendingAgentRedirect(false)
    }
  }, [user, loading, segments, router])

  const splashVisible = !animDone

  const handleSplashFinish = () => {
    setAnimDone(true)
    SplashScreen.hideAsync().catch(() => {})
  }

  return (
    <>
      <StatusBar style="auto" hidden={splashVisible} />
      <Slot />
      {splashVisible && (
        <AnimatedSplash ready={!loading} onFinish={handleSplashFinish} />
      )}
    </>
  )
}

export default function RootLayout() {
  return <RootLayoutNav />
}
