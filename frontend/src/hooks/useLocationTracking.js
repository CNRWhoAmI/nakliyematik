import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocket.service';
import transportationService from '../services/transportation.service';

export default function useLocationTracking(transportationId) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transporterPosition, setTransporterPosition] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [cargoOwnerOnline, setCargoOwnerOnline] = useState(false);
  const [transporterOnline, setTransporterOnline] = useState(false);
  const [coordinates, setCoordinates] = useState({});
  const [transportationStatus, setTransportationStatus] = useState({});
  
  // İstek debounce için referans
  const fetchTimerRef = useRef(null);
  // Son isteğin zamanını tutacak referans
  const lastFetchTimeRef = useRef(0);
  
  // Koordinat doğrulama fonksiyonu
  const parseCoordinate = useCallback((value) => {
    if (value === undefined || value === null) return null;
    
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    
    return num;
  }, []);
  
  // Transportation verilerini getirme
  const fetchTransportationData = useCallback(async () => {
    if (!transportationId) return;
    
    try {
      setLoading(true);
      // Normal API'yi kullanın
      const data = await transportationService.getTransportationDetails(transportationId);
      console.log('Transportation verileri alındı:', data);
      
      // Pickup ve delivery lokasyonlarını doğrudan oluştur
      if (data.pickup_latitude && data.pickup_longitude) {
        const pickup = {
          lat: parseFloat(data.pickup_latitude),
          lng: parseFloat(data.pickup_longitude)
        };
        setPickupLocation(pickup);
        console.log('Yükleme noktası ayarlandı:', pickup);
      }
      
      if (data.delivery_latitude && data.delivery_longitude) {
        const delivery = {
          lat: parseFloat(data.delivery_latitude),
          lng: parseFloat(data.delivery_longitude)
        };
        setDeliveryLocation(delivery);
        console.log('Teslimat noktası ayarlandı:', delivery);
      }
      
      // Taşıyıcı konumu (sürücü konumu) varsa ayarla
      if (data.current_latitude && data.current_longitude) {
        setTransporterPosition({
          lat: parseFloat(data.current_latitude),
          lng: parseFloat(data.current_longitude)
        });
      }
      
      // Son güncelleme zamanını ayarla
      setLastUpdate(data.last_location_update);
      
      // Taşıma durumu bilgilerini ayarla
      setTransportationStatus({
        status: data.status,
        status_display: data.status_display,
        pickup_confirmed: data.pickup_confirmed,
        delivery_confirmed: data.delivery_confirmed,
        estimated_arrival: data.estimated_arrival
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Taşıma verisi alınamadı:', error);
      setError('Taşıma verileri yüklenirken bir hata oluştu.');
      setLoading(false);
    }
  }, [transportationId]);
  
  // İlk yükleme ve ID değiştiğinde verileri getir
  useEffect(() => {
    if (transportationId) {
      fetchTransportationData();
    }
    
    return () => {
      // Temizleme işlemi
      if (fetchTimerRef.current) {
        clearTimeout(fetchTimerRef.current);
      }
    };
  }, [transportationId, fetchTransportationData]);
  
  // Koordinat verilerini bileşenlere uygulama
  useEffect(() => {
    if (coordinates.pickup_lat && coordinates.pickup_lng) {
      const pickup = {
        lat: parseFloat(coordinates.pickup_lat),
        lng: parseFloat(coordinates.pickup_lng)
      };
      
      setPickupLocation(pickup);
      console.log('Yükleme noktası ayarlandı:', pickup);
    }
    
    if (coordinates.delivery_lat && coordinates.delivery_lng) {
      const delivery = {
        lat: parseFloat(coordinates.delivery_lat),
        lng: parseFloat(coordinates.delivery_lng)
      };
      
      setDeliveryLocation(delivery);
      console.log('Teslimat noktası ayarlandı:', delivery);
    }
    
    if (coordinates.current_lat && coordinates.current_lng) {
      setTransporterPosition({
        lat: parseFloat(coordinates.current_lat),
        lng: parseFloat(coordinates.current_lng)
      });
      setLastUpdate(coordinates.last_update);
    }
  }, [coordinates]);
  
  // WebSocket bağlantısı ve mesaj işleme
  useEffect(() => {
    // ... (WebSocket bağlantı kodunuz)
    
    return () => {
      // Bağlantı temizleme
    };
  }, [transportationId]);
  
  // Konum güncelleme fonksiyonu
  const updateLocation = useCallback(async (latitude, longitude, note = '') => {
    try {
      return websocketService.updateLocation(transportationId, latitude, longitude, note);
    } catch (error) {
      console.error('Konum güncellenirken hata:', error);
      return false;
    }
  }, [transportationId]);
  
  // Yeniden bağlanma fonksiyonu
  const reconnect = useCallback(() => {
    // ... (Yeniden bağlanma kodu)
  }, [transportationId]);
  
  return {
    connected,
    loading,
    error,
    transporterPosition,
    pickupLocation,
    deliveryLocation,
    lastUpdate,
    locationHistory,
    reconnect,
    updateLocation,
    connectedUsers,
    cargoOwnerOnline,
    transporterOnline,
    fetchTransportationData, // Manuel yenileme için
    coordinates,
    transportationStatus
  };
}