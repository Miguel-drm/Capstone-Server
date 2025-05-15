import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, Animated, Easing } from 'react-native';
import { Redirect } from 'expo-router';
import Colors from '@/constants/Colors';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 = centered

  useEffect(() => {
    // Simulate a loading delay
    const timer = setTimeout(() => {
      // Start slide left animation
      Animated.timing(slideAnim, {
        toValue: -1500, // slide left by 500px
        duration: 500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setIsLoading(false);
        setShouldRedirect(true);
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [slideAnim]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <Image source={require('@/assets/images/App-Logo/logo-transparent.png')} style={{ width: 330, height: 330 }} resizeMode="contain" />
        </Animated.View>
      </View>
    );
  }

  if (shouldRedirect) {
    return <Redirect href="/intro" />;
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: Colors.dark.text,
  },
}); 