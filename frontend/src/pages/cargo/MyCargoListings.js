import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Grid, Paper, Box, Button,
  Card, CardContent, CardActions, Divider, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Alert, IconButton, Chip
} from '@mui/material';
import {
  Refresh, AddCircle, Edit, Delete
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import cargoService from '../../services/cargo.service';

function MyCargoListings() {
  const navigate = useNavigate();
  const { currentUser, isCargoOwner } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  // fetchMyListings fonksiyonunu useCallback ile sarıyoruz
  // Bu fonksiyon yalnızca currentUser.id değiştiğinde yeniden oluşturulur
  const fetchMyListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching listings for user:', currentUser?.id);
      const data = await cargoService.getMyPosts();
      console.log('Fetched listings:', data);
      setListings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching my listings:', error);
      setError('İlanlarınız yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // İlanları yükle - fetchMyListings'i bağımlılık olarak ekledik
  useEffect(() => {
    // Yük sahibi değilse yönlendir
    if (!isCargoOwner) {
      console.log('User is not cargo owner, redirecting to home');
      navigate('/');
      return;
    }
    
    fetchMyListings();
  }, [isCargoOwner, navigate, fetchMyListings]);

  const handleOpenDeleteDialog = (listing) => {
    setSelectedListing(listing);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedListing(null);
  };

  const handleDeleteListing = async () => {
    if (!selectedListing) return;
    
    try {
      setLoading(true);
      console.log(`Deleting listing ${selectedListing.id}`);
      await cargoService.deleteCargoPost(selectedListing.id);
      console.log('Listing deleted successfully');
      
      // İlanları tekrar yükle
      await fetchMyListings();
      
      // Dialog'u kapat
      handleCloseDeleteDialog();
    } catch (error) {
      console.error('Error deleting listing:', error);
      setError('İlan silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setLoading(false);
    }
  };

  // Durum etiketi ve rengi
  const getStatusChip = (status) => {
    let label, color;
    switch(status) {
      case 'active':
        label = 'Aktif';
        color = 'success';
        break;
      case 'pending':
        label = 'Onay Bekliyor';
        color = 'warning';
        break;
      case 'completed':
        label = 'Tamamlandı';
        color = 'info';
        break;
      case 'cancelled':
        label = 'İptal Edildi';
        color = 'error';
        break;
      default:
        label = status || 'Bilinmiyor';
        color = 'default';
    }
    
    return (
      <Chip 
        label={label}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };

  // İlk yükleme durumunda loading göster
  if (loading && listings.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Başlık ve Yeni İlan Butonu */}
      <Grid container spacing={3}>
        <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" component="h1">
            İlanlarım
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<Refresh />} 
              onClick={fetchMyListings}
              sx={{ mr: 2 }}
              disabled={loading}
            >
              Yenile
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddCircle />}
              onClick={() => navigate('/cargo/create')}
            >
              Yeni İlan Ver
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Hata Mesajı */}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {/* İlanlar */}
      <Box sx={{ mt: 3 }}>
        {listings.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Henüz ilan oluşturmadınız.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddCircle />}
              onClick={() => navigate('/cargo/create')}
              sx={{ mt: 2 }}
            >
              İlk İlanınızı Oluşturun
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {listings.map((listing) => (
              <Grid item xs={12} key={listing.id}>
                <Card elevation={2} sx={{ '&:hover': { boxShadow: 6 } }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={8}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            {listing.title || 'İsimsiz İlan'}
                          </Typography>
                          {getStatusChip(listing.status)}
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Oluşturulma: {new Date(listing.created_at).toLocaleDateString('tr-TR')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
                          {listing.price ? `${listing.price.toLocaleString('tr-TR')} ₺` : 'Fiyat Belirtilmemiş'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Yükleme:
                        </Typography>
                        <Typography variant="body2">
                          {listing.pickup_location || 'Belirtilmemiş'} - {listing.pickup_date ? new Date(listing.pickup_date).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Teslim:
                        </Typography>
                        <Typography variant="body2">
                          {listing.delivery_location || 'Belirtilmemiş'} - {listing.delivery_date ? new Date(listing.delivery_date).toLocaleDateString('tr-TR') : 'Tarih belirtilmemiş'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                    <Button size="small" onClick={() => navigate(`/cargo/${listing.id}`)}>
                      Detayları Gör
                    </Button>
                    <IconButton 
                      color="primary" 
                      onClick={() => navigate(`/cargo/edit/${listing.id}`)}
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      onClick={() => handleOpenDeleteDialog(listing)}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Silme Onay Dialog'u */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"İlanı Silmeyi Onaylayın"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            <strong>{selectedListing?.title}</strong> ilanını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Vazgeç
          </Button>
          <Button 
            onClick={handleDeleteListing} 
            color="error"
            variant="contained"
            autoFocus
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default MyCargoListings;