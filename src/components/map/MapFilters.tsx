import React from 'react'
import { View, TextInput, ScrollView, TouchableOpacity, Text } from 'react-native'

const BANKS = ['all', 'BFA', 'BAI', 'BIC', 'Millennium', 'Solo', 'Atlantico', 'Equatorial', 'Keve']

type ATMStatus = 'cash' | 'no_cash' | 'offline' | 'locked'

interface MapFiltersProps {
  search: string
  onSearchChange: (text: string) => void
  bank: string
  onBankChange: (bank: string) => void
  status: ATMStatus | 'all'
  onStatusChange: (status: ATMStatus | 'all') => void
}

export function MapFilters({ search, onSearchChange, bank, onBankChange, status, onStatusChange }: MapFiltersProps) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 8,
        left: 12,
        right: 12,
        zIndex: 10,
      }}
    >
      <View
        style={{
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
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
          }}
          placeholder="Buscar ATM..."
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 8 }}
        contentContainerStyle={{ gap: 6 }}
      >
        {BANKS.map((b) => (
          <TouchableOpacity
            key={b}
            onPress={() => onBankChange(b)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: bank === b ? '#10B981' : '#fff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: bank === b ? '#fff' : '#374151',
              }}
            >
              {b === 'all' ? 'Todos' : b}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 6 }}
        contentContainerStyle={{ gap: 6 }}
      >
        {[
          { key: 'all', label: 'Todos' },
          { key: 'cash', label: 'Com dinheiro', color: '#34A853' },
          { key: 'no_cash', label: 'Sem dinheiro', color: '#EA4335' },
          { key: 'offline', label: 'Offline', color: '#7F8C8D' },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => onStatusChange(s.key as ATMStatus | 'all')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 14,
              backgroundColor: status === s.key ? '#10B981' : '#fff',
              gap: 4,
            }}
          >
            {s.color && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: s.color,
                }}
              />
            )}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: status === s.key ? '#fff' : '#6B7280',
              }}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}
