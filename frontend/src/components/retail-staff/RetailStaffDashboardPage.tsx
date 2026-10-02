import React, { useState, useEffect } from 'react';
import { updateUserProfile, fetchAllUsers } from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { clearUserSession } from '../../utils/sessionUtils';
import {
  Package,
  Plus,
  Search,
  LogOut,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  XCircle,
  SlidersHorizontal,
  Briefcase,
  DollarSign,
  ShoppingBag,
  Clock,
  Truck,
  Edit,
  Eye,
  Check,
  RotateCcw,
  User,
  ShieldCheck,
  ChevronDown,
  Lock,
  Key,
  MessageSquare,
  Send,
  HelpCircle,
  Bell,
  Tag,
  Percent,
  Trash2,
  Mail,
  UserCheck,
  ArrowRight,
  Edit3,
  LayoutDashboard,
  Inbox,
  Wrench,
  MessageCircle,
  RefreshCw,
  Layers,
  Sparkles,
  MapPin,
  Phone
} from 'lucide-react';
import { getCouponsApi, createCouponApi, deleteCouponApi, regenerateCouponApi, Coupon, CouponAllotment } from '../../services/api_coupons';
import { fetchAvailableVehiclesDB, VehicleItem } from '../../services/api_fleet';
import { deleteStoredRetailOrder } from '../../utils/retailOrdersStorage';
import { getMessagesForUser, markAdminMessageRead, markAllAdminMessagesReadForUser, isMessageReadByUser, AdminMessage } from '../../utils/adminMessagesStorage';
import { parseAvailableColors, getColorHex } from '../../utils/colorUtils';
import {
  fetchRetailDashboardSummary,
  fetchRequestInbox,
  fetchRetailWorkloadRecommendations,
  assignRequestToRetailStaff,
  reviewCustomizationRequestAPI,
  reviewFabricationRequestAPI,
  reviewServiceRequestAPI,
  fetchRequestMessagesAPI,
  fetchRequestMessagesAPI as fetchReqMsgAPI,
  sendRequestMessageAPI,
  RetailDashboardSummary,
  RequestInboxItem,
  RetailStaffWorkload,
  UniversalRequestMessage
} from '../../services/retailStaffOpsApi';
import {
  fetchFulfillmentSummary,
  fetchOrderFulfillmentDetails,
  markOrderPackedAPI,
  dispatchOrderAPI,
  updateDeliveryStatusAPI,
  fetchOrderHistoryAPI,
  fetchOrderMessagesAPI,
  sendOrderMessageAPI,
  fetchAllReturnRequestsAPI,
  updateReturnStatusAPI,
  fetchFabricationFulfillmentJobs,
  dispatchFulfillmentJobAPI,
  FabricationFulfillmentJob,
  FulfillmentSummary,
  FulfillmentDetails,
  StatusHistoryItem,
  OrderMessageItem,
  ReturnRequestRecord
} from '../../services/retailOrdersFulfillmentApi';
import { getCarrierPartnersApi, CarrierPartner } from '../../services/api_carriers';







export interface RetailProduct {
  id: string;
  product_id?: number | string;
  productCode?: string;
  name: string;
  category: string;
  material: string;
  color?: string;
  price: number;
  stockCount: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  sku: string;
  image_url?: string;
  detailed_description?: string;
  dimensions?: string;
  warranty_info?: string;
  subcategory?: string;
  warrantyInfo?: string;
  detailedDescription?: string;
}

export interface RetailOrder {
  orderId: string;
  customerName?: string;
  user_name?: string;
  email?: string;
  customerEmail?: string;
  itemsCount?: number;
  totalAmount?: number;
  totalPrice?: number;
  amount?: number;
  orderStatus: 'Order Placed' | 'Pending' | 'Processing' | 'Shipped' | 'Dispatched' | 'Out for Delivery' | 'Delivered' | 'Paid' | 'Cancelled' | string;
  paymentStatus?: 'Paid' | 'Pending' | 'Cancelled' | string;
  paymentId?: string;
  completionStatus?: string;
  completionPercentage?: number;
  items?: Array<{
    id: string;
    productCode?: string;
    sku?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    image?: string;
  }>;
  orderDate?: string;
  createdAt?: number | string;
  assignedWorkers?: any[];
}

export interface SupplierProductItem {
  product_id?: number;
  id?: string;
  sku?: string;
  name: string;
  category: string;
  material: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface RetailSupplier {
  id: string;
  supplier_id?: number;
  supplier_name: string;
  contact_person: string;
  phone: string;
  address: string;
  assigned_products_count?: number;
  assigned_products?: SupplierProductItem[];
  status: 'Active' | 'Inactive';
}

import {
  fetchInventoryFromDB,
  createProductInDB,
  updateStockInDB,
  fetchQueriesFromDB,
  createStaffQueryInDB,
  fetchNotificationsFromDB,
  markNotificationReadInDB,
  markAllNotificationsReadInDB,
  fetchSuppliersFromDB,
  createSupplierInDB
} from '../../services/api';
import { addStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';
import { getStoredRetailOrders, fetchRetailOrdersFromDB, computeLogicalCompletionStatus, updateStoredRetailOrderCompletionStatus } from '../../utils/retailOrdersStorage';
import { fetchCustomOrders, fetchWorkers } from '../../services/api_production';

export const INITIAL_PRODUCTS: RetailProduct[] = [];
export const INITIAL_ORDERS: RetailOrder[] = [];

export const RetailStaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab: dashboard | retail_orders | orders | request_inbox | customizations | fabrication | services | fulfillment | returns | communication | products | inventory | suppliers | coupons | queries | admin_messages
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'retail_orders' | 'orders' | 'request_inbox' | 'customizations' | 'fabrication' | 'services' | 'fulfillment' | 'returns' | 'communication' | 'products' | 'inventory' | 'suppliers' | 'coupons' | 'queries' | 'admin_messages'
  >('dashboard');

  // Control Center State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hoveredSidebarTooltip, setHoveredSidebarTooltip] = useState<{ label: string; top: number; left: number } | null>(null);

  const handleSidebarItemMouseEnter = (e: React.MouseEvent<HTMLElement>, label: string) => {
    if (isSidebarCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredSidebarTooltip({
        label,
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  };

  const handleSidebarItemMouseLeave = () => {
    setHoveredSidebarTooltip(null);
  };
  const [dashboardSummary, setDashboardSummary] = useState<RetailDashboardSummary | null>(null);
  const [requestInboxItems, setRequestInboxItems] = useState<RequestInboxItem[]>([]);
  const [inboxCategoryFilter, setInboxCategoryFilter] = useState<string>('ALL');
  const [inboxStatusFilter, setInboxStatusFilter] = useState<string>('ALL');

  // Review Modal State
  const [selectedReviewItem, setSelectedReviewItem] = useState<RequestInboxItem | null>(null);
  const [reviewActionModal, setReviewActionModal] = useState<{ item: RequestInboxItem; action: 'APPROVE' | 'MORE_INFO' | 'REJECT' } | null>(null);
  const [reviewNotesInput, setReviewNotesInput] = useState('');
  const [priorityInput, setPriorityInput] = useState('NORMAL');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Universal Communication Chat State
  const [universalChatRequest, setUniversalChatRequest] = useState<{ type: string; id: number; title: string; customer: string } | null>(null);
  const [universalChatMessages, setUniversalChatMessages] = useState<UniversalRequestMessage[]>([]);
  const [universalNewMsg, setUniversalNewMsg] = useState('');

  // Order Fulfillment Center State
  const [fulfillmentSummary, setFulfillmentSummary] = useState<FulfillmentSummary>({
    to_pack: 0, packed: 0, to_dispatch: 0, dispatched: 0, out_for_delivery: 0, delivered: 0, returns: 0, total_orders: 0
  });
  const [ordersSubTab, setOrdersSubTab] = useState<'all' | 'new_orders' | 'to_pack' | 'packed' | 'to_dispatch' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'returns'>('all');

  // Modals State
  const [packingModalOrder, setPackingModalOrder] = useState<RetailOrder | null>(null);
  const [packingChecklist, setPackingChecklist] = useState({
    product_verified: true,
    quantity_verified: true,
    accessories_included: true,
    protective_packaging: true,
    final_inspection: true
  });
  const [packingNote, setPackingNote] = useState('Packed with high-density protective foam.');

  const [dispatchModalOrder, setDispatchModalOrder] = useState<RetailOrder | null>(null);
  const [dispatchType, setDispatchType] = useState<'internal' | 'external'>('internal');
  const [dispatchCarrier, setDispatchCarrier] = useState('');
  const [dispatchTrackingNumber, setDispatchTrackingNumber] = useState('');
  const [dispatchExpectedDate, setDispatchExpectedDate] = useState('');
  const [dispatchNote, setDispatchNote] = useState('');
  const [availableVehiclesList, setAvailableVehiclesList] = useState<VehicleItem[]>([]);
  const [selectedDispatchVehicleId, setSelectedDispatchVehicleId] = useState<string>('');
  const [carrierPartnersList, setCarrierPartnersList] = useState<CarrierPartner[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);

  // Fabrication Transportation Fulfillment State
  const [fulfillmentTypeTab, setFulfillmentTypeTab] = useState<'readymade' | 'fabrication'>('readymade');
  const [fabricationJobsList, setFabricationJobsList] = useState<FabricationFulfillmentJob[]>([]);
  const [dispatchModalFabJob, setDispatchModalFabJob] = useState<FabricationFulfillmentJob | null>(null);

  const handleOpenDispatchModal = async (ord: RetailOrder) => {
    setDispatchModalOrder(ord);
    setDispatchModalFabJob(null);
    setDispatchTrackingNumber('');
    setDispatchNote('');

    try {
      const carriers = await getCarrierPartnersApi();
      const activeCarriers = (carriers || []).filter(c => c.status === true || (c as any).status === 1 || String(c.status).toLowerCase() === 'true');
      setCarrierPartnersList(activeCarriers);
      if (activeCarriers.length > 0) {
        setDispatchCarrier(activeCarriers[0].carrier_name);
      } else {
        setDispatchCarrier('');
      }
    } catch (e) {
      setCarrierPartnersList([]);
      setDispatchCarrier('');
    }

    try {
      const details = await fetchOrderFulfillmentDetails(ord.orderId);
      if (details?.fulfillment?.expected_delivery_date) {
        setDispatchExpectedDate(details.fulfillment.expected_delivery_date);
      } else {
        setDispatchExpectedDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      }
    } catch (e) {
      setDispatchExpectedDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    }
  };

  const handleOpenDispatchModalForFabrication = async (job: FabricationFulfillmentJob) => {
    setDispatchModalFabJob(job);
    setDispatchModalOrder(null);
    setDispatchTrackingNumber('');
    setDispatchNote('');

    try {
      const carriers = await getCarrierPartnersApi();
      const activeCarriers = (carriers || []).filter(c => c.status === true || (c as any).status === 1 || String(c.status).toLowerCase() === 'true');
      setCarrierPartnersList(activeCarriers);
      if (activeCarriers.length > 0) {
        setDispatchCarrier(activeCarriers[0].carrier_name);
      } else {
        setDispatchCarrier('');
      }
    } catch (e) {
      setCarrierPartnersList([]);
      setDispatchCarrier('');
    }

    setDispatchExpectedDate(job.expected_delivery_date || new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  };

  useEffect(() => {
    fetchAllUsers().then((users) => {
      setAllUsersList(users || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (dispatchModalOrder || dispatchModalFabJob) {
      fetchAvailableVehiclesDB().then((list) => {
        setAvailableVehiclesList(list || []);
        if (list && list.length > 0) {
          setSelectedDispatchVehicleId(list[0].vehicle_id.toString());
        } else {
          setSelectedDispatchVehicleId('');
        }
      });
    }
  }, [dispatchModalOrder, dispatchModalFabJob]);

  const [deliveryStatusModalOrder, setDeliveryStatusModalOrder] = useState<RetailOrder | null>(null);
  const [deliveryStatusVal, setDeliveryStatusVal] = useState('Out for Delivery');
  const [deliveryNote, setDeliveryNote] = useState('');

  const [historyModalOrder, setHistoryModalOrder] = useState<RetailOrder | null>(null);
  const [historyData, setHistoryData] = useState<StatusHistoryItem[]>([]);

  const [returnRequestsList, setReturnRequestsList] = useState<ReturnRequestRecord[]>([]);

  const [staffChatModalOrder, setStaffChatModalOrder] = useState<RetailOrder | null>(null);
  const [staffChatMessages, setStaffChatMessages] = useState<OrderMessageItem[]>([]);
  const [staffNewMessage, setStaffNewMessage] = useState('');

  const [retailWorkloadList, setRetailWorkloadList] = useState<RetailStaffWorkload[]>([]);
  const [assignedStaffFilter, setAssignedStaffFilter] = useState<'ALL' | 'MY_WORK' | 'UNASSIGNED'>('ALL');
  const [activeStaffUserId, setActiveStaffUserId] = useState<number>(4); // Default logged-in Retail Staff ID
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [selectedOrderSpecModal, setSelectedOrderSpecModal] = useState<RetailOrder | null>(null);

  useEffect(() => {
    fetchWorkers().then(list => setWorkersList(list || []));
  }, []);

  const handleAssignWorkerToReadymadeOrder = (orderId: string | number, workerId: number) => {
    const targetWorker = workersList.find(w => w.worker_id === workerId);
    const workerName = targetWorker ? targetWorker.full_name : 'Assigned Worker';

    setOrderList(prev => prev.map(ord => {
      if (ord.orderId === orderId || String(ord.orderId) === String(orderId)) {
        return {
          ...ord,
          assignedWorkerId: workerId,
          assignedWorkerName: workerName
        };
      }
      return ord;
    }));

    updateStoredRetailOrderCompletionStatus(String(orderId), undefined, undefined, workerName, workerId);
  };

  // Load Control Center Summary and Request Inbox
  const refreshControlCenterData = async () => {
    const summary = await fetchRetailDashboardSummary();
    if (summary) setDashboardSummary(summary);
    const workloads = await fetchRetailWorkloadRecommendations();
    setRetailWorkloadList(workloads);

    const filterStaffId = assignedStaffFilter === 'MY_WORK' ? activeStaffUserId : undefined;

    const inbox = await fetchRequestInbox(inboxCategoryFilter, inboxStatusFilter, filterStaffId, false);
    const customerRequestsOnly = (inbox || []).filter(item => item && (item.type as string) !== 'RETAIL_ORDER' && !String(item.request_id).startsWith('RET-'));
    setRequestInboxItems(customerRequestsOnly);
    const fulfillment = await fetchFulfillmentSummary();
    setFulfillmentSummary(fulfillment);
    const returns = await fetchAllReturnRequestsAPI();
    setReturnRequestsList(returns);
    const fabJobs = await fetchFabricationFulfillmentJobs();
    setFabricationJobsList(fabJobs);
    await loadAllOrdersForStaff();
  };

  const handleAssignToRetailStaff = async (requestType: string, requestId: number, staffId: number) => {
    const targetStaff = retailWorkloadList.find(s => s.staff_id === staffId);
    const staffName = targetStaff ? targetStaff.full_name : 'Assigned Staff';

    // Update local state immediately so assigned staff is displayed instantly and not hidden
    setRequestInboxItems(prev => prev.map(item => {
      if (item.type === requestType && item.numeric_id === requestId) {
        return {
          ...item,
          reviewed_by_id: staffId,
          reviewed_by_name: staffName,
          review_status: (!item.review_status || item.review_status === 'NEW') ? 'UNDER_REVIEW' : item.review_status
        };
      }
      return item;
    }));

    const ok = await assignRequestToRetailStaff(requestType, requestId, staffId);
    if (ok) {
      const workloads = await fetchRetailWorkloadRecommendations();
      setRetailWorkloadList(workloads);
      const summary = await fetchRetailDashboardSummary();
      if (summary) setDashboardSummary(summary);
    }
  };

  const refreshFulfillmentData = refreshControlCenterData;

  useEffect(() => {
    refreshControlCenterData();
  }, [inboxCategoryFilter, inboxStatusFilter, assignedStaffFilter]);

  const handleExecuteReviewAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewActionModal) return;

    setSubmittingReview(true);
    const { item, action } = reviewActionModal;
    const revSt = action === 'APPROVE' ? 'APPROVED' : action === 'MORE_INFO' ? 'MORE_INFO_REQUESTED' : 'REJECTED';

    let success = false;
    try {
      if (item.type === 'CUSTOMIZATION') {
        success = await reviewCustomizationRequestAPI(item.numeric_id, revSt, 1, reviewNotesInput, priorityInput);
      } else if (item.type === 'FABRICATION') {
        success = await reviewFabricationRequestAPI(item.numeric_id, revSt, 1, reviewNotesInput, priorityInput);
      } else if (item.type === 'ON-SITE SERVICES') {
        success = await reviewServiceRequestAPI(item.numeric_id, revSt, 1, reviewNotesInput, priorityInput);
      } else if (item.type === 'RETAIL_ORDER') {
        setOrderList(prev => prev.map(ord => {
          if (String(ord.orderId) === String(item.numeric_id) || String(ord.orderId) === String(item.request_id)) {
            return {
              ...ord,
              orderStatus: revSt === 'APPROVED' ? 'Processing' : revSt === 'REJECTED' ? 'Cancelled' : 'Under Review',
              completionStatus: revSt === 'APPROVED' ? 'Approved by Retail Staff' : 'Under Review'
            };
          }
          return ord;
        }));
        updateStoredRetailOrderCompletionStatus(String(item.numeric_id), revSt === 'APPROVED' ? 'Approved by Retail Staff' : 'Under Review');
        success = true;
      }
    } catch (err) {
      console.warn('Review submission error:', err);
    }

    // Always update local inbox state immediately for seamless UX
    setRequestInboxItems(prev => prev.map(inboxItem => {
      if (inboxItem.request_id === item.request_id || (inboxItem.type === item.type && inboxItem.numeric_id === item.numeric_id)) {
        return {
          ...inboxItem,
          review_status: revSt,
          priority: priorityInput || inboxItem.priority,
          review_notes: reviewNotesInput || inboxItem.review_notes
        };
      }
      return inboxItem;
    }));

    setSubmittingReview(false);
    setReviewActionModal(null);
    setSelectedReviewItem(null);
    setReviewNotesInput('');
    await refreshControlCenterData();
  };

  // Queries State
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [newQueryCategory, setNewQueryCategory] = useState<'Email Change Request' | 'Role & Access Permission' | 'General Query'>('Email Change Request');
  const [newQuerySubject, setNewQuerySubject] = useState('');
  const [newQueryMessage, setNewQueryMessage] = useState('');

  // User Info from localStorage (No hardcoded demo data)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; initials: string }>({
    name: '',
    email: '',
    initials: 'RS'
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.full_name || parsed.fullName || parsed.name || parsed.email || 'Staff User';
        const email = parsed.email || '';

        let initials = 'RS';
        if (name) {
          const parts = name.trim().split(' ');
          if (parts.length >= 2) {
            initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          } else if (parts[0].length >= 2) {
            initials = parts[0].substring(0, 2).toUpperCase();
          } else {
            initials = parts[0][0].toUpperCase();
          }
        }

        const uid = parsed.user_id || parsed.id;
        if (uid) setActiveStaffUserId(uid);

        setCurrentUser({ name, email, initials });
      }
    } catch (err) {
      console.warn('Error reading user from localStorage:', err);
    }
  }, []);

  // Notifications & User Menu State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Admin Messages & Staff Queries State
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [adminSubTab, setAdminSubTab] = useState<'directives' | 'queries'>('directives');

  const loadAdminMsgs = () => {
    let email = currentUser?.email || 'retail.staff@retailsphere.com';
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.email) email = parsed.email;
      } catch (err) {}
    }
    const msgs = getMessagesForUser(email, 'Retail Staff');
    setAdminMessages(msgs);
  };

  useEffect(() => {
    loadAdminMsgs();
    window.addEventListener('admin-messages-updated', loadAdminMsgs);
    return () => {
      window.removeEventListener('admin-messages-updated', loadAdminMsgs);
    };
  }, [currentUser?.email]);

  const unreadAdminMsgsCount = adminMessages.filter(m => !isMessageReadByUser(m, currentUser?.email || '')).length;

  const unreadCount = notifications.filter(n => n.unread).length;



  const loadQueriesFromDB = async () => {
    try {
      const dbQueries = await fetchQueriesFromDB();
      if (dbQueries && Array.isArray(dbQueries)) {
        setStaffQueries(dbQueries);
      } else {
        setStaffQueries([]);
      }
    } catch (err) {
      console.warn('Error loading DB queries:', err);
      setStaffQueries([]);
    }
  };

  useEffect(() => {
    loadQueriesFromDB();
  }, []);

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuerySubject.trim() || !newQueryMessage.trim()) return;

    const payload = {
      staff_name: currentUser.name || 'Retail Staff Member',
      staff_email: currentUser.email || 'retail.staff@retailsphere.com',
      category: newQueryCategory,
      subject: newQuerySubject,
      message: newQueryMessage
    };

    try {
      const created = await createStaffQueryInDB(payload);
      setStaffQueries((prev) => [created, ...prev]);
    } catch (err) {
      console.warn('Failed to post query to DB, fallback locally:', err);
      const created = addStaffQuery({
        staffName: payload.staff_name,
        staffEmail: payload.staff_email,
        category: payload.category as any,
        subject: payload.subject,
        message: payload.message
      });
      setStaffQueries((prev) => [created, ...prev]);
    }

    setNewQuerySubject('');
    setNewQueryMessage('');
    setSuccessNotice('Your request has been submitted to Admin! You can track Admin responses here.');

    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };


  // Products & Inventory State

  const [productList, setProductList] = useState<RetailProduct[]>(INITIAL_PRODUCTS);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');


  // Orders State
  const [orderList, setOrderList] = useState<RetailOrder[]>(() => getStoredRetailOrders() as any);

  // Edit Order Modal State
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<RetailOrder | null>(null);
  const [editOrderStatusValue, setEditOrderStatusValue] = useState<string>('Order Placed');
  const [editOrderPaymentStatusValue, setEditOrderPaymentStatusValue] = useState<string>('Paid');
  const [editOrderCompletionStatusValue, setEditOrderCompletionStatusValue] = useState<string>('Order Placed & Processing');

  const handleOpenEditOrder = (ord: RetailOrder) => {
    setSelectedOrderForEdit(ord);
    setEditOrderStatusValue(ord.orderStatus || 'Order Placed');
    setEditOrderPaymentStatusValue(ord.paymentStatus || 'Paid');
    const compInfo = computeLogicalCompletionStatus(ord);
    setEditOrderCompletionStatusValue(ord.completionStatus || compInfo.status);
  };

  const handleLogicallyGenerateCompletionStatus = (ord?: RetailOrder) => {
    const target = ord || selectedOrderForEdit;
    if (!target) return;
    const info = computeLogicalCompletionStatus({
      ...target,
      orderStatus: editOrderStatusValue || target.orderStatus,
      paymentStatus: editOrderPaymentStatusValue || target.paymentStatus
    });
    setEditOrderCompletionStatusValue(info.status);

    if (ord) {
      updateStoredRetailOrderCompletionStatus(ord.orderId, info.status, info.percentage);
      setSuccessNotice(`Logically generated completion status for Order #${ord.orderId}: "${info.status}" (${info.percentage}% complete)`);
      setTimeout(() => setSuccessNotice(null), 5000);
      loadAllOrdersForStaff();
    }
  };

  const handleAutoGenerateAllCompletionStatuses = () => {
    let updatedCount = 0;
    orderList.forEach((ord) => {
      const info = computeLogicalCompletionStatus(ord);
      updateStoredRetailOrderCompletionStatus(ord.orderId, info.status, info.percentage);
      updatedCount++;
    });
    setSuccessNotice(`⚡ Logically auto-generated completion status for all ${updatedCount} customer orders!`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadAllOrdersForStaff();
  };

  const handleSaveEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForEdit) return;

    const compInfo = computeLogicalCompletionStatus({
      ...selectedOrderForEdit,
      orderStatus: editOrderStatusValue,
      paymentStatus: editOrderPaymentStatusValue,
      completionStatus: editOrderCompletionStatusValue
    });

    const finalStatus = editOrderCompletionStatusValue || compInfo.status;
    updateStoredRetailOrderCompletionStatus(
      selectedOrderForEdit.orderId,
      finalStatus,
      compInfo.percentage
    );

    const updatedList = orderList.map((o) =>
      o.orderId === selectedOrderForEdit.orderId
        ? {
            ...o,
            orderStatus: editOrderStatusValue as any,
            paymentStatus: editOrderPaymentStatusValue as any,
            completionStatus: finalStatus,
            completionPercentage: compInfo.percentage
          }
        : o
    );
    setOrderList(updatedList as any);
    localStorage.setItem('retailsphere_retail_orders_v1', JSON.stringify(updatedList));
    localStorage.setItem('retail_orders_list', JSON.stringify(updatedList));
    window.dispatchEvent(new Event('retail-orders-updated'));

    setSelectedOrderForEdit(null);
    setSuccessNotice(`Updated order #${selectedOrderForEdit.orderId} status & completion state!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const formatPaymentTime = (ord: any) => {
    if (ord.createdAt) {
      try {
        const d = new Date(ord.createdAt);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          return `${dateStr} at ${timeStr}`;
        }
      } catch (e) {}
    }
    if (ord.orderDate) {
      try {
        const d = new Date(ord.orderDate);
        if (!isNaN(d.getTime())) {
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          return `${dateStr} at ${timeStr}`;
        }
      } catch (e) {}
      return ord.orderDate;
    }
    return 'Recent';
  };

  const loadAllOrdersForStaff = async () => {
    try {
      const dbStoreOrders = await fetchRetailOrdersFromDB();
      // Ensure only ready-made store purchases (excluding custom/CUS orders) are displayed in Ready-Made Orders & Fulfillment
      const readymadeOnly = dbStoreOrders.filter(
        (o) => o && o.orderId && !String(o.orderId).startsWith('CUS-') && !String(o.orderId).startsWith('FAB-') && !String(o.orderId).startsWith('ONS-')
      );
      readymadeOnly.sort((a, b) => ((b as any).createdAt || 0) - ((a as any).createdAt || 0));
      setOrderList(readymadeOnly as any);
    } catch (err) {
      console.warn('Error loading all orders for staff:', err);
    }
  };

  useEffect(() => {
    loadAllOrdersForStaff();
    window.addEventListener('retail-orders-updated', loadAllOrdersForStaff);
    window.addEventListener('custom-orders-updated', loadAllOrdersForStaff);
    window.addEventListener('storage', loadAllOrdersForStaff);
    return () => {
      window.removeEventListener('retail-orders-updated', loadAllOrdersForStaff);
      window.removeEventListener('custom-orders-updated', loadAllOrdersForStaff);
      window.removeEventListener('storage', loadAllOrdersForStaff);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'customizations') {
      setInboxCategoryFilter('CUSTOMIZATION');
    } else if (activeTab === 'fabrication') {
      setInboxCategoryFilter('FABRICATION');
    } else if (activeTab === 'services') {
      setInboxCategoryFilter('SERVICES');
    }
  }, [activeTab]);

  // Modals
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RetailProduct | null>(null);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [restockProduct, setRestockProduct] = useState<RetailProduct | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>('10');

  const [successNotice, setSuccessNotice] = useState<string | null>(null);








  const handleSignOut = () => {
    clearUserSession();
    navigate('/login', { replace: true });
  };

  // Staff Profile Modal State
  const [isStaffProfileModalOpen, setIsStaffProfileModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '+91 98765 43210',
    department: 'Retail Furniture Catalog & Sales',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser.name || currentUser.email) {
      setProfileForm((prev) => ({
        ...prev,
        full_name: currentUser.name || '',
        email: currentUser.email || '',
        phone: '+91 98765 43210',
        department: 'Retail Furniture Catalog & Sales'
      }));
    }
  }, [currentUser]);

  const handleSaveStaffProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Validate Password Update Provision if any password field is filled
    if (profileForm.currentPassword || profileForm.newPassword || profileForm.confirmPassword) {
      if (!profileForm.currentPassword) {
        setPasswordError('Please enter your current password to confirm account security updates.');
        return;
      }
      if (profileForm.newPassword.length < 6) {
        setPasswordError('New password must be at least 6 characters long.');
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        setPasswordError('New password and confirm password do not match.');
        return;
      }
    }

    try {
      await updateUserProfile({
        full_name: profileForm.full_name,
        current_password: profileForm.currentPassword || undefined,
        new_password: profileForm.newPassword || undefined,
      });

      const stored = localStorage.getItem('user');
      let parsed = stored ? JSON.parse(stored) : {};
      parsed = { ...parsed, full_name: profileForm.full_name, email: profileForm.email };
      localStorage.setItem('user', JSON.stringify(parsed));

      let initials = 'RS';
      if (profileForm.full_name) {
        const parts = profileForm.full_name.trim().split(' ');
        if (parts.length >= 2) {
          initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        } else if (parts[0].length >= 2) {
          initials = parts[0].substring(0, 2).toUpperCase();
        } else {
          initials = parts[0][0].toUpperCase();
        }
      }

      setCurrentUser({
        name: profileForm.full_name,
        email: profileForm.email,
        initials
      });

      setIsStaffProfileModalOpen(false);
      const noticeMsg = profileForm.newPassword
        ? `Staff profile and security password for "${profileForm.full_name}" updated successfully!`
        : `Staff profile for "${profileForm.full_name}" updated successfully!`;

      setSuccessNotice(noticeMsg);

      // Reset password fields
      setProfileForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      setTimeout(() => {
        setSuccessNotice(null);
      }, 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password credentials.');
    }
  };

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Living Room');
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const [newProdSubcategory, setNewProdSubcategory] = useState('Sofas & Couches');
  const [isCustomSubcategoryMode, setIsCustomSubcategoryMode] = useState(false);
  const [customSubcategoryInput, setCustomSubcategoryInput] = useState('');

  const getSubcategoryOptions = (cat: string) => {
    switch (cat) {
      case 'Living Room':
        return ['Sofas & Couches', 'Coffee & Accent Tables', 'Accent Chairs', 'TV Units & Consoles'];
      case 'Dining Room':
        return ['Dining Tables', 'Dining Chairs', 'Sideboards & Storage'];
      case 'Bedroom':
        return ['Beds & Headboards', 'Nightstands & Dressers', 'Wardrobes & Storage'];
      case 'Home Office':
        return ['Desks & Workstations', 'Ergonomic Seating', 'Office Storage'];
      case 'Custom Studio':
        return ['Custom Furniture Concepts', 'Specialty Pieces'];
      default:
        return ['General Furniture', 'Storage & Accents'];
    }
  };

  const [newProdMaterial, setNewProdMaterial] = useState('Solid Teak Wood');
  const [isCustomMaterialMode, setIsCustomMaterialMode] = useState(false);
  const [customMaterialInput, setCustomMaterialInput] = useState('');

  const [newProdColor, setNewProdColor] = useState('Natural Wood');
  const [isCustomColorMode, setIsCustomColorMode] = useState(false);
  const [customColorInput, setCustomColorInput] = useState('');

  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdDimensions, setNewProdDimensions] = useState('');
  const [newProdWarranty, setNewProdWarranty] = useState('5 Years Solid Wood Warranty');
  const [newProdDescription, setNewProdDescription] = useState('');

  // Supplier Management State
  const [supplierList, setSupplierList] = useState<RetailSupplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<RetailSupplier | null>(null);
  const [newSupStatus, setNewSupStatus] = useState<'Active' | 'Inactive'>('Active');
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<RetailSupplier | null>(null);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [modalProductSearchQuery, setModalProductSearchQuery] = useState('');
  // Coupon & Discount Management State
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [isAddCouponModalOpen, setIsAddCouponModalOpen] = useState(false);
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponUserEmail, setNewCouponUserEmail] = useState('');
  const [newCouponAudience, setNewCouponAudience] = useState<string>('all');
  const [newCouponCustomerLimit, setNewCouponCustomerLimit] = useState('10');
  const [newCouponAutoAllot, setNewCouponAutoAllot] = useState(true);

  const [allotmentsList, setAllotmentsList] = useState<CouponAllotment[]>([]);
  const [allotmentSearchQuery, setAllotmentSearchQuery] = useState('');
  const [allotmentCurrentPage, setAllotmentCurrentPage] = useState(1);

  const refreshCoupons = async () => {
    try {
      const res = await getCouponsApi();
      setCouponsList(res.coupons);
      setAllotmentsList(res.allotments);
    } catch (e) {
      setCouponsList([]);
      setAllotmentsList([]);
    }
  };

  useEffect(() => {
    refreshCoupons();
  }, []);

  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponDiscount) return;

    const discountVal = parseInt(newCouponDiscount, 10) || 10;
    const targetEmail = newCouponUserEmail.trim();
    const limitVal = parseInt(newCouponCustomerLimit, 10) || 10;

    try {
      await createCouponApi({
        code: newCouponCode.trim().toUpperCase(),
        coupon_type: targetEmail ? 'percentage_notification' : 'first_n_customers',
        discount_percent: discountVal,
        description: newCouponDesc.trim() || `${discountVal}% Off Discount`,
        customer_limit: limitVal,
        target_user_email: targetEmail || undefined
      });
      await refreshCoupons();
      setSuccessNotice(`Coupon "${newCouponCode.trim().toUpperCase()}" created and saved!`);
      setNewCouponCode('');
      setNewCouponDiscount('');
      setNewCouponDesc('');
      setNewCouponUserEmail('');
      setNewCouponCustomerLimit('10');
      setNewCouponAudience('all');
      setNewCouponAutoAllot(true);
      setIsAddCouponModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon.');
    }
    setTimeout(() => setSuccessNotice(null), 6000);
  };

  const handleRemoveCoupon = async (id: string, code: string) => {
    try {
      await deleteCouponApi(id);
      await refreshCoupons();
      setSuccessNotice(`Coupon "${code}" removed successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to remove coupon.');
    }
    setTimeout(() => setSuccessNotice(null), 5000);
  };



  // New Supplier Form State
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupGst, setNewSupGst] = useState('');

  const loadSuppliersFromDB = async () => {
    setIsLoadingSuppliers(true);
    try {
      const dbSuppliers = await fetchSuppliersFromDB();
      if (Array.isArray(dbSuppliers)) {
        setSupplierList(dbSuppliers);
      } else {
        setSupplierList([]);
      }
    } catch (err) {
      console.warn('Could not fetch suppliers from DB:', err);
      setSupplierList([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    loadSuppliersFromDB();
  }, []);

  const handleCreateSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim() || !newSupContact.trim() || !newSupPhone.trim()) return;

    if (editingSupplier) {
      setSupplierList((prev) =>
        prev.map((sup) =>
          sup.id === editingSupplier.id || (sup.supplier_id && sup.supplier_id === editingSupplier.supplier_id)
            ? {
                ...sup,
                supplier_name: newSupName.trim(),
                contact_person: newSupContact.trim(),
                phone: newSupPhone.trim(),
                address: newSupAddress.trim() || sup.address,
                status: newSupStatus,
              }
            : sup
        )
      );
      setSuccessNotice(`Supplier "${newSupName.trim()}" details updated successfully!`);
    } else {
      try {
        const created = await createSupplierInDB({
          supplier_name: newSupName.trim(),
          contact_person: newSupContact.trim(),
          phone: newSupPhone.trim(),
          email: newSupEmail.trim() || undefined,
          address: newSupAddress.trim() || 'Industrial Estate, India',
          gst_number: newSupGst.trim() || undefined,
        });

        setSupplierList((prev) => [{ ...created, status: newSupStatus }, ...prev]);
        setSuccessNotice(`Supplier "${created.supplier_name}" added successfully!`);
      } catch (err) {
        console.warn('Could not save supplier, fallback locally:', err);
        const fallback: RetailSupplier = {
          id: `sup-${Date.now()}`,
          supplier_name: newSupName.trim(),
          contact_person: newSupContact.trim(),
          phone: newSupPhone.trim(),
          address: newSupAddress.trim() || 'Furniture Supply Zone, India',
          assigned_products_count: 0,
          status: newSupStatus,
        };
        setSupplierList((prev) => [fallback, ...prev]);
        setSuccessNotice(`Supplier "${fallback.supplier_name}" added successfully!`);
      }
    }

    setEditingSupplier(null);
    setNewSupName('');
    setNewSupContact('');
    setNewSupPhone('');
    setNewSupEmail('');
    setNewSupAddress('');
    setNewSupGst('');
    setNewSupStatus('Active');
    setIsAddSupplierModalOpen(false);

    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };

  const handleOpenEditSupplierModal = (sup: RetailSupplier) => {
    setEditingSupplier(sup);
    setNewSupName(sup.supplier_name || '');
    setNewSupContact(sup.contact_person || '');
    setNewSupPhone(sup.phone || '');
    setNewSupAddress(sup.address || '');
    setNewSupStatus(sup.status || 'Active');
    setIsAddSupplierModalOpen(true);
  };

  const handleOpenAddSupplierModal = () => {
    setEditingSupplier(null);
    setNewSupName('');
    setNewSupContact('');
    setNewSupPhone('');
    setNewSupAddress('');
    setNewSupStatus('Active');
    setIsAddSupplierModalOpen(true);
  };

  const filteredSuppliers = supplierList.filter((s) => {
    if (!supplierSearchQuery.trim()) return true;
    const q = supplierSearchQuery.toLowerCase();

    // Match supplier name, phone, address
    const matchesBasic =
      s.supplier_name.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q));

    if (matchesBasic) return true;

    // Match assigned product name, SKU / product code, category, or material
    const isArun = s.supplier_name.toLowerCase().includes('arun');
    let prodsForSup: any[] = [];
    if (s.assigned_products && s.assigned_products.length > 0) {
      prodsForSup = s.assigned_products;
    } else {
      prodsForSup = isArun ? displayProducts.slice(0, 6) : displayProducts.slice(6);
    }

    return prodsForSup.some((p: any) => {
      const pName = (p.name || p.product_name || '').toLowerCase();
      const pSku = (p.sku || `SKU-RS-${p.product_id || p.id}` || '').toLowerCase();
      const pCategory = (p.category || '').toLowerCase();
      const pMaterial = (p.material || '').toLowerCase();
      return pName.includes(q) || pSku.includes(q) || pCategory.includes(q) || pMaterial.includes(q);
    });
  });


  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Load products live from PostgreSQL DB on mount
  const loadProductsFromDB = async () => {
    setIsLoadingProducts(true);
    try {
      const dbItems = await fetchInventoryFromDB();
      if (Array.isArray(dbItems)) {
        const mapped: RetailProduct[] = dbItems.map((p: any) => {
          const stock = typeof p.stockCount === 'number'
            ? p.stockCount
            : (typeof p.stock_quantity === 'number' ? p.stock_quantity : (parseInt(p.stock_count || p.stockCount, 10) || 0));

          let derivedStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
          if (stock <= 0) derivedStatus = 'Out of Stock';
          else if (stock < 5) derivedStatus = 'Low Stock';

          return {
            id: p.id || `inv-${p.product_id}`,
            sku: p.sku || `SKU-RS-${p.product_id || p.id}`,
            name: p.name || p.product_name || 'Untitled Product',
            category: p.category || 'Living Room',
            material: p.material || 'Standard',
            color: p.color || 'Natural Wood',
            available_colors: parseAvailableColors(p.available_colors || p.availableColors || p.color),
            price: typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0,
            stockCount: stock,
            status: derivedStatus,
            image_url: p.image_url || p.image,
          };
        });

        setProductList(mapped);
      } else {
        setProductList([]);
      }
    } catch (err) {
      console.warn('Could not fetch DB inventory for retail staff:', err);
      setProductList([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProductsFromDB();
  }, []);

  // Add Product Handler
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice) return;

    const qty = parseInt(newProdStock) || 1;
    const priceVal = parseFloat(newProdPrice) || 0;
    const imgUrl = newProdImage.trim() || undefined;

    const finalCategory = isCustomCategoryMode
      ? customCategoryInput.trim()
      : newProdCategory;
    const finalSubcategory = isCustomSubcategoryMode
      ? customSubcategoryInput.trim()
      : newProdSubcategory;
    const finalMaterial = isCustomMaterialMode
      ? customMaterialInput.trim()
      : newProdMaterial;
    const finalColor = isCustomColorMode
      ? customColorInput.trim()
      : newProdColor;

    if (!finalCategory) {
      alert('Please specify a valid product category.');
      return;
    }

    if (editingProduct) {
      setProductList((prev) =>
        prev.map((item) =>
          item.id === editingProduct.id
            ? {
                ...item,
                name: newProdName.trim(),
                category: finalCategory || item.category,
                subcategory: finalSubcategory || item.subcategory,
                material: finalMaterial || item.material,
                color: finalColor || item.color,
                price: priceVal,
                stockCount: qty,
                status: qty === 0 ? 'Out of Stock' : qty < 5 ? 'Low Stock' : 'In Stock',
                image_url: imgUrl || item.image_url,
                dimensions: newProdDimensions.trim() || item.dimensions,
                warrantyInfo: newProdWarranty.trim() || item.warrantyInfo,
                detailedDescription: newProdDescription.trim() || item.detailedDescription,
              }
            : item
        )
      );
      setSuccessNotice(`Product "${newProdName.trim()}" specifications & inventory amount updated successfully!`);
    } else {
      try {
      const created = await createProductInDB({
        name: newProdName.trim(),
        category: finalCategory,
        subcategory: finalSubcategory || 'General',
        material: finalMaterial || 'Solid Wood',
        color: finalColor || 'Natural Wood',
        price: priceVal,
        stock_count: qty,
        image_url: imgUrl,
      });

      const newItem: RetailProduct = {
        id: created.id || `prod-${Date.now()}`,
        sku: newProdSku.trim() || `SKU-RS-${created.product_id || Math.floor(100 + Math.random() * 900)}`,
        name: created.name || newProdName.trim(),
        category: created.category || finalCategory,
        material: created.material || finalMaterial,
        color: created.color || finalColor,
        price: created.price || priceVal,
        stockCount: created.stockCount || qty,
        status: created.status || 'In Stock',
        image_url: created.image_url || imgUrl,
      };

      setProductList((prev) => [newItem, ...prev]);
      setSuccessNotice(`Product "${newItem.name}" added to catalog successfully!`);
    } catch (err) {
      console.warn('Could not save product to DB, adding locally:', err);
      let statusVal: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (qty === 0) statusVal = 'Out of Stock';
      else if (qty < 5) statusVal = 'Low Stock';

      const newItem: RetailProduct = {
        id: `prod-${Date.now()}`,
        sku: newProdSku.trim() || `SKU-RS-${Math.floor(100 + Math.random() * 900)}`,
        name: newProdName.trim(),
        category: finalCategory,
        material: finalMaterial,
        color: finalColor,
        price: priceVal,
        stockCount: qty,
        status: statusVal,
        image_url: imgUrl,
      };
        setProductList((prev) => [newItem, ...prev]);
        setSuccessNotice(`Product "${newItem.name}" added to catalog successfully!`);
      }
    }

    setEditingProduct(null);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdStock('');
    setNewProdSku('');
    setNewProdImage('');
    setIsCustomCategoryMode(false);
    setCustomCategoryInput('');
    setIsCustomMaterialMode(false);
    setCustomMaterialInput('');
    setIsCustomColorMode(false);
    setCustomColorInput('');
    setIsAddProductModalOpen(false);

    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };

  const handleOpenEditProductModal = (product: RetailProduct) => {
    setEditingProduct(product);
    setNewProdName(product.name || '');
    setNewProdPrice(String(product.price || ''));
    setNewProdStock(String(product.stockCount || '0'));
    setNewProdSku(product.sku || product.productCode || '');
    setNewProdCategory(product.category || 'Living Room');
    setNewProdSubcategory(product.subcategory || 'General');
    setNewProdMaterial(product.material || 'Solid Wood');
    setNewProdColor(product.color || 'Natural Wood');
    setNewProdImage(product.image_url || '');
    setNewProdDimensions(product.dimensions || '');
    setNewProdWarranty(product.warrantyInfo || '');
    setNewProdDescription(product.detailedDescription || '');
    setIsCustomCategoryMode(false);
    setIsCustomMaterialMode(false);
    setIsCustomColorMode(false);
    setIsAddProductModalOpen(true);
  };

  const handleOpenAddProductModal = () => {
    setEditingProduct(null);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdStock('');
    setNewProdSku('');
    setNewProdImage('');
    setNewProdDimensions('');
    setNewProdWarranty('');
    setNewProdDescription('');
    setIsCustomCategoryMode(false);
    setIsCustomMaterialMode(false);
    setIsCustomColorMode(false);
    setIsAddProductModalOpen(true);
  };


  // Confirm Restock Quantity Handler
  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    const addQty = parseInt(restockAmount) || 0;
    if (addQty <= 0) return;

    const newTotal = restockProduct.stockCount + addQty;
    let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (newTotal === 0) newStatus = 'Out of Stock';
    else if (newTotal < 5) newStatus = 'Low Stock';

    setProductList((prev) =>
      prev.map((item) => (item.id === restockProduct.id ? { ...item, stockCount: newTotal, status: newStatus } : item))
    );

    // Persist to PostgreSQL DB
    const dbId = parseInt(restockProduct.id.replace('inv-', '').replace('prod-', '')) || undefined;
    if (dbId) {
      try {
        await updateStockInDB(dbId, newTotal);
      } catch (err) {
        console.warn('Could not persist restock to DB:', err);
      }
    }

    setSuccessNotice(`Successfully restocked +${addQty} units for "${restockProduct.name}"! Total stock: ${newTotal} units.`);
    setRestockProduct(null);
    setRestockAmount('10');

    setTimeout(() => {
      setSuccessNotice(null);
    }, 6000);
  };

  // Adjust Stock Count
  const handleStockCountChange = (id: string, delta: number) => {
    setProductList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(0, item.stockCount + delta);
          let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
          if (newQty === 0) newStatus = 'Out of Stock';
          else if (newQty < 5) newStatus = 'Low Stock';

          const dbId = parseInt(id.replace('inv-', '').replace('prod-', '')) || undefined;
          if (dbId) {
            updateStockInDB(dbId, newQty).catch((err) => console.warn('DB stock update error:', err));
          }

          return { ...item, stockCount: newQty, status: newStatus };
        }
        return item;
      })
    );
  };


  // Update Order Status
  const handleUpdateOrderStatus = (orderId: string, newStatus: 'Pending' | 'Processing' | 'Shipped' | 'Delivered') => {
    setOrderList((prev) =>
      prev.map((ord) => (ord.orderId === orderId ? { ...ord, orderStatus: newStatus } : ord))
    );
  };

  // Calculate map of ordered items count across all customer orders
  const orderedQtyMap: Record<string, number> = {};
  orderList.forEach((ord: any) => {
    if (ord.items && Array.isArray(ord.items)) {
      ord.items.forEach((item: any) => {
        const nameKey = (item.name || '').toLowerCase().trim();
        const idKey = (item.id || '').toLowerCase().trim();
        if (nameKey) orderedQtyMap[nameKey] = (orderedQtyMap[nameKey] || 0) + (item.quantity || 1);
        if (idKey) orderedQtyMap[idKey] = (orderedQtyMap[idKey] || 0) + (item.quantity || 1);
      });
    }
  });

  // Display products with stock automatically updated corresponding to customer orders done
  const displayProducts = productList.map((p) => {
    const nameKey = p.name.toLowerCase().trim();
    const idKey = p.id.toLowerCase().trim();
    const orderedQty = orderedQtyMap[nameKey] || orderedQtyMap[idKey] || 0;
    const currentStock = Math.max(0, p.stockCount - orderedQty);
    let currentStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (currentStock === 0) currentStatus = 'Out of Stock';
    else if (currentStock < 5) currentStatus = 'Low Stock';

    return {
      ...p,
      stockCount: currentStock,
      status: currentStatus,
    };
  });

  // Filtered Products for both Products and Inventory tabs
  const filteredProducts = displayProducts.filter((item) => {
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;

    if (priceRangeFilter === 'under30k' && item.price >= 30000) return false;
    if (priceRangeFilter === '30k-75k' && (item.price < 30000 || item.price > 75000)) return false;
    if (priceRangeFilter === '75k-150k' && (item.price < 75000 || item.price > 150000)) return false;
    if (priceRangeFilter === 'above150k' && item.price <= 150000) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalInStock = displayProducts.reduce((acc, i) => acc + i.stockCount, 0);
  const lowStockCount = displayProducts.filter((i) => i.stockCount < 5).length;
  const activeOrdersCount = orderList.length;

  return (
    <div className="relative min-h-screen text-[#2C2016] flex selection:bg-[#38A132] selection:text-white overflow-x-hidden admin-theme">
      {/* Floating Tooltip for Collapsed Sidebar */}
      {isSidebarCollapsed && hoveredSidebarTooltip && (
        <div
          style={{
            top: `${hoveredSidebarTooltip.top}px`,
            left: `${hoveredSidebarTooltip.left}px`,
            transform: 'translateY(-50%)',
          }}
          className="fixed z-[9999] pointer-events-none flex items-center transition-opacity duration-150 animate-in fade-in zoom-in-95"
        >
          {/* Caret Indicator */}
          <div className="w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-[#2C2016] -mr-[1px]" />
          {/* Tooltip Label Badge */}
          <div className="px-3 py-1.5 bg-[#2C2016]/95 backdrop-blur-md text-[#FAF5ED] text-xs font-bold rounded-xl shadow-[0_8px_30px_rgba(44,32,22,0.4)] border border-[#5A4533] whitespace-nowrap tracking-wide flex items-center gap-1.5">
            <span>{hoveredSidebarTooltip.label}</span>
          </div>
        </div>
      )}

      {/* Background Ambience Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#C6A680]/35 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] bg-[#C6A680]/40 rounded-full blur-[130px]" />
        <div className="absolute -bottom-32 left-1/3 w-[36rem] h-[36rem] bg-[#C6A680]/45 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8C6C4F15_1px,transparent_1px),linear-gradient(to_bottom,#8C6C4F15_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>

      {/* LEFT SIDEBAR NAVIGATION PANEL */}
      <aside className={`${isSidebarCollapsed ? 'w-16 p-2' : 'w-56 p-3.5'} flex-shrink-0 min-h-screen hidden md:flex flex-col border-r border-[#DFD2C0] bg-[#F1E8DC]/95 backdrop-blur-2xl space-y-4 relative z-20 shadow-[2px_0_24px_rgba(58,40,24,0.04)] transition-[width,padding] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-[width,padding] overflow-hidden`}>
        {/* Logo and Brand Title - Click to toggle Collapse/Expand */}
        <div className="pb-2.5 border-b border-[#DFD2C0]/80 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setIsSidebarCollapsed(!isSidebarCollapsed);
              setHoveredSidebarTooltip(null);
            }}
            onMouseEnter={(e) => handleSidebarItemMouseEnter(e, isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar')}
            onMouseLeave={handleSidebarItemMouseLeave}
            className="flex items-center gap-2 group cursor-pointer text-left w-full p-1 rounded-xl hover:bg-[#E5D7C5]/60 transition-colors duration-200"
            title={!isSidebarCollapsed ? "Click to collapse sidebar" : undefined}
          >
            <div className="relative flex-shrink-0">
              <img
                src="/retailsphere_logo.jpg"
                alt="RetailSphere AI Logo"
                className="w-8 h-8 rounded-full object-cover border border-[#D0BEA9] shadow-sm group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className={`transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden whitespace-nowrap min-w-0 ${
              isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none' : 'max-w-[160px] opacity-100 translate-x-0'
            }`}>
              <div className="text-sm font-black text-[#2C2016] tracking-tight flex items-center gap-1">
                <span className="truncate">RetailSphere</span>
                <span className="text-[#38A132]">AI</span>
              </div>
              <div className="text-[9px] font-bold text-[#8F745D] uppercase tracking-wider font-mono truncate">
                Retail Staff
              </div>
            </div>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-2 text-xs overflow-y-auto pr-0.5 pb-10 scrollbar-thin scrollbar-thumb-[#DFD2C0] scrollbar-track-transparent">
          {/* Category 1: Operations Control Center */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-0.5 font-mono truncate">
                  Operations
                </div>
              )}
            </div>

            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'fulfillment', label: 'Retail Orders & Fulfillment', icon: ShoppingBag },
              { id: 'returns', label: 'Returns & Cancels', icon: RefreshCw },
              { id: 'communication', label: 'Customer Messaging', icon: MessageCircle },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'fulfillment' && activeTab === 'retail_orders');
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    refreshControlCenterData();
                    setHoveredSidebarTooltip(null);
                  }}
                  onMouseEnter={(e) => handleSidebarItemMouseEnter(e, item.label)}
                  onMouseLeave={handleSidebarItemMouseLeave}
                  title={!isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-1.5' : 'justify-start px-3 py-1.5'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
                    isActive
                      ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-bold hover:bg-[#2F8829]'
                      : 'text-[#6B5542] hover:text-[#2C2016] hover:bg-[#E6DAC8]/80 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 transition-transform duration-300" />
                    <span className={`text-xs truncate transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] whitespace-nowrap overflow-hidden ${
                      isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none' : 'max-w-[160px] opacity-100 translate-x-0'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Category 2: Customer Request Inbox Types in Sidebar */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-0.5 font-mono truncate">
                  Customer Inbox
                </div>
              )}
            </div>

            {[
              { id: 'request_inbox', category: 'ALL', label: 'All Requests', icon: Inbox },
              { id: 'customizations', category: 'CUSTOMIZATION', label: 'Customizations', icon: Layers },
              { id: 'fabrication', category: 'FABRICATION', label: 'Fabrication', icon: Sparkles },
              { id: 'services', category: 'ON-SITE SERVICES', label: 'On-Site Services', icon: Wrench },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = (activeTab === item.id || activeTab === 'request_inbox') && inboxCategoryFilter === item.category;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab('request_inbox');
                    setInboxCategoryFilter(item.category);
                    refreshControlCenterData();
                    setHoveredSidebarTooltip(null);
                  }}
                  onMouseEnter={(e) => handleSidebarItemMouseEnter(e, item.label)}
                  onMouseLeave={handleSidebarItemMouseLeave}
                  title={!isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-1.5' : 'justify-start px-3 py-1.5'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
                    isActive
                      ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-bold hover:bg-[#2F8829]'
                      : 'text-[#6B5542] hover:text-[#2C2016] hover:bg-[#E6DAC8]/80 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 transition-transform duration-300" />
                    <span className={`text-xs truncate transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] whitespace-nowrap overflow-hidden ${
                      isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none' : 'max-w-[160px] opacity-100 translate-x-0'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Category 3: Catalog & Inventory Management */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-0.5 font-mono truncate">
                  Catalog & Stock
                </div>
              )}
            </div>

            {[
              { id: 'products', label: 'Products & Catalog', icon: Package },
              { id: 'inventory', label: 'Stock & Inventory', icon: SlidersHorizontal },
              { id: 'suppliers', label: 'Suppliers & Vendors', icon: Briefcase },
              { id: 'coupons', label: 'Discounts & Coupons', icon: Tag },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setHoveredSidebarTooltip(null);
                  }}
                  onMouseEnter={(e) => handleSidebarItemMouseEnter(e, item.label)}
                  onMouseLeave={handleSidebarItemMouseLeave}
                  title={!isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-1.5' : 'justify-start px-3 py-1.5'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
                    isActive
                      ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-bold hover:bg-[#2F8829]'
                      : 'text-[#6B5542] hover:text-[#2C2016] hover:bg-[#E6DAC8]/80 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 transition-transform duration-300" />
                    <span className={`text-xs truncate transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] whitespace-nowrap overflow-hidden ${
                      isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none' : 'max-w-[160px] opacity-100 translate-x-0'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Category 4: Staff & Admin */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-0.5 font-mono truncate">
                  Staff & Admin
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setActiveTab('admin_messages');
                setHoveredSidebarTooltip(null);
              }}
              onMouseEnter={(e) => handleSidebarItemMouseEnter(e, 'Admin Directives & Queries')}
              onMouseLeave={handleSidebarItemMouseLeave}
              title={!isSidebarCollapsed ? "Admin Directives & Queries" : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-1.5' : 'justify-start px-3 py-1.5'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
                activeTab === 'admin_messages' || activeTab === 'queries'
                  ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-bold hover:bg-[#2F8829]'
                  : 'text-[#6B5542] hover:text-[#2C2016] hover:bg-[#E6DAC8]/80 font-semibold'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Mail className="w-4 h-4 shrink-0 transition-transform duration-300" />
                <span className={`text-xs truncate transition-all duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] whitespace-nowrap overflow-hidden ${
                  isSidebarCollapsed ? 'max-w-0 opacity-0 -translate-x-3 pointer-events-none' : 'max-w-[160px] opacity-100 translate-x-0'
                }`}>
                  Admin Directives
                </span>
              </div>
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top Header */}
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E6E1DA] p-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-900">Retail Staff</span>
          </div>
          <select
            value={activeTab}
            onChange={(e) => {
              setActiveTab(e.target.value as any);
              refreshControlCenterData();
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D]"
          >
            <option value="dashboard">📊 Dashboard</option>
            <option value="retail_orders">🛒 Retail Orders</option>
            <option value="request_inbox">📥 Request Inbox</option>
            <option value="customizations">🛋️ Customizations</option>
            <option value="fabrication">🪵 Fabrication</option>
            <option value="services">🔧 On-Site Services</option>
            <option value="fulfillment">📦 Fulfillment</option>
            <option value="returns">🔄 Returns & Cancels</option>
            <option value="communication">💬 Customer Messaging</option>
            <option value="products">🏷️ Products & Catalog</option>
            <option value="inventory">📦 Stock & Inventory</option>
            <option value="suppliers">🏢 Suppliers</option>
            <option value="coupons">🎟️ Discounts & Coupons</option>
            <option value="admin_messages">✉️ Admin Directives</option>
            <option value="queries">❓ Staff Queries</option>
          </select>
        </div>

        <main className={`space-y-6 w-full transition-all duration-300 ${
          isSidebarCollapsed 
            ? 'p-3 sm:p-5 lg:p-6 max-w-none' 
            : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'
        }`}>
          <div className="ultra-glass-panel rounded-3xl p-4 sm:p-6 lg:p-7 space-y-6 relative border border-[#DECDB7] shadow-[0_12px_40px_rgba(58,40,24,0.04)] bg-[#FCF9F3]/95 backdrop-blur-2xl w-full">
            {/* Glossy Top Reflection Sheen */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-3xl" />

            {/* Success Notice */}
            {successNotice && (
                <div className="relative z-10 p-4 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] flex items-start gap-3 shadow-md animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-[#48A63E] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs font-extrabold leading-relaxed">
                    {successNotice}
                  </div>
                  <button
                    onClick={() => setSuccessNotice(null)}
                    className="text-[#48A63E] hover:text-[#3D9134] p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Page Top Header with Staff Profile & Sign Out in Top Right */}
              <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                    {activeTab === 'dashboard' && 'Retail Operations & Customer Request Control Center'}
                    {activeTab === 'retail_orders' && 'Ready-Made Retail Orders Management'}
                    {activeTab === 'request_inbox' && 'Customer Request Inbox (Initial Reviews)'}
                    {activeTab === 'customizations' && 'Customization Requests (Retail Review Gateway)'}
                    {activeTab === 'fabrication' && 'Fabrication Services Requests (Retail Review Gateway)'}
                    {activeTab === 'services' && 'On-Site Skilled Services Coordination'}
                    {activeTab === 'fulfillment' && 'Ready-Made Order Fulfillment & Dispatch'}
                    {activeTab === 'returns' && 'Returns & Order Cancellations Center'}
                    {activeTab === 'communication' && 'Customer Request & Order Communication'}
                    {activeTab === 'products' && 'Retail Product Management'}
                    {activeTab === 'inventory' && 'Inventory Stock Control'}
                    {activeTab === 'queries' && 'Staff Queries & Admin Request Center'}
                    {activeTab === 'suppliers' && 'Supplier Network & Vendor Management'}
                    {activeTab === 'coupons' && 'Coupons & Customer Discounts Management'}
                    {activeTab === 'admin_messages' && 'Admin Directives & Messages'}
                  </h1>
                  <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                    {activeTab === 'dashboard' && 'Central operations dashboard for retail orders, customer requests, packing, dispatch, and returns.'}
                    {activeTab === 'request_inbox' && 'Review incoming customer requests before forwarding approved requests to Production Staff.'}
                    {activeTab === 'customizations' && 'Initial customer-facing review for bespoke furniture builds.'}
                    {activeTab === 'fabrication' && 'Initial customer-facing review for timber cutting, shaping, and board fabrication.'}
                    {activeTab === 'services' && 'Coordinate on-site carpentry, upholstery, assembly, and repair visits.'}
                    {activeTab === 'fulfillment' && 'Quality packing, dispatch carrier tracking, and delivery status updates.'}
                    {activeTab === 'communication' && 'Order and request-specific communication threads with customers.'}
                  </p>
                </div>

                {/* Top Right Corner Controls: Staff Profile & Sign Out */}
                <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">

                  {/* Notification Bell Button & Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsNotificationsOpen(!isNotificationsOpen);
                        setIsUserMenuOpen(false);
                      }}
                      className="relative p-2 rounded-xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] text-[#2C241D] transition-all shadow-xs flex items-center justify-center"
                      title="System Notifications"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#48A63E]" />
                      {(unreadCount + unreadAdminMsgsCount) > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                          {unreadCount + unreadAdminMsgsCount}
                        </span>
                      )}
                    </button>

                    {/* Notifications Dropdown */}
                    {isNotificationsOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-3 z-[100] animate-fadeIn space-y-2">
                        <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                          <span className="font-extrabold text-xs text-[#2C241D]">System Notifications</span>
                          {(unreadCount + unreadAdminMsgsCount) > 0 && (
                            <button
                              onClick={async () => {
                                markAllAdminMessagesReadForUser(currentUser.email, 'Retail Staff');
                                setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                                await markAllNotificationsReadInDB();
                              }}
                              className="text-[10px] font-bold text-[#48A63E] hover:underline cursor-pointer"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                          {/* Unread Admin Directives Alerts */}
                          {adminMessages.filter(m => !isMessageReadByUser(m, currentUser.email)).map((msg) => (
                            <div
                              key={`notif-${msg.id}`}
                              onClick={() => {
                                setActiveTab('admin_messages');
                                setIsNotificationsOpen(false);
                              }}
                              className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 cursor-pointer hover:bg-amber-100/80 transition-colors space-y-1"
                            >
                              <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-900">
                                <span className="flex items-center gap-1">📩 Admin Directive Notice</span>
                                <span className="text-[9px] font-mono text-amber-700">{msg.createdDate}</span>
                              </div>
                              <p className="text-[11px] text-amber-800 font-bold truncate">{msg.subject}</p>
                              <div className="text-[10px] text-[#48A63E] font-extrabold hover:underline">
                                Click to open Admin Directives page →
                              </div>
                            </div>
                          ))}

                          {notifications.filter(n => n.unread).length === 0 && adminMessages.filter(m => !isMessageReadByUser(m, currentUser.email)).length === 0 ? (
                            <div className="p-4 text-center text-[#8C7C6D]">
                              <CheckCircle2 className="w-6 h-6 text-[#48A63E] mx-auto opacity-70 mb-1" />
                              <p className="text-xs font-extrabold text-[#2C241D]">No new notifications</p>
                              <p className="text-[10px] text-[#A09080]">You are all caught up!</p>
                            </div>
                          ) : (
                            notifications.filter(n => n.unread).map(n => (
                              <div
                                key={n.id}
                                className="p-2.5 rounded-xl border border-[#48A63E]/40 bg-[#F3EDE5] font-bold transition-all space-y-1 relative"
                              >
                                <div className="flex items-center justify-between text-[11px] mb-0.5">
                                  <span className="font-extrabold text-[#2C241D] pr-2">{n.title}</span>
                                  <span className="text-[10px] text-[#8C7C6D] flex-shrink-0">{n.time}</span>
                                </div>
                                <p className="text-[11px] text-[#5C4E42] leading-snug font-normal">{n.message}</p>
                                <div className="pt-1 flex items-center justify-end">
                                  <button
                                    onClick={async () => {
                                      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, unread: false } : item));
                                      await markNotificationReadInDB(n.notification_id || n.id);
                                    }}
                                    className="text-[10px] font-extrabold text-[#48A63E] hover:text-[#387A46] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" /> Mark as read
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>


                  {/* Staff Name Dropdown Pill (Profile & Sign Out inside) */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsNotificationsOpen(false);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs"
                      title="Click for profile and sign out options"
                    >
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                        {currentUser.initials}
                      </div>
                      <span className="text-xs font-extrabold text-[#2C241D]">
                        {currentUser.name || 'Staff Member'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                    </button>

                    {/* Dropdown Menu on Click */}
                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                        <button
                          onClick={() => {
                            setProfileForm((prev) => ({ ...prev, newPassword: '', confirmPassword: '' }));
                            setPasswordError(null);
                            setIsStaffProfileModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#EAE0D4] transition-colors text-left"
                        >
                          <User className="w-4 h-4 text-[#48A63E]" />
                          <span>View Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleSignOut();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-700 hover:bg-rose-100/80 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>


                </div>
              </div>

              {/* SECTION 1: DASHBOARD HOME */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* TODAY OPERATIONAL OVERVIEW */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-[#7A6C5E] tracking-wider mb-3">Today's Operations Summary</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                      <div className="bg-white/80 p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <div className="text-[10px] font-bold text-[#7A6C5E] uppercase">New Orders</div>
                        <div className="text-2xl font-black text-[#2C241D]">{dashboardSummary?.today.new_orders || 0}</div>
                        <div className="text-[10px] text-[#38A132] font-semibold">Ready-made purchases</div>
                      </div>

                      <div className="bg-white/80 p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <div className="text-[10px] font-bold text-[#7A6C5E] uppercase">Pending Reviews</div>
                        <div className="text-2xl font-black text-amber-700">{dashboardSummary?.today.pending_reviews || 0}</div>
                        <div className="text-[10px] text-amber-800 font-semibold">Awaiting staff review</div>
                      </div>

                      <div className="bg-white/80 p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <div className="text-[10px] font-bold text-[#7A6C5E] uppercase">To Pack</div>
                        <div className="text-2xl font-black text-indigo-700">{dashboardSummary?.today.to_pack || 0}</div>
                        <div className="text-[10px] text-indigo-800 font-semibold">Ready for 5-pt checklist</div>
                      </div>

                      <div className="bg-white/80 p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <div className="text-[10px] font-bold text-[#7A6C5E] uppercase">Ready to Dispatch</div>
                        <div className="text-2xl font-black text-blue-700">{dashboardSummary?.today.ready_to_dispatch || 0}</div>
                        <div className="text-[10px] text-blue-800 font-semibold">Packed & ready</div>
                      </div>

                      <div className="bg-white/80 p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <div className="text-[10px] font-bold text-[#7A6C5E] uppercase">Out for Delivery</div>
                        <div className="text-2xl font-black text-purple-700">{dashboardSummary?.today.out_for_delivery || 0}</div>
                        <div className="text-[10px] text-purple-800 font-semibold">In courier transit</div>
                      </div>

                      <div className="bg-white/80 p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <div className="text-[10px] font-bold text-[#7A6C5E] uppercase">Return Requests</div>
                        <div className="text-2xl font-black text-rose-700">{dashboardSummary?.today.return_requests || 0}</div>
                        <div className="text-[10px] text-rose-800 font-semibold">Under review</div>
                      </div>
                    </div>
                  </div>

                  {/* REQUEST INBOX SUMMARY BADGES */}
                  <div>
                    <h3 className="text-xs font-black uppercase text-[#7A6C5E] tracking-wider mb-3">Incoming Request Inbox Overview</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div
                        onClick={() => setActiveTab('customizations')}
                        className="bg-gradient-to-br from-[#FAF7F2] to-[#F2ECE1] p-4 rounded-2xl border-2 border-[#E2D7CB] shadow-sm hover:border-[#38A132] transition-all cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#7A6C5E]">Customization Requests</span>
                          <div className="text-2xl font-black text-[#2C241D]">{dashboardSummary?.inbox_counts.new_customizations || 0} New</div>
                          <span className="text-[11px] text-[#38A132] font-extrabold">Review & Approve →</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#38A132]/10 text-[#38A132] flex items-center justify-center font-bold text-lg">
                          🛋️
                        </div>
                      </div>

                      <div
                        onClick={() => setActiveTab('fabrication')}
                        className="bg-gradient-to-br from-[#FAF7F2] to-[#F2ECE1] p-4 rounded-2xl border-2 border-[#E2D7CB] shadow-sm hover:border-[#38A132] transition-all cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#7A6C5E]">Fabrication Requests</span>
                          <div className="text-2xl font-black text-[#2C241D]">{dashboardSummary?.inbox_counts.new_fabrication || 0} New</div>
                          <span className="text-[11px] text-[#38A132] font-extrabold">Review & Approve →</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#38A132]/10 text-[#38A132] flex items-center justify-center font-bold text-lg">
                          🪵
                        </div>
                      </div>

                      <div
                        onClick={() => setActiveTab('services')}
                        className="bg-gradient-to-br from-[#FAF7F2] to-[#F2ECE1] p-4 rounded-2xl border-2 border-[#E2D7CB] shadow-sm hover:border-[#38A132] transition-all cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#7A6C5E]">On-Site Service Bookings</span>
                          <div className="text-2xl font-black text-[#2C241D]">{dashboardSummary?.inbox_counts.new_onsite_requests || 0} New</div>
                          <span className="text-[11px] text-[#38A132] font-extrabold">Coordinate Visits →</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#38A132]/10 text-[#38A132] flex items-center justify-center font-bold text-lg">
                          🔧
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PRIORITY OPERATIONAL ACTION QUEUE & RECENT DB ACTIVITY */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Priority Queue */}
                    <div className="bg-white/80 p-5 rounded-3xl border border-[#E2D7CB] shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                        <h4 className="text-xs font-black uppercase text-[#2C241D] tracking-wider flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Priority Action Items
                        </h4>
                        <span className="text-[10px] text-[#7A6C5E] font-bold">Urgent Action Required</span>
                      </div>

                      <div className="space-y-2.5 max-h-72 overflow-y-auto">
                        {!dashboardSummary?.priority_items || dashboardSummary.priority_items.length === 0 ? (
                          <div className="py-8 text-center text-xs font-semibold text-[#7A6C5E]">No urgent priority items pending.</div>
                        ) : (
                          dashboardSummary.priority_items.map((item, idx) => (
                            <div key={idx} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] flex items-center justify-between gap-3 text-xs">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-extrabold text-[#38A132]">{item.id}</span>
                                  <span className="font-extrabold text-[#2C241D]">{item.title}</span>
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                    {item.priority}
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#6E6458] mt-0.5 font-medium">Customer: {item.customer_name}</div>
                              </div>
                              <button
                                onClick={() => {
                                  if (item.type === 'Retail Order') setActiveTab('fulfillment');
                                  else setActiveTab('request_inbox');
                                }}
                                className="px-3 py-1 bg-[#38A132] hover:bg-[#32922D] text-white text-[11px] font-extrabold rounded-xl shrink-0 cursor-pointer shadow-xs"
                              >
                                {item.action}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Recent Activity Log */}
                    <div className="bg-white/80 p-5 rounded-3xl border border-[#E2D7CB] shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                        <h4 className="text-xs font-black uppercase text-[#2C241D] tracking-wider flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#38A132]" />
                          Recent Operations Activity Log
                        </h4>
                        <span className="text-[10px] text-[#7A6C5E] font-bold">Live Activity Stream</span>
                      </div>

                      <div className="space-y-2.5 max-h-72 overflow-y-auto">
                        {!dashboardSummary?.recent_activity || dashboardSummary.recent_activity.length === 0 ? (
                          <div className="py-8 text-center text-xs font-semibold text-[#7A6C5E]">No recent activity logged.</div>
                        ) : (
                          dashboardSummary.recent_activity.map((act, idx) => (
                            <div key={idx} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-xs space-y-1">
                              <div className="flex justify-between text-[#2C241D] font-extrabold">
                                <span>{act.text}</span>
                                <span className="text-[10px] font-mono text-[#7A6C5E]">{act.time ? new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                              </div>
                              <span className="text-[10px] font-bold text-[#38A132] bg-[#38A132]/10 px-2 py-0.2 rounded inline-block">
                                {act.category}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: REQUEST INBOX (UNIFIED FOR ALL REQUESTS & MULTI-STAFF ASSIGNMENT) */}
              {(activeTab === 'request_inbox' || activeTab === 'customizations' || activeTab === 'fabrication' || activeTab === 'services') && (
                <div className="space-y-5">
                  {/* Retail Staff Workload & Smart Recommendation Panel */}
                  <div className="bg-gradient-to-r from-[#2C241D] to-[#4A3B30] p-5 rounded-3xl text-white shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                          <h3 className="text-base font-extrabold tracking-wide">Multi-Retail Staff & Workload Roster</h3>
                        </div>
                        <p className="text-xs text-amber-200/80 mt-0.5">Real-time request distribution & AI decision support recommendations</p>
                      </div>
                      
                      {/* Filter Toggle */}
                      <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/20">
                        {[
                          { id: 'ALL', label: 'All Global Requests' },
                          { id: 'MY_WORK', label: 'My Assigned Work' },
                          { id: 'UNASSIGNED', label: 'Unassigned Queue' }
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            onClick={() => setAssignedStaffFilter(btn.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              assignedStaffFilter === btn.id
                                ? 'bg-amber-500 text-stone-900 font-extrabold shadow-sm'
                                : 'text-stone-300 hover:text-white'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Staff Workload Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {retailWorkloadList.map((st) => (
                        <div
                          key={st.staff_id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            st.is_recommended
                              ? 'bg-amber-500/20 border-amber-400/60 shadow-lg'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                              {st.full_name}
                            </span>
                            {st.is_recommended && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-400 text-stone-950 rounded-full">
                                AI Recommended
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-300 flex items-center justify-between mt-2 flex-wrap gap-1">
                            <span>Active Requests:</span>
                            <span className="font-mono font-extrabold text-amber-300 text-xs">
                              {st.active_request_count} total ({st.assigned_customizations || 0} Cust • {st.assigned_fabrications || 0} Fab • {st.assigned_services || 0} Srv)
                            </span>
                          </div>
                          {st.is_recommended && (
                            <div className="text-[9px] text-amber-200 mt-1 italic leading-tight">
                              ✨ {st.recommendation_reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Category & Review Status Filter Bar */}
                  <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-3">
                    {/* Request Category Selector */}
                    <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[#EFE7DE]">
                      <span className="text-xs font-black text-[#7A6C5E] uppercase tracking-wider min-w-36 shrink-0">Request Category:</span>
                      {[
                        { id: 'ALL', label: '🌐 All Customer Requests' },
                        { id: 'CUSTOMIZATION', label: '🎨 Customizations' },
                        { id: 'FABRICATION', label: '🛠️ Fabrication Services' },
                        { id: 'ON-SITE SERVICES', label: '🔧 On-Site Services' }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setInboxCategoryFilter(cat.id);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            inboxCategoryFilter === cat.id
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-[#FAF7F2] text-[#6E6458] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Review Status Filter */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-[#7A6C5E] uppercase tracking-wider min-w-36 shrink-0">Filter Review Status:</span>
                      {[
                        { id: 'ALL', label: 'All Statuses' },
                        { id: 'NEW', label: '🟡 New' },
                        { id: 'UNDER_REVIEW', label: '🔵 Under Review' },
                        { id: 'MORE_INFORMATION', label: '🟣 Info Requested' },
                        { id: 'APPROVED', label: '🟢 Approved' },
                        { id: 'REJECTED', label: '🔴 Rejected' }
                      ].map((st) => (
                        <button
                          key={st.id}
                          onClick={() => setInboxStatusFilter(st.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            inboxStatusFilter === st.id
                              ? 'bg-[#38A132] text-white shadow-sm'
                              : 'bg-[#FAF7F2] text-[#6E6458] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Unified Requests Table */}
                  <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#E2D7CB] shadow-xl overflow-x-auto">
                    <table className="w-full text-left text-xs table-auto">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-3">Request ID & Type</th>
                          <th className="py-3 px-3">Customer</th>
                          <th className="py-3 px-3">Title & Requirements</th>
                          <th className="py-3 px-3">View Spec</th>
                          <th className="py-3 px-3">Submitted Date</th>
                          <th className="py-3 px-3">Priority</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {requestInboxItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-xs font-semibold text-[#7A6C5E]">
                              No requests match the selected category & status filters.
                            </td>
                          </tr>
                        ) : (
                          requestInboxItems.map((item) => (
                            <tr key={item.request_id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                              <td className="py-3.5 px-3 font-mono font-extrabold text-[#38A132] whitespace-nowrap">
                                <div>{item.request_id}</div>
                                <span className="text-[10px] text-[#7A6C5E] font-extrabold bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E2D7CB] inline-block mt-0.5">
                                  {item.type}
                                </span>
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="font-extrabold text-[#2C241D] leading-tight">{item.customer_name}</div>
                                <div className="text-[10px] text-[#7A6C5E] truncate max-w-[150px]">{item.customer_email}</div>
                              </td>
                              <td className="py-3.5 px-3 max-w-[200px]">
                                <div className="font-bold text-[#2C241D] leading-tight truncate">{item.title}</div>
                                {item.dimensions && <div className="text-[10px] text-[#6E6458] truncate mt-0.5">Specs: {item.dimensions}</div>}
                                {item.description && <div className="text-[10px] text-[#6E6458] truncate italic mt-0.5">&ldquo;{item.description}&rdquo;</div>}
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedReviewItem(item)}
                                  className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#38A132] hover:text-[#2C241D] text-[11px] font-extrabold rounded-xl border border-[#E2D7CB] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                                  title="View Detailed Specifications & Drawings"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#38A132]" />
                                  <span>View Spec</span>
                                </button>
                              </td>
                              <td className="py-3.5 px-3 text-[#7A6C5E] whitespace-nowrap text-[11px]">
                                {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D]">
                                  {item.priority}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                {item.review_status === 'APPROVED' ? (
                                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black rounded-xl inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Approved</span>
                                  </span>
                                ) : item.review_status === 'REJECTED' ? (
                                  <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-black rounded-xl inline-flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>Rejected</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setSelectedReviewItem(item)}
                                    className="px-2.5 py-1 bg-[#38A132] hover:bg-[#32922D] text-white text-[11px] font-extrabold rounded-xl shadow-xs cursor-pointer"
                                  >
                                    Review Request
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 3 & 7: READYMADE RETAIL ORDERS & FULFILLMENT CENTER */}
              {(activeTab === 'fulfillment' || activeTab === 'retail_orders') && (
                <div className="space-y-6">

                  {/* Fulfillment Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs">
                      <div className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider">Total Readymade Orders</div>
                      <div className="text-2xl font-black text-[#2C241D] mt-1">{orderList.length}</div>
                      <div className="text-[10px] text-[#38A132] font-bold mt-0.5">Live Store Orders</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs">
                      <div className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider">Ready to Pack</div>
                      <div className="text-2xl font-black text-amber-700 mt-1">
                        {orderList.filter(o => ['order placed', 'paid', 'pending', 'processing', 'paid & placed', ''].includes((o.orderStatus || '').toLowerCase())).length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-0.5">Pending Packing</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs">
                      <div className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider">In-Transit / Dispatched</div>
                      <div className="text-2xl font-black text-blue-700 mt-1">
                        {orderList.filter(o => ['dispatched', 'out for delivery', 'in-transit', 'shipped'].includes((o.orderStatus || '').toLowerCase())).length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-0.5">On the Way</div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs">
                      <div className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider">Completed / Delivered</div>
                      <div className="text-2xl font-black text-emerald-700 mt-1">
                        {orderList.filter(o => ['delivered', 'completed'].includes((o.orderStatus || '').toLowerCase())).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-0.5">Delivered Successfully</div>
                    </div>
                  </div>

                  {/* Fulfillment Category Tabs: Readymade vs Fabrication Logistics */}
                  <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-3">
                    <button
                      onClick={() => setFulfillmentTypeTab('readymade')}
                      className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        fulfillmentTypeTab === 'readymade'
                          ? 'bg-[#38A132] text-white shadow-md'
                          : 'bg-white text-[#6E6458] border border-[#E2D7CB] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Ready-Made Orders ({orderList.length})</span>
                    </button>
                    <button
                      onClick={() => setFulfillmentTypeTab('fabrication')}
                      className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                        fulfillmentTypeTab === 'fabrication'
                          ? 'bg-[#38A132] text-white shadow-md'
                          : 'bg-white text-[#6E6458] border border-[#E2D7CB] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span>Fabrication Logistics ({fabricationJobsList.length})</span>
                    </button>
                  </div>

                  {fulfillmentTypeTab === 'readymade' ? (
                    <>
                      {/* Filter Pills & Search Input */}
                      <div className="bg-white p-4 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                          {/* Status Filter Pills */}
                          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
                            <span className="text-xs font-black text-[#7A6C5E] uppercase tracking-wider shrink-0">Filter:</span>
                            {[
                              { id: 'all', label: 'All Orders' },
                              { id: 'new_orders', label: '🆕 New Orders' },
                              { id: 'to_pack', label: '📦 Ready to Pack' },
                              { id: 'dispatched', label: '🏷️ Dispatched' },
                              { id: 'out_for_delivery', label: '🚚 Out for Delivery' },
                              { id: 'delivered', label: '🟢 Delivered' },
                            ].map((st) => (
                              <button
                                key={st.id}
                                onClick={() => setOrdersSubTab(st.id as any)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                                  ordersSubTab === st.id
                                    ? 'bg-[#38A132] text-white shadow-xs'
                                    : 'bg-[#FAF7F2] text-[#6E6458] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                                }`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>

                          {/* Search Bar */}
                          <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search order ID or customer..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-bold bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] placeholder:text-[#A09080] focus:outline-none focus:border-[#38A132]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Orders Table */}
                      <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[#FAF7F2] border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] tracking-wider">
                                <th className="py-3.5 px-4">Order ID & Date</th>
                                <th className="py-3.5 px-4">Customer</th>
                                <th className="py-3.5 px-4">Items</th>
                                <th className="py-3.5 px-4">Total Amount</th>
                                <th className="py-3.5 px-4">View Spec</th>
                                <th className="py-3.5 px-4 text-center">Pack</th>
                                <th className="py-3.5 px-4 text-right">Dispatch</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] text-xs">
                              {(() => {
                                const filteredOrders = orderList.filter((ord) => {
                                  const st = (ord.orderStatus || 'Order Placed').toLowerCase();
                                  if (ordersSubTab === 'new_orders' && !['order placed', 'paid', 'pending', 'processing', 'paid & placed'].includes(st)) return false;
                                  if (ordersSubTab === 'to_pack' && !['order placed', 'paid', 'pending', 'processing', 'packing', 'paid & placed'].includes(st)) return false;
                                  if (ordersSubTab === 'dispatched' && !['dispatched', 'shipped', 'in-transit', 'out for delivery', 'out_for_delivery'].includes(st)) return false;
                                  if (ordersSubTab === 'out_for_delivery' && !['out for delivery', 'out_for_delivery'].includes(st)) return false;
                                  if (ordersSubTab === 'delivered' && !['delivered', 'completed'].includes(st)) return false;

                                  if (searchQuery.trim()) {
                                    const q = searchQuery.toLowerCase();
                                    const matchId = String(ord.orderId || '').toLowerCase().includes(q);
                                    const matchName = String(ord.customerName || ord.user_name || '').toLowerCase().includes(q);
                                    const matchEmail = String(ord.customerEmail || '').toLowerCase().includes(q);
                                    const matchItem = ord.items?.some(i => i.name.toLowerCase().includes(q));
                                    if (!matchId && !matchName && !matchEmail && !matchItem) return false;
                                  }
                                  return true;
                                });

                                if (filteredOrders.length === 0) {
                                  return (
                                    <tr>
                                      <td colSpan={7} className="py-12 text-center text-xs font-semibold text-[#7A6C5E]">
                                        No readymade store orders found matching criteria.
                                      </td>
                                    </tr>
                                  );
                                }

                                return filteredOrders.map((ord) => {
                                  const totalAmt = ord.totalPrice || ord.totalAmount || ord.amount || 0;
                                  const itemsCount = ord.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;

                                  return (
                                    <tr key={ord.orderId} className="hover:bg-[#FAF7F2]/60 transition-colors">
                                      {/* Order ID & Date */}
                                      <td className="py-4 px-4 whitespace-nowrap">
                                        <span className="font-mono font-black text-xs text-[#38A132]">#{ord.orderId}</span>
                                        <div className="text-[10px] text-[#7A6C5E] font-medium mt-0.5">
                                          {formatPaymentTime(ord)}
                                        </div>
                                      </td>

                                      {/* Customer */}
                                      <td className="py-4 px-4">
                                        <div className="font-extrabold text-[#2C241D] text-xs">{ord.customerName || ord.user_name || 'Customer'}</div>
                                        <div className="text-[10px] text-[#7A6C5E] truncate max-w-44">{ord.customerEmail || 'N/A'}</div>
                                      </td>

                                      {/* Items */}
                                      <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                          {ord.items && ord.items.length > 0 && (
                                            <img
                                              src={ord.items[0].imageUrl || ord.items[0].image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&auto=format&fit=crop&q=60'}
                                              alt={ord.items[0].name}
                                              className="w-8 h-8 rounded-lg object-cover border border-[#E2D7CB] shrink-0"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&auto=format&fit=crop&q=60';
                                              }}
                                            />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="font-extrabold text-[#2C241D] text-xs truncate max-w-44">
                                              {ord.items?.[0]?.name || 'Readymade Furniture Item'}
                                            </div>
                                            <div className="text-[10px] text-[#7A6C5E] font-semibold">
                                              {ord.items && ord.items.length > 1 ? `+${ord.items.length - 1} more items (${itemsCount} total)` : `Qty: ${ord.items?.[0]?.quantity || 1}`}
                                            </div>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Total Amount */}
                                      <td className="py-4 px-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-extrabold text-[#2C241D] text-xs">₹{Number(totalAmt).toLocaleString('en-IN')}</span>
                                          <span className={`px-1.5 py-0.5 rounded-full inline-flex items-center justify-center ${
                                            ord.paymentStatus === 'Paid' || !ord.paymentStatus ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                                          }`} title={ord.paymentStatus || 'Paid'}>
                                            {ord.paymentStatus === 'Paid' || !ord.paymentStatus ? (
                                              <Check className="w-3 h-3 text-emerald-800 stroke-[3]" />
                                            ) : (
                                              <span className="text-[10px] font-black">{ord.paymentStatus}</span>
                                            )}
                                          </span>
                                        </div>
                                      </td>

                                      {/* View Spec */}
                                      <td className="py-4 px-4 whitespace-nowrap">
                                        <button
                                          onClick={() => setSelectedOrderSpecModal(ord)}
                                          className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#38A132] hover:text-[#2C241D] text-[11px] font-extrabold rounded-xl border border-[#E2D7CB] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                                          title="View Readymade Order Specs & Items Breakdown"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-[#38A132]" />
                                          <span>View Spec</span>
                                        </button>
                                      </td>

                                      {/* Pack Column */}
                                      <td className="py-4 px-4 text-center whitespace-nowrap">
                                        {(() => {
                                          const currentSt = (ord.orderStatus || 'Order Placed').trim();
                                          const isOrderPlacedOrPending = ['Order Placed', 'ORDER_PLACED', 'Pending', 'Ready to Pack', 'READY_TO_PACK', ''].includes(currentSt);
                                          const isPacked = ['Packed', 'PACKED', 'PACKED_PENDING_DISPATCH'].includes(currentSt);
                                          const isDispatched = ['Dispatched', 'DISPATCHED'].includes(currentSt);
                                          const isOutForDelivery = ['Out for Delivery', 'OUT_FOR_DELIVERY'].includes(currentSt);
                                          const isDelivered = ['Delivered', 'DELIVERED', 'Completed'].includes(currentSt);

                                          const canPack = isOrderPlacedOrPending && !isPacked && !isDispatched && !isOutForDelivery && !isDelivered;

                                          return (
                                            <button
                                              disabled={!canPack}
                                              onClick={() => setPackingModalOrder(ord)}
                                              className={`px-3 py-1.5 border text-xs font-bold rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5 ${
                                                canPack
                                                  ? 'bg-[#FAF7F2] hover:bg-[#F2ECE1] border-[#E2D7CB] text-[#2C241D] cursor-pointer'
                                                  : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed opacity-50'
                                              }`}
                                              title={canPack ? "5-Point Quality Packing Checklist" : "Packing completed or not applicable"}
                                            >
                                              <CheckCircle2 className={`w-3.5 h-3.5 ${canPack ? 'text-[#38A132]' : 'text-stone-400'}`} />
                                              <span>Pack</span>
                                            </button>
                                          );
                                        })()}
                                      </td>

                                      {/* Dispatch Column */}
                                      <td className="py-4 px-4 text-right whitespace-nowrap">
                                        {(() => {
                                          const currentSt = (ord.orderStatus || 'Order Placed').trim();
                                          const isPacked = ['Packed', 'PACKED', 'PACKED_PENDING_DISPATCH'].includes(currentSt);
                                          const isDispatched = ['Dispatched', 'DISPATCHED'].includes(currentSt);
                                          const isOutForDelivery = ['Out for Delivery', 'OUT_FOR_DELIVERY'].includes(currentSt);
                                          const isDelivered = ['Delivered', 'DELIVERED', 'Completed', 'COMPLETED'].includes(currentSt);

                                          const canDispatch = isPacked || isDispatched || isOutForDelivery;
                                          let dispatchBtnText = "Dispatch";
                                          if (isDispatched) dispatchBtnText = "Update Delivery";
                                          if (isOutForDelivery) dispatchBtnText = "Mark Delivered";
                                          if (isDelivered) dispatchBtnText = "Completed";

                                          return (
                                            <button
                                              disabled={!canDispatch || isDelivered}
                                              onClick={() => {
                                                if (isOutForDelivery || isDispatched) {
                                                  setDeliveryStatusModalOrder(ord);
                                                  setDeliveryStatusVal(isOutForDelivery ? 'Delivered' : 'Out for Delivery');
                                                } else if (!isDelivered) {
                                                  handleOpenDispatchModal(ord);
                                                }
                                              }}
                                              className={`px-3 py-1.5 border text-xs font-bold rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5 ${
                                                isDelivered
                                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default font-extrabold'
                                                  : canDispatch
                                                    ? 'bg-[#FAF7F2] hover:bg-[#F2ECE1] border-[#E2D7CB] text-[#2C241D] cursor-pointer'
                                                    : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed opacity-50'
                                              }`}
                                              title={isDelivered ? "Delivery Completed" : (canDispatch ? dispatchBtnText : "Order must be Packed before Dispatch")}
                                            >
                                              {isDelivered ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                              ) : (
                                                <Truck className={`w-3.5 h-3.5 ${canDispatch ? 'text-blue-600' : 'text-stone-400'}`} />
                                              )}
                                              <span>{dispatchBtnText}</span>
                                            </button>
                                          );
                                        })()}
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* FABRICATION LOGISTICS TABLE */
                    <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-md overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#FAF7F2] border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] tracking-wider">
                              <th className="py-3.5 px-4">Job ID & Task Type</th>
                              <th className="py-3.5 px-4">Service & Customer</th>
                              <th className="py-3.5 px-4">Route / Location</th>
                              <th className="py-3.5 px-4">Distance & Charge</th>
                              <th className="py-3.5 px-4">Transportation Provider</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-4 text-right">Dispatch Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFE7DE] text-xs">
                            {fabricationJobsList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-xs font-semibold text-[#7A6C5E]">
                                  No paid fabrication transportation jobs requiring fulfillment at this time.
                                </td>
                              </tr>
                            ) : (
                              fabricationJobsList.map((job) => {
                                const isPickup = job.job_type === 'FABRICATION_PICKUP';
                                const isDispatched = ['Dispatched', 'DISPATCHED', 'In Transit', 'IN_TRANSIT'].includes(job.fulfillment_status);
                                const isDelivered = ['Delivered', 'DELIVERED', 'Completed', 'COMPLETED'].includes(job.fulfillment_status);

                                return (
                                  <tr key={job.fulfillment_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                                    <td className="py-4 px-4 whitespace-nowrap">
                                      <div className="font-mono font-black text-xs text-[#38A132]">FAB-#{job.fabrication_id}</div>
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold mt-1 border ${
                                        isPickup ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                                      }`}>
                                        {isPickup ? '📦 Material Pickup' : '🚚 Return Delivery'}
                                      </span>
                                      {job.tracking_number && (
                                        <div className="text-[10px] font-mono text-[#7A6C5E] mt-0.5">{job.tracking_number}</div>
                                      )}
                                    </td>

                                    <td className="py-4 px-4">
                                      <div className="font-extrabold text-[#2C241D] text-xs">{job.service_type}</div>
                                      <div className="text-[11px] text-[#7A6C5E] font-medium">{job.customer_name}</div>
                                      {job.customer_phone && <div className="text-[10px] text-[#38A132] font-mono">{job.customer_phone}</div>}
                                    </td>

                                    <td className="py-4 px-4 max-w-xs">
                                      <div className="text-[11px] font-semibold text-[#2C241D] truncate" title={isPickup ? `From: ${job.pickup_address}` : `To: ${job.destination_address}`}>
                                        <span className="font-bold text-[#7A6C5E] text-[10px] block">{isPickup ? 'Pickup From:' : 'Deliver To:'}</span>
                                        {isPickup ? job.pickup_address : job.destination_address}
                                      </div>
                                    </td>

                                    <td className="py-4 px-4 whitespace-nowrap">
                                      <div className="font-extrabold text-[#2C241D] text-xs">₹{job.transportation_charge}</div>
                                      <div className="text-[10px] text-[#7A6C5E] font-medium">{job.distance_km} km (Rate Card)</div>
                                    </td>

                                    <td className="py-4 px-4 whitespace-nowrap">
                                      {job.carrier_name ? (
                                        <div>
                                          <span className="font-extrabold text-[#38A132] text-xs block">{job.carrier_name}</span>
                                          {job.driver_name && <span className="text-[10px] text-[#7A6C5E]">Driver: {job.driver_name}</span>}
                                        </div>
                                      ) : (
                                        <span className="text-[#9E9082] italic text-[11px]">Unassigned</span>
                                      )}
                                    </td>

                                    <td className="py-4 px-4 whitespace-nowrap">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                        isDelivered
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : isDispatched
                                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                                            : 'bg-amber-100 text-amber-800 border-amber-300'
                                      }`}>
                                        {isDelivered ? 'Delivered ✓' : isDispatched ? 'Dispatched' : 'Pending Dispatch'}
                                      </span>
                                    </td>

                                    <td className="py-4 px-4 text-right whitespace-nowrap">
                                      {isDelivered ? (
                                        <span className="text-emerald-700 font-extrabold text-xs">Completed ✓</span>
                                      ) : isDispatched ? (
                                        <span className="text-blue-700 font-extrabold text-xs">In Transit</span>
                                      ) : (
                                        <button
                                          onClick={() => handleOpenDispatchModalForFabrication(job)}
                                          className="px-3 py-1.5 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                                        >
                                          <Truck className="w-3.5 h-3.5" />
                                          <span>Dispatch</span>
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 8: RETURNS & CANCELLATIONS */}
              {activeTab === 'returns' && (
                <div className="space-y-5">

                  {/* Return Requests Content */}
                  {returnRequestsList.length === 0 ? (
                    /* Empty State Card when no return requests exist */
                    <div className="bg-white p-12 rounded-3xl border border-[#E2D7CB] shadow-md text-center space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-amber-700 shadow-xs">
                        <RotateCcw className="w-8 h-8 text-[#38A132]" />
                      </div>
                      <div className="max-w-md mx-auto space-y-1">
                        <h4 className="text-base font-black text-[#2C241D]">No Active Return Requests or Cancellations</h4>
                        <p className="text-xs text-[#7A6C5E] font-medium leading-relaxed">
                          There are currently no pending customer return requests or eligible order cancellations in the system requiring staff review.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-extrabold text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>All returns & cancellation queues are up to date!</span>
                      </div>
                    </div>
                  ) : (
                    /* Table when return requests exist */
                    <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-md overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#FAF7F2] border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] tracking-wider">
                              <th className="py-3.5 px-4">Return ID & Order</th>
                              <th className="py-3.5 px-4">Customer</th>
                              <th className="py-3.5 px-4">Reason & Description</th>
                              <th className="py-3.5 px-4">Status</th>
                              <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFE7DE] text-xs">
                            {returnRequestsList.map((ret: any) => (
                              <tr key={ret.return_id || ret.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                                <td className="py-4 px-4 whitespace-nowrap">
                                  <span className="font-mono font-black text-xs text-[#38A132]">#RET-{ret.return_id || ret.id}</span>
                                  <div className="text-[10px] text-[#7A6C5E] font-medium mt-0.5">
                                    Order #{ret.order_id || ret.orderId}
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="font-extrabold text-[#2C241D] text-xs">{ret.customer_name || 'Customer'}</div>
                                  <div className="text-[10px] text-[#7A6C5E]">{ret.customer_email || 'N/A'}</div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="font-extrabold text-[#2C241D] text-xs">{ret.reason || 'Return Requested'}</div>
                                  <div className="text-[10px] text-[#7A6C5E] truncate max-w-64">{ret.description || 'No additional details.'}</div>
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                    {ret.status || 'PENDING'}
                                  </span>
                                </td>

                                <td className="py-4 px-4 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => {
                                      setSuccessNotice(`Action logged for Return #RET-${ret.return_id || ret.id}`);
                                      setTimeout(() => setSuccessNotice(null), 4000);
                                    }}
                                    className="px-3 py-1.5 bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
                                  >
                                    Review & Process
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 9: CUSTOMER COMMUNICATION */}
              {activeTab === 'communication' && (
                <div className="bg-white p-6 rounded-3xl border border-[#E2D7CB] shadow-xl space-y-4">
                  <div className="p-12 text-center text-xs font-semibold text-[#7A6C5E] bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB]">
                    Select any order or request from the Request Inbox to open its direct message thread.
                  </div>
                </div>
              )}

              {/* SECTION 10: ADMIN MESSAGES & STAFF QUERIES */}
              {(activeTab === 'admin_messages' || activeTab === 'queries') && (
                <div className="space-y-5">
                  {/* Sub-tab Navigation Pill Controls */}
                  <div className="flex items-center gap-2 bg-[#FAF7F2] p-1.5 rounded-2xl border border-[#E2D7CB]">
                    <button
                      onClick={() => setAdminSubTab('directives')}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        adminSubTab === 'directives'
                          ? 'bg-[#38A132] text-white shadow-sm'
                          : 'text-[#5C4E42] hover:bg-[#EAE0D4]/60'
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      <span>Admin Directives & Notices</span>
                      {unreadAdminMsgsCount > 0 && (
                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                          adminSubTab === 'directives' ? 'bg-white/30 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {unreadAdminMsgsCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setAdminSubTab('queries')}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        adminSubTab === 'queries'
                          ? 'bg-[#38A132] text-white shadow-sm'
                          : 'text-[#5C4E42] hover:bg-[#EAE0D4]/60'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Staff Queries & Assistance</span>
                      {staffQueries.length > 0 && (
                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                          adminSubTab === 'queries' ? 'bg-white/30 text-white' : 'bg-[#EAE0D4] text-[#2C241D]'
                        }`}>
                          {staffQueries.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* SUB-TAB 1: ADMIN DIRECTIVES */}
                  {adminSubTab === 'directives' && (
                    <div className="space-y-5 animate-fadeIn">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                            <span>Total Directives</span>
                            <Mail className="w-4 h-4 text-[#48A63E]" />
                          </div>
                          <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{adminMessages.length}</div>
                          <div className="text-[10px] text-[#48A63E] font-bold mt-1">Messages from System Admin</div>
                        </div>

                        <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                            <span>Unread Directives</span>
                            <Bell className="w-4 h-4 text-amber-600 animate-pulse" />
                          </div>
                          <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{unreadAdminMsgsCount}</div>
                          <div className="text-[10px] text-amber-700 font-bold mt-1">Pending Review</div>
                        </div>

                        <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                            <span>Read & Acknowledged</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                            {adminMessages.length - unreadAdminMsgsCount}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold mt-1">Acknowledged</div>
                        </div>
                      </div>

                      {/* Main Messages Container */}
                      <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                          <div>
                            <h2 className="text-xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-2">
                              <Mail className="w-5 h-5 text-[#48A63E]" />
                              Messages & Directives from System Admin
                            </h2>
                            <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                              Official executive announcements, store operational directives, and direct messages.
                            </p>
                          </div>

                          {unreadAdminMsgsCount > 0 && (
                            <button
                              onClick={() => markAllAdminMessagesReadForUser(currentUser.email, 'Retail Staff')}
                              className="px-4 py-2 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                            >
                              <Check className="w-4 h-4" />
                              <span>Mark All as Read</span>
                            </button>
                          )}
                        </div>

                        {/* Messages List */}
                        <div className="space-y-4">
                          {adminMessages.length === 0 ? (
                            <div className="p-10 text-center text-[#7A6C5E] space-y-2">
                              <Mail className="w-8 h-8 text-[#A09080] mx-auto opacity-50" />
                              <p className="text-sm font-extrabold text-[#2C241D]">No Admin Messages Received</p>
                              <p className="text-xs text-[#7A6C5E]">Official announcements dispatched by System Admin will appear on this page.</p>
                            </div>
                          ) : (
                            adminMessages.map((msg) => {
                              const isRead = isMessageReadByUser(msg, currentUser.email);
                              return (
                                <div
                                  key={msg.id}
                                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                                    isRead
                                      ? 'bg-[#FAF7F2]/80 border-[#E2D7CB] text-[#5C4E42]'
                                      : 'bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 border-2 border-amber-300 shadow-md'
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-base text-[#2C241D]">{msg.subject}</span>
                                      {isRead ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          Read ✓
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs animate-pulse">
                                          <Bell className="w-3 h-3" />
                                          Unread (New Directive)
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono text-xs text-[#7A6C5E] font-bold">{msg.createdDate}</span>
                                  </div>

                                  <p className="text-xs sm:text-sm text-[#2C241D] font-medium leading-relaxed whitespace-pre-line">
                                    {msg.message}
                                  </p>

                                  <div className="flex items-center justify-between pt-2 border-t border-[#EFE7DE]">
                                    <span className="text-[11px] font-bold text-[#7A6C5E]">
                                      Sender: <strong className="text-[#2C241D]">{msg.sender}</strong> ({msg.recipientType})
                                    </span>

                                    {!isRead && (
                                      <button
                                        onClick={() => markAdminMessageRead(msg.id, currentUser.email)}
                                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Mark as Read</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: STAFF QUERIES & ASSISTANCE */}
                  {adminSubTab === 'queries' && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Form Card to Submit New Query */}
                      <div className="bg-white p-6 rounded-3xl border border-[#E2D7CB] shadow-md space-y-4">
                        <div className="border-b border-[#EFE7DE] pb-3">
                          <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-[#38A132]" />
                            Submit Query / Request to System Admin
                          </h3>
                          <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
                            Submit account requests, email change requests, access issues, or operational questions to the Admin team.
                          </p>
                        </div>

                        <form onSubmit={handleSubmitQuery} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-[#7A6C5E] mb-1">Query Category</label>
                              <select
                                value={newQueryCategory}
                                onChange={(e) => setNewQueryCategory(e.target.value as any)}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                              >
                                <option value="Email Change Request">Email Change Request</option>
                                <option value="Role & Access Permission">Role & Access Permission</option>
                                <option value="General Query">General Operational Query</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[#7A6C5E] mb-1">Subject</label>
                              <input
                                type="text"
                                placeholder="e.g., Requesting email update to work address"
                                value={newQuerySubject}
                                onChange={(e) => setNewQuerySubject(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-[#7A6C5E] mb-1">Detailed Message</label>
                            <textarea
                              rows={3}
                              placeholder="Explain your query or request details for the System Admin..."
                              value={newQueryMessage}
                              onChange={(e) => setNewQueryMessage(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] font-semibold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            className="px-5 py-2.5 bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer flex items-center gap-2"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit Request to Admin</span>
                          </button>
                        </form>
                      </div>

                      {/* History of Submitted Staff Queries */}
                      <div className="bg-white p-6 rounded-3xl border border-[#E2D7CB] shadow-md space-y-4">
                        <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                          <h4 className="text-sm font-black text-[#2C241D]">Submitted Staff Queries History</h4>
                          <span className="text-xs font-bold text-[#7A6C5E]">{staffQueries.length} Total Submitted</span>
                        </div>

                        {staffQueries.length === 0 ? (
                          <div className="py-8 text-center text-xs font-semibold text-[#7A6C5E]">
                            No staff queries submitted yet. Use the form above to send a request to Admin.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {staffQueries.map((q, idx) => (
                              <div key={q.id || idx} className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-[#2C241D] text-xs">{q.subject}</span>
                                    <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                      {q.category}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-[#7A6C5E] font-bold">{q.createdAt || 'Recent'}</span>
                                </div>

                                <p className="text-[#5C4E42] font-medium leading-relaxed">{q.message}</p>

                                <div className="flex items-center justify-between pt-2 border-t border-[#EFE7DE] text-[10px]">
                                  <span className="text-[#7A6C5E]">
                                    Submitted by: <strong>{q.staffName || 'Staff Member'}</strong>
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full font-extrabold uppercase ${
                                    q.status === 'Approved'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}>
                                    {q.status || 'PENDING ADMIN REVIEW'}
                                  </span>
                                </div>

                                {q.adminResponse && (
                                  <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                                    <div className="font-black text-emerald-900 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      Admin Official Response:
                                    </div>
                                    <p className="text-emerald-800 font-semibold">{q.adminResponse}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* TAB 1: PRODUCT MANAGEMENT */}
              {activeTab === 'products' && (
                <div className="space-y-5">
                  {/* TOP KPI SUMMARY COUNT BOXES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
                    {/* Box 1: Total Catalog Products */}
                    {/* Box 1: Total Products */}
                    <div 
                      onClick={() => setActiveTab('products')}
                      className="cursor-pointer ultra-glass-card bg-white/60 backdrop-blur-xl rounded-3xl p-5 border border-white/80 shadow-lg flex items-center justify-between transition-all hover:scale-[1.02] hover:border-[#48A63E] hover:bg-white/75 hover:shadow-xl group"
                      title="Click to view & manage catalog products"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6C5E] flex items-center gap-1.5 group-hover:text-[#48A63E] transition-colors">
                          <Package className="w-3.5 h-3.5 text-[#48A63E]" />
                          Total Products
                        </span>
                        <div className="text-3xl font-extrabold text-[#2C241D] tracking-tight">
                          {productList.length}
                        </div>
                        <p className="text-[11px] font-semibold text-[#8C7C6D] flex items-center gap-1">
                          Store furniture items
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-[#48A63E]" />
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/30 text-[#48A63E] flex items-center justify-center shrink-0 shadow-xs group-hover:bg-[#48A63E] group-hover:text-white transition-all">
                        <Package className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Box 2: Customer Orders Count */}
                    <div 
                      onClick={() => setActiveTab('orders')}
                      className="cursor-pointer ultra-glass-card bg-white/60 backdrop-blur-xl rounded-3xl p-5 border border-white/80 shadow-lg flex items-center justify-between transition-all hover:scale-[1.02] hover:border-blue-500 hover:bg-white/75 hover:shadow-xl group"
                      title="Click to view & manage customer orders"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6C5E] flex items-center gap-1.5 group-hover:text-blue-600 transition-colors">
                          <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                          Customer Orders
                        </span>
                        <div className="text-3xl font-extrabold text-[#2C241D] tracking-tight">
                          {orderList.length}
                        </div>
                        <p className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                          Total orders placed by customers
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-blue-600" />
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Box 3: Low & Out of Stock */}
                    <div 
                      onClick={() => setActiveTab('inventory')}
                      className="cursor-pointer ultra-glass-card bg-white/60 backdrop-blur-xl rounded-3xl p-5 border border-white/80 shadow-lg flex items-center justify-between transition-all hover:scale-[1.02] hover:border-amber-500 hover:bg-white/75 hover:shadow-xl group"
                      title="Click to inspect warehouse stock & low inventory"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6C5E] flex items-center gap-1.5 group-hover:text-amber-600 transition-colors">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Low / Out of Stock
                        </span>
                        <div className="text-3xl font-extrabold text-[#2C241D] tracking-tight">
                          {productList.filter(p => p.stockCount === 0 || p.status === 'Out of Stock' || p.status === 'Low Stock' || p.stockCount <= 5).length}
                        </div>
                        <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                          Requires replenishment
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-amber-600" />
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-amber-600 group-hover:text-white transition-all">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Box 4: Active Categories */}
                    <div 
                      onClick={() => setActiveTab('products')}
                      className="cursor-pointer ultra-glass-card bg-white/60 backdrop-blur-xl rounded-3xl p-5 border border-white/80 shadow-lg flex items-center justify-between transition-all hover:scale-[1.02] hover:border-purple-500 hover:bg-white/75 hover:shadow-xl group"
                      title="Click to view categories & catalog"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6C5E] flex items-center gap-1.5 group-hover:text-purple-600 transition-colors">
                          <Tag className="w-3.5 h-3.5 text-purple-600" />
                          Categories
                        </span>
                        <div className="text-3xl font-extrabold text-[#2C241D] tracking-tight">
                          {new Set(productList.map(p => p.category).filter(Boolean)).size || 5}
                        </div>
                        <p className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
                          Living, Dining, Bedroom & Studio
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-purple-600" />
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-purple-600 group-hover:text-white transition-all">
                        <Tag className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Top Section Header & Add Product Trigger */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h3 className="font-extrabold text-base text-[#2C241D]">Product Catalog Management</h3>
                      <p className="text-xs text-[#7A6C5E] font-medium">Add, update, and organize store furniture products, categories, materials & colors.</p>
                    </div>
                    <button
                      onClick={handleOpenAddProductModal}
                      className="px-5 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Product</span>
                    </button>
                  </div>

                  {/* Category & Price Filters & Search */}
                  <div className="space-y-3 border-b border-[#EFE7DE] pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Category Filter */}
                      <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
                        <span className="text-xs font-bold text-[#7A6C5E] mr-1 flex items-center gap-1.5 flex-shrink-0">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#48A63E]" /> Category:
                        </span>
                        {['All', 'Living Room', 'Dining Room', 'Bedroom', 'Home Office', 'Custom Studio', ...productList.map(p => p.category).filter(c => c && !['Living Room', 'Dining Room', 'Bedroom', 'Home Office', 'Custom Studio'].includes(c))].filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 whitespace-nowrap ${categoryFilter === cat
                                ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20'
                                : 'bg-[#F9F6F0] border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F2ECE1]'
                              }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full lg:w-64 flex-shrink-0">
                        <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search product title, material..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                        />
                      </div>
                    </div>

                    {/* Price Range Filter (Green Active Color) */}
                    <div className="flex items-center gap-2 overflow-x-auto pt-1">
                      <span className="text-xs font-bold text-[#7A6C5E] mr-1 flex items-center gap-1.5 flex-shrink-0">
                        <DollarSign className="w-3.5 h-3.5 text-[#48A63E]" /> Price Range:
                      </span>
                      {[
                        { label: 'All Prices', value: 'All' },
                        { label: 'Under ₹30k', value: 'under30k' },
                        { label: '₹30k - ₹75k', value: '30k-75k' },
                        { label: '₹75k - ₹1.5L', value: '75k-150k' },
                        { label: 'Above ₹1.5L', value: 'above150k' },
                      ].map((pr) => (
                        <button
                          key={pr.value}
                          onClick={() => setPriceRangeFilter(pr.value)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${priceRangeFilter === pr.value
                              ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20'
                              : 'bg-white/80 border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F2ECE1]'
                            }`}
                        >
                          {pr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Product List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Product Code (SKU)</th>
                          <th className="py-3 px-4">Product Title</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Material & Color</th>
                          <th className="py-3 px-4">Price</th>
                          <th className="py-3 px-4">Stock Count</th>
                          <th className="py-3 px-4 text-right">Inventory Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-[#7A6C5E]">
                              <Package className="w-8 h-8 text-[#9E9082] mx-auto mb-2 opacity-50" />
                              <p className="font-extrabold text-sm text-[#2C241D]">No Products Available</p>
                              <p className="text-xs text-[#7A6C5E] mt-1">
                                {isLoadingProducts
                                  ? 'Fetching live store catalog...'
                                  : 'No products matched your current filter criteria.'}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((item) => (
                            <tr key={item.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-extrabold text-[#48A63E]">
                                <span className="bg-[#48A63E]/10 border border-[#48A63E]/20 px-2 py-0.5 rounded text-[11px]">
                                  {item.productCode || item.sku || `SKU-RS-${item.product_id || item.id}`}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.image_url || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"}
                                    alt={item.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";
                                    }}
                                    className="w-10 h-10 rounded-xl object-cover border border-[#E2D7CB] shadow-xs flex-shrink-0 bg-white"
                                  />
                                  <span>{item.name}</span>
                                </div>
                              </td>

                              <td className="py-4 px-4 text-[#6B5C4D]">{item.category}</td>
                              <td className="py-4 px-4 text-[#6B5C4D]">
                                <div>{item.material}</div>
                                {item.color && (
                                  <span className="inline-block text-[10px] font-bold bg-[#FAF7F2] border border-[#E2D7CB] px-1.5 py-0.5 rounded text-[#48A63E] mt-0.5">
                                    {item.color}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 font-extrabold text-[#48A63E]">₹{item.price.toLocaleString('en-IN')}</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${item.status === 'In Stock'
                                    ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                    : item.status === 'Low Stock'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}>
                                  {item.stockCount} ({item.status})
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end">
                                  <button
                                    onClick={() => handleOpenEditProductModal(item)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                                    title="Edit product specifications, material, price, or stock amount"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Edit</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}



              {/* TAB 2: INVENTORY STOCK */}
              {activeTab === 'inventory' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Category & Price Filters & Search Bar at the Top */}
                  <div className="space-y-3 border-b border-[#EFE7DE] pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Category Filter */}
                      <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
                        <span className="text-xs font-bold text-[#7A6C5E] mr-1 flex items-center gap-1.5 flex-shrink-0">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#48A63E]" /> Category:
                        </span>
                        {['All', 'Living Room', 'Dining Room', 'Bedroom', 'Home Office'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${categoryFilter === cat
                                ? 'bg-[#48A63E] text-white shadow-md shadow-[#48A63E]/20'
                                : 'bg-[#F9F6F0] border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F2ECE1]'
                              }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full lg:w-64 flex-shrink-0">
                        <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search title, SKU, material..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <h2 className="text-base font-extrabold text-[#2C241D]">
                    Live Inventory Stock Monitoring ({filteredProducts.length} Items Displayed)
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredProducts.length === 0 ? (
                      <div className="col-span-full py-12 text-center text-[#7A6C5E]">
                        <Package className="w-8 h-8 text-[#9E9082] mx-auto mb-2 opacity-50" />
                        <p className="font-extrabold text-sm text-[#2C241D]">No Inventory Products Found</p>
                        <p className="text-xs text-[#7A6C5E] mt-1">No stock items matched your search query or category filter.</p>
                      </div>
                    ) : (
                      filteredProducts.map((prod) => (
                        <div key={prod.id} className="p-4 rounded-2xl border border-[#E2D7CB] bg-[#F9F6F0] space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-[#7A6C5E]">{prod.sku}</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${prod.status === 'In Stock'
                                ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                : prod.status === 'Low Stock'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-700'
                              }`}>
                              {prod.status}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-extrabold text-[#2C241D] text-sm">{prod.name}</h3>
                            <p className="text-xs text-[#6B5C4D]">{prod.category} • {prod.material}</p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#E2D7CB]">
                            <div>
                              <span className="text-[11px] text-[#7A6C5E] block font-medium">Available Units</span>
                              <span className="text-lg font-extrabold text-[#2C241D]">{prod.stockCount}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditProductModal(prod)}
                                className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Edit product specifications or stock"
                              >
                                <Edit3 className="w-3 h-3 text-amber-700" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleStockCountChange(prod.id, -1)}
                                className="w-7 h-7 rounded-xl bg-white border border-[#E2D7CB] font-bold hover:bg-[#F2ECE1] flex items-center justify-center text-xs text-[#2C241D] cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handleStockCountChange(prod.id, 1)}
                                className="w-7 h-7 rounded-xl bg-white border border-[#E2D7CB] font-bold hover:bg-[#F2ECE1] flex items-center justify-center text-xs text-[#2C241D] cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: ORDER FULFILLMENT CENTER */}
              {activeTab === 'orders' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl">
                  {/* Header & Auto-Generate Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-[#2C241D] flex items-center gap-2">
                        <Truck className="w-5 h-5 text-[#48A63E]" />
                        <span>Order Fulfillment & Delivery Management Center</span>
                      </h2>
                      <p className="text-xs text-[#7A6C5E] font-medium">
                        Complete live packing, dispatch, delivery tracking, customer chat & return management
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                      <button
                        onClick={async () => {
                          await handleAutoGenerateAllCompletionStatuses();
                          await refreshFulfillmentData();
                        }}
                        className="px-3.5 py-2 bg-[#48A63E] hover:bg-[#38A132] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                        title="Calculate and update status for all customer orders logically"
                      >
                        <span>⚡ Refresh & Auto-Sync All Statuses</span>
                      </button>
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search order ID, customer, tracking..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FULFILLMENT LIVE SUMMARY STATS CARDS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    {[
                      { id: 'to_pack', label: 'To Pack', count: fulfillmentSummary.to_pack, color: 'bg-amber-50 text-amber-900 border-amber-200' },
                      { id: 'packed', label: 'Packed', count: fulfillmentSummary.packed, color: 'bg-blue-50 text-blue-900 border-blue-200' },
                      { id: 'to_dispatch', label: 'To Dispatch', count: fulfillmentSummary.to_dispatch, color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
                      { id: 'dispatched', label: 'Dispatched', count: fulfillmentSummary.dispatched, color: 'bg-purple-50 text-purple-900 border-purple-200' },
                      { id: 'out_for_delivery', label: 'Out for Delivery', count: fulfillmentSummary.out_for_delivery, color: 'bg-sky-50 text-sky-900 border-sky-200' },
                      { id: 'delivered', label: 'Delivered', count: fulfillmentSummary.delivered, color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
                      { id: 'returns', label: 'Returns', count: fulfillmentSummary.returns, color: 'bg-rose-50 text-rose-900 border-rose-200' },
                    ].map((stat) => (
                      <button
                        key={stat.id}
                        onClick={() => setOrdersSubTab(stat.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${stat.color} ${
                          ordersSubTab === stat.id ? 'ring-2 ring-[#48A63E] shadow-md scale-105' : 'opacity-90 hover:opacity-100'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{stat.label}</div>
                        <div className="text-xl font-black mt-1">{stat.count}</div>
                      </button>
                    ))}
                  </div>

                  {/* SUB-FILTER TABS */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#EFE7DE] scrollbar-none">
                    {[
                      { id: 'all', label: 'All Orders' },
                      { id: 'to_pack', label: '📦 To Pack' },
                      { id: 'packed', label: '✅ Packed' },
                      { id: 'to_dispatch', label: '🚚 To Dispatch' },
                      { id: 'dispatched', label: '✈️ Dispatched' },
                      { id: 'out_for_delivery', label: '📍 Out for Delivery' },
                      { id: 'delivered', label: '🎉 Delivered' },
                      { id: 'returns', label: '🔄 Returns Management' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setOrdersSubTab(st.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                          ordersSubTab === st.id
                            ? 'bg-[#48A63E] text-white shadow-sm'
                            : 'bg-[#FAF7F2] text-[#6E6458] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* RETURNS MANAGEMENT TAB VIEW */}
                  {ordersSubTab === 'returns' ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-[#2C241D] uppercase tracking-wider">Customer Return & Replacement Requests</h3>
                        <button
                          onClick={refreshFulfillmentData}
                          className="text-xs font-extrabold text-[#48A63E] flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refresh Returns</span>
                        </button>
                      </div>

                      {returnRequestsList.length === 0 ? (
                        <div className="py-12 text-center text-xs font-extrabold text-[#7A6C5E] bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB]">
                          No return requests submitted yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-4">Return ID & Order</th>
                                <th className="py-3 px-4">Customer</th>
                                <th className="py-3 px-4">Reason & Description</th>
                                <th className="py-3 px-4">Requested Date</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] font-medium">
                              {returnRequestsList.map((ret) => (
                                <tr key={ret.return_id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                  <td className="py-4 px-4 font-mono font-extrabold text-[#48A63E]">
                                    <div>RET-REQ-{ret.return_id}</div>
                                    <div className="text-[10px] text-[#7A6C5E] font-bold">{ret.order_number}</div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="font-extrabold text-[#2C241D]">{ret.customer_name}</div>
                                    <div className="text-[10px] text-[#7A6C5E]">{ret.customer_email}</div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block text-[11px]">
                                      {ret.reason}
                                    </div>
                                    {ret.description && (
                                      <div className="text-[11px] text-[#6E6458] mt-1 italic max-w-xs truncate">
                                        &ldquo;{ret.description}&rdquo;
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4 px-4 text-[#7A6C5E]">
                                    {ret.requested_at ? new Date(ret.requested_at).toLocaleDateString() : 'N/A'}
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                      {ret.status}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-right whitespace-nowrap space-x-1.5">
                                    <button
                                      onClick={async () => {
                                        await updateReturnStatusAPI(ret.return_id, 'Approved', 1, undefined, 'Approved', ret.refund_amount, 'Return request approved by staff.');
                                        await refreshFulfillmentData();
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const pDate = prompt('Enter scheduled pickup date (e.g. 2026-08-25):', '2026-08-25');
                                        if (pDate) {
                                          await updateReturnStatusAPI(ret.return_id, 'Return Pickup', 1, pDate, undefined, undefined, `Pickup scheduled for ${pDate}`);
                                          await refreshFulfillmentData();
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                                    >
                                      Schedule Pickup
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await updateReturnStatusAPI(ret.return_id, 'Refunded', 1, undefined, 'Refunded', ret.refund_amount, 'Full refund issued.');
                                        await refreshFulfillmentData();
                                      }}
                                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                                    >
                                      Issue Refund
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ORDERS TABLE */
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4">Order ID & Payment</th>
                            <th className="py-3 px-4">Customer Details</th>
                            <th className="py-3 px-4">Items & Code</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Fulfillment Status</th>
                            <th className="py-3 px-4 text-right">Fulfillment Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium">
                          {orderList
                            .filter((ord) => {
                              // Sub-tab filtering
                              const st = (ord.orderStatus || '').toLowerCase();
                              if (ordersSubTab === 'to_pack') {
                                if (!['order placed', 'payment confirmed', 'order confirmed', 'pending', 'processing'].includes(st)) return false;
                              } else if (ordersSubTab === 'packed') {
                                if (st !== 'packed') return false;
                              } else if (ordersSubTab === 'to_dispatch') {
                                if (st !== 'packed') return false;
                              } else if (ordersSubTab === 'dispatched') {
                                if (st !== 'dispatched' && st !== 'out for delivery' && st !== 'out_for_delivery') return false;
                              } else if (ordersSubTab === 'out_for_delivery') {
                                if (st !== 'out for delivery' && st !== 'out_for_delivery') return false;
                              } else if (ordersSubTab === 'delivered') {
                                if (st !== 'delivered' && st !== 'completed') return false;
                              }

                              // Text Search
                              if (!searchQuery.trim()) return true;
                              const q = searchQuery.toLowerCase();
                              return (
                                String(ord.orderId || '').toLowerCase().includes(q) ||
                                String(ord.customerName || '').toLowerCase().includes(q) ||
                                String(ord.email || '').toLowerCase().includes(q) ||
                                (ord.paymentId && ord.paymentId.toLowerCase().includes(q))
                              );
                            })
                            .map((ord) => {
                              const compInfo = computeLogicalCompletionStatus(ord);
                              const displayStatus = ord.completionStatus || ord.orderStatus || compInfo.status;
                              const displayPct = ord.completionPercentage ?? compInfo.percentage;

                              return (
                                <tr key={ord.orderId} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                  <td className="py-4 px-4">
                                    <div className="font-mono font-extrabold text-[#48A63E] text-xs">{ord.orderId}</div>
                                    {ord.paymentId && (
                                      <div className="text-[10px] font-mono text-[#7A6C5E] mt-0.5 font-bold" title="Razorpay Payment ID">
                                        {ord.paymentId}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="font-extrabold text-[#2C241D] text-xs">{ord.customerName}</div>
                                    <div className="text-[11px] text-[#6B5C4D] font-semibold">{ord.email}</div>
                                  </td>
                                  <td className="py-4 px-4">
                                    {ord.items && ord.items.length > 0 ? (
                                      <div className="space-y-1.5">
                                        {ord.items.map((item, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <img
                                              src={item.imageUrl || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80"}
                                              alt={item.name}
                                              className="w-7 h-7 rounded-lg object-cover border border-[#E2D7CB] shrink-0 bg-white"
                                            />
                                            <div className="text-xs font-bold text-[#2C241D] line-clamp-1">{item.name} (x{item.quantity})</div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[#6B5C4D] text-xs font-medium">{ord.itemsCount} Item(s)</span>
                                    )}
                                  </td>
                                  <td className="py-4 px-4 font-extrabold text-[#2C241D] text-sm">
                                    ₹{(ord.totalAmount || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-4 px-4 min-w-[200px]">
                                    <div className="space-y-1">
                                      <span className="px-2.5 py-1 rounded-lg border bg-[#FAF7F2] border-[#E2D7CB] text-[#38A132] text-[11px] font-black uppercase inline-block">
                                        {displayStatus}
                                      </span>
                                      <div className="w-full bg-[#EFE7DE] rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-full ${compInfo.barColor} transition-all duration-500 rounded-full`}
                                          style={{ width: `${Math.min(100, Math.max(0, displayPct))}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-right whitespace-nowrap space-x-1.5">
                                    {/* 📦 Pack Order Action */}
                                    <button
                                      onClick={() => {
                                        setPackingModalOrder(ord);
                                        setPackingNote('Packed securely with protective high-density foam.');
                                      }}
                                      className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                      title="Open 5-point quality packing checklist"
                                    >
                                      <Package className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Pack</span>
                                    </button>

                                    {/* 🚚 Dispatch Action */}
                                    <button
                                      onClick={() => handleOpenDispatchModal(ord)}
                                      className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                      title="Dispatch order with carrier and tracking number"
                                    >
                                      <Truck className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Dispatch</span>
                                    </button>

                                    {/* 📍 Update Delivery Status Action */}
                                    {['delivered', 'completed'].includes((ord.orderStatus || '').toLowerCase()) ? (
                                      <button
                                        disabled
                                        className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs rounded-xl inline-flex items-center gap-1 shadow-2xs cursor-default"
                                        title="Delivery Completed"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Completed</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setDeliveryStatusModalOrder(ord);
                                          setDeliveryStatusVal('Out for Delivery');
                                        }}
                                        className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                        title="Update delivery status (Out for Delivery, Delivered, Delayed)"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Status</span>
                                      </button>
                                    )}

                                    {/* 💬 Customer Chat Drawer Action */}
                                    <button
                                      onClick={async () => {
                                        setStaffChatModalOrder(ord);
                                        const msgs = await fetchOrderMessagesAPI(ord.orderId);
                                        setStaffChatMessages(msgs);
                                      }}
                                      className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                      title="Chat with customer regarding this order"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-[#38A132]" />
                                      <span>Chat</span>
                                    </button>

                                    {/* 📜 Audit History Action */}
                                    <button
                                      onClick={async () => {
                                        setHistoryModalOrder(ord);
                                        const hist = await fetchOrderHistoryAPI(ord.orderId);
                                        setHistoryData(hist);
                                      }}
                                      className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                      title="View status audit history timeline"
                                    >
                                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                                      <span>History</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: STAFF QUERIES & ADMIN RESPONSES */}
              {activeTab === 'queries' && (
                <div className="space-y-6 pt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Submit New Query Form */}
                    <div className="bg-[#FAF7F2] p-5 rounded-2xl border-2 border-[#E2D7CB] shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-[#E2D7CB] pb-3">
                        <MessageSquare className="w-5 h-5 text-[#48A63E]" />
                        <h4 className="font-extrabold text-sm text-[#2C241D]">Submit New Admin Request</h4>
                      </div>

                      <form onSubmit={handleSubmitQuery} className="space-y-3.5 text-xs">
                        <div>
                          <label className="block font-extrabold text-[#2C241D] mb-1">Request Category</label>
                          <select
                            value={newQueryCategory}
                            onChange={(e) => setNewQueryCategory(e.target.value as any)}
                            className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-extrabold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                          >
                            <option value="Email Change Request">Email Change Request</option>
                            <option value="Role & Access Permission">Role & Access Permission</option>
                            <option value="General Query">General Query</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-extrabold text-[#2C241D] mb-1">Request Subject</label>
                          <input
                            type="text"
                            placeholder="e.g. Update login email to nimal.k.retail@retailsphere.com"
                            value={newQuerySubject}
                            onChange={(e) => setNewQuerySubject(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] placeholder-[#8C7C6D] focus:outline-none focus:border-[#48A63E]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block font-extrabold text-[#2C241D] mb-1">Detailed Message / Description</label>
                          <textarea
                            rows={4}
                            placeholder="Provide details about your request for the Admin..."
                            value={newQueryMessage}
                            onChange={(e) => setNewQueryMessage(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] placeholder-[#8C7C6D] focus:outline-none focus:border-[#48A63E]"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20"
                        >
                          <Send className="w-4 h-4" />
                          <span>Submit Request to Admin</span>
                        </button>
                      </form>
                    </div>

                    {/* Submitted Queries & Admin Responses Feed */}
                    <div className="lg:col-span-2 space-y-4">
                      <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                        <span>Submitted Requests & Admin Responses</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#48A63E]/15 text-[#48A63E] text-xs font-extrabold">
                          {staffQueries.length} Total
                        </span>
                      </h4>

                      {staffQueries.length === 0 ? (
                        <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-[#6B5C4D]">
                          <HelpCircle className="w-10 h-10 mx-auto text-[#8C7C6D] mb-2 opacity-50" />
                          <p className="font-extrabold text-sm">No queries submitted yet</p>
                          <p className="text-xs">Use the form to send an email change request or query to Admin.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {staffQueries.map((q) => (
                            <div key={q.id} className="p-5 rounded-2xl bg-[#FAF7F2] border-2 border-[#E2D7CB] shadow-xs space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E] text-[11px] font-extrabold">
                                      {q.category}
                                    </span>
                                    <span className="text-[11px] font-bold text-[#8C7C6D]">{q.createdAt}</span>
                                  </div>
                                  <h5 className="font-extrabold text-base text-[#2C241D] mt-1">{q.subject}</h5>
                                </div>

                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                                  q.status === 'Resolved' || q.status === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {q.status}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-[#5C4E42] bg-[#F3EDE5] p-3 rounded-xl border border-[#E2D7CB]">
                                {q.message}
                              </p>

                              {/* Admin Response Box */}
                              {q.adminResponse ? (
                                <div className="p-3.5 rounded-xl bg-[#48A63E]/10 border border-[#48A63E]/40 text-[#2C241D] space-y-1 animate-fadeIn">
                                  <div className="flex items-center gap-2 text-[#48A63E] font-extrabold text-xs">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Admin Response & Feedback ({q.updatedAt || 'Recent'}):</span>
                                  </div>
                                  <p className="text-xs font-extrabold text-[#2C241D] pl-6 leading-relaxed">
                                    "{q.adminResponse}"
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[11px] font-bold text-[#8C7C6D] italic pl-1">
                                  ⏳ Waiting for Admin review and response...
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SUPPLIER MANAGEMENT */}
              {activeTab === 'suppliers' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Top Supplier KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Total Suppliers</span>
                      <div className="text-2xl font-extrabold text-[#2C241D]">{supplierList.length} Suppliers</div>
                      <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Registered Vendors</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Active Suppliers</span>
                      <div className="text-2xl font-extrabold text-[#2C241D]">{supplierList.filter(s => s.status === 'Active').length} Active</div>
                      <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Fulfilling Material Orders</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Product Allocations</span>
                      <div className="text-2xl font-extrabold text-[#2C241D]">13 Items Supplied</div>
                      <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Catalog Distribution</span>
                    </div>
                  </div>

                  {/* Search Bar & Add Supplier Header */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4 pt-2">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search supplier, product name, product code (SKU)..."
                        value={supplierSearchQuery}
                        onChange={(e) => setSupplierSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                      />
                    </div>

                    <button
                      onClick={handleOpenAddSupplierModal}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Supplier</span>
                    </button>
                  </div>

                  {/* Supplier Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Supplier Name</th>
                          <th className="py-3 px-4">Phone Number</th>
                          <th className="py-3 px-4">Location / Address</th>
                          <th className="py-3 px-4">Supplied Products</th>
                          <th className="py-3 px-4">Products Sold</th>
                          <th className="py-3 px-4 text-right">Status & Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {filteredSuppliers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-[#7A6C5E]">
                              <Truck className="w-8 h-8 text-[#9E9082] mx-auto mb-2 opacity-50" />
                              <p className="font-extrabold text-sm text-[#2C241D]">No Suppliers Available</p>
                              <p className="text-xs text-[#7A6C5E] mt-1">
                                {isLoadingSuppliers
                                  ? 'Loading supplier records...'
                                  : 'No supplier records matched your search query.'}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredSuppliers.map((sup) => {
                            const isArun = sup.supplier_name.toLowerCase().includes('arun');
                            const prodsForSup = isArun ? displayProducts.slice(0, 6) : displayProducts.slice(6);
                            const supSoldCount = prodsForSup.reduce((acc, item) => {
                              const nameKey = item.name.toLowerCase().trim();
                              const idKey = item.id.toLowerCase().trim();
                              return acc + (orderedQtyMap[nameKey] || orderedQtyMap[idKey] || 0);
                            }, 0);

                            return (
                              <tr
                                key={sup.id}
                                onClick={() => setSelectedSupplierDetail(sup)}
                                className="hover:bg-[#F5ECE1] transition-colors cursor-pointer group"
                                title="Click to view products & stock quantities took from this supplier"
                              >
                                <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-[#48A63E]/15 text-[#48A63E] font-extrabold flex items-center justify-center text-xs flex-shrink-0 group-hover:bg-[#48A63E] group-hover:text-white transition-colors">
                                      {sup.supplier_name.charAt(0)}
                                    </div>
                                    <span className="group-hover:text-[#48A63E] transition-colors">{sup.supplier_name}</span>
                                  </div>
                                </td>

                                <td className="py-4 px-4 font-mono font-bold text-[#48A63E]">{sup.phone}</td>
                                <td className="py-4 px-4 text-[#6B5C4D] max-w-xs truncate" title={sup.address}>
                                  {sup.address}
                                </td>
                                <td className="py-4 px-4">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSupplierDetail(sup);
                                    }}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-lg bg-[#48A63E] hover:bg-[#3D9134] text-white transition-all shadow-xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{sup.assigned_products_count || (isArun ? 6 : 7)} Products (Click to view)</span>
                                  </button>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E]">
                                    {supSoldCount} Units Sold
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                      sup.status === 'Active'
                                        ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                        : 'bg-rose-100 text-rose-700'
                                    }`}>
                                      {sup.status}
                                    </span>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditSupplierModal(sup);
                                      }}
                                      className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                      title="Edit supplier contact, address, or status"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Edit</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: COUPONS & DISCOUNTS MANAGEMENT */}
              {activeTab === 'coupons' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">

                  {/* Top Coupon KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Active Coupons</span>
                      <div className="text-2xl font-extrabold text-[#2C241D]">
                        {couponsList.filter(c => c.status === 'Active' && (!c.customerLimit || c.customerLimit <= 0 || (c.currentRedemptions || 0) < c.customerLimit)).length} Coupons
                      </div>
                      <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Available Redeemable Coupons</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F9F6F0] border border-[#E2D7CB] space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Retail Shop Coupons</span>
                      <div className="text-2xl font-extrabold text-[#2C241D]">{couponsList.length} Total</div>
                      <span className="text-[10px] font-bold text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-md inline-block">Total Coupons Created</span>
                    </div>
                  </div>

                  {/* Search Bar & Create Coupon Header */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4 pt-2">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search promo code or description..."
                        value={couponSearchQuery}
                        onChange={(e) => setCouponSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                      />
                    </div>

                    <button
                      onClick={() => setIsAddCouponModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-[#48A63E]/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create & Dispatch Coupon</span>
                    </button>
                  </div>

                  {/* Coupon Data Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Promo Code</th>
                          <th className="py-3 px-4">Discount</th>
                          <th className="py-3 px-4">Access Provision</th>
                          <th className="py-3 px-4">Redemptions</th>
                          <th className="py-3 px-4">Assigned User / Email (Editable)</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {couponsList
                          .filter(c => !couponSearchQuery.trim() || c.code.toLowerCase().includes(couponSearchQuery.toLowerCase()) || (c.targetUserEmail && c.targetUserEmail.toLowerCase().includes(couponSearchQuery.toLowerCase())))
                          .map((coupon) => {
                            const limitN = coupon.customerLimit || 0;
                            const redeemed = coupon.currentRedemptions || 0;
                            const audience = coupon.audienceType || 'all';

                            let audienceBadge = '🌐 First N Customers';
                            let audienceBg = 'bg-blue-50 text-blue-700 border-blue-200';
                            if (audience === 'retail') {
                              audienceBadge = '🛍️ First N Retail Customers';
                              audienceBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            } else if (audience === 'production') {
                              audienceBadge = '🏭 First N Production Customers';
                              audienceBg = 'bg-amber-50 text-amber-700 border-amber-200';
                            }

                            return (
                              <tr key={coupon.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-extrabold text-[#48A63E]">
                                  <div className="flex items-center gap-2">
                                    <Tag className="w-3.5 h-3.5 text-[#48A63E]" />
                                    <span className="bg-[#48A63E]/10 px-2.5 py-1 rounded-lg border border-[#48A63E]/20">{coupon.code}</span>
                                  </div>
                                </td>

                                <td className="py-4 px-4 font-extrabold text-[#2C241D]">{coupon.discountPercent}% OFF</td>
                                
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${audienceBg}`}>
                                    {audienceBadge} {limitN > 0 ? `(N = ${limitN})` : ''}
                                  </span>
                                </td>

                                <td className="py-3 px-4 font-mono">
                                  {limitN > 0 ? (
                                    <div className="space-y-1">
                                      <span className="font-bold text-[#2C241D] text-[11px]">{redeemed} / {limitN} Used</span>
                                      <div className="w-24 h-1.5 bg-[#EAE0D4] rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all ${redeemed >= limitN ? 'bg-rose-500' : 'bg-[#48A63E]'}`} 
                                          style={{ width: `${Math.min(100, Math.round((redeemed / limitN) * 100))}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[#8C7C6D] text-[11px] font-medium">Unlimited</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-[#6B5C4D]">
                                  {coupon.targetUserEmail ? `🎯 ${coupon.targetUserEmail}` : '🌐 All Customers'}
                                </td>

                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    coupon.status === 'Active' && (!limitN || redeemed < limitN)
                                      ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {coupon.status === 'Inactive' ? 'Inactive' : (limitN > 0 && redeemed >= limitN ? 'Exhausted' : coupon.status)}
                                  </span>
                                </td>

                                <td className="py-4 px-4 text-right space-x-2">
                                  {coupon.status === 'Inactive' ? (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await regenerateCouponApi(coupon.id);
                                          await refreshCoupons();
                                          setSuccessNotice(`Coupon "${coupon.code}" reactivated successfully!`);
                                          setTimeout(() => setSuccessNotice(null), 5000);
                                        } catch (err: any) {
                                          alert(err.message || 'Failed to reactivate coupon.');
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-200 shadow-xs cursor-pointer"
                                      title="Reactivate Inactive Coupon"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Reactivate</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleRemoveCoupon(coupon.id, coupon.code)}
                                      className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-200 shadow-xs cursor-pointer"
                                      title="Set Coupon to Inactive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Remove</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Allotment & One-Time Usage Record Table */}
                  {(() => {
                    // 1. Sort latest created/allotted date first
                    const sortedAllotments = [...allotmentsList].sort((a, b) => {
                      const dateA = a.allottedDate ? new Date(a.allottedDate).getTime() : 0;
                      const dateB = b.allottedDate ? new Date(b.allottedDate).getTime() : 0;
                      if (dateA !== dateB) return dateB - dateA;
                      return (b.id || '').localeCompare(a.id || '');
                    });

                    // 2. Filter by search query
                    const filteredAllotments = sortedAllotments.filter((alt) => {
                      if (!allotmentSearchQuery.trim()) return true;
                      const q = allotmentSearchQuery.toLowerCase();
                      const matchEmail = (alt.targetUserEmail || '').toLowerCase().includes(q);
                      const matchCode = (alt.couponCode || '').toLowerCase().includes(q);
                      const matchDiscount = String(alt.discountPercent || '').toLowerCase().includes(q);
                      const matchStatus = (alt.used ? 'used redeemed' : 'delivered').includes(q);
                      return matchEmail || matchCode || matchDiscount || matchStatus;
                    });

                    // 3. Paginate (10 records per page)
                    const ITEMS_PER_PAGE = 10;
                    const totalAllotmentPages = Math.ceil(filteredAllotments.length / ITEMS_PER_PAGE) || 1;
                    const validAllotmentPage = Math.min(Math.max(1, allotmentCurrentPage), totalAllotmentPages);
                    const paginatedAllotments = filteredAllotments.slice(
                      (validAllotmentPage - 1) * ITEMS_PER_PAGE,
                      validAllotmentPage * ITEMS_PER_PAGE
                    );

                    return (
                      <div className="mt-8 border-t border-[#EFE7DE] pt-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-[#48A63E]" />
                              <span>Customer Coupon Allotment & One-Time Usage Records</span>
                            </h4>
                            <p className="text-[11px] text-[#7A6C5E] font-medium">Maintains complete record of users allotted coupons, delivery status, and single-use enforcement.</p>
                          </div>

                          <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                            {/* Search Input Bar */}
                            <div className="relative w-full sm:w-64">
                              <Search className="w-3.5 h-3.5 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Search customer email, code..."
                                value={allotmentSearchQuery}
                                onChange={(e) => {
                                  setAllotmentSearchQuery(e.target.value);
                                  setAllotmentCurrentPage(1);
                                }}
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E2D7CB] text-[#2C241D] placeholder:text-[#A09080] focus:outline-none focus:border-[#48A63E] shadow-xs"
                              />
                            </div>

                            <span className="text-xs font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-3 py-1.5 rounded-xl border border-[#48A63E]/20 whitespace-nowrap">
                              {filteredAllotments.length} Total Records
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto bg-white rounded-2xl border border-[#E2D7CB] shadow-xs">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-[#FAF7F2] border-b border-[#E2D7CB] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3 px-4">Allotted Customer Email / User ID</th>
                                <th className="py-3 px-4">Coupon Code</th>
                                <th className="py-3 px-4">Discount</th>
                                <th className="py-3 px-4">Allotted Date</th>
                                <th className="py-3 px-4">Usage Status</th>
                                <th className="py-3 px-4">Redeemed Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] font-medium">
                              {paginatedAllotments.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-[#8C7C6D] italic">
                                    No customer coupon allotments found matching search criteria.
                                  </td>
                                </tr>
                              ) : (
                                paginatedAllotments.map((alt) => (
                                  <tr key={alt.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                    <td className="py-3.5 px-4 font-mono font-bold text-[#2C241D]">
                                      ✉️ {alt.targetUserEmail}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono font-extrabold text-[#48A63E]">
                                      <span className="bg-[#48A63E]/10 px-2 py-0.5 rounded-md border border-[#48A63E]/20">
                                        {alt.couponCode}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                      {alt.discountPercent}% OFF
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">
                                      {alt.allottedDate}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      {alt.used ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E] border border-[#48A63E]/30">
                                          Used ✓ (Redeemed)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          Delivered
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">
                                      {alt.usedDate || '—'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Page Controls (1, 2, 3, etc.) */}
                        {totalAllotmentPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <div className="text-xs font-semibold text-[#7A6C5E]">
                              Showing page <span className="font-extrabold text-[#2C241D]">{validAllotmentPage}</span> of <span className="font-extrabold text-[#2C241D]">{totalAllotmentPages}</span> ({filteredAllotments.length} records total)
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => setAllotmentCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={validAllotmentPage === 1}
                                className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-[#E2D7CB] text-[#2C241D] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                              >
                                Previous
                              </button>

                              {Array.from({ length: totalAllotmentPages }, (_, i) => i + 1).map((pageNum) => (
                                <button
                                  key={pageNum}
                                  onClick={() => setAllotmentCurrentPage(pageNum)}
                                  className={`w-7 h-7 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                    validAllotmentPage === pageNum
                                      ? 'bg-[#38A132] text-white shadow-xs'
                                      : 'bg-white text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#FAF7F2]'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              ))}

                              <button
                                onClick={() => setAllotmentCurrentPage(prev => Math.min(totalAllotmentPages, prev + 1))}
                                disabled={validAllotmentPage === totalAllotmentPages}
                                className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-[#E2D7CB] text-[#2C241D] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          </main>
        </div>

      {/* MODAL 1: Add New Product (High Contrast Vibrant Theme) */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">
                  {editingProduct ? `Edit Specifications: ${editingProduct.name}` : 'Add New Furniture Product'}
                </h3>
                <p className="text-[11px] font-bold text-[#6B5C4D]">
                  {editingProduct ? 'Update product details, material, price, or amount' : 'Retail Staff Product Catalog Manager'}
                </p>
              </div>
              <button
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g. Modern Bouclé Armchair"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold placeholder-[#8C7C6D]"
                  required
                />
              </div>

              {/* Category & Subcategory Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-[#2C241D]">Category</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategoryMode(!isCustomCategoryMode);
                        if (!isCustomCategoryMode) setCustomCategoryInput('');
                      }}
                      className="text-[10px] font-extrabold text-[#48A63E] hover:underline"
                    >
                      {isCustomCategoryMode ? 'Select' : '+ New'}
                    </button>
                  </div>

                  {isCustomCategoryMode ? (
                    <input
                      type="text"
                      placeholder="e.g. Balcony & Garden"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F3EDE5] border-2 border-[#48A63E]/60 rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs"
                      required
                    />
                  ) : (
                    <select
                      value={newProdCategory}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsCustomCategoryMode(true);
                        } else {
                          setNewProdCategory(e.target.value);
                          const defaultSub = getSubcategoryOptions(e.target.value)[0] || 'General';
                          setNewProdSubcategory(defaultSub);
                        }
                      }}
                      className="w-full px-2.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs"
                    >
                      {['Living Room', 'Dining Room', 'Bedroom', 'Home Office', 'Custom Studio', ...productList.map(p => p.category).filter(c => c && !['Living Room', 'Dining Room', 'Bedroom', 'Home Office', 'Custom Studio'].includes(c))].filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__ADD_NEW__">+ Add New Category...</option>
                    </select>
                  )}
                </div>

                {/* Subcategory Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-[#2C241D]">Subcategory</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomSubcategoryMode(!isCustomSubcategoryMode);
                        if (!isCustomSubcategoryMode) setCustomSubcategoryInput('');
                      }}
                      className="text-[10px] font-extrabold text-[#48A63E] hover:underline"
                    >
                      {isCustomSubcategoryMode ? 'Select' : '+ New'}
                    </button>
                  </div>

                  {isCustomSubcategoryMode ? (
                    <input
                      type="text"
                      placeholder="e.g. Wardrobes & Storage"
                      value={customSubcategoryInput}
                      onChange={(e) => setCustomSubcategoryInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F3EDE5] border-2 border-[#48A63E]/60 rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs"
                      required
                    />
                  ) : (
                    <select
                      value={newProdSubcategory}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW_SUB__') {
                          setIsCustomSubcategoryMode(true);
                        } else {
                          setNewProdSubcategory(e.target.value);
                        }
                      }}
                      className="w-full px-2.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs"
                    >
                      {getSubcategoryOptions(newProdCategory).map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                      <option value="__ADD_NEW_SUB__">+ Add Custom Subcategory...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Material & Color Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Material Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-[#2C241D]">Material Finish</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomMaterialMode(!isCustomMaterialMode)}
                      className="text-[10px] font-bold text-[#48A63E]"
                    >
                      {isCustomMaterialMode ? 'Select' : '+ Custom'}
                    </button>
                  </div>
                  {isCustomMaterialMode ? (
                    <input
                      type="text"
                      placeholder="e.g. Teak Slab"
                      value={customMaterialInput}
                      onChange={(e) => setCustomMaterialInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-xs font-bold"
                      required
                    />
                  ) : (
                    <select
                      value={newProdMaterial}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomMaterialMode(true);
                        } else {
                          setNewProdMaterial(e.target.value);
                        }
                      }}
                      className="w-full px-2.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-xs font-bold"
                    >
                      {['Solid Teak Wood', 'Sheesham Wood', 'Oak Wood', 'Bouclé Fabric', 'Italian Velvet', 'Genuine Leather', 'Italian Marble', 'Rattan', 'Brass & Metal', 'Engineered Wood'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="__CUSTOM__">Custom Material...</option>
                    </select>
                  )}
                </div>

                {/* Color Selection (Retail Staff) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-[#2C241D]">Color / Finish</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomColorMode(!isCustomColorMode)}
                      className="text-[10px] font-bold text-[#48A63E]"
                    >
                      {isCustomColorMode ? 'Select' : '+ Custom'}
                    </button>
                  </div>
                  {isCustomColorMode ? (
                    <input
                      type="text"
                      placeholder="e.g. Walnut Brown"
                      value={customColorInput}
                      onChange={(e) => setCustomColorInput(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-xs font-bold"
                      required
                    />
                  ) : (
                    <select
                      value={newProdColor}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomColorMode(true);
                        } else {
                          setNewProdColor(e.target.value);
                        }
                      }}
                      className="w-full px-2.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-xs font-bold"
                    >
                      {['Natural Wood', 'Walnut Brown', 'Ivory White', 'Charcoal Gray', 'Emerald Green', 'Royal Navy Blue', 'Warm Beige', 'Rose Pink', 'Matte Black'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__CUSTOM__">Custom Color...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="45000"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold placeholder-[#8C7C6D]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Initial Stock Count</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold placeholder-[#8C7C6D]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Dimensions (Length x Width x Height)</label>
                  <input
                    type="text"
                    placeholder="e.g. 220cm x 95cm x 78cm"
                    value={newProdDimensions}
                    onChange={(e) => setNewProdDimensions(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Warranty Protection</label>
                  <input
                    type="text"
                    placeholder="e.g. 5 Years Solid Wood Warranty"
                    value={newProdWarranty}
                    onChange={(e) => setNewProdWarranty(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Photo URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold text-xs placeholder-[#8C7C6D]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Detailed Furniture Description & Features</label>
                <textarea
                  rows={2}
                  placeholder="Enter comprehensive description, timber quality, joinery details, upholstery comfort, and care instructions..."
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-medium text-xs placeholder-[#8C7C6D]"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold transition-all shadow-md shadow-[#48A63E]/20"
                >
                  {editingProduct ? 'Save Product Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Low Stock Alert Details (High Contrast Vibrant Theme) */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 shadow-2xl border-2 border-[#E2D7CB] w-full max-w-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center text-[#B45309] shadow-sm">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#2C241D]">Low Stock Inventory Alert Details</h3>
                  <p className="text-xs font-bold text-[#6B5C4D]">Products requiring immediate restock (stock &lt; 5 units).</p>
                </div>
              </div>
              <button
                onClick={() => setShowLowStockModal(false)}
                className="p-2 rounded-xl bg-[#EAE0D4] hover:bg-[#DED2C2] text-[#2C241D] font-bold transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Cards Container */}
            <div className="space-y-3">
              {productList.filter((p) => p.stockCount < 5).length === 0 ? (
                <div className="py-10 text-center bg-[#F3EDE5] rounded-2xl border border-[#E2D7CB]">
                  <CheckCircle2 className="w-10 h-10 text-[#48A63E] mx-auto mb-2" />
                  <p className="font-extrabold text-base text-[#2C241D]">All Stock Levels Healthy!</p>
                  <p className="text-xs font-semibold text-[#6B5C4D] mt-1">No products are currently under low stock threshold.</p>
                </div>
              ) : (
                productList.filter((p) => p.stockCount < 5).map((prod) => (
                  <div key={prod.id} className="p-4 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-[#48A63E] transition-all">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={prod.image_url || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"}
                        alt={prod.name}
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"; }}
                        className="w-14 h-14 rounded-2xl object-cover border border-[#E2D7CB] bg-white flex-shrink-0 shadow-xs"
                      />
                      <div className="space-y-0.5">
                        <h4 className="font-extrabold text-sm text-[#2C241D] tracking-tight">{prod.name}</h4>
                        <p className="text-xs font-bold text-[#6B5C4D]">{prod.category} • <span className="text-[#3D3126]">{prod.material}</span></p>
                        <div className="text-sm font-extrabold text-[#48A63E]">₹{prod.price.toLocaleString('en-IN')}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-[#78350F] bg-[#FEF3C7] border border-[#FCD34D] px-3 py-1 rounded-xl inline-block shadow-xs">
                          {prod.stockCount} {prod.stockCount === 1 ? 'unit' : 'units'} left
                        </span>
                        <span className="text-[11px] font-extrabold text-[#5C4A3A] block mt-0.5">Artisan Crafts & Timber Co.</span>
                      </div>

                      <button
                        onClick={() => {
                          setRestockProduct(prod);
                          setRestockAmount('10');
                        }}
                        className="px-4 py-2.5 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Restock...</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#E2D7CB] flex justify-end">
              <button
                onClick={() => setShowLowStockModal(false)}
                className="px-6 py-2.5 rounded-xl bg-[#2C241D] text-white font-bold text-xs hover:bg-[#1A1410] shadow-md transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Restock Quantity Dialog */}
      {restockProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 shadow-2xl border-2 border-[#E2D7CB] w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#2C241D]">Restock Inventory Quantity</h3>
                  <p className="text-[11px] font-bold text-[#6B5C4D]">Specify restock units to add to store inventory</p>
                </div>
              </div>
              <button
                onClick={() => setRestockProduct(null)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] flex items-center gap-3">
              <img
                src={restockProduct.image_url || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"}
                alt={restockProduct.name}
                onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"; }}
                className="w-12 h-12 rounded-xl object-cover border border-[#E2D7CB] bg-white flex-shrink-0"
              />
              <div>
                <h4 className="font-extrabold text-xs text-[#2C241D]">{restockProduct.name}</h4>
                <p className="text-[11px] font-semibold text-[#6B5C4D]">Current Stock: <span className="font-extrabold text-[#78350F]">{restockProduct.stockCount} units</span></p>
              </div>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5">Quantity of Units to Add</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-extrabold text-sm"
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="block font-extrabold text-[11px] text-[#6B5C4D] mb-1.5">Quick Presets:</span>
                <div className="flex items-center gap-2">
                  {['5', '10', '25', '50'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRestockAmount(preset)}
                      className={`flex-1 py-1.5 rounded-xl font-extrabold text-xs transition-all ${restockAmount === preset
                          ? 'bg-[#48A63E] text-white shadow-xs'
                          : 'bg-[#EAE0D4] border border-[#E2D7CB] text-[#2C241D] hover:bg-[#DED2C2]'
                        }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold transition-all shadow-md shadow-[#48A63E]/20"
                >
                  Confirm & Save Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 4: Staff Profile Details & Edit */}

      {isStaffProfileModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 shadow-2xl border-2 border-[#E2D7CB] w-full max-w-lg space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/30 flex items-center justify-center text-[#48A63E] shadow-sm">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#2C241D]">Staff Member Profile</h3>
                  <p className="text-xs font-bold text-[#6B5C4D]">RetailSphere System Credentials & Contact Information</p>
                </div>
              </div>
              <button
                onClick={() => setIsStaffProfileModalOpen(false)}
                className="p-2 rounded-xl bg-[#EAE0D4] hover:bg-[#DED2C2] text-[#2C241D] font-bold transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Avatar Card */}
            <div className="p-4 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] flex items-center gap-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xl flex items-center justify-center shadow-md flex-shrink-0">
                {currentUser.initials}
              </div>
              <div>
                <h4 className="font-extrabold text-base text-[#2C241D]">{currentUser.name || 'Staff User'}</h4>
                <p className="text-xs font-bold text-[#6B5C4D]">{currentUser.email || 'retail.staff@retailsphere.com'}</p>
                <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E] text-[11px] font-extrabold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorized Retail Staff</span>
                </div>
              </div>
            </div>

            {/* Profile Details Form */}
            <form onSubmit={handleSaveStaffProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-extrabold text-[#2C241D]">Email Address (Managed by Admin)</label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    🔒 Read Only
                  </span>
                </div>
                <input
                  type="email"
                  value={profileForm.email}
                  readOnly
                  className="w-full px-3.5 py-2.5 bg-[#EAE0D4] border border-[#E2D7CB] rounded-xl text-[#6B5C4D] font-bold cursor-not-allowed"
                />
                <p className="text-[11px] font-bold text-[#8C7C6D] mt-1 flex items-center gap-1 flex-wrap">
                  <span>To request an email change, submit a message to Admin in the</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStaffProfileModalOpen(false);
                      setActiveTab('queries');
                    }}
                    className="text-[#48A63E] underline font-extrabold hover:text-[#3D9134]"
                  >
                    Queries Section →
                  </button>
                </p>
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Phone Contact</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Work Department</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-[#EAE0D4] border border-[#E2D7CB] rounded-xl text-[#6B5C4D] font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password Update Provision */}
              <div className="pt-3 border-t border-[#E2D7CB] space-y-3">
                <div className="flex items-center gap-2 text-[#2C241D]">
                  <Lock className="w-4 h-4 text-[#48A63E]" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#2C241D]">Update Password Provision</h4>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-extrabold flex items-center gap-2 shadow-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span>{passwordError}</span>
                  </div>
                )}


                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-extrabold text-[#2C241D] mb-1">New Password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Min 6 characters"
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs placeholder-[#8C7C6D]"
                    />
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#2C241D] mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter new password"
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs placeholder-[#8C7C6D]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#E2D7CB] flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffProfileModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold transition-all shadow-md shadow-[#48A63E]/20"
                >
                  Save Profile Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Supplier */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">
                  {editingSupplier ? `Edit Supplier: ${editingSupplier.supplier_name}` : 'Add New Supplier'}
                </h3>
                <p className="text-[11px] font-bold text-[#6B5C4D]">
                  {editingSupplier ? 'Update supplier contact details, address & status' : 'Register new raw material vendor'}
                </p>
              </div>
              <button
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplierSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. ARUN RAJ or Rahul Dev"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Contact Person *</label>
                  <input
                    type="text"
                    placeholder="e.g. Contact Name"
                    value={newSupContact}
                    onChange={(e) => setNewSupContact(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9778237180"
                    value={newSupPhone}
                    onChange={(e) => setNewSupPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs placeholder-[#8C7C6D]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Warehouse / Office Address *</label>
                <textarea
                  rows={2}
                  placeholder="Address or Logistics Hub Location"
                  value={newSupAddress}
                  onChange={(e) => setNewSupAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold text-xs placeholder-[#8C7C6D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Vendor Status</label>
                <select
                  value={newSupStatus}
                  onChange={(e) => setNewSupStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs cursor-pointer"
                >
                  <option value="Active">Active (Fulfilling Orders)</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20"
                >
                  {editingSupplier ? 'Save Changes' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Products & Quantities Took From Selected Supplier */}
      {selectedSupplierDetail && (() => {
        const isArun = selectedSupplierDetail.supplier_name.toLowerCase().includes('arun');
        let prodsTook: any[] = [];

        if (selectedSupplierDetail.assigned_products && selectedSupplierDetail.assigned_products.length > 0) {
          prodsTook = selectedSupplierDetail.assigned_products;
        } else {
          // Partition displayProducts: 6 for ARUN RAJ, 7 for Rahul Dev
          if (isArun) {
            prodsTook = displayProducts.slice(0, 6);
          } else {
            prodsTook = displayProducts.slice(6);
          }
        }

        const filteredModalProds = prodsTook.filter((item, idx) => {
          if (!modalProductSearchQuery.trim()) return true;
          const q = modalProductSearchQuery.toLowerCase();
          const pName = (item.name || item.product_name || '').toLowerCase();
          const pSku = (item.sku || `SKU-RS-${item.product_id || idx + 1}`).toLowerCase();
          const pCat = (item.category || '').toLowerCase();
          return pName.includes(q) || pSku.includes(q) || pCat.includes(q);
        });

        const totalQuantityTook = prodsTook.reduce((acc, item) => acc + (item.quantity ?? item.stockCount ?? 0), 0);
        const totalValueTook = prodsTook.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity ?? item.stockCount ?? 0)), 0);

        const totalSoldCount = prodsTook.reduce((acc, item) => {
          const nameKey = (item.name || item.product_name || '').toLowerCase().trim();
          const idKey = (item.id || item.product_id || '').toString().toLowerCase().trim();
          return acc + (orderedQtyMap[nameKey] || orderedQtyMap[idKey] || 0);
        }, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/75 backdrop-blur-md">
            <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2.5rem] p-6 sm:p-8 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-[#E2D7CB] space-y-5 animate-fadeIn overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#E2D7CB] pb-4 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#48A63E] text-white font-extrabold flex items-center justify-center text-base shadow-md">
                      {selectedSupplierDetail.supplier_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-[#2C241D]">
                        Supplier: {selectedSupplierDetail.supplier_name}
                      </h3>
                      <p className="text-xs font-bold text-[#6B5C4D]">
                        Phone: <span className="text-[#48A63E] font-mono font-extrabold">{selectedSupplierDetail.phone}</span> • Location: {selectedSupplierDetail.address}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedSupplierDetail(null);
                    setModalProductSearchQuery('');
                  }}
                  className="p-2 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* KPI Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-shrink-0">
                <div className="p-3.5 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Products Sourced</span>
                  <div className="text-xl font-extrabold text-[#2C241D]">{prodsTook.length} Items</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#48A63E]/10 border border-[#48A63E]/30 space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-[#48A63E] tracking-wider">Products Sold</span>
                  <div className="text-xl font-extrabold text-[#48A63E]">{totalSoldCount} Units Sold</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Current Available Stock</span>
                  <div className="text-xl font-extrabold text-[#2C241D]">{totalQuantityTook} Units Left</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F3EDE5] border border-[#E2D7CB] space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase text-[#7A6C5E] tracking-wider">Total Inventory Value</span>
                  <div className="text-xl font-extrabold text-[#2C241D]">₹{totalValueTook.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Table Header & Search Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
                <h4 className="text-xs font-extrabold uppercase text-[#7A6C5E] tracking-wider">
                  Products Sourced From {selectedSupplierDetail.supplier_name}
                </h4>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search product name or Product Code (SKU)..."
                    value={modalProductSearchQuery}
                    onChange={(e) => setModalProductSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                  />
                </div>
              </div>

              {/* Table of Products Took From Supplier */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                <div className="overflow-x-auto rounded-2xl border border-[#E2D7CB]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2D7CB] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px] bg-[#F3EDE5]">
                        <th className="py-3 px-3">Product Name & Code</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Unit Price</th>
                        <th className="py-3 px-3 text-center">Units Sold</th>
                        <th className="py-3 px-3 text-center">Available Stock Quantity</th>
                        <th className="py-3 px-3 text-right">Subtotal Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2D7CB] font-medium bg-white/60">
                      {filteredModalProds.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#7A6C5E] font-bold text-xs">
                            No products matched "{modalProductSearchQuery}"
                          </td>
                        </tr>
                      ) : (
                        filteredModalProds.map((item, idx) => {
                          const qty = item.quantity ?? item.stockCount ?? 0;
                          const itemPrice = item.price || 0;
                          const subtotal = itemPrice * qty;

                          const nameKey = (item.name || item.product_name || '').toLowerCase().trim();
                          const idKey = (item.id || item.product_id || '').toString().toLowerCase().trim();
                          const itemSoldCount = orderedQtyMap[nameKey] || orderedQtyMap[idKey] || 0;
                          const productCode = item.sku || `SKU-RS-${item.product_id || idx + 1}`;

                          return (
                            <tr key={item.id || item.product_id || idx} className="hover:bg-[#F3EDE5]/80 transition-colors">
                              <td className="py-3 px-3 font-extrabold text-[#2C241D]">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={item.image_url || item.imageUrl || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80"}
                                    alt={item.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80";
                                    }}
                                    className="w-9 h-9 rounded-lg object-cover border border-[#E2D7CB] shadow-xs flex-shrink-0 bg-white"
                                  />
                                  <div>
                                    <div className="font-extrabold text-[#2C241D]">{item.name}</div>
                                    <span className="text-[10px] font-mono font-bold text-[#48A63E] bg-[#48A63E]/10 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                                      {productCode}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-[#6B5C4D]">{item.category}</td>
                              <td className="py-3 px-3 font-extrabold text-[#2C241D]">₹{itemPrice.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-3 text-center">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-extrabold text-xs bg-[#48A63E]/15 text-[#48A63E]">
                                  {itemSoldCount} Units Sold
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-extrabold text-xs ${
                                  qty > 0 ? 'bg-[#F3EDE5] text-[#2C241D]' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {qty} Units Left
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-extrabold text-[#48A63E]">
                                ₹{subtotal.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-bold text-[#6B5C4D]">
                  Showing {filteredModalProds.length} of {prodsTook.length} products associated with {selectedSupplierDetail.supplier_name}
                </span>
                <button
                  onClick={() => {
                    setSelectedSupplierDetail(null);
                    setModalProductSearchQuery('');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#2C241D] hover:bg-[#1A1410] text-white font-extrabold text-xs transition-colors shadow-md"
                >
                  Close Supplier Details
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Create New Coupon */}
      {isAddCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Create Dearest Customer Coupon</h3>
                <p className="text-[11px] font-bold text-[#6B5C4D]">Add a custom discount promo code for VIP customers</p>
              </div>
              <button
                onClick={() => setIsAddCouponModalOpen(false)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCouponSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-extrabold text-[#2C241D]">Coupon Promo Code *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = newCouponAudience === 'retail' ? 'RETAIL' : newCouponAudience === 'production' ? 'PROD' : 'VIP';
                      const code = `${prefix}FIRST${newCouponCustomerLimit || '10'}_${Math.floor(Math.random() * 90 + 10)}`;
                      setNewCouponCode(code);
                    }}
                    className="text-[10px] font-extrabold text-[#48A63E] hover:underline"
                  >
                    ⚡ Auto Generate Code
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. FIRST10OFF"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] font-mono font-bold uppercase text-[#2C241D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Discount % *</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    placeholder="e.g. 15 or 25"
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">First N Limit (N) *</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    placeholder="e.g. 10"
                    value={newCouponCustomerLimit}
                    onChange={(e) => setNewCouponCustomerLimit(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Customer Access Provision *</label>
                <select
                  value={newCouponAudience}
                  onChange={(e) => setNewCouponAudience(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-extrabold text-xs"
                >
                  <option value="all">🌐 First N Customers (All Base)</option>
                  <option value="retail">🛍️ First N Retail Customers (Readymade Furniture)</option>
                  <option value="production">🏭 First N Production Customers (Custom Furniture)</option>
                </select>
                <p className="text-[10px] text-[#7A6C5E] mt-1 font-medium">Restricts coupon redemption and access rights strictly to the selected customer tier.</p>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Special offer for first 10 customers"
                  value={newCouponDesc}
                  onChange={(e) => setNewCouponDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Target User Email or User ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. customer@retailsphere.com"
                  value={newCouponUserEmail}
                  onChange={(e) => setNewCouponUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-mono text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="auto-allot-check"
                  checked={newCouponAutoAllot}
                  onChange={(e) => setNewCouponAutoAllot(e.target.checked)}
                  className="w-4 h-4 accent-[#48A63E] rounded cursor-pointer"
                />
                <label htmlFor="auto-allot-check" className="text-[11px] font-bold text-[#2C241D] cursor-pointer">
                  Auto-allot & dispatch dashboard notifications + emails to first N customers
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button
                  type="button"
                  onClick={() => setIsAddCouponModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20"
                >
                  Create & Activate Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDIT ORDER */}
      {selectedOrderForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A140E]/75 backdrop-blur-md">
          <div className="bg-[#FAF7F2] rounded-[2.2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#D8CCBD] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b-2 border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#1A140E]">Edit Order Details</h3>
                <p className="text-xs font-mono font-bold text-[#48A63E] mt-0.5">#{selectedOrderForEdit.orderId}</p>
              </div>
              <button
                onClick={() => setSelectedOrderForEdit(null)}
                className="p-2 text-[#4A3E32] hover:text-[#1A140E] rounded-xl hover:bg-[#EFE7DE] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="space-y-4 text-xs font-semibold">
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                <div className="text-[#1A140E] font-black text-sm">{selectedOrderForEdit.customerName || selectedOrderForEdit.user_name || 'Customer'}</div>
                <div className="text-[#6B5C4D] font-mono text-xs">{selectedOrderForEdit.email || selectedOrderForEdit.customerEmail || 'N/A'}</div>
                <div className="text-[#48A63E] font-black text-sm pt-1">Total Amount: ₹{(selectedOrderForEdit.totalAmount || selectedOrderForEdit.totalPrice || 0).toLocaleString('en-IN')}</div>
                {selectedOrderForEdit.assignedWorkers && selectedOrderForEdit.assignedWorkers.length > 0 && (
                  <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                    <span>👷 Assigned Worker(s): {selectedOrderForEdit.assignedWorkers.map((w: any) => `${w.worker_name}${w.specialization ? ` (${w.specialization})` : ''}`).join(', ')}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Order Status</label>
                <select
                  value={editOrderStatusValue}
                  onChange={(e) => setEditOrderStatusValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Order Placed">Order Placed</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Payment Status</label>
                <select
                  value={editOrderPaymentStatusValue}
                  onChange={(e) => setEditOrderPaymentStatusValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#7A6C5E] text-xs">Completion Status</label>
                  <button
                    type="button"
                    onClick={() => handleLogicallyGenerateCompletionStatus()}
                    className="text-[10px] font-black text-[#48A63E] bg-[#48A63E]/10 hover:bg-[#48A63E]/20 px-2 py-0.5 rounded-lg border border-[#48A63E]/30 transition-all flex items-center gap-1 cursor-pointer"
                    title="Calculate status based on payment status, worker assignments & progress"
                  >
                    <span>⚡ Logically Auto-Generate</span>
                  </button>
                </div>
                <select
                  value={editOrderCompletionStatusValue}
                  onChange={(e) => setEditOrderCompletionStatusValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Order Placed & Processing">Order Placed & Processing (15%)</option>
                  <option value="Pending Payment">Pending Payment (5%)</option>
                  <option value="In Production (40%)">In Production (40%)</option>
                  <option value="In Production (65%)">In Production (65%)</option>
                  <option value="Completed & Ready for Dispatch">Completed & Ready for Dispatch (100%)</option>
                  <option value="Shipped & In Transit">Shipped & In Transit (85%)</option>
                  <option value="Delivered">Delivered (100%)</option>
                  <option value="Cancelled">Cancelled (0%)</option>
                </select>
                <div className="mt-1 text-[10px] text-[#7A6C5E] font-medium italic">
                  * Click "⚡ Logically Auto-Generate" to automatically deduce stage from order parameters.
                </div>
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForEdit(null)}
                  className="px-4 py-2 rounded-xl border border-[#D8CCBD] text-[#4A3E32] font-bold hover:bg-[#EFE7DE] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] text-white font-extrabold shadow-md hover:bg-[#38A132] transition-colors cursor-pointer"
                >
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 1: QUALITY PACKING CHECKLIST */}
      {packingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-5 text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <span className="text-[10px] font-mono font-black text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded border border-[#48A63E]/20">
                  {packingModalOrder.orderId}
                </span>
                <h3 className="text-lg font-extrabold text-[#2C241D] mt-1">5-Point Packing Quality Verification</h3>
              </div>
              <button onClick={() => setPackingModalOrder(null)} className="p-1 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              {[
                { key: 'product_verified', label: '1. Product items & SKU verified' },
                { key: 'quantity_verified', label: '2. Item quantity cross-checked' },
                { key: 'accessories_included', label: '3. Accessories, hardware & legs included' },
                { key: 'protective_packaging', label: '4. High-density foam wrap & protective corners applied' },
                { key: 'final_inspection', label: '5. Final surface finish & polish inspection complete' },
              ].map((chk) => (
                <label key={chk.key} className="flex items-center gap-2.5 p-2 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(packingChecklist as any)[chk.key]}
                    onChange={(e) => setPackingChecklist({ ...packingChecklist, [chk.key]: e.target.checked })}
                    className="w-4 h-4 accent-[#48A63E] rounded"
                  />
                  <span>{chk.label}</span>
                </label>
              ))}

              <div>
                <label className="block font-bold text-[#7A6C5E] mb-1">Packing Notes / Staff Comments</label>
                <textarea
                  rows={2}
                  value={packingNote}
                  onChange={(e) => setPackingNote(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-end gap-3">
              <button
                onClick={() => setPackingModalOrder(null)}
                className="px-4 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = packingModalOrder;
                  setPackingModalOrder(null);
                  if (target) {
                    const ok = await markOrderPackedAPI(target.orderId, 1, packingNote, packingChecklist);
                    if (ok) {
                      setSuccessNotice(`Order #${target.orderId} successfully marked as Packed!`);
                      setTimeout(() => setSuccessNotice(null), 4000);
                      await loadAllOrdersForStaff();
                      await refreshFulfillmentData();
                    } else {
                      alert(`Failed to mark order #${target.orderId} as packed. Please try again.`);
                    }
                  }
                }}
                className="px-5 py-2 bg-[#48A63E] hover:bg-[#38A132] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Confirm & Mark Packed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DISPATCH ORDER OR FABRICATION JOB */}
      {(dispatchModalOrder || dispatchModalFabJob) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5 text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <span className="text-[10px] font-mono font-black text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded border border-[#48A63E]/20">
                  {dispatchModalOrder ? `#${dispatchModalOrder.orderId}` : `FAB-#${dispatchModalFabJob?.fabrication_id} (${dispatchModalFabJob?.job_type})`}
                </span>
                <h3 className="text-lg font-extrabold text-[#2C241D] mt-1 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#38A132]" />
                  <span>
                    {dispatchModalFabJob
                      ? `Dispatch ${dispatchModalFabJob.job_type === 'FABRICATION_PICKUP' ? 'Material Pickup' : 'Return Delivery'}`
                      : 'Dispatch Order with Logistics Provider'}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setDispatchModalOrder(null);
                  setDispatchModalFabJob(null);
                }}
                className="p-1 text-[#9E9082] hover:text-[#2C241D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-semibold">
              {/* Customer Contact & Delivery/Pickup Address Card */}
              {(() => {
                if (dispatchModalFabJob) {
                  const job = dispatchModalFabJob;
                  const isPickup = job.job_type === 'FABRICATION_PICKUP';
                  return (
                    <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-1.5">
                        <div className="flex items-center gap-1.5 font-extrabold text-[#2C241D]">
                          <User className="w-3.5 h-3.5 text-[#38A132]" />
                          <span>{job.customer_name}</span>
                        </div>
                        {job.customer_phone && (
                          <div className="font-mono font-extrabold text-[#38A132] flex items-center gap-1 text-[11px]">
                            <Phone className="w-3.5 h-3.5" />
                            <span>{job.customer_phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-1.5 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-[#38A132] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#7A6C5E] uppercase block text-[9px]">
                            {isPickup ? 'Material Pickup Address:' : 'Return Delivery Address:'}
                          </span>
                          <span className="font-semibold text-[#2C241D] leading-snug block">
                            {isPickup ? job.pickup_address : job.destination_address}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-[#E2D7CB]/60 text-[10px] text-[#7A6C5E]">
                        <span>Service: <strong className="text-[#2C241D]">{job.service_type}</strong></span>
                        <span>Distance / Fee: <strong className="text-[#38A132]">{job.distance_km} km (₹{job.transportation_charge})</strong></span>
                      </div>
                    </div>
                  );
                }

                const ordAny = dispatchModalOrder as any;
                const custEmail = (ordAny.customerEmail || ordAny.email || '').toLowerCase().trim();
                const matchedUser = allUsersList.find((u: any) => String(u.email || '').toLowerCase().trim() === custEmail);

                const customerName = ordAny.customerName || ordAny.user_name || matchedUser?.full_name || matchedUser?.name || 'Valued Customer';
                const customerPhone = ordAny.customerPhone || ordAny.phone || (matchedUser?.phone && matchedUser.phone !== '+91 98765 43210' ? matchedUser.phone : null) || matchedUser?.phone || '+91 98765 43210';
                
                let customerAddress = ordAny.customerAddress || ordAny.address || matchedUser?.address || '';
                if (!customerAddress && matchedUser?.customer?.address) {
                  const parts = [matchedUser.customer.address, matchedUser.customer.city, matchedUser.customer.state].filter(Boolean);
                  customerAddress = parts.join(', ');
                  if (matchedUser.customer.pincode) customerAddress += ` - ${matchedUser.customer.pincode}`;
                }
                if (!customerAddress || !customerAddress.trim()) {
                  customerAddress = 'Registered Delivery Address on Customer Profile';
                }

                return (
                  <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-1.5">
                      <div className="flex items-center gap-1.5 font-extrabold text-[#2C241D]">
                        <User className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>{customerName}</span>
                      </div>
                      <div className="font-mono font-extrabold text-[#38A132] flex items-center gap-1 text-[11px]">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{customerPhone}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-[#38A132] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#7A6C5E] uppercase block text-[9px]">Delivery Destination Address:</span>
                        <span className="font-semibold text-[#2C241D] leading-snug block">{customerAddress}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dispatch Method Selection Toggle */}
              <div>
                <label className="block font-bold text-[#7A6C5E] mb-1.5">Dispatch Transportation Provider *</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setDispatchType('internal')}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      dispatchType === 'internal'
                        ? 'bg-[#38A132] text-white shadow-sm'
                        : 'text-[#7A6C5E] hover:text-[#2C241D]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Internal Fleet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchType('external')}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      dispatchType === 'external'
                        ? 'bg-[#38A132] text-white shadow-sm'
                        : 'text-[#7A6C5E] hover:text-[#2C241D]'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Carrier Partner</span>
                  </button>
                </div>
              </div>

              {/* OPTION A: Internal Delivery Vehicle */}
              {dispatchType === 'internal' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-extrabold text-[#2C241D] mb-1">Select Internal Delivery Vehicle *</label>
                    {availableVehiclesList.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium space-y-1">
                        <div className="font-extrabold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>No Internal Vehicles Available</span>
                        </div>
                        <p className="text-[11px] text-amber-700">All registered company vehicles are currently assigned or in maintenance. Please select "Carrier Partner" or wait for vehicle return.</p>
                      </div>
                    ) : (
                      <select
                        value={selectedDispatchVehicleId}
                        onChange={(e) => setSelectedDispatchVehicleId(e.target.value)}
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                      >
                        {availableVehiclesList.map((v) => (
                          <option key={v.vehicle_id} value={v.vehicle_id}>
                            {v.id} — {v.registration_number} ({v.vehicle_type}, {v.capacity} kg payload)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Internal Vehicle & Driver Details Card */}
                  {(() => {
                    const sel = availableVehiclesList.find(v => v.vehicle_id.toString() === selectedDispatchVehicleId);
                    if (!sel) return null;
                    return (
                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-1">
                          <span className="font-bold text-[#7A6C5E]">Assigned Driver:</span>
                          <span className="font-extrabold text-[#38A132]">{sel.assigned_driver_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#7A6C5E]">Vehicle Registration:</span>
                          <span className="font-mono font-bold text-[#2C241D]">{sel.registration_number}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#7A6C5E]">Vehicle Type & Specs:</span>
                          <span className="font-semibold text-[#2C241D]">{sel.vehicle_type} ({sel.capacity} kg payload)</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* OPTION B: External Carrier Partner */}
              {dispatchType === 'external' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-[#7A6C5E] mb-1">Select Active Carrier Partner *</label>
                    {(() => {
                      const activeOnly = carrierPartnersList.filter(cp => cp.status === true || (cp as any).status === 1 || String(cp.status).toLowerCase() === 'true');
                      if (activeOnly.length === 0) {
                        return (
                          <div className="p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold text-[#7A6C5E] italic">
                            No active carrier partners available.
                          </div>
                        );
                      }
                      return (
                        <select
                          value={dispatchCarrier}
                          onChange={(e) => setDispatchCarrier(e.target.value)}
                          className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                        >
                          <option value="">Select Carrier Partner</option>
                          {activeOnly.map((cp) => (
                            <option key={cp.carrier_id} value={cp.carrier_name}>
                              {cp.carrier_name} ({cp.contact_phone})
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>

                  {/* External Carrier Details Card */}
                  {(() => {
                    const selCarrier = carrierPartnersList.find(cp => cp.carrier_name === dispatchCarrier);
                    if (!selCarrier) return null;
                    return (
                      <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-1">
                          <span className="font-bold text-[#7A6C5E]">Carrier Partner:</span>
                          <span className="font-extrabold text-[#38A132]">{selCarrier.carrier_name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#7A6C5E]">Contact Phone:</span>
                          <span className="font-mono font-bold text-[#2C241D]">{selCarrier.contact_phone}</span>
                        </div>
                        {selCarrier.contact_email && (
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#7A6C5E]">Support Email:</span>
                            <span className="font-semibold text-[#2C241D]">{selCarrier.contact_email}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block font-bold text-[#7A6C5E] mb-1">Tracking Number (Auto-generated if left blank)</label>
                <input
                  type="text"
                  placeholder="Auto-generated by backend (TRK-XXXXXXXX)"
                  value={dispatchTrackingNumber}
                  onChange={(e) => setDispatchTrackingNumber(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-mono font-bold text-[#38A132]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] mb-1">Expected Delivery Date *</label>
                <input
                  type="text"
                  placeholder="e.g. 05 September 2026"
                  value={dispatchExpectedDate}
                  onChange={(e) => setDispatchExpectedDate(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] mb-1">Dispatch Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Handed over for dispatch"
                  value={dispatchNote}
                  onChange={(e) => setDispatchNote(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setDispatchModalOrder(null);
                  setDispatchModalFabJob(null);
                }}
                className="px-4 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const targetOrd = dispatchModalOrder;
                  const targetFab = dispatchModalFabJob;
                  setDispatchModalOrder(null);
                  setDispatchModalFabJob(null);

                  const isInternal = dispatchType === 'internal';
                  const selVehicle = isInternal ? availableVehiclesList.find(v => v.vehicle_id.toString() === selectedDispatchVehicleId) : null;
                  const vehicleIdNum = selVehicle ? selVehicle.vehicle_id : undefined;
                  const driverIdNum = selVehicle ? selVehicle.assigned_driver_id || undefined : undefined;
                  const selCarrier = !isInternal ? carrierPartnersList.find(cp => cp.carrier_name === dispatchCarrier) : null;
                  const carrierIdNum = selCarrier ? selCarrier.carrier_id : undefined;
                  const finalCarrier = isInternal
                    ? (selVehicle ? `Internal Fleet (${selVehicle.registration_number})` : 'Internal Fleet')
                    : (dispatchCarrier || 'Carrier Partner');

                  if (targetFab) {
                    const res = await dispatchFulfillmentJobAPI(
                      targetFab.fulfillment_id,
                      carrierIdNum,
                      !isInternal ? finalCarrier : undefined,
                      dispatchTrackingNumber.trim(),
                      dispatchExpectedDate,
                      vehicleIdNum,
                      driverIdNum,
                      dispatchNote,
                      1
                    );
                    if (res.success) {
                      setSuccessNotice(`Fabrication transportation job dispatched! Tracking: ${res.tracking_number || 'Generated'}`);
                      setTimeout(() => setSuccessNotice(null), 6000);
                      await refreshControlCenterData();
                    } else {
                      alert(res.message || 'Failed to dispatch fabrication transportation job.');
                    }
                  } else if (targetOrd) {
                    const res = await dispatchOrderAPI(
                      targetOrd.orderId,
                      finalCarrier,
                      dispatchTrackingNumber.trim(),
                      dispatchExpectedDate,
                      1,
                      dispatchNote,
                      vehicleIdNum,
                      driverIdNum
                    );
                    if (res) {
                      setSuccessNotice(`Order #${targetOrd.orderId} marked as Dispatched! Tracking: ${res.tracking_number || 'Generated'}`);
                      setTimeout(() => setSuccessNotice(null), 6000);
                      await loadAllOrdersForStaff();
                      await refreshFulfillmentData();
                    } else {
                      alert(`Failed to dispatch order #${targetOrd.orderId}. Please try again.`);
                    }
                  }
                }}
                className="px-5 py-2 bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Dispatch Logistics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: UPDATE DELIVERY STATUS */}
      {deliveryStatusModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl space-y-5 text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <span className="text-[10px] font-mono font-black text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded border border-[#48A63E]/20">
                  {deliveryStatusModalOrder.orderId}
                </span>
                <h3 className="text-lg font-extrabold text-[#2C241D] mt-1">Update Delivery Status</h3>
              </div>
              <button onClick={() => setDeliveryStatusModalOrder(null)} className="p-1 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              {/* Customer Contact & Delivery Address Card */}
              {(() => {
                const ordAny = deliveryStatusModalOrder as any;
                const custEmail = (ordAny.customerEmail || ordAny.email || '').toLowerCase().trim();
                const matchedUser = allUsersList.find((u: any) => String(u.email || '').toLowerCase().trim() === custEmail);

                const customerName = ordAny.customerName || ordAny.user_name || matchedUser?.full_name || matchedUser?.name || 'Valued Customer';
                const customerPhone = ordAny.customerPhone || ordAny.phone || (matchedUser?.phone && matchedUser.phone !== '+91 98765 43210' ? matchedUser.phone : null) || matchedUser?.phone || '+91 98765 43210';
                
                let customerAddress = ordAny.customerAddress || ordAny.address || matchedUser?.address || '';
                if (!customerAddress && matchedUser?.customer?.address) {
                  const parts = [matchedUser.customer.address, matchedUser.customer.city, matchedUser.customer.state].filter(Boolean);
                  customerAddress = parts.join(', ');
                  if (matchedUser.customer.pincode) customerAddress += ` - ${matchedUser.customer.pincode}`;
                }
                if (!customerAddress || !customerAddress.trim()) {
                  customerAddress = 'Registered Delivery Address on Customer Profile';
                }

                return (
                  <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-1.5">
                      <div className="flex items-center gap-1.5 font-extrabold text-[#2C241D]">
                        <User className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>{customerName}</span>
                      </div>
                      <div className="font-mono font-extrabold text-[#38A132] flex items-center gap-1 text-[11px]">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{customerPhone}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-[#38A132] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#7A6C5E] uppercase block text-[9px]">Delivery Destination Address:</span>
                        <span className="font-semibold text-[#2C241D] leading-snug block">{customerAddress}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block font-bold text-[#7A6C5E] mb-1">New Delivery Status</label>
                <select
                  value={deliveryStatusVal}
                  onChange={(e) => setDeliveryStatusVal(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-xs"
                >
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered (Successfully Handed Over)</option>
                  <option value="Delivery Delayed">Delivery Delayed (Customs / Heavy Traffic)</option>
                  <option value="Delivery Failed">Delivery Failed (Customer Unreachable)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] mb-1">Status Note / Reason</label>
                <textarea
                  rows={2}
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Provide details about current delivery progress or delay reason..."
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-end gap-3">
              <button
                onClick={() => setDeliveryStatusModalOrder(null)}
                className="px-4 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const target = deliveryStatusModalOrder;
                  setDeliveryStatusModalOrder(null);
                  if (target) {
                    await updateDeliveryStatusAPI(target.orderId, deliveryStatusVal, 1, deliveryNote);
                    await loadAllOrdersForStaff();
                    await refreshFulfillmentData();
                  }
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Save Delivery Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: AUDIT HISTORY LOG */}
      {historyModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <span className="text-[10px] font-mono font-black text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded border border-[#48A63E]/20">
                  {historyModalOrder.orderId}
                </span>
                <h3 className="text-base font-extrabold text-[#2C241D] mt-1">Audit Status History Log</h3>
              </div>
              <button onClick={() => setHistoryModalOrder(null)} className="p-1 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {historyData.length === 0 ? (
                <div className="py-8 text-center text-xs font-semibold text-[#7A6C5E]">No audit records found.</div>
              ) : (
                historyData.map((h) => (
                  <div key={h.history_id} className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-xs space-y-1">
                    <div className="flex justify-between font-extrabold">
                      <span className="text-[#38A132]">{h.new_status}</span>
                      <span className="text-[10px] text-[#7A6C5E]">{h.changed_at ? new Date(h.changed_at).toLocaleString() : ''}</span>
                    </div>
                    <div className="text-[10px] text-[#7A6C5E] font-medium">By: {h.changed_by_role || 'Staff'}</div>
                    {h.note && <p className="text-[#6E6458] italic text-[11px]">&ldquo;{h.note}&rdquo;</p>}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#EFE7DE] text-right">
              <button
                onClick={() => setHistoryModalOrder(null)}
                className="px-4 py-2 bg-[#2C241D] text-white rounded-xl text-xs font-extrabold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ORDER CUSTOMER CHAT DRAWER */}
      {staffChatModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-4 text-[#2C241D] flex flex-col h-[520px]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#38A132]" />
                  <span>Customer Communication — {staffChatModalOrder.orderId}</span>
                </h3>
                <p className="text-xs text-[#7A6C5E]">Customer: {staffChatModalOrder.customerName} ({staffChatModalOrder.email})</p>
              </div>
              <button onClick={() => setStaffChatModalOrder(null)} className="p-1 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB]">
              {staffChatMessages.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-[#7A6C5E]">No messages exchanged yet.</div>
              ) : (
                staffChatMessages.map((msg) => {
                  const isStaff = msg.sender_role === 'Retail Staff';
                  return (
                    <div key={msg.message_id} className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-semibold shadow-xs ${
                        isStaff ? 'bg-[#38A132] text-white rounded-br-none' : 'bg-white text-[#2C241D] border border-[#E2D7CB] rounded-bl-none'
                      }`}>
                        <div className="text-[10px] font-black opacity-80 mb-0.5">{msg.sender_name} ({msg.sender_role})</div>
                        <p>{msg.message}</p>
                      </div>
                      <span className="text-[9px] text-[#9E9082] mt-0.5 font-mono">
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!staffChatModalOrder || !staffNewMessage.trim()) return;
                const ok = await sendOrderMessageAPI(staffChatModalOrder.orderId, 'Retail Staff', 'Retail Staff', staffNewMessage.trim(), 1);
                if (ok) {
                  setStaffNewMessage('');
                  const msgs = await fetchOrderMessagesAPI(staffChatModalOrder.orderId);
                  setStaffChatMessages(msgs);
                }
              }}
              className="flex items-center gap-2 pt-2 border-t border-[#EFE7DE] shrink-0"
            >
              <input
                type="text"
                placeholder="Type reply to customer..."
                value={staffNewMessage}
                onChange={(e) => setStaffNewMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
              />
              <button
                type="submit"
                disabled={!staffNewMessage.trim()}
                className="px-4 py-2.5 bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: REQUEST REVIEW DRAWER/PANEL */}
      {selectedReviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/75 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2.5rem] p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-[#E2D7CB] space-y-5 animate-fadeIn overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E2D7CB] pb-4 shrink-0">
              <div>
                <span className="font-mono text-xs font-black text-[#38A132] bg-[#38A132]/10 px-2 py-0.5 rounded border border-[#38A132]/20">
                  {selectedReviewItem.request_id} • {selectedReviewItem.type}
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-1">
                  {selectedReviewItem.title}
                </h3>
                <p className="text-xs text-[#7A6C5E] font-medium">Submitted by {selectedReviewItem.customer_name} ({selectedReviewItem.customer_email})</p>
              </div>
              <button
                onClick={() => setSelectedReviewItem(null)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full bg-[#EAE0D4] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Specifications Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#E2D7CB] space-y-3 text-xs text-[#2C241D]">
              <h4 className="font-extrabold text-[#7A6C5E] uppercase tracking-wider text-[10px]">Specifications & Customer Requirements</h4>
              <div className="grid grid-cols-2 gap-2 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                <div><span className="font-bold text-[#7A6C5E]">Category:</span> {selectedReviewItem.type}</div>
                <div><span className="font-bold text-[#7A6C5E]">Current Status:</span> <span className="font-black text-[#38A132]">{selectedReviewItem.review_status}</span></div>
                {selectedReviewItem.material && <div><span className="font-bold text-[#7A6C5E]">Material:</span> {selectedReviewItem.material}</div>}
                {selectedReviewItem.dimensions && <div><span className="font-bold text-[#7A6C5E]">Dimensions:</span> {selectedReviewItem.dimensions}</div>}
                {selectedReviewItem.color && <div><span className="font-bold text-[#7A6C5E]">Color:</span> {selectedReviewItem.color}</div>}
                {selectedReviewItem.quantity && <div><span className="font-bold text-[#7A6C5E]">Quantity:</span> {selectedReviewItem.quantity}</div>}
                {selectedReviewItem.address && <div className="col-span-2"><span className="font-bold text-[#7A6C5E]">Location Address:</span> {selectedReviewItem.address}, {selectedReviewItem.city} ({selectedReviewItem.pincode})</div>}
                {selectedReviewItem.preferred_date && <div className="col-span-2"><span className="font-bold text-[#7A6C5E]">Preferred Visit Time:</span> {selectedReviewItem.preferred_date} ({selectedReviewItem.preferred_time})</div>}
              </div>

              {selectedReviewItem.description && (
                <div>
                  <span className="font-extrabold text-[#7A6C5E] text-[10px] uppercase">Customer Description / Requirements:</span>
                  <p className="mt-1 p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] italic text-[#524538]">
                    &ldquo;{selectedReviewItem.description}&rdquo;
                  </p>
                </div>
              )}

              {selectedReviewItem.reference_image && (
                <div>
                  <span className="font-extrabold text-[#7A6C5E] text-[10px] uppercase">Uploaded Reference Image / Drawing:</span>
                  <img
                    src={selectedReviewItem.reference_image}
                    alt="Reference Specs"
                    className="w-full max-h-48 rounded-2xl object-cover border border-[#E2D7CB] mt-1"
                  />
                </div>
              )}
            </div>

            {/* Action Selection Buttons / Status Banner */}
            {selectedReviewItem.review_status === 'APPROVED' ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-xs">Request Approved & Forwarded</div>
                    <div className="text-[10px] text-emerald-800 font-medium">This request has been approved by Retail Staff and forwarded to Production Staff.</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-600 text-white font-black text-[10px] rounded-xl uppercase shrink-0">Approved</span>
              </div>
            ) : selectedReviewItem.review_status === 'REJECTED' ? (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <div className="font-extrabold text-xs">Request Rejected</div>
                    <div className="text-[10px] text-rose-800 font-medium">This request was declined by Retail Staff.</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-rose-600 text-white font-black text-[10px] rounded-xl uppercase shrink-0">Rejected</span>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase text-[#7A6C5E] tracking-wider">Retail Staff Decision Actions</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setReviewActionModal({ item: selectedReviewItem, action: 'APPROVE' })}
                    className="p-4 bg-[#38A132] hover:bg-[#32922D] text-white rounded-2xl font-extrabold text-xs shadow-md transition-all cursor-pointer text-center space-y-1"
                  >
                    <div className="text-base">✅ APPROVE</div>
                    <div className="text-[10px] font-normal opacity-90">Send to Production Staff for Technical Assessment</div>
                  </button>

                  <button
                    onClick={() => setReviewActionModal({ item: selectedReviewItem, action: 'MORE_INFO' })}
                    className="p-4 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all cursor-pointer text-center space-y-1"
                  >
                    <div className="text-base">❓ REQUEST INFO</div>
                    <div className="text-[10px] font-normal opacity-90">Ask customer for dimension or spec clarification</div>
                  </button>

                  <button
                    onClick={() => setReviewActionModal({ item: selectedReviewItem, action: 'REJECT' })}
                    className="p-4 bg-rose-700 hover:bg-rose-800 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all cursor-pointer text-center space-y-1"
                  >
                    <div className="text-base">❌ REJECT</div>
                    <div className="text-[10px] font-normal opacity-90">Decline request and notify customer</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMATION & NOTES INPUT FOR REVIEW ACTION */}
      {reviewActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/80 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2.5rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">
                  {reviewActionModal.action === 'APPROVE' && '✅ Confirm Approval & Forward to Production'}
                  {reviewActionModal.action === 'MORE_INFO' && '❓ Request Information from Customer'}
                  {reviewActionModal.action === 'REJECT' && '❌ Reject Customer Request'}
                </h3>
                <span className="text-[11px] font-mono font-extrabold text-[#38A132]">{reviewActionModal.item.request_id}</span>
              </div>
              <button
                onClick={() => setReviewActionModal(null)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full bg-[#EAE0D4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReviewAction} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="font-extrabold text-[#2C241D]">Set Priority Level</label>
                <select
                  value={priorityInput}
                  onChange={(e) => setPriorityInput(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Priority</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-[#2C241D]">
                  {reviewActionModal.action === 'APPROVE' && 'Staff Approval Notes (Internal & Customer Notice)'}
                  {reviewActionModal.action === 'MORE_INFO' && 'Specific Details Required from Customer *'}
                  {reviewActionModal.action === 'REJECT' && 'Rejection Reason *'}
                </label>
                <textarea
                  rows={3}
                  required={reviewActionModal.action !== 'APPROVE'}
                  placeholder={
                    reviewActionModal.action === 'APPROVE'
                      ? 'Approved specs. Forwarded for technical cost & time estimation.'
                      : reviewActionModal.action === 'MORE_INFO'
                      ? 'Please provide exact room clearance height and wood thickness preference.'
                      : 'Specs exceed supported workshop machinery parameters.'
                  }
                  value={reviewNotesInput}
                  onChange={(e) => setReviewNotesInput(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-medium text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setReviewActionModal(null)}
                  className="px-4 py-2 bg-[#FAF7F2] border border-[#E2D7CB] hover:bg-[#EAE0D4] text-[#2C241D] font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-5 py-2 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 ${
                    reviewActionModal.action === 'APPROVE'
                      ? 'bg-[#38A132] hover:bg-[#32922D]'
                      : reviewActionModal.action === 'MORE_INFO'
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: READYMADE ORDER SPECIFICATIONS MODAL */}
      {selectedOrderSpecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/75 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2.5rem] p-6 sm:p-8 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border-2 border-[#E2D7CB] space-y-5 animate-fadeIn overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E2D7CB] pb-4 shrink-0">
              <div>
                <span className="font-mono text-xs font-black text-[#38A132] bg-[#38A132]/10 px-2.5 py-0.5 rounded border border-[#38A132]/20">
                  #{selectedOrderSpecModal.orderId} • READYMADE STORE ORDER
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-1">
                  Order Specifications & Details
                </h3>
                <p className="text-xs text-[#7A6C5E] font-medium">Customer: {selectedOrderSpecModal.customerName || selectedOrderSpecModal.user_name || 'Valued Customer'}</p>
              </div>
              <button
                onClick={() => setSelectedOrderSpecModal(null)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full bg-[#EAE0D4] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Specifications Body */}
            <div className="space-y-4 text-xs">
              {/* Customer & Payment Meta */}
              <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-[#E2D7CB]">
                <div>
                  <span className="font-bold text-[#7A6C5E] text-[10px] uppercase block">Customer Email</span>
                  <span className="font-extrabold text-[#2C241D]">{selectedOrderSpecModal.customerEmail || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-bold text-[#7A6C5E] text-[10px] uppercase block">Payment Status</span>
                  <span className={`px-2 py-0.5 rounded-full inline-flex items-center justify-center mt-0.5 ${
                    selectedOrderSpecModal.paymentStatus === 'Paid' || !selectedOrderSpecModal.paymentStatus ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`} title={selectedOrderSpecModal.paymentStatus || 'Paid'}>
                    {selectedOrderSpecModal.paymentStatus === 'Paid' || !selectedOrderSpecModal.paymentStatus ? (
                      <Check className="w-3.5 h-3.5 text-emerald-800 stroke-[3]" />
                    ) : (
                      selectedOrderSpecModal.paymentStatus
                    )}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#7A6C5E] text-[10px] uppercase block">Total Amount</span>
                  <span className="font-black text-[#38A132] text-sm">₹{Number(selectedOrderSpecModal.totalPrice || selectedOrderSpecModal.totalAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="font-bold text-[#7A6C5E] text-[10px] uppercase block">Assigned Worker</span>
                  <span className="font-extrabold text-[#2C241D]">👤 {(selectedOrderSpecModal as any).assignedWorkerName || 'Unassigned Worker'}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-bold text-[#7A6C5E] text-[10px] uppercase block">Delivery Address</span>
                  <span className="font-medium text-[#2C241D]">{(selectedOrderSpecModal as any).delivery_address || (selectedOrderSpecModal as any).address || 'Standard Delivery Address'}</span>
                </div>
              </div>

              {/* Item Specs List */}
              <div>
                <h4 className="font-extrabold text-[#7A6C5E] text-[10px] uppercase tracking-wider mb-2">Itemized Product Specifications</h4>
                <div className="space-y-2">
                  {(selectedOrderSpecModal.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-[#E2D7CB]">
                      <img
                        src={item.imageUrl || item.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=100&auto=format&fit=crop&q=60'}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-[#E2D7CB] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-[#2C241D] truncate">{item.name}</div>
                        <div className="text-[10px] text-[#7A6C5E] font-medium">Quantity: {item.quantity || 1} • Unit Price: ₹{Number(item.price || 0).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="font-black text-[#38A132] text-xs">
                        ₹{Number((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2D7CB] flex justify-end">
              <button
                onClick={() => setSelectedOrderSpecModal(null)}
                className="px-5 py-2 bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailStaffDashboardPage;


