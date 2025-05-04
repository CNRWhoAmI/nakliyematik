import React, { useState } from 'react'; // useEffect kaldırıldı
import { 
  AppBar, Toolbar, Typography, Button, Box, 
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  IconButton, Menu, MenuItem, Avatar, Drawer, List, ListItem, ListItemIcon, 
  ListItemText, Divider, Badge, useScrollTrigger, Slide, Tooltip
} from '@mui/material';
import { 
  AccountCircle, Dashboard, LocalShipping, Person, ExitToApp, Login, 
  Menu as MenuIcon, Notifications, Home, AddCircleOutline, ViewList,
  DirectionsCar, ReceiptLong
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { styled, alpha } from '@mui/material/styles';
import logoLight from '../../assets/images/nakliyematik-logo.svg';

// Navbar kayarken gölge efekti için
function HideOnScroll(props) {
  const { children } = props;
  const trigger = useScrollTrigger();

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

// Modern buton görünümü için özel styled bileşeni
// "active" yerine "isactive" string prop kullandık
const NavButton = styled(Button)(({ theme, isactive }) => ({
  margin: theme.spacing(0, 0.5),
  padding: theme.spacing(0.5, 1.5),
  borderRadius: '0px', // Köşeleri dikdörtgen yaptık
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.9rem',
  position: 'relative',
  transition: 'all 0.2s ease-in-out',
  ...(isactive === 'true' && {
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      width: '30%',
      height: '3px',
      bottom: '2px',
      left: '35%',
      backgroundColor: theme.palette.common.white,
      borderRadius: '0px' // Köşeleri dikdörtgen yaptık
    },
  }),
}));

// Modern avatar için özel styled bileşeni
const StyledAvatar = styled(Avatar)(({ theme }) => ({
  transition: 'transform 0.2s',
  border: `2px solid ${theme.palette.common.white}`,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  borderRadius: '0px', // Köşeleri dikdörtgen yaptık
  '&:hover': {
    transform: 'scale(1.1)',
  },
}));

function Navbar(props) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auth context değerlerini al
  const { 
    currentUser, 
    isAuthenticated, 
    isCargoOwner, 
    isTransporter,
    logout 
  } = useAuth();

  // Debug log
  console.log('Navbar - Auth state:', { 
    currentUser, 
    isAuthenticated, 
    isCargoOwner, 
    isTransporter 
  });

  // Dialog, menü ve çekmece için state
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const open = Boolean(anchorEl);
  
  // Kullanıcı menüsü için
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Mobil çekmece menüsü için
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogoutClick = () => {
    handleClose();
    setMobileOpen(false);
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setLogoutDialogOpen(false);
    navigate('/login');
  };

  // Aktif menü belirleme
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Kullanıcı tipi etiketi
  const getUserTypeLabel = () => {
    if (isCargoOwner) return 'Yük Sahibi';
    if (isTransporter) return 'Taşıyıcı';
    return 'Kullanıcı';
  };

  // Kullanıcı avatar'ı için harf
  const getAvatarLetter = () => {
    if (!currentUser?.username) return '';
    return currentUser.username.charAt(0).toUpperCase();
  };

  // Mobil çekmece içeriği
  const drawerContent = (
    <Box sx={{ width: 280 }} role="presentation">
      {isAuthenticated && currentUser ? (
        <>
          {/* Kullanıcı profil alanı */}
          <Box 
            sx={{ 
              p: 3, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
              color: 'white'
            }}
          >
            <StyledAvatar 
              sx={{ 
                width: 80, 
                height: 80,
                bgcolor: 'secondary.main', 
                mb: 2,
                fontSize: '2rem',
                borderRadius: '0px' // Köşeleri dikdörtgen yaptık
              }}
            >
              {getAvatarLetter() || <AccountCircle />}
            </StyledAvatar>
            <Typography variant="h6">{currentUser?.username || 'Kullanıcı'}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
              {getUserTypeLabel()}
            </Typography>
          </Box>
          
          <List sx={{ pt: 1 }}>
            <ListItem 
              button 
              onClick={() => { setMobileOpen(false); navigate('/dashboard'); }}
              selected={isActive('/dashboard')}
              sx={{ 
                borderLeft: isActive('/dashboard') ? 4 : 0, 
                borderColor: 'primary.main',
                pl: isActive('/dashboard') ? 2 : 3
              }}
            >
              <ListItemIcon>
                <Dashboard color={isActive('/dashboard') ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText 
                primary="Panel" 
                primaryTypographyProps={{
                  color: isActive('/dashboard') ? 'primary' : 'inherit',
                  fontWeight: isActive('/dashboard') ? 'medium' : 'regular'
                }}
              />
            </ListItem>
            
            {/* Taşımalar - YENİ! */}
            <ListItem 
              button 
              onClick={() => { setMobileOpen(false); navigate('/shipments'); }}
              selected={isActive('/shipments')}
              sx={{ 
                borderLeft: isActive('/shipments') ? 4 : 0, 
                borderColor: 'primary.main',
                pl: isActive('/shipments') ? 2 : 3
              }}
            >
              <ListItemIcon>
                <DirectionsCar color={isActive('/shipments') ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText 
                primary="Taşımalarım" 
                primaryTypographyProps={{
                  color: isActive('/shipments') ? 'primary' : 'inherit',
                  fontWeight: isActive('/shipments') ? 'medium' : 'regular'
                }}
              />
            </ListItem>
            
            {/* Tüm kullanıcılar için yük ilanları */}
            <ListItem 
              button 
              onClick={() => { setMobileOpen(false); navigate('/cargo'); }}
              selected={isActive('/cargo')}
              sx={{ 
                borderLeft: isActive('/cargo') ? 4 : 0, 
                borderColor: 'primary.main',
                pl: isActive('/cargo') ? 2 : 3
              }}
            >
              <ListItemIcon>
                <LocalShipping color={isActive('/cargo') ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText 
                primary="Yük İlanları" 
                primaryTypographyProps={{
                  color: isActive('/cargo') ? 'primary' : 'inherit',
                  fontWeight: isActive('/cargo') ? 'medium' : 'regular'
                }}
              />
            </ListItem>
            
            <Divider sx={{ my: 1 }} />
            
            {/* Yük sahibi için ekstra öğeler */}
            {isCargoOwner && (
              <>
                <ListItem 
                  button 
                  onClick={() => { setMobileOpen(false); navigate('/cargo/my-posts'); }}
                  selected={isActive('/cargo/my-posts')}
                  sx={{ 
                    borderLeft: isActive('/cargo/my-posts') ? 4 : 0, 
                    borderColor: 'primary.main',
                    pl: isActive('/cargo/my-posts') ? 2 : 3
                  }}
                >
                  <ListItemIcon>
                    <ViewList color={isActive('/cargo/my-posts') ? 'primary' : 'inherit'} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="İlanlarım" 
                    primaryTypographyProps={{
                      color: isActive('/cargo/my-posts') ? 'primary' : 'inherit',
                      fontWeight: isActive('/cargo/my-posts') ? 'medium' : 'regular'
                    }}
                  />
                </ListItem>
                
                <ListItem 
                  button 
                  onClick={() => { setMobileOpen(false); navigate('/cargo/create'); }}
                  selected={isActive('/cargo/create')}
                  sx={{ 
                    borderLeft: isActive('/cargo/create') ? 4 : 0, 
                    borderColor: 'primary.main',
                    pl: isActive('/cargo/create') ? 2 : 3
                  }}
                >
                  <ListItemIcon>
                    <AddCircleOutline color={isActive('/cargo/create') ? 'primary' : 'inherit'} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="İlan Ver" 
                    primaryTypographyProps={{
                      color: isActive('/cargo/create') ? 'primary' : 'inherit',
                      fontWeight: isActive('/cargo/create') ? 'medium' : 'regular'
                    }}
                  />
                </ListItem>
              </>
            )}
            
            {/* Taşıyıcı için ekstra öğeler */}
            {isTransporter && (
              <ListItem 
                button 
                onClick={() => { setMobileOpen(false); navigate('/offers/my'); }}
                selected={isActive('/offers/my')}
                sx={{ 
                  borderLeft: isActive('/offers/my') ? 4 : 0, 
                  borderColor: 'primary.main',
                  pl: isActive('/offers/my') ? 2 : 3
                }}
              >
                <ListItemIcon>
                  <ReceiptLong color={isActive('/offers/my') ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText 
                  primary="Tekliflerim" 
                  primaryTypographyProps={{
                    color: isActive('/offers/my') ? 'primary' : 'inherit',
                    fontWeight: isActive('/offers/my') ? 'medium' : 'regular'
                  }}
                />
              </ListItem>
            )}
            
            <Divider sx={{ my: 1 }} />
            
            <ListItem 
              button 
              onClick={() => { setMobileOpen(false); navigate('/profile'); }}
              selected={isActive('/profile')}
              sx={{ 
                borderLeft: isActive('/profile') ? 4 : 0, 
                borderColor: 'primary.main',
                pl: isActive('/profile') ? 2 : 3
              }}
            >
              <ListItemIcon>
                <Person color={isActive('/profile') ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText 
                primary="Profil" 
                primaryTypographyProps={{
                  color: isActive('/profile') ? 'primary' : 'inherit',
                  fontWeight: isActive('/profile') ? 'medium' : 'regular'
                }}
              />
            </ListItem>
          </List>
          
          {/* Çıkış butonu */}
          <Box sx={{ p: 2, mt: 1 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<ExitToApp />}
              onClick={handleLogoutClick}
              sx={{ borderRadius: 0 }} // Köşeleri dikdörtgen yaptık
            >
              Çıkış Yap
            </Button>
          </Box>
        </>
      ) : (
        <List>
          <ListItem button onClick={() => { setMobileOpen(false); navigate('/login'); }}>
            <ListItemIcon>
              <Login />
            </ListItemIcon>
            <ListItemText primary="Giriş Yap" />
          </ListItem>
          <ListItem button onClick={() => { setMobileOpen(false); navigate('/register'); }}>
            <ListItemIcon>
              <Person />
            </ListItemIcon>
            <ListItemText primary="Kayıt Ol" />
          </ListItem>
        </List>
      )}
    </Box>
  );

  return (
    <>
      <HideOnScroll {...props}>
        <AppBar 
          position="sticky"
          elevation={0}
          sx={{ 
            background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)', 
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: '0px' // Köşeleri dikdörtgen yaptık
          }}
        >
          <Toolbar>
            {/* Mobil için menü butonu */}
            {isAuthenticated && currentUser && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { md: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            {/* Logo */}
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                letterSpacing: '0.5px'
              }}
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
            >
              <Box
                component="img"
                src={logoLight}
                alt="Nakliyematik Logo"
                sx={{ 
                  height: 34,
                  mr: 1.5,
                  filter: 'brightness(3)', // Logoyu parlak beyaz yapıyor
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.05)'
                  }
                }}
              />
              Nakliyematik
            </Typography>
            
            {isAuthenticated && currentUser ? (
              <>
                {/* Büyük ekranlar için butonlar */}
                <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                    <NavButton 
                      color="inherit" 
                      startIcon={<Dashboard />}
                      onClick={() => navigate('/dashboard')}
                      isactive={isActive('/dashboard') ? 'true' : 'false'} // String olarak geçiriliyor
                    >
                      Panel
                    </NavButton>
                  
                  {/* Taşımalar butonu - YENİ! */}
                  <NavButton
                    color="inherit"
                    startIcon={<DirectionsCar />}
                    onClick={() => navigate('/shipments')}
                    isactive={location.pathname.startsWith('/shipments') ? 'true' : 'false'} // String olarak geçiriliyor
                  >
                    Taşımalarım
                  </NavButton>
                  
                  {/* Tüm kullanıcılar için yük ilanları */}
                  <NavButton 
                    color="inherit"
                    startIcon={<LocalShipping />}
                    onClick={() => navigate('/cargo')}
                    isactive={location.pathname === '/cargo' ? 'true' : 'false'} // String olarak geçiriliyor
                  >
                    Yük İlanları
                  </NavButton>
                  
                  {/* Yük sahibi için ekstra butonlar */}
                  {isCargoOwner && (
                    <>
                      <NavButton 
                        color="inherit"
                        startIcon={<ViewList />}
                        onClick={() => navigate('/cargo/my-posts')}
                        isactive={location.pathname === '/cargo/my-posts' ? 'true' : 'false'} // String olarak geçiriliyor
                      >
                        İlanlarım
                      </NavButton>
                      
                      <NavButton 
                        color="inherit"
                        startIcon={<AddCircleOutline />}
                        onClick={() => navigate('/cargo/create')}
                        isactive={location.pathname === '/cargo/create' ? 'true' : 'false'} // String olarak geçiriliyor
                      >
                        İlan Ver
                      </NavButton>
                    </>
                  )}
                  
                  {/* Taşıyıcı için ekstra butonlar */}
                  {isTransporter && (
                    <NavButton 
                      color="inherit"
                      startIcon={<ReceiptLong />}
                      onClick={() => navigate('/offers/my')}
                      isactive={location.pathname === '/offers/my' ? 'true' : 'false'} // String olarak geçiriliyor
                    >
                      Tekliflerim
                    </NavButton>
                  )}
                </Box>

                {/* Kullanıcı bilgisi - büyük ekran */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 2, alignItems: 'center' }}>
                  <Tooltip title="Bildirimler">
                    <IconButton color="inherit" size="large" sx={{ mx: 1 }}>
                      <Badge badgeContent={3} color="error">
                        <Notifications />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title="Profil ve Ayarlar">
                      <IconButton
                        size="small"
                        onClick={handleMenu}
                        color="inherit"
                        sx={{ ml: 1 }}
                      >
                        <StyledAvatar sx={{ 
                          width: 40, 
                          height: 40, 
                          bgcolor: 'secondary.main', 
                          fontSize: '1.2rem', 
                          borderRadius: '0px' // Köşeleri dikdörtgen yaptık
                        }}>
                          {getAvatarLetter() || <AccountCircle />}
                        </StyledAvatar>
                      </IconButton>
                    </Tooltip>
                    
                    <Box sx={{ display: { xs: 'none', lg: 'block' }, ml: 1 }}>
                      <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>{currentUser?.username || 'Kullanıcı'}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>{getUserTypeLabel()}</Typography>
                    </Box>
                  </Box>
                  
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
                    open={open}
                    onClose={handleClose}
                    PaperProps={{
                      elevation: 3,
                      sx: { 
                        mt: 1.5, 
                        minWidth: 200,
                        borderRadius: 0, // Köşeleri dikdörtgen yaptık
                        overflow: 'visible',
                        '&:before': {
                          content: '""',
                          display: 'block',
                          position: 'absolute',
                          top: 0,
                          right: 14,
                          width: 10,
                          height: 10,
                          bgcolor: 'background.paper',
                          transform: 'translateY(-50%) rotate(45deg)',
                          zIndex: 0,
                        },
                      },
                    }}
                  >
                    <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                        {currentUser?.username || 'Kullanıcı'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getUserTypeLabel()}
                      </Typography>
                    </Box>
                    <MenuItem onClick={() => { handleClose(); navigate('/profile'); }} sx={{ py: 1.5 }}>
                      <Person fontSize="small" sx={{ mr: 1.5 }} /> Profil
                    </MenuItem>
                    <MenuItem onClick={() => { handleClose(); navigate('/shipments'); }} sx={{ py: 1.5 }}>
                      <DirectionsCar fontSize="small" sx={{ mr: 1.5 }} /> Taşımalarım
                    </MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogoutClick} sx={{ py: 1.5, color: 'error.main' }}>
                      <ExitToApp fontSize="small" sx={{ mr: 1.5 }} /> Çıkış Yap
                    </MenuItem>
                  </Menu>
                </Box>
              </>
            ) : (
              // Oturum açmamış kullanıcılar için giriş butonu
              <Box>
                <Button 
                  color="inherit"
                  startIcon={<Login />}
                  onClick={() => navigate('/login')}
                  sx={{ 
                    mr: 1, 
                    borderRadius: 0, // Köşeleri dikdörtgen yaptık
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  Giriş Yap
                </Button>
                <Button 
                  variant="contained"
                  color="secondary"
                  onClick={() => navigate('/register')}
                  sx={{ 
                    borderRadius: 0, // Köşeleri dikdörtgen yaptık
                    boxShadow: 2,
                    textTransform: 'none',
                    backgroundColor: 'white',
                    color: 'primary.main',
                    fontWeight: 500,
                    '&:hover': {
                      backgroundColor: alpha('#ffffff', 0.9),
                    },
                  }}
                >
                  Kayıt Ol
                </Button>
              </Box>
            )}
          </Toolbar>
        </AppBar>
      </HideOnScroll>

      {/* Mobil için çekmece menü */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
            borderRadius: 0 // Köşeleri dikdörtgen yaptık
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Çıkış Onay Diyaloğu */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 0 } // Köşeleri dikdörtgen yaptık
        }}
      >
        <DialogTitle>Çıkış Yapılsın mı?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Oturumunuzu kapatmak istediğinize emin misiniz?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setLogoutDialogOpen(false)}
            sx={{ borderRadius: 0, textTransform: 'none' }} // Köşeleri dikdörtgen yaptık
          >
            İptal
          </Button>
          <Button 
            onClick={handleLogoutConfirm} 
            color="primary" 
            variant="contained"
            sx={{ borderRadius: 0, textTransform: 'none' }} // Köşeleri dikdörtgen yaptık
          >
            Çıkış Yap
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Navbar;