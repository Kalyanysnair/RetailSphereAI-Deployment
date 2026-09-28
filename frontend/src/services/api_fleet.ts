export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export interface VehicleItem {
  id: string; // e.g. "VH-001"
  vehicle_id: number;
  registration_number: string;
  vehicle_type: string;
  capacity: number;
  assigned_driver_id: number | null;
  assigned_driver_name: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'INACTIVE';
  notes: string;
  model_name?: string;
  year?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ActiveInternalDelivery {
  fulfillment_id: number;
  order_id: string;
  raw_order_id: number;
  vehicle_code: string;
  registration_number: string;
  vehicle_type: string;
  driver_name: string;
  status: string;
  dispatch_date: string;
  expected_delivery_date: string;
  customer_name: string;
}

export interface FleetSummary {
  summary: {
    total: number;
    available: number;
    assigned: number;
    maintenance: number;
    inactive: number;
  };
  active_deliveries: ActiveInternalDelivery[];
}

export interface VehicleDetailResponse {
  vehicle: VehicleItem;
  current_assignment: {
    order_id: string;
    raw_order_id: number;
    customer: string;
    customer_email: string;
    dispatch_date: string;
    expected_delivery_date: string;
    order_status: string;
  } | null;
  delivery_history: Array<{
    order_id: string;
    customer: string;
    dispatch_date: string;
    delivery_status: string;
  }>;
}

export interface CreateVehiclePayload {
  registration_number: string;
  vehicle_type: string;
  capacity: number;
  assigned_driver_id?: number | null;
  status?: string;
  notes?: string;
  model_name?: string;
  year?: number;
}

export interface UpdateVehiclePayload {
  registration_number?: string;
  vehicle_type?: string;
  capacity?: number;
  assigned_driver_id?: number | null;
  status?: string;
  notes?: string;
  model_name?: string;
  year?: number;
}

export async function fetchFleetSummaryDB(): Promise<FleetSummary | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/fleet/summary`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching fleet summary:', err);
    return null;
  }
}

export async function fetchVehiclesDB(statusFilter?: string, includeInactive: boolean = true): Promise<VehicleItem[]> {
  try {
    let url = `${API_BASE_URL}/api/fleet/vehicles?include_inactive=${includeInactive}`;
    if (statusFilter && statusFilter !== 'ALL') {
      url += `&status=${statusFilter}`;
    }
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching vehicles list:', err);
    return [];
  }
}

export async function fetchAvailableVehiclesDB(): Promise<VehicleItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/fleet/vehicles/available`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching available vehicles:', err);
    return [];
  }
}

export async function fetchVehicleDetailsDB(vehicleId: number): Promise<VehicleDetailResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/fleet/vehicles/${vehicleId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching vehicle details:', err);
    return null;
  }
}

export async function createVehicleDB(payload: CreateVehiclePayload): Promise<VehicleItem> {
  const res = await fetch(`${API_BASE_URL}/api/fleet/vehicles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create vehicle' }));
    throw new Error(err.detail || 'Failed to create vehicle');
  }

  const data = await res.json();
  return data.vehicle;
}

export async function updateVehicleDB(vehicleId: number, payload: UpdateVehiclePayload): Promise<VehicleItem> {
  const res = await fetch(`${API_BASE_URL}/api/fleet/vehicles/${vehicleId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update vehicle' }));
    throw new Error(err.detail || 'Failed to update vehicle');
  }

  const data = await res.json();
  return data.vehicle;
}

export interface EligibleDriver {
  user_id: number;
  id: number;
  full_name: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  specialization?: string;
  is_driver: boolean;
}

export async function fetchEligibleDriversDB(): Promise<EligibleDriver[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/fleet/drivers`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching eligible drivers from DB:', err);
    return [];
  }
}

export async function updateVehicleStatusDB(vehicleId: number, statusVal: string): Promise<VehicleItem> {
  const res = await fetch(`${API_BASE_URL}/api/fleet/vehicles/${vehicleId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status: statusVal }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update vehicle status' }));
    throw new Error(err.detail || 'Failed to update vehicle status');
  }

  const data = await res.json();
  return data.vehicle;
}
