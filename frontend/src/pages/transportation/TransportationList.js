import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Grid, Box, CircularProgress, Alert,
  Tabs, Tab, FormControl, Select, InputLabel, MenuItem, Paper
} from '@mui/material';
// Divider'ı kaldırdık
import transportationService from '../../services/transportation.service';
import { useAuth } from '../../contexts/AuthContext';
import TransportationCard from './components/TransportationCard';
import EmptyState from '../../components/EmptyState';
import FilterListIcon from '@mui/icons-material/FilterList';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

function TransportationList() {
  const navigate = useNavigate();
  const { isCargoOwner, isTransporter } = useAuth();
  const [transportations, setTransportations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [sortBy, setSortBy] = useState('date-desc');
  
  // Taşımaları yükle
  useEffect(() => {
    const fetchTransportations = async () => {
      try {
        setLoading(true);
        const data = await transportationService.getTransportations();
        console.log('Fetched transportations:', data);
        setTransportations(data);
      } catch (error) {
        console.error('Error fetching transportations:', error);
        setError('Taşımalar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransportations();
  }, []);

  // Tab değiştirme
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Sıralama değiştirme
  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  // Status'a göre taşımaları filtrele
  const getFilteredTransportations = () => {
    let filtered = [...transportations];
    
    // Tab filtresi
    switch(tabValue) {
      case 0: // Tümü
        break;
      case 1: // Aktif (Yükleme Bekliyor + Taşınıyor)
        filtered = filtered.filter(t => 
          ['awaiting_pickup', 'in_transit'].includes(t.status));
        break;
      case 2: // Tamamlanan
        filtered = filtered.filter(t => 
          ['delivered', 'completed', 'rated'].includes(t.status));
        break;
      case 3: // İptal Edilen
        filtered = filtered.filter(t => t.status === 'cancelled');
        break;
      default:
        break;
    }
    
    // Sıralama
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'date-asc':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'date-desc':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
    
    return filtered;
  };

  const filteredTransportations = getFilteredTransportations();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Taşımalarım
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {isCargoOwner ? 'Yüklerinizin' : 'Yaptığınız taşımaların'} durumunu takip edin
        </Typography>
      </Box>

      <Paper elevation={1} sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterListIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1">Filtrele ve Sırala</Typography>
          </Box>
          
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel id="sort-select-label">Sıralama</InputLabel>
            <Select
              labelId="sort-select-label"
              id="sort-select"
              value={sortBy}
              label="Sıralama"
              onChange={handleSortChange}
            >
              <MenuItem value="date-desc">En Yeni</MenuItem>
              <MenuItem value="date-asc">En Eski</MenuItem>
              <MenuItem value="status">Durum</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          aria-label="transportation status tabs"
        >
          <Tab label="Tümü" />
          <Tab label="Aktif" />
          <Tab label="Tamamlanan" />
          <Tab label="İptal Edilen" />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {filteredTransportations.length === 0 ? (
            <EmptyState 
              icon={<LocalShippingIcon sx={{ fontSize: 60 }} />}
              title="Taşıma Bulunamadı"
              description={tabValue === 0 
                ? "Henüz hiç taşıma kaydınız bulunmuyor."
                : "Bu kategoride taşıma bulunmuyor."
              }
              actionText={isTransporter ? "İlanları Keşfet" : "İlan Ver"}
              actionLink={isTransporter ? "/cargo" : "/cargo/create"}
            />
          ) : (
            <Grid container spacing={3}>
              {filteredTransportations.map((transportation) => (
                <Grid item xs={12} key={transportation.id}>
                  <TransportationCard 
                    transportation={transportation}
                    onClick={() => navigate(`/shipments/${transportation.id}`)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Container>
  );
}

export default TransportationList;