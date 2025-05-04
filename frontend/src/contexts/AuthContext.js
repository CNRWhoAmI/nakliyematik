import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Kimlik doğrulama sistemi başlatma - sadece bir kez çalışır
  useEffect(() => {
    let isMounted = true;
    let timer = null;
    
    const checkAuth = async () => {
      try {
        console.log('AuthContext - Checking authentication status');
        
        // Backend'e API isteği gönder
        const response = await api.get('/auth/user/', { 
          withCredentials: true 
        });
        
        // Component unmount olduysa işlemi durdur
        if (!isMounted) return;
        
        console.log('AuthContext - Authentication successful, user:', response.data);
        
        // Kullanıcı verisini normalize et
        const userData = response.data?.user || response.data;
        
        // State güncelle
        setCurrentUser(userData);
      } catch (err) {
        console.log('AuthContext - Authentication failed:', err.message);
        
        // Component unmount olduysa işlemi durdur
        if (!isMounted) return;
        
        // Token yenileme denenebilir, ama bunu kaldırıyoruz
        // çünkü giriş yapmamış kullanıcılar için gereksiz
        setCurrentUser(null);
        setError(err);
      } finally {
        // Component unmount olduysa işlemi durdur
        if (!isMounted) return;
        
        // 1 saniye sonra loading'i kapat (UI flickering'i önlemek için)
        timer = setTimeout(() => {
          if (isMounted) {
            setLoading(false);
          }
        }, 1000);
      }
    };
    
    // Auth kontrolünü başlat
    checkAuth();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);
  
  // Login fonksiyonu
  const login = async (username, password) => {
    try {
      setLoading(true);
      console.log('AuthContext - Login attempt for:', username);
      
      // Backend'e login isteği
      const response = await api.post('/auth/login/', {
        username, 
        password
      }, { 
        withCredentials: true 
      });
      
      // Kullanıcı verisini al
      const userData = response.data?.user || response.data;
      console.log('AuthContext - Login successful, user:', userData);
      
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      console.error('AuthContext - Login failed:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout fonksiyonu
  const logout = async () => {
    try {
      setLoading(true);
      console.log('AuthContext - Logout attempt');
      
      // Backend'e logout isteği
      await api.post('/auth/logout/', {}, { 
        withCredentials: true 
      });
      
      console.log('AuthContext - Logout successful');
      setCurrentUser(null);
    } catch (err) {
      console.error('AuthContext - Logout failed:', err);
      // Hata olsa bile kullanıcıyı çıkış yapmış say
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Context değerleri
  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    error,
    login,
    logout,
    isCargoOwner: currentUser?.user_type === 'cargo_owner',
    isTransporter: currentUser?.user_type === 'transporter',
  };
  
  // Provider component'i
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}