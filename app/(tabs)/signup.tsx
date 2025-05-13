import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://capstone-backend.onrender.com/api';  // Replace with your deployed backend URL

export default function SignupScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            // Store the token
            await AsyncStorage.setItem('userToken', data.token);
            
            Alert.alert('Success', 'Account created successfully');
            router.push('/intro');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'An error occurred');
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