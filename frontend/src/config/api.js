/**
 * API Yapılandırması
 * Bu dosya, tüm servisler için kullanılacak API URL'lerini ve diğer API yapılandırmalarını içerir.
 */

// Ortama göre temel API URL'yi belirle
export const getApiUrl = () => {
  // Docker ortamı için özel kontrol
  if (process.env.REACT_APP_API_URL) {
    // DÜZELTME: '/api' sonekini kaldır
    return process.env.REACT_APP_API_URL.replace(/\/api$/, '');
  }
  
  // Prodüksiyon ortamı
  if (process.env.NODE_ENV === 'production') {
    return 'https://api.nakliyematik.com';
  }
  
  // Yerel geliştirme ortamı
  return 'http://localhost:8000';
};

// Temel API URL'si (http://localhost:8000 gibi)
export const API_URL = getApiUrl();

// API endpoint kök yolu (/api)
export const API_PREFIX = '/api';

// Tam API base URL (/api ile birleştirilmiş hali)
export const API_BASE_URL = `${API_URL}${API_PREFIX}`;

// !!! ÖNEMLİ: Buradaki endpoint'ler /api öneki İÇERMEMELİ !!!
// API_BASE_URL zaten /api önekini içeriyor

// Auth endpointleri - /api öneki YOK
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/token/',
  REFRESH: '/auth/token/refresh/',
  LOGOUT: '/auth/logout/',
  USER: '/auth/user/',
  REGISTER: '/auth/register/',
  REGISTER_CARGO_OWNER: '/profile/register/cargo-owner/',
  REGISTER_TRANSPORTER: '/profile/register/transporter/',
  CHECK_REGISTRATION: '/auth/check-registration/', // Bu satırı ekleyin
};

// Profil modülü için endpoint'ler - /api öneki YOK
export const PROFILE_ENDPOINTS = {
  CARGO_OWNER: '/cargo-owners/me/',
  CARGO_OWNER_RATINGS: '/cargo-owners/me/ratings/',
  TRANSPORTER: '/transporters/me/',
  TRANSPORTER_RATINGS: '/transporters/me/ratings/',
  // Alternatif endpoint'ler
  ALT_CARGO_OWNER: '/profile/cargo-owner/',
  ALT_TRANSPORTER: '/profile/transporter/',
};

// Yük modülü için endpoint'ler - /api öneki YOK
export const CARGO_ENDPOINTS = {
  CREATE: '/cargo/posts/',  // '/cargo/' yerine '/cargo/posts/' olmalı
  LIST: '/cargo/posts/',
  FILTERED: '/cargo/posts/filtered/',
  MY_POSTS: '/cargo/posts/my/',
  STATS: '/cargo/posts/stats/'
};

// Teklif modülü için endpoint'ler - /api öneki YOK
export const OFFER_ENDPOINTS = {
  LIST: '/offers/',
  CREATE: '/offers/',
  DETAIL: (id) => `/offers/${id}/`,
  UPDATE: (id) => `/offers/${id}/`,
  DELETE: (id) => `/offers/${id}/`,
  CARGO_OFFERS: (cargoId) => `/cargo/${cargoId}/offers/`,
  MY_OFFERS: '/offers/my-offers/',
  ACCEPT: (id) => `/offers/${id}/accept/`,
  REJECT: (id) => `/offers/${id}/reject/`,
};

// Taşıma modülü için endpoint'ler - /api öneki YOK
export const TRANSPORTATION_ENDPOINTS = {
  LIST: '/transportations/',
  CREATE: '/transportations/',
  DETAIL: (id) => `/transportations/${id}/`,
  UPDATE: (id) => `/transportations/${id}/`,
  DELETE: (id) => `/transportations/${id}/`,
  MY_TRANSPORTATIONS: '/transportations/my-transportations/',
  START: (id) => `/transportations/${id}/start/`,
  COMPLETE: (id) => `/transportations/${id}/complete/`,
  CANCEL: (id) => `/transportations/${id}/cancel/`,
};

// API yapılandırma ayarları
export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // HTTP-only cookie yaklaşımı için önemli!
};

// HTTP durum kodları
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

// API istekte hata olduğunda gösterilecek varsayılan mesajlar
export const ERROR_MESSAGES = {
  DEFAULT: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
  NETWORK: 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.',
  UNAUTHORIZED: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.',
  FORBIDDEN: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.',
  NOT_FOUND: 'İstenen kaynak bulunamadı.',
  SERVER: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.'
};

// Debug modunda loglar göster/gizle
export const DEBUG = process.env.NODE_ENV !== 'production';

// Varsayılan timeout (ms)
export const DEFAULT_TIMEOUT = 15000;

// Export edilecek varsayılan değer
const apiConfig = { 
  API_URL, 
  API_PREFIX, 
  API_BASE_URL, 
  AUTH_ENDPOINTS, 
  PROFILE_ENDPOINTS, 
  CARGO_ENDPOINTS, 
  OFFER_ENDPOINTS, 
  TRANSPORTATION_ENDPOINTS, 
  API_CONFIG, 
  HTTP_STATUS, 
  ERROR_MESSAGES, 
  DEBUG, 
  DEFAULT_TIMEOUT
};
export default apiConfig;