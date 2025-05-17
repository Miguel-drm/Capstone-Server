import { StyleSheet, Text, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { Stack } from 'expo-router';

const AdminDashboard = () => {
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    setAdminName('Admin');
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.welcomeText}>Welcome, {adminName || 'Admin'}</Text>
      <Text style={styles.subtitle}>Admin's Main Dashboard</Text>
    </ScrollView>
  );
};

export default AdminDashboard;

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export const screenOptions = {
  headerShown: false,
};