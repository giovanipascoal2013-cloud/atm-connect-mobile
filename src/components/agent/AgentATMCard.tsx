import React, { useState } from 'react'
import { View, Text, Switch, TouchableOpacity, TextInput } from 'react-native'
import { timeSince } from '../../lib/time'

interface AgentATM {
  id: string
  bank_name: string
  address: string
  has_cash: boolean
  has_paper: boolean | null
  fila: string | null
  status: string | null
  obs: string | null
  last_updated: string
}

interface AgentATMCardProps {
  atm: AgentATM
  updating: boolean
  onToggleCash: () => void
  onTogglePaper: () => void
  onSetFila: (fila: string | null) => void
  onSetStatus: (status: string) => void
  onSetObs: (obs: string | null) => void
}

const FILA_OPTIONS = [
  { value: null, label: 'Sem info' },
  { value: 'Pouca Gente ( 0 - 6 )', label: 'Pouca (0-6)' },
  { value: 'Moderado (7 - 13)', label: 'Moderado (7-13)' },
  { value: 'Muita Gente (+14)', label: 'Muita (+14)' },
]

const STATUS_OPTIONS = ['Operacional', 'Sob Manutenção', 'Fora de Serviço']

export function AgentATMCard({
  atm,
  updating,
  onToggleCash,
  onTogglePaper,
  onSetFila,
  onSetStatus,
  onSetObs,
}: AgentATMCardProps) {
  const [editingObs, setEditingObs] = useState(false)
  const [obsText, setObsText] = useState(atm.obs || '')
  const [showFilaPicker, setShowFilaPicker] = useState(false)
  const [showStatusPicker, setShowStatusPicker] = useState(false)

  const statusColor =
    atm.status === 'Fora de Serviço'
      ? '#7F8C8D'
      : atm.has_cash
        ? '#34A853'
        : '#EA4335'

  const handleSaveObs = () => {
    onSetObs(obsText || null)
    setEditingObs(false)
  }

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
            {atm.bank_name}
          </Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }} numberOfLines={1}>
            {atm.address}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
          {timeSince(atm.last_updated)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F9FAFB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 13, color: '#6B7280' }}>Dinheiro</Text>
          <Switch
            value={atm.has_cash}
            onValueChange={onToggleCash}
            disabled={updating}
            trackColor={{ false: '#D1D5DB', true: '#34D399' }}
            thumbColor={atm.has_cash ? '#10B981' : '#fff'}
          />
        </View>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F9FAFB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 13, color: '#6B7280' }}>Papel</Text>
          <Switch
            value={!!atm.has_paper}
            onValueChange={onTogglePaper}
            disabled={updating}
            trackColor={{ false: '#D1D5DB', true: '#34D399' }}
            thumbColor={atm.has_paper ? '#10B981' : '#fff'}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#F9FAFB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
          onPress={() => setShowFilaPicker(!showFilaPicker)}
        >
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Fila</Text>
          <Text style={{ fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 2 }}>
            {FILA_OPTIONS.find((f) => f.value === atm.fila)?.label || 'Sem info'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#F9FAFB',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
          onPress={() => setShowStatusPicker(!showStatusPicker)}
        >
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Estado</Text>
          <Text style={{ fontSize: 13, color: '#111827', fontWeight: '500', marginTop: 2 }}>
            {atm.status || 'Operacional'}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilaPicker && (
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, marginBottom: 10, gap: 4 }}>
          {FILA_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: atm.fila === opt.value ? '#2094F3' : 'transparent',
              }}
              onPress={() => {
                onSetFila(opt.value)
                setShowFilaPicker(false)
              }}
            >
              <Text style={{ fontSize: 13, color: atm.fila === opt.value ? '#fff' : '#374151' }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showStatusPicker && (
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 8, marginBottom: 10, gap: 4 }}>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: atm.status === s ? '#2094F3' : 'transparent',
              }}
              onPress={() => {
                onSetStatus(s)
                setShowStatusPicker(false)
              }}
            >
              <Text style={{ fontSize: 13, color: atm.status === s ? '#fff' : '#374151' }}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {editingObs ? (
        <View style={{ gap: 6 }}>
          <TextInput
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: 8,
              padding: 10,
              fontSize: 13,
              minHeight: 60,
              textAlignVertical: 'top',
            }}
            value={obsText}
            onChangeText={setObsText}
            placeholder="Observações..."
            placeholderTextColor="#9CA3AF"
            multiline
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleSaveObs}>
              <Text style={{ fontSize: 13, color: '#2094F3', fontWeight: '600' }}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingObs(false)}>
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => { setEditingObs(true); setObsText(atm.obs || '') }}>
          {atm.obs ? (
            <Text style={{ fontSize: 12, color: '#6B7280', backgroundColor: '#F9FAFB', borderRadius: 6, padding: 8 }}>
              {atm.obs}
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: '#D1D5DB' }}>+ Adicionar observação</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  )
}
