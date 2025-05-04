import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Box, 
    Card, 
    CardContent,
    TextField, 
    Button, 
    Typography, 
    Alert,
    CircularProgress,
    MenuItem,
    LinearProgress,
    Stepper,
    Step,
    StepLabel,
    Paper,
    Divider,
    useTheme,
    Grid,
    InputAdornment
} from '@mui/material';
import {
    Person,
    Lock,
    Email,
    Phone,
    LocationOn,
    Business,
    LocalShipping,
    AccountCircle,
    Badge
} from '@mui/icons-material';
import authService from '../services/auth.service';

const Register = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        phone: '',
        address: '',
        tax_number: '',
        company_name: '',
        user_type: '',
        vehicle_type: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [activeStep, setActiveStep] = useState(0);
    const [isCheckingFields, setIsCheckingFields] = useState(false);

    const steps = ['Hesap Bilgileri', 'Firma Bilgileri', 'Kullanıcı Tipi'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Anlık doğrulama için
        validateField(name, value);
        
        // Şifre gücünü kontrol et
        if (name === 'password') {
            calculatePasswordStrength(value);
        }
        
        if (error) setError('');
    };

    // Şifre gücünü hesaplayan fonksiyon
    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length > 6) strength += 20;
        if (password.length > 10) strength += 20;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[^A-Za-z0-9]/.test(password)) strength += 20;
        
        setPasswordStrength(strength);
    };

    // Tek bir alanı doğrulayan fonksiyon
    const validateField = (name, value) => {
        let error = '';
        
        switch (name) {
            case 'username':
                if (!value) {
                    error = 'Kullanıcı adı zorunludur';
                } else if (value.length < 3) {
                    error = 'Kullanıcı adı en az 3 karakter olmalıdır';
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    error = 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir';
                }
                break;
            case 'password':
                if (!value) {
                    error = 'Şifre zorunludur';
                } else if (value.length < 6) {
                    error = 'Şifre en az 6 karakter olmalıdır';
                } else if (!/[A-Z]/.test(value)) {
                    error = 'Şifre en az bir büyük harf içermelidir';
                } else if (!/[0-9]/.test(value)) {
                    error = 'Şifre en az bir rakam içermelidir';
                }
                break;
            case 'email':
                if (!value) {
                    error = 'E-posta zorunludur';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'Geçerli bir e-posta adresi giriniz';
                }
                break;
            case 'phone':
                if (!value) {
                    error = 'Telefon zorunludur';
                } else if (!/^(\+?\d{1,3}[- ]?)?\d{10}$/.test(value)) {
                    error = 'Geçerli bir telefon numarası giriniz (örn: 05XX XXX XX XX)';
                }
                break;
            case 'tax_number':
                if (!value) {
                    error = 'Vergi numarası zorunludur';
                } else if (!/^\d{10}$/.test(value)) {
                    error = 'Vergi numarası 10 haneli olmalıdır';
                }
                break;
            case 'company_name':
                if (!value) {
                    error = 'Firma adı zorunludur';
                } else if (value.length < 2) {
                    error = 'Firma adı en az 2 karakter olmalıdır';
                }
                break;
            case 'user_type':
                if (!value) {
                    error = 'Kullanıcı tipi zorunludur';
                }
                break;
            case 'vehicle_type':
                if (formData.user_type === 'transporter' && !value) {
                    error = 'Araç tipi zorunludur';
                }
                break;
            case 'address':
                if (!value) {
                    error = 'Adres zorunludur';
                } else if (value.length < 5) {
                    error = 'Adres en az 5 karakter olmalıdır';
                }
                break;
            default:
                break;
        }
        
        setFieldErrors(prev => ({
            ...prev,
            [name]: error
        }));
        
        return !error;
    };

    const handleNext = async () => {
        // Temel validasyonu yap (formda eksiklik varsa devam etme)
        let canProceed = true;
        
        // Adımları doğrulama
        if (activeStep === 0) {
            // 1. adım: Hesap bilgileri doğrulaması
            canProceed = validateField('username', formData.username) &&
                         validateField('password', formData.password) &&
                         validateField('email', formData.email);
                         
            if (!canProceed) {
                setError('Lütfen tüm zorunlu alanları doğru şekilde doldurun.');
                return;
            }
            
            // API kontrolü yap
            try {
                setIsCheckingFields(true);
                setError('');
                
                // Username ve email kontrolü
                const fieldsToCheck = {
                    username: formData.username,
                    email: formData.email
                };
                
                const checkResult = await authService.checkRegistrationFields(fieldsToCheck);
                
                if (!checkResult.success) {
                    // Hata mesajlarını göster
                    if (checkResult.errors) {
                        const errorMessages = [];
                        
                        // Username hatası
                        if (checkResult.errors.username) {
                            setFieldErrors(prev => ({
                                ...prev,
                                username: checkResult.errors.username
                            }));
                            errorMessages.push(checkResult.errors.username);
                        }
                        
                        // Email hatası
                        if (checkResult.errors.email) {
                            setFieldErrors(prev => ({
                                ...prev,
                                email: checkResult.errors.email
                            }));
                            errorMessages.push(checkResult.errors.email);
                        }
                        
                        // Hataları göster
                        if (errorMessages.length > 0) {
                            setError(errorMessages.join('\n'));
                            return;
                        }
                    } else if (checkResult.message) {
                        setError(checkResult.message);
                        return;
                    }
                }
                
                // Hata yoksa ilerle
                setActiveStep(prevActiveStep => prevActiveStep + 1);
                
            } catch (err) {
                console.error('Field check error:', err);
                setError('Bilgileriniz kontrol edilirken bir hata oluştu.');
            } finally {
                setIsCheckingFields(false);
            }
            
        } else if (activeStep === 1) {
            // 2. adım: Firma bilgileri doğrulaması
            canProceed = validateField('company_name', formData.company_name) &&
                         validateField('tax_number', formData.tax_number) &&
                         validateField('phone', formData.phone) &&
                         validateField('address', formData.address);
                         
            if (!canProceed) {
                setError('Lütfen tüm zorunlu alanları doğru şekilde doldurun.');
                return;
            }
            
            // API kontrolü yap
            try {
                setIsCheckingFields(true);
                setError('');
                
                // Telefon ve vergi numarası kontrolü
                const fieldsToCheck = {
                    phone: formData.phone,
                    tax_number: formData.tax_number
                };
                
                const checkResult = await authService.checkRegistrationFields(fieldsToCheck);
                
                if (!checkResult.success) {
                    // Hata mesajlarını göster
                    if (checkResult.errors) {
                        const errorMessages = [];
                        
                        // Telefon hatası
                        if (checkResult.errors.phone) {
                            setFieldErrors(prev => ({
                                ...prev,
                                phone: checkResult.errors.phone
                            }));
                            errorMessages.push(checkResult.errors.phone);
                        }
                        
                        // Vergi numarası hatası
                        if (checkResult.errors.tax_number) {
                            setFieldErrors(prev => ({
                                ...prev,
                                tax_number: checkResult.errors.tax_number
                            }));
                            errorMessages.push(checkResult.errors.tax_number);
                        }
                        
                        // Hataları göster
                        if (errorMessages.length > 0) {
                            setError(errorMessages.join('\n'));
                            return;
                        }
                    } else if (checkResult.message) {
                        setError(checkResult.message);
                        return;
                    }
                }
                
                // Hata yoksa ilerle
                setActiveStep(prevActiveStep => prevActiveStep + 1);
                
            } catch (err) {
                console.error('Field check error:', err);
                setError('Bilgileriniz kontrol edilirken bir hata oluştu.');
            } finally {
                setIsCheckingFields(false);
            }
        } else if (activeStep === 2) {
            // 3. adım: Kullanıcı tipini doğrula ve kayıt işlemini gerçekleştir
            
            // Kullanıcı tipinin seçildiğinden emin ol
            if (!formData.user_type) {
                setError('Lütfen bir hesap tipi seçiniz.');
                return;
            }
            
            // Taşıyıcı tipinde araç tipinin seçildiğinden emin ol
            if (formData.user_type === 'transporter' && !formData.vehicle_type) {
                setFieldErrors(prev => ({
                    ...prev,
                    vehicle_type: 'Araç tipi seçmelisiniz'
                }));
                setError('Lütfen araç tipini seçiniz.');
                return;
            }
            
            // Kayıt işlemini başlat
            setIsLoading(true);
            setError('');
    
            try {
                let result;
                
                if (formData.user_type === 'cargo_owner') {
                    const registrationData = {
                        user: {
                            username: formData.username,
                            password: formData.password,
                            email: formData.email,
                            phone: formData.phone,
                            address: formData.address,
                            tax_number: formData.tax_number,
                            company_name: formData.company_name,
                            user_type: formData.user_type
                        },
                        company_name: formData.company_name,
                        phone: formData.phone,
                        tax_number: formData.tax_number,
                        address: formData.address
                    };
                    
                    console.log('Registering cargo owner with data:', registrationData);
                    result = await authService.registerCargoOwner(registrationData);
                } else if (formData.user_type === 'transporter') {
                    const registrationData = {
                        user: {
                            username: formData.username,
                            password: formData.password,
                            email: formData.email,
                            phone: formData.phone,
                            address: formData.address,
                            tax_number: formData.tax_number,
                            company_name: formData.company_name,
                            user_type: formData.user_type
                        },
                        company_name: formData.company_name,
                        vehicle_type: formData.vehicle_type,
                        phone: formData.phone,
                        tax_number: formData.tax_number,
                        address: formData.address
                    };
                    
                    console.log('Registering transporter with data:', registrationData);
                    result = await authService.registerTransporter(registrationData);
                }
                
                console.log('Registration successful:', result);
                
                // Başarılı kayıt sonrası login sayfasına yönlendir
                navigate('/login', { 
                    state: { 
                        registerSuccess: true, 
                        message: 'Kaydınız başarıyla tamamlandı. Lütfen giriş yapınız.' 
                    } 
                });
            } catch (err) {
                console.error('Register error:', err);
                
                if (err.response?.data?.user?.username) {
                    setError(`Kullanıcı adı hatası: ${err.response.data.user.username[0]}`);
                    setFieldErrors(prev => ({
                        ...prev,
                        username: err.response.data.user.username[0]
                    }));
                } else if (err.response?.data?.user?.email) {
                    setError(`E-posta hatası: ${err.response.data.user.email[0]}`);
                    setFieldErrors(prev => ({
                        ...prev,
                        email: err.response.data.user.email[0]
                    }));
                } else if (err.response?.data?.detail) {
                    setError(err.response.data.detail);
                } else if (err.message) {
                    setError(err.message);
                } else {
                    setError('Kayıt işlemi başarısız. Lütfen tekrar deneyin.');
                }
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleBack = () => {
        setActiveStep(prevActiveStep => prevActiveStep - 1);
        setError('');
    };

    // Şifre gücü göstergesi rengi
    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 20) return 'error';
        if (passwordStrength <= 60) return 'warning';
        return 'success';
    };

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <>
                        <Typography variant="h6" color="primary" gutterBottom>
                            Hesap Bilgileriniz
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        <TextField
                            fullWidth
                            label="Kullanıcı Adı"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            onBlur={(e) => validateField('username', e.target.value)}
                            margin="normal"
                            required
                            disabled={isLoading}
                            error={!!fieldErrors.username}
                            helperText={fieldErrors.username}
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
                            fullWidth
                            label="Şifre"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={(e) => validateField('password', e.target.value)}
                            margin="normal"
                            required
                            disabled={isLoading}
                            error={!!fieldErrors.password}
                            helperText={fieldErrors.password || (
                                formData.password ? 'Büyük harf, rakam ve özel karakter kullanın' : ''
                            )}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Lock color="primary" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 0.5 }}
                        />
                        
                        {formData.password && (
                            <Box sx={{ width: '100%', mb: 3, mt: 1, px: 1 }}>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={passwordStrength} 
                                    color={getPasswordStrengthColor()}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">Zayıf</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={passwordStrength > 20 && passwordStrength <= 60 ? 'bold' : 'normal'}>
                                        Orta
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">Güçlü</Typography>
                                </Box>
                            </Box>
                        )}
                        
                        <TextField
                            fullWidth
                            label="E-posta"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            onBlur={(e) => validateField('email', e.target.value)}
                            margin="normal"
                            required
                            disabled={isLoading}
                            error={!!fieldErrors.email}
                            helperText={fieldErrors.email}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Email color="primary" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2 }}
                        />
                    </>
                );
            case 1:
                return (
                    <>
                        <Typography variant="h6" color="primary" gutterBottom>
                            Firma Bilgileriniz
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        <TextField
                            fullWidth
                            label="Firma Adı"
                            name="company_name"
                            value={formData.company_name}
                            onChange={handleChange}
                            onBlur={(e) => validateField('company_name', e.target.value)}
                            margin="normal"
                            required
                            disabled={isLoading}
                            error={!!fieldErrors.company_name}
                            helperText={fieldErrors.company_name}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Business color="primary" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2 }}
                        />
                        
                        <TextField
                            fullWidth
                            label="Vergi Numarası"
                            name="tax_number"
                            value={formData.tax_number}
                            onChange={handleChange}
                            onBlur={(e) => validateField('tax_number', e.target.value)}
                            margin="normal"
                            required
                            disabled={isLoading}
                            error={!!fieldErrors.tax_number}
                            helperText={fieldErrors.tax_number || "10 haneli vergi numaranızı giriniz"}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Badge color="primary" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2 }}
                        />
                        
                        <TextField
                            fullWidth
                            label="Telefon"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            onBlur={(e) => validateField('phone', e.target.value)}
                            margin="normal"
                            required
                            disabled={isLoading}
                            error={!!fieldErrors.phone}
                            helperText={fieldErrors.phone || "Örnek: 05XXXXXXXXX"}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Phone color="primary" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2 }}
                        />
                        
                        <TextField
                            fullWidth
                            label="Adres"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            onBlur={(e) => validateField('address', e.target.value)}
                            margin="normal"
                            required
                            multiline
                            rows={2}
                            disabled={isLoading}
                            error={!!fieldErrors.address}
                            helperText={fieldErrors.address}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                                        <LocationOn color="primary" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ mb: 2 }}
                        />
                    </>
                );
            case 2:
                return (
                    <>
                        <Typography variant="h6" color="primary" gutterBottom>
                            Hesap Tipiniz
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <Paper
                                    elevation={formData.user_type === 'cargo_owner' ? 3 : 1}
                                    onClick={() => handleChange({ target: { name: 'user_type', value: 'cargo_owner' } })}
                                    sx={{
                                        p: 3,
                                        cursor: 'pointer',
                                        borderRadius: 2,
                                        transition: 'all 0.3s',
                                        border: formData.user_type === 'cargo_owner' ? `2px solid ${theme.palette.primary.main}` : '1px solid #ddd',
                                        '&:hover': {
                                            boxShadow: 3,
                                            bgcolor: 'background.paper'
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Business color={formData.user_type === 'cargo_owner' ? 'primary' : 'inherit'} sx={{ mr: 2, fontSize: 40 }} />
                                        <Box>
                                            <Typography variant="h6" color={formData.user_type === 'cargo_owner' ? 'primary' : 'inherit'}>
                                                Yük Sahibi
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Nakliye hizmeti almak için yük sahibi olarak kaydolun
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            </Grid>
                            
                            <Grid item xs={12}>
                                <Paper
                                    elevation={formData.user_type === 'transporter' ? 3 : 1}
                                    onClick={() => handleChange({ target: { name: 'user_type', value: 'transporter' } })}
                                    sx={{
                                        p: 3,
                                        cursor: 'pointer',
                                        borderRadius: 2,
                                        transition: 'all 0.3s',
                                        border: formData.user_type === 'transporter' ? `2px solid ${theme.palette.primary.main}` : '1px solid #ddd',
                                        '&:hover': {
                                            boxShadow: 3,
                                            bgcolor: 'background.paper'
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <LocalShipping color={formData.user_type === 'transporter' ? 'primary' : 'inherit'} sx={{ mr: 2, fontSize: 40 }} />
                                        <Box>
                                            <Typography variant="h6" color={formData.user_type === 'transporter' ? 'primary' : 'inherit'}>
                                                Taşıyıcı
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Nakliye hizmeti vermek için taşıyıcı olarak kaydolun
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>

                        {formData.user_type === 'transporter' && (
                            <TextField
                                select
                                fullWidth
                                label="Araç Tipi"
                                name="vehicle_type"
                                value={formData.vehicle_type}
                                onChange={handleChange}
                                onBlur={(e) => validateField('vehicle_type', e.target.value)}
                                margin="normal"
                                required
                                disabled={isLoading}
                                error={!!fieldErrors.vehicle_type}
                                helperText={fieldErrors.vehicle_type}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LocalShipping color="primary" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mt: 3, mb: 2 }}
                            >
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
                        )}

                        {!formData.user_type && (
                            <Typography 
                                color="error" 
                                variant="body2" 
                                sx={{ mt: 2, textAlign: 'center' }}
                            >
                                Lütfen bir hesap tipi seçiniz.
                            </Typography>
                        )}
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <Box 
            sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                bgcolor: theme.palette.mode === 'light' ? '#f5f5f5' : 'background.default',
                py: 4
            }}
        >
            <Card 
                sx={{ 
                    maxWidth: 700, 
                    width: '100%', 
                    m: 2,
                    borderRadius: 2,
                    overflow: 'visible',
                    boxShadow: theme.shadows[6]
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                        <AccountCircle color="primary" sx={{ fontSize: 38, mr: 1.5 }} />
                        <Typography 
                            variant="h4" 
                            component="h1" 
                            fontWeight="500"
                            color="primary"
                        >
                            Hesap Oluştur
                        </Typography>
                    </Box>
                    
                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    
                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ mb: 3, borderRadius: 2 }}
                            onClose={() => setError('')}
                        >
                            {error.split('\n').map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                        </Alert>
                    )}
                    
                    <form onSubmit={(e) => { e.preventDefault(); }}>
                        {renderStepContent(activeStep)}
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                disabled={activeStep === 0 || isLoading}
                                onClick={handleBack}
                                sx={{ borderRadius: '50px', px: 3 }}
                            >
                                Geri
                            </Button>
                            
                            {activeStep === steps.length - 1 ? (
                                <Button
                                variant="contained"
                                color="primary"
                                onClick={handleNext}
                                disabled={isLoading || isCheckingFields}
                                sx={{ 
                                    borderRadius: '50px',
                                    px: 3,
                                    position: 'relative'
                                }}
                            >
                                {isCheckingFields ? (
                                    <>
                                        <CircularProgress 
                                            size={24}
                                            sx={{
                                                position: 'absolute',
                                                left: '50%',
                                                marginLeft: '-12px'
                                            }}
                                            color="inherit"
                                        />
                                        <span style={{ visibility: 'hidden' }}>
                                            İleri
                                        </span>
                                    </>
                                ) : (
                                    'İleri'
                                )}
                            </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleNext}
                                    sx={{ borderRadius: '50px', px: 3 }}
                                >
                                    İleri
                                </Button>
                            )}
                        </Box>
                    </form>
                    
                    <Box sx={{ textAlign: 'center', mt: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="body2" color="text.secondary">
                            Zaten bir hesabınız var mı?{' '}
                            <Link 
                                to="/login" 
                                style={{ 
                                    color: theme.palette.primary.main,
                                    textDecoration: 'none',
                                    fontWeight: 500
                                }}
                            >
                                Giriş Yap
                            </Link>
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Register;