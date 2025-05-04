import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, IconButton, Avatar, Tabs, Tab, Card, CardContent, Grid,
  Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Snackbar, AlertTitle
} from '@mui/material';
import {
  Refresh, Visibility, LocalShipping, Person, ArrowBack,
  AccessTime, Check, Clear, FilterList,
  HourglassEmpty, CheckCircleOutline, CancelOutlined,
  InfoOutlined,
} from '@mui/icons-material';
import offerService from '../../services/offer.service';
import { useAuth } from '../../contexts/AuthContext';

function ReceivedOffers() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCargoOwner } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null,
    actionText: '',
    actionColor: 'primary'
  });
  
  // Yanıt notu için state
  const [responseNote, setResponseNote] = useState('');
  
  // Hata bildirimi için state
  const [errorSnackbar, setErrorSnackbar] = useState({
    open: false,
    message: '',
    details: ''
  });

  // location.state kullanımı
  useEffect(() => {
    // Eğer location.state varsa ve fromAccept veya fromReject varsa, başarı mesajını ayarla
    if (location.state?.fromAccept) {
      setSuccessMessage('Teklif başarıyla kabul edildi.');
      // History stack'ten state'i temizle
      window.history.replaceState({}, document.title);
    } else if (location.state?.fromReject) {
      setSuccessMessage('Teklif başarıyla reddedildi.');
      // History stack'ten state'i temizle
      window.history.replaceState({}, document.title);
    }
    
    // Eğer location.state varsa ve selectedCargoId içeriyorsa, filtreleme için tab değerini değiştir
    if (location.state?.selectedCargoId) {
      setTabValue(3); // İlan Teklifleri tabına geç
    }
  }, [location.state]);

  // Teklifleri yükle
  useEffect(() => {
    const fetchReceivedOffers = async () => {
      if (!isCargoOwner) {
        setError('Bu sayfayı görüntülemek için yük sahibi hesabınız olmalıdır.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const data = await offerService.getReceivedOffers();
        setOffers(data);
      } catch (error) {
        console.error('Error fetching received offers:', error);
        setError('Teklifler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReceivedOffers();
  }, [isCargoOwner, refreshTrigger]);

  // Sekme değişikliği
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Teklifi kabul et
  const handleAcceptOffer = async (offerId) => {
    try {
      // Yanıt notuyla birlikte teklifi kabul et
      await offerService.acceptOffer(offerId, { response_note: responseNote });
      
      // Response note'u temizle
      setResponseNote('');
      
      // Sayfayı yenile
      setRefreshTrigger(prev => prev + 1);
      
      // Başarı mesajını ayarla
      setSuccessMessage('Teklif başarıyla kabul edildi. Diğer teklifler otomatik olarak reddedildi.');
      
      // Dialog'u kapat
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (error) {
      console.error('Error accepting offer:', error);
      
      // Hata mesajına göre farklı bilgilendirme göster
      let errorMessage = 'Teklif kabul edilirken bir hata oluştu.';
      let errorDetails = '';
      
      if (error.response) {
        // Sunucu tarafından dönen hata mesajlarını göster
        if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail;
          
          // Özel hata türlerine göre daha spesifik mesajlar
          if (errorMessage.includes('başka bir teklif zaten kabul edilmiş')) {
            errorDetails = 'Başka bir teklifi kabul etmişsiniz veya başka bir kullanıcı tarafından bir teklif kabul edildi.';
          } else if (errorMessage.includes('aktif değil')) {
            errorDetails = 'İlanınızın durumu değişmiş olabilir. Lütfen sayfayı yenileyin.';
          }
        }
      }
      
      // Hata snackbar'ını göster
      setErrorSnackbar({
        open: true,
        message: errorMessage,
        details: errorDetails
      });
      
      // Dialog'u kapat
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Teklifi reddet
  const handleRejectOffer = async (offerId) => {
    try {
      // Yanıt notuyla birlikte teklifi reddet
      await offerService.rejectOffer(offerId, { response_note: responseNote });
      
      // Response note'u temizle
      setResponseNote('');
      
      // Sayfayı yenile
      setRefreshTrigger(prev => prev + 1);
      
      // Başarı mesajını ayarla
      setSuccessMessage('Teklif başarıyla reddedildi.');
      
      // Dialog'u kapat
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (error) {
      console.error('Error rejecting offer:', error);
      
      // Hata snackbar'ını göster
      setErrorSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Teklif reddedilirken bir hata oluştu.',
        details: 'Lütfen daha sonra tekrar deneyin.'
      });
      
      // Dialog'u kapat
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Teklifi kabul et onayı
  const openAcceptDialog = (offerId, transporterName, price) => {
    setResponseNote(''); // Her yeni dialog için yanıt notunu temizle
    
    setConfirmDialog({
      open: true,
      title: 'Teklifi Kabul Et',
      message: `${transporterName} taşıyıcısının ${price} ₺ tutarındaki teklifini kabul etmek istediğinize emin misiniz? Bu işlem diğer teklifleri otomatik olarak reddedecek ve ilanınızın durumunu değiştirecektir.`,
      action: () => handleAcceptOffer(offerId),
      actionText: 'Kabul Et',
      actionColor: 'success',
      showResponseNote: true,
      offerType: 'accept'
    });
  };

  // Teklifi reddet onayı
  const openRejectDialog = (offerId, transporterName, price) => {
    setResponseNote(''); // Her yeni dialog için yanıt notunu temizle
    
    setConfirmDialog({
      open: true,
      title: 'Teklifi Reddet',
      message: `${transporterName} taşıyıcısının ${price} ₺ tutarındaki teklifini reddetmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      action: () => handleRejectOffer(offerId),
      actionText: 'Reddet',
      actionColor: 'error',
      showResponseNote: true,
      offerType: 'reject'
    });
  };

  // Teklif durumuna göre renk ve etiket belirle
  const getStatusChip = (status) => {
    let color, icon, label;
    
    switch (status) {
      case 'pending':
        color = 'warning';
        icon = <HourglassEmpty />;
        label = 'Beklemede';
        break;
      case 'accepted':
        color = 'success';
        icon = <CheckCircleOutline />;
        label = 'Kabul Edildi';
        break;
      case 'rejected':
        color = 'error';
        icon = <CancelOutlined />;
        label = 'Reddedildi';
        break;
      case 'withdrawn':
        color = 'default';
        icon = <AccessTime />;
        label = 'Geri Çekildi';
        break;
      case 'expired':
        color = 'error';
        icon = <AccessTime />;
        label = 'Süresi Doldu';
        break;
      default:
        color = 'default';
        icon = <HourglassEmpty />;
        label = status;
    }
    
    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };

  // Tarih formatla
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrelenen teklifler
  const getFilteredOffers = () => {
    const searchParams = new URLSearchParams(location.search);
    const cargoId = searchParams.get('cargo_id');
    
    // Önce URL'deki cargo_id'ye göre filtrele
    if (cargoId && tabValue === 3) {
      return offers.filter(offer => offer.cargo_post.toString() === cargoId);
    }
    
    // Sonra sekme değerine göre filtrele
    switch (tabValue) {
      case 0: // Tümü
        return offers;
      case 1: // Bekleyen Teklifler
        return offers.filter(offer => offer.status === 'pending');
      case 2: // Kabul Edilenler
        return offers.filter(offer => offer.status === 'accepted');
      default:
        return offers;
    }
  };

  const filteredOffers = getFilteredOffers();

  // Yükleniyor durumu
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Dashboard'a Dön
        </Button>
      </Container>
    );
  }

  // Teklif yok durumu
  if (offers.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" component="h1">
              Gelen Teklifler
            </Typography>
            <LocalShipping fontSize="large" />
          </Box>
        </Paper>

        <Card sx={{ p: 3, textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Henüz bir teklif almamışsınız.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              İlanlarınıza teklif gelmesi için bekleyin veya yeni ilan oluşturun.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => navigate('/cargo/create')}
            >
              Yeni İlan Oluştur
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Başlık */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            Gelen Teklifler
          </Typography>
          <Box>
            <Tooltip title="Yenile">
              <IconButton 
                color="inherit" 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Başarı mesajı */}
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }} 
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      {/* İstatistikler */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h5">{offers.length}</Typography>
              <Typography variant="body2">Toplam Teklif</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Typography variant="h5">
                {offers.filter(offer => offer.status === 'pending').length}
              </Typography>
              <Typography variant="body2">Bekleyen Teklif</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h5">
                {offers.filter(offer => offer.status === 'accepted').length}
              </Typography>
              <Typography variant="body2">Kabul Edilen</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Typography variant="h5">
                {offers.filter(offer => offer.status === 'rejected').length}
              </Typography>
              <Typography variant="body2">Reddedilen</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtreler */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Tüm Teklifler" />
          <Tab 
            label={`Bekleyen (${offers.filter(o => o.status === 'pending').length})`} 
            disabled={offers.filter(o => o.status === 'pending').length === 0}
          />
          <Tab 
            label={`Kabul Edilenler (${offers.filter(o => o.status === 'accepted').length})`}
            disabled={offers.filter(o => o.status === 'accepted').length === 0}
          />
          {location.search.includes('cargo_id') && (
            <Tab 
              label="İlan Teklifleri" 
              icon={<FilterList />} 
              iconPosition="start"
            />
          )}
        </Tabs>
      </Paper>

      {/* İlan filtrelenmiş uyarısı */}
      {tabValue === 3 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Typography>
              Şu anda belirli bir ilanın tekliflerini görüntülüyorsunuz.
            </Typography>
            <Button color="inherit" onClick={() => {
              navigate('/offers/received');
              setTabValue(0);
            }}>
              Tümünü Göster
            </Button>
          </Box>
        </Alert>
      )}

      {/* Teklifler Tablosu */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table sx={{ minWidth: 650 }} aria-label="gelen teklifler tablosu">
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell>Taşıyıcı</TableCell>
              <TableCell>İlan Başlığı</TableCell>
              <TableCell align="center">Teklif Tutarı</TableCell>
              <TableCell align="center">Durum</TableCell>
              <TableCell align="center">Tarih</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOffers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    Bu filtreye uygun teklif bulunamadı.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredOffers.map((offer) => {
                // Aynı ilana ait kabul edilmiş bir teklif var mı kontrol et
                const cargoHasAcceptedOffer = offers.some(
                  o => o.cargo_post === offer.cargo_post && o.status === 'accepted'
                );
                
                // Teklif beklemede ve ilanda kabul edilmiş başka teklif varsa, kabul/ret butonlarını devre dışı bırak
                const disableActions = offer.status === 'pending' && cargoHasAcceptedOffer && offer.status !== 'accepted';
                
                return (
                  <TableRow 
                    key={offer.id}
                    hover
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      // Kabul edilmiş tekliflere hafif yeşil arka plan
                      backgroundColor: offer.status === 'accepted' ? 'success.50' : undefined,
                      // Devre dışı bırakılan tekliflere gri arka plan
                      opacity: disableActions ? 0.7 : 1
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          sx={{ mr: 2, bgcolor: 'primary.main' }}
                          alt={offer.transporter_details?.user?.first_name || ''}
                        >
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {offer.transporter_details?.company_name || 'İsim Belirtilmemiş'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {offer.transporter_details?.user?.email || ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 250, whiteSpace: 'normal', wordWrap: 'break-word' }}>
                        {offer.cargo_post_details?.title || 'İlan bilgisi alınamadı'}
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        ID: {offer.cargo_post}
                        {cargoHasAcceptedOffer && offer.status !== 'accepted' && (
                          <Chip 
                            label="Kabul Edilmiş Teklifli İlan" 
                            size="small" 
                            color="secondary"
                            variant="outlined"
                            sx={{ ml: 1, fontSize: '0.65rem' }}
                          />
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2" color="primary.main">
                        {Number(offer.price).toLocaleString('tr-TR')} ₺
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {getStatusChip(offer.status)}
                    </TableCell>
                    <TableCell align="center">
                      {formatDate(offer.created_at)}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Tooltip title="Detay Görüntüle">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => navigate(`/offers/${offer.id}`)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="İlanı Görüntüle">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => navigate(`/cargo/${offer.cargo_post}`)}
                          >
                            <LocalShipping fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        {offer.status === 'pending' && (
                          <>
                            <Tooltip title={disableActions 
                              ? "Bu ilana ait başka bir teklif zaten kabul edilmiş" 
                              : "Teklifi Kabul Et"
                            }>
                              <span>
                                <IconButton 
                                  size="small" 
                                  color="success"
                                  disabled={disableActions}
                                  onClick={() => openAcceptDialog(
                                    offer.id,
                                    offer.transporter_details?.company_name || 'Bu taşıyıcı',
                                    Number(offer.price).toLocaleString('tr-TR')
                                  )}
                                >
                                  <Check fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            
                            <Tooltip title={disableActions 
                              ? "Bu ilana ait başka bir teklif zaten kabul edilmiş" 
                              : "Teklifi Reddet"
                            }>
                              <span>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  disabled={disableActions}
                                  onClick={() => openRejectDialog(
                                    offer.id,
                                    offer.transporter_details?.company_name || 'Bu taşıyıcı',
                                    Number(offer.price).toLocaleString('tr-TR')
                                  )}
                                >
                                  <Clear fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined"
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/dashboard')}
        >
          Dashboard'a Dön
        </Button>
        
        <Button 
          variant="contained"
          color="primary"
          onClick={() => navigate('/cargo/my-posts')}
        >
          İlanlarımı Görüntüle
        </Button>
      </Box>

      {/* Onay Dialog - Genişletilmiş */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: confirmDialog.actionColor === 'success' ? 'success.50' : confirmDialog.actionColor === 'error' ? 'error.50' : 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          {confirmDialog.actionColor === 'success' && <CheckCircleOutline color="success" />}
          {confirmDialog.actionColor === 'error' && <CancelOutlined color="error" />}
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {confirmDialog.message}
          </DialogContentText>
          
          {/* Ek bilgilendirme bölümü */}
          {confirmDialog.actionColor === 'success' && (
            <Alert severity="info" icon={<InfoOutlined />} sx={{ mt: 2 }}>
              Teklifi kabul ettiğinizde:
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>İlanınızın durumu "Taşıyıcıya Atandı" olarak değişecek</li>
                <li>Bu ilana ait diğer teklifler otomatik olarak reddedilecek</li>
                <li>Taşıyıcı ile iletişime geçebileceksiniz</li>
              </ul>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Vazgeç
          </Button>
          <Button 
            onClick={confirmDialog.action}
            color={confirmDialog.actionColor} 
            variant="contained"
            autoFocus
          >
            {confirmDialog.actionText || confirmDialog.title}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Hata Snackbar */}
      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={6000}
        onClose={() => setErrorSnackbar({...errorSnackbar, open: false})}
      >
        <Alert 
          onClose={() => setErrorSnackbar({...errorSnackbar, open: false})} 
          severity="error" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          <AlertTitle>İşlem Başarısız</AlertTitle>
          {errorSnackbar.message}
          {errorSnackbar.details && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {errorSnackbar.details}
            </Typography>
          )}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default ReceivedOffers;