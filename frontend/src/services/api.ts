import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5001', // Backend server URL
  withCredentials: true, // Important for handling cookies/sessions
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log 401s during auth check as they're expected when not logged in
    if (error.response?.status === 401 && !error.config.url.includes('current-user')) {
      console.error('Authentication error:', error);
    }
    return Promise.reject(error);
  }
);

export default api;