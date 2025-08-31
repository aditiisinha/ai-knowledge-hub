import axios from 'axios';
import { toast } from 'react-toastify';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token in requests
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle different HTTP status codes
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Your session has expired. Please log in again.');
        window.location.href = '/login';
      } else if (status === 403) {
        // Forbidden - user doesn't have permission
        toast.error('You do not have permission to perform this action.');
      } else if (status === 404) {
        // Not Found
        toast.error('The requested resource was not found.');
      } else if (status >= 500) {
        // Server error
        toast.error('A server error occurred. Please try again later.');
      }
      
      // Return the error with the response data
      return Promise.reject({
        status,
        message: data?.message || 'An error occurred',
        errors: data?.errors,
      });
    } else if (error.request) {
      // The request was made but no response was received
      toast.error('No response from server. Please check your connection.');
      return Promise.reject({
        message: 'No response from server',
        isNetworkError: true,
      });
    } else {
      // Something happened in setting up the request
      toast.error('An unexpected error occurred.');
      return Promise.reject({
        message: error.message || 'An unexpected error occurred',
      });
    }
  }
);

export default API;
