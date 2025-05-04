import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Button, TextField,
  Alert, CircularProgress, Divider
} from '@mui/material';
import { ArrowBack, LocalShipping } from '@mui/icons-material';
import { toast } from 'react-toastify';

import transportationService from '../../services/transportation.service';
import { useAuth } from '../../contexts/AuthContext';

function RequestDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isTransporter } = useAuth();
  
  const [transportation, setTransportation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState('');
  
  useEffect(() => {
    const fetchTransportation = async () => {
      try {
        setLoading(true);
        const data = await transportationService.getTransportationDetails(id);
        
        // Sadece "in_transit" durumundaki taşımaları kabul et
        if (data.status !== 'in_transit') {
          setError("Bu taşıma için teslimat talebi gönderilemez. Taşıma durumu uygun değil.");
        } else if (data.delivery_requested) {
          setError("Bu taşıma için zaten teslimat talebi gönderilmiş.");
        }
        
        setTransportation(data);
      } catch (error) {
        console.error("Error fetching transportation:", error);
        setError("Taşıma bilgileri yüklenirken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransportation();
  }, [id]);
  
  // Taşıyıcı değilse erişim engelle
  if (!isTransporter) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">
          Teslimat talebi sadece taşıyıcılar tarafından gönderilebilir.
        </Alert>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate(`/shipments/${id}`)}
          sx={{ mt: 2 }}
        >
          Taşıma Detayına Dön
        </Button>
      </Container>
    );
  }
  
  const handleRequestDelivery = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // API isteği gönder
      await transportationService.requestDelivery(id, note);
      
      toast.success("Teslimat talebi başarıyla gönderildi!");
      
      // Taşıma detay sayfasına yönlendir
      navigate(`/shipments/${id}`);
    } catch (error) {
      console.error("Error requesting delivery:", error);
      toast.error("Teslimat talebi gönderilirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
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
        Teslimat Talebi Gönder
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Yük sahibine teslimat için varış noktasına ulaştığınızı bildirin. 
        Talebiniz onaylandıktan sonra taşıma tamamlanacaktır.
      </Typography>
      
      {error ? (
        <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>
      ) : (
        <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
          {transportation && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Taşıma Bilgileri
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Taşıma ID:</strong> {transportation.id}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Teslimat Adresi:</strong> {transportation.delivery_address}, {transportation.delivery_city}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <LocalShipping fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  <strong>Yük Türü:</strong> {transportation.cargo_post?.cargo_type || 'Belirtilmemiş'}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box component="form" onSubmit={handleRequestDelivery} sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Teslimat Notu (İsteğe Bağlı)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  placeholder="Teslimat için iletmek istediğiniz notları buraya yazabilirsiniz..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={submitting || transportation.delivery_requested}
                />
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Button 
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={submitting || transportation.delivery_requested || transportation.status !== 'in_transit'}
                    sx={{ minWidth: 200 }}
                  >
                    {submitting ? <CircularProgress size={24} /> : "Teslimat Talebi Gönder"}
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      )}
    </Container>
  );
}

export default RequestDelivery;