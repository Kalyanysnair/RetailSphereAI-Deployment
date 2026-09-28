export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function safeFetchCoupons(path: string, options?: RequestInit): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${base}/api/coupons${cleanPath}`;

  try {
    return await fetch(url, options);
  } catch (relativeErr) {
    const directUrl = `http://127.0.0.1:8000/api/coupons${cleanPath}`;
    try {
      return await fetch(directUrl, options);
    } catch (directErr) {
      throw directErr || relativeErr;
    }
  }
}

export interface Coupon {
  id: string;
  code: string;
  type: string;
  discountPercent: number;
  flatDiscountAmount?: number;
  description: string;
  customerLimit?: number;
  currentRedemptions: number;
  targetUserEmail?: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  audienceType?: string;
}

export interface CouponAllotment {
  id: string;
  couponCode: string;
  discountPercent: number;
  targetUserEmail: string;
  allottedDate: string;
  used: boolean;
  usedDate?: string;
}

export interface CustomerNotification {
  id: string;
  targetUserEmail: string;
  couponCode: string;
  discountPercent: number;
  message: string;
  createdDate: string;
  read: boolean;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const createCouponApi = async (data: {
  code: string;
  coupon_type: string;
  discount_percent: number;
  flat_discount_amount?: number;
  description: string;
  customer_limit?: number;
  target_user_email?: string;
}) => {
  const response = await safeFetchCoupons('', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to create coupon.');
  }
  return response.json();
};

export const getCouponsApi = async (): Promise<{ coupons: Coupon[]; allotments: CouponAllotment[] }> => {
  try {
    const response = await safeFetchCoupons('', {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      return { coupons: [], allotments: [] };
    }
    return response.json();
  } catch {
    return { coupons: [], allotments: [] };
  }
};

export const deleteCouponApi = async (couponId: string | number) => {
  const response = await safeFetchCoupons(`/${couponId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to delete coupon.');
  }
  return response.json();
};

export const regenerateCouponApi = async (couponId: string | number) => {
  const response = await safeFetchCoupons(`/${couponId}/regenerate`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to reactivate coupon.');
  }
  return response.json();
};

export const getCustomerNotificationsApi = async (): Promise<CustomerNotification[]> => {
  try {
    const response = await safeFetchCoupons('/my-notifications', {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
};

export const validateCouponApi = async (code: string) => {
  try {
    const response = await safeFetchCoupons('/validate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { valid: false, message: err.detail || 'Invalid or expired promo code.' };
    }
    return response.json();
  } catch {
    return { valid: false, message: 'Could not connect to promo validation server.' };
  }
};

export const redeemCouponApi = async (code: string, orderId?: string) => {
  const response = await safeFetchCoupons('/redeem', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ code, order_id: orderId })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to redeem coupon.');
  }
  return response.json();
};
