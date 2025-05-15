import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, useColorScheme, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from './Colors';

const ICONS: Record<'success' | 'error' | 'info', { name: string; color: string }> = {
  success: { name: 'checkmark-circle', color: '#4BB543' },
  error: { name: 'close-circle', color: '#FF3B30' },
  info: { name: 'information-circle', color: '#2f95dc' },
};

type CustomModalProps = {
  visible: boolean;
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
  duration?: number; // in milliseconds
};

export default function CustomModal({
  visible,
  type = 'info',
  message,
  onClose,
  duration = 1800, // slightly longer for smoothness
}: CustomModalProps) {
  const scheme = useColorScheme() || 'dark';
  const colorSet = Colors[scheme] || Colors.dark;
  const icon = ICONS[type] || ICONS.info;

  // Animation setup
  const slideAnim = useRef(new Animated.Value(100)).current; // Start 100px below
  const opacityAnim = useRef(new Animated.Value(0)).current; // Start transparent

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 100,
            duration: 350,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => onClose());
      }, duration);
      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(100);
      opacityAnim.setValue(0);
    }
  }, [visible, duration, onClose, slideAnim, opacityAnim]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: colorSet.background,
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Ionicons name={icon.name as keyof typeof Ionicons.glyphMap} size={56} color={icon.color} style={{ marginBottom: 12 }} />
          <Text style={[styles.message, { color: colorSet.text }]}>{message}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    width: 300,
    borderRadius: 16,
    alignItems: 'center',
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
}); 