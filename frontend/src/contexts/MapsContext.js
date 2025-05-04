import React, { createContext, useState, useEffect, useContext } from 'react';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_MAP_ID } from '../utils/mapsConfig';

// MapsContext oluştur
export const MapsContext = createContext();

// Custom hook
export const useMaps = () => useContext(MapsContext);

export const MapsProvider = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Google Maps API'yi async olarak yükleme
  const loadGoogleMapsScript = () => {
    // Zaten yüklenmişse atla
    if (window.google?.maps) {
      setMapsLoaded(true);
      return;
    }

    try {
      if (!GOOGLE_MAPS_API_KEY) {
        console.error('Google Maps API anahtarı bulunamadı!');
        setLoadError('API anahtarı eksik');
        return;
      }

      // Kütüphaneleri mapsConfig'den al
      const libraries = GOOGLE_MAPS_LIBRARIES.join(',');
      
      // Doğru async yükleme yaklaşımı
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${libraries}&map_ids=${GOOGLE_MAPS_MAP_ID}&language=tr&callback=initMap`;
      script.async = true;
      script.defer = true;
      
      // Callback fonksiyonu
      window.initMap = () => {
        console.log('Google Maps API başarıyla yüklendi (callback)');
        setMapsLoaded(true);
      };
      
      script.onerror = (error) => {
        console.error('Google Maps API yüklenirken hata oluştu:', error);
        setLoadError('API yüklenirken hata oluştu');
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('Google Maps API yüklenirken beklenmeyen hata:', error);
      setLoadError('Beklenmeyen hata');
    }
  };

  // Component mount edildiğinde API'yi yükle
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // isLoaded değiştiğinde Google Maps scriptini yükle
  useEffect(() => {
    if (isLoaded && !mapsLoaded) {
      loadGoogleMapsScript();
    }
  }, [isLoaded, mapsLoaded]);

  return (
    <MapsContext.Provider
      value={{
        isLoaded,
        mapsLoaded,
        loadError,
      }}
    >
      {children}
    </MapsContext.Provider>
  );
};