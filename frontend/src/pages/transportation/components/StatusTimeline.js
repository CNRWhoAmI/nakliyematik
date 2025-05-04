import React from 'react';
import {
  Box, Typography, Paper, Stepper, Step, StepLabel, StepConnector
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CheckCircle, LocalShipping, DirectionsCar, Done,
  Cancel, HourglassEmpty, Star
} from '@mui/icons-material';
import { formatDate } from '../../../utils/formatters';

// Özel StepConnector ile gösterge çizgisi stilini özelleştirme
const CustomConnector = styled(StepConnector)(({ theme }) => ({
  '& .MuiStepConnector-line': {
    minHeight: 40,
    borderColor: theme.palette.divider
  },
  '&.Mui-active': {
    '& .MuiStepConnector-line': {
      borderColor: theme.palette.primary.main,
      borderLeftWidth: 2
    }
  },
  '&.Mui-completed': {
    '& .MuiStepConnector-line': {
      borderColor: theme.palette.primary.main,
      borderLeftWidth: 2
    }
  }
}));

// İkonu rengine göre sarmalayan özel bileşen
const ColoredStepIcon = styled('div')(({ theme, ownerState }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  backgroundColor: 
    ownerState.completed ? theme.palette.primary.main : 
    ownerState.active ? theme.palette.primary.light :
    theme.palette.grey[200],
  color: 
    ownerState.completed ? theme.palette.primary.contrastText : 
    ownerState.active ? theme.palette.primary.contrastText :
    theme.palette.text.secondary,
  ...(ownerState.cancelled && {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText
  }),
}));

// Durum adımlarını ve karşılık gelen simgeleri tanımlayalım
const statusSteps = [
  {
    status: 'created',
    label: 'Taşıma Oluşturuldu',
    icon: <CheckCircle />,
    description: 'Taşıma kaydı oluşturuldu'
  },
  {
    status: 'awaiting_pickup',
    label: 'Yükleme Bekliyor',
    icon: <HourglassEmpty />,
    description: 'Araç yükleme noktasına doğru hareket ediyor'
  },
  {
    status: 'pickup_requested',
    label: 'Yükleme Talebi',
    icon: <LocalShipping />,
    description: 'Taşıyıcı yükleme talebinde bulundu'
  },
  {
    status: 'in_transit',
    label: 'Taşınıyor',
    icon: <DirectionsCar />,
    description: 'Yük taşıma sürecinde'
  },
  {
    status: 'delivered',
    label: 'Teslim Edildi',
    icon: <Done />,
    description: 'Taşıyıcı teslimat yaptığını bildirdi'
  },
  {
    status: 'completed',
    label: 'Tamamlandı',
    icon: <CheckCircle />,
    description: 'Taşıma başarıyla tamamlandı'
  },
  {
    status: 'rated',
    label: 'Değerlendirildi',
    icon: <Star />,
    description: 'Taşıma hizmeti değerlendirildi'
  },
  {
    status: 'cancelled',
    label: 'İptal Edildi',
    icon: <Cancel />,
    description: 'Taşıma iptal edildi'
  }
];

// StatusTimeline bileşeni
function StatusTimeline({ transportation }) {
  if (!transportation) return null;
  
  // Taşıma durum geçmişini oluştur
  const createTimelineSteps = () => {
    const history = [];
    
    // Her zaman oluşturulduğu tarihle başlar
    history.push({
      status: 'created',
      timestamp: transportation.created_at,
      details: `Taşıma #${transportation.id} oluşturuldu`
    });
    
    // Yükleme onayı
    if (transportation.pickup_requested) {
      history.push({
        status: 'pickup_requested',
        timestamp: transportation.pickup_requested_at,
        details: 'Taşıyıcı yükleme talebinde bulundu'
      });
    }
    
    // Yükleme onayı
    if (transportation.pickup_confirmed) {
      history.push({
        status: 'in_transit',
        timestamp: transportation.pickup_confirmed_at,
        details: 'Yük taşıyıcı tarafından alındı, taşıma başladı'
      });
    }
    
    // Teslimat talebi
    if (transportation.delivery_requested) {
      history.push({
        status: 'delivered',
        timestamp: transportation.delivery_requested_at,
        details: 'Taşıyıcı teslimat yaptığını bildirdi'
      });
    }
    
    // Teslimat onayı
    if (transportation.delivery_confirmed) {
      history.push({
        status: 'completed',
        timestamp: transportation.delivery_confirmed_at,
        details: 'Teslimat tamamlandı ve onaylandı'
      });
    }
    
    // Değerlendirme
    if (transportation.rated) {
      history.push({
        status: 'rated',
        timestamp: transportation.rated_at,
        details: `Taşıma hizmeti ${transportation.rating}/5 olarak değerlendirildi`
      });
    }
    
    // İptal
    if (transportation.status === 'cancelled') {
      const cancelledBy = transportation.cancelled_by === 'cargo_owner' 
        ? 'Yük sahibi' : transportation.cancelled_by === 'transporter' 
        ? 'Taşıyıcı' : 'Admin';
        
      history.push({
        status: 'cancelled',
        timestamp: transportation.cancelled_at,
        details: `Taşıma ${cancelledBy} tarafından iptal edildi: ${transportation.cancellation_reason || 'Neden belirtilmemiş'}`
      });
    }
    
    // Zamanlamaya göre sırala
    return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };
  
  // Taşıma zaman çizelgesini oluştur
  const timeline = createTimelineSteps();
  
  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Taşıma Zaman Çizelgesi
      </Typography>
      
      <Stepper orientation="vertical" connector={<CustomConnector />}>
        {timeline.map((step, index) => {
          // Status'e göre ikon ve renk bul
          const stepConfig = statusSteps.find(s => s.status === step.status) || statusSteps[0];
          const isActive = index === timeline.length - 1;
          const isCompleted = index < timeline.length - 1;
          const isCancelled = step.status === 'cancelled';
          
          return (
            <Step key={index} active={isActive} completed={isCompleted}>
              <StepLabel
                StepIconComponent={() => (
                  <ColoredStepIcon
                    ownerState={{
                      active: isActive,
                      completed: isCompleted,
                      cancelled: isCancelled
                    }}
                  >
                    {stepConfig.icon}
                  </ColoredStepIcon>
                )}
              >
                <Box>
                  <Typography variant="subtitle2">
                    {stepConfig.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {step.details}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(step.timestamp)}
                  </Typography>
                </Box>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
      
      {/* Hiçbir adım yoksa */}
      {timeline.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
          Herhangi bir durum güncellemesi bulunmamaktadır.
        </Typography>
      )}
      
      {/* Taşıma devam ediyor bilgisi */}
      {transportation.status === 'in_transit' && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            Taşıma süreci devam ediyor. Taşıyıcı konumu için konum takibi sayfasını kontrol edin.
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default StatusTimeline;