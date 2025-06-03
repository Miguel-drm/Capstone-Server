import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';

interface Student {
  id: string;
  name: string;
  surname: string;
  grade: string;
}

const ExportDataScreen = () => {
  const [dataType, setDataType] = useState('test');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedExportType, setSelectedExportType] = useState('individual');

  const gradeLevels = [
    { label: 'Grade 1', value: 'Grade 1' },
    { label: 'Grade 2', value: 'Grade 2' },
    { label: 'Grade 3', value: 'Grade 3' },
    { label: 'Grade 4', value: 'Grade 4' },
  ];

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const url = selectedGrade 
          ? `http://localhost:5000/api/students?grade=${selectedGrade}`
          : 'http://localhost:5000/api/students';
        const response = await fetch(url);
        const data = await response.json();
        setStudents(data);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, [selectedGrade]);

  const handleExport = () => {
    console.log('Exporting data...', { 
      dataType, 
      selectedStudent,
      selectedGrade,
      exportType: selectedExportType 
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export Data</Text>
      <Text style={styles.subtitle}>Select options and export your data.</Text>

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Export Type:</Text>
        <Picker
          selectedValue={selectedExportType}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedExportType(itemValue)}
        >
          <Picker.Item label="Individual Student" value="individual" />
          <Picker.Item label="Entire Class" value="class" />
        </Picker>
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Grade Level:</Text>
        <Picker
          selectedValue={selectedGrade}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedGrade(itemValue)}
        >
          <Picker.Item label="Select Grade Level" value="" />
          {gradeLevels.map((grade) => (
            <Picker.Item key={grade.value} label={grade.label} value={grade.value} />
          ))}
        </Picker>
      </View>

      {selectedExportType === 'individual' && (
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Select Student:</Text>
          <Picker
            selectedValue={selectedStudent}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedStudent(itemValue)}
          >
            <Picker.Item label="Select a student" value="" />
            {students.map((student) => (
              <Picker.Item 
                key={student.id} 
                label={`${student.name} ${student.surname}`} 
                value={student.id} 
              />
            ))}
          </Picker>
        </View>
      )}

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Data Type:</Text>
        <Picker
          selectedValue={dataType}
          style={styles.picker}
          onValueChange={(itemValue) => setDataType(itemValue)}
        >
          <Picker.Item label="Test Data" value="test" />
          <Picker.Item label="Readings Data" value="readings" />
        </Picker>
      </View>

      <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
        <Text style={styles.exportButtonText}>Export Data</Text>
      </TouchableOpacity>
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
    marginBottom: 30,
  },
  pickerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  picker: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  exportButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 