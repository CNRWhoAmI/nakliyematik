import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Container, Box, Typography, TextField, Button, 
  Paper, Alert, CircularProgress, InputAdornment
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import authService from '../services/auth.service';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Email validasyonu
      if (!email || !email.includes('@')) {
        throw new Error('Lütfen geçerli bir e-posta adresi girin');
      }

      // Şifre sıfırlama isteği gönder
      const response = await authService.forgotPassword(email);
      
      setSuccess(response.message || 'Şifre sıfırlama talimatları e-posta adresinize gönderilmiştir.');
      setEmailSent(true);
    } catch (error) {
      console.error('Forgot Password Error:', error);
      setError(
        error.response?.data?.error || 
        error.message || 
        'Şifre sıfırlama isteği gönderilirken bir hata oluştu.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={6} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            borderRadius: 2,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Üst renkli kenar çizgisi */}
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: 4, 
              bgcolor: 'primary.main' 
            }} 
          />

          <Typography 
            component="h1" 
            variant="h4" 
            sx={{ 
              fontWeight: 600, 
              color: 'primary.main', 
              mb: 1,
              mt: 2
            }}
          >
            Şifremi Unuttum
          </Typography>

          {!emailSent ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Şifrenizi sıfırlamak için kayıtlı e-posta adresinizi girin.
                <br />
                Size bir şifre sıfırlama bağlantısı göndereceğiz.
              </Typography>
              
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mt: 1, 
                    mb: 2, 
                    width: '100%',
                    borderRadius: 1
                  }}
                  onClose={() => setError('')}
                >
                  {error}
                </Alert>
              )}
              
              <Box 
                component="form" 
                onSubmit={handleSubmit} 
                sx={{ mt: 1, width: '100%' }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="E-posta Adresi"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="primary" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ 
                    mt: 2, 
                    mb: 2, 
                    py: 1.2,
                    fontSize: '1rem',
                    borderRadius: '50px', 
                    position: 'relative'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <CircularProgress 
                        size={24} 
                        sx={{ 
                          position: 'absolute',
                          color: 'white'
                        }} 
                      />
                      <span style={{ visibility: 'hidden' }}>Şifre Sıfırlama Bağlantısı Gönder</span>
                    </>
                  ) : 'Şifre Sıfırlama Bağlantısı Gönder'}
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', my: 3 }}>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 4,
                  borderRadius: 1
                }}
              >
                {success}
              </Alert>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Lütfen e-posta kutunuzu kontrol edin ve şifre sıfırlama işlemini tamamlamak için e-postadaki bağlantıya tıklayın.
              </Typography>
            </Box>
          )}
          
          <Box sx={{ textAlign: 'center' }}>
            <Button
              component={RouterLink}
              to="/login"
              startIcon={<ArrowBack />}
              color="primary"
              sx={{ mt: 2, textTransform: 'none' }}
            >
              Giriş Sayfasına Dön
            </Button>
          </Box>
        </Paper>
        
        <Typography 
          variant="caption" 
          color="text.secondary" 
          align="center" 
          sx={{ 
            mt: 4, 
            display: 'block' 
          }}
        >
          © {new Date().getFullYear()} Nakliyematik. Tüm Hakları Saklıdır.
        </Typography>
      </Container>
    </Box>
  );
};

export default ForgotPassword;