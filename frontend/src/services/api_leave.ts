export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface WorkerLeaveItem {
  leave_id: number;
  worker_id: number;
  worker_name?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  applied_on?: string;
  reviewed_by?: string;
  review_notes?: string;
}

const LEAVE_STORAGE_KEY = 'retailsphere_worker_leave_requests';

function getAuthHeaders() {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function getStoredLeaves(): WorkerLeaveItem[] {
  try {
    const data = localStorage.getItem(LEAVE_STORAGE_KEY);
    if (!data) return [];
    const parsed: WorkerLeaveItem[] = JSON.parse(data);
    const clean = parsed.filter(l => l.leave_id !== 101 && l.leave_id !== 102);
    return clean;
  } catch {
    return [];
  }
}

function saveStoredLeaves(leaves: WorkerLeaveItem[]) {
  try {
    const clean = leaves.filter(l => l.leave_id !== 101 && l.leave_id !== 102);
    localStorage.setItem(LEAVE_STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event('leave-requests-updated'));
  } catch (err) {
    console.error('Failed to save leaves locally:', err);
  }
}

function getInitialMockLeaves(): WorkerLeaveItem[] {
  return [];
}

// 1. Worker apply for leave
export async function applyWorkerLeave(payload: {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}): Promise<WorkerLeaveItem> {
  const userStr = localStorage.getItem('user_profile') || localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const workerId = user?.user_id || user?.id || 104;
  const workerName = user?.full_name || user?.name || 'Artisan Worker';

  const start = new Date(payload.start_date);
  const end = new Date(payload.end_date);
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1);

  const res = await fetch(`${API_BASE_URL}/api/worker/leave-applications`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    const data = await res.json();
    const newLeave: WorkerLeaveItem = {
      leave_id: data.leave_id || Date.now(),
      worker_id: workerId,
      worker_name: workerName,
      leave_type: payload.leave_type,
      start_date: payload.start_date,
      end_date: payload.end_date,
      duration_days: durationDays,
      reason: payload.reason,
      status: 'Pending',
      applied_on: new Date().toISOString()
    };
    return newLeave;
  }

  const err = await res.json().catch(() => ({ detail: 'Failed to submit leave application' }));
  throw new Error(err.detail || 'Failed to submit leave application');
}

// 2. Fetch My Worker Leave Applications
export async function fetchMyLeaveApplications(): Promise<WorkerLeaveItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/worker/leave-applications`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const dbLeaves = await res.json();
      if (Array.isArray(dbLeaves)) {
        return dbLeaves;
      }
    }
  } catch (err) {
    console.warn('API fetch worker leaves failed:', err);
  }

  return [];
}

// 3. Fetch All Leave Applications for Staff & Admin
export async function fetchAllLeaveRequests(): Promise<WorkerLeaveItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/leave-requests`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const dbLeaves = await res.json();
      if (dbLeaves && dbLeaves.length > 0) {
        return dbLeaves;
      }
    }
  } catch (err) {
    console.warn('API fetch all leave requests failed, returning stored leaves:', err);
  }

  return getStoredLeaves();
}

// 4. Review Leave Request (Approve / Reject)
export async function reviewLeaveRequest(
  leaveId: number,
  status: 'Approved' | 'Rejected',
  reviewNotes?: string,
  reviewerRole: string = 'Production Staff'
): Promise<WorkerLeaveItem> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/production/leave-requests/${leaveId}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, review_notes: reviewNotes })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.leave) return data.leave;
    }
  } catch (err) {
    console.warn('API leave review failed, updating local store:', err);
  }

  const stored = getStoredLeaves();
  const targetIdx = stored.findIndex(l => l.leave_id === leaveId);
  if (targetIdx >= 0) {
    stored[targetIdx].status = status;
    stored[targetIdx].reviewed_by = reviewerRole;
    if (reviewNotes) stored[targetIdx].review_notes = reviewNotes;
    saveStoredLeaves(stored);
    return stored[targetIdx];
  }

  throw new Error('Leave request not found.');
}
