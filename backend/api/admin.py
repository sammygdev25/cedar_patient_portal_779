"""Admin configuration, generated from the plan. The User has Django's user form (passwords hashed) and
its role, so the owner's admin adds people and gives them their roles here."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, Service, DoctorProfile, OpeningHours, ContactMessage, Appointment, VisitNote, Prescription, Document, Invoice, Product, Order, OrderItem


@admin.register(User)
class AppUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (('App', {'fields': ('role', 'phone', 'date_of_birth', 'created_at', 'updated_at')}),)
    add_fieldsets = UserAdmin.add_fieldsets + (('App', {'fields': ('role', 'phone', 'date_of_birth', 'created_at', 'updated_at')}),)
    list_display = ('username', 'email', 'role', 'is_staff', 'is_superuser')
    list_filter = ('role', 'is_staff', 'is_superuser')


admin.site.register(Service)
admin.site.register(DoctorProfile)
admin.site.register(OpeningHours)
admin.site.register(ContactMessage)
admin.site.register(Appointment)
admin.site.register(VisitNote)
admin.site.register(Prescription)
admin.site.register(Document)
admin.site.register(Invoice)
admin.site.register(Product)
admin.site.register(Order)
admin.site.register(OrderItem)
