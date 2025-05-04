import api from './api';

class WebSocketService {
  constructor() {
    this.connections = {}; // Her taşıma ID'si için ayrı bir bağlantı saklar
    this.reconnectTimeouts = {}; // Yeniden bağlanma zamanlayıcıları
    this.maxReconnectAttempts = 5; // Maksimum yeniden bağlanma denemesi
    this.reconnectAttempts = {}; // Taşıma ID'sine göre bağlantı deneme sayısı
    this.reconnectInterval = 3000; // MS cinsinden yeniden bağlanma aralığı
  }

  /**
   * Belirli bir taşıma için WebSocket tokeni alır
   * @param {string|number} transportationId - Taşıma ID'si
   * @returns {Promise<string>} Token veya null
   */
  async getWebSocketToken(transportationId) {
    try {
      console.log(`[WS] ${transportationId} için token alınıyor...`);
      
      const response = await api.get(`/transportations/${transportationId}/websocket-token/`);
      
      console.log(`[WS] Token yanıtı:`, response.status);
      
      if (response.data && response.data.token) {
        console.log(`[WS] ${transportationId} için token alındı`);
        return response.data.token;
      }
      
      console.warn(`[WS] ${transportationId} için token alınamadı: Token döndürülmedi`);
      return null;
    } catch (error) {
      // Hata mesajını daha detaylı logla
      console.error(`[WS] Token alınamadı: ${transportationId}`, error);
      
      if (error.response) {
        // Backend'den gelen hata mesajı
        console.error(`[WS] Backend hatası: ${error.response.status}`, error.response.data);
        
        // Hataya göre spesifik eylemler
        if (error.response.status === 403) {
          console.error('[WS] Erişim yetkisi yok. Kullanıcı bu taşıma için yetkilendirilmemiş.');
        }
      }
      
      return null;
    }
  }

  /**
   * Taşıma ID'sine göre WebSocket bağlantısı kurar
   * @param {string|number} transportationId - Taşıma ID'si
   * @param {Object} callbacks - Bağlantı olayları için callback fonksiyonları
   * @returns {Promise<WebSocket>} - WebSocket bağlantısı
   */
  async connect(transportationId, callbacks = {}) {
    if (!transportationId) {
      throw new Error('Taşıma ID\'si gereklidir');
    }

    // Eğer bu ID için zaten bir bağlantı varsa, mevcut bağlantıyı dön
    if (this.connections[transportationId] && 
        this.connections[transportationId].readyState === WebSocket.OPEN) {
      console.log(`[WS] ${transportationId} için zaten aktif bir bağlantı var`);
      return this.connections[transportationId];
    }

    try {
      // Önceki bağlantı varsa temizle
      if (this.connections[transportationId]) {
        this.cleanupConnection(transportationId);
      }

      // API URL'sini al
      const baseUrl = this.getBaseUrl();
      const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
      
      // Özel token al
      let token = null;
      try {
        token = await this.getWebSocketToken(transportationId);
      } catch (error) {
        console.warn(`[WS] Token alınamadı, token olmadan devam ediliyor:`, error.message);
      }
      
      // WebSocket URL'si oluştur
      let wsUrl = `${wsBaseUrl}/ws/transportation/${transportationId}/`;
      
      // Token varsa URL'e ekle
      if (token) {
        wsUrl += `?token=${token}`;
        console.log(`[WS] Token ile bağlantı kuruluyor: ${wsUrl}`);
      } else {
        console.warn(`[WS] Token olmadan bağlantı kuruluyor (yetkilendirme hatası olabilir)`);
      }
      
      console.log(`[WS] Bağlantı kuruluyor: ${transportationId}`);
      
      // WebSocket bağlantısı oluştur
      const ws = new WebSocket(wsUrl);
      
      // Bağlantıyı sakla
      this.connections[transportationId] = ws;
      this.reconnectAttempts[transportationId] = 0;

      // Olay dinleyicileri ekle
      ws.onopen = (event) => {
        console.log(`[WS] Bağlantı açıldı: ${transportationId}`);
        this.reconnectAttempts[transportationId] = 0;
        if (callbacks.onOpen) callbacks.onOpen(event);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (callbacks.onMessage) callbacks.onMessage(data);
        } catch (error) {
          console.error(`[WS] Mesaj ayrıştırma hatası: ${transportationId}`, error);
        }
      };

      ws.onclose = (event) => {
        console.log(`[WS] Bağlantı kapandı: ${transportationId}`, event);
        
        // Callback mekanizması ile state güncellemesi
        if (callbacks.onClose) {
          // Kapanma kodlarına göre farklı mesajlar
          let errorMessage = null;
          
          if (event.code === 1000) {
            // Normal kapanma
            console.log('Bağlantı normal şekilde kapandı');
          } else if (event.code === 1011) {
            console.error('Sunucu tarafında bir hata oluştu (1011)');
            errorMessage = 'Sunucu bağlantısında bir sorun oluştu. Kısa bir süre sonra tekrar bağlanmayı deneyeceğiz.';
          } else if (event.code === 4001) {
            errorMessage = 'Bu taşımaya erişim yetkiniz yok.';
          }
          
          // Hata mesajı varsa callback ile bildir
          callbacks.onClose(event, errorMessage);
        }

        // 1000 - Başarılı kapanma, diğer durumlarda yeniden bağlan
        if (event.code !== 1000 && event.code !== 1001) {
          this.attemptReconnect(transportationId, callbacks);
        }
      };

      ws.onerror = (error) => {
        console.error(`[WS] Bağlantı hatası: ${transportationId}`, error);
        
        if (callbacks.onError) {
          // Hata mesajını callback ile bildir
          callbacks.onError(error, 'Taşıma takip sistemine bağlanırken bir sorun oluştu. Lütfen tekrar deneyin.');
        }
      };

      return ws;
    } catch (error) {
      console.error(`[WS] Bağlantı kurulurken hata: ${transportationId}`, error);
      throw error;
    }
  }

  /**
   * WebSocket için API temel URL'sini oluşturur
   * @returns {string} - API temel URL'si
   */
  getBaseUrl() {
    // API modülünden baseURL'i al 
    if (api && api.defaults && api.defaults.baseURL) {
      return api.defaults.baseURL;
    }
    
    // Sunucuya göre otomatik belirle
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      // Production ortamında aynı domain'i kullan
      return window.location.origin;
    } else {
      // Development ortamında varsayılan backend adresi
      return 'http://localhost:8000';
    }
  }

  /**
   * Belirli bir taşıma için bağlantıyı kapatır
   * @param {string|number} transportationId - Taşıma ID'si
   */
  disconnect(transportationId) {
    if (!transportationId) {
      // ID yoksa tüm bağlantıları kapat
      return this.disconnectAll();
    }

    // Kapanış mesajı gönder - nazik çıkış
    if (this.connections[transportationId] && 
        this.connections[transportationId].readyState === WebSocket.OPEN) {
      try {
        this.connections[transportationId].send(JSON.stringify({
          type: 'disconnect',
          message: 'Client disconnecting gracefully'
        }));
      } catch (err) {
        console.warn(`[WS] Kapanış mesajı gönderilemedi: ${err.message}`);
      }
    }

    this.cleanupConnection(transportationId);
    console.log(`[WS] Bağlantı kapatıldı: ${transportationId}`);
  }

  /**
   * Tüm WebSocket bağlantılarını kapatır
   */
  disconnectAll() {
    Object.keys(this.connections).forEach(id => {
      this.cleanupConnection(id);
    });
    console.log('[WS] Tüm bağlantılar kapatıldı');
  }

  /**
   * Belirli bir taşıma için bağlantı temizliği yapar
   * @param {string|number} transportationId - Taşıma ID'si
   */
  cleanupConnection(transportationId) {
    // Yeniden bağlanma zamanlayıcısını temizle
    if (this.reconnectTimeouts[transportationId]) {
      clearTimeout(this.reconnectTimeouts[transportationId]);
      delete this.reconnectTimeouts[transportationId];
    }

    // WebSocket bağlantısını kapat
    const connection = this.connections[transportationId];
    if (connection) {
      if (connection.readyState === WebSocket.OPEN || 
          connection.readyState === WebSocket.CONNECTING) {
        connection.close(1000, "Client disconnected");
      }
      delete this.connections[transportationId];
    }
  }

  /**
   * Yeniden bağlanma girişiminde bulunur
   * @param {string|number} transportationId - Taşıma ID'si
   * @param {Object} callbacks - Bağlantı olayları için callback fonksiyonları
   */
  attemptReconnect(transportationId, callbacks) {
    // Yeniden bağlanma denemesi sayısını artır
    this.reconnectAttempts[transportationId] = (this.reconnectAttempts[transportationId] || 0) + 1;
    
    // Maksimum deneme sayısını kontrol et
    if (this.reconnectAttempts[transportationId] > this.maxReconnectAttempts) {
      console.log(`[WS] Maksimum yeniden bağlanma denemesi aşıldı: ${transportationId}`);
      return;
    }

    // Yeniden bağlanma zamanlayıcısını ayarla
    const timeout = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts[transportationId] - 1);
    console.log(`[WS] ${timeout}ms sonra yeniden bağlanılacak: ${transportationId}`);
    
    this.reconnectTimeouts[transportationId] = setTimeout(() => {
      console.log(`[WS] Yeniden bağlanma girişimi: ${transportationId}`);
      this.connect(transportationId, callbacks).catch(error => {
        console.error(`[WS] Yeniden bağlanma hatası: ${transportationId}`, error);
      });
    }, timeout);
  }

  /**
   * Konum güncellemesi gönderir
   * @param {string|number} transportationId - Taşıma ID'si
   * @param {number} latitude - Enlem
   * @param {number} longitude - Boylam
   * @param {string} note - Konum notu
   * @returns {boolean} - Başarı durumu
   */
  updateLocation(transportationId, latitude, longitude, note = '') {
    try {
      const ws = this.connections[transportationId];
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error(`[WS] Aktif bağlantı yok: ${transportationId}`);
        return false;
      }

      // Konum mesajı gönder (note parametresi varsayılan olarak boş string)
      ws.send(JSON.stringify({
        type: 'location_update',
        latitude,
        longitude,
        note
      }));

      return true;
    } catch (error) {
      console.error(`[WS] Konum güncellenirken hata: ${transportationId}`, error);
      return false;
    }
  }

  /**
   * Kullanıcı durumu değişikliğini bildirir (çevrimiçi/çevrimdışı)
   * @param {string|number} transportationId - Taşıma ID'si
   * @param {boolean} isOnline - Çevrimiçi durumu
   */
  updateUserStatus(transportationId, isOnline = true) {
    if (!transportationId || !this.connections[transportationId] || 
        this.connections[transportationId].readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message = JSON.stringify({
        type: 'user_status',
        isOnline: isOnline
      });
      
      this.connections[transportationId].send(message);
      return true;
    } catch (error) {
      console.error(`[WS] Kullanıcı durumu güncellenirken hata: ${transportationId}`, error);
      return false;
    }
  }

  /**
   * Belirli bir taşıma için bağlantı durumunu kontrol eder
   * @param {string|number} transportationId - Taşıma ID'si
   * @returns {boolean} - Bağlantı açık mı?
   */
  isConnected(transportationId) {
    return !!(this.connections[transportationId] && 
              this.connections[transportationId].readyState === WebSocket.OPEN);
  }

  /**
   * Tüm aktif bağlantıları getirir
   * @returns {Object} - Taşıma ID'lerine göre bağlantı durumları
   */
  getAllConnections() {
    const connectionStates = {};
    Object.keys(this.connections).forEach(id => {
      connectionStates[id] = {
        readyState: this.connections[id].readyState,
        isConnected: this.connections[id].readyState === WebSocket.OPEN
      };
    });
    return connectionStates;
  }
}

const websocketService = new WebSocketService();
export default websocketService;