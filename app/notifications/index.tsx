import { useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, type ListRenderItem } from 'react-native'
import { useRouter } from 'expo-router'
import type { Href } from 'expo-router'
import { useInAppNotifications } from '../../src/hooks/useInAppNotifications'
import { useAuth } from '../../src/hooks/useAuth'
import { AppIcon, type AppIconName } from '../../src/components/ui/AppIcon'
import { AppButton } from '../../src/components/ui/AppButton'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { timeSince } from '../../src/lib/time'
import { colors } from '../../src/theme/tokens'
import type { Database } from '../../src/lib/supabase-types'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

const TYPE_META: Record<string, { icon: AppIconName; color: string; href: Href }> = {
  atm_approved: { icon: 'checkmark-circle', color: colors.money, href: '/(tabs)/agent' },
  atm_rejected: { icon: 'close-circle', color: colors.danger, href: '/(tabs)/agent' },
  subscription_approved: { icon: 'diamond', color: colors.brand[500], href: '/(tabs)/profile' },
  subscription_rejected: { icon: 'close-circle', color: colors.danger, href: '/(tabs)/profile' },
  withdrawal_approved: { icon: 'cash', color: colors.money, href: '/(tabs)/agent' },
  withdrawal_rejected: { icon: 'close-circle', color: colors.danger, href: '/(tabs)/agent' },
  view_commission: { icon: 'pricetag', color: colors.money, href: '/(tabs)/agent' },
  atm_rating: { icon: 'star', color: '#F59E0B', href: '/(tabs)/map' },
  referral_new: { icon: 'person-add', color: colors.brand[500], href: '/referrals' },
  forum_reply: { icon: 'chatbubbles', color: colors.brand[500], href: '/(tabs)/forum' },
}

const DEFAULT_META = { icon: 'notifications', color: colors.text.secondary, href: '/(tabs)/map' as Href }

export default function NotificationsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { notifications, loading, markRead, markAllRead, refetch } = useInAppNotifications()

  const handlePress = useCallback(
    (item: NotificationRow) => {
      void markRead(item.id)
      const meta = TYPE_META[item.type] ?? DEFAULT_META
      router.push(meta.href)
    },
    [markRead, router]
  )

  const renderItem: ListRenderItem<NotificationRow> = useCallback(
    ({ item }) => {
      const meta = TYPE_META[item.type] ?? DEFAULT_META
      return (
        <TouchableOpacity
          onPress={() => handlePress(item)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            backgroundColor: item.read ? '#FFFFFF' : colors.brand[50],
            borderRadius: 14,
            borderWidth: 1,
            borderColor: item.read ? colors.border : colors.brand[100],
            padding: 14,
            marginBottom: 10,
          }}
        >
          {!item.read && (
            <View style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand[500] }} />
          )}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: `${meta.color}1A`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary, flex: 1 }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 11, color: colors.text.tertiary, flexShrink: 0 }}>
                {timeSince(item.created_at)}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.text.secondary, marginTop: 3, lineHeight: 19 }}>
              {item.message}
            </Text>
          </View>
        </TouchableOpacity>
      )
    },
    [handlePress]
  )

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator size="large" color={colors.brand[500]} />
        <Text style={{ color: colors.text.secondary, marginTop: 12 }}>A carregar notificações...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingHorizontal: 32 }}>
        <EmptyState
          icon="notifications-outline"
          title="Inicia sessão"
          description="Entra para receberes notificações sobre os teus ATMs, views e levantamentos."
        />
        <AppButton label="Entrar" onPress={() => router.push('/(auth)/login')} icon="log-in-outline" />
      </View>
    )
  }

  const unread = notifications.filter((n) => !n.read).length

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      ListHeaderComponent={
        notifications.length > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
            {unread > 0 && (
              <AppButton label="Marcar tudo como lido" variant="ghost" size="sm" onPress={() => void markAllRead()} />
            )}
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="notifications-off-outline"
          title="Sem notificações"
          description="Quando houver novidades (aprovações, views, levantamentos), aparecem aqui."
        />
      }
      refreshControl={undefined}
      onRefresh={() => void refetch()}
      refreshing={loading}
    />
  )
}