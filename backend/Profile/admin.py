from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, CargoOwner, Transporter

# User modeli için özel admin sınıfı
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'phone', 'company_name')
    list_filter = ('user_type', 'is_staff', 'is_active')
    fieldsets = UserAdmin.fieldsets + (
        ('Özel Alanlar', {'fields': ('phone', 'address', 'tax_number', 'company_name', 'user_type')}),
    )
    search_fields = ('username', 'email', 'first_name', 'last_name', 'phone', 'company_name')

# CargoOwner için admin sınıfı
class CargoOwnerAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'user', 'phone', 'tax_number', 'created_at')
    search_fields = ('company_name', 'user__username', 'tax_number', 'phone')
    list_filter = ('created_at',)

# Transporter için admin sınıfı
class TransporterAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'user', 'vehicle_type', 'phone', 'tax_number', 'created_at')
    search_fields = ('company_name', 'user__username', 'tax_number', 'phone')
    list_filter = ('vehicle_type', 'created_at')

# Modelleri admin paneline kaydet
admin.site.register(User, CustomUserAdmin)
admin.site.register(CargoOwner, CargoOwnerAdmin)
admin.site.register(Transporter, TransporterAdmin)