import api from './api';
import { 
  HTTP_STATUS 
} from '../config/api';
import { CookieRounded } from '@mui/icons-material';

/**
 * Taşıma (Transportation) Servisi
 * Taşıma işlemleri için API isteklerini yönetir
 */
const transportationService = {
  /**
   * Taşıma listesini getir
   * Backend URL: /api/transportations/
   * 
   * @param {Object} filters - Filtreleme parametreleri
   * @returns {Promise<Array>} Taşımalar listesi
   */
  getTransportations: async (filters = {}) => {
    try {
      console.log('TransportationService - Fetching transportations with filters:', filters);
      
      // Filtreleri URL parametrelerine dönüştür
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get('/transportations/', { params });
      
      console.log('TransportationService - Fetched transportations:', response.data.length || 'unknown length');
      return normalizeTransportations(response);
    } catch (error) {
      console.error('TransportationService - Error fetching transportations:', error);
      throw error;
    }
  },

  /**
   * Taşıma detayını getir
   * Backend URL: /api/transportations/{id}/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @returns {Promise<Object>} Taşıma detayları
   */
  getTransportationDetails: async (id) => {
    try {
      const response = await api.get(`/transportations/${id}/`);
      console.log('Raw response for transportation', id, ':', response);
      
      // Parse coordinates from strings to numbers if needed
      const data = response.data;
      
      // Basit normalizasyon
      if (data) {
        if (data.pickup_latitude) data.pickup_latitude = String(data.pickup_latitude);
        if (data.pickup_longitude) data.pickup_longitude = String(data.pickup_longitude);
        if (data.delivery_latitude) data.delivery_latitude = String(data.delivery_latitude);
        if (data.delivery_longitude) data.delivery_longitude = String(data.delivery_longitude);
        if (data.current_latitude) data.current_latitude = String(data.current_latitude);
        if (data.current_longitude) data.current_longitude = String(data.current_longitude);
      }
      
      console.log('Normalized data for transportation', id, ':', data);
      return data;
    } catch (error) {
      console.error('Error getting transportation details:', error);
      throw error;
    }
  },

  /**
   * Aktif taşımaları getir
   * Backend URL: /api/transportations/active/
   * 
   * @param {Object} filters - Filtreleme parametreleri (opsiyonel)
   * @returns {Promise<Array>} Aktif taşımalar listesi
   */
  getActiveTransportations: async (filters = {}) => {
    try {
      console.log('TransportationService - Fetching active transportations with filters:', filters);
      
      // Filtreleri URL parametrelerine dönüştür
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get('/transportations/active/', { params });
      
      console.log(`TransportationService - Fetched active transportations: ${
        Array.isArray(response.data) ? response.data.length : 'unknown'
      } items`);
      
      return normalizeTransportations(response);
    } catch (error) {
      console.error('TransportationService - Error fetching active transportations:', error);
      throw error;
    }
  },
  
  /**
   * Tamamlanan taşımaları getir
   * Backend URL: /api/transportations/completed/
   * 
   * @param {Object} filters - Filtreleme parametreleri (opsiyonel)
   * @returns {Promise<Array>} Tamamlanan taşımalar listesi
   */
  getCompletedTransportations: async (filters = {}) => {
    try {
      console.log('TransportationService - Fetching completed transportations with filters:', filters);
      
      // Filtreleri URL parametrelerine dönüştür
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get('/transportations/completed/', { params });
      
      console.log(`TransportationService - Fetched completed transportations: ${
        Array.isArray(response.data) ? response.data.length : 'unknown'
      } items`);
      
      return normalizeTransportations(response);
    } catch (error) {
      console.error('TransportationService - Error fetching completed transportations:', error);
      throw error;
    }
  },
  
  /**
   * Bekleyen taşımaları getir
   * Backend URL: /api/transportations/pending/
   * 
   * @param {Object} filters - Filtreleme parametreleri (opsiyonel)
   * @returns {Promise<Array>} Bekleyen taşımalar listesi
   */
  getPendingTransportations: async (filters = {}) => {
    try {
      console.log('TransportationService - Fetching pending transportations with filters:', filters);
      
      // Filtreleri URL parametrelerine dönüştür
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get('/transportations/pending/', { params });
      
      console.log(`TransportationService - Fetched pending transportations: ${
        Array.isArray(response.data) ? response.data.length : 'unknown'
      } items`);
      
      return normalizeTransportations(response);
    } catch (error) {
      console.error('TransportationService - Error fetching pending transportations:', error);
      throw error;
    }
  },

  /**
   * Aktif taşıma sayısını getir
   * Backend URL: /api/transportations/active_count/
   * 
   * @returns {Promise<number>} Aktif taşıma sayısı
   */
  getActiveTransportationsCount: async () => {
    try {
      console.log('TransportationService - Fetching active transportations count');
      
      // Özel count endpoint'ini kullan
      const response = await api.get('/transportations/active_count/');
      
      // API response'dan count değerini çıkar
      if (response.data && typeof response.data.count === 'number') {
        console.log(`TransportationService - Found ${response.data.count} active transportations`);
        return response.data.count;
      } 
      
      // API doğrudan sayı döndürüyorsa
      if (typeof response.data === 'number') {
        console.log(`TransportationService - Found ${response.data} active transportations`);
        return response.data;
      }
      
      // Count endpoint çalışmadıysa, tüm aktif taşımaları alıp say
      const activeResponse = await api.get('/transportations/active/');
      
      if (Array.isArray(activeResponse.data)) {
        console.log(`TransportationService - Found ${activeResponse.data.length} active transportations (fallback method)`);
        return activeResponse.data.length;
      }
      
      return 0;
    } catch (error) {
      console.error('TransportationService - Error fetching active transportation count:', error);
      
      // Hata alınırsa fallback olarak aktif taşımaları getir ve say
      try {
        const activeResponse = await api.get('/transportations/active/');
        if (Array.isArray(activeResponse.data)) {
          return activeResponse.data.length;
        }
      } catch (fallbackError) {
        console.error('TransportationService - Fallback count also failed:', fallbackError);
      }
      
      return 0;
    }
  },

  /**
   * Yükleme talebi gönder (taşıyıcı için)
   * Backend URL: /api/transportations/{id}/request_pickup/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @param {Object} data - Konum ve not bilgileri (opsiyonel)
   * @returns {Promise<Object>} İşlem sonucu
   */
  requestPickup: async (id, data = {}) => {
    try {
      console.log(`TransportationService - Requesting pickup for transportation ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/transportations/${id}/request_pickup/`, data);
      
      console.log(`TransportationService - Pickup requested successfully for ${id}`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error requesting pickup for ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşıma için yükleme talebi gönderme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        throw new Error(error.response.data.detail || 'Yükleme talebi işlemi şu anda gerçekleştirilemiyor.');
      }
      
      throw error;
    }
  },

  /**
   * Yükleme onaylama (yük sahibi için)
   * Backend URL: /api/transportations/{id}/confirm_pickup/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @param {Object} data - Not bilgisi (opsiyonel)
   * @returns {Promise<Object>} İşlem sonucu
   */
  confirmPickup: async (id, data = {}) => {
    try {
      console.log(`TransportationService - Confirming pickup for transportation ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/transportations/${id}/confirm_pickup/`, data);
      
      console.log(`TransportationService - Pickup confirmed successfully for ${id}`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error confirming pickup for ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşıma için yükleme onayı verme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        throw new Error(error.response.data.detail || 'Yükleme onayı işlemi şu anda gerçekleştirilemiyor.');
      }
      
      throw error;
    }
  },

  /**
   * Teslimat talebi gönder (taşıyıcı için)
   * Backend URL: /api/transportations/{id}/request_delivery/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @param {Object} data - Konum ve not bilgileri (opsiyonel)
   * @returns {Promise<Object>} İşlem sonucu
   */
  requestDelivery: async (id, data = {}) => {
    try {
      console.log(`TransportationService - Requesting delivery for transportation ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/transportations/${id}/request_delivery/`, data);
      
      console.log(`TransportationService - Delivery requested successfully for ${id}`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error requesting delivery for ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşıma için teslimat talebi gönderme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        throw new Error(error.response.data.detail || 'Teslimat talebi işlemi şu anda gerçekleştirilemiyor.');
      }
      
      throw error;
    }
  },

  /**
   * Teslimat onaylama (yük sahibi için)
   * Backend URL: /api/transportations/{id}/confirm_delivery/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @param {Object} data - Not bilgisi (opsiyonel)
   * @returns {Promise<Object>} İşlem sonucu
   */
  confirmDelivery: async (id, data = {}) => {
    try {
      console.log(`TransportationService - Confirming delivery for transportation ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/transportations/${id}/confirm_delivery/`, data);
      
      console.log(`TransportationService - Delivery confirmed successfully for ${id}`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error confirming delivery for ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşıma için teslimat onayı verme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        throw new Error(error.response.data.detail || 'Teslimat onayı işlemi şu anda gerçekleştirilemiyor.');
      }
      
      throw error;
    }
  },

  /**
   * Konum güncelleme
   * Backend URL: /api/transportations/{id}/update_location/
   * 
   * @param {number|string} transportationId - Taşıma ID'si
   * @param {string} latitude - Enlem
   * @param {string} longitude - Boylam
   * @param {string} note - Konum notu (opsiyonel)
   * @returns {Promise<Object>} İşlem sonucu
   */
  updateLocation: async (transportationId, latitude, longitude, note = '') => {
    try {
      console.log(`TransportationService - Updating location for ${transportationId}: lat=${latitude}, lng=${longitude}`);
      
      // api servisini kullan (axios yerine)
      const response = await api.post(`/transportations/${transportationId}/update_location/`, {
        id: transportationId,
        latitude,
        longitude,
        note : note
      });
      
      console.log(`TransportationService - Location updated successfully for ${transportationId}`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error updating location for ${transportationId}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşıma için konum güncelleme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const message = error.response.data?.detail || 'Konum güncelleme işlemi şu anda gerçekleştirilemiyor.';
        throw new Error(message);
      }
      
      throw error;
    }
  },

  /**
   * Taşıma konum geçmişini getir
   * Backend URL: /api/transportations/{id}/locations/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @returns {Promise<Array>} Konum geçmişi listesi
   */
  getLocationHistory: async (id) => {
    try {
      console.log(`TransportationService - Fetching location history for transportation ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get(`/transportations/${id}/locations/`);
      
      console.log(`TransportationService - Fetched location history for transportation ${id}: ${
        Array.isArray(response.data) ? response.data.length : 'unknown'
      } locations`);
      
      return response;
    } catch (error) {
      console.error(`TransportationService - Error fetching location history for ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşımanın konum geçmişini görüntüleme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('Konum geçmişi bulunamadı.');
      }
      
      throw error;
    }
  },

  /**
   * Bir taşımanın sadece konum verilerini getirir
   * @param {number} id - Taşıma ID
   * @returns {Promise<Object>} Konum verisi
   */
  getLocationData: async (id) => {
    try {
      const response = await api.get(`/transportations/${id}/location/`);
      
      // API yanıtını konsola yazdır
      console.log('Location data for transportation', id, ':', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching transportation location data:', error);
      throw new Error('Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.');
    }
  },

  /**
   * Taşımayı iptal et
   * Backend URL: /api/transportations/{id}/cancel/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @param {string} reason - İptal nedeni
   * @returns {Promise<Object>} İşlem sonucu
   */
  cancelTransportation: async (id, reason) => {
    try {
      console.log(`TransportationService - Cancelling transportation ${id} with reason: ${reason}`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/transportations/${id}/cancel/`, { reason });
      
      console.log(`TransportationService - Transportation ${id} cancelled successfully`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error cancelling transportation ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşımayı iptal etme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const message = error.response.data?.detail || 'Taşıma iptal işlemi şu anda gerçekleştirilemiyor.';
        throw new Error(message);
      }
      
      throw error;
    }
  },

  /**
   * Taşımaya ait notları getir
   * Backend URL: /api/transportations/{id}/notes/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @returns {Promise<Array>} Notlar listesi
   */
  getNotes: async (id) => {
    try {
      console.log(`TransportationService - Fetching notes for transportation ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get(`/transportations/${id}/notes/`);
      
      // API yanıt yapısını kontrol et
      if (!response.data) return [];
      
      // API'den gelen verileri normalize et
      const notes = Array.isArray(response.data) 
        ? response.data 
        : response.data.notes || response.data.updates || [];
      
      console.log(`TransportationService - Fetched ${notes.length} notes for transportation ${id}`);
      
      return notes.map(note => ({
        id: note.id,
        text: note.note || note.text || note.content || '',
        user_id: note.user_id || (note.user && note.user.id) || null,
        user_name: note.user_name || (note.user && (note.user.username || note.user.name)) || 'Kullanıcı',
        created_at: note.created_at || note.timestamp || new Date().toISOString(),
        updated_at: note.updated_at || note.modified_at || note.created_at || new Date().toISOString(),
        edited: note.edited || note.is_edited || false
      }));
    } catch (error) {
      console.error(`TransportationService - Error fetching notes for transportation ${id}:`, error);
      return [];
    }
  },

  /**
   * Taşımaya not ekle
   * Backend URL: /api/transportations/{id}/add_note/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @param {string} note - Not içeriği
   * @returns {Promise<Object>} İşlem sonucu
   */
  addNote: async (id, note) => {
    try {
      console.log(`TransportationService - Adding note for transportation ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/transportations/${id}/add_note/`, { note });
      
      console.log(`TransportationService - Note added successfully for transportation ${id}`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error adding note for ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşımaya not ekleme yetkiniz bulunmamaktadır.');
      }
      
      throw error;
    }
  },

  /**
   * Taşımayı değerlendir
   * Backend URL: /api/transportations/{id}/rate/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @param {number} rating - Puan (1-5)
   * @param {string} comment - Yorum
   * @returns {Promise<Object>} İşlem sonucu
   */
  rateTransportation: async (id, rating, comment = '') => {
    try {
      console.log(`TransportationService - Rating transportation ${id} with ${rating} stars`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/transportations/${id}/rate/`, { rating, comment });
      
      console.log(`TransportationService - Transportation ${id} rated successfully`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error rating transportation ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşımayı değerlendirme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const message = error.response.data?.detail || 'Değerlendirme işlemi şu anda gerçekleştirilemiyor.';
        throw new Error(message);
      }
      
      throw error;
    }
  },

  /**
   * Kullanıcının kendi taşımalarını getir
   * Backend URL: /api/transportations/my-transportations/
   * 
   * @param {Object} filters - Filtreleme parametreleri (opsiyonel)
   * @returns {Promise<Array>} Taşımalar listesi
   */
  getMyTransportations: async (filters = {}) => {
    try {
      console.log('TransportationService - Fetching my transportations with filters:', filters);
      
      // Filtreleri URL parametrelerine dönüştür
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get('/transportations/my-transportations/', { params });
      
      console.log('TransportationService - Fetched my transportations:', 
        Array.isArray(response.data) ? response.data.length : 'unknown length');
      
      return response.data;
    } catch (error) {
      console.error('TransportationService - Error fetching my transportations:', error);
      throw error;
    }
  },

  /**
   * Taşıma istatistiklerini getir (admin veya genel istatistikler)
   * Backend URL: /api/transportations/stats/
   * 
   * @returns {Promise<Object>} Taşıma istatistikleri
   */
  getTransportationStats: async () => {
    try {
      console.log('TransportationService - Fetching transportation statistics');
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get('/transportations/stats/');
      
      console.log('TransportationService - Fetched transportation statistics:', response.data);
      return response.data;
    } catch (error) {
      console.error('TransportationService - Error fetching transportation stats:', error);
      return {
        active: 0,
        completed: 0,
        cancelled: 0,
        total: 0
      };
    }
  },
  
  /**
   * Taşımayı başlat (START durumuna geçir)
   * Backend URL: /api/transportations/{id}/start/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @returns {Promise<Object>} İşlem sonucu
   */
  startTransportation: async (id) => {
    try {
      console.log(`TransportationService - Starting transportation ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan 
      const response = await api.post(`/transportations/${id}/start/`);
      
      console.log(`TransportationService - Transportation ${id} started successfully`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error starting transportation ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşımayı başlatma yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const message = error.response.data?.detail || 'Taşıma başlatma işlemi şu anda gerçekleştirilemiyor.';
        throw new Error(message);
      }
      
      throw error;
    }
  },
  
  /**
   * Taşımayı tamamla (COMPLETED durumuna geçir)
   * Backend URL: /api/transportations/{id}/complete/
   * 
   * @param {number|string} id - Taşıma ID'si
   * @returns {Promise<Object>} İşlem sonucu
   */
  completeTransportation: async (id) => {
    try {
      console.log(`TransportationService - Completing transportation ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/transportations/${id}/complete/`);
      
      console.log(`TransportationService - Transportation ${id} completed successfully`);
      return response.data;
    } catch (error) {
      console.error(`TransportationService - Error completing transportation ${id}:`, error);
      
      // Özelleştirilmiş hata mesajları
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşımayı tamamlama yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const message = error.response.data?.detail || 'Taşıma tamamlama işlemi şu anda gerçekleştirilemiyor.';
        throw new Error(message);
      }
      
      throw error;
    }
  },

  /**
   * WebSocket bağlantısı için özel token alır ve cookie olarak kaydeder
   * @param {number|string} transportationId - Taşıma ID'si
   * @returns {Promise<Object>} WebSocket token bilgisi
   */
  async getWebSocketToken(transportationId) {
    try {
      // Token al
      const response = await api.get(`/transportations/${transportationId}/websocket-token/`);
      
      // Token'ı cookie olarak kaydet (30 dakika - 1800 saniye)
      document.cookie = `ws_token_${transportationId}=${response.data.token}; max-age=1800; path=/; SameSite=Strict`;
      
      console.log('WebSocket token başarıyla alındı ve cookie olarak kaydedildi');
      return response.data;
    } catch (error) {
      console.error('WebSocket token alınamadı:', error);
      throw error;
    }
  },

  /**
   * Koordinata göre bölge bilgisi alma
   * Backend URL: /api/transportations/geocode-location/
   * 
   * @param {string} latitude - Enlem
   * @param {string} longitude - Boylam
   * @returns {Promise<Object>} Bölge bilgisi
   */
  getLocationName: async (latitude, longitude) => {
    try {
      const response = await api.get(`/transportations/geocode-location/`, {
        params: { lat: latitude, lng: longitude }
      });
      return response.data;
    } catch (error) {
      console.error("Lokasyon bilgisi alınamadı:", error);
      
      // Hata durumunda koordinatları kullanacak fallback
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      // Koordinatları biçimlendir
      let locationName;
      if (!isNaN(lat) && !isNaN(lng)) {
        locationName = `Konum: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      } else {
        locationName = "Bilinmeyen Konum";
      }
      
      return { 
        name: locationName,
        success: false
      };
    }
  }
};

// Normalizasyon yardımcı fonksiyonu
const normalizeTransportations = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (response.data?.main?.items) return response.data.main.items;
  if (response.data && !Array.isArray(response.data)) return [response.data];
  return [];
};

export default transportationService;