import React from 'react';
import { Stack } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

const CustomTitle = () => (
  <Text style={styles.headerTitle}>Phil E-Read</Text>
);

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.dark.background,
        },
        headerTintColor: Colors.dark.text,
        headerBackVisible: false,
        headerBackButtonMenuEnabled: false,
        headerLeft: () => null,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          headerShown: true,
          headerTitle: () => <CustomTitle />,
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          headerShown: true,
          headerTitle: () => <CustomTitle />,
        }}
      />
      <Stack.Screen
        name="forgotPassword"
        options={{
          headerShown: true,
          headerTitle: () => <CustomTitle />,
        }}
      />
      <Stack.Screen
        name="ParentDashboard"
        options={{
          headerShown: false,
          headerTitle: () => <CustomTitle />,
        }}
      />
      <Stack.Screen
        name="AdminDashboard"
        options={{
          headerShown: false,
          headerTitle: () => <CustomTitle />,
        }}
      />
      <Stack.Screen
        name="teacherDashboard"
        options={{
          headerShown: false,
          headerTitle: () => <CustomTitle />,
        }}
      />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="intro" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    marginLeft: 15,
    color: Colors.dark.text,
  },
});
