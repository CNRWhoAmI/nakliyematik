import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Paper, Typography, Box, TextField, Button, Grid, 
  Tabs, Tab, CircularProgress, Alert, Avatar, Rating, 
  Card, CardContent, List, FormHelperText, Tooltip, LinearProgress, MenuItem
} from '@mui/material';
import { 
  Person, Edit, Save, Business, Phone, LocationOn, 
  Star, Email, Cancel, InfoOutlined, AddCircleOutline, DirectionsCar
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import profileService, { ProfileRequestStatus } from '../../services/profile.service';
import { useSnackbar } from 'notistack';

function Profile() {
  // State tanımlamaları
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [ratings, setRatings] = useState([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsError, setRatingsError] = useState(null);
  
  const { isCargoOwner, isTransporter } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Ortalama puanı hesapla ve formatla
  const calculateAverageRating = () => {
    if (!ratings || ratings.length === 0) return { value: 0, text: "0", outOf: "5" };
    
    // Ortalama hesapla
    const sum = ratings.reduce((total, r) => total + (parseFloat(r.rating) || 0), 0);
    const average = sum / ratings.length;
    
    // 1 ondalık basamak ile göster (4.0 yerine 4, 4.5 olarak)
    const formattedAverage = average % 1 === 0 ? average.toFixed(0) : average.toFixed(1);
    
    return { 
      value: average, 
      text: formattedAverage,
      outOf: "5"
    };
  };

  // Tab değiştirme işleyicisi
  const handleChangeTab = (event, newValue) => {
    setTabValue(newValue);
    
    // Değerlendirmeler sekmesine geçtiğinde ve henüz değerlendirmeler yüklenmediyse
    if (newValue === 1 && ratings.length === 0 && !ratingsLoading) {
      loadRatings();
    }
  };

  // Profil verilerini yükle
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileService.getProfile();
      console.log('Profil verileri yüklendi:', data);
      setProfileData(data);
      
      // Form verilerini profil verilerinden doldur
      // Email'in hem user objesi içinde hem de doğrudan ana objede olabileceğini kontrol et
      setFormData({
        firstName: data.user?.first_name || '',
        lastName: data.user?.last_name || '',
        email: data.user?.email || '', // API yanıtında email doğru şekilde alınıyor mu kontrol et
        companyName: data.company_name || '',
        phone: data.phone || '',
        address: data.address || '',
        vehicleType: data.vehicle_type || ''
      });
      
      setError(null);
    } catch (err) {
      console.error('Profil yüklenirken hata:', err);
      setError('Profil bilgileri yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
      enqueueSnackbar('Profil bilgileri yüklenirken bir hata oluştu', { 
        variant: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  // Değerlendirmeleri yükle
  const loadRatings = useCallback(async () => {
    if (!isCargoOwner && !isTransporter) return;
    
    setRatingsLoading(true);
    setRatingsError(null);
    
    try {
      let ratingsData = [];
      if (isCargoOwner) {
        ratingsData = await profileService.getCargoOwnerRatings();
      } else if (isTransporter) {
        ratingsData = await profileService.getTransporterRatings();
      }
      
      console.log('Değerlendirmeler yüklendi:', ratingsData);
      setRatings(Array.isArray(ratingsData) ? ratingsData : []);
    } catch (err) {
      console.error('Değerlendirmeler yüklenirken hata:', err);
      setRatingsError('Değerlendirmeler yüklenirken bir hata oluştu');
      // Boş dizi ayarla ki UI hata vermesin
      setRatings([]);
    } finally {
      setRatingsLoading(false);
    }
  }, [isCargoOwner, isTransporter]);

  // Düzenleme modunu aç/kapat
  const toggleEditMode = () => {
    if (editMode) {
      // Düzenleme modunu kapat ve form verilerini sıfırla
      setFormData({
        firstName: profileData?.user?.first_name || '',
        lastName: profileData?.user?.last_name || '',
        email: profileData?.user?.email || '',
        companyName: profileData?.company_name || '',
        phone: profileData?.phone || '',
        address: profileData?.address || '',
        vehicleType: profileData?.vehicle_type || ''
      });
      setFormErrors({});
    }
    setEditMode(!editMode);
  };

  // Input değişikliklerini izle ve form validasyonu yap
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Form alanı değiştiğinde ilgili hatayı temizle
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
    
    // Girilen değeri doğrula
    validateField(name, value);
  };
  
  // Tek alan için validasyon
  const validateField = (fieldName, value) => {
    let errors = { ...formErrors };
    
    switch(fieldName) {
      case 'firstName':
        if (!value || value.trim() === '') {
          errors.firstName = 'İsim gerekli';
        } else if (value.trim().length < 2) {
          errors.firstName = 'İsim en az 2 karakter olmalı';
        } else {
          delete errors.firstName;
        }
        break;
        
      case 'lastName':
        if (!value || value.trim() === '') {
          errors.lastName = 'Soyisim gerekli';
        } else if (value.trim().length < 2) {
          errors.lastName = 'Soyisim en az 2 karakter olmalı';
        } else {
          delete errors.lastName;
        }
        break;
        
      case 'email':
        if (!value || value.trim() === '') {
          errors.email = 'E-posta gerekli';
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          errors.email = 'Geçerli bir e-posta adresi girin';
        } else {
          delete errors.email;
        }
        break;
        
      case 'phone':
        if (!value || value.trim() === '') {
          errors.phone = 'Telefon numarası gerekli';
        } else if (!/^\+?[0-9\s\-()]{10,20}$/.test(value)) {
          errors.phone = 'Geçerli bir telefon numarası girin';
        } else {
          delete errors.phone;
        }
        break;
        
      case 'companyName':
        if (!value || value.trim() === '') {
          errors.companyName = 'Şirket adı gerekli';
        } else if (value.trim().length < 3) {
          errors.companyName = 'Şirket adı en az 3 karakter olmalı';
        } else {
          delete errors.companyName;
        }
        break;
        
      case 'address':
        if (!value || value.trim() === '') {
          errors.address = 'Adres gerekli';
        } else if (value.trim().length < 10) {
          errors.address = 'Adres en az 10 karakter olmalı';
        } else {
          delete errors.address;
        }
        break;
        
      default:
        break;
    }
    
    setFormErrors(errors);
    // Hata var mı kontrolü
    return Object.keys(errors).length === 0;
  };
  
  // Tüm formu doğrula
  const validateForm = () => {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'companyName', 'address'];
    let valid = true;
    
    for (const field of requiredFields) {
      const isFieldValid = validateField(field, formData[field] || '');
      valid = valid && isFieldValid;
    }
    
    return valid;
  };

  // Profil tamamlama yüzdesini hesapla
  const calculateProfileCompletion = () => {
    const fields = [
      profileData?.user?.first_name,
      profileData?.user?.last_name,
      profileData?.user?.email,
      profileData?.company_name,
      profileData?.phone,
      profileData?.address,
      profileData?.tax_number
    ];
    
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  // Profil güncelleme
  const handleUpdateProfile = async () => {
    try {
      setSavingProfile(true);
      
      // Tüm formu doğrula
      if (!validateForm()) {
        enqueueSnackbar('Lütfen form alanlarını doğru şekilde doldurunuz', { 
          variant: 'warning' 
        });
        setSavingProfile(false);
        return;
      }
      
      // E-posta değişip değişmediğini kontrol et
      const isEmailChanged = formData.email !== profileData?.user?.email;
      
      // API için hazırlanacak veriler
      const updateData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        company_name: formData.companyName,
        phone: formData.phone,
        address: formData.address,
        tax_number: profileData?.tax_number || ''
      };
      
      // Sadece e-posta değiştiyse ekle
      if (isEmailChanged) {
        updateData.email = formData.email;
        console.log('E-posta değişti, yeni değer gönderiliyor:', formData.email);
      } else {
        console.log('E-posta değişmedi, mevcut değer korunuyor');
      }
      
      // Taşıyıcı özel alanlarını ekle
      if (isTransporter && formData.vehicleType) {
        updateData.vehicle_type = formData.vehicleType;
        console.log('Araç tipi gönderiliyor:', formData.vehicleType);
      }
      
      console.log('Profile.js - Güncellenen profil verileri:', updateData);
      
      // İlgili profil tipine göre güncelleme fonksiyonunu çağır
      try {
        let updatedProfileData;
        if (isCargoOwner) {
          updatedProfileData = await profileService.updateCargoOwnerProfile(updateData, isEmailChanged);
        } else if (isTransporter) {
          updatedProfileData = await profileService.updateTransporterProfile(updateData, isEmailChanged);
        }
        
        console.log('Profile.js - Güncellenmiş profil yanıtı:', updatedProfileData);
        
        // Başarılı durumda
        if (updatedProfileData && updatedProfileData._updateStatus === ProfileRequestStatus.SUCCESS) {
          // Profil başarıyla güncellendi
          // Profil bilgilerini yeniden yükle
          await loadProfile();
          
          enqueueSnackbar('Profil bilgileriniz başarıyla güncellendi', { 
            variant: 'success' 
          });
          
          setEditMode(false);
        } else {
          throw new Error('Profil güncelleme başarısız oldu');
        }
      } catch (updateError) {
        console.error('Profile.js - Profil güncellenirken hata:', updateError);
        
        // Detaylı hata mesajını göster
        enqueueSnackbar(
          updateError.message || 'Profil güncellenirken bir hata oluştu', 
          { variant: 'error', autoHideDuration: 6000 }
        );
      }
    } catch (err) {
      console.error('Profile.js - Profil güncellenirken genel hata:', err);
      enqueueSnackbar('Profil güncellenirken beklenmeyen bir hata oluştu', { 
        variant: 'error' 
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // İlk yüklemede profil verilerini al
  useEffect(() => {
    loadProfile();
    // İlk yüklenirken değerlendirmeleri de çekelim
    loadRatings();
  }, [loadProfile, loadRatings]);
  
  // Profil kartını render et
  const renderProfileCard = () => {
    const averageRating = calculateAverageRating();
    const profileCompletion = calculateProfileCompletion();
    
    // Kullanıcının tam adını veya varsayılan değeri al
    const getDisplayName = () => {
      const firstName = profileData?.user?.first_name || '';
      const lastName = profileData?.user?.last_name || '';
      
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      
      return 'İsim Belirtilmemiş';
    };
    
    // Şirket adını veya varsayılan değeri al
    const getDisplayCompany = () => {
      return profileData?.company_name || (isCargoOwner ? 'Şirket Adı Belirtilmemiş' : 'Taşıyıcı Firma');
    };
    
    // Avatar için harf al
    const getAvatarLetter = () => {
      if (profileData?.company_name) {
        return profileData.company_name.charAt(0).toUpperCase();
      }
      
      if (profileData?.user?.first_name) {
        return profileData.user.first_name.charAt(0).toUpperCase();
      }
      
      return isCargoOwner ? 'Y' : 'T'; // Yük Sahibi veya Taşıyıcı
    };
    
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexDirection: { xs: 'column', sm: 'row' }
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: { xs: 2, sm: 0 }
            }}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mr: 2, 
                  bgcolor: isCargoOwner ? 'primary.main' : 'secondary.main',
                  fontSize: '2rem'
                }}
              >
                {getAvatarLetter()}
              </Avatar>
              <Box>
                <Typography variant="h5">
                  {getDisplayCompany()}
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    mt: 0.5,
                    color: getDisplayName() === 'İsim Belirtilmemiş' ? 'text.disabled' : 'text.primary',
                    fontStyle: getDisplayName() === 'İsim Belirtilmemiş' ? 'italic' : 'normal'
                  }}
                >
                  {getDisplayName()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isCargoOwner ? 'Yük Sahibi' : isTransporter ? 'Taşıyıcı' : 'Kullanıcı'}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: { xs: 'center', sm: 'flex-end' }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Rating 
                  value={averageRating.value} 
                  precision={0.5} 
                  readOnly 
                />
                <Typography variant="body1" sx={{ ml: 1, fontWeight: 'bold' }}>
                  {averageRating.text}/{averageRating.outOf}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {ratings.length} değerlendirme
              </Typography>
            </Box>
          </Box>
          
          {/* Profil tamamlama göstergesi */}
          {profileCompletion < 100 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <InfoOutlined fontSize="small" sx={{ mr: 0.5 }} />
                  Profil Tamamlama: %{profileCompletion}
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  color="primary" 
                  startIcon={<Edit />} 
                  onClick={() => {
                    setTabValue(0);
                    toggleEditMode();
                  }}
                >
                  Profili Tamamla
                </Button>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={profileCompletion} 
                sx={{ height: 8, borderRadius: 4 }}
                color={profileCompletion < 50 ? "warning" : "primary"}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };
  
  // "Belirtilmemiş" metni için özel stil
  const emptyFieldStyle = { 
    color: 'text.disabled',
    fontStyle: 'italic',
    display: 'inline-flex',
    alignItems: 'center'
  };
  
  // Profil bilgilerini render et
  const renderProfileInfo = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Profil Bilgileri
        </Typography>
        {/* Düzenleme modundayken buton gösterme, sadece normal moddayken "Düzenle" butonu göster */}
        {!editMode && (
          <Button 
            startIcon={<Edit />}
            variant="outlined"
            color="primary"
            onClick={toggleEditMode}
          >
            Düzenle
          </Button>
        )}
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Person color="action" sx={{ mr: 1, mt: 1 }} />
              {editMode ? (
                <TextField
                  fullWidth
                  label="Ad"
                  name="firstName"
                  value={formData.firstName || ''}
                  onChange={handleInputChange}
                  error={!!formErrors.firstName}
                  helperText={formErrors.firstName}
                  disabled={savingProfile}
                  required
                />
              ) : (
                <Box>
                  <Typography component="span"><strong>Ad:</strong> </Typography>
                  {profileData?.user?.first_name ? (
                    <Typography component="span">{profileData.user.first_name}</Typography>
                  ) : (
                    <Typography component="span" sx={emptyFieldStyle}>
                      Belirtilmemiş
                      <Tooltip title="Profilinizi düzenleyerek bu bilgiyi ekleyin">
                        <AddCircleOutline 
                          fontSize="small" 
                          color="action" 
                          sx={{ ml: 0.5, cursor: 'pointer' }} 
                          onClick={toggleEditMode}
                        />
                      </Tooltip>
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Person color="action" sx={{ mr: 1, mt: 1 }} />
              {editMode ? (
                <TextField
                  fullWidth
                  label="Soyad"
                  name="lastName"
                  value={formData.lastName || ''}
                  onChange={handleInputChange}
                  error={!!formErrors.lastName}
                  helperText={formErrors.lastName}
                  disabled={savingProfile}
                  required
                />
              ) : (
                <Box>
                  <Typography component="span"><strong>Soyad:</strong> </Typography>
                  {profileData?.user?.last_name ? (
                    <Typography component="span">{profileData.user.last_name}</Typography>
                  ) : (
                    <Typography component="span" sx={emptyFieldStyle}>
                      Belirtilmemiş
                      <Tooltip title="Profilinizi düzenleyerek bu bilgiyi ekleyin">
                        <AddCircleOutline 
                          fontSize="small" 
                          color="action" 
                          sx={{ ml: 0.5, cursor: 'pointer' }} 
                          onClick={toggleEditMode}
                        />
                      </Tooltip>
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Email color="action" sx={{ mr: 1, mt: 1 }} />
              {editMode ? (
                <TextField
                  fullWidth
                  label="E-posta"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  disabled={savingProfile}
                  required
                />
              ) : (
                <Box>
                  <Typography component="span"><strong>E-posta:</strong> </Typography>
                  {/* Hem profileData.user.email hem de direkt email'i kontrol et */}
                  {(profileData?.user?.email || profileData?.email) ? (
                    <Typography component="span">{profileData?.user?.email || profileData?.email}</Typography>
                  ) : (
                    <Typography component="span" sx={emptyFieldStyle}>
                      Belirtilmemiş
                      <Tooltip title="Profilinizi düzenleyerek bu bilgiyi ekleyin">
                        <AddCircleOutline 
                          fontSize="small" 
                          color="action" 
                          sx={{ ml: 0.5, cursor: 'pointer' }} 
                          onClick={toggleEditMode}
                        />
                      </Tooltip>
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Business color="action" sx={{ mr: 1, mt: 1 }} />
              {editMode ? (
                <TextField
                  fullWidth
                  label="Şirket Adı"
                  name="companyName"
                  value={formData.companyName || ''}
                  onChange={handleInputChange}
                  error={!!formErrors.companyName}
                  helperText={formErrors.companyName}
                  disabled={savingProfile}
                  required
                />
              ) : (
                <Box>
                  <Typography component="span"><strong>Şirket Adı:</strong> </Typography>
                  {profileData?.company_name ? (
                    <Typography component="span">{profileData.company_name}</Typography>
                  ) : (
                    <Typography component="span" sx={emptyFieldStyle}>
                      Belirtilmemiş
                      <Tooltip title="Profilinizi düzenleyerek bu bilgiyi ekleyin">
                        <AddCircleOutline 
                          fontSize="small" 
                          color="action" 
                          sx={{ ml: 0.5, cursor: 'pointer' }} 
                          onClick={toggleEditMode}
                        />
                      </Tooltip>
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Phone color="action" sx={{ mr: 1, mt: 1 }} />
              {editMode ? (
                <TextField
                  fullWidth
                  label="Telefon"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  error={!!formErrors.phone}
                  helperText={formErrors.phone || 'Örnek: +90 (555) 123 4567'}
                  disabled={savingProfile}
                  required
                />
              ) : (
                <Box>
                  <Typography component="span"><strong>Telefon:</strong> </Typography>
                  {profileData?.phone ? (
                    <Typography component="span">{profileData.phone}</Typography>
                  ) : (
                    <Typography component="span" sx={emptyFieldStyle}>
                      Belirtilmemiş
                      <Tooltip title="Profilinizi düzenleyerek bu bilgiyi ekleyin">
                        <AddCircleOutline 
                          fontSize="small" 
                          color="action" 
                          sx={{ ml: 0.5, cursor: 'pointer' }} 
                          onClick={toggleEditMode}
                        />
                      </Tooltip>
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <LocationOn color="action" sx={{ mr: 1, mt: 1 }} />
              {editMode ? (
                <TextField
                  fullWidth
                  label="Adres"
                  name="address"
                  multiline
                  rows={3}
                  value={formData.address || ''}
                  onChange={handleInputChange}
                  error={!!formErrors.address}
                  helperText={formErrors.address}
                  disabled={savingProfile}
                  required
                />
              ) : (
                <Box>
                  <Typography component="span" sx={{ display: 'block' }}><strong>Adres:</strong> </Typography>
                  {profileData?.address ? (
                    <Typography component="div" style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
                      {profileData.address}
                    </Typography>
                  ) : (
                    <Typography component="span" sx={emptyFieldStyle}>
                      Belirtilmemiş
                      <Tooltip title="Profilinizi düzenleyerek bu bilgiyi ekleyin">
                        <AddCircleOutline 
                          fontSize="small" 
                          color="action" 
                          sx={{ ml: 0.5, cursor: 'pointer' }} 
                          onClick={toggleEditMode}
                        />
                      </Tooltip>
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography component="span"><strong>Vergi No:</strong> </Typography>
            {profileData?.tax_number ? (
              <Typography component="span" sx={{ ml: 1 }}>
                {profileData.tax_number}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <Typography component="span" sx={emptyFieldStyle}>
                  Belirtilmemiş
                </Typography>
                <Typography variant="caption" color="error" sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
                  <InfoOutlined fontSize="small" sx={{ mr: 0.5 }} />
                  Güncellenmesi önerilir
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
        
        {/* Taşıyıcı kullanıcısı için özel alanlar */}
        {isTransporter && (
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <DirectionsCar color="action" sx={{ mr: 1, mt: 1 }} />
                {editMode ? (
                  <TextField
                    fullWidth
                    label="Araç Tipi"
                    name="vehicleType"
                    value={formData.vehicleType || ''}
                    onChange={handleInputChange}
                    error={!!formErrors.vehicleType}
                    helperText={formErrors.vehicleType}
                    disabled={savingProfile}
                    select
                    required
                  >
                    <MenuItem value="truck">Kamyon</MenuItem>
                    <MenuItem value="small_truck">Küçük Kamyon</MenuItem>
                    <MenuItem value="medium_truck">Orta Boy Kamyon</MenuItem>
                    <MenuItem value="large_truck">Büyük Kamyon</MenuItem>
                    <MenuItem value="semi_truck">Tır</MenuItem>
                    <MenuItem value="refrigerated_truck">Frigorifik Araç</MenuItem>
                    <MenuItem value="flatbed_truck">Açık Kasa</MenuItem>
                    <MenuItem value="tanker">Tanker</MenuItem>
                    <MenuItem value="container_truck">Konteyner Taşıyıcı</MenuItem>
                    <MenuItem value="car_carrier">Oto Taşıyıcı</MenuItem>
                    <MenuItem value="pickup">Kamyonet</MenuItem>
                    <MenuItem value="van">Van</MenuItem>
                    <MenuItem value="other">Diğer</MenuItem>
                  </TextField>
                ) : (
                  <Box>
                    <Typography component="span"><strong>Araç Tipi:</strong> </Typography>
                    {profileData?.vehicle_type ? (
                      <Typography component="span">
                        {getVehicleTypeDisplayName(profileData.vehicle_type)}
                      </Typography>
                    ) : (
                      <Typography component="span" sx={emptyFieldStyle}>
                        Belirtilmemiş
                        <Tooltip title="Profilinizi düzenleyerek bu bilgiyi ekleyin">
                          <AddCircleOutline 
                            fontSize="small" 
                            color="action" 
                            sx={{ ml: 0.5, cursor: 'pointer' }} 
                            onClick={toggleEditMode}
                          />
                        </Tooltip>
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </Grid>
        )}
        
        {editMode && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button 
                variant="outlined" 
                color="error" 
                onClick={toggleEditMode}
                sx={{ mr: 2 }}
                startIcon={<Cancel />}
                disabled={savingProfile}
              >
                İptal
              </Button>
              <Button 
                variant="contained" 
                color="success"
                onClick={handleUpdateProfile}
                startIcon={<Save />}
                disabled={savingProfile || Object.keys(formErrors).some(key => !!formErrors[key])}
              >
                {savingProfile ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </Box>
            {Object.keys(formErrors).some(key => !!formErrors[key]) && (
              <FormHelperText error sx={{ mt: 1, textAlign: 'right' }}>
                Lütfen formdaki hataları düzeltiniz
              </FormHelperText>
            )}
          </Grid>
        )}
      </Grid>
    </Paper>
  );
  
  // Tarih formatla
  const formatRatingDate = (dateStr) => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('tr-TR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }).format(date);
    } catch (err) {
      console.error('Tarih formatlarken hata:', err);
      return dateStr;
    }
  };

  // Araç tipinin gösterim adını al
  const getVehicleTypeDisplayName = (vehicleTypeValue) => {
    const vehicleTypes = {
      'truck': 'Kamyon',
      'small_truck': 'Küçük Kamyon',
      'medium_truck': 'Orta Boy Kamyon',
      'large_truck': 'Büyük Kamyon',
      'semi_truck': 'Tır',
      'refrigerated_truck': 'Frigorifik Araç',
      'flatbed_truck': 'Açık Kasa',
      'tanker': 'Tanker',
      'container_truck': 'Konteyner Taşıyıcı',
      'car_carrier': 'Oto Taşıyıcı',
      'pickup': 'Kamyonet',
      'van': 'Van',
      'other': 'Diğer'
    };
    
    return vehicleTypes[vehicleTypeValue] || vehicleTypeValue;
  };

  // Değerlendirmeleri göster
  const renderRatings = () => {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Değerlendirmeler
        </Typography>
        
        {ratingsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : ratingsError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {ratingsError}
          </Alert>
        ) : ratings.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Henüz değerlendirme bulunmamaktadır.
          </Alert>
        ) : (
          <List>
            {ratings.map((rating, index) => (
              <Card key={rating.id || index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Rating value={parseFloat(rating.rating) || 0} readOnly precision={0.5} />
                      <Typography variant="body2" sx={{ ml: 1, fontWeight: 'bold' }}>
                        {rating.rating} / 5
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatRatingDate(rating.created_at)}
                    </Typography>
                  </Box>
                  
                  {rating.comment ? (
                    <Typography variant="body1" sx={{ mt: 1, mb: 1, whiteSpace: 'pre-wrap' }}>
                      {rating.comment}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                      (Yorum yapılmadı)
                    </Typography>
                  )}
                  
                  {/* Taşıma detayı butonu */}
                  {rating.transportation?.id && (
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      mt: 2,
                      pt: 1,
                      borderTop: '1px solid rgba(0,0,0,0.12)'
                    }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        href={`/shipments/${rating.transportation.id}`}
                      >
                        Taşıma Detayı
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </Paper>
    );
  };

  // Yükleniyor durumunu göster
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Hata varsa göster
  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  // Ana görünüm
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Profil kartı */}
      {renderProfileCard()}
      
      {/* Sekmeler */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleChangeTab} aria-label="profile tabs">
          <Tab icon={<Person />} label="Profil" id="tab-0" />
          <Tab icon={<Star />} label="Değerlendirmeler" id="tab-1" />
        </Tabs>
      </Box>
      
      {/* Tab içerikleri */}
      {tabValue === 0 && renderProfileInfo()}
      {tabValue === 1 && renderRatings()}
    </Container>
  );
}

export default Profile;