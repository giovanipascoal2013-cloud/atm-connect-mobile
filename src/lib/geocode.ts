import { PROVINCIAS_ANGOLA } from '../constants/provinces'

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN

const MAPBOX_API = 'https://api.mapbox.com/geocoding/v5/mapbox.places'

function normalizeProvincia(raw: string | null): string | null {
  if (!raw) return null
  const match = PROVINCIAS_ANGOLA.find((p) => raw === p)
  if (match) return match
  const stripped = raw.replace(/^Província (de |do )/, '')
  return PROVINCIAS_ANGOLA.find((p) => stripped === p) ?? null
}

export interface ReverseGeocodeResult {
  provincia: string | null
  cidade: string | null
  address: string | null
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  if (!MAPBOX_TOKEN) {
    console.warn('EXPO_PUBLIC_MAPBOX_TOKEN not set, skipping reverse geocode')
    return { provincia: null, cidade: null, address: null }
  }

  const url = `${MAPBOX_API}/${lng},${lat}.json?types=region,place,locality,address&language=pt&access_token=${MAPBOX_TOKEN}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('Mapbox reverse geocode failed:', res.status)
      return { provincia: null, cidade: null, address: null }
    }
    const data = await res.json()
    const features: { id: string; text: string; place_name?: string }[] = data.features ?? []
    const provincia = normalizeProvincia(features.find((f) => f.id.startsWith('region'))?.text ?? null)
    const cidade = features.find((f) => f.id.startsWith('place'))?.text ?? null
    const locality = features.find((f) => f.id.startsWith('locality'))?.text ?? null
    const addressFeature = features.find((f) => f.id.startsWith('address'))

    const address =
      addressFeature?.place_name ??
      (cidade ? `${locality ? locality + ', ' : ''}${cidade}` : null) ??
      features[0]?.place_name ??
      null

    return { provincia, cidade: cidade ?? locality, address }
  } catch (e) {
    console.warn('Mapbox reverse geocode error:', e)
    return { provincia: null, cidade: null, address: null }
  }
}
