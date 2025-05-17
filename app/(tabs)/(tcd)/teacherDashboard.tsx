import { StyleSheet, Text, View, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { auth } from '../../utils/api'

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

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.welcomeText}>Welcome, {userName || 'Teacher'}</Text>
      <Text style={styles.subtitle}>Teacher's Main Dashboard</Text>
    </ScrollView>
  )
}

export default TeacherDashboard

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
})
 