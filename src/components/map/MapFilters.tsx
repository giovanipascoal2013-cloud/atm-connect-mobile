import React from 'react'
import { View, TextInput, ScrollView, TouchableOpacity, Text } from 'react-native'
import type { ATMStatus, SortMode } from '../../hooks/useATMs'

interface MapFiltersProps {
  search: string
  onSearchChange: (text: string) => void
  bank: string
  banks: string[]
  onBankChange: (bank: string) => void
  status: ATMStatus | 'all'
  onStatusChange: (status: ATMStatus | 'all') => void
  city: string
  cities: string[]
  onCityChange: (city: string) => void
  sortMode: SortMode
  onSortModeChange: (mode: SortMode) => void
}

const STATUS_OPTIONS: { key: ATMStatus | 'all'; label: string; color?: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'cash', label: 'Com dinheiro', color: '#34A853' },
  { key: 'no_cash', label: 'Sem dinheiro', color: '#EA4335' },
  { key: 'offline', label: 'Offline', color: '#7F8C8D' },
]

function chip(
  key: string,
  label: string,
  selected: boolean,
  onPress: () => void,
  color?: string
) {
  return (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: selected ? '#2094F3' : '#fff',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      {color && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selected ? '#fff' : color }} />
      )}
      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#fff' : '#374151' }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

export function MapFilters({
  search,
  onSearchChange,
  bank,
  banks,
  onBankChange,
  status,
  onStatusChange,
  city,
  cities,
  onCityChange,
  sortMode,
  onSortModeChange,
}: MapFiltersProps) {
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#fff',
          borderRadius: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <TextInput
          style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 }}
          placeholder="Buscar ATM..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={{ paddingHorizontal: 14 }}>
            <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {['all', ...banks].map((b) =>
          chip(b, b === 'all' ? 'Todos' : b, bank === b, () => onBankChange(b))
        )}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {STATUS_OPTIONS.map((s) =>
          chip(s.key, s.label, status === s.key, () => onStatusChange(s.key), s.color)
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#F3F4F6',
            borderRadius: 10,
            padding: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => onSortModeChange('proximity')}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: sortMode === 'proximity' ? '#fff' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: sortMode === 'proximity' ? '#2094F3' : '#6B7280' }}>
              Proximidade
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onSortModeChange('alphabetic')}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: sortMode === 'alphabetic' ? '#fff' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: sortMode === 'alphabetic' ? '#2094F3' : '#6B7280' }}>
              A-Z
            </Text>
          </TouchableOpacity>
        </View>
        {cities.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {['all', ...cities].map((c) =>
              chip(c, c === 'all' ? 'Todas cidades' : c, city === c, () => onCityChange(c))
            )}
          </ScrollView>
        )}
      </View>
    </View>
  )
}
