const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/delivery-personnel`;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token') || sessionStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface PersonnelCarrierAgency {
  carrier_id: number | null;
  carrier_name: string;
  contact_phone?: string | null;
  contact_email?: string | null;
}

export interface DeliveryPersonnelSummary {
  personnel_id: number;
  name: string;
  phone: string;
  email?: string | null;
  vehicle_type: string;
  vehicle_reg: string;
  status: string;
  carrier: PersonnelCarrierAgency | null;
  active_tasks_count: number;
  out_for_delivery_count: number;
  completed_tasks_count: number;
  total_tasks_count: number;
}

export interface DeliveryTaskItem {
  item_id: number;
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string | null;
  dimensions?: string | null;
  material?: string | null;
}

export interface DeliveryPersonnelTask {
  fulfillment_id: number;
  order_id: string;
  raw_order_id?: number | null;
  job_type: string;
  fulfillment_status: string;
  delivery_status: string;
  tracking_number: string;
  expected_delivery_date: string;
  pickup_address: string;
  destination_address: string;
  distance_km: number;
  customer_name: string;
  customer_phone?: string | null;
  total_amount: number;
  items: DeliveryTaskItem[];
  items_count: number;
  delivery_notes?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
}

export async function fetchPersonnelSummary(): Promise<DeliveryPersonnelSummary> {
  const res = await fetch(`${BASE_URL}/summary`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch personnel summary' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch summary`);
  }
  return res.json();
}

export async function fetchPersonnelTasks(): Promise<DeliveryPersonnelTask[]> {
  const res = await fetch(`${BASE_URL}/tasks`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch assigned delivery tasks' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch tasks`);
  }
  return res.json();
}

export async function updatePersonnelTaskStatus(
  fulfillmentId: number,
  status: string,
  notes?: string
): Promise<{ success: boolean; message: string; fulfillment_id: number; delivery_status: string }> {
  const res = await fetch(`${BASE_URL}/tasks/${fulfillmentId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update task status' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to update task status`);
  }
  return res.json();
}

export async function acknowledgePersonnelTask(
  fulfillmentId: number
): Promise<{ success: boolean; message: string; fulfillment_id: number; delivery_status: string }> {
  const res = await fetch(`${BASE_URL}/tasks/${fulfillmentId}/acknowledge`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ is_read: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to acknowledge task' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to acknowledge task`);
  }
  return res.json();
}

export interface EmailChangeRequestItem {
  request_id: number;
  current_email: string;
  requested_email: string;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function submitEmailChangeRequest(payload: {
  requested_email: string;
  reason?: string;
}): Promise<{ success: boolean; message: string; request_id: number; requested_email: string; status: string }> {
  const res = await fetch(`${BASE_URL}/request-email-change`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to submit email change request' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to submit request`);
  }
  return res.json();
}

export async function fetchEmailChangeRequests(): Promise<EmailChangeRequestItem[]> {
  const res = await fetch(`${BASE_URL}/email-change-requests`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch email change requests' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch email change requests`);
  }
  return res.json();
}

