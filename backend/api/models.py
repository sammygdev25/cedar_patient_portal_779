from django.conf import settings
"""
Models for cedar_patient_portal_779 — auto-generated from ProjectContract.
DO NOT EDIT — regenerate from contract if changes needed.
"""
from django.db import models


from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    role = models.CharField(max_length=20, choices=[['patient', 'Patient'], ['doctor', 'Doctor'], ['receptionist', 'Receptionist']], default='patient')
    phone = models.CharField(max_length=30, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return str(self.email)


class Service(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField()
    duration_minutes = models.IntegerField(default=30)
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']

    def __str__(self):
        return str(self.name)


class DoctorProfile(models.Model):
    user = models.OneToOneField(to=settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='doctor_profile')
    display_name = models.CharField(max_length=150)
    specialty = models.CharField(max_length=120)
    bio = models.TextField()
    photo = models.ImageField(upload_to='doctors/', null=True, blank=True)
    consultation_minutes = models.IntegerField(default=30)
    is_accepting_patients = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_name']

    def __str__(self):
        return str(self.display_name)


class OpeningHours(models.Model):
    weekday = models.IntegerField(default=0)
    label = models.CharField(max_length=20)
    open_time = models.TimeField(null=True, blank=True)
    close_time = models.TimeField(null=True, blank=True)
    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['weekday']

    def __str__(self):
        return str(self.label)


class ContactMessage(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    message = models.TextField()
    is_handled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return str(self.name)


class Appointment(models.Model):
    patient = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='doctor_appointments')
    service = models.ForeignKey(to='Service', on_delete=models.SET_NULL, related_name='appointments', null=True, blank=True)
    booked_by = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='booked_appointments', null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    reason = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=[['booked', 'Booked'], ['checked_in', 'Checked in'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['no_show', 'No show']], default='booked')
    checked_in_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time']
        constraints = [models.UniqueConstraint(fields=['doctor', 'start_time'], condition=models.Q(status__in=['booked', 'checked_in', 'completed']), name='unique_active_doctor_slot')]

    def __str__(self):
        return str(self.reason)


class VisitNote(models.Model):
    appointment = models.OneToOneField(to='Appointment', on_delete=models.CASCADE, related_name='visit_note')
    patient = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='visit_notes')
    doctor = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='written_visit_notes')
    diagnosis = models.CharField(max_length=255)
    summary = models.TextField()
    follow_up_instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return str(self.diagnosis)


class Prescription(models.Model):
    appointment = models.ForeignKey(to='Appointment', on_delete=models.SET_NULL, related_name='prescriptions', null=True, blank=True)
    patient = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='prescriptions')
    doctor = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='written_prescriptions')
    product = models.ForeignKey(to='Product', on_delete=models.SET_NULL, related_name='prescriptions', null=True, blank=True)
    medicine_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=120)
    instructions = models.TextField()
    notes = models.TextField(blank=True)
    refills_allowed = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return str(self.medicine_name)


class Document(models.Model):
    user = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=[['insurance', 'Insurance card'], ['lab_result', 'Lab result'], ['other', 'Other']], default='other')
    file = models.FileField(upload_to='documents/')
    content_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return str(self.title)


class Invoice(models.Model):
    user = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invoices')
    appointment = models.ForeignKey(to='Appointment', on_delete=models.SET_NULL, related_name='invoices', null=True, blank=True)
    created_by = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='created_invoices', null=True, blank=True)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=[['unpaid', 'Unpaid'], ['paid', 'Paid'], ['void', 'Void']], default='unpaid')
    due_date = models.DateField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    stripe_session_id = models.CharField(max_length=255, null=True, blank=True, unique=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return str(self.description)


class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    in_stock = models.BooleanField(default=True)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    is_prescription_only = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return str(self.name)


class Order(models.Model):
    user = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    fulfillment = models.CharField(max_length=20, choices=[['pickup', 'Pickup'], ['delivery', 'Home delivery']], default='pickup')
    delivery_address = models.TextField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    delivery_fee = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=8, decimal_places=2)
    is_prescription_order = models.BooleanField(default=False)
    prescribing_doctor = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='orders_to_approve', null=True, blank=True)
    approval_status = models.CharField(max_length=20, choices=[['not_required', 'Not required'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']], default='not_required')
    status = models.CharField(max_length=20, choices=[['pending_payment', 'Pending payment'], ['received', 'Received'], ['approved', 'Approved'], ['packed', 'Packed'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['rejected', 'Rejected']], default='pending_payment')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    stripe_session_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    stock_taken = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return str(self.status)


class OrderItem(models.Model):
    order = models.ForeignKey(to='Order', on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(to='Product', on_delete=models.SET_NULL, related_name='order_items', null=True, blank=True)
    prescription = models.ForeignKey(to='Prescription', on_delete=models.SET_NULL, related_name='order_items', null=True, blank=True)
    medicine_name = models.CharField(max_length=200)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    is_out_of_stock = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return str(self.medicine_name)

