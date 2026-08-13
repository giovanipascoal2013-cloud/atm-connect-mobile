import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PostgresChangesConfig {
  key: string
  table: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
  onChange: () => void
}

interface ChannelEntry {
  channel: RealtimeChannel
  listeners: Set<() => void>
}

const registry = new Map<string, ChannelEntry>()

export function subscribePostgresChanges({
  key,
  table,
  event = '*',
  filter,
  onChange,
}: PostgresChangesConfig): () => void {
  const existing = registry.get(key)
  if (existing) {
    existing.listeners.add(onChange)
    return () => leave(key, onChange)
  }

  const channel = supabase
    .channel(`${key}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event, schema: 'public', table, filter },
      () => {
        registry.get(key)?.listeners.forEach((cb) => cb())
      }
    )
    .subscribe()

  registry.set(key, { channel, listeners: new Set([onChange]) })
  return () => leave(key, onChange)
}

function leave(key: string, onChange: () => void) {
  const entry = registry.get(key)
  if (!entry) return
  entry.listeners.delete(onChange)
  if (entry.listeners.size === 0) {
    registry.delete(key)
    void supabase.removeChannel(entry.channel)
  }
}