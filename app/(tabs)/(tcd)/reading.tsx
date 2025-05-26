import { StyleSheet, Text, View, SafeAreaView, ActivityIndicator, TouchableOpacity, Animated, Alert } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { Picker } from '@react-native-picker/picker';
import { api, API_URL } from '../../utils/api';
import { ScrollView, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
    confidence: number;
  };
}

// Add types for students, stories, and bots
interface Student {
  _id: string;
  name: string;
  surname: string;
  grade: string;
}

interface Story {
  _id: string;
  title: string;
  storyImage?: {
    fileUrl?: string;
    [key: string]: any;
  };
  storyFile?: {
    fileUrl?: string;
    gridFsId?: string;
    fileType?: string;
    [key: string]: any;
  };
  language?: string;
}

interface Bot {
  _id: string;
  name: string;
  type: string;
}

interface RecordingResponse {
  success: boolean;
  message: string;
  recordingUrl?: string;
}

// Update type definitions
interface WordOccurrence {
  indices: number[];
  difficulty: number;
}

interface WordProgress {
  count: number;
  difficulty: number;
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
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const micAnimation = useRef(new Animated.Value(1)).current;
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [storyWords, setStoryWords] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [tempTranscription, setTempTranscription] = useState('');
  const [confidence, setConfidence] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlightAnimation] = useState(new Animated.Value(0));
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [correctWords, setCorrectWords] = useState<number>(0);

  // Add new state for reading progress
  const [readingProgress, setReadingProgress] = useState({
    wordsRead: 0,
    totalWords: 0,
    startTime: 0,
    endTime: 0
  });

  // Update state definitions
  const [wordOccurrences, setWordOccurrences] = useState<Map<string, WordOccurrence>>(new Map());
  const [wordProgress, setWordProgress] = useState<Map<string, WordProgress>>(new Map());

  // Add new state variables for enhanced features
  const [readingMode, setReadingMode] = useState<'normal' | 'practice' | 'assessment'>('normal');
  const [readingSpeed, setReadingSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [difficultyLevel, setDifficultyLevel] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [readingHistory, setReadingHistory] = useState<{
    date: Date;
    wpm: number;
    accuracy: number;
    storyId: string;
  }[]>([]);

  // Add new state for auto-scroll
  const [lastScrollPosition, setLastScrollPosition] = useState(0);

  // Add new state for interim results
  const [interimWordIndex, setInterimWordIndex] = useState<number>(-1);

  // Add new animation values for smoother transitions
  const wordScale = useRef(new Animated.Value(1)).current;
  const wordOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        console.log('Fetching students for ReadingScreen...');
        const res = await api.students.getAll();
        console.log('Students fetched for ReadingScreen:', res);
        if (res.students && Array.isArray(res.students)) {
          setStudents(res.students);
          console.log(`Successfully loaded ${res.students.length} students.`);
        } else {
          console.warn('Students data is missing or not an array in API response:', res);
          setStudents([]); // Ensure students is always an array
        }
      } catch (e: any) {
        console.error('Error fetching students for ReadingScreen:', e);
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
        const res = await api.stories.getById(selectedStory);
        const story = res.story;
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
              const extractRes = await api.extractText(extractPayload);
              const extractedText = extractRes.text || '';
              setStoryText(extractedText.trim() ? extractedText : 'No text extracted from file.');
            } catch (e: any) {
              if (e.name === 'AbortError') return; // Ignore aborts
              console.error('ExtractText error:', e);
              setStoryText(e?.message ? `Failed to extract text: ${e.message}` : 'Failed to extract text from file.');
            }
          } else {
            setStoryText('Unsupported file type for reading.');
          }
        } else {
          setStoryText('No story file found.');
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return; // Ignore aborts
        setStoryText('Failed to load story file.');
        setStoryImage(null);
      } finally {
        setLoadingStoryText(false);
      }
    };
    if (selectedStory) {
      fetchStoryText();
    }
  }, [selectedStory]);

  // Add microphone animation
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(micAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      micAnimation.setValue(1);
    }
  }, [isRecording]);

  // Update the word animation function
  const animateWordHighlight = (index: number) => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(wordScale, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(wordOpacity, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(wordScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(wordOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  // Update story words when story text changes
  useEffect(() => {
    if (storyText) {
      const words = storyText.split(/\s+/).filter(word => word.length > 0);
      setStoryWords(words);
      setCurrentWordIndex(-1);
      setCorrectWords(0);
      setWpm(0);
      setAccuracy(0);

      // Calculate story difficulty
      const difficulty = calculateWordDifficulty(words);
      setDifficultyLevel(difficulty);

      // Create a map of word occurrences with difficulty
      const occurrences = new Map<string, { indices: number[], difficulty: number }>();
      words.forEach((word, index) => {
        const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
        if (!occurrences.has(cleanWord)) {
          occurrences.set(cleanWord, {
            indices: [],
            difficulty: getWordDifficulty(word)
          });
        }
        occurrences.get(cleanWord)?.indices.push(index);
      });
      setWordOccurrences(occurrences);

      // Initialize word progress with difficulty tracking
      const progress = new Map<string, { count: number, difficulty: number }>();
      words.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
        progress.set(cleanWord, {
          count: 0,
          difficulty: getWordDifficulty(word)
        });
      });
      setWordProgress(progress);
    }
  }, [storyText]);

  // Enhanced metrics calculation
  const calculateMetrics = () => {
    if (readingProgress.startTime) {
      const timeInMinutes = (Date.now() - readingProgress.startTime) / 60000;
      const wordsRead = currentWordIndex + 1;
      
      // Calculate WPM with difficulty adjustment
      const difficultyMultiplier = {
        easy: 1.2,
        medium: 1.0,
        hard: 0.8
      }[difficultyLevel];
      
      const calculatedWpm = Math.round((wordsRead / timeInMinutes) * (correctWords / wordsRead) * difficultyMultiplier);
      
      // Calculate accuracy considering word difficulty
      const totalExpectedWords = Array.from(wordProgress.values()).reduce((sum, { count, difficulty }) => 
        sum + (count * difficulty), 0);
      const totalCorrectWords = Array.from(wordProgress.values()).reduce((sum, { count, difficulty }) => 
        sum + (count * difficulty), 0);
      const calculatedAccuracy = Math.round((totalCorrectWords / totalExpectedWords) * 100);
      
      setWpm(calculatedWpm);
      setAccuracy(calculatedAccuracy);
      setReadingProgress(prev => ({
        ...prev,
        wordsRead
      }));

      // Update reading history
      setReadingHistory(prev => [...prev, {
        date: new Date(),
        wpm: calculatedWpm,
        accuracy: calculatedAccuracy,
        storyId: selectedStory
      }]);
    }
  };

  // Update the word style function for better visual feedback
  const getWordStyle = (word: string, index: number) => {
    const isCurrent = index === currentWordIndex;
    const isNext = index === currentWordIndex + 1;
    const difficulty = getWordDifficulty(word);
    
    const baseStyle = [
      styles.word,
      isCurrent && {
        ...styles.currentWord,
        transform: [{ scale: isCurrent ? wordScale : 1 }],
        opacity: isCurrent ? wordOpacity : 1,
      },
      isNext && styles.nextWord
    ];

    // Add difficulty-based styling
    if (difficulty > 7) {
      baseStyle.push(styles.difficultWord as any);
    } else if (difficulty > 4) {
      baseStyle.push(styles.mediumWord as any);
    }

    return baseStyle;
  };

  // Update the recognition result handler to allow word repetition
  const initializeRecognition = () => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const newRecognition = new SpeechRecognition();
        newRecognition.continuous = true;
        newRecognition.interimResults = true;
        newRecognition.maxAlternatives = 3;
        
        const story = stories.find(s => s._id === selectedStory);
        newRecognition.lang = story?.language === 'english' ? 'en-US' : 'tl-PH';

        newRecognition.onresult = (event: any) => {
          const results = Array.from(event.results);
          const lastResult = results[results.length - 1] as SpeechRecognitionResult;
          
          // Process interim results for real-time feedback
          if (!lastResult.isFinal) {
            const interimTranscript = Array.from(results)
              .map((result: any) => result[0].transcript)
              .join(' ');
            setTempTranscription(interimTranscript);

            // Try to match interim words
            const interimWords = interimTranscript.toLowerCase().split(/\s+/).filter((word: string) => word.length > 0);
            if (interimWords.length > 0) {
              const lastInterimWord = interimWords[interimWords.length - 1].replace(/[.,!?]/g, '');
              const wordOccurrence = wordOccurrences.get(lastInterimWord);
              
              if (wordOccurrence) {
                // Find any occurrence of the word, not just the next one
                const nextOccurrence = wordOccurrence.indices.find((index: number) => index >= currentWordIndex);
                if (nextOccurrence !== undefined) {
                  setInterimWordIndex(nextOccurrence);
                }
              }
            }
          } else {
            setIsProcessing(true);
            
            const alternatives = Array.from(lastResult as unknown as ArrayLike<{ transcript: string; confidence: number }>).map((alt) => ({
              transcript: alt.transcript.toLowerCase(),
              confidence: alt.confidence
            }));

            const bestMatch = alternatives[0];
            setTempTranscription(bestMatch.transcript);
            setConfidence(bestMatch.confidence);

            const spokenWords = bestMatch.transcript.toLowerCase().split(/\s+/).filter((word: string) => word.length > 0);
            
            // Process each spoken word
            spokenWords.forEach(spokenWord => {
              const cleanSpokenWord = spokenWord.replace(/[.,!?]/g, '');
              
              // Find all occurrences of this word in the story
              const wordOccurrence = wordOccurrences.get(cleanSpokenWord);
              if (wordOccurrence) {
                // Find any occurrence of the word, not just the next one
                const nextOccurrence = wordOccurrence.indices.find((index: number) => index >= currentWordIndex);
                
                if (nextOccurrence !== undefined) {
                  setCurrentWordIndex(nextOccurrence);
                  setInterimWordIndex(-1); // Reset interim index
                  animateWordHighlight(nextOccurrence);
                  calculateMetrics();
                  
                  // Enhanced auto-scroll functionality
                  if (autoScrollEnabled) {
                    const wordHeight = 40; // Increased for better spacing
                    const scrollPosition = nextOccurrence * wordHeight;
                    const currentScrollPosition = lastScrollPosition;
                    
                    if (Math.abs(scrollPosition - currentScrollPosition) > wordHeight / 2) {
                      setLastScrollPosition(scrollPosition);
                      scrollViewRef.current?.scrollTo({
                        y: scrollPosition,
                        animated: true
                      });
                    }
                  }
                }
              }
            });
            
            setIsProcessing(false);
          }
        };

        newRecognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          setTempTranscription('');
          setConfidence(0);
          setIsProcessing(false);
        };

        newRecognition.onend = () => {
          setIsRecording(false);
          setTempTranscription('');
          setConfidence(0);
          setIsProcessing(false);
        };

        setRecognition(newRecognition);
        return newRecognition;
      }
    }
    return null;
  };

  const handleStartRecording = async () => {
    if (!selectedStudent || !selectedStory) {
      Alert.alert('Error', 'Please select both a student and a story first.');
      return;
    }

    try {
      setIsRecording(true);
      const startTime = Date.now();
      setReadingProgress(prev => ({
        ...prev,
        startTime,
        totalWords: storyWords.length,
        wordsRead: 0
      }));
      setStartTime(startTime);
      setCurrentWordIndex(-1); // Start at -1 so no word is highlighted initially
      setCorrectWords(0);
      
      const newRecognition = initializeRecognition();
      if (newRecognition) {
        newRecognition.start();
      } else {
        throw new Error('Speech recognition not supported');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    try {
      if (recognition) {
        recognition.stop();
        setRecognition(null);
      }
      setIsRecording(false);

      const endTime = Date.now();
      const timeInMinutes = (endTime - readingProgress.startTime) / 60000;
      const wordsRead = currentWordIndex + 1;
      const finalWpm = Math.round(wordsRead / timeInMinutes);
      const finalAccuracy = Math.round((correctWords / wordsRead) * 100);
      
      setWpm(finalWpm);
      setAccuracy(finalAccuracy);
      setReadingProgress(prev => ({
        ...prev,
        endTime,
        wordsRead
      }));

      if (tempTranscription) {
        const story = stories.find(s => s._id === selectedStory);
        const response = await api.transcriptions.create({
          studentId: selectedStudent,
          storyId: selectedStory,
          transcription: tempTranscription,
          language: story?.language || 'english',
          wpm: finalWpm,
          accuracy: finalAccuracy
        });

        if (response.success) {
          Alert.alert(
            'Reading Session Complete',
            `Progress: ${wordsRead}/${storyWords.length} words\nWPM: ${finalWpm}\nAccuracy: ${finalAccuracy}%`,
            [{ text: 'OK' }]
          );
          setTempTranscription('');
        } else {
          throw new Error(response.message || 'Failed to save reading session');
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to save reading session. Please try again.');
    }
  };

  const handleReset = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    setCurrentWordIndex(-1);
    setCorrectWords(0);
    setWpm(0);
    setAccuracy(0);
    setTempTranscription('');
    setIsRecording(false);
  };

  // Add new helper functions
  const getWordDifficulty = (word: string): number => {
    const length = word.length;
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(word);
    const isUpperCase = word === word.toUpperCase();
    return length + (hasSpecialChars ? 2 : 0) + (isUpperCase ? 1 : 0);
  };

  const calculateWordDifficulty = (words: string[]): 'easy' | 'medium' | 'hard' => {
    const avgDifficulty = words.reduce((sum, word) => sum + getWordDifficulty(word), 0) / words.length;
    if (avgDifficulty < 5) return 'easy';
    if (avgDifficulty < 8) return 'medium';
    return 'hard';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Reading Section</Text>
          <Text style={styles.subtitle}>Select a student and a story to begin</Text>
        </View>

        {/* Controls Section */}
        <View style={styles.controlsSection}>
          {/* Reading Mode Selector */}
          <View style={styles.modeSelector}>
            {['normal', 'practice', 'assessment'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  readingMode === mode && styles.modeButtonActive
                ]}
                onPress={() => setReadingMode(mode as any)}
              >
                <Text style={[
                  styles.modeButtonText,
                  readingMode === mode && styles.modeButtonTextActive
                ]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Settings */}
          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => setAutoScrollEnabled(!autoScrollEnabled)}
            >
              <Ionicons
                name={autoScrollEnabled ? 'eye' : 'eye-off'}
                size={20}
                color="#666"
              />
              <Text style={styles.settingButtonText}>
                {autoScrollEnabled ? 'Auto-scroll On' : 'Auto-scroll Off'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingButton}
              onPress={() => setShowHints(!showHints)}
            >
              <Ionicons
                name={showHints ? 'bulb' : 'bulb-outline'}
                size={20}
                color="#666"
              />
              <Text style={styles.settingButtonText}>
                {showHints ? 'Hints On' : 'Hints Off'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Student and Story Dropdowns */}
          <View style={styles.dropdownsContainer}>
            <View style={styles.dropdownWrapper}>
              <Text style={styles.dropdownLabel}>Student</Text>
              {loadingStudents ? (
                <ActivityIndicator size="small" color="#4A90E2" />
              ) : (
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedStudent}
                    onValueChange={setSelectedStudent}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Student" value="" />
                    {students.map((s) => (
                      <Picker.Item key={s._id} label={`${s.name} ${s.surname}`} value={s._id} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            <View style={styles.dropdownWrapper}>
              <Text style={styles.dropdownLabel}>Story</Text>
              {loadingStories ? (
                <ActivityIndicator size="small" color="#4A90E2" />
              ) : (
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedStory}
                    onValueChange={setSelectedStory}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Story" value="" />
                    {stories.map((story) => (
                      <Picker.Item key={story._id} label={story.title} value={story._id} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Reading Section */}
        <View style={styles.readingSection}>
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
              <>
                <View style={styles.progressBar}>
                  <Animated.View 
                    style={[
                      styles.progressFill,
                      {
                        width: `${((currentWordIndex + 1) / storyWords.length) * 100}%`
                      }
                    ]} 
                  />
                </View>
                
                <ScrollView 
                  ref={scrollViewRef}
                  style={styles.textAreaScroll}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                  scrollEventThrottle={16}
                  onScroll={({ nativeEvent }) => {
                    if (autoScrollEnabled) {
                      setLastScrollPosition(nativeEvent.contentOffset.y);
                    }
                  }}
                >
                  <View style={styles.wordWrap}>
                    {storyWords.map((word, idx) => (
                      <Animated.Text
                        key={idx}
                        style={getWordStyle(word, idx)}
                      >
                        {word}{' '}
                      </Animated.Text>
                    ))}
                  </View>
                </ScrollView>

                {/* Word Hints */}
                {showHints && currentWordIndex >= 0 && (
                  <View style={styles.hintContainer}>
                    <Text style={styles.hintText}>
                      Difficulty: {getWordDifficulty(storyWords[currentWordIndex]) > 7 ? 'Hard' : 
                        getWordDifficulty(storyWords[currentWordIndex]) > 4 ? 'Medium' : 'Easy'}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Temporary Transcription Display */}
          {isRecording && (
            <View style={styles.tempTranscriptionContainer}>
              <Text style={styles.tempTranscriptionLabel}>
                Listening: {isProcessing ? '(Processing...)' : ''}
              </Text>
              <Text style={styles.tempTranscriptionText}>{tempTranscription}</Text>
              {confidence > 0 && (
                <Text style={styles.confidenceText}>
                  Confidence: {Math.round(confidence * 100)}%
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Footer Section with Controls */}
        <View style={styles.footerSection}>
          <View style={styles.metricsContainer}>
            {isRecording && (
              <>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Progress</Text>
                  <Text style={styles.metricValue}>
                    {Math.max(0, currentWordIndex + 1)}/{storyWords.length}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>WPM</Text>
                  <Text style={styles.metricValue}>
                    {wpm > 0 ? wpm : '0'}
                  </Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>Accuracy</Text>
                  <Text style={styles.metricValue}>
                    {accuracy > 0 ? `${accuracy}%` : '0%'}
                  </Text>
                </View>
              </>
            )}
          </View>
          
          <View style={styles.controlButtons}>
            <TouchableOpacity
              style={[styles.controlButton, styles.resetButton]}
              onPress={handleReset}
              disabled={!selectedStudent || !selectedStory}
            >
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.micButton]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={!selectedStudent || !selectedStory}
            >
              <Animated.View style={{ transform: [{ scale: micAnimation }] }}>
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={32}
                  color={isRecording ? '#ff4444' : '#fff'}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 0,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: 15,
  },
  controlsSection: {
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  readingSection: {
    flex: 1,
    marginBottom: 15,
    minHeight: 500,
  },
  footerSection: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    zIndex: 1,
  },
  textAreaCard: {
    width: '100%',
    height: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    marginBottom: 20,
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
  dropdownsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  dropdownWrapper: {
    flex: 1,
  },
  dropdownContainer: {
    marginBottom: 0,
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  pickerWrapper: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 4,
  },
  picker: {
    width: '100%',
    height: 40,
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
  textAreaScroll: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    maxHeight: 320,
  },
  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingBottom: 20,
    lineHeight: 32,
  },
  word: {
    fontSize: 20,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#f0f4f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#2a3a4d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recordingContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingActive: {
    backgroundColor: '#ffe6e6',
  },
  micContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  recordButtonDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  recordingTextDisabled: {
    color: '#999999',
  },
  currentWord: {
    backgroundColor: '#FFA726',
    color: '#fff',
    fontWeight: '600',
    shadowColor: '#E65100',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nextWord: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 2,
    color: '#1976D2',
    fontWeight: '500',
    shadowColor: '#1976D2',
    shadowOpacity: 0.2,
  },
  accuracyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  transcriptionContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    maxHeight: 200,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#333',
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    transform: [{ scale: 1.1 }],
  },
  controlSection: {
    width: '100%',
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 10,
  },
  metricBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A90E2',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 15,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
  },
  tempTranscriptionContainer: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginVertical: 10,
    width: '100%',
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tempTranscriptionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontWeight: '500',
  },
  tempTranscriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    zIndex: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressText: {
    fontSize: 16,
    color: '#2a3a4d',
    fontWeight: '500',
    textAlign: 'center',
  },
  metricsText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 5,
  },
  difficultWord: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  mediumWord: {
    borderColor: '#FFA726',
    borderWidth: 1,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  modeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  modeButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  settingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  settingButtonText: {
    marginLeft: 5,
    color: '#666',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hintText: {
    color: '#666',
    fontSize: 14,
  },
  interimWord: {
    backgroundColor: '#FFE082',
    color: '#E65100',
    fontWeight: '500',
    shadowColor: '#FFA000',
    shadowOpacity: 0.3,
    transform: [{ scale: 1.05 }],
  },
});