/**
 * Format a date object or string to a localized date string
 * @param {Date|string} date - Date object or date string
 * @param {string} locale - Locale for formatting (default: 'tr-TR')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, locale = 'tr-TR') => {
    if (!date) return 'Belirtilmemiş';
    
    try {
      return new Date(date).toLocaleDateString(locale);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Geçersiz Tarih';
    }
  };
  
  /**
   * Format a date for HTML input elements (YYYY-MM-DD)
   * @param {Date|string} dateValue - Date to format
   * @returns {string} Date string in YYYY-MM-DD format
   */
  export const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    
    if (typeof dateValue === 'string') {
      // If date is string format (YYYY-MM-DD)
      return dateValue.split('T')[0];
    }
    
    if (dateValue instanceof Date) {
      // If date is Date object
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return '';
  };
  
  /**
   * Format a price for Turkish currency display
   * @param {number|string} price - Price to format
   * @returns {string} Formatted price with Turkish lira symbol
   */
  export const formatPrice = (price) => {
    if (price === null || price === undefined || price === '') return 'Belirtilmemiş';
    
    try {
      return `${Number(price).toLocaleString('tr-TR')} ₺`;
    } catch (error) {
      console.error('Price formatting error:', error);
      return 'Geçersiz Fiyat';
    }
  };
  
  /**
   * Format a measurement with unit
   * @param {number|string} value - Value to format
   * @param {string} unit - Unit to append
   * @returns {string} Formatted value with unit
   */
  export const formatMeasurement = (value, unit) => {
    if (value === null || value === undefined || value === '') return 'Belirtilmemiş';
    
    try {
      return `${Number(value).toLocaleString('tr-TR')} ${unit}`;
    } catch (error) {
      console.error('Measurement formatting error:', error);
      return 'Geçersiz Değer';
    }
  };
  
  /**
   * Get label for cargo type
   * @param {string} type - Cargo type code
   * @returns {string} Human-readable cargo type label
   */
  export const getCargoTypeLabel = (type) => {
    const cargoTypes = {
      'general': 'Genel Kargo',
      'fragile': 'Hassas/Kırılabilir',
      'heavy': 'Ağır Yük',
      'liquid': 'Sıvı',
      'refrigerated': 'Soğuk Zincir',
      'dangerous': 'Tehlikeli Madde',
      'machinery': 'Makine/Ekipman',
      'furniture': 'Mobilya',
      'other': 'Diğer'
    };
    
    return cargoTypes[type] || 'Belirtilmemiş';
  };
  
  /**
   * Get label for vehicle type
   * @param {string} type - Vehicle type code
   * @returns {string} Human-readable vehicle type label
   */
  export const getVehicleTypeLabel = (type) => {
    const vehicleTypes = {
      'truck': 'Kamyon',
      'semi_truck': 'Tır',
      'refrigerated_truck': 'Frigorifik',
      'tanker': 'Tanker',
      'container_truck': 'Konteyner Taşıyıcı',
      'car_carrier': 'Oto Taşıyıcı',
      'pickup': 'Kamyonet',
      'van': 'Van',
      'other': 'Diğer'
    };
    
    return vehicleTypes[type] || 'Belirtilmemiş';
  };
  
  /**
   * Get color and label for cargo status
   * @param {string} status - Status code
   * @returns {Object} Object with color and label properties
   */
  export const getStatusInfo = (status) => {
    const statusMap = {
      'active': { color: 'success', label: 'Aktif' },
      'pending': { color: 'warning', label: 'Beklemede' },
      'completed': { color: 'info', label: 'Tamamlandı' },
      'cancelled': { color: 'error', label: 'İptal Edildi' },
      'expired': { color: 'error', label: 'Süresi Doldu' },
      'in_transit': { color: 'info', label: 'Taşınıyor' },
      'accepted': { color: 'success', label: 'Kabul Edildi' },
      'rejected': { color: 'error', label: 'Reddedildi' },
      'withdrawn': { color: 'error', label: 'Geri Çekildi' }
    };
    
    return statusMap[status] || { color: 'default', label: 'Bilinmiyor' };
  };