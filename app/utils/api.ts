import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
export const API_URL = 'https://capstone-backend-t22z.onrender.com/api';  // Your deployed backend URL

// API Headers
export const getHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// API Methods
export const api = {
  // Auth endpoints
  auth: {
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ email, password })
      });
      const data = await handleResponse(response);
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
      }
      if (data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      }
      return data;
    },

    signup: async (name: string, email: string, password: string) => {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ name, email, password })
      });
      const data = await handleResponse(response);
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
      }
      if (data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      }
      return data;
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
    const response = await fetch(`${API_URL}/health`);
    return handleResponse(response);
  }
};

// Response handler
const handleResponse = async (response: Response) => {
  const text = await response.text();
  let data;
  
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error('Error parsing response:', e);
    throw new Error('Invalid response from server');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
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