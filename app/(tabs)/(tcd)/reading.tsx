import { StyleSheet, Text, View, SafeAreaView, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { api, API_URL } from '../../utils/api';
import { ScrollView, Image } from 'react-native';

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
  const [storyImage, setStoryImage] = useState<string | null>(null);

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
        setStoryImage(null);
        return;
      }
      setLoadingStoryText(true);
      try {
        // Fetch the story details to get the file URL and gridFsId
        const res = await api.stories.getAll();
        const story = res.stories.find((s: any) => s._id === selectedStory);
        if (story) {
          // Set story image if available
          if (story.storyImage && story.storyImage.fileUrl) {
            setStoryImage(`${API_URL}/${story.storyImage.fileUrl}`);
          } else {
            setStoryImage(null);
          }
        }
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
        setStoryImage(null);
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
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>Select Student:</Text>
          {loadingStudents ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <View style={styles.pickerWrapper}>
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
            </View>
          )}
        </View>
        {/* Story Dropdown */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>Select Story:</Text>
          {loadingStories ? (
            <ActivityIndicator size="small" color="#4A90E2" />
          ) : (
            <View style={styles.pickerWrapper}>
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
            </View>
          )}
        </View>
        {/* Story Image */}
        {storyImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: storyImage }} style={styles.storyImage} resizeMode="contain" />
          </View>
        )}
        {/* Story Text Field */}
        <View style={styles.textAreaCard}>
          <Text style={styles.dropdownLabel}>Story Text:</Text>
          {loadingStoryText ? (
            <ActivityIndicator size="large" color="#4A90E2" />
          ) : (
            <ScrollView style={styles.textAreaScroll}>
              <View style={styles.wordWrap}>
                {storyText.split(/\s+/).map((word, idx) => (
                  <Text key={idx} style={styles.word}>{word}</Text>
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
    backgroundColor: '#f8fbff',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2a3a4d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4A90E2',
    textAlign: 'center',
    marginBottom: 18,
  },
  dropdownContainer: {
    width: '100%',
    marginVertical: 10,
  },
  dropdownLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  pickerWrapper: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
    width: '100%',
  },
  picker: {
    width: '100%',
    height: 44,
    color: '#222',
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 12,
  },
  storyImage: {
    width: '90%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#e6eef8',
  },
  textAreaCard: {
    width: '100%',
    flex: 1,
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  textAreaScroll: {
    flex: 1,
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  word: {
    fontSize: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#e6eef8',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: '#2a3a4d',
  },
});