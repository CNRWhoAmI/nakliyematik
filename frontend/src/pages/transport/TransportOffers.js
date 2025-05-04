import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Chip, IconButton, Tooltip, Tabs, Tab, Grid, Card, CardContent
} from '@mui/material';
import {
  Refresh, Visibility, LocalShipping, ArrowBack,
  Timeline, CheckCircleOutline, PendingOutlined, ErrorOutline,
  ThumbUp, ThumbDown, HourglassEmpty
} from '@mui/icons-material';
import transportService from '../../services/transportation.service';
import { useAuth } from '../../contexts/AuthContext';

function TransportOffers() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTransporter, isCargoOwner } = useAuth();
  const [transportations, setTransportations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Tab değişimi
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // URL parametresi veya durum varsa tab değerini ayarla
  useEffect(() => {
    if (location.state?.tabValue !== undefined) {
      setTabValue(location.state.tabValue);
    }
    
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
    }
  }, [location.state]);

  // Taşıma işlerini yükle
  useEffect(() => {
    const fetchTransportations = async () => {
      try {
        setLoading(true);
        setError('');
        
        let data;
        
        // Sekme değerine göre farklı endpoint'leri çağır
        switch (tabValue) {
          case 0: // Tüm taşımalar
            data = await transportService.getMyTransportations();
            break;
          case 1: // Aktif taşımalar
            data = await transportService.getActiveTransportations();
            break;
          case 2: // Tamamlanan taşımalar
            data = await transportService.getCompletedTransportations();
            break;
          case 3: // Bekleyen taşımalar (onay bekleyen)
            data = await transportService.getPendingTransportations();
            break;
          default:
            data = await transportService.getMyTransportations();
        }
        
        setTransportations(data);
      } catch (error) {
        console.error('Error fetching transportations:', error);
        setError('Taşıma işlemleri yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransportations();
  }, [tabValue, refreshTrigger, isTransporter, isCargoOwner]);

  // Taşıma durumuna göre chip rengi ve icon
  const getStatusChip = (status) => {
    let color, icon, label;
    
    switch (status) {
      case 'active':
        color = 'primary';
        icon = <LocalShipping />;
        label = 'Taşıma Sürecinde';
        break;
      case 'completed':
        color = 'success';
        icon = <CheckCircleOutline />;
        label = 'Tamamlandı';
        break;
      case 'cancelled':
        color = 'error';
        icon = <ErrorOutline />;
        label = 'İptal Edildi';
        break;
      case 'pending_approval':
        color = 'warning';
        icon = <HourglassEmpty />;
        label = 'Onay Bekliyor';
        break;
      case 'pending_pickup':
        color = 'info';
        icon = <PendingOutlined />;
        label = 'Yükleme Bekliyor';
        break;
      case 'pending_delivery':
        color = 'secondary';
        icon = <Timeline />;
        label = 'Teslimat Bekliyor';
        break;
      default:
        color = 'default';
        icon = <PendingOutlined />;
        label = status || 'Bilinmiyor';
    }
    
    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        sx={{ minWidth: 150 }}
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
      year: 'numeric'
    });
  };

  // Tamamlandı olarak işaretle
  const handleMarkAsCompleted = async (id) => {
    try {
      await transportService.updateTransportationStatus(id, 'completed');
      setSuccessMessage('Taşıma işlemi tamamlandı olarak işaretlendi.');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error marking transportation as completed:', error);
      setError('Taşıma işlemi güncellenirken bir hata oluştu.');
    }
  };
  
  // Onay bekliyor olarak işaretle (taşıyıcı için)
  const handleMarkAsDelivered = async (id) => {
    try {
      await transportService.updateTransportationStatus(id, 'pending_approval');
      setSuccessMessage('Taşıma işlemi teslim edildi olarak işaretlendi ve yük sahibinin onayı bekleniyor.');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error marking transportation as delivered:', error);
      setError('Taşıma işlemi güncellenirken bir hata oluştu.');
    }
  };
  
  // Onayla (yük sahibi için)
  const handleApproveDelivery = async (id) => {
    try {
      await transportService.approveTransportation(id);
      setSuccessMessage('Taşıma işlemi başarıyla onaylandı.');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error approving transportation:', error);
      setError('Taşıma işlemi onaylanırken bir hata oluştu.');
    }
  };
  
  // Reddet (yük sahibi için)
  const handleRejectDelivery = async (id) => {
    try {
      await transportService.rejectTransportation(id);
      setSuccessMessage('Taşıma işlemi reddedildi.');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error rejecting transportation:', error);
      setError('Taşıma işlemi reddedilirken bir hata oluştu.');
    }
  };
  
  // İşlem butonlarını göster (duruma ve kullanıcı rolüne göre)
  const renderActionButtons = (transport) => {
    // Genel detay butonu her zaman gösterilir
    const viewButton = (
      <Tooltip title="Detay Görüntüle">
        <IconButton
          size="small"
          onClick={() => navigate(`/transport/${transport.id}`)}
        >
          <Visibility fontSize="small" />
        </IconButton>
      </Tooltip>
    );
    
    // Taşıyıcı için butonlar
    if (isTransporter) {
      if (transport.status === 'active') {
        return (
          <>
            {viewButton}
            <Tooltip title="Teslim Edildi İşaretle">
              <IconButton
                size="small"
                color="success"
                onClick={() => handleMarkAsDelivered(transport.id)}
              >
                <ThumbUp fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        );
      }
    }
    
    // Yük sahibi için butonlar
    if (isCargoOwner) {
      if (transport.status === 'pending_approval') {
        return (
          <>
            {viewButton}
            <Tooltip title="Teslimi Onayla">
              <IconButton
                size="small"
                color="success"
                onClick={() => handleApproveDelivery(transport.id)}
              >
                <ThumbUp fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Teslimi Reddet">
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRejectDelivery(transport.id)}
              >
                <ThumbDown fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        );
      }
    }
    
    return viewButton;
  };

  // Yükleniyor
  if (loading && transportations.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Başlık */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            Taşıma İşlemleri
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
      
      {/* Başarı Mesajı */}
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}
      
      {/* Hata Mesajı */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      
      {/* İstatistikler */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h5">{transportations.length}</Typography>
              <Typography variant="body2">Toplam İşlem</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h5">
                {transportations.filter(t => t.status === 'completed').length}
              </Typography>
              <Typography variant="body2">Tamamlanan</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h5">
                {transportations.filter(t => t.status === 'active').length}
              </Typography>
              <Typography variant="body2">Aktif</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="h5">
                {transportations.filter(t => t.status === 'pending_approval').length}
              </Typography>
              <Typography variant="body2">Onay Bekleyen</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Sekme kontrolleri */}
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Tümü" />
        <Tab label="Aktif" />
        <Tab label="Tamamlanan" />
        <Tab label="Onay Bekleyen" />
      </Tabs>
      
      {/* Taşıma İşleri Listesi */}
      {transportations.length === 0 ? (
        <Box sx={{ textAlign: 'center', my: 5, p: 3, bgcolor: 'grey.100', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary">
            Bu kategoride taşıma işlemi bulunmuyor.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            sx={{ mt: 2 }}
            onClick={() => navigate('/dashboard')}
          >
            Ana Sayfaya Dön
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 3 }}>
          <Table sx={{ minWidth: 650 }} aria-label="transportations table">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell width="30%">Güzergah / Yük Bilgisi</TableCell>
                <TableCell align="center">Taşıma Tarihleri</TableCell>
                <TableCell align="center">Durum</TableCell>
                <TableCell align="center">Taraflar</TableCell>
                <TableCell align="right">İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transportations.map((transport) => (
                <TableRow 
                  key={transport.id}
                  hover
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    backgroundColor: transport.status === 'completed' ? 'success.50' : undefined 
                  }}
                >
                  <TableCell>
                    <Typography variant="subtitle2">
                      {transport.pickup_location} - {transport.delivery_location}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {transport.cargo_title || 'Belirlenmemiş'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      <strong>Yükleme:</strong> {formatDate(transport.pickup_date)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Teslim:</strong> {formatDate(transport.delivery_date)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {getStatusChip(transport.status)}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      <strong>Taşıyıcı:</strong> {transport.transporter_name || '-'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Yük Sahibi:</strong> {transport.cargo_owner_name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {renderActionButtons(transport)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Button 
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
        >
          Ana Sayfaya Dön
        </Button>
      </Box>
    </Container>
  );
}

export default TransportOffers;