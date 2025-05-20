import { StyleSheet, Text, View, SafeAreaView, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { api, API_URL } from '../../utils/api';
import { ScrollView, TextInput } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Add types for students and stories
interface Student {
  _id: string;
  name: string;
  surname: string;
  grade: string;
}
interface Story {
  _id: string;
  title: string;
}

export default function ReadingScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStory, setSelectedStory] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storyText, setStoryText] = useState('');
  const [loadingStoryText, setLoadingStoryText] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await api.students.getAll();
        console.log('Students API response:', res); // Debug log
        setStudents(res.students || []);
      } catch (e) {
        console.log('Error fetching students:', e); // Debug log
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    const fetchStories = async () => {
      setLoadingStories(true);
      try {
        const res = await api.stories.getAll();
        console.log('Stories API response:', res); // Debug log
        setStories(res.stories || []);
      } catch (e) {
        console.log('Error fetching stories:', e); // Debug log
        setStories([]);
      } finally {
        setLoadingStories(false);
      }
    };
    fetchStudents();
    fetchStories();
  }, []);

  // Fetch story text when a story is selected
  useEffect(() => {
    const fetchStoryText = async () => {
      if (!selectedStory) {
        setStoryText('');
        return;
      }
      setLoadingStoryText(true);
      try {
        // Fetch the story details to get the file URL and gridFsId
        const res = await api.stories.getAll();
        const story = res.stories.find((s: any) => s._id === selectedStory);
        if (story && story.storyFile && (story.storyFile.fileUrl || story.storyFile.gridFsId)) {
          const fileType = story.storyFile.fileType;
          const fileName = story.storyFile.fileUrl; // always relative
          const gridFsId = story.storyFile.gridFsId;

          // Only use backend extraction for PDF, DOC, DOCX, and text
          if (
            fileType === 'application/pdf' ||
            fileType === 'application/msword' ||
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            fileType === 'text/plain'
          ) {
            try {
              // Prefer gridFsId for PDFs if available
              let extractPayload: any = { fileType };
              if (fileType === 'application/pdf' && gridFsId) {
                extractPayload.gridFsId = gridFsId;
              } else {
                extractPayload.fileUrl = fileName;
              }
              const res = await api.extractText(extractPayload);
              const extractedText = res.text || '';
              setStoryText(extractedText.trim() ? extractedText : 'No text extracted from file.');
            } catch (e) {
              setStoryText('Failed to extract text from file.');
            }
          } else {
            setStoryText('Unsupported file type for reading.');
          }
        } else {
          setStoryText('No story file found.');
        }
      } catch (e) {
        setStoryText('Failed to load story file.');
      } finally {
        setLoadingStoryText(false);
      }
    };
    fetchStoryText();
  }, [selectedStory]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reading Section</Text>
        <Text style={styles.subtitle}>Select a student and a story to begin</Text>
        {/* Student Dropdown */}
        <View style={{ width: '100%', marginVertical: 16 }}>
          <Text style={styles.dropdownLabel}>Select Student:</Text>
          {loadingStudents ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <Picker
              selectedValue={selectedStudent}
              onValueChange={setSelectedStudent}
              style={styles.picker}
            >
              <Picker.Item label="-- Select Student --" value="" />
              {students.map((s) => (
                <Picker.Item key={s._id} label={`${s.name} ${s.surname}`} value={s._id} />
              ))}
            </Picker>
          )}
        </View>
        {/* Story Dropdown */}
        <View style={{ width: '100%', marginVertical: 16 }}>
          <Text style={styles.dropdownLabel}>Select Story:</Text>
          {loadingStories ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <Picker
              selectedValue={selectedStory}
              onValueChange={setSelectedStory}
              style={styles.picker}
            >
              <Picker.Item label="-- Select Story --" value="" />
              {stories.map((story) => (
                <Picker.Item key={story._id} label={story.title} value={story._id} />
              ))}
            </Picker>
          )}
        </View>
        {/* Story Text Field */}
        <View style={{ width: '100%', flex: 1, marginTop: 16 }}>
          <Text style={styles.dropdownLabel}>Story Text:</Text>
          {loadingStoryText ? (
            <ActivityIndicator size="large" color="#4A90E2" />
          ) : (
            <ScrollView style={{ flex: 1, backgroundColor: '#F0F7FF', borderRadius: 8, padding: 12 }}>
              <TextInput
                style={{ minHeight: 200, fontSize: 18, color: '#222' }}
                value={storyText}
                editable={false}
                multiline
                placeholder="Story text will appear here..."
              />
              {/* Display each word separately below (optional) */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }}>
                {storyText.split(/\s+/).map((word, idx) => (
                  <Text key={idx} style={{ fontSize: 16, marginRight: 6, marginBottom: 6 }}>{word}</Text>
                ))}
              </View>
            </ScrollView>
          )}
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
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  dropdownLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    marginLeft: 4,
  },
  picker: {
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
});