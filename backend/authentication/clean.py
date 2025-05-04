from django.conf import settings

def set_jwt_cookies(response, access_token, refresh_token=None):
    """
    JWT token'larını HTTP-only çerezler olarak ayarlar
    """
    # Access token çerezi
    response.set_cookie(
        settings.SIMPLE_JWT.get('AUTH_COOKIE'),
        access_token,
        max_age=settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME').total_seconds(),
        httponly=settings.SIMPLE_JWT.get('AUTH_COOKIE_HTTP_ONLY'),
        secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE'),
        samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE'),
        path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH'),
        domain=settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN')
    )
    
    # Refresh token çerezi (eğer varsa)
    if refresh_token:
        response.set_cookie(
            settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH'),
            refresh_token,
            max_age=settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME').total_seconds(),
            httponly=settings.SIMPLE_JWT.get('AUTH_COOKIE_HTTP_ONLY'),
            secure=settings.SIMPLE_JWT.get('AUTH_COOKIE_SECURE'),
            samesite=settings.SIMPLE_JWT.get('AUTH_COOKIE_SAMESITE'),
            path=settings.SIMPLE_JWT.get('AUTH_COOKIE_PATH'),
            domain=settings.SIMPLE_JWT.get('AUTH_COOKIE_DOMAIN')
        )
    
    return response

def clear_jwt_cookies(response):
    """
    JWT token çerezlerini temizler
    """
    response.delete_cookie(settings.SIMPLE_JWT.get('AUTH_COOKIE'))
    response.delete_cookie(settings.SIMPLE_JWT.get('AUTH_COOKIE_REFRESH'))
    return response