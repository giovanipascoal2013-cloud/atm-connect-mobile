import React, { useCallback, useEffect, useRef } from 'react'
import { Animated, Easing, Image, StyleSheet, View } from 'react-native'
import LottieView from 'lottie-react-native'

interface AnimatedSplashProps {
  ready: boolean
  onFinish: () => void
}

const FADE_DURATION = 300
const SPEED = 1.33
// 60 frames @ 15fps = 4s; a speed 1.33 ~ 3s. Timeout de segurança ~3.5s.
const SAFETY_TIMEOUT_MS = 3500

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
    // Em builds release o onAnimationFinish pode falhar/disparar cedo; o fim
    // real é garantido pelo SAFETY_TIMEOUT_MS. Este log serve para confirmar
    // se o Lottie renderiza em release (ver logcat).
    console.log('[AnimatedSplash] onAnimationFinish', Date.now())
  }, [])

  // Trigger determinístico: a splash termina sempre após o timeout, nunca
  // dependendo de o Lottie renderizar em release.
  useEffect(() => {
    const timer = setTimeout(() => {
      animationEnded.current = true
      if (ready) startFade()
    }, SAFETY_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [ready, startFade])

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="auto">
      {/* Fallback estático: se o Lottie falhar em release, o logo continua visível */}
      <View style={styles.fallbackContainer}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.fallbackLogo}
          resizeMode="contain"
        />
      </View>
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
  fallbackContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLogo: {
    width: 200,
    height: 200,
  },
})