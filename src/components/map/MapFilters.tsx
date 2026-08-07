import React from 'react'
import { View, TextInput, ScrollView, TouchableOpacity, Text } from 'react-native'
import type { ATMStatus, SortMode } from '../../hooks/useATMs'
import { CityDropdown } from './CityDropdown'
import { SegmentedControl } from '../ui/SegmentedControl'
import { AppIcon } from '../ui/AppIcon'
import { colors, shadows } from '@/theme/tokens'

interface MapFiltersProps {
  search: string
  onSearchChange: (text: string) => void
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
        paddingVertical: 7,
        borderRadius: 999,
        borderCurve: 'continuous',
        backgroundColor: selected ? colors.brand[500] : '#fff',
        gap: 6,
        borderWidth: 1,
        borderColor: selected ? colors.brand[500] : colors.border,
        ...(selected ? shadows.card : {}),
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
          backgroundColor: colors.surface,
          borderRadius: 999,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 14,
        }}
      >
        <AppIcon name="search" size={17} color={colors.text.tertiary} />
        <TextInput
          style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 10, fontSize: 15 }}
          placeholder="Buscar ATM, banco ou cidade..."
          placeholderTextColor={colors.text.tertiary}
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={{ padding: 2 }} hitSlop={10}>
            <AppIcon name="close-circle" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {STATUS_OPTIONS.map((s) =>
          chip(s.key, s.label, status === s.key, () => onStatusChange(s.key), s.color)
        )}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SegmentedControl
          options={[
            { key: 'proximity', label: 'Proximidade' },
            { key: 'alphabetic', label: 'A-Z' },
          ]}
          value={sortMode}
          onChange={onSortModeChange}
          style={{ flex: 1 }}
        />
        {cities.length > 0 && (
          <CityDropdown city={city} cities={cities} onCityChange={onCityChange} />
        )}
      </View>
    </View>
  )
}
