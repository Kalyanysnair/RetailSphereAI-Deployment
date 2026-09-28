const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/quality`;

export interface QualityInspectionItem {
  inspection_id: number;
  order_type: 'Custom' | 'Fabrication' | 'Readymade' | string;
  order_id: number;
  stage_id?: number | null;
  inspector_id: number;
  inspector_name: string;
  result: 'PASS' | 'FAIL';
  checklist: {
    dimensions: boolean;
    finishing: boolean;
    structure: boolean;
    specifications: boolean;
  };
  inspection_notes?: string;
  photos?: string;
  inspected_at?: string;
}

export interface ReworkJobItem {
  rework_id: number;
  inspection_id: number;
  order_type: string;
  order_id: number;
  assigned_worker_id: number;
  worker_name: string;
  rework_reason: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | string;
  created_at?: string;
  resolved_at?: string;
}

export async function fetchQualityInspectionsApi(orderType?: string, orderId?: number): Promise<QualityInspectionItem[]> {
  try {
    let url = `${BASE_URL}/inspections`;
    if (orderType && orderId) {
      url += `?order_type=${orderType}&order_id=${orderId}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch quality inspections:', err);
  }
  return [];
}

export async function recordQualityInspectionApi(payload: {
  order_type: string;
  order_id: number;
  stage_id?: number;
  inspector_id?: number;
  result: 'PASS' | 'FAIL';
  dimensions_check?: boolean;
  finishing_check?: boolean;
  structure_check?: boolean;
  specifications_check?: boolean;
  inspection_notes?: string;
  photos?: string;
  rework_worker_id?: number;
}): Promise<{ message: string; inspection_id: number; result: string }> {
  const res = await fetch(`${BASE_URL}/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to record inspection' }));
    throw new Error(err.detail || 'Failed to record inspection');
  }
  return await res.json();
}

export async function fetchReworkJobsApi(): Promise<ReworkJobItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/rework`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch rework jobs:', err);
  }
  return [];
}

export async function resolveReworkJobApi(reworkId: number, notes?: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/rework/${reworkId}/resolve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to resolve rework job' }));
    throw new Error(err.detail || 'Failed to resolve rework job');
  }
  return await res.json();
}
