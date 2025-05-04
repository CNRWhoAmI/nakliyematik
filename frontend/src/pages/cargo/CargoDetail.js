import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Paper, Button, 
  Divider, Chip, CircularProgress, Alert, Tooltip, Card, CardContent, Avatar
} from '@mui/material';
import {
  LocationOn, DateRange, Description, LocalShipping,
  AttachMoney, PhoneAndroid, Edit, Delete,
  Schedule, AlternateEmail, Business, InfoOutlined, Timeline, LocalOffer, DirectionsCar,
  Straighten
} from '@mui/icons-material';
import cargoService from '../../services/cargo.service';
import { useAuth } from '../../contexts/AuthContext';

import {
  GoogleMap, 
  Marker, 
  DirectionsService, 
  DirectionsRenderer,
  InfoWindow
} from '@react-google-maps/api';

import { GOOGLE_MAPS_MAP_ID } from '../../utils/mapsConfig';

// Sayısal değerleri formatlamak için yardımcı fonksiyon
function formatNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  
  // String ise sayıya çevir
  if (typeof value === 'string') {
    value = parseFloat(value);
  }
  
  // Sayı değilse veya geçersizse
  if (isNaN(value)) {
    return null;
  }
  
  // Sayıyı Türkçe formatında göster (ondalık ayracı virgül, binlik ayracı nokta)
  return value.toLocaleString('tr-TR', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Google Maps ile rota gösteren bileşen
function GoogleRouteMap({ pickupCoords, deliveryCoords, mapsLoaded }) {
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [error, setError] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  
  // Koordinatları Google Maps formatına dönüştür - useRef ve useMemo ile optimize
  const pickupLocation = useMemo(() => {
    return pickupCoords ? {
      lat: pickupCoords[0],
      lng: pickupCoords[1]
    } : null;
  }, [pickupCoords]);
  
  const deliveryLocation = useMemo(() => {
    return deliveryCoords ? {
      lat: deliveryCoords[0],
      lng: deliveryCoords[1]
    } : null;
  }, [deliveryCoords]);
  
  // mapOptions'ı güncelleyin - styles kaldırın, mapId ekleyin
  const mapOptions = useMemo(() => ({
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    gestureHandling: 'greedy',
    mapId: GOOGLE_MAPS_MAP_ID // MapId ekleyin
  }), []);

  // Harita yüklenmesini useCallback ile optimize et
  const handleMapLoad = useCallback((map) => {
    console.log("Harita yüklendi");
    setMapInstance(map);
  }, []);

  // Rota hesaplama işlemi - useRef ile önceki değerleri takip et
  const routeRequestRef = useRef({ pickup: null, delivery: null });
  
  useEffect(() => {
    if (!pickupLocation || !deliveryLocation || !mapsLoaded) {
      return;
    }
    
    // Önceki değerlerle aynıysa, tekrar hesaplama yapma
    if (routeRequestRef.current.pickup === JSON.stringify(pickupLocation) && 
        routeRequestRef.current.delivery === JSON.stringify(deliveryLocation)) {
      return;
    }
    
    // Yeni değerleri kaydet
    routeRequestRef.current.pickup = JSON.stringify(pickupLocation);
    routeRequestRef.current.delivery = JSON.stringify(deliveryLocation);
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin: pickupLocation,
        destination: deliveryLocation,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          
          // Mesafe ve süre bilgilerini al
          const route = result.routes[0];
          if (route && route.legs && route.legs.length > 0) {
            setDistance(route.legs[0].distance.text);
            setDuration(route.legs[0].duration.text);
          }
          setError(null);
        } else {
          setError("Rota hesaplanamadı: " + status);
          console.error("Directions request failed: " + status);
        }
      }
    );
  }, [pickupLocation, deliveryLocation, mapsLoaded]);

  // GoogleMap render ederken optimizasyon
  return (
    <>
      {mapsLoaded && (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={pickupLocation}
          zoom={7}
          onLoad={handleMapLoad}
          options={mapOptions}
          mapId={GOOGLE_MAPS_MAP_ID} // MapId ekleyin
        >
          {/* İçerik aynı kalacak */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: '#1976d2',
                  strokeWeight: 5,
                  strokeOpacity: 0.7
                }
              }}
            />
          )}
          
          {/* Marker'ları React.memo ile sarmalamak mantıklı olabilir */}
          {pickupLocation && (
            <Marker
              position={pickupLocation}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                labelOrigin: new window.google.maps.Point(14, -10)
              }}
              label={{
                text: 'Yükleme',
                color: 'black',
                fontWeight: 'bold'
              }}
            />
          )}
          
          {deliveryLocation && (
            <Marker
              position={deliveryLocation}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                labelOrigin: new window.google.maps.Point(14, -10)
              }}
              label={{
                text: 'Teslimat',
                color: 'black',
                fontWeight: 'bold'
              }}
            />
          )}
        </GoogleMap>
      )}
      
      {/* Mesafe ve süre bilgisi kutusu - BU KISMI EKLEYİN */}
      {distance && duration && (
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: 10, 
            right: 10, 
            zIndex: 1000, 
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            p: 1.5,
            borderRadius: 2,
            boxShadow: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Straighten fontSize="small" color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2" fontWeight="medium">
              <strong>Mesafe:</strong> {distance}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DirectionsCar fontSize="small" color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2" fontWeight="medium">
              <strong>Tahmini Süre:</strong> {duration}
            </Typography>
          </Box>
        </Box>
      )}
      
      {/* Hata mesajı */}
      {error && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            bgcolor: 'error.light',
            color: 'white',
            p: 1.5,
            borderRadius: 2,
            boxShadow: 2
          }}
        >
          {error}
        </Box>
      )}
    </>
  );
}

function CargoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isCargoOwner, isTransporter } = useAuth();
  const mapsLoaded = !!window.google?.maps;
  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [deliveryCoords, setDeliveryCoords] = useState(null);
  const [loadingMap, setLoadingMap] = useState(false);

  // İlan sahibi kontrolü - useCallback ile memorize edilmiş fonksiyon
  const checkOwnership = useCallback((cargoData) => {
    if (!isCargoOwner || !currentUser || !cargoData) {
      setIsOwner(false);
      return false;
    }
  
    // API yanıtında cargo_owner varsa kontrol et
    if (cargoData.cargo_owner) {
      // Nesne olarak dönüyorsa
      if (typeof cargoData.cargo_owner === 'object' && cargoData.cargo_owner.id) {
        const ownerMatches = cargoData.cargo_owner.id === currentUser.id || 
                            (currentUser.cargo_owner && cargoData.cargo_owner.id === currentUser.cargo_owner.id);
        setIsOwner(ownerMatches);
        return ownerMatches;
      }
      
      // ID olarak dönüyorsa
      if (typeof cargoData.cargo_owner === 'number') {
        const ownerMatches = cargoData.cargo_owner === currentUser.id || 
                            (currentUser.cargo_owner && cargoData.cargo_owner === currentUser.cargo_owner.id);
        setIsOwner(ownerMatches);
        return ownerMatches;
      }
    }
    
    // localStorage'daki ilanları kontrol et (yedek yöntem)
    try {
      const myPostIds = JSON.parse(localStorage.getItem('myCargoPostIds') || '[]');
      const isMyPost = myPostIds.includes(parseInt(cargoData.id));
      
      setIsOwner(isMyPost);
      return isMyPost;
    } catch (e) {
      console.error('Error checking ownership from localStorage', e);
      setIsOwner(false);
      return false;
    }
  }, [isCargoOwner, currentUser]);

  useEffect(() => {
    // Özel rotaları belirle
    const specialRoutes = ['my', 'my-posts'];
    
    if (specialRoutes.includes(id)) {
      navigate('/cargo/my-posts');
      return;
    }
  
    const fetchCargoDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await cargoService.getCargoDetails(id);
        
        console.log("API'den gelen kargo detayları:", data);
        console.log("Ağırlık değeri:", data.weight, "Türü:", typeof data.weight);
        console.log("Hacim değeri:", data.volume, "Türü:", typeof data.volume);
        
        if (!data) {
          throw new Error("Yük bilgilerine erişim sağlanamadı");
        }
        
        setCargo(data);
        
        // Eğer kullanıcı yük sahibiyse, ilan sahipliğini kontrol edelim
        if (isCargoOwner && currentUser) {
          try {
            const myPosts = await cargoService.getMyPosts();
            const myPostIds = myPosts.map(post => post.id);
            localStorage.setItem('myCargoPostIds', JSON.stringify(myPostIds));
            const isMyPost = myPostIds.includes(parseInt(id));
            setIsOwner(isMyPost);
          } catch (err) {
            checkOwnership(data);
          }
        }
      } catch (err) {
        console.error('Error fetching cargo detail:', err);
        
        // Kullanıcı tipine göre özelleştirilmiş hata mesajı
        if (isCargoOwner) {
          setError('Yük bilgileri alınamadı. Bu ilan size ait olmayabilir veya silinmiş olabilir.');
        } else if (isTransporter) {
          setError('Yük bilgileri alınamadı. Bu ilan aktif olmayabilir veya erişim izniniz bulunmayabilir.');
        } else {
          setError('Yük bilgileri alınamadı. Lütfen daha sonra tekrar deneyin.');
        }
      } finally {
        setLoading(false);
      }
    };
  
    if (id && !specialRoutes.includes(id)) {
      fetchCargoDetail();
    }
  }, [id, navigate, isCargoOwner, isTransporter, currentUser, checkOwnership]);

  useEffect(() => {
    if (cargo) {
      console.log("Kargo koordinat değerleri:", {
        pickup_lat: cargo.pickup_latitude,
        pickup_lng: cargo.pickup_longitude,
        delivery_lat: cargo.delivery_latitude,
        delivery_lng: cargo.delivery_longitude,
      });
      
      // İki state güncellemesini tek seferde yapmak için geçici değişkenler
      let updatedPickupCoords = null;
      let updatedDeliveryCoords = null;
      
      // Yükleme koordinatları
      if (cargo.pickup_latitude && cargo.pickup_longitude) {
        const pickupLat = parseFloat(cargo.pickup_latitude);
        const pickupLng = parseFloat(cargo.pickup_longitude);
        
        if (!isNaN(pickupLat) && !isNaN(pickupLng)) {
          console.log(`Yükleme koordinatları ayarlandı: [${pickupLat}, ${pickupLng}]`);
          updatedPickupCoords = [pickupLat, pickupLng];
        }
      }
      
      // Teslimat koordinatları
      if (cargo.delivery_latitude && cargo.delivery_longitude) {
        const deliveryLat = parseFloat(cargo.delivery_latitude);
        const deliveryLng = parseFloat(cargo.delivery_longitude);
        
        if (!isNaN(deliveryLat) && !isNaN(deliveryLng)) {
          console.log(`Teslim koordinatları ayarlandı: [${deliveryLat}, ${deliveryLng}]`);
          updatedDeliveryCoords = [deliveryLat, deliveryLng];
        }
      }

      // Şehir koordinatları - sadece koordinatlar yoksa kullan
      if (!updatedPickupCoords && cargo?.pickup_location) {
        const simpleCoords = getSimpleCoordinatesForCity(cargo.pickup_location);
        if (simpleCoords) {
          console.log("Yükleme için şehir koordinatları kullanıldı:", simpleCoords);
          updatedPickupCoords = simpleCoords;
        }
      }

      if (!updatedDeliveryCoords && cargo?.delivery_location) {
        const simpleCoords = getSimpleCoordinatesForCity(cargo.delivery_location);
        if (simpleCoords) {
          console.log("Teslimat için şehir koordinatları kullanıldı:", simpleCoords);
          updatedDeliveryCoords = simpleCoords;
        }
      }
      
      // State güncellemelerini bir kerede yapalım
      if (updatedPickupCoords) {
        setPickupCoords(updatedPickupCoords);
      }
      
      if (updatedDeliveryCoords) {
        setDeliveryCoords(updatedDeliveryCoords);
      }
    }
  }, [cargo]); // Sadece cargo değiştiğinde çalışsın

  useEffect(() => {
    if (error) {
      console.error("Kargo yükleme hatası:", error);
    }
  }, [error]);

  // Sayfa başlığını güncelleme
  useEffect(() => {
    if (loading) {
      document.title = "İlan Yükleniyor... - Nakliyematik";
      return;
    }
    
    if (cargo) {
      document.title = `${cargo.title} - Nakliyematik`;
    } else {
      document.title = "İlan Detayı - Nakliyematik";
    }
    
    return () => {
      document.title = "Nakliyematik";
    };
  }, [loading, cargo]);

  // Şehir isimlerine basit koordinat atama fonksiyonu
  function getSimpleCoordinatesForCity(cityName) {
    const cityMap = {
      'istanbul': [41.0082, 28.9784],
      'ankara': [39.9334, 32.8597],
      'izmir': [38.4237, 27.1428],
      'antalya': [36.8969, 30.7133],
      'bursa': [40.1885, 29.0610],
      'adana': [37.0000, 35.3213],
      // ... diğer şehirler eklenebilir
    };
    
    // Şehir ismini normalize et (küçük harf, boşlukları temizle)
    const normalizedName = cityName.toLowerCase().trim();
    
    // Tam eşleşme veya içeriyor mu kontrolü
    for (const [city, coords] of Object.entries(cityMap)) {
      if (normalizedName === city || normalizedName.includes(city)) {
        return coords;
      }
    }
    
    return null; // Eşleşme bulunamadı
  }

  // Taşıyıcı kullanıcı mı kontrol et - teklif vermek için
  const canMakeOffer = isTransporter && cargo?.status === 'active';

  // İlan sahibi için özel işlemler
  const handleEdit = () => {
    navigate(`/cargo/edit/${id}`);
  };
  
  const handleDelete = () => {
    if (window.confirm('Bu ilanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      cargoService.deleteCargoPost(id)
        .then(() => {
          // Silindikten sonra localStorage'daki myCargoPostIds'i güncelle
          const myCargoPostIds = JSON.parse(localStorage.getItem('myCargoPostIds') || '[]');
          const updatedIds = myCargoPostIds.filter(postId => postId !== Number(id));
          localStorage.setItem('myCargoPostIds', JSON.stringify(updatedIds));
          
          navigate('/cargo/my-posts', { state: { fromDelete: true } });
        })
        .catch(err => {
          console.error('Error deleting cargo post:', err);
          alert('İlan silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        });
    }
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/cargo')}>
          İlan Listesine Dön
        </Button>
      </Container>
    );
  }

  // Veri yoksa
  if (!cargo) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Yük bilgisi bulunamadı.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/cargo')}>
          İlan Listesine Dön
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Üst Başlık Kısmı */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: 2, 
          position: 'relative', 
          background: 'linear-gradient(120deg, #1976d2 30%, #2196f3 90%)', 
          color: 'white',
          overflow: 'visible'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1" gutterBottom sx={{ mb: 0, fontWeight: 'bold' }}>
            {cargo.title || 'Yük Detayı'}
          </Typography>
          
          <Chip 
            label={getStatusLabel(cargo.status) || 'Aktif'} 
            color={getStatusColor(cargo.status)} 
            size="small" 
            // Burada beyaz arka plan yerine variant kullanarak daha iyi kontrast sağlayalım
            variant="filled"
            sx={{ 
              fontWeight: 'medium',
              color: '#000', // Metin rengini siyah yap
              bgcolor: getStatusBgColor(cargo.status), // Özel arka plan rengi fonksiyonu
            }} 
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, opacity: 0.9 }}>
          <DateRange sx={{ mr: 1, fontSize: 18 }} />
          <Typography variant="body2">
            İlan Tarihi: {cargo.created_at ? new Date(cargo.created_at).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
          </Typography>
        </Box>
        
        {/* Teklif sayısı rozeti - Yeni eklendi */}
        {cargo.offer_count > 0 && (
          <Tooltip title="Bu ilana yapılan toplam teklif sayısı">
            <Chip
              icon={<LocalOffer fontSize="small" />}
              label={`${cargo.offer_count} Teklif`}
              size="small"
              sx={{
                position: 'absolute',
                top: -12,
                right: 16,
                fontWeight: 'bold',
                bgcolor: '#ffeb3b',
                color: '#000',
                boxShadow: 2,
                '& .MuiChip-icon': { color: '#f57c00' }
              }}
            />
          </Tooltip>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Sol Kolon - Yük Detayları */}
        <Grid item xs={12} md={8}>
          {/* Yük Bilgileri Kartı */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontWeight: 'bold' 
            }}>
              <Description sx={{ mr: 1 }} />
              Yük Bilgileri
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              {/* Yük Türü */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 1.5, 
                  bgcolor: 'background.default',
                  borderRadius: 1
                }}>
                  <LocalShipping color="primary" sx={{ mr: 1.5, opacity: 0.7 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Yükün Türü:</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {getCargoTypeLabel(cargo.cargo_type) || 'Belirtilmemiş'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Ağırlık */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 1.5, 
                  bgcolor: 'background.default',
                  borderRadius: 1
                }}>
                  <Timeline color="primary" sx={{ mr: 1.5, opacity: 0.7 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Ağırlık:</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatNumber(cargo.weight) !== null 
                        ? `${formatNumber(cargo.weight)} kg` 
                        : 'Belirtilmemiş'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Hacim */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 1.5, 
                  bgcolor: 'background.default',
                  borderRadius: 1
                }}>
                  <InfoOutlined color="primary" sx={{ mr: 1.5, opacity: 0.7 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Hacim:</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatNumber(cargo.volume) !== null 
                        ? `${formatNumber(cargo.volume)} m³` 
                        : 'Belirtilmemiş'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Paket Sayısı */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 1.5, 
                  bgcolor: 'background.default',
                  borderRadius: 1
                }}>
                  <Business color="primary" sx={{ mr: 1.5, opacity: 0.7 }} />
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Paket Sayısı:</Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {cargo.package_count || 'Belirtilmemiş'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              {/* Gerekli Araç Tipi */}
              {cargo.required_vehicle && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    p: 1.5, 
                    bgcolor: 'background.default',
                    borderRadius: 1
                  }}>
                    <LocalShipping color="primary" sx={{ mr: 1.5, opacity: 0.7 }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Gerekli Araç Tipi:</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {getVehicleTypeLabel(cargo.required_vehicle)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>

            {/* Açıklama */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Açıklama:</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {cargo.description || 'Açıklama bulunmuyor.'}
              </Typography>
            </Box>
          </Paper>

          {/* Güzergah Bilgileri Kartı */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ 
              display: 'flex', 
              alignItems: 'center',
              fontWeight: 'bold'
            }}>
              <LocationOn sx={{ mr: 1 }} />
              Güzergah Bilgileri
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={3}>
              {/* Yükleme Yeri */}
              <Grid item xs={12} sm={6}>
                <Card variant="outlined" sx={{ 
                  height: '100%', 
                  borderColor: 'primary.light', 
                  borderRadius: 2,
                  transition: '0.3s',
                  '&:hover': { boxShadow: 2 }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32, mr: 1.5 }}>
                        <LocationOn fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle1" color="primary" fontWeight="bold">
                        Yükleme Yeri
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                      {cargo.pickup_location || 'Belirtilmemiş'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Schedule fontSize="small" color="action" sx={{ mr: 1, opacity: 0.7 }} />
                      <Typography variant="body2" color="text.secondary">
                        {cargo.pickup_date ? new Date(cargo.pickup_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Teslim Yeri */}
              <Grid item xs={12} sm={6}>
                <Card variant="outlined" sx={{ 
                  height: '100%', 
                  borderColor: 'error.light', 
                  borderRadius: 2,
                  transition: '0.3s',
                  '&:hover': { boxShadow: 2 }
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'error.light', width: 32, height: 32, mr: 1.5 }}>
                        <LocationOn fontSize="small" />
                      </Avatar>
                      <Typography variant="subtitle1" color="error" fontWeight="bold">
                        Teslim Yeri
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 1, fontWeight: 'medium' }}>
                      {cargo.delivery_location || 'Belirtilmemiş'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Schedule fontSize="small" color="action" sx={{ mr: 1, opacity: 0.7 }} />
                      <Typography variant="body2" color="text.secondary">
                        {cargo.delivery_date ? new Date(cargo.delivery_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Harita */}
              <Grid item xs={12}>
                <Box sx={{ mt: 2, height: 400, position: 'relative', borderRadius: 2, overflow: 'hidden', border: '1px solid #ddd' }}>
                  {loadingMap ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress size={40} />
                      <Typography variant="body1" sx={{ ml: 2 }}>Harita yükleniyor...</Typography>
                    </Box>
                  ) : pickupCoords && deliveryCoords ? (
                    <GoogleRouteMap 
                      pickupCoords={pickupCoords}
                      deliveryCoords={deliveryCoords}
                      mapsLoaded={mapsLoaded}
                    />
                  ) : (
                    <Typography>Koordinat bilgileri bulunamadı</Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Sağ Kolon - İletişim ve Teklif */}
        <Grid item xs={12} md={4}>
          {/* Fiyat Bilgileri Kartı */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ 
              display: 'flex', 
              alignItems: 'center',
              fontWeight: 'bold'
            }}>
              <AttachMoney sx={{ mr: 1 }} />
              Fiyat Bilgileri
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="h4" color="primary" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
              {cargo.price ? `${Number(cargo.price).toLocaleString('tr-TR')} ₺` : 'Teklif Alınıyor'}
            </Typography>
            
            {/* Teklif sayısı bilgisi - Yeni eklendi */}
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                mb: 3,
                p: 1.5,
                bgcolor: cargo.offer_count > 0 ? 'rgba(33, 150, 243, 0.08)' : 'background.default',
                borderRadius: 2,
                border: 1,
                borderColor: cargo.offer_count > 0 ? 'primary.light' : 'divider',
              }}
            >
              <LocalOffer fontSize="small" color={cargo.offer_count > 0 ? "primary" : "action"} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: cargo.offer_count > 0 ? 'medium' : 'normal' }}>
                {cargo.offer_count > 0 
                  ? `Bu ilana şu ana kadar ${cargo.offer_count} teklif yapıldı`
                  : 'Bu ilana henüz teklif yapılmadı'}
              </Typography>
            </Box>
            
            {/* İlan sahibiyse düzenle butonu */}
            {isOwner && (
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                startIcon={<Edit />}
                onClick={handleEdit}
                sx={{ mb: 2, py: 1.2, borderRadius: '50px' }}
              >
                İlanı Düzenle
              </Button>
            )}
            
            {/* İlan sahibiyse silme butonu */}
            {isOwner && (
              <Button 
                variant="outlined"
                color="error" 
                fullWidth
                startIcon={<Delete />}
                onClick={handleDelete}
                sx={{ py: 1.2, borderRadius: '50px' }}
              >
                İlanı Sil
              </Button>
            )}
            
            {/* Taşıyıcı kullanıcılar için teklif ver butonu */}
            {canMakeOffer && !isOwner && (
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth
                onClick={() => navigate(`/cargo/${id}/offer`)}
                sx={{ 
                  py: 1.5, 
                  borderRadius: '50px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: 3,
                  '&:hover': {
                    boxShadow: 5,
                    bgcolor: 'primary.dark'
                  }
                }}
              >
                Teklif Ver
              </Button>
            )}
            
            {cargo.contact_phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, ml: 1 }}>
                <PhoneAndroid sx={{ mr: 1.5, color: 'text.secondary' }} />
                <Typography variant="body1">
                  {cargo.contact_phone}
                </Typography>
              </Box>
            )}
            
            {/* İlan sahibi kendisi değilse email göster */}
            {!isOwner && cargo.contact_email && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, ml: 1 }}>
                <AlternateEmail sx={{ mr: 1.5, color: 'text.secondary' }} />
                <Typography variant="body1">
                  {cargo.contact_email}
                </Typography>
              </Box>
            )}
            
            {/* İlan sahibi kendisi değilse mesaj butonu */}
            {!isOwner && (
              <Button 
                variant="outlined" 
                color="primary"
                fullWidth
                onClick={() => alert('Mesaj gönder özelliği yakında!')}
                sx={{ mt: 1, borderRadius: '50px' }}
              >
                Mesaj Gönder
              </Button>
            )}
            
            {/* Diğer yük sahipleri için bilgi mesajı */}
            {isCargoOwner && !isOwner && (
              <Box sx={{ mt: 3, textAlign: 'center', pt: 1, borderTop: '1px solid #eee' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Bu ilan başka bir yük sahibine aittir.
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => navigate('/cargo/my-posts')}
                  sx={{ borderRadius: '50px' }}
                >
                  Kendi İlanlarıma Git
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Alt Butonlar */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate(-1)}
          sx={{ borderRadius: '50px', px: 3 }}
        >
          Geri Dön
        </Button>
        
        <Box>
          {/* Taşıyıcı kullanıcı ve aktif ilansa, teklif verme butonu */}
          {canMakeOffer && !isOwner && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate(`/cargo/${id}/offer`)}
              sx={{ 
                borderRadius: '50px', 
                px: 3,
                boxShadow: 2,
                '&:hover': { boxShadow: 4 } 
              }}
            >
              Teklif Ver
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
}

// Yardımcı fonksiyonlar
function getStatusLabel(status) {
  switch (status) {
    case 'active': return 'Aktif';
    case 'pending': return 'Onay Bekliyor';
    case 'assigned': return 'Taşıyıcıya Atandı';
    case 'completed': return 'Tamamlandı';
    case 'cancelled': return 'İptal Edildi';
    case 'expired': return 'Süresi Doldu';
    default: return 'Aktif';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'active': return 'success';
    case 'pending': return 'warning';
    case 'assigned': return 'primary';
    case 'completed': return 'info';
    case 'cancelled': return 'error';
    case 'expired': return 'default';
    default: return 'success';
  }
}

function getCargoTypeLabel(type) {
  switch (type) {
    case 'general': return 'Genel Kargo';
    case 'bulk': return 'Dökme Yük';
    case 'container': return 'Konteyner';
    case 'fragile': return 'Hassas/Kırılabilir';
    case 'heavy': return 'Ağır Yük';
    case 'liquid': return 'Sıvı';
    case 'refrigerated': return 'Soğuk Zincir';
    case 'dangerous': return 'Tehlikeli Madde';
    case 'machinery': return 'Makine/Ekipman';
    case 'furniture': return 'Mobilya';
    case 'other': return 'Diğer';
    default: return 'Belirtilmemiş';
  }
}

// Araç tipi değerlerini etiketlere dönüştüren yardımcı fonksiyon
function getVehicleTypeLabel(type) {
  switch (type) {
    case 'open_truck': return 'Açık Kasa Kamyon';
    case 'closed_truck': return 'Kapalı Kasa Kamyon';
    case 'refrigerated_truck': return 'Frigorifik Kamyon';
    case 'semi_trailer': return 'Yarı Römork';
    case 'lowbed': return 'Diğer'; // 'lowbed' değerini 'Diğer' olarak göster
    case 'container_carrier': return 'Konteyner Taşıyıcı';
    case 'tanker': return 'Tanker';
    case 'tipper': return 'Damperli Kamyon';
    case 'van': return 'Panelvan';
    case 'pickup': return 'Kamyonet';
    case 'truck': return 'Kamyon';
    case 'semi_truck': return 'TIR';
    case 'other': return 'Diğer';
    default: return 'Belirtilmemiş';
  }
}

function getStatusBgColor(status) {
  switch (status) {
    case 'active': return '#e8f5e9'; // Açık yeşil
    case 'pending': return '#fff8e1'; // Açık sarı
    case 'assigned': return '#e3f2fd'; // Açık mavi
    case 'completed': return '#e0f7fa'; // Açık turkuaz
    case 'cancelled': return '#ffebee'; // Açık kırmızı
    case 'expired': return '#f5f5f5'; // Açık gri
    default: return '#e8f5e9'; // Varsayılan açık yeşil
  }
}

export default CargoDetail;