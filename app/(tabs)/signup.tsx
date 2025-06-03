import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { api } from '../utils/api';
import Colors from '@/constants/Colors';
import CustomModal from '@/constants/CustomModal';

export default function SignupScreen() {
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isServerAvailable, setIsServerAvailable] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
    const [modalMessage, setModalMessage] = useState('');

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
        if (!name.trim()) {
            setModalType('error');
            setModalMessage('Please enter your name');
            setModalVisible(true);
            return false;
        }
        if (!surname.trim()) {
            setModalType('error');
            setModalMessage('Please enter your surname');
            setModalVisible(true);
            return false;
        }
        if (!email.trim()) {
            setModalType('error');
            setModalMessage('Please enter your email');
            setModalVisible(true);
            return false;
        }
        // Email format validation
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            setModalType('error');
            setModalMessage('Please enter a valid email address');
            setModalVisible(true);
            return false;
        }
        if (!password) {
            setModalType('error');
            setModalMessage('Please enter your password');
            setModalVisible(true);
            return false;
        }
        if (password.length < 6) {
            setModalType('error');
            setModalMessage('Password must be at least 6 characters long');
            setModalVisible(true);
            return false;
        }
        return true;
    };

    const handleSignup = async () => {
        console.log('Signup button clicked');
        console.log('Server available:', isServerAvailable);

        if (!isServerAvailable) {
            setModalType('error');
            setModalMessage('Server is currently unavailable. Please try again later.');
            setModalVisible(true);
            return;
        }

        try {
            if (!validateInputs()) {
                return;
            }

            setLoading(true);
            console.log('Starting signup process...');

            // First test the database connection
            try {
                console.log('Testing database connection...');
                const dbTest = await api.tests.getAll();
                console.log('Database test result:', dbTest);
            } catch (error) {
                console.error('Database test failed:', error);
                setModalType('error');
                setModalMessage('Unable to connect to the database. Please try again later.');
                setModalVisible(true);
                return;
            }

            // Proceed with actual signup
            console.log('Proceeding with signup...');
            console.log('Sending signup request with data:', {
                name,
                surname,
                email,
                password: '***' // Don't log actual password
            });

            const response = await api.auth.signup(name, surname, email, password);
            console.log('Signup response:', response);

            setModalType('success');
            setModalMessage('Account created successfully!');
            setModalVisible(true);
            setTimeout(() => {
                setModalVisible(false);
                router.replace('/login');
            }, 1200);
        } catch (error) {
            let userMessage = 'Signup failed. Please try again.';
            if (error instanceof Error && error.message) {
                userMessage = error.message;
            }
            setModalType('error');
            setModalMessage(userMessage);
            setModalVisible(true);
        } finally {
            setLoading(false);
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started1111.</Text>
            
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

            <Text style={styles.label}>SURNAME</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter your surname"
                placeholderTextColor="#888"
                value={surname}
                onChangeText={(text) => {
                    console.log('Surname changed:', text);
                    setSurname(text);
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