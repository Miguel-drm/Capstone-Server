import { StyleSheet, Text, View } from 'react-native';
import React from 'react';

const ExportDataScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export Data</Text>
      <Text style={styles.subtitle}>This is where you will export data.</Text>
      {/* Add your data export UI elements here */}
    </View>
  );
};

export default ExportDataScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 