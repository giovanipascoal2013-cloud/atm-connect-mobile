import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native'
import { PROVINCIAS_ANGOLA } from '../../constants/provinces'
import { AppIcon } from '../ui/AppIcon'
import { colors } from '@/theme/tokens'

interface ProvinceSelectorProps {
  selected: string
  onSelect: (provincia: string) => void
}

export function ProvinceSelector({ selected, onSelect }: ProvinceSelectorProps) {
  const [visible, setVisible] = useState(false)

  return (
    <>
      <TouchableOpacity
        style={{
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onPress={() => setVisible(true)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.brand[50],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcon name="map-outline" size={18} color={colors.brand[500]} />
            </View>
            <View>
              <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Província</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.primary, marginTop: 1 }}>{selected}</Text>
            </View>
          </View>
          <AppIcon name="chevron-down" size={16} color={colors.text.tertiary} />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>Selecionar Província</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={{ fontSize: 14, color: colors.brand[500], fontWeight: '600' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {PROVINCIAS_ANGOLA.map((p) => {
                const active = p === selected
                return (
                  <TouchableOpacity
                    key={p}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.surface,
                      backgroundColor: active ? colors.brand[50] : 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => { onSelect(p); setVisible(false) }}
                  >
                    <Text style={{ fontSize: 15, color: active ? colors.brand[600] : '#374151', fontWeight: active ? '600' : '400' }}>
                      {p}
                    </Text>
                    {active && <AppIcon name="checkmark" size={16} color={colors.brand[500]} />}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}
