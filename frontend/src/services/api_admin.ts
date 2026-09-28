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
