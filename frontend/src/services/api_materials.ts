const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/materials`;

export interface RawMaterialItem {
  material_id: number;
  category: string;
  material_name: string;
  unit: string;
  available_qty: number;
  reserved_qty: number;
  used_qty: number;
  wasted_qty: number;
  reorder_level: number;
  unit_cost: number;
  status: 'In Stock' | 'Low Stock';
}

export interface CustomerMaterialItem {
  material_id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  material_type: string;
  wood_type?: string;
  quantity: number;
  unit: string;
  dimensions?: string;
  condition?: string;
  photos?: string;
  notes?: string;
  status: string;
  remaining_quantity: number;
  created_at?: string;
}

export async function fetchRawMaterialsApi(): Promise<RawMaterialItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/raw`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch raw materials:', err);
  }
  return [];
}

export async function createRawMaterialApi(payload: {
  category: string;
  material_name: string;
  unit: string;
  available_qty: number;
  reorder_level: number;
  unit_cost: number;
}): Promise<{ message: string; material_id: number }> {
  const res = await fetch(`${BASE_URL}/raw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add raw material' }));
    throw new Error(err.detail || 'Failed to add raw material');
  }
  return await res.json();
}

export async function updateRawMaterialStockApi(
  materialId: number,
  payload: {
    available_qty?: number;
    reserved_qty?: number;
    used_qty?: number;
    wasted_qty?: number;
  }
): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/raw/${materialId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update stock' }));
    throw new Error(err.detail || 'Failed to update stock');
  }
  return await res.json();
}

export async function fetchCustomerMaterialsApi(): Promise<CustomerMaterialItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/customer`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch customer materials:', err);
  }
  return [];
}
