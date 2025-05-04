import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Grid, Chip, Button, 
  Divider, CircularProgress, Alert, Stepper, Step, StepLabel,
  Tabs, Tab, Snackbar, IconButton
} from '@mui/material';
import {
  Room, ArrowBack, LocationOn, Star, Print,
  Timeline, Info, Close
} from '@mui/icons-material';

import { useSnackbar } from 'notistack';

import transportationService from '../../services/transportation.service';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/formatters';
import ActionButtons from './components/ActionButtons';
import StatusTimeline from './components/StatusTimeline';

// Taşıma adımları
const transportationSteps = [
  { label: 'Yükleme Bekliyor', status: 'awaiting_pickup' },
  { label: 'Taşınıyor', status: 'in_transit' },
  { label: 'Teslim Edildi', status: 'delivered' },
  { label: 'Tamamlandı', status: 'completed' }
];

// getCargoTypeLabel fonksiyonunu genişletelim
const getCargoTypeLabel = (type) => {
  if (!type) return 'Belirtilmemiş';
  
  switch (type) {
    case 'general': return 'Genel Kargo';
    case 'bulk': return 'Dökme Yük';
    case 'container': return 'Konteyner';
    case 'breakbulk': return 'Parça Yük';
    case 'liquid': return 'Sıvı';
    case 'refrigerated': return 'Soğuk Zincir';
    case 'heavy': return 'Ağır Yük';
    case 'vehicle': return 'Araç';
    case 'machinery': return 'Makine/Ekipman';
    case 'furniture': return 'Mobilya';
    case 'electronics': return 'Elektronik';
    case 'food': return 'Gıda';
    case 'dangerous': return 'Tehlikeli Madde';
    case 'livestock': return 'Canlı Hayvan';
    case 'other': return 'Diğer';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

// Durum bilgisine göre adım index'i hesaplama
const getActiveStepIndex = (status) => {
  if (status === 'cancelled') return -1;
  
  let index = transportationSteps.findIndex(step => step.status === status);
  if (index === -1) {
    // Rated durumu için completed ile aynı adımı göster
    if (status === 'rated') return 3;
    return 0;
  }
  return index;
};

// Tab paneli
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`transportation-tabpanel-${index}`}
      aria-labelledby={`transportation-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function TransportationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCargoOwner, isTransporter } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [transportation, setTransportation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [success, setSuccess] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  // Transportation state'ini güncellemek için yardımcı fonksiyon
  const updateTransportation = useCallback((updates) => {
    if (!transportation) return;
    
    setTransportation(prev => {
      const updated = { ...prev, ...updates };
      
      // Active step'i de güncelle
      if (updated.status !== prev.status) {
        setActiveStep(getActiveStepIndex(updated.status));
      }
      
      return updated;
    });
  }, [transportation, setActiveStep]);

  // Tab değiştirme
  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTransportationUpdate = useCallback(async (updatedTransportation) => {
    console.log('Transportation update from ActionButtons:', updatedTransportation);
    
    // Eğer _checkRating bayrağı varsa, backend'den güncel değerlendirme durumunu sorgula
    if (updatedTransportation._checkRating) {
      try {
        console.log('Checking rating status for transportation:', updatedTransportation.id);
        // Taşıma verilerini tekrar getir
        const freshData = await transportationService.getTransportationDetails(id);
        
        // Eğer derecelendirme yapılmışsa, state'i güncelle
        if (freshData) {
          console.log('Received fresh transportation data with rating status:', {
            rated: freshData.rated,
            is_rated: freshData.is_rated,
            rating: freshData.rating,
            rating_comment: freshData.rating_comment,
            ratings: freshData.ratings
          });
          
          // Eğer değerlendirme bilgileri mevcutsa transportation state'i güncelle
          const hasAnyRating = freshData.rated === true || 
                              freshData.is_rated === true || 
                              freshData.rating > 0 || 
                              freshData.rating_comment ||
                              (freshData.ratings && freshData.ratings.length > 0);
                                
          // Taşıyıcı değerlendirmesi var mı kontrol et
          const hasTransporterRating = freshData.ratings?.some(r => r.from_cargo_owner === false);
          
          if (hasAnyRating || hasTransporterRating) {
            setTransportation(prev => ({
              ...prev,
              rated: isCargoOwner ? true : prev.rated,
              is_rated: isCargoOwner ? true : prev.is_rated,
              rating: freshData.rating || prev.rating,
              rating_comment: freshData.rating_comment || prev.rating_comment,
              rated_at: freshData.rated_at || prev.rated_at,
              ratings: freshData.ratings || prev.ratings,
              status: freshData.status || prev.status,
              _ratingDisplayed: true, // Değerlendirmenin görüntülendiğini belirten bayrak
              _transporterRated: hasTransporterRating // Taşıyıcı değerlendirmesi yapıldı mı
            }));
            
            console.log('Updated transportation state with rating information');
          }
        }
      } catch (error) {
        console.error('Error checking rating status:', error);
      }
      
      return; // _checkRating durumunda diğer güncellemeleri yapma
    }
    
    // Normal taşıma durumu güncellemesi
    setTransportation(prev => {
      // Eğer prev null ise veya id'ler eşleşmiyorsa direkt yeni objeyi kullan
      if (!prev || prev.id !== updatedTransportation.id) {
        return updatedTransportation;
      }
      
      // Tüm alanları güncellenmiş değerlerle birleştir
      const updated = { ...prev, ...updatedTransportation };
      
      // Active step'i de güncelle
      setActiveStep(getActiveStepIndex(updated.status));
      
      return updated;
    });
  }, [id, isCargoOwner]); 

  // Taşıma durumu değişikliklerini işleyecek fonksiyon
  const handleStatusChange = useCallback(async (action, data = {}) => {
    console.log(`Status değişikliği istendi: ${action}`, data);
    
    if (!id) {
      console.error('Taşıma ID bilgisi eksik');
      throw new Error('Taşıma ID bilgisi eksik');
    }
    
    // İşlem tipini Türkçeleştir
    const getActionText = (actionType) => {
      switch(actionType) {
        case 'request_pickup': return 'Yükleme talebi';
        case 'confirm_pickup': return 'Yükleme onayı';
        case 'request_delivery': return 'Teslimat bildirimi';
        case 'confirm_delivery': return 'Teslimat onayı';
        case 'cancel': return 'İptal';
        default: return actionType;
      }
    };
    
    try {
      let response;
      setLoading(true);
      
      // İstenen aksiyona göre ilgili API çağrısını yap
      switch (action) {
        case 'request_pickup':
          response = await transportationService.requestPickup(id);
          break;
        case 'confirm_pickup':
          response = await transportationService.confirmPickup(id);
          break;
        case 'request_delivery':
          response = await transportationService.requestDelivery(id);
          break;
        case 'confirm_delivery':
          response = await transportationService.confirmDelivery(id);
          break;
        case 'cancel':
          response = await transportationService.cancelTransportation(id, data.reason || '');
          break;
        default:
          throw new Error(`Geçersiz işlem: ${action}`);
      }
      
      // Başarılı API yanıtını işle
      console.log(`${action} işlemi başarılı, yanıt:`, response);
      
      // Taşıma state'ini güncelle
      setTransportation(prev => ({
        ...prev,
        ...(response || {})
      }));
      
      // Active step'i de güncelle
      if (response?.status) {
        setActiveStep(getActiveStepIndex(response.status));
      }
      
      // Bildirim göster - Türkçe metinle
      setSnackbarMessage(`${getActionText(action)} işlemi başarıyla gerçekleştirildi`);
      setSnackbarOpen(true);
      
      return response;
    } catch (error) {
      console.error(`${action} işlemi başarısız:`, error);
      
      // Hatayı snackbar ile göster
      setSnackbarMessage(`İşlem başarısız: ${error.message || 'Bilinmeyen hata'}`);
      setSnackbarOpen(true);
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [id, setLoading, setTransportation]);

  // Taşıma detaylarını yükleyen fonksiyon
  const fetchTransportationDetails = useCallback(async () => {
    try {
      const data = await transportationService.getTransportationDetails(id);
      
      // Debug için değerlendirme bilgilerini konsola yazdır
      console.log('Fetched transportation details:', data);
      console.log('Rating information:', {
        rated: data.rated,
        rating: data.rating,
        rating_comment: data.rating_comment,
        rated_at: data.rated_at,
        ratings: data.ratings // Burada hem yük sahibi hem de taşıyıcı değerlendirmeleri olabilir
      });
      console.log('Taşıyıcı değerlendirme kontrolü:', {
        isTransporter,
        rating: data.rating, 
        ratings: data.ratings,
        isRatingVisible: data.rating > 0 && (isTransporter || isCargoOwner)
      });
      
      setTransportation(data);
      setActiveStep(getActiveStepIndex(data.status));
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transportation details:', error);
      setError('Taşıma detayları yüklenirken bir hata oluştu.');
      setLoading(false);
    }
  }, [id, isTransporter, isCargoOwner]);
  
  useEffect(() => {
    // İlk yüklemeyi yap
    setLoading(true);
    fetchTransportationDetails().finally(() => setLoading(false));
  }, [id, fetchTransportationDetails]); // fetchTransportationDetails ekledik
    
  // Kullanıcı etkileşimli yenileme - Focus ve visibility events kullanılıyor
  useEffect(() => {
    let lastFetchTime = Date.now();
    const minTimeBetweenFetches = 10000; // 10 saniye
    
    const refreshIfNeeded = () => {
      const now = Date.now();
      if (now - lastFetchTime > minTimeBetweenFetches && !loading) {
        console.log('User triggered refresh: Fetching transportation details');
        lastFetchTime = now;
        fetchTransportationDetails();
      }
    };
    
    // Sayfa görünür olduğunda
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshIfNeeded();
      }
    };
    
    // Pencere odaklandığında
    const handleFocus = () => {
      refreshIfNeeded();
    };
    
    // Event listener'ları ekle
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchTransportationDetails, loading]); // handleRefresh'i kaldırdık

  useEffect(() => {
    if (transportation) {
      console.log('DEBUG - Transportation Veri Kontrolü:', {
        cargoPost: transportation.cargo_post,
        cargoType: transportation.cargo_post?.cargo_type,
        weight: transportation.cargo_post?.weight,
        pickup: {
          pickup_location: transportation.cargo_post?.pickup_location,
          pickup_address: transportation.pickup_address,
          pickup_city: transportation.pickup_city,
          pickup_country: transportation.pickup_country,
        },
        delivery: {
          delivery_location: transportation.cargo_post?.delivery_location,
          delivery_address: transportation.delivery_address,
          delivery_city: transportation.delivery_city,
          delivery_country: transportation.delivery_country,
        }
      });
    }
  }, [transportation]);

  // Yeni debug log ekliyoruz
  useEffect(() => {
    if (transportation) {
      console.log('DEBUG - Transportation Detaylandırılmış Veri:', {
        id: transportation.id,
        status: transportation.status,
        cargo_type: transportation.cargo_type,
        weight: transportation.weight,
        cargo_post_id: transportation.cargo_post?.id || null,
        pickup_details: {
          pickup_address: transportation.pickup_address,
          pickup_city: transportation.pickup_city,
          pickup_country: transportation.pickup_country,
        },
        delivery_details: {
          delivery_address: transportation.delivery_address,
          delivery_city: transportation.delivery_city,
          delivery_country: transportation.delivery_country,
        }
      });
    }
  }, [transportation]);
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }
  
  if (!transportation) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Taşıma bilgileri bulunamadı.</Alert>
      </Container>
    );
  }
  
  // Taşıma durum bilgisini alın
  const statusDisplay = transportation.status_display || 
    (transportation.status === 'awaiting_pickup' ? 'Yükleme Bekliyor' : 
     transportation.status === 'in_transit' ? 'Taşınıyor' :
     transportation.status === 'delivered' ? 'Teslim Edildi' :
     transportation.status === 'completed' ? 'Tamamlandı' :
     transportation.status === 'cancelled' ? 'İptal Edildi' : 'Bilinmiyor');
  
  // Taşıma iptal edildiyse stepper'ı gri göster
  const stepperColor = transportation.status === 'cancelled' ? 'error' : 'primary';
  
  // Durum rengini belirle
  const getStatusColor = () => {
    switch(transportation.status) {
      case 'awaiting_pickup':
        return 'warning';
      case 'in_transit':
        return 'info';
      case 'delivered':
        return 'success';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Üst Navigasyon */}
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<ArrowBack />}
          onClick={() => navigate('/shipments')}
        >
          Taşımalara Dön
        </Button>
      </Box>
      
      {/* Başlık ve Durum */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Taşıma #{transportation.id}
        </Typography>
        
        <Chip 
          label={statusDisplay}
          color={getStatusColor()}
          variant="filled"
          size="medium"
        />
      </Box>
      
      {/* Stepper - İlerleme Durumu */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Taşıma Durumu
        </Typography>
        
        <Stepper 
          activeStep={activeStep} 
          alternativeLabel
          sx={{ 
            '& .MuiStepIcon-root.Mui-active, & .MuiStepIcon-root.Mui-completed': { 
              color: stepperColor 
            } 
          }}
        >
          {transportationSteps.map((step) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {/* İşlem Butonları - ActionButtons bileşenini kullanıyoruz */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <ActionButtons
            transportation={transportation}
            onStatusChange={handleStatusChange}
            isCargoOwner={isCargoOwner}
            isTransporter={isTransporter}
            onTransportationUpdated={handleTransportationUpdate} 
          />
        </Box>
      </Paper>
      
      {/* Tablar - Detay, Zaman Çizelgesi, Konum */}
      <Box sx={{ mb: 3 }}>
        <Paper elevation={1}>
        <Tabs 
            value={tabValue}
            onChange={handleChangeTab}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<Info />} label="Detaylar" iconPosition="start" />
            <Tab icon={<Timeline />} label="Zaman Çizelgesi" iconPosition="start" />
          </Tabs>
          
          {/* Tab içerikleri */}
          <Box sx={{ px: 3 }}>
            {/* Detay Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={4}>
                {/* Sol Taraf - Temel Bilgiler */}
                <Grid item xs={12} md={7}>
                  <Paper elevation={2} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Taşıma Detayları
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Yük Türü</Typography>
                        <Typography variant="body1">
                          {getCargoTypeLabel(transportation.cargo_type || 
                            (transportation.cargo_post && transportation.cargo_post.cargo_type))}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Yük Ağırlığı</Typography>
                        <Typography variant="body1">
                          {transportation.weight
                            ? `${transportation.weight} kg`
                            : transportation.cargo_post?.weight 
                              ? `${transportation.cargo_post.weight} kg` 
                              : 'Belirtilmemiş'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Anlaşma Bedeli</Typography>
                        <Typography variant="body1">
                          {transportation.offer?.price 
                            ? `${transportation.offer.price} ₺` 
                            : 'Belirtilmemiş'}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Tahmini Varış</Typography>
                        <Typography variant="body1">
                          {transportation.estimated_arrival 
                            ? formatDate(transportation.estimated_arrival)
                            : 'Belirtilmemiş'}
                        </Typography>
                      </Grid>
                    </Grid>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">Yükleme Noktası</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Room sx={{ color: 'error.main', mr: 1 }} />
                            <Typography variant="body1">
                              {transportation.pickup_address || 
                               (transportation.pickup_city && transportation.pickup_country 
                                ? `${transportation.pickup_city}, ${transportation.pickup_country}`
                                : transportation.pickup_city || transportation.pickup_country || 'Belirtilmemiş')}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {transportation.pickup_confirmed && (
                          <Box>
                            <Typography variant="caption" color="success.main">
                              Yükleme Onaylandı: {transportation.pickup_confirmed_at ? formatDate(transportation.pickup_confirmed_at) : ''}
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">Teslimat Noktası</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Room sx={{ color: 'success.main', mr: 1 }} />
                            <Typography variant="body1">
                              {transportation.delivery_address || 
                               (transportation.delivery_city && transportation.delivery_country 
                                ? `${transportation.delivery_city}, ${transportation.delivery_country}`
                                : transportation.delivery_city || transportation.delivery_country || 'Belirtilmemiş')}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {transportation.delivery_confirmed && (
                          <Box>
                            <Typography variant="caption" color="success.main">
                              Teslimat Onaylandı: {transportation.delivery_confirmed_at ? formatDate(transportation.delivery_confirmed_at) : ''}
                            </Typography>
                          </Box>
                        )}
                      </Grid>
                    </Grid>
                    
                    {/* Ek Taşıma Bilgileri */}
                    {transportation.additional_info && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Ek Bilgiler</Typography>
                          <Typography variant="body2">
                            {transportation.additional_info}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
                
                {/* Sağ Taraf - Katılımcı Bilgileri */}
                <Grid item xs={12} md={5}>
                  <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                      Taşıma Katılımcıları
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Yük Sahibi
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {transportation.cargo_owner?.company_name || 'Belirtilmemiş'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {transportation.cargo_owner?.phone || 'Belirtilmemiş'}
                      </Typography>
                      
                      {transportation.cargo_owner?.email && (
                        <Typography variant="body2" color="text.secondary">
                          {transportation.cargo_owner.email}
                        </Typography>
                      )}
                    </Box>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Taşıyıcı
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {transportation.transporter?.company_name || 'Belirtilmemiş'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {transportation.transporter?.phone || 'Belirtilmemiş'}
                      </Typography>
                      
                      {transportation.transporter?.email && (
                        <Typography variant="body2" color="text.secondary">
                          {transportation.transporter.email}
                        </Typography>
                      )}
                      
                      {transportation.vehicle_info && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2">
                            <strong>Araç:</strong> {transportation.vehicle_info}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                  
                  {/* Değerlendirme Bilgileri */}
                  <Paper elevation={2} sx={{ p: 3, mb: 4, borderLeft: '4px solid #4caf50' }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <Star sx={{ color: 'warning.main', mr: 1 }} />
                      Değerlendirmeler
                    </Typography>
                    
                    {/* Yük sahibinin değerlendirmesi - SADECE taşıyıcıya gösterilecek */}
                    {isTransporter && transportation.ratings && transportation.ratings.some(r => r.from_cargo_owner === true) && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Yük Sahibinin Değerlendirmesi:
                        </Typography>
                        
                        {transportation.ratings
                          .filter(r => r.from_cargo_owner === true)
                          .map((ownerRating, index) => (
                            <Box key={index}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" sx={{ mr: 1 }}>
                                  <strong>Puan:</strong>
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      fontSize="small" 
                                      sx={{ 
                                        color: i < ownerRating.rating ? 'warning.main' : 'text.disabled',
                                        fontSize: 18
                                      }} 
                                    />
                                  ))}
                                  <Typography variant="body2" sx={{ ml: 1 }}>
                                    ({ownerRating.rating}/5)
                                  </Typography>
                                </Box>
                              </Box>
                              
                              {ownerRating.comment && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2"><strong>Yorum:</strong></Typography>
                                  <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                    "{ownerRating.comment}"
                                  </Typography>
                                </Box>
                              )}
                              
                              {ownerRating.created_at && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                  {formatDate(ownerRating.created_at)}
                                </Typography>
                              )}
                            </Box>
                          ))}
                      </Box>
                    )}
                    
                    {/* Taşıyıcının değerlendirmesi - SADECE yük sahibine gösterilecek */}
                    {transportation.ratings && transportation.ratings.some(r => r.from_cargo_owner === false) && isCargoOwner && (
                      <Box sx={{ mt: 2, pt: transportation.rating > 0 ? 2 : 0, borderTop: transportation.rating > 0 ? '1px dashed rgba(0,0,0,0.1)' : 'none' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Taşıyıcının Değerlendirmesi:
                        </Typography>
                        
                        {transportation.ratings
                          .filter(r => r.from_cargo_owner === false)
                          .map((transporterRating, index) => (
                            <Box key={index} sx={{ mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Typography variant="body2" sx={{ mr: 1 }}>
                                  <strong>Puan:</strong>
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      fontSize="small" 
                                      sx={{ 
                                        color: i < transporterRating.rating ? 'warning.main' : 'text.disabled',
                                        fontSize: 18
                                      }} 
                                    />
                                  ))}
                                  <Typography variant="body2" sx={{ ml: 1 }}>
                                    ({transporterRating.rating}/5)
                                  </Typography>
                                </Box>
                              </Box>
                              
                              {transporterRating.comment && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="body2"><strong>Yorum:</strong></Typography>
                                  <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                    "{transporterRating.comment}"
                                  </Typography>
                                </Box>
                              )}
                              
                              {transporterRating.created_at && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                  {formatDate(transporterRating.created_at)}
                                </Typography>
                              )}
                            </Box>
                          ))}
                      </Box>
                    )}
                    
                    {/* Henüz değerlendirme yapılmadıysa bilgilendirme mesajı */}
                    {(!transportation.ratings || 
                      (isTransporter && !transportation.ratings.some(r => r.from_cargo_owner === true)) ||
                      (isCargoOwner && !transportation.ratings.some(r => r.from_cargo_owner === false))
                    ) && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Henüz değerlendirme yapılmamış.
                      </Alert>
                    )}
                  </Paper>
                  
                  {/* İptal Bilgileri */}
                  {transportation.status === 'cancelled' && (
                    <Paper elevation={2} sx={{ p: 3, backgroundColor: '#fff5f5', borderLeft: '4px solid #f44336' }}>
                      <Typography variant="subtitle1" gutterBottom color="error">
                        İptal Bilgileri
                      </Typography>
                      
                      <Typography variant="body2">
                        <strong>İptal Eden:</strong> {transportation.cancelled_by === 'cargo_owner' 
                          ? 'Yük Sahibi' 
                          : transportation.cancelled_by === 'transporter' 
                          ? 'Taşıyıcı' : 'Admin'}
                      </Typography>
                      
                      <Typography variant="body2">
                        <strong>İptal Tarihi:</strong> {transportation.cancelled_at 
                          ? formatDate(transportation.cancelled_at) 
                          : 'Belirtilmemiş'}
                      </Typography>
                      
                      {transportation.cancellation_reason && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2"><strong>İptal Nedeni:</strong></Typography>
                          <Typography variant="body2">{transportation.cancellation_reason}</Typography>
                        </Box>
                      )}
                    </Paper>
                  )}
                </Grid>
              </Grid>
            </TabPanel>
            
            {/* Zaman Çizelgesi Tab */}
            <TabPanel value={tabValue} index={1}>
              <StatusTimeline transportation={transportation} />
            </TabPanel>
          </Box>
        </Paper>
      </Box>
      
      {/* Yazdırma Butonu */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={() => window.print()}
        >
          Taşıma Detayını Yazdır
        </Button>
      </Box>
      
      {/* Bildirim Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <IconButton 
            size="small" 
            color="inherit" 
            onClick={() => setSnackbarOpen(false)}
          >
            <Close fontSize="small" />
          </IconButton>
        }
      />

      {/* Başarı mesajı */}
      {success && (
        <Snackbar
          open={!!success}
          autoHideDuration={6000}
          onClose={() => setSuccess(null)}
          message={success}
          ContentProps={{
            sx: { backgroundColor: 'success.main' }
          }}
        />
      )}
    </Container>
  );
}

export default TransportationDetail;