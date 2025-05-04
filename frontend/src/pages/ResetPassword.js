import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Box, Typography, TextField, Button, 
  Paper, Alert, CircularProgress, InputAdornment, IconButton
} from '@mui/material';
import { LockOutlined, Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';
import authService from '../services/auth.service';

const ResetPassword = () => {
  // URL'den hem uid hem de token parametresini al
  const { uid, token } = useParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Şifre göster/gizle
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Şifre validasyonu
  const validatePassword = () => {
    if (newPassword.length < 8) {
      return 'Şifreniz en az 8 karakter olmalıdır';
    }
    if (newPassword !== confirmPassword) {
      return 'Şifreler eşleşmiyor';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Şifre validasyonu
    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      // UID ve token kontrolü
      if (!uid || !token) {
        throw new Error('Geçersiz veya eksik şifre sıfırlama kodu');
      }

      // Şifre sıfırlama isteği
      await authService.resetPassword(uid, token, newPassword);
      
      setSuccess(true);
      
      // 3 saniye sonra giriş sayfasına yönlendir
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Reset Password Error:', error);
      setError(
        error.response?.data?.error || 
        error.message || 
        'Şifre sıfırlama işlemi sırasında bir hata oluştu.'
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
            Şifre Sıfırlama
          </Typography>

          {success ? (
            <Box sx={{ textAlign: 'center', my: 4 }}>
              <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Şifreniz Başarıyla Sıfırlandı!
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Yeni şifrenizle giriş yapabilirsiniz. Giriş sayfasına yönlendiriliyorsunuz...
              </Typography>
              
              <CircularProgress size={24} thickness={5} sx={{ mt: 2 }} />
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Lütfen hesabınız için yeni bir şifre belirleyin.
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
                  name="newPassword"
                  label="Yeni Şifre"
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Şifreyi Tekrar Girin"
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined color="primary" />
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
                      <span style={{ visibility: 'hidden' }}>Şifremi Sıfırla</span>
                    </>
                  ) : 'Şifremi Sıfırla'}
                </Button>
              </Box>
            </>
          )}
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

export default ResetPassword;