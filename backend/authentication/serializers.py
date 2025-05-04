from rest_framework import serializers
from django.contrib.auth import get_user_model
from Profile.models import CargoOwner, Transporter

User = get_user_model()

class UserRegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'})
    company_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=15)
    tax_number = serializers.CharField(max_length=10)
    address = serializers.CharField(style={'base_template': 'textarea.html'})  # Changed from TextField
    user_type = serializers.ChoiceField(choices=[
        ('cargo_owner', 'Yük Sahibi'),
        ('transporter', 'Taşıyıcı')
    ])

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({
                'password2': 'Şifreler eşleşmiyor'
            })
        return data

    def create(self, validated_data):
        user_type = validated_data.pop('user_type')
        password = validated_data.pop('password')
        validated_data.pop('password2')

        # Extract profile data
        profile_data = {
            'company_name': validated_data.pop('company_name'),
            'phone': validated_data.pop('phone'),
            'tax_number': validated_data.pop('tax_number'),
            'address': validated_data.pop('address')
        }

        user = User.objects.create_user(
            **validated_data,
            password=password
        )

        # Create profile based on user type
        if user_type == 'cargo_owner':
            CargoOwner.objects.create(user=user, **profile_data)
        else:
            Transporter.objects.create(user=user, **profile_data)

        return user