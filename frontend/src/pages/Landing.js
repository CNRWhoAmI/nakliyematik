import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  useScrollTrigger,
  Slide,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Grid,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  createTheme,
  ThemeProvider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LocalShipping,
  BusinessCenter,
  Speed,
  LocationOn,
  CheckCircle,
  Instagram,  // Instagram ikonu eklendi
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';

// İki farklı logoyu farklı isimlerle import edelim
import logoLight from '../assets/images/nakliyematik-logo.svg';
import logoDark from '../assets/images/nakliyematik-logo-dark.svg';

// LandingNavbar bileşeni - Sabit beyaz tasarım
const LandingNavbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);

  // Mobil menü işlemleri
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{
        bgcolor: '#f8f8f8',  // Beyazımsı arka plan
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderRadius: 0  // Kenar yumuşatma kapalı
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ py: 0.5 }}>
          <Box 
            component={RouterLink}
            to="/"
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              textDecoration: 'none',
              color: 'text.primary',  // Koyu metin rengi
            }}
          >
            {/* Logo */}
            <Box
              component="img"
              src={logoDark} // Koyu renk logo - beyaz arka plan için
              alt="Nakliyematik Logo"
              sx={{ 
                height: 38, 
                mr: 1,
                filter: 'none' 
              }}
            />
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 700,
                letterSpacing: '.1rem',
                display: 'flex', // Her ekran boyutunda göster
                color: '#1976d2'  // Mavi metin rengi
              }}
            >
              NAKLIYEMATIK
            </Typography>
          </Box>

          {isMobile ? (
            // Mobil görünüm
            <>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton
                size="large"
                edge="end"
                aria-label="menu"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenuClick}
                sx={{ color: '#333' }}  // Koyu renk ikon
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    borderRadius: 0  // Kenar yumuşatma kapalı
                  }
                }}
              >
                <MenuItem component={RouterLink} to="/register" onClick={handleMenuClose}>
                  Kaydol
                </MenuItem>
                <MenuItem component={RouterLink} to="/login" onClick={handleMenuClose}>
                  Giriş Yap
                </MenuItem>
                <MenuItem component={RouterLink} to="/about" onClick={handleMenuClose}>
                  Hakkımızda
                </MenuItem>
                <MenuItem component={RouterLink} to="/contact" onClick={handleMenuClose}>
                  İletişim
                </MenuItem>
              </Menu>
            </>
          ) : (
            // Masaüstü görünüm
            <>
              <Box sx={{ flexGrow: 1 }} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  color="inherit"
                  component={RouterLink}
                  to="/about"
                  sx={{ 
                    color: '#333',  // Koyu metin rengi
                    borderRadius: 0  // Kenar yumuşatma kapalı
                  }}
                >
                  Hakkımızda
                </Button>
                <Button 
                  color="inherit"
                  component={RouterLink}
                  to="/contact"
                  sx={{ 
                    color: '#333',  // Koyu metin rengi
                    borderRadius: 0  // Kenar yumuşatma kapalı
                  }}
                >
                  İletişim
                </Button>
                <Button 
                  color="inherit"
                  component={RouterLink}
                  to="/login"
                  sx={{ 
                    color: '#333',  // Koyu metin rengi
                    borderRadius: 0  // Kenar yumuşatma kapalı
                  }}
                >
                  Giriş Yap
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  component={RouterLink}
                  to="/register"
                  sx={{ 
                    borderRadius: isMobile ? '4px' : 0, // Mobilde hafif yuvarlatma
                    width: isMobile ? '100%' : 'auto', // Mobilde tam genişlik
                  }}
                >
                  Kaydol
                </Button>
              </Box>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

// Hero bölümü için arka plan görüntüsü - performans iyileştirmesi
const heroBgStyle = {
  backgroundImage: 'linear-gradient(135deg, #1976d2 0%, #01579b 100%)', // Görsel yerine gradient
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  position: 'relative',
  color: 'white',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Hafif overlay
    zIndex: 1
  }
};

// Özellikler için veri - Güvenli Ödeme kısmı kaldırıldı
const features = [
  {
    icon: <LocalShipping fontSize="large" color="primary" />,
    title: 'Hızlı Nakliye Çözümleri',
    description: 'Yüklerinizi hızlı, güvenli ve ekonomik şekilde taşıyın. Gerçek zamanlı takip ve şeffaf ücretlendirme.'
  },
  {
    icon: <Speed fontSize="large" color="primary" />,
    title: 'Anlık Teklif Alma',
    description: 'Saniyeler içinde rekabetçi nakliye teklifleri alın, zaman ve paradan tasarruf edin.'
  },
  {
    icon: <LocationOn fontSize="large" color="primary" />,
    title: 'Gerçek Zamanlı Takip',
    description: 'Yükünüzün konumunu anlık olarak harita üzerinde takip edin. Her zaman kontrol sizde.'
  }
];

// Hedef kitleler
const audiences = [
  {
    title: 'Yük Sahipleri',
    icon: <BusinessCenter fontSize="large" sx={{ mb: 2 }} />,
    description: 'En uygun fiyata, en güvenilir taşıyıcıları bulun. Ödemeniz taşıma tamamlanana kadar güvende.',
    benefits: [
      'Rekabetçi fiyat teklifleri',
      'Doğrulanmış taşıyıcılar',
      'Gerçek zamanlı yük takibi',
    ],
    cta: 'Yük İlanı Ver',
    link: '/register?type=cargoowner'
  },
  {
    title: 'Taşıyıcılar',
    icon: <LocalShipping fontSize="large" sx={{ mb: 2 }} />,
    description: 'Boş dönüşleri minimuma indirin, daha fazla yük taşıyın. Müşteri bulma sorununuza son.',
    benefits: [
      'Yeni müşterilere erişim',
      'Boş dönüşlerin ortadan kalkması',
      'Hızlı ödeme sistemi',
      'İtibar puanı kazanma'
    ],
    cta: 'Taşıyıcı Olarak Kaydol',
    link: '/register?type=transporter'
  }
];

// Ana Landing bileşeni
function Landing() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isXSmall = useMediaQuery(theme.breakpoints.down('sm')); // Çok küçük ekranlar
  
  // Arka plan rengi için özel tema oluşturma
  const pageTheme = React.useMemo(
    () =>
      createTheme({
        ...theme,
        components: {
          ...theme.components,
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: '#f8f8f8', // Kirli beyaz
              },
            },
          },
        },
      }),
    [theme],
  );

  return (
    <ThemeProvider theme={pageTheme}>
      <CssBaseline />
      <LandingNavbar />
      {/* SEO için meta etiketler */}
      <Helmet>
        <title>Nakliyematik - Türkiye'nin Digital Yük Taşıma Platformu</title>
        <meta name="description" content="Nakliyematik ile yük sahipleri ve nakliyecileri bir araya getiren dijital nakliye platformu. Hızlı, güvenli ve ekonomik nakliye çözümleri." />
        <meta name="keywords" content="nakliye, lojistik, kargo taşıma, yük ilanı, taşıma ihalesi, nakliyeci bulma" />
        <link rel="canonical" href="https://nakliyematik.com" />
        
        {/* Open Graph etiketleri */}
        <meta property="og:title" content="Nakliyematik - Digital Yük Taşıma Platformu" />
        <meta property="og:description" content="Nakliyematik ile yük sahipleri ve nakliyecileri bir araya getiren dijital nakliye platformu." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://nakliyematik.com" />
        <meta property="og:image" content="https://nakliyematik.com/images/og-image.jpg" />
      </Helmet>
      
      {/* Hero Bölümü */}
      <Box sx={{
        ...heroBgStyle,
        minHeight: isMobile ? '100vh' : '85vh', // Mobil için tam ekran yükseklik
        pt: isMobile ? '70px' : 0, // Navbar altında kalmayacak şekilde padding
        display: 'flex',
        alignItems: 'center',
        mb: isMobile ? 3 : 6 // Mobilde daha az alt boşluk
      }}>
        <Container maxWidth="lg" sx={{ 
          position: 'relative', 
          zIndex: 2,
          px: isMobile ? 2 : 3 // Mobilde daha az yatay padding
        }}>
          <Grid container spacing={isMobile ? 2 : 4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography 
                variant="h1" 
                component="h1" 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: isMobile ? '2rem' : '3.5rem', // Daha küçük font boyutu
                  mb: isMobile ? 1 : 2,
                  background: 'linear-gradient(90deg, #FFFFFF 0%, #E0E0E0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Türkiye'nin Dijital Yük Taşıma Platformu
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 2, 
                  fontWeight: 400,
                  opacity: 0.9,
                  fontSize: isMobile ? '1rem' : '1.25rem' // Daha küçük font
                }}
              >
                Yük sahipleri ve taşıyıcılar arasında köprü kuruyoruz. 
                Hızlı, güvenli ve ekonomik nakliye çözümleri.
              </Typography>
              
              {/* Butonları mobil için tam genişlikli yapalım */}
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={isMobile ? 1 : 2}
                sx={{ mt: isMobile ? 2 : 4 }}
              >
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="large"
                  component={RouterLink}
                  to="/register"
                  sx={{ 
                    py: 1.5, 
                    px: 4,
                    fontSize: '1.1rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(90deg, #FFFFFF 0%, #E0E0E0 100%)',
                    color: '#1976d2',
                    boxShadow: '0 6px 20px rgba(255,255,255,0.25)',
                    fontWeight: 600,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 10px 30px rgba(255,255,255,0.3)',
                    }
                  }}
                >
                  Hemen Kaydol
                </Button>
                <Button 
                  variant="outlined" 
                  color="inherit"
                  size="large" 
                  component={RouterLink}
                  to="/login"
                  sx={{ 
                    py: 1.5, 
                    px: 4,
                    fontSize: '1.1rem',
                    borderRadius: '12px',
                    borderColor: 'white',
                    borderWidth: '2px',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      transform: 'translateY(-3px)',
                    }
                  }}
                >
                  Giriş Yap
                </Button>
              </Stack>
            </Grid>
            
            {!isMobile && (
              <Grid item xs={12} md={5}>
                <Paper elevation={10} sx={{ 
                  borderRadius: '24px', 
                  overflow: 'hidden',
                  transform: 'rotate(3deg)',
                  boxShadow: '0 20px 80px rgba(0,0,0,0.3)',
                  transition: 'all 0.5s ease',
                  '&:hover': {
                    transform: 'rotate(0deg) translateY(-10px)',
                    boxShadow: '0 30px 100px rgba(0,0,0,0.4)',
                  }
                }}>
                  <Box component="img"
                    src="https://images.unsplash.com/photo-1577412647305-991150c7d163?q=80&w=640&auto=format&fit=crop" 
                    alt="Nakliyematik Uygulama Görüntüsü"
                    sx={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </Paper>
              </Grid>
            )}
          </Grid>
          
          {/* Rakamlarla Nakliyematik */}
          <Box
            sx={{
              mt: isMobile ? 4 : 8,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: isMobile ? 3 : 6 // Mobilde daha az boşluk
            }}
          >
            {[
              { value: '120+', label: 'Aktif Taşıyıcı' },
              { value: '245+', label: 'Yayında Olan Yük İlanı' },
            ].map((stat, index) => (
              <Box key={index} sx={{ 
                textAlign: 'center',
                width: isMobile ? '45%' : 'auto', // Mobilde yarım genişlik
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)'
                }
              }}>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 0.5,
                    fontSize: isMobile ? '1.8rem' : '2.5rem' // Mobilde daha küçük
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    opacity: 0.8,
                    fontSize: isMobile ? '0.875rem' : '1rem' // Mobilde daha küçük
                  }}
                >
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>
      
      {/* Özellikler Bölümü */}
      <Container maxWidth="lg" sx={{ 
        py: isMobile ? 4 : 8, // Mobilde daha az dikey padding
        bgcolor: 'transparent' 
      }}>
        <Box sx={{ textAlign: 'center', mb: isMobile ? 3 : 6 }}>
          <Typography 
            variant="h2" 
            component="h2" 
            gutterBottom
            sx={{ fontSize: isMobile ? '1.75rem' : '2.5rem' }} // Mobilde daha küçük
          >
            Nakliye Sürecinizi Kolaylaştırıyoruz
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              maxWidth: '800px', 
              mx: 'auto',
              fontSize: isMobile ? '0.9rem' : '1.25rem', // Mobilde daha küçük
              px: isMobile ? 1 : 0 // Mobilde yatay padding ekle
            }}
          >
            Nakliyematik, yük sahipleri ve taşıyıcıları buluşturan, 
            yüklerin güvenli ve hızlı şekilde taşınmasını sağlayan yenilikçi bir platformdur.
          </Typography>
        </Box>
        
        {/* Grid boşluklarını azaltalım */}
        <Grid container spacing={isMobile ? 2 : 4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper
                elevation={1}
                sx={{
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  borderRadius: '20px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-10px)',
                    boxShadow: theme.shadows[10]
                  }
                }}
              >
                <Box sx={{ 
                  mb: 3,
                  p: 2,
                  bgcolor: 'rgba(25, 118, 210, 0.05)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {feature.icon}
                </Box>
                <Typography variant="h5" component="h3" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
      
      {/* Hedef Kitle Bölümü */}
      <Box sx={{ bgcolor: '#f0f0f0', py: 10 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h2" component="h2" gutterBottom>
              Kime Hitap Ediyoruz?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '800px', mx: 'auto' }}>
              Nakliyematik, yük sahipleri ve taşıyıcıların ihtiyaçlarını karşılamak için tasarlandı.
            </Typography>
          </Box>
          
          <Grid container spacing={6}>
            {audiences.map((audience, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper 
                  elevation={4} 
                  sx={{ 
                    p: 5, 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '24px',
                    transition: 'all 0.4s ease',
                    '&:hover': {
                      transform: 'translateY(-10px)',
                      boxShadow: theme.shadows[15]
                    }
                  }}
                >
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{ 
                      mb: 3,
                      p: 2,
                      bgcolor: 'rgba(25, 118, 210, 0.05)',
                      borderRadius: '50%',
                      width: '80px',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto'
                    }}>
                      {audience.icon}
                    </Box>
                    <Typography variant="h4" component="h3" gutterBottom>
                      {audience.title}
                    </Typography>
                    <Typography color="text.secondary" paragraph>
                      {audience.description}
                    </Typography>
                  </Box>
                  
                  <List sx={{ mb: 4, flexGrow: 1 }}>
                    {audience.benefits.map((benefit, i) => (
                      <ListItem key={i} sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircle color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={benefit} />
                      </ListItem>
                    ))}
                  </List>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    component={RouterLink}
                    to={audience.link}
                    sx={{ 
                      py: 1.2,
                      borderRadius: '12px',
                      alignSelf: 'flex-start',
                      background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                      boxShadow: '0 4px 15px rgba(25,118,210,0.25)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 8px 25px rgba(25,118,210,0.4)',
                      }
                    }}
                  >
                    {audience.cta}
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
      
      {/* CTA Bölümü */}
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        py: 10, 
        textAlign: 'center',
        background: 'linear-gradient(135deg, #1976d2 0%, #01579b 100%)',
      }}>
        <Container maxWidth="md">
          <Typography variant="h3" component="h2" gutterBottom>
            Lojistik Süreçlerinizi Dijitalleştirmeye Hazır Mısınız?
          </Typography>
          <Typography variant="h6" paragraph sx={{ mb: 6, opacity: 0.9 }}>
            Nakliyematik ile yüklerinizi güvenle taşıtın veya taşıyıcı olarak yeni müşterilere ulaşın.
          </Typography>
          
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={3}
            justifyContent="center"
          >
            <Button 
              variant="contained" 
              color="secondary" 
              size="large"
              component={RouterLink}
              to="/register"
              sx={{ 
                py: 1.5, 
                px: 4,
                borderRadius: '12px',
                fontSize: '1.1rem',
                bgcolor: 'white',
                color: 'primary.main',
                boxShadow: '0 6px 20px rgba(255,255,255,0.25)',
                fontWeight: 600,
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'grey.100',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 12px 30px rgba(255,255,255,0.4)',
                }
              }}
            >
              Hemen Kaydol
            </Button>
            <Button 
              variant="outlined" 
              color="inherit"
              size="large" 
              component={RouterLink}
              to="/contact"
              sx={{ 
                py: 1.5, 
                px: 4,
                fontSize: '1.1rem',
                borderRadius: '12px',
                borderColor: 'white',
                borderWidth: '2px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                  transform: 'translateY(-3px)',
                }
              }}
            >
              İletişime Geç
            </Button>
          </Stack>
        </Container>
      </Box>
      
      {/* Footer - Şirket ve Kaynaklar kısımları kaldırıldı */}
      <Box 
        component="footer"
        sx={{
          bgcolor: 'grey.900',
          color: 'grey.500',
          py: isMobile ? 4 : 6,
          px: isMobile ? 2 : 0
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={isMobile ? 3 : 0} justifyContent="space-between">
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2
              }}>
                <Box
                  component="img"
                  src={logoLight} // Açık renk logo (beyaz) - koyu arka plan için
                  alt="Nakliyematik Logo"
                  sx={{ 
                    height: 40, 
                    mr: 1,
                    filter: 'brightness(3)' // Footer koyu olduğu için parlaklık artırıyoruz
                  }}
                />
                <Typography variant="h6" sx={{ 
                  fontWeight: 700,
                  color: 'white'
                }}>
                  NAKLIYEMATIK
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Yük sahipleri ve taşıyıcıları buluşturan dijital nakliye platformu.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" color="white" gutterBottom>
                İletişim
              </Typography>
              <Typography variant="body2" paragraph>
                info@nakliyematik.com
              </Typography>
              <Typography variant="body2" paragraph>
                +90 (545) 210 37 69
              </Typography>
              
              {/* Sosyal Medya İkonları */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Typography variant="subtitle2" color="white" gutterBottom>
                  Sosyal Medya
                </Typography>
                <Box 
                  component="a"
                  href="https://www.instagram.com/caner.gif/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    color: 'grey.400',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': { 
                      color: '#E1306C',  // Instagram rengi
                      transform: 'translateY(-3px)',
                    } 
                  }}
                >
                  <Instagram />
                  <Typography variant="body2">caner.gif</Typography>
                </Box>
                {/* Diğer sosyal medya ikonları buraya eklenebilir */}
              </Box>
            </Grid>
          </Grid>
          
          <Box 
            sx={{ 
              borderTop: 1, 
              borderColor: 'grey.800',
              mt: isMobile ? 2 : 4,
              pt: isMobile ? 2 : 3,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: isMobile ? 1 : 0 // Mobilde öğeler arası boşluk
            }}
          >
            <Typography variant="body2">
              © {new Date().getFullYear()} Nakliyematik. Tüm hakları saklıdır.
            </Typography>
            <Box>
              <Button color="inherit" component={RouterLink} to="/privacy">
                Gizlilik
              </Button>
              <Button color="inherit" component={RouterLink} to="/terms">
                Şartlar
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Landing;