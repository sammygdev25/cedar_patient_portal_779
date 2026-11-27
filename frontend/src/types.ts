/**
 * Auto-generated TypeScript types and Zod schemas from ProjectContract.
 * Model interfaces match the Django backend exactly.
 */
import { z } from 'zod';

// DRF returns a related object either as its pk or nested; parse both to the pk
// so the parsed type matches the number typed FK fields on the interfaces.
const zRelation = z.union([z.coerce.number().int(), z.object({ id: z.coerce.number().int() }).passthrough()]).transform((v) => (typeof v === 'number' ? v : v.id));

// ── User ──
export interface User {
  id: number;
  email: string;
  role: string;
  phone: string;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export const UserSchema = z.object({
  id: z.coerce.number(),
  email: z.string().email(),
  role: z.string(),
  phone: z.string(),
  date_of_birth: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── Service ──
export interface Service {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ServiceSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  description: z.string(),
  duration_minutes: z.coerce.number().int(),
  display_order: z.coerce.number().int(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── DoctorProfile ──
export interface DoctorProfile {
  id: number;
  user: number;
  display_name: string;
  specialty: string;
  bio: string;
  photo: string | null;
  consultation_minutes: number;
  is_accepting_patients: boolean;
  created_at: string;
  updated_at: string;
}

export const DoctorProfileSchema = z.object({
  id: z.coerce.number(),
  user: zRelation,
  display_name: z.string(),
  specialty: z.string(),
  bio: z.string(),
  photo: z.string().nullable().nullable(),
  consultation_minutes: z.coerce.number().int(),
  is_accepting_patients: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── OpeningHours ──
export interface OpeningHours {
  id: number;
  weekday: number;
  label: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export const OpeningHoursSchema = z.object({
  id: z.coerce.number(),
  weekday: z.coerce.number().int(),
  label: z.string(),
  open_time: z.string().nullable(),
  close_time: z.string().nullable(),
  is_closed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── ContactMessage ──
export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  is_handled: boolean;
  created_at: string;
  updated_at: string;
}

export const ContactMessageSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  message: z.string(),
  is_handled: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── Appointment ──
export interface Appointment {
  id: number;
  patient: number;
  doctor: number;
  service: number | null;
  booked_by: number | null;
  start_time: string;
  end_time: string;
  reason: string;
  status: string;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export const AppointmentSchema = z.object({
  id: z.coerce.number(),
  patient: zRelation,
  doctor: zRelation,
  service: zRelation.nullable(),
  booked_by: zRelation.nullable(),
  start_time: z.string(),
  end_time: z.string(),
  reason: z.string(),
  status: z.string(),
  checked_in_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── VisitNote ──
export interface VisitNote {
  id: number;
  appointment: number;
  patient: number;
  doctor: number;
  diagnosis: string;
  summary: string;
  follow_up_instructions: string;
  created_at: string;
  updated_at: string;
}

export const VisitNoteSchema = z.object({
  id: z.coerce.number(),
  appointment: zRelation,
  patient: zRelation,
  doctor: zRelation,
  diagnosis: z.string(),
  summary: z.string(),
  follow_up_instructions: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── Prescription ──
export interface Prescription {
  id: number;
  appointment: number | null;
  patient: number;
  doctor: number;
  product: number | null;
  medicine_name: string;
  dosage: string;
  instructions: string;
  notes: string;
  refills_allowed: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const PrescriptionSchema = z.object({
  id: z.coerce.number(),
  appointment: zRelation.nullable(),
  patient: zRelation,
  doctor: zRelation,
  product: zRelation.nullable(),
  medicine_name: z.string(),
  dosage: z.string(),
  instructions: z.string(),
  notes: z.string(),
  refills_allowed: z.coerce.number().int(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── Document ──
export interface Document {
  id: number;
  user: number;
  title: string;
  category: string;
  file: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

export const DocumentSchema = z.object({
  id: z.coerce.number(),
  user: zRelation,
  title: z.string(),
  category: z.string(),
  file: z.string().nullable(),
  content_type: z.string(),
  size_bytes: z.coerce.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── Invoice ──
export interface Invoice {
  id: number;
  user: number;
  appointment: number | null;
  created_by: number | null;
  description: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  stripe_session_id: string | null;
}

export const InvoiceSchema = z.object({
  id: z.coerce.number(),
  user: zRelation,
  appointment: zRelation.nullable(),
  created_by: zRelation.nullable(),
  description: z.string(),
  amount: z.coerce.number(),
  status: z.string(),
  due_date: z.string().nullable(),
  paid_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  stripe_session_id: z.string().nullable(),
}).passthrough();

// ── Product ──
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  in_stock: boolean;
  image: string | null;
  is_prescription_only: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ProductSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  description: z.string(),
  price: z.coerce.number(),
  stock_quantity: z.coerce.number().int(),
  in_stock: z.boolean(),
  image: z.string().nullable().nullable(),
  is_prescription_only: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── Order ──
export interface Order {
  id: number;
  user: number;
  fulfillment: string;
  delivery_address: string;
  phone: string;
  notes: string;
  delivery_fee: number;
  total_amount: number;
  is_prescription_order: boolean;
  prescribing_doctor: number | null;
  approval_status: string;
  status: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  stripe_session_id: string | null;
  stock_taken: boolean;
}

export const OrderSchema = z.object({
  id: z.coerce.number(),
  user: zRelation,
  fulfillment: z.string(),
  delivery_address: z.string(),
  phone: z.string(),
  notes: z.string(),
  delivery_fee: z.coerce.number(),
  total_amount: z.coerce.number(),
  is_prescription_order: z.boolean(),
  prescribing_doctor: zRelation.nullable(),
  approval_status: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  paid_at: z.string().nullable(),
  stripe_session_id: z.string().nullable(),
  stock_taken: z.boolean(),
}).passthrough();

// ── OrderItem ──
export interface OrderItem {
  id: number;
  order: number;
  product: number | null;
  prescription: number | null;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  is_out_of_stock: boolean;
  created_at: string;
  updated_at: string;
}

export const OrderItemSchema = z.object({
  id: z.coerce.number(),
  order: zRelation,
  product: zRelation.nullable(),
  prescription: zRelation.nullable(),
  medicine_name: z.string(),
  quantity: z.coerce.number().int(),
  unit_price: z.coerce.number(),
  is_out_of_stock: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
}).passthrough();

// ── Paginated Response ──
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    count: z.coerce.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(itemSchema),
  });

