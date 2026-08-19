import React, { useCallback, useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import LottieView from 'lottie-react-native'

interface AnimatedSplashProps {
  ready: boolean
  onFinish: () => void
}

const FADE_DURATION = 300
const SPEED = 1.33

export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const opacity = useRef(new Animated.Value(1)).current
  const animationEnded = useRef(false)
  const fadeStarted = useRef(false)

  const startFade = useCallback(() => {
    if (fadeStarted.current) return
    fadeStarted.current = true
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => onFinish())
  }, [opacity, onFinish])

  useEffect(() => {
    if (ready && animationEnded.current) startFade()
  }, [ready, startFade])

  const handleAnimationFinish = useCallback(() => {
    animationEnded.current = true
    if (ready) startFade()
  }, [ready, startFade])

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="auto">
      <LottieView
        source={require('../../../assets/animations/logo.json')}
        style={StyleSheet.absoluteFill}
        autoPlay
        loop={false}
        speed={SPEED}
        resizeMode="cover"
        onAnimationFinish={handleAnimationFinish}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
})