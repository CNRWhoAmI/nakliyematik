import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Box, Paper, Tabs, Tab, Grid, CircularProgress, Chip, List, ListItem, ListItemText, ListItemIcon, ListItemButton } from '@mui/material';
import { LocationOn, MyLocation, ArrowBack, FiberManualRecord } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import useLocationTracking from '../../hooks/useLocationTracking';
import transportationService from '../../services/transportation.service';
import { useMaps } from '../../contexts/MapsContext';
import { formatDate } from '../../utils/formatters';

// Çoklu konum izleme bileşeni
function MultiLocationTracking() {
  const navigate = useNavigate();
  const { mapsLoaded } = useMaps();
  const [mapRef, setMapRef] = useState(null);
  const [activeTransportations, setActiveTransportations] = useState([]);
  const [selectedTransportation, setSelectedTransportation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [center, setCenter] = useState({ lat: 39.9334, lng: 32.8597 });
  const [zoom, setZoom] = useState(6);
  const [directions, setDirections] = useState(null);
  
  // Aktif taşımaları yükle
  useEffect(() => {
    const loadActiveTransportations = async () => {
      try {
        setLoading(true);
        const transportations = await transportationService.getActiveTransportations();
        
        // Her taşıma için konum tracker başlat
        const transportationsWithId = transportations.map(t => ({
          ...t,
          id: t.id, // Açık ID
          trackerId: `transport-${t.id}`, // Benzersiz izleyici ID'si
        }));
        
        setActiveTransportations(transportationsWithId);
        
        // Varsayılan olarak ilk taşımayı seç
        if (transportationsWithId.length > 0 && !selectedTransportation) {
          setSelectedTransportation(transportationsWithId[0]);
        }
      } catch (error) {
        console.error('Aktif taşımalar yüklenirken hata:', error);
        setError('Taşımalar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    
    loadActiveTransportations();
  }, []);
  
  // Seçili taşıma değiştiğinde rotayı güncelle
  useEffect(() => {
    if (!selectedTransportation || !mapRef) return;
    
    // Harita merkezini seçili taşımanın konumuna getir
    if (selectedTransportation.currentPosition) {
      setCenter(selectedTransportation.currentPosition);
      setZoom(12);
    }
    
  }, [selectedTransportation, mapRef]);
  
  const handleMapLoad = (mapInstance) => {
    setMapRef(mapInstance);
  };
  
  // Taşıma seçme
  const handleTransportationSelect = (transportation) => {
    setSelectedTransportation(transportation);
  };
  
  // Harita görünümü
  const renderMap = () => (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '600px' }}
      center={center}
      zoom={zoom}
      onLoad={handleMapLoad}
      options={{
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      }}
    >
      {/* Tüm taşıyıcıları göster */}
      {activeTransportations.map(transportation => {
        // Her taşıma için konum izleme hook'unu kullan
        const { transporterPosition } = useLocationTracking(transportation.id, { keepConnection: true });
        
        // Taşıma konumu varsa marker ekle
        return transporterPosition ? (
          <Marker
            key={transportation.trackerId}
            position={transporterPosition}
            icon={{
              url: `http://maps.google.com/mapfiles/ms/icons/${selectedTransportation?.id === transportation.id ? 'blue' : 'yellow'}-dot.png`,
              scaledSize: new window.google.maps.Size(40, 40)
            }}
            onClick={() => handleTransportationSelect(transportation)}
            title={`${transportation.cargo_post_title || 'Taşıma'} #${transportation.id}`}
          />
        ) : null;
      })}
      
      {/* Seçili taşıma için başlangıç ve bitiş noktaları */}
      {selectedTransportation && (
        <ActiveTransportationMap transportationId={selectedTransportation.id} />
      )}
      
      {/* Rota göster */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#1976d2',
              strokeWeight: 5,
              strokeOpacity: 0.7
            }
          }}
        />
      )}
    </GoogleMap>
  );
  
  // Taşıma listesi
  const renderTransportationList = () => (
    <List>
      {activeTransportations.map(transportation => (
        <ListItem
          key={transportation.trackerId}
          disablePadding
          secondaryAction={
            <Chip 
              label={transportation.status_display} 
              color={transportation.status === 'in_transit' ? 'primary' : 'secondary'} 
              size="small"
            />
          }
        >
          <ListItemButton
            selected={selectedTransportation?.id === transportation.id}
            onClick={() => handleTransportationSelect(transportation)}
          >
            <ListItemIcon>
              <LocationOn color={selectedTransportation?.id === transportation.id ? 'primary' : 'action'} />
            </ListItemIcon>
            <ListItemText
              primary={`#${transportation.id} ${transportation.cargo_post_title || 'Taşıma'}`}
              secondary={`${transportation.cargo_owner_name} → ${transportation.transporter_name}`}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
  
  // Ana render
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Button 
          startIcon={<ArrowBack />}
          onClick={() => navigate('/shipments')}
        >
          Taşımalara Dön
        </Button>
      </Box>
      
      <Typography variant="h4" component="h1" gutterBottom>
        Tüm Aktif Taşımalar
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
          {error}
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Paper elevation={2} sx={{ mb: 2 }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  Aktif Taşımalar ({activeTransportations.length})
                </Typography>
              </Box>
              {renderTransportationList()}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={9}>
            <Paper elevation={2} sx={{ height: '600px' }}>
              {mapsLoaded ? renderMap() : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              )}
            </Paper>
            
            {selectedTransportation && (
              <TransportationDetails transportationId={selectedTransportation.id} />
            )}
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

// Seçili taşıma için harita oluşturan alt bileşen
function ActiveTransportationMap({ transportationId }) {
  const {
    transporterPosition,
    pickupLocation,
    deliveryLocation,
    loading,
    error
  } = useLocationTracking(transportationId, { keepConnection: true });
  
  // Rota oluştur
  useEffect(() => {
    if (!pickupLocation || !deliveryLocation || !window.google || !window.google.maps) return;
    
    // Taşıyıcı konumu veya pickup konumu başlangıç
    const startLocation = transporterPosition || pickupLocation;
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin: startLocation,
        destination: deliveryLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          // Directions state'ini güncellemek için parent'a callback
          if (window.directionsRenderer) {
            window.directionsRenderer.setDirections(result);
          }
        }
      }
    );
  }, [transporterPosition, pickupLocation, deliveryLocation]);
  
  return (
    <>
      {pickupLocation && (
        <Marker
          position={pickupLocation}
          icon={{
            url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
          }}
          title="Yükleme Noktası"
        />
      )}
      
      {deliveryLocation && (
        <Marker
          position={deliveryLocation}
          icon={{
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
          }}
          title="Teslimat Noktası"
        />
      )}
      
      {loading && <CircularProgress sx={{ position: 'absolute', top: 10, right: 10 }} size={20} />}
    </>
  );
}

// Seçili taşıma için detay bilgilerini gösteren alt bileşen
function TransportationDetails({ transportationId }) {
  const {
    loading,
    error,
    connected,
    transporterPosition,
    lastUpdate,
    locationHistory
  } = useLocationTracking(transportationId, { keepConnection: true });
  
  const [transportationDetails, setTransportationDetails] = useState(null);
  
  // Taşıma detaylarını yükle
  useEffect(() => {
    const loadDetails = async () => {
      try {
        const details = await transportationService.getTransportationDetails(transportationId);
        setTransportationDetails(details);
      } catch (error) {
        console.error('Taşıma detayları yüklenirken hata:', error);
      }
    };
    
    loadDetails();
  }, [transportationId]);
  
  if (loading || !transportationDetails) {
    return <CircularProgress sx={{ m: 2 }} size={20} />;
  }
  
  return (
    <Paper elevation={2} sx={{ mt: 2, p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Typography variant="h6">
            {transportationDetails.cargo_post?.title || `Taşıma #${transportationId}`}
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
            <Chip 
              label={`Durum: ${transportationDetails.status_display}`}
              color="primary"
            />
            <Chip 
              icon={<FiberManualRecord sx={{ color: connected ? 'success.main' : 'error.main' }} />}
              label={connected ? 'Canlı Bağlantı' : 'Bağlantı Yok'}
              variant="outlined"
            />
            {lastUpdate && (
              <Chip 
                icon={<MyLocation />}
                label={`Son Konum: ${formatDate(lastUpdate)}`}
                variant="outlined"
              />
            )}
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="textSecondary">
              Kargo Sahibi: {transportationDetails.cargo_owner?.company_name}
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              Taşıyıcı: {transportationDetails.transporter?.company_name}
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle2">
              <strong>Yükleme:</strong> {transportationDetails.cargo_post?.pickup_location || 'Belirtilmemiş'}
            </Typography>
            <Typography variant="subtitle2">
              <strong>Teslimat:</strong> {transportationDetails.cargo_post?.delivery_location || 'Belirtilmemiş'}
            </Typography>
            {transporterPosition && (
              <Typography variant="subtitle2">
                <strong>Güncel Konum:</strong> [{transporterPosition.lat.toFixed(4)}, {transporterPosition.lng.toFixed(4)}]
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default MultiLocationTracking;