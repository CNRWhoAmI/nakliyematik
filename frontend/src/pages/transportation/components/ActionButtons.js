import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Alert, Dialog, DialogActions, DialogContent, 
  DialogContentText, DialogTitle, TextField, CircularProgress,
  Snackbar, IconButton, Typography, Tooltip
} from '@mui/material';
import {
  LocalShipping, CheckCircle, DirectionsCar, Done, LocationOn,
  Cancel, Close, Star, VerifiedUser
} from '@mui/icons-material';

const ActionButtons = ({ 
  transportation, 
  onStatusChange,
  isCargoOwner, 
  isTransporter,
  onTransportationUpdated
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // useRef kullanarak daha tutarlı bir durum takibi sağlıyoruz
  const transportationRef = useRef(transportation);
  
  // Komponenti yeniden render etmek için dummy state
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  // Force update fonksiyonu - komponenti yeniden render eder
  const forceUpdate = useCallback(() => {
    setForceUpdateKey(prev => prev + 1);
  }, []);
  
  // Diyalog durumları
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Değerlendirme durumunu ayrıca takip edelim
  const [hasBeenRated, setHasBeenRated] = useState(false);
  
  // Her render'da transportation objesi güncellenir
  useEffect(() => {
    transportationRef.current = transportation;
    
    // Debug
    console.log('ActionButtons re-rendering with transportation:', 
      transportation?.id, 
      'status:', transportation?.status);
      
    // Component props debug
    console.log('Component props:', {
      transportation: !!transportation,
      isCargoOwner,
      isTransporter,
      hasOnStatusChange: typeof onStatusChange === 'function',
      hasUpdateCallback: typeof onTransportationUpdated === 'function'
    });
    
  }, [transportation, isCargoOwner, isTransporter, onStatusChange, onTransportationUpdated]);
  
  // Taşıma ID'si
  const transportationId = transportationRef.current?.id;
  
  // Transportation objesini güncelleme yardımcı fonksiyonu
  const updateTransportation = useCallback((updates) => {
    if (!transportationRef.current) return;
    
    // Eski verilerle yeni verileri birleştir
    const updated = { ...transportationRef.current, ...updates };
    transportationRef.current = updated;
    
    console.log('Local transportation updated:', updated);
    
    // Eğer callback tanımlıysa üst bileşene de bildir
    if (onTransportationUpdated) {
      onTransportationUpdated(updated);
    }
    
    // Componenti yeniden render et
    forceUpdate();
  }, [onTransportationUpdated, forceUpdate]);
  
  // Taşımanın değerlendirilip değerlendirilmediğini kontrol eden yardımcı fonksiyon
  const isRated = useCallback(() => {
    // Debug için detaylı log ekleyin
    console.log('isRated check - hasBeenRated:', hasBeenRated);
    
    // Eğer daha önce değerlendirme yapıldı flagimiz varsa direkt true döndür
    if (hasBeenRated) {
      return true;
    }
    
    const transport = transportationRef.current;
    console.log('isRated check - transport:', transport);
    if (!transport) return false;
  
    // Kullanıcı rolüne göre doğru değerlendirmeyi kontrol etmemiz gerekiyor
    let hasRatingAttributes = false;
    
    if (isCargoOwner) {
      // Yük sahibi için kendi değerlendirmesini kontrol et
      hasRatingAttributes = Boolean(
        transport.rated === true || 
        transport.is_rated === true ||
        transport.status === 'rated' ||
        (transport.rating !== undefined && transport.rating !== null && transport.rating > 0) ||
        (transport.rating_comment && transport.rating_comment.trim() !== '') ||
        (transport.rated_at !== null && transport.rated_at !== undefined) ||
        (transport.ratings?.some(r => r.from_cargo_owner === true))
      );
    } else if (isTransporter) {
      // Taşıyıcı için kendi değerlendirmesini kontrol et
      hasRatingAttributes = Boolean(
        (transport.ratings?.some(r => r.from_cargo_owner === false)) ||
        transport.transporter_rated === true
      );
    }
    
    // Eğer değerlendirme yapıldıysa, bunu state'e kaydedelim
    if (hasRatingAttributes && !hasBeenRated) {
      console.log('Rating detected, setting hasBeenRated to true');
      setHasBeenRated(true);
    }
    
    return hasRatingAttributes || hasBeenRated;
  }, [hasBeenRated, isCargoOwner, isTransporter]);

  // Teslimatın onaylandığını kontrol eden yardımcı fonksiyon
  const isDeliveryConfirmed = useCallback(() => {
    const transport = transportationRef.current;
    if (!transport) return false;
    
    return Boolean(
      transport.delivery_confirmed === true ||
      transport.status === 'completed' ||
      transport.status === 'rated' ||
      transport.status === 'delivered' ||
      transport.delivered_at ||
      transport.delivery_confirmed_at ||
      transport.completed_at
    );
  }, []);
  
  // Yüklemenin onaylandığını kontrol eden yardımcı fonksiyon
  const isPickupConfirmed = useCallback(() => {
    const transport = transportationRef.current;
    if (!transport) return false;
    
    return Boolean(
      transport.pickup_confirmed === true ||
      transport.status === 'in_transit' ||
      transport.status === 'delivered' ||
      transport.status === 'completed' ||
      transport.status === 'rated'
    );
  }, []);
  
  // Teslimat bildirimi yapıldı mı kontrol eden yardımcı fonksiyon
  const isDeliveryRequested = useCallback(() => {
    const transport = transportationRef.current;
    if (!transport) return false;
    
    return Boolean(
      transport.delivery_requested === true
    );
  }, []);
  
  // Komponentin ilk render'ında bir kere çalışır
  useEffect(() => {
    // Yerel değerlendirme durumu state'ini başlat
    const transport = transportationRef.current;
    if (transport) {
      // Kullanıcı rolüne göre kontrol yap
      const roleBasedRatingCheck = isCargoOwner 
        ? transport.rated === true || transport.is_rated === true || transport.status === 'rated'
        : isTransporter && transport.transporter_rated === true;
        
      if (roleBasedRatingCheck) {
        setHasBeenRated(true);
      }
    }
    
    // localStorage'den değerlendirme durumunu kontrol et 
    const userRole = isCargoOwner ? 'cargo_owner' : 'transporter';
    const ratingKey = `transportation_${transportationId}_${userRole}_rated`;
    
    const savedRatingStatus = localStorage.getItem(ratingKey);
    if (savedRatingStatus === 'true') {
      console.log(`Found saved rating status in localStorage for ${userRole}`);
      setHasBeenRated(true);
    }
  }, [transportationId, isCargoOwner, isTransporter]);
  
  // İşlem işleyici fonksiyonları
  
  // Yükleme bildirimi (taşıyıcı için)
  const handleRequestPickup = async () => {
    try {
      console.log('Requesting pickup with onStatusChange function:', typeof onStatusChange);
      setLoading(true);
      setError(null);
      
      // onStatusChange kontrol et
      if (!onStatusChange || typeof onStatusChange !== 'function') {
        console.error('onStatusChange is not provided or not a function', onStatusChange);
        throw new Error('Sistem fonksiyonu bulunamadı. Sayfayı yenileyip tekrar deneyin.');
      }
      
      const response = await onStatusChange('request_pickup');
      console.log('Pickup request successful, response:', response);
      
      // Yerel transportation'ı güncelle
      updateTransportation({
        pickup_requested: true,
        pickup_requested_at: new Date().toISOString(),
        ...(response || {})
      });
      
      setSuccess('Yükleme talebi başarıyla gönderildi');
      setSnackbarMessage('Yükleme talebi gönderildi. Yük sahibinin onayı bekleniyor.');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error requesting pickup:', error);
      setError(`Yükleme talebi gönderilemedi: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Yükleme onaylama (yük sahibi için)
  const handleConfirmPickup = async () => {
    try {
      console.log('Confirming pickup...');
      setLoading(true);
      setError(null);
      
      // onStatusChange kontrol et
      if (!onStatusChange || typeof onStatusChange !== 'function') {
        console.error('onStatusChange is not provided or not a function');
        throw new Error('Sistem fonksiyonu bulunamadı. Sayfayı yenileyip tekrar deneyin.');
      }
      
      const response = await onStatusChange('confirm_pickup');
      console.log('Pickup confirmation successful, response:', response);
      
      // Yerel transportation'ı güncelle
      updateTransportation({
        pickup_confirmed: true,
        status: 'in_transit',
        pickup_confirmed_at: new Date().toISOString(),
        ...(response || {})
      });
      
      setSuccess('Yükleme başarıyla onaylandı');
      setSnackbarMessage('Yükleme onaylandı. Taşıma süreci başladı.');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error confirming pickup:', error);
      setError(`Yükleme onaylanamadı: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Teslimat bildirimi (taşıyıcı için)
  const handleRequestDelivery = async () => {
    try {
      console.log('Requesting delivery...');
      setLoading(true);
      setError(null);
      
      // onStatusChange kontrol et
      if (!onStatusChange || typeof onStatusChange !== 'function') {
        console.error('onStatusChange is not provided or not a function');
        throw new Error('Sistem fonksiyonu bulunamadı. Sayfayı yenileyip tekrar deneyin.');
      }
      
      const response = await onStatusChange('request_delivery');
      console.log('Delivery request successful, response:', response);
      
      // Yerel transportation'ı güncelle
      updateTransportation({
        delivery_requested: true,
        delivery_requested_at: new Date().toISOString(),
        ...(response || {})
      });
      
      setSuccess('Teslimat talebi başarıyla gönderildi');
      setSnackbarMessage('Teslimat talebi gönderildi. Yük sahibinin onayı bekleniyor.');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error requesting delivery:', error);
      setError(`Teslimat bildirilemedi: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Teslimat onaylama (yük sahibi için)
  const handleConfirmDelivery = async () => {
    try {
      console.log('Confirming delivery...');
      setLoading(true);
      setError(null);
      
      // onStatusChange kontrol et
      if (!onStatusChange || typeof onStatusChange !== 'function') {
        console.error('onStatusChange is not provided or not a function');
        throw new Error('Sistem fonksiyonu bulunamadı. Sayfayı yenileyip tekrar deneyin.');
      }
      
      const response = await onStatusChange('confirm_delivery');
      console.log('Delivery confirmation successful, response:', response);
      
      // Yerel transportation'ı güncelle
      updateTransportation({
        delivery_confirmed: true,
        status: response?.status || 'completed',
        delivery_confirmed_at: new Date().toISOString(),
        ...(response || {})
      });
      
      setSuccess('Teslimat başarıyla onaylandı');
      setSnackbarMessage('Teslimat onaylandı. Taşıma süreci tamamlandı.');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error confirming delivery:', error);
      setError(`Teslimat onaylanamadı: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // İptal diyaloğunu açma
  const handleOpenCancelDialog = () => {
    setCancelDialogOpen(true);
  };
  
  // İptal onaylama
  const handleConfirmCancel = async () => {
    try {
      console.log('Cancelling transportation...');
      setLoading(true);
      setError(null);
      
      // onStatusChange kontrol et
      if (!onStatusChange || typeof onStatusChange !== 'function') {
        console.error('onStatusChange is not provided or not a function');
        throw new Error('Sistem fonksiyonu bulunamadı. Sayfayı yenileyip tekrar deneyin.');
      }
      
      const response = await onStatusChange('cancel', { reason: cancellationReason });
      console.log('Cancel successful, response:', response);
      
      // Yerel transportation'ı güncelle
      updateTransportation({
        status: 'cancelled',
        cancellation_reason: cancellationReason,
        cancelled_at: new Date().toISOString(),
        ...(response || {})
      });
      
      setSuccess('Taşıma başarıyla iptal edildi');
      setSnackbarMessage('Taşıma iptal edildi.');
      setSnackbarOpen(true);
      setCancelDialogOpen(false);
      setCancellationReason('');
    } catch (error) {
      console.error('Error cancelling transportation:', error);
      setError(`Taşıma iptal edilemedi: ${error.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Taşıma değerlendirme sayfasına git
  const handleNavigateToRating = () => {
    // İlk önce değerlendirme state'ini true yaparak butonun kaybolmasını sağla
    setHasBeenRated(true);
    
    // Değerlendirme durumunu localStorage'e kaydet
    const userRole = isCargoOwner ? 'cargo_owner' : 'transporter';
    localStorage.setItem(`transportation_${transportationId}_${userRole}_rated`, 'true');
    
    // Değerlendirme sayfasına yönlendir
    navigate(`/shipments/${transportationId}/rate`);
  };

  const handleNavigateToCargoOwnerRating = () => {
    console.log('Navigating to rate cargo owner page');
    
    // Değerlendirme durumunu true yaparak butonun tekrar gösterilmemesini sağlayalım
    setHasBeenRated(true);
    
    // Değerlendirme durumunu localStorage'e kaydet
    localStorage.setItem(`transportation_${transportationId}_transporter_rated`, 'true');
    
    // Değerlendirme sayfasına yönlendir
    navigate(`/shipments/${transportationId}/rate-cargo-owner`);
  };
  
  // Konum takip sayfasına git
  const handleNavigateToTracking = () => {
    navigate(`/shipments/${transportationId}/location`);
  };
  
  // Duruma göre işlem butonlarını göster
  const renderActionButtons = () => {
    const localTransportation = transportationRef.current;
    if (!localTransportation) {
      return <Alert severity="info">Taşıma bilgileri yükleniyor...</Alert>;
    }
    
    // Taşıma durumu ve diğer bayrakları al
    const { 
      status, 
      pickup_requested, 
      pickup_confirmed, 
      delivery_requested, 
      delivery_confirmed
    } = localTransportation;
    
    // Yardımcı fonksiyonları çağır
    const hasRating = isRated();
    const isDelivered = isDeliveryConfirmed();
    const isPickupDone = isPickupConfirmed();
    const hasDeliveryRequest = isDeliveryRequested();
    
    // Debug için
    console.log('Rendering buttons with state:', {
      status,
      pickup_requested,
      pickup_confirmed, 
      delivery_requested,
      delivery_confirmed,
      hasRating,
      hasBeenRated,
      isDelivered,
      isPickupDone,
      hasDeliveryRequest,
      rating: localTransportation.rating,
      rated: localTransportation.rated,
      is_rated: localTransportation.is_rated
    });
    
    // İptal durumu kontrolü
    if (status === 'cancelled') {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          Bu taşıma iptal edilmiştir.
          {localTransportation.cancellation_reason && (
            <Box sx={{ mt: 1 }}>
              <strong>İptal nedeni:</strong> {localTransportation.cancellation_reason}
            </Box>
          )}
        </Alert>
      );
    }
    
    // Değerlendirme yapılmışsa
    if (hasRating || hasBeenRated) {
      return (
        <Alert severity="success" sx={{ mt: 2 }}>
          Bu taşıma değerlendirilmiştir. Teşekkür ederiz!
        </Alert>
      );
    }
    
    // Teslimat onaylanmış (tamamlanmış) durumu
    if (status === 'completed' || isDelivered) {
      const buttons = [];
      
      // Yük sahibiyse ve değerlendirme yapmamışsa
      if (isCargoOwner && !hasRating) {
        buttons.push(
          <Button 
            key="rate"
            variant="contained" 
            color="primary"
            startIcon={<Star />}
            onClick={handleNavigateToRating}
            sx={{ mr: 2 }}
          >
            Taşıyıcıyı Değerlendir
          </Button>
        );
      }
      
      // Taşıyıcıysa ve değerlendirme yapmamışsa
      if (isTransporter && !hasRating) {
        buttons.push(
          <Button 
            key="rate-owner"
            variant="contained" 
            color="primary"
            startIcon={<Star />}
            onClick={handleNavigateToCargoOwnerRating}
            sx={{ mr: 2 }}
          >
            Yük Sahibini Değerlendir
          </Button>
        );
      }
      
      // Herhangi bir buton varsa göster, yoksa tamamlandı mesajı
      if (buttons.length > 0) {
        return (
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            {buttons}
          </Box>
        );
      } else {
        return (
          <Alert severity="success" sx={{ mt: 2 }}>
            Bu taşıma başarıyla tamamlanmıştır.
          </Alert>
        );
      }
    }
    
    // Teslimat istenmiş ama onaylanmamışsa
    if (hasDeliveryRequest && !isDelivered) {
      if (isCargoOwner) {
        return (
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              color="success"
              startIcon={<Done />}
              onClick={handleConfirmDelivery}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Teslim Alındı'}
            </Button>
            <Alert severity="info" sx={{ mt: 2 }}>
              Taşıyıcı teslimat bildiriminde bulundu. Lütfen teslim aldıysanız onaylayın.
            </Alert>
          </Box>
        );
      } else if (isTransporter) {
        return (
          <Alert severity="info" sx={{ mt: 2 }}>
            Teslimat bildirimi gönderildi. Yük sahibinin onayı bekleniyor.
          </Alert>
        );
      }
    }
    
    // In_transit durumu - taşıma sürmekte
    if (status === 'in_transit') {
      const buttons = [];
      
      if (isCargoOwner) {
        buttons.push(
          <Button 
            key="track"
            variant="outlined" 
            color="primary"
            startIcon={<LocationOn />}
            onClick={handleNavigateToTracking}
          >
            Konum Takibi
          </Button>
        );
      }
      
      if (isTransporter && !hasDeliveryRequest) {
        buttons.push(
          <Button 
            key="delivery"
            variant="contained" 
            color="primary"
            startIcon={<DirectionsCar />}
            onClick={handleRequestDelivery}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Teslim Edildiğini Bildir'}
          </Button>
        );
        
        buttons.push(
          <Button 
            key="location"
            variant="outlined" 
            color="primary"
            startIcon={<LocationOn />}
            onClick={handleNavigateToTracking}
            sx={{ ml: 2 }}
          >
            Konum Güncelle
          </Button>
        );
      }
      
      if (buttons.length > 0) {
        return (
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            {buttons}
          </Box>
        );
      } else {
        return (
          <Alert severity="info" sx={{ mt: 2 }}>
            Taşıma sürüyor. Teslimat bekliyor.
          </Alert>
        );
      }
    }
    
    // Awaiting pickup durumu - yükleme bekleniyor
    if (status === 'awaiting_pickup') {
      const buttons = [];
      
      // Eğer yükleme zaten onaylandıysa
      if (pickup_confirmed || isPickupDone) {
        return (
          <Alert severity="success" sx={{ mt: 2 }}>
            {isTransporter ? 'Yükleme onaylandı. Taşımaya başlayabilirsiniz.' : 'Yükleme onaylandı. Taşıma süreci başladı.'}
          </Alert>
        );
      }
      
      // Yükleme talebi gönderilmiş ama onaylanmamış
      if (pickup_requested && !pickup_confirmed && isCargoOwner) {
        buttons.push(
          <Button 
            key="confirm"
            variant="contained" 
            color="success"
            startIcon={<CheckCircle />}
            onClick={handleConfirmPickup}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Yüklemeyi Onayla'}
          </Button>
        );
      }
      
      // Yükleme talebi gönderilmemiş ve taşıyıcı ise
      if (!pickup_requested && isTransporter) {
        buttons.push(
          <Button 
            key="pickup"
            variant="contained" 
            color="primary"
            startIcon={<LocalShipping />}
            onClick={handleRequestPickup}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Yüklendiğini Bildir'}
          </Button>
        );
      }
      
      // Yükleme onaylanmamışsa iptal butonu göster
      if (!isPickupDone) {
        buttons.push(
          <Button 
            key="cancel"
            variant="outlined" 
            color="error"
            startIcon={<Cancel />}
            onClick={handleOpenCancelDialog}
            disabled={loading}
            sx={{ ml: buttons.length > 0 ? 2 : 0 }}
          >
            İptal Et
          </Button>
        );
      }
      
      if (buttons.length > 0) {
        return (
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            {buttons}
          </Box>
        );
      } else if (pickup_requested && !pickup_confirmed && isTransporter) {
        return (
          <Alert severity="info" sx={{ mt: 2 }}>
            Yükleme talebiniz gönderildi. Yük sahibinin onayı bekleniyor.
          </Alert>
        );
      }
    }
    
    // Diğer durumlar için
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Taşıma durumu: {status}
      </Alert>
    );
  };
  
  // forceUpdateKey ile key prop kullanarak komponentin yeniden renderlanmasını sağlıyoruz
  return (
    <React.Fragment key={forceUpdateKey}>
      {/* Bildirim mesajları */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* Eylem butonları */}
      {renderActionButtons()}
      
      {/* İptal diyaloğu */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      >
        <DialogTitle>Taşımayı İptal Et</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bu taşımayı iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="cancellation-reason"
            label="İptal Nedeni"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCancelDialogOpen(false)}
            disabled={loading}
            color="primary"
          >
            Vazgeç
          </Button>
          <Button 
            onClick={handleConfirmCancel}
            disabled={loading || !cancellationReason.trim()}
            color="error"
            variant="contained"
          >
            {loading ? <CircularProgress size={24} /> : 'Taşımayı İptal Et'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Bildirim Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <IconButton 
            color="inherit" 
            size="small" 
            onClick={() => setSnackbarOpen(false)}
          >
            <Close fontSize="small" />
          </IconButton>
        }
      />
    </React.Fragment>
  );
};

export default ActionButtons;