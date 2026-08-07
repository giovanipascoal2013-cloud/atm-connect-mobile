import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native'
import { PROVINCIAS_ANGOLA } from '../../constants/provinces'

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
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
        onPress={() => setVisible(true)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Província</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 2 }}>{selected}</Text>
          </View>
          <Text style={{ fontSize: 14, color: '#9CA3AF' }}>▼</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Selecionar Província</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={{ fontSize: 14, color: '#2094F3', fontWeight: '600' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {PROVINCIAS_ANGOLA.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F9FAFB',
                    backgroundColor: p === selected ? '#EEF6FE' : 'transparent',
                  }}
                  onPress={() => { onSelect(p); setVisible(false) }}
                >
                  <Text style={{ fontSize: 15, color: p === selected ? '#2094F3' : '#374151', fontWeight: p === selected ? '600' : '400' }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}
