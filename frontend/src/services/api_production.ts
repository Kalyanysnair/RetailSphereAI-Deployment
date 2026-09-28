const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api/production`;

async function safeFetchProd(endpoint: string, options?: RequestInit): Promise<Response> {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const token = localStorage.getItem('access_token');
  const headers = {
    ...(options?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const reqOptions: RequestInit = {
    ...options,
    headers
  };

  // 1. First try relative URL `/api/production${cleanPath}` (uses Vite dev proxy seamlessly)
  const relativeUrl = `/api/production${cleanPath}`;
  try {
    const res = await fetch(relativeUrl, reqOptions);
    return res;
  } catch (relativeErr) {
    // 2. Fallback to direct IPv4 backend URL if proxy is bypassed
    const directUrl127 = `http://127.0.0.1:8000/api/production${cleanPath}`;
    try {
      return await fetch(directUrl127, reqOptions);
    } catch (directErr) {
      const directUrlLocal = `http://localhost:8000/api/production${cleanPath}`;
      try {
        return await fetch(directUrlLocal, reqOptions);
      } catch (lastErr) {
        throw lastErr || directErr || relativeErr;
      }
    }
  }
}

export interface AssignedWorker {
  assignment_id: number;
  worker_id: number;
  worker_name: string;
  worker_email?: string;
  worker_phone?: string;
  specialization?: string;
  task_status: string;
}

export interface CustomOrderData {
  custom_order_id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  furniture_type: string;
  material: string;
  dimensions: string;
  color: string;
  design_description?: string;
  reference_image?: string;
  estimated_price?: number;
  order_status: 'Pending' | 'Approved' | 'Rejected' | 'In Production' | 'Completed' | string;
  order_date: string;
  assigned_workers: AssignedWorker[];
  production_staff_id?: number;
  production_staff_name?: string;
  current_stage: string;
  progress_percentage: number;
  latest_remarks?: string;
  is_locked?: boolean;
  payment_status?: 'Pending' | 'Paid' | string;
  approved_by?: string;
  staff_name?: string;
  originalSubtotal?: number;
  couponCode?: string;
  discountType?: string;
  discountDeducted?: number;
  shippingFee?: number;
  created_at?: string;
  production_stage?: string;
  progress_percent?: number;
  progress_remarks?: string;
}

export interface WorkerData {
  worker_id: number;
  full_name: string;
  email: string;
  phone: string;
  specialization?: string;
  status: boolean | string;
  availability_status?: string;
  active_tasks_count?: number;
  is_recommended?: boolean;
  recommendation_reason?: string;
  generated_password?: string;
  email_sent?: boolean;
  email_error?: string;
}

export interface ProductionSupervisorWorkload {
  supervisor_id: number;
  full_name: string;
  email: string;
  phone?: string;
  active_jobs_count: number;
  assessments_count: number;
  total_active_load: number;
  is_recommended: boolean;
  recommendation_reason?: string;
}

export interface ProgressTimelineItem {
  progress_id: number;
  stage: string;
  progress_percentage: number;
  remarks?: string;
  updated_at: string;
}

export interface OrderTrackingInfo {
  custom_order_id: number;
  furniture_type: string;
  material: string;
  dimensions: string;
  color: string;
  order_status: string;
  estimated_price?: number;
  assigned_workers: { worker_name: string; assigned_date?: string; task_status: string }[];
  timeline: ProgressTimelineItem[];
}

// Local DB Sync Helpers for Custom Orders
const BASE_CUSTOM_KEY = 'retailsphere_custom_orders';

function getUserCustomKey(): string {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const userIdentifier = parsed.email || parsed.id || parsed.user_id;
      if (userIdentifier) {
        return `${BASE_CUSTOM_KEY}_${userIdentifier}`;
      }
    }
  } catch {
    // fallback
  }
  return `${BASE_CUSTOM_KEY}_guest`;
}

export const getStoredCustomOrders = (): CustomOrderData[] => {
  try {
    const key = getUserCustomKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  } catch {
    return [];
  }
};

export const getAllUserStoredCustomOrders = (): CustomOrderData[] => {
  try {
    // Purge legacy storage keys to ensure state strictly mirrors Database
    const keys = Object.keys(localStorage).filter(k => k.startsWith(BASE_CUSTOM_KEY));
    keys.forEach(k => localStorage.removeItem(k));
    return [];
  } catch {
    return [];
  }
};

export const saveStoredCustomOrders = (orders: CustomOrderData[]) => {
  try {
    const key = getUserCustomKey();
    const excludedIds = [103, 102, 13, 28, 101, 14, 40];
    const filtered = orders.filter(o => !excludedIds.includes(o.custom_order_id));
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to persist custom orders to localStorage:', e);
  }
};

export function removeSpecificStoredCustomOrder(orderId: number = 13): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(BASE_CUSTOM_KEY));
    keys.forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed: CustomOrderData[] = JSON.parse(raw);
          const filtered = parsed.filter(o => o.custom_order_id !== orderId);
          localStorage.setItem(k, JSON.stringify(filtered));
        } catch {}
      }
    });
    window.dispatchEvent(new Event('custom-orders-updated'));
  } catch (e) {
    console.warn('Error removing stored custom order:', e);
  }
}

export function clearAllStoredCustomOrders(notify: boolean = false): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(BASE_CUSTOM_KEY));
    keys.forEach(k => localStorage.removeItem(k));
    if (notify) {
      window.dispatchEvent(new Event('custom-orders-updated'));
    }
  } catch (e) {
    console.warn('Error clearing custom orders:', e);
  }
}

// Clean DB API methods


export const ORDER_14_FALLBACK: CustomOrderData = {
  custom_order_id: 14,
  customer_id: 4,
  customer_name: 'Jayathy S',
  customer_email: 'jayathy@retailsphere.ai',
  customer_phone: '+91 98765 43210',
  furniture_type: 'Bespoke Teak Wooden Dining Table & Chairs',
  material: 'Teak Wood & Brass Fittings',
  dimensions: '72" L x 36" W x 30" H',
  color: 'Natural Matte Wax (Cream White)',
  design_description: 'Custom 6-seater solid teak dining table with reinforced joinery and natural matte wax finish.',
  reference_image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
  order_status: 'In Production',
  estimated_price: 68500,
  order_date: new Date(Date.now() - 86400000 * 3).toISOString(),
  assigned_workers: [
    {
      assignment_id: 201,
      worker_id: 4,
      worker_name: 'Nimish K',
      worker_phone: '+91 98450 12345',
      specialization: 'Woodwork & Carpentry',
      task_status: 'Woodwork & Carpentry: Completed'
    },
    {
      assignment_id: 202,
      worker_id: 3,
      worker_name: 'Geetha Devi',
      worker_phone: '+91 98765 12340',
      specialization: 'Assembly & QA',
      task_status: 'Assembly & QA: In Progress'
    }
  ],
  current_stage: 'In Production',
  progress_percentage: 65,
  latest_remarks: 'Carpentry completed by Nimish K. Assembly & QA currently in progress by Geetha Devi.'
};

export const INITIAL_DEMO_CUSTOM_ORDERS: CustomOrderData[] = [];

export function isCustomerOrderMatch(o: CustomOrderData, userObj: any): boolean {
  if (!userObj) return false;

  const sEmail = (userObj?.email || userObj?.customer_email || localStorage.getItem('user_email') || '').toLowerCase().trim();
  const sUserId = userObj?.id || userObj?.user_id;
  const sCustomerId = userObj?.customer?.customer_id || userObj?.customer_id;

  const oEmail = (o.customer_email || '').toLowerCase().trim();
  const oCustId = o.customer_id;

  // 1. Strict Match by Customer ID
  if (sCustomerId && oCustId && Number(oCustId) === Number(sCustomerId)) return true;

  // 2. Strict Match by User ID
  if (sUserId && oCustId && Number(oCustId) === Number(sUserId)) return true;

  // 3. Strict Match by Exact Email
  if (sEmail && oEmail && sEmail === oEmail) return true;

  return false;
}

// API Methods with Fallback to Persisted Data
export async function fetchCustomOrders(statusFilter?: string, isStaff: boolean = false, workerId?: number, productionStaffId?: number): Promise<CustomOrderData[]> {
  try {
    const rawUser = localStorage.getItem('user') || localStorage.getItem('user_profile');
    const userObj = rawUser ? JSON.parse(rawUser) : null;

    const queryParams = new URLSearchParams();
    if (statusFilter && statusFilter !== 'All') queryParams.append('status_filter', statusFilter);
    if (workerId) queryParams.append('worker_id', String(workerId));
    if (productionStaffId) queryParams.append('production_staff_id', String(productionStaffId));

    if (!isStaff && !workerId && userObj) {
      const uEmail = userObj.email || userObj.customer_email || localStorage.getItem('user_email');
      const uId = userObj.customer_id || userObj.user_id || userObj.id;
      if (uEmail) queryParams.append('customer_email', uEmail);
      if (uId) queryParams.append('customer_id', String(uId));
    }

    const url = queryParams.toString() ? `/custom-orders?${queryParams.toString()}` : `/custom-orders`;
    let dbOrders: CustomOrderData[] = [];
    try {
      const res = await safeFetchProd(url);
      if (res.ok) {
        const fetched = await res.json();
        if (Array.isArray(fetched)) {
          dbOrders = fetched;
        }
      }
    } catch {
      // Backend request failure fallback
    }

    // Purge legacy localStorage custom order keys so state strictly mirrors PostgreSQL/SQLite DB
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(BASE_CUSTOM_KEY));
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}

    const map = new Map<number, CustomOrderData>();
    dbOrders.forEach(o => map.set(o.custom_order_id, o));

    const excludedIds = [103, 102, 13, 28, 101, 14, 40];
    const allCandidateOrders = Array.from(map.values()).filter(o => !excludedIds.includes(o.custom_order_id));

    if (isStaff || workerId) {
      return (!statusFilter || statusFilter === 'All')
        ? sanitizeCustomOrders(allCandidateOrders)
        : sanitizeCustomOrders(allCandidateOrders.filter(o => o.order_status === statusFilter));
    }

    // For customer session retrieval
    if (!userObj) {
      return [];
    }

    const userOrders = allCandidateOrders.filter(o => {
      const isMatch = isCustomerOrderMatch(o, userObj);
      if (isMatch) {
        if (userObj.id || userObj.customer_id || userObj.user_id) {
          o.customer_id = userObj.customer?.customer_id || userObj.customer_id || userObj.user_id || userObj.id;
        }
        if (userObj.email || userObj.customer_email) {
          o.customer_email = userObj.email || userObj.customer_email;
        }
      }
      return isMatch;
    });

    return (!statusFilter || statusFilter === 'All')
      ? sanitizeCustomOrders(userOrders)
      : sanitizeCustomOrders(userOrders.filter(o => o.order_status === statusFilter));
  } catch {
    return [];
  }
}

export async function updateOrderStatus(orderId: number, status: string, estimatedPrice?: number, remarks?: string, approvedBy?: string): Promise<any> {
  const staffName = approvedBy || (() => {
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const parsed = JSON.parse(u);
        return parsed.full_name || parsed.name || parsed.username || 'Production Staff';
      }
    } catch {}
    return 'Production Staff';
  })();

  const demoTarget = INITIAL_DEMO_CUSTOM_ORDERS.find(o => o.custom_order_id === orderId);
  if (demoTarget) {
    demoTarget.order_status = status;
    if (status === 'Approved' || status === 'Quote Provided' || status === 'In Production') {
      demoTarget.approved_by = staffName;
      demoTarget.staff_name = staffName;
    }
    if (estimatedPrice !== undefined && estimatedPrice > 0) {
      demoTarget.estimated_price = estimatedPrice;
      demoTarget.is_locked = true;
    }
    if (status === 'Approved' || status === 'In Production' || status === 'Completed') {
      demoTarget.is_locked = true;
      demoTarget.current_stage = 'Material Sourcing';
      demoTarget.progress_percentage = 15;
    }
    if (remarks) demoTarget.latest_remarks = remarks;
  }

  const allStored = getAllUserStoredCustomOrders();
  const target = allStored.find(o => o.custom_order_id === orderId);
  if (target) {
    target.order_status = status;
    if (status === 'Approved' || status === 'Quote Provided' || status === 'In Production') {
      target.approved_by = staffName;
      target.staff_name = staffName;
    }
    if (estimatedPrice !== undefined && estimatedPrice > 0) {
      target.estimated_price = estimatedPrice;
      target.is_locked = true;
    }
    if (status === 'Approved' || status === 'In Production' || status === 'Completed') {
      target.is_locked = true;
      target.current_stage = 'Material Sourcing';
      target.progress_percentage = 15;
    }
    if (remarks) target.latest_remarks = remarks;
    saveStoredCustomOrders(allStored);
  }

  window.dispatchEvent(new Event('custom-orders-updated'));

  try {
    let res = await safeFetchProd(`/custom-orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_status: status, estimated_price: estimatedPrice, remarks, approved_by: staffName })
    });
    if (!res.ok) {
      res = await safeFetchProd('/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_order_id: orderId, order_status: status, estimated_price: estimatedPrice, remarks, approved_by: staffName })
      });
    }
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline fallback
  }

  return target || demoTarget || { success: true };
}

export async function toggleLockOrderSpecifications(orderId: number): Promise<boolean> {
  try {
    const res = await safeFetchProd(`/custom-orders/${orderId}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to lock order');
    await res.json();
  } catch (err) {
    console.warn('DB lock request failed, fallback locally:', err);
  }

  const stored = getStoredCustomOrders();
  const ord = stored.find(o => o.custom_order_id === orderId);
  if (ord) {
    ord.is_locked = true;
    if (ord.order_status === 'Pending' || ord.order_status === 'Pending Approval') {
      ord.order_status = 'Approved';
    }
    saveStoredCustomOrders(stored);
  }
  return true;
}

export async function cancelCustomOrder(orderId: number): Promise<boolean> {
  try {
    const res = await safeFetchProd(`/custom-orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to cancel order');
    await res.json();
  } catch (err) {
    console.warn('DB cancel request failed, fallback locally:', err);
  }

  const userStored = getStoredCustomOrders();
  const userTarget = userStored.find(o => o.custom_order_id === orderId);
  if (userTarget) {
    userTarget.order_status = 'Cancelled';
    saveStoredCustomOrders(userStored);
  }

  window.dispatchEvent(new Event('custom-orders-updated'));
  return true;
}

export async function payCustomOrder(orderId: number): Promise<boolean> {
  try {
    const res = await safeFetchProd(`/custom-orders/${orderId}/pay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to record payment');
    await res.json();
  } catch (err) {
    console.warn('DB pay request failed, fallback locally:', err);
  }

  const stored = getStoredCustomOrders();
  const ord = stored.find(o => o.custom_order_id === orderId);
  if (ord) {
    ord.payment_status = 'Paid';
    ord.order_status = 'Paid';
    ord.is_locked = true;
    saveStoredCustomOrders(stored);
  }
  window.dispatchEvent(new Event('custom-orders-updated'));
  return true;
}

function getLocalWorkers(): WorkerData[] {
  try {
    const raw = localStorage.getItem('retailsphere_local_workers');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalWorker(worker: WorkerData) {
  try {
    const current = getLocalWorkers();
    const filtered = current.filter(w => w.worker_id !== worker.worker_id && w.email.toLowerCase() !== worker.email.toLowerCase());
    filtered.unshift(worker);
    localStorage.setItem('retailsphere_local_workers', JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save worker to local storage:', e);
  }
}

function removeLocalWorker(workerId: number) {
  try {
    const current = getLocalWorkers();
    const filtered = current.filter(w => w.worker_id !== workerId);
    localStorage.setItem('retailsphere_local_workers', JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to remove worker from local storage:', e);
  }
}

function generateAutoPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export async function fetchWorkers(): Promise<WorkerData[]> {
  try {
    localStorage.removeItem('retailsphere_local_workers');
  } catch {}

  try {
    const res = await safeFetchProd('/workers');
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch {
    return [];
  }
}

export async function addWorker(fullName: string, email: string, phone?: string, specialization?: string): Promise<WorkerData> {
  const payload = {
    full_name: fullName.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : undefined,
    specialization: specialization || 'Woodwork & Carpentry'
  };

  let res: Response;
  try {
    res = await safeFetchProd('/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (netErr: any) {
    const orig = netErr?.message || '';
    if (netErr?.name === 'TypeError' || orig.toLowerCase().includes('failed to fetch') || orig.toLowerCase().includes('networkerror')) {
      throw new Error('Unable to connect to the server. Please make sure the backend is running.');
    }
    throw new Error(orig || 'Unable to connect to the server. Please make sure the backend is running.');
  }

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errorJson = await res.json();
      if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail;
      } else if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail.map((e: any) => e.msg || e.detail || JSON.stringify(e)).join(', ');
      } else if (errorJson.message) {
        errorDetail = errorJson.message;
      }
    } catch {}

    if (errorDetail) {
      throw new Error(errorDetail);
    }

    if (res.status === 400) {
      throw new Error('Invalid worker information. Please check the details provided.');
    } else if (res.status === 401) {
      throw new Error('Authentication required. Please log in as production staff.');
    } else if (res.status === 403) {
      throw new Error('You do not have permission to create workers.');
    } else if (res.status === 409) {
      throw new Error('A worker with this email or phone number already exists.');
    } else if (res.status === 404) {
      throw new Error('Worker API endpoint not found.');
    }

    throw new Error(`Unable to create the worker account (HTTP ${res.status}). Please try again.`);
  }

  const data: WorkerData = await res.json();
  return data;
}

export async function resendWorkerCredentials(workerId: number): Promise<{ success: boolean; message: string; email: string }> {
  const res = await safeFetchProd(`/workers/${workerId}/resend-credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({ detail: 'Failed to resend credentials.' }));
    throw new Error(errorJson.detail || 'Failed to resend credentials.');
  }

  return await res.json();
}

export async function deleteWorker(workerId: number): Promise<any> {
  try {
    await safeFetchProd(`/workers/${workerId}`, { method: 'DELETE' });
  } catch {
    // ignore
  }

  removeLocalWorker(workerId);
  return { message: `Worker #${workerId} removed` };
}

export async function updateWorker(workerId: number, fullName: string, email: string, phone?: string, specialization?: string): Promise<WorkerData> {
  const payload = {
    full_name: fullName.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : undefined,
    specialization: specialization || 'Woodwork & Carpentry'
  };

  const res = await safeFetchProd(`/workers/${workerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({ detail: 'Failed to update worker details' }));
    throw new Error(errorJson.detail || 'Failed to update worker details');
  }

  const data: WorkerData = await res.json();
  saveLocalWorker(data);
  return data;
}

export async function toggleWorkerStatus(workerId: number, newStatus: boolean): Promise<WorkerData> {
  let res: Response | null = null;
  try {
    res = await safeFetchProd(`/workers/${workerId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  } catch {
    // ignore
  }

  const localWorkers = getLocalWorkers();
  const target = localWorkers.find(w => w.worker_id === workerId);
  if (target) {
    target.status = newStatus;
    saveLocalWorker(target);
  }

  if (res && res.ok) {
    return await res.json();
  }
  return target || { worker_id: workerId, full_name: 'Worker', email: '', phone: '', status: newStatus };
}

export async function assignWorkerTask(orderId: number, workerId: number, department?: string): Promise<any> {
  let result: any = null;
  try {
    const res = await safeFetchProd('/assign-worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_order_id: orderId, worker_id: workerId, department })
    });
    if (res.ok) {
      result = await res.json();
    }
  } catch (err) {
    console.warn('DB assign-worker request failed, fallback locally:', err);
  }

  // Update local persistent store for instant reactivity across all dashboards
  const allStored = getAllUserStoredCustomOrders();
  const target = allStored.find(o => o.custom_order_id === orderId);
  if (target) {
    if (!target.assigned_workers) target.assigned_workers = [];
    try {
      const workers = await fetchWorkers();
      const wObj = workers.find(w => w.worker_id === workerId);
      if (wObj) {
        const deptLabel = department || wObj.specialization || 'Woodwork & Carpentry';
        const existingIdx = target.assigned_workers.findIndex(w => w.worker_id === workerId);
        const newAssignment: AssignedWorker = {
          assignment_id: Date.now(),
          worker_id: wObj.worker_id,
          worker_name: wObj.full_name,
          worker_email: wObj.email,
          worker_phone: wObj.phone,
          specialization: deptLabel,
          task_status: `${deptLabel}: Assigned`
        };
        if (existingIdx >= 0) {
          target.assigned_workers[existingIdx] = newAssignment;
        } else {
          target.assigned_workers.push(newAssignment);
        }
      }
    } catch {}
    if (target.order_status === 'Approved' || target.order_status === 'Pending') {
      target.order_status = 'In Production';
    }
    saveStoredCustomOrders(allStored);
  }

  window.dispatchEvent(new Event('custom-orders-updated'));
  return result || { message: `Worker assigned to Order #${orderId}` };
}

export async function unassignWorkerTask(orderId: number, workerId: number): Promise<{ message: string }> {
  let result: any = null;
  try {
    const res = await safeFetchProd('/unassign-worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_order_id: orderId, worker_id: workerId })
    });
    if (res.ok) {
      result = await res.json();
    }
  } catch (err) {
    console.warn('DB unassign-worker request failed, updating local store:', err);
  }

  // Update local persistent store
  const allStored = getAllUserStoredCustomOrders();
  const target = allStored.find(o => o.custom_order_id === orderId);
  if (target && target.assigned_workers) {
    target.assigned_workers = target.assigned_workers.filter(w => w.worker_id !== workerId && w.assignment_id !== workerId);
    saveStoredCustomOrders(allStored);
  }

  window.dispatchEvent(new Event('custom-orders-updated'));
  return result || { message: `Worker unassigned from Order #${orderId}` };
}

export async function updateProductionProgress(
  orderId: number,
  stage: string,
  percentage: number,
  remarks?: string,
  department?: string,
  workerId?: number
): Promise<any> {
  let result: any = null;
  try {
    const res = await safeFetchProd('/update-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom_order_id: orderId,
        stage,
        progress_percentage: percentage,
        remarks,
        department,
        worker_id: workerId
      })
    });
    if (res.ok) {
      result = await res.json();
    }
  } catch (err) {
    console.warn('DB update-progress request failed, fallback locally:', err);
  }

  // Update local persistent store for instant reactivity across all dashboards
  const allStored = getAllUserStoredCustomOrders();
  const target = allStored.find(o => o.custom_order_id === orderId);
  if (target) {
    target.current_stage = stage;
    target.progress_percentage = percentage;
    if (remarks) target.latest_remarks = remarks;

    // Update specific department worker assignment task status
    if (department && target.assigned_workers) {
      const asgn = target.assigned_workers.find(w =>
        (workerId && Number(w.worker_id) === Number(workerId)) ||
        (w.specialization && w.specialization.toLowerCase().includes(department.toLowerCase().split(' ')[0]))
      );
      if (asgn) {
        if (percentage >= 100 || stage.includes('Complete') || stage.includes('Done')) {
          asgn.task_status = `${department}: Completed`;
        } else {
          asgn.task_status = `${department}: In Progress`;
        }
      }
    }

    if (percentage >= 100 || stage.includes('Ready for Dispatch') || (department === 'Assembly' && stage.includes('Complete'))) {
      target.order_status = 'Completed';
    } else if (target.order_status === 'Approved' || target.order_status === 'Pending') {
      target.order_status = 'In Production';
    }
    saveStoredCustomOrders(allStored);
  }

  window.dispatchEvent(new Event('custom-orders-updated'));
  return result || { message: `Progress updated for Order #${orderId}: ${stage} (${percentage}%)` };
}

export async function fetchOrderTrackingTimeline(orderId: number): Promise<OrderTrackingInfo> {
  const res = await safeFetchProd(`/custom-orders/${orderId}/tracking`);
  if (!res.ok) throw new Error('Failed to fetch tracking from database');
  return await res.json();
}

export function isDefaultUnsplashUrl(_url?: string): boolean {
  return false;
}

export function sanitizeCustomOrders(orders: CustomOrderData[]): CustomOrderData[] {
  return orders;
}

import { parseReferenceImages } from '../utils/imageUtils';

export function getFurnitureImageUrl(_furnitureType: string = '', referenceImage?: string): string | undefined {
  if (referenceImage && referenceImage.trim()) {
    const parsed = parseReferenceImages(referenceImage);
    return parsed.length > 0 ? parsed[0] : referenceImage.trim();
  }
  return undefined;
}

export async function submitCustomOrderRequest(
  furnitureType: string,
  material: string,
  dimensions: string,
  color: string,
  notes?: string,
  referenceImage?: string
): Promise<CustomOrderData> {
  const rawUser = localStorage.getItem('user') || localStorage.getItem('user_profile');
  const userObj = rawUser ? JSON.parse(rawUser) : null;
  const cleanRefImg = referenceImage && referenceImage.trim() ? referenceImage.trim() : undefined;

  const uEmail = (userObj?.email || userObj?.customer_email || localStorage.getItem('user_email') || '').toLowerCase().trim();
  const uId = userObj?.customer?.customer_id || userObj?.customer_id || userObj?.user_id || userObj?.id || (uEmail ? Math.abs(uEmail.split('').reduce((a: number, b: string) => ((a << 5) - a) + b.charCodeAt(0), 0)) : null);
  const uName = userObj?.full_name || userObj?.username || userObj?.name || (uEmail ? uEmail.split('@')[0] : 'Customer');

  const payload = {
    customer_id: uId,
    customer_name: uName,
    customer_email: uEmail,
    customer_phone: userObj?.phone || '',
    furniture_type: furnitureType,
    material,
    dimensions,
    color,
    design_description: notes,
    reference_image: cleanRefImg
  };

  try {
    const res = await safeFetchProd('/custom-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('API Request Failed');
    const created: CustomOrderData = await res.json();
    const currentOrders = getStoredCustomOrders();
    saveStoredCustomOrders([created, ...currentOrders]);
    window.dispatchEvent(new Event('custom-orders-updated'));
    return created;
  } catch {
    const currentOrders = getStoredCustomOrders();
    const newId = 101 + currentOrders.length;
    const newOrder: CustomOrderData = {
      custom_order_id: newId,
      customer_id: payload.customer_id || 1,
      customer_name: payload.customer_name || 'Customer',
      customer_email: payload.customer_email || '',
      customer_phone: payload.customer_phone || '',
      furniture_type: furnitureType,
      material,
      dimensions,
      color,
      design_description: notes,
      reference_image: cleanRefImg,
      order_status: 'Pending',
      order_date: new Date().toISOString(),
      assigned_workers: [],
      current_stage: 'Pending Approval',
      progress_percentage: 0,
      latest_remarks: 'Custom request submitted for staff approval.'
    };
    saveStoredCustomOrders([newOrder, ...currentOrders]);
    window.dispatchEvent(new Event('custom-orders-updated'));
    return newOrder;
  }
}

export function downloadPaymentReceipt(order: CustomOrderData) {
  const receiptId = `REC-CUST-${order.custom_order_id}-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const finalPrice = order.estimated_price || 0;
  const originalSubtotal = order.originalSubtotal || (finalPrice + (order.discountDeducted || 0));
  const discountDeducted = order.discountDeducted || 0;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Payment Receipt - Order #${order.custom_order_id}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #faf7f2; color: #2c241d; padding: 40px; margin: 0; }
    .receipt-card { max-width: 650px; margin: 0 auto; background: #ffffff; border: 2px solid #e2d7cb; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f0e6da; padding-bottom: 20px; margin-bottom: 25px; }
    .brand { font-size: 26px; font-weight: 800; color: #38a132; letter-spacing: -0.5px; }
    .subtitle { font-size: 12px; color: #7a6c5e; font-weight: 700; margin-top: 2px; }
    .badge { background: #dcfce7; color: #166534; font-weight: 800; padding: 8px 18px; border-radius: 50px; font-size: 12px; border: 1px solid #bbf7d0; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #faf7f2; padding: 20px; border-radius: 16px; border: 1px solid #e2d7cb; }
    .meta-item label { display: block; font-size: 10px; font-weight: 800; color: #7a6c5e; text-transform: uppercase; margin-bottom: 3px; }
    .meta-item span { font-size: 13px; font-weight: 700; color: #2c241d; }
    .specs-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .specs-table th { text-align: left; font-size: 11px; font-weight: 800; color: #7a6c5e; text-transform: uppercase; border-bottom: 2px solid #e2d7cb; padding: 10px 0; }
    .specs-table td { font-size: 13px; font-weight: 600; padding: 12px 0; border-bottom: 1px solid #f0e6da; }
    .breakdown-box { background: #fdfbf7; border: 1px solid #e2d7cb; border-radius: 16px; padding: 18px; margin-bottom: 20px; }
    .breakdown-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; padding: 6px 0; color: #2c241d; }
    .breakdown-row.discount { color: #15803d; font-weight: 800; }
    .total-box { display: flex; justify-content: space-between; align-items: center; background: #2c241d; color: #ffffff; padding: 24px; border-radius: 18px; }
    .total-box .amount { font-size: 26px; font-weight: 800; color: #48a63e; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #7a6c5e; border-top: 1px solid #f0e6da; padding-top: 20px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <div>
        <div class="brand">RetailSphere AI</div>
        <div class="subtitle">Bespoke Artisan Furniture Studio • Official Payment Receipt</div>
      </div>
      <div class="badge">✓ PAID IN FULL</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><label>Receipt No.</label><span>${receiptId}</span></div>
      <div class="meta-item"><label>Date Paid</label><span>${dateStr}</span></div>
      <div class="meta-item"><label>Customer Name</label><span>${order.customer_name}</span></div>
      <div class="meta-item"><label>Customer Email</label><span>${order.customer_email || 'Registered Client'}</span></div>
    </div>

    <table class="specs-table">
      <thead>
        <tr><th>Furniture Specifications</th><th>Details</th></tr>
      </thead>
      <tbody>
        <tr><td>Furniture Item</td><td>${order.furniture_type}</td></tr>
        <tr><td>Custom Dimensions</td><td>${order.dimensions}</td></tr>
        <tr><td>Timber / Material</td><td>${order.material}</td></tr>
        <tr><td>Color & Finish</td><td>${order.color}</td></tr>
      </tbody>
    </table>

    <div class="breakdown-box">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #7a6c5e; margin-bottom: 10px; border-bottom: 1px solid #e2d7cb; padding-bottom: 6px;">Financial Breakdown</div>
      <div class="breakdown-row">
        <span>Original Subtotal</span>
        <span>₹${originalSubtotal.toLocaleString('en-IN')}</span>
      </div>
      ${order.couponCode ? `
      <div class="breakdown-row discount">
        <span>🏷️ Promo Discount (${order.couponCode}${order.discountType ? ` - ${order.discountType}` : ''})</span>
        <span>-₹${discountDeducted.toLocaleString('en-IN')}</span>
      </div>
      ` : ''}
      <div class="breakdown-row">
        <span>Standard Shipping & Delivery</span>
        <span>${order.shippingFee === 0 || !order.shippingFee ? 'FREE' : `₹${order.shippingFee.toLocaleString('en-IN')}`}</span>
      </div>
    </div>

    <div class="total-box">
      <div>
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #d0c8be; margin-bottom: 4px;">Final Amount Paid After Discounts</div>
        <div style="font-size: 12px; color: #e2d7cb;">Status: Verified Electronic Payment</div>
      </div>
      <div class="amount">₹${finalPrice.toLocaleString('en-IN')}</div>
    </div>

    <div class="footer">
      Thank you for choosing RetailSphere AI. Official E-Receipt & Tax Invoice Document.
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write(htmlContent);
    printWin.document.close();
  }
}

// ------------------------------------------------------------
// NEW PRODUCTION MANAGEMENT API INTERFACES & FUNCTIONS
// ------------------------------------------------------------

export interface ProductionOverviewData {
  metrics: {
    pending_assessment: number;
    quotation_pending: number;
    customer_approved: number;
    material_pending: number;
    in_production: number;
    qc_pending: number;
    rework: number;
    completed_today: number;
  };
  priorities: {
    id: string;
    title: string;
    issue: string;
    priority: string;
  }[];
  active_production: {
    order_id: string;
    numeric_id: number;
    order_type: 'Custom' | 'Fabrication';
    customer: string;
    product: string;
    current_stage: string;
    worker: string;
    status: string;
    priority: string;
  }[];
}

export interface AssessmentQueueItem {
  request_id: string;
  numeric_id: number;
  order_type: 'Customization' | 'Fabrication' | 'On-Site Service' | 'Service' | string;
  customer_name: string;
  customer_email: string;
  title: string;
  furniture_type: string;
  material: string;
  dimensions: string;
  color?: string;
  quantity?: number;
  description?: string;
  reference_image?: string;
  order_date: string;
  reviewed_at?: string;
  priority: string;
  assessment_status: 'PENDING_ASSESSMENT' | 'IN_ASSESSMENT' | 'ASSESSMENT_COMPLETE';
  order_status: string;
  payment_status?: string;
  estimated_price?: number;
  is_assessed: boolean;
}

export interface TechnicalAssessmentData {
  assessment_id?: number;
  order_type: string;
  order_id: number;
  assessed_by_id?: number;
  feasibility: 'FEASIBLE' | 'NOT_FEASIBLE';
  unfeasibility_reason?: string;
  required_operations?: string;
  required_stages: string[];
  material_requirements?: string;
  machine_requirements?: string;
  worker_skill_requirements?: string;
  labour_hours: number;
  machine_hours: number;
  estimated_duration_days: number;
  estimated_completion_date?: string;
  material_cost: number;
  labour_cost: number;
  machine_cost: number;
  finishing_cost: number;
  other_cost: number;
  total_cost: number;
  production_notes?: string;
  technical_notes?: string;
  assessed_at?: string;
}

export interface QuotationData {
  quote_id: number;
  order_type: string;
  order_id: number;
  version: number;
  is_latest: boolean;
  status: 'QUOTATION_PENDING' | 'QUOTATION_READY' | 'CUSTOMER_APPROVAL_PENDING' | 'CUSTOMER_APPROVED' | 'CUSTOMER_REJECTED' | 'EXPIRED' | 'PAID';
  material_cost: number;
  labour_cost: number;
  machine_cost: number;
  finishing_cost: number;
  assembly_cost: number;
  service_cost: number;
  discount: number;
  tax: number;
  total_amount: number;
  estimated_duration?: string;
  estimated_completion_date?: string;
  notes?: string;
  created_at?: string;
  approved_at?: string;
}

export interface ProductionStageData {
  stage_id: number;
  order_type: string;
  order_id: number;
  stage_name: string;
  sequence_order: number;
  required_skill?: string;
  assigned_worker_id?: number;
  assigned_worker_name?: string;
  status: 'LOCKED' | 'READY_FOR_ASSIGNMENT' | 'ASSIGNED' | 'IN_PROGRESS' | 'QC_PENDING' | 'REWORK_REQUIRED' | 'COMPLETED';
  progress_percentage: number;
  remarks?: string;
  started_at?: string;
  completed_at?: string;
}

export interface ProductionHistoryItem {
  history_id: number;
  stage_name?: string;
  action: string;
  worker_name?: string;
  action_by: string;
  previous_status?: string;
  new_status?: string;
  notes?: string;
  timestamp: string;
}

export interface OnsiteJobData {
  service_id: number;
  request_id?: string;
  store_name?: string;
  store_location?: string;
  product_name?: string;
  requested_quantity?: string;
  request_date?: string;
  required_installation_date?: string;
  assigned_production_team?: string;
  production_status?: string;
  store_contact?: string;
  special_instructions?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  service_category: string;
  description: string;
  address: string;
  city: string;
  pincode: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  priority: string;
  payment_status?: string;
  estimated_price?: number;
  photos?: string;
  jobs?: any[];
}

export interface ProductionReportsData {
  summary: {
    total_customizations: number;
    total_fabrications: number;
    total_inspections: number;
    pass_rate: number;
    avg_production_days: number;
    worker_utilization_rate: number;
  };
  stage_breakdown: {
    stage: string;
    completed: number;
    in_progress: number;
  }[];
}

// 1. Fetch Production Dashboard Overview Stats & Active Production
export async function fetchProductionDashboardOverview(): Promise<ProductionOverviewData> {
  try {
    const res = await safeFetchProd('/dashboard/overview');
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return {
    metrics: {
      pending_assessment: 0,
      quotation_pending: 0,
      customer_approved: 0,
      material_pending: 0,
      in_production: 0,
      qc_pending: 0,
      rework: 0,
      completed_today: 0,
    },
    priorities: [],
    active_production: []
  };
}

// 2. Fetch Assessment Queue (Approved requests only)
export async function fetchAssessmentQueue(categoryFilter: string = 'ALL', tabFilter: string = 'ALL'): Promise<AssessmentQueueItem[]> {
  try {
    const query = new URLSearchParams({ category_filter: categoryFilter, tab_filter: tabFilter });
    const res = await safeFetchProd(`/assessment-queue?${query.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
    return [];
  } catch {
    return [];
  }
}

// 3. Save Technical Assessment
export async function saveTechnicalAssessment(payload: TechnicalAssessmentData): Promise<any> {
  const res = await safeFetchProd('/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to save technical assessment');
  return await res.json();
}

// 4. Fetch Technical Assessment for Request
export async function fetchTechnicalAssessment(orderType: string, orderId: number): Promise<TechnicalAssessmentData | null> {
  const res = await safeFetchProd(`/assessments/${orderType}/${orderId}`);
  if (!res.ok) return null;
  return await res.json();
}

// 5. Generate or Revise Quotation
export async function generateQuotation(payload: {
  order_type: string;
  order_id: number;
  created_by_id?: number;
  material_cost: number;
  labour_cost: number;
  machine_cost: number;
  finishing_cost: number;
  assembly_cost?: number;
  service_cost?: number;
  discount?: number;
  tax?: number;
  estimated_duration?: string;
  estimated_completion_date?: string;
  notes?: string;
}): Promise<any> {
  const res = await safeFetchProd('/quotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate quotation');
  return await res.json();
}

// 6. Fetch Quotations for Order
export async function fetchOrderQuotations(orderType: string, orderId: number): Promise<QuotationData[]> {
  const res = await safeFetchProd(`/quotations/${orderType}/${orderId}`);
  if (!res.ok) return [];
  return await res.json();
}

// 7. Customer Respond to Quotation (Approve / Reject)
export async function customerRespondQuotation(quoteId: number, response: 'APPROVE' | 'REJECT', notes?: string): Promise<any> {
  const res = await safeFetchProd(`/quotations/${quoteId}/customer-response`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response, notes })
  });
  if (!res.ok) throw new Error('Failed to respond to quotation');
  return await res.json();
}

// 8. Setup Production Stages
export async function setupProductionStages(orderType: string, orderId: number, stages: { stage_name: string; sequence_order: number; required_skill?: string }[]): Promise<any> {
  const res = await safeFetchProd('/stages/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_type: orderType, order_id: orderId, stages })
  });
  if (!res.ok) throw new Error('Failed to setup production stages');
  return await res.json();
}

// 9. Fetch Production Stages for Order
export async function fetchOrderProductionStages(orderType: string, orderId: number): Promise<ProductionStageData[]> {
  const res = await safeFetchProd(`/stages/${orderType}/${orderId}`);
  if (!res.ok) return [];
  return await res.json();
}

// 10. Fetch Workers Available for Stage (Filtered by Required Skill)
export async function fetchWorkersAvailableForStage(stageName?: string, requiredSkill?: string): Promise<WorkerData[]> {
  const query = new URLSearchParams();
  if (stageName) query.append('stage_name', stageName);
  if (requiredSkill) query.append('required_skill', requiredSkill);

  const res = await safeFetchProd(`/workers/available-for-stage?${query.toString()}`);
  if (!res.ok) return [];
  return await res.json();
}

// 11. Assign Worker to Production Stage
export async function assignStageWorker(stageId: number, workerId: number, notes?: string): Promise<any> {
  const res = await safeFetchProd('/assign-stage-worker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage_id: stageId, worker_id: workerId, notes })
  });
  if (!res.ok) throw new Error('Failed to assign worker to stage');
  return await res.json();
}

// 12. Fetch Worker Assigned Stage Tasks
export async function fetchWorkerMyTasks(workerId: number): Promise<any[]> {
  const res = await safeFetchProd(`/worker/my-tasks?worker_id=${workerId}`);
  if (!res.ok) return [];
  return await res.json();
}

// 13. Worker Stage Action (START / COMPLETE)
export async function updateWorkerStageAction(stageId: number, action: 'START' | 'COMPLETE', remarks?: string, photos?: string, progressPercentage: number = 100): Promise<any> {
  const res = await safeFetchProd(`/worker/stages/${stageId}/action`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, remarks, photos, progress_percentage: progressPercentage })
  });
  if (!res.ok) throw new Error('Failed to record worker stage action');
  return await res.json();
}

// 14. Log Customer Material Receipt
export async function receiveCustomerMaterial(payload: {
  order_type: string;
  order_id: number;
  condition?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  photos?: string;
}): Promise<any> {
  const res = await safeFetchProd('/materials/receive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to record material receipt');
  return await res.json();
}

// 15. Fetch Production Audit Trail / History
export async function fetchOrderProductionHistory(orderType: string, orderId: number): Promise<ProductionHistoryItem[]> {
  const res = await safeFetchProd(`/history/${orderType}/${orderId}`);
  if (!res.ok) return [];
  return await res.json();
}

// 16. Fetch On-Site Jobs
export async function fetchOnsiteJobsForProduction(): Promise<OnsiteJobData[]> {
  const res = await safeFetchProd('/onsite-jobs');
  if (!res.ok) return [];
  return await res.json();
}

// 17. Fetch Production Reports
export async function fetchProductionReports(): Promise<ProductionReportsData> {
  const res = await safeFetchProd('/reports');
  if (!res.ok) throw new Error('Failed to fetch production reports');
  return await res.json();
}

// 18. Fetch Supervisor Workloads
export async function fetchSupervisorWorkload(): Promise<ProductionSupervisorWorkload[]> {
  const res = await safeFetchProd('/supervisor-workload');
  if (!res.ok) return [];
  return await res.json();
}

// 19. Assign Production Supervisor to Custom Order
export async function assignProductionSupervisor(orderId: number, supervisorId: number): Promise<boolean> {
  try {
    const res = await safeFetchProd(`/custom-orders/${orderId}/assign-supervisor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supervisor_id: supervisorId })
    });
    return res.ok;
  } catch (err) {
    console.error('Error assigning supervisor:', err);
    return false;
  }
}

// 20. Fetch Fabrication Jobs from DB
export async function fetchFabricationJobsForProduction(): Promise<any[]> {
  try {
    const res = await safeFetchProd('/fabrication-jobs');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error fetching fabrication jobs from DB:', err);
    return [];
  }
}

// 21. Assign Worker to Fabrication Job
export async function assignWorkerToFabrication(fabricationId: number, workerId: number, stageId?: number, notes?: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await safeFetchProd('/fabrication/assign-worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fabrication_id: fabricationId,
        worker_id: workerId,
        stage_id: stageId,
        notes: notes
      })
    });
    const data = await res.json();
    return { ok: res.ok, message: data?.message };
  } catch (err: any) {
    console.error('Error assigning worker to fabrication job:', err);
    return { ok: false, message: err?.message || 'Failed to assign worker' };
  }
}

// 22. Assign Worker to On-Site Job
export async function assignWorkerToOnsiteJob(serviceId: number, workerId: number, scheduledTime?: string, notes?: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await safeFetchProd('/onsite/assign-worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        worker_id: workerId,
        scheduled_time: scheduledTime,
        notes: notes
      })
    });
    const data = await res.json();
    return { ok: res.ok, message: data?.message };
  } catch (err: any) {
    console.error('Error assigning worker to onsite job:', err);
    return { ok: false, message: err?.message || 'Failed to assign worker' };
  }
}

// 23. Assign Carrier Partner to Fabrication Pickup Job
export async function assignFabricationCarrierApi(
  fabricationId: number,
  carrierId?: number,
  carrierName?: string,
  driverId?: number,
  transportationProvider: string = 'CARRIER_PARTNER',
  notes?: string
): Promise<{ ok: boolean; message?: string; carrier?: string }> {
  try {
    const res = await safeFetchProd(`/fabrication/${fabricationId}/assign-carrier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carrier_id: carrierId,
        carrier_name: carrierName,
        driver_id: driverId,
        transportation_provider: transportationProvider,
        notes: notes
      })
    });
    const data = await res.json();
    return { ok: res.ok, message: data?.message, carrier: data?.carrier };
  } catch (err: any) {
    console.error('Error assigning carrier to fabrication:', err);
    return { ok: false, message: err?.message || 'Failed to assign carrier' };
  }
}

// 24. Mark Fabrication Material Received at Workshop
export async function markFabricationMaterialReceivedApi(
  fabricationId: number
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await safeFetchProd(`/fabrication/${fabricationId}/material-received`, {
      method: 'POST'
    });
    const data = await res.json();
    return { ok: res.ok, message: data?.message };
  } catch (err: any) {
    console.error('Error confirming material receipt:', err);
    return { ok: false, message: err?.message || 'Failed to mark material received' };
  }
}

