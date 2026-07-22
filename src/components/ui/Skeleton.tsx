import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: object
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  )
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={10} height={10} borderRadius={5} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={40} height={12} />
      </View>
      <Skeleton width="100%" height={12} style={{ marginTop: 10 }} />
      <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
    </View>
  )
}

export function SkeletonMap() {
  return (
    <View style={styles.mapSkeleton}>
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} width={28} height={28} borderRadius={14} style={{ position: 'absolute', top: `${20 + i * 15}%`, left: `${15 + i * 18}%` }} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapSkeleton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
})
