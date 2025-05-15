import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle, StyleProp } from 'react-native';

// Fade Transition
export function FadeTransition({ in: show, duration = 400, style, children }: { in: boolean; duration?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(show ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: show ? 1 : 0,
      duration,
      useNativeDriver: true,
    }).start();
  }, [show, duration, opacity]);
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
}

// Slide Left Transition
export function SlideLeftTransition({ in: show, duration = 400, style, children }: { in: boolean; duration?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const translateX = useRef(new Animated.Value(show ? 0 : 500)).current;
  useEffect(() => {
    Animated.timing(translateX, {
      toValue: show ? 0 : -500,
      duration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [show, duration, translateX]);
  return <Animated.View style={[{ transform: [{ translateX }] }, style]}>{children}</Animated.View>;
}

// Slide Out Left Transition (like index.tsx)
export function SlideOutLeftTransition({ start, duration = 500, style, children, onEnd }: { start: boolean; duration?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode; onEnd?: () => void }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (start) {
      Animated.timing(slideAnim, {
        toValue: -500,
        duration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (onEnd) onEnd();
      });
    } else {
      slideAnim.setValue(0);
    }
  }, [start, duration, slideAnim, onEnd]);
  return <Animated.View style={[{ transform: [{ translateX: slideAnim }] }, style]}>{children}</Animated.View>;
}

// Slide Right Transition
export function SlideRightTransition({ in: show, duration = 400, style, children }: { in: boolean; duration?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const translateX = useRef(new Animated.Value(show ? 0 : -500)).current;
  useEffect(() => {
    Animated.timing(translateX, {
      toValue: show ? 0 : 500,
      duration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [show, duration, translateX]);
  return <Animated.View style={[{ transform: [{ translateX }] }, style]}>{children}</Animated.View>;
}

// Scale Transition
export function ScaleTransition({ in: show, duration = 400, style, children }: { in: boolean; duration?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(show ? 1 : 0.8)).current;
  const opacity = useRef(new Animated.Value(show ? 1 : 0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: show ? 1 : 0.8,
        duration,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: show ? 1 : 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [show, duration, scale, opacity]);
  return <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>{children}</Animated.View>;
} 