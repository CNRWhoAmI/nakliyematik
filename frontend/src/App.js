import React, { Suspense, lazy, useRef, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { SnackbarProvider } from 'notistack';
import { CircularProgress, Slide, Typography, Button } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LoadScript } from '@react-google-maps/api';
import { 
  GOOGLE_MAPS_API_KEY, 
  GOOGLE_MAPS_LIBRARIES, 
  GOOGLE_MAPS_MAP_ID,
  GOOGLE_MAPS_VERSION,
  GOOGLE_MAPS_LANGUAGE,
  GOOGLE_MAPS_REGION
} from './utils/mapsConfig';

// Components
import Navbar from './components/layout/Navbar';
import PrivateRoute from './components/PrivateRoute';

// Page imports
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Profile from './pages/profile/Profile';
import CargoList from './pages/cargo/CargoList';
import CreateCargoPost from './pages/cargo/CreateCargoPost';
import CargoDetail from './pages/cargo/CargoDetail';
import MyCargoListings from './pages/cargo/MyCargoListings';
import EditCargoPost from './pages/cargo/EditCargoPost';
import NotFound from './pages/error/NotFound';
import UserProfile from './pages/profile/UserProfile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Offer Pages
import OfferCreate from './pages/offer/OfferCreate';
import MyOffers from './pages/offer/MyOffers';
import ReceivedOffers from './pages/offer/ReceivedOffers';
import OfferDetail from './pages/offer/OfferDetail';

// Transportation Pages
import TransportationList from './pages/transportation/TransportationList';
import TransportationDetail from './pages/transportation/TransportationDetail';
import LocationTracking from './pages/transportation/LocationTracking';
import RateTransportation from './pages/transportation/RateTransportation';
import RateCargoOwner from './pages/transportation/RateCargoOwner';
import RequestPickup from './pages/transportation/RequestPickup';
import RequestDelivery from './pages/transportation/RequestDelivery';

// Lazy Loaded Components
const Landing = lazy(() => import('./pages/Landing'));

// Tema tanımı
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    success: { main: '#2e7d32' },
    warning: { main: '#ff9800' },
    info: { main: '#0288d1' }
  },
  typography: {
    fontFamily: [
      'Inter',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12
        }
      }
    }
  }
});

// Notistack için özel animasyon fonksiyonu
const notistackRef = React.createRef();
const onClickDismiss = key => () => {
  notistackRef.current.closeSnackbar(key);
};

// LoadingFallback bileşeni
const LoadingFallback = ({ message = "Yükleniyor..." }) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <CircularProgress size={60} />
    <Typography variant="h6" sx={{ mt: 2 }}>
      {message}
    </Typography>
  </Box>
);

// İç içerik bileşeni - useLocation hook'u burada güvenli bir şekilde kullanılabilir
function AppContent() {
  const location = useLocation();
  const { isAuthenticated, loading, authChecked } = useAuth();
  const isLandingPage = location.pathname === '/';
  
  // Debug bilgileri
  console.log('App - Auth Status:', { 
    isAuthenticated, 
    loading, 
    authChecked, 
    path: location.pathname 
  });
  
  // Sonsuz yükleme durumunu önle
  const startTime = useRef(Date.now());
  const [timeout, setTimeout] = useState(false);
  
  useEffect(() => {
    // 5 saniyeden uzun süren yükleme durumunda timeout göster
    const timer = setTimeout(() => {
      if (loading && Date.now() - startTime.current > 5000) {
        setTimeout(true);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [loading]);
  
  // Kimlik doğrulama kontrol edilmemiş ve yükleme devam ediyorsa
  if (loading && !timeout) {
    return <LoadingFallback message="Oturum bilgileriniz kontrol ediliyor..." />
  }
  
  // Yükleme uzun sürerse timeout göster
  if (timeout) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        p: 3
      }}>
        <Typography variant="h6" color="error">
          Oturum kontrolü zaman aşımına uğradı
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Sayfayı Yenile
        </Button>
      </Box>
    );
  }
  
  // Kullanıcı giriş yapmışsa ve login sayfasındaysa veya ana sayfadaysa, dashboard'a yönlendir
  if (isAuthenticated && (isLandingPage || location.pathname === '/login')) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Normal içeriği göster
  return (
    <>
      {!isLandingPage && <Navbar />}
      
      <Suspense fallback={<LoadingFallback />}>
        <Box sx={{ mt: isLandingPage ? 0 : 2 }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

            {/* Private Routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            <Route path="/users/:id" element={
              <PrivateRoute>
                <UserProfile />
              </PrivateRoute>
            } />
            
            {/* Cargo Routes */}
            <Route path="/cargo" element={
              <PrivateRoute>
                <CargoList />
              </PrivateRoute>
            } />
            
            <Route path="/cargo/create" element={
              <PrivateRoute>
                <CreateCargoPost />
              </PrivateRoute>
            } />
            
            <Route path="/cargo/my-posts" element={
              <PrivateRoute>
                <MyCargoListings />
              </PrivateRoute>
            } />
            
            <Route path="/cargo/edit/:id" element={
              <PrivateRoute>
                <EditCargoPost />
              </PrivateRoute>
            } />
            
            <Route path="/cargo/:id" element={
              <PrivateRoute>
                <CargoDetail />
              </PrivateRoute>
            } />

            {/* Offer Routes */}
            <Route path="/cargo/:id/offer" element={
              <PrivateRoute>
                <OfferCreate />
              </PrivateRoute>
            } />
            <Route path="/offers/my" element={
              <PrivateRoute>
                <MyOffers />
              </PrivateRoute>
            } />
            <Route path="/offers/received" element={
              <PrivateRoute>
                <ReceivedOffers />
              </PrivateRoute>
            } />
            <Route path="/offers/:id" element={
              <PrivateRoute>
                <OfferDetail />
              </PrivateRoute>
            } />

            {/* Transportation Routes */}
            <Route path="/shipments" element={
              <PrivateRoute>
                <TransportationList />
              </PrivateRoute>
            } />
            <Route path="/shipments/:id" element={
              <PrivateRoute>
                <TransportationDetail />
              </PrivateRoute>
            } />
            <Route path="/shipments/:id/location" element={
              <PrivateRoute>
                <LocationTracking />
              </PrivateRoute>
            } />
            <Route path="/shipments/:id/rate" element={
              <PrivateRoute>
                <RateTransportation />
              </PrivateRoute>
            } />
            <Route path="/shipments/:id/rate-cargo-owner" element={
              <PrivateRoute>
                <RateCargoOwner />
              </PrivateRoute>
            } />
            <Route path="/shipments/:id/request-pickup" element={
              <PrivateRoute>
                <RequestPickup />
              </PrivateRoute>
            } />
            <Route path="/shipments/:id/request-delivery" element={
              <PrivateRoute>
                <RequestDelivery />
              </PrivateRoute>
            } />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Box>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={GOOGLE_MAPS_LIBRARIES}
      mapIds={[GOOGLE_MAPS_MAP_ID]}
      version={GOOGLE_MAPS_VERSION}
      language="tr"
      region="TR"
    >
      <Router>
        <HelmetProvider>
          <AuthProvider>
            <SnackbarProvider
              maxSnack={3}
              ref={notistackRef}
              TransitionComponent={Slide}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              action={(key) => (
                <React.Fragment>
                  <button onClick={onClickDismiss(key)}>
                    Kapat
                  </button>
                </React.Fragment>
              )}
              autoHideDuration={5000}
              preventDuplicate
            >
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <AppContent />
                <ToastContainer
                  position="bottom-right"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                />
              </ThemeProvider>
            </SnackbarProvider>
          </AuthProvider>
        </HelmetProvider>
      </Router>
    </LoadScript>
  );
}

export default App;