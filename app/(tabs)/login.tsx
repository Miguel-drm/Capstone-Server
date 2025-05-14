import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { api, auth } from '../utils/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isServerAvailable, setIsServerAvailable] = useState(false);
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
      Alert.alert('Error', 'Server is currently unavailable. Please try again later.');
      return;
    }

    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.auth.login(email, password);
      
      // Store the token and user data
      await auth.getToken();
      if (data.user) {
        await auth.getUser();
      }
      
      Alert.alert('Success', 'Logged in successfully');
      router.push('/intro');
    } catch (error: any) {
      console.error('Login Error:', error);
      if (error.message.includes('Network request failed')) {
        Alert.alert('Error', 'Unable to connect to the server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error.message || 'An error occurred during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
          {isLoading ? 'Logging in...' : 'Log in'}
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