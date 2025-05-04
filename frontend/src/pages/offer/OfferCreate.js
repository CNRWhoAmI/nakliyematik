import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, TextField, Button, Box, Grid,
  CircularProgress, Alert, Divider, InputAdornment, FormHelperText
} from '@mui/material';
import {
  LocalShipping, AttachMoney, Description
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { tr } from 'date-fns/locale'; // tr locale'ı için import eklendi
import cargoService from '../../services/cargo.service';
import offerService from '../../services/offer.service';
import { useAuth } from '../../contexts/AuthContext';

function OfferCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isTransporter } = useAuth(); // currentUser kaldırıldı
  const [cargo, setCargo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    price: '',
    pickup_date: null, // Tarih alanları için null değeri
    delivery_date: null,
    note: ''
  });
  const [formErrors, setFormErrors] = useState({});
  
  // İlan bilgilerini yükle
  useEffect(() => {
    const fetchCargoDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError('');
        
        const data = await cargoService.getCargoDetails(id);
        console.log('Cargo details:', data);
        
        // İlan aktif değilse uyar
        if (data.status !== 'active') {
          setError(`Bu ilan için teklif verilemez. İlan durumu: ${data.status}`);
          setLoading(false);
          return;
        }
        
        setCargo(data);
        
        // İlan tarihlerini varsayılan değer olarak ayarla
        setFormData(prev => ({
          ...prev,
          pickup_date: data.pickup_date ? new Date(data.pickup_date) : null,
          delivery_date: data.delivery_date ? new Date(data.delivery_date) : null
        }));
        
      } catch (error) {
        console.error('Error fetching cargo details:', error);
        
        let errorMessage = 'İlan bilgileri yüklenirken bir hata oluştu.';
        if (error.response?.status === 404) {
          errorMessage = 'İlan bulunamadı.';
        } else if (error.response?.status === 403) {
          errorMessage = 'Bu ilana erişim izniniz bulunmuyor.';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCargoDetails();
  }, [id]);
  
  // Kullanıcı tipini kontrol et
  useEffect(() => {
    if (!isTransporter) {
      setError('Teklif vermek için taşıyıcı hesabınız olmalıdır.');
    }
  }, [isTransporter]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Form hatalarını temizle
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const handleDateChange = (name) => (date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
    
    // Tarih hatalarını temizle
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const validate = () => {
    const errors = {};
    let isValid = true;
    
    // Fiyat kontrolü
    if (!formData.price) {
      errors.price = 'Teklif fiyatı gereklidir';
      isValid = false;
    } else if (isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      errors.price = 'Geçerli bir fiyat giriniz';
      isValid = false;
    }
    
    // Tarih kontrolleri
    if (formData.pickup_date && formData.delivery_date) {
      if (formData.pickup_date > formData.delivery_date) {
        errors.delivery_date = 'Teslimat tarihi yükleme tarihinden sonra olmalıdır';
        isValid = false;
      }
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      setSubmitting(true);
      setError('');
      
      const offerData = {
        cargo_post: parseInt(id),
        price: parseFloat(formData.price),
        message: formData.note || '',  // 'note' değil 'message' olarak gönder
        pickup_date: formData.pickup_date ? formData.pickup_date.toISOString().split('T')[0] : null,
        delivery_date: formData.delivery_date ? formData.delivery_date.toISOString().split('T')[0] : null
      };
      
      console.log('Submitting offer:', offerData);
      
      const response = await offerService.createOffer(offerData);
      console.log('Offer created:', response);
      
      setSuccess(true);
      
      // 2 saniye sonra yönlendir
      setTimeout(() => {
        navigate('/offers/my');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting offer:', error);
      
      // API'den gelen hata mesajını işle
      let errorMessage = 'Teklif gönderilirken bir hata oluştu';
      
      if (error.response?.data) {
        const responseData = error.response.data;
        
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData.detail) {
          errorMessage = responseData.detail;
        } else if (typeof responseData === 'object') {
          const errors = [];
          
          Object.keys(responseData).forEach(key => {
            const message = responseData[key];
            if (Array.isArray(message)) {
              errors.push(`${key}: ${message.join(' ')}`);
            } else if (typeof message === 'string') {
              errors.push(`${key}: ${message}`);
            } else {
              errors.push(`${key}: ${JSON.stringify(message)}`);
            }
          });
          
          if (errors.length > 0) {
            errorMessage = errors.join('. ');
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error && !cargo) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Geri Dön
        </Button>
      </Container>
    );
  }
  
  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Teklifiniz başarıyla gönderildi! Tekliflerim sayfasına yönlendiriliyorsunuz...
        </Alert>
        <Button variant="contained" onClick={() => navigate('/offers/my')}>
          Tekliflerim
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4, bgcolor: 'primary.main', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            Teklif Oluştur
          </Typography>
          <LocalShipping fontSize="large" />
        </Box>
        
        {cargo && (
          <Typography variant="body1" sx={{ mt: 1 }}>
            "{cargo.title}" ilanı için teklif veriyorsunuz
          </Typography>
        )}
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {cargo && (
        <Grid container spacing={3}>
          {/* İlan Bilgileri */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <Description sx={{ mr: 1 }} />
                İlan Bilgileri
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">İlan Başlığı:</Typography>
                <Typography variant="body1">{cargo.title}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Yük Tipi:</Typography>
                <Typography variant="body1">{cargo.cargo_type}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">İlan Sahibi:</Typography>
                <Typography variant="body1">{cargo.cargo_owner_name || 'Belirtilmemiş'}</Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Güzergah:</Typography>
                <Typography variant="body1">
                  {cargo.pickup_location || 'Belirtilmemiş'} - {cargo.delivery_location || 'Belirtilmemiş'}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Yükleme Tarihi:</Typography>
                <Typography variant="body1">
                  {cargo.pickup_date ? new Date(cargo.pickup_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Teslim Tarihi:</Typography>
                <Typography variant="body1">
                  {cargo.delivery_date ? new Date(cargo.delivery_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                </Typography>
              </Box>
              
              {cargo.price && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">İlan Fiyatı:</Typography>
                  <Typography variant="h6" color="primary">
                    {parseFloat(cargo.price).toLocaleString('tr-TR')} ₺
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Teklif Formu */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                <AttachMoney sx={{ mr: 1 }} />
                Teklif Bilgileri
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Teklif Fiyatı (₺)"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      type="number"
                      required
                      InputProps={{
                        endAdornment: <InputAdornment position="end">₺</InputAdornment>,
                      }}
                      error={!!formErrors.price}
                      helperText={formErrors.price}
                    />
                  </Grid>
                  
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Yükleme Tarihi"
                        value={formData.pickup_date}
                        onChange={handleDateChange('pickup_date')}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            fullWidth
                            error={!!formErrors.pickup_date}
                            helperText={formErrors.pickup_date}
                          />
                        )}
                      />
                      <FormHelperText>
                        İlandaki yükleme tarihini değiştirmek istiyorsanız, farklı bir tarih seçebilirsiniz
                      </FormHelperText>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Teslim Tarihi"
                        value={formData.delivery_date}
                        onChange={handleDateChange('delivery_date')}
                        renderInput={(params) => (
                          <TextField 
                            {...params} 
                            fullWidth
                            error={!!formErrors.delivery_date}
                            helperText={formErrors.delivery_date}
                          />
                        )}
                      />
                      <FormHelperText>
                        İlandaki teslim tarihini değiştirmek istiyorsanız, farklı bir tarih seçebilirsiniz
                      </FormHelperText>
                    </Grid>
                  </LocalizationProvider>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Teklifiniz ile ilgili not (opsiyonel)"
                      name="note"
                      value={formData.note}
                      onChange={handleChange}
                      multiline
                      rows={4}
                      placeholder="Teklifinizle ilgili detayları, özel şartları veya açıklamaları buraya yazabilirsiniz"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => navigate(-1)}
                        disabled={submitting}
                      >
                        Vazgeç
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={submitting}
                        sx={{ ml: 1 }}
                      >
                        {submitting ? 'Gönderiliyor...' : 'Teklif Ver'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default OfferCreate;