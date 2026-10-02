export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export interface AdminDashboardSummary {
  business_metrics: {
    total_orders: number;
    todays_orders: number;
    pending_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    return_requests: number;
    total_customers: number;
    active_customers: number;
    total_products: number;
    low_stock_items: number;
  };
  revenue_metrics: {
    total_revenue: number;
    todays_revenue: number;
    this_month_revenue: number;
    paid_orders_count: number;
    pending_payments_count: number;
    refunds_total_amount: number;
    cancelled_order_value: number;
  };
  order_overview: {
    readymade: number;
    customization: number;
    fabrication: number;
    onsite_services: number;
  };
  order_status_counts: Record<string, number>;
  custom_pipeline_counts: Record<string, number>;
  production_status_summary: {
    technical_assessment: number;
    quotation_pending: number;
    customer_approval: number;
    payment_pending: number;
    material_pending: number;
    in_production: number;
    qc_pending: number;
    rework: number;
    completed_today: number;
  };
  worker_overview: {
    total_workers: number;
    status_counts: Record<string, number>;
    skill_counts: Record<string, number>;
  };
  alerts: Array<{
    id: string;
    severity: 'URGENT' | 'LOW_STOCK' | 'WARNING';
    title: string;
    description: string;
    type: string;
  }>;
  recent_activities: Array<{
    id: number;
    actorName: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
    timestamp: string;
  }>;
}

export interface RevenueAnalyticsData {
  period: string;
  period_label?: string;
  total_revenue: number;
  order_count: number;
  average_order_value: number;
  paid_amount: number;
  refund_amount: number;
  net_revenue?: number;
  chart_data: Array<{ date: string; amount: number; orderType: string }>;
}

export interface ProductionBottleneckItem {
  stage: string;
  pending_jobs: number;
  in_progress_jobs: number;
  assigned_workers_count: number;
  avg_waiting_time_hours: number;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SearchResultItem {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  entityId: number;
}

export const fetchAdminDashboardSummaryDB = async (): Promise<AdminDashboardSummary | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/dashboard-summary`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching Admin Dashboard Summary:', err);
    return null;
  }
};

export const fetchRevenueAnalyticsDB = async (period: string = '30days'): Promise<RevenueAnalyticsData | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/analytics/revenue?period=${period}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching Revenue Analytics:', err);
    return null;
  }
};

export const fetchProductionBottlenecksDB = async (): Promise<ProductionBottleneckItem[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/pipeline/bottlenecks`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching Production Bottlenecks:', err);
    return [];
  }
};

export const fetchAuditLogsDB = async (limit: number = 50) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs?limit=${limit}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching Audit Logs:', err);
    return [];
  }
};

export const recordAuditLogDB = async (action: string, entity_type: string, entity_id?: string, details?: string) => {
  try {
    await fetch(`${API_BASE_URL}/api/admin/audit-logs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ action, entity_type, entity_id, details })
    });
  } catch (err) {
    console.error('Error recording Audit Log:', err);
  }
};

export const performGlobalSearchDB = async (query: string): Promise<SearchResultItem[]> => {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/search?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.error('Error performing Global Search:', err);
    return [];
  }
};

export const toggleUserStatusDB = async (userId: number): Promise<{ message: string; status: boolean; status_text: string }> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to toggle user status' }));
    throw new Error(err.detail || 'Failed to toggle user status');
  }
  return await res.json();
};

export const updateUserDB = async (userId: number, payload: {
  full_name?: string;
  email?: string;
  phone?: string;
  role_name?: string;
  status?: boolean;
  is_driver?: boolean;
}) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update user account' }));
    throw new Error(err.detail || 'Failed to update user account');
  }
  return await res.json();
};

export const exportDatabaseExcel = async (): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/admin/export-database-excel`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error('Failed to export database Excel file');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RetailSphere_Database_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// --- 1. Customer Reviews ---
export const fetchAdminReviewsDB = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/reviews`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching admin reviews:', err);
    return [];
  }
};

export const deleteAdminReviewDB = async (reviewId: number) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete review' }));
    throw new Error(err.detail || 'Failed to delete review');
  }
  return await res.json();
};

// --- 2. Carrier Agreements, Rate Cards, Settlements & Email Change Requests ---
export const fetchAdminCarrierAgreementsDB = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/carrier-agreements`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching carrier agreements:', err);
    return [];
  }
};

export const createAdminCarrierAgreementDB = async (payload: any) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/carrier-agreements`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create agreement' }));
    throw new Error(err.detail || 'Failed to create agreement');
  }
  return await res.json();
};

export const fetchAdminRateCardsDB = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/rate-cards`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching rate cards:', err);
    return [];
  }
};

export const updateAdminRateCardDB = async (rateId: number, payload: any) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/rate-cards/${rateId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update rate card' }));
    throw new Error(err.detail || 'Failed to update rate card');
  }
  return await res.json();
};

export const fetchAdminCarrierSettlementsDB = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/carrier-settlements`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching carrier settlements:', err);
    return [];
  }
};

export const updateAdminSettlementStatusDB = async (settlementId: number, status: string) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/carrier-settlements/${settlementId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update settlement' }));
    throw new Error(err.detail || 'Failed to update settlement');
  }
  return await res.json();
};

export const fetchAdminPersonnelEmailChangeRequestsDB = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/personnel-email-change-requests`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching driver email change requests:', err);
    return [];
  }
};

export const reviewAdminPersonnelEmailChangeRequestDB = async (requestId: number, action: 'APPROVE' | 'REJECT', rejection_reason?: string) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/personnel-email-change-requests/${requestId}/review`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, rejection_reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to review email change request' }));
    throw new Error(err.detail || 'Failed to review email change request');
  }
  return await res.json();
};

// --- 3. Order Returns & Cancellations ---
export const fetchAdminOrderReturnsDB = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/returns/all`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching return requests:', err);
    return [];
  }
};

export const updateAdminReturnStatusDB = async (returnId: number, payload: { status: string; refund_status?: string; notes?: string }) => {
  const res = await fetch(`${API_BASE_URL}/api/orders/returns/${returnId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update return status' }));
    throw new Error(err.detail || 'Failed to update return status');
  }
  return await res.json();
};

export const fetchAdminOrderCancellationsDB = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/cancellations`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching order cancellations:', err);
    return [];
  }
};

// --- 4. Workshop Machinery & Equipment ---
export const fetchAdminMachinesDB = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/machines`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching machines:', err);
    return [];
  }
};

export const createAdminMachineDB = async (payload: { machine_name: string; category: string }) => {
  const res = await fetch(`${API_BASE_URL}/api/machines`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add machine' }));
    throw new Error(err.detail || 'Failed to add machine');
  }
  return await res.json();
};

export const updateAdminMachineStatusDB = async (machineId: number, status: string) => {
  const res = await fetch(`${API_BASE_URL}/api/machines/${machineId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update machine status' }));
    throw new Error(err.detail || 'Failed to update machine status');
  }
  return await res.json();
};

export const fetchAdminMachineMaintenanceDB = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/machines/maintenance/all`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching machine maintenance logs:', err);
    return [];
  }
};

export const addAdminMachineMaintenanceDB = async (machineId: number, payload: { description: string; performed_by: string; maintenance_type: string }) => {
  const res = await fetch(`${API_BASE_URL}/api/machines/${machineId}/maintenance`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to log maintenance' }));
    throw new Error(err.detail || 'Failed to log maintenance');
  }
  return await res.json();
};

// --- 5. AI System Execution Logs ---
export const fetchAdminAILogsDB = async (limit: number = 100) => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/ai-logs?limit=${limit}`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching AI logs:', err);
    return [];
  }
};

