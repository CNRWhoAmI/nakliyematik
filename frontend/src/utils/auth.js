import axios from 'axios';

// API URL tanımını doğru yapılandırma
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Kullanıcı bilgilerini kaydetme
export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// Kullanıcı bilgilerini alma
export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Kullanıcı rolünü kontrol etme
export const isTransporter = () => {
  const user = getUser();
  return user && user.user_type === 'transporter';
};

export const isCargoOwner = () => {
  const user = getUser();
  return user && user.user_type === 'cargo_owner';
};

// Oturum kapatma
export const logout = async () => {
  try {
    // Logout endpoint'e istek at
    await axios.post(`${API_URL}/auth/logout/`, {}, {
      withCredentials: true
    });
  } catch (error) {
    console.error('Logout API error:', error);
  } finally {
    // Kullanıcı verilerini temizle
    localStorage.removeItem('user');
  }
};

// Token yenileme işlemi
export const refreshToken = async () => {
  try {
    console.log('Attempting to refresh token...');

    // Token yenileme endpoint'ine istek at - çerez otomatik gönderilir
    const response = await axios.post(`${API_URL}/auth/token/refresh/`, {}, {
      withCredentials: true
    });

    // Cevabı kontrol et
    if (response.data && (response.data.success || response.data.access)) {
      console.log('Token refreshed successfully');
      return true;
    } else {
      console.error('Token refresh response did not indicate success');
      return false;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    if (error.response) {
      console.error('Server response:', error.response.data);
    }
    
    // Token yenileme başarısız olursa localStorage temizle
    localStorage.removeItem('user');
    
    // Çıkış olduğunda login sayfasına yönlendirme
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    
    return false;
  }
};

// Kullanıcı giriş yapmış mı kontrolü
export const isAuthenticated = () => {
  // Kullanıcı bilgisi varsa giriş yapmış kabul et
  // (Token çerezlerde olduğu için direkt kontrol edemeyiz)
  return !!getUser();
};

// Token'ların durumunu kontrol etmek için debug fonksiyon
export const checkAuthState = () => {
  const user = getUser();
  
  console.log('Auth state check:');
  console.log('- User info exists:', Boolean(user));
  
  if (user) {
    console.log('- User type:', user.user_type);
  }
  
  return {
    isAuthenticated: Boolean(user),
    hasUser: Boolean(user)
  };
};