import axios from 'axios';

// API URL'yi environment değişkeninden al
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Debug bilgilerini logla
console.log('API - Using API URL:', API_URL);

// API instance oluştur
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // HTTP-only çerezler için zorunlu
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;