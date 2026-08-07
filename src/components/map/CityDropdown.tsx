import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { AppIcon } from '../ui/AppIcon'
import { colors } from '@/theme/tokens'

interface CityDropdownProps {
  city: string
  cities: string[]
  onCityChange: (city: string) => void
}

export function CityDropdown({ city, cities, onCityChange }: CityDropdownProps) {
  const [open, setOpen] = useState(false)
  const selected = city === 'all' ? 'Todas as cidades' : city

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#F3F4F6',
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 7,
          gap: 6,
          maxWidth: 180,
        }}
      >
        <Text
          style={{ fontSize: 12, fontWeight: '600', color: city === 'all' ? colors.text.secondary : colors.brand[500] }}
          numberOfLines={1}
        >
          {selected}
        </Text>
        <AppIcon name="chevron-down" size={13} color={colors.text.tertiary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary }}>Filtrar por cidade</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={{ fontSize: 14, color: colors.brand[500], fontWeight: '600' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F9FAFB',
                  backgroundColor: city === 'all' ? '#F0F6FE' : 'transparent',
                }}
                onPress={() => { onCityChange('all'); setOpen(false) }}
              >
                <Text style={{ fontSize: 15, color: city === 'all' ? '#1573D6' : '#374151', fontWeight: city === 'all' ? '600' : '400' }}>
                  Todas as cidades
                </Text>
              </TouchableOpacity>
              {cities.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F9FAFB',
                    backgroundColor: city === c ? '#F0F6FE' : 'transparent',
                  }}
                  onPress={() => { onCityChange(c); setOpen(false) }}
                >
                  <Text style={{ fontSize: 15, color: city === c ? '#1573D6' : '#374151', fontWeight: city === c ? '600' : '400' }}>
                    {c}
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
