import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardActionArea, Box, Typography, Chip, Grid,
  Avatar, LinearProgress, Skeleton
} from '@mui/material';
import {
  LocalShipping, Room, CalendarToday, 
  CheckCircle, Warning, HourglassEmpty, DirectionsCar, Done
} from '@mui/icons-material';
import { formatDate } from '../../../utils/formatters';
import transportationService from '../../../services/transportation.service';

// Durum bilgisine göre uygun gösterimi döndüren fonksiyon
const getStatusInfo = (status) => {
  switch (status) {
    case 'awaiting_pickup':
      return {
        label: 'Yükleme Bekliyor',
        color: 'warning',
        icon: <HourglassEmpty fontSize="small" />,
        progress: 25
      };
    case 'in_transit':
      return {
        label: 'Taşınıyor',
        color: 'info',
        icon: <DirectionsCar fontSize="small" />,
        progress: 50
      };
    case 'delivered':
      return {
        label: 'Teslim Edildi',
        color: 'success',
        icon: <Done fontSize="small" />,
        progress: 75
      };
    case 'completed':
      return {
        label: 'Tamamlandı',
        color: 'success',
        icon: <CheckCircle fontSize="small" />,
        progress: 100
      };
    case 'rated':
      return {
        label: 'Değerlendirildi',
        color: 'success',
        icon: <CheckCircle fontSize="small" />,
        progress: 100
      };
    case 'cancelled':
      return {
        label: 'İptal Edildi',
        color: 'error',
        icon: <Warning fontSize="small" />,
        progress: 0
      };
    default:
      return {
        label: 'Bilinmiyor',
        color: 'default',
        icon: <Warning fontSize="small" />,
        progress: 0
      };
  }
};

function TransportationCard({ transportation, onClick }) {
  const statusInfo = getStatusInfo(transportation.status);
  const [detailedData, setDetailedData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Taşıma detaylarını yükle
  useEffect(() => {
    // Eğer konum bilgileri eksikse ve ID mevcutsa detayları getir
    const missingLocationInfo = !transportation.pickup_city && !transportation.pickup_district;
    
    if (transportation.id && missingLocationInfo) {
      setLoading(true);
      
      transportationService.getTransportationDetails(transportation.id)
        .then(data => {
          setDetailedData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Taşıma detayları getirilirken hata:', error);
          setLoading(false);
        });
    }
  }, [transportation.id, transportation.pickup_city, transportation.pickup_district]);
  
  // Verileri zenginleştir - hem prop olarak gelenler hem de API'den çekilenler
  const enrichedData = {
    ...transportation,
    ...detailedData
  };
  
  // Öncelikle TransportationList'ten gelen zenginleştirilmiş verileri kullan
  const cargoTitle = enrichedData.enhanced_title || 
                    enrichedData.cargo_post_title || 
                    enrichedData.cargo_post?.title || 
                    `Taşıma #${enrichedData.id}`;
  
  // Yükleme ve teslimat şehirlerini diğer alanlardan ayıkla
  // Öncelik sırasını şehir > ilçe > tam adres şeklinde belirledik
  const pickupCity = enrichedData.pickup_city ||
                    enrichedData.cargo_post?.pickup_city ||
                    enrichedData.pickup_district ||
                    enrichedData.cargo_post?.pickup_district ||
                    enrichedData.pickup_address ||
                    enrichedData.cargo_post?.pickup_location ||
                    "Bilgi Bekleniyor";
                    
  const deliveryCity = enrichedData.delivery_city ||
                      enrichedData.cargo_post?.delivery_city ||
                      enrichedData.delivery_district ||
                      enrichedData.cargo_post?.delivery_district ||
                      enrichedData.delivery_address ||
                      enrichedData.cargo_post?.delivery_location ||
                      "Bilgi Bekleniyor";
  
  // "Bilgi Bekleniyor" için stil ve kontrol
  const waitingInfoStyle = { color: 'text.secondary', fontStyle: 'italic' };
  const isWaitingPickup = pickupCity === "Bilgi Bekleniyor";
  const isWaitingDelivery = deliveryCity === "Bilgi Bekleniyor";
  
  return (
    <Card 
      elevation={2} 
      sx={{ 
        mb: 2, 
        borderLeft: 6, 
        borderColor: `${statusInfo.color}.main`,
        position: 'relative',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        }
      }}
    >
      <CardActionArea onClick={onClick}>
        <CardContent>
          {/* Kart içeriği... */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main', 
                  width: 40, 
                  height: 40, 
                  mr: 2 
                }}
              >
                <LocalShipping />
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {cargoTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Taşıma #{enrichedData.id} • {formatDate(enrichedData.created_at)}
                </Typography>
              </Box>
            </Box>
            
            <Chip
              icon={statusInfo.icon}
              label={enrichedData.status_display || statusInfo.label}
              color={statusInfo.color}
              size="small"
            />
          </Box>

          <Box sx={{ mt: 2, mb: 3 }}>
            <LinearProgress 
              variant="determinate" 
              value={statusInfo.progress} 
              color={statusInfo.color}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                <Room sx={{ 
                  color: isWaitingPickup ? 'text.disabled' : 'error.main', 
                  mr: 1, 
                  fontSize: 20, 
                  mt: 0.5 
                }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Yükleme Noktası
                  </Typography>
                  {loading ? (
                    <Skeleton width={120} height={24} />
                  ) : (
                    <Typography 
                      variant="body1" 
                      noWrap 
                      sx={{ 
                        maxWidth: 200,
                        ...(isWaitingPickup ? waitingInfoStyle : {})
                      }}
                    >
                      {pickupCity}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Room sx={{ 
                  color: isWaitingDelivery ? 'text.disabled' : 'success.main', 
                  mr: 1, 
                  fontSize: 20, 
                  mt: 0.5 
                }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Teslimat Noktası
                  </Typography>
                  {loading ? (
                    <Skeleton width={120} height={24} />
                  ) : (
                    <Typography 
                      variant="body1" 
                      noWrap 
                      sx={{ 
                        maxWidth: 200, 
                        ...(isWaitingDelivery ? waitingInfoStyle : {})
                      }}
                    >
                      {deliveryCity}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="body2" sx={{ mr: 1, fontWeight: 'bold', color: 'text.secondary' }}>
                  Yük Sahibi:
                </Typography>
                <Typography variant="body2">
                  {enrichedData.cargo_owner_name || 'Belirtilmemiş'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Typography variant="body2" sx={{ mr: 1, fontWeight: 'bold', color: 'text.secondary' }}>
                  Taşıyıcı:
                </Typography>
                <Typography variant="body2">
                  {enrichedData.transporter_name || 'Belirtilmemiş'}
                </Typography>
              </Box>
              
              {enrichedData.estimated_arrival && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5 }}>
                  <CalendarToday sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    Tahmini Varış: {formatDate(enrichedData.estimated_arrival)}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default TransportationCard;