# backend/transportation/consumers.py

import json
import time
import logging
import traceback
from decimal import Decimal
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from .models import Transportation, TransportationUpdate, LocationHistory

logger = logging.getLogger(__name__)
User = get_user_model()

# Decimal serileştirebilen JSON encoder
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# Decimal uyumlu JSON dump fonksiyonu
def json_dumps(data):
    return json.dumps(data, cls=DecimalEncoder)

class TransportationConsumer(AsyncWebsocketConsumer):
    """
    Her bir taşıma için WebSocket bağlantısını yöneten Consumer sınıfı.
    Odaları (groups) taşıma ID'sine göre ayrıştırır.
    """

    async def connect(self):
        """WebSocket bağlantısı başlatma"""
        try:
            # URL'den taşıma ID'sini al
            self.transportation_id = self.scope['url_route']['kwargs']['transportation_id']
            logger.info(f"WS bağlantısı isteği: Taşıma {self.transportation_id}")
            
            # Kullanıcı bilgisi
            self.user = self.scope["user"]
            logger.info(f"WS bağlantısı açıldı: Kullanıcı {self.user.username} - Taşıma {self.transportation_id}")
            
            # Taşıma erişim izni kontrolü
            has_access = await self.check_transportation_access()
            if not has_access:
                logger.warning(f"Yetkisiz bağlantı girişimi: {self.user.username} - Taşıma {self.transportation_id}")
                await self.close(code=4001)
                return
            
            # Grup adı oluştur
            self.transportation_group_name = f'transportation_{self.transportation_id}'
            
            # Kanala katıl
            await self.channel_layer.group_add(
                self.transportation_group_name,
                self.channel_name
            )
            
            # Bağlantıyı kabul et
            await self.accept()
            
            # Kullanıcı tipini belirle
            try:
                self.user_type = await self.get_user_type()
                logger.info(f"Kullanıcı tipi belirlendi: {self.user_type}")
            except Exception as e:
                logger.error(f"Kullanıcı tipi belirlenirken hata: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                self.user_type = "unknown"
            
            # Giriş bildirimi gönder
            try:
                await self.channel_layer.group_send(
                    self.transportation_group_name,
                    {
                        'type': 'user_connected',
                        'message': {
                            'type': 'user_connected',
                            'user_id': self.user.id,
                            'user_type': self.user_type,
                            'timestamp': timezone.now().isoformat()
                        }
                    }
                )
            except Exception as e:
                logger.error(f"Giriş bildirimi gönderilirken hata: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                
        except Exception as e:
            logger.error(f"WebSocket bağlantısında beklenmeyen hata: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """WebSocket bağlantısı sonlandırma"""
        try:
            # Kullanıcı null kontrolü yap
            user_info = "Anonim"
            if hasattr(self, 'user') and self.user:
                user_info = f"{self.user.id} ({self.user.username})"
            
            transportation_id = getattr(self, 'transportation_id', 'Bilinmiyor')
            
            logger.info(f"WS bağlantısı kapandı: Kullanıcı {user_info} - Taşıma {transportation_id} - Kod: {close_code}")
            
            # Grup adı kontrolü
            if hasattr(self, 'transportation_group_name') and self.channel_name:
                await self.channel_layer.group_discard(
                    self.transportation_group_name,
                    self.channel_name
                )
        except Exception as e:
            logger.error(f"WS disconnect hatası: {e}")

    async def receive(self, text_data):
        """İstemciden gelen mesajları işle"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # Konum güncellemesi
            if message_type == 'location_update':
                # Taşıyıcı kontrolü
                is_transporter = await self.is_transporter()
                if not is_transporter:
                    logger.warning(f"Taşıyıcı olmayan kullanıcı konum güncellemesi yapamaz: {self.user.id}")
                    return
                
                latitude = data.get('latitude')
                longitude = data.get('longitude')
                note = data.get('note', '')
                
                if latitude and longitude:
                    # Konumu kaydet
                    await self.save_location_update(latitude, longitude, note)
                    
                    # Bildirim ekle
                    data['last_update'] = timezone.now().isoformat()
                    
                    # Gruba yayınla
                    await self.channel_layer.group_send(
                        self.transportation_group_name,
                        {
                            'type': 'location_update',
                            'message': data
                        }
                    )
            
            # Ping/pong mesajları
            elif message_type == 'ping':
                await self.send(text_data=json_dumps({
                    'type': 'pong',
                    'timestamp': time.time()
                }))
                
        except json.JSONDecodeError:
            logger.error(f"JSON ayrıştırma hatası: {text_data}")
            
        except Exception as e:
            logger.error(f"Mesaj işleme hatası: {e}")

    async def send(self, text_data=None, bytes_data=None, close=False):
        """
        Decimal tiplerini işleyebilen özel send metodu
        """
        if text_data is not None and isinstance(text_data, dict):
            # Dict verisini özel encoder ile serileştir
            text_data = json_dumps(text_data)
        return await super().send(text_data, bytes_data, close)

    async def location_update(self, event):
        """Grup üzerinden alınan konum güncellemesini ilgili istemcilere ilet"""
        try:
            # Özel JSON encoder kullan
            await self.send(text_data=json_dumps(event['message']))
        except Exception as e:
            logger.error(f"location_update mesajı gönderilirken hata: {str(e)}")
            logger.error(traceback.format_exc())

    async def user_connected(self, event):
        """Kullanıcı bağlantı bildirimini ilgili istemcilere ilet"""
        try:
            # Özel JSON encoder kullan
            await self.send(text_data=json_dumps(event['message']))
        except Exception as e:
            logger.error(f"user_connected mesajı gönderilirken hata: {str(e)}")
            logger.error(traceback.format_exc())

    @database_sync_to_async
    def check_transportation_access(self):
        """Kullanıcının taşımaya erişim izni olup olmadığını kontrol eder"""
        try:
            # Anonim kullanıcı kontrolü
            if self.user.is_anonymous:
                logger.warning(f"Anonim kullanıcı erişim hatası - Taşıma {self.transportation_id}")
                return False
                
            # Admin her zaman erişebilir
            if self.user.is_staff:
                return True
                
            # Taşımayı bul
            transportation = Transportation.objects.get(id=self.transportation_id)
            
            # 1. Taşıyıcı kontrolü - Direkt User kontrolü yap
            if transportation.transporter and hasattr(transportation.transporter, 'user'):
                if transportation.transporter.user_id == self.user.id:
                    logger.info(f"Taşıyıcı erişimi onaylandı: {self.user.username}")
                    return True
            
            # 2. Yük sahibi kontrolü - Direkt User kontrolü yap
            if transportation.cargo_owner and hasattr(transportation.cargo_owner, 'user'):
                if transportation.cargo_owner.user_id == self.user.id:
                    logger.info(f"Yük sahibi erişimi onaylandı: {self.user.username}")
                    return True
                    
            # Eğer bu noktaya geldiyse, erişimi yok demektir
            logger.warning(f"Erişim reddedildi: {self.user.username} - Taşıma {self.transportation_id}")
            return False
            
        except Exception as e:
            logger.error(f"Erişim kontrolü sırasında hata: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    @database_sync_to_async
    def is_transporter(self):
        """Kullanıcının taşıyıcı olup olmadığını kontrol et"""
        try:
            transportation = Transportation.objects.get(id=self.transportation_id)
            
            # Yönetici her zaman güncelleyebilir
            if self.user.is_staff or self.user.is_superuser:
                return True
                
            # Taşıyıcı kontrolü
            if transportation.transporter_id == self.user.id:
                return True
                
            # Şirket üyesi kontrolü
            if hasattr(self.user, 'company'):
                user_company = self.user.company
                if transportation.transporter and transportation.transporter.company_id == user_company.id:
                    return True
                    
            return False
        except ObjectDoesNotExist:
            return False
        except Exception as e:
            logger.error(f"Taşıyıcı kontrolü hatası: {e}")
            return False

    @database_sync_to_async
    def save_location_update(self, latitude, longitude, note=''):
        """Konum güncellemesini veritabanına kaydet"""
        try:
            transportation = Transportation.objects.get(id=self.transportation_id)
            
            # TransportationUpdate kullanılıyor (TransportationLocationUpdate yerine)
            update = TransportationUpdate.objects.create(
                transportation=transportation,
                latitude=latitude,
                longitude=longitude,
                note=note,
                user=self.user  # updated_by yerine user kullanılıyor 
            )
            
            # Ayrıca konum geçmişini de kaydet
            LocationHistory.objects.create(
                transportation=transportation,
                latitude=latitude,
                longitude=longitude,
                note=note,
                user=self.user
            )
            
            # Taşıma modelini güncelle
            transportation.current_latitude = latitude
            transportation.current_longitude = longitude
            transportation.last_location_update = timezone.now()
            transportation.save(update_fields=['current_latitude', 'current_longitude', 'last_location_update'])
            
            logger.info(f"Konum güncellendi: Taşıma {self.transportation_id} - Konum: [{latitude}, {longitude}]")
            return update
        except Exception as e:
            logger.error(f"Konum güncelleme hatası: {e}")
            return None
    
    @database_sync_to_async
    def get_current_location(self):
        """Mevcut konum bilgisini getir"""
        try:
            latest_location = LocationHistory.objects.filter(
                transportation_id=self.transportation_id
            ).order_by('-created_at').first()
            
            if latest_location:
                # Decimal değerleri float'a dönüştür
                return {
                    'type': 'location_update',
                    'latitude': float(latest_location.latitude),
                    'longitude': float(latest_location.longitude),
                    'note': latest_location.note,
                    'last_update': latest_location.created_at.isoformat()
                }
            return None
        except Exception as e:
            logger.error(f"Mevcut konum alınırken hata: {str(e)}")
            return None
    
    @database_sync_to_async
    def get_recent_locations(self, limit=5):
        """Son konum güncellemelerini getir"""
        try:
            transportation = Transportation.objects.get(id=self.transportation_id)
            updates = TransportationUpdate.objects.filter(
                transportation=transportation
            ).order_by('-created_at')[:limit]
            
            result = []
            for update in updates:
                result.append({
                    'type': 'location_history',
                    'latitude': update.latitude,
                    'longitude': update.longitude,
                    'note': update.note,
                    'created_at': update.created_at.isoformat()
                })
            return result
        except Exception as e:
            logger.error(f"Son konumları alma hatası: {e}")
            return []

    @database_sync_to_async
    def get_user_type(self):
        """Kullanıcının bu taşımadaki rolünü belirler"""
        try:
            from django.db import connection
            transportation = Transportation.objects.select_related(
                'cargo_owner', 'cargo_owner__user', 
                'transporter', 'transporter__user'
            ).get(id=self.transportation_id)
            
            # SQL sorguları ve ilişkili alanları logla
            logger.debug(f"DB Sorguları: {len(connection.queries)}")
            logger.debug(f"Taşıma: {transportation.id}")
            logger.debug(f"Kargo Sahibi: {getattr(transportation.cargo_owner, 'id', None)}")
            logger.debug(f"Kargo Sahibi User: {getattr(transportation.cargo_owner, 'user_id', None) if transportation.cargo_owner else None}")
            logger.debug(f"Taşıyıcı: {getattr(transportation.transporter, 'id', None)}")
            logger.debug(f"Taşıyıcı User: {getattr(transportation.transporter, 'user_id', None) if transportation.transporter else None}")
            logger.debug(f"Mevcut Kullanıcı: {self.user.id}")
            
            # İlişkileri kontrol et
            if hasattr(transportation, 'cargo_owner') and transportation.cargo_owner and \
               hasattr(transportation.cargo_owner, 'user') and transportation.cargo_owner.user_id == self.user.id:
                return 'cargo_owner'
                
            elif hasattr(transportation, 'transporter') and transportation.transporter and \
                 hasattr(transportation.transporter, 'user') and transportation.transporter.user_id == self.user.id:
                return 'transporter'
                
            elif self.user.is_staff:
                return 'admin'
                
            # Şirket bazlı erişim
            if hasattr(self.user, 'company') and self.user.company:
                if (transportation.cargo_owner and transportation.cargo_owner.company_id == self.user.company.id) or \
                   (transportation.transporter and transportation.transporter.company_id == self.user.company.id):
                    return 'company_member'
                    
            return 'unknown'
        except Exception as e:
            logger.error(f"Kullanıcı tipi belirlenirken hata: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return 'unknown'

    @database_sync_to_async
    def can_update_location(self):
        """Kullanıcının konum güncelleyebilme yetkisini kontrol eder"""
        try:
            # Admin her zaman güncelleyebilir
            if self.user.is_staff:
                return True
                
            # Taşıyıcı kontrolü - user_type attribute'u kullanmak yerine direkt ilişkiyi kontrol et
            if hasattr(self.user, 'transporter'):
                # Taşıma kaydını al
                transportation = Transportation.objects.get(id=self.transportation_id)
                
                # Bu kullanıcının transporterı, bu taşımanın transporterı mı?
                if transportation.transporter and transportation.transporter.user_id == self.user.id:
                    logger.info(f"Konum güncelleme yetkisi onaylandı: {self.user.username} (ID: {self.user.id})")
                    return True
                    
            # Hiçbir koşul sağlanmazsa, yetkisiz
            logger.warning(f"Taşıyıcı olmayan kullanıcı konum güncellemesi yapamaz: {self.user.id}")
            return False
        except Exception as e:
            logger.error(f"Konum güncelleme yetkisi kontrol edilirken hata: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False