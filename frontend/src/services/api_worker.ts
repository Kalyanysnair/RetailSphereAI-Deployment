export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export interface WorkerSummaryData {
  worker_id: number;
  worker_name: string;
  role: string;
  specialization: string;
  is_driver: boolean;
  active_tasks_count: number;
  pending_tasks_count: number;
  completed_today_count: number;
  onsite_jobs_count: number;
  rework_jobs_count?: number;
  driver_deliveries_count?: number;
}

export interface WorkerTaskItem {
  task_id: string;
  raw_assignment_id?: number;
  raw_stage_id?: number;
  order_type: string;
  order_id: string;
  raw_order_id: number;
  job_name: string;
  stage_name: string;
  required_skill: string;
  task_status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'PAUSED' | string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT' | string;
  assigned_date: string;
  dimensions: string;
  material: string;
  color: string;
  customer_requirements: string;
  reference_image?: string;
  technical_instructions?: string;
  started_at?: string;
  completed_at?: string;
  progress_percentage: number;
  completed_sections?: string[];
  current_section?: string;
  pause_reason?: string;
  is_pickup_pending?: boolean;
  pickup_carrier?: string;
  pickup_status?: string;
}

export interface WorkerCompletedHistoryItem {
  task_id: string;
  order_id: string;
  job_name: string;
  stage_name: string;
  completed_date: string;
  duration: string;
  status: string;
  technical_instructions?: string;
}

export interface WorkerOnsiteJobItem {
  job_id: number;
  service_id: string;
  service_category: string;
  description: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  scheduled_time: string;
  status: 'ASSIGNED' | 'IN_TRANSIT' | 'IN_PROGRESS' | 'COMPLETED' | string;
  before_photos?: string;
  after_photos?: string;
  customer_notes?: string;
  completed_at?: string;
}

export interface WorkerReworkItem {
  rework_id: number;
  inspection_id: number;
  order_type: string;
  order_id: string;
  raw_order_id: number;
  order_title: string;
  rework_reason: string;
  status: string;
  inspection_notes?: string;
  checklist?: {
    dimensions?: boolean;
    finishing?: boolean;
    structure?: boolean;
    specifications?: boolean;
  };
  photos?: string;
  reference_image?: string;
  dimensions?: string;
  material?: string;
  created_at?: string;
  resolved_at?: string;
}

export interface WorkerDeliveryItem {
  fulfillment_id: number;
  order_id: string;
  raw_order_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  vehicle_reg: string;
  vehicle_type: string;
  fulfillment_status: string;
  delivery_status: string;
  expected_delivery_date: string;
  dispatched_at?: string;
  delivered_at?: string;
  items_count: number;
  items_description: string;
  total_amount: number;
  delivery_notes?: string;
}

export async function fetchWorkerSummaryDB(): Promise<WorkerSummaryData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/my-summary`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching worker summary from DB:', err);
    return null;
  }
}

export async function fetchWorkerTasksDB(statusFilter?: string): Promise<WorkerTaskItem[]> {
  const userStr = localStorage.getItem('user_profile') || localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const workerId = user?.user_id || user?.id;
  const workerName = (user?.full_name || user?.name || user?.username || '').toLowerCase();
  const workerEmail = (user?.email || '').toLowerCase();

  try {
    const url = statusFilter && statusFilter !== 'All'
      ? `${API_BASE_URL}/api/worker/my-tasks?status_filter=${encodeURIComponent(statusFilter)}`
      : `${API_BASE_URL}/api/worker/my-tasks`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error fetching worker tasks from DB:', err);
    return [];
  }

  return [];
}

export async function fetchWorkerTaskDetailsDB(taskId: string): Promise<WorkerTaskItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Error fetching task details for '${taskId}':`, err);
    return null;
  }
}

export async function startWorkerTaskDB(taskId: string): Promise<{ message: string; task_status: string; started_at: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}/start`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to start task' }));
    throw new Error(err.detail || 'Failed to start task');
  }
  return await res.json();
}

export async function completeWorkerTaskDB(
  taskId: string,
  payload: { notes?: string; work_images?: string; progress_percentage?: number }
): Promise<{ message: string; task_status: string; completed_at: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}/complete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to complete task' }));
    throw new Error(err.detail || 'Failed to complete task');
  }
  return await res.json();
}

export async function updateWorkerTaskProgressDB(
  taskId: string,
  payload: { completed_sections: string[]; current_section?: string; progress_percentage: number; notes?: string }
): Promise<{ message: string; progress_percentage: number; completed_sections: string[]; current_section: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}/progress`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update stage progress' }));
    throw new Error(err.detail || 'Failed to update stage progress');
  }
  return await res.json();
}

export async function pauseWorkerTaskDB(
  taskId: string,
  payload: { pause_reason: string; notes?: string }
): Promise<{ message: string; task_status: string; pause_reason: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}/pause`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to pause stage' }));
    throw new Error(err.detail || 'Failed to pause stage');
  }
  return await res.json();
}

export async function resumeWorkerTaskDB(
  taskId: string
): Promise<{ message: string; task_status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}/resume`, {
    method: 'POST',
    headers: getAuthHeaders()
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to resume stage' }));
    throw new Error(err.detail || 'Failed to resume stage');
  }
  return await res.json();
}

export async function reportWorkerTaskIssueDB(
  taskId: string,
  payload: { issue_type: string; description: string; photo_url?: string }
): Promise<{ message: string; task_status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-tasks/${encodeURIComponent(taskId)}/report-issue`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to report task issue' }));
    throw new Error(err.detail || 'Failed to report task issue');
  }
  return await res.json();
}

export async function fetchWorkerCompletedHistoryDB(): Promise<WorkerCompletedHistoryItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/completed-history`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching worker completed history:', err);
    return [];
  }
}

export async function fetchWorkerOnsiteJobsDB(): Promise<WorkerOnsiteJobItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/onsite-jobs`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching worker on-site service jobs:', err);
    return [];
  }
}

export async function updateWorkerOnsiteJobStatusDB(
  jobId: number,
  payload: { status: string; customer_notes?: string; before_photos?: string; after_photos?: string }
): Promise<{ message: string; status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/onsite-jobs/${jobId}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update on-site job status' }));
    throw new Error(err.detail || 'Failed to update on-site job status');
  }
  return await res.json();
}

export async function fetchWorkerReworkJobsDB(): Promise<WorkerReworkItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/my-rework-jobs`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching worker rework jobs:', err);
    return [];
  }
}

export async function resolveWorkerReworkJobDB(
  reworkId: number,
  notes?: string
): Promise<{ message: string; status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-rework-jobs/${reworkId}/resolve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ notes: notes || '' })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to resolve rework job' }));
    throw new Error(err.detail || 'Failed to resolve rework job');
  }
  return await res.json();
}

export async function fetchWorkerDeliveriesDB(): Promise<WorkerDeliveryItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/my-deliveries`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching worker deliveries:', err);
    return [];
  }
}

export async function updateWorkerDeliveryStatusDB(
  fulfillmentId: number,
  payload: { status: string; notes?: string }
): Promise<{ message: string; delivery_status: string }> {
  const res = await fetch(`${API_BASE_URL}/api/worker/my-deliveries/${fulfillmentId}/status`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update delivery status' }));
    throw new Error(err.detail || 'Failed to update delivery status');
  }
  return await res.json();
}
