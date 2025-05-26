import { StyleSheet, Text, View, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { auth } from '../../utils/api'
import { Ionicons } from '@expo/vector-icons';

const TeacherDashboard = () => {
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await auth.getUser()
        if (userData && userData.name) {
          setUserName(userData.name)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }
    fetchUserData()
  }, [])

  // Placeholder data - replace with actual fetched data
  const dashboardMetrics = [
    { label: 'Total Students', value: '-', icon: 'people' }, // Replace '-' with actual count
    { label: 'Avg. Reading Score', value: '-', icon: 'stats-chart' }, // Replace '-' with actual average score
    // Add more relevant metrics here
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.welcomeText}>Welcome, {userName || 'Teacher'}!</Text>
      <Text style={styles.subtitle}>Your Dashboard Overview</Text>

      {/* Metrics Section (Placeholder) */}
      <View style={styles.metricsContainer}>
        {dashboardMetrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <Ionicons name={metric.icon as any} size={24} color="#4A90E2" />
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions Section */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        {/* Make a Test Button (Placeholder) */}
        <View style={[styles.actionButton, { borderBottomWidth: 1, borderBottomColor: '#eee' }]}>
          <Ionicons name="create" size={24} color="#28A745" />
          <Text style={styles.actionButtonText}>Make a Test</Text>
        </View>

        {/* Export Data Button (Placeholder) */}
        <View style={[styles.actionButton, { borderBottomWidth: 1, borderBottomColor: '#eee' }]}>
          <Ionicons name="download" size={24} color="#007BFF" />
          <Text style={styles.actionButtonText}>Export Data</Text>
        </View>

        {/* Add other relevant quick actions here, e.g., Manage Students */}
         <View style={styles.actionButton}>
          <Ionicons name="people" size={24} color="#17A2B8" />
          <Text style={styles.actionButtonText}>Manage Students</Text>
        </View>

      </View>

      {/* Recent Activity/Notifications Section (Placeholder) */}
      {/* You can add a section here to show recent student activity, completed readings, etc. */}
      <View style={styles.recentActivityContainer}>
         <Text style={styles.sectionTitle}>Recent Activity</Text>
         <Text style={styles.placeholderText}>Recent student activity will appear here.</Text>
      </View>

    </ScrollView>
  )
}

export default TeacherDashboard

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 30,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    width: '100%',
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 5,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 30,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 18,
    color: '#555',
    marginLeft: 10,
  },
   recentActivityContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: '100%',
     shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholderText: {
     fontSize: 16,
     color: '#999',
     textAlign: 'center',
     paddingVertical: 20,
  }
})
 