import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, 
  Grid, MenuItem, InputAdornment, Divider, Alert,
  CircularProgress, Autocomplete
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Save, Cancel } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

import cargoService from '../../services/cargo.service';
import { GoogleMap } from '@react-google-maps/api';
import { GOOGLE_MAPS_MAP_ID } from '../../utils/mapsConfig';

// Plus kodları temizleyen nihai fonksiyon
const removeLocationPlusCodes = (locationStr) => {
  if (!locationStr) return "";
  
  // Adres parçalarını virgülle ayır
  const parts = locationStr.split(',');
  
  // Plus kod içermeyen parçaları filtrele
  const cleanParts = parts.filter(part => {
    const trimmed = part.trim();
    // "+" işareti içeren ve Plus kod formatına uyan parçaları filtrele
    return !trimmed.includes('+');
  });
  
  // Sadece "Türkiye" kaldıysa
  if (cleanParts.length === 0 || (cleanParts.length === 1 && cleanParts[0].trim() === "Türkiye")) {
    return "Seçilen Konum";
  }
  
  // Kalan parçaları birleştir, "Türkiye" hariç
  return cleanParts
    .map(part => part.trim())
    .filter(part => part && part !== "Türkiye")
    .join(', ');
};

// Türkiye merkezi için obje formatına güncelleme
const defaultCenter = { lat: 39.0, lng: 35.0 };

// Google Maps Location Picker Bileşeni
function GoogleMapPicker({ 
  initialCenter = defaultCenter, 
  onLocationSelect, 
  isPickup = true,
  initialLocation = null,
  mapsLoaded = false
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

// Kargo tipleri - varsayılanlar
const cargoTypes = [
  { value: 'general', label: 'Genel Kargo' },
  { value: 'bulk', label: 'Dökme Yük' },
  { value: 'container', label: 'Konteyner' },
  { value: 'breakbulk', label: 'Parça Yük' },
  { value: 'refrigerated', label: 'Soğutmalı' },
  { value: 'liquid', label: 'Sıvı' },
  { value: 'vehicle', label: 'Araç' },
  { value: 'machinery', label: 'Makine/Ekipman' },
  { value: 'furniture', label: 'Mobilya' },
  { value: 'dangerous', label: 'Tehlikeli Madde' },
  { value: 'other', label: 'Diğer' }
];

// Araç tipleri - 'lowbed' değeri kaldırıldı
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

// Türkiye'deki iller listesi
const turkishCities = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin",
  "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale",
  "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir",
  "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", 
  "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya",
  "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya",
  "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Şanlıurfa", "Uşak",
  "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Şırnak",
  "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
];

// Popüler yurt dışı konumları
const internationalLocations = [
  "Yurt Dışı", "Almanya", "Fransa", "İngiltere", "İtalya", "Hollanda", "Belçika", "İsviçre", 
  "Avusturya", "İspanya", "Yunanistan", "Bulgaristan", "Romanya", "Ukrayna", "Rusya", "ABD",
  "Diğer Yurt Dışı"
];

// Tüm konumlar (arama için)
const allLocations = [...turkishCities, ...internationalLocations];

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

// Bugünün tarihini YYYY-MM-DD formatında al
const getTodayDateString = () => {
  const today = new Date();
  return formatDateForInput(today);
};

// Koordinatları formatlayan yardımcı fonksiyon (Google Maps için)
const formatCoordinate = (coordinate) => {
  if (typeof coordinate === 'number') {
    return parseFloat(coordinate.toFixed(6));
  }
  return coordinate;
};

// Araç tipi değerlerini etiketlere dönüştüren yardımcı fonksiyon
function getVehicleTypeLabel(type) {
  switch (type) {
    case 'open_truck': return 'Açık Kasa Kamyon';
    case 'closed_truck': return 'Kapalı Kasa Kamyon';
    case 'refrigerated_truck': return 'Frigorifik Kamyon';
    case 'semi_trailer': return 'Yarı Römork';
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

function CreateCargoPost() {
  const navigate = useNavigate();
  const mapsLoaded = !!window.google?.maps;
  
  // AuthContext'ten değerleri al
  const { currentUser, isCargoOwner } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    cargo_type: 'general',
    weight: '',
    volume: '',
    package_count: '1',
    description: '',
    pickup_location: '',
    pickup_coordinates: null, // [latitude, longitude] formatında
    delivery_location: '',
    delivery_coordinates: null, // [latitude, longitude] formatında
    pickup_date: getTodayDateString(), // Bugünün tarihini varsayılan yap
    delivery_date: '', // Teslim tarihi - frontend'de bu şekilde kullanıyoruz
    price: '',
    status: 'active',
    required_vehicle: '' // Backend'le uyumlu olması için güncelledik
  });
  
  const [pickupMarker, setPickupMarker] = useState(null);
  const [deliveryMarker, setDeliveryMarker] = useState(null);

  // 'ref' kullanarak senkronize değişken ekleyin
  const mapsLoadedRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  
  // Form alanları için hata kontrolü
  const [formErrors, setFormErrors] = useState({});

  // Başlığın otomatik oluşturulduğunu takip etmek için yeni state
  const [isTitleAuto, setIsTitleAuto] = useState(true);

  // Yükleme konumu seçme işlevi
  const handlePickupLocationSelect = (coordinates, locationName = null) => {
    setPickupMarker(coordinates);
    
    // Hem koordinatları hem de konum adını güncelle
    setFormData(prev => ({
      ...prev,
      pickup_coordinates: coordinates,
      ...(locationName && { pickup_location: locationName })
    }));
    
    // Form hatası varsa temizle
    if (formErrors.pickup_location) {
      setFormErrors(prev => ({ ...prev, pickup_location: '' }));
    }
  };
  
  // Teslim konumu seçme işlevi
  const handleDeliveryLocationSelect = (coordinates, locationName = null) => {
    setDeliveryMarker(coordinates);
    
    // Hem koordinatları hem de konum adını güncelle
    setFormData(prev => ({
      ...prev,
      delivery_coordinates: coordinates,
      ...(locationName && { delivery_location: locationName })
    }));
    
    // Form hatası varsa temizle
    if (formErrors.delivery_location) {
      setFormErrors(prev => ({ ...prev, delivery_location: '' }));
    }
  };

  // Konum ismine göre haritada konumlanma fonksiyonu - Google Geocoder ile
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
          
          // Ham adres bilgisini al
          const rawAddress = results[0].formatted_address;
          console.log("Google Maps'ten gelen ham adres:", rawAddress);
          
          // Plus kodları temizle
          const cleanAddress = removeLocationPlusCodes(rawAddress);
          console.log("Plus kodlarından temizlenmiş adres:", cleanAddress);
          
          if (isPickup) {
            setPickupMarker(coords);
            setFormData(prev => ({ 
              ...prev, 
              pickup_coordinates: coords,
              pickup_location: cleanAddress
            }));
          } else {
            setDeliveryMarker(coords);
            setFormData(prev => ({ 
              ...prev, 
              delivery_coordinates: coords,
              delivery_location: cleanAddress
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

  // Kullanıcı kontrolü - yük sahibi değilse erişimi engelle
  useEffect(() => {
    if (!isCargoOwner) {
      console.log("CreateCargoPost - Unauthorized access, user is not a cargo owner");
      setUnauthorized(true);
      setError("Bu sayfaya erişim yetkiniz bulunmamaktadır. Yalnızca yük sahipleri ilan oluşturabilir.");
    }
  }, [isCargoOwner]);

  // Form değişikliklerini işle
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Başlık manuel değiştirilirse, artık otomatik güncellemeyi durdur
    if (name === 'title') {
      setIsTitleAuto(false);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Form alanı değiştiğinde hata mesajını temizle
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // Autocomplete değişikliklerini işle
  const handleLocationChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value || ''
    }));
    
    // Form alanı değiştiğinde hata mesajını temizle
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Başlık otomatik doldur (yükleme ve teslim yerleri değiştiğinde)
  useEffect(() => {
    if (formData.pickup_location && formData.delivery_location) {
      // Başlık boşsa veya daha önce otomatik oluşturulduysa güncelle
      if (!formData.title || isTitleAuto) {
        // Plus kodları temizle
        const cleanPickupLocation = removeLocationPlusCodes(formData.pickup_location);
        const cleanDeliveryLocation = removeLocationPlusCodes(formData.delivery_location);
        
        const newTitle = `${cleanPickupLocation} - ${cleanDeliveryLocation}`;
        
        // Başlık değiştiyse güncelle
        if (newTitle !== formData.title) {
          setFormData(prev => ({
            ...prev,
            title: newTitle
          }));
          setIsTitleAuto(true); // Başlık otomatik oluşturulduğunu işaretle
        }
      }
    }
  }, [formData.pickup_location, formData.delivery_location, formData.title, isTitleAuto]);

  // Başlık güncelleme effect'i
  useEffect(() => {
    // İlan başarıyla oluşturulduğunda
    if (success) {
      document.title = "İlan Başarıyla Oluşturuldu - Nakliyematik";
      return;
    }
    
    // İlan başlığı varsa
    if (formData.title) {
      document.title = `Yeni İlan: ${formData.title} - Nakliyematik`;
    } else {
      document.title = "Yeni İlan Oluştur - Nakliyematik";
    }
    
    // Component temizlendiğinde orijinal başlığa geri dön
    return () => {
      document.title = "Nakliyematik";
    };
  }, [formData.title, success]);

  // Form doğrulaması
  const validateForm = () => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Zorunlu alanlar
    if (!formData.title?.trim()) errors.title = "İlan başlığı gerekli";
    if (!formData.pickup_location?.trim()) errors.pickup_location = "Yükleme yeri gerekli";
    if (!formData.delivery_location?.trim()) errors.delivery_location = "Teslim yeri gerekli";
    if (!formData.pickup_date) errors.pickup_date = "Yükleme tarihi gerekli";
    if (!formData.delivery_date) errors.delivery_date = "Teslim tarihi gerekli";
    if (!formData.cargo_type) errors.cargo_type = "Yük tipi gerekli";
    
    // Tarih kontrolleri
    if (formData.pickup_date && formData.delivery_date) {
      const pickup = new Date(formData.pickup_date);
      const delivery = new Date(formData.delivery_date);
      
      if (pickup < today) {
        errors.pickup_date = "Geçmiş tarih seçilemez";
      }
      if (delivery < pickup) {
        errors.delivery_date = "Teslim tarihi, yükleme tarihinden önce olamaz";
      }
    }
    
    // Sayısal değer kontrolleri
    if (formData.weight && (isNaN(formData.weight) || parseFloat(formData.weight) <= 0)) {
      errors.weight = "Geçerli bir ağırlık giriniz";
    }
    
    if (formData.volume && (isNaN(formData.volume) || parseFloat(formData.volume) < 0)) {
      errors.volume = "Geçerli bir hacim giriniz";
    }
    
    if (formData.price && (isNaN(formData.price) || parseFloat(formData.price) <= 0)) {
      errors.price = "Geçerli bir fiyat giriniz";
    }
    
    // Aynı lokasyon kontrolü
    if (formData.pickup_location && formData.delivery_location && 
        formData.pickup_location.trim() === formData.delivery_location.trim()) {
      errors.delivery_location = "Yükleme ve teslim yeri aynı olamaz";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form gönderimi
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Yetkisiz veya kullanıcı bilgisi yoksa engelle
    if (unauthorized || !currentUser) {
      setError("Bu işlem için yetkiniz bulunmamaktadır.");
      return;
    }
    
    // Form doğrulaması yap
    if (!validateForm()) {
      window.scrollTo(0, 0); // Sayfayı en üste kaydır
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Formdan API'ye gönderilecek veriyi hazırla
      const submitData = {
        ...formData,
        // Sayısal değerleri dönüştür
        weight: formData.weight ? parseFloat(formData.weight) : null,
        volume: formData.volume ? parseFloat(formData.volume) : null,
        package_count: formData.package_count ? parseInt(formData.package_count, 10) : 1,
        price: formData.price ? parseFloat(formData.price) : null,
        delivery_date: formData.delivery_date, 
        required_vehicle: formData.required_vehicle || null,
        // Koordinatları backend formatında gönder
        pickup_latitude: formData.pickup_coordinates ? formatCoordinate(formData.pickup_coordinates.lat) : null,
        pickup_longitude: formData.pickup_coordinates ? formatCoordinate(formData.pickup_coordinates.lng) : null,
        delivery_latitude: formData.delivery_coordinates ? formatCoordinate(formData.delivery_coordinates.lat) : null,
        delivery_longitude: formData.delivery_coordinates ? formatCoordinate(formData.delivery_coordinates.lng) : null
      };
      
      console.log('Submitting cargo data:', JSON.stringify(submitData, null, 2));
      
      // createCargo API çağrısı yap
      await cargoService.createCargo(submitData);
      setSuccess(true);
      
      // İlan oluşturulduğunda myCargoPostIds'i güncellemek için bir gecikme sonra 
      // my-posts sayfasına yönlendir, bu sayede LocalStorage değerleri güncellenir
      setTimeout(() => {
        navigate('/cargo/my-posts');
      }, 1500);
    } catch (error) {
      console.error('Error creating cargo post:', error);
      
      // API'den gelen hataları işle
      let errorMessage = 'İlan oluşturulurken bir hata oluştu';
      
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
            onClick={() => navigate('/cargo')}
          >
            Ana Sayfaya Dön
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Yeni İlan Oluştur
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
            İlanınız başarıyla oluşturuldu! Yönlendiriliyorsunuz...
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* İlan Başlığı */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="İlan Başlığı"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="İlanla İlgili Ana Fikrinizi Belirtin"
                error={!!formErrors.title}
                helperText={formErrors.title || "Yükleme ve teslim noktalarını seçtikten sonra otomatik doldurulabilir"}
              />
            </Grid>

            {/* Kargo Bilgileri */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="Yük Tipi"
                name="cargo_type"
                value={formData.cargo_type}
                onChange={handleChange}
                required
                error={!!formErrors.cargo_type}
                helperText={formErrors.cargo_type}
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
                fullWidth
                label="Ağırlık"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                type="number"
                error={!!formErrors.weight}
                helperText={formErrors.weight}
                InputProps={{
                  endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                  inputProps: { min: 0, step: 0.1 }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Hacim"
                name="volume"
                value={formData.volume}
                onChange={handleChange}
                type="number"
                error={!!formErrors.volume}
                helperText={formErrors.volume}
                InputProps={{
                  endAdornment: <InputAdornment position="end">m³</InputAdornment>,
                  inputProps: { min: 0, step: 0.1 }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Paket Sayısı"
                name="package_count"
                value={formData.package_count}
                onChange={handleChange}
                type="number"
                error={!!formErrors.package_count}
                helperText={formErrors.package_count}
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fiyat"
                name="price"
                value={formData.price}
                onChange={handleChange}
                type="number"
                error={!!formErrors.price}
                helperText={formErrors.price || "Boş bırakırsanız, 'Fiyat Sorunuz' olarak gösterilir"}
                InputProps={{
                  endAdornment: <InputAdornment position="end">₺</InputAdornment>,
                  inputProps: { min: 0 }
                }}
              />
            </Grid>

            {/* Yükleme ve Teslim Konumları */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Yükleme ve Teslim Konumları
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Harita üzerinde tıklayarak veya aşağıdaki alanlara yazarak konumları belirleyin.
                Haritada tıkladığınız noktalar otomatik olarak formu güncelleyecektir.
              </Typography>
            </Grid>

            <Grid container item spacing={2}>
              {/* Yükleme Yeri ve Haritası */}
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Autocomplete
                    fullWidth
                    options={allLocations}
                    value={formData.pickup_location}
                    onChange={(event, newValue) => handleLocationChange('pickup_location', newValue)}
                    freeSolo
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Yükleme Yeri"
                        name="pickup_location"
                        required
                        error={!!formErrors.pickup_location}
                        helperText={formErrors.pickup_location}
                        placeholder="İl seçin veya yazın"
                        onChange={(e) => {
                          handleLocationChange('pickup_location', e.target.value);
                        }}
                        sx={{ mb: 1 }}
                      />
                    )}
                  />

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => formData.pickup_location && geocodeLocation(formData.pickup_location, true)}
                    sx={{ mb: 1, width: '100%' }}
                    disabled={!mapsLoaded}
                  >
                    Konum Ara
                  </Button>
                  
                  {/* Yükleme konumu için Google harita */}
                  <Box sx={{ height: 400, width: '100%', border: '1px solid #ccc', borderRadius: 1 }}>
                    {mapsLoaded || mapsLoadedRef.current ? (
                      <GoogleMapPicker
                        isPickup={true}
                        initialCenter={defaultCenter}
                        initialLocation={pickupMarker}
                        onLocationSelect={(coords, address) => {
                          console.log("Seçilen yükleme konumu:", { coords, address });
                          setPickupMarker(coords);
                          setFormData(prev => ({
                            ...prev,
                            pickup_location: address,
                            pickup_coordinates: coords
                          }));
                          
                          // Form hatası varsa temizle
                          if (formErrors.pickup_location) {
                            setFormErrors(prev => ({ ...prev, pickup_location: '' }));
                          }
                        }}
                        mapsLoaded={mapsLoaded}
                      />
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%' 
                      }}>
                        <CircularProgress />
                      </Box>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Yükleme konumunu haritada tıklayarak seçebilirsiniz.
                  </Typography>
                </Box>
              </Grid>

              {/* Teslim Yeri ve Haritası */}
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Autocomplete
                    fullWidth
                    options={allLocations}
                    value={formData.delivery_location}
                    onChange={(event, newValue) => handleLocationChange('delivery_location', newValue)}
                    freeSolo
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Teslim Yeri"
                        name="delivery_location"
                        required
                        error={!!formErrors.delivery_location}
                        helperText={formErrors.delivery_location}
                        placeholder="İl seçin veya yazın"
                        onChange={(e) => {
                          handleLocationChange('delivery_location', e.target.value);
                        }}
                        sx={{ mb: 1 }}
                      />
                    )}
                  />

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => formData.delivery_location && geocodeLocation(formData.delivery_location, false)}
                    sx={{ mb: 1, width: '100%' }}
                    disabled={!mapsLoaded}
                  >
                    Konum Ara
                  </Button>
                  
                  {/* Teslim konumu için Google harita */}
                  <Box sx={{ height: 400, width: '100%', border: '1px solid #ccc', borderRadius: 1 }}>
                    {mapsLoaded || mapsLoadedRef.current ? (
                      <GoogleMapPicker
                        isPickup={false}
                        initialCenter={defaultCenter}
                        initialLocation={deliveryMarker}
                        onLocationSelect={(coords, address) => {
                          console.log("Seçilen teslimat konumu:", { coords, address });
                          setDeliveryMarker(coords);
                          setFormData(prev => ({
                            ...prev,
                            delivery_location: address,
                            delivery_coordinates: coords
                          }));
                          
                          // Form hatası varsa temizle
                          if (formErrors.delivery_location) {
                            setFormErrors(prev => ({ ...prev, delivery_location: '' }));
                          }
                        }}
                        mapsLoaded={mapsLoaded}
                      />
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%' 
                      }}>
                        <CircularProgress />
                      </Box>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Teslim konumunu haritada tıklayarak seçebilirsiniz.
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Tarih Bilgileri */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Yükleme Tarihi"
                name="pickup_date"
                type="date"
                value={formatDateForInput(formData.pickup_date)}
                onChange={handleChange}
                required
                error={!!formErrors.pickup_date}
                helperText={formErrors.pickup_date}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Teslim Tarihi"
                name="delivery_date"
                type="date"
                value={formatDateForInput(formData.delivery_date)}
                onChange={handleChange}
                required
                error={!!formErrors.delivery_date}
                helperText={formErrors.delivery_date}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* Açıklama */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
                placeholder="Yük hakkında detaylı bilgi verin"
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>

            {/* Gerekli Araç Bilgisi - Backend ile uyumlu değerlerle güncellendi */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Gerekli Araç Tipi"
                name="required_vehicle"
                value={formData.required_vehicle || ''}
                onChange={handleChange}
                error={!!formErrors.required_vehicle}
                helperText={formErrors.required_vehicle}
              >
                {vehicleTypes.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* İstenen Araç */}
            {formData.required_vehicle && (
              <Grid item xs={12}>
                <Typography variant="body2">
                  İstenen Araç: {getVehicleTypeLabel(formData.required_vehicle)}
                </Typography>
              </Grid>
            )}
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={() => navigate('/cargo/my-posts')}
              disabled={submitting}
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'İlan Oluştur'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>   
  );
}

export default CreateCargoPost;