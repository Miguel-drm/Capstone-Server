import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors'; // Assuming Colors is available
import { api, API_URL, getHeaders } from '../../utils/api'; // Import API_URL and getHeaders
import CustomModal from '@/constants/CustomModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types for test structure
interface TestQuestion {
  id: string;
  // Only short-answer type is supported now
  type: 'short-answer';
  questionText: string;
  correctAnswer?: string;
}

interface Test {
  _id: string;
  title: string;
  testType: 'pre' | 'post';
  studentId?: {
    _id: string;
    name: string;
    surname: string;
  };
  grade?: string;
  storyId?: {
    _id: string;
    title: string;
  };
  questions: Array<{
    type: string;
    questionText: string;
    correctAnswer: string;
  }>;
  createdAt: string;
}

const TestScreen = () => {
  const [testTitle, setTestTitle] = useState('');
  const [testType, setTestType] = useState<'pre' | 'post'>('pre'); // State for test type
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStory, setSelectedStory] = useState('');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  // newQuestionType state is no longer needed
  // const [newQuestionType, setNewQuestionType] = useState<TestQuestion['type'] | ''>('');

  // State for fetched data and loading
  const [students, setStudents] = useState<any[]>([]); // Use any[] for now based on API response
  const [grades, setGrades] = useState<string[]>([]);
  const [stories, setStories] = useState<any[]>([]); // Use any[] for now based on API response
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);

  // Add new state for modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
  const [modalMessage, setModalMessage] = useState('');

  // Add new state for tests
  const [tests, setTests] = useState<Test[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [isTestsExpanded, setIsTestsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch students
      try {
        const studentsData = await api.students.getAll();
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoadingStudents(false);
      }

      // Fetch grades
      try {
        const gradesData = await api.students.getGrades();
        setGrades(gradesData);
      } catch (error) {
        console.error('Error fetching grades:', error);
      } finally {
        setLoadingGrades(false);
      }

      // Fetch stories
      try {
        const storiesData = await api.stories.getAll();
        setStories(storiesData);
      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        setLoadingStories(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this runs once on mount

  // Fetch tests on component mount
  useEffect(() => {
    console.log('Component mounted, fetching tests...');
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      console.log('Starting to fetch tests...');
      setLoadingTests(true);
      setError(null);

      // Check if user is logged in
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No authentication token found');
        setError('Please log in to view tests');
        setTests([]);
        return;
      }
      
      const response = await api.tests.getAll();
      console.log('Raw API Response:', JSON.stringify(response, null, 2));

      if (response && response.success && Array.isArray(response.tests)) {
        console.log('Tests fetched successfully:', response.tests.length);
        setTests(response.tests);
      } else {
        console.error('Invalid response format:', response);
        setError(response?.message || 'Failed to load tests: Invalid response format');
        setTests([]);
      }
    } catch (error: any) {
      console.error('Error in fetchTests:', error);
      let errorMessage = 'Failed to load tests';
      
      if (error.message.includes('401')) {
        errorMessage = 'Please log in to view tests';
      } else if (error.message.includes('403')) {
        errorMessage = 'You do not have permission to view tests';
      } else if (error.message.includes('404')) {
        errorMessage = 'Tests endpoint not found';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error occurred';
      }
      
      setError(errorMessage);
      setTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  // Add useEffect to check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setError('Please log in to view tests');
      } else {
        fetchTests();
      }
    };
    
    checkAuth();
  }, []);

  // Add a useEffect to monitor tests state changes
  useEffect(() => {
    console.log('Tests state updated:', tests.length);
  }, [tests]);

  // Placeholder student and story data (remove now)
  // const placeholderStudents = [
  //   { _id: '1', name: 'Alice', surname: 'Smith' },
  //   { _id: '2', name: 'Bob', surname: 'Johnson' },
  // ];

  // const placeholderStories = [
  //   { _id: 'a', title: 'The Little Prince' },
  //   { _id: 'b', title: 'Pinocchio' },
  // ];

  // const placeholderGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'];

  // Add function to show modal
  const showModal = (type: 'success' | 'error' | 'info', message: string) => {
    setModalType(type);
    setModalMessage(message);
    setModalVisible(true);
  };

  const handleAddQuestion = () => {
    if (questions.length >= 20) {
      showModal('info', 'Maximum 20 questions allowed per test.');
      return;
    }
    const newQuestion: TestQuestion = {
      id: Date.now().toString(),
      type: 'short-answer',
      questionText: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleQuestionTextChange = (id: string, text: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, questionText: text } : q));
  };

  // Option handlers are no longer needed for short-answer
  // const handleOptionTextChange = (questionId: string, optionIndex: number, text: string) => { ... };

  const handleCorrectAnswerChange = (questionId: string, answer: string) => {
     setQuestions(questions.map(q => q.id === questionId ? { ...q, correctAnswer: answer } : q));
  };

  const handleRemoveQuestion = (id: string) => {
    if (questions.length <= 1) {
      showModal('info', 'Test must have at least one question.');
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSaveTest = async () => {
    if (!testTitle || questions.length === 0) {
      showModal('error', 'Please add a title and at least one question.');
      return;
    }

    // Validate that either student or grade is selected
    if (!selectedStudent && !selectedGrade) {
      showModal('error', 'Please select either a student or a grade.');
      return;
    }

    // Validate that all questions have text and correct answers
    const invalidQuestions = questions.filter(q => !q.questionText || !q.correctAnswer);
    if (invalidQuestions.length > 0) {
      showModal('error', 'Please fill in all questions and their correct answers.');
      return;
    }

    const testData = {
      title: testTitle,
      testType: testType,
      studentId: selectedStudent || undefined,
      grade: selectedGrade || undefined,
      storyId: selectedStory || undefined,
      questions: questions.map(q => ({
        type: 'short-answer' as const,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer || ''
      }))
    };

    console.log('Sending test data:', testData);

    try {
      const response = await api.tests.create(testData);
      console.log('Server response:', response);
      
      if (response.success) {
        showModal('success', 'Test saved successfully!');
        // Reset form
        setTestTitle('');
        setTestType('pre');
        setSelectedStudent('');
        setSelectedGrade('');
        setSelectedStory('');
        setQuestions([]);
      } else {
        showModal('error', response.message || 'Failed to save test');
      }
    } catch (error: any) {
      console.error('Error saving test:', error);
      showModal('error', error.message || 'An unexpected error occurred');
    }
  };

  const renderQuestionForm = (question: TestQuestion) => {
    // Only render form for short-answer
    return (
      <View style={styles.questionForm}>
        <TextInput
          style={styles.questionInput}
          placeholder="Enter question text"
          value={question.questionText}
          onChangeText={(text) => handleQuestionTextChange(question.id, text)}
          multiline // Allow multiline input for short answer
        />
        <TextInput
           style={styles.correctAnswerInput}
           placeholder="Enter correct answer"
           value={question.correctAnswer}
           onChangeText={(text) => handleCorrectAnswerChange(question.id, text)}
           multiline // Allow multiline input for correct answer
         />
      </View>
    );
  };

  const renderTestItem = ({ item }: { item: Test }) => {
    console.log('Rendering test item:', item);
    // Add null checks for all properties
    const studentName = item.studentId ? `${item.studentId.name || ''} ${item.studentId.surname || ''}`.trim() : '';
    const storyTitle = item.storyId?.title || 'No Story';
    const questionCount = item.questions?.length || 0;
    const testTitle = item.title || 'Untitled Test';
    const testType = item.testType || 'pre';
    const grade = item.grade || 'No Grade';
    const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'No Date';

    return (
      <View style={styles.testItem}>
        <View style={styles.testHeader}>
          <Text style={styles.testTitle}>{testTitle}</Text>
          <Text style={styles.testType}>{testType === 'pre' ? 'Pre-Test' : 'Post-Test'}</Text>
        </View>
        <View style={styles.testDetails}>
          <Text style={styles.testInfo}>
            <Ionicons name="document-text-outline" size={16} color="#666" /> {questionCount} Questions
          </Text>
          {studentName && (
            <Text style={styles.testInfo}>
              <Ionicons name="person-outline" size={16} color="#666" /> {studentName}
            </Text>
          )}
          {grade && (
            <Text style={styles.testInfo}>
              <Ionicons name="school-outline" size={16} color="#666" /> {grade}
            </Text>
          )}
          {storyTitle && (
            <Text style={styles.testInfo}>
              <Ionicons name="book-outline" size={16} color="#666" /> {storyTitle}
            </Text>
          )}
          <Text style={styles.testInfo}>
            <Ionicons name="calendar-outline" size={16} color="#666" /> {createdAt}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.mainContainer}>
        {/* Tests List Section (Collapsible) */}
        <View style={styles.testsSection}>
          <TouchableOpacity 
            style={styles.testsHeader}
            onPress={() => setIsTestsExpanded(!isTestsExpanded)}
          >
            <View style={styles.headerContent}>
              <Ionicons name="list-outline" size={24} color="#4A90E2" />
              <Text style={styles.sectionTitle}>Tests ({tests.length})</Text>
            </View>
            <Ionicons 
              name={isTestsExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#2a3a4d" 
            />
          </TouchableOpacity>

          {isTestsExpanded && (
            <View style={styles.testsListContainer}>
              {loadingTests ? (
                <ActivityIndicator size="large" color="#4A90E2" />
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={48} color="#FF6347" />
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={fetchTests}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : tests.length > 0 ? (
                <FlatList
                  data={tests}
                  renderItem={renderTestItem}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.testsList}
                />
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="document-text-outline" size={48} color="#666" />
                  <Text style={styles.emptyText}>No tests available</Text>
                  <Text style={styles.emptySubText}>Create your first test using the form below</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Make Test Section */}
        <View style={styles.makeTestSection}>
          <View style={styles.makeTestHeader}>
            <View style={styles.headerContent}>
              <Ionicons name="create-outline" size={24} color={Colors.light.tint} />
      <Text style={styles.title}>Make a Test</Text>
            </View>
          </View>
          <View style={styles.makeTestContainer}>
      <Text style={styles.subtitle}>Create new tests for your students.</Text>

       {/* Test Type Selector */}
       <View style={styles.testTypeContainer}>
          <TouchableOpacity
             style={[styles.testTypeButton, testType === 'pre' && styles.testTypeButtonActive]}
             onPress={() => setTestType('pre')}
          >
             <Text style={[styles.testTypeButtonText, testType === 'pre' && styles.testTypeButtonTextActive]}>Pre-Test</Text>
          </TouchableOpacity>
           <TouchableOpacity
             style={[styles.testTypeButton, testType === 'post' && styles.testTypeButtonActive]}
             onPress={() => setTestType('post')}
          >
             <Text style={[styles.testTypeButtonText, testType === 'post' && styles.testTypeButtonTextActive]}>Post-Test</Text>
          </TouchableOpacity>
       </View>

      {/* Test Title Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Test Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Unit 1 Reading Comprehension Pre-Test"
          value={testTitle}
          onChangeText={setTestTitle}
        />
      </View>

      {/* Student/Grade/Story Selectors */}
       <View style={styles.selectorsContainer}>
           <View style={[styles.selectorWrapper, { borderLeftWidth: 4, borderLeftColor: '#4A90E2' }]}>
             <Text style={styles.label}>
               <Ionicons name="person-outline" size={22} color="#4A90E2" style={{ marginRight: 8 }} />
               Assign to Student
             </Text>
             {loadingStudents ? (
               <ActivityIndicator size="small" color={Colors.light.tint} />
             ) : (
               <Picker
                 selectedValue={selectedStudent}
                 onValueChange={setSelectedStudent}
                 style={styles.picker}
                 itemStyle={styles.pickerItem}
               >
                 <Picker.Item 
                   label="Select Student" 
                   value="" 
                   color="#666"
                   style={styles.pickerPlaceholder}
                 />
                 {students.map((s) => (
                   <Picker.Item 
                     key={s._id} 
                     label={`${s.name} ${s.surname}`} 
                     value={s._id}
                     color={selectedStudent === s._id ? '#4A90E2' : '#333'}
                     style={selectedStudent === s._id ? styles.pickerSelected : styles.pickerItem}
                   />
                 ))}
               </Picker>
             )}
           </View>

           <View style={[styles.selectorWrapper, { borderLeftWidth: 4, borderLeftColor: '#4A90E2' }]}>
             <Text style={styles.label}>
               <Ionicons name="school-outline" size={22} color="#4A90E2" style={{ marginRight: 8 }} />
               Assign to Grade
             </Text>
             {loadingGrades ? (
               <ActivityIndicator size="small" color={Colors.light.tint} />
             ) : (
               <Picker
                 selectedValue={selectedGrade}
                 onValueChange={setSelectedGrade}
                 style={styles.picker}
                 itemStyle={styles.pickerItem}
               >
                 <Picker.Item 
                   label="Select Grade ( Optional )" 
                   value="" 
                   color="#666"
                   style={styles.pickerPlaceholder}
                 />
                 {grades.map((grade) => (
                   <Picker.Item 
                     key={grade} 
                     label={grade} 
                     value={grade}
                     color={selectedGrade === grade ? '#4A90E2' : '#333'}
                     style={selectedGrade === grade ? styles.pickerSelected : styles.pickerItem}
                   />
                 ))}
               </Picker>
             )}
           </View>

           <View style={[styles.selectorWrapper, { borderLeftWidth: 4, borderLeftColor: '#4A90E2' }]}>
             <Text style={styles.label}>
               <Ionicons name="book-outline" size={22} color="#4A90E2" style={{ marginRight: 8 }} />
               Base on Story
             </Text>
             {loadingStories ? (
               <ActivityIndicator size="small" color={Colors.light.tint} />
             ) : (
               <Picker
                 selectedValue={selectedStory}
                 onValueChange={setSelectedStory}
                 style={styles.picker}
                 itemStyle={styles.pickerItem}
               >
                 <Picker.Item 
                   label="Select Story" 
                   value="" 
                   color="#666"
                   style={styles.pickerPlaceholder}
                 />
                 {stories.map((story) => (
                   <Picker.Item 
                     key={story._id} 
                     label={story.title} 
                     value={story._id}
                     color={selectedStory === story._id ? '#4A90E2' : '#333'}
                     style={selectedStory === story._id ? styles.pickerSelected : styles.pickerItem}
                   />
                 ))}
               </Picker>
             )}
           </View>
         </View>
       </View>

      {/* Questions Section */}
      <View style={styles.questionsContainer}>
        <Text style={styles.sectionTitle}>Questions (Short Answer Only)</Text>

        {questions.map((question) => (
          <View key={question.id} style={styles.questionItem}>
            <View style={styles.questionHeader}>
               {/* Display question number instead of type */}
               <Text style={styles.questionNumberLabel}>Question {questions.indexOf(question) + 1}</Text>
               <TouchableOpacity onPress={() => handleRemoveQuestion(question.id)}>
                  <Ionicons name="trash-outline" size={20} color="#FF6347" />
               </TouchableOpacity>
            </View>
            {renderQuestionForm(question)}
          </View>
        ))}

        {/* Add Question Button (Simplified) */}
         <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddQuestion}
         >
            <Text style={styles.addButtonText}>Add Short Answer Question</Text>
         </TouchableOpacity>

      </View>

          {/* Save Button */}
      <TouchableOpacity 
         style={[styles.saveButton, (!testTitle || questions.length === 0) && styles.saveButtonDisabled]}
         onPress={handleSaveTest}
         disabled={!testTitle || questions.length === 0}
      >
         <Text style={styles.saveButtonText}>Save Test</Text>
      </TouchableOpacity>
        </View>
      </View>

      {/* CustomModal */}
      <CustomModal
        visible={modalVisible}
        type={modalType}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </ScrollView>
  );
};

export default TestScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 120,
  },
  mainContainer: {
    gap: 20,
  },
  testsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  makeTestSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  makeTestHeader: {
    backgroundColor: '#F8FBFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2a3a4d',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2a3a4d',
  },
  testsListContainer: {
    padding: 15,
  },
  makeTestContainer: {
    padding: 15,
  },
  testItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a3a4d',
    flex: 1,
  },
  testType: {
    fontSize: 14,
    color: '#4A90E2',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  testDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  testInfo: {
    fontSize: 14,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4A90E2',
    marginBottom: 20,
  },
   testTypeContainer: {
     flexDirection: 'row',
     justifyContent: 'center',
     marginBottom: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
     overflow: 'hidden',
     borderWidth: 1,
    borderColor: '#E0E0E0',
  },
   testTypeButton: {
     flex: 1,
     paddingVertical: 12,
     alignItems: 'center',
    backgroundColor: '#fff',
  },
  testTypeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  testTypeButtonText: {
     fontSize: 16,
     fontWeight: '600',
    color: '#666',
  },
  testTypeButtonTextActive: {
    color: '#fff',
  },
  inputContainer: {
     marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
     padding: 15,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 1 },
     shadowOpacity: 0.05,
     shadowRadius: 3,
     elevation: 2,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '600',
    marginLeft: 4,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#2a3a4d',
  },
  selectorsContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
   selectorWrapper: {
     flex: 1,
     minWidth: 280,
     marginBottom: 15,
     backgroundColor: '#fff',
    borderRadius: 12,
     padding: 15,
     shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
     borderWidth: 1,
     borderColor: '#E8F0FE',
     position: 'relative',
     overflow: 'hidden',
   },
   picker: {
     width: '100%',
     height: 50,
    color: '#2a3a4d',
     fontSize: 16,
     paddingHorizontal: 15,
     backgroundColor: '#F8FBFF',
    borderRadius: 12,
     borderWidth: 1,
     borderColor: '#E0E0E0',
   },
   pickerItem: {
     height: 50,
     fontSize: 16,
     color: '#333',
   },
   pickerPlaceholder: {
     color: '#666',
     fontSize: 16,
   },
   pickerSelected: {
     color: '#4A90E2',
     fontWeight: '600',
   },
  questionsContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  questionItem: {
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  questionHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 10,
     paddingBottom: 10,
     borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
   questionNumberLabel: {
     fontSize: 16,
     fontWeight: '600',
    color: '#2a3a4d',
  },
  questionForm: {
    marginTop: 10,
  },
  questionInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 10,
    color: '#2a3a4d',
  },
   correctAnswerInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4A90E2',
    marginTop: 10,
    color: '#2a3a4d',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    opacity: 1,
  },
   addButtonDisabled: {
    opacity: 0.6,
   },
  addButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    opacity: 1,
  },
   saveButtonDisabled: {
    opacity: 0.6,
   },
  saveButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
  emptySubText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 5,
  },
  testsList: {
    paddingBottom: 10,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  errorText: {
    textAlign: 'center',
    color: '#FF6347',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 