import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Grid, Paper, Typography, Card, CardContent,
    Button, Chip, CircularProgress, Box, Alert, Stack, Divider,
    Tooltip, TextField, MenuItem, FormControl, InputLabel, 
    Select, IconButton, Collapse, FormGroup, FormControlLabel, Checkbox
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import cargoService from '../../services/cargo.service';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
// SortIcon kullanılmadığı için import'u kaldırıyoruz
import RefreshIcon from '@mui/icons-material/Refresh';

const CargoList = () => {
    // cargoPosts state'ini kullanmadığımız için kaldırıyoruz
    // Sadece filteredPosts state'ini tutuyoruz
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    
    const { isCargoOwner } = useAuth();
    
    // Filtreleme için state değişkenleri
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        keyword: '',
        pickupLocation: '',
        deliveryLocation: '',
        cargoType: '',
        hasOffers: false,
        noOffers: false,
        priceMin: '',
        priceMax: ''
    });
    
    // Geçici filtreleme değerleri
    const [tempFilters, setTempFilters] = useState({
        keyword: '',
        pickupLocation: '',
        deliveryLocation: '',
        cargoType: '',
        hasOffers: false,
        noOffers: false,
        priceMin: '',
        priceMax: ''
    });

    // fetchCargoPosts fonksiyonunu useCallback ile sarıyoruz
    // böylece useEffect dependency array'inde kullanabiliriz
    const fetchCargoPosts = useCallback(async () => {
        try {
            setLoading(true);
            
            // Aktif filtreleri kullanarak verileri getir
            const data = await cargoService.getFilteredPosts(filters);
            
            console.log('Filtered cargo posts data:', data);
            // Artık sadece filteredPosts'u güncelliyoruz, cargoPosts'u kullanmıyoruz
            setFilteredPosts(data); 
            
            // Kendi ilanlarımızı da localStorage'a kaydedelim (isteğe bağlı)
            if (isCargoOwner) {
                try {
                    const myPosts = await cargoService.getMyPosts();
                    const myPostIds = myPosts.map(post => post.id);
                    localStorage.setItem('myCargoPostIds', JSON.stringify(myPostIds));
                } catch (err) {
                    console.error('Error fetching my posts:', err);
                }
            }
            
        } catch (err) {
            console.error('Error fetching cargo posts:', err);
            setError('İlanlar yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    }, [filters, isCargoOwner]); // filters ve isCargoOwner değiştiğinde yeniden oluştur
    
    useEffect(() => {
        fetchCargoPosts();
        
        // Sayfa yüklendiğinde veya çıkıldığında temizlik yap
        return () => {
            // Cleanup
        };
    }, [fetchCargoPosts]); // Artık fetchCargoPosts bir dependency
    
    // Geçici filtre değişikliklerini saklar
    const handleTempFilterChange = (e) => {
        const { name, value } = e.target;
        setTempFilters(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    };
    
    // Checkbox'ların değişikliklerini saklar
    const handleTempCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setTempFilters(prevFilters => ({
            ...prevFilters,
            [name]: checked
        }));
    };
    
    // Filtreleri uygula butonuna basıldığında
    const applyFilters = () => {
        // Geçici filtreleri gerçek filtrelere kopyala
        setFilters({...tempFilters});
        // fetchCargoPosts useEffect tarafından otomatik çağrılacak
        // çünkü filters değiştiğinde fetchCargoPosts yeniden oluşturulacak
    };
    
    // Filtreleri temizle
    const clearFilters = () => {
        const emptyFilters = {
            keyword: '',
            pickupLocation: '',
            deliveryLocation: '',
            cargoType: '',
            hasOffers: false,
            noOffers: false,
            priceMin: '',
            priceMax: ''
        };
        
        // Geçici ve gerçek filtreleri temizle
        setTempFilters(emptyFilters);
        setFilters(emptyFilters);
        // Verileri filtresiz yüklemek için fetchCargoPosts'u çağırmıyoruz
        // filters değiştiğinde useEffect onu otomatik yapacak
    };

    // "Yenile" butonuna tıklandığında
    const handleRefresh = () => {
        fetchCargoPosts();
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h4" component="h1">
                        Yük İlanları
                    </Typography>
                    <Box>
                        <Button 
                            variant="outlined" 
                            color="primary"
                            startIcon={<FilterListIcon />}
                            onClick={() => setShowFilters(!showFilters)}
                            sx={{ mr: 2 }}
                        >
                            {showFilters ? 'Filtreleri Gizle' : 'Filtrele'}
                        </Button>
                        {isCargoOwner && (
                            <Button 
                                variant="contained" 
                                color="primary"
                                onClick={() => navigate('/cargo/create')}
                            >
                                Yeni İlan Oluştur
                            </Button>
                        )}
                    </Box>
                </Grid>
                
                {/* Filtreleme Arayüzü */}
                <Grid item xs={12}>
                    <Collapse in={showFilters}>
                        <Paper sx={{ p: 3, mb: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>
                                        İlan Filtreleme
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Arama"
                                        name="keyword"
                                        value={tempFilters.keyword}
                                        onChange={handleTempFilterChange}
                                        InputProps={{
                                            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                                            endAdornment: tempFilters.keyword ? (
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => setTempFilters(prev => ({ ...prev, keyword: '' }))}
                                                >
                                                    <ClearIcon fontSize="small" />
                                                </IconButton>
                                            ) : null
                                        }}
                                        placeholder="Başlık veya açıklama ara"
                                        size="small"
                                    />
                                </Grid>
                                
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Alış Konumu"
                                        name="pickupLocation"
                                        value={tempFilters.pickupLocation}
                                        onChange={handleTempFilterChange}
                                        placeholder="Örn: İstanbul"
                                        size="small"
                                    />
                                </Grid>
                                
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Teslimat Konumu"
                                        name="deliveryLocation"
                                        value={tempFilters.deliveryLocation}
                                        onChange={handleTempFilterChange}
                                        placeholder="Örn: Ankara"
                                        size="small"
                                    />
                                </Grid>
                                
                                <Grid item xs={12} sm={6} md={4}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel id="cargo-type-label">Yük Tipi</InputLabel>
                                        <Select
                                            labelId="cargo-type-label"
                                            name="cargoType"
                                            value={tempFilters.cargoType}
                                            onChange={handleTempFilterChange}
                                            label="Yük Tipi"
                                        >
                                            <MenuItem value="">
                                                <em>Tümü</em>
                                            </MenuItem>
                                            <MenuItem value="general">Genel Kargo</MenuItem>
                                            <MenuItem value="bulk">Dökme Yük</MenuItem>
                                            <MenuItem value="container">Konteyner</MenuItem>
                                            <MenuItem value="breakbulk">Parça Yük</MenuItem>
                                            <MenuItem value="liquid">Sıvı</MenuItem>
                                            <MenuItem value="vehicle">Araç</MenuItem>
                                            <MenuItem value="machinery">Makine/Ekipman</MenuItem>
                                            <MenuItem value="furniture">Mobilya</MenuItem>
                                            <MenuItem value="dangerous">Tehlikeli Madde</MenuItem>
                                            <MenuItem value="other">Diğer</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                <Grid item xs={12} sm={6} md={4}>
                                    <FormGroup row>
                                        <FormControlLabel
                                            control={
                                                <Checkbox 
                                                    checked={tempFilters.hasOffers}
                                                    onChange={handleTempCheckboxChange}
                                                    name="hasOffers"
                                                    color="primary"
                                                />
                                            }
                                            label="Teklifli İlanlar"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox 
                                                    checked={tempFilters.noOffers}
                                                    onChange={handleTempCheckboxChange}
                                                    name="noOffers"
                                                    color="primary"
                                                />
                                            }
                                            label="Teklifsiz İlanlar"
                                        />
                                    </FormGroup>
                                </Grid>
                                
                                <Grid item xs={12} sm={6} md={4} display="flex">
                                    <TextField
                                        label="Min. Fiyat"
                                        name="priceMin"
                                        value={tempFilters.priceMin}
                                        onChange={handleTempFilterChange}
                                        type="number"
                                        InputProps={{ inputProps: { min: 0 } }}
                                        size="small"
                                        sx={{ width: '50%', mr: 1 }}
                                    />
                                    <TextField
                                        label="Maks. Fiyat"
                                        name="priceMax"
                                        value={tempFilters.priceMax}
                                        onChange={handleTempFilterChange}
                                        type="number"
                                        InputProps={{ inputProps: { min: 0 } }}
                                        size="small"
                                        sx={{ width: '50%' }}
                                    />
                                </Grid>
                                
                                <Grid item xs={12} display="flex" justifyContent="flex-end" gap={2}>
                                    <Button 
                                        variant="outlined" 
                                        color="secondary"
                                        onClick={clearFilters}
                                        startIcon={<ClearIcon />}
                                    >
                                        Filtreleri Temizle
                                    </Button>
                                    
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={applyFilters}
                                        startIcon={<FilterListIcon />}
                                    >
                                        Filtre Uygula
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Collapse>
                </Grid>
                
                {/* Sonuç Sayısı Göstergesi */}
                <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="body2" color="text.secondary">
                            Toplam {filteredPosts.length} ilan gösteriliyor
                        </Typography>
                        
                        <Button
                            variant="text"
                            color="primary"
                            size="small"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                        >
                            Yenile
                        </Button>
                    </Box>
                </Grid>

                {filteredPosts.length === 0 ? (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h6" color="text.secondary">
                                Arama kriterlerinize uygun ilan bulunamadı.
                            </Typography>
                        </Paper>
                    </Grid>
                ) : (
                    filteredPosts.map((post) => {
                        // Kesin sayısal değer olduğundan emin ol
                        const offerCount = typeof post.offer_count === 'number' ? post.offer_count : 0;
                        const hasOffers = offerCount > 0;
                        
                        return (
                            <Grid item xs={12} key={post.id}>
                                <Card 
                                    sx={{ 
                                        '&:hover': { 
                                            boxShadow: 6,
                                            transform: 'translateY(-2px)',
                                            transition: 'all 0.2s'
                                        },
                                        position: 'relative',
                                        overflow: 'visible'
                                    }}
                                >
                                    {/* Teklif sayısı etiketi */}
                                    <Tooltip title="Bu ilana yapılan toplam teklif sayısı">
                                        <Chip
                                            icon={<LocalOfferIcon fontSize="small" />}
                                            label={`${offerCount} Teklif`}
                                            color={hasOffers ? "primary" : "default"}
                                            size="small"
                                            sx={{ 
                                                position: 'absolute', 
                                                top: -10, 
                                                right: 16,
                                                fontWeight: hasOffers ? 'bold' : 'normal',
                                                zIndex: 1,
                                                boxShadow: hasOffers ? 2 : 0,
                                                bgcolor: hasOffers ? 'primary.main' : '#e0e0e0',
                                                '& .MuiChip-icon': { 
                                                    color: hasOffers ? 'white' : '#757575' 
                                                },
                                                color: hasOffers ? 'white' : '#757575',
                                                opacity: hasOffers ? 1 : 0.8
                                            }}
                                        />
                                    </Tooltip>
                                    
                                    <CardContent>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                    <Box sx={{ width: '70%' }}>
                                                        <Typography variant="h6" gutterBottom sx={{ 
                                                            fontWeight: 'medium', 
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {post.title}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <LocalShippingIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
                                                            {post.cargo_owner_name || 'İlan Sahibi'}
                                                        </Typography>
                                                    </Box>
                                                    <Stack direction="column" spacing={1} alignItems="flex-end">
                                                        <Chip 
                                                            icon={<AttachMoneyIcon />}
                                                            label={post.price ? `${Number(post.price).toLocaleString('tr-TR')} ₺` : 'Teklif Alınıyor'}
                                                            color="success"
                                                            variant="outlined"
                                                            sx={{ fontWeight: 'medium' }}
                                                        />
                                                    </Stack>
                                                </Box>
                                            </Grid>
                                            
                                            <Grid item xs={12}>
                                                <Divider sx={{ my: 1 }} />
                                            </Grid>
                                            
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <LocationOnIcon fontSize="small" color="primary" sx={{ mr: 0.5 }} />
                                                    <strong>Alış:</strong> {post.pickup_location}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5 }}>
                                                    <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.9rem', verticalAlign: 'middle' }} />
                                                    {post.pickup_date ? new Date(post.pickup_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                                                </Typography>
                                            </Grid>
                                            
                                            <Grid item xs={12} sm={6}>
                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <LocationOnIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />
                                                    <strong>Teslim:</strong> {post.delivery_location}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ ml: 3.5 }}>
                                                    <CalendarTodayIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.9rem', verticalAlign: 'middle' }} />
                                                    {post.delivery_date ? new Date(post.delivery_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                                                </Typography>
                                            </Grid>
                                            
                                            <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                                                {/* Sol tarafta teklif sayısı bilgisi */}
                                                <Box>
                                                    {!hasOffers ? (
                                                        <Typography 
                                                            variant="body2" 
                                                            color="text.secondary"
                                                            sx={{ 
                                                                fontStyle: 'italic',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            <LocalOfferIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.6 }} />
                                                            Henüz teklif yapılmadı
                                                        </Typography>
                                                    ) : offerCount <= 2 ? (
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                                color: '#f57c00',
                                                                fontWeight: 'medium',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            <LocalOfferIcon fontSize="small" sx={{ mr: 0.5, color: '#f57c00' }} />
                                                            Az rekabetli ilan ({offerCount} teklif)
                                                        </Typography>
                                                    ) : (
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                                color: '#d32f2f',
                                                                fontWeight: 'medium',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                        >
                                                            <LocalOfferIcon fontSize="small" sx={{ mr: 0.5, color: '#d32f2f' }} />
                                                            Rekabetli ilan ({offerCount} teklif)
                                                        </Typography>
                                                    )}
                                                </Box>
                                                
                                                {/* Sağ tarafta detay butonu */}
                                                <Button 
                                                    variant="outlined"
                                                    onClick={() => navigate(`/cargo/${post.id}`)}
                                                    sx={{ 
                                                        borderRadius: '20px',
                                                        px: 3,
                                                        '&:hover': { 
                                                            backgroundColor: 'primary.main', 
                                                            color: 'white' 
                                                        }
                                                    }}
                                                >
                                                    Detayları Gör
                                                </Button>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })
                )}
            </Grid>
        </Container>
    );
};

export default CargoList;