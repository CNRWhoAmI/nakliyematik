import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, CircularProgress, Alert,
  Button, Chip, Grid, Divider, Avatar,
  useMediaQuery, useTheme
} from '@mui/material';
import {
  CheckCircle, Cancel, LocalShipping, AttachMoney, Person, ArrowBack, AccessTime,
  Business, Room, VerifiedUser, Warning ,Chat
} from '@mui/icons-material';
import offerService from '../../services/offer.service';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatPrice as formatCurrency } from '../../utils/formatters';
import { toast } from 'react-toastify';

// Yük tipi için Türkçe karşılıkları
const cargoTypeTranslations = {
  'general': 'Genel Yük',
  'furniture': 'Mobilya',
  'cars': 'Araç Taşıma',
  'construction': 'İnşaat Malzemeleri',
  'food': 'Gıda',
  'livestock': 'Canlı Hayvan',
  'hazardous': 'Tehlikeli Madde',
  'electronics': 'Elektronik',
  'refrigerated': 'Soğuk Zincir',
  'machinery': 'Makine/Ekipman',
  'liquid': 'Sıvı',
  'bulk': 'Dökme Yük',
  'container': 'Konteyner',
  'other': 'Diğer'
};

function OfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCargoOwner} = useAuth();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Teklif detaylarını yükle
  useEffect(() => {
    const fetchOfferDetails = async () => {
      try {
        setLoading(true);
        const data = await offerService.getOfferDetails(id);
        console.log('Received offer details:', data); // Debug için
        setOffer(data);
      } catch (error) {
        console.error('Error fetching offer details:', error);
        setError('Teklif detayları yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchOfferDetails();
  }, [id]);

  // Yük ilanı ID'sini güvenli bir şekilde al
  const getCargoPostId = () => {
    if (!offer || !offer.cargo_post) return null;
    
    return typeof offer.cargo_post === 'object' 
      ? offer.cargo_post.id 
      : offer.cargo_post;
  };

  // İlan sayfasına gitmek için
  const navigateToCargoPost = () => {
    const cargoPostId = getCargoPostId();
    if (cargoPostId) {
      navigate(`/cargo/${cargoPostId}`);
    } else {
      console.error('Cargo post ID not found');
    }
  };

  // Teklif durumuna göre chip oluştur
  const getStatusChip = (status) => {
    let color, icon, label;

    switch (status) {
      case 'pending':
        color = 'warning';
        icon = <AccessTime />;
        label = 'Beklemede';
        break;
      case 'accepted':
        color = 'success';
        icon = <CheckCircle />;
        label = 'Kabul Edildi';
        break;
      case 'rejected':
        color = 'error';
        icon = <Cancel />;
        label = 'Reddedildi';
        break;
      case 'withdrawn':
        color = 'default';
        label = 'Geri Çekildi';
        break;
      case 'cancelled':
        color = 'default';
        label = 'İptal Edildi';
        break;
      case 'expired':
        color = 'error';
        label = 'Süresi Doldu';
        break;
      default:
        color = 'default';
        label = status;
    }

    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        sx={{ fontWeight: 'medium' }}
      />
    );
  };

  // Yük tipini Türkçeleştir
  const getLocalizedCargoType = (cargoType) => {
    if (!cargoType) return 'Belirtilmemiş';
    
    // Doğrudan eşleştirme kontrolü
    if (cargoTypeTranslations[cargoType.toLowerCase()]) {
      return cargoTypeTranslations[cargoType.toLowerCase()];
    }
    
    // Karmaşık isim içeren eşleştirmeler (örn. 'General Cargo' -> 'general')
    const lowerCaseType = cargoType.toLowerCase();
    for (const [key, value] of Object.entries(cargoTypeTranslations)) {
      if (lowerCaseType.includes(key)) {
        return value;
      }
    }
    
    // Hiçbiri eşleşmezse, gelen değeri olduğu gibi döndür
    return cargoType;
  };

  const getFormattedDate = (offerDate, postDate) => {
    console.log("Date values:", { offerDate, postDate }); // Debug için
    console.log("Types:", { 
      offerDateType: typeof offerDate, 
      postDateType: typeof postDate,
      offerDateValue: offerDate ? String(offerDate) : null,
      postDateValue: postDate ? String(postDate) : null
    });
    
    if (offerDate) return formatDate(offerDate);
    if (postDate) return formatDate(postDate);
    return 'Belirtilmemiş';
  };

  // Yükleniyor durumu
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const handleAcceptOffer = async () => {
    try {
      setAcceptLoading(true);
      
      // Backend'e teklif kabul isteği gönder
      const response = await offerService.acceptOffer(id);
      
      console.log('Offer accepted, transportation created:', response);
      
      // İlan taşıyıcıya atandı ve taşıma kaydı oluşturuldu
      toast.success('Teklif başarıyla kabul edildi! Taşıma kaydı oluşturuldu.');
      
      // Yeni oluşturulan taşıma detayına yönlendir
      if (response.transportation && response.transportation.id) {
        navigate(`/shipments/${response.transportation.id}`);
      } else {
        // Transportation ID bulunamadıysa tekrar fetch ederek mevcut sayfayı güncelle
        const updatedOffer = await offerService.getOfferDetails(id);
        setOffer(updatedOffer);
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Teklif kabul edilirken bir hata oluştu');
      setError('Teklif kabul edilirken bir hata oluştu');
    } finally {
      setAcceptLoading(false);
    }
  };

  // Hata durumu
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate(isCargoOwner ? '/offers/received' : '/offers/my')}
        >
          {isCargoOwner ? 'Gelen Tekliflere Dön' : 'Tekliflerime Dön'}
        </Button>
      </Container>
    );
  }

  // Teklif yok durumu
  if (!offer) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Teklif bilgisi bulunamadı.
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => navigate(isCargoOwner ? '/offers/received' : '/offers/my')}
        >
          {isCargoOwner ? 'Gelen Tekliflere Dön' : 'Tekliflerime Dön'}
        </Button>
      </Container>
    );
  }

  const {
    status,
    price,
    pickup_date,
    response_note,
    created_at,
    valid_until,
    days_remaining,
    transporter_details,
    cargo_owner_details,
    cargo_post_details
  } = offer;

  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';
  const isRejected = status === 'rejected';
  // Debug amaçlı log
  console.log('Cargo type:', cargo_post_details?.cargo_type);
  console.log('Vehicle type:', transporter_details?.vehicle_type);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Başlık */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', mb: isMobile ? 2 : 0 }}>
            <Typography variant={isMobile ? "h6" : "h5"} component="h1" sx={{ mr: 2 }}>
              Teklif #{offer.id}
            </Typography>
            {getStatusChip(offer.status)}
          </Box>
          <Box>
            <Button 
              variant="outlined" 
              color="inherit" 
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              size={isMobile ? "small" : "medium"}
            >
              Geri Dön
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Teklif ve İlan Bilgileri */}
      <Grid container spacing={3}>
        {/* Teklif Bilgileri */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <AttachMoney sx={{ mr: 1 }} />
              Teklif Bilgileri
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Teklif Tutarı:</Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(price)}
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Yükleme Tarihi:</Typography>
                  <Typography variant="body1">
                    {getFormattedDate(pickup_date, cargo_post_details?.pickup_date)}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Teslim Tarihi:</Typography>
                  <Typography variant="body1">
                    {cargo_post_details?.delivery_date ? formatDate(cargo_post_details.delivery_date) : 'Belirtilmemiş'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Teklif Tarihi:</Typography>
              <Typography variant="body1">{formatDate(created_at, true)}</Typography>
            </Box>

            {isPending && valid_until && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Geçerlilik:</Typography>
                <Typography 
                  variant="body1" 
                  color={days_remaining > 2 ? 'inherit' : 'error.main'}
                >
                  {formatDate(valid_until)} ({days_remaining} gün kaldı)
                </Typography>
              </Box>
            )}

              {/* Teklif Mesajı */}
              {offer?.message && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="primary" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Chat sx={{ mr: 1, fontSize: 20 }} />
                    Taşıyıcı Mesajı
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      mt: 1, 
                      bgcolor: 'primary.50', 
                      borderColor: 'primary.200',
                      borderRadius: 2,
                      maxHeight: '150px', 
                      overflow: 'auto',
                      position: 'relative'
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line', fontStyle: 'italic', pl: 2, pr: 2 }}>
                      "{offer.message}"
                    </Typography>
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '4px', 
                        height: '100%', 
                        bgcolor: 'primary.main',
                        borderTopLeftRadius: 2,
                        borderBottomLeftRadius: 2
                      }} 
                    />
                  </Paper>
                </Box>
              )}
            
            {/* Kabul veya Red yanıtı - acceptance_note değişkenini kontrol et */}
            {(response_note || offer.acceptance_note) && (
              <Box sx={{ mt: 3 }}>
                <Typography 
                  variant="subtitle2" 
                  color={isAccepted ? 'success.main' : 'error.main'}
                  fontWeight="bold"
                >
                  {isAccepted ? 'Kabul Notu:' : 'Red Yanıtı:'}
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    mt: 1, 
                    bgcolor: isAccepted ? 'success.50' : 'error.50',
                    borderColor: isAccepted ? 'success.main' : 'error.main',
                    maxHeight: '120px', 
                    overflow: 'auto'
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {response_note || offer.acceptance_note || 'Yanıt notu bulunmuyor.'}
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Kabul edilmiş teklif için daha iyi görünümlü bilgi mesajı */}
            {isAccepted && (
              <Paper 
                elevation={0} 
                sx={{ 
                  mt: 3, 
                  p: 2, 
                  bgcolor: 'success.light', 
                  color: 'success.contrastText',
                  border: '1px solid',
                  borderColor: 'success.main',
                  borderRadius: 1
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircle sx={{ mr: 1.5, fontSize: 24 }} />
                  <Typography variant="subtitle1" fontWeight="medium">
                    Bu teklif kabul edilmiştir. İlan bu taşıyıcıya atanmıştır. Taşıma işlemi planlandığı gibi devam edecektir.
                  </Typography>
                </Box>
              </Paper>
            )}
          </Paper>
        </Grid>

        {/* İlan Bilgileri */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', mr: 1, mb: isMobile ? 1 : 0 }}>
                <LocalShipping sx={{ mr: 1 }} />
                İlan Bilgileri
              </Typography>
              <Button 
                size="small" 
                variant="outlined"
                onClick={navigateToCargoPost}
                disabled={!getCargoPostId()}
              >
                İlanı Görüntüle
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">İlan Başlığı:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium', wordBreak: 'break-word' }}>
                {cargo_post_details?.title || 'İlan bilgisi alınamadı'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Yük Tipi:</Typography>
              <Typography variant="body1">
                {cargo_post_details?.cargo_type && getLocalizedCargoType(cargo_post_details.cargo_type)}
                {cargo_post_details?.weight ? ` (${cargo_post_details.weight} kg)` : ''}
                {cargo_post_details?.volume ? ` (${cargo_post_details.volume} m³)` : ''}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Güzergah:</Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  flexWrap: 'wrap',
                  wordBreak: 'break-word'
                }}
              >
                <Box component="span" sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                  <Room fontSize="small" sx={{ mr: 0.5, color: 'error.main', flexShrink: 0 }} />
                  {cargo_post_details?.pickup_location || 'Belirtilmemiş'}
                </Box>
                <Box component="span" sx={{ mx: 0.5 }}> - </Box>
                <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Room fontSize="small" sx={{ mr: 0.5, color: 'success.main', flexShrink: 0 }} />
                  {cargo_post_details?.delivery_location || 'Belirtilmemiş'}
                </Box>
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Yükleme Tarihi:</Typography>
                  <Typography variant="body1">
                  {cargo_post_details?.pickup_date ? formatDate(cargo_post_details.pickup_date) : 'Belirtilmemiş'}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Teslim Tarihi:</Typography>
                  <Typography variant="body1">
                  {cargo_post_details?.delivery_date ? formatDate(cargo_post_details.delivery_date) : 'Belirtilmemiş'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {cargo_post_details?.price && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">İlan Fiyatı:</Typography>
                <Typography variant="body1" color="primary">
                  {formatCurrency(cargo_post_details.price)}
                </Typography>
              </Box>
            )}

            {cargo_post_details?.status && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">İlan Durumu:</Typography>
                <Chip
                  label={cargo_post_details.status === 'active' ? 'Aktif' : 
                         cargo_post_details.status === 'assigned' ? 'Taşıyıcı Atandı' : 
                         cargo_post_details.status === 'completed' ? 'Tamamlandı' : 'Kapalı'}
                  color={cargo_post_details.status === 'active' ? 'success' : 
                         cargo_post_details.status === 'assigned' ? 'info' : 'default'}
                  size="small"
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Taşıyıcı Bilgileri */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalShipping sx={{ mr: 1 }} />
                Taşıyıcı Bilgileri
              </Typography>
              {transporter_details?.verified !== undefined && (
                <Chip 
                  icon={transporter_details.verified ? <VerifiedUser /> : <Warning />} 
                  label={transporter_details.verified ? "Doğrulanmış" : "Doğrulanmamış"} 
                  color={transporter_details.verified ? "success" : "warning"} 
                  size="small" 
                />
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 40, height: 40 }}>
                <Business />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ wordBreak: 'break-word', fontSize: isMobile ? '1rem' : '1.25rem' }}>
                  {transporter_details?.company_name || 'Firma bilgisi alınamadı'}
                </Typography>
              </Box>
            </Box>

            {/* Profil Görüntüleme Butonu - Öne Çıkarılmış */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Person />}
                fullWidth
                size="large"
                onClick={() => navigate(`/users/${transporter_details?.user_id}`)}
              >
                Taşıyıcı Profilini Görüntüle
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Yük Sahibi Bilgileri - sadece taşıyıcılar veya kabul edilen teklifler için göster */}
        {(isAccepted) && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <Business sx={{ mr: 1 }} />
                    Yük Sahibi Bilgileri
                  </Typography>
                  {cargo_owner_details?.verified !== undefined && (
                    <Chip 
                      icon={cargo_owner_details.verified ? <VerifiedUser /> : <Warning />} 
                      label={cargo_owner_details.verified ? "Doğrulanmış" : "Doğrulanmamış"} 
                      color={cargo_owner_details.verified ? "success" : "warning"} 
                      size="small" 
                    />
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 40, height: 40 }}>
                    <Business />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ wordBreak: 'break-word', fontSize: isMobile ? '1rem' : '1.25rem' }}>
                      {cargo_owner_details?.company_name || 'Firma bilgisi alınamadı'}
                    </Typography>
                  </Box>
                </Box>

                {/* Profil Görüntüleme Butonu - Öne Çıkarılmış */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Person />}
                    fullWidth
                    size="large"
                    onClick={() => navigate(`/users/${cargo_owner_details?.user_id}`)}
                  >
                    Yük Sahibi Profilini Görüntüle
                  </Button>
                </Box>
              </Paper>
            </Grid>
          )}
      </Grid>

              {/* Teklif Kabul ve Reddetme Butonları - Sadece Yük Sahibi ve Bekleyen Teklifler İçin */}
        {isCargoOwner && isPending && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom color="primary">
                Teklif İşlemleri
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => navigate(`/offers/${id}/reject`)}
                >
                  Teklifi Reddet
                </Button>
                
                <Button
                  variant="contained"
                  color="success"
                  startIcon={acceptLoading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
                  onClick={handleAcceptOffer}
                  disabled={acceptLoading}
                >
                  Teklifi Kabul Et
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
      
      {/* Durum Notları */}
      {isAccepted && (
        <Alert severity="success" sx={{ mt: 3 }}>
          Bu teklif kabul edilmiştir. Taşıma işlemi planlandığı gibi devam edecektir.
        </Alert>
      )}
      
      {isRejected && (
        <Alert severity="error" sx={{ mt: 3 }}>
          Bu teklif reddedilmiştir. {response_note ? "Yanıt için yukarıdaki notu kontrol edebilirsiniz." : ""}
        </Alert>
      )}
      
      {status === 'withdrawn' && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          Bu teklif taşıyıcı tarafından geri çekilmiştir.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, flexWrap: 'wrap', gap: 2 }}>
        <Button 
          variant="outlined"
          startIcon={<ArrowBack />} 
          onClick={() => navigate(-1)}
        >
          Geri Dön
        </Button>
        
        <Button 
          variant="contained"
          color="primary"
          onClick={navigateToCargoPost}
          disabled={!getCargoPostId()}
        >
          İlanı Görüntüle
        </Button>
      </Box>
    </Container>
  );
}

export default OfferDetail;