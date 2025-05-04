import api from './api';

// API URL'yi logla - Debug için
console.log('AuthService - API URL configured as:', process.env.REACT_APP_API_URL);

class AuthService {
  // Kullanıcı girişi
  async login(username, password) {
    try {
      console.log('AuthService - Attempting login for:', username);
      
      const response = await api.post('/auth/login/', {
        username,
        password
      }, { 
        withCredentials: true,
        // Zamanlanmış önbelleği devre dışı bırak
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      console.log('AuthService - Login response:', response);
      
      // Kullanıcı verilerini normalize et
      let userData;
      if (response.data?.user) {
        userData = response.data.user;
      } else if (response.data?.token || response.data?.access) {
        // Token var ama kullanıcı verisi yoksa, verileri ayrıca al
        userData = await this.fetchUserData();
      } else if (response.data?.id || response.data?.username) {
        userData = response.data;
      } else {
        userData = await this.fetchUserData();
      }
      
      console.log('AuthService - Normalized user data:', userData);
      return userData;
    } catch (error) {
      console.error('AuthService - Login error:', error);
      throw error;
    }
  }

  // Kullanıcı bilgilerini al
  async fetchUserData() {
    try {
      console.log('AuthService - Fetching user data');
      
      const response = await api.get('/auth/user/', {
        withCredentials: true
      });
      
      console.log('AuthService - User data response:', response);
      
      // Veri normalleştirme
      let userData;
      if (response.data?.user) {
        userData = response.data.user;
      } else if (response.data?.id || response.data?.username) {
        userData = response.data;
      } else {
        console.warn('AuthService - Unexpected user data format:', response.data);
        userData = response.data;
      }
      
      return userData;
    } catch (error) {
      console.error('AuthService - Error fetching user data:', error);
      throw error;
    }
  }

  // Kullanıcıyı kontrol et
  async getCurrentUser() {
    try {
      return await this.fetchUserData();
    } catch (error) {
      console.error('AuthService - Get current user error:', error);
      return null;
    }
  }

  // Token yenileme
  async refreshToken() {
    try {
      console.log('AuthService - Attempting to refresh token');
      
      const response = await api.post('/auth/token/refresh/', {}, {
        withCredentials: true,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      console.log('AuthService - Token refresh response:', response);
      
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('AuthService - Token refresh error:', error);
      return false;
    }
  }

  // Çıkış yapma
  async logout() {
    try {
      console.log('AuthService - Logging out');
      
      await api.post('/auth/logout/', {}, {
        withCredentials: true
      });
      
      console.log('AuthService - Logout successful');
    } catch (error) {
      console.error('AuthService - Logout error:', error);
      // Hata durumunda bile sayfayı yönlendir
      window.location.href = '/login';
      throw error;
    }
  }

  // Kimlik doğrulama durumunu kontrol et
  async isAuthenticated() {
    try {
      console.log('AuthService - Checking authentication status');
      
      await api.get('/auth/user/', {
        withCredentials: true,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      return true;
    } catch (error) {
      console.error('AuthService - Auth check failed:', error);
      return false;
    }
  }
}

export default new AuthService();