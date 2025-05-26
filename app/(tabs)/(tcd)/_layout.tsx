import { router, usePathname } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View, Animated, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import Colors from '../../../constants/Colors';
import React, { useState, useEffect, useRef } from 'react';
import { api, auth } from '../../utils/api';
import { Slot } from 'expo-router';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
}

export default function TcdLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');
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
    const fetchUserData = async () => {
      try {
        const userData = await auth.getUser();
        if (userData && userData.name) {
          setUserName(userData.name);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, []);

  const menuItems: MenuItem[] = [
    { icon: 'home-outline', label: 'Dashboard', route: '/(tabs)/teacherDashboard' },
    { icon: 'book-outline', label: 'Reading', route: '/(tabs)/(tcd)/reading' },
    { icon: 'chatbubble-outline', label: 'Chat', route: '/(tabs)/(tcd)/chat' },
    { icon: 'list-outline', label: 'Class List', route: '/(tabs)/(tcd)/classlist' },
    { icon: 'create-outline', label: 'Make a Test', route: '/(tabs)/(tcd)/Test' },
    { icon: 'download-outline', label: 'Export Data', route: '/(tabs)/(tcd)/exportData' },
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isDashboard = pathname === '/(tabs)/teacherDashboard';

  return (
    <SafeAreaView style={styles.container}>
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarTitleContainer}>
            <Text style={styles.sidebarTitle}>Teacher Portal</Text>
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
                onPress={() => {
                  router.push(item.route);
                  setSidebarOpen(false);
                }}
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
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Teacher Portal</Text>
        </View>
        {isDashboard ? (
          <ScrollView style={styles.content}>
            <Text style={styles.welcomeText}>Welcome, {userName || 'Teacher'}</Text>
            
            {/* Shortcuts Grid */}
            <View style={styles.shortcutsContainer}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <View style={styles.shortcutsGrid}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.shortcutCard}
                    onPress={() => {
                      router.push(item.route);
                      setSidebarOpen(false);
                    }}
                  >
                    <View style={styles.shortcutIconContainer}>
                      <Ionicons name={item.icon} size={32} color="#4A90E2" />
                    </View>
                    <Text style={styles.shortcutLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.content}>
            <Slot />
          </View>
        )}
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
    padding: 20,
    backgroundColor: '#fff',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  shortcutsContainer: {
    marginTop: 20,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 15,
  },
  shortcutIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shortcutLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
}); 