import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setStatus('loading')
        router.replace('/(tabs)/map')
      } else {
        setStatus('error')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <View className="flex-1 items-center justify-center bg-white">
      {status === 'loading' ? (
        <>
          <ActivityIndicator size="large" color="#2F7BF0" />
          <Text className="text-gray-500 mt-4">A confirmar sessão...</Text>
        </>
      ) : (
        <Text className="text-red-500">Erro ao confirmar sessão</Text>
      )}
    </View>
  )
}
