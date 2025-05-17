import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function AddStories() {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('english');
  const [storyFile, setStoryFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [storyImage, setStoryImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });
      
      if (!result.canceled) {
        setStoryFile(result);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setStoryImage(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <View style={styles.section}>
            <View style={styles.labelContainer}>
              <Ionicons name="book-outline" size={24} color="#4A90E2" />
              <Text style={styles.label}>Story Title</Text>
            </View>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter story title"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.labelContainer}>
                <Ionicons name="language-outline" size={24} color="#4A90E2" />
                <Text style={styles.label}>Language</Text>
              </View>
              <View style={styles.labelContainer}>
                <Ionicons name="image-outline" size={24} color="#4A90E2" />
                <Text style={styles.label}>Story Image</Text>
              </View>
            </View>
            <View style={styles.combinedContainer}>
              <View style={styles.radioContainer}>
                <TouchableOpacity
                  style={[styles.radioButton, language === 'english' && styles.radioButtonSelected]}
                  onPress={() => setLanguage('english')}
                >
                  <View style={[styles.radio, language === 'english' && styles.radioSelected]} />
                  <Text style={[styles.radioLabel, language === 'english' && styles.radioLabelSelected]}>English</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.radioButton, language === 'tagalog' && styles.radioButtonSelected]}
                  onPress={() => setLanguage('tagalog')}
                >
                  <View style={[styles.radio, language === 'tagalog' && styles.radioSelected]} />
                  <Text style={[styles.radioLabel, language === 'tagalog' && styles.radioLabelSelected]}>Tagalog</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.imageContainer}>
                <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
                  <Ionicons 
                    name={storyImage ? "image" : "image-outline"} 
                    size={24} 
                    color="#fff" 
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.attachButtonText}>
                    {storyImage ? 'Change Image' : 'Add Image'}
                  </Text>
                </TouchableOpacity>
                {storyImage && (
                  <View style={styles.fileInfo}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.fileName}>Image selected</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.labelContainer}>
              <Ionicons name="document-text-outline" size={24} color="#4A90E2" />
              <Text style={styles.label}>Story File</Text>
            </View>
            <TouchableOpacity style={styles.attachButton} onPress={pickDocument}>
              <Ionicons 
                name={storyFile ? "document-text" : "document-text-outline"} 
                size={24} 
                color="#fff" 
                style={styles.buttonIcon}
              />
              <Text style={styles.attachButtonText}>
                {storyFile ? 'Change Story File' : 'Attach Story File'}
              </Text>
            </TouchableOpacity>
            {storyFile && !storyFile.canceled && (
              <View style={styles.fileInfo}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.fileName}>{storyFile.assets[0].name}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    padding: 20,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  combinedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  radioContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  imageContainer: {
    flex: 1,
    marginLeft: 24,
    alignItems: 'center',
  },
  attachButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    minWidth: 140,
  },
  buttonIcon: {
    marginRight: 8,
  },
  attachButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  fileName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  radioButtonSelected: {
    backgroundColor: '#E3F2FD',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4A90E2',
    marginRight: 8,
  },
  radioSelected: {
    backgroundColor: '#4A90E2',
  },
  radioLabel: {
    fontSize: 16,
    color: '#666',
  },
  radioLabelSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});

export const screenOptions = {
  headerShown: false,
};
