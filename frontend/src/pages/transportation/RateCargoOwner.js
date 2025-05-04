import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Paper, Typography, Rating, Button, TextField,
  CircularProgress, Alert, Snackbar
} from '@mui/material';
import { Star, ArrowBack } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import transportationService from '../../services/transportation.service';

function RateCargoOwner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isTransporter } = useAuth();
  
  const [transportation, setTransportation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  useEffect(() => {
    // Taşıma detaylarını yükle
    const fetchTransportation = async () => {
      try {
        setLoading(true);
        const data = await transportationService.getTransportationDetails(id);
        
        if (!data) {
          setError('Taşıma kaydı bulunamadı.');
          return;
        }
        
        if (data.status !== 'completed') {
          setError('Sadece tamamlanmış taşımalar değerlendirilebilir.');
          return;
        }
        
        // Taşıyıcının daha önce değerlendirme yapıp yapmadığını kontrol et
        const transporterRating = data.ratings?.find(r => !r.from_cargo_owner);
        if (transporterRating) {
          setError('Bu taşıma için zaten değerlendirme yapmışsınız.');
          setRating(transporterRating.rating || 5);
          setComment(transporterRating.comment || '');
          return;
        }
        
        setTransportation(data);
      } catch (error) {
        console.error('Error fetching transportation:', error);
        setError('Taşıma detayları yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransportation();
  }, [id]);
  
  // Değerlendirme gönderimi
  const handleSubmitRating = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // API'a gönderilecek veri
      
      await transportationService.rateTransportation(id, rating, comment);
      
      setSnackbarMessage('Değerlendirmeniz başarıyla kaydedildi.');
      setSnackbarOpen(true);
      
      // 2 saniye bekleyip taşıma detayına yönlendir
      setTimeout(() => {
        navigate(`/shipments/${id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      setError('Değerlendirme kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Taşıyıcı değilse erişim engellendi
  if (!isTransporter) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          Bu sayfaya sadece taşıyıcılar erişebilir.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/shipments/${id}`)}
          >
            Taşıma Detayına Dön
          </Button>
        </Box>
      </Container>
    );
  }
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/shipments/${id}`)}
        >
          Taşıma Detayına Dön
        </Button>
      </Box>
      
      <Typography variant="h4" component="h1" gutterBottom>
        Yük Sahibini Değerlendir
      </Typography>
      
      {error ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : (
        <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
          {transportation && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {transportation.cargo_post?.title || `Taşıma #${transportation.id}`}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {transportation.cargo_owner?.company_name || 'Yük Sahibi'} ile yaptığınız işbirliğini değerlendirin.
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                <Typography component="legend" sx={{ mb: 1 }}>
                  İşbirliği Kalitesi
                </Typography>
                <Rating
                  name="cargo-owner-rating"
                  value={rating}
                  onChange={(event, newValue) => {
                    setRating(newValue);
                  }}
                  size="large"
                  precision={1}
                  sx={{ fontSize: '3rem' }}
                  emptyIcon={<Star style={{ opacity: 0.3, fontSize: 'inherit' }} />}
                />
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body1">
                    {rating === 5 ? 'Mükemmel' :
                     rating === 4 ? 'İyi' :
                     rating === 3 ? 'Ortalama' :
                     rating === 2 ? 'Kötü' : 'Çok Kötü'}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="Yorumunuz (isteğe bağlı)"
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Yük sahibi ile işbirliğiniz hakkında yorumlarınızı buraya yazabilirsiniz..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={submitting}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSubmitRating}
                  disabled={submitting || !rating}
                  sx={{ minWidth: 200 }}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Değerlendirmeyi Gönder'}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      )}
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
}

export default RateCargoOwner;