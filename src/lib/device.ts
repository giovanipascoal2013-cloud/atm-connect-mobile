import * as SecureStore from 'expo-secure-store'

const DEVICE_ID_KEY = 'atm_connect_device_id'

let cached: string | null = null

function formatUuidV4(bytes: number[]): string {
  const b = bytes.slice(0, 16)
  b[6] = (b[6] & 0x0f) | 0x40 // versão 4
  b[8] = (b[8] & 0x3f) | 0x80 // variante RFC 4122
  const hex = b.map((n) => (n & 0xff).toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}

function randomUuidV4(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require('expo-crypto')
    if (typeof Crypto?.randomUUID === 'function') {
      return Crypto.randomUUID() as string
    }
  } catch {
    // expo-crypto indisponível (Expo Go / web) — cai no fallback abaixo
  }

  const bytes: number[] = []
  for (let i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256))
  return formatUuidV4(bytes)
}

/**
 * Identificador estável do dispositivo, usado como identidade do visitante
 * anónimo para desbloquear ATMs. Gerado uma vez e guardado em SecureStore.
 *
 * Não é um segredo de autenticação: o servidor não o valida (risco B15
 * documentado no LOG.md). Perde-se ao desinstalar a app — nesse caso o
 * visitante volta a ver o ATM bloqueado, mas o primary key
 * (device_id, atm_id) no servidor impede comissão dupla.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached

  try {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY)
    if (existing) {
      cached = existing
      return existing
    }
  } catch (e) {
    console.warn('[device] leitura falhou:', e instanceof Error ? e.message : String(e))
  }

  const generated = randomUuidV4()

  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, generated)
  } catch (e) {
    // Sem persistência o id muda a cada arranque. Dentro de uma sessão o
    // cache acima mantém o mesmo id, que é o que interessa ao servidor.
    console.warn('[device] gravação falhou:', e instanceof Error ? e.message : String(e))
  }

  cached = generated
  return generated
}
