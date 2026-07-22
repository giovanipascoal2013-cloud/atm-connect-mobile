import { useEffect, useState } from 'react'
import * as Location from 'expo-location'

export type LocationState = {
  latitude: number
  longitude: number
} | null

export function useLocation() {
  const [location, setLocation] = useState<LocationState>(null)
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        setPermission(status)

        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          })
        }
      } catch (err) {
        console.warn('Location error:', err)
        setPermission('denied')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const requestAgain = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setPermission(status)
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        })
      }
    } catch (err) {
      console.warn('Location error:', err)
    }
  }

  return { location, permission, loading, requestAgain }
}
