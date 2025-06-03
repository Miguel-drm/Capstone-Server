import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { api, auth } from '../utils/api';
import CustomModal from '@/constants/CustomModal';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isServerAvailable, setIsServerAvailable] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
  const [modalMessage, setModalMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    try {
      const data = await api.health();
      setIsServerAvailable(data.status === 'ok');
    } catch (error) {
      console.error('Server health check failed:', error);
      setIsServerAvailable(false);
    }
  };
  
  const handleLogin = async () => {
    if (!isServerAvailable) {
      setModalType('error');
      setModalMessage('Server is currently unavailable. Please try again later.');
      setModalVisible(true);
      return;
    }
    if (!email || !password) {
      setModalType('error');
      setModalMessage('Please fill in all fields');
      setModalVisible(true);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModalType('error');
      setModalMessage('Please enter a valid email address');
      setModalVisible(true);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.auth.login(email, password);
      await auth.getToken();
      if (data.user) {
        await auth.getUser();
      }
      setModalType('success');
      setModalMessage('Login successful!');
      setModalVisible(true);
      setTimeout(() => {
        setModalVisible(false);
        if (data.user.role === 'admin') {
          router.replace('/adminDashboard');
        } else if (data.user.role === 'teacher') {
          router.replace('/teacherDashboard');
        } else if (data.user.role === 'parent') {
          router.replace('/ParentDashboard');
        }
      }, 1200);
    } catch (error: any) {
      console.error('Login Error:', error);
      let errorMessage = 'Something went wrong';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setModalType('error');
      if (errorMessage.includes('Network request failed')) {
        setModalMessage('Unable to connect to the server. Please check your internet connection.');
      } else {
        setModalMessage(errorMessage || 'An error occurred during login');
      }
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomModal
        visible={modalVisible}
        type={modalType}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Sign in to continue.</Text>
      <Text style={styles.label}>EMAIL</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.label}>PASSWORD</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Enter your password"
          placeholderTextColor="#888"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye' : 'eye-off'}
            size={24}
            color="#888"
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Logging in...' : 'Log on'}
        </Text>
      </TouchableOpacity>
      <View style={{ flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 10 }}>
        <TouchableOpacity onPress={() => router.push('/forgotPassword')}>
          <Text style={styles.link}>Forgot Password?</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 }}>
          <Text style={styles.link}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.link}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 32,
  },
  label: {
    alignSelf: 'flex-start',
    color: '#aaa',
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 12,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: '#23252B',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: Colors.dark.text,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#111',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  buttonText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  link: {
    color: Colors.dark.tint,
    fontSize: 15,
    marginTop: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23252B',
    borderRadius: 8,
    paddingHorizontal: 16,
    width: '100%',
    height: 48,
  },
  passwordInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
}); 