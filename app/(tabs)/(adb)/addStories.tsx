import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, Platform, ActivityIndicator, Image, Dimensions } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomModal from '../../../constants/CustomModal';

export default function AddStories() {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('english');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('info');
  const [modalMessage, setModalMessage] = useState('');
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [storyFile, setStoryFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [storyImage, setStoryImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      setLoadingStories(true);
      const response = await fetch(`${API_URL}/stories`);
      const data = await response.json();
      if (data && data.stories) {
        setStories(data.stories);
      } else {
        setStories([]);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStories([]);
    } finally {
      setLoadingStories(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });
      if (!result.canceled) {
        console.log('Selected Document:', result.assets[0]);
        setStoryFile(result);
      }
    } catch (err) {
      console.error('Document picker error:', err);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
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
        console.log('Selected Image:', result.assets[0]);
        setStoryImage(result.assets[0]);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeFile = () => setStoryFile(null);
  const removeImage = () => setStoryImage(null);

  const validateForm = () => {
    const errors = [];
    if (!title.trim()) errors.push('Please enter a story title');
    if (!storyFile || storyFile.canceled) errors.push('Please attach a story file');
    if (!storyImage) errors.push('Please attach a story image');
    if (errors.length > 0) {
      showModal('error', errors.join('\n'));
      return false;
    }
    return true;
  };

  const showModal = (type: 'success' | 'error' | 'info', message: string) => {
    setModalType(type);
    setModalMessage(message);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) return;
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('language', language);
      
      if (storyFile && !storyFile.canceled) {
        const fileUri = storyFile.assets[0].uri;
        const fileType = storyFile.assets[0].mimeType || 'application/pdf';
        const fileName = storyFile.assets[0].name;

        console.log('Story File Details:', {
          uri: fileUri,
          type: fileType,
          name: fileName
        });

        // Create a blob from the file
        const response = await fetch(fileUri);
        const blob = await response.blob();

        formData.append('storyFile', blob, fileName);
      }
      
      if (storyImage) {
        const imageUri = storyImage.uri;
        const imageType = 'image/jpeg';
        const imageName = 'image.jpg';

        console.log('Story Image Details:', {
          uri: imageUri,
          type: imageType,
          name: imageName
        });

        // Create a blob from the image
        const response = await fetch(imageUri);
        const blob = await response.blob();

        formData.append('storyImage', blob, imageName);
      }

      // Log the entire FormData contents
      console.log('Form Data Contents:', {
        title,
        language,
        hasStoryFile: !!storyFile,
        hasStoryImage: !!storyImage
      });

      const response = await fetch(`${API_URL}/stories/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseData = await response.json();
      console.log('Server Response:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to upload story');
      }

      showModal('success', 'Story added successfully!');
      setFormModalVisible(false);
      setTitle('');
      setLanguage('english');
      setStoryFile(null);
      setStoryImage(null);
      fetchStories(); // Refresh the stories list
    } catch (error: any) {
      console.error('Upload error:', error);
      showModal('error', error.message || 'Failed to add story');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <Text style={styles.formTitle}>Stories</Text>
        <TouchableOpacity style={styles.addIconButton} onPress={() => setFormModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={32} color="#4A90E2" />
        </TouchableOpacity>
      </View>
      <CustomModal
        visible={modalVisible}
        type={modalType}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
      {formModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Story</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter story title"
              placeholderTextColor="#999"
              editable={!isSubmitting}
            />
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, language === 'english' && styles.radioButtonSelected]}
                onPress={() => setLanguage('english')}
                disabled={isSubmitting}
              >
                <View style={[styles.radio, language === 'english' && styles.radioSelected]} />
                <Text style={[styles.radioLabel, language === 'english' && styles.radioLabelSelected]}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, language === 'tagalog' && styles.radioButtonSelected]}
                onPress={() => setLanguage('tagalog')}
                disabled={isSubmitting}
              >
                <View style={[styles.radio, language === 'tagalog' && styles.radioSelected]} />
                <Text style={[styles.radioLabel, language === 'tagalog' && styles.radioLabelSelected]}>Tagalog</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.attachButton} onPress={pickDocument} disabled={isSubmitting}>
              <Ionicons name={storyFile ? 'document-text' : 'document-text-outline'} size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.attachButtonText}>{storyFile ? 'Change Story File' : 'Attach Story File'}</Text>
            </TouchableOpacity>
            {storyFile && !storyFile.canceled && (
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{storyFile.assets[0].name}</Text>
                <TouchableOpacity style={styles.removeButton} onPress={removeFile} disabled={isSubmitting}>
                  <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.attachButton} onPress={pickImage} disabled={isSubmitting}>
              <Ionicons name={storyImage ? 'image' : 'image-outline'} size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.attachButtonText}>{storyImage ? 'Change Image' : 'Attach Image'}</Text>
            </TouchableOpacity>
            {storyImage && (
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>Image selected</Text>
                <TouchableOpacity style={styles.removeButton} onPress={removeImage} disabled={isSubmitting}>
                  <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setFormModalVisible(false)} disabled={isSubmitting}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <ScrollView style={styles.storiesContainer}>
        {loadingStories ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        ) : stories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No stories available</Text>
          </View>
        ) : (
          <View style={styles.storiesGrid}>
            {stories.map(story => (
              <TouchableOpacity 
                key={story._id} 
                style={styles.storyCard}
                onPress={() => {
                  // Handle story selection
                  console.log('Selected story:', story);
                }}
              >
                <Image
                  source={{ 
                    uri: story.storyImage?.imageUrl 
                      ? `${API_URL.replace('/api', '')}/uploads/${story.storyImage.imageUrl}`
                      : 'https://via.placeholder.com/150'
                  }}
                  style={styles.storyImage}
                  resizeMode="cover"
                />
                <View style={styles.storyInfo}>
                  <Text style={styles.storyTitle} numberOfLines={2}>
                    {story.title}
                  </Text>
                  <View style={styles.storyMeta}>
                    <Text style={styles.storyLanguage}>
                      {story.language === 'english' ? 'English' : 'Tagalog'}
                    </Text>
                    <Text style={styles.storyDate}>
                      {new Date(story.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addIconButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  radioContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    marginRight: 8,
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
  attachButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  fileName: {
    fontSize: 14,
    color: '#666',
  },
  removeButton: {
    padding: 4,
    marginLeft: 8,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#eee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storiesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  storiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  storyCard: {
    width: (Dimensions.get('window').width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  storyImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  storyInfo: {
    padding: 12,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  storyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyLanguage: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  storyDate: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export const screenOptions = {
  headerShown: false,
};
