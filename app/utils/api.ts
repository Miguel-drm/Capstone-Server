import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
export const API_URL = 'https://capstone-server-go3v.onrender.com/api';
// export const API_URL = 'http://192.168.1.1:5000/api';  // Replace with your computer's local IP address

// Validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
};

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// API Headers
export const getHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export interface CreateTranscriptionRequest {
  studentId: string;
  storyId: string;
  transcription: string;
  language: string;
  wpm?: number;
  accuracy?: number;
}

// API Methods
export const api = {
  // Auth endpoints
  auth: {
    login: async (email: string, password: string) => {
      try {
        if (!validateEmail(email)) {
          throw new Error('Invalid email format');
        }
        if (!password) {
          throw new Error('Password is required');
        }

        console.log('Attempting login for:', email);
        console.log('API URL:', `${API_URL}/auth/login`);
        
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        console.log('Login response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Login response data:', data);

        if (data.token) {
          await AsyncStorage.setItem('userToken', data.token);
        }
        if (data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        }
        return data;
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw error;
      }
    },

    signup: async (name: string, surname: string, email: string, password: string) => {
      try {
        // Validate inputs
        if (!name || name.trim().length < 2) {
          throw new Error('Name must be at least 2 characters long');
        }
        if (!surname || surname.trim().length < 2) {
          throw new Error('Surname must be at least 2 characters long');
        }
        if (!validateEmail(email)) {
          throw new Error('Invalid email format');
        }
        if (!validatePassword(password)) {
          throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers');
        }

        console.log('Sending signup request to:', `${API_URL}/auth/signup`);
        console.log('Signup data:', { name, surname, email, password: '***' });
        
        const response = await fetch(`${API_URL}/auth/signup`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify({ name, surname, email, password }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        console.log('Signup response status:', response.status);
        const data = await handleResponse(response);
        console.log('Signup response data:', data);

        if (data.token) {
          await AsyncStorage.setItem('userToken', data.token);
        }
        if (data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        }
        return data;
      } catch (error: any) {
        console.error('Signup error:', error);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw error;
      }
    },

    logout: async () => {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    }
  },

  // User endpoints
  user: {
    getProfile: async () => {
      const response = await fetch(`${API_URL}/profile`, {
        headers: await getHeaders()
      });
      return handleResponse(response);
    },

    updateProfile: async (data: { name?: string }) => {
      if (data.name && data.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    }
  },

  // Health check
  health: async () => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return handleResponse(response);
    } catch (error: any) {
      console.error('Health check error:', error);
      if (error.name === 'AbortError') {
        throw new Error('Server health check timed out');
      }
      throw error;
    }
  },

  // Test endpoints
  test: {
    db: async () => {
      const response = await fetch(`${API_URL}/test/db`);
      return handleResponse(response);
    },
    user: async (email: string) => {
      const response = await fetch(`${API_URL}/test/user`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ email })
      });
      return handleResponse(response);
    }
  },

  // Student endpoints
  students: {
    getAll: async () => {
      console.log('Calling API to get all students...');
      try {
        const response = await fetch(`${API_URL}/upload/students`, {
          headers: await getHeaders(),
        });

        console.log('Response status from /upload/students:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error getting students:', errorData);
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Successfully fetched students data:', data);
        return data;

      } catch (error: any) {
        console.error('Fetch error in api.students.getAll:', error);
        throw error;
      }
    },
  },

  // Story endpoints
  stories: {
    getAll: async () => {
      const response = await fetch(`${API_URL}/stories`, {
        headers: await getHeaders(),
      });
      return handleResponse(response);
    },

    getById: async (id: string, signal?: AbortSignal) => {
      const response = await fetch(`${API_URL}/stories/${id}`, {
        headers: await getHeaders(),
        signal,
      });
      return handleResponse(response);
    },
  },

  // Text extraction endpoint
  extractText: async (
    { fileUrl, fileType, gridFsId }: { fileUrl?: string; fileType: string; gridFsId?: string },
    signal?: AbortSignal
  ) => {
    const response = await fetch(`${API_URL}/extract-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileUrl, fileType, gridFsId }),
      signal,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to extract text');
    }
    return response.json();
  },

  // Bot endpoints
  bots: {
    getAll: async () => {
      const response = await fetch(`${API_URL}/bots`, {
        headers: await getHeaders(),
      });
      return handleResponse(response);
    },
  },

  // Transcription endpoints
  transcriptions: {
    create: async (data: CreateTranscriptionRequest) => {
      const response = await fetch(`${API_URL}/transcriptions`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },

    getByStudent: async (studentId: string) => {
      const response = await fetch(`${API_URL}/transcriptions/student/${studentId}`, {
        headers: await getHeaders()
      });
      return handleResponse(response);
    },

    getByStory: async (storyId: string) => {
      const response = await fetch(`${API_URL}/transcriptions/story/${storyId}`, {
        headers: await getHeaders()
      });
      return handleResponse(response);
    }
  },
};

// Auth state management
export const auth = {
  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('userToken');
    return !!token;
  },

  getToken: async () => {
    return await AsyncStorage.getItem('userToken');
  },

  getUser: async () => {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }
}; 

export default api;