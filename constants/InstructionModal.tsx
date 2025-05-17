import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, useColorScheme, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from './Colors';

type InstructionModalProps = {
  visible: boolean;
  message: string;
  onClose: () => void;
};

export default function InstructionModal({
  visible,
  message,
  onClose,
}: InstructionModalProps) {
  const scheme = useColorScheme() || 'dark';
  const colorSet = Colors[scheme] || Colors.dark;

  // Animation setup
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

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
    } else {
      slideAnim.setValue(100);
      opacityAnim.setValue(0);
    }
  }, [visible, slideAnim, opacityAnim]);

  const handleClose = () => {
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
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
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
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={24} color={colorSet.text} />
          </TouchableOpacity>
          <Ionicons name="information-circle" size={56} color="#2f95dc" style={{ marginBottom: 12 }} />
          <Text style={[styles.message, { color: colorSet.text }]}>{message}</Text>
        </Animated.View>
      </TouchableOpacity>
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
    width: 350,
    maxHeight: '80%',
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
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
}); 