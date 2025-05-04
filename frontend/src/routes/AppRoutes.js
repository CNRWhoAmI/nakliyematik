import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import PrivateRoute from '../components/PrivateRoute';

// Auth Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';

// Dashboard
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/profile/Profile';

// Cargo Pages
import CargoList from '../pages/cargo/CargoList';
import CargoDetail from '../pages/cargo/CargoDetail';
import MyCargoList from '../pages/cargo/MyCargoList';
import CreateCargoPost from '../pages/cargo/CreateCargoPost';
import EditCargoPost from '../pages/cargo/EditCargoPost';

// Offer Pages
import OfferCreate from '../pages/offer/OfferCreate';
import MyOffers from '../pages/offer/MyOffers';
import ReceivedOffers from '../pages/offer/ReceivedOffers';
import OfferDetail from '../pages/offer/OfferDetail';

// Layout
import Layout from '../components/layout/Layout';
import { CargoOwnerRoute, TransporterRoute } from '../components/RoleBasedRoute';

function AppRoutes() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Ana Layout ile sarmalanan korumalı sayfalar */}
          <Route path="/" element={<Layout />}>
            {/* Anasayfa yönlendirmesi */}
            <Route index element={
              <PrivateRoute>
                <Navigate to="/dashboard" replace />
              </PrivateRoute>
            } />
            
            {/* Korumalı sayfalar */}
            <Route path="dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            <Route path="profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            
            {/* Cargo ile ilgili sayfalar */}
            <Route path="cargo">
              <Route index element={
                <PrivateRoute>
                  <CargoList />
                </PrivateRoute>
              } />
              
              <Route path=":id" element={
                <PrivateRoute>
                  <CargoDetail />
                </PrivateRoute>
              } />
              
              <Route path="my-posts" element={
                <PrivateRoute>
                  <CargoOwnerRoute>
                    <MyCargoList />
                  </CargoOwnerRoute>
                </PrivateRoute>
              } />
              
              <Route path="create" element={
                <PrivateRoute>
                  <CargoOwnerRoute>
                    <CreateCargoPost />
                  </CargoOwnerRoute>
                </PrivateRoute>
              } />
              
              <Route path="edit/:id" element={
                <PrivateRoute>
                  <CargoOwnerRoute>
                    <EditCargoPost />
                  </CargoOwnerRoute>
                </PrivateRoute>
              } />
              
              {/* Teklif Oluşturma - Taşıyıcı rolüne özel */}
              <Route path=":id/offer" element={
                <PrivateRoute>
                  <TransporterRoute>
                    <OfferCreate />
                  </TransporterRoute>
                </PrivateRoute>
              } />
            </Route>
            
            {/* Teklifler ile ilgili sayfalar */}
            <Route path="offers">
              {/* Taşıyıcının verdiği teklifler */}
              <Route path="my" element={
                <PrivateRoute>
                  <TransporterRoute>
                    <MyOffers />
                  </TransporterRoute>
                </PrivateRoute>
              } />
              
              {/* Yük sahibinin aldığı teklifler */}
              <Route path="received" element={
                <PrivateRoute>
                  <CargoOwnerRoute>
                    <ReceivedOffers />
                  </CargoOwnerRoute>
                </PrivateRoute>
              } />
              
              {/* Teklif detayı - rol bazlı erişim kontrolü */}
              <Route path=":id" element={
                <PrivateRoute>
                  <OfferDetail />
                </PrivateRoute>
              } />
            </Route>
          </Route>
          
          {/* 404 sayfası */}
          <Route path="*" element={<div>Sayfa bulunamadı</div>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default AppRoutes;