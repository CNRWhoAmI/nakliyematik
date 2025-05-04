import api from './api';
import { 
  AUTH_ENDPOINTS,
  HTTP_STATUS 
} from '../config/api';

// Logging modülü bulunamadığı için bunu kaldıralım

/**
 * Değerlendirme verilerini normalize eder
 * @param {Object} rating - API'den gelen değerlendirme verisi
 * @param {string} userType - Kullanıcı tipi ('cargo_owner' veya 'transporter')
 * @returns {Object} Normalleştirilmiş değerlendirme verisi
 */
const normalizeRatingData = (rating, userType) => {
  if (!rating) return null;
  
  // Değerlendiren bilgilerini elde et
  let reviewerInfo = {
    id: null,
    name: 'Bilinmiyor',
    company_name: 'Bilinmiyor'
  };
  
  // 1. Doğrudan reviewer objesi içinde
  if (rating.reviewer) {
    reviewerInfo = {
      id: rating.reviewer.id || null,
      name: rating.reviewer.name || 
            `${rating.reviewer.first_name || ''} ${rating.reviewer.last_name || ''}`.trim() || 
            'Bilinmiyor',
      company_name: rating.reviewer.company_name || 'Bilinmiyor'
    };
  }
  // 2. from_user içinde
  else if (rating.from_user) {
    reviewerInfo = {
      id: rating.from_user.id || null,
      name: `${rating.from_user.first_name || ''} ${rating.from_user.last_name || ''}`.trim() || 'Bilinmiyor',
      company_name: rating.from_company_name || rating.from_user.company_name || 'Bilinmiyor'
    };
  }
  // 3. transportation içinde - yük sahibi tarafından
  else if (userType === 'transporter' && rating.transportation?.cargo_owner) {
    reviewerInfo = {
      id: rating.transportation.cargo_owner.id || null,
      name: rating.transportation.cargo_owner.user ? 
        `${rating.transportation.cargo_owner.user.first_name || ''} ${rating.transportation.cargo_owner.user.last_name || ''}`.trim() : 'Bilinmiyor',
      company_name: rating.transportation.cargo_owner.company_name || 'Bilinmiyor'
    };
  }
  // 4. transportation içinde - taşıyıcı tarafından
  else if (userType === 'cargo_owner' && rating.transportation?.transporter) {
    reviewerInfo = {
      id: rating.transportation.transporter.id || null,
      name: rating.transportation.transporter.user ? 
        `${rating.transportation.transporter.user.first_name || ''} ${rating.transportation.transporter.user.last_name || ''}`.trim() : 'Bilinmiyor',
      company_name: rating.transportation.transporter.company_name || 'Bilinmiyor'
    };
  }
  
  // Rating'i normalize et
  return {
    id: rating.id || Math.random().toString(36).substring(2, 9),
    rating: parseFloat(rating.rating) || 0,
    comment: rating.comment || rating.rating_comment || '',
    created_at: rating.created_at || rating.rated_at || new Date().toISOString(),
    reviewer: reviewerInfo,
    transportation: rating.transportation || {}
  };
};

/**
 * Profil istek durumları
 */
export const ProfileRequestStatus = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  PARTIAL: 'partial'
};

/**
 * Profil Servisi
 * Kullanıcı profili ile ilgili API işlemleri
 */
const profileService = {
  /**
   * Mevcut kullanıcı profilini getir
   * Backend URL yapısına uygun olarak güncellenmiş
   * 
   * @returns {Promise<Object>} Kullanıcı profil bilgileri
   */
  getProfile: async () => {
    try {
      console.log('ProfileService - Fetching current user profile');
      
      // Önce kullanıcı tipini ve temel bilgilerini al - auth/user/ endpoint'ini kullan
      const userResponse = await api.get(AUTH_ENDPOINTS.USER);
      const userData = userResponse.data;
      
      console.log('ProfileService - User API response:', userData);
      
      // Kullanıcı tipi ve detaylı bilgileri içeriyor mu kontrol et
      if (userData.cargo_owner) {
        // API yanıtında cargo_owner bilgisi varsa, onu kullan
        console.log('ProfileService - Using cargo_owner data from user response');
        return {
          user: userData.user || userData,
          ...userData.cargo_owner,
          _fetchStatus: ProfileRequestStatus.SUCCESS
        };
      } else if (userData.transporter) {
        // API yanıtında transporter bilgisi varsa, onu kullan
        console.log('ProfileService - Using transporter data from user response');
        return {
          user: userData.user || userData,
          ...userData.transporter,
          _fetchStatus: ProfileRequestStatus.SUCCESS
        };
      } else if (userData.user && userData.user.user_type) {
        // Kullanıcı tipine göre ilgili endpoint'i çağır
        const userType = userData.user.user_type;
        
        if (userType === 'cargo_owner') {
          try {
            // Önce yeni URL yapısını dene - artık aşağıya değiştirildi
            const profileResponse = await api.get('/profile/cargo-owner/');
            console.log('ProfileService - Cargo owner profile response from new endpoint:', profileResponse.data);
            
            return {
              user: userData.user || userData,
              ...profileResponse.data,
              _fetchStatus: ProfileRequestStatus.SUCCESS
            };
          } catch (profileError) {
            console.error('ProfileService - Cargo owner profile details not found:', profileError);
            // Hata durumunda sadece user bilgisini döndür
            return {
              user: userData.user || userData,
              company_name: userData.user?.company_name || '',
              phone: userData.user?.phone || '',
              address: userData.user?.address || '',
              tax_number: userData.user?.tax_number || '',
              _fetchStatus: ProfileRequestStatus.PARTIAL
            };
          }
        } else if (userType === 'transporter') {
          try {
            // Önce yeni URL yapısını dene
            const profileResponse = await api.get('/profile/transporter/');
            console.log('ProfileService - Transporter profile response from new endpoint:', profileResponse.data);
            
            return {
              user: userData.user || userData,
              ...profileResponse.data,
              _fetchStatus: ProfileRequestStatus.SUCCESS
            };
          } catch (profileError) {
            console.error('ProfileService - Transporter profile details not found:', profileError);
            // Hata durumunda sadece user bilgisini döndür
            return {
              user: userData.user || userData,
              company_name: userData.user?.company_name || '',
              phone: userData.user?.phone || '',
              address: userData.user?.address || '',
              vehicle_type: userData.user?.vehicle_type || '',
              tax_number: userData.user?.tax_number || '',
              _fetchStatus: ProfileRequestStatus.PARTIAL
            };
          }
        }
      }
      
      // Tüm diğer durumlar için sadece temel user bilgisini döndür
      console.log('ProfileService - Using basic user info only');
      return {
        user: userData.user || userData,
        company_name: userData.user?.company_name || '',
        phone: userData.user?.phone || '',
        address: userData.user?.address || '',
        tax_number: userData.user?.tax_number || '',
        _fetchStatus: ProfileRequestStatus.PARTIAL
      };
    } catch (error) {
      console.error('ProfileService - Error fetching profile:', error);
      
      // Oturum açılmamış olabilir
      if (error.response) {
        console.error('ProfileService - Error details:', {
          status: error.response.status,
          data: error.response.data
        });
        
        if (error.response.status === HTTP_STATUS.UNAUTHORIZED) {
          console.error('ProfileService - User is not authenticated');
        }
      }
      
      // Hata durumunu da içeren bir nesne döndür
      return {
        user: null,
        error: error.message || 'Bilinmeyen bir hata oluştu',
        _fetchStatus: ProfileRequestStatus.FAILED
      };
    }
  },
  
  /**
   * Yük sahibi profili güncelle
   * Backend URL yapısına uygun olarak güncellenmiş
   * 
   * @param {Object} profileData - Güncellenecek profil verileri
   * @param {boolean} isEmailChanged - E-posta değişti mi
   * @returns {Promise<Object>} Güncellenmiş profil
   */
  updateCargoOwnerProfile: async (profileData, isEmailChanged = false) => {
    try {
      console.log('ProfileService - Updating cargo owner profile:', profileData);
      
      // Backend'in beklediği iç içe veri formatı 
      const updateData = {
        user: {
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || ''
        },
        company_name: profileData.company_name || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        tax_number: profileData.tax_number || ''
      };
      
      // Sadece e-posta değiştiyse ekle
      if (isEmailChanged && profileData.email) {
        updateData.user.email = profileData.email;
      }
      
      console.log('ProfileService - Formatted update data:', updateData);
      
      // PUT metodu ile güncelleme
      try {
        const response = await api.put('/profile/cargo-owner/', updateData);
        console.log('ProfileService - Successfully updated profile:', response.data);
        return {
          ...response.data,
          _updateStatus: ProfileRequestStatus.SUCCESS
        };
      } catch (error) {
        console.error('ProfileService - Error updating cargo owner profile:', error);
        throw error;
      }
    } catch (error) {
      console.error('ProfileService - Error in updateCargoOwnerProfile:', error);
      
      // Hata detaylarını döndür
      let errorMessage = 'Profil güncellenirken bir hata oluştu.';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          // API'den gelen hata mesajlarını işle
          const errors = [];
          for (const [field, messages] of Object.entries(error.response.data)) {
            if (Array.isArray(messages)) {
              errors.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              errors.push(`${field}: ${messages}`);
            } else if (field === 'detail') {
              errors.push(messages);
            }
          }
          if (errors.length > 0) {
            errorMessage += ' ' + errors.join('; ');
          }
        } else if (typeof error.response.data === 'string') {
          errorMessage += ' ' + error.response.data;
        }
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Taşıyıcı profili güncelle
   * Backend URL yapısına uygun olarak güncellenmiş
   * 
   * @param {Object} profileData - Güncellenecek profil verileri
   * @param {boolean} isEmailChanged - E-posta değişti mi
   * @returns {Promise<Object>} Güncellenmiş profil
   */
  updateTransporterProfile: async (profileData, isEmailChanged = false) => {
    try {
      console.log('ProfileService - Updating transporter profile:', profileData);
      
      // Backend'in beklediği iç içe veri formatı
      const updateData = {
        user: {
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || ''
        },
        company_name: profileData.company_name || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        tax_number: profileData.tax_number || ''
      };
      
      // Araç tipi değeri kontrol et ve ekle - backend'in beklediği formatta
      if (profileData.vehicle_type) {
        updateData.vehicle_type = profileData.vehicle_type;
      }
      
      // Sadece e-posta değiştiyse ekle
      if (isEmailChanged && profileData.email) {
        updateData.user.email = profileData.email;
      }
      
      console.log('ProfileService - Formatted update data:', updateData);
      
      // PUT metodu ile güncelleme
      try {
        const response = await api.put('/profile/transporter/', updateData);
        console.log('ProfileService - Successfully updated profile:', response.data);
        return {
          ...response.data,
          _updateStatus: ProfileRequestStatus.SUCCESS
        };
      } catch (error) {
        console.error('ProfileService - Error updating transporter profile:', error);
        // API isteğinin içeriğini ve hatayı günlükleme
        console.error('Request data:', JSON.stringify(updateData));
        console.error('Error response:', error.response?.data);
        throw error;
      }
    } catch (error) {
      // Hata işleme...
    }
  },
  
  /**
   * Yük sahibi değerlendirmelerini getir
   * Backend URL yapısına uygun olarak güncellenmiş
   * 
   * @returns {Promise<Array>} Değerlendirmeler listesi
   */
  getCargoOwnerRatings: async () => {
    try {
      console.log('ProfileService - Fetching cargo owner ratings');
      
      // Denenecek endpoint'ler listesi - backend URL yapısına uygun sırayla
      const endpoints = [
        // Öncelikle yeni URL yapısını dene
        '/profile/ratings/cargo-owner/',
        '/profile/ratings/',
        // Alternatif yapıları dene
        '/transportation/ratings/cargo-owner/'
      ];
      
      let response = null;
      
      // Her bir endpoint'i dene, biri çalışana kadar
      for (const endpoint of endpoints) {
        try {
          console.log(`ProfileService - Trying to fetch ratings from ${endpoint}`);
          const resp = await api.get(endpoint);
          if (resp && resp.data) {
            console.log(`ProfileService - Successfully fetched ratings from ${endpoint}`);
            response = resp;
            break;
          }
        } catch (err) {
          console.error(`ProfileService - Failed to fetch ratings from ${endpoint}:`, err);
          // Bu endpoint başarısız oldu, bir sonrakini dene
          continue;
        }
      }
      
      if (!response || !response.data) {
        console.warn("ProfileService - All rating endpoints failed, returning empty array");
        return [];
      }
      
      // Değerlendirme verilerini normalize et
      const normalizedRatings = Array.isArray(response.data) ? 
        response.data.map(rating => normalizeRatingData(rating, 'cargo_owner')) : [];
        
      console.log('ProfileService - Normalized ratings count:', normalizedRatings.length);
      return normalizedRatings;
    } catch (error) {
      console.error('ProfileService - Error fetching cargo owner ratings:', error);
      // Hata durumunda boş dizi döndür
      return [];
    }
  },
  
  /**
   * Taşıyıcı değerlendirmelerini getir
   * Backend URL yapısına uygun olarak güncellenmiş
   * 
   * @returns {Promise<Array>} Değerlendirmeler listesi
   */
  getTransporterRatings: async () => {
    try {
      console.log('ProfileService - Fetching transporter ratings');
      
      // Denenecek endpoint'ler listesi - backend URL yapısına uygun sırayla
      const endpoints = [
        // Öncelikle yeni URL yapısını dene
        '/profile/ratings/transporter/',
        // Alternatif yapıları dene
        '/transportation/ratings/transporter/',
        '/profile/ratings/'
      ];
      
      let response = null;
      
      // Her bir endpoint'i dene, biri çalışana kadar
      for (const endpoint of endpoints) {
        try {
          console.log(`ProfileService - Trying to fetch ratings from ${endpoint}`);
          const resp = await api.get(endpoint);
          if (resp && resp.data) {
            console.log(`ProfileService - Successfully fetched ratings from ${endpoint}`);
            response = resp;
            break;
          }
        } catch (err) {
          console.error(`ProfileService - Failed to fetch ratings from ${endpoint}:`, err);
          // Bu endpoint başarısız oldu, bir sonrakini dene
          continue;
        }
      }
      
      if (!response || !response.data) {
        console.warn("ProfileService - All transporter rating endpoints failed, returning empty array");
        return [];
      }
      
      // Değerlendirme verilerini normalize et
      const normalizedRatings = Array.isArray(response.data) ? 
        response.data.map(rating => normalizeRatingData(rating, 'transporter')) : [];
        
      console.log('ProfileService - Normalized transporter ratings count:', normalizedRatings.length);
      return normalizedRatings;
    } catch (error) {
      console.error('ProfileService - Error fetching transporter ratings:', error);
      // Hata durumunda boş dizi döndür
      return [];
    }
  },
  
  /**
   * Değerlendirme ekle
   * Backend URL yapısına uygun olarak güncellenmiş
   * 
   * @param {Object} ratingData - Değerlendirme verileri
   * @returns {Promise<Object>} Oluşturulan değerlendirme
   */
  addRating: async (ratingData) => {
    try {
      console.log('ProfileService - Adding rating:', ratingData);
      
      const response = await api.post('/transportation/ratings/', ratingData);
      return response.data;
    } catch (error) {
      console.error('ProfileService - Error adding rating:', error);
      throw error;
    }
  },
  
  /**
   * Kullanıcı profil fotoğrafı yükle
   * Backend URL yapısına uygun olarak güncellenmiş
   * 
   * @param {File} file - Yüklenecek dosya
   * @returns {Promise<Object>} Yükleme sonucu
   */
  uploadProfilePhoto: async (file) => {
    try {
      console.log('ProfileService - Uploading profile photo:', file.name);
      
      const formData = new FormData();
      formData.append('photo', file);
      
      // Upload metodu api.js içinde tanımlanmışsa
      if (typeof api.upload === 'function') {
        const response = await api.upload('/profile/photo/', formData);
        return response.data;
      }
      
      // Normal post ile multipart/form-data olarak yükle
      const response = await api.post('/profile/photo/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('ProfileService - Error uploading profile photo:', error);
      throw error;
    }
  },
  
  /**
   * Yük sahibi olarak kayıt ol
   * 
   * @param {Object} data - Kayıt verileri
   * @returns {Promise<Object>} Kayıt sonucu
   */
  registerCargoOwner: async (data) => {
    try {
      console.log('ProfileService - Registering as cargo owner:', data);
      
      const response = await api.post('/profile/register/cargo-owner/', data);
      return response.data;
    } catch (error) {
      console.error('ProfileService - Error registering as cargo owner:', error);
      
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === 'object') {
          const errorMessages = [];
          for (const [field, messages] of Object.entries(errors)) {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              errorMessages.push(`${field}: ${messages}`);
            }
          }
          if (errorMessages.length > 0) {
            throw new Error(errorMessages.join('\n'));
          }
        }
      }
      
      throw error;
    }
  },
  
  /**
   * Taşıyıcı olarak kayıt ol
   * 
   * @param {Object} data - Kayıt verileri
   * @returns {Promise<Object>} Kayıt sonucu
   */
  registerTransporter: async (data) => {
    try {
      console.log('ProfileService - Registering as transporter:', data);
      
      const response = await api.post('/profile/register/transporter/', data);
      return response.data;
    } catch (error) {
      console.error('ProfileService - Error registering as transporter:', error);
      
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === 'object') {
          const errorMessages = [];
          for (const [field, messages] of Object.entries(errors)) {
            if (Array.isArray(messages)) {
              errorMessages.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'string') {
              errorMessages.push(`${field}: ${messages}`);
            }
          }
          if (errorMessages.length > 0) {
            throw new Error(errorMessages.join('\n'));
          }
        }
      }
      
      throw error;
    }
  }
};

export default profileService;