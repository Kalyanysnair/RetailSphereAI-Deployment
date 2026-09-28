export interface RetailOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface RetailOrder {
  orderId: string;
  customerId?: number;
  customerName: string;
  email: string;
  itemsCount: number;
  totalAmount: number;
  originalSubtotal?: number;
  couponCode?: string;
  discountType?: string;
  discountDeducted?: number;
  shippingFee?: number;
  orderStatus: 'Order Placed' | 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Paid' | 'Completed' | 'Cancelled';
  paymentStatus: 'Paid' | 'Pending' | 'Cancelled';
  paymentId?: string;
  completionStatus?: string;
  completionPercentage?: number;
  createdAt?: number;
  orderDate: string;
  assignedWorkers?: any[];
  carrier?: string;
  expectedDeliveryDate?: string;
  trackingNumber?: string;
  fulfillment?: any;
  items: RetailOrderItem[];
}

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || ''}/api`;

async function safeFetchOrders(path: string, options?: RequestInit): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${base}/api${cleanPath}`;

  try {
    return await fetch(url, options);
  } catch (relativeErr) {
    const directUrl = `http://127.0.0.1:8000/api${cleanPath}`;
    try {
      return await fetch(directUrl, options);
    } catch (directErr) {
      throw directErr || relativeErr;
    }
  }
}

const STORAGE_KEY = 'retail_orders_list';

function isExcludedOrderId(idVal: any): boolean {
  if (!idVal) return false;
  const str = String(idVal).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (str.startsWith('custom')) return true;
  return str === '103' || str === '0103' || str === '40' || str === '040' || str === 'ret40' || str === 'ret000040';
}

export function getStoredRetailOrders(): RetailOrder[] {
  const allOrders: RetailOrder[] = [];
  const keys = [
    'retail_orders_list',
    'retailsphere_completed_orders',
    'retailsphere_orders',
    'retailsphere_order_history',
    'retailsphere_retail_orders_v1'
  ];

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((o: any) => !isExcludedOrderId(o?.orderId) && !isExcludedOrderId(o?.id));
          allOrders.push(...cleaned);
        } else if (parsed && typeof parsed === 'object' && (parsed.orderId || parsed.id)) {
          if (!isExcludedOrderId(parsed.orderId) && !isExcludedOrderId(parsed.id)) {
            allOrders.push(parsed);
          }
        }
      }
    } catch (err) { }
  });

  const validOrders = allOrders.filter(
    (o: any) => o && (o.orderId || (o as any).id) && !isExcludedOrderId(o.orderId) && !isExcludedOrderId((o as any).id) && o.paymentId !== 'pay_Kangaroby902' && o.payment_id !== 'pay_Kangaroby902'
  );

  const orderMap = new Map<string, RetailOrder>();
  validOrders.forEach((o: any) => {
    const idKey = String(o.orderId || o.id);
    if (!isExcludedOrderId(idKey)) {
      orderMap.set(idKey, o);
    }
  });

  return Array.from(orderMap.values());
}

export async function fetchRetailOrdersFromDB(): Promise<RetailOrder[]> {
  try {
    const res = await safeFetchOrders('/admin/orders');
    if (res.ok) {
      const dbOrders: RetailOrder[] = await res.json();
      if (Array.isArray(dbOrders)) {
        const orderMap = new Map<string, RetailOrder>();
        dbOrders.forEach((o) => {
          if (o && o.orderId && !isExcludedOrderId(o.orderId)) orderMap.set(String(o.orderId), o);
        });

        // Combine any non-duplicate local orders
        const local = getStoredRetailOrders();
        local.forEach((loc) => {
          if (loc && loc.orderId && !orderMap.has(String(loc.orderId)) && !isExcludedOrderId(loc.orderId)) {
            orderMap.set(String(loc.orderId), loc);
          }
        });

        const combined = Array.from(orderMap.values());
        combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
        } catch (e) {}

        return combined;
      }
    }
  } catch (err) {
    console.warn('Could not fetch DB orders:', err);
  }
  return getStoredRetailOrders();
}

export async function saveStoredRetailOrder(orderData: Omit<RetailOrder, 'orderId' | 'orderDate'>): Promise<RetailOrder> {
  const safePayload = {
    ...orderData,
    customerId: orderData.customerId ? (typeof orderData.customerId === 'number' ? orderData.customerId : (parseInt(String(orderData.customerId).replace(/\D/g, ''), 10) || null)) : null
  };

  let dbOrderId: string | null = null;
  try {
    const res = await safeFetchOrders('/admin/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safePayload)
    });
    if (res.ok) {
      const result = await res.json();
      if (result.orderId) {
        dbOrderId = result.orderId;
      }
    } else {
      const text = await res.text();
      console.warn('DB order post returned status:', res.status, text);
    }
  } catch (err) {
    console.warn('DB order post error:', err);
  }

  const existing = getStoredRetailOrders();
  const newOrder: RetailOrder = {
    ...orderData,
    orderId: dbOrderId || `RET-${Date.now().toString().slice(-6)}`,
    createdAt: Date.now(),
    orderDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  const updated = [newOrder, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('retail-orders-updated'));

  await fetchRetailOrdersFromDB();
  return newOrder;
}

export function cancelStoredRetailOrder(orderId: string): boolean {
  try {
    const existing = getStoredRetailOrders();
    const target = existing.find(o => o.orderId === orderId);
    if (target) {
      target.orderStatus = 'Cancelled';
      target.paymentStatus = 'Cancelled';
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new Event('retail-orders-updated'));
    }

    safeFetchOrders(`/admin/orders/${orderId}/cancel`, { method: 'PUT' })
      .catch((err) => console.warn('Cancel DB order sync error:', err));

    return true;
  } catch (err) {
    return false;
  }
}

export function deleteStoredRetailOrder(orderId: string): boolean {
  try {
    const existing = getStoredRetailOrders();
    const updated = existing.filter(o => o.orderId !== orderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('retail-orders-updated'));

    safeFetchOrders(`/admin/orders/${orderId}`, { method: 'DELETE' })
      .catch((err) => console.warn('Delete DB order error:', err));

    return true;
  } catch (err) {
    return false;
  }
}

export interface CompletionStatusInfo {
  status: string;
  percentage: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  barColor: string;
  stage: string;
}

export function computeLogicalCompletionStatus(order: {
  orderStatus?: string;
  paymentStatus?: string;
  completionStatus?: string;
  completionPercentage?: number;
  assignedWorkers?: any[];
  progress_percentage?: number;
}): CompletionStatusInfo {
  const pStatus = (order.paymentStatus || '').toLowerCase();
  const oStatus = (order.orderStatus || '').toLowerCase();
  const cStatus = (order.completionStatus || '').toLowerCase();
  const progPct = order.completionPercentage ?? order.progress_percentage;

  // 1. Cancelled
  if (oStatus === 'cancelled' || pStatus === 'cancelled' || cStatus === 'cancelled') {
    return {
      status: 'Cancelled',
      percentage: 0,
      badgeBg: 'bg-rose-100/90',
      badgeText: 'text-rose-800',
      badgeBorder: 'border-rose-300',
      barColor: 'bg-rose-500',
      stage: 'Order Cancelled'
    };
  }

  // 2. Pending Payment
  if (pStatus === 'pending' || pStatus === 'unpaid') {
    return {
      status: 'Pending Payment',
      percentage: 5,
      badgeBg: 'bg-amber-100/90',
      badgeText: 'text-amber-900',
      badgeBorder: 'border-amber-300',
      barColor: 'bg-amber-500',
      stage: 'Awaiting Customer Payment'
    };
  }

  // 3. Delivered
  if (oStatus === 'delivered' || cStatus === 'delivered') {
    return {
      status: 'Delivered',
      percentage: 100,
      badgeBg: 'bg-emerald-100/90',
      badgeText: 'text-emerald-900',
      badgeBorder: 'border-emerald-300',
      barColor: 'bg-emerald-600',
      stage: 'Delivered to Customer'
    };
  }

  // 3.5 Out for Delivery
  if (
    oStatus === 'out for delivery' ||
    oStatus === 'out_for_delivery' ||
    cStatus === 'out for delivery' ||
    cStatus === 'out_for_delivery'
  ) {
    return {
      status: 'Out for Delivery',
      percentage: 90,
      badgeBg: 'bg-sky-100/90',
      badgeText: 'text-sky-900',
      badgeBorder: 'border-sky-300',
      barColor: 'bg-sky-600',
      stage: 'Out for Delivery to Customer'
    };
  }

  // 3.6 Dispatched
  if (oStatus === 'dispatched' || cStatus === 'dispatched') {
    return {
      status: 'Dispatched',
      percentage: 80,
      badgeBg: 'bg-blue-100/90',
      badgeText: 'text-blue-900',
      badgeBorder: 'border-blue-300',
      barColor: 'bg-blue-600',
      stage: 'Dispatched via Carrier / Internal Fleet'
    };
  }

  // 4. Shipped & In Transit
  if (oStatus === 'shipped' || cStatus === 'shipped' || cStatus.includes('transit')) {
    return {
      status: 'Shipped & In Transit',
      percentage: 85,
      badgeBg: 'bg-purple-100/90',
      badgeText: 'text-purple-900',
      badgeBorder: 'border-purple-300',
      barColor: 'bg-purple-600',
      stage: 'Out for Delivery / In Transit'
    };
  }

  // 5. Completed & Ready for Dispatch
  if (
    oStatus === 'completed' ||
    cStatus === 'completed' ||
    cStatus.includes('ready for dispatch') ||
    (progPct !== undefined && progPct >= 100)
  ) {
    return {
      status: 'Completed & Ready for Dispatch',
      percentage: 100,
      badgeBg: 'bg-emerald-100/90',
      badgeText: 'text-emerald-900',
      badgeBorder: 'border-emerald-300',
      barColor: 'bg-emerald-500',
      stage: 'Quality Checked & Ready'
    };
  }

  // 6. In Production
  const hasWorkers = Array.isArray(order.assignedWorkers) && order.assignedWorkers.length > 0;
  if (
    oStatus === 'in production' ||
    cStatus.includes('production') ||
    cStatus.includes('progress') ||
    hasWorkers ||
    (progPct !== undefined && progPct > 10)
  ) {
    const calcPct = progPct && progPct > 10 ? progPct : (hasWorkers ? 60 : 40);
    return {
      status: `In Production (${calcPct}%)`,
      percentage: calcPct,
      badgeBg: 'bg-blue-100/90',
      badgeText: 'text-blue-900',
      badgeBorder: 'border-blue-300',
      barColor: 'bg-blue-600',
      stage: hasWorkers ? 'Assigned to Craftsmen' : 'Material Allocation'
    };
  }

  // 7. Processing / Order Placed (Paid)
  if (oStatus === 'processing' || cStatus.includes('processing')) {
    return {
      status: 'Processing Order',
      percentage: 25,
      badgeBg: 'bg-sky-100/90',
      badgeText: 'text-sky-900',
      badgeBorder: 'border-sky-300',
      barColor: 'bg-sky-500',
      stage: 'Order Confirmed & Preparing'
    };
  }

  // Default for Paid & Verified order
  return {
    status: 'Order Placed & Processing',
    percentage: 15,
    badgeBg: 'bg-teal-100/90',
    badgeText: 'text-teal-900',
    badgeBorder: 'border-teal-300',
    barColor: 'bg-teal-500',
    stage: 'Order Received & Verified'
  };
}

export function updateStoredRetailOrderCompletionStatus(
  orderId: string,
  newCompletionStatus?: string,
  newCompletionPercentage?: number,
  assignedWorkerName?: string,
  assignedWorkerId?: number
): boolean {
  try {
    const existing = getStoredRetailOrders();
    const target = existing.find(o => o.orderId === orderId);
    if (target) {
      if (newCompletionStatus !== undefined) target.completionStatus = newCompletionStatus;
      if (newCompletionPercentage !== undefined) target.completionPercentage = newCompletionPercentage;
      if (assignedWorkerName !== undefined) (target as any).assignedWorkerName = assignedWorkerName;
      if (assignedWorkerId !== undefined) (target as any).assignedWorkerId = assignedWorkerId;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new Event('retail-orders-updated'));
    }

    if (newCompletionStatus !== undefined) {
      safeFetchOrders(`/admin/orders/${orderId}/completion-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completion_status: newCompletionStatus,
          order_status: target?.orderStatus,
          payment_status: target?.paymentStatus
        })
      }).catch((err) => console.warn('Completion status sync error:', err));
    }

    return true;
  } catch (err) {
    return false;
  }
}

