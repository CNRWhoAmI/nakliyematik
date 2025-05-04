/* global google */  // ESLint için global tanımlama

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
import useLocationTracking from '../../hooks/useLocationTracking';
import { 
  Container, Typography, Box, Paper, Button, 
  CircularProgress, Alert, Grid
} from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import DirectionsIcon from '@mui/icons-material/Directions';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useSnackbar } from 'notistack';
import { GOOGLE_MAPS_MAP_ID, MARKER_ICONS } from '../../utils/mapsConfig';

// Gelişmiş Marker bileşeni
function CustomMarker({ position, title, type, map }) {
  const [marker, setMarker] = useState(null);
  
  useEffect(() => {
    if (!window.google || !position || !map) return;
    
    // Map ID kontrolü
    console.log('CustomMarker - Map ID kontrolü:', {
      'map.mapId mevcut mu': !!map.mapId,
      'map.mapId değeri': map.mapId,
      'beklenen Map ID': GOOGLE_MAPS_MAP_ID
    });
    
    // Manuel olarak Map ID ataması
    try {
      if (!map.mapId) {
        console.log('Map ID eksik, manuel atanıyor');
        // @ts-ignore
        map.mapId = GOOGLE_MAPS_MAP_ID;
      }
    } catch (e) {
      console.error('Map ID atama hatası:', e);
    }
    
    // Eski marker varsa kaldır
    if (marker) {
      marker.setMap(null);
    }
    
    try {
      // AdvancedMarkerElement'i kontrol et
      if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
        console.log('Advanced marker kullanılıyor:', type);
        
        let markerConfig = MARKER_ICONS.PICKUP; // Varsayılan
        
        // Marker tipi belirleme
        if (type === 'pickup') markerConfig = MARKER_ICONS.PICKUP;
        else if (type === 'delivery') markerConfig = MARKER_ICONS.DELIVERY;
        else if (type === 'transporter') markerConfig = MARKER_ICONS.TRANSPORTER;
        
        // Pin elementi oluştur
        const pinElement = new window.google.maps.marker.PinElement({
          background: markerConfig.background,
          glyph: markerConfig.glyph,
          borderColor: '#ffffff',
          glyphColor: '#ffffff'
        });
        
        // Advanced Marker oluştur
        const advancedMarker = new window.google.maps.marker.AdvancedMarkerElement({
          position: position,
          title: title,
          map: map,
          content: pinElement.element
        });
        
        setMarker(advancedMarker);
      } else {
        // Standart marker kullan (fallback)
        console.warn('AdvancedMarkerElement kullanılamıyor, standart Marker kullanılıyor:', type);
        
        // Icon seçimi
        let iconUrl = "https://maps.google.com/mapfiles/marker_green_A.png";
        let iconSize = { width: 40, height: 40 };
        
        if (type === 'pickup') {
          iconUrl = "https://maps.google.com/mapfiles/marker_green_A.png";
        } else if (type === 'delivery') {
          iconUrl = "https://maps.google.com/mapfiles/marker_purple_B.png";
        } else if (type === 'transporter') {
          iconUrl = "https://maps.google.com/mapfiles/ms/icons/truck.png";
          iconSize = { width: 36, height: 36 };
        }
        
        // Standart marker oluştur
        const standardMarker = new window.google.maps.Marker({
          position: position,
          title: title,
          map: map,
          icon: {
            url: iconUrl,
            scaledSize: new window.google.maps.Size(iconSize.width, iconSize.height)
          }
        });
        
        setMarker(standardMarker);
      }
    } catch (error) {
      console.error('Marker oluşturma hatası:', error);
    }
    
    return () => {
      if (marker) marker.setMap(null);
    };
  }, [position, title, type, map]);
  
  return null;
}

function LocationTracking() {
  const { id } = useParams();
  const [transportation, setTransportation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 41.0082, lng: 28.9784 }); // İstanbul
  const [zoom, setZoom] = useState(7); // Türkiye için daha küçük zoom
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const [routeInfo, setRouteInfo] = useState({ distance: '', duration: '' });
  const [mapStatus, setMapStatus] = useState({
    isMapLoaded: false,
    isDataReady: false
  });
  const { enqueueSnackbar } = useSnackbar();
  
  // MapsContext'i kaldırıp doğrudan window.google kullanacağız
  const isLoaded = window.google !== undefined;
  const loadError = null;

  // Konum takibi hook'u
  const {
    loading: trackingLoading,
    error: trackingError,
    transporterPosition,
    pickupLocation,
    deliveryLocation,
    lastUpdate,
    fetchTransportationData
  } = useLocationTracking(id);
  
  // Navigasyon başlatma fonksiyonu (harita içinde)
  const startNavigation = (origin, destination) => {
    if (!origin || !destination) {
      enqueueSnackbar('Navigasyon için başlangıç ve bitiş noktaları gereklidir', { 
        variant: 'warning' 
      });
      return;
    }
    
    if (mapRef.current && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: mapRef.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#4285F4',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      });
      
      directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(result);
          enqueueSnackbar('Navigasyon başlatıldı', { variant: 'success' });
        } else {
          enqueueSnackbar('Rota oluşturulamadı: ' + status, { variant: 'error' });
        }
      });
    }
  };
  
  // Google Maps'te açma fonksiyonu (harici navigasyon)
  const openExternalNavigation = (destination) => {
    if (!destination) {
      enqueueSnackbar('Navigasyon için hedef koordinat gereklidir', { 
        variant: 'warning' 
      });
      return;
    }
    
    // Google Maps URL'i oluştur
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;
    
    // Yeni sekmede aç
    window.open(mapsUrl, '_blank');
  };

  // Harita merkezi ve zoom düzeyini ayarla
  useEffect(() => {
    if (pickupLocation && deliveryLocation) {
      // İki nokta arasındaki orta noktayı hesapla
      const centerLat = (pickupLocation.lat + deliveryLocation.lat) / 2;
      const centerLng = (pickupLocation.lng + deliveryLocation.lng) / 2;
      setMapCenter({ lat: centerLat, lng: centerLng });
      
      // Zoom düzeyini mesafeye göre ayarla (basit bir hesaplama)
      const latDiff = Math.abs(pickupLocation.lat - deliveryLocation.lat);
      const lngDiff = Math.abs(pickupLocation.lng - deliveryLocation.lng);
      const maxDiff = Math.max(latDiff, lngDiff);
      
      // Ne kadar büyük fark varsa o kadar küçük zoom değeri
      if (maxDiff > 5) setZoom(5);
      else if (maxDiff > 3) setZoom(6);
      else if (maxDiff > 1) setZoom(7);
      else if (maxDiff > 0.5) setZoom(8);
      else if (maxDiff > 0.1) setZoom(9);
      else setZoom(10);
    }
  }, [pickupLocation, deliveryLocation]);
  
  // Rota hesaplama
  useEffect(() => {
    if (!isLoaded || !window.google || !mapRef.current) return;
    if (!pickupLocation || !deliveryLocation) return;
    
    try {
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true, // Kendi markerlarımızı kullanıyoruz
        polylineOptions: {
          strokeColor: '#0066ff',
          strokeWeight: 5,
          strokeOpacity: 0.7
        },
        // Yol tarifi stilleri
        routeIndex: 0,
        preserveViewport: false
      });
      
      // Haritaya directionsRenderer'ı bağla
      directionsRenderer.setMap(mapRef.current);
      
      // Rota isteği
      directionsService.route({
        origin: pickupLocation,
        destination: deliveryLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
        avoidFerries: false,
        avoidHighways: false,
        avoidTolls: false,
        optimizeWaypoints: true,
        provideRouteAlternatives: false,
        unitSystem: window.google.maps.UnitSystem.METRIC
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          console.log('Rota hesaplandı, uzunluk:', result.routes[0].legs[0].distance.text);
          setDirections(result);
          
          // Mesafe ve süre bilgisini kaydet
          if (result.routes[0]?.legs[0]) {
            const { distance, duration } = result.routes[0].legs[0];
            setRouteInfo({
              distance: distance.text,
              duration: duration.text
            });
            
            // State'lere ayrıca kaydet
            setDistance(distance.text);
            setDuration(duration.text);
            
            // Snackbar ile bildirim göster
            enqueueSnackbar(`Rota hesaplandı: ${distance.text} / ${duration.text}`, { 
              variant: 'success',
              autoHideDuration: 3000
            });
          }
        } else {
          console.error('Rota hesaplanamadı:', status);
          enqueueSnackbar(`Rota hesaplanamadı: ${status}`, { variant: 'error' });
        }
      });
      
      return () => {
        directionsRenderer.setMap(null);
      };
    } catch (error) {
      console.error('Rota hesaplama hatası:', error);
    }
  }, [isLoaded, pickupLocation, deliveryLocation, enqueueSnackbar]);

  if (loadError) {
    return (
      <Alert severity="error">
        Google Maps yüklenirken bir hata oluştu: {loadError.message}
      </Alert>
    );
  }
  
  if (!isLoaded) {
    return <CircularProgress />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Taşıma Takibi
      </Typography>
      
      {/* Durum kartı */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            {distance && duration ? (
              <Box sx={{ p: 1.5, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
                <Typography variant="body1" component="span" sx={{ mr: 2, fontWeight: 'medium' }}>
                  <DirectionsIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> 
                  Mesafe: <strong>{distance}</strong>
                </Typography>
                <Typography variant="body1" component="span" sx={{ fontWeight: 'medium' }}>
                  <AccessTimeIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> 
                  Süre: <strong>{duration}</strong>
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Rota bilgileri hesaplanıyor...
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6} sx={{ textAlign: 'right' }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => fetchTransportationData()}
              disabled={trackingLoading}
              startIcon={<RefreshIcon />}
              sx={{ mr: 1 }}
            >
              Yenile
            </Button>
            
            {deliveryLocation && (
              <Button 
                variant="outlined"
                color="secondary"
                startIcon={<DirectionsIcon />}
                onClick={() => openExternalNavigation(deliveryLocation)}
                size="medium"
                sx={{ mr: 1 }}
              >
                Google Maps'te Aç
              </Button>
            )}
            
            {transporterPosition && deliveryLocation && (
              <Button 
                variant="contained" 
                color="success"
                startIcon={<NavigationIcon />}
                onClick={() => startNavigation(transporterPosition, deliveryLocation)}
                size="medium"
              >
                Navigasyonu Başlat
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {/* Harita */}
      <Paper sx={{ height: 600, position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={zoom}
          mapId={GOOGLE_MAPS_MAP_ID}
          options={{
            fullscreenControl: true,
            streetViewControl: false,
            mapTypeControl: true,
            zoomControl: true,
            mapTypeId: 'roadmap',
            mapId: GOOGLE_MAPS_MAP_ID,
            styles: []
          }}
          onLoad={(map) => {
            console.log('Map ID:', GOOGLE_MAPS_MAP_ID);
            
            // Map ID'yi manuel olarak doğrudan atamayı deneyin
            try {
              // @ts-ignore
              map.mapId = GOOGLE_MAPS_MAP_ID;
              console.log('Map ID manuel olarak atandı');
            } catch (e) {
              console.error('Map ID manuel atama hatası:', e);
            }
            
            mapRef.current = map;
            setMapStatus(prev => ({...prev, isMapLoaded: true}));
            
            // Harita yüklendikten sonra bounds ayarla
            if (pickupLocation && deliveryLocation) {
              const bounds = new window.google.maps.LatLngBounds();
              bounds.extend(pickupLocation);
              bounds.extend(deliveryLocation);
              map.fitBounds(bounds);
            }
          }}
        >
          {/* Rota çizgisi */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,  
                polylineOptions: {
                  strokeColor: '#1976d2',
                  strokeWeight: 4,
                  strokeOpacity: 0.7
                }
              }}
            />
          )}

          {/* Advanced Markerları kullan */}
          {mapRef.current && pickupLocation && (
            <CustomMarker
              position={pickupLocation}
              title="Yükleme Noktası (A)"
              type="pickup"
              map={mapRef.current}
            />
          )}
          
          {mapRef.current && deliveryLocation && (
            <CustomMarker
              position={deliveryLocation}
              title="Teslimat Noktası (B)"
              type="delivery"
              map={mapRef.current}
            />
          )}
          
          {mapRef.current && transporterPosition && (
            <CustomMarker
              position={transporterPosition}
              title="Taşıyıcı Konumu"
              type="transporter"
              map={mapRef.current}
            />
          )}
        </GoogleMap>
      </Paper>
    </Container>
  );
}

export default LocationTracking;
