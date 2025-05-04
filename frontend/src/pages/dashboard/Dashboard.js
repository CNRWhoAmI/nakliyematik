import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Grid, Paper, Box, Button, 
  Card, CardContent, CardActions, Divider, CircularProgress,
  Alert
} from '@mui/material';
import { 
  LocalShipping, 
  CheckCircle, AddCircleOutline, Dashboard as DashboardIcon,
  ViewList, DirectionsCar, ReceiptLong
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import cargoService from '../../services/cargo.service';
import offerService from '../../services/offer.service'; // Offer servisini import ediyoruz
import transportationService from '../../services/transportation.service';

function Dashboard() {
  const navigate = useNavigate();
  // user yerine currentUser kullanıyoruz (AuthContext'in sağladığı değişken adı)
  const { currentUser, isCargoOwner, isTransporter } = useAuth();
  
  // isCargoOwner ve isTransporter artık doğrudan AuthContext'ten geliyor,
  // manuel hesaplama yapmaya gerek yok
  const userTypeLabel = isCargoOwner ? 'Yük Sahibi' : (isTransporter ? 'Taşıyıcı' : 'Kullanıcı');

  const [stats, setStats] = useState({
    cargoListings: null,
    activeShipments: null,
    offers: null,
    loading: true,
    error: null
  });

  // İstatistikleri yükle
  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('Fetching dashboard stats for user type:', 
          isCargoOwner ? 'cargo_owner' : (isTransporter ? 'transporter' : 'unknown'));
        
        // Yük sahibiyse kendi ilanlarını getir
        if (isCargoOwner) {
          try {
            console.log('Fetching cargo posts count for cargo owner');
            // Tüm verileri çekmek yerine sadece sayıyı getir
            const cargoPostsCount = await cargoService.getMyPostsCount();
            console.log('Cargo posts count:', cargoPostsCount);
            setStats(prev => ({ 
              ...prev, 
              cargoListings: cargoPostsCount
            }));
            
            // Teklif sayısını da benzer şekilde getirin
            console.log('Fetching received offers count');
            const receivedOffersCount = await offerService.getReceivedOffersCount();
            console.log('Received offers count:', receivedOffersCount);
            setStats(prev => ({ 
              ...prev, 
              offers: receivedOffersCount 
            }));
          } catch (error) {
            console.error('Error fetching cargo owner stats:', error);
            setStats(prev => ({ ...prev, error: error.message }));
          }
        } else if (isTransporter) {
          try {
            // Taşıyıcı için verilen tekliflerin SAYISINI getir
            console.log('Fetching sent offers count');
            const myOffersCount = await offerService.getMyOffersCount();
            console.log('My offers count:', myOffersCount);
            setStats(prev => ({ 
              ...prev, 
              offers: myOffersCount 
            }));
            
            // Aktif ilanları getir - yeni eklenen kısım
            console.log('Fetching active cargo posts for transporter');
            const activePosts = await cargoService.getActivePosts();
            console.log('Fetched active posts:', activePosts);
            setStats(prev => ({ 
              ...prev, 
              cargoListings: Array.isArray(activePosts) ? activePosts.length : 0 
            }));
          } catch (error) {
            console.error('Error fetching transporter data:', error);
            setStats(prev => ({ ...prev, offers: '?', cargoListings: '?' }));
          }
        }
  
        // Aktif taşıma sayısı (şimdilik mock veri)
        try {
          console.log('Fetching active transportations count');
          const activeTransportations = await transportationService.getActiveTransportationsCount();
          console.log('Active transportations:', activeTransportations);
          setStats(prev => ({ ...prev, activeShipments: activeTransportations }));
        } catch (error) {
          console.error('Error fetching transportation data:', error);
          setStats(prev => ({ ...prev, activeShipments: '?' }));
        }
        
        // Teklifleri artık API'den çektiğimiz için buradaki mock offers'a ihtiyacımız yok
        // const mockOffers = isCargoOwner ? 8 : (isTransporter ? 5 : 0);
        
        setStats(prev => ({ 
          ...prev, 
          // activeShipments çoktan yukarıda atandığı için burada tekrar atanmasına gerek yok
          loading: false 
        }));
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'İstatistikler yüklenirken bir hata oluştu.'
        }));
      }
    };
  
    // Kullanıcı bilgileri dolu ise istatistikleri getir
    if (currentUser) {
      fetchStats();
    } else {
      // Kullanıcı yoksa loading durumunu false yap
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [isCargoOwner, isTransporter, currentUser]);

  // Kullanıcı tipine göre birincil işlem kartı
  const renderPrimaryActionCard = () => {
    if (isCargoOwner) {
      return (
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <AddCircleOutline color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6" color="primary">Yeni İlan Ver</Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Hızlı ve kolay bir şekilde yeni yük ilanı vererek taşıyıcılardan teklif alın.
              Nakliyematik ile yükleriniz güvenli ellerde!
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<AddCircleOutline />}
                onClick={() => navigate('/cargo/create')}
                fullWidth
                size="large"
              >
                Yeni İlan Oluştur
              </Button>
            </Box>
          </Paper>
        </Grid>
      );
    } else if (isTransporter) {
      return (
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <LocalShipping color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6" color="primary">Yükleri Keşfedin</Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Size uygun yük ilanlarını keşfedin, filonuza en uygun taşımaları seçin
              ve hızlıca teklif vererek iş potansiyelinizi artırın.
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<LocalShipping />}
                onClick={() => navigate('/cargo')}
                fullWidth
                size="large"
              >
                İlanları Görüntüle
              </Button>
            </Box>
          </Paper>
        </Grid>
      );
    } else {
      // Default içerik - eğer kullanıcı tipi bilinmiyorsa
      return (
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <DashboardIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6" color="primary">Hoş Geldiniz</Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Profil bilgilerinizi güncelleyin ve kullanıcı tipini seçerek
              Nakliyematik'in tüm özelliklerinden yararlanın.
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => navigate('/profile')}
                fullWidth
                size="large"
              >
                Profili Tamamla
              </Button>
            </Box>
          </Paper>
        </Grid>
      );
    }
  };

  // Kullanıcı tipine göre ikincil işlem kartı
  const renderSecondaryActionCard = () => {
    if (isCargoOwner) {
      // Yük sahibi için kod değişmiyor
      return (
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <ViewList color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6" color="primary">İlanlarınızı Yönetin</Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Yayınladığınız yük ilanlarını görüntüleyin, düzenleyin veya silme işlemlerini gerçekleştirin.
              Taşıyıcılardan gelen teklifleri değerlendirin.
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button 
                variant="outlined" 
                color="primary"
                startIcon={<ViewList />}
                onClick={() => navigate('/cargo/my-posts')}
                fullWidth
                size="large"
              >
                İlanlarıma Git
              </Button>
            </Box>
          </Paper>
        </Grid>
      );
    } else if (isTransporter) {
      return (
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <ReceiptLong color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6" color="primary">Teklifleriniz</Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Verdiğiniz teklifleri takip edin, durum güncellemelerini görün
              ve onaylanan taşımaları yönetin.
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button 
                variant="outlined" 
                color="primary"
                startIcon={<ReceiptLong />}
                onClick={() => navigate('/offers/my')}
                fullWidth
                size="large"
              >
                Tekliflerime Git
              </Button>
            </Box>
          </Paper>
        </Grid>
      );
    } else {
      return (
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <LocalShipping color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h6" color="primary">Nakliyat Sistemi</Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Nakliyematik sistemini keşfedin ve yük taşımacılığında
              dijital dönüşümün avantajlarını öğrenin.
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => navigate('/cargo')}
                fullWidth
                size="large"
              >
                İlanları Keşfet
              </Button>
            </Box>
          </Paper>
        </Grid>
      );
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Başlık ve Hızlı Erişim Butonu */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Hoş Geldiniz, {currentUser?.username || 'Kullanıcı'}!
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {userTypeLabel} paneli • {new Date().toLocaleDateString('tr-TR')}
          </Typography>
        </Box>

        {isCargoOwner && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutline />}
            onClick={() => navigate('/cargo/create')}
            size="large"
          >
            Yeni İlan Ver
          </Button>
        )}
        
        {isTransporter && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<LocalShipping />}
            onClick={() => navigate('/cargo')}
            size="large"
          >
            İlanlara Göz At
          </Button>
        )}
      </Box>

      {/* Hata mesajı */}
      {stats.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {stats.error}
        </Alert>
      )}

      {stats.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* İstatistik Kartları */}
          <Grid item xs={12} sm={4}>
            <Card raised sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                {isCargoOwner ? (
                  <ViewList sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
                ) : (
                  <LocalShipping sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
                )}
                <Box>
                  <Typography variant="h6" component="div" gutterBottom>
                    {isCargoOwner ? 'İlanlarım' : 'Aktif İlanlar'}
                  </Typography>
                  <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    {isCargoOwner ? stats.cargoListings : stats.cargoListings || '0'}
                  </Typography>
                </Box>
              </CardContent>
              <Divider />
              <CardActions>
                <Button 
                  size="small" 
                  color="primary" 
                  onClick={() => navigate(isCargoOwner ? '/cargo/my-posts' : '/cargo')}
                  sx={{ fontWeight: 'medium' }}
                >
                  {isCargoOwner ? 'İlanlarıma Git' : 'Tüm İlanları Gör'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Card raised sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <DirectionsCar sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6" component="div" gutterBottom>
                    Aktif Taşımalar
                  </Typography>
                  <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    {stats.activeShipments}
                  </Typography>
                </Box>
              </CardContent>
              <Divider />
              <CardActions>
                <Button 
                  size="small" 
                  color="primary" 
                  onClick={() => navigate('/shipments')}
                  sx={{ fontWeight: 'medium' }}
                >
                  Detaya Git
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Card raised sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
                <ReceiptLong sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6" component="div" gutterBottom>
                    {isCargoOwner ? 'Alınan Teklifler' : 'Verilen Teklifler'}
                  </Typography>
                  <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold' }}>
                    {stats.offers}
                  </Typography>
                </Box>
              </CardContent>
              <Divider />
              <CardActions>
                <Button 
                  size="small" 
                  color="primary" 
                  onClick={() => navigate(isCargoOwner ? '/offers/received' : '/offers/my')}
                  sx={{ fontWeight: 'medium' }}
                >
                  {isCargoOwner ? 'Teklifleri Gör' : 'Tekliflerime Git'}
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* Hızlı Erişim Başlığı */}
          <Grid item xs={12}>
            <Typography variant="h5" sx={{ mb: 1, mt: 3 }}>Hızlı Erişim</Typography>
            <Divider sx={{ mb: 3 }} />
          </Grid>
          
          {/* Kullanıcı tipine göre birincil ve ikincil işlem kartları */}
          {renderPrimaryActionCard()}
          {renderSecondaryActionCard()}
          
          {/* Bilgilendirme Bölümü */}
          <Grid item xs={12} sx={{ mt: 3 }}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                bgcolor: 'primary.light', 
                color: 'primary.contrastText',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                <CheckCircle sx={{ mr: 1, mb: -0.5 }} />
                {isCargoOwner ? 
                  'Yük İlanı Verme İpuçları' : 
                  (isTransporter ? 'Taşıyıcı İpuçları' : 'Nakliyematik İpuçları')
                }
              </Typography>
              <Typography variant="body1">
                {isCargoOwner ? 
                  'Yükünüz için en uygun teklifi almak için ilan detaylarını eksiksiz doldurun ve fotoğraflar ekleyin.' :
                  (isTransporter ? 
                    'Karlı teklifler vermek için yükün detaylarını, mesafesini ve özel gereksinimlerini dikkatlice inceleyin.' :
                    'Nakliyematik sistemi ile yük sahipleri ve taşıyıcılar arasında güvenli ve hızlı iletişim kurabilirsiniz.'
                  )
                }
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default Dashboard;