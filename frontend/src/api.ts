import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { User, Service, DoctorProfile, OpeningHours, ContactMessage, Appointment, VisitNote, Prescription, Document, Invoice, Product, Order, OrderItem, UserSchema, ServiceSchema, DoctorProfileSchema, OpeningHoursSchema, ContactMessageSchema, AppointmentSchema, VisitNoteSchema, PrescriptionSchema, DocumentSchema, InvoiceSchema, ProductSchema, OrderSchema, OrderItemSchema, PaginatedResponseSchema } from './types';

const API_BASE_URL = '/api';

// Auto-detect K8s preview proxy and rewrite API URLs
const isProxied = window.location.pathname.includes('/preview/proxy');
const proxyBase = isProxied
  ? window.location.pathname.replace(/\/preview\/proxy.*/, '/preview/proxy')
  : '';

const api: AxiosInstance = axios.create({
  baseURL: proxyBase + API_BASE_URL,
});

// A body holding a picked file goes as multipart, so the file reaches the API (P1b.6 R2): the other fields go
// alongside it as text, a list item by item, and axios sets the multipart header itself.
const asUpload = (data: unknown): unknown => {
  if (!data || typeof data !== 'object' || data instanceof FormData || data instanceof Blob) return data;
  const entries = Object.entries(data as Record<string, unknown>);
  if (!entries.some(([, value]) => value instanceof Blob)) return data;
  const form = new FormData();
  for (const [key, value] of entries) {
    if (value === undefined || value === null) continue;
    if (value instanceof Blob) form.append(key, value);
    else if (Array.isArray(value)) value.forEach((item) => form.append(key, String(item)));
    else form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  return form;
};

api.interceptors.request.use((config) => {
  config.data = asUpload(config.data);
  return config;
});

// Auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// On a 401 with a stored refresh token (the Express track issues one), refresh once and retry.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const refreshToken = localStorage.getItem('refreshToken');
    if (error.response?.status === 401 && refreshToken && original && !original._retried) {
      original._retried = true;
      try {
        const res = await axios.post(proxyBase + API_BASE_URL + '/auth/refresh/', { refreshToken });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('refreshToken', res.data.refreshToken);
        return api(original);
      } catch {
        localStorage.removeItem('refreshToken');
      }
    }
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      localStorage.removeItem('token');
      if (originalRequest.method === 'get') {
        originalRequest._retry = true;
        delete originalRequest.headers.Authorization;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

// Response validation is advisory: a schema mismatch must never blank a page.
const parseOr = <S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn('[api] response did not match schema, using raw data:', result.error.issues.slice(0, 3));
    return data as z.output<S>;
  }
  return result.data;
};

// Auth API
export const login = (credentials: { username: string; password: string }) =>
  api.post('/auth/login/', credentials);
export const register = (data: { username: string; email: string; password: string }) =>
  api.post('/auth/register/', data);
export const logout = () => api.post('/auth/logout/');
export const getProfile = () => api.get('/auth/profile/');

// ── User API ──
export const getUserList = async (params?: Record<string, unknown>): Promise<User[]> => {
  const res = await api.get('/people/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.users ?? res.data?.users ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(UserSchema), data) as User[];
};

export const getUser = async (id: number | string | Record<string, unknown>): Promise<User> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getUserList(id) as unknown as Promise<User>;
  const res = await api.get(`/people/${id}/`);
  return parseOr(UserSchema, res.data) as User;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createUser = async (data: Partial<Omit<User, 'id'>>): Promise<User> => {
  const res = await api.post('/people/', data);
  return parseOr(UserSchema, res.data) as User;
};

export const updateUser = async (id: number, data: Partial<User>): Promise<User> => {
  const res = await api.patch(`/people/${id}/`, data);
  return parseOr(UserSchema, res.data) as User;
};

export const deleteUser = async (id: number) => {
  await api.delete(`/people/${id}/`);
};

// ── Service API ──
export const getServiceList = async (params?: Record<string, unknown>): Promise<Service[]> => {
  const res = await api.get('/services/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.services ?? res.data?.services ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(ServiceSchema), data) as Service[];
};

export const getService = async (id: number | string | Record<string, unknown>): Promise<Service> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getServiceList(id) as unknown as Promise<Service>;
  const res = await api.get(`/services/${id}/`);
  return parseOr(ServiceSchema, res.data) as Service;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createService = async (data: Partial<Omit<Service, 'id'>>): Promise<Service> => {
  const res = await api.post('/services/', data);
  return parseOr(ServiceSchema, res.data) as Service;
};

export const updateService = async (id: number, data: Partial<Service>): Promise<Service> => {
  const res = await api.patch(`/services/${id}/`, data);
  return parseOr(ServiceSchema, res.data) as Service;
};

export const deleteService = async (id: number) => {
  await api.delete(`/services/${id}/`);
};

// ── DoctorProfile API ──
export const getDoctorProfileList = async (params?: Record<string, unknown>): Promise<DoctorProfile[]> => {
  const res = await api.get('/doctors/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.doctor_profiles ?? res.data?.doctorProfiles ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(DoctorProfileSchema), data) as DoctorProfile[];
};

export const getDoctorProfile = async (id: number | string | Record<string, unknown>): Promise<DoctorProfile> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getDoctorProfileList(id) as unknown as Promise<DoctorProfile>;
  const res = await api.get(`/doctors/${id}/`);
  return parseOr(DoctorProfileSchema, res.data) as DoctorProfile;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createDoctorProfile = async (data: Partial<Omit<DoctorProfile, 'id'>>): Promise<DoctorProfile> => {
  const res = await api.post('/doctors/', data);
  return parseOr(DoctorProfileSchema, res.data) as DoctorProfile;
};

export const updateDoctorProfile = async (id: number, data: Partial<DoctorProfile>): Promise<DoctorProfile> => {
  const res = await api.patch(`/doctors/${id}/`, data);
  return parseOr(DoctorProfileSchema, res.data) as DoctorProfile;
};

export const deleteDoctorProfile = async (id: number) => {
  await api.delete(`/doctors/${id}/`);
};

// ── OpeningHours API ──
export const getOpeningHoursList = async (params?: Record<string, unknown>): Promise<OpeningHours[]> => {
  const res = await api.get('/opening-hours/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.opening_hourses ?? res.data?.openingHourses ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(OpeningHoursSchema), data) as OpeningHours[];
};

export const getOpeningHours = async (id: number | string | Record<string, unknown>): Promise<OpeningHours> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getOpeningHoursList(id) as unknown as Promise<OpeningHours>;
  const res = await api.get(`/opening-hours/${id}/`);
  return parseOr(OpeningHoursSchema, res.data) as OpeningHours;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createOpeningHours = async (data: Partial<Omit<OpeningHours, 'id'>>): Promise<OpeningHours> => {
  const res = await api.post('/opening-hours/', data);
  return parseOr(OpeningHoursSchema, res.data) as OpeningHours;
};

export const updateOpeningHours = async (id: number, data: Partial<OpeningHours>): Promise<OpeningHours> => {
  const res = await api.patch(`/opening-hours/${id}/`, data);
  return parseOr(OpeningHoursSchema, res.data) as OpeningHours;
};

export const deleteOpeningHours = async (id: number) => {
  await api.delete(`/opening-hours/${id}/`);
};

// ── ContactMessage API ──
export const getContactMessageList = async (params?: Record<string, unknown>): Promise<ContactMessage[]> => {
  const res = await api.get('/contact-messages/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.contact_messages ?? res.data?.contactMessages ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(ContactMessageSchema), data) as ContactMessage[];
};

export const getContactMessage = async (id: number | string | Record<string, unknown>): Promise<ContactMessage> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getContactMessageList(id) as unknown as Promise<ContactMessage>;
  const res = await api.get(`/contact-messages/${id}/`);
  return parseOr(ContactMessageSchema, res.data) as ContactMessage;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createContactMessage = async (data: Partial<Omit<ContactMessage, 'id'>>): Promise<ContactMessage> => {
  const res = await api.post('/contact-messages/', data);
  return parseOr(ContactMessageSchema, res.data) as ContactMessage;
};

export const updateContactMessage = async (id: number, data: Partial<ContactMessage>): Promise<ContactMessage> => {
  const res = await api.patch(`/contact-messages/${id}/`, data);
  return parseOr(ContactMessageSchema, res.data) as ContactMessage;
};

export const deleteContactMessage = async (id: number) => {
  await api.delete(`/contact-messages/${id}/`);
};

// ── Appointment API ──
export const getAppointmentList = async (params?: Record<string, unknown>): Promise<Appointment[]> => {
  const res = await api.get('/appointments/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.appointments ?? res.data?.appointments ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(AppointmentSchema), data) as Appointment[];
};

export const getAppointment = async (id: number | string | Record<string, unknown>): Promise<Appointment> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getAppointmentList(id) as unknown as Promise<Appointment>;
  const res = await api.get(`/appointments/${id}/`);
  return parseOr(AppointmentSchema, res.data) as Appointment;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createAppointment = async (data: Partial<Omit<Appointment, 'id'>>): Promise<Appointment> => {
  const res = await api.post('/appointments/', data);
  return parseOr(AppointmentSchema, res.data) as Appointment;
};

export const updateAppointment = async (id: number, data: Partial<Appointment>): Promise<Appointment> => {
  const res = await api.patch(`/appointments/${id}/`, data);
  return parseOr(AppointmentSchema, res.data) as Appointment;
};

export const deleteAppointment = async (id: number) => {
  await api.delete(`/appointments/${id}/`);
};

// ── VisitNote API ──
export const getVisitNoteList = async (params?: Record<string, unknown>): Promise<VisitNote[]> => {
  const res = await api.get('/visit-notes/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.visit_notes ?? res.data?.visitNotes ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(VisitNoteSchema), data) as VisitNote[];
};

export const getVisitNote = async (id: number | string | Record<string, unknown>): Promise<VisitNote> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getVisitNoteList(id) as unknown as Promise<VisitNote>;
  const res = await api.get(`/visit-notes/${id}/`);
  return parseOr(VisitNoteSchema, res.data) as VisitNote;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createVisitNote = async (data: Partial<Omit<VisitNote, 'id'>>): Promise<VisitNote> => {
  const res = await api.post('/visit-notes/', data);
  return parseOr(VisitNoteSchema, res.data) as VisitNote;
};

export const updateVisitNote = async (id: number, data: Partial<VisitNote>): Promise<VisitNote> => {
  const res = await api.patch(`/visit-notes/${id}/`, data);
  return parseOr(VisitNoteSchema, res.data) as VisitNote;
};

export const deleteVisitNote = async (id: number) => {
  await api.delete(`/visit-notes/${id}/`);
};

// ── Prescription API ──
export const getPrescriptionList = async (params?: Record<string, unknown>): Promise<Prescription[]> => {
  const res = await api.get('/prescriptions/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.prescriptions ?? res.data?.prescriptions ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(PrescriptionSchema), data) as Prescription[];
};

export const getPrescription = async (id: number | string | Record<string, unknown>): Promise<Prescription> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getPrescriptionList(id) as unknown as Promise<Prescription>;
  const res = await api.get(`/prescriptions/${id}/`);
  return parseOr(PrescriptionSchema, res.data) as Prescription;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createPrescription = async (data: Partial<Omit<Prescription, 'id'>>): Promise<Prescription> => {
  const res = await api.post('/prescriptions/', data);
  return parseOr(PrescriptionSchema, res.data) as Prescription;
};

export const updatePrescription = async (id: number, data: Partial<Prescription>): Promise<Prescription> => {
  const res = await api.patch(`/prescriptions/${id}/`, data);
  return parseOr(PrescriptionSchema, res.data) as Prescription;
};

export const deletePrescription = async (id: number) => {
  await api.delete(`/prescriptions/${id}/`);
};

// ── Document API ──
export const getDocumentList = async (params?: Record<string, unknown>): Promise<Document[]> => {
  const res = await api.get('/documents/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.documents ?? res.data?.documents ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(DocumentSchema), data) as Document[];
};

export const getDocument = async (id: number | string | Record<string, unknown>): Promise<Document> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getDocumentList(id) as unknown as Promise<Document>;
  const res = await api.get(`/documents/${id}/`);
  return parseOr(DocumentSchema, res.data) as Document;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createDocument = async (data: Partial<Omit<Document, 'id'>>): Promise<Document> => {
  const res = await api.post('/documents/', data);
  return parseOr(DocumentSchema, res.data) as Document;
};

export const updateDocument = async (id: number, data: Partial<Document>): Promise<Document> => {
  const res = await api.patch(`/documents/${id}/`, data);
  return parseOr(DocumentSchema, res.data) as Document;
};

export const deleteDocument = async (id: number) => {
  await api.delete(`/documents/${id}/`);
};

// ── Invoice API ──
export const getInvoiceList = async (params?: Record<string, unknown>): Promise<Invoice[]> => {
  const res = await api.get('/invoices/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.invoices ?? res.data?.invoices ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(InvoiceSchema), data) as Invoice[];
};

export const getInvoice = async (id: number | string | Record<string, unknown>): Promise<Invoice> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getInvoiceList(id) as unknown as Promise<Invoice>;
  const res = await api.get(`/invoices/${id}/`);
  return parseOr(InvoiceSchema, res.data) as Invoice;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createInvoice = async (data: Partial<Omit<Invoice, 'id'>>): Promise<Invoice> => {
  const res = await api.post('/invoices/', data);
  return parseOr(InvoiceSchema, res.data) as Invoice;
};

export const updateInvoice = async (id: number, data: Partial<Invoice>): Promise<Invoice> => {
  const res = await api.patch(`/invoices/${id}/`, data);
  return parseOr(InvoiceSchema, res.data) as Invoice;
};

export const deleteInvoice = async (id: number) => {
  await api.delete(`/invoices/${id}/`);
};

// ── Product API ──
export const getProductList = async (params?: Record<string, unknown>): Promise<Product[]> => {
  const res = await api.get('/products/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.products ?? res.data?.products ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(ProductSchema), data) as Product[];
};

export const getProduct = async (id: number | string | Record<string, unknown>): Promise<Product> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getProductList(id) as unknown as Promise<Product>;
  const res = await api.get(`/products/${id}/`);
  return parseOr(ProductSchema, res.data) as Product;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createProduct = async (data: Partial<Omit<Product, 'id'>>): Promise<Product> => {
  const res = await api.post('/products/', data);
  return parseOr(ProductSchema, res.data) as Product;
};

export const updateProduct = async (id: number, data: Partial<Product>): Promise<Product> => {
  const res = await api.patch(`/products/${id}/`, data);
  return parseOr(ProductSchema, res.data) as Product;
};

export const deleteProduct = async (id: number) => {
  await api.delete(`/products/${id}/`);
};

// ── Order API ──
export const getOrderList = async (params?: Record<string, unknown>): Promise<Order[]> => {
  const res = await api.get('/orders/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.orders ?? res.data?.orders ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(OrderSchema), data) as Order[];
};

export const getOrder = async (id: number | string | Record<string, unknown>): Promise<Order> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getOrderList(id) as unknown as Promise<Order>;
  const res = await api.get(`/orders/${id}/`);
  return parseOr(OrderSchema, res.data) as Order;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createOrder = async (data: Partial<Omit<Order, 'id'>>): Promise<Order> => {
  const res = await api.post('/orders/', data);
  return parseOr(OrderSchema, res.data) as Order;
};

export const updateOrder = async (id: number, data: Partial<Order>): Promise<Order> => {
  const res = await api.patch(`/orders/${id}/`, data);
  return parseOr(OrderSchema, res.data) as Order;
};

export const deleteOrder = async (id: number) => {
  await api.delete(`/orders/${id}/`);
};

// ── OrderItem API ──
export const getOrderItemList = async (params?: Record<string, unknown>): Promise<OrderItem[]> => {
  const res = await api.get('/order-items/', params ? { params } : undefined);
  const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? res.data?.data ?? res.data?.items ?? res.data?.order_items ?? res.data?.orderItems ?? []);
  // The interface is the strict type: a field name the API does not send is a compile error, not an unknown.
  return parseOr(z.array(OrderItemSchema), data) as OrderItem[];
};

export const getOrderItem = async (id: number | string | Record<string, unknown>): Promise<OrderItem> => {
  // Pages sometimes call the detail getter with a filter object; route that to the list endpoint.
  if (typeof id === 'object' && id !== null) return getOrderItemList(id) as unknown as Promise<OrderItem>;
  const res = await api.get(`/order-items/${id}/`);
  return parseOr(OrderItemSchema, res.data) as OrderItem;
};

// Create sends the fields a form holds; the server sets owner, status, totals and times, and validates.
export const createOrderItem = async (data: Partial<Omit<OrderItem, 'id'>>): Promise<OrderItem> => {
  const res = await api.post('/order-items/', data);
  return parseOr(OrderItemSchema, res.data) as OrderItem;
};

export const updateOrderItem = async (id: number, data: Partial<OrderItem>): Promise<OrderItem> => {
  const res = await api.patch(`/order-items/${id}/`, data);
  return parseOr(OrderItemSchema, res.data) as OrderItem;
};

export const deleteOrderItem = async (id: number) => {
  await api.delete(`/order-items/${id}/`);
};


// Auth aliases — domain agents use varied naming conventions
export const loginUser = (email: string, password: string) => api.post('/auth/login/', { username: email, password });
export const registerUser = (userData: any) => api.post('/auth/register/', userData);
export const getCurrentUser = getProfile;
export const updateUserProfile = (data: Partial<any>) => api.patch('/auth/profile/', data);

export { api };
export default api;
