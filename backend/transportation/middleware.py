# backend/transportation/middleware.py

import time
import logging
import jwt
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.conf import settings

logger = logging.getLogger(__name__)

class WebSocketTokenAuthMiddleware(BaseMiddleware):
    
    async def __call__(self, scope, receive, send):
        """WebSocket için JWT token tabanlı kimlik doğrulama middleware"""
        try:
            # Daha detaylı logging
            logger.debug(f"WebSocket bağlantısı: {scope.get('path', 'Bilinmeyen yol')}")
            
            # Token'ı al
            token = None
            query_string = scope.get('query_string', b'').decode()
            
            if query_string:
                qs_params = parse_qs(query_string)
                token_list = qs_params.get('token', [])
                if token_list:
                    token = token_list[0]
                    logger.debug(f"Token bulundu (first 10 chars): {token[:10]}")
                    
            # Token kontrolü
            if not token:
                logger.warning("WebSocket bağlantısında token bulunamadı")
                scope['user'] = AnonymousUser()
                # Token olmadan kapatmadan önce, belki anonim erişim izni verebiliriz
                return await self.inner(scope, receive, send)
                
            # Kullanıcıyı token'dan belirle
            User = get_user_model()
            user = await self.get_user_from_token(token, User, settings)
            
            if not user:
                logger.warning("WebSocket için geçersiz token")
                scope['user'] = AnonymousUser()
                return await self.inner(scope, receive, send)
                
            logger.debug(f"WebSocket kullanıcısı: {user.username} (ID: {user.id})")
            scope['user'] = user
            return await self.inner(scope, receive, send)
            
        except Exception as e:
            logger.error(f"WebSocket middleware hatası: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            scope['user'] = AnonymousUser()
            return await self.inner(scope, receive, send)
    
    @database_sync_to_async
    def get_user_from_token(self, token, User, settings):
        """Token'dan kullanıcı bilgisini çıkarır"""
        if not token:
            return None
        
        try:
            # Token doğrula
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            
            # Kullanıcı ID kontrol et
            user_id = payload.get("user_id")
            if not user_id:
                logger.warning("Token'da user_id bulunamadı")
                return None
            
            # Ek doğrulama: Taşıma ID'si varsa kontrol et
            transportation_id = payload.get("transportation_id")
            if not transportation_id:
                logger.warning("Token'da transportation_id bulunamadı")
                # Taşıma ID'si olmayan token'lar yine de kabul edilebilir,
                # erişim kontrolü consumer'da yapılacak
            
            # Kullanıcı nesnesini döndür
            try:
                # select_related ile ilişkili profil modellerini de getir - performans için
                user = User.objects.select_related('cargo_owner', 'transporter').get(id=user_id)
                return user
            except User.DoesNotExist:
                logger.warning(f"Belirtilen ID'ye sahip kullanıcı bulunamadı: {user_id}")
                return None
        
        except jwt.ExpiredSignatureError:
            logger.warning("Token süresi dolmuş")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Geçersiz token")
            return None
        except Exception as e:
            logger.error(f"Token doğrulama hatası: {e}")
            return None