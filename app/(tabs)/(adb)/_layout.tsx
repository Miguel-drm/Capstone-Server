import { router, usePathname, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View, Animated, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import Colors from '../../../constants/Colors';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../utils/api';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
};

export default function AdbLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const slideAnim = useRef(new Animated.Value(-250)).current;
  const pathname = usePathname();


  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isSidebarOpen ? 0 : -250,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen]);

  useEffect(() => {
    setAdminName('Admin');
  }, []);

  const menuItems: MenuItem[] = [
    { icon: 'home-outline', label: 'Dashboard', route: '/(tabs)/adminDashboard' },
    { icon: 'book-outline', label: 'Add Stories', route: '/(tabs)/(adb)/addStories' },
    { icon: 'log-out-outline', label: 'Logout', route: '/login' },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleMenuPress = async (item: MenuItem) => {
    if (item.label === 'Logout') {
      try {
        await api.auth.logout();
        router.replace('/login');
      } catch (error) {
        console.error('Logout error:', error);
      }
    } else {
      router.push(item.route);
      setSidebarOpen(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}> 
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarTitleContainer}>
            <Text style={styles.sidebarTitle}>Admin Portal</Text>
          </View>
          <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            const isActive = pathname === item.route;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, isActive && styles.activeMenuItem]}
                onPress={() => handleMenuPress(item)}
              >
                <Ionicons 
                  name={item.icon} 
                  size={24} 
                  color={isActive ? '#4A90E2' : '#fff'} 
                />
                <Text style={[styles.menuText, isActive && styles.activeMenuText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Portal</Text>
        </View>
        <View style={styles.content}>
          <Stack>
            <Stack.Screen name="adminDashboard" options={{ headerShown: false }} />
            <Stack.Screen name="addStories" options={{ headerShown: false }} />
          </Stack>
        </View>
      </View>
    </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 250,
    backgroundColor: '#4A90E2',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sidebarHeader: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitleContainer: {
    flex: 1,
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  activeMenuText: {
    color: '#fff',
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  menuButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#333',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 