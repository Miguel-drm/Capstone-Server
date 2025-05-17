import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '@/constants/Colors';
import CustomModal from '@/constants/CustomModal';
import InstructionModal from '@/constants/InstructionModal';
import { api, API_URL } from '../../utils/api';    

interface Student {
  _id: string;  // MongoDB's _id field
  name: string;
  surname: string;
  grade: string;
}

interface StudentGroup {
  importBatchId: string;
  students: Student[];
}

export default function ClassListScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalType, setAlertModalType] = useState<'success' | 'error' | 'info'>('info');
  const [alertModalMessage, setAlertModalMessage] = useState('');
  const [instructionModalVisible, setInstructionModalVisible] = useState(false);
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching students from:', `${API_URL}/upload/students`);
      
      const response = await fetch(`${API_URL}/upload/students`);
      console.log('Response status:', response.status);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch students');
      }

      console.log('Fetched students:', data.students);
      setStudents(data.students);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setAlertModalType('error');
      setAlertModalMessage(error.message || 'Failed to fetch students. Please try again.');
      setAlertModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          'application/excel',
          'application/x-excel',
          'application/x-msexcel'
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setLoading(true);
      console.log('Selected file details:', {
        name: result.assets[0].name,
        type: result.assets[0].mimeType,
        size: result.assets[0].size,
        uri: result.assets[0].uri
      });

      // Create form data
      const formData = new FormData();
      
      // Create a blob from the file
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      
      // Append the file to formData
      formData.append('file', blob, result.assets[0].name);

      console.log('FormData created:', {
        hasFile: formData.has('file'),
        fileName: result.assets[0].name
      });

      // Make the request
      console.log('Sending request to:', `${API_URL}/upload/upload`);
      const uploadResponse = await fetch(`${API_URL}/upload/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Response status:', uploadResponse.status);
      console.log('Response headers:', JSON.stringify(uploadResponse.headers));

      // Get response text first
      const responseText = await uploadResponse.text();
      console.log('Raw response:', responseText);

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}...`);
      }

      if (!uploadResponse.ok) {
        throw new Error(data.message || 'Failed to upload file');
      }

      setAlertModalType('success');
      setAlertModalMessage(`Successfully imported ${data.newStudentsCount} students!`);
      setAlertModalVisible(true);

      // Refresh the student list
      fetchStudents();
    } catch (error: any) {
      console.error('Upload error:', error);
      setAlertModalType('error');
      setAlertModalMessage(error.message || 'Failed to import Excel file. Please try again.');
      setAlertModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const showExcelInfo = () => {
    setInstructionModalVisible(true);
  };

  const renderStudentItem = ({ item }: { item: Student }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name} {item.surname}</Text>
      </View>
      <View style={styles.gradeContainer}>
        <Text style={styles.grade}>{item.grade}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  const groups = students.reduce((groups: StudentGroup[], student: Student) => {
    if (!groups.some(g => g.importBatchId === student.grade)) {
      groups.push({ importBatchId: student.grade, students: [student] });
    } else {
      const group = groups.find(g => g.importBatchId === student.grade);
      if (group) {
        group.students.push(student);
      }
    }
    return groups;
  }, []);

  return (
    <View style={styles.container}>
      <CustomModal
        visible={alertModalVisible}
        type={alertModalType}
        message={alertModalMessage}
        onClose={() => setAlertModalVisible(false)}
        duration={2000}
      />

      <InstructionModal
        visible={instructionModalVisible}
        message={
          'Excel File Structure Guide:\n\n' +
          '1. Required Columns:\n' +
          '   - Name\n' +
          '   - Surname\n' +
          '   - Grade\n\n' +
          '2. File Format:\n' +
          '   - .xlsx or .xls files only\n' +
          '   - First row should contain headers\n' +
          '   - No empty rows between data\n\n' +
          '3. Data Format:\n' +
          '   - Grade must be one of: Grade 1, Grade 2, Grade 3, or Grade 4\n' +
          '   - Names should not contain special characters\n\n'
        }
        onClose={() => setInstructionModalVisible(false)}
      />

      <View style={styles.header}>
        <Text style={styles.title}>Class List</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={showExcelInfo}
          >
            <Ionicons name="information-circle-outline" size={24} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleExcelImport}
          >
            <Ionicons name="document-attach-outline" size={24} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={fetchStudents}
          >
            <Ionicons name="refresh" size={24} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={item => item.importBatchId}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item: group }) => (
          <View key={group.importBatchId} style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownHeader}
              onPress={() => setOpenBatchId(openBatchId === group.importBatchId ? null : group.importBatchId)}
            >
              <Text style={styles.dropdownTitle}>Class: {group.importBatchId}</Text>
              <Ionicons
                name={openBatchId === group.importBatchId ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.light.tint}
              />
            </TouchableOpacity>
            {openBatchId === group.importBatchId && (
              <View style={styles.dropdownContentScroll}>
                <FlatList
                  data={group.students}
                  keyExtractor={student => student._id}
                  renderItem={({ item: student }) => (
                    <View key={student._id} style={styles.studentCard}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.name} {student.surname}</Text>
                      </View>
                      <View style={styles.gradeContainer}>
                        <Text style={styles.grade}>{student.grade}</Text>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No students found</Text>
                    </View>
                  }
                />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  refreshButton: {
    padding: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  studentCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  gradeContainer: {
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  grade: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
  },
  dropdownContainer: {
    marginBottom: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  dropdownContentScroll: {
    maxHeight: 300, // Adjust as needed
    overflow: 'scroll',
    backgroundColor: '#f7fbff',
    padding: 8,
  },
}); 