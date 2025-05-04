from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.utils import timezone

class Transportation(models.Model):
    """
    Kabul edilen tekliflerden oluşturulan taşıma kaydı.
    Yük ve taşıyıcı arasındaki taşıma sürecini takip eder.
    """
    STATUS_CHOICES = [
        ('awaiting_pickup', _('Yükleme Bekliyor')),
        ('in_transit', _('Taşınıyor')),
        ('delivered', _('Teslim Edildi')),
        ('completed', _('Tamamlandı')),
        ('cancelled', _('İptal Edildi')),
    ]
    
    cargo_post = models.OneToOneField(
        'cargo.CargoPost',
        on_delete=models.SET_NULL,  # CASCADE yerine SET_NULL kullanıyoruz
        related_name="transportation",
        verbose_name=_('İlgili İlan'),
        null=True,  # Null değer izni zaten var
    )

    offer = models.OneToOneField(
        'offer.Offer',
        on_delete=models.CASCADE,
        related_name="transportation",
        verbose_name=_('Kabul Edilen Teklif'),
        null=True,  # Geçici olarak null değer izni
    )

    cargo_owner = models.ForeignKey(
        'Profile.CargoOwner',
        on_delete=models.CASCADE,
        related_name="transportations",
        verbose_name=_('Yük Sahibi'),
        null=True,  # Geçici olarak null değer izni
    )

    transporter = models.ForeignKey(
        'Profile.Transporter',
        on_delete=models.CASCADE,
        related_name="transportations",
        verbose_name=_('Taşıyıcı'),
        null=True,  # Geçici olarak null değer izni
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='awaiting_pickup',
        verbose_name=_('Durum')
    )
    
    # Yeni eklenen fiyat alanı
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_('Taşıma Ücreti')
    )
    
    # Konum bilgileri - Yeni eklenenler
    pickup_address = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name=_('Yükleme Adresi')
    )
    
    pickup_city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('Yükleme Şehri')
    )
    
    pickup_country = models.CharField(
        max_length=100,
        default='Türkiye',
        blank=True,
        verbose_name=_('Yükleme Ülkesi')
    )
    
    delivery_address = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name=_('Teslimat Adresi')
    )
    
    delivery_city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name=_('Teslimat Şehri')
    )
    
    delivery_country = models.CharField(
        max_length=100,
        default='Türkiye',
        blank=True,
        verbose_name=_('Teslimat Ülkesi')
    )
    
    # YENİ: Yükleme ve teslimat koordinatları
    pickup_latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_('Yükleme Noktası Enlemi')
    )
    
    pickup_longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_('Yükleme Noktası Boylamı')
    )
    
    delivery_latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_('Teslimat Noktası Enlemi')
    )
    
    delivery_longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_('Teslimat Noktası Boylamı')
    )
    
    # Tarih bilgileri - Yeni eklenenler
    estimated_pickup_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('Tahmini Yükleme Tarihi')
    )
    
    estimated_delivery_date = models.DateField(
        null=True,
        blank=True,
        verbose_name=_('Tahmini Teslimat Tarihi')
    )
    
    # Doğrudan yük bilgileri
    cargo_type = models.CharField(max_length=50, blank=True, null=True)
    weight = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    # Diğer mevcut alanlar
    # Onay mekanizmaları
    pickup_requested = models.BooleanField(
        default=False,
        verbose_name=_('Yükleme Talebi')
    )
    
    pickup_confirmed = models.BooleanField(
        default=False,
        verbose_name=_('Yükleme Onayı')
    )
    
    delivery_requested = models.BooleanField(
        default=False,
        verbose_name=_('Teslimat Talebi')
    )
    
    delivery_confirmed = models.BooleanField(
        default=False,
        verbose_name=_('Teslimat Onayı')
    )
    
    # Tarih bilgileri
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Oluşturulma Tarihi')
    )
    
    pickup_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Yükleme Talep Tarihi')
    )
    
    pickup_confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Yükleme Onay Tarihi')
    )
    
    delivery_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Teslimat Talep Tarihi')
    )
    
    delivery_confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Teslimat Onay Tarihi')
    )
    
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Tamamlanma Tarihi')
    )
    
    # İptal bilgileri
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('İptal Tarihi')
    )
    
    cancelled_by = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        choices=[
            ('cargo_owner', _('Yük Sahibi')),
            ('transporter', _('Taşıyıcı')),
            ('admin', _('Admin')),
        ],
        verbose_name=_('İptal Eden')
    )
    
    cancellation_reason = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('İptal Nedeni')
    )
    
    # Konum takibi için
    current_latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_('Güncel Enlem')
    )
    
    current_longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_('Güncel Boylam')
    )
    
    last_location_update = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Son Konum Güncellemesi')
    )
    
    estimated_arrival = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('Tahmini Varış')
    )
    
    def save(self, *args, **kwargs):
        # Cargo Post bilgilerini kopyala
        if self.cargo_post and not self.cargo_type:
            self.cargo_type = self.cargo_post.cargo_type
        
        if self.cargo_post and not self.weight:
            self.weight = self.cargo_post.weight
            
        # Teklif üzerinden Cargo Post bilgilerini kopyala
        if not self.cargo_post and self.offer and self.offer.cargo_post:
            if not self.cargo_type:
                self.cargo_type = self.offer.cargo_post.cargo_type
            if not self.weight:
                self.weight = self.offer.cargo_post.weight
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Taşıma #{self.id} - {self.get_status_display()}"
    
    class Meta:
        verbose_name = _('Taşıma')
        verbose_name_plural = _('Taşımalar')
        ordering = ['-created_at']


class TransportationUpdate(models.Model):
    """
    Taşıma sırasında yapılan güncellemeler ve notlar
    """
    transportation = models.ForeignKey(
        Transportation,
        on_delete=models.CASCADE,
        related_name='updates',
        verbose_name=_('Taşıma')
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Kullanıcı')
    )
    
    note = models.TextField(
        verbose_name=_('Not')
    )
    
    latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_('Enlem')
    )
    
    longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name=_('Boylam')
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Oluşturulma Tarihi')
    )
    
    def __str__(self):
        return f"Güncelleme: {self.created_at.strftime('%d/%m/%Y %H:%M')}"
    
    class Meta:
        verbose_name = _('Taşıma Güncelleme')
        verbose_name_plural = _('Taşıma Güncellemeleri')
        ordering = ['-created_at']


class TransportationRating(models.Model):
    """
    Taşıma tamamlandıktan sonra yapılan değerlendirmeler
    """
    transportation = models.ForeignKey(
        Transportation,
        on_delete=models.CASCADE,
        related_name='ratings',
        verbose_name=_('Taşıma')
    )
    
    from_cargo_owner = models.BooleanField(
        default=True,
        verbose_name=_('Yük Sahibinden')
    )
    
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name=_('Değerlendirme (1-5)')
    )
    
    comment = models.TextField(
        blank=True,
        verbose_name=_('Yorum')
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Değerlendirme Tarihi')
    )
    
    def __str__(self):
        source = "Yük Sahibi" if self.from_cargo_owner else "Taşıyıcı"
        return f"{source} Değerlendirme: {self.rating}/5"
    
    class Meta:
        verbose_name = _('Taşıma Değerlendirme')
        verbose_name_plural = _('Taşıma Değerlendirmeleri')
        unique_together = [['transportation', 'from_cargo_owner']]  # Bir kişi sadece bir kez değerlendirme yapabilir


class WebSocketToken(models.Model):
    """WebSocket bağlantıları için kısa ömürlü özel token"""
    token = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='websocket_tokens')
    transportation = models.ForeignKey('Transportation', on_delete=models.CASCADE, related_name='websocket_tokens')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'WebSocket Token'
        verbose_name_plural = 'WebSocket Tokens'
        indexes = [
            models.Index(fields=['user', 'transportation', 'is_used']),
            models.Index(fields=['token', 'is_used']),
        ]
    
    def is_valid(self):
        """Token geçerli mi kontrol et"""
        return not self.is_used and self.expires_at > timezone.now()
    
    def invalidate(self):
        """Token'ı kullanılmış olarak işaretle"""
        self.is_used = True
        self.last_used_at = timezone.now()
        self.save(update_fields=['is_used', 'last_used_at'])
        
    @classmethod
    def generate_for_user(cls, user, transportation_id, expiry_minutes=30):
        """Kullanıcı ve taşıma için token oluştur"""
        import secrets
        
        # Eski tokenları anında silme, 2 dakika örtüşme süresi ver
        # Bu sayede token yenileme sırasında kesinti olmaz
        old_tokens = cls.objects.filter(
            user=user, 
            transportation_id=transportation_id,
            is_used=False
        )
        
        # Geçerli tokenları 2 dakika daha tut
        for old_token in old_tokens:
            old_token.is_used = True  # Kullanılmış olarak işaretle ama silme
            old_token.expires_at = timezone.now() + timezone.timedelta(minutes=2)  # 2 dakika daha tut
            old_token.save(update_fields=['is_used', 'expires_at'])
        
        # Yeni token oluştur
        token = secrets.token_urlsafe(48)
        expires_at = timezone.now() + timezone.timedelta(minutes=expiry_minutes)
        
        ws_token = cls.objects.create(
            token=token,
            user=user,
            transportation_id=transportation_id,
            expires_at=expires_at
        )
        
        return ws_token


class LocationHistory(models.Model):
    """
    Taşıma sürecinde koordinat geçmişini kaydetmek için kullanılan model.
    Konum takibi ve rotanın görselleştirilmesi için kullanılır.
    """
    transportation = models.ForeignKey(
        Transportation,
        on_delete=models.CASCADE,
        related_name='locations',
        verbose_name=_('Taşıma')
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('Kullanıcı')
    )
    
    latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        verbose_name=_('Enlem')
    )
    
    longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        verbose_name=_('Boylam')
    )
    
    note = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_('Not')
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('Zaman')
    )
    
    def __str__(self):
        return f"Konum {self.id}: {self.timestamp.strftime('%d/%m/%Y %H:%M')}"
    
    class Meta:
        verbose_name = _('Konum Geçmişi')
        verbose_name_plural = _('Konum Geçmişleri')
        ordering = ['-timestamp']