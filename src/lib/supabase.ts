import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import 'react-native-url-polyfill/auto'
import type { Database } from './supabase-types'

const CHUNK_BYTES = 1024
const META_SUFFIX = '.meta'
const CHUNK_SUFFIX = '.part.'

function chunkKey(key: string, index: number): string {
  return `${key}${CHUNK_SUFFIX}${index}`
}

function utf8ByteLength(value: string): number {
  let bytes = 0
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) bytes += 4 // surrogate pair
    else bytes += 3
  }
  return bytes
}

function splitChunks(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let bytes = 0

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    const size = code < 0x80 ? 1 : code < 0x800 ? 2 : code >= 0xd800 && code <= 0xdbff ? 4 : 3

    if (bytes + size > CHUNK_BYTES && current.length > 0) {
      parts.push(current)
      current = ''
      bytes = 0
    }

    current += value[i]
    bytes += size
  }

  if (current.length > 0) parts.push(current)
  return parts
}

const ExpoSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const meta = await SecureStore.getItemAsync(key + META_SUFFIX)
    if (!meta) {
      const direct = await SecureStore.getItemAsync(key)
      return direct
    }

    const count = parseInt(meta, 10)
    let value = ''
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i))
      if (part === null) return null
      value += part
    }
    return value
  },

  async setItem(key: string, value: string): Promise<void> {
    const bytes = utf8ByteLength(value)

    if (bytes <= 2048) {
      await SecureStore.setItemAsync(key, value)
      await SecureStore.deleteItemAsync(key + META_SUFFIX)
      return
    }

    const parts = splitChunks(value)

    await Promise.all(parts.map((part, i) => SecureStore.setItemAsync(chunkKey(key, i), part)))
    await SecureStore.setItemAsync(key + META_SUFFIX, String(parts.length))
    await SecureStore.deleteItemAsync(key)
  },

  async removeItem(key: string): Promise<void> {
    const meta = await SecureStore.getItemAsync(key + META_SUFFIX)
    const count = meta ? parseInt(meta, 10) : 0
    const deletes: Promise<void>[] = []
    for (let i = 0; i < count; i++) {
      deletes.push(SecureStore.deleteItemAsync(chunkKey(key, i)))
    }
    deletes.push(SecureStore.deleteItemAsync(key))
    deletes.push(SecureStore.deleteItemAsync(key + META_SUFFIX))
    await Promise.all(deletes)
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
