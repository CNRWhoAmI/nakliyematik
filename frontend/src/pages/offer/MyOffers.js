import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, IconButton, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Tooltip, Card, CardContent, Grid
} from '@mui/material';
import {
  Refresh, Delete, Visibility, CancelOutlined,
  LocalShipping, AccessTime, CheckCircleOutline, 
  CancelOutlined as CancelIcon, HourglassEmpty, ArrowBack,
  Message, Event
} from '@mui/icons-material';
import offerService from '../../services/offer.service';
import { useAuth } from '../../contexts/AuthContext';

function MyOffers() {
  const navigate = useNavigate();
  const { isTransporter } = useAuth(); // currentUser kaldırıldı
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [detailDialog, setDetailDialog] = useState({
    open: false,
    offer: null
  });

  // Teklifleri yükle
  useEffect(() => {
    const fetchMyOffers = async () => {
      if (!isTransporter) {
        setError('Bu sayfayı görüntülemek için taşıyıcı hesabınız olmalıdır.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const data = await offerService.getMyOffers();
        setOffers(data);
      } catch (error) {
        console.error('Error fetching my offers:', error);
        setError('Teklifleriniz yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMyOffers();
  }, [isTransporter, refreshTrigger]);

  // Teklifi geri çek
  const handleWithdraw = async (offerId) => {
    try {
      await offerService.withdrawOffer(offerId);
      // Listeyi yenile
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error withdrawing offer:', error);
      setError('Teklif geri çekilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  // Teklifi geri çekmek için onay dialogu
  const openConfirmDialog = (offerId, offerPrice, cargoTitle) => {
    setConfirmDialog({
      open: true,
      title: 'Teklifi Geri Çek',
      message: `"${cargoTitle}" ilanına verdiğiniz ${offerPrice} ₺ tutarındaki teklifinizi geri çekmek istediğinize emin misiniz?`,
      action: () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        handleWithdraw(offerId);
      }
    });
  };

  // Kabul detaylarını görüntüle
  const openDetailDialog = (offer) => {
    setDetailDialog({
      open: true,
      offer
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
        icon = <CancelIcon />;
        label = 'Reddedildi';
        break;
      case 'withdrawn':
        color = 'default';
        icon = <Delete />;
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

  // Kısa tarih formatla (saat olmadan)
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // İlandan veya tekliften tarih bilgilerini al
  const getDateInfo = (offer) => {
    const pickup = offer.pickup_date || (offer.cargo_post_details?.pickup_date);
    const delivery = offer.delivery_date || (offer.cargo_post_details?.delivery_date);
    
    return {
      pickup: pickup ? formatShortDate(pickup) : 'Belirtilmemiş',
      delivery: delivery ? formatShortDate(delivery) : 'Belirtilmemiş'
    };
  };

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
              Tekliflerim
            </Typography>
            <LocalShipping fontSize="large" />
          </Box>
        </Paper>

        <Card sx={{ p: 3, textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Henüz bir teklif vermemişsiniz.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Nakliye ilanlarını inceleyerek teklif vermeye başlayabilirsiniz.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => navigate('/cargo')}
            >
              İlanları Görüntüle
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
            Tekliflerim
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

      {/* Teklifler Tablosu */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table sx={{ minWidth: 650 }} aria-label="teklifler tablosu">
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell>İlan Başlığı</TableCell>
              <TableCell align="center">Teklif Tutarı</TableCell>
              <TableCell align="center">Durum</TableCell>
              <TableCell align="center">Tarihler</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {offers.map((offer) => {
              const dates = getDateInfo(offer);
              return (
                <TableRow 
                  key={offer.id}
                  hover
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    backgroundColor: offer.status === 'accepted' ? 'rgba(76, 175, 80, 0.1)' : undefined 
                  }}
                >
                  <TableCell component="th" scope="row">
                    <Box sx={{ maxWidth: 250, whiteSpace: 'normal', wordWrap: 'break-word' }}>
                      {offer.cargo_post_details?.title || 'İlan bilgisi alınamadı'}
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ID: {offer.cargo_post}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2" color="primary.main">
                      {Number(offer.price).toLocaleString('tr-TR')} ₺
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {getStatusChip(offer.status)}
                    {/* Kabul notu varsa göster */}
                    {offer.status === 'accepted' && offer.acceptance_note && (
                      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Tooltip title="Kabul Mesajını Görüntüle">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => openDetailDialog(offer)}
                          >
                            <Message fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ ml: 0.5, cursor: 'pointer' }}
                          onClick={() => openDetailDialog(offer)}
                        >
                          Kabul notu
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Event fontSize="small" color="primary" sx={{ mr: 0.5 }} />
                        <Typography variant="body2">
                          Yükleme: {dates.pickup}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Event fontSize="small" color="secondary" sx={{ mr: 0.5 }} />
                        <Typography variant="body2">
                          Teslim: {dates.delivery}
                        </Typography>
                      </Box>
                    </Box>
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
                        <Tooltip title="Teklifi Geri Çek">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => openConfirmDialog(
                              offer.id, 
                              Number(offer.price).toLocaleString('tr-TR'), 
                              offer.cargo_post_details?.title || 'Bilinmeyen İlan'
                            )}
                          >
                            <CancelOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
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
          onClick={() => navigate('/cargo')}
        >
          Yeni Teklif Ver
        </Button>
      </Box>

      {/* Onay Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Vazgeç
          </Button>
          <Button 
            onClick={confirmDialog.action} 
            color="error" 
            variant="contained"
            autoFocus
          >
            Teklifi Geri Çek
          </Button>
        </DialogActions>
      </Dialog>

      {/* Kabul Detayları Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ ...detailDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
          Teklif Kabul Edildi
        </DialogTitle>
        <DialogContent>
          {detailDialog.offer && (
            <>
              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>İlan Başlığı:</strong> {detailDialog.offer.cargo_post_details?.title}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Teklif Tutarı:</strong> {Number(detailDialog.offer.price).toLocaleString('tr-TR')} ₺
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Kabul Tarihi:</strong> {formatDate(detailDialog.offer.acceptance_date || detailDialog.offer.updated_at)}
                </Typography>
              </Box>
              
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', my: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Yük Sahibi Notu:
                </Typography>
                <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                  {detailDialog.offer.acceptance_note || "Yük sahibi herhangi bir not bırakmamıştır."}
                </Typography>
              </Paper>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Bu teklif kabul edilmiştir. İlan size atanmıştır. 
                Taşıma işlemi planlandığı gibi devam edecektir.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDetailDialog({ ...detailDialog, open: false })}
            variant="contained"
          >
            Tamam
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default MyOffers;