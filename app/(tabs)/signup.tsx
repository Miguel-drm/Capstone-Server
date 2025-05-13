import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { api, auth } from '../utils/api';

export default function SignupScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isServerAvailable, setIsServerAvailable] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkServerHealth();
    }, []);

    const checkServerHealth = async () => {
        try {
            const data = await api.health();
            setIsServerAvailable(data.status === 'healthy');
        } catch (error) {
            console.error('Server health check failed:', error);
            setIsServerAvailable(false);
        }
    };

    const validatePassword = (pass: string) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return regex.test(pass);
    };

    const handleSignup = async () => {
        if (!isServerAvailable) {
            Alert.alert('Error', 'Server is currently unavailable. Please try again later.');
            return;
        }

        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        // Password validation
        if (!validatePassword(password)) {
            Alert.alert('Error', 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            console.log('Attempting signup with:', { name, email });
            const data = await api.auth.signup(name, email, password);
            console.log('Signup response:', data);
            
            if (data.token && data.user) {
                Alert.alert('Success', 'Account created successfully');
                router.push('/intro');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error: any) {
            console.error('Signup Error:', error);
            if (error.message.includes('Network request failed')) {
                Alert.alert('Error', 'Unable to connect to the server. Please check your internet connection.');
            } else if (error.message.includes('Email already registered')) {
                Alert.alert('Error', 'This email is already registered. Please use a different email or try logging in.');
            } else {
                Alert.alert('Error', error.message || 'An error occurred during signup');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Signup</Text>
            <Text style={styles.subtitle}>Create your account.</Text>
            <Text style={styles.label}>NAME</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#888"
                value={name}
                onChangeText={setName}
            />
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
            <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#888"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor="#888"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />
            <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]} 
                onPress={handleSignup}
                disabled={isLoading}
            >
                <Text style={styles.buttonText}>
                    {isLoading ? 'Signing up...' : 'Sign up'}
                </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                <Text style={styles.link}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text style={styles.link}>Log in</Text>
                </TouchableOpacity>
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