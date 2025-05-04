// Google Maps API konfigürasyonu için merkezi dosya

// .env.local'den değerleri alalım
export const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
export const GOOGLE_MAPS_MAP_ID = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID;

// String olarak alınan libraries'i diziye çevirelim
export const GOOGLE_MAPS_LIBRARIES = process.env.REACT_APP_GOOGLE_MAPS_LIBRARIES
  ? process.env.REACT_APP_GOOGLE_MAPS_LIBRARIES.split(',')
  : ['places', 'geometry', 'marker'];

// Diğer yapılandırmalar
export const GOOGLE_MAPS_VERSION = process.env.REACT_APP_GOOGLE_MAPS_VERSION || 'weekly';
export const GOOGLE_MAPS_LANGUAGE = process.env.REACT_APP_GOOGLE_MAPS_LANGUAGE || 'tr';
export const GOOGLE_MAPS_REGION = process.env.REACT_APP_GOOGLE_MAPS_REGION || 'TR';

// Değerler doğru şekilde alındı mı kontrol et ve konsolda bildir
console.log('Google Maps yapılandırması:', {
  API_KEY: GOOGLE_MAPS_API_KEY ? 'Tanımlanmış (gizli)' : 'Eksik!',
  MAP_ID: GOOGLE_MAPS_MAP_ID,
  LIBRARIES: GOOGLE_MAPS_LIBRARIES
});

// Özel marker sabitleri
export const MARKER_ICONS = {
  PICKUP: {
    url: "https://maps.google.com/mapfiles/marker_green_A.png",
    background: '#0b8043',
    glyph: 'A'
  },
  DELIVERY: {
    url: "https://maps.google.com/mapfiles/marker_purple_B.png",
    background: '#8e24aa',
    glyph: 'B'
  },
  TRANSPORTER: {
    url: "https://maps.google.com/mapfiles/ms/icons/truck.png",
    background: '#1976d2',
    glyph: '🚚'
  }
};