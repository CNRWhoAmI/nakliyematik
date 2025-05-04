/**
 * API isteklerinde kimlik doğrulama için header oluşturma
 * 
 * HTTP-only cookie tabanlı kimlik doğrulama için:
 * - Bearer token elle gönderilmez, çerezler otomatik gönderilir
 * - Tüm isteklerde withCredentials: true ayarı önemlidir
 * - Bu dosya, ek başlıklar veya işlemler için kullanılabilir
 */

// Temel kimlik doğrulama başlık fonksiyonu
function authHeader() {
  // HTTP-only cookie yaklaşımında bu fonksiyon boş bir nesne döndürmeli
  // çünkü kimlik doğrulama bilgileri çerezler aracılığıyla otomatik gönderilir
  return {};
}

// Özel başlıklar içeren bir auth header oluşturma
function customAuthHeader(additionalHeaders = {}) {
  return {
    ...additionalHeaders,
    // İhtiyaç halinde ek başlıklar buraya eklenebilir
    'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0',
    'X-Client-Platform': 'web',
  };
}

// Dosya yükleme istekleri için özel header
function fileUploadHeader() {
  return {
    'Content-Type': 'multipart/form-data',
    // HTTP-only cookie yaklaşımında kimlik doğrulama token'ı buraya eklenmez
  };
}

// İstek başarılı mı kontrol et (dev ortamı için log)
function logAuthStatus() {
  if (process.env.NODE_ENV !== 'production') {
    // Çerez varlığını kontrol et (sadece başlangıçta)
    const cookies = document.cookie;
    const hasAuthCookie = cookies.includes('access_token=') || cookies.includes('refresh_token=');
    
    console.log(
      `Auth status: ${hasAuthCookie ? 'Cookie mevcut' : 'Cookie yok'}`
    );
  }
}

// Auth durumunu test etme fonksiyonu
async function testAuthStatus(api) {
  try {
    // Bu fonksiyon ihtiyaç halinde backend ile oturum durumunu test edebilir
    const response = await api.get('/auth/user/');
    return {
      isAuthenticated: true,
      user: response.data
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      error: error.response?.status === 401 
        ? 'Oturum süresi dolmuş veya giriş yapılmamış' 
        : 'Kimlik doğrulama durumu kontrol edilirken bir hata oluştu'
    };
  }
}

// Tüm fonksiyonları export et
export { 
  authHeader as default, 
  customAuthHeader, 
  fileUploadHeader,
  logAuthStatus,
  testAuthStatus
};