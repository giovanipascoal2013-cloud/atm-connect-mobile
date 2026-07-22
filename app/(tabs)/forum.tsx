import { useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { useForum, type ForumPost } from '../../src/hooks/useForum'
import { PostCard } from '../../src/components/forum/PostCard'
import { ProvinceSelector } from '../../src/components/forum/ProvinceSelector'
import { useAuth } from '../../src/hooks/useAuth'

export default function ForumScreen() {
  const { profile } = useAuth()
  const [provincia, setProvincia] = useState(profile?.provincia || 'Luanda')
  const { posts, loading, refetch } = useForum(provincia)

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ProvinceSelector selected={provincia} onSelect={setProvincia} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#10B981" />}
      >
        {posts.length === 0 && !loading ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>💬</Text>
            <Text style={{ color: '#6B7280', textAlign: 'center' }}>
              Nenhum post em {provincia} nas últimas 48h
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </ScrollView>
    </View>
  )
}
