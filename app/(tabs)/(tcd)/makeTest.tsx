import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors'; // Assuming Colors is available
import { api, API_URL, getHeaders } from '../../utils/api'; // Import API_URL and getHeaders

// Define types for test structure
interface TestQuestion {
  id: string;
  // Only short-answer type is supported now
  type: 'short-answer';
  questionText: string;
  correctAnswer?: string;
}

interface Test {
  id: string;
  title: string;
  testType: 'pre' | 'post'; // Add test type
  studentId?: string; // Optional: test for a specific student
  grade?: string; // Optional: test for a specific grade
  storyId?: string; // Optional: test based on a specific story
  questions: TestQuestion[];
}

const MakeTestScreen = () => {
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

  const handleAddQuestion = () => {
    // Always add a short-answer question
    const newQuestion: TestQuestion = {
      id: Date.now().toString(), // Simple unique ID
      type: 'short-answer', // Fixed type
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
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSaveTest = async () => {
    // Ensure title and at least one question exist
    if (!testTitle || questions.length === 0) {
        // This case should be handled by the disabled state of the button,
        // but adding a check here for safety.
        console.warn('Attempted to save test without title or questions.');
        return;
    }

    const testData = {
      title: testTitle,
      testType: testType,
      studentId: selectedStudent || undefined,
      grade: selectedGrade || undefined,
      storyId: selectedStory || undefined,
      questions,
    };

    console.log('Attempting to save test to backend:', testData);

    try {
        // Call the backend API to create the test
        const response = await fetch(`${API_URL}/tests`, {
            method: 'POST',
            headers: await getHeaders(), // Include authentication headers
            body: JSON.stringify(testData),
        });

        const responseData = await response.json();

        if (response.ok) {
            console.log('Test saved successfully:', responseData.test);
            alert('Test saved successfully!');
            // Optionally reset the form or navigate away
            setTestTitle('');
            setTestType('pre');
            setSelectedStudent('');
            setSelectedGrade('');
            setSelectedStory('');
            setQuestions([]);
        } else {
            console.error('Failed to save test:', responseData.message || response.statusText);
            alert(`Failed to save test: ${responseData.message || 'An error occurred'}`);
        }

    } catch (error: any) {
        console.error('API call error during test save:', error);
        alert(`Error saving test: ${error.message || 'An unexpected error occurred'}`);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Make a Test</Text>
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
         <View style={styles.dropdownsContainer}>
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

      {/* Save Button (Placeholder) */}
      <TouchableOpacity 
         style={[styles.saveButton, (!testTitle || questions.length === 0) && styles.saveButtonDisabled]}
         onPress={handleSaveTest}
         disabled={!testTitle || questions.length === 0}
      >
         <Text style={styles.saveButtonText}>Save Test</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

export default MakeTestScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background, // Use a light background color
    padding: 15, // Reduced padding slightly
  },
  scrollContent: {
     paddingBottom: 120, // Add more padding to the bottom for the save button
  },
  title: {
    fontSize: 28, // Slightly larger title
    fontWeight: 'bold',
    marginBottom: 5,
    color: Colors.light.text, // Use text color
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.tint, // Use a highlight color
    textAlign: 'center',
    marginBottom: 25,
  },
   testTypeContainer: {
     flexDirection: 'row',
     justifyContent: 'center',
     marginBottom: 20,
     backgroundColor: Colors.light.background,
     borderRadius: 8,
     overflow: 'hidden',
     borderWidth: 1,
     borderColor: '#ddd', // Use a light border
  },
   testTypeButton: {
     flex: 1,
     paddingVertical: 12,
     alignItems: 'center',
     backgroundColor: '#f0f0f0', // Default inactive background
  },
  testTypeButtonActive: {
     backgroundColor: Colors.light.tint, // Active background
  },
  testTypeButtonText: {
     fontSize: 16,
     fontWeight: '600',
     color: '#555', // Default text color
  },
  testTypeButtonTextActive: {
     color: Colors.light.background, // Active text color
  },
  inputContainer: {
     marginBottom: 20,
     backgroundColor: Colors.light.background, // Card background
     borderRadius: 10,
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
    backgroundColor: '#eef2f7', // Lighter background for input
    borderRadius: 8,
    paddingVertical: 12, // Increased padding
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd', // Use border color
    color: Colors.light.text,
  },
  selectorsContainer: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginTop: 10,
    flexWrap: 'wrap',
  },
   selectorWrapper: {
     flex: 1,
     minWidth: 280,
     marginBottom: 15,
     backgroundColor: '#fff',
     borderRadius: 20,
     padding: 15,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.15,
     shadowRadius: 8,
     elevation: 5,
     borderWidth: 1,
     borderColor: '#E8F0FE',
     position: 'relative',
     overflow: 'hidden',
   },
   picker: {
     width: '100%',
     height: 50,
     color: '#222',
     fontSize: 16,
     paddingHorizontal: 15,
     backgroundColor: '#F8FBFF',
     borderRadius: 15,
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
    backgroundColor: Colors.light.background, // Card background
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text, // Use text color
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd', // Use border color
    paddingBottom: 10,
  },
  questionItem: {
    backgroundColor: '#eef2f7', // Lighter background for question item
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd', // Use border color
  },
  questionHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 10,
     paddingBottom: 10,
     borderBottomWidth: 1,
     borderBottomColor: '#ddd', // Use border color
  },
   questionNumberLabel: {
     fontSize: 16,
     fontWeight: '600',
     color: Colors.light.text, // Use text color
  },
  questionForm: {
    marginTop: 10,
  },
  questionInput: {
    backgroundColor: Colors.light.background, // White background for input
    borderRadius: 5,
    padding: 12, // Increased padding
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd', // Use border color
    marginBottom: 10,
    color: Colors.light.text,
  },
  optionsLabel: {
    fontSize: 14,
    color: Colors.light.text, // Use text color
    marginBottom: 8,
    fontWeight: '500',
  },
  optionInput: {
     backgroundColor: Colors.light.background, // White background for input
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd', // Use border color
    marginBottom: 8,
    color: Colors.light.text,
  },
   correctAnswerInput: {
    backgroundColor: Colors.light.background, // White background for input
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.light.tint, // Use tint color for correct answer highlight
    marginTop: 10,
    color: Colors.light.text,
  },
  addQuestionContainer: {
     marginTop: 15,
     borderTopWidth: 1,
     borderTopColor: '#ddd', // Use border color
     paddingTop: 15,
  },
  addButton: {
    backgroundColor: Colors.light.tint, // Use tint color
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    opacity: 1, // Default opacity
  },
   addButtonDisabled: {
     opacity: 0.6, // Dim when disabled
   },
  addButtonText: {
    fontSize: 18,
    color: Colors.light.background, // White text on tinted background
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: Colors.light.tint, // Use tint color for save button
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    opacity: 1, // Default opacity
  },
   saveButtonDisabled: {
     opacity: 0.6, // Dim when disabled
   },
  saveButtonText: {
    fontSize: 20,
    color: Colors.light.background, // White text
    fontWeight: 'bold',
  },
}); 