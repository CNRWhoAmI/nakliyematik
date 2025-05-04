from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
import logging

logger = logging.getLogger(__name__)

class JWTCookieMiddleware(MiddlewareMixin):
    """
    JWT token'larını cookie'lerden HTTP_AUTHORIZATION header'ına ekleyen middleware.
    Bu sayede, her istekte token'ları otomatik olarak kuracağız.
    """

    def process_request(self, request):
        # Doğru JWT ayarlarını al
        cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE')
        refresh_cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH')
        
        # Debug için çerez varlığını kontrol et
        has_cookie = cookie_name in request.COOKIES
        has_auth = 'HTTP_AUTHORIZATION' in request.META
        
        # Debug için path bilgisi
        path_info = request.path_info
        
        # Debug için detaylı loglama önemli yollar için
        if '/api/auth/token/' in path_info or '/api/auth/token/refresh/' in path_info:
            logger.debug(f"Request to {path_info}, has_cookie: {has_cookie}, has_auth: {has_auth}")
            logger.debug(f"Cookies: {request.COOKIES}")
            
            # Refresh token kontrolü
            if refresh_cookie_name in request.COOKIES:
                refresh_token = request.COOKIES.get(refresh_cookie_name)
                logger.debug(f"Found refresh_token (first 10 chars): {refresh_token[:10]}")
            else:
                logger.debug("Refresh token cookie not found!")
        
        # Eğer zaten Authorization header varsa, hiçbir şey yapmayalım
        if has_auth:
            return None
            
        # Cookie'den access token'ı al ve Authorization header'a ekle
        if has_cookie:
            token = request.COOKIES.get(cookie_name)
            if token:
                # Debug için token'ın ilk karakterlerini logla
                logger.debug(f"Setting token from cookie (first 10 chars): {token[:10]}")
                request.META['HTTP_AUTHORIZATION'] = f"Bearer {token}"
                
        return None