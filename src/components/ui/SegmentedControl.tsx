import React from 'react'
import { View, Text, Pressable, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, shadows } from '@/theme/tokens'

interface SegmentedOption<T extends string> {
  key: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (key: T) => void
  style?: StyleProp<ViewStyle>
}

export function SegmentedControl<T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: '#F1F3F5',
          borderRadius: radius.pill,
          padding: 3,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.key === value
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={{
              flex: 1,
              paddingVertical: 7,
              paddingHorizontal: 12,
              borderRadius: radius.pill,
              backgroundColor: active ? '#FFFFFF' : 'transparent',
              ...(active ? shadows.card : {}),
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                textAlign: 'center',
                color: active ? colors.brand[600] : colors.text.secondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
