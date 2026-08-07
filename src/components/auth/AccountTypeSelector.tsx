import { View, Text, TouchableOpacity } from 'react-native'
import { AppIcon, type AppIconName } from '../ui/AppIcon'

export type AccountType = 'user' | 'agent'

interface Props {
  value: AccountType
  onChange: (v: AccountType) => void
}

export function AccountTypeSelector({ value, onChange }: Props) {
  const options: { type: AccountType; icon: AppIconName; title: string; subtitle: string }[] = [
    { type: 'user', icon: 'person', title: 'Sou Cliente', subtitle: 'Quero consultar ATMs com dinheiro' },
    { type: 'agent', icon: 'briefcase', title: 'Sou Agente', subtitle: 'Quero registar ATMs e ganhar' },
  ]

  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 mb-1">Tipo de conta</Text>
      <View className="flex-row gap-3">
        {options.map((opt) => {
          const selected = value === opt.type
          return (
            <TouchableOpacity
              key={opt.type}
              onPress={() => onChange(opt.type)}
              className={`flex-1 rounded-xl border p-4 ${selected ? 'border-brand-500 bg-brand-50' : 'border-gray-300 bg-white'}`}
            >
              <View
                className={`h-11 w-11 rounded-full items-center justify-center ${selected ? 'bg-brand-500' : 'bg-gray-100'}`}
              >
                <AppIcon name={opt.icon} size={22} color={selected ? '#fff' : '#9CA3AF'} />
              </View>
              <Text className={`mt-2 text-sm font-semibold ${selected ? 'text-brand-700' : 'text-gray-800'}`}>
                {opt.title}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">{opt.subtitle}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
