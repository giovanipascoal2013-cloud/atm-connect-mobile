import * as SecureStore from 'expo-secure-store'
import { getDeviceId } from './device'

const KEY_PREFIX = 'atm_connect_unlocks_'

// A chave inclui o device_id para que dois dispositivos nunca partilhem o
// mesmo slot do SecureStore (e para que o total por device fique limitado).
const keyFor = (deviceId: string) => `${KEY_PREFIX}${deviceId}`

// O SecureStore tem um limite por item (ver o adaptador com chunking em
// supabase.ts:49-90). Guardamos no máximo MAX_TRACKED unlocks, os mais
// recentes — na prática um utilizador não desbloqueia 31 ATMs em 24 h.
const MAX_TRACKED = 30

function warn(scope: string, e: unknown) {
  console.warn(`[ad-unlocks] ${scope}:`, e instanceof Error ? e.message : String(e))
}

/** unlocks activos deste dispositivo → mapa atmId -> expiresAt (ISO) */
export async function readAnonUnlocks(): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  try {
    const deviceId = await getDeviceId()
    const raw = await SecureStore.getItemAsync(keyFor(deviceId))
    if (!raw) return out

    const parsed = JSON.parse(raw) as Record<string, string>
    const now = Date.now()
    Object.entries(parsed).forEach(([atmId, expiresAt]) => {
      const ts = new Date(expiresAt).getTime()
      // Data inválida (ou expirada) descarta-se: pior que o usuário re-ver
      // o anúncio do que ficar com um ATM bloqueado para sempre.
      if (Number.isFinite(ts) && ts > now) out.set(atmId, expiresAt)
    })
  } catch (e) {
    warn('readAnonUnlocks', e)
  }
  return out
}

/** Regista (ou renova) o unlock de um ATM neste dispositivo. */
export async function writeAnonUnlock(atmId: string, expiresAt: string): Promise<void> {
  try {
    const deviceId = await getDeviceId()
    const current = await readAnonUnlocks()
    current.set(atmId, expiresAt)

    const trimmed = [...current.entries()]
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .slice(0, MAX_TRACKED)

    await SecureStore.setItemAsync(keyFor(deviceId), JSON.stringify(Object.fromEntries(trimmed)))
  } catch (e) {
    warn('writeAnonUnlock', e)
  }
}

/** Limpa os unlocks anónimos deste dispositivo (logout / limpo de dados). */
export async function clearAnonUnlocks(): Promise<void> {
  try {
    const deviceId = await getDeviceId()
    await SecureStore.deleteItemAsync(keyFor(deviceId))
  } catch (e) {
    warn('clearAnonUnlocks', e)
  }
}
