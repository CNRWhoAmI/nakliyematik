import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { 
  Container, Box, Typography, TextField, Button, 
  Paper, Avatar, Link, Alert, CircularProgress,
  InputAdornment, IconButton, useTheme, Divider
} from '@mui/material';
import { 
  LockOutlined, 
  Person, 
  Visibility, 
  VisibilityOff,
  Login as LoginIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError('');
    
    try {
      console.log('Login - Attempting login for user:', username);
      
      // Login fonksiyonunu çağır
      await login(username, password);
      
      // Login başarılı olduysa, isAuthenticated değişecek ve
      // yukarıdaki useEffect yönlendirmeyi yapacak
    } catch (error) {
      console.error('Login failed:', error);
      
      // Hata işleme
      setError(
        error.response?.data?.detail || 
        error.response?.data?.non_field_errors?.[0] || 
        'Giriş başarısız. Kullanıcı adı veya şifre hatalı.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh',
        backgroundColor: theme.palette.mode === 'light' ? '#f5f5f5' : theme.palette.background.default,
        alignItems: 'center'
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

          <Avatar 
            sx={{ 
              m: 2, 
              bgcolor: 'primary.main',
              width: 56,
              height: 56
            }}
          >
            <LoginIcon fontSize="large" />
          </Avatar>

          <Typography 
            component="h1" 
            variant="h4" 
            sx={{ 
              fontWeight: 600, 
              color: 'primary.main', 
              mb: 1 
            }}
          >
            Hoş Geldiniz
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Hesabınıza giriş yaparak devam edin
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
              id="username"
              label="Kullanıcı Adı"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="primary" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Şifre"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              sx={{ mb: 3 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 2, 
                mb: 3, 
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
                  <span style={{ visibility: 'hidden' }}>Giriş Yap</span>
                </>
              ) : 'Giriş Yap'}
            </Button>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              my: 1.5
            }}>
              <Link 
                component={RouterLink} 
                to="/forgot-password"
                variant="body2" 
                underline="hover"
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                  '&:hover': {
                    color: 'primary.main',
                  }
                }}
              >
                Şifremi Unuttum
              </Link>
            </Box>
            
            <Divider sx={{ my: 2 }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ px: 1 }}
              >
                veya
              </Typography>
            </Divider>
            
            <Box sx={{ 
              textAlign: 'center', 
              mt: 2 
            }}>
              <Typography variant="body2" color="text.secondary">
                Hesabınız yok mu?{' '}
                <Link 
                  component={RouterLink} 
                  to="/register"
                  sx={{ 
                    fontWeight: 600, 
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Hemen Kayıt Olun
                </Link>
              </Typography>
            </Box>
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
}

export default Login;