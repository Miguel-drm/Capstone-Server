import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { api } from '../utils/api';
import Colors from '@/constants/Colors';

export default function SignupScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isServerAvailable, setIsServerAvailable] = useState(false);

    useEffect(() => {
        checkServerHealth();
    }, []);

    const checkServerHealth = async () => {
        try {
            console.log('Checking server health...');
            const data = await api.health();
            console.log('Server health response:', data);
            setIsServerAvailable(data.status === 'ok');
        } catch (error) {
            console.error('Server health check failed:', error);
            setIsServerAvailable(false);
        }
    };

    const validateInputs = () => {
        console.log('Validating inputs...');
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('Password length:', password.length);

        if (!name.trim()) {
            Alert.alert('Error', 'Please enter your name');
            return false;
        }
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return false;
        }
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return false;
        }
        return true;
    };

    const handleSignup = async () => {
        console.log('Signup button clicked');
        console.log('Server available:', isServerAvailable);

        if (!isServerAvailable) {
            Alert.alert('Error', 'Server is currently unavailable. Please try again later.');
            return;
        }

        try {
            if (!validateInputs()) {
                console.log('Input validation failed');
                return;
            }

            setLoading(true);
            console.log('Starting signup process...');

            // First test the database connection
            try {
                console.log('Testing database connection...');
                const dbTest = await api.test.db();
                console.log('Database test result:', dbTest);
            } catch (error) {
                console.error('Database test failed:', error);
                Alert.alert('Error', 'Unable to connect to the database. Please try again later.');
                return;
            }

            // Proceed with actual signup
            console.log('Proceeding with signup...');
            console.log('Sending signup request with data:', {
                name,
                email,
                password: '***' // Don't log actual password
            });

            const response = await api.auth.signup(name, email, password);
            console.log('Signup response:', response);

            Alert.alert('Success', 'Account created successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        console.log('Navigating to login screen...');
                        router.replace('/login');
                    }
                }
            ]);
        } catch (error) {
            console.error('Signup error:', error);
            console.error('Error details:', {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to create account. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started.</Text>
            
            <Text style={styles.label}>NAME</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#888"
                value={name}
                onChangeText={(text) => {
                    console.log('Name changed:', text);
                    setName(text);
                }}
                autoCapitalize="words"
                editable={!loading}
            />
            
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#888"
                value={email}
                onChangeText={(text) => {
                    console.log('Email changed:', text);
                    setEmail(text);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
            />
            
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={(text) => {
                    console.log('Password changed (length):', text.length);
                    setPassword(text);
                }}
                secureTextEntry
                editable={!loading}
            />

            <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.dark.text} />
                ) : (
                    <Text style={styles.buttonText}>Sign Up</Text>
                )}
            </TouchableOpacity>

            <View style={styles.linkContainer}>
                <Text style={styles.link}>Already have an account? </Text>
                <TouchableOpacity 
                    onPress={() => router.replace('/login')}
                    disabled={loading}
                >
                    <Text style={styles.link}>Login</Text>
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
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: Colors.dark.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    },
    link: {
        color: Colors.dark.tint,
        fontSize: 15,
        marginTop: 4,
    },
}); 