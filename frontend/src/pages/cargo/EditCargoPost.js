import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, 
  Grid, MenuItem, InputAdornment, Divider, Alert,
  CircularProgress, Dialog, DialogActions, DialogContent, 
  DialogContentText, DialogTitle
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Cancel, Delete, Search } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext'; // Auth context

import cargoService from '../../services/cargo.service';
import { 
  GoogleMap, Marker, useJsApiLoader 
} from '@react-google-maps/api';
import { GOOGLE_MAPS_MAP_ID } from '../../utils/mapsConfig';

// Durum seçenekleri - status zaten "assigned" seçeneğini içeriyor
const statusOptions = [
  { value: 'active', label: 'Aktif' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'assigned', label: 'Atandı' },
  { value: 'closed', label: 'Kapandı' }
];

// Türkiye merkezi için obje formatına güncelleme
const defaultCenter = { lat: 39.0, lng: 35.0 };

// Kargo tipleri - backend ile uyumlu hale getirildi
const cargoTypes = [
  { value: 'general', label: 'Genel Kargo' },
  { value: 'bulk', label: 'Dökme Yük' },
  { value: 'container', label: 'Konteyner' },
  { value: 'breakbulk', label: 'Parça Yük' },
  { value: 'liquid', label: 'Sıvı' },
  { value: 'vehicle', label: 'Araç' },
  { value: 'machinery', label: 'Makine/Ekipman' },
  { value: 'furniture', label: 'Mobilya' },
  { value: 'dangerous', label: 'Tehlikeli Madde' },
  { value: 'other', label: 'Diğer' }
];

// Araç tipleri - CreateCargoPost.js ile uyumlu hale getirildi
const vehicleTypes = [
  { value: '', label: 'Belirtilmemiş' },
  { value: 'open_truck', label: 'Açık Kasa Kamyon' },
  { value: 'closed_truck', label: 'Kapalı Kasa Kamyon' },
  { value: 'refrigerated_truck', label: 'Frigorifik Kamyon' },
  { value: 'semi_trailer', label: 'Yarı Römork' },
  { value: 'container_carrier', label: 'Konteyner Taşıyıcı' },
  { value: 'tanker', label: 'Tanker' },
  { value: 'tipper', label: 'Damperli Kamyon' },
  { value: 'van', label: 'Panelvan' },
  { value: 'pickup', label: 'Kamyonet' },
  { value: 'other', label: 'Diğer' }
];

// Tarih formatı yardımcı fonksiyonu
const formatDateForInput = (dateValue) => {
  if (!dateValue) return '';
  
  if (typeof dateValue === 'string') {
    // Tarih string formatında ise (YYYY-MM-DD)
    return dateValue.split('T')[0];
  }
  
  if (dateValue instanceof Date) {
    // Tarih Date objesi ise
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return '';
};

// Koordinatları formatlama fonksiyonu
const formatCoordinate = (coord) => {
  if (coord === null || coord === undefined) return null;
  
  // Koordinatı 6 ondalıklı olarak formatla
  let formattedCoord = parseFloat(coord).toFixed(6);
  
  // Çok uzun bir sayı olmaması için 10 karakterle sınırla
  // (bu enlem/boylam için fazlasıyla yeterli)
  if (formattedCoord.length > 20) {
    console.warn("Çok uzun koordinat değeri:", formattedCoord);
    formattedCoord = formattedCoord.substring(0, 20);
  }
  
  return parseFloat(formattedCoord);
};

// Önce genel kullanım için plus kod temizleme fonksiyonunu ekleyelim (bileşenin dışında)
const removeLocationPlusCodes = (locationStr) => {
  if (!locationStr) return "";
  
  // Daha esnek ve kapsamlı regex kullanın
  return locationStr
    .replace(/[A-Z0-9]{4,7}\+[A-Z0-9]{2,3}(\s*,?)/g, '')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*,\s*/g, ', ')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/g, '')
    .trim();
};

// GoogleMapPicker bileşenini basitleştirelim
function GoogleMapPicker({ 
  initialCenter = defaultCenter, 
  onLocationSelect, 
  isPickup = true,
  initialLocation = null
}) {
  const [map, setMap] = useState(null);
  const markerRef = useRef(null);
  
  // Google Maps yüklendiğinde
  const handleMapLoad = (mapInstance) => {
    console.log("Harita yüklendi:", isPickup ? "Yükleme Haritası" : "Teslimat Haritası");
    setMap(mapInstance);
    
    // İlk marker oluşturma (imperatif yöntem)
    if (initialLocation) {
      console.log("İlk marker oluşturuluyor:", initialLocation);
      const marker = new window.google.maps.Marker({
        position: initialLocation,
        map: mapInstance,
        title: isPickup ? 'Yükleme Noktası' : 'Teslimat Noktası',
        icon: {
          url: isPickup ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        },
        zIndex: 1000
      });
      
      // Referansı sakla
      markerRef.current = marker;
    }
  };
  
  // Haritaya tıklama olayı
  const handleMapClick = (event) => {
    if (!map) return;
    
    const coords = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    
    // Mevcut marker'ı güncelle veya yeni oluştur
    if (markerRef.current) {
      markerRef.current.setPosition(coords);
    } else {
      const marker = new window.google.maps.Marker({
        position: coords,
        map: map,
        title: isPickup ? 'Yükleme Noktası' : 'Teslimat Noktası',
        icon: {
          url: isPickup ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        },
        zIndex: 1000,
        animation: window.google.maps.Animation.DROP
      });
      
      markerRef.current = marker;
    }
    
    // Reverse geocoding...
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ 
      location: coords,
      language: 'tr'
    }, (results, status) => {
      if (status === 'OK' && results[0]) {
        // Ham adres bilgisini al
        const rawAddress = results[0].formatted_address;
        console.log("Google Maps'ten gelen ham adres:", rawAddress);
        
        // Plus kodları temizle
        const cleanAddress = removeLocationPlusCodes(rawAddress);
        console.log("Plus kodlarından temizlenmiş adres:", cleanAddress);
        
        // Konum ve temizlenmiş adres bilgisini yukarı aktar
        onLocationSelect(coords, cleanAddress);
      } else {
        console.error("Geocoding hatası:", status);
        onLocationSelect(coords, "Seçilen Konum");
      }
    });
  };

  // Clean-up işlemleri
  useEffect(() => {
    return () => {
      // Component unmount olduğunda marker'ı temizle
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <GoogleMap
      mapContainerStyle={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '400px'
      }}
      center={initialLocation || initialCenter}
      zoom={initialLocation ? 12 : 6}
      onLoad={handleMapLoad}
      mapId={GOOGLE_MAPS_MAP_ID} // MapId ekleyin
      options={{
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
        mapId: GOOGLE_MAPS_MAP_ID // options içinde de belirtin
      }}
      onClick={handleMapClick}
    />
  );
}

function EditCargoPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isCargoOwner } = useAuth();
  const mapsLoaded = !!window.google?.maps;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    cargo_type: '',
    weight: '',
    volume: '',
    package_count: '',
    description: '',
    pickup_location: '',
    pickup_date: null,
    delivery_location: '',
    delivery_date: null,
    price: '',
    status: 'active',
    required_vehicle: '',
    pickup_coordinates: null, // Koordinat bilgisini ekle
    delivery_coordinates: null // Koordinat bilgisini ekle
  });

  const [formErrors, setFormErrors] = useState({});

  // updateFormFields fonksiyonunda başlık oluşturma kısmını güncelleyin
  const updateFormFields = (fields) => {
    console.log("Form alanları güncelleniyor:", fields);
    
    // Form verilerini güncelle
    setFormData(prev => {
      const newFormData = {
        ...prev,
        ...fields
      };
      
      // Şehir isimlerini güncelledikten sonra başlığı otomatik güncelle
      if (fields.pickup_location || fields.delivery_location) {
        const pickupLocation = fields.pickup_location || prev.pickup_location;
        const deliveryLocation = fields.delivery_location || prev.delivery_location;
        
        if (pickupLocation && deliveryLocation) {
          // Her bir lokasyondan plus kodları temizle - aynı fonksiyonu kullanıyoruz
          const cleanPickupLocation = removeLocationPlusCodes(pickupLocation);
          const cleanDeliveryLocation = removeLocationPlusCodes(deliveryLocation);
          
          // İlan başlığını temizlenmiş lokasyonlarla oluştur
          newFormData.title = `${cleanPickupLocation} - ${cleanDeliveryLocation}`;
          console.log("Başlık otomatik güncellendi:", newFormData.title);
        }
      }
      
      return newFormData;
    });
  };

  const [pickupMarker, setPickupMarker] = useState(null);
  const [deliveryMarker, setDeliveryMarker] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  // Kullanıcı kontrolü - yük sahibi değilse erişimi engelle
  useEffect(() => {
    if (!isCargoOwner) {
      console.log("EditCargoPost - Unauthorized access, user is not a cargo owner");
      setUnauthorized(true);
      setError("Bu sayfaya erişim yetkiniz bulunmamaktadır. Yalnızca yük sahipleri kargo düzenleyebilir.");
    }
  }, [isCargoOwner]);

  // İlan bilgilerini yükle
  useEffect(() => {
    const fetchCargoDetails = async () => {
      if (unauthorized || !currentUser) return; // Yetkisiz erişimse veri yükleme
      
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching cargo details for ID:", id);
        const data = await cargoService.getCargoDetails(id);
        console.log("API response:", data);
        
        // Tüm verinin tam olarak geldiğinden emin ol
        if (!data) {
          throw new Error("İlan bilgileri alınamadı");
        }
        
        // İlan sahipliği kontrolü
        // API'den gelen cargo_owner bilgisi ile kontrol et
        const isOwner = data.cargo_owner === currentUser?.cargo_owner?.id;
        
        console.log("Ownership check:", { 
          cargoOwnerId: data.cargo_owner,
          currentUserId: currentUser?.cargo_owner?.id,
          isOwner 
        });
        
        if (!isOwner) {
          // İlan sahipliğini başka bir yöntemle kontrol et
          const myPostsResponse = await cargoService.getMyPosts();
          const myPosts = myPostsResponse;
          const myPostIds = myPosts.map(post => post.id);
          const isInMyPosts = myPostIds.includes(Number(id));
          
          console.log("Secondary ownership check:", { myPostIds, currentPostId: Number(id), isInMyPosts });
          
          if (!isInMyPosts) {
            setUnauthorized(true);
            setError("Bu ilanı düzenleme yetkiniz bulunmamaktadır. Yalnızca ilan sahibi düzenleme yapabilir.");
            setLoading(false);
            return;
          }
        }
        
        // API'den gelen verilerle formu doldur
        // API'den gelen alanlar ve form alanları eşleşmiyorsa düzeltme yap
        setFormData({
          title: data.title || '',
          cargo_type: data.cargo_type || '',
          weight: data.weight || '',
          volume: data.volume || '',
          package_count: data.package_count || '',
          description: data.description || '',
          pickup_location: data.pickup_location || '',
          pickup_date: data.pickup_date || null,
          delivery_location: data.delivery_location || '',
          delivery_date: data.delivery_deadline || data.delivery_date || null,
          price: data.price || '',
          status: data.status || 'active',
          required_vehicle: data.required_vehicle || '',
          pickup_coordinates: data.pickup_latitude && data.pickup_longitude ? 
            { lat: parseFloat(data.pickup_latitude), lng: parseFloat(data.pickup_longitude) } : null,
          delivery_coordinates: data.delivery_latitude && data.delivery_longitude ? 
            { lat: parseFloat(data.delivery_latitude), lng: parseFloat(data.delivery_longitude) } : null
        });

        // Koordinat bilgilerini set et
        if (data.pickup_latitude && data.pickup_longitude) {
          const pickupLat = parseFloat(data.pickup_latitude);
          const pickupLng = parseFloat(data.pickup_longitude);
          
          if (!isNaN(pickupLat) && !isNaN(pickupLng)) {
            setPickupMarker({ lat: pickupLat, lng: pickupLng });
            setFormData(prev => ({
              ...prev,
              pickup_coordinates: { lat: pickupLat, lng: pickupLng }
            }));
          }
        }
        
        if (data.delivery_latitude && data.delivery_longitude) {
          const deliveryLat = parseFloat(data.delivery_latitude);
          const deliveryLng = parseFloat(data.delivery_longitude);
          
          if (!isNaN(deliveryLat) && !isNaN(deliveryLng)) {
            setDeliveryMarker({ lat: deliveryLat, lng: deliveryLng });
            setFormData(prev => ({
              ...prev,
              delivery_coordinates: { lat: deliveryLat, lng: deliveryLng }
            }));
          }
        }
        
      } catch (error) {
        console.error('Error fetching cargo details:', error);
        setError('İlan bilgileri yüklenirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      } finally {
        setLoading(false);
      }
    };

    if (id && currentUser && isCargoOwner) {
      fetchCargoDetails();
    }
  }, [id, currentUser, unauthorized, isCargoOwner]);

  // Yükleme konumu seçme işlevi
  const handlePickupLocationSelect = (coordinates, locationName = null) => {
    setPickupMarker(coordinates);
    
    // Hem koordinatları hem de konum adını güncelle
    setFormData(prev => ({
      ...prev,
      pickup_coordinates: coordinates,
      ...(locationName && { pickup_location: locationName })
    }));
  };
  
  // Teslim konumu seçme işlevi
  const handleDeliveryLocationSelect = (coordinates, locationName = null) => {
    setDeliveryMarker(coordinates);
    
    setFormData(prev => ({
      ...prev,
      delivery_coordinates: coordinates,
      ...(locationName && { delivery_location: locationName })
    }));
  };

  // Konum ismine göre haritada konumlanma fonksiyonu - Google Maps Geocoder ile
  const geocodeLocation = async (locationName, isPickup) => {
    if (!locationName || !window.google || !window.google.maps) return;
    
    try {
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({ address: locationName }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const coords = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          };
          
          if (isPickup) {
            setPickupMarker(coords);
            setFormData(prev => ({ 
              ...prev, 
              pickup_coordinates: coords
            }));
          } else {
            setDeliveryMarker(coords);
            setFormData(prev => ({ 
              ...prev, 
              delivery_coordinates: coords
            }));
          }
        } else {
          console.error('Konum bulunamadı:', status);
        }
      });
    } catch (error) {
      console.error('Geocoding hatası:', error);
    }
  };

  // Form gönderiminden önce, koordinatları almak için otomatik geocoding
  const ensureCoordinates = async () => {
    if (!formData.pickup_coordinates && formData.pickup_location) {
      await geocodeLocation(formData.pickup_location, true);
    }
    
    if (!formData.delivery_coordinates && formData.delivery_location) {
      await geocodeLocation(formData.delivery_location, false);
    }
  };

  // Form değişikliklerini işle
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Form validasyonu
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title) {
      errors.title = "İlan başlığı gereklidir";
    }
    
    if (!formData.pickup_location) {
      errors.pickup_location = "Yükleme yeri gereklidir";
    }

    if (!formData.pickup_coordinates) {
      errors.pickup_location = "Haritada yükleme noktası seçmelisiniz";
    }

    if (!formData.delivery_coordinates) {
      errors.delivery_location = "Haritada teslimat noktası seçmelisiniz";
    }
    
    // ...diğer validasyon kuralları...
    
    setFormErrors(errors); // Hataları state'e kaydet
    return Object.keys(errors).length === 0;
  };

  // Form gönderimi
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("Form gönderiliyor, formData:", formData);
    
    // Yetkisiz veya kullanıcı bilgisi yoksa engelle
    if (unauthorized || !currentUser) {
      setError("Bu işlem için yetkiniz bulunmamaktadır.");
      return;
    }
    
    if (!validateForm()) {
      setError("Formda hatalar var, lütfen düzeltin.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess(false);
  
    try {
      // Koordinatları kontrol et ve gerekirse otomatik olarak al
      await ensureCoordinates();

      // Formdan API'ye gönderilecek veriyi hazırla
      const submitData = {
        ...formData,
        // Sayısal değerleri dönüştür
        weight: formData.weight ? parseFloat(formData.weight) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
        package_count: formData.package_count ? parseInt(formData.package_count, 10) : null,
        price: formData.price ? parseFloat(formData.price) : null,
        // Backend delivery_deadline bekliyorsa field adını değiştir
        delivery_deadline: formData.delivery_date,
        
        // required_vehicle için boş string kullan, null yerine
        required_vehicle: formData.required_vehicle || '',

        // Formatlanmış koordinat değerleri - Google Maps formatından backend formatına dönüştür
        pickup_latitude: formData.pickup_coordinates ? formatCoordinate(formData.pickup_coordinates.lat) : null,
        pickup_longitude: formData.pickup_coordinates ? formatCoordinate(formData.pickup_coordinates.lng) : null,
        delivery_latitude: formData.delivery_coordinates ? formatCoordinate(formData.delivery_coordinates.lat) : null,
        delivery_longitude: formData.delivery_coordinates ? formatCoordinate(formData.delivery_coordinates.lng) : null,
        
        // backend'e coordinates bilgisini göndermiyoruz
        pickup_coordinates: undefined,
        delivery_coordinates: undefined
      };
  
      // delivery_date alanını kaldır, bunun yerine delivery_deadline kullanılıyor
      delete submitData.delivery_date;
      
      console.log('API için hazırlanan veri:', submitData);
      console.log('İlan başlığı:', submitData.title);
      console.log('Teslim yeri:', submitData.delivery_location);
  
      await cargoService.updateCargoPost(id, submitData);
      setSuccess(true);
      
      // Kısa bir süre sonra ilan listesine dön
      setTimeout(() => {
        navigate('/cargo/my-posts');
      }, 1500);
    } catch (error) {
      console.error('Error updating cargo post:', error);
      
      // API'den gelen hata mesajını gösterelim
      let errorMessage = 'İlan güncellenirken bir hata oluştu';
      
      if (error.response?.data) {
        // API'den gelen hata mesajını al
        const responseData = error.response.data;
        
        // Hata mesajını oluştur
        if (typeof responseData === 'string') {
          errorMessage += `: ${responseData}`;
        } else if (typeof responseData === 'object') {
          // Nesne olarak dönerse alan bazlı hataları göster
          const errorDetails = [];
          
          Object.keys(responseData).forEach(key => {
            const value = responseData[key];
            if (Array.isArray(value)) {
              errorDetails.push(`${key}: ${value.join(', ')}`);
            } else if (typeof value === 'string') {
              errorDetails.push(`${key}: ${value}`);
            } else {
              errorDetails.push(`${key}: ${JSON.stringify(value)}`);
            }
          });
          
          if (errorDetails.length > 0) {
            errorMessage += ': ' + errorDetails.join('; ');
          }
        }
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // İlanı silme işlemi
  const handleDelete = async () => {
    // Yetkisiz veya kullanıcı bilgisi yoksa engelle
    if (unauthorized || !currentUser) {
      setError("Bu işlem için yetkiniz bulunmamaktadır.");
      setDeleteDialogOpen(false);
      return;
    }
    
    try {
      setDeleteDialogOpen(false); // Dialog'u kapat
      setSubmitting(true); // Silme işlemi sırasında butonu devre dışı bırak
      
      await cargoService.deleteCargoPost(id);
      
      // Başarılı silme mesajı göster
      setSuccess(true);
      setError(null);
      
      // Kısa bir süre sonra ilan listesine dön
      setTimeout(() => {
        navigate('/cargo/my-posts');
      }, 1000);
    } catch (error) {
      console.error('Error deleting cargo post:', error);
      setError('İlan silinirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
      setSubmitting(false);
    }
  };

  // Başlık güncelleme effect'i
  useEffect(() => {
    // Yükleme durumunda
    if (loading) {
      document.title = "İlan Yükleniyor... - Nakliyematik";
      return;
    }
    
    // İlan başarıyla güncellendiğinde
    if (success) {
      document.title = "İlan Başarıyla Güncellendi - Nakliyematik";
      return;
    }
    
    // İlan başlığı varsa
    if (formData.title) {
      document.title = `İlan Düzenle: ${formData.title} - Nakliyematik`;
    } else {
      document.title = "İlan Düzenle - Nakliyematik";
    }
    
    // Component temizlendiğinde orijinal başlığa geri dön
    return () => {
      document.title = "Nakliyematik";
    };
  }, [loading, formData.title, success]);

  // Yetkisiz erişim durumunda
  if (unauthorized) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || "Bu sayfaya erişim yetkiniz bulunmamaktadır."}
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/cargo/my-posts')}
          >
            İlanlarıma Dön
          </Button>
        </Paper>
      </Container>
    );
  }
  
  // Yükleme durumunda
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            İlan Düzenle
          </Typography>
          <Divider />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            İlanınız başarıyla güncellendi! Yönlendiriliyorsunuz...
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} id="edit-cargo-form">
          <Grid container spacing={3}>
            {/* İlan Başlığı */}
            <Grid item xs={12}>
              <TextField
                id="cargo-title"
                fullWidth
                label="İlan Başlığı"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Örn: İstanbul - Ankara 2+1 Ev Eşyası"
                aria-describedby="cargo-title-helper"
                error={!!formErrors.title}
                helperText={formErrors.title}
              />
            </Grid>

            {/* Kargo Bilgileri */}
            <Grid item xs={12} sm={4}>
              <TextField
                id="cargo-type"
                fullWidth
                select
                label="Yük Tipi"
                name="cargo_type"
                value={formData.cargo_type}
                onChange={handleChange}
                required
              >
                {cargoTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                id="cargo-weight"
                fullWidth
                label="Ağırlık"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                id="cargo-volume"
                fullWidth
                label="Hacim"
                name="volume"
                value={formData.volume}
                onChange={handleChange}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">m³</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                id="cargo-package-count"
                fullWidth
                label="Paket Sayısı"
                name="package_count"
                value={formData.package_count}
                onChange={handleChange}
                type="number"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                id="cargo-price"
                fullWidth
                label="Fiyat"
                name="price"
                value={formData.price}
                onChange={handleChange}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">₺</InputAdornment>,
                }}
              />
            </Grid>

            {/* Yükleme Yeri */}
            <Grid item xs={12} sm={12}>
              <TextField
                id="cargo-pickup-location"
                fullWidth
                label="Yükleme Yeri"
                name="pickup_location"
                value={formData.pickup_location}
                onChange={handleChange}
                required
                placeholder="Yükleme konumu"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button 
                        size="small" 
                        onClick={() => geocodeLocation(formData.pickup_location, true)}
                      >
                        <Search fontSize="small" />
                      </Button>
                    </InputAdornment>
                  ),
                }}
                error={!!formErrors.pickup_location}
                helperText={formErrors.pickup_location}
                sx={{ mb: 1 }}
              />
            </Grid>

            {/* Yükleme Noktası Seçimi */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Yükleme Noktası
              </Typography>
              <Box sx={{ height: 400, mb: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                {/* Maps API kontrol edici */}
                {!window.google?.maps ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%',
                    flexDirection: 'column'
                  }}>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>Google Maps yükleniyor...</Typography>
                  </Box>
                ) : (
                  <GoogleMapPicker
                    initialLocation={pickupMarker}
                    onLocationSelect={(coords, address) => {
                      console.log("Seçilen yükleme konumu:", { coords, address });
                      setPickupMarker(coords);
                      updateFormFields({
                        pickup_location: address,
                        pickup_coordinates: coords
                      });
                    }}
                    isPickup={true}
                  />
                )}
              </Box>
              {formErrors.pickup_location && (
                <Typography color="error" variant="caption">
                  {formErrors.pickup_location}
                </Typography>
              )}
            </Grid>

            {/* Teslimat Yeri */}
            <Grid item xs={12} sm={12}>
              <TextField
                id="cargo-delivery-location"
                fullWidth
                label="Teslimat Yeri"
                name="delivery_location"
                value={formData.delivery_location}
                onChange={handleChange}
                required
                placeholder="Teslimat konumu"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button 
                        size="small" 
                        onClick={() => geocodeLocation(formData.delivery_location, false)}
                      >
                        <Search fontSize="small" />
                      </Button>
                    </InputAdornment>
                  ),
                }}
                error={!!formErrors.delivery_location}
                helperText={formErrors.delivery_location}
                sx={{ mb: 1 }}
              />
            </Grid>

            {/* Teslimat Noktası Seçimi */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Teslimat Noktası
              </Typography>
              <Box sx={{ height: 400, mb: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <GoogleMapPicker
                  initialLocation={deliveryMarker}
                  onLocationSelect={(coords, address) => {
                    console.log("Seçilen teslimat konumu:", { coords, address });
                    
                    // Marker'ı ve konum bilgisini güncelle
                    setDeliveryMarker(coords);
                    
                    // Form verilerini güncelle
                    updateFormFields({
                      delivery_location: address,
                      delivery_coordinates: coords
                    });
                    
                    // Hata mesajını temizle
                    if (formErrors.delivery_location) {
                      setFormErrors(prev => ({ ...prev, delivery_location: '' }));
                    }
                  }}
                  isPickup={false}
                />
              </Box>
              {formErrors.delivery_location && (
                <Typography color="error" variant="caption">
                  {formErrors.delivery_location}
                </Typography>
              )}
            </Grid>

            {/* Yükleme Bilgileri */}
            <Grid item xs={12} sm={6}>
              <TextField
                id="cargo-pickup-date"
                fullWidth
                label="Yükleme Tarihi"
                name="pickup_date"
                type="date"
                value={formatDateForInput(formData.pickup_date)}
                onChange={handleChange}
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* Teslim Bilgileri */}
            <Grid item xs={12} sm={6}>
              <TextField
                id="cargo-delivery-date"
                fullWidth
                label="Teslim Tarihi"
                name="delivery_date"
                type="date"
                value={formatDateForInput(formData.delivery_date)}
                onChange={handleChange}
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* Açıklama */}
            <Grid item xs={12}>
              <TextField
                id="cargo-description"
                fullWidth
                label="Açıklama"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
                placeholder="Yük hakkında detaylı bilgi verin"
              />
            </Grid>

            {/* Gerekli Araç Bilgisi */}
            <Grid item xs={12}>
              <TextField
                id="cargo-required-vehicle"
                fullWidth
                select
                label="Gerekli Araç Tipi"
                name="required_vehicle"
                value={formData.required_vehicle || ''}
                onChange={handleChange}
              >
                {vehicleTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Durum */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Durum"
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
                error={!!formErrors.status}
                helperText={formErrors.status}
              >
                {statusOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ mr: 1 }}
                disabled={submitting}
              >
                Sil
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => navigate('/cargo/my-posts')}
                disabled={submitting}
              >
                İptal
              </Button>
            </Box>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'Güncelle'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* İlan Silme Onay Dialogu */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>İlanı Sil</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu ilanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={handleDelete} color="error" disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default EditCargoPost;