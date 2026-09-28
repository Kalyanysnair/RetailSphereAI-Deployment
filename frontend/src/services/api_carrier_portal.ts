const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/carrier`;

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

export interface ActiveAgreementSummary {
  agreement_id: number;
  agreement_number: string;
  title: string;
  effective_date: string | null;
  expiry_date: string | null;
  base_payout_rate: number;
  per_km_payout_rate: number;
  status: string;
}

export interface CarrierSummaryResponse {
  carrier_id: number;
  carrier_name: string;
  contact_email: string;
  contact_phone: string;
  coverage_areas: string;
  active_deliveries: number;
  pending_deliveries: number;
  completed_deliveries: number;
  delivery_personnel_count: number;
  active_agreement: ActiveAgreementSummary | null;
}

export interface AssignedPersonnelSummary {
  personnel_id: number;
  name: string;
  phone: string;
  vehicle_type?: string;
  vehicle_reg?: string;
}

export interface CarrierOrderItem {
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

export interface CarrierDeliveryItem {
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
  transportation_charge: number;
  items?: CarrierOrderItem[];
  items_count?: number;
  assigned_personnel?: AssignedPersonnelSummary | string | null;
  delivery_notes?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
}

export interface DeliveryPersonnelItem {
  personnel_id: number;
  carrier_id: number;
  name: string;
  phone: string;
  email?: string | null;
  vehicle_type?: string | null;
  vehicle_reg?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  notes?: string | null;
  created_at?: string;
}

export interface CarrierAgreementItem {
  agreement_id: number;
  carrier_id: number;
  agreement_number: string;
  title: string;
  effective_date: string | null;
  expiry_date: string | null;
  base_payout_rate: number;
  per_km_payout_rate: number;
  terms_text?: string | null;
  document_url?: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'DRAFT' | string;
  created_at?: string;
}

export interface CarrierSettlementItem {
  settlement_id: number;
  carrier_id: number;
  fulfillment_id?: number | null;
  order_type: string;
  order_id?: number | null;
  distance_km: number;
  customer_charge: number;
  carrier_payout: number;
  service_margin: number;
  settlement_status: 'PENDING' | 'PROCESSED' | 'PAID' | string;
  settled_at?: string | null;
  notes?: string | null;
  created_at?: string;
}

export async function fetchCarrierSummary(): Promise<CarrierSummaryResponse> {
  const res = await fetch(`${BASE_URL}/summary`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch carrier summary' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch summary`);
  }
  return res.json();
}

export async function fetchCurrentDeliveries(): Promise<CarrierDeliveryItem[]> {
  const res = await fetch(`${BASE_URL}/deliveries/current`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch current deliveries' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch current deliveries`);
  }
  return res.json();
}

export async function fetchPreviousDeliveries(): Promise<CarrierDeliveryItem[]> {
  const res = await fetch(`${BASE_URL}/deliveries/previous`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch previous deliveries' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch previous deliveries`);
  }
  return res.json();
}

export async function updateCarrierDeliveryStatus(
  fulfillmentId: number,
  status: string,
  notes?: string
): Promise<{ message: string; fulfillment_id: number; delivery_status: string }> {
  const res = await fetch(`${BASE_URL}/deliveries/${fulfillmentId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update delivery status' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to update status`);
  }
  return res.json();
}

export async function assignPersonnelToDelivery(
  fulfillmentId: number,
  personnelId: number
): Promise<{ message: string; personnel_name: string }> {
  const res = await fetch(`${BASE_URL}/deliveries/${fulfillmentId}/assign-personnel`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ personnel_id: personnelId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to assign personnel' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to assign personnel`);
  }
  return res.json();
}

export async function fetchDeliveryPersonnel(): Promise<DeliveryPersonnelItem[]> {
  const res = await fetch(`${BASE_URL}/personnel`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch delivery personnel' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch personnel`);
  }
  return res.json();
}

export async function createDeliveryPersonnel(data: {
  name: string;
  phone: string;
  email?: string;
  vehicle_type?: string;
  vehicle_reg?: string;
  notes?: string;
}): Promise<DeliveryPersonnelItem> {
  const res = await fetch(`${BASE_URL}/personnel`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create personnel' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to create personnel`);
  }
  return res.json();
}

export async function updateDeliveryPersonnel(
  personnelId: number,
  data: Partial<DeliveryPersonnelItem>
): Promise<DeliveryPersonnelItem> {
  const res = await fetch(`${BASE_URL}/personnel/${personnelId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update personnel' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to update personnel`);
  }
  return res.json();
}

export async function fetchCarrierAgreements(): Promise<CarrierAgreementItem[]> {
  const res = await fetch(`${BASE_URL}/agreements`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch agreements' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch agreements`);
  }
  return res.json();
}

export async function fetchCarrierSettlements(): Promise<CarrierSettlementItem[]> {
  const res = await fetch(`${BASE_URL}/settlements`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch settlements' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch settlements`);
  }
  return res.json();
}

export interface CarrierEmailChangeRequestItem {
  request_id: number;
  personnel_id: number;
  personnel_name: string;
  current_email: string;
  requested_email: string;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export async function fetchPersonnelEmailChangeRequests(): Promise<CarrierEmailChangeRequestItem[]> {
  const res = await fetch(`${BASE_URL}/email-change-requests`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch email change requests' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to fetch email change requests`);
  }
  return res.json();
}

export async function reviewPersonnelEmailChangeRequest(
  requestId: number,
  action: 'APPROVE' | 'REJECT',
  rejectionReason?: string
): Promise<{ success: boolean; message: string; request_id: number; status: string; new_email?: string }> {
  const res = await fetch(`${BASE_URL}/email-change-requests/${requestId}/review`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, rejection_reason: rejectionReason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to review email change request' }));
    throw new Error(err.detail || `Error ${res.status}: Failed to review email change request`);
  }
  return res.json();
}

