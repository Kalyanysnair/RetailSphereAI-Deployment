const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api`;

async function safeFetch(urlPath: string, options?: RequestInit): Promise<Response> {
  const cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  const token = localStorage.getItem('access_token');
  const headers = {
    ...(options?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const reqOptions: RequestInit = {
    ...options,
    headers
  };

  // 1. First try relative URL `/api${cleanPath}` (uses Vite dev proxy seamlessly)
  const relativeUrl = `/api${cleanPath}`;
  try {
    const res = await fetch(relativeUrl, reqOptions);
    return res;
  } catch (relativeErr) {
    // 2. Fallback to direct IPv4 backend URL if proxy is bypassed
    const directUrl127 = `http://127.0.0.1:8000/api${cleanPath}`;
    try {
      return await fetch(directUrl127, reqOptions);
    } catch (directErr) {
      const directUrlLocal = `http://localhost:8000/api${cleanPath}`;
      try {
        return await fetch(directUrlLocal, reqOptions);
      } catch (lastErr) {
        throw lastErr || directErr || relativeErr;
      }
    }
  }
}

export interface UserSignupPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface UserProfile {
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  role_name: string;
  status: boolean;
  must_change_password?: boolean;
  is_driver?: boolean;
  specialization?: string;
  created_at: string;
  customer?: {
    customer_id: number;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

import { clearUserSession, markSessionActive } from '../utils/sessionUtils';

export async function signupUser(payload: UserSignupPayload): Promise<AuthResponse> {
  const response = await safeFetch('/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Signup failed' }));
    let errorMsg = 'Failed to sign up';
    if (typeof errorData.detail === 'string') {
      errorMsg = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      errorMsg = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
    }
    throw new Error(errorMsg);
  }

  const data: AuthResponse = await response.json();
  if (data.access_token) {
    markSessionActive();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('storage'));
  }
  return data;
}

export async function loginUser(payload: UserLoginPayload): Promise<AuthResponse> {
  const response = await safeFetch('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
    let errorMsg = 'Invalid username or password';
    if (typeof errorData.detail === 'string') {
      errorMsg = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      errorMsg = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
    }
    throw new Error(errorMsg);
  }

  const data: AuthResponse = await response.json();
  if (data.access_token) {
    markSessionActive();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('storage'));
  }
  return data;
}

export async function requestForgotPassword(email: string): Promise<{ message: string; reset_code?: string }> {
  const response = await safeFetch('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errorData.detail || 'Email not found');
  }

  return await response.json();
}

export async function resetUserPassword(email: string, reset_code: string, new_password: string): Promise<{ message: string }> {
  const response = await safeFetch('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, reset_code, new_password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Password reset failed' }));
    throw new Error(errorData.detail || 'Failed to reset password');
  }

  return await response.json();
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  try {
    const response = await safeFetch('/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      clearUserSession();
      return null;
    }

    const data: UserProfile = await response.json();
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

export function logoutUser(): void {
  clearUserSession();
}

export interface GoogleLoginPayload {
  email?: string;
  full_name?: string;
  google_token?: string;
}

export async function googleLoginUser(payload: GoogleLoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${BASE_URL}/auth/google-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Google Sign-in failed' }));
    throw new Error(errorData.detail || 'Google authentication failed');
  }

  const data: AuthResponse = await response.json();
  if (data.access_token) {
    markSessionActive();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('storage'));
  }
  return data;
}

export interface CreateStaffPayload {
  full_name: string;
  email: string;
  phone?: string;
  role_name: string;
  password?: string;
  skill_name?: string;
  proficiency_level?: string;
}

export async function createStaffUser(payload: CreateStaffPayload): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/admin/create-staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to create staff member' }));
      let msg = 'Failed to create staff member';
      if (typeof errorData.detail === 'string') {
        msg = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        msg = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      }
      throw new Error(msg);
    }

    return await response.json();
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
      throw new Error('Server connection temporarily interrupted. Please click "Create & Send Email" again.');
    }
    throw err;
  }
}

export async function fetchStaffUsers(): Promise<any[]> {
  try {
    const response = await safeFetch('/admin/staff');
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function fetchAllUsers(): Promise<any[]> {
  try {
    const response = await safeFetch('/admin/users');
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function createAdminUser(payload: {
  full_name: string;
  email: string;
  phone?: string;
  role_name: string;
  password?: string;
  status?: boolean;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to create user account' }));
    throw new Error(err.detail || 'Failed to create user account');
  }

  return await response.json();
}

export async function updateAdminUser(userId: number, payload: {
  full_name?: string;
  email?: string;
  phone?: string;
  role_name?: string;
  status?: boolean;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to update user' }));
    throw new Error(err.detail || 'Failed to update user');
  }

  return await response.json();
}

export async function toggleUserStatus(userId: number): Promise<any> {
  const response = await fetch(`${BASE_URL}/admin/users/${userId}/status`, {
    method: 'PUT',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to toggle status' }));
    throw new Error(err.detail || 'Failed to toggle status');
  }

  return await response.json();
}

export async function deleteUserById(userId: number): Promise<any> {
  const response = await fetch(`${BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to delete user' }));
    throw new Error(err.detail || 'Failed to delete user');
  }

  return await response.json();
}

export async function updateUserProfile(payload: {
  full_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  current_password?: string;
  new_password?: string;
}): Promise<UserProfile> {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Failed to update profile' }));
    throw new Error(err.detail || 'Failed to update profile');
  }

  const updated: UserProfile = await response.json();
  localStorage.setItem('user', JSON.stringify(updated));
  return updated;
}

export async function fetchInventoryFromDB(): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/admin/inventory`);
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function createProductInDB(payload: {
  name: string;
  category: string;
  subcategory?: string;
  material: string;
  price: number;
  stock_count: number;
  image_url?: string;
  color?: string;
  available_colors?: string;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/admin/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create product in DB');
  }
  return await response.json();
}


export async function updateStockInDB(
  productId: number,
  stockCount?: number,
  additionalData?: { name?: string; price?: number; material?: string; color?: string; available_colors?: string }
): Promise<void> {
  const body: any = {};
  if (stockCount !== undefined) body.stock_count = stockCount;
  if (additionalData) {
    if (additionalData.name !== undefined) body.name = additionalData.name;
    if (additionalData.price !== undefined) body.price = additionalData.price;
    if (additionalData.material !== undefined) body.material = additionalData.material;
    if (additionalData.color !== undefined) body.color = additionalData.color;
    if (additionalData.available_colors !== undefined) body.available_colors = additionalData.available_colors;
  }

  await fetch(`${BASE_URL}/admin/inventory/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchQueriesFromDB(): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/admin/queries`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('API error fetching queries from DB:', err);
  }
  return [];
}

export async function createStaffQueryInDB(payload: {
  staff_name: string;
  staff_email: string;
  category: string;
  subject: string;
  message: string;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/admin/queries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to submit query to DB');
  }
  return await response.json();
}

export async function respondToStaffQueryInDB(queryId: number, adminResponse: string, status: string): Promise<void> {
  await fetch(`${BASE_URL}/admin/queries/${queryId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_response: adminResponse, status }),
  });
}

export async function fetchNotificationsFromDB(): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/admin/notifications`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('API error fetching notifications from DB:', err);
  }
  return [];
}

export async function markNotificationReadInDB(notificationId: number | string): Promise<boolean> {
  try {
    const numericId = typeof notificationId === 'string' ? notificationId.replace('notif-', '') : notificationId;
    const response = await fetch(`${BASE_URL}/admin/notifications/${numericId}/read`, {
      method: 'PUT',
    });
    return response.ok;
  } catch (err) {
    console.warn('API error marking notification read in DB:', err);
    return false;
  }
}

export async function markAllNotificationsReadInDB(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/admin/notifications/mark-all-read`, {
      method: 'PUT',
    });
    return response.ok;
  } catch (err) {
    console.warn('API error marking all notifications read in DB:', err);
    return false;
  }
}

export async function fetchSuppliersFromDB(): Promise<any[]> {
  try {
    const response = await fetch(`${BASE_URL}/admin/suppliers`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('API error fetching suppliers from DB:', err);
  }
  return [];
}

export async function createSupplierInDB(payload: {
  supplier_name: string;
  contact_person: string;
  phone: string;
  email?: string;
  address: string;
  gst_number?: string;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/admin/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to create supplier in database');
  }
  return await response.json();
}

export async function changeFirstPassword(currentPassword: string, newPassword: string): Promise<UserProfile> {
  const token = localStorage.getItem('access_token');
  const response = await safeFetch('/auth/change-first-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to update password' }));
    throw new Error(errorData.detail || 'Failed to update password');
  }

  const updatedUser: UserProfile = await response.json();
  localStorage.setItem('user', JSON.stringify(updatedUser));
  window.dispatchEvent(new Event('storage'));
  return updatedUser;
}

export async function changePasswordUser(newPassword: string, currentPassword?: string): Promise<UserProfile> {
  const token = localStorage.getItem('access_token');
  const payload: any = { new_password: newPassword };
  if (currentPassword) payload.current_password = currentPassword;

  const response = await safeFetch('/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to change password' }));
    throw new Error(errorData.detail || 'Failed to change password');
  }

  const updatedUser: UserProfile = await response.json();
  localStorage.setItem('user', JSON.stringify(updatedUser));
  window.dispatchEvent(new Event('storage'));
  return updatedUser;
}





