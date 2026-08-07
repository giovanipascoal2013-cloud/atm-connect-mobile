import React, { useState } from 'react'
import { View, Text, Switch, TouchableOpacity, TextInput } from 'react-native'
import { timeSince } from '../../lib/time'
import { AppCard } from '../ui/AppCard'
import { AppIcon } from '../ui/AppIcon'
import { colors, radius } from '../../theme/tokens'

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
      ? colors.text.tertiary
      : atm.has_cash
        ? colors.money
        : colors.danger

  const handleSaveObs = () => {
    onSetObs(obsText || null)
    setEditingObs(false)
  }

  return (
    <AppCard style={{ marginBottom: 12, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColor }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary }} numberOfLines={1}>
            {atm.bank_name}
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.tertiary }} numberOfLines={1}>
            {atm.address}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <AppIcon name="time-outline" size={12} color={colors.text.tertiary} />
          <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
            {timeSince(atm.last_updated)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderRadius: radius.sm,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="cash-outline" size={15} color={colors.text.secondary} />
            <Text style={{ fontSize: 13, color: colors.text.secondary }}>Dinheiro</Text>
          </View>
          <Switch
            value={atm.has_cash}
            onValueChange={onToggleCash}
            disabled={updating}
            trackColor={{ false: '#D1D5DB', true: colors.accent[400] }}
            thumbColor={atm.has_cash ? colors.money : '#fff'}
          />
        </View>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderRadius: radius.sm,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="receipt-outline" size={15} color={colors.text.secondary} />
            <Text style={{ fontSize: 13, color: colors.text.secondary }}>Papel</Text>
          </View>
          <Switch
            value={!!atm.has_paper}
            onValueChange={onTogglePaper}
            disabled={updating}
            trackColor={{ false: '#D1D5DB', true: colors.accent[400] }}
            thumbColor={atm.has_paper ? colors.money : '#fff'}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.sm,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
          onPress={() => setShowFilaPicker(!showFilaPicker)}
        >
          <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Fila</Text>
          <Text style={{ fontSize: 13, color: colors.text.primary, fontWeight: '500', marginTop: 2 }}>
            {FILA_OPTIONS.find((f) => f.value === atm.fila)?.label || 'Sem info'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.sm,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
          onPress={() => setShowStatusPicker(!showStatusPicker)}
        >
          <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Estado</Text>
          <Text style={{ fontSize: 13, color: colors.text.primary, fontWeight: '500', marginTop: 2 }}>
            {atm.status || 'Operacional'}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilaPicker && (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.sm, padding: 8, marginBottom: 10, gap: 4 }}>
          {FILA_OPTIONS.map((opt) => {
            const active = atm.fila === opt.value
            return (
              <TouchableOpacity
                key={opt.label}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  backgroundColor: active ? colors.brand[500] : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={() => {
                  onSetFila(opt.value)
                  setShowFilaPicker(false)
                }}
              >
                <Text style={{ fontSize: 13, color: active ? '#fff' : colors.text.primary }}>
                  {opt.label}
                </Text>
                {active && <AppIcon name="checkmark" size={15} color="#fff" />}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {showStatusPicker && (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.sm, padding: 8, marginBottom: 10, gap: 4 }}>
          {STATUS_OPTIONS.map((s) => {
            const active = atm.status === s
            return (
              <TouchableOpacity
                key={s}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  backgroundColor: active ? colors.brand[500] : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onPress={() => {
                  onSetStatus(s)
                  setShowStatusPicker(false)
                }}
              >
                <Text style={{ fontSize: 13, color: active ? '#fff' : colors.text.primary }}>
                  {s}
                </Text>
                {active && <AppIcon name="checkmark" size={15} color="#fff" />}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {editingObs ? (
        <View style={{ gap: 6 }}>
          <TextInput
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.sm,
              padding: 10,
              fontSize: 13,
              minHeight: 60,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text.primary,
            }}
            value={obsText}
            onChangeText={setObsText}
            placeholder="Observações..."
            placeholderTextColor={colors.text.tertiary}
            multiline
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleSaveObs}>
              <Text style={{ fontSize: 13, color: colors.brand[500], fontWeight: '600' }}>Guardar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingObs(false)}>
              <Text style={{ fontSize: 13, color: colors.text.tertiary }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => { setEditingObs(true); setObsText(atm.obs || '') }}>
          {atm.obs ? (
            <Text style={{ fontSize: 12, color: colors.text.secondary, backgroundColor: colors.surface, borderRadius: 6, padding: 8 }}>
              {atm.obs}
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>+ Adicionar observação</Text>
          )}
        </TouchableOpacity>
      )}
    </AppCard>
  )
}
