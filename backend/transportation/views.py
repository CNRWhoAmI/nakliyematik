import os
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from django.conf import settings
import logging
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db import models
from .models import Transportation, TransportationUpdate, TransportationRating, WebSocketToken, LocationHistory
from .serializers import (
    TransportationListSerializer, 
    TransportationDetailSerializer,
    TransportationUpdateSerializer,
    TransportationRatingSerializer,
    LocationHistorySerializer
)
import jwt
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TransportationViewSet(viewsets.ModelViewSet):
    """Taşıma işlemleri için API endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    # Filtre ve arama özellikleri
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'pickup_confirmed', 'delivery_confirmed']
    search_fields = ['cargo_post__title', 'cargo_owner__company_name', 'transporter__company_name']
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']  # Varsayılan sıralama
    
    def get_queryset(self):
        """Kullanıcının rolüne göre ilgili taşımaları getir"""
        user = self.request.user
        
        # İlişkisel sorgular için select_related kullanarak performansı arttır
        queryset = Transportation.objects.select_related(
            'cargo_post', 'offer', 'cargo_owner', 'transporter'
        ).prefetch_related('updates', 'ratings')
        
        if hasattr(user, 'cargo_owner'):
            # Yük sahibi kendi taşımalarını görür
            return queryset.filter(cargo_owner=user.cargo_owner)
        elif hasattr(user, 'transporter'):
            # Taşıyıcı kendi taşımalarını görür
            return queryset.filter(transporter=user.transporter)
        
        # Admin ise tüm kayıtları görür
        if user.is_staff:
            return queryset
            
        # Hiçbir gruba ait değilse boş queryset
        return Transportation.objects.none()
    
    def get_serializer_class(self):
        """İstek tipine göre uygun serializer'ı seç"""
        if self.action == 'list':
            return TransportationListSerializer
        return TransportationDetailSerializer
    
    def perform_create(self, serializer):
        """Taşıma kaydı oluştururken doğrulama yapar ve otomatik alan doldurma yapar"""
        transportation = serializer.save()
        
        # Veriyi tekrar yükle - save() metodu çalıştıktan sonra otomatik doldurulmuş alanları almak için
        transportation.refresh_from_db()
        
        # Eksik alanları kontrol et
        if not transportation.cargo_type:
            logger.warning(f"Transportation #{transportation.id} created without cargo_type")
        
        if not transportation.weight:
            logger.warning(f"Transportation #{transportation.id} created without weight")
        
        return transportation

    def perform_update(self, serializer):
        """Taşıma kaydı güncellerken doğrulama yapar"""
        old_instance = self.get_object()
        updated_instance = serializer.save()
        
        # cargo_type veya weight silinmişse, eski değerleri koruyarak tekrar ata
        if old_instance.cargo_type and not updated_instance.cargo_type:
            updated_instance.cargo_type = old_instance.cargo_type
            logger.warning(f"Prevented cargo_type removal for transportation #{updated_instance.id}")
            
        if old_instance.weight and not updated_instance.weight:
            updated_instance.weight = old_instance.weight
            logger.warning(f"Prevented weight removal for transportation #{updated_instance.id}")
            
        # Sadece değişiklik olduysa kaydet
        if (old_instance.cargo_type != updated_instance.cargo_type or 
            old_instance.weight != updated_instance.weight):
            updated_instance.save(update_fields=['cargo_type', 'weight'])
        
        return updated_instance
    
    # Özel view metodlarını ekleyelim - filtreli view'lar
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Aktif taşımaları getir"""
        queryset = self.get_queryset().filter(status__in=['awaiting_pickup', 'in_transit'])
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def completed(self, request):
        """Tamamlanmış taşımaları getir"""
        queryset = self.get_queryset().filter(status__in=['completed', 'rated'])
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Bekleyen taşımaları getir"""
        queryset = self.get_queryset().filter(status='awaiting_pickup')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    # Diğer mevcut metodlar aynen kalıyor
    # Yükleme isteği - Taşıyıcı "Yükü aldım" dediğinde
    @action(detail=True, methods=['post'])
    def request_pickup(self, request, pk=None):
        """Taşıyıcının yükü aldığını bildirmesi"""
        transportation = self.get_object()
        user = request.user
        
        # Sadece taşıyıcı ve doğru durumda ise
        if not hasattr(user, 'transporter') or user.transporter != transportation.transporter:
            return Response(
                {"detail": "Bu işlemi sadece ilgili taşıyıcı yapabilir."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if transportation.status != 'awaiting_pickup':
            return Response(
                {"detail": f"Taşıma şu anda '{transportation.get_status_display()}' durumunda. Yükleme isteği yapılamaz."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Lokasyon bilgisi alınabilir
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        note = request.data.get('note', 'Yükleme için hazır.')
        
        try:
            with transaction.atomic():
                # Taşıma kaydını güncelle
                transportation.pickup_requested = True
                transportation.pickup_requested_at = timezone.now()
                
                # Konum bilgisi varsa kaydet
                if latitude and longitude:
                    transportation.current_latitude = latitude
                    transportation.current_longitude = longitude
                    transportation.last_location_update = timezone.now()
                
                transportation.save()
                
                # Güncelleme kaydı oluştur
                update = TransportationUpdate.objects.create(
                    transportation=transportation,
                    user=user,
                    note=note,
                    latitude=latitude,
                    longitude=longitude
                )
            
            # Bildirim gönder (ileride implement edilebilir)
            # send_notification_to_cargo_owner(transportation, "Taşıyıcı yükü almak için hazır.")
            
            return Response({
                "detail": "Yükleme talebi başarıyla iletildi. Yük sahibinin onayı bekleniyor.",
                "update": TransportationUpdateSerializer(update).data
            })
        except Exception as e:
            logger.error(f"Error in request_pickup: {str(e)}", exc_info=True)
            return Response(
                {"detail": "Yükleme talebi oluşturulurken bir hata oluştu."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # Yükleme onayı - Yük sahibi onayladığında
    @action(detail=True, methods=['post'])
    def confirm_pickup(self, request, pk=None):
        """Yük sahibinin yükleme işlemini onaylaması"""
        transportation = self.get_object()
        user = request.user
        
        # Sadece yük sahibi ve doğru durumda ise
        if not hasattr(user, 'cargo_owner') or user.cargo_owner != transportation.cargo_owner:
            return Response(
                {"detail": "Bu işlemi sadece ilgili yük sahibi yapabilir."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not transportation.pickup_requested:
            return Response(
                {"detail": "Taşıyıcı henüz yükleme talebi oluşturmadı."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if transportation.status != 'awaiting_pickup':
            return Response(
                {"detail": f"Taşıma şu anda '{transportation.get_status_display()}' durumunda. Yükleme onayı yapılamaz."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        note = request.data.get('note', 'Yükleme onaylandı.')
        
        try:
            with transaction.atomic():
                # Taşıma kaydını güncelle
                transportation.pickup_confirmed = True
                transportation.pickup_confirmed_at = timezone.now()
                transportation.status = 'in_transit'
                transportation.save()
                
                # Güncelleme kaydı oluştur
                update = TransportationUpdate.objects.create(
                    transportation=transportation,
                    user=user,
                    note=note
                )
            
            # Bildirim gönder (ileride implement edilebilir)
            # send_notification_to_transporter(transportation, "Yükleme onaylandı, taşıma başlayabilir.")
            
            return Response({
                "detail": "Yükleme onaylandı. Taşıma süreci başladı.",
                "update": TransportationUpdateSerializer(update).data
            })
        except Exception as e:
            logger.error(f"Error in confirm_pickup: {str(e)}", exc_info=True)
            return Response(
                {"detail": "Yükleme onaylanırken bir hata oluştu."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # Teslimat isteği - Taşıyıcı "Teslim ettim" dediğinde
    @action(detail=True, methods=['post'])
    def request_delivery(self, request, pk=None):
        """Taşıyıcının yükü teslim ettiğini bildirmesi"""
        transportation = self.get_object()
        user = request.user
        
        # Sadece taşıyıcı ve doğru durumda ise
        if not hasattr(user, 'transporter') or user.transporter != transportation.transporter:
            return Response(
                {"detail": "Bu işlemi sadece ilgili taşıyıcı yapabilir."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if transportation.status != 'in_transit':
            return Response(
                {"detail": f"Taşıma şu anda '{transportation.get_status_display()}' durumunda. Teslimat bildirimi yapılamaz."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Lokasyon bilgisi alınabilir
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        note = request.data.get('note', 'Yük teslim edildi.')
        
        try:
            with transaction.atomic():
                # Taşıma kaydını güncelle
                transportation.delivery_requested = True
                transportation.delivery_requested_at = timezone.now()
                
                # Konum bilgisi varsa kaydet
                if latitude and longitude:
                    transportation.current_latitude = latitude
                    transportation.current_longitude = longitude
                    transportation.last_location_update = timezone.now()
                
                transportation.save()
                
                # Güncelleme kaydı oluştur
                update = TransportationUpdate.objects.create(
                    transportation=transportation,
                    user=user,
                    note=note,
                    latitude=latitude,
                    longitude=longitude
                )
            
            # Bildirim gönder (ileride implement edilebilir)
            # send_notification_to_cargo_owner(transportation, "Taşıyıcı yükü teslim ettiğini bildirdi.")
            
            return Response({
                "detail": "Teslimat bildirimi başarıyla iletildi. Yük sahibinin onayı bekleniyor.",
                "update": TransportationUpdateSerializer(update).data
            })
        except Exception as e:
            logger.error(f"Error in request_delivery: {str(e)}", exc_info=True)
            return Response(
                {"detail": "Teslimat bildirimi oluşturulurken bir hata oluştu."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # Teslimat onayı - Yük sahibi onayladığında
    @action(detail=True, methods=['post'])
    def confirm_delivery(self, request, pk=None):
        """Yük sahibinin teslimat işlemini onaylaması"""
        try:
            # self.get_object() yerine doğrudan veritabanından sorgu
            transportation = Transportation.objects.get(pk=pk)
            
            # Kullanıcı kontrolü
            user = request.user
            
            if not hasattr(user, 'cargo_owner') or user.cargo_owner != transportation.cargo_owner:
                return Response(
                    {"detail": "Bu işlemi sadece ilgili yük sahibi yapabilir."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if not transportation.delivery_requested:
                return Response(
                    {"detail": "Taşıyıcı henüz teslimat bildirimi yapmamış."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                    
            if transportation.status != 'in_transit':
                return Response(
                    {"detail": f"Taşıma şu anda '{transportation.get_status_display()}' durumunda. Teslimat onayı yapılamaz."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            note = request.data.get('note', 'Teslimat onaylandı.')
            
            try:
                with transaction.atomic():
                    # Teslimat onaylandı olarak işaretlenir
                    transportation.delivery_confirmed = True
                    transportation.delivery_confirmed_at = timezone.now()
                    transportation.status = 'completed'  # Durum completed'a çekilir
                    transportation.completed_at = timezone.now()
                    transportation.save(update_fields=[
                        'delivery_confirmed', 'delivery_confirmed_at', 
                        'status', 'completed_at'
                    ])
                    
                    # Not ekle
                    TransportationUpdate.objects.create(
                        transportation=transportation,
                        user=user,
                        note=note
                    )
                    
                    return Response({
                        "status": transportation.status,
                        "delivery_confirmed": transportation.delivery_confirmed,
                        "delivery_confirmed_at": transportation.delivery_confirmed_at,
                        "message": "Teslimat başarıyla onaylandı."
                    })
                    
            except Exception as e:
                logger.error(f"Teslimat onaylama hatası: {e}", exc_info=True)
                return Response(
                    {"detail": f"Teslimat onaylanırken bir hata oluştu: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        except Transportation.DoesNotExist:
            logger.error(f"Taşıma bulunamadı: {pk}")
            return Response(
                {"detail": "Taşıma bulunamadı."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Genel teslimat onaylama hatası: {e}", exc_info=True)
            return Response(
                {"detail": f"İşlem sırasında beklenmeyen bir hata oluştu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # Değerlendirme ekleme
    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """Taşıma için değerlendirme yapma"""
        transportation = self.get_object()
        user = request.user
        
        # Sadece taşıma tamamlandıysa değerlendirilebilir
        if transportation.status != 'completed':
            return Response(
                {"detail": "Sadece tamamlanmış taşımalar değerlendirilebilir."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Kullanıcının rolünü belirle
        from_cargo_owner = False
        if hasattr(user, 'cargo_owner'):
            if user.cargo_owner != transportation.cargo_owner:
                return Response(
                    {"detail": "Sadece ilgili yük sahibi değerlendirme yapabilir."},
                    status=status.HTTP_403_FORBIDDEN
                )
            from_cargo_owner = True
        elif hasattr(user, 'transporter'):
            if user.transporter != transportation.transporter:
                return Response(
                    {"detail": "Sadece ilgili taşıyıcı değerlendirme yapabilir."},
                    status=status.HTTP_403_FORBIDDEN
                )
            from_cargo_owner = False  # Taşıyıcıdan yük sahibine yapılan değerlendirme
        else:
            return Response(
                {"detail": "Sadece yük sahipleri ve taşıyıcılar değerlendirme yapabilir."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Bu kullanıcı daha önce değerlendirme yapmış mı kontrol et
        existing_rating = TransportationRating.objects.filter(
            transportation=transportation,
            from_cargo_owner=from_cargo_owner
        ).first()
        
        if existing_rating:
            return Response(
                {"detail": "Bu taşıma için zaten değerlendirme yapmışsınız."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Değerlendirme verilerini al
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        
        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return Response(
                {"detail": "Geçerli bir değerlendirme puanı gerekiyor (1-5)."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Yeni değerlendirme oluştur
            transportation_rating = TransportationRating.objects.create(
                transportation=transportation,
                from_cargo_owner=from_cargo_owner,
                rating=rating,
                comment=comment
            )
            
            # Her iki tarafın da değerlendirme yapıp yapmadığını kontrol et
            both_rated = TransportationRating.objects.filter(
                transportation=transportation
            ).values('from_cargo_owner').distinct().count() == 2
            
            # İsteğe bağlı: Her iki taraf da değerlendirme yaptıysa bir "rated" durumuna geçiş yapabilirsiniz
            # if both_rated:
            #     transportation.status = 'rated'
            #     transportation.save(update_fields=['status'])
            
            return Response({
                "detail": "Değerlendirme başarıyla kaydedildi.",
                "rating": TransportationRatingSerializer(transportation_rating).data,
                "both_rated": both_rated
            })
        except Exception as e:
            logger.error(f"Error in rating transportation: {str(e)}", exc_info=True)
            return Response(
                {"detail": "Değerlendirme kaydedilirken bir hata oluştu."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def notes(self, request, pk=None):
        """Taşımaya ait notları getir"""
        transportation = self.get_object()
        updates = TransportationUpdate.objects.filter(transportation=transportation).order_by('-created_at')
        
        # Kullanıcı bilgilerini eklemek için daha kapsamlı bir serializer
        serialized_updates = []
        for update in updates:
            data = TransportationUpdateSerializer(update).data
            # Kullanıcı bilgilerini ekle
            if update.user:
                data['user_id'] = update.user.id
                data['user_name'] = update.user.username
                
                # Kullanıcı tipini ekle
                if hasattr(update.user, 'cargo_owner'):
                    data['user_type'] = 'cargo_owner'
                elif hasattr(update.user, 'transporter'):
                    data['user_type'] = 'transporter'
                else:
                    data['user_type'] = 'staff'
                    
            serialized_updates.append(data)
        
        return Response(serialized_updates)
    
    # Not ekleme - Her iki taraf da ekleyebilir
    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Taşımaya not ekleme"""
        transportation = self.get_object()
        user = request.user
        
        # Sadece ilgili kişiler not ekleyebilir
        is_related = False
        if hasattr(user, 'cargo_owner') and user.cargo_owner == transportation.cargo_owner:
            is_related = True
        elif hasattr(user, 'transporter') and user.transporter == transportation.transporter:
            is_related = True
        elif user.is_staff:
            is_related = True
            
        if not is_related:
            return Response(
                {"detail": "Bu taşımaya not eklemek için yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Sadece aktif taşımalara not eklenebilir
        if transportation.status in ['cancelled']:
            return Response(
                {"detail": f"Taşıma şu anda '{transportation.get_status_display()}' durumunda. Not eklenemez."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        note = request.data.get('note')
        if not note:
            return Response(
                {"detail": "Not içeriği boş olamaz."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Not ekle
            update = TransportationUpdate.objects.create(
                transportation=transportation,
                user=user,
                note=note
            )
            
            return Response({
                "detail": "Not başarıyla eklendi.",
                "update": TransportationUpdateSerializer(update).data
            })
        except Exception as e:
            logger.error(f"Error in add_note: {str(e)}", exc_info=True)
            return Response(
                {"detail": "Not eklenirken bir hata oluştu."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # İptal etme - her iki taraf da iptal edebilir (belirli durumlarda)
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Taşımayı iptal etme"""
        transportation = self.get_object()
        user = request.user
        
        # Sadece ilgili kişiler iptal edebilir
        is_related = False
        if hasattr(user, 'cargo_owner') and user.cargo_owner == transportation.cargo_owner:
            is_related = True
            canceller_type = "cargo_owner"
        elif hasattr(user, 'transporter') and user.transporter == transportation.transporter:
            is_related = True
            canceller_type = "transporter"
        else:
            canceller_type = None
            
        if not is_related and not user.is_staff:
            return Response(
                {"detail": "Bu taşımayı iptal etme yetkiniz yok."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Sadece belirli durumdaki taşımalar iptal edilebilir
        if transportation.status not in ['awaiting_pickup', 'in_transit']:
            return Response(
                {"detail": f"Taşıma şu anda '{transportation.get_status_display()}' durumunda. İptal edilemez."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        if not reason:
            return Response(
                {"detail": "İptal nedeni belirtmeniz gerekiyor."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Taşıma kaydını güncelle
                transportation.status = 'cancelled'
                transportation.cancelled_at = timezone.now()
                transportation.cancelled_by = canceller_type
                transportation.cancellation_reason = reason
                transportation.save()
                
                # Güncelleme kaydı oluştur
                update = TransportationUpdate.objects.create(
                    transportation=transportation,
                    user=user,
                    note=f"Taşıma iptal edildi. Sebep: {reason}"
                )
                
                # İlgili cargo_post'u güncelle
                cargo_post = transportation.cargo_post
                if cargo_post.status == 'assigned':
                    cargo_post.status = 'active'  # Taşıma iptal edildiği için yeniden aktif olsun
                    cargo_post.save(update_fields=['status'])
            
            # Bildirim gönder (ileride implement edilebilir)
            # notify_transportation_cancellation(transportation)
            
            return Response({
                "detail": "Taşıma başarıyla iptal edildi.",
                "update": TransportationUpdateSerializer(update).data
            })
        except Exception as e:
            logger.error(f"Error in cancel: {str(e)}", exc_info=True)
            return Response(
                {"detail": "Taşıma iptal edilirken bir hata oluştu."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    # Backend tarafına eklenecek yeni endpoint önerisi
    @action(detail=False, methods=['get'])
    def active_count(self, request):
        """Get the count of active transportations"""
        active_count = self.get_queryset().filter(
            status__in=['awaiting_pickup', 'in_transit']
        ).count()
        
        return Response({'count': active_count})

    @action(detail=True, methods=['post'])
    def update_location(self, request, pk=None):
        """Taşıma için konum güncellemesi yapar."""
        transportation = self.get_object()
        
        # Sadece taşıyıcıların ve kendi taşımalarını yapanların konum güncellemesine izin ver
        user = request.user
        if not hasattr(user, 'transporter') or transportation.transporter.id != user.transporter.id:
            return Response(
                {"detail": "Bu taşıma için konum güncelleme yetkiniz bulunmamaktadır."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Taşıma durumunu kontrol et
        if transportation.status != 'in_transit':
            return Response(
                {"detail": "Sadece 'taşıma sürüyor' durumundaki taşımalar için konum güncellenebilir."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Konum verilerini al
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        note = request.data.get('note', 'Konum güncellemesi')
        
        if not latitude or not longitude:
            return Response(
                {"detail": "Latitude ve longitude bilgileri zorunludur."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Konum güncelle
            with transaction.atomic():
                # TransportationUpdate kaydı oluştur
                update = TransportationUpdate.objects.create(
                    transportation=transportation,
                    user=user,
                    note=note,
                    latitude=latitude,
                    longitude=longitude
                )
                
                # Transportation kaydını güncelle
                transportation.current_latitude = latitude
                transportation.current_longitude = longitude
                transportation.last_location_update = timezone.now()
                transportation.save(update_fields=[
                    'current_latitude', 
                    'current_longitude', 
                    'last_location_update'
                ])
                
                # LocationHistory kaydı oluştur
                LocationHistory.objects.create(
                    transportation=transportation,
                    user=request.user,
                    latitude=latitude,
                    longitude=longitude,
                    note=note
                )
            
            logger.info(f"Konum güncellendi: Transport #{transportation.id}, Lat: {latitude}, Lng: {longitude}")
            
            # Yanıt döndür
            return Response({
                "id": update.id,
                "latitude": update.latitude,
                "longitude": update.longitude,
                "note": update.note,
                "created_at": update.created_at,
                "message": "Konum başarıyla güncellendi"
            })
        
        except Exception as e:
            logger.error(f"Error in update_location: {str(e)}", exc_info=True)
            return Response(
                {"detail": f"Konum güncellenirken bir hata oluştu: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def location_data(self, request, pk=None):
        """
        Sadece konum takibi için gerekli olan minimum veriyi döndürür
        """
        try:
            transportation = self.get_object()
            
            # Sadece gerekli alanları içeren sade bir yanıt
            data = {
                'id': transportation.id,
                'status': transportation.status,
                'status_display': transportation.get_status_display(),
                'pickup_location': {
                    'latitude': transportation.pickup_latitude,
                    'longitude': transportation.pickup_longitude,
                    'address': transportation.pickup_address
                },
                'delivery_location': {
                    'latitude': transportation.delivery_latitude,
                    'longitude': transportation.delivery_longitude,
                    'address': transportation.delivery_address
                },
                'current_location': {
                    'latitude': transportation.current_latitude,
                    'longitude': transportation.current_longitude,
                    'last_update': transportation.last_location_update
                },
                'progress': {
                    'pickup_confirmed': transportation.pickup_confirmed,
                    'delivery_confirmed': transportation.delivery_confirmed,
                    'estimated_arrival': transportation.estimated_arrival
                },
                'dates': {
                    'estimated_pickup': transportation.estimated_pickup_date,
                    'estimated_delivery': transportation.estimated_delivery_date
                }
            }
            
            return Response(data)
        except Exception as e:
            return Response(
                {"detail": f"Konum verisi alınamadı: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def location(self, request, pk=None):
        """
        Sadece konum takibi için gerekli olan minimum veriyi döndürür
        """
        try:
            transportation = self.get_object()
            
            # Sadece gerekli alanları içeren sade bir yanıt
            data = {
                'id': transportation.id,
                'status': transportation.status,
                'status_display': transportation.get_status_display(),
                'pickup_location': {
                    'latitude': transportation.pickup_latitude,
                    'longitude': transportation.pickup_longitude,
                    'address': transportation.pickup_address
                },
                'delivery_location': {
                    'latitude': transportation.delivery_latitude,
                    'longitude': transportation.delivery_longitude,
                    'address': transportation.delivery_address
                },
                'current_location': {
                    'latitude': transportation.current_latitude,
                    'longitude': transportation.current_longitude,
                    'last_update': transportation.last_location_update
                },
                'progress': {
                    'pickup_confirmed': transportation.pickup_confirmed,
                    'delivery_confirmed': transportation.delivery_confirmed,
                    'estimated_arrival': transportation.estimated_arrival
                }
            }
            
            return Response(data)
        except Exception as e:
            return Response(
                {"detail": f"Konum verisi alınamadı: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# LocationHistoryViewSet sınıfı
class LocationHistoryViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def list(self, request, transportation_id=None):
        try:
            # Taşımayı bul
            transportation = Transportation.objects.get(pk=transportation_id)
            
            # Yetki kontrolü
            is_authorized = False
            
            # Taşıyıcı ise
            if hasattr(request.user, 'transporter') and transportation.transporter == request.user.transporter:
                is_authorized = True
            # Yük sahibi ise
            elif hasattr(request.user, 'cargo_owner') and transportation.cargo_owner == request.user.cargo_owner:
                is_authorized = True
            # Admin ise
            elif request.user.is_staff:
                is_authorized = True
            
            if not is_authorized:
                return Response(
                    {"detail": "Bu taşımanın konum geçmişini görüntüleme yetkiniz bulunmamaktadır."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Konum geçmişini al
            locations = LocationHistory.objects.filter(transportation=transportation).order_by('-timestamp')
            
            # Serialize et
            serializer = LocationHistorySerializer(locations, many=True)
            
            return Response(serializer.data)
            
        except Transportation.DoesNotExist:
            return Response(
                {"detail": "Taşıma bulunamadı."},
                status=status.HTTP_404_NOT_FOUND
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_websocket_token(request, pk):
    """
    WebSocket bağlantısı için özel token oluşturur
    """
    try:
        # Taşıma ID'sini kontrol et
        transportation = Transportation.objects.get(pk=pk)
        
        # Kullanıcının bu taşımaya erişim izni olup olmadığını kontrol et
        has_access = False
        
        # Yöneticiler her zaman erişebilir
        if request.user.is_staff:
            has_access = True
        # Taşıyıcı veya kargo sahibi erişebilir
        elif (transportation.transporter and transportation.transporter.id == request.user.id) or \
             (transportation.cargo_owner and transportation.cargo_owner.id == request.user.id):
            has_access = True
        # Şirket üyesi kontrolü
        elif hasattr(request.user, 'company') and request.user.company:
            user_company = request.user.company
            if (transportation.transporter and transportation.transporter.company_id == user_company.id) or \
               (transportation.cargo_owner and transportation.cargo_owner.company_id == user_company.id):
                has_access = True
        
        if not has_access:
            return Response({"error": "Bu taşımaya erişim izniniz yok"}, status=403)
        
        # WebSocket için özel token oluştur - timezone-aware kullanarak
        from datetime import datetime, timezone, timedelta
        
        payload = {
            'user_id': request.user.id,
            'transportation_id': str(pk),
            'exp': datetime.now(timezone.utc) + timedelta(minutes=60),  # 1 saat geçerli
            'type': 'websocket'
        }
        
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        
        return Response({
            "token": token
        })
    except Transportation.DoesNotExist:
        return Response({"error": "Taşıma bulunamadı"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reverse_geocode(request):
    """Koordinatları tersine geocoding ile adres bilgisine dönüştürür"""
    import logging
    import requests  # Eksik import
    from django.conf import settings
    
    logger = logging.getLogger(__name__)
    
    try:
        # String parametreleri float'a çevir
        lat_str = request.query_params.get('lat', '0')
        lng_str = request.query_params.get('lng', '0')
        
        try:
            latitude = float(lat_str)
            longitude = float(lng_str)
        except ValueError:
            return Response(
                {"detail": "Geçerli enlem ve boylam parametreleri gereklidir."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if latitude == 0 or longitude == 0:
            return Response(
                {"detail": "Geçerli enlem ve boylam parametreleri gereklidir."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Yandex Geocoder API'sini kullan
        try:
            api_key = settings.YANDEX_MAPS_API_KEY
        except AttributeError:
            # .env'den doğrudan oku
            api_key = os.environ.get('REACT_APP_YANDEX_MAPS_API_KEY', '')
        
        if not api_key:
            return Response({
                "name": f"Konum: {latitude:.4f}, {longitude:.4f}",
                "success": False,
                "error": "API anahtarı bulunamadı"
            })
            
        # Yandex Geocoder API isteği
        url = "https://geocode-maps.yandex.ru/1.x/"
        params = {
            "apikey": api_key,
            "geocode": f"{longitude},{latitude}",  # Yandex'te önce boylam sonra enlem gelir
            "format": "json",
            "lang": "tr_TR",  # Türkçe sonuçlar
            "results": 1
        }
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            
            # API yanıtını ayrıştır
            geoobject = data.get('response', {}).get('GeoObjectCollection', {}).get('featureMember', [])
            
            if geoobject and len(geoobject) > 0:
                address_details = geoobject[0].get('GeoObject', {})
                address_name = address_details.get('metaDataProperty', {}).get('GeocoderMetaData', {}).get('text', '')
                
                return Response({
                    'name': address_name or f"Bölge: {latitude:.4f}, {longitude:.4f}",
                    'full_address': address_name,
                    'success': True
                })
            
        # API başarısız olursa veya sonuç bulunamazsa
        return Response({
            'name': f"Bölge: {latitude:.4f}, {longitude:.4f}",
            'success': False,
            'error': "Konum bilgisi bulunamadı"
        })
        
    except Exception as e:
        logger.error(f"Geocoding hatası: {str(e)}", exc_info=True)
        
        # Hata durumunda güvenli bir yanıt döndür
        try:
            lat_val = float(lat_str)
            lng_val = float(lng_str)
            location_str = f"Konum: {lat_val:.4f}, {lng_val:.4f}"
        except:
            location_str = "Bilinmeyen Konum"
            
        return Response({
            'name': location_str,
            'success': False,
            'error': str(e)
        })