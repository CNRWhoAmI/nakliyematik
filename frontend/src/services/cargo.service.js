import api from './api';
import { 
  CARGO_ENDPOINTS,
  HTTP_STATUS,
} from '../config/api';

// API isteklerinde kullanılacak geçerli yük tipleri
const validCargoTypes = [
  'general', 'bulk', 'container', 'breakbulk', 
  'liquid', 'vehicle', 'machinery', 'furniture', 
  'dangerous', 'other'
];

// API isteklerinde kullanılacak geçerli araç tipleri
const validVehicleTypes = ['kamyon', 'tir', 'minivan', 'pickup', 'diger', ''];

/**
 * Yük (Cargo) API Servisi
 * Nakliye ilanları için CRUD ve diğer operasyonları sağlar
 */
const cargoService = {
  /**
   * İlan oluşturma metodu
   * @param {Object} cargoData - Yük ilanı verileri
   */
  createCargo: async (cargoData) => {
    try {
      // Veri temizliği ve doğrulaması
      const cleanData = { ...cargoData };
      
      // required_vehicle kontrolü
      if (cleanData.required_vehicle === null || cleanData.required_vehicle === undefined) {
        cleanData.required_vehicle = ''; // Boş string olarak gönder
      }
      
      // cargo_type kontrolü
      if (!validCargoTypes.includes(cleanData.cargo_type)) {
        console.warn(`Invalid cargo_type: ${cleanData.cargo_type}, using 'general' instead`);
        cleanData.cargo_type = 'general';
      }
      
      console.log('Sending cargo creation data:', JSON.stringify(cleanData, null, 2));
      
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/
      const response = await api.post(CARGO_ENDPOINTS.CREATE, cleanData);
      return response.data;
    } catch (error) {
      console.error('Error creating cargo:', error);
      
      // Hata loglaması ve detayları
      if (error.response) {
        console.error('API error response:', error.response.data);
        console.error('API error status:', error.response.status);
      }
      
      throw error;
    }
  },

  /**
   * Tüm ilanları getir
   * Backend URL: /api/cargo/posts/
   */
  getAllCargo: async () => {
    try {
      // Backend URL yapısına uygun endpoint kullan
      const response = await api.get(CARGO_ENDPOINTS.LIST); 
      console.log('All cargo posts response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching all cargo:', error);
      throw error;
    }
  },

  /**
   * Aktif ilanları getir (filtreleme desteği ile)
   * Backend URL: /api/cargo/posts/filtered/
   */
  getActivePosts: async (filters = {}) => {
    try {
      // Filtre parametrelerini hazırla
      let params = {};
      
      if (filters) {
        if (filters.keyword) params.keyword = filters.keyword;
        if (filters.pickupLocation) params.pickup_location = filters.pickupLocation;
        if (filters.deliveryLocation) params.delivery_location = filters.deliveryLocation;
        if (filters.cargoType) params.cargo_type = filters.cargoType;
        if (filters.hasOffers === true) params.hasOffers = 'true';
        if (filters.noOffers === true) params.noOffers = 'true';
        if (filters.priceMin) params.priceMin = filters.priceMin;
        if (filters.priceMax) params.priceMax = filters.priceMax;
        if (filters.dateMin) params.dateMin = filters.dateMin;
        if (filters.dateMax) params.dateMax = filters.dateMax;
        if (filters.sortBy) params.sort_by = filters.sortBy;
      }
      
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/filtered/
      const response = await api.get('/cargo/posts/filtered/', { params });
      
      console.log('Filtered active posts data:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching active cargo posts:', error);
      throw error;
    }
  },

  /**
   * Kullanıcının kendi ilanlarını getir
   * Backend URL: /api/cargo/posts/my/ veya /api/cargo/posts/my-posts/
   */
  getMyPosts: async (filters = {}) => {
    try {
      // Filtre parametrelerini hazırla
      let params = {};
      
      if (filters) {
        if (filters.keyword) params.keyword = filters.keyword;
        if (filters.pickupLocation) params.pickup_location = filters.pickupLocation;
        if (filters.deliveryLocation) params.delivery_location = filters.deliveryLocation;
        if (filters.cargoType) params.cargo_type = filters.cargoType;
        if (filters.hasOffers === true) params.hasOffers = 'true';
        if (filters.noOffers === true) params.noOffers = 'true';
        if (filters.priceMin) params.priceMin = filters.priceMin;
        if (filters.priceMax) params.priceMax = filters.priceMax;
        if (filters.dateMin) params.dateMin = filters.dateMin;
        if (filters.dateMax) params.dateMax = filters.dateMax;
        if (filters.sortBy) params.sort_by = filters.sortBy;
      }
      
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/my/
      const response = await api.get('/cargo/posts/my/', { params });
      
      console.log('My cargo posts (filtered):', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching my posts:', error);
      throw error;
    }
  },

  /**
   * İlan detayını getir
   * Backend URL: /api/cargo/posts/{id}/
   */
  getCargoDetails: async (id) => {
    try {
      console.log(`Fetching cargo details for ID: ${id}`);
      
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/{id}/
      const response = await api.get(`/cargo/posts/${id}/`);
      
      // Veriyi işle
      const data = response.data;
      
      // Teklif sayısını doğru şekilde işle
      data.offer_count = typeof data.offer_count === 'number' ? data.offer_count : 0;
      
      // Frontend için cargo_owner bilgisi dönüşümü
      if (data && data.cargo_owner && typeof data.cargo_owner === 'object') {
        // cargo_owner bir nesne ise ID'sini al (frontend için)
        data.cargo_owner_id = data.cargo_owner.id;
      }
      
      console.log(`Cargo ${id} processed details:`, data);
      return data;
    } catch (error) {
      console.error(`Error fetching cargo ${id}:`, error);
      
      // Hata mesajını özelleştir
      if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('İlan bulunamadı.');
      } else if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu ilanı görüntüleme yetkiniz bulunmamaktadır.');
      }
      
      throw error;
    }
  },

  /**
   * İlanı güncelle
   * Backend URL: /api/cargo/posts/{id}/
   */
  updateCargoPost: async (id, cargoData) => {
    try {
      // API'ye göndermeden önce veri kontrolü yapalım
      const cleanData = { ...cargoData };
      
      // required_vehicle alanı için kontrol - boş string olmalı, null olmamalı
      if (cleanData.required_vehicle === null || cleanData.required_vehicle === undefined) {
        cleanData.required_vehicle = '';
      } else if (!validVehicleTypes.includes(cleanData.required_vehicle)) {
        console.warn(`Invalid vehicle type: ${cleanData.required_vehicle}, using empty string`);
        cleanData.required_vehicle = '';
      }
      
      // cargo_type için geçerli değer kontrolü
      if (!validCargoTypes.includes(cleanData.cargo_type)) {
        console.warn(`Invalid cargo_type: ${cleanData.cargo_type}, using 'general' instead`);
        cleanData.cargo_type = 'general'; // Varsayılan güvenli değer
      }
      
      console.log(`Updating cargo ${id} with cleaned data:`, JSON.stringify(cleanData, null, 2));
      
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/{id}/
      const response = await api.put(`/cargo/posts/${id}/`, cleanData);
      
      // Teklif sayısını doğru şekilde işle
      const processedData = {
        ...response.data,
        offer_count: typeof response.data.offer_count === 'number' ? response.data.offer_count : 0
      };
      
      return processedData;
    } catch (error) {
      console.error(`Error updating cargo ${id}:`, error);
      
      // Hata detaylarını logla
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        // 403 hatası - yetki sorunu
        if (error.response.status === HTTP_STATUS.FORBIDDEN) {
          throw new Error('Bu ilanı güncelleme yetkiniz bulunmamaktadır. Yalnızca ilan sahibi ilanı güncelleyebilir.');
        }
      }
      
      throw error;
    }
  },

  /**
   * İlanı sil
   * Backend URL: /api/cargo/posts/{id}/
   */
  deleteCargoPost: async (id) => {
    try {
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/{id}/
      const response = await api.delete(`/cargo/posts/${id}/`);
      
      // MyCargoPostsIds localStorage'dan temizle
      try {
        const myPostIds = JSON.parse(localStorage.getItem('myCargoPostIds') || '[]');
        const updatedIds = myPostIds.filter(postId => postId !== Number(id));
        localStorage.setItem('myCargoPostIds', JSON.stringify(updatedIds));
      } catch (storageError) {
        console.warn('Error updating localStorage:', storageError);
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error deleting cargo ${id}:`, error);
      
      if (error.response?.status === HTTP_STATUS.FORBIDDEN) {
        throw new Error('Bu ilanı silme yetkiniz bulunmamaktadır. Yalnızca ilan sahibi silebilir.');
      } else if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
        throw new Error('İlan bulunamadı. Daha önce silinmiş olabilir.');
      }
      
      throw error;
    }
  },

  /**
   * Filtrelenmiş ilanları getir
   * Backend URL: /api/cargo/posts/filter/ veya /api/cargo/posts/filtered/
   */
  getFilteredPosts: async (filters = {}) => {
    try {
      // Filtreleri URL parametrelerine dönüştür
      let params = {};
      
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.pickupLocation) params.pickup_location = filters.pickupLocation;
      if (filters.deliveryLocation) params.delivery_location = filters.deliveryLocation;
      if (filters.cargoType) params.cargo_type = filters.cargoType;
      if (filters.hasOffers === true) params.hasOffers = 'true';
      if (filters.noOffers === true) params.noOffers = 'true';
      if (filters.priceMin) params.priceMin = filters.priceMin;
      if (filters.priceMax) params.priceMax = filters.priceMax;
      if (filters.dateMin) params.dateMin = filters.dateMin;
      if (filters.dateMax) params.dateMax = filters.dateMax;
      if (filters.sortBy) params.sort_by = filters.sortBy;
      
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/filtered/
      const response = await api.get('/cargo/posts/filtered/', { params });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching filtered cargo posts:', error);
      throw error;
    }
  },
  
  /**
   * İlan için detay ve teklif sayısını getir
   * Backend URL: /api/cargo/posts/{id}/
   */
  getCargoPost: async (id) => {
    try {
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/{id}/
      const response = await api.get(`/cargo/posts/${id}/`);
      
      // API'den gelen veriyi işle
      const data = response.data;
      
      // offer_count alanı tanımlı değilse ya da null ise 0 olarak ayarla
      if (data.offer_count === undefined || data.offer_count === null) {
        data.offer_count = 0;
      } else {
        // Sayısal değere çevir
        data.offer_count = parseInt(data.offer_count);
        if (isNaN(data.offer_count)) {
          data.offer_count = 0;
        }
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching cargo ${id}:`, error);
      throw error;
    }
  },

  /**
   * İlanların toplam sayısını getir
   * Backend URL: /api/cargo/posts/stats/
   */
  getCargoCount: async () => {
    try {
      // Backend şu anda /cargo/posts/count/ endpoint'i sunmuyor
      // Bunun yerine /cargo/posts/stats/ endpoint'ini kullanabiliriz
      const response = await api.get('/cargo/posts/stats/');
      return response.data.total || 0;
    } catch (error) {
      console.error('Error fetching cargo count:', error);
      return 0;
    }
  },

  /**
   * İstatistik bilgilerini getir
   * Backend URL: /api/cargo/posts/stats/
   */
  getCargoStats: async () => {
    try {
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/stats/
      const response = await api.get('/cargo/posts/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching cargo stats:', error);
      return {
        total: 0,
        active: 0,
        completed: 0,
        in_progress: 0
      };
    }
  },

  /**
   * Kullanıcının ilanları için özet bilgileri getir
   * Not: Backend'de bu endpoint mevcut değil, varsayılan değer kullanılıyor
   */
  getMyCargosStats: async () => {
    try {
      // Backend'de doğrudan bir kişisel istatistik endpoint'i yok, genel istatistikler kullanılabilir
      // veya /my/ API'sinden dönen veri üzerinden hesaplama yapılabilir
      const myPosts = await cargoService.getMyPosts();
      
      // Yanıt yapısını oluştur
      const stats = {
        total_posts: myPosts.length || 0,
        active_posts: myPosts.filter(post => post.status === 'active').length || 0,
        pending_posts: myPosts.filter(post => post.status === 'pending').length || 0,
        completed_posts: myPosts.filter(post => post.status === 'completed').length || 0
      };
      
      return stats;
    } catch (error) {
      console.error('Error calculating my cargo stats:', error);
      return {
        total_posts: 0,
        active_posts: 0,
        pending_posts: 0,
        completed_posts: 0
      };
    }
  },

  /**
   * İlan için teklif sayısını getir
   * Backend URL: /api/cargo/posts/{id}/
   */
  getCargoOfferCount: async (id) => {
    try {
      // Backend URL yapısına uygun endpoint kullan: /api/cargo/posts/{id}/
      const response = await api.get(`/cargo/posts/${id}/`);
      return response.data.offer_count || 0;
    } catch (error) {
      console.error(`Error fetching cargo offer count for ${id}:`, error);
      return 0;
    }
  },

  /**
   * İlanla ilgili teklif detaylarını getir
   * Backend URL: /api/offers/?cargo_id={id}
   */
  getCargoOffers: async (id) => {
    try {
      // Cargo URL değil, offer URL'i ile gerçekleştirilmeli
      // Bu, offerService'in sorumluluğunda olmalı ama buraya da ekleyebiliriz
      const response = await api.get('/offers/', { 
        params: { cargo_id: id }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching offers for cargo ${id}:`, error);
      throw error;
    }
  },

  /**
   * Yük sahibinin ilanlarının sayısını getirir
   * @returns {Promise<number>} İlan sayısı
   */
  getMyPostsCount: async () => {
    try {
      const response = await api.get('/cargo/posts/my/count/');
      return response.data.count;
    } catch (error) {
      console.error('Error fetching my cargo posts count:', error);
      return 0; // Hata durumunda 0 döndür
    }
  },

  // Geçerli yük tiplerini döndür (frontend validasyonu için)
  getValidCargoTypes: () => validCargoTypes,

  // Geçerli araç tiplerini döndür (frontend validasyonu için)
  getValidVehicleTypes: () => validVehicleTypes
};

export default cargoService;