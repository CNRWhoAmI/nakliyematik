import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from './Navbar';
import { Box, Container } from '@mui/material';

function Layout() {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Auth kontrolü yaparak, gerekirse login sayfasına yönlendir
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      
      <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>
      
      {/* Footer eklenebilir */}
    </Box>
  );
}

export default Layout;