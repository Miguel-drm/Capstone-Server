import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
export const API_URL = 'https://capstone-server-5pfx.onrender.com/api';
// export const API_URL = 'http://localhost:5000/api'; 

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
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }
      if (!password) {
        throw new Error('Password is required');
      }

      console.log('Attempting login for:', email);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ email, password })
      });
      
      console.log('Login response status:', response.status);
      const data = await handleResponse(response);
      console.log('Login response data:', data);

      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
      }
      if (data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      }
      return data;
    },

    signup: async (name: string, surname: string, email: string, password: string) => {
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
        body: JSON.stringify({ name, surname, email, password })
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
    const response = await fetch(`${API_URL}/health`);
    return handleResponse(response);
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
    console.error('Raw response:', text);
    throw new Error('Invalid response from server');
  }

  if (!response.ok) {
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      data: data
    });
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

export default api;