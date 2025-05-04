import api from './api';
import { 
  HTTP_STATUS 
} from '../config/api';

/**
 * Teklif (Offer) Servisi
 * Taşıyıcı teklifleri için API işlemlerini sağlar
 */
const offerService = {
  /**
   * Teklif oluştur
   * Backend URL: /api/offers/
   * 
   * @param {Object} offerData - Teklif verileri (cargo_post, price, note, pickup_date, delivery_date)
   * @returns {Promise<Object>} - Oluşturulan teklif
   */
  createOffer: async (offerData) => {
    try {
      console.log('Creating offer with data:', offerData);
      
      // Veri doğrulaması ve temizliği
      const cleanData = { ...offerData };
      
      // Fiyat kontrolü
      if (typeof cleanData.price === 'string') {
        cleanData.price = parseFloat(cleanData.price.replace(/[^\d.-]/g, ''));
      }
      
      // Gerekli alanların kontrolü
      if (!cleanData.cargo_post) {
        throw new Error('Teklif verilecek ilan ID"si belirtilmelidir.');
      }
      
      if (isNaN(cleanData.price) || cleanData.price <= 0) {
        throw new Error('Geçerli bir fiyat belirtilmelidir.');
      }
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post('/offers/', cleanData);
      
      console.log('Offer created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating offer:', error);
      
      // Hata detaylarını logla
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data
        });
        
        // 400 Bad Request - geçersiz veri
        if (error.response.status === HTTP_STATUS.BAD_REQUEST) {
          const errorMessage = error.response.data.detail || 
                              error.response.data.message ||
                              'Teklif verileri geçersiz.';
          throw new Error(errorMessage);
        }
        
        // 403 Forbidden - yetki sorunu
        if (error.response.status === HTTP_STATUS.FORBIDDEN) {
          throw new Error('Bu ilana teklif verme yetkiniz bulunmamaktadır.');
        }
        
        // 404 Not Found - ilan bulunamadı
        if (error.response.status === HTTP_STATUS.NOT_FOUND) {
          throw new Error('Teklif verilecek ilan bulunamadı.');
        }
      }
      
      throw error;
    }
  },

  /**
   * Teklif listesini getir
   * Backend URL: /api/offers/
   * 
   * @param {Object} filters - Filtreleme parametreleri
   * @returns {Promise<Array>} - Teklifler listesi
   */
  getAllOffers: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Filtreleri parametrelere dönüştür
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get('/offers/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  },

  /**
   * Kendi tekliflerimi listele (taşıyıcı için)
   * Backend URL: /api/offers/my/
   * 
   * @param {Object} filters - Filtreleme parametreleri (opsiyonel)
   * @returns {Promise<Array>} - Teklifler listesi
   */
  getMyOffers: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Filtreleri parametrelere dönüştür
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get('/offers/my/', { params });
      
      return response.data;
    } catch (error) {
      console.error('Teklifler getirilirken bir hata oluştu:', error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Tekliflerinizi görüntüleme yetkiniz bulunmamaktadır.');
      }
      
      throw error;
    }
  },

  /**
   * Gelen teklifleri listele (yük sahibi için)
   * Backend URL: /api/offers/received/
   * 
   * @param {Object} filters - Filtreleme parametreleri (opsiyonel)
   * @returns {Promise<Array>} - Teklifler listesi
   */
  getReceivedOffers: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Filtreleri parametrelere dönüştür
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get('/offers/received/', { params });
      
      return response.data;
    } catch (error) {
      console.error('Gelen teklifler getirilirken bir hata oluştu:', error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Gelen teklifleri görüntüleme yetkiniz bulunmamaktadır.');
      }
      
      throw error;
    }
  },

  /**
   * Bekleyen teklifleri listele (kullanıcı rolüne göre)
   * Backend URL: /api/offers/pending/
   * 
   * @param {Object} filters - Filtreleme parametreleri (opsiyonel)
   * @returns {Promise<Array>} - Bekleyen teklifler listesi
   */
  getPendingOffers: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Filtreleri parametrelere dönüştür
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get('/offers/pending/', { params });
      
      return response.data;
    } catch (error) {
      console.error('Bekleyen teklifler getirilirken bir hata oluştu:', error);
      throw error;
    }
  },

  /**
   * Teklif detaylarını getir
   * Backend URL: /api/offers/{id}/
   * 
   * @param {number} id - Teklif ID
   * @returns {Promise<Object>} - Teklif detayları
   */
  getOfferDetails: async (id) => {
    try {
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get(`/offers/${id}/`);
      
      return response.data;
    } catch (error) {
      console.error(`Teklif detayı getirilirken bir hata oluştu (ID: ${id}):`, error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('Teklif bulunamadı.');
      } else if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu teklifi görüntüleme yetkiniz bulunmamaktadır.');
      }
      
      throw error;
    }
  },

  /**
   * Teklifi kabul et (yük sahibi için)
   * Backend URL: /api/offers/{id}/accept/
   * 
   * @param {number} id - Teklif ID
   * @param {Object} data - Opsiyonel yanıt notları
   * @returns {Promise<Object>} - İşlem sonucu
   */
  acceptOffer: async (id, data = {}) => {
    try {
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/offers/${id}/accept/`, data);
      
      return response.data;
    } catch (error) {
      console.error(`Teklif kabul edilirken bir hata oluştu (ID: ${id}):`, error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu teklifi kabul etme yetkiniz bulunmamaktadır. Yalnızca ilan sahibi teklifi kabul edebilir.');
      } else if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('Teklif bulunamadı.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const errorMessage = error.response.data.detail || 
                            error.response.data.message || 
                            'Teklif kabul edilemez durumda.';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  },

  /**
   * Teklifi reddet (yük sahibi için)
   * Backend URL: /api/offers/{id}/reject/
   * 
   * @param {number} id - Teklif ID
   * @param {Object} data - Opsiyonel yanıt notları (red sebebi, vb.)
   * @returns {Promise<Object>} - İşlem sonucu
   */
  rejectOffer: async (id, data = {}) => {
    try {
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/offers/${id}/reject/`, data);
      
      return response.data;
    } catch (error) {
      console.error(`Teklif reddedilirken bir hata oluştu (ID: ${id}):`, error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu teklifi reddetme yetkiniz bulunmamaktadır. Yalnızca ilan sahibi teklifi reddedebilir.');
      } else if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('Teklif bulunamadı.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const errorMessage = error.response.data.detail || 
                            error.response.data.message || 
                            'Teklif reddedilemez durumda.';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  },

  /**
   * Teklifi iptal et (nakliyeci/yük sahibi için)
   * Backend URL: /api/offers/{id}/cancel/
   * 
   * @param {number} id - Teklif ID
   * @param {Object} data - İptal açıklaması (opsiyonel)
   * @returns {Promise<Object>} - İşlem sonucu
   */
  cancelOffer: async (id, data = {}) => {
    try {
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/offers/${id}/cancel/`, data);
      
      return response.data;
    } catch (error) {
      console.error(`Teklif iptal edilirken bir hata oluştu (ID: ${id}):`, error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu teklifi iptal etme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('Teklif bulunamadı.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const errorMessage = error.response.data.detail || 
                            error.response.data.message || 
                            'Teklif iptal edilemez durumda.';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  },

  /**
   * Teklifi geri çek (taşıyıcı için)
   * Backend URL: /api/offers/{id}/withdraw/
   * 
   * @param {number} id - Teklif ID
   * @param {Object} data - Geri çekme açıklaması (opsiyonel)
   * @returns {Promise<Object>} - İşlem sonucu
   */
  withdrawOffer: async (id, data = {}) => {
    try {
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.post(`/offers/${id}/withdraw/`, data);
      
      return response.data;
    } catch (error) {
      console.error(`Teklif geri çekilirken bir hata oluştu (ID: ${id}):`, error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu teklifi geri çekme yetkiniz bulunmamaktadır. Yalnızca teklifi veren taşıyıcı geri çekebilir.');
      } else if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('Teklif bulunamadı.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const errorMessage = error.response.data.detail || 
                            error.response.data.message || 
                            'Teklif geri çekilemez durumda.';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  },

  /**
   * Teklifi güncelle (taşıyıcı için)
   * Backend URL: /api/offers/{id}/
   * 
   * @param {number} id - Teklif ID
   * @param {Object} offerData - Güncellenecek veriler
   * @returns {Promise<Object>} - Güncellenmiş teklif
   */
  updateOffer: async (id, offerData) => {
    try {
      // Veri temizliği ve doğrulaması
      const cleanData = { ...offerData };
      
      // Fiyat kontrolü
      if (typeof cleanData.price === 'string') {
        cleanData.price = parseFloat(cleanData.price.replace(/[^\d.-]/g, ''));
      }
      
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.put(`/offers/${id}/`, cleanData);
      
      return response.data;
    } catch (error) {
      console.error(`Teklif güncellenirken bir hata oluştu (ID: ${id}):`, error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu teklifi güncelleme yetkiniz bulunmamaktadır. Yalnızca teklifi veren taşıyıcı güncelleyebilir.');
      } else if (error.response?.status === HTTP_STATUS.BAD_REQUEST) {
        const errorMessage = error.response.data.detail || 
                            error.response.data.message || 
                            'Geçersiz teklif verileri.';
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  },

  /**
   * Belirli bir taşıma işine ait teklifleri getir
   * Backend URL: /api/offers/transportation/{transportation_id}/
   * 
   * @param {number} transportationId - Taşıma işi ID
   * @returns {Promise<Array>} - Teklifler listesi
   */
  getOffersForTransportation: async (transportationId) => {
    try {
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get(`/offers/transportation/${transportationId}/`);
      
      return response.data;
    } catch (error) {
      console.error(`Taşıma işi teklifleri getirilirken bir hata oluştu (ID: ${transportationId}):`, error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('Taşıma işi bulunamadı.');
      } else if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu taşıma işine ait teklifleri görüntüleme yetkiniz bulunmamaktadır.');
      }
      
      throw error;
    }
  },

  /**
   * Belirli bir yük ilanına ait teklifleri getir
   * Backend URL: /api/offers/cargo-post/{cargo_post_id}/
   * 
   * @param {number} cargoPostId - Yük ilanı ID
   * @returns {Promise<Array>} - Teklifler listesi
   */
  getOffersForCargoPost: async (cargoPostId) => {
    try {
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get(`/offers/cargo-post/${cargoPostId}/`);
      
      return response.data;
    } catch (error) {
      console.error(`Yük ilanı teklifleri getirilirken bir hata oluştu (ID: ${cargoPostId}):`, error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('Yük ilanı bulunamadı.');
      } else if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu ilana ait teklifleri görüntüleme yetkiniz bulunmamaktadır.');
      }
      
      throw error;
    }
  },
  
  /**
   * Teklif istatistiklerini getir (Endpoint mevcut değilse eklenebilir)
   * Backend URL: /api/offers/stats/
   * 
   * @returns {Promise<Object>} - İstatistikler
   */
  getOfferStats: async () => {
    try {
      // Şu an backend'de bulunmayan bir endpoint, ileride eklenebilir
      const response = await api.get('/offers/stats/');
      return response.data;
    } catch (error) {
      console.error('Teklif istatistikleri getirilirken bir hata oluştu:', error);
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        withdrawn: 0,
        cancelled: 0
      };
    }
  },
  
  /**
   * Teklifi sil (admin veya sahibi için)
   * Backend URL: /api/offers/{id}/
   * 
   * @param {number} id - Teklif ID
   * @returns {Promise<Object>} - İşlem sonucu
   */
  deleteOffer: async (id) => {
    try {
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.delete(`/offers/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Teklif silinirken bir hata oluştu (ID: ${id}):`, error);
      
      // Hata özelleştirmesi
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu teklifi silme yetkiniz bulunmamaktadır.');
      } else if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('Teklif bulunamadı.');
      }
      
      throw error;
    }
  },

  /**
   * Taşıyıcının verdiği tekliflerin sayısını getir
   * @returns {Promise<number>} - Teklif sayısı
   */
  getMyOffersCount: async () => {
    try {
      const response = await api.get('/offers/my/count/');
      return response.data.count;
    } catch (error) {
      console.error('Error fetching my offers count:', error);
      return 0; // Hata durumunda 0 döndür
    }
  },

  /**
   * Yük sahibinin aldığı tekliflerin sayısını getir
   * @returns {Promise<number>} - Teklif sayısı
   */
  getReceivedOffersCount: async () => {
    try {
      const response = await api.get('/offers/received/count/');
      return response.data.count;
    } catch (error) {
      console.error('Error fetching received offers count:', error);
      return 0; // Hata durumunda 0 döndür
    }
  }
};

export default offerService;