import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';

export default function IntroScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={ styles.container }>
                <Image source={require('../../assets/images/App-Logo/logo-transparent.png')} style={[styles.logo, { marginBottom: -70 }]} />
                <Text style={styles.message}>
                    Reading is the key to learning and we're here to help unlock every child's potential.
                </Text>
            </View>
            <View style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 15, marginBottom: 20, width: '100%' }}>
                <TouchableOpacity style={[styles.button, styles.SignupButton]} onPress={() => router.push('/signup')}>
                    <Text style={[styles.buttonText]}>Register</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
                    <Text style={styles.buttonText}>Login</Text>
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
        paddingHorizontal: 25,
    },
    logo: {
        width: 400,
        height: 400,
    },
    message: {
        fontSize: 24,
        color: Colors.dark.text,
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
        fontStyle: 'italic',
    },
    button: {
        height: 70,
        width: '50%',
        backgroundColor: '#111',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    SignupButton: {
        backgroundColor: 'transparent',
        borderWidth: 3,
        borderColor: '#2e2e2e',
    },
    buttonText: {
        color: Colors.dark.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
}); 