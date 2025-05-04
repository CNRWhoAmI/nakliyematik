import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, CircularProgress, Avatar, Divider,
  Grid, Chip, Rating, Alert, Button, Card, CardContent, LinearProgress, Tabs, Tab
} from '@mui/material';
import {
  Business, Person, LocalShipping, VerifiedUser, Warning,
  Phone, Email, ArrowBack, Star, StarBorder
} from '@mui/icons-material';
import api from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { useSnackbar } from 'notistack';

// Tab panel bileşeni
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [ratingStats, setRatingStats] = useState({
    average: 0,
    count: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  // Tab değişikliği
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Kullanıcı profilini yükle
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Profil bilgilerini getir
        const response = await api.get(`/profile/users/${id}/`);
        setProfile(response.data);
        
        // Değerlendirmeleri getir
        try {
          const ratingsResponse = await api.get(`/profile/users/${id}/ratings/`);
          const ratingsData = ratingsResponse.data || [];
          setRatings(ratingsData);
          
          // Değerlendirme istatistiklerini hesapla
          if (ratingsData.length > 0) {
            const ratingValues = ratingsData.map(r => Number(r.rating));
            const avgRating = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
            
            // Değerlendirmeleri sayısına göre gruplandır
            const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            ratingValues.forEach(value => {
              const roundedValue = Math.round(value);
              if (breakdown[roundedValue] !== undefined) {
                breakdown[roundedValue]++;
              }
            });
            
            setRatingStats({
              average: avgRating.toFixed(1),
              count: ratingValues.length,
              breakdown
            });
          } else if (response.data.rating_avg) {
            // Eğer profil bilgisinde rating_avg varsa onu kullan
            setRatingStats({
              average: parseFloat(response.data.rating_avg).toFixed(1),
              count: response.data.rating_count || 0,
              breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            });
          }
        } catch (ratingError) {
          console.error('Değerlendirmeler yüklenirken hata:', ratingError);
          // Değerlendirme hatası profil görüntülemeyi engellemesin
          if (response.data.rating_avg) {
            setRatingStats({
              average: parseFloat(response.data.rating_avg).toFixed(1),
              count: response.data.rating_count || 0,
              breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
            });
          }
        }
      } catch (error) {
        console.error('Kullanıcı profili yüklenirken hata:', error);
        if (error.response?.status === 404) {
          setError('Kullanıcı profili bulunamadı.');
        } else if (error.response?.status === 403) {
          setError('Bu kullanıcı profilini görüntüleme yetkiniz bulunmamaktadır.');
        } else {
          setError('Kullanıcı profili yüklenirken bir hata oluştu.');
        }
        enqueueSnackbar('Kullanıcı profili yüklenirken bir hata oluştu', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchUserProfile();
    }
  }, [id, enqueueSnackbar]);

  // Yükleniyor durumu
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Geri Dön
        </Button>
      </Container>
    );
  }

  // Profil bulunamadı
  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert severity="warning">Kullanıcı profili bulunamadı.</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Geri Dön
        </Button>
      </Container>
    );
  }

  // Kullanıcı tipi bilgisi
  const isTransporter = profile.user_type === 'transporter';
  const isCargoOwner = profile.user_type === 'cargo_owner';
  
  // Kullanıcı adı oluştur
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username || 'Belirtilmemiş';

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      {/* Geri butonu ve başlık */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Geri Dön
        </Button>
        <Typography variant="h5" component="h1">
          Kullanıcı Profili
        </Typography>
      </Box>

      {/* Ana profil kartı */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                mr: 2, 
                bgcolor: isTransporter ? 'primary.main' : 'secondary.main' 
              }}
            >
              {isTransporter ? <LocalShipping /> : <Business />}
            </Avatar>
            
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="h5" component="div">
                  {profile.company_name || 'Belirtilmemiş'}
                </Typography>
                <Chip 
                  label={isTransporter ? "Taşıyıcı" : isCargoOwner ? "Yük Sahibi" : "Kullanıcı"} 
                  color={isTransporter ? "primary" : "secondary"} 
                  size="small" 
                  sx={{ ml: 1 }} 
                />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Rating 
                  value={parseFloat(ratingStats.average)} 
                  precision={0.5} 
                  readOnly 
                  size="small" 
                />
                <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                  ({ratingStats.count} değerlendirme)
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Chip 
            icon={profile.verified ? <VerifiedUser /> : <Warning />} 
            label={profile.verified ? "Doğrulanmış" : "Doğrulanmamış"} 
            color={profile.verified ? "success" : "warning"} 
            sx={{ mt: { xs: 2, sm: 0 } }}
          />
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* İletişim Bilgileri */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <Person fontSize="small" sx={{ mr: 1 }} />
                Yetkili Kişi:
              </Typography>
              <Typography variant="body1">
                {fullName}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <Email fontSize="small" sx={{ mr: 1 }} />
                E-posta:
              </Typography>
              <Typography variant="body1">
                {profile.email || 'Belirtilmemiş'}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <Phone fontSize="small" sx={{ mr: 1 }} />
                Telefon:
              </Typography>
              <Typography variant="body1">
                {profile.phone || 'Belirtilmemiş'}
              </Typography>
            </Box>
            
            {isTransporter && profile.vehicle_type && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocalShipping fontSize="small" sx={{ mr: 1 }} />
                  Araç Tipi:
                </Typography>
                <Typography variant="body1">
                  {profile.vehicle_type}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
      
      {/* Sekmeler */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="profile tabs">
          <Tab label="Değerlendirmeler" id="profile-tab-0" aria-controls="profile-tabpanel-0" />
          <Tab label="İstatistikler" id="profile-tab-1" aria-controls="profile-tabpanel-1" />
        </Tabs>
      </Box>
      
      {/* Değerlendirmeler Sekmesi */}
      <TabPanel value={tabValue} index={0}>
        {ratings.length > 0 ? (
          <>
            {/* Değerlendirme Dağılımı */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                Değerlendirme Dağılımı
              </Typography>
              
              {[5, 4, 3, 2, 1].map((star) => (
                <Box key={star} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: '30px', textAlign: 'center', mr: 1 }}>
                    <Typography variant="body2">{star}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                    <Star fontSize="small" color="primary" />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(ratingStats.breakdown[star] / ratingStats.count) * 100 || 0}
                    sx={{ 
                      flexGrow: 1, 
                      height: 8, 
                      borderRadius: 5,
                      backgroundColor: 'grey.300',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: star >= 4 ? 'success.main' : 
                                      star >= 3 ? 'primary.main' : 
                                      star >= 2 ? 'warning.main' : 'error.main'
                      }
                    }}
                  />
                  <Box sx={{ width: '40px', textAlign: 'center', ml: 1 }}>
                    <Typography variant="body2">
                      {ratingStats.breakdown[star]} ({Math.round((ratingStats.breakdown[star] / ratingStats.count) * 100) || 0}%)
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            
            {/* Değerlendirme Yorumları */}
            <Typography variant="subtitle1" gutterBottom fontWeight="medium">
              Değerlendirme Yorumları
            </Typography>
            
            {ratings.map((rating, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Rating value={parseFloat(rating.rating) || 0} readOnly size="small" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(rating.created_at, true)}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    {rating.comment || 'Yorum yapılmamış'}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <StarBorder sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">Henüz değerlendirme bulunmuyor.</Typography>
          </Box>
        )}
      </TabPanel>
      
      {/* İstatistikler Sekmesi */}
      <TabPanel value={tabValue} index={1}>
        <Paper elevation={1} sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h2" color="primary">
                  {ratingStats.average}
                </Typography>
                <Rating 
                  value={parseFloat(ratingStats.average)} 
                  precision={0.5} 
                  readOnly 
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Ortalama Puan
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h2" color="primary">
                  {ratingStats.count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Değerlendirme
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h2" color="primary">
                  {profile.completed_jobs || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tamamlanan Taşıma
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
    </Container>
  );
}

export default UserProfile;