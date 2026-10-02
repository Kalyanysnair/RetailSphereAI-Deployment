import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearUserSession } from '../../utils/sessionUtils';
import { fetchAllLeaveRequests, reviewLeaveRequest, WorkerLeaveItem } from '../../services/api_leave';
import { 
  getCarrierPartnersApi, 
  createCarrierPartnerApi, 
  updateCarrierPartnerApi, 
  deleteCarrierPartnerApi, 
  resendCarrierCredentialsApi, 
  CarrierPartner,
  CarrierPersonnelItem,
  getAllCarrierPersonnelApi,
  resendPersonnelCredentialsAdminApi,
  togglePersonnelStatusAdminApi
} from '../../services/api_carriers';
import { 
  Users, 
  Package, 
  Plus, 
  Search, 
  LogOut, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  SlidersHorizontal,
  Sparkles,
  Briefcase,
  Wrench,
  DollarSign,
  LayoutDashboard,
  ShieldCheck,
  Check,
  MessageSquare,
  Send,
  HelpCircle,
  UserCheck,
  Mail,
  Tag,
  Trash2,
  PackageMinus,
  Bell,
  Edit,
  Eye,
  RotateCcw,
  User,
  ChevronDown,
  Lock,
  Unlock,
  Download,
  Key,
  Truck,
  FileText,
  Clock,
  ShoppingBag,
  PackageCheck,
  Percent,
  Sliders,
  ArrowRight,
  UserX,
  UserPlus,
  Edit3,
  ToggleLeft,
  ToggleRight,
  CalendarCheck,
  CalendarDays,
  Calendar,
  Layers,
  Boxes,
  ClipboardCheck,
  ShieldAlert,
  FileCheck2,
  Globe,
  Star,
  Undo2,
  Cpu,
  FileSpreadsheet,
  Scale
} from 'lucide-react';

import { AdminReviewsSection } from './sections/AdminReviewsSection';
import { AdminCarrierGovernanceSection } from './sections/AdminCarrierGovernanceSection';
import { AdminReturnsCancellationsSection } from './sections/AdminReturnsCancellationsSection';
import { AdminMachinesSection } from './sections/AdminMachinesSection';
import { AdminAILogsSection } from './sections/AdminAILogsSection';

import {
  fetchRawMaterialsApi,
  createRawMaterialApi,
  updateRawMaterialStockApi,
  fetchCustomerMaterialsApi,
  RawMaterialItem,
  CustomerMaterialItem
} from '../../services/api_materials';

import {
  fetchQualityInspectionsApi,
  recordQualityInspectionApi,
  fetchReworkJobsApi,
  resolveReworkJobApi,
  QualityInspectionItem,
  ReworkJobItem
} from '../../services/api_quality';

import { 
  createStaffUser, 
  fetchStaffUsers, 
  fetchInventoryFromDB, 
  createProductInDB, 
  updateStockInDB, 
  fetchQueriesFromDB, 
  respondToStaffQueryInDB,
  fetchNotificationsFromDB,
  markNotificationReadInDB,
  markAllNotificationsReadInDB,
  fetchSuppliersFromDB,
  createSupplierInDB,
  updateUserProfile,
  fetchAllUsers,
  createAdminUser,
  updateAdminUser,
  toggleUserStatus,
  deleteUserById
} from '../../services/api';

import {
  VehicleItem,
  FleetSummary,
  VehicleDetailResponse,
  fetchFleetSummaryDB,
  fetchVehiclesDB,
  fetchVehicleDetailsDB,
  createVehicleDB,
  updateVehicleDB,
  updateVehicleStatusDB,
} from '../../services/api_fleet';

import { respondToStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';
import {
  createCouponApi,
  getCouponsApi,
  deleteCouponApi,
  regenerateCouponApi,
  Coupon,
  CouponAllotment
} from '../../services/api_coupons';
import {
  fetchAdminDashboardSummaryDB,
  fetchRevenueAnalyticsDB,
  fetchProductionBottlenecksDB,
  fetchAuditLogsDB,
  recordAuditLogDB,
  performGlobalSearchDB,
  toggleUserStatusDB,
  updateUserDB,
  exportDatabaseExcel,
  AdminDashboardSummary,
  RevenueAnalyticsData,
  ProductionBottleneckItem,
  SearchResultItem
} from '../../services/api_admin';
import { getStoredRetailOrders, fetchRetailOrdersFromDB, deleteStoredRetailOrder, computeLogicalCompletionStatus, updateStoredRetailOrderCompletionStatus } from '../../utils/retailOrdersStorage';
import { fetchCustomOrders, updateOrderStatus, toggleLockOrderSpecifications, downloadPaymentReceipt, CustomOrderData } from '../../services/api_production';
import { getStoredAdminMessages, sendAdminMessage, deleteAdminMessage, AdminMessage } from '../../utils/adminMessagesStorage';
import { getStoredUserAuthorities, saveUserAuthority, UserAuthorityRecord, CAPABILITY_DEFINITIONS, CapabilityKey } from '../../utils/userAuthoritiesStorage';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';

export interface SystemUserItem {
  id: string;
  user_id: number;
  full_name: string;
  name: string;
  email: string;
  phone: string;
  role_name: string;
  role: string;
  status: boolean;
  status_text: 'Active' | 'Inactive';
  created_at: string;
  dateAdded: string;
}

export interface StaffMember {
  id: string;
  user_id?: number;
  name: string;
  email: string;
  phone: string;
  role: 'Retail Staff' | 'Production Staff' | 'Artisan Worker';
  skill?: string;
  status: 'Active' | 'Inactive';
  dateAdded: string;
}

export interface InventoryItem {
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
  image_url?: string;
  sku: string;
}

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
}

export interface RetailOrder {
  orderId: string;
  customerId?: number | string;
  customerName: string;
  email: string;
  itemsCount: number;
  totalAmount: number;
  orderStatus: 'Order Placed' | 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Paid' | 'Completed' | 'Cancelled';
  paymentStatus?: 'Paid' | 'Pending' | 'Cancelled';
  paymentId?: string;
  completionStatus?: string;
  completionPercentage?: number;
  orderDate: string;
  assignedWorkers?: any[];
  items?: Array<{
    id: string;
    productCode?: string;
    sku?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  }>;
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

export const INITIAL_STAFF: StaffMember[] = [];
export const INITIAL_INVENTORY: InventoryItem[] = [];

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'orders'
    | 'requests'
    | 'production'
    | 'fabrication'
    | 'onsite'
    | 'inventory'
    | 'workers'
    | 'customers'
    | 'products'
    | 'payments'
    | 'fulfillment'
    | 'returns'
    | 'communication'
    | 'reports'
    | 'alerts'
    | 'roles'
    | 'staff'
    | 'leaves'
    | 'suppliers'
    | 'custom_orders'
    | 'queries'
    | 'coupons'
    | 'broadcast'
    | 'users'
    | 'analytics'
    | 'fleet'
    | 'carriers'
    | 'materials'
    | 'quality'
    | 'audit'
    | 'export_excel'
    | 'reviews'
    | 'carrier_governance'
    | 'returns_cancellations'
    | 'machines'
    | 'ai_logs'
  >('overview');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('30days');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
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

  const handleExportDatabaseExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportDatabaseExcel();
      setSuccessBanner('System data export (.xlsx) generated successfully!');
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setStaffFormError(err.message || 'Failed to generate Excel export.');
      setTimeout(() => setStaffFormError(null), 5000);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Fleet Management State
  const [fleetSummaryData, setFleetSummaryData] = useState<FleetSummary | null>(null);
  const [vehiclesList, setVehiclesList] = useState<VehicleItem[]>([]);
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string>('ALL');
  const [fleetSearchQuery, setFleetSearchQuery] = useState('');
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [isEditVehicleModalOpen, setIsEditVehicleModalOpen] = useState(false);
  const [isVehicleDetailModalOpen, setIsVehicleDetailModalOpen] = useState(false);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<VehicleDetailResponse | null>(null);
  const [selectedVehicleForEdit, setSelectedVehicleForEdit] = useState<VehicleItem | null>(null);
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);

  // Form values for Add / Edit Vehicle
  const [vRegNumber, setVRegNumber] = useState('');
  const [vType, setVType] = useState('Mini Truck');
  const [vCapacity, setVCapacity] = useState('500');
  const [vDriverId, setVDriverId] = useState<string>('');
  const [vStatus, setVStatus] = useState('AVAILABLE');
  const [vNotes, setVNotes] = useState('');
  const [vModelName, setVModelName] = useState('');
  const [vYear, setVYear] = useState('');

  // Carrier Partners State
  const [carrierPartners, setCarrierPartners] = useState<CarrierPartner[]>([]);
  const [loadingCarriers, setLoadingCarriers] = useState(false);
  const [carrierNameInput, setCarrierNameInput] = useState('');
  const [carrierPhoneInput, setCarrierPhoneInput] = useState('');
  const [carrierEmailInput, setCarrierEmailInput] = useState('');
  const [carrierStatusInput, setCarrierStatusInput] = useState(true);
  const [isSubmittingCarrier, setIsSubmittingCarrier] = useState(false);
  const [carrierFormError, setCarrierFormError] = useState<string | null>(null);
  const [carrierFormSuccess, setCarrierFormSuccess] = useState<string | null>(null);
  const [resendingCarrierId, setResendingCarrierId] = useState<number | null>(null);
  const [editingCarrier, setEditingCarrier] = useState<CarrierPartner | null>(null);
  const [editCarrierName, setEditCarrierName] = useState('');
  const [editCarrierPhone, setEditCarrierPhone] = useState('');
  const [editCarrierEmail, setEditCarrierEmail] = useState('');
  const [isSavingEditCarrier, setIsSavingEditCarrier] = useState(false);

  // Carrier Personnel / Drivers State
  const [carrierPersonnelList, setCarrierPersonnelList] = useState<CarrierPersonnelItem[]>([]);
  const [loadingPersonnel, setLoadingPersonnel] = useState(false);
  const [resendingPersonnelId, setResendingPersonnelId] = useState<number | null>(null);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelCarrierFilter, setPersonnelCarrierFilter] = useState('ALL');
  const [personnelStatusFilter, setPersonnelStatusFilter] = useState('ALL');
  const [personnelActionMsg, setPersonnelActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);


  // System BI Dashboard & Real-Time Analytics State
  const [dashboardSummary, setDashboardSummary] = useState<AdminDashboardSummary | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalyticsData | null>(null);
  const [bottlenecksList, setBottlenecksList] = useState<ProductionBottleneckItem[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Customer Requests Admin Studio State (Customizations, Fabrications, On-Site Services)
  const [allAdminCustomOrders, setAllAdminCustomOrders] = useState<CustomOrderData[]>([]);
  const [allAdminFabrications, setAllAdminFabrications] = useState<any[]>([]);
  const [allAdminServices, setAllAdminServices] = useState<any[]>([]);
  const [customerRequestCategoryFilter, setCustomerRequestCategoryFilter] = useState<'all' | 'custom' | 'fabrication' | 'onsite'>('all');
  const [customOrderSubTab, setCustomOrderSubTab] = useState<'all' | 'requests' | 'paid' | 'completed'>('all');
  const [customOrderSearchQuery, setCustomOrderSearchQuery] = useState('');
  const [selectedCustomForAdminDetails, setSelectedCustomForAdminDetails] = useState<CustomOrderData | null>(null);
  const [selectedCustomForAdminReview, setSelectedCustomForAdminReview] = useState<CustomOrderData | null>(null);
  const [selectedFabForAdminDetails, setSelectedFabForAdminDetails] = useState<any | null>(null);
  const [selectedServiceForAdminDetails, setSelectedServiceForAdminDetails] = useState<any | null>(null);
  const [adminPriceInput, setAdminPriceInput] = useState('');
  const [adminReviewRemarks, setAdminReviewRemarks] = useState('');

  // Admin Broadcast & Direct Messages State
  const [adminMessagesList, setAdminMessagesList] = useState<AdminMessage[]>(getStoredAdminMessages());
  const [adminMsgRecipientType, setAdminMsgRecipientType] = useState<'All Staff' | 'Retail Staff' | 'Production Staff' | 'Specific Staff'>('All Staff');
  const [adminMsgTargetEmail, setAdminMsgTargetEmail] = useState('');
  const [adminMsgSubject, setAdminMsgSubject] = useState('');
  const [adminMsgContent, setAdminMsgContent] = useState('');

  // Granular Authority & Capability Management State
  const [userAuthoritiesList, setUserAuthoritiesList] = useState<UserAuthorityRecord[]>(getStoredUserAuthorities());
  const [isAuthorityModalOpen, setIsAuthorityModalOpen] = useState(false);
  const [authorityEmail, setAuthorityEmail] = useState('');
  const [authorityRole, setAuthorityRole] = useState('Staff');
  const [isFullAdminChecked, setIsFullAdminChecked] = useState(false);
  const [selectedCapabilities, setSelectedCapabilities] = useState<CapabilityKey[]>([]);

  // Header & Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [adminLeaveRequests, setAdminLeaveRequests] = useState<WorkerLeaveItem[]>([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('All');
  const [leaveSearchQuery, setLeaveSearchQuery] = useState<string>('');
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState<WorkerLeaveItem | null>(null);
  const [reviewNotesInput, setReviewNotesInput] = useState<string>('');
  const [reviewActionType, setReviewActionType] = useState<'Approved' | 'Rejected'>('Approved');
  const [isReviewLeaveModalOpen, setIsReviewLeaveModalOpen] = useState<boolean>(false);
  const [isSubmittingLeaveReview, setIsSubmittingLeaveReview] = useState<boolean>(false);

  const loadAdminLeaveRequests = async () => {
    try {
      const leaves = await fetchAllLeaveRequests();
      setAdminLeaveRequests(leaves || []);
    } catch (err) {
      console.error('Failed to load admin leave requests:', err);
    }
  };

  const handleAdminReviewLeave = async (leaveId: number, status: 'Approved' | 'Rejected', notes?: string) => {
    try {
      await reviewLeaveRequest(leaveId, status, notes, 'System Administrator');
      setSuccessBanner(`Leave application #${leaveId} marked as ${status.toUpperCase()}!`);
      await loadAdminLeaveRequests();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      console.error('Failed to review leave:', err);
      setStaffFormError(err.message || 'Failed to review leave request.');
      setTimeout(() => setStaffFormError(null), 4000);
    }
  };

  const handleOpenReviewLeaveModal = (leave: WorkerLeaveItem, action: 'Approved' | 'Rejected') => {
    setSelectedLeaveForReview(leave);
    setReviewActionType(action);
    setReviewNotesInput(action === 'Approved' ? 'Approved by System Administrator' : 'Rejected by System Administrator');
    setIsReviewLeaveModalOpen(true);
  };

  const handleConfirmReviewLeaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveForReview) return;
    setIsSubmittingLeaveReview(true);
    try {
      await reviewLeaveRequest(selectedLeaveForReview.leave_id, reviewActionType, reviewNotesInput.trim() || undefined, 'System Administrator');
      setSuccessBanner(`Leave application for ${selectedLeaveForReview.worker_name || `Worker #${selectedLeaveForReview.worker_id}`} set to ${reviewActionType.toUpperCase()}!`);
      setIsReviewLeaveModalOpen(false);
      setSelectedLeaveForReview(null);
      await loadAdminLeaveRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to submit leave review.');
    } finally {
      setIsSubmittingLeaveReview(false);
      setTimeout(() => setSuccessBanner(null), 4000);
    }
  };

  useEffect(() => {
    loadAdminLeaveRequests();
    window.addEventListener('leave-requests-updated', loadAdminLeaveRequests);
    return () => window.removeEventListener('leave-requests-updated', loadAdminLeaveRequests);
  }, []);

  // Raw Materials Ledger State
  const [rawMaterialsList, setRawMaterialsList] = useState<RawMaterialItem[]>([]);
  const [customerMaterialsList, setCustomerMaterialsList] = useState<CustomerMaterialItem[]>([]);
  const [materialsSubTab, setMaterialsSubTab] = useState<'raw' | 'customer'>('raw');
  const [materialsSearchQuery, setMaterialsSearchQuery] = useState('');
  const [materialsCategoryFilter, setMaterialsCategoryFilter] = useState('All');
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  
  // Add Material Modal State
  const [isAddRawMaterialModalOpen, setIsAddRawMaterialModalOpen] = useState(false);
  const [newMatCategory, setNewMatCategory] = useState('Timber');
  const [newMatName, setNewMatName] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('cu_ft');
  const [newMatAvailableQty, setNewMatAvailableQty] = useState('');
  const [newMatReorderLevel, setNewMatReorderLevel] = useState('20');
  const [newMatUnitCost, setNewMatUnitCost] = useState('');
  const [isSubmittingNewMaterial, setIsSubmittingNewMaterial] = useState(false);

  // Stock Adjust Modal State
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [selectedMatForAdjust, setSelectedMatForAdjust] = useState<RawMaterialItem | null>(null);
  const [adjustQtyInput, setAdjustQtyInput] = useState('');
  const [adjustType, setAdjustType] = useState<'Replenish' | 'Usage' | 'Wasted'>('Replenish');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Quality Assurance & QC State
  const [qualityInspectionsList, setQualityInspectionsList] = useState<QualityInspectionItem[]>([]);
  const [reworkJobsList, setReworkJobsList] = useState<ReworkJobItem[]>([]);
  const [qualitySubTab, setQualitySubTab] = useState<'inspections' | 'rework'>('inspections');
  const [qualitySearchQuery, setQualitySearchQuery] = useState('');
  const [qualityResultFilter, setQualityResultFilter] = useState('All');
  const [qualityOrderTypeFilter, setQualityOrderTypeFilter] = useState('All');
  const [isLoadingQuality, setIsLoadingQuality] = useState(false);

  // Record QC Modal State
  const [isRecordQCModalOpen, setIsRecordQCModalOpen] = useState(false);
  const [qcOrderType, setQcOrderType] = useState<'Custom' | 'Fabrication' | 'Readymade'>('Custom');
  const [qcOrderId, setQcOrderId] = useState('');
  const [qcResult, setQcResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [qcDimensionsCheck, setQcDimensionsCheck] = useState(true);
  const [qcFinishingCheck, setQcFinishingCheck] = useState(true);
  const [qcStructureCheck, setQcStructureCheck] = useState(true);
  const [qcSpecificationsCheck, setQcSpecificationsCheck] = useState(true);
  const [qcInspectionNotes, setQcInspectionNotes] = useState('');
  const [qcReworkWorkerId, setQcReworkWorkerId] = useState<number | undefined>(undefined);
  const [isSubmittingQC, setIsSubmittingQC] = useState(false);

  // Resolve Rework Modal State
  const [isResolveReworkModalOpen, setIsResolveReworkModalOpen] = useState(false);
  const [selectedReworkForResolve, setSelectedReworkForResolve] = useState<ReworkJobItem | null>(null);
  const [reworkResolveNotes, setReworkResolveNotes] = useState('');
  const [isSubmittingResolveRework, setIsSubmittingResolveRework] = useState(false);

  const loadMaterialsDataFromDB = async () => {
    setIsLoadingMaterials(true);
    try {
      const [raw, cust] = await Promise.all([
        fetchRawMaterialsApi(),
        fetchCustomerMaterialsApi()
      ]);
      setRawMaterialsList(raw || []);
      setCustomerMaterialsList(cust || []);
    } catch (err) {
      console.error('Error loading materials data:', err);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  const loadQualityDataFromDB = async () => {
    setIsLoadingQuality(true);
    try {
      const [insp, rework] = await Promise.all([
        fetchQualityInspectionsApi(),
        fetchReworkJobsApi()
      ]);
      setQualityInspectionsList(insp || []);
      setReworkJobsList(rework || []);
    } catch (err) {
      console.error('Error loading quality data:', err);
    } finally {
      setIsLoadingQuality(false);
    }
  };

  const handleCreateRawMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatName.trim()) {
      alert('Please enter a valid material name.');
      return;
    }
    const availQty = parseFloat(newMatAvailableQty) || 0;
    const reorder = parseFloat(newMatReorderLevel) || 10;
    const cost = parseFloat(newMatUnitCost) || 0;

    setIsSubmittingNewMaterial(true);
    try {
      await createRawMaterialApi({
        category: newMatCategory,
        material_name: newMatName.trim(),
        unit: newMatUnit,
        available_qty: availQty,
        reorder_level: reorder,
        unit_cost: cost
      });
      setSuccessBanner(`Raw Material "${newMatName.trim()}" added to inventory ledger!`);
      setIsAddRawMaterialModalOpen(false);
      setNewMatName('');
      setNewMatAvailableQty('');
      setNewMatUnitCost('');
      await loadMaterialsDataFromDB();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to add raw material.');
    } finally {
      setIsSubmittingNewMaterial(false);
    }
  };

  const handleStockAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatForAdjust) return;
    const qtyChange = parseFloat(adjustQtyInput);
    if (isNaN(qtyChange) || qtyChange <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      let newAvailable = selectedMatForAdjust.available_qty;
      let newUsed = selectedMatForAdjust.used_qty;
      let newWasted = selectedMatForAdjust.wasted_qty;

      if (adjustType === 'Replenish') {
        newAvailable += qtyChange;
      } else if (adjustType === 'Usage') {
        newAvailable = Math.max(0, newAvailable - qtyChange);
        newUsed += qtyChange;
      } else if (adjustType === 'Wasted') {
        newAvailable = Math.max(0, newAvailable - qtyChange);
        newWasted += qtyChange;
      }

      await updateRawMaterialStockApi(selectedMatForAdjust.material_id, {
        available_qty: newAvailable,
        used_qty: newUsed,
        wasted_qty: newWasted
      });

      setSuccessBanner(`Stock updated for ${selectedMatForAdjust.material_name} (${adjustType}: ${qtyChange} ${selectedMatForAdjust.unit})!`);
      setIsStockAdjustModalOpen(false);
      setSelectedMatForAdjust(null);
      setAdjustQtyInput('');
      await loadMaterialsDataFromDB();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update stock.');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleRecordQCSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ordId = parseInt(qcOrderId);
    if (isNaN(ordId) || ordId <= 0) {
      alert('Please enter a valid numeric Order ID.');
      return;
    }

    setIsSubmittingQC(true);
    try {
      await recordQualityInspectionApi({
        order_type: qcOrderType,
        order_id: ordId,
        result: qcResult,
        dimensions_check: qcDimensionsCheck,
        finishing_check: qcFinishingCheck,
        structure_check: qcStructureCheck,
        specifications_check: qcSpecificationsCheck,
        inspection_notes: qcInspectionNotes.trim() || undefined,
        rework_worker_id: qcResult === 'FAIL' ? qcReworkWorkerId : undefined
      });

      setSuccessBanner(`QC Audit recorded as ${qcResult} for ${qcOrderType} #${ordId}!`);
      setIsRecordQCModalOpen(false);
      setQcOrderId('');
      setQcInspectionNotes('');
      await loadQualityDataFromDB();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to record QC audit.');
    } finally {
      setIsSubmittingQC(false);
    }
  };

  const handleResolveReworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReworkForResolve) return;

    setIsSubmittingResolveRework(true);
    try {
      await resolveReworkJobApi(selectedReworkForResolve.rework_id, reworkResolveNotes.trim() || undefined);
      setSuccessBanner(`Rework Job #${selectedReworkForResolve.rework_id} marked as RESOLVED & ready for re-audit!`);
      setIsResolveReworkModalOpen(false);
      setSelectedReworkForResolve(null);
      setReworkResolveNotes('');
      await loadQualityDataFromDB();
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to resolve rework job.');
    } finally {
      setIsSubmittingResolveRework(false);
    }
  };

  useEffect(() => {
    loadMaterialsDataFromDB();
    loadQualityDataFromDB();
  }, []);

  useEffect(() => {
    if (activeTab === 'materials') {
      loadMaterialsDataFromDB();
    } else if (activeTab === 'quality') {
      loadQualityDataFromDB();
    }
  }, [activeTab]);

  useEffect(() => {
    const loadNotifs = async () => {
      try {
        const dbNotifs = await fetchNotificationsFromDB();
        setNotifications(dbNotifs || []);
      } catch (err) {
        setNotifications([]);
      }
    };
    loadNotifs();
  }, []);

  useEffect(() => {
    const refreshMsgs = () => setAdminMessagesList(getStoredAdminMessages());
    window.addEventListener('admin-messages-updated', refreshMsgs);
    return () => window.removeEventListener('admin-messages-updated', refreshMsgs);
  }, []);

  useEffect(() => {
    const loadSystemBIData = async () => {
      setIsLoadingSummary(true);
      const summary = await fetchAdminDashboardSummaryDB();
      if (summary) setDashboardSummary(summary);

      const rev = await fetchRevenueAnalyticsDB(analyticsTimeframe);
      if (rev) setRevenueAnalytics(rev);

      const bot = await fetchProductionBottlenecksDB();
      setBottlenecksList(bot || []);

      const logs = await fetchAuditLogsDB(50);
      setAuditLogsList(logs || []);
      setIsLoadingSummary(false);
    };

    loadSystemBIData();
  }, [analyticsTimeframe, activeTab]);

  useEffect(() => {
    const handleGlobalSearch = async () => {
      if (searchQuery.trim().length >= 2) {
        const results = await performGlobalSearchDB(searchQuery);
        setGlobalSearchResults(results);
        setIsSearchDropdownOpen(true);
      } else {
        setGlobalSearchResults([]);
        setIsSearchDropdownOpen(false);
      }
    };
    const timer = setTimeout(handleGlobalSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Current Admin Profile State
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; initials: string }>({
    name: 'Administrator',
    email: 'admin@retailsphere.com',
    initials: 'AD'
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const name = parsed.full_name || parsed.fullName || parsed.name || parsed.email || 'Administrator';
        const email = parsed.email || 'admin@retailsphere.com';

        let initials = 'AD';
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

        setCurrentUser({ name, email, initials });
      }
    } catch (err) {
      console.warn('Error reading admin profile from localStorage:', err);
    }
  }, []);

  const handleSignOut = () => {
    clearUserSession();
    navigate('/login');
  };

  // Staff Management State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(INITIAL_STAFF);
  const [staffRoleFilter, setStaffRoleFilter] = useState<'All' | 'Retail Staff' | 'Production Staff' | 'Artisan Worker'>('All');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  // Form values for Add Staff & Worker
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'Retail Staff' | 'Production Staff' | 'Artisan Worker'>('Retail Staff');
  const [newStaffWorkerSkill, setNewStaffWorkerSkill] = useState('Woodwork & Carpentry');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffIsDriver, setNewStaffIsDriver] = useState(false);

  // Form values for Edit Staff & Worker
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<StaffMember | null>(null);
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffEmail, setEditStaffEmail] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'Retail Staff' | 'Production Staff' | 'Artisan Worker'>('Retail Staff');
  const [editStaffWorkerSkill, setEditStaffWorkerSkill] = useState('Woodwork & Carpentry');
  const [editStaffIsDriver, setEditStaffIsDriver] = useState(false);
  const [isSubmittingEditStaff, setIsSubmittingEditStaff] = useState(false);
  const [editStaffModalError, setEditStaffModalError] = useState<string | null>(null);

  const handleOpenEditStaffModal = (staff: StaffMember) => {
    setSelectedStaffForEdit(staff);
    setEditStaffName(staff.name || '');
    setEditStaffEmail(staff.email || '');
    setEditStaffPhone(staff.phone || '');
    setEditStaffRole(staff.role);
    setEditStaffWorkerSkill(staff.skill || 'Woodwork & Carpentry');
    setEditStaffIsDriver(Boolean((staff as any).is_driver));
    setEditStaffModalError(null);
    setIsEditStaffModalOpen(true);
  };

  const handleUpdateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForEdit || !selectedStaffForEdit.user_id) return;
    setIsSubmittingEditStaff(true);
    setEditStaffModalError(null);
    try {
      await updateUserDB(selectedStaffForEdit.user_id, {
        full_name: editStaffName.trim(),
        email: editStaffEmail.trim() || undefined,
        phone: editStaffPhone.trim() || undefined,
        role_name: editStaffRole,
        is_driver: editStaffIsDriver
      });

      setSuccessBanner(`${editStaffRole} account for "${editStaffName.trim()}" updated successfully!`);
      setIsEditStaffModalOpen(false);
      setSelectedStaffForEdit(null);
      await loadStaffFromDB();
    } catch (err: any) {
      setEditStaffModalError(err.message || 'Failed to update staff member details.');
    } finally {
      setIsSubmittingEditStaff(false);
      setTimeout(() => setSuccessBanner(null), 4000);
    }
  };

  // Load Staff Users from DB
  const loadStaffFromDB = async () => {
    try {
      const [dbUsers, allUsers] = await Promise.all([
        fetchStaffUsers(),
        fetchAllUsers()
      ]);

      const rawList = [
        ...(Array.isArray(dbUsers) ? dbUsers : []),
        ...(Array.isArray(allUsers) ? allUsers : [])
      ];

      const staffMap = new Map<string, StaffMember>();

      for (const u of rawList) {
        const role = u.role || u.role_name || '';
        const email = (u.email || '').toLowerCase();
        const name = (u.name || u.full_name || '').toLowerCase();
        const userId = u.user_id || u.id;

        if (email === 'admin@retailsphere.com' || name === 'admin' || role === 'Admin' || role === 'Customer') {
          continue;
        }

        if (['Retail Staff', 'Production Staff', 'Artisan Worker', 'Worker', 'Staff'].includes(role)) {
          let roleName: 'Retail Staff' | 'Production Staff' | 'Artisan Worker' = 'Retail Staff';
          if (role === 'Production Staff') roleName = 'Production Staff';
          else if (role === 'Artisan Worker' || role === 'Worker') roleName = 'Artisan Worker';

          const memberKey = String(userId || email || u.id);
          if (!staffMap.has(memberKey)) {
            staffMap.set(memberKey, {
              id: u.id || `staff-${userId}`,
              user_id: typeof userId === 'number' ? userId : (parseInt(String(userId).replace(/\D/g, '')) || 1),
              name: u.name || u.full_name || (u.email ? u.email.split('@')[0].replace('.', ' ').replace(/^./, (str: string) => str.toUpperCase()) : 'Staff Member'),
              email: u.email || 'N/A',
              phone: u.phone || '+91 98765 43210',
              role: roleName,
              skill: u.skill || u.specialization || (roleName === 'Artisan Worker' ? 'Woodwork & Carpentry' : undefined),
              is_driver: u.is_driver,
              status: u.status === false || u.status === 'Inactive' ? 'Inactive' : 'Active',
              availability_status: u.availability_status || 'AVAILABLE',
              active_requests_count: u.active_requests_count || 0,
              active_jobs_count: u.active_jobs_count || 0,
              active_tasks_count: u.active_tasks_count || 0,
              completed_tasks_count: u.completed_tasks_count || 0,
              dateAdded: u.dateAdded || (u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : 'Recent')
            } as any);
          }
        }
      }

      setStaffMembers(Array.from(staffMap.values()));
    } catch (err) {
      console.warn('Could not fetch DB staff members:', err);
      setStaffMembers([]);
    }
  };

  useEffect(() => {
    loadStaffFromDB();
  }, []);

  const handleToggleStaffStatus = async (staff: StaffMember) => {
    if (!staff.user_id) return;
    try {
      const res = await toggleUserStatusDB(staff.user_id);
      const newStatus: 'Active' | 'Inactive' = res.status ? 'Active' : 'Inactive';
      setStaffMembers(prev =>
        prev.map(s => (s.user_id === staff.user_id ? { ...s, status: newStatus } : s))
      );
      setSuccessBanner(`${staff.role} "${staff.name}" account set to ${newStatus.toUpperCase()}!`);
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      setStaffFormError(err.message || 'Failed to update status.');
      setTimeout(() => setStaffFormError(null), 4000);
    }
  };

  const loadFleetDataFromDB = async () => {
    try {
      const summary = await fetchFleetSummaryDB();
      if (summary) setFleetSummaryData(summary);
      const list = await fetchVehiclesDB(fleetStatusFilter);
      setVehiclesList(list || []);
    } catch (err) {
      console.warn('Error loading fleet data:', err);
    }
  };

  const loadCarrierPartnersData = async () => {
    setLoadingCarriers(true);
    setLoadingPersonnel(true);
    try {
      const [list, personnel] = await Promise.all([
        getCarrierPartnersApi(),
        getAllCarrierPersonnelApi()
      ]);
      setCarrierPartners(list || []);
      setCarrierPersonnelList(personnel || []);
    } catch (err) {
      console.warn('Error loading carrier data:', err);
    } finally {
      setLoadingCarriers(false);
      setLoadingPersonnel(false);
    }
  };

  useEffect(() => {
    loadFleetDataFromDB();
    loadCarrierPartnersData();
  }, [fleetStatusFilter, activeTab]);

  const handleOpenAddVehicleModal = () => {
    setVRegNumber('');
    setVType('Mini Truck');
    setVCapacity('500');
    setVDriverId('');
    setVStatus('AVAILABLE');
    setVNotes('');
    setVModelName('');
    setVYear('');
    setVehicleFormError(null);
    setIsAddVehicleModalOpen(true);
  };

  const handleOpenEditVehicleModal = (veh: VehicleItem) => {
    setSelectedVehicleForEdit(veh);
    setVRegNumber(veh.registration_number);
    setVType(veh.vehicle_type);
    setVCapacity(veh.capacity.toString());
    setVDriverId(veh.assigned_driver_id ? veh.assigned_driver_id.toString() : '');
    setVStatus(veh.status);
    setVNotes(veh.notes || '');
    setVModelName(veh.model_name || '');
    setVYear(veh.year ? veh.year.toString() : '');
    setVehicleFormError(null);
    setIsEditVehicleModalOpen(true);
  };

  const handleOpenVehicleDetailModal = async (veh: VehicleItem) => {
    try {
      const detail = await fetchVehicleDetailsDB(veh.vehicle_id);
      if (detail) {
        setSelectedVehicleForDetail(detail);
        setIsVehicleDetailModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching vehicle details:', err);
    }
  };

  const isValidVehicleRegistration = (reg: string) => {
    const clean = reg.trim().toUpperCase();
    if (!clean || clean.length < 4 || clean.length > 20) return false;
    const regRegex = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{0,3}[-\s]?[0-9]{1,4}$|^[A-Z0-9\s-]{4,15}$/i;
    return regRegex.test(clean);
  };

  const handleCreateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vRegNumber.trim()) {
      setVehicleFormError('Registration number is required.');
      return;
    }
    if (!isValidVehicleRegistration(vRegNumber)) {
      setVehicleFormError('Invalid vehicle registration number format. Expected format like KL-01-AB-1234 or KL-14-1234.');
      return;
    }
    setIsSubmittingVehicle(true);
    setVehicleFormError(null);
    try {
      await createVehicleDB({
        registration_number: vRegNumber.trim(),
        vehicle_type: vType,
        capacity: parseInt(vCapacity) || 500,
        assigned_driver_id: vDriverId ? parseInt(vDriverId) : null,
        status: vStatus,
        notes: vNotes.trim() || undefined,
        model_name: vModelName.trim() || undefined,
        year: vYear ? parseInt(vYear) : undefined
      });

      setSuccessBanner(`Vehicle "${vRegNumber.trim().toUpperCase()}" added to company fleet successfully!`);
      setIsAddVehicleModalOpen(false);
      loadFleetDataFromDB();
    } catch (err: any) {
      setVehicleFormError(err.message || 'Failed to add vehicle to fleet.');
    } finally {
      setIsSubmittingVehicle(false);
      setTimeout(() => setSuccessBanner(null), 5000);
    }
  };

  const handleUpdateVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForEdit) return;
    if (!isValidVehicleRegistration(vRegNumber)) {
      setVehicleFormError('Invalid vehicle registration number format. Expected format like KL-01-AB-1234 or KL-14-1234.');
      return;
    }
    setIsSubmittingVehicle(true);
    setVehicleFormError(null);
    try {
      await updateVehicleDB(selectedVehicleForEdit.vehicle_id, {
        registration_number: vRegNumber.trim(),
        vehicle_type: vType,
        capacity: parseInt(vCapacity) || 500,
        assigned_driver_id: vDriverId ? parseInt(vDriverId) : null,
        status: vStatus,
        notes: vNotes.trim(),
        model_name: vModelName.trim(),
        year: vYear ? parseInt(vYear) : undefined
      });

      setSuccessBanner(`Vehicle "${vRegNumber.trim().toUpperCase()}" details updated successfully!`);
      setIsEditVehicleModalOpen(false);
      setSelectedVehicleForEdit(null);
      loadFleetDataFromDB();
    } catch (err: any) {
      setVehicleFormError(err.message || 'Failed to update vehicle.');
    } finally {
      setIsSubmittingVehicle(false);
      setTimeout(() => setSuccessBanner(null), 5000);
    }
  };

  // System User Management State
  const [allUsersList, setAllUsersList] = useState<SystemUserItem[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<'All Customers' | 'Active' | 'Inactive' | string>('All Customers');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Edit User State
  const [editingUser, setEditingUser] = useState<SystemUserItem | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserRole, setEditUserRole] = useState<string>('Customer');
  const [editUserStatus, setEditUserStatus] = useState<boolean>(true);
  const [editUserIsDriver, setEditUserIsDriver] = useState<boolean>(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Purchased Products Modal State
  const [selectedUserForPurchases, setSelectedUserForPurchases] = useState<SystemUserItem | null>(null);
  const [isPurchasedProductsModalOpen, setIsPurchasedProductsModalOpen] = useState(false);

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

  const handleLogicallyGenerateCompletionStatus = () => {
    if (!selectedOrderForEdit) return;
    const info = computeLogicalCompletionStatus({
      ...selectedOrderForEdit,
      orderStatus: editOrderStatusValue || selectedOrderForEdit.orderStatus,
      paymentStatus: editOrderPaymentStatusValue || selectedOrderForEdit.paymentStatus
    });
    setEditOrderCompletionStatusValue(info.status);
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
    setSuccessBanner(`Order #${selectedOrderForEdit.orderId} updated successfully with status "${finalStatus}"!`);
    setTimeout(() => setSuccessBanner(null), 4000);
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

  const handleViewUserPurchases = (u: SystemUserItem) => {
    setSelectedUserForPurchases(u);
    setIsPurchasedProductsModalOpen(true);
  };

  // Load All Users from DB (Excluding Admins)
  const loadAllUsersFromDB = async () => {
    try {
      const data = await fetchAllUsers();
      if (data && Array.isArray(data)) {
        const nonAdmin = data.filter((u: any) => {
          const role = u.role || u.role_name || '';
          const email = (u.email || '').toLowerCase();
          const name = (u.full_name || u.name || '').toLowerCase();
          return role !== 'Admin' && email !== 'admin@retailsphere.com' && name !== 'admin';
        });
        setAllUsersList(nonAdmin);
      } else {
        setAllUsersList([]);
      }
    } catch (err) {
      console.warn('Could not fetch all users:', err);
      setAllUsersList([]);
    }
  };

  useEffect(() => {
    loadAllUsersFromDB();
  }, []);

  const handleOpenEditUser = (u: SystemUserItem) => {
    setEditingUser(u);
    setEditUserName(u.full_name || u.name);
    setEditUserEmail(u.email || '');
    setEditUserPhone(u.phone === '+91 98765 43210' ? '' : u.phone);
    setEditUserRole(u.role || u.role_name || 'Customer');
    setEditUserStatus(u.status !== false);
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    try {
      await updateAdminUser(editingUser.user_id, {
        full_name: editUserName.trim(),
        email: editUserEmail.trim() || undefined,
        phone: editUserPhone.trim() || undefined,
        role_name: editUserRole,
        status: editUserStatus,
      });

      setSuccessBanner(`User "${editUserName.trim()}" updated successfully!`);
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      loadAllUsersFromDB();
    } catch (err: any) {
      setSuccessBanner(`Failed to update user: ${err.message}`);
    } finally {
      setIsUpdatingUser(false);
      setTimeout(() => setSuccessBanner(null), 5000);
    }
  };

  const handleToggleUserStatus = async (user_id: number) => {
    try {
      const res = await toggleUserStatus(user_id);
      setSuccessBanner(`Account status set to ${res.status_text || (res.status ? 'Active' : 'Inactive')}.`);
      loadAllUsersFromDB();
    } catch (err: any) {
      console.error('Error toggling user status:', err);
    } finally {
      setTimeout(() => setSuccessBanner(null), 4000);
    }
  };

  // Products Catalog Management State
  const [productList, setProductList] = useState<RetailProduct[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'>('All');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Add Product Modal State
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Living Room');
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

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

  // Edit Product Modal State
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RetailProduct | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('Living Room');
  const [editProdMaterial, setEditProdMaterial] = useState('Solid Teak Wood');
  const [editProdColor, setEditProdColor] = useState('Natural Wood');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdStock, setEditProdStock] = useState('');

  // Delete Product Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<RetailProduct | null>(null);

  // Load Inventory & Products from DB
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
            product_id: p.product_id || p.id,
            sku: p.sku || `SKU-RS-${p.product_id || p.id}`,
            name: p.name || p.product_name || 'Untitled Product',
            category: p.category || 'Living Room',
            material: p.material || 'Standard',
            color: p.color || 'Natural Wood',
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
      console.warn('Could not fetch DB inventory for admin:', err);
      setProductList([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProductsFromDB();
  }, []);

  // Stock Control State & Low Stock Modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItemToEdit, setStockItemToEdit] = useState<RetailProduct | null>(null);
  const [newStockVal, setNewStockVal] = useState('');
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  // Suppliers Directory State
  const [supplierList, setSupplierList] = useState<RetailSupplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<RetailSupplier | null>(null);
  const [newSupStatus, setNewSupStatus] = useState<'Active' | 'Inactive'>('Active');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupGst, setNewSupGst] = useState('');

  const loadSuppliersFromDB = async () => {
    try {
      const dbSups = await fetchSuppliersFromDB();
      if (dbSups && Array.isArray(dbSups)) {
        setSupplierList(dbSups);
      } else {
        setSupplierList([]);
      }
    } catch (err) {
      console.warn('Could not load suppliers from DB:', err);
      setSupplierList([]);
    }
  };

  useEffect(() => {
    loadSuppliersFromDB();
  }, []);

  // Order Fulfillment Studio State
  const [orderList, setOrderList] = useState<RetailOrder[]>(() => getStoredRetailOrders() as any);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<RetailOrder | null>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);

  const loadAllOrdersForAdmin = async () => {
    try {
      const [dbStoreOrders, allCustomOrders, fabs, srvs] = await Promise.all([
        fetchRetailOrdersFromDB(),
        fetchCustomOrders('All', true),
        fetch('/api/fabrication/requests').then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/services/requests').then(r => r.ok ? r.json() : []).catch(() => [])
      ]);
      setAllAdminCustomOrders(allCustomOrders || []);
      setAllAdminFabrications(Array.isArray(fabs) ? fabs : []);
      setAllAdminServices(Array.isArray(srvs) ? srvs : []);

      const retailStoreOrders = (dbStoreOrders || []).filter(
        (o: any) => !String(o.orderId || '').toUpperCase().startsWith('CUSTOM-')
      );
      retailStoreOrders.sort((a, b) => ((b as any).createdAt || 0) - ((a as any).createdAt || 0));
      setOrderList(retailStoreOrders as any);
    } catch (err) {
      console.warn('Error loading all orders for admin:', err);
    }
  };

  useEffect(() => {
    loadAllOrdersForAdmin();
    window.addEventListener('retail-orders-updated', loadAllOrdersForAdmin);
    window.addEventListener('custom-orders-updated', loadAllOrdersForAdmin);
    window.addEventListener('storage', loadAllOrdersForAdmin);
    return () => {
      window.removeEventListener('retail-orders-updated', loadAllOrdersForAdmin);
      window.removeEventListener('custom-orders-updated', loadAllOrdersForAdmin);
      window.removeEventListener('storage', loadAllOrdersForAdmin);
    };
  }, []);

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: string,
    customPct?: number
  ) => {
    let pct = customPct;
    if (pct === undefined) {
      switch (newStatus) {
        case 'Delivered':
          pct = 100;
          break;
        case 'Out for Delivery':
          pct = 90;
          break;
        case 'Shipped & In Transit':
        case 'Shipped':
          pct = 85;
          break;
        case 'Completed & Ready for Dispatch':
        case 'Packed':
          pct = 80;
          break;
        case 'In Production':
          pct = 60;
          break;
        case 'Processing Order':
        case 'Processing':
          pct = 25;
          break;
        case 'Order Placed & Processing':
        case 'Order Placed':
        case 'Pending':
          pct = 15;
          break;
        case 'Cancelled':
          pct = 0;
          break;
        default:
          pct = 50;
      }
    }

    if (orderId.startsWith('CUSTOM-')) {
      const customId = parseInt(orderId.replace('CUSTOM-', ''), 10);
      try {
        let backendStatus = 'In Production';
        if (newStatus === 'Delivered') backendStatus = 'Completed';
        else if (newStatus === 'Cancelled') backendStatus = 'Cancelled';
        else if (newStatus === 'Pending' || newStatus === 'Order Placed') backendStatus = 'Pending';
        await updateOrderStatus(customId, backendStatus as any);
      } catch (err) {
        console.warn('Could not update custom order status:', err);
      }
    } else {
      updateStoredRetailOrderCompletionStatus(orderId, newStatus, pct);
    }

    const updated = orderList.map(o =>
      o.orderId === orderId
        ? {
            ...o,
            orderStatus: (newStatus === 'Delivered' ? 'Delivered' : (newStatus === 'Cancelled' ? 'Cancelled' : 'Processing')) as any,
            completionStatus: newStatus,
            completionPercentage: pct
          }
        : o
    );
    setOrderList(updated as any);
    localStorage.setItem('retailsphere_retail_orders_v1', JSON.stringify(updated));
    localStorage.setItem('retail_orders_list', JSON.stringify(updated));
    window.dispatchEvent(new Event('retail-orders-updated'));
    setSuccessBanner(`Order #${orderId} completion status updated to "${newStatus}" (${pct}%)!`);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleAdminToggleLock = async (ord: CustomOrderData) => {
    await toggleLockOrderSpecifications(ord.custom_order_id);
    setSuccessBanner(`Customization Order #${ord.custom_order_id} specification lock toggled.`);
    setTimeout(() => setSuccessBanner(null), 5000);
    loadAllOrdersForAdmin();
  };

  const handleAdminOpenPriceModal = (ord: CustomOrderData) => {
    setSelectedCustomForAdminReview(ord);
    setAdminPriceInput(ord.estimated_price ? ord.estimated_price.toString() : '');
    setAdminReviewRemarks(ord.latest_remarks || '');
  };

  const handleAdminSubmitQuote = async (status: 'Approved' | 'Rejected') => {
    if (!selectedCustomForAdminReview) return;
    const priceNum = parseFloat(adminPriceInput);
    if (status === 'Approved' && (isNaN(priceNum) || priceNum <= 0)) {
      alert('Please enter a valid estimated price quote in ₹.');
      return;
    }
    await updateOrderStatus(selectedCustomForAdminReview.custom_order_id, status, priceNum, adminReviewRemarks);
    setSelectedCustomForAdminReview(null);
    setAdminPriceInput('');
    setAdminReviewRemarks('');
    setSuccessBanner(`Customization Order #${selectedCustomForAdminReview.custom_order_id} status updated to ${status}.`);
    setTimeout(() => setSuccessBanner(null), 5000);
    loadAllOrdersForAdmin();
  };

  const handleExportAnalyticsReport = () => {
    const readymadeStoreOrders = (orderList || []).filter(o => !String(o.orderId).startsWith('CUSTOM-') && o.orderStatus !== 'Cancelled' && o.paymentStatus !== 'Cancelled');
    const paidCustomOrdersList = (allAdminCustomOrders || []).filter(
      (co: any) => (co.payment_status || '').toLowerCase() === 'paid' || 
                   (co.order_status || '').toLowerCase() === 'paid' || 
                   (co.order_status || '').toLowerCase() === 'in production' || 
                   (co.order_status || '').toLowerCase() === 'completed'
    );
    const paidFabricationsList = (allAdminFabrications || []).filter(
      (f: any) => (f.status || f.review_status || '').toUpperCase() === 'PAID' ||
                   (f.status || f.review_status || '').toUpperCase() === 'IN_PRODUCTION' ||
                   (f.status || f.review_status || '').toUpperCase() === 'COMPLETED'
    );
    const paidServicesList = (allAdminServices || []).filter(
      (s: any) => (s.status || '').toUpperCase() === 'COMPLETED' ||
                   (s.status || '').toUpperCase() === 'PAID' ||
                   (s.status || '').toUpperCase() === 'WORKER_ASSIGNED'
    );

    const realStoreRevenue = readymadeStoreOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || o.total_price || o.price || 0), 0);
    const realCustomRevenue = paidCustomOrdersList.reduce((sum: number, co: any) => sum + (co.estimated_price || 0), 0);
    const realFabRevenue = paidFabricationsList.reduce((sum: number, f: any) => sum + (parseFloat(f.estimated_price) || 0), 0);
    const realServiceRevenue = paidServicesList.reduce((sum: number, s: any) => sum + (parseFloat(s.estimated_price) || 0), 0);
    const realGrossRevenue = realStoreRevenue + realCustomRevenue + realFabRevenue + realServiceRevenue;

    const totalOrdersCount = readymadeStoreOrders.length + paidCustomOrdersList.length + paidFabricationsList.length + paidServicesList.length;
    const completedOrdersCount = readymadeStoreOrders.filter((o: any) => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered').length + 
      paidCustomOrdersList.filter((co: any) => (co.order_status || '').toLowerCase() === 'completed').length +
      paidFabricationsList.filter((f: any) => (f.status || '').toUpperCase() === 'COMPLETED').length +
      paidServicesList.filter((s: any) => (s.status || '').toUpperCase() === 'COMPLETED').length;

    const activeCustomBuildsCount = (allAdminCustomOrders || []).filter(
      (co: any) => (co.order_status || '').toLowerCase() === 'in production' || (co.order_status || '').toLowerCase() === 'approved'
    ).length + (allAdminFabrications || []).filter(
      (f: any) => (f.status || '').toUpperCase() === 'IN_PRODUCTION'
    ).length;

    const csvContent = `Metric,Value\nGross Revenue,₹${realGrossRevenue}\nCatalog Revenue,₹${realStoreRevenue}\nCustomization Revenue,₹${realCustomRevenue}\nFabrication Revenue,₹${realFabRevenue}\nOn-Site Services Revenue,₹${realServiceRevenue}\nTotal Customer Orders & Requests,${totalOrdersCount}\nCompleted Orders & Visits,${completedOrdersCount}\nActive Workshop Builds,${activeCustomBuildsCount}\nTotal Registered System Accounts,${(allUsersList || []).length}\nReport Export Date,${new Date().toLocaleString()}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RetailSphere_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAnalyticsPDF = () => {
    const readymadeStoreOrders = (orderList || []).filter(o => !String(o.orderId).startsWith('CUSTOM-') && o.orderStatus !== 'Cancelled' && o.paymentStatus !== 'Cancelled');
    const paidCustomOrdersList = (allAdminCustomOrders || []).filter(
      (co: any) => (co.payment_status || '').toLowerCase() === 'paid' || 
                   (co.order_status || '').toLowerCase() === 'paid' || 
                   (co.order_status || '').toLowerCase() === 'in production' || 
                   (co.order_status || '').toLowerCase() === 'completed'
    );
    const paidFabricationsList = (allAdminFabrications || []).filter(
      (f: any) => (f.status || f.review_status || '').toUpperCase() === 'PAID' ||
                   (f.status || f.review_status || '').toUpperCase() === 'IN_PRODUCTION' ||
                   (f.status || f.review_status || '').toUpperCase() === 'COMPLETED'
    );
    const paidServicesList = (allAdminServices || []).filter(
      (s: any) => (s.status || '').toUpperCase() === 'COMPLETED' ||
                   (s.status || '').toUpperCase() === 'PAID' ||
                   (s.status || '').toUpperCase() === 'WORKER_ASSIGNED'
    );

    const realStoreRevenue = readymadeStoreOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || o.total_price || o.price || 0), 0);
    const realCustomRevenue = paidCustomOrdersList.reduce((sum: number, co: any) => sum + (co.estimated_price || 0), 0);
    const realFabRevenue = paidFabricationsList.reduce((sum: number, f: any) => sum + (parseFloat(f.estimated_price) || 0), 0);
    const realServiceRevenue = paidServicesList.reduce((sum: number, s: any) => sum + (parseFloat(s.estimated_price) || 0), 0);
    const realGrossRevenue = realStoreRevenue + realCustomRevenue + realFabRevenue + realServiceRevenue;

    const totalOrdersCount = readymadeStoreOrders.length + paidCustomOrdersList.length + paidFabricationsList.length + paidServicesList.length;
    const completedOrdersCount = readymadeStoreOrders.filter((o: any) => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered').length + 
      paidCustomOrdersList.filter((co: any) => (co.order_status || '').toLowerCase() === 'completed').length +
      paidFabricationsList.filter((f: any) => (f.status || '').toUpperCase() === 'COMPLETED').length +
      paidServicesList.filter((s: any) => (s.status || '').toUpperCase() === 'COMPLETED').length;

    const activeCustomBuildsCount = (allAdminCustomOrders || []).filter(
      (co: any) => (co.order_status || '').toLowerCase() === 'in production' || (co.order_status || '').toLowerCase() === 'approved'
    ).length;
    const totalUsersCount = (allUsersList || []).length;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const ordersRowsHTML = [
      ...(readymadeStoreOrders || []).map((o: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; font-weight: 700;">Catalog: ${(o.items && o.items[0]) ? o.items[0].name : 'Store Order'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">${o.orderId}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">Catalog Item</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; color: #2E7D32; font-weight: 800;">₹${(o.totalAmount || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">${o.orderStatus || 'Completed'}</td>
        </tr>
      `),
      ...(paidCustomOrdersList || []).map((co: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; font-weight: 700;">Custom ${co.furniture_type} (${co.material || 'Wood'})</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">CUSTOM-${co.custom_order_id}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">Bespoke Build</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; color: #2E7D32; font-weight: 800;">₹${(co.estimated_price || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">${co.order_status || 'In Production'}</td>
        </tr>
      `),
      ...(paidFabricationsList || []).map((f: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; font-weight: 700;">Fabrication: ${f.service_type || 'Custom Joinery'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">FAB-${f.fabrication_id}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">Workshop Fabrication</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; color: #B45309; font-weight: 800;">₹${(parseFloat(f.estimated_price) || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">${f.status || 'In Production'}</td>
        </tr>
      `),
      ...(paidServicesList || []).map((s: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; font-weight: 700;">Service: ${s.service_category || 'On-Site Service'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">ONS-${s.service_id}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">On-Site Installation</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE; color: #1D4ED8; font-weight: 800;">₹${(parseFloat(s.estimated_price) || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #EFE7DE;">${s.status || 'Completed'}</td>
        </tr>
      `)
    ].join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RetailSphere AI - Executive Business Analytics Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #2C241D;
              background: #FFF;
              margin: 0;
              padding: 40px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #38A132;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .brand {
              font-size: 24px;
              font-weight: 800;
              color: #2C241D;
            }
            .brand span {
              color: #38A132;
            }
            .title {
              font-size: 18px;
              font-weight: 800;
              color: #2C241D;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .meta {
              font-size: 12px;
              color: #7A6C5E;
              margin-top: 4px;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 35px;
            }
            .kpi-card {
              background: #FAF7F2;
              border: 1px solid #E2D7CB;
              border-radius: 16px;
              padding: 18px;
            }
            .kpi-label {
              font-size: 10px;
              font-weight: 800;
              color: #7A6C5E;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kpi-val {
              font-size: 22px;
              font-weight: 800;
              color: #2C241D;
              margin-top: 6px;
            }
            .kpi-sub {
              font-size: 11px;
              font-weight: 700;
              color: #38A132;
              margin-top: 4px;
            }
            .section-title {
              font-size: 15px;
              font-weight: 800;
              color: #2C241D;
              margin-bottom: 12px;
              border-left: 4px solid #38A132;
              padding-left: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              font-size: 12px;
            }
            th {
              background: #FAF7F2;
              color: #7A6C5E;
              text-transform: uppercase;
              font-size: 10px;
              font-weight: 800;
              text-align: left;
              padding: 10px;
              border-bottom: 2px solid #E2D7CB;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E2D7CB;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #7A6C5E;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">RetailSphere<span>AI</span></div>
              <div class="meta">Executive Financial & Operational Analytics</div>
            </div>
            <div style="text-align: right;">
              <div class="title">Official Executive Analytics PDF</div>
              <div class="meta">Generated: ${formattedDate}</div>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Gross Revenue</div>
              <div class="kpi-val">₹${realGrossRevenue.toLocaleString('en-IN')}</div>
              <div class="kpi-sub">Live Synced</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Orders</div>
              <div class="kpi-val">${totalOrdersCount}</div>
              <div class="kpi-sub">${completedOrdersCount} Delivered</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Custom Builds</div>
              <div class="kpi-val">${activeCustomBuildsCount} Active</div>
              <div class="kpi-sub">In Production Roster</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Registered Users</div>
              <div class="kpi-val">${totalUsersCount}</div>
              <div class="kpi-sub">Verified Accounts</div>
            </div>
          </div>

          <div class="section-title">Live Orders & Bespoke Custom Builds Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Item / Custom Specification</th>
                <th>Order Reference</th>
                <th>Channel</th>
                <th>Total Value</th>
                <th>Order Status</th>
              </tr>
            </thead>
            <tbody>
              ${ordersRowsHTML || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #7A6C5E;">No orders recorded.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <div>CONFIDENTIAL — FOR INTERNAL EXECUTIVE REVIEW ONLY</div>
            <div>RetailSphere AI Business Analytics Engine</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderColorSwatchBadge = (colorStr?: string) => {
    if (!colorStr) return <span className="font-bold text-[#2C241D]">Natural Finish</span>;
    const hexMatch = colorStr.match(/#(?:[0-9a-fA-F]{3}){1,2}/)?.[0] || null;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {hexMatch && (
          <span
            className="w-3.5 h-3.5 rounded-full inline-block border border-black/30 shadow-2xs shrink-0"
            style={{ backgroundColor: hexMatch }}
          />
        )}
        <span className="font-extrabold text-xs text-[#2C241D]">{colorStr}</span>
        {hexMatch && (
          <span className="px-2 py-0.5 rounded-md bg-[#38A132]/10 font-mono text-[10px] font-extrabold text-[#38A132] border border-[#38A132]/30">
            {hexMatch.toUpperCase()}
          </span>
        )}
      </div>
    );
  };

  const parseOrderSpecDetails = (ord: CustomOrderData) => {
    const fields: { label: string; value: string; isColor?: boolean; hex?: string | null }[] = [];

    let categoryName = 'Bespoke Custom Furniture';
    const typeLower = (ord.furniture_type || '').toLowerCase();
    if (typeLower.includes('sofa') || typeLower.includes('chair') || typeLower.includes('seat') || typeLower.includes('recliner') || typeLower.includes('daybed')) {
      categoryName = 'Sofas & Living Room Seating';
    } else if (typeLower.includes('table') || typeLower.includes('dining') || typeLower.includes('coffee')) {
      categoryName = 'Dining & Center Tables';
    } else if (typeLower.includes('desk') || typeLower.includes('office') || typeLower.includes('workstation')) {
      categoryName = 'Executive Desks & Workspace';
    } else if (typeLower.includes('bed') || typeLower.includes('headboard') || typeLower.includes('bedroom')) {
      categoryName = 'Bespoke Beds & Bedroom';
    } else if (typeLower.includes('cabinet') || typeLower.includes('credenza') || typeLower.includes('wardrobe')) {
      categoryName = 'Storage & Architectural Cabinets';
    }

    fields.push({ label: 'Furniture Category', value: categoryName });
    fields.push({ label: 'Specific Furniture Type', value: ord.furniture_type });
    fields.push({ label: 'Custom Dimensions', value: ord.dimensions });
    fields.push({ label: 'Primary Timber / Material', value: ord.material });

    let colorVal = ord.color || 'Natural Finish';
    let fabricVal = 'Standard Custom Finish';

    const matchParen = colorVal.match(/^(.*?)\s*\((.*?)\)$/);
    if (matchParen) {
      fabricVal = matchParen[1].trim();
      colorVal = matchParen[2].trim();
    }

    const hexMatch = colorVal.match(/#(?:[0-9a-fA-F]{3}){1,2}/);
    const hexCode = hexMatch ? hexMatch[0] : null;

    fields.push({ label: 'Upholstery Fabric / Texture Finish', value: fabricVal });
    fields.push({
      label: 'Color / Polish Finish',
      value: colorVal,
      isColor: true,
      hex: hexCode
    });

    if (ord.design_description) {
      const desc = ord.design_description;
      const aspectsMatch = desc.match(/Aspects:\s*\[(.*?)\]/);
      if (aspectsMatch && aspectsMatch[1]) {
        const pairs = aspectsMatch[1].split(';');
        pairs.forEach(pair => {
          const [k, v] = pair.split(':').map(s => s?.trim());
          if (k && v) {
            const formattedLabel = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            if (formattedLabel.toLowerCase() !== 'furniture category') {
              fields.push({ label: formattedLabel, value: v });
            }
          }
        });
      }

      const reqMatch = desc.match(/Special Requirements:\s*(.*)/i);
      if (reqMatch && reqMatch[1] && reqMatch[1].trim()) {
        fields.push({ label: 'Special Customer Requirements', value: reqMatch[1].trim() });
      } else if (!aspectsMatch && desc.trim()) {
        fields.push({ label: 'Custom Notes', value: desc.trim() });
      }
    }

    return fields;
  };

  // Staff & Admin Queries State
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [queryFilter, setQueryFilter] = useState<'All' | 'Pending' | 'Resolved'>('All');
  const [querySearchQuery, setQuerySearchQuery] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<StaffQuery | null>(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [adminResponseStatus, setAdminResponseStatus] = useState<'Pending' | 'In Review' | 'Approved' | 'Resolved'>('Approved');

  const loadQueriesFromDB = async () => {
    try {
      const dbQueries = await fetchQueriesFromDB();
      if (dbQueries && Array.isArray(dbQueries)) {
        setStaffQueries(dbQueries);
      } else {
        setStaffQueries([]);
      }
    } catch (err) {
      console.warn('Error loading DB queries in Admin:', err);
      setStaffQueries([]);
    }
  };

  useEffect(() => {
    loadQueriesFromDB();
  }, []);

  // Coupons Management State
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [newCouponType, setNewCouponType] = useState<string>('percentage_notification');
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('15');
  const [newCouponFlatAmount, setNewCouponFlatAmount] = useState('500');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponUserEmail, setNewCouponUserEmail] = useState('');
  const [newCouponAudience, setNewCouponAudience] = useState<string>('all');
  const [newCouponCustomerLimit, setNewCouponCustomerLimit] = useState('10');
  const [newCouponAutoAllot, setNewCouponAutoAllot] = useState(true);
  const [allotmentsList, setAllotmentsList] = useState<CouponAllotment[]>([]);

  // Admin Profile Modal & Password Update State
  const [isAdminProfileModalOpen, setIsAdminProfileModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '+91 98765 11223',
    department: 'Executive Administration & Management',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (currentUser.name || currentUser.email) {
      setProfileForm((prev) => ({
        ...prev,
        full_name: currentUser.name || 'Administrator',
        email: currentUser.email || 'admin@retailsphere.com',
        phone: '+91 98765 11223',
        department: 'Executive Administration & Management'
      }));
    }
  }, [currentUser]);

  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [newProdAvailableColors, setNewProdAvailableColors] = useState<string>('');

  // Handlers for Add Product
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameTrim = newProdName.trim();
    if (!nameTrim || nameTrim.length < 2) {
      alert('Please enter a valid product title (at least 2 characters).');
      return;
    }

    const priceVal = parseFloat(newProdPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      alert('Please enter a valid positive price amount (greater than ₹0).');
      return;
    }

    const qty = parseInt(newProdStock);
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid stock quantity (0 or greater).');
      return;
    }

    const imgUrl = newProdImage.trim() || undefined;

    const finalCategory = isCustomCategoryMode
      ? customCategoryInput.trim()
      : newProdCategory;
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

    try {
      const created = await createProductInDB({
        name: newProdName.trim(),
        category: finalCategory,
        material: finalMaterial || 'Solid Wood',
        color: finalColor || 'Natural Wood',
        available_colors: (newProdAvailableColors.trim() || finalColor || 'Natural Wood'),
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
      setSuccessBanner(`Product "${newItem.name}" added to catalog successfully!`);
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
      setSuccessBanner(`Product "${newItem.name}" added to catalog successfully!`);
    }

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
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Edit Product
  const handleOpenEditProduct = (prod: RetailProduct) => {
    setSelectedProduct(prod);
    setEditProdName(prod.name);
    setEditProdCategory(prod.category);
    setEditProdMaterial(prod.material);
    setEditProdPrice(prod.price.toString());
    setEditProdStock(prod.stockCount.toString());
    setIsEditProductModalOpen(true);
  };

  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !editProdName.trim()) return;

    const qty = parseInt(editProdStock) || 0;
    const priceVal = parseFloat(editProdPrice) || 0;

    let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (qty === 0) newStatus = 'Out of Stock';
    else if (qty < 5) newStatus = 'Low Stock';

    setProductList((prev) =>
      prev.map((p) =>
        p.id === selectedProduct.id
          ? {
              ...p,
              name: editProdName.trim(),
              category: editProdCategory,
              material: editProdMaterial.trim(),
              price: priceVal,
              stockCount: qty,
              status: newStatus,
            }
          : p
      )
    );

    setIsEditProductModalOpen(false);
    setSelectedProduct(null);
    setSuccessBanner(`Product "${editProdName}" details updated successfully!`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Delete Product
  const handleOpenDeleteModal = (prod: RetailProduct) => {
    setProductToDelete(prod);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    setProductList((prev) => prev.filter((p) => p.id !== productToDelete.id));
    setIsDeleteModalOpen(false);
    setSuccessBanner(`Product "${productToDelete.name}" removed from catalog.`);
    setProductToDelete(null);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Stock Control Modal
  const handleOpenStockModal = (item: RetailProduct) => {
    setStockItemToEdit(item);
    setNewStockVal(item.stockCount.toString());
    setIsStockModalOpen(true);
  };

  const handleSaveStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockItemToEdit) return;

    const qty = parseInt(newStockVal) || 0;
    let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (qty === 0) newStatus = 'Out of Stock';
    else if (qty < 5) newStatus = 'Low Stock';

    setProductList((prev) =>
      prev.map((item) => (item.id === stockItemToEdit.id ? { ...item, stockCount: qty, status: newStatus } : item))
    );

    const dbId = parseInt(stockItemToEdit.id.replace('inv-', '').replace('prod-', '')) || undefined;
    if (dbId) {
      try {
        await updateStockInDB(dbId, qty);
      } catch (err) {
        console.warn('Failed to update stock in DB:', err);
      }
    }

    setIsStockModalOpen(false);
    setStockItemToEdit(null);
    setSuccessBanner(`Stock quantity for "${stockItemToEdit.name}" updated to ${qty} units!`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError(null);
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      setStaffFormError('Staff name and email address are required.');
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const created = await createStaffUser({
        full_name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        phone: newStaffPhone.trim() || undefined,
        role_name: newStaffRole,
        password: newStaffPassword.trim() || undefined,
        skill_name: newStaffRole === 'Artisan Worker' ? newStaffWorkerSkill : undefined,
      });

      const newMember: StaffMember = {
        id: `staff-${created.user_id || Date.now()}`,
        user_id: created.user_id,
        name: created.full_name || newStaffName.trim(),
        email: created.email || newStaffEmail.trim(),
        phone: newStaffPhone.trim() || '+91 98765 43210',
        role: newStaffRole,
        skill: newStaffRole === 'Artisan Worker' ? newStaffWorkerSkill : undefined,
        status: 'Active',
        dateAdded: 'Just Now',
      };

      setStaffMembers((prev) => [newMember, ...prev]);
      setSuccessBanner(
        newStaffRole === 'Artisan Worker'
          ? `Artisan Worker "${newMember.name}" (${newStaffWorkerSkill}) created & added to workshop roster!`
          : `Staff user "${newMember.name}" created! Credentials emailed to ${newMember.email}.`
      );
      setIsAddStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNewStaffPassword('');
    } catch (err: any) {
      console.error('Error creating staff:', err);
      setStaffFormError(err.message || 'Failed to create account. Check if email already exists.');
    } finally {
      setIsSubmittingStaff(false);
      setTimeout(() => setSuccessBanner(null), 7000);
    }
  };

  // Handlers for Add/Edit Supplier
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
      setSuccessBanner(`Supplier "${newSupName.trim()}" details updated successfully!`);
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
        setSuccessBanner(`Supplier "${created.supplier_name}" added successfully!`);
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
        setSuccessBanner(`Supplier "${fallback.supplier_name}" added successfully!`);
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
    setTimeout(() => setSuccessBanner(null), 6000);
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

  // Handlers for Admin Query Response
  const handleOpenQueryModal = (query: StaffQuery) => {
    setSelectedQuery(query);
    setAdminResponseText(query.adminResponse || '');
    setAdminResponseStatus(query.status === 'Pending' ? 'Approved' : query.status);
  };

  const handleSendAdminResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuery || !adminResponseText.trim()) return;

    const numericId = parseInt(selectedQuery.id.replace('query-', ''), 10);
    if (!isNaN(numericId)) {
      try {
        await respondToStaffQueryInDB(numericId, adminResponseText, adminResponseStatus);
        await loadQueriesFromDB();
      } catch (err) {
        console.warn('Failed to update query in DB, fallback local update:', err);
        const updated = respondToStaffQuery(selectedQuery.id, adminResponseText, adminResponseStatus);
        setStaffQueries(updated);
      }
    } else {
      const updated = respondToStaffQuery(selectedQuery.id, adminResponseText, adminResponseStatus);
      setStaffQueries(updated);
    }

    setSelectedQuery(null);
    setSuccessBanner(`Admin response submitted for ${selectedQuery.staffName}'s request!`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  // Handlers for Create Coupon & Send Email
  const handleBatchDispatchCoupon = async (coupon: Coupon) => {
    await refreshCoupons();
    setSuccessBanner(`Promo coupon ${coupon.code} active for all eligible customers.`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

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
    if (!newCouponCode.trim()) return;

    const code = newCouponCode.trim().toUpperCase();
    const discountVal = parseInt(newCouponDiscount, 10) || 15;
    const flatVal = parseFloat(newCouponFlatAmount) || 500;
    const targetEmail = newCouponUserEmail.trim();
    const limitVal = parseInt(newCouponCustomerLimit, 10) || 10;

    try {
      await createCouponApi({
        code,
        coupon_type: newCouponType,
        discount_percent: newCouponType === 'flat_amount' ? 0 : discountVal,
        flat_discount_amount: newCouponType === 'flat_amount' ? flatVal : 0,
        description: newCouponDesc.trim() || (newCouponType === 'flat_amount' ? `₹${flatVal} OFF Flat Discount` : `${discountVal}% Off Discount`),
        customer_limit: newCouponType === 'first_n_customers' ? limitVal : undefined,
        target_user_email: targetEmail || undefined
      });

      setSuccessBanner(`Coupon "${code}" created successfully!`);
      await refreshCoupons();
      setNewCouponCode('');
      setNewCouponDesc('');
      setNewCouponUserEmail('');
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon.');
    }
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handleRemoveCoupon = async (id: string, code: string) => {
    try {
      await deleteCouponApi(id);
      await refreshCoupons();
      setSuccessBanner(`Coupon "${code}" deactivated successfully!`);
    } catch (err: any) {
      alert(err.message || 'Failed to remove coupon.');
    }
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleRegenerateCoupon = async (coupon: Coupon) => {
    try {
      await regenerateCouponApi(coupon.id);
      await refreshCoupons();
      setSuccessBanner(`⚡ Promo Coupon "${coupon.code}" reactivated!`);
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate coupon.');
    }
    setTimeout(() => setSuccessBanner(null), 5000);
  };
  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (profileForm.currentPassword || profileForm.newPassword || profileForm.confirmPassword) {
      if (!profileForm.currentPassword) {
        setPasswordError('Please enter your current password to confirm security updates.');
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
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.full_name = profileForm.full_name;
        parsed.email = profileForm.email;
        localStorage.setItem('user', JSON.stringify(parsed));
      }

      let initials = 'AD';
      if (profileForm.full_name) {
        const parts = profileForm.full_name.trim().split(' ');
        if (parts.length >= 2) {
          initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        } else if (parts[0].length >= 2) {
          initials = parts[0].substring(0, 2).toUpperCase();
        }
      }

      setCurrentUser({ name: profileForm.full_name, email: profileForm.email, initials });
      setProfileForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setIsAdminProfileModalOpen(false);
      setSuccessBanner('Admin profile & security credentials updated successfully!');
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update profile credentials.');
    }
  };

  const handleSendAdminMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMsgSubject.trim() || !adminMsgContent.trim()) return;

    sendAdminMessage({
      sender: currentUser.name || 'System Admin',
      recipientType: adminMsgRecipientType,
      targetEmail: adminMsgRecipientType === 'Specific Staff' ? adminMsgTargetEmail : undefined,
      subject: adminMsgSubject.trim(),
      message: adminMsgContent.trim(),
    });

    setAdminMessagesList(getStoredAdminMessages());
    setAdminMsgSubject('');
    setAdminMsgContent('');
    setAdminMsgTargetEmail('');
    setSuccessBanner('Official message dispatched from Admin successfully!');
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleOpenAuthorityModal = (targetEmail?: string, role?: string) => {
    const email = targetEmail || '';
    setAuthorityEmail(email);
    setAuthorityRole(role || 'Staff');
    const existing = getStoredUserAuthorities().find(a => a.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (existing) {
      setIsFullAdminChecked(existing.isFullAdmin);
      setSelectedCapabilities(existing.capabilities || []);
    } else {
      setIsFullAdminChecked(false);
      setSelectedCapabilities(['supplier_management', 'coupon_management']);
    }
    setIsAuthorityModalOpen(true);
  };

  const handleSaveAuthoritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorityEmail.trim()) return;

    const record: UserAuthorityRecord = {
      email: authorityEmail.trim(),
      role: authorityRole,
      isFullAdmin: isFullAdminChecked,
      capabilities: isFullAdminChecked ? CAPABILITY_DEFINITIONS.map(c => c.key) : selectedCapabilities,
      assignedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      assignedBy: currentUser.name || 'System Admin',
    };

    saveUserAuthority(record);
    setUserAuthoritiesList(getStoredUserAuthorities());
    setIsAuthorityModalOpen(false);
    setSuccessBanner(`Granted authority & capabilities assigned to ${authorityEmail}!`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Calculations for KPI summary cards
  const totalProducts = productList.length;
  const totalInStock = productList.reduce((acc, item) => acc + item.stockCount, 0);
  const lowStockProductsList = productList.filter((item) => item.stockCount < 5);
  const lowStockCount = lowStockProductsList.length;
  const activeOrdersCount = orderList.filter(o => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length;

  const displayProducts = productList.filter((item) => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    let matchesPrice = true;
    if (priceRangeFilter === '<10k') matchesPrice = item.price < 10000;
    else if (priceRangeFilter === '10k-25k') matchesPrice = item.price >= 10000 && item.price <= 25000;
    else if (priceRangeFilter === '25k-50k') matchesPrice = item.price > 25000 && item.price <= 50000;
    else if (priceRangeFilter === '50k+') matchesPrice = item.price > 50000;

    const q = (productSearchQuery || searchQuery).toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.material.toLowerCase().includes(q) ||
      (item.color && item.color.toLowerCase().includes(q));

    let matchesStockStatus = true;
    if (stockStatusFilter === 'Low Stock') {
      matchesStockStatus = item.stockCount > 0 && item.stockCount < 5;
    } else if (stockStatusFilter === 'Out of Stock') {
      matchesStockStatus = item.stockCount <= 0;
    } else if (stockStatusFilter === 'In Stock') {
      matchesStockStatus = item.stockCount >= 5;
    }

    return matchesCategory && matchesPrice && matchesSearch && matchesStockStatus;
  });

  const filteredSuppliers = supplierList.filter((s) => {
    if (!supplierSearchQuery.trim()) return true;
    const q = supplierSearchQuery.toLowerCase();
    const matchesBasic =
      s.supplier_name.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q));

    if (matchesBasic) return true;

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

  return (
    <div className="admin-theme relative min-h-screen bg-[#F7F2EB] text-[#2C2016] flex selection:bg-emerald-600 selection:text-white overflow-x-hidden font-sans">
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

      {/* Dynamic Ambient Luxury Warm Beige & Wood Glow Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[34rem] h-[34rem] bg-[#DECCA8]/75 rounded-full blur-[130px]" />
        <div className="absolute top-1/4 -right-32 w-[30rem] h-[30rem] bg-[#D4BC9E]/65 rounded-full blur-[130px]" />
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
                Admin
              </div>
            </div>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-3.5 text-xs max-h-[calc(100vh-140px)] overflow-y-auto pr-0.5 scrollbar-none">
          {/* SECTION: MAIN */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                  Main Dashboard
                </div>
              )}
            </div>

            {[
              { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
              { id: 'analytics', label: 'Revenue & Analytics', icon: TrendingUp, extraMatch: 'reports' },
              { id: 'alerts', label: 'Needs Attention', icon: AlertTriangle }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.extraMatch && activeTab === item.extraMatch);
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
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
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

          {/* SECTION: ORDERS & COMMERCE */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                  Orders & Commerce
                </div>
              )}
            </div>

            {[
              { id: 'orders', label: 'Orders & Requests', icon: ShoppingBag },
              { id: 'custom_orders', label: 'Customer Requests', icon: Sparkles },
              { id: 'coupons', label: 'Coupons & Discounts', icon: Tag },
              { id: 'queries', label: 'Queries & Requests', icon: MessageSquare }
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
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
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

          {/* SECTION: WORKSHOP & INVENTORY */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                  Workshop & Supply
                </div>
              )}
            </div>

            {[
              { id: 'inventory', label: 'Finished Goods Stock', icon: Boxes },
              { id: 'materials', label: 'Raw Materials Ledger', icon: Layers },
              { id: 'quality', label: 'Quality Assurance & QC', icon: ClipboardCheck },
              { id: 'fleet', label: 'Fleet & Vehicles', icon: Truck },
              { id: 'carriers', label: 'Carrier Partners', icon: Globe },
              { id: 'products', label: 'Product Catalog', icon: Package },
              { id: 'suppliers', label: 'Supplier Directory', icon: Briefcase }
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
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
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

          {/* SECTION: WORKFORCE & ACCESS */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                  Workforce & Access
                </div>
              )}
            </div>

            {[
              { id: 'users', label: 'Customer Directory', icon: UserCheck },
              { id: 'staff', label: 'Workers & Staff', icon: Users },
              { id: 'leaves', label: 'Staff & Worker Leaves', icon: CalendarCheck },
              { id: 'broadcast', label: 'Admin Directives', icon: Send },
              { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck }
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
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
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

          {/* SECTION: SYSTEM & GOVERNANCE */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                  System & Governance
                </div>
              )}
            </div>

            {[
              { id: 'audit', label: 'Audit & Activity Logs', icon: FileCheck2 },
              { id: 'export_excel', label: 'Export System Report', icon: Download, isAction: true, onClick: handleExportDatabaseExcel }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.isAction && item.onClick) {
                      item.onClick();
                    } else {
                      setActiveTab(item.id as any);
                    }
                    setHoveredSidebarTooltip(null);
                  }}
                  onMouseEnter={(e) => handleSidebarItemMouseEnter(e, item.label)}
                  onMouseLeave={handleSidebarItemMouseLeave}
                  title={!isSidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
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

          {/* SECTION: PLATFORM OVERSIGHT & INTELLIGENCE (Strictly Appended at End) */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                  Platform Oversight
                </div>
              )}
            </div>

            {[
              { id: 'reviews', label: 'Reviews & Feedback', icon: Star },
              { id: 'carrier_governance', label: 'Freight & Agreements', icon: FileSpreadsheet },
              { id: 'returns_cancellations', label: 'Returns & Cancellations', icon: Undo2 },
              { id: 'machines', label: 'Machinery & Equipment', icon: Cpu },
              { id: 'ai_logs', label: 'AI Intelligence Logs', icon: Sparkles }
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
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2'} rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer overflow-hidden ${
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
        </nav>
      </aside>

      {/* MAIN RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top Header */}
        <div className="md:hidden bg-[#F1E8DC]/95 backdrop-blur-xl border-b border-[#DFD2C0] p-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2">
            <img
              src="/retailsphere_logo.jpg"
              alt="RetailSphere AI Logo"
              className="w-8 h-8 rounded-full object-cover border border-[#DFD2C0]"
            />
            <span className="font-extrabold text-sm text-[#2C2016]">Admin Suite</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60vw] scrollbar-none">
            {['overview', 'orders', 'custom_orders', 'inventory', 'materials', 'staff'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap capitalize transition-all ${
                  activeTab === tab ? 'bg-[#15803d] text-white shadow-xs' : 'bg-[#E5D7C5] text-[#5C4532]'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <main className={`space-y-6 w-full transition-all duration-300 ${
          isSidebarCollapsed 
            ? 'p-3 sm:p-5 lg:p-6 max-w-none' 
            : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'
        }`}>
          <div className="ultra-glass-panel rounded-3xl p-4 sm:p-6 lg:p-7 space-y-6 relative border border-[#DECDB7] shadow-[0_12px_40px_rgba(58,40,24,0.04)] bg-[#FCF9F3]/95 backdrop-blur-2xl w-full">

            {/* SUCCESS NOTICE BANNER */}
            {successBanner && (
              <div className="bg-[#EDE2D0] border border-[#D0BEA9] text-[#166534] p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between animate-fadeIn relative z-20 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#166534] flex-shrink-0" />
                  <span>{successBanner}</span>
                </div>
                <button onClick={() => setSuccessBanner(null)} className="text-[#166534] hover:text-[#0f4422] p-1 rounded-lg hover:bg-[#DBC9B5] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TOP HEADER CONTROLS IN MAIN CONTENT AREA */}
            <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#DFD0BD]/80 pb-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#2C2016] tracking-tight">
                  {activeTab === 'overview' && 'Dashboard Overview'}
                  {activeTab === 'analytics' && 'Revenue & Analytics'}
                  {activeTab === 'users' && 'Customer Directory'}
                  {activeTab === 'staff' && 'Workers & Staff'}
                  {activeTab === 'leaves' && 'Leave Management'}
                  {activeTab === 'products' && 'Product Catalog'}
                  {activeTab === 'inventory' && 'Finished Goods Stock'}
                  {activeTab === 'suppliers' && 'Supplier Directory'}
                  {activeTab === 'orders' && 'Orders & Requests'}
                  {activeTab === 'custom_orders' && 'Customer Requests'}
                  {activeTab === 'alerts' && 'Needs Attention'}
                  {activeTab === 'queries' && 'Queries & Requests'}
                  {activeTab === 'coupons' && 'Coupons & Discounts'}
                  {activeTab === 'broadcast' && 'Admin Directives'}
                  {activeTab === 'materials' && 'Raw Materials Ledger'}
                  {activeTab === 'quality' && 'Quality Assurance & QC'}
                  {activeTab === 'fleet' && 'Fleet & Vehicles'}
                  {activeTab === 'carriers' && 'Carrier Partners'}
                  {activeTab === 'roles' && 'Roles & Permissions'}
                  {activeTab === 'requests' && 'Customer Requests'}
                  {activeTab === 'production' && 'Production Control'}
                  {activeTab === 'fabrication' && 'Fabrication Center'}
                  {activeTab === 'onsite' && 'Onsite Assembly'}
                  {activeTab === 'workers' && 'Artisans & Field Workers'}
                  {activeTab === 'customers' && 'Customer Directory'}
                  {activeTab === 'payments' && 'Payments & Settlements'}
                  {activeTab === 'fulfillment' && 'Order Fulfillment'}
                  {activeTab === 'returns' && 'Returns & Replacements'}
                  {activeTab === 'communication' && 'Communications'}
                  {activeTab === 'reports' && 'Business Reports'}
                  {activeTab === 'audit' && 'System Audit & Activity Logs'}
                  {activeTab === 'reviews' && 'Customer Reviews & Feedback'}
                  {activeTab === 'carrier_governance' && 'Logistics Agreements & Freight'}
                  {activeTab === 'returns_cancellations' && 'Returns, Replacements & Cancellations'}
                  {activeTab === 'machines' && 'Workshop Machinery & Equipment'}
                  {activeTab === 'ai_logs' && 'AI Intelligence & Execution Logs'}
                </h1>
                <p className="text-xs text-[#7A6350] mt-1 font-medium">
                  {activeTab === 'overview' && 'Live store overview, revenue metrics, and order operations.'}
                  {activeTab === 'analytics' && 'Track overall store revenue, order volume, and performance reports.'}
                  {activeTab === 'users' && 'Manage registered customer accounts and access.'}
                  {activeTab === 'staff' && 'Manage retail staff, production team, and artisan workers.'}
                  {activeTab === 'leaves' && 'Review and manage worker leave applications.'}
                  {activeTab === 'products' && 'Manage catalog products, pricing, and stock levels.'}
                  {activeTab === 'inventory' && 'Monitor finished furniture inventory and catalog stock.'}
                  {activeTab === 'materials' && 'Manage raw materials ledger, wood stock, and procurement.'}
                  {activeTab === 'quality' && 'Monitor quality inspection stages and tolerance checklists.'}
                  {activeTab === 'suppliers' && 'Manage raw materials suppliers and procurement channels.'}
                  {activeTab === 'orders' && 'Track ready-made orders and fulfillment status.'}
                  {activeTab === 'custom_orders' && 'Review and manage custom furniture specifications.'}
                  {activeTab === 'alerts' && 'Operational alerts requiring administrative attention.'}
                  {activeTab === 'queries' && 'Respond to customer inquiries and support requests.'}
                  {activeTab === 'coupons' && 'Create and manage discount promotional coupons.'}
                  {activeTab === 'broadcast' && 'Publish system directives and staff notices.'}
                  {activeTab === 'fleet' && 'Manage delivery fleet vehicles and driver allocations.'}
                  {activeTab === 'carriers' && 'Manage 3PL courier partners and shipping methods.'}
                  {activeTab === 'roles' && 'Configure role-based access permissions.'}
                  {activeTab === 'audit' && 'Comprehensive live tracking of administrative changes, security actions, and user events.'}
                  {activeTab === 'reviews' && 'Monitor verified buyer reviews, ratings distribution, and moderate storefront feedback.'}
                  {activeTab === 'carrier_governance' && 'Carrier partner contracts, tariff rate cards, freight settlements, and driver email requests.'}
                  {activeTab === 'returns_cancellations' && 'Audit customer return claims, replacement dispatches, and order cancellation ledger.'}
                  {activeTab === 'machines' && 'Factory floor CNC machinery, operational availability, and preventive maintenance records.'}
                  {activeTab === 'ai_logs' && 'System-wide AI execution logs for computer vision, 2D sheet cutting optimizer, and material inspections.'}
                  {activeTab === 'requests' && 'Review custom build inquiries and quotations.'}
                  {activeTab === 'production' && 'Track workshop production and active jobs.'}
                  {activeTab === 'fabrication' && 'Manage fabrication and joinery milestones.'}
                  {activeTab === 'onsite' && 'Coordinate delivery and onsite assembly.'}
                  {activeTab === 'workers' && 'Manage workshop craftsmen and crew.'}
                  {activeTab === 'customers' && 'Search customer records and order logs.'}
                  {activeTab === 'payments' && 'View transaction history and accounting ledgers.'}
                  {activeTab === 'fulfillment' && 'Track order packing and shipping transit.'}
                  {activeTab === 'returns' && 'Process returns and warranty claims.'}
                  {activeTab === 'communication' && 'Central messaging and direct alerts.'}
                  {activeTab === 'reports' && 'Export detailed performance and sales reports.'}
                </p>
              </div>

              {/* Global Search + Controls */}
              <div className="flex items-center gap-2.5 self-start lg:self-auto flex-wrap sm:flex-nowrap">
                {/* Global Search Field with Autocomplete */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8F7864]" />
                  <input
                    type="text"
                    placeholder="Search anything (ID, User, SKU)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#F1E8DC] border border-[#D8C7B4] rounded-xl text-xs font-medium focus:outline-none focus:border-[#166534] focus:bg-[#FFFDF9] focus:ring-4 focus:ring-emerald-600/10 shadow-2xs text-[#2C2016] transition-all placeholder:text-[#8F7864]"
                  />
                  {isSearchDropdownOpen && globalSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-[#FCF9F3]/95 backdrop-blur-2xl border border-[#D8C7B4] rounded-2xl shadow-2xl p-2 z-[100] max-h-72 overflow-y-auto space-y-1 animate-fadeIn">
                      <div className="px-3 py-1.5 text-[10px] font-black text-[#8F745D] uppercase border-b border-[#DFD0BD] font-mono">
                        Search Matches ({globalSearchResults.length})
                      </div>
                      {globalSearchResults.map((res) => (
                        <div
                          key={`${res.type}-${res.id}`}
                          onClick={() => {
                            setIsSearchDropdownOpen(false);
                            if (res.type === 'Order') setActiveTab('orders');
                            else if (res.type === 'Customization') setActiveTab('custom_orders');
                            else if (res.type === 'Product') setActiveTab('products');
                            else if (res.type === 'User') setActiveTab('users');
                          }}
                          className="p-2.5 rounded-xl hover:bg-[#EFE5D7] cursor-pointer transition-colors border border-transparent hover:border-[#D8C7B4]"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-[#2C2016]">
                            <span>{res.title}</span>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-[#E5D7C5] text-[#166534] uppercase border border-[#D4C1AB]">
                              {res.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7A6350] mt-0.5">{res.subtitle}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Export Data Button */}
                <button
                  onClick={handleExportDatabaseExcel}
                  disabled={isExportingExcel}
                  className="px-3.5 py-2 rounded-xl bg-[#2C2016] hover:bg-[#1A130C] text-[#FAF5ED] font-bold text-xs flex items-center gap-2 border border-[#483726] shadow-sm transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-60"
                  title="Export full system report to Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5 text-[#DFCDBD]" />
                  <span className="hidden sm:inline">{isExportingExcel ? 'Exporting...' : 'Export'}</span>
                </button>

                {/* Notification Bell Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setIsUserMenuOpen(false);
                    }}
                    className="relative p-2.5 rounded-xl bg-[#F1E8DC] border border-[#D8C7B4] hover:border-[#166534] text-[#6B5542] transition-all shadow-2xs flex items-center justify-center cursor-pointer hover:bg-[#E6DAC8]"
                    title="System Notifications"
                  >
                    <Bell className="w-4 h-4 text-[#6B5542]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#15803d] text-white font-black text-[9px] rounded-full flex items-center justify-center animate-pulse ring-2 ring-[#FAF5ED]">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#FCF9F3]/95 backdrop-blur-2xl border border-[#D8C7B4] rounded-2xl shadow-2xl p-3 z-[100] animate-fadeIn space-y-2">
                      <div className="flex items-center justify-between border-b border-[#DFD0BD] pb-2">
                        <span className="font-bold text-xs text-[#2C2016]">System Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={async () => {
                              setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                              await markAllNotificationsReadInDB();
                            }}
                            className="text-[10px] font-bold text-[#166534] hover:underline cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-64 overflow-y-auto text-xs">
                        {notifications.filter(n => n.unread).length === 0 ? (
                          <div className="p-4 text-center text-[#8F7864]">
                            <CheckCircle2 className="w-6 h-6 text-[#15803d] mx-auto opacity-70 mb-1" />
                            <p className="text-xs font-bold text-[#2C2016]">No new notifications</p>
                            <p className="text-[10px] text-[#8F7864]">All systems are currently normal</p>
                          </div>
                        ) : (
                          notifications.filter(n => n.unread).map(n => (
                            <div
                              key={n.id}
                              className="p-2.5 rounded-xl border border-[#D0BEA9] bg-[#F1E8DC] font-medium transition-all space-y-1 relative"
                            >
                              <div className="flex items-center justify-between text-[11px] mb-0.5">
                                <span className="font-bold text-[#2C2016] pr-2">{n.title}</span>
                                <span className="text-[10px] text-[#8F7864] flex-shrink-0">{n.time}</span>
                              </div>
                              <p className="text-[11px] text-[#6B5542] leading-snug font-normal">{n.message}</p>
                              <div className="pt-1 flex items-center justify-end">
                                <button
                                  onClick={async () => {
                                    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, unread: false } : item));
                                    await markNotificationReadInDB(n.notification_id || n.id);
                                  }}
                                  className="text-[10px] font-bold text-[#166534] hover:text-[#0f4422] hover:underline inline-flex items-center gap-1 cursor-pointer"
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

                {/* Admin Profile Pill */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#F1E8DC] border border-[#D8C7B4] hover:border-[#166534] transition-all shadow-2xs cursor-pointer hover:bg-[#E6DAC8]"
                    title="Click for profile and sign out options"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#166534] via-[#15803d] to-[#16a34a] text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
                      {currentUser.initials}
                    </div>
                    <span className="text-xs font-bold text-[#2C2016] hidden sm:inline">
                      {currentUser.name || 'Administrator'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#8F7864] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#166534]' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#FCF9F3]/95 backdrop-blur-2xl border border-[#D8C7B4] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                      <button
                        onClick={() => {
                          setIsAdminProfileModalOpen(true);
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#2C2016] hover:bg-[#EFE5D7] transition-colors text-left cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[#166534]" />
                        <span>View Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-600" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TAB OVERVIEW: SYSTEM-WIDE EXECUTIVE CONTROL CENTER */}
            {activeTab === 'overview' && (
              <div className="space-y-6 relative z-10">
                {/* Top Level Business Metrics KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="admin-kpi-card space-y-2 bg-[#FAF5ED] border border-[#DECDB7] hover:border-[#BCA389] rounded-2xl p-5 shadow-xs transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#8F745D] font-mono">Total Revenue</span>
                      <div className="w-8 h-8 rounded-xl bg-[#EADDCB] border border-[#D8C7B2] flex items-center justify-center text-[#166534]">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-[#2C2016] tracking-tight">
                      ₹{(dashboardSummary?.revenue_metrics?.total_revenue || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] font-bold text-[#166534] bg-[#EDE2D0] px-2 py-0.5 rounded-full border border-[#D0BEA9] inline-block">
                      Verified Payments
                    </span>
                  </div>

                  <div className="admin-kpi-card space-y-2 bg-[#FAF5ED] border border-[#DECDB7] hover:border-[#BCA389] rounded-2xl p-5 shadow-xs transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#8F745D] font-mono">Total Orders</span>
                      <div className="w-8 h-8 rounded-xl bg-[#EADDCB] border border-[#D8C7B2] flex items-center justify-center text-blue-600">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-[#2C2016] tracking-tight">
                      {dashboardSummary?.business_metrics?.total_orders || orderList.length}
                    </div>
                    <span className="text-[10px] font-bold text-blue-800 bg-[#EDE2D0] px-2 py-0.5 rounded-full border border-[#D0BEA9] inline-block">
                      Ready-made & Custom Builds
                    </span>
                  </div>

                  <div className="admin-kpi-card space-y-2 bg-[#FAF5ED] border border-[#DECDB7] hover:border-[#BCA389] rounded-2xl p-5 shadow-xs transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#8F745D] font-mono">Active Customers</span>
                      <div className="w-8 h-8 rounded-xl bg-[#EADDCB] border border-[#D8C7B2] flex items-center justify-center text-purple-600">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-[#2C2016] tracking-tight">
                      {dashboardSummary?.business_metrics?.active_customers || allUsersList.length}
                    </div>
                    <span className="text-[10px] font-bold text-purple-800 bg-[#EDE2D0] px-2 py-0.5 rounded-full border border-[#D0BEA9] inline-block">
                      Registered Accounts
                    </span>
                  </div>

                  <div className="admin-kpi-card space-y-2 bg-[#FAF5ED] border border-[#DECDB7] hover:border-[#BCA389] rounded-2xl p-5 shadow-xs transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#8F745D] font-mono">Low Stock Warnings</span>
                      <div className="w-8 h-8 rounded-xl bg-[#F2E5D5] border border-[#DFCBB5] flex items-center justify-center text-[#d97706]">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-[#b45309] tracking-tight">
                      {dashboardSummary?.business_metrics?.low_stock_items || lowStockCount}
                    </div>
                    <span className="text-[10px] font-bold text-[#854d0e] bg-[#F2E5D5] px-2 py-0.5 rounded-full border border-[#DFCBB5] inline-block">
                      Under Reorder Level
                    </span>
                  </div>
                </div>

                {/* Revenue Analytics & Period Selector Card */}
                <div className="rounded-3xl p-6 space-y-4 border border-[#DFD0BD] shadow-xs bg-[#F7F0E5]/90 backdrop-blur-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#DFD0BD]/80 pb-4">
                    <div>
                      <h4 className="font-bold text-sm text-[#2C2016] flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#E5D7C5] border border-[#D4C1AB] flex items-center justify-center text-[#166534]">
                          <DollarSign className="w-3.5 h-3.5" />
                        </div>
                        <span>Revenue & Financial Performance Overview</span>
                      </h4>
                      <p className="text-[11px] text-[#7A6350] font-medium">Calculated strictly from verified completed payments. Excludes cart values and unpaid quotes.</p>
                    </div>

                    {/* Timeframe Selector Pills */}
                    <div className="flex items-center gap-1 bg-[#EAE0D0] p-1 rounded-xl border border-[#D5C4AF]">
                      {[
                        { key: 'today', label: 'Today' },
                        { key: '7days', label: '7 Days' },
                        { key: '30days', label: '30 Days' },
                        { key: 'this_month', label: 'This Month' },
                        { key: 'this_year', label: 'This Year' }
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={async () => {
                            setAnalyticsTimeframe(key);
                            const rev = await fetchRevenueAnalyticsDB(key);
                            if (rev) setRevenueAnalytics(rev);
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            analyticsTimeframe === key
                              ? 'bg-[#15803d] text-white shadow-xs'
                              : 'text-[#6B5542] hover:text-[#2C2016] hover:bg-[#FAF5ED]/80'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#FAF5ED] p-4 rounded-2xl border border-[#DECDB7] space-y-1">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">
                        {analyticsTimeframe === 'today' ? "Today's Revenue" :
                         analyticsTimeframe === '7days' ? '7-Day Revenue' :
                         analyticsTimeframe === '30days' ? '30-Day Revenue' :
                         analyticsTimeframe === 'this_month' ? 'This Month Revenue' :
                         analyticsTimeframe === 'this_year' ? 'This Year Revenue' : 'Period Revenue'}
                      </span>
                      <div className="text-xl font-black text-[#15803d] tracking-tight">
                        ₹{(revenueAnalytics?.total_revenue ?? (analyticsTimeframe === 'today' ? dashboardSummary?.revenue_metrics?.todays_revenue : analyticsTimeframe === 'this_month' ? dashboardSummary?.revenue_metrics?.this_month_revenue : dashboardSummary?.revenue_metrics?.total_revenue) ?? 0).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] font-bold text-[#166534] block">
                        {revenueAnalytics?.order_count ?? 0} Paid Order{(revenueAnalytics?.order_count ?? 0) === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="bg-[#FAF5ED] p-4 rounded-2xl border border-[#DECDB7] space-y-1">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">Net Realized Revenue</span>
                      <div className="text-xl font-black text-[#2C2016] tracking-tight">
                        ₹{((revenueAnalytics?.net_revenue ?? ((revenueAnalytics?.total_revenue ?? 0) - (revenueAnalytics?.refund_amount ?? 0))) || 0).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] font-bold text-[#7A6350] block">
                        After processed refunds
                      </span>
                    </div>

                    <div className="bg-[#FAF5ED] p-4 rounded-2xl border border-[#DECDB7] space-y-1">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">Average Order Value</span>
                      <div className="text-xl font-black text-purple-700 tracking-tight">
                        ₹{(revenueAnalytics?.average_order_value || 0).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 block">
                        Per completed payment
                      </span>
                    </div>

                    <div className="bg-[#FAF5ED] p-4 rounded-2xl border border-[#DECDB7] space-y-1">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">
                        {analyticsTimeframe === 'today' ? "Today's Refunds" :
                         analyticsTimeframe === '7days' ? '7-Day Refunds' :
                         analyticsTimeframe === '30days' ? '30-Day Refunds' :
                         analyticsTimeframe === 'this_month' ? 'This Month Refunds' :
                         analyticsTimeframe === 'this_year' ? 'This Year Refunds' : 'Period Refunds'}
                      </span>
                      <div className="text-xl font-black text-rose-600 tracking-tight">
                        ₹{(revenueAnalytics?.refund_amount || 0).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] font-bold text-rose-600 block">
                        Approved returns
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Operational Order & Production Pipeline */}
                <div className="rounded-3xl p-6 space-y-4 border border-[#DFD0BD] shadow-xs bg-[#F7F0E5]/90 backdrop-blur-xl">
                  <h4 className="font-bold text-sm text-[#2C2016] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#E5D7C5] border border-[#D4C1AB] flex items-center justify-center text-blue-700">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <span>Live Order & Custom Production Pipeline</span>
                  </h4>

                  {/* Stage Pipeline Progress Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-[#FAF5ED] p-3.5 rounded-2xl border border-[#DECDB7] space-y-1.5 text-center hover:bg-[#EFE5D7] transition-colors">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">Order Placed</span>
                      <div className="text-xl font-black text-[#2C2016]">{dashboardSummary?.order_status_counts?.Placed || 0}</div>
                      <span className="text-[9px] font-bold text-blue-800 bg-[#EDE2D0] px-2 py-0.5 rounded-full border border-[#D0BEA9] inline-block">New Orders</span>
                    </div>

                    <div className="bg-[#FAF5ED] p-3.5 rounded-2xl border border-[#DECDB7] space-y-1.5 text-center hover:bg-[#EFE5D7] transition-colors">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">Tech Review</span>
                      <div className="text-xl font-black text-[#2C2016]">{dashboardSummary?.production_status_summary?.technical_assessment || 0}</div>
                      <span className="text-[9px] font-bold text-[#854d0e] bg-[#F2E5D5] px-2 py-0.5 rounded-full border border-[#DFCBB5] inline-block">Assessment</span>
                    </div>

                    <div className="bg-[#FAF5ED] p-3.5 rounded-2xl border border-[#DECDB7] space-y-1.5 text-center hover:bg-[#EFE5D7] transition-colors">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">Quotation</span>
                      <div className="text-xl font-black text-[#2C2016]">{dashboardSummary?.production_status_summary?.customer_approval || 0}</div>
                      <span className="text-[9px] font-bold text-purple-800 bg-[#EDE2D0] px-2 py-0.5 rounded-full border border-[#D0BEA9] inline-block">Approval</span>
                    </div>

                    <div className="bg-[#FAF5ED] p-3.5 rounded-2xl border border-[#DECDB7] space-y-1.5 text-center hover:bg-[#EFE5D7] transition-colors">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">In Production</span>
                      <div className="text-xl font-black text-[#15803d]">{dashboardSummary?.production_status_summary?.in_production || 0}</div>
                      <span className="text-[9px] font-bold text-[#166534] bg-[#EDE2D0] px-2 py-0.5 rounded-full border border-[#D0BEA9] inline-block">Workstation</span>
                    </div>

                    <div className="bg-[#FAF5ED] p-3.5 rounded-2xl border border-[#DECDB7] space-y-1.5 text-center hover:bg-[#EFE5D7] transition-colors">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">QC Pending</span>
                      <div className="text-xl font-black text-[#b45309]">{dashboardSummary?.production_status_summary?.qc_pending || 0}</div>
                      <span className="text-[9px] font-bold text-[#854d0e] bg-[#F2E5D5] px-2 py-0.5 rounded-full border border-[#DFCBB5] inline-block">Inspection</span>
                    </div>

                    <div className="bg-[#FAF5ED] p-3.5 rounded-2xl border border-[#DECDB7] space-y-1.5 text-center hover:bg-[#EFE5D7] transition-colors">
                      <span className="text-[10px] font-black text-[#8F745D] uppercase font-mono">Delivered</span>
                      <div className="text-xl font-black text-[#15803d]">{dashboardSummary?.order_status_counts?.Delivered || 0}</div>
                      <span className="text-[9px] font-bold text-[#166534] bg-[#EDE2D0] px-2 py-0.5 rounded-full border border-[#D0BEA9] inline-block">Completed</span>
                    </div>
                  </div>
                </div>

                {/* Production Workstation Bottlenecks & Needs Attention Alert Center */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Workstation Bottlenecks Card */}
                  <div className="rounded-3xl p-6 space-y-4 border border-[#DFD0BD] shadow-xs bg-[#F7F0E5]/90 backdrop-blur-xl">
                    <h4 className="font-bold text-sm text-[#2C2016] flex items-center justify-between border-b border-[#DFD0BD]/80 pb-3">
                      <span className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#E5D7C5] border border-[#D4C1AB] flex items-center justify-center text-[#166534]">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <span>Production Stage Bottlenecks</span>
                      </span>
                      <span className="text-[10px] font-bold bg-[#E5D7C5] text-[#166534] px-2.5 py-0.5 rounded-full border border-[#D4C1AB]">
                        {bottlenecksList.length} Stages Monitored
                      </span>
                    </h4>

                    <div className="space-y-2.5">
                      {bottlenecksList.length === 0 ? (
                        <div className="p-4 text-center text-[#8F7864] text-xs italic">
                          No production bottlenecks detected across shop floor workstations.
                        </div>
                      ) : (
                        bottlenecksList.map((bot) => (
                          <div key={bot.stage} className="bg-[#FAF5ED] p-3.5 rounded-2xl border border-[#DECDB7] flex items-center justify-between">
                            <div>
                              <h5 className="font-bold text-xs text-[#2C2016]">{bot.stage} Stage</h5>
                              <p className="text-[11px] text-[#7A6350] font-medium">
                                {bot.pending_jobs} pending • {bot.in_progress_jobs} active • {bot.assigned_workers_count} artisans
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                              bot.risk === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              bot.risk === 'MEDIUM' ? 'bg-[#F2E5D5] text-[#854d0e] border-[#DFCBB5]' :
                              'bg-[#EDE2D0] text-[#166534] border-[#D0BEA9]'
                            }`}>
                              {bot.risk} RISK
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Operational Alerts / Needs Attention Card */}
                  <div className="rounded-3xl p-6 space-y-4 border border-[#DFD0BD] shadow-xs bg-[#F7F0E5]/90 backdrop-blur-xl">
                    <h4 className="font-bold text-sm text-[#2C2016] flex items-center justify-between border-b border-[#DFD0BD]/80 pb-3">
                      <span className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#F2E5D5] border border-[#DFCBB5] flex items-center justify-center text-[#d97706]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <span>Operational Alert Center ("Needs Attention")</span>
                      </span>
                      <span className="text-[10px] font-bold bg-[#F2E5D5] text-[#854d0e] px-2.5 py-0.5 rounded-full border border-[#DFCBB5]">
                        {(dashboardSummary?.alerts || []).length} Active Alerts
                      </span>
                    </h4>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto">
                      {(dashboardSummary?.alerts || []).length === 0 ? (
                        <div className="p-4 text-center text-[#8F7864] text-xs italic">
                          All operations clear! No critical delays, QC failures, or inventory issues.
                        </div>
                      ) : (
                        (dashboardSummary?.alerts || []).map((alt) => (
                          <div key={alt.id} className="bg-[#F6EADB] p-3.5 rounded-2xl border border-[#DECAB3] flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h5 className="font-bold text-xs text-[#2C2016]">{alt.title}</h5>
                              <p className="text-[11px] text-[#6B5542] mt-0.5">{alt.description}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB ANALYTICS: EXECUTIVE BUSINESS ANALYTICS & PERFORMANCE REPORTS */}
            {activeTab === 'analytics' && (() => {
                // 1. Filter Orders by Timeframe
                const now = new Date();
                const getTimeframeStartDate = () => {
                  if (analyticsTimeframe === 'today') {
                    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  }
                  if (analyticsTimeframe === '7days') {
                    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  }
                  if (analyticsTimeframe === '30days') {
                    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  }
                  if (analyticsTimeframe === 'this_month') {
                    return new Date(now.getFullYear(), now.getMonth(), 1);
                  }
                  if (analyticsTimeframe === 'this_year') {
                    return new Date(now.getFullYear(), 0, 1);
                  }
                  return new Date(0); // All time
                };

                const filterStartDate = getTimeframeStartDate();

                const isDateInTimeframe = (dateStr?: string | null) => {
                  if (analyticsTimeframe === 'all') return true;
                  if (!dateStr) return true;
                  const d = new Date(dateStr);
                  if (isNaN(d.getTime())) return true;
                  return d >= filterStartDate;
                };

                // Stream 1: Catalog Store Orders
                const readymadeStoreOrders = (orderList || []).filter(
                  o => !String(o.orderId).startsWith('CUSTOM-') && 
                       o.orderStatus !== 'Cancelled' && 
                       o.paymentStatus !== 'Cancelled' &&
                       isDateInTimeframe((o as any).createdAt || o.orderDate)
                );

                // Stream 2: Bespoke Custom Furniture Orders
                const paidCustomOrdersList = (allAdminCustomOrders || []).filter(
                  (co: any) => ((co.payment_status || '').toLowerCase() === 'paid' || 
                               (co.order_status || '').toLowerCase() === 'paid' || 
                               (co.order_status || '').toLowerCase() === 'in production' || 
                               (co.order_status || '').toLowerCase() === 'completed') &&
                               isDateInTimeframe(co.order_date || co.created_at)
                );

                // Stream 3: Timber & Metal Fabrications
                const paidFabricationsList = (allAdminFabrications || []).filter(
                  (f: any) => ((f.status || f.review_status || '').toUpperCase() === 'PAID' ||
                               (f.status || f.review_status || '').toUpperCase() === 'IN_PRODUCTION' ||
                               (f.status || f.review_status || '').toUpperCase() === 'COMPLETED') &&
                               isDateInTimeframe(f.created_at || f.date)
                );

                // Stream 4: On-Site Skilled Services
                const paidServicesList = (allAdminServices || []).filter(
                  (s: any) => ((s.status || '').toUpperCase() === 'COMPLETED' ||
                               (s.status || '').toUpperCase() === 'PAID' ||
                               (s.status || '').toUpperCase() === 'WORKER_ASSIGNED') &&
                               isDateInTimeframe(s.created_at || s.preferred_date)
                );

                // Revenue Computations across all 4 streams
                const catalogRevenue = readymadeStoreOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || o.total_price || o.price || 0), 0);
                const customRevenue = paidCustomOrdersList.reduce((sum: number, co: any) => sum + (co.estimated_price || 0), 0);
                const fabricationRevenue = paidFabricationsList.reduce((sum: number, f: any) => sum + (parseFloat(f.estimated_price) || 0), 0);
                const serviceRevenue = paidServicesList.reduce((sum: number, s: any) => sum + (parseFloat(s.estimated_price) || 0), 0);
                const grossRealizedRevenue = catalogRevenue + customRevenue + fabricationRevenue + serviceRevenue;

                // Total Orders & Bookings
                const totalTransactionsCount = readymadeStoreOrders.length + paidCustomOrdersList.length + paidFabricationsList.length + paidServicesList.length;
                const completedTransactionsCount = 
                  readymadeStoreOrders.filter((o: any) => o.orderStatus === 'Completed' || o.orderStatus === 'Delivered').length +
                  paidCustomOrdersList.filter((co: any) => (co.order_status || '').toLowerCase() === 'completed').length +
                  paidFabricationsList.filter((f: any) => (f.status || '').toUpperCase() === 'COMPLETED').length +
                  paidServicesList.filter((s: any) => (s.status || '').toUpperCase() === 'COMPLETED').length;

                // Active Workshop Builds & Scheduled Visits
                const activeWorkshopBuilds = 
                  (allAdminCustomOrders || []).filter((co: any) => (co.order_status || '').toLowerCase() === 'in production' || (co.order_status || '').toLowerCase() === 'approved').length +
                  (allAdminFabrications || []).filter((f: any) => (f.status || '').toUpperCase() === 'IN_PRODUCTION').length;

                const activeOnsiteVisits = (allAdminServices || []).filter((s: any) => (s.status || '').toUpperCase() === 'WORKER_ASSIGNED' || (s.status || '').toUpperCase() === 'SCHEDULED' || (s.status || '').toUpperCase() === 'IN_PROGRESS').length;

                // System Accounts
                const totalSystemUsers = (allUsersList || []).length;
                const customerUsersCount = (allUsersList || []).filter(u => u.role === 'Customer' || (!u.role && !u.role_name)).length;
                const staffUsersCount = totalSystemUsers - customerUsersCount;

                // Average Order Value (AOV)
                const overallAOV = totalTransactionsCount > 0 ? Math.round(grossRealizedRevenue / totalTransactionsCount) : 0;

                // 6-Month Multi-Stream Grouping
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const last6Months = Array.from({ length: 6 }).map((_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
                  return {
                    monthLabel: monthNames[d.getMonth()],
                    mIdx: d.getMonth(),
                    yNum: d.getFullYear(),
                    catalogVal: 0,
                    bespokeVal: 0,
                    fabAndServiceVal: 0
                  };
                });

                (orderList || []).forEach((ord: any) => {
                  if (ord.orderStatus === 'Cancelled' || ord.paymentStatus === 'Cancelled') return;
                  const d = ord.createdAt ? new Date(ord.createdAt) : ord.orderDate ? new Date(ord.orderDate) : null;
                  if (d && !isNaN(d.getTime())) {
                    const found = last6Months.find(m => m.mIdx === d.getMonth() && m.yNum === d.getFullYear());
                    if (found) found.catalogVal += (ord.totalAmount || ord.total_price || 0);
                  }
                });

                (allAdminCustomOrders || []).forEach((co: any) => {
                  const d = co.order_date ? new Date(co.order_date) : co.created_at ? new Date(co.created_at) : null;
                  if (d && !isNaN(d.getTime())) {
                    const found = last6Months.find(m => m.mIdx === d.getMonth() && m.yNum === d.getFullYear());
                    if (found) found.bespokeVal += (co.estimated_price || 0);
                  }
                });

                (allAdminFabrications || []).forEach((f: any) => {
                  const d = f.created_at ? new Date(f.created_at) : null;
                  if (d && !isNaN(d.getTime())) {
                    const found = last6Months.find(m => m.mIdx === d.getMonth() && m.yNum === d.getFullYear());
                    if (found) found.fabAndServiceVal += (parseFloat(f.estimated_price) || 0);
                  }
                });

                (allAdminServices || []).forEach((s: any) => {
                  const d = s.created_at ? new Date(s.created_at) : s.preferred_date ? new Date(s.preferred_date) : null;
                  if (d && !isNaN(d.getTime())) {
                    const found = last6Months.find(m => m.mIdx === d.getMonth() && m.yNum === d.getFullYear());
                    if (found) found.fabAndServiceVal += (parseFloat(s.estimated_price) || 0);
                  }
                });

                const maxChartMonthVal = Math.max(
                  ...last6Months.map(m => Math.max(m.catalogVal, m.bespokeVal + m.fabAndServiceVal)),
                  1
                );

                // Category Revenue Breakdown
                const categoryBreakdownMap: Record<string, { revenue: number; count: number; icon: string }> = {};

                readymadeStoreOrders.forEach((ord: any) => {
                  (ord.items || []).forEach((it: any) => {
                    const catName = it.category || 'Retail Furniture';
                    if (!categoryBreakdownMap[catName]) {
                      categoryBreakdownMap[catName] = { revenue: 0, count: 0, icon: '🛋️' };
                    }
                    categoryBreakdownMap[catName].revenue += ((it.price || 0) * (it.quantity || 1));
                    categoryBreakdownMap[catName].count += (it.quantity || 1);
                  });
                });

                paidCustomOrdersList.forEach((co: any) => {
                  const catName = `Custom ${co.furniture_type || 'Furniture'}`;
                  if (!categoryBreakdownMap[catName]) {
                    categoryBreakdownMap[catName] = { revenue: 0, count: 0, icon: '📐' };
                  }
                  categoryBreakdownMap[catName].revenue += (co.estimated_price || 0);
                  categoryBreakdownMap[catName].count += 1;
                });

                paidFabricationsList.forEach((f: any) => {
                  const catName = f.service_type || 'Timber/Metal Fabrication';
                  if (!categoryBreakdownMap[catName]) {
                    categoryBreakdownMap[catName] = { revenue: 0, count: 0, icon: '🪵' };
                  }
                  categoryBreakdownMap[catName].revenue += (parseFloat(f.estimated_price) || 0);
                  categoryBreakdownMap[catName].count += (f.quantity || 1);
                });

                paidServicesList.forEach((s: any) => {
                  const catName = s.service_category || 'Skilled On-Site Service';
                  if (!categoryBreakdownMap[catName]) {
                    categoryBreakdownMap[catName] = { revenue: 0, count: 0, icon: '🔧' };
                  }
                  categoryBreakdownMap[catName].revenue += (parseFloat(s.estimated_price) || 0);
                  categoryBreakdownMap[catName].count += 1;
                });

                const topCategoriesList = Object.entries(categoryBreakdownMap)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .slice(0, 6);

                const totalCategoryRevenueSum = topCategoriesList.reduce((sum, [, d]) => sum + d.revenue, 0) || 1;

                // Combined Recent Feed (Deduplicated across all 4 streams)
                const combinedRecentTransactions = [
                  ...readymadeStoreOrders.map((o: any) => ({
                    id: String(o.orderId),
                    title: (o.items && o.items[0]) ? o.items[0].name : `Store Order #${o.orderId}`,
                    stream: 'Retail Catalog',
                    streamIcon: '🛍️',
                    customer: o.customerName || 'Customer',
                    amount: o.totalAmount || o.total_price || 0,
                    status: o.orderStatus || 'Processing',
                    date: o.orderDate || (o as any).createdAt || 'Recent'
                  })),
                  ...paidCustomOrdersList.map((co: any) => ({
                    id: `CUS-${co.custom_order_id}`,
                    title: `Custom ${co.furniture_type}`,
                    stream: 'Bespoke Custom',
                    streamIcon: '🛋️',
                    customer: co.customer_name || 'Client',
                    amount: co.estimated_price || 0,
                    status: co.order_status || 'In Production',
                    date: co.order_date || co.created_at || 'Recent'
                  })),
                  ...paidFabricationsList.map((f: any) => ({
                    id: `FAB-${f.fabrication_id}`,
                    title: f.service_type || 'Custom Joinery & Fabrication',
                    stream: 'Fabrication',
                    streamIcon: '🪵',
                    customer: f.customer_name || 'Client',
                    amount: parseFloat(f.estimated_price) || 0,
                    status: f.status || f.review_status || 'In Workshop',
                    date: f.created_at || 'Recent'
                  })),
                  ...paidServicesList.map((s: any) => ({
                    id: `ONS-${s.service_id}`,
                    title: s.service_category || 'Skilled On-Site Service',
                    stream: 'On-Site Service',
                    streamIcon: '🔧',
                    customer: s.customer_name || 'Client',
                    amount: parseFloat(s.estimated_price) || 0,
                    status: s.status || 'Active',
                    date: s.created_at || s.preferred_date || 'Recent'
                  }))
                ].sort((a, b) => {
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  return dateB - dateA;
                });

                return (
                  <div className="space-y-6 animate-fadeIn relative z-10">
                    {/* TOP CONTROLS & TIMEFRAME SELECTOR BAR */}
                    <div className="relative z-40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-[#E2D7CB] shadow-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider mr-1">Timeframe:</span>
                        {[
                          { key: '7days', label: 'Last 7 Days' },
                          { key: '30days', label: 'Last 30 Days' },
                          { key: 'this_month', label: 'This Month' },
                          { key: 'this_year', label: 'This Year (2026)' },
                          { key: 'all', label: 'All Time' }
                        ].map((tf) => (
                          <button
                            key={tf.key}
                            onClick={() => setAnalyticsTimeframe(tf.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              analyticsTimeframe === tf.key
                                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25'
                                : 'bg-[#FAF7F2] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1] hover:text-[#2C241D]'
                            }`}
                          >
                            {tf.label}
                          </button>
                        ))}
                      </div>

                      {/* Export Dropdown Button with Elevated Stacking */}
                      <div className="relative z-50 self-end sm:self-auto">
                        <button
                          onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                          className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F872A] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#38A132]/20 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export Report</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isExportMenuOpen && (
                          <>
                            {/* Click-away backdrop */}
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsExportMenuOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                              <button
                                onClick={() => {
                                  setIsExportMenuOpen(false);
                                  handleExportAnalyticsPDF();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#FAF7F2] transition-colors text-left cursor-pointer"
                              >
                                <FileText className="w-4 h-4 text-[#38A132]" />
                                <div>
                                  <span className="block font-black">Download PDF</span>
                                  <span className="text-[10px] text-[#7A6C5E] font-medium block">Printable Executive Summary</span>
                                </div>
                              </button>

                              <button
                                onClick={() => {
                                  setIsExportMenuOpen(false);
                                  handleExportAnalyticsReport();
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#FAF7F2] transition-colors text-left cursor-pointer"
                              >
                                <Download className="w-4 h-4 text-[#38A132]" />
                                <div>
                                  <span className="block font-black">Export CSV</span>
                                  <span className="text-[10px] text-[#7A6C5E] font-medium block">Spreadsheet Raw Data</span>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* TOP 4 EXECUTIVE KPI CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* KPI 1: Gross Realized Revenue */}
                      <div className="bg-white/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden hover:border-[#38A132]/50 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Gross Realized Revenue</span>
                          <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black">
                            <DollarSign className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <span className="text-2xl sm:text-3xl font-black text-[#2C241D] tracking-tight block">
                            ₹{grossRealizedRevenue.toLocaleString('en-IN')}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-extrabold text-[#38A132]">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Across all 4 retail & workshop streams</span>
                          </div>
                        </div>
                      </div>

                      {/* KPI 2: Total Orders & Bookings */}
                      <div className="bg-white/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden hover:border-blue-300 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Total Orders & Bookings</span>
                          <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-black">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <span className="text-2xl sm:text-3xl font-black text-[#2C241D] tracking-tight block">
                            {totalTransactionsCount} Orders
                          </span>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-extrabold text-blue-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{completedTransactionsCount} Delivered & Completed</span>
                          </div>
                        </div>
                      </div>

                      {/* KPI 3: Active Builds & Service Visits */}
                      <div className="bg-white/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden hover:border-amber-300 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Active Workshop Builds</span>
                          <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center font-black">
                            <Wrench className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <span className="text-2xl sm:text-3xl font-black text-[#2C241D] tracking-tight block">
                            {activeWorkshopBuilds} Active
                          </span>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-extrabold text-amber-800">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{activeOnsiteVisits} Scheduled On-Site Visits</span>
                          </div>
                        </div>
                      </div>

                      {/* KPI 4: System User Accounts */}
                      <div className="bg-white/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-3 relative overflow-hidden hover:border-purple-300 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">System User Accounts</span>
                          <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-black">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <span className="text-2xl sm:text-3xl font-black text-[#2C241D] tracking-tight block">
                            {totalSystemUsers} Accounts
                          </span>
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-extrabold text-purple-700">
                            <Users className="w-3.5 h-3.5" />
                            <span>{customerUsersCount} Customers • {staffUsersCount} Staff/Workers</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4 SERVICE REVENUE STREAMS BREAKDOWN */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Stream 1: Ready-Made Catalog */}
                      <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                            <span>🛍️</span> Ready-Made Store
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                            {grossRealizedRevenue > 0 ? Math.round((catalogRevenue / grossRealizedRevenue) * 100) : 0}% Share
                          </span>
                        </div>
                        <div className="text-xl font-black text-emerald-800">
                          ₹{catalogRevenue.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold">
                          {readymadeStoreOrders.length} Completed Catalog Orders
                        </div>
                      </div>

                      {/* Stream 2: Bespoke Customizations */}
                      <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                            <span>🛋️</span> Bespoke Studio
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                            {grossRealizedRevenue > 0 ? Math.round((customRevenue / grossRealizedRevenue) * 100) : 0}% Share
                          </span>
                        </div>
                        <div className="text-xl font-black text-purple-800">
                          ₹{customRevenue.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-purple-700 font-bold">
                          {paidCustomOrdersList.length} Bespoke Furniture Builds
                        </div>
                      </div>

                      {/* Stream 3: Workshop Fabrications */}
                      <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                            <span>🪵</span> Workshop Fabrication
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                            {grossRealizedRevenue > 0 ? Math.round((fabricationRevenue / grossRealizedRevenue) * 100) : 0}% Share
                          </span>
                        </div>
                        <div className="text-xl font-black text-amber-800">
                          ₹{fabricationRevenue.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-amber-700 font-bold">
                          {paidFabricationsList.length} Timber & Metal Jobs
                        </div>
                      </div>

                      {/* Stream 4: On-Site Skilled Services */}
                      <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                            <span>🔧</span> On-Site Services
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                            {grossRealizedRevenue > 0 ? Math.round((serviceRevenue / grossRealizedRevenue) * 100) : 0}% Share
                          </span>
                        </div>
                        <div className="text-xl font-black text-blue-800">
                          ₹{serviceRevenue.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-blue-700 font-bold">
                          {paidServicesList.length} Technician Service Visits
                        </div>
                      </div>
                    </div>

                    {/* 6-MONTH MULTI-STREAM REVENUE TREND CHART */}
                    <div className="w-full bg-white/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-4">
                        <div>
                          <h4 className="font-extrabold text-base text-[#2C241D] flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#38A132]" />
                            <span>6-Month Multi-Stream Revenue Trend</span>
                          </h4>
                          <p className="text-xs text-[#6B5C4D] mt-0.5">Real-time comparison across Catalog Products vs Bespoke Studio & Workshop Fabrications</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-extrabold">
                          <span className="flex items-center gap-1.5 text-emerald-700">
                            <span className="w-3 h-3 rounded-full bg-[#38A132] inline-block" /> Catalog Orders
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-700">
                            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Custom & Workshop
                          </span>
                        </div>
                      </div>

                      {/* Animated Bars */}
                      <div className="pt-4 pb-2">
                        <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 px-2">
                          {last6Months.map((m, idx) => {
                            const catalogPct = maxChartMonthVal > 0 ? Math.min(100, Math.max(6, (m.catalogVal / maxChartMonthVal) * 100)) : 6;
                            const customPct = maxChartMonthVal > 0 ? Math.min(100, Math.max(6, ((m.bespokeVal + m.fabAndServiceVal) / maxChartMonthVal) * 100)) : 6;

                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                                {/* Hover Tooltip */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#2C241D] text-white text-[10px] p-2.5 rounded-xl shadow-xl z-20 pointer-events-none whitespace-nowrap text-center">
                                  <p className="font-extrabold text-[#FAF7F2]">{m.monthLabel} {m.yNum}</p>
                                  <p className="text-emerald-400">Catalog: ₹{m.catalogVal.toLocaleString('en-IN')}</p>
                                  <p className="text-amber-300">Custom/Fab: ₹{(m.bespokeVal + m.fabAndServiceVal).toLocaleString('en-IN')}</p>
                                </div>

                                <div className="w-full flex items-end justify-center gap-1.5 h-40 bg-[#FAF7F2] rounded-2xl p-1.5 border border-[#E2D7CB]/60 relative">
                                  <div
                                    className="w-1/2 bg-[#38A132] rounded-xl transition-all duration-500 group-hover:bg-[#2F872A]"
                                    style={{ height: `${catalogPct}%` }}
                                    title={`Catalog: ₹${m.catalogVal.toLocaleString('en-IN')}`}
                                  />
                                  <div
                                    className="w-1/2 bg-amber-500 rounded-xl transition-all duration-500 group-hover:bg-amber-600"
                                    style={{ height: `${customPct}%` }}
                                    title={`Custom & Fab: ₹${(m.bespokeVal + m.fabAndServiceVal).toLocaleString('en-IN')}`}
                                  />
                                </div>
                                <span className="text-xs font-black text-[#524538]">{m.monthLabel}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* CATEGORY DISTRIBUTION & FINANCIAL SUMMARY */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Category Sales Share */}
                      <div className="bg-white/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                          <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                            <Tag className="w-4 h-4 text-[#38A132]" />
                            <span>Top Category Sales Share</span>
                          </h4>
                          <span className="text-[10px] font-extrabold text-[#7A6C5E]">By Realized Value</span>
                        </div>

                        {topCategoriesList.length === 0 ? (
                          <div className="p-6 text-center text-[#7A6C5E] text-xs italic">
                            No categorized transactions recorded yet.
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {topCategoriesList.map(([catName, data], idx) => {
                              const pct = Math.round((data.revenue / totalCategoryRevenueSum) * 100);
                              return (
                                <div key={idx} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-extrabold text-[#2C241D] flex items-center gap-1.5">
                                      <span>{data.icon}</span>
                                      <span>{catName}</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-[#7A6C5E] font-medium">{data.count} units/jobs</span>
                                      <span className="font-black text-[#38A132]">₹{data.revenue.toLocaleString('en-IN')}</span>
                                      <span className="text-[10px] font-bold text-[#7A6C5E] bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#E2D7CB]">
                                        {pct}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-[#FAF7F2] h-2 rounded-full overflow-hidden border border-[#E2D7CB]/60">
                                    <div
                                      className="h-full bg-[#38A132] rounded-full transition-all duration-500"
                                      style={{ width: `${Math.max(5, pct)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Financial Health & Overview */}
                      <div className="bg-white/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                          <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-[#38A132]" />
                            <span>Financial Performance Summary</span>
                          </h4>
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Verified Realized
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                            <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase block">Gross Realized</span>
                            <span className="text-lg font-black text-[#2C241D] block">₹{grossRealizedRevenue.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] text-[#38A132] font-bold">100% completed receipts</span>
                          </div>

                          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                            <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase block">Average Order Value</span>
                            <span className="text-lg font-black text-purple-800 block">₹{overallAOV.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] text-purple-700 font-bold">Per customer transaction</span>
                          </div>

                          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                            <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase block">Completed Volume</span>
                            <span className="text-lg font-black text-blue-800 block">{completedTransactionsCount} Items</span>
                            <span className="text-[9px] text-blue-700 font-bold">Fulfilled customer orders</span>
                          </div>

                          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1">
                            <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase block">Active Pipeline</span>
                            <span className="text-lg font-black text-amber-800 block">{activeWorkshopBuilds + activeOnsiteVisits} In Works</span>
                            <span className="text-[9px] text-amber-700 font-bold">Under active processing</span>
                          </div>
                        </div>

                        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-[11px] text-[#6B5C4D] flex items-center justify-between">
                          <span>Realized Net Revenue:</span>
                          <span className="font-extrabold text-[#2C241D]">₹{grossRealizedRevenue.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    {/* LIVE TRANSACTION & ORDERS FEED TABLE */}
                    <div className="bg-white/90 backdrop-blur-xl border border-[#E2D7CB] rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                        <div>
                          <h4 className="font-extrabold text-base text-[#2C241D] flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#38A132]" />
                            <span>Live Transactions & Orders Feed</span>
                          </h4>
                          <p className="text-xs text-[#6B5C4D]">Unified stream of real catalog orders, custom studio builds, fabrications, and technician bookings</p>
                        </div>
                        <span className="px-3 py-1 bg-[#38A132]/10 border border-[#38A132]/30 text-[#38A132] rounded-full text-[11px] font-extrabold">
                          {combinedRecentTransactions.length} Total Records
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        {combinedRecentTransactions.length === 0 ? (
                          <div className="py-8 text-center text-[#8C7C6D]">
                            <p className="text-xs font-bold">No transactions found for the selected timeframe.</p>
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#E2D7CB] text-[#7A6C5E] uppercase text-[10px] font-black tracking-wider">
                                <th className="py-2.5 px-3">Transaction ID / Item</th>
                                <th className="py-2.5 px-3">Service Stream</th>
                                <th className="py-2.5 px-3">Customer</th>
                                <th className="py-2.5 px-3">Amount</th>
                                <th className="py-2.5 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] text-[#2C241D] font-bold">
                              {combinedRecentTransactions.slice(0, 10).map((row, idx) => (
                                <tr key={idx} className="hover:bg-[#FAF7F2] transition-colors">
                                  <td className="py-3 px-3">
                                    <span className="block font-extrabold text-[#2C241D]">{row.title}</span>
                                    <span className="text-[10px] text-[#7A6C5E] font-mono">{row.id}</span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-[#6B5C4D]">
                                      <span>{row.streamIcon}</span>
                                      <span>{row.stream}</span>
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-[#5C4E42]">{row.customer}</td>
                                  <td className="py-3 px-3 text-[#38A132] font-extrabold">₹{(row.amount || 0).toLocaleString('en-IN')}</td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                      row.status === 'Completed' || row.status === 'Delivered'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : row.status === 'In Production' || row.status === 'Processing' || row.status === 'WORKER_ASSIGNED'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {row.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB: FLEET & VEHICLES MANAGEMENT (Requirement 2-9) */}
              {activeTab === 'fleet' && (
                <div className="relative z-10 space-y-6 animate-fadeIn">
                  {/* Small Summary Statistics (From PostgreSQL DB) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-[#E2D7CB] shadow-sm space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Vehicles</span>
                        <Truck className="w-4 h-4 text-[#38A132]" />
                      </div>
                      <div className="text-3xl font-black text-[#2C241D]">
                        {fleetSummaryData?.summary?.total || vehiclesList.length}
                      </div>
                      <div className="text-[10px] font-bold text-[#7A6C5E]">Registered Internal Fleet</div>
                    </div>

                    <div className="ultra-glass-card bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-[#E2D7CB] shadow-sm space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Available</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-3xl font-black text-emerald-600">
                        {fleetSummaryData?.summary?.available || vehiclesList.filter(v => v.status === 'AVAILABLE').length}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-700">Ready for Order Dispatch</div>
                    </div>

                    <div className="ultra-glass-card bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-[#E2D7CB] shadow-sm space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Assigned</span>
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-3xl font-black text-blue-600">
                        {fleetSummaryData?.summary?.assigned || vehiclesList.filter(v => v.status === 'ASSIGNED').length}
                      </div>
                      <div className="text-[10px] font-bold text-blue-700">Currently Out on Delivery</div>
                    </div>

                    <div className="ultra-glass-card bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-[#E2D7CB] shadow-sm space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Maintenance</span>
                        <Wrench className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-3xl font-black text-amber-600">
                        {fleetSummaryData?.summary?.maintenance || vehiclesList.filter(v => v.status === 'MAINTENANCE').length}
                      </div>
                      <div className="text-[10px] font-bold text-amber-800">Under Servicing & Repairs</div>
                    </div>
                  </div>

                  {/* Filter Pills & Vehicle Search Bar */}
                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-3xl p-6 border border-[#E2D7CB] shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Status Filter Pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        {['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'INACTIVE'].map((st) => (
                          <button
                            key={st}
                            onClick={() => setFleetStatusFilter(st)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              fleetStatusFilter === st
                                ? 'bg-[#38A132] text-white shadow-sm'
                                : 'bg-[#F9F6F0] text-[#7A6C5E] hover:bg-[#F2ECE1] border border-[#E2D7CB]'
                            }`}
                          >
                            {st === 'ALL' ? 'All Fleet' : st}
                          </button>
                        ))}
                      </div>

                      {/* Search Bar & Add Vehicle Button */}
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                          <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search registration, type..."
                            value={fleetSearchQuery}
                            onChange={(e) => setFleetSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                          />
                        </div>
                        <button
                          onClick={handleOpenAddVehicleModal}
                          className="px-4 py-2 bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold text-xs rounded-xl shadow-md shadow-[#38A132]/20 transition-all flex items-center gap-1.5 cursor-pointer transform active:scale-95 shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Vehicle</span>
                        </button>
                      </div>
                    </div>

                    {/* Vehicle Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-extrabold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-3">Vehicle ID</th>
                            <th className="py-3 px-3">Registration Number</th>
                            <th className="py-3 px-3">Vehicle Type</th>
                            <th className="py-3 px-3">Capacity</th>
                            <th className="py-3 px-3">Assigned Driver</th>
                            <th className="py-3 px-3">Status</th>
                            <th className="py-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                          {vehiclesList.filter(v => {
                            if (!fleetSearchQuery.trim()) return true;
                            const q = fleetSearchQuery.toLowerCase();
                            return v.id.toLowerCase().includes(q) ||
                                   v.registration_number.toLowerCase().includes(q) ||
                                   v.vehicle_type.toLowerCase().includes(q) ||
                                   v.assigned_driver_name.toLowerCase().includes(q);
                          }).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#7A6C5E] text-xs italic">
                                No internal vehicles match the current filter. Click "Add Vehicle" to register new fleet vehicles.
                              </td>
                            </tr>
                          ) : (
                            vehiclesList.filter(v => {
                              if (!fleetSearchQuery.trim()) return true;
                              const q = fleetSearchQuery.toLowerCase();
                              return v.id.toLowerCase().includes(q) ||
                                     v.registration_number.toLowerCase().includes(q) ||
                                     v.vehicle_type.toLowerCase().includes(q) ||
                                     v.assigned_driver_name.toLowerCase().includes(q);
                            }).map((veh) => (
                              <tr key={veh.vehicle_id} className="hover:bg-[#FAF7F2] transition-colors">
                                <td className="py-3.5 px-3 font-extrabold text-[#38A132] font-mono">{veh.id}</td>
                                <td className="py-3.5 px-3 font-extrabold text-[#2C241D] tracking-wide">{veh.registration_number}</td>
                                <td className="py-3.5 px-3 font-semibold">{veh.vehicle_type}</td>
                                <td className="py-3.5 px-3 font-bold text-[#6B5C4D]">{veh.capacity} kg</td>
                                <td className="py-3.5 px-3 font-semibold">{veh.assigned_driver_name}</td>
                                <td className="py-3.5 px-3">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                    veh.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                    veh.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                    veh.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                    'bg-gray-100 text-gray-700 border-gray-300'
                                  }`}>
                                    {veh.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-right space-x-2">
                                  <button
                                    onClick={() => handleOpenVehicleDetailModal(veh)}
                                    className="px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditVehicleModal(veh)}
                                    className="px-2.5 py-1.5 bg-[#FAF7F2] text-[#6B5C4D] border border-[#E2D7CB] rounded-lg hover:bg-[#EFE7DE] hover:text-[#2C241D] font-extrabold text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
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

              {/* TAB: CARRIER PARTNERS MANAGEMENT */}
              {activeTab === 'carriers' && (
                <div className="relative z-10 space-y-6 animate-fadeIn">
                  {/* Add Carrier Partner Form Card */}
                  <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-3 flex-wrap gap-3">
                      <h4 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                        <Plus className="w-4 h-4 text-[#38A132]" />
                        <span>Add New Carrier Partner</span>
                      </h4>

                      <button
                        disabled={isSubmittingCarrier}
                        onClick={async () => {
                          setCarrierFormError(null);
                          setCarrierFormSuccess(null);
                          if (!carrierNameInput.trim()) {
                            setCarrierFormError('Carrier Name is required.');
                            return;
                          }
                          if (!carrierPhoneInput.trim()) {
                            setCarrierFormError('Contact Phone is required.');
                            return;
                          }
                          setIsSubmittingCarrier(true);
                          const newCP = await createCarrierPartnerApi({
                            carrier_name: carrierNameInput.trim(),
                            contact_phone: carrierPhoneInput.trim(),
                            contact_email: carrierEmailInput.trim() || undefined,
                            status: carrierStatusInput,
                          });
                          setIsSubmittingCarrier(false);
                          if (newCP) {
                            setCarrierFormSuccess(`Carrier partner '${newCP.carrier_name}' added successfully! Login credentials have been dispatched to ${newCP.contact_email || 'the partner'}.`);
                            setCarrierNameInput('');
                            setCarrierPhoneInput('');
                            setCarrierEmailInput('');
                            setCarrierStatusInput(true);
                            await loadCarrierPartnersData();
                            setTimeout(() => setCarrierFormSuccess(null), 5000);
                          } else {
                            setCarrierFormError('Failed to save carrier partner.');
                          }
                        }}
                        className="px-5 py-2 bg-[#38A132] hover:bg-[#2E8B29] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Carrier Partner</span>
                      </button>
                    </div>

                    {carrierFormError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{carrierFormError}</span>
                      </div>
                    )}

                    {carrierFormSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{carrierFormSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-[#2C241D] mb-1">Carrier Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. BlueDart Logistics"
                          value={carrierNameInput}
                          onChange={(e) => setCarrierNameInput(e.target.value)}
                          className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-[#2C241D] mb-1">Contact Phone *</label>
                        <input
                          type="text"
                          placeholder="e.g. +91 98765 43210"
                          value={carrierPhoneInput}
                          onChange={(e) => setCarrierPhoneInput(e.target.value)}
                          className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-[#2C241D] mb-1">Contact Email (Optional)</label>
                        <input
                          type="email"
                          placeholder="e.g. dispatch@carrier.com"
                          value={carrierEmailInput}
                          onChange={(e) => setCarrierEmailInput(e.target.value)}
                          className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-start pt-1">
                      <label className="flex items-center gap-2 text-xs font-extrabold text-[#2C241D] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={carrierStatusInput}
                          onChange={(e) => setCarrierStatusInput(e.target.checked)}
                          className="w-4 h-4 rounded text-[#38A132] focus:ring-[#38A132]"
                        />
                        <span>Active Partner (Available for Selection in Dispatch)</span>
                      </label>
                    </div>
                  </div>

                  {/* Registered Carrier Partners List */}
                  <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-[#2C241D]">Registered Carrier Partners</h4>
                      <span className="text-[11px] font-bold text-[#7A6C5E] bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E2D7CB]">
                        {carrierPartners.length} Total Partners
                      </span>
                    </div>

                    {loadingCarriers ? (
                      <div className="py-8 text-center text-xs text-[#7A6C5E] font-medium">Loading carrier partners...</div>
                    ) : carrierPartners.length === 0 ? (
                      <div className="py-12 text-center bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E2D7CB] space-y-2">
                        <Truck className="w-10 h-10 text-[#9E9082] mx-auto opacity-50" />
                        <div className="text-xs font-extrabold text-[#2C241D]">No carrier partners added yet.</div>
                        <p className="text-[11px] text-[#7A6C5E]">Use the form above to add carrier partners for future use during dispatch.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-[#2C241D]">
                          <thead className="bg-[#FAF7F2] text-[#7A6C5E] font-extrabold uppercase text-[10px] border-b border-[#E2D7CB]">
                            <tr>
                              <th className="py-3 px-4">Carrier ID</th>
                              <th className="py-3 px-4">Carrier Name</th>
                              <th className="py-3 px-4">Contact Phone</th>
                              <th className="py-3 px-4">Contact Email</th>
                              <th className="py-3 px-4">Delivery SLA / Routes</th>
                              <th className="py-3 px-4">Drivers</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2D7CB]/60 font-medium">
                            {carrierPartners.map((c, idx) => {
                              const driverCount = carrierPersonnelList.filter(p => p.carrier_id === c.carrier_id).length;
                              return (
                              <tr key={c.carrier_id} className="hover:bg-[#FAF7F2]/50">
                                <td className="py-3 px-4 font-mono font-bold text-[#7A6C5E]">#{c.carrier_id}</td>
                                <td className="py-3 px-4 font-extrabold text-[#2C241D]">
                                  <div className="flex items-center gap-1.5">
                                    <Truck className="w-3.5 h-3.5 text-[#48A63E]" />
                                    <span>{c.carrier_name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-mono font-semibold">{c.contact_phone}</td>
                                <td className="py-3 px-4 text-[#7A6C5E]">{c.contact_email || '—'}</td>
                                <td className="py-3 px-4">
                                  <span className="text-[11px] font-semibold text-[#5C4E42] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E2D7CB]">
                                    {(c as any).coverage_areas || 'All Regional Routes (24-48h SLA)'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-xs text-[#2C241D]">
                                    {driverCount} {driverCount === 1 ? 'Driver' : 'Drivers'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    c.status ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                                  }`}>
                                    {c.status ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Resend Credentials */}
                                    {c.contact_email && (
                                      <button
                                        disabled={resendingCarrierId === c.carrier_id}
                                        onClick={async () => {
                                          setResendingCarrierId(c.carrier_id);
                                          setCarrierFormError(null);
                                          setCarrierFormSuccess(null);
                                          const result = await resendCarrierCredentialsApi(c.carrier_id);
                                          setResendingCarrierId(null);
                                          if (result.success) {
                                            setCarrierFormSuccess(`Login credentials dispatched to ${c.contact_email}!`);
                                            setTimeout(() => setCarrierFormSuccess(null), 5000);
                                          } else {
                                            setCarrierFormError(result.message || 'Failed to send credentials.');
                                          }
                                        }}
                                        title="Resend login credentials via email"
                                        className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                      >
                                        <Mail className="w-3 h-3 text-emerald-600" />
                                        <span>{resendingCarrierId === c.carrier_id ? 'Sending...' : 'Resend Credentials'}</span>
                                      </button>
                                    )}

                                    {/* Edit Carrier */}
                                    <button
                                      onClick={() => {
                                        setEditingCarrier(c);
                                        setEditCarrierName(c.carrier_name);
                                        setEditCarrierPhone(c.contact_phone);
                                        setEditCarrierEmail(c.contact_email || '');
                                      }}
                                      title="Edit Carrier Details"
                                      className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E2D7CB] text-[11px] font-bold text-[#2C241D] hover:bg-[#E2D7CB]/40 transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <Edit3 className="w-3 h-3 text-[#7A6C5E]" />
                                      <span>Edit</span>
                                    </button>

                                    {/* Toggle Active */}
                                    <button
                                      onClick={async () => {
                                        await updateCarrierPartnerApi(c.carrier_id, { status: !c.status });
                                        await loadCarrierPartnersData();
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E2D7CB] text-[11px] font-bold text-[#2C241D] hover:bg-[#E2D7CB]/40 transition-all cursor-pointer"
                                    >
                                      {c.status ? 'Deactivate' : 'Activate'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ); })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Carrier Delivery Personnel & Drivers Section */}
                  <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-lg space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-[#2C241D]">Carrier Delivery Personnel & Drivers</h4>
                          <span className="text-[11px] font-bold text-[#38A132] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {carrierPersonnelList.length} Registered Drivers
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7A6C5E] mt-0.5">
                          View active dispatch staff, assigned carrier partners, registered vehicles, and manage driver credentials.
                        </p>
                      </div>

                      {/* Search & Agency Filter */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search driver, phone, plate..."
                            value={personnelSearch}
                            onChange={(e) => setPersonnelSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold text-[#2C241D] placeholder-[#9E9082] focus:outline-none focus:border-[#38A132] w-48 sm:w-56"
                          />
                        </div>

                        <select
                          value={personnelCarrierFilter}
                          onChange={(e) => setPersonnelCarrierFilter(e.target.value)}
                          className="py-1.5 px-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                        >
                          <option value="ALL">All Carrier Agencies</option>
                          {carrierPartners.map((c) => (
                            <option key={c.carrier_id} value={c.carrier_id.toString()}>
                              {c.carrier_name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={personnelStatusFilter}
                          onChange={(e) => setPersonnelStatusFilter(e.target.value)}
                          className="py-1.5 px-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="ACTIVE">Active</option>
                          <option value="ON_TRIP">On Trip</option>
                          <option value="ON_LEAVE">On Leave</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>
                    </div>

                    {/* Feedback Alert */}
                    {personnelActionMsg && (
                      <div
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                          personnelActionMsg.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {personnelActionMsg.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                          )}
                          <span>{personnelActionMsg.text}</span>
                        </div>
                        <button
                          onClick={() => setPersonnelActionMsg(null)}
                          className="text-xs hover:opacity-70 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {loadingPersonnel ? (
                      <div className="py-8 text-center text-xs text-[#7A6C5E] font-medium">Loading delivery personnel...</div>
                    ) : carrierPersonnelList.length === 0 ? (
                      <div className="py-10 text-center bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E2D7CB] space-y-2">
                        <Users className="w-10 h-10 text-[#9E9082] mx-auto opacity-50" />
                        <div className="text-xs font-extrabold text-[#2C241D]">No delivery personnel registered yet.</div>
                        <p className="text-[11px] text-[#7A6C5E]">Carrier partners can add delivery personnel and drivers from their portal.</p>
                      </div>
                    ) : (
                      (() => {
                        const filteredPersonnel = carrierPersonnelList.filter((p) => {
                          const query = personnelSearch.toLowerCase();
                          const matchesSearch =
                            !query ||
                            p.name.toLowerCase().includes(query) ||
                            (p.email || '').toLowerCase().includes(query) ||
                            p.phone.toLowerCase().includes(query) ||
                            (p.vehicle_reg || '').toLowerCase().includes(query) ||
                            p.carrier_name.toLowerCase().includes(query);
                          const matchesCarrier =
                            personnelCarrierFilter === 'ALL' ||
                            p.carrier_id.toString() === personnelCarrierFilter;
                          const matchesStatus =
                            personnelStatusFilter === 'ALL' ||
                            (p.status || '').toUpperCase() === personnelStatusFilter.toUpperCase();
                          return matchesSearch && matchesCarrier && matchesStatus;
                        });

                        if (filteredPersonnel.length === 0) {
                          return (
                            <div className="py-8 text-center bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-xs font-semibold text-[#7A6C5E]">
                              No personnel match your search filter criteria.
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left text-[#2C241D]">
                              <thead className="bg-[#FAF7F2] text-[#7A6C5E] font-extrabold uppercase text-[10px] border-b border-[#E2D7CB]">
                                <tr>
                                  <th className="py-3 px-4">Driver / Personnel</th>
                                  <th className="py-3 px-4">Carrier Partner Agency</th>
                                  <th className="py-3 px-4">Contact Details</th>
                                  <th className="py-3 px-4">Assigned Vehicle</th>
                                  <th className="py-3 px-4">Dispatched Tasks</th>
                                  <th className="py-3 px-4">Duty Status</th>
                                  <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E2D7CB]/60 font-medium">
                                {filteredPersonnel.map((p) => (
                                  <tr key={p.personnel_id} className="hover:bg-[#FAF7F2]/50">
                                    {/* Personnel Name & ID */}
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-[#E2D7CB]/40 border border-[#E2D7CB] flex items-center justify-center text-xs font-extrabold text-[#2C241D]">
                                          {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <div className="font-extrabold text-[#2C241D]">{p.name}</div>
                                          <div className="text-[10px] font-mono text-[#7A6C5E]">ID #{p.personnel_id}</div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Carrier Partner */}
                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 border border-stone-200 text-stone-800 text-[11px] font-bold">
                                        <Truck className="w-3 h-3 text-stone-600" />
                                        {p.carrier_name}
                                      </span>
                                    </td>

                                    {/* Contact */}
                                    <td className="py-3 px-4">
                                      <div className="space-y-0.5">
                                        <div className="font-mono font-semibold text-[#2C241D] text-[11px]">{p.phone}</div>
                                        <div className="text-[10px] text-[#7A6C5E]">{p.email || '—'}</div>
                                      </div>
                                    </td>

                                    {/* Vehicle */}
                                    <td className="py-3 px-4">
                                      <div className="space-y-0.5">
                                        <div className="font-semibold text-[#2C241D] text-[11px]">{p.vehicle_type || 'Mini Truck'}</div>
                                        {p.vehicle_reg && (
                                          <span className="font-mono px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[10px] font-bold">
                                            {p.vehicle_reg}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Tasks */}
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            p.active_tasks_count > 0
                                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          }`}
                                        >
                                          {p.active_tasks_count} Active
                                        </span>
                                        <span className="text-[10px] text-[#7A6C5E]">
                                          ({p.completed_tasks_count} completed)
                                        </span>
                                      </div>
                                    </td>

                                    {/* Status */}
                                    <td className="py-3 px-4">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                          (p.status || '').toUpperCase() === 'ACTIVE'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : (p.status || '').toUpperCase() === 'ON_TRIP'
                                            ? 'bg-blue-100 text-blue-800'
                                            : (p.status || '').toUpperCase() === 'ON_LEAVE'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-stone-100 text-stone-600'
                                        }`}
                                      >
                                        {(p.status || 'ACTIVE').replace('_', ' ')}
                                      </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {/* Resend Credentials */}
                                        {p.email && (
                                          <button
                                            disabled={resendingPersonnelId === p.personnel_id}
                                            onClick={async () => {
                                              setResendingPersonnelId(p.personnel_id);
                                              setPersonnelActionMsg(null);
                                              const result = await resendPersonnelCredentialsAdminApi(p.personnel_id);
                                              setResendingPersonnelId(null);
                                              if (result.success) {
                                                setPersonnelActionMsg({ type: 'success', text: result.message });
                                                setTimeout(() => setPersonnelActionMsg(null), 5000);
                                              } else {
                                                setPersonnelActionMsg({ type: 'error', text: result.message });
                                              }
                                            }}
                                            title="Send login credentials to driver email"
                                            className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                          >
                                            <Mail className="w-3 h-3 text-emerald-600" />
                                            <span>
                                              {resendingPersonnelId === p.personnel_id ? 'Sending...' : 'Resend Credentials'}
                                            </span>
                                          </button>
                                        )}

                                        {/* Toggle Active / Inactive */}
                                        <button
                                          onClick={async () => {
                                            const newStatus = (p.status || '').toUpperCase() === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                                            const res = await togglePersonnelStatusAdminApi(p.personnel_id, newStatus);
                                            if (res.success) {
                                              setPersonnelActionMsg({ type: 'success', text: `Driver ${p.name} marked as ${newStatus}.` });
                                              await loadCarrierPartnersData();
                                              setTimeout(() => setPersonnelActionMsg(null), 4000);
                                            } else {
                                              setPersonnelActionMsg({ type: 'error', text: res.message });
                                            }
                                          }}
                                          className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E2D7CB] text-[11px] font-bold text-[#2C241D] hover:bg-[#E2D7CB]/40 transition-all cursor-pointer"
                                        >
                                          {(p.status || '').toUpperCase() === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Edit Carrier Partner Modal */}
                  {editingCarrier && (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-2xl p-6 w-full max-w-md space-y-4 animate-scaleUp">
                        <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-3">
                          <h4 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-[#38A132]" />
                            <span>Edit Carrier Partner</span>
                          </h4>
                          <button
                            onClick={() => setEditingCarrier(null)}
                            className="p-1 hover:bg-[#FAF7F2] rounded-lg text-[#7A6C5E] cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-extrabold text-[#2C241D] mb-1">Carrier Name *</label>
                            <input
                              type="text"
                              value={editCarrierName}
                              onChange={(e) => setEditCarrierName(e.target.value)}
                              className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-extrabold text-[#2C241D] mb-1">Contact Phone *</label>
                            <input
                              type="text"
                              value={editCarrierPhone}
                              onChange={(e) => setEditCarrierPhone(e.target.value)}
                              className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-extrabold text-[#2C241D] mb-1">Contact Email</label>
                            <input
                              type="email"
                              value={editCarrierEmail}
                              onChange={(e) => setEditCarrierEmail(e.target.value)}
                              placeholder="e.g. carrier@logistics.com"
                              className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2D7CB]/60">
                          <button
                            onClick={() => setEditingCarrier(null)}
                            className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#7A6C5E] hover:bg-[#E2D7CB]/40 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={isSavingEditCarrier}
                            onClick={async () => {
                              if (!editCarrierName.trim() || !editCarrierPhone.trim()) {
                                alert('Carrier Name and Contact Phone are required.');
                                return;
                              }
                              setIsSavingEditCarrier(true);
                              const updated = await updateCarrierPartnerApi(editingCarrier.carrier_id, {
                                carrier_name: editCarrierName.trim(),
                                contact_phone: editCarrierPhone.trim(),
                                contact_email: editCarrierEmail.trim() || undefined,
                              });
                              setIsSavingEditCarrier(false);
                              if (updated) {
                                setEditingCarrier(null);
                                setCarrierFormSuccess(`Carrier partner '${updated.carrier_name}' updated successfully!`);
                                await loadCarrierPartnersData();
                                setTimeout(() => setCarrierFormSuccess(null), 4000);
                              } else {
                                alert('Failed to update carrier partner.');
                              }
                            }}
                            className="px-5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2E8B29] text-white text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSavingEditCarrier ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* TAB 0: CUSTOMER DIRECTORY & SHOPPER ACCOUNTS */}
              {activeTab === 'users' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Customers</span>
                        <Users className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {allUsersList.filter(u => (u.role || u.role_name || 'Customer') === 'Customer').length}
                      </div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Retail & Store Shoppers</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Active Shoppers</span>
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {allUsersList.filter(u => (u.role || u.role_name || 'Customer') === 'Customer' && u.status !== false).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Active Accounts</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Custom Build Buyers</span>
                        <ShoppingBag className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-purple-700 mt-2">
                        {allAdminCustomOrders.length}
                      </div>
                      <div className="text-[10px] text-purple-700 font-bold mt-1">Custom Furniture Orders</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Store Orders</span>
                        <PackageCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {getStoredRetailOrders().length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Total Store Orders</div>
                    </div>
                  </div>

                  {/* Header & Controls */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-b border-[#EFE7DE] py-4">
                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                      {(['All Customers', 'Active', 'Inactive'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setUserRoleFilter(r as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                            userRoleFilter === r
                              ? 'bg-[#48A63E] text-white shadow-xs'
                              : 'bg-[#F9F6F0] text-[#6B5C4D] hover:bg-[#EFE7DE]'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search customer name, email, phone..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Customer Details</th>
                          <th className="py-3 px-4">Email / Username</th>
                          <th className="py-3 px-4">Phone Number</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Account Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {allUsersList
                          .filter((u) => {
                            const r = u.role || u.role_name || 'Customer';
                            if (r !== 'Customer') return false; // Strictly show ONLY Customers!
                            if (userRoleFilter === 'Active' && u.status === false) return false;
                            if (userRoleFilter === 'Inactive' && u.status !== false) return false;
                            return true;
                          })
                          .filter((u) => {
                            if (!userSearchQuery.trim()) return true;
                            const q = userSearchQuery.toLowerCase();
                            return (
                              (u.full_name || u.name || '').toLowerCase().includes(q) ||
                              (u.email || '').toLowerCase().includes(q) ||
                              (u.phone || '').toLowerCase().includes(q) ||
                              (u.role || u.role_name || '').toLowerCase().includes(q)
                            );
                          })
                          .map((u) => {
                            const roleStr = u.role || u.role_name || 'Customer';
                            const isAct = u.status !== false;
                            const displayName = u.full_name || u.name || u.email.split('@')[0];
                            const initials = displayName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase();

                            return (
                              <tr key={u.id || u.user_id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-4 px-4 font-extrabold text-[#2C241D] flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-[#48A63E]/20 text-[#48A63E] font-extrabold flex items-center justify-center text-xs">
                                    {initials}
                                  </div>
                                  <span className="font-extrabold text-[#2C241D]">{displayName}</span>
                                </td>
                                <td className="py-4 px-4 font-mono text-[#6B5C4D]">{u.email}</td>
                                <td className="py-4 px-4 text-[#6B5C4D]">{u.phone || '+91 98765 43210'}</td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                                      roleStr === 'Production Staff'
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : roleStr === 'Retail Staff'
                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    }`}>
                                      {roleStr}
                                    </span>
                                    {Boolean((u as any).is_driver) && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 shadow-xs">
                                        🚚 Driver
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    isAct
                                      ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {isAct ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                 <td className="py-4 px-4 text-right whitespace-nowrap">
                                   <div className="flex items-center justify-end gap-2">
                                      {roleStr.toLowerCase().includes('staff') ? (
                                        <button
                                          onClick={() => handleViewUserPurchases(u)}
                                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-200 shadow-xs cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                                          title="View Products Sold by Staff"
                                        >
                                          <PackageCheck className="w-3.5 h-3.5" />
                                          <span>Sold Products</span>
                                        </button>
                                      ) : (roleStr.toLowerCase().includes('worker') || roleStr.toLowerCase().includes('craftsman')) ? (
                                        <button
                                          onClick={() => {
                                            setActiveTab('custom_orders');
                                            setCustomOrderSearchQuery(u.name || u.full_name || u.email || '');
                                          }}
                                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-all border border-purple-200 shadow-xs cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                                          title="View Production Builds Assigned to Worker"
                                        >
                                          <Wrench className="w-3.5 h-3.5" />
                                          <span>Assigned Jobs</span>
                                        </button>
                                      ) : roleStr.toLowerCase().includes('customer') ? (
                                        <button
                                          onClick={() => handleViewUserPurchases(u)}
                                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition-all border border-purple-200 shadow-xs cursor-pointer inline-flex items-center gap-1 font-bold text-xs"
                                          title="View Customer Order Purchases"
                                        >
                                          <ShoppingBag className="w-3.5 h-3.5" />
                                          <span>Purchases</span>
                                        </button>
                                      ) : null}
                                      <button
                                        onClick={() => handleOpenEditUser(u)}
                                        className="px-2.5 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-1 font-extrabold text-xs shadow-xs"
                                        title="Edit User Account Details"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleToggleUserStatus(u.user_id)}
                                        className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-3 py-1.5 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                                          isAct
                                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 hover:shadow-rose-600/20'
                                            : 'bg-[#48A63E]/15 text-[#48A63E] hover:bg-[#48A63E] hover:text-white border border-[#48A63E]/30 hover:shadow-[#48A63E]/20'
                                        }`}
                                        title={isAct ? 'Deactivate Account' : 'Activate Account'}
                                      >
                                        {isAct ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                        <span>{isAct ? 'Deactivate' : 'Activate'}</span>
                                      </button>
                                   </div>
                                 </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 1: STAFF ACCOUNTS MANAGEMENT (ADMIN FEATURE) */}
              {activeTab === 'staff' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Staff & Workers Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Roster</span>
                        <Users className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{staffMembers.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Active Accounts & Craftsmen</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Retail Staff</span>
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {staffMembers.filter(s => s.role === 'Retail Staff').length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Sales & Customer Operations</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Production Staff</span>
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {staffMembers.filter(s => s.role === 'Production Staff').length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Studio Managers & QC</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Artisan Workers</span>
                        <Wrench className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-purple-700 mt-2">
                        {staffMembers.filter(s => s.role === 'Artisan Worker').length}
                      </div>
                      <div className="text-[10px] text-purple-700 font-bold mt-1">Workshop Technicians</div>
                    </div>
                  </div>

                  {/* Header & Create Staff/Worker Trigger */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-b border-[#EFE7DE] pb-4">
                    <button
                      onClick={() => {
                        setNewStaffRole('Retail Staff');
                        setIsAddStaffModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 transition-all flex items-center gap-2 cursor-pointer transform active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Add Staff / Worker Member</span>
                    </button>
                  </div>

                  {/* Role Filters & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                      {['All', 'Retail Staff', 'Production Staff', 'Artisan Worker'].map((role) => (
                        <button
                          key={role}
                          onClick={() => setStaffRoleFilter(role as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors whitespace-nowrap ${
                            staffRoleFilter === role
                              ? 'bg-[#48A63E] text-white'
                              : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search staff name, email, phone..."
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>
                  </div>

                  {/* Staff Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4">Email / Username</th>
                          <th className="py-3 px-4">Phone Number</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Date Added</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {staffMembers
                          .filter((s) => staffRoleFilter === 'All' || s.role === staffRoleFilter)
                          .filter((s) => {
                            if (!staffSearchQuery.trim()) return true;
                            const q = staffSearchQuery.toLowerCase();
                            return (
                              s.name.toLowerCase().includes(q) ||
                              s.email.toLowerCase().includes(q) ||
                              s.phone.toLowerCase().includes(q) ||
                              s.role.toLowerCase().includes(q)
                            );
                          })
                          .map((staff) => (
                            <tr key={staff.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                              <td className="py-4 px-4 font-extrabold text-[#2C241D] flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#48A63E]/20 text-[#48A63E] font-extrabold flex items-center justify-center text-xs">
                                  {staff.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span>{staff.name}</span>
                              </td>
                              <td className="py-4 px-4 font-mono text-[#6B5C4D]">{staff.email}</td>
                              <td className="py-4 px-4 text-[#6B5C4D]">{staff.phone}</td>
                              <td className="py-4 px-4">
                                <div className="space-y-0.5">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    staff.role === 'Production Staff'
                                      ? 'bg-amber-100 text-amber-800'
                                      : staff.role === 'Artisan Worker'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {staff.role}
                                  </span>
                                  {staff.skill && (
                                    <span className="block text-[10px] font-bold text-purple-700">
                                      🛠️ {staff.skill}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${
                                  staff.status === 'Active'
                                    ? 'bg-[#48A63E]/15 text-[#48A63E] border-[#48A63E]/30'
                                    : 'bg-rose-100 text-rose-800 border-rose-200'
                                }`}>
                                  {staff.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 font-mono text-[#7A6C5E]">{staff.dateAdded}</td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditStaffModal(staff)}
                                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all font-extrabold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Edit staff details, role, specialization, and driver authorization"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  {staff.status === 'Active' ? (
                                    <button
                                      onClick={() => handleToggleStaffStatus(staff)}
                                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-[11px] inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                      title="Deactivate staff/worker account"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Deactivate</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleStaffStatus(staff)}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-extrabold text-[11px] inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                      title="Activate staff/worker account"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Activate</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: ARTISAN WORKER & STAFF LEAVE MANAGEMENT */}
              {activeTab === 'leaves' && (() => {
                const totalLeaves = adminLeaveRequests.length;
                const pendingLeaves = adminLeaveRequests.filter(l => l.status === 'Pending').length;
                const approvedLeaves = adminLeaveRequests.filter(l => l.status === 'Approved').length;
                const rejectedLeaves = adminLeaveRequests.filter(l => l.status === 'Rejected').length;

                const filteredLeaves = adminLeaveRequests.filter((req) => {
                  if (leaveStatusFilter !== 'All' && req.status !== leaveStatusFilter) return false;
                  if (leaveTypeFilter !== 'All' && req.leave_type !== leaveTypeFilter) return false;
                  if (leaveSearchQuery.trim()) {
                    const q = leaveSearchQuery.toLowerCase().trim();
                    const matchesWorker = (req.worker_name || '').toLowerCase().includes(q);
                    const matchesId = String(req.worker_id || '').includes(q) || String(req.leave_id).includes(q);
                    const matchesReason = (req.reason || '').toLowerCase().includes(q);
                    const matchesType = (req.leave_type || '').toLowerCase().includes(q);
                    if (!matchesWorker && !matchesId && !matchesReason && !matchesType) return false;
                  }
                  return true;
                });

                const leaveTypes = Array.from(new Set(adminLeaveRequests.map(l => l.leave_type).filter(Boolean)));

                return (
                  <div className="space-y-6">
                    {/* Top Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                          <span>Total Applications</span>
                          <CalendarDays className="w-4 h-4 text-[#48A63E]" />
                        </div>
                        <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{totalLeaves}</div>
                        <div className="text-[10px] text-[#7A6C5E] font-medium mt-1">Logged Absence Requests</div>
                      </div>

                      <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-amber-200 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
                          <span>Pending Review</span>
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="text-2xl font-extrabold text-amber-700 mt-2">{pendingLeaves}</div>
                        <div className="text-[10px] text-amber-800 font-bold mt-1">Awaiting Admin Decision</div>
                      </div>

                      <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-emerald-200 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                          <span>Approved Leaves</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-extrabold text-emerald-700 mt-2">{approvedLeaves}</div>
                        <div className="text-[10px] text-emerald-700 font-bold mt-1">Authorized Absences</div>
                      </div>

                      <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-rose-200 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between">
                          <span>Rejected Requests</span>
                          <X className="w-4 h-4 text-rose-600" />
                        </div>
                        <div className="text-2xl font-extrabold text-rose-700 mt-2">{rejectedLeaves}</div>
                        <div className="text-[10px] text-rose-700 font-bold mt-1">Declined Submissions</div>
                      </div>
                    </div>

                    {/* Filter Bar & Search */}
                    <div className="ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl bg-white/80">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                        <div className="flex flex-wrap items-center gap-3 text-xs w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#7A6C5E]">Status:</span>
                            <select
                              value={leaveStatusFilter}
                              onChange={(e) => setLeaveStatusFilter(e.target.value as any)}
                              className="px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E] shadow-2xs text-xs"
                            >
                              <option value="All">All Statuses ({totalLeaves})</option>
                              <option value="Pending">Pending Review ({pendingLeaves})</option>
                              <option value="Approved">Approved ({approvedLeaves})</option>
                              <option value="Rejected">Rejected ({rejectedLeaves})</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#7A6C5E]">Leave Type:</span>
                            <select
                              value={leaveTypeFilter}
                              onChange={(e) => setLeaveTypeFilter(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E] shadow-2xs text-xs"
                            >
                              <option value="All">All Types</option>
                              {leaveTypes.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>

                          {(leaveStatusFilter !== 'All' || leaveTypeFilter !== 'All' || leaveSearchQuery.trim()) && (
                            <button
                              onClick={() => {
                                setLeaveStatusFilter('All');
                                setLeaveTypeFilter('All');
                                setLeaveSearchQuery('');
                              }}
                              className="text-[11px] font-extrabold text-[#48A63E] hover:underline cursor-pointer"
                            >
                              Reset Filters
                            </button>
                          )}
                        </div>

                        <div className="relative w-full sm:w-72">
                          <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search worker, ID, reason..."
                            value={leaveSearchQuery}
                            onChange={(e) => setLeaveSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                          />
                        </div>
                      </div>

                      {/* Leaves Table */}
                      {filteredLeaves.length === 0 ? (
                        <div className="py-12 text-center text-xs text-[#7A6C5E] font-medium border-2 border-dashed border-[#E2D7CB] rounded-2xl bg-white/40 space-y-2">
                          <CalendarCheck className="w-8 h-8 text-[#9E9082] mx-auto opacity-60" />
                          <p className="font-extrabold text-sm text-[#2C241D]">No leave requests found</p>
                          <p className="text-[11px] text-[#8C7C6D]">No employee leave applications match your selected filter criteria.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto bg-white/80 rounded-2xl border border-[#E2D7CB]">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#EFE7DE] text-[10px] font-black text-[#7A6C5E] uppercase tracking-wider bg-[#FAF7F2]">
                                <th className="py-3.5 px-4">Artisan / Staff Worker</th>
                                <th className="py-3.5 px-4">Leave Category</th>
                                <th className="py-3.5 px-4">Duration & Schedule</th>
                                <th className="py-3.5 px-4">Reason & Justification</th>
                                <th className="py-3.5 px-4">Approval Status</th>
                                <th className="py-3.5 px-4 text-right">Review Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE]">
                              {filteredLeaves.map((req) => {
                                const isPending = req.status === 'Pending';
                                const isApproved = req.status === 'Approved';
                                const isRejected = req.status === 'Rejected';

                                return (
                                  <tr key={req.leave_id} className="hover:bg-[#F5ECE1]/40 transition-colors">
                                    <td className="py-4 px-4 align-top whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#38A132] to-[#2E8529] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                          👷
                                        </div>
                                        <div>
                                          <div className="font-extrabold text-[#2C241D] text-xs leading-tight">
                                            {req.worker_name || `Worker #${req.worker_id}`}
                                          </div>
                                          <div className="text-[10px] font-mono text-[#7A6C5E] mt-0.5">
                                            ID: #{req.worker_id} • App #{req.leave_id}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="py-4 px-4 align-top whitespace-nowrap">
                                      <span className="font-extrabold text-xs text-[#2C241D] bg-[#F5ECE1] px-2.5 py-1 rounded-lg border border-[#E2D7CB] inline-block">
                                        {req.leave_type}
                                      </span>
                                    </td>

                                    <td className="py-4 px-4 align-top whitespace-nowrap">
                                      <div className="font-black text-[#2C241D] text-xs">
                                        {req.duration_days} Day{req.duration_days > 1 ? 's' : ''}
                                      </div>
                                      <div className="text-[10px] font-mono text-[#7A6C5E] mt-0.5 bg-white px-2 py-0.5 rounded border border-[#EFE7DE] inline-block">
                                        {req.start_date} → {req.end_date}
                                      </div>
                                    </td>

                                    <td className="py-4 px-4 align-top max-w-xs">
                                      <p className="text-xs text-[#4A3E32] font-medium leading-relaxed">
                                        {req.reason || 'No specific reason entered.'}
                                      </p>
                                      {req.review_notes && (
                                        <div className="mt-1.5 p-2 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-[10px] text-[#6B5C4D]">
                                          <strong className="text-[#2C241D]">Reviewer Remarks:</strong> {req.review_notes}
                                        </div>
                                      )}
                                    </td>

                                    <td className="py-4 px-4 align-top whitespace-nowrap">
                                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                                        isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                        isRejected ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                        'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                      }`}>
                                        {isApproved && '✓ Approved'}
                                        {isRejected && '✕ Rejected'}
                                        {isPending && '● Pending Review'}
                                      </span>
                                      {req.reviewed_by && (
                                        <div className="text-[9px] text-[#7A6C5E] font-medium mt-1">
                                          By {req.reviewed_by}
                                        </div>
                                      )}
                                    </td>

                                    <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                                      {isPending ? (
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenReviewLeaveModal(req, 'Approved')}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Approve</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenReviewLeaveModal(req, 'Rejected')}
                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                            <span>Reject</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenReviewLeaveModal(req, isApproved ? 'Rejected' : 'Approved')}
                                          className="px-2.5 py-1 bg-white hover:bg-[#F5ECE1] border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] rounded-lg font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1"
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                          <span>Change Status</span>
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* TAB 2: PRODUCTS CATALOG MANAGEMENT */}
              {activeTab === 'products' && (
                <div className="space-y-5">
                  {/* Product Catalog Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Products</span>
                        <Package className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{productList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Furniture Store Catalog</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>In Stock Items</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {productList.filter(p => p.stockCount >= 5).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Available for Purchase</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Categories</span>
                        <Tag className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {new Set(productList.map(p => p.category).filter(Boolean)).size || 5}
                      </div>
                      <div className="text-[10px] text-purple-700 font-bold mt-1">Furniture Categories</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-b border-[#EFE7DE] pb-4">
                    <button
                      onClick={() => setIsAddProductModalOpen(true)}
                      className="px-5 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Product</span>
                    </button>
                  </div>

                  {/* Filters Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      <span className="font-extrabold text-[#7A6C5E]">Category:</span>
                      {['All', 'Living Room', 'Dining Room', 'Bedroom', 'Home Office', ...productList.map(p => p.category).filter(c => c && !['Living Room', 'Dining Room', 'Bedroom', 'Home Office'].includes(c))].filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl font-extrabold transition-colors whitespace-nowrap ${
                            categoryFilter === cat
                              ? 'bg-[#48A63E] text-white'
                              : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#7A6C5E]">Price Filter:</span>
                        <select
                          value={priceRangeFilter}
                          onChange={(e) => setPriceRangeFilter(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                        >
                          <option value="All">All Prices</option>
                          <option value="<10k">Under ₹10,000</option>
                          <option value="10k-25k">₹10,000 - ₹25,000</option>
                          <option value="25k-50k">₹25,000 - ₹50,000</option>
                          <option value="50k+">Above ₹50,000</option>
                        </select>
                      </div>

                      <div className="relative w-full sm:w-56">
                        <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search product, material, color..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Product Code (SKU)</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Material & Color</th>
                          <th className="py-3 px-4">Price</th>
                          <th className="py-3 px-4">Stock Count</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {displayProducts.map((prod) => (
                          <tr key={prod.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                            <td className="py-3.5 px-4 font-extrabold text-[#2C241D] flex items-center gap-3">
                              {prod.image_url ? (
                                <img src={prod.image_url} alt={prod.name} className="w-10 h-10 rounded-xl object-cover border border-[#E2D7CB]" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-[#48A63E]/10 text-[#48A63E] font-bold flex items-center justify-center">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <span>{prod.name}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[#48A63E] font-extrabold">
                              <span className="bg-[#48A63E]/10 border border-[#48A63E]/20 px-2 py-0.5 rounded text-[11px]">
                                {prod.productCode || prod.sku || `SKU-RS-${prod.product_id || prod.id}`}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#6B5C4D]">{prod.category}</td>
                            <td className="py-3.5 px-4 text-[#6B5C4D]">
                              <div>{prod.material}</div>
                              {prod.color && (
                                <span className="inline-block text-[10px] font-bold bg-[#FAF7F2] border border-[#E2D7CB] px-1.5 py-0.5 rounded text-[#48A63E] mt-0.5">
                                  {prod.color}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">₹{prod.price.toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">{prod.stockCount} Units</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                prod.status === 'In Stock'
                                  ? 'bg-[#48A63E]/15 text-[#48A63E]'
                                  : prod.status === 'Low Stock'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-700'
                              }`}>
                                {prod.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Edit Product Button */}
                                <div className="relative group/tip">
                                  <button
                                    onClick={() => handleOpenEditProduct(prod)}
                                    className="p-2 rounded-xl text-[#6B5C4D] hover:text-[#48A63E] hover:bg-[#48A63E]/10 transition-all transform hover:scale-110 active:scale-95 border border-transparent hover:border-[#48A63E]/20 shadow-xs cursor-pointer"
                                    aria-label="Edit product details"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <div className="absolute right-0 -top-8 opacity-0 group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 transition-all duration-200 pointer-events-none bg-[#2C241D] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-30 border border-white/10 flex items-center gap-1">
                                    <span>Edit Specs</span>
                                  </div>
                                </div>

                                {/* Remove Product Button */}
                                <div className="relative group/tip">
                                  <button
                                    onClick={() => handleOpenDeleteModal(prod)}
                                    className="p-2 rounded-xl text-rose-600 hover:text-white hover:bg-rose-600 transition-all transform hover:scale-110 active:scale-95 border border-transparent hover:border-rose-700 shadow-xs cursor-pointer"
                                    aria-label="Remove product from catalog"
                                  >
                                    <PackageMinus className="w-4 h-4" />
                                  </button>
                                  <div className="absolute right-0 -top-8 opacity-0 group-hover/tip:opacity-100 group-hover/tip:-translate-y-1 transition-all duration-200 pointer-events-none bg-rose-950 text-rose-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-30 border border-rose-800/40 flex items-center gap-1">
                                    <span>Remove Item</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

              {/* TAB 3: STOCK CONTROL & WAREHOUSE */}
              {activeTab === 'inventory' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Stock Summary Overview Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Items</span>
                        <Package className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{totalProducts}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">{totalInStock} Total Units</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>In Stock</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {productList.filter((p) => p.stockCount >= 5).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Sufficient Stock (5+ units)</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Low Stock Alert</span>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-amber-700 mt-2">
                        {productList.filter((p) => p.stockCount > 0 && p.stockCount < 5).length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Under 5 Units Left</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Out of Stock</span>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-rose-700 mt-2">
                        {productList.filter((p) => p.stockCount <= 0).length}
                      </div>
                      <div className="text-[10px] text-rose-700 font-bold mt-1">0 Units Available</div>
                    </div>
                  </div>

                  {/* Controls Header */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-b border-[#EFE7DE] py-4">
                    {/* Stock Status Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                      {(['All', 'In Stock', 'Low Stock', 'Out of Stock'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStockStatusFilter(st)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                            stockStatusFilter === st
                              ? st === 'Out of Stock'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : st === 'Low Stock'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-[#48A63E] text-white shadow-xs'
                              : 'bg-[#F9F6F0] text-[#6B5C4D] hover:bg-[#EFE7DE]'
                          }`}
                        >
                          {st === 'All' ? 'All Stock' : st}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search stock by name, SKU, category..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E]"
                        />
                      </div>

                      <button
                        onClick={() => setShowLowStockModal(true)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Low Stock Alert ({lowStockProductsList.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Stock Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">SKU / Code</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Unit Price</th>
                          <th className="py-3 px-4">Available Units</th>
                          <th className="py-3 px-4">Stock Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {displayProducts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-[#7A6C5E]">
                              <SlidersHorizontal className="w-8 h-8 text-[#9E9082] mx-auto opacity-50 mb-2" />
                              <p className="font-extrabold text-xs text-[#2C241D]">No stock inventory items found</p>
                              <p className="text-[11px] text-[#8C7C6D]">Try clearing search or choosing another stock status filter.</p>
                            </td>
                          </tr>
                        ) : (
                          displayProducts.map((item) => (
                            <tr key={item.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                              <td className="py-4 px-4 font-extrabold text-[#2C241D] flex items-center gap-3">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-xl object-cover border border-[#E2D7CB] flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-[#48A63E]/10 text-[#48A63E] font-bold flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4" />
                                  </div>
                                )}
                                <span>{item.name}</span>
                              </td>
                              <td className="py-4 px-4 font-mono text-[#48A63E] font-extrabold">
                                <span className="bg-[#48A63E]/10 border border-[#48A63E]/20 px-2 py-0.5 rounded text-[11px]">
                                  {item.sku}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-[#6B5C4D]">{item.category}</td>
                              <td className="py-4 px-4 font-extrabold text-[#2C241D]">₹{item.price.toLocaleString('en-IN')}</td>
                              <td className="py-4 px-4 font-extrabold text-[#2C241D]">{item.stockCount} Units</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                  item.status === 'In Stock'
                                    ? 'bg-[#48A63E]/15 text-[#48A63E] border border-[#48A63E]/30'
                                    : item.status === 'Low Stock'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-rose-100 text-rose-700 border border-rose-300'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button
                                  onClick={() => handleOpenStockModal(item)}
                                  className="px-3 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs"
                                >
                                  Update Stock
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: SUPPLIER DIRECTORY */}
              {activeTab === 'suppliers' && (
                <div className="space-y-5">
                  {/* Supplier Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Suppliers</span>
                        <Briefcase className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{supplierList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Ready-Made Product Manufacturers</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Active Partners</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {supplierList.filter(s => s.status === 'Active' || !s.status).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Verified Wholesale & Furniture Vendors</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-b border-[#EFE7DE] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-64">
                        <Search className="w-3.5 h-3.5 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search by product name or code..."
                          value={supplierSearchQuery}
                          onChange={(e) => setSupplierSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E]"
                        />
                      </div>

                      <button
                        onClick={handleOpenAddSupplierModal}
                        className="px-4 py-2 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Supplier</span>
                      </button>
                    </div>
                  </div>

                  {/* Suppliers List */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredSuppliers.map((sup) => {
                      const isArun = sup.supplier_name.toLowerCase().includes('arun');
                      let prodsForSup: any[] = [];
                      if (sup.assigned_products && sup.assigned_products.length > 0) {
                        prodsForSup = sup.assigned_products;
                      } else {
                        prodsForSup = isArun ? displayProducts.slice(0, 6) : displayProducts.slice(6);
                      }

                      return (
                        <div key={sup.id} className="p-5 rounded-3xl bg-white border-2 border-[#E2D7CB] space-y-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-[#48A63E]/10 text-[#48A63E] font-extrabold flex items-center justify-center text-sm">
                                {sup.supplier_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-base text-[#2C241D]">{sup.supplier_name}</h4>
                                <p className="text-xs text-[#7A6C5E] font-semibold">📞 {sup.phone}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-[#48A63E]/15 text-[#48A63E] text-xs font-extrabold">
                                {prodsForSup.length} Products Supplied
                              </span>
                              <button
                                onClick={() => handleOpenEditSupplierModal(sup)}
                                className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Edit supplier details"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                                <span>Edit</span>
                              </button>
                            </div>
                          </div>

                          {/* Supplied Products Preview Table */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-extrabold uppercase text-[#7A6C5E] tracking-wider block">Supplied Furniture Products:</span>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                              {prodsForSup.map((p: any, idx: number) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] flex items-center justify-between">
                                  <div>
                                    <span className="font-extrabold text-[#2C241D] block">{p.name || p.product_name}</span>
                                    <span className="font-mono text-[10px] text-[#48A63E] font-bold">
                                      {p.sku || `SKU-RS-${p.product_id || p.id || Math.floor(100 + Math.random() * 900)}`}
                                    </span>
                                  </div>
                                  <span className="font-extrabold text-[#2C241D]">₹{(p.price || 12000).toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

              {/* TAB 5: ORDER FULFILLMENT STUDIO */}
              {activeTab === 'orders' && (
                <div className="space-y-5">
                  {/* Order Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Total Orders</span>
                        <ShoppingBag className="w-4 h-4 text-[#D97706]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{orderList.length}</div>
                      <div className="text-[10px] text-[#D97706] font-bold mt-1">Customer Purchases</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Pending Orders</span>
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {orderList.filter(o => {
                          const c = computeLogicalCompletionStatus(o);
                          return c.status.toLowerCase().includes('pending') || o.orderStatus === 'Pending';
                        }).length}
                      </div>
                      <div className="text-[10px] text-amber-700 font-bold mt-1">Awaiting Processing</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>In Production / Shipped</span>
                        <Truck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {orderList.filter(o => {
                          const c = computeLogicalCompletionStatus(o);
                          const pct = o.completionPercentage !== undefined ? o.completionPercentage : c.percentage;
                          return pct > 0 && pct < 100 && !c.status.toLowerCase().includes('pending') && o.orderStatus !== 'Cancelled';
                        }).length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Fulfillment Active</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Delivered / Completed</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {orderList.filter(o => {
                          const c = computeLogicalCompletionStatus(o);
                          const pct = o.completionPercentage !== undefined ? o.completionPercentage : c.percentage;
                          return pct >= 100 || o.orderStatus === 'Delivered' || o.orderStatus === 'Completed' || (o.completionStatus && o.completionStatus.toLowerCase().includes('delivered'));
                        }).length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Successfully Fulfilled</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-extrabold text-[#7A6C5E]">Filter Status:</span>
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E] shadow-2xs"
                      >
                        <option value="All">All Orders ({orderList.length})</option>
                        <option value="Pending">Pending / Awaiting</option>
                        <option value="Processing">Order Placed & Processing</option>
                        <option value="In Production">In Production / Workshop</option>
                        <option value="Shipped">Shipped & In Transit</option>
                        <option value="Delivered">Delivered & Completed</option>
                        <option value="Cancelled">Cancelled Orders</option>
                      </select>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search order ID, customer, email..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="w-full">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Order & Customer</th>
                          <th className="py-2.5 px-3">Items Purchased</th>
                          <th className="py-2.5 px-3">Amount & Payment</th>
                          <th className="py-2.5 px-3">Completion Status</th>
                          <th className="py-2.5 px-3 text-right">Update Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {orderList
                          .filter((ord) => {
                            if (orderSearchQuery.trim()) {
                              const q = orderSearchQuery.toLowerCase();
                              const matches =
                                ord.orderId.toLowerCase().includes(q) ||
                                ord.customerName.toLowerCase().includes(q) ||
                                ord.email.toLowerCase().includes(q) ||
                                (ord.paymentId && ord.paymentId.toLowerCase().includes(q)) ||
                                (ord.items && ord.items.some(it => it.name.toLowerCase().includes(q) || ((it as any).productCode && (it as any).productCode.toLowerCase().includes(q))));
                              if (!matches) return false;
                            }
                            if (orderStatusFilter === 'All') return true;
                            const comp = computeLogicalCompletionStatus(ord);
                            const statusStr = (ord.completionStatus || comp.status || ord.orderStatus || '').toLowerCase();
                            const pct = ord.completionPercentage !== undefined ? ord.completionPercentage : comp.percentage;

                            if (orderStatusFilter === 'Pending') {
                              return statusStr.includes('pending') || ord.orderStatus === 'Pending';
                            }
                            if (orderStatusFilter === 'Processing') {
                              return statusStr.includes('processing') || statusStr.includes('placed');
                            }
                            if (orderStatusFilter === 'In Production') {
                              return statusStr.includes('production') || statusStr.includes('progress') || (Array.isArray(ord.assignedWorkers) && ord.assignedWorkers.length > 0);
                            }
                            if (orderStatusFilter === 'Shipped') {
                              return statusStr.includes('shipped') || statusStr.includes('transit') || statusStr.includes('dispatched') || statusStr.includes('delivery');
                            }
                            if (orderStatusFilter === 'Delivered') {
                              return statusStr.includes('delivered') || statusStr.includes('completed') || pct >= 100 || ord.orderStatus === 'Delivered';
                            }
                            if (orderStatusFilter === 'Cancelled') {
                              return statusStr.includes('cancelled') || ord.orderStatus === 'Cancelled';
                            }
                            return true;
                          }).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[#7A6C5E]">
                              <ShoppingBag className="w-8 h-8 text-[#9E9082] mx-auto opacity-50 mb-1" />
                              <p className="font-extrabold text-xs text-[#2C241D]">No customer orders found</p>
                              <p className="text-[11px] text-[#8C7C6D]">When customers place ready-made or custom furniture orders, they will appear here.</p>
                            </td>
                          </tr>
                        ) : (
                          orderList
                            .filter((ord) => {
                              if (orderSearchQuery.trim()) {
                                const q = orderSearchQuery.toLowerCase();
                                const matches =
                                  ord.orderId.toLowerCase().includes(q) ||
                                  ord.customerName.toLowerCase().includes(q) ||
                                  ord.email.toLowerCase().includes(q) ||
                                  (ord.paymentId && ord.paymentId.toLowerCase().includes(q)) ||
                                  (ord.items && ord.items.some(it => it.name.toLowerCase().includes(q) || ((it as any).productCode && (it as any).productCode.toLowerCase().includes(q))));
                                if (!matches) return false;
                              }
                              if (orderStatusFilter === 'All') return true;
                              const comp = computeLogicalCompletionStatus(ord);
                              const statusStr = (ord.completionStatus || comp.status || ord.orderStatus || '').toLowerCase();
                              const pct = ord.completionPercentage !== undefined ? ord.completionPercentage : comp.percentage;

                              if (orderStatusFilter === 'Pending') {
                                return statusStr.includes('pending') || ord.orderStatus === 'Pending';
                              }
                              if (orderStatusFilter === 'Processing') {
                                return statusStr.includes('processing') || statusStr.includes('placed');
                              }
                              if (orderStatusFilter === 'In Production') {
                                return statusStr.includes('production') || statusStr.includes('progress') || (Array.isArray(ord.assignedWorkers) && ord.assignedWorkers.length > 0);
                              }
                              if (orderStatusFilter === 'Shipped') {
                                return statusStr.includes('shipped') || statusStr.includes('transit') || statusStr.includes('dispatched') || statusStr.includes('delivery');
                              }
                              if (orderStatusFilter === 'Delivered') {
                                return statusStr.includes('delivered') || statusStr.includes('completed') || pct >= 100 || ord.orderStatus === 'Delivered';
                              }
                              if (orderStatusFilter === 'Cancelled') {
                                return statusStr.includes('cancelled') || ord.orderStatus === 'Cancelled';
                              }
                              return true;
                            })
                            .map((ord) => {
                              const comp = computeLogicalCompletionStatus(ord);
                              const pct = ord.completionPercentage !== undefined ? ord.completionPercentage : comp.percentage;
                              const currentCompletionStatus = ord.completionStatus || comp.status;
                              const isDelivered = pct >= 100 || currentCompletionStatus.toLowerCase().includes('delivered');

                              let badgeBg = 'bg-sky-50 text-sky-800 border-sky-200';
                              let barColor = 'bg-sky-500';
                              if (pct >= 100 || currentCompletionStatus.toLowerCase().includes('delivered') || currentCompletionStatus.toLowerCase().includes('completed')) {
                                badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                                barColor = 'bg-emerald-600';
                              } else if (currentCompletionStatus.toLowerCase().includes('out for delivery')) {
                                badgeBg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                                barColor = 'bg-indigo-600';
                              } else if (currentCompletionStatus.toLowerCase().includes('shipped') || currentCompletionStatus.toLowerCase().includes('transit')) {
                                badgeBg = 'bg-purple-50 text-purple-800 border-purple-200';
                                barColor = 'bg-purple-600';
                              } else if (currentCompletionStatus.toLowerCase().includes('production')) {
                                badgeBg = 'bg-blue-50 text-blue-800 border-blue-200';
                                barColor = 'bg-blue-600';
                              } else if (currentCompletionStatus.toLowerCase().includes('cancelled')) {
                                badgeBg = 'bg-rose-50 text-rose-800 border-rose-200';
                                barColor = 'bg-rose-500';
                              } else if (currentCompletionStatus.toLowerCase().includes('pending')) {
                                badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
                                barColor = 'bg-amber-500';
                              }

                              return (
                                <tr key={ord.orderId} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                  {/* 1. Order & Customer Details */}
                                  <td className="py-3 px-3 align-top">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-extrabold text-[#48A63E] text-xs">{ord.orderId}</span>
                                    </div>
                                    <div className="font-extrabold text-[#2C241D] text-xs mt-0.5 leading-tight">{ord.customerName}</div>
                                    <div className="text-[10px] text-[#6B5C4D] truncate max-w-[140px]">{ord.email}</div>
                                    {ord.assignedWorkers && ord.assignedWorkers.length > 0 && (
                                      <div className="mt-1 font-extrabold text-[9px] text-[#38A132] bg-[#38A132]/10 px-1.5 py-0.5 rounded border border-[#38A132]/20 inline-flex items-center gap-1">
                                        <span>👷 {ord.assignedWorkers.map((w: any) => w.worker_name).join(', ')}</span>
                                      </div>
                                    )}
                                  </td>

                                  {/* 2. Items Purchased */}
                                  <td className="py-3 px-3 align-top">
                                    {ord.items && ord.items.length > 0 ? (
                                      <div className="space-y-1.5 max-w-[200px]">
                                        {ord.items.map((item, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <img
                                              src={item.imageUrl || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80"}
                                              alt={item.name}
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80";
                                              }}
                                              className="w-8 h-8 rounded-lg object-cover border border-[#E2D7CB] shrink-0 bg-white shadow-2xs"
                                            />
                                            <div className="min-w-0 flex-1">
                                              <div className="text-xs font-bold text-[#2C241D] truncate">{item.name} <span className="text-[#7A6C5E] font-normal">(x{item.quantity})</span></div>
                                              <span className="font-mono text-[9px] font-extrabold text-[#48A63E] bg-[#48A63E]/10 border border-[#48A63E]/20 px-1 py-0.2 rounded inline-block">
                                                {(item as any).productCode || (item as any).sku || `SKU-RS-${item.id}`}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[#6B5C4D] text-xs font-medium">{ord.itemsCount} Item(s)</span>
                                    )}
                                  </td>

                                  {/* 3. Amount & Payment Info */}
                                  <td className="py-3 px-3 align-top whitespace-nowrap">
                                    <div className="font-extrabold text-[#2C241D] text-xs sm:text-sm">
                                      ₹{ord.totalAmount.toLocaleString('en-IN')}
                                    </div>
                                    <div className="text-[10px] text-[#7A6C5E] font-semibold mt-0.5">
                                      {ord.orderStatus === 'Cancelled' || ord.paymentStatus === 'Cancelled' ? (
                                        <span className="text-rose-600 font-extrabold flex items-center gap-1">
                                          <X className="w-3 h-3 text-rose-600" /> Cancelled
                                        </span>
                                      ) : (
                                        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Paid & Verified
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[9px] text-[#8C7C6D] mt-0.5">
                                      {formatPaymentTime(ord)}
                                    </div>
                                  </td>

                                  {/* 4. Completion Status */}
                                  <td className="py-3 px-3 align-top">
                                    <div className="space-y-1 max-w-[180px]">
                                      <div className="flex items-center justify-between gap-1.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider inline-flex items-center gap-1 truncate ${badgeBg}`}>
                                          {pct >= 100 ? '✓' : '●'} {currentCompletionStatus}
                                        </span>
                                        <span className="font-mono text-[10px] font-black text-[#2C241D] shrink-0">
                                          {pct}%
                                        </span>
                                      </div>
                                      
                                      <div className="w-full bg-[#EFE7DE] h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                          style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                                        />
                                      </div>

                                      <div className="text-[9px] text-[#7A6C5E] font-medium truncate">
                                        Stage: <strong className="text-[#2C241D]">{comp.stage || 'Fulfillment'}</strong>
                                      </div>

                                      {((ord as any).carrier || (ord as any).fulfillment?.carrier) && (
                                        <div className="pt-0.5">
                                          <div className="text-[9px] font-extrabold text-[#38A132] bg-[#38A132]/10 px-1.5 py-0.5 rounded border border-[#38A132]/20 inline-flex items-center gap-1 max-w-full truncate">
                                            <Truck className="w-2.5 h-2.5 shrink-0 text-[#38A132]" />
                                            <span className="truncate">{(ord as any).carrier || (ord as any).fulfillment?.carrier}</span>
                                          </div>
                                        </div>
                                      )}

                                      {((ord as any).expectedDeliveryDate || (ord as any).fulfillment?.expected_delivery_date) && (
                                        <div className="text-[9px] text-[#7A6C5E] font-bold flex items-center gap-1">
                                          <Clock className="w-2.5 h-2.5 shrink-0 text-[#7A6C5E]" />
                                          <span>ETA: {(ord as any).expectedDeliveryDate || (ord as any).fulfillment?.expected_delivery_date}</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* 5. Update Status & Quick Actions */}
                                  <td className="py-3 px-3 align-top text-right">
                                    <div className="flex flex-col items-end gap-1.5">
                                      <select
                                        value={currentCompletionStatus}
                                        onChange={(e) => handleUpdateOrderStatus(ord.orderId, e.target.value)}
                                        className="w-full max-w-[160px] px-2 py-1 bg-white border border-[#E2D7CB] rounded-lg text-[10px] font-extrabold text-[#2C241D] focus:outline-none focus:border-[#48A63E] shadow-2xs cursor-pointer"
                                      >
                                        <option value="Order Placed & Processing">📦 Placed (15%)</option>
                                        <option value="Processing Order">⚙️ Processing (25%)</option>
                                        <option value="In Production">🔨 In Production (60%)</option>
                                        <option value="Completed & Ready for Dispatch">✅ Ready (80%)</option>
                                        <option value="Shipped & In Transit">🚚 Shipped (85%)</option>
                                        <option value="Out for Delivery">🛵 Out for Delivery (90%)</option>
                                        <option value="Delivered">🎉 Delivered (100%)</option>
                                        <option value="Cancelled">❌ Cancelled (0%)</option>
                                      </select>

                                      <div className="flex items-center gap-1.5">
                                        {!isDelivered ? (
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateOrderStatus(ord.orderId, 'Delivered', 100)}
                                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-extrabold text-[9px] shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                                            title="Mark 100% Delivered"
                                          >
                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                            <span>Mark Delivered</span>
                                          </button>
                                        ) : (
                                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-md font-bold text-[9px] flex items-center gap-0.5">
                                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                                            Delivered
                                          </span>
                                        )}

                                        {ord.orderId.startsWith('CUSTOM-') && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const customId = parseInt(ord.orderId.replace('CUSTOM-', ''), 10);
                                              const found = allAdminCustomOrders.find(c => c.custom_order_id === customId);
                                              if (found) setSelectedCustomForAdminDetails(found);
                                            }}
                                            className="px-2 py-0.5 bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#5C4E42] rounded-md font-bold text-[9px] transition-colors cursor-pointer"
                                          >
                                            Specs
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

              {/* TAB 5b: BESPOKE CUSTOMIZATION, FABRICATION & ON-SITE REQUESTS STUDIO */}
            {activeTab === 'custom_orders' && (
              <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl">
                {/* Top Stats Overview Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Total Customer Requests</span>
                    <span className="text-2xl font-black text-[#2C241D] block">
                      {allAdminCustomOrders.length + allAdminFabrications.length + allAdminServices.length}
                    </span>
                    <span className="text-[10px] text-[#48A63E] font-bold">Across 3 specialized service lines</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">🛋️ Custom Furniture</span>
                    <span className="text-2xl font-black text-purple-700 block">
                      {allAdminCustomOrders.length}
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold">
                      {allAdminCustomOrders.filter(c => c.order_status === 'Pending' || c.order_status === 'Pending Approval' || c.order_status === 'Approved').length} quotes / approval pending
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">🪵 Fabrications</span>
                    <span className="text-2xl font-black text-amber-700 block">
                      {allAdminFabrications.length}
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold">
                      {allAdminFabrications.filter(f => f.status === 'IN_PRODUCTION' || f.status === 'PAID' || f.review_status === 'APPROVED').length} active / in workshop
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs space-y-1">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">🔧 On-Site Services</span>
                    <span className="text-2xl font-black text-blue-700 block">
                      {allAdminServices.length}
                    </span>
                    <span className="text-[10px] text-blue-700 font-bold">
                      {allAdminServices.filter(s => s.status === 'COMPLETED').length} fulfilled visits
                    </span>
                  </div>
                </div>

                {/* Filter & Search Header */}
                <div className="space-y-3 border-b border-[#EFE7DE] pb-4">
                  {/* Category Filter Tabs */}
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                      {[
                        { key: 'all', label: `All Requests (${allAdminCustomOrders.length + allAdminFabrications.length + allAdminServices.length})` },
                        { key: 'custom', label: `🛋️ Customizations (${allAdminCustomOrders.length})` },
                        { key: 'fabrication', label: `🪵 Fabrications (${allAdminFabrications.length})` },
                        { key: 'onsite', label: `🔧 On-Site Services (${allAdminServices.length})` }
                      ].map((tb) => (
                        <button
                          key={tb.key}
                          onClick={() => setCustomerRequestCategoryFilter(tb.key as any)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                            customerRequestCategoryFilter === tb.key
                              ? 'bg-[#38A132] text-white shadow-md'
                              : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {tb.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search ID, customer, service, material..."
                        value={customOrderSearchQuery}
                        onChange={(e) => setCustomOrderSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D] shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Status Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pt-1">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Status:</span>
                    {[
                      { key: 'all', label: 'All Statuses' },
                      { key: 'requests', label: 'Pending & Quotes' },
                      { key: 'paid', label: 'Orders Placed & Active' },
                      { key: 'completed', label: 'Completed' }
                    ].map((st) => (
                      <button
                        key={st.key}
                        onClick={() => setCustomOrderSubTab(st.key as any)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                          customOrderSubTab === st.key
                            ? 'bg-[#2C241D] text-white'
                            : 'bg-white text-[#6B5C4D] border border-[#E2D7CB] hover:bg-[#F9F6F0]'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Unified Customer Requests List Grid */}
                <div className="space-y-4">
                  {(() => {
                    const q = customOrderSearchQuery.toLowerCase().trim();

                    // 1. Filter Customizations
                    const filteredCustoms = allAdminCustomOrders
                      .filter(() => customerRequestCategoryFilter === 'all' || customerRequestCategoryFilter === 'custom')
                      .filter((c) => {
                        if (customOrderSubTab === 'requests') {
                          return c.order_status === 'Pending' || c.order_status === 'Pending Approval' || c.order_status === 'Approved';
                        }
                        if (customOrderSubTab === 'paid') {
                          return c.payment_status === 'Paid' || c.order_status === 'Paid' || c.order_status === 'In Production';
                        }
                        if (customOrderSubTab === 'completed') {
                          return c.order_status === 'Completed';
                        }
                        return true;
                      })
                      .filter((c) => {
                        if (!q) return true;
                        return (
                          c.custom_order_id.toString().includes(q) ||
                          c.furniture_type.toLowerCase().includes(q) ||
                          c.customer_name.toLowerCase().includes(q) ||
                          (c.customer_email && c.customer_email.toLowerCase().includes(q)) ||
                          (c.material && c.material.toLowerCase().includes(q)) ||
                          (c.color && c.color.toLowerCase().includes(q))
                        );
                      })
                      .map((c) => ({
                        type: 'CUSTOMIZATION' as const,
                        id: `CUS-${c.custom_order_id}`,
                        numeric_id: c.custom_order_id,
                        date: c.order_date,
                        raw: c
                      }));

                    // 2. Filter Fabrications
                    const filteredFabs = allAdminFabrications
                      .filter(() => customerRequestCategoryFilter === 'all' || customerRequestCategoryFilter === 'fabrication')
                      .filter((f) => {
                        const st = (f.status || f.review_status || '').toUpperCase();
                        if (customOrderSubTab === 'requests') {
                          return st === 'NEW' || st === 'UNDER_REVIEW' || st === 'MORE_INFO_REQUESTED' || st === 'QUOTED' || st === 'PENDING';
                        }
                        if (customOrderSubTab === 'paid') {
                          return st === 'PAID' || st === 'IN_PRODUCTION' || st === 'APPROVED' || st === 'APPROVED_BY_RETAIL' || st === 'ASSESSED';
                        }
                        if (customOrderSubTab === 'completed') {
                          return st === 'COMPLETED';
                        }
                        return true;
                      })
                      .filter((f) => {
                        if (!q) return true;
                        return (
                          (f.fabrication_id && f.fabrication_id.toString().includes(q)) ||
                          (f.service_type && f.service_type.toLowerCase().includes(q)) ||
                          (f.customer_name && f.customer_name.toLowerCase().includes(q)) ||
                          (f.customer_email && f.customer_email.toLowerCase().includes(q)) ||
                          (f.material_source && f.material_source.toLowerCase().includes(q))
                        );
                      })
                      .map((f) => ({
                        type: 'FABRICATION' as const,
                        id: `FAB-${f.fabrication_id}`,
                        numeric_id: f.fabrication_id,
                        date: f.created_at || f.date,
                        raw: f
                      }));

                    // 3. Filter Onsite Services
                    const filteredServices = allAdminServices
                      .filter(() => customerRequestCategoryFilter === 'all' || customerRequestCategoryFilter === 'onsite')
                      .filter((s) => {
                        const st = (s.status || s.review_status || '').toUpperCase();
                        if (customOrderSubTab === 'requests') {
                          return st === 'PENDING' || st === 'NEW' || st === 'QUOTED' || st === 'UNDER_REVIEW' || st === 'MORE_INFO_REQUESTED';
                        }
                        if (customOrderSubTab === 'paid') {
                          return st === 'PAID' || st === 'APPROVED' || st === 'WORKER_ASSIGNED' || st === 'SCHEDULED' || st === 'IN_PROGRESS';
                        }
                        if (customOrderSubTab === 'completed') {
                          return st === 'COMPLETED';
                        }
                        return true;
                      })
                      .filter((s) => {
                        if (!q) return true;
                        return (
                          (s.service_id && s.service_id.toString().includes(q)) ||
                          (s.service_category && s.service_category.toLowerCase().includes(q)) ||
                          (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
                          (s.customer_email && s.customer_email.toLowerCase().includes(q)) ||
                          (s.address && s.address.toLowerCase().includes(q)) ||
                          (s.city && s.city.toLowerCase().includes(q))
                        );
                      })
                      .map((s) => ({
                        type: 'ON_SITE_SERVICES' as const,
                        id: `ONS-${s.service_id}`,
                        numeric_id: s.service_id,
                        date: s.created_at || s.preferred_date,
                        raw: s
                      }));

                    // Combine & Sort by Date
                    const combinedList = [...filteredCustoms, ...filteredFabs, ...filteredServices];
                    combinedList.sort((a, b) => {
                      const dateA = a.date ? new Date(a.date).getTime() : 0;
                      const dateB = b.date ? new Date(b.date).getTime() : 0;
                      return dateB - dateA;
                    });

                    if (combinedList.length === 0) {
                      return (
                        <div className="p-8 text-center bg-white rounded-2xl border border-[#E2D7CB] text-[#7A6C5E]">
                          <Sliders className="w-10 h-10 text-[#9E9082] mx-auto opacity-50 mb-2" />
                          <p className="font-extrabold text-sm text-[#2C241D]">No customer requests found</p>
                          <p className="text-xs text-[#8C7C6D] mt-0.5">Custom furniture, fabrication, or onsite service bookings will appear here.</p>
                        </div>
                      );
                    }

                    return combinedList.map((item) => {
                      // -------------------------------------------------------------
                      // RENDER 1: CUSTOMIZATION (BESPOKE FURNITURE)
                      // -------------------------------------------------------------
                      if (item.type === 'CUSTOMIZATION') {
                        const ord = item.raw;
                        return (
                          <div
                            key={`custom-${ord.custom_order_id}`}
                            className="rounded-2xl p-3.5 shadow-sm border border-[#E2D7CB] bg-white/90 text-[#2C241D] space-y-2.5 hover:border-[#38A132]/50 hover:bg-white transition-all"
                          >
                            {/* Top Header Bar */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-mono font-extrabold text-purple-800 px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200">
                                  🛋️ CUSTOM #{ord.custom_order_id}
                                </span>

                                {ord.payment_status === 'Paid' || ord.order_status === 'Paid' ? (
                                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Paid in Full</span>
                                  </span>
                                ) : (
                                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    ord.order_status === 'Pending' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                    ord.order_status === 'Approved' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                    ord.order_status === 'In Production' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                                    ord.order_status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                                    'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}>
                                    Status: {ord.order_status}
                                  </span>
                                )}

                                <h3 className="text-sm font-black text-[#2C241D] tracking-tight ml-1">
                                  Custom {ord.furniture_type}
                                </h3>
                              </div>

                              <div className="text-xs font-black text-[#38A132] bg-[#38A132]/10 px-3 py-0.5 rounded-lg border border-[#38A132]/20 shrink-0">
                                {ord.estimated_price ? `₹${ord.estimated_price.toLocaleString('en-IN')}` : 'Quote Pending'}
                              </div>
                            </div>

                            {/* Specifications Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-xs">
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Client Details</span>
                                <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">👤 {ord.customer_name}</span>
                                <span className="text-[10px] text-[#7A6C5E] block truncate">{ord.customer_email || 'N/A'}</span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Dimensions</span>
                                <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">📐 {ord.dimensions}</span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Timber / Material</span>
                                <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">🪵 {ord.material}</span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Color & Finish</span>
                                <span className="font-extrabold text-[#38A132] block truncate text-[11px]">🎨 {renderColorSwatchBadge(ord.color)}</span>
                              </div>
                            </div>

                            {/* Reference Images Thumbnails */}
                            {ord.reference_image && parseReferenceImages(ord.reference_image).length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block shrink-0">Reference Images:</span>
                                {parseReferenceImages(ord.reference_image).map((imgUrl, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => openImageInNewTab(imgUrl)}
                                    className="w-7 h-7 rounded-md overflow-hidden border border-[#E2D7CB] shadow-2xs block shrink-0 cursor-pointer"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`Ref ${i + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                    />
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Footer: Worker Banner + Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-[#EFE7DE]">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <Wrench className="w-3.5 h-3.5 text-[#38A132] shrink-0" />
                                <span className="font-extrabold text-[#7A6C5E]">Assigned Artisan:</span>
                                {ord.assigned_workers && ord.assigned_workers.length > 0 ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {ord.assigned_workers.map((w, idx) => (
                                      <span key={idx} className="font-extrabold text-[#2C241D] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E2D7CB] text-[10px]">
                                        👷 {w.worker_name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="font-bold text-amber-800 italic bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px]">
                                    No Artisan Worker Assigned Yet
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                                <button
                                  onClick={() => setSelectedCustomForAdminDetails(ord)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
                                >
                                  <Eye className="w-3 h-3 text-slate-600" />
                                  <span>View Full Specs</span>
                                </button>

                                <button
                                  onClick={() => handleAdminOpenPriceModal(ord)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                >
                                  <DollarSign className="w-3 h-3 text-amber-600" />
                                  <span>{ord.estimated_price ? `Edit Price (₹${ord.estimated_price.toLocaleString()})` : 'Set Price Quote'}</span>
                                </button>

                                {!(ord.is_locked || ord.order_status === 'Approved' || ord.order_status === 'In Production' || ord.order_status === 'Completed' || (ord.estimated_price && ord.estimated_price > 0)) ? (
                                  <button
                                    onClick={() => handleAdminToggleLock(ord)}
                                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                                    title="Specs Unlocked. Click to Lock Specs."
                                  >
                                    <Unlock className="w-3.5 h-3.5 text-amber-600" />
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                                    title="Specs Locked"
                                  >
                                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  </button>
                                )}
                                {(ord.payment_status === 'Paid' || ord.order_status === 'Paid') && (
                                  <button
                                    onClick={() => downloadPaymentReceipt(ord)}
                                    className="px-2.5 py-1 rounded-lg bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <Download className="w-3 h-3 text-white" />
                                    <span>Download Receipt</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // -------------------------------------------------------------
                      // RENDER 2: FABRICATION REQUEST
                      // -------------------------------------------------------------
                      if (item.type === 'FABRICATION') {
                        const fab = item.raw;
                        return (
                          <div
                            key={`fab-${fab.fabrication_id}`}
                            className="rounded-2xl p-3.5 shadow-sm border border-[#E2D7CB] bg-white/90 text-[#2C241D] space-y-2.5 hover:border-amber-500/50 hover:bg-white transition-all"
                          >
                            {/* Top Header Bar */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-mono font-extrabold text-amber-800 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200">
                                  🪵 FABRICATION #{fab.fabrication_id}
                                </span>

                                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                  fab.status === 'PAID' || fab.status === 'IN_PRODUCTION'
                                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                    : fab.status === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}>
                                  Status: {fab.status || fab.review_status || 'Under Review'}
                                </span>

                                <h3 className="text-sm font-black text-[#2C241D] tracking-tight ml-1">
                                  {fab.service_type || 'Custom Joinery & Fabrication'}
                                </h3>
                              </div>

                              <div className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-0.5 rounded-lg border border-amber-200 shrink-0">
                                {fab.estimated_price ? `₹${parseFloat(fab.estimated_price).toLocaleString('en-IN')}` : 'Quote Pending'}
                              </div>
                            </div>

                            {/* Specifications Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-xs">
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Client Details</span>
                                <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">👤 {fab.customer_name || 'Customer'}</span>
                                <span className="text-[10px] text-[#7A6C5E] block truncate">{fab.customer_email || 'N/A'}</span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Dimensions</span>
                                <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">📐 {fab.dimensions || 'Custom Size'}</span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Material Source</span>
                                <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">🪵 {fab.material_source || 'Customer / In-House'}</span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Quantity & Specs</span>
                                <span className="font-extrabold text-amber-800 block truncate text-[11px]">📦 {fab.quantity || 1} Piece(s)</span>
                              </div>
                            </div>

                            {/* Requirements / Notes */}
                            {fab.requirements && (
                              <div className="text-[11px] text-[#5C4E42] bg-white p-2 rounded-xl border border-[#EFE7DE] flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="line-clamp-1"><strong>Notes:</strong> {fab.requirements}</span>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#EFE7DE]">
                              <span className="text-[10px] text-[#7A6C5E] font-medium">
                                Submitted: {fab.created_at ? new Date(fab.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setSelectedFabForAdminDetails(fab)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-amber-200"
                                >
                                  <Eye className="w-3 h-3 text-amber-600" />
                                  <span>View Fabrication Details</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // -------------------------------------------------------------
                      // RENDER 3: ON-SITE SERVICE REQUEST
                      // -------------------------------------------------------------
                      if (item.type === 'ON_SITE_SERVICES') {
                        const srv = item.raw;
                        return (
                          <div
                            key={`service-${srv.service_id}`}
                            className="rounded-2xl p-3.5 shadow-sm border border-[#E2D7CB] bg-white/90 text-[#2C241D] space-y-2.5 hover:border-blue-500/50 hover:bg-white transition-all"
                          >
                            {/* Top Header Bar */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-mono font-extrabold text-blue-800 px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                                  🔧 ON-SITE SERVICE #{srv.service_id}
                                </span>

                                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                  srv.status === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                    : srv.status === 'WORKER_ASSIGNED' || srv.status === 'SCHEDULED' || srv.status === 'IN_PROGRESS'
                                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}>
                                  Status: {srv.status || 'PENDING'}
                                </span>

                                <h3 className="text-sm font-black text-[#2C241D] tracking-tight ml-1">
                                  {srv.service_category || 'On-Site Skilled Service'}
                                </h3>
                              </div>

                              <div className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-0.5 rounded-lg border border-blue-200 shrink-0">
                                {srv.estimated_price ? `₹${parseFloat(srv.estimated_price).toLocaleString('en-IN')}` : 'Quote Pending'}
                              </div>
                            </div>

                            {/* Specifications Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-xs">
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Client Details</span>
                                <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">👤 {srv.customer_name || 'Customer'}</span>
                                <span className="text-[10px] text-[#7A6C5E] block truncate">{srv.customer_phone || srv.customer_email || 'N/A'}</span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Service Location</span>
                                <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">📍 {srv.city || 'Kottayam'}, {srv.pincode || ''}</span>
                                <span className="text-[10px] text-[#7A6C5E] block truncate">{srv.address || 'Standard Address'}</span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Preferred Schedule</span>
                                <span className="font-extrabold text-[#2C241D] block truncate text-[11px]">
                                  📅 {srv.preferred_date ? new Date(srv.preferred_date).toLocaleDateString() : 'Flexible'}
                                </span>
                                <span className="text-[10px] text-[#7A6C5E] block truncate">⏰ {srv.preferred_time || 'Morning Slot'}</span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Assigned Technician</span>
                                <span className="font-extrabold text-blue-800 block truncate text-[11px]">
                                  {srv.jobs && srv.jobs.length > 0 ? `👷 ${srv.jobs.map((j: any) => j.worker_name).join(', ')}` : 'Technician Unassigned'}
                                </span>
                              </div>
                            </div>

                            {/* Service Description */}
                            {srv.description && (
                              <div className="text-[11px] text-[#5C4E42] bg-white p-2 rounded-xl border border-[#EFE7DE] flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="line-clamp-1"><strong>Service Request:</strong> {srv.description}</span>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#EFE7DE]">
                              <span className="text-[10px] text-[#7A6C5E] font-medium">
                                Booked: {srv.created_at ? new Date(srv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setSelectedServiceForAdminDetails(srv)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer border border-blue-200"
                                >
                                  <Eye className="w-3 h-3 text-blue-600" />
                                  <span>View Service Details</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    });
                  })()}
                </div>
              </div>
            )}

            {/* TAB: NEEDS ATTENTION & OPERATIONAL ALERTS */}
            {activeTab === 'alerts' && (() => {
              // Aggregate live alerts from system sources
              const dbAlerts = dashboardSummary?.alerts || [];
              const lowStockAlerts = (productList || [])
                .filter(p => (((p as any).stockQuantity ?? p.stockCount ?? (p as any).stock ?? 0) <= 5))
                .map(p => {
                  const stockVal = (p as any).stockQuantity ?? p.stockCount ?? (p as any).stock ?? 0;
                  const pid = p.id || (p as any).product_id || p.sku;
                  return {
                    id: `stock-${pid}`,
                    severity: (stockVal === 0 ? 'URGENT' : 'LOW_STOCK') as any,
                    title: `Low Stock: ${p.name || (p as any).product_name || 'Product'}`,
                    description: `Current available stock is ${stockVal} units (Reorder threshold: 5).`,
                    type: 'low_stock',
                    entityId: pid
                  };
                });

              const maintenanceVehicleAlerts = (vehiclesList || [])
                .filter(v => v.status === 'MAINTENANCE')
                .map(v => ({
                  id: `veh-${v.id}`,
                  severity: 'WARNING',
                  title: `Vehicle Under Maintenance: ${v.registration_number}`,
                  description: `${v.vehicle_type} (${v.id}) is currently in maintenance and unavailable for order dispatch.`,
                  type: 'fleet',
                  entityId: v.id
                }));

              const allAggregatedAlerts = [...dbAlerts, ...lowStockAlerts, ...maintenanceVehicleAlerts];
              const urgentCount = allAggregatedAlerts.filter(a => a.severity === 'URGENT' || a.severity === 'CRITICAL').length;
              const warningCount = allAggregatedAlerts.filter(a => a.severity === 'WARNING' || a.severity === 'LOW_STOCK').length;

              return (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl bg-white/80 backdrop-blur-xl animate-fadeIn">
                  {/* Header & Stats Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <span>Needs Attention & Operational Alerts</span>
                      </h2>
                      <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                        Real-time operational alerts requiring administrative evaluation or immediate attention.
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        setIsLoadingSummary(true);
                        try {
                          const summary = await fetchAdminDashboardSummaryDB();
                          if (summary) setDashboardSummary(summary);
                          await loadFleetDataFromDB();
                        } catch (e) {
                          console.warn('Failed to refresh alert metrics:', e);
                        } finally {
                          setIsLoadingSummary(false);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#38A132]" />
                      <span>Refresh Health Check</span>
                    </button>
                  </div>

                  {/* Operational Health KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Total Active Alerts</span>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-black text-[#2C241D]">
                        {allAggregatedAlerts.length}
                      </div>
                      <span className="text-[10px] font-bold text-[#7A6C5E] block">
                        {allAggregatedAlerts.length === 0 ? 'All parameters normal' : 'Issues requiring review'}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Urgent Action Items</span>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      </div>
                      <div className={`text-2xl font-black ${urgentCount > 0 ? 'text-rose-600' : 'text-[#2C241D]'}`}>
                        {urgentCount}
                      </div>
                      <span className={`text-[10px] font-bold block ${urgentCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {urgentCount > 0 ? 'Requires immediate action' : 'Zero critical blockers'}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Warnings & Inventory</span>
                        <Package className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-2xl font-black text-amber-700">
                        {warningCount}
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 block">
                        Low stock & fleet servicing
                      </span>
                    </div>
                  </div>

                  {/* ALERTS CONTENT CONTAINER */}
                  {allAggregatedAlerts.length === 0 ? (
                    /* BEAUTIFUL EMPTY STATE WHEN NO ALERTS EXIST */
                    <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-[#E2D7CB] shadow-sm space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                        <ShieldCheck className="w-8 h-8" />
                      </div>

                      <div className="space-y-1 max-w-md mx-auto">
                        <h3 className="text-lg font-black text-[#2C241D]">
                          All Systems Operating Smoothly
                        </h3>
                        <p className="text-xs text-[#7A6C5E] font-medium leading-relaxed">
                          No active operational bottlenecks, delayed builds, quality control failures, or low stock warnings currently require attention.
                        </p>
                      </div>

                      {/* Live System Health Check Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-2xl mx-auto text-left">
                        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] space-y-1">
                          <span className="text-[10px] font-extrabold text-[#38A132] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Healthy Stock
                          </span>
                          <p className="text-[11px] text-[#2C241D] font-bold">Catalog Inventory</p>
                        </div>

                        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] space-y-1">
                          <span className="text-[10px] font-extrabold text-[#38A132] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> On Track
                          </span>
                          <p className="text-[11px] text-[#2C241D] font-bold">Custom Workshop</p>
                        </div>

                        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] space-y-1">
                          <span className="text-[10px] font-extrabold text-[#38A132] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Fleet Ready
                          </span>
                          <p className="text-[11px] text-[#2C241D] font-bold">Order Dispatch</p>
                        </div>

                        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] space-y-1">
                          <span className="text-[10px] font-extrabold text-[#38A132] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Cleared
                          </span>
                          <p className="text-[11px] text-[#2C241D] font-bold">QC Inspections</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ACTIVE ALERTS LIST */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#2C241D]">Active System Notifications ({allAggregatedAlerts.length})</span>
                        <span className="text-[11px] text-[#7A6C5E]">Sorted by priority</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {allAggregatedAlerts.map((alt, idx) => {
                          const isUrgent = alt.severity === 'URGENT' || alt.severity === 'CRITICAL';
                          const isLowStock = alt.severity === 'LOW_STOCK';

                          return (
                            <div
                              key={alt.id || idx}
                              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                                isUrgent
                                  ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400'
                                  : isLowStock
                                  ? 'bg-amber-50/70 border-amber-200 hover:border-amber-400'
                                  : 'bg-white border-[#E2D7CB] hover:border-[#38A132]'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                                  isUrgent ? 'bg-rose-100 text-rose-700' : isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  <AlertTriangle className="w-4 h-4" />
                                </div>

                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                      isUrgent
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : isLowStock
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-blue-100 text-blue-800 border-blue-200'
                                    }`}>
                                      {alt.severity}
                                    </span>
                                    <h4 className="text-xs font-black text-[#2C241D]">{alt.title}</h4>
                                  </div>
                                  <p className="text-[11px] text-[#5C4E42] font-medium leading-relaxed">{alt.description}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                {isLowStock ? (
                                  <button
                                    onClick={() => setActiveTab('inventory')}
                                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
                                  >
                                    Restock Item
                                  </button>
                                ) : alt.type === 'fleet' ? (
                                  <button
                                    onClick={() => setActiveTab('fleet')}
                                    className="px-3 py-1.5 rounded-xl bg-[#2C241D] hover:bg-[#4A3E32] text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
                                  >
                                    Manage Fleet
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setActiveTab('orders')}
                                    className="px-3 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
                                  >
                                    View Details
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 6: STAFF & CUSTOMER QUERIES */}
              {activeTab === 'queries' && (
                <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div className="flex items-center gap-2">
                      {['All', 'Pending', 'Resolved'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setQueryFilter(st as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                            queryFilter === st
                              ? 'bg-[#48A63E] text-white'
                              : 'bg-[#F9F6F0] text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search staff, email, subject, message..."
                        value={querySearchQuery}
                        onChange={(e) => setQuerySearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>
                  </div>

                  {/* Queries Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Staff Member</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4">Submitted Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium">
                        {staffQueries
                          .filter((q) => queryFilter === 'All' || (queryFilter === 'Pending' ? q.status === 'Pending' : q.status !== 'Pending'))
                          .filter((q) => {
                            if (!querySearchQuery.trim()) return true;
                            const sq = querySearchQuery.toLowerCase();
                            return (
                              q.staffName.toLowerCase().includes(sq) ||
                              q.staffEmail.toLowerCase().includes(sq) ||
                              q.subject.toLowerCase().includes(sq) ||
                              q.category.toLowerCase().includes(sq) ||
                              (q.message && q.message.toLowerCase().includes(sq))
                            );
                          }).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#7A6C5E]">
                              <MessageSquare className="w-8 h-8 text-[#9E9082] mx-auto opacity-50 mb-1" />
                              <p className="font-extrabold text-xs text-[#2C241D]">No queries or requests found</p>
                              <p className="text-[11px] text-[#8C7C6D]">Submitted staff and customer requests will appear here.</p>
                            </td>
                          </tr>
                        ) : (
                          staffQueries
                            .filter((q) => queryFilter === 'All' || (queryFilter === 'Pending' ? q.status === 'Pending' : q.status !== 'Pending'))
                            .filter((q) => {
                              if (!querySearchQuery.trim()) return true;
                              const sq = querySearchQuery.toLowerCase();
                              return (
                                q.staffName.toLowerCase().includes(sq) ||
                                q.staffEmail.toLowerCase().includes(sq) ||
                                q.subject.toLowerCase().includes(sq) ||
                                q.category.toLowerCase().includes(sq) ||
                                (q.message && q.message.toLowerCase().includes(sq))
                              );
                            })
                            .map((query) => (
                              <tr key={query.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                <td className="py-4 px-4 font-extrabold text-[#2C241D]">
                                  <div>{query.staffName}</div>
                                  <span className="text-[10px] text-[#7A6C5E] font-mono">{query.staffEmail}</span>
                                </td>
                                <td className="py-4 px-4 text-[#6B5C4D]">
                                  <span className="bg-[#48A63E]/10 px-2 py-0.5 rounded-md font-bold text-[#48A63E]">
                                    {query.category}
                                  </span>
                                </td>
                                <td className="py-4 px-4 font-bold text-[#2C241D]">{query.subject}</td>
                                <td className="py-4 px-4 font-mono text-[#7A6C5E]">{query.createdAt}</td>
                                <td className="py-4 px-4">
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                    query.status === 'Resolved' || query.status === 'Approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {query.status}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <button
                                    onClick={() => handleOpenQueryModal(query)}
                                    className="px-3 py-1.5 rounded-xl bg-[#48A63E] text-white font-extrabold hover:bg-[#3D9134] transition-all shadow-xs cursor-pointer"
                                  >
                                    Respond
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: COUPONS & DISCOUNTS MANAGEMENT */}
              {activeTab === 'coupons' && (
                <div className="space-y-5">
                  {/* Coupon Summary Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Active Coupons</span>
                        <Tag className="w-4 h-4 text-[#7C3AED]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {couponsList.filter(c => c.status === 'Active' && (!c.customerLimit || c.customerLimit <= 0 || (c.currentRedemptions || 0) < c.customerLimit)).length}
                      </div>
                      <div className="text-[10px] text-[#7C3AED] font-bold mt-1">Available Redeemable Coupons</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Retail Shop Coupons</span>
                        <Percent className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {couponsList.length}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">Total Coupons Created</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Production & Custom</span>
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {couponsList.filter(c => c.audienceType === 'production').length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Custom Furniture Orders</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Section Heading */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-3">
                    <div>
                      <h2 className="text-xl font-extrabold text-[#2C241D] tracking-tight">
                        Coupons & Customer Discounts Management
                      </h2>
                      <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                        Create promo codes, configure percentage discounts, and assign targeted coupons to customer accounts.
                      </p>
                    </div>
                  </div>

                  {/* Create Coupon Form */}
                  <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#E2D7CB] space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-extrabold text-sm text-[#2C241D]">Create & Configure Promotional Coupon</h4>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const prefix = newCouponType === 'percentage_notification' ? 'PROMO' : newCouponType === 'first_n_customers' ? 'FIRST' : 'FLAT';
                            const code = `${prefix}${newCouponDiscount || '15'}_${Math.floor(Math.random() * 90 + 10)}`;
                            setNewCouponCode(code);
                          }}
                          className="text-xs font-extrabold text-[#38A132] hover:underline cursor-pointer"
                        >
                          ⚡ Auto Generate Code
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleCreateCouponSubmit} className="space-y-4 text-xs font-semibold">
                      <div>
                        <label className="block font-bold text-[#7A6C5E] mb-1.5">Select Coupon Type *</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => setNewCouponType('percentage_notification')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              newCouponType === 'percentage_notification'
                                ? 'bg-[#38A132]/10 border-[#38A132] text-[#2C241D] font-extrabold shadow-2xs'
                                : 'bg-white border-[#E2D7CB] text-[#6B5C4D]'
                            }`}
                          >
                            <div className="font-extrabold text-xs text-[#38A132]">1. Percentage % Coupon</div>
                            <div className="text-[10px] text-[#7A6C5E] mt-0.5 font-medium">Delivers notification popover/bell to customer dashboard</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNewCouponType('first_n_customers')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              newCouponType === 'first_n_customers'
                                ? 'bg-[#38A132]/10 border-[#38A132] text-[#2C241D] font-extrabold shadow-2xs'
                                : 'bg-white border-[#E2D7CB] text-[#6B5C4D]'
                            }`}
                          >
                            <div className="font-extrabold text-xs text-[#38A132]">2. First N Customers Coupon</div>
                            <div className="text-[10px] text-[#7A6C5E] mt-0.5 font-medium">Valid for first N customers during payment (0 prior notification)</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNewCouponType('flat_amount')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              newCouponType === 'flat_amount'
                                ? 'bg-[#38A132]/10 border-[#38A132] text-[#2C241D] font-extrabold shadow-2xs'
                                : 'bg-white border-[#E2D7CB] text-[#6B5C4D]'
                            }`}
                          >
                            <div className="font-extrabold text-xs text-[#38A132]">3. Flat Amount (₹ OFF)</div>
                            <div className="text-[10px] text-[#7A6C5E] mt-0.5 font-medium">Fixed rupee discount off total cart subtotal</div>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-[#7A6C5E] mb-1">Coupon Code *</label>
                          <input
                            type="text"
                            placeholder="e.g. SUMMER15"
                            value={newCouponCode}
                            onChange={(e) => setNewCouponCode(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-[#38A132]"
                            required
                          />
                        </div>

                        {newCouponType !== 'flat_amount' ? (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] mb-1">Discount % *</label>
                            <input
                              type="number"
                              min="1"
                              max="90"
                              placeholder="e.g. 15"
                              value={newCouponDiscount}
                              onChange={(e) => setNewCouponDiscount(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132]"
                              required
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] mb-1">Flat Discount Amount (INR ₹) *</label>
                            <input
                              type="number"
                              min="10"
                              placeholder="e.g. 500"
                              value={newCouponFlatAmount}
                              onChange={(e) => setNewCouponFlatAmount(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132]"
                              required
                            />
                          </div>
                        )}

                        {newCouponType === 'first_n_customers' ? (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] mb-1">First N Customer Limit (N) *</label>
                            <input
                              type="number"
                              min="1"
                              max="500"
                              placeholder="e.g. 10"
                              value={newCouponCustomerLimit}
                              onChange={(e) => setNewCouponCustomerLimit(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132]"
                              required
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] mb-1">Target Customer Email (Optional)</label>
                            <input
                              type="text"
                              placeholder="Leave blank for all customers..."
                              value={newCouponUserEmail}
                              onChange={(e) => setNewCouponUserEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132]"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2">
                        <div className="text-[11px] text-[#7A6C5E] font-medium">
                          {newCouponType === 'percentage_notification' && '📢 Dispatches notification directly to Customer Dashboard bell icon.'}
                          {newCouponType === 'first_n_customers' && '🔒 First N customers redemption lock. Zero prior notifications sent.'}
                          {newCouponType === 'flat_amount' && '💵 Flat rupee discount applied directly during checkout payment.'}
                        </div>

                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Coupon</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Active Created Coupons & First N Offers Card Grid */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#38A132]" />
                        <span>Active Created Coupons & Promotional Offers</span>
                      </h4>
                      <span className="text-xs font-extrabold text-[#38A132] bg-[#38A132]/10 px-3 py-1 rounded-lg border border-[#38A132]/20">
                        {couponsList.length} Active Codes
                      </span>
                    </div>

                    {couponsList.length === 0 ? (
                      <div className="p-6 bg-white rounded-2xl border border-[#E2D7CB] text-center text-[#8C7C6D] italic text-xs">
                        No created coupons currently stored. Use the form above to generate a Percentage, First N Customer, or Flat Amount coupon!
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {couponsList.map((c) => {
                          const isFirstN = c.type === 'first_n_customers' || (c.customerLimit && c.customerLimit > 0);
                          const limitN = c.customerLimit || 0;
                          const redeemed = c.currentRedemptions || 0;
                          const isExhausted = (limitN > 0 && redeemed >= limitN) || c.status === 'Inactive';

                          return (
                            <div
                              key={c.id}
                              className={`p-4 rounded-2xl border transition-all space-y-2 relative overflow-hidden shadow-2xs ${
                                isExhausted ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-[#E2D7CB] hover:border-[#38A132]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-mono text-sm font-black text-[#38A132] bg-[#38A132]/10 px-2.5 py-0.5 rounded-lg border border-[#38A132]/25 inline-block uppercase">
                                    {c.code}
                                  </span>
                                  <div className="text-xs font-extrabold text-[#2C241D] mt-1">
                                    {c.flatDiscountAmount ? `₹${c.flatDiscountAmount.toLocaleString('en-IN')} OFF` : `${c.discountPercent}% OFF`}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerateCoupon(c)}
                                    className="px-2 py-1 rounded-lg bg-[#38A132]/10 text-[#38A132] hover:bg-[#38A132] hover:text-white transition-all border border-[#38A132]/30 text-[10px] font-extrabold cursor-pointer flex items-center gap-1"
                                    title="Regenerate & Reactivate Coupon Code"
                                  >
                                    ⚡ Regenerate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCoupon(c.id, c.code)}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-200 cursor-pointer"
                                    title="Delete Coupon Code"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-[11px] text-[#6B5C4D] font-medium line-clamp-1">{c.description}</p>

                              <div className="pt-2 border-t border-[#EFE7DE] flex items-center justify-between text-[10px] font-bold">
                                {isFirstN ? (
                                  <div className="space-y-1 w-full">
                                    <div className="flex items-center justify-between">
                                      <span className="text-blue-700 font-extrabold">🔒 First {limitN} Customers</span>
                                      <span className="text-[#2C241D] font-mono">{redeemed} / {limitN} Used</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[#EAE0D4] rounded-full overflow-hidden">
                                      <div
                                        className={`h-full transition-all ${isExhausted ? 'bg-rose-500' : 'bg-[#38A132]'}`}
                                        style={{ width: `${limitN > 0 ? Math.min(100, Math.round((redeemed / limitN) * 100)) : 0}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-[#7A6C5E] truncate">
                                      {c.targetUserEmail ? `🎯 ${c.targetUserEmail}` : '🌐 All Customers'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${c.status === 'Inactive' || isExhausted ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                      {c.status === 'Inactive' ? 'Inactive' : (isExhausted ? 'Expired' : 'Active')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Unified Customer Coupon Allotment & One-Time Usage Record Table */}
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-[#38A132]" />
                          <span>Customer Coupon Allotment & Usage Records</span>
                        </h4>
                        <p className="text-[11px] text-[#7A6C5E] font-medium">Maintains complete record of customer allotted coupons, delivery status, and single-use enforcement.</p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                          <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search promo code, email..."
                            value={couponSearchQuery}
                            onChange={(e) => setCouponSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                          />
                        </div>
                        <span className="text-xs font-extrabold text-[#38A132] bg-[#38A132]/10 px-3 py-1.5 rounded-xl border border-[#38A132]/20 shrink-0">
                          {allotmentsList.length} Records
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4">Allotted Customer Email / User ID</th>
                            <th className="py-3 px-4">Coupon Code</th>
                            <th className="py-3 px-4">Discount</th>
                            <th className="py-3 px-4">Allotted Date</th>
                            <th className="py-3 px-4">Usage Status</th>
                            <th className="py-3 px-4">Redeemed Date</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium">
                          {allotmentsList
                            .filter((alt) => {
                              if (!couponSearchQuery.trim()) return true;
                              const cq = couponSearchQuery.toLowerCase();
                              return (
                                alt.couponCode.toLowerCase().includes(cq) ||
                                alt.targetUserEmail.toLowerCase().includes(cq)
                              );
                            })
                            .length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-[#8C7C6D] italic">
                                No customer coupon allotments recorded yet. When a coupon is issued or dispatched to a customer email, it will be tracked here.
                              </td>
                            </tr>
                          ) : (
                            allotmentsList
                              .filter((alt) => {
                                if (!couponSearchQuery.trim()) return true;
                                const cq = couponSearchQuery.toLowerCase();
                                return (
                                  alt.couponCode.toLowerCase().includes(cq) ||
                                  alt.targetUserEmail.toLowerCase().includes(cq)
                                );
                              })
                              .map((alt) => (
                                <tr key={alt.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                  <td className="py-3.5 px-4 font-mono font-bold text-[#2C241D]">
                                    ✉️ {alt.targetUserEmail}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-extrabold text-[#38A132]">
                                    <span className="bg-[#38A132]/10 px-2 py-0.5 rounded-md border border-[#38A132]/20">
                                      {alt.couponCode}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                    {alt.discountPercent > 0 ? `${alt.discountPercent}% OFF` : 'Flat OFF'}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">
                                    {alt.allottedDate}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {alt.used ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#38A132]/15 text-[#38A132] border border-[#38A132]/30">
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
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      onClick={() => {
                                        setAllotmentsList(prev => prev.filter(a => a.id !== alt.id));
                                      }}
                                      className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all border border-rose-200 shadow-2xs cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Remove</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* TAB 8: ADMIN BROADCAST & DIRECT MESSAGES */}
              {activeTab === 'broadcast' && (
                <div className="space-y-5">
                  {/* Broadcast Overview KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Dispatched Messages</span>
                        <Send className="w-4 h-4 text-[#48A63E]" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{adminMessagesList.length}</div>
                      <div className="text-[10px] text-[#48A63E] font-bold mt-1">Admin Directives & Announcements</div>
                    </div>

                    <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                        <span>Staff Messages</span>
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                        {adminMessagesList.filter(m => m.recipientType.includes('Staff')).length}
                      </div>
                      <div className="text-[10px] text-blue-700 font-bold mt-1">Retail & Production Directives</div>
                    </div>
                  </div>

                  <div className="relative z-10 ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl">
                    <div className="border-b border-[#EFE7DE] pb-3">
                      <h2 className="text-xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-2">
                        <Send className="w-5 h-5 text-[#48A63E]" />
                        Dispatch Message from Admin
                      </h2>
                      <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                        Send official announcements or direct messages to Staff members. Messages will appear directly on their dashboards as "Message from Admin".
                      </p>
                    </div>

                    {/* Dispatch Form */}
                    <form onSubmit={handleSendAdminMessageSubmit} className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#E2D7CB] space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Target Recipient Audience *</label>
                          <select
                            value={adminMsgRecipientType}
                            onChange={(e) => setAdminMsgRecipientType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                            required
                          >
                            <option value="All Staff">All Staff Members (Retail & Production)</option>
                            <option value="Retail Staff">Retail Staff Only</option>
                            <option value="Production Staff">Production Staff Only</option>
                            <option value="Specific Staff">Specific Staff Member (by Email)</option>
                          </select>
                        </div>

                        {adminMsgRecipientType === 'Specific Staff' && (
                          <div>
                            <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Target Account Email *</label>
                            <input
                              type="email"
                              placeholder="e.g. staff@retailsphere.com"
                              value={adminMsgTargetEmail}
                              onChange={(e) => setAdminMsgTargetEmail(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-mono font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                              required
                            />
                          </div>
                        )}

                        <div className={adminMsgRecipientType === 'Specific Staff' ? 'sm:col-span-2' : ''}>
                          <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Message Subject *</label>
                          <input
                            type="text"
                            placeholder="e.g. Urgent Inventory Count & Quality Assurance Directive"
                            value={adminMsgSubject}
                            onChange={(e) => setAdminMsgSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Message Content *</label>
                        <textarea
                          rows={3}
                          placeholder="Type your official announcement or directive message here..."
                          value={adminMsgContent}
                          onChange={(e) => setAdminMsgContent(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-medium text-xs focus:outline-none focus:border-[#48A63E]"
                          required
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#48A63E]/20 flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                          <Send className="w-4 h-4" />
                          <span>Dispatch Message from Admin</span>
                        </button>
                      </div>
                    </form>

                    {/* Dispatched Messages Record Table */}
                    <div className="space-y-3">
                      <h4 className="font-extrabold text-sm text-[#2C241D] border-b border-[#EFE7DE] pb-2">Dispatched Admin Messages Log</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-4">Recipient Audience</th>
                              <th className="py-3 px-4">Subject</th>
                              <th className="py-3 px-4">Message Content</th>
                              <th className="py-3 px-4">Date Sent</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFE7DE]">
                            {adminMessagesList.filter((msg) => 
                              msg.recipientType === 'All Staff' || 
                              msg.recipientType === 'Retail Staff' || 
                              msg.recipientType === 'Production Staff' || 
                              msg.recipientType === 'Specific Staff'
                            ).length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-[#7A6C5E]">
                                  No active staff admin messages dispatched.
                                </td>
                              </tr>
                            ) : (
                              adminMessagesList
                                .filter((msg) => 
                                  msg.recipientType === 'All Staff' || 
                                  msg.recipientType === 'Retail Staff' || 
                                  msg.recipientType === 'Production Staff' || 
                                  msg.recipientType === 'Specific Staff'
                                )
                                .map((msg) => (
                                  <tr key={msg.id} className="hover:bg-[#F5ECE1]/60 transition-colors">
                                    <td className="py-3.5 px-4 font-bold text-[#2C241D]">
                                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#48A63E]/15 text-[#48A63E] border border-[#48A63E]/30">
                                        {msg.recipientType}
                                      </span>
                                      {msg.targetEmail && (
                                        <div className="text-[10px] text-[#7A6C5E] font-mono mt-0.5">{msg.targetEmail}</div>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">{msg.subject}</td>
                                    <td className="py-3.5 px-4 text-[#6B5C4D] max-w-xs truncate">{msg.message}</td>
                                    <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">{msg.createdDate}</td>
                                    <td className="py-3.5 px-4">
                                      {msg.read || (msg.readByEmails && msg.readByEmails.length > 0) ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          Read ✓ {msg.readByEmails && msg.readByEmails.length > 0 ? `(${msg.readByEmails.length})` : ''}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md">
                                          <Clock className="w-3 h-3 text-amber-600" />
                                          Delivered (Unread)
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                      <button
                                        onClick={() => setAdminMessagesList(deleteAdminMessage(msg.id))}
                                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors inline-flex items-center gap-1 text-xs font-bold border border-rose-200 cursor-pointer"
                                        title="Delete Message Record"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                      </button>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: RAW MATERIALS & TIMBER SUPPLY LEDGER (OPTION 3) */}
              {activeTab === 'materials' && (() => {
                const totalStockVal = rawMaterialsList.reduce((sum, m) => sum + ((m.available_qty || 0) * (m.unit_cost || 0)), 0);
                const lowStockCount = rawMaterialsList.filter(m => m.available_qty <= m.reorder_level).length;
                const totalUnits = rawMaterialsList.reduce((sum, m) => sum + (m.available_qty || 0), 0);

                const filteredRaw = rawMaterialsList.filter(m => {
                  const matchSearch = materialsSearchQuery === '' ||
                    m.material_name.toLowerCase().includes(materialsSearchQuery.toLowerCase()) ||
                    m.category.toLowerCase().includes(materialsSearchQuery.toLowerCase());
                  const matchCat = materialsCategoryFilter === 'All' || m.category === materialsCategoryFilter;
                  return matchSearch && matchCat;
                });

                const filteredCustomer = customerMaterialsList.filter(c => {
                  return materialsSearchQuery === '' ||
                    c.material_type.toLowerCase().includes(materialsSearchQuery.toLowerCase()) ||
                    (c.wood_type && c.wood_type.toLowerCase().includes(materialsSearchQuery.toLowerCase())) ||
                    c.customer_name.toLowerCase().includes(materialsSearchQuery.toLowerCase()) ||
                    c.customer_email.toLowerCase().includes(materialsSearchQuery.toLowerCase());
                });

                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Top Bar: Sub-Tabs & Action Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-4 rounded-2xl border border-[#E2D7CB] shadow-xs">
                      {/* Sub-Tab Switcher */}
                      <div className="flex items-center gap-2 bg-[#FAF7F2] p-1.5 rounded-xl border border-[#E2D7CB]">
                        <button
                          type="button"
                          onClick={() => setMaterialsSubTab('raw')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            materialsSubTab === 'raw'
                              ? 'bg-[#38A132] text-white shadow-xs'
                              : 'text-[#5C4E42] hover:text-[#2C241D]'
                          }`}
                        >
                          <Boxes className="w-4 h-4" />
                          <span>Factory Raw Materials</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                            materialsSubTab === 'raw' ? 'bg-white text-[#38A132]' : 'bg-[#EAE0D4] text-[#2C241D]'
                          }`}>
                            {rawMaterialsList.length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMaterialsSubTab('customer')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            materialsSubTab === 'customer'
                              ? 'bg-[#38A132] text-white shadow-xs'
                              : 'text-[#5C4E42] hover:text-[#2C241D]'
                          }`}
                        >
                          <Layers className="w-4 h-4" />
                          <span>Customer-Supplied Lots</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                            materialsSubTab === 'customer' ? 'bg-white text-[#38A132]' : 'bg-[#EAE0D4] text-[#2C241D]'
                          }`}>
                            {customerMaterialsList.length}
                          </span>
                        </button>
                      </div>

                      {/* Right Action */}
                      <button
                        type="button"
                        onClick={() => setIsAddRawMaterialModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Raw Material Batch</span>
                      </button>
                    </div>

                    {/* KPI Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Total Raw Types</span>
                        <div className="text-2xl font-black text-[#2C241D]">{rawMaterialsList.length} Categories</div>
                        <span className="text-[10px] font-bold text-[#38A132] block">🪵 Timber, Ply, Fabric & Foam</span>
                      </div>

                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Inventory Valuation</span>
                        <div className="text-2xl font-black text-[#38A132]">₹{Math.round(totalStockVal).toLocaleString('en-IN')}</div>
                        <span className="text-[10px] font-bold text-[#5C4E42] block">Approx Total Asset Value</span>
                      </div>

                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Low Stock Warnings</span>
                        <div className={`text-2xl font-black ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {lowStockCount} Items
                        </div>
                        <span className="text-[10px] font-bold text-amber-700 block">Below Reorder Threshold</span>
                      </div>

                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Customer Timber Lots</span>
                        <div className="text-2xl font-black text-[#2C241D]">{customerMaterialsList.length} Registered</div>
                        <span className="text-[10px] font-bold text-purple-700 block">For Bespoke Fabrication</span>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder={materialsSubTab === 'raw' ? "Search raw material by name or category..." : "Search customer lots by client, wood type..."}
                          value={materialsSearchQuery}
                          onChange={(e) => setMaterialsSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                        />
                      </div>

                      {materialsSubTab === 'raw' && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <label className="text-xs font-bold text-[#5C4E42] whitespace-nowrap">Category:</label>
                          <select
                            value={materialsCategoryFilter}
                            onChange={(e) => setMaterialsCategoryFilter(e.target.value)}
                            className="px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-extrabold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                          >
                            <option value="All">All Categories</option>
                            <option value="Timber">Timber Logs & Planks</option>
                            <option value="Plywood">Commercial Plywood</option>
                            <option value="Fabric">Upholstery Fabrics</option>
                            <option value="Foam">PU Cushioning Foam</option>
                            <option value="Hardware">Hardware & Fasteners</option>
                            <option value="Finishing">Varnish & Polishes</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Tab 1: Factory Raw Materials Table */}
                    {materialsSubTab === 'raw' && (
                      <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-[#EFE7DE] flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-[#38A132]" />
                            <span>Factory Raw Materials Inventory ({filteredRaw.length})</span>
                          </h3>
                          <span className="text-[11px] font-bold text-[#7A6C5E]">Auto-tracked stock consumption</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#EFE7DE] bg-[#FAF7F2] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider">
                                <th className="py-3 px-4">Material Details</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Available Stock</th>
                                <th className="py-3 px-4">Reserved / In Use</th>
                                <th className="py-3 px-4">Scrap / Wasted</th>
                                <th className="py-3 px-4">Unit Cost & Value</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] font-semibold">
                              {filteredRaw.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="py-10 text-center text-[#7A6C5E]">
                                    No raw materials found matching your criteria.
                                  </td>
                                </tr>
                              ) : (
                                filteredRaw.map((mat) => {
                                  const isLow = mat.available_qty <= mat.reorder_level;
                                  return (
                                    <tr key={mat.material_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                                      <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 font-black text-xs">
                                            🪵
                                          </div>
                                          <div>
                                            <span className="block text-xs font-black text-[#2C241D]">{mat.material_name}</span>
                                            <span className="text-[10px] text-[#7A6C5E] font-mono">ID #{mat.material_id}</span>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                                          mat.category === 'Timber' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                          mat.category === 'Plywood' ? 'bg-orange-100 text-orange-900 border-orange-300' :
                                          mat.category === 'Fabric' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                                          mat.category === 'Foam' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                                          'bg-gray-100 text-gray-800 border-gray-300'
                                        }`}>
                                          {mat.category}
                                        </span>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        <div className="font-black text-sm text-[#2C241D]">
                                          {mat.available_qty.toLocaleString('en-IN')} <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase">{mat.unit}</span>
                                        </div>
                                        <span className="text-[10px] text-[#7A6C5E] font-medium">Reorder at: {mat.reorder_level} {mat.unit}</span>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        <div className="text-xs font-bold text-[#4A3E32]">
                                          <span className="text-amber-800 font-extrabold">{mat.reserved_qty}</span> reserved
                                        </div>
                                        <div className="text-[10px] text-[#7A6C5E]">
                                          {mat.used_qty} consumed
                                        </div>
                                      </td>

                                      <td className="py-3.5 px-4 font-mono text-rose-700 font-bold">
                                        {mat.wasted_qty} {mat.unit}
                                      </td>

                                      <td className="py-3.5 px-4">
                                        <div className="font-extrabold text-[#2C241D]">
                                          ₹{mat.unit_cost.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-[#7A6C5E]">/{mat.unit}</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-[#38A132]">
                                          Total: ₹{Math.round(mat.available_qty * mat.unit_cost).toLocaleString('en-IN')}
                                        </div>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        {isLow ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                                            Low Stock
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            In Stock
                                          </span>
                                        )}
                                      </td>

                                      <td className="py-3.5 px-4 text-right">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedMatForAdjust(mat);
                                            setAdjustQtyInput('');
                                            setAdjustType('Replenish');
                                            setIsStockAdjustModalOpen(true);
                                          }}
                                          className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE7DE] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-[11px] shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                                        >
                                          <Edit3 className="w-3 h-3 text-[#38A132]" />
                                          <span>Adjust Stock</span>
                                        </button>
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

                    {/* Tab 2: Customer-Supplied Materials Table */}
                    {materialsSubTab === 'customer' && (
                      <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-[#EFE7DE] flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#38A132]" />
                            <span>Customer-Supplied Timber & Material Lots ({filteredCustomer.length})</span>
                          </h3>
                          <span className="text-[11px] font-bold text-[#7A6C5E]">Allocated for customer custom builds</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#EFE7DE] bg-[#FAF7F2] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider">
                                <th className="py-3 px-4">Lot ID & Wood Type</th>
                                <th className="py-3 px-4">Customer Owner</th>
                                <th className="py-3 px-4">Supplied Quantity</th>
                                <th className="py-3 px-4">Remaining Available</th>
                                <th className="py-3 px-4">Condition & Specs</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Date Logged</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] font-semibold">
                              {filteredCustomer.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-10 text-center text-[#7A6C5E]">
                                    No customer-supplied materials registered yet.
                                  </td>
                                </tr>
                              ) : (
                                filteredCustomer.map((cust) => (
                                  <tr key={cust.material_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                                    <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-purple-50 text-purple-800 border border-purple-200">
                                          LOT #{cust.material_id}
                                        </span>
                                        <div>
                                          <span className="block font-black text-xs text-[#2C241D]">{cust.wood_type || cust.material_type}</span>
                                          <span className="text-[10px] text-[#7A6C5E]">{cust.material_type}</span>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-4">
                                      <div className="font-extrabold text-[#2C241D]">{cust.customer_name}</div>
                                      <div className="text-[10px] font-mono text-[#7A6C5E]">{cust.customer_email || `Customer #${cust.customer_id}`}</div>
                                    </td>

                                    <td className="py-3.5 px-4 font-black text-[#2C241D]">
                                      {cust.quantity} <span className="text-[10px] font-bold text-[#7A6C5E] uppercase">{cust.unit}</span>
                                    </td>

                                    <td className="py-3.5 px-4 font-black text-[#38A132]">
                                      {cust.remaining_quantity} <span className="text-[10px] font-bold text-[#7A6C5E] uppercase">{cust.unit}</span>
                                    </td>

                                    <td className="py-3.5 px-4">
                                      <div className="text-xs font-bold text-[#2C241D]">{cust.condition || 'Good'}</div>
                                      {cust.dimensions && <div className="text-[10px] text-[#7A6C5E] font-mono">{cust.dimensions}</div>}
                                      {cust.notes && <div className="text-[10px] text-[#5C4E42] italic truncate max-w-xs">{cust.notes}</div>}
                                    </td>

                                    <td className="py-3.5 px-4">
                                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                        cust.status === 'APPROVED' || cust.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                                        cust.status === 'RECEIVED' || cust.status === 'INSPECTED' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                                        'bg-purple-100 text-purple-900 border-purple-300'
                                      }`}>
                                        {cust.status}
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#7A6C5E]">
                                      {cust.created_at ? new Date(cust.created_at).toLocaleDateString() : 'Recent'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: QUALITY ASSURANCE & STAGE INSPECTION HUB (QC) (OPTION 4) */}
              {activeTab === 'quality' && (() => {
                const totalInspections = qualityInspectionsList.length;
                const passedCount = qualityInspectionsList.filter(i => i.result === 'PASS').length;
                const passRate = totalInspections > 0 ? Math.round((passedCount / totalInspections) * 100) : 100;
                const activeReworks = reworkJobsList.filter(r => r.status !== 'RESOLVED').length;

                const filteredInspections = qualityInspectionsList.filter(i => {
                  const matchSearch = qualitySearchQuery === '' ||
                    i.inspector_name.toLowerCase().includes(qualitySearchQuery.toLowerCase()) ||
                    String(i.order_id).includes(qualitySearchQuery) ||
                    (i.inspection_notes && i.inspection_notes.toLowerCase().includes(qualitySearchQuery.toLowerCase()));
                  const matchType = qualityOrderTypeFilter === 'All' || i.order_type === qualityOrderTypeFilter;
                  const matchResult = qualityResultFilter === 'All' || i.result === qualityResultFilter;
                  return matchSearch && matchType && matchResult;
                });

                const filteredReworks = reworkJobsList.filter(r => {
                  return qualitySearchQuery === '' ||
                    r.worker_name.toLowerCase().includes(qualitySearchQuery.toLowerCase()) ||
                    String(r.order_id).includes(qualitySearchQuery) ||
                    r.rework_reason.toLowerCase().includes(qualitySearchQuery.toLowerCase());
                });

                return (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Top Bar: Sub-Tabs & Action Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-4 rounded-2xl border border-[#E2D7CB] shadow-xs">
                      {/* Sub-Tab Switcher */}
                      <div className="flex items-center gap-2 bg-[#FAF7F2] p-1.5 rounded-xl border border-[#E2D7CB]">
                        <button
                          type="button"
                          onClick={() => setQualitySubTab('inspections')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            qualitySubTab === 'inspections'
                              ? 'bg-[#38A132] text-white shadow-xs'
                              : 'text-[#5C4E42] hover:text-[#2C241D]'
                          }`}
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          <span>Quality Audit Logs</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                            qualitySubTab === 'inspections' ? 'bg-white text-[#38A132]' : 'bg-[#EAE0D4] text-[#2C241D]'
                          }`}>
                            {qualityInspectionsList.length}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setQualitySubTab('rework')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            qualitySubTab === 'rework'
                              ? 'bg-[#38A132] text-white shadow-xs'
                              : 'text-[#5C4E42] hover:text-[#2C241D]'
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4" />
                          <span>Active Rework Queue</span>
                          {activeReworks > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse ${
                              qualitySubTab === 'rework' ? 'bg-rose-500 text-white' : 'bg-rose-600 text-white'
                            }`}>
                              {activeReworks}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Right Action */}
                      <button
                        type="button"
                        onClick={() => setIsRecordQCModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Record QC Inspection</span>
                      </button>
                    </div>

                    {/* KPI Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Total QC Audits</span>
                        <div className="text-2xl font-black text-[#2C241D]">{totalInspections} Recorded</div>
                        <span className="text-[10px] font-bold text-[#38A132] block">Across All Workshop Stages</span>
                      </div>

                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">QC Pass Rate</span>
                        <div className="text-2xl font-black text-emerald-600">{passRate}%</div>
                        <span className="text-[10px] font-bold text-emerald-800 block">First-Time Inspection Compliance</span>
                      </div>

                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Active Rework Jobs</span>
                        <div className={`text-2xl font-black ${activeReworks > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {activeReworks} Jobs
                        </div>
                        <span className="text-[10px] font-bold text-rose-700 block">Pending Artisan Rectification</span>
                      </div>

                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Passed Sign-Offs</span>
                        <div className="text-2xl font-black text-[#2C241D]">{passedCount} Orders</div>
                        <span className="text-[10px] font-bold text-[#38A132] block">Ready for Dispatch / Delivery</span>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder={qualitySubTab === 'inspections' ? "Search QC logs by Order ID, Inspector, or notes..." : "Search rework by Worker or defect reason..."}
                          value={qualitySearchQuery}
                          onChange={(e) => setQualitySearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                        />
                      </div>

                      {qualitySubTab === 'inspections' && (
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs font-bold text-[#5C4E42]">Type:</label>
                            <select
                              value={qualityOrderTypeFilter}
                              onChange={(e) => setQualityOrderTypeFilter(e.target.value)}
                              className="px-2.5 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-extrabold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                            >
                              <option value="All">All Types</option>
                              <option value="Custom">Custom Builds</option>
                              <option value="Fabrication">Fabrications</option>
                              <option value="Readymade">Readymade Store</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <label className="text-xs font-bold text-[#5C4E42]">Result:</label>
                            <select
                              value={qualityResultFilter}
                              onChange={(e) => setQualityResultFilter(e.target.value)}
                              className="px-2.5 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-extrabold focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                            >
                              <option value="All">All Results</option>
                              <option value="PASS">PASS Only</option>
                              <option value="FAIL">FAIL Only</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tab 1: Quality Inspection Records Table */}
                    {qualitySubTab === 'inspections' && (
                      <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-[#EFE7DE] flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-[#38A132]" />
                            <span>Quality Control Inspection Records ({filteredInspections.length})</span>
                          </h3>
                          <span className="text-[11px] font-bold text-[#7A6C5E]">4-Point Technical Audit Compliance</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#EFE7DE] bg-[#FAF7F2] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider">
                                <th className="py-3 px-4">Audit ID & Order</th>
                                <th className="py-3 px-4">Order Type</th>
                                <th className="py-3 px-4">Quality Inspector</th>
                                <th className="py-3 px-4">4-Point Compliance Checklist</th>
                                <th className="py-3 px-4">Overall Result</th>
                                <th className="py-3 px-4">Inspector Findings & Notes</th>
                                <th className="py-3 px-4">Timestamp</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] font-semibold">
                              {filteredInspections.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-10 text-center text-[#7A6C5E]">
                                    No quality control inspections match your filter.
                                  </td>
                                </tr>
                              ) : (
                                filteredInspections.map((insp) => {
                                  const isPass = insp.result === 'PASS';
                                  const chk = insp.checklist || { dimensions: true, finishing: true, structure: true, specifications: true };
                                  return (
                                    <tr key={insp.inspection_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                                      <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            QC-#{insp.inspection_id}
                                          </span>
                                          <div>
                                            <span className="block font-black text-xs text-[#2C241D]">
                                              {insp.order_type === 'Custom' ? `CUSTOM-${insp.order_id}` :
                                               insp.order_type === 'Fabrication' ? `FAB-${insp.order_id}` : `ORDER-${insp.order_id}`}
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                                          insp.order_type === 'Custom' ? 'bg-purple-100 text-purple-900 border-purple-300' :
                                          insp.order_type === 'Fabrication' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                          'bg-blue-100 text-blue-900 border-blue-300'
                                        }`}>
                                          {insp.order_type}
                                        </span>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        <div className="font-extrabold text-[#2C241D]">🧑‍🔧 {insp.inspector_name}</div>
                                        <span className="text-[10px] text-[#7A6C5E]">QC Lead Auditor</span>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                          <span className={`flex items-center gap-1 font-bold ${chk.dimensions ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {chk.dimensions ? '✓' : '✗'} Dimensions
                                          </span>
                                          <span className={`flex items-center gap-1 font-bold ${chk.finishing ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {chk.finishing ? '✓' : '✗'} Finishing
                                          </span>
                                          <span className={`flex items-center gap-1 font-bold ${chk.structure ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {chk.structure ? '✓' : '✗'} Structure
                                          </span>
                                          <span className={`flex items-center gap-1 font-bold ${chk.specifications ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {chk.specifications ? '✓' : '✗'} CAD Specs
                                          </span>
                                        </div>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        {isPass ? (
                                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            PASSED ✓
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                                            <X className="w-3.5 h-3.5 text-rose-600" />
                                            FAILED (REWORK)
                                          </span>
                                        )}
                                      </td>

                                      <td className="py-3.5 px-4 text-xs text-[#4A3E32] max-w-xs">
                                        {insp.inspection_notes || <span className="text-[#9E9082] italic">Passed tolerance check with zero defects.</span>}
                                      </td>

                                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#7A6C5E]">
                                        {insp.inspected_at ? new Date(insp.inspected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
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

                    {/* Tab 2: Active Rework Queue Table */}
                    {qualitySubTab === 'rework' && (
                      <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-[#EFE7DE] flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                            <span>Active Rework & Defect Rectification Queue ({filteredReworks.length})</span>
                          </h3>
                          <span className="text-[11px] font-bold text-[#7A6C5E]">Artisan worker rework tasks</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#EFE7DE] bg-[#FAF7F2] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider">
                                <th className="py-3 px-4">Rework ID & Order</th>
                                <th className="py-3 px-4">Assigned Artisan Worker</th>
                                <th className="py-3 px-4">Defect Reason & Required Fix</th>
                                <th className="py-3 px-4">Job Status</th>
                                <th className="py-3 px-4">Logged At</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#EFE7DE] font-semibold">
                              {filteredReworks.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-10 text-center text-[#7A6C5E]">
                                    🎉 No pending rework jobs in queue! All products meet QC standards.
                                  </td>
                                </tr>
                              ) : (
                                filteredReworks.map((rw) => {
                                  const isResolved = rw.status === 'RESOLVED';
                                  return (
                                    <tr key={rw.rework_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                                      <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-rose-50 text-rose-800 border border-rose-200">
                                            RW-#{rw.rework_id}
                                          </span>
                                          <div>
                                            <span className="block font-black text-xs text-[#2C241D]">
                                              {rw.order_type} #{rw.order_id}
                                            </span>
                                            <span className="text-[10px] text-[#7A6C5E]">Inspection #{rw.inspection_id}</span>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        <div className="font-extrabold text-[#2C241D]">👷 {rw.worker_name}</div>
                                        <span className="text-[10px] text-[#7A6C5E]">Assigned Workshop Craftsman</span>
                                      </td>

                                      <td className="py-3.5 px-4 text-xs text-[#4A3E32] max-w-sm">
                                        <div className="font-bold text-rose-900 bg-rose-50/70 p-2 rounded-xl border border-rose-200">
                                          ⚠️ {rw.rework_reason}
                                        </div>
                                      </td>

                                      <td className="py-3.5 px-4">
                                        {isResolved ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            RESOLVED
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                            <Clock className="w-3 h-3 text-amber-600" />
                                            {rw.status}
                                          </span>
                                        )}
                                      </td>

                                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#7A6C5E]">
                                        {rw.created_at ? new Date(rw.created_at).toLocaleDateString() : 'Recent'}
                                      </td>

                                      <td className="py-3.5 px-4 text-right">
                                        {!isResolved ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedReworkForResolve(rw);
                                              setReworkResolveNotes('Defect rectified by artisan. Joints planed and re-polished.');
                                              setIsResolveReworkModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                                          >
                                            <Check className="w-3 h-3" />
                                            <span>Resolve Rework</span>
                                          </button>
                                        ) : (
                                          <span className="text-[11px] text-emerald-700 font-extrabold">Ready for Re-Audit ✓</span>
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
                );
              })()}

              {/* TAB: ROLES & PERMISSIONS MANAGEMENT */}
              {activeTab === 'roles' && (
                <div className="relative z-10 space-y-6 animate-fadeIn">
                  {/* Top Bar: Title & Action */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-5 rounded-3xl border border-[#E2D7CB] shadow-xs">
                    <div>
                      <h3 className="text-base font-black text-[#2C241D] flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[#38A132]" />
                        <span>Role-Based Access Control & Granted Capabilities</span>
                      </h3>
                      <p className="text-xs text-[#7A6350] font-medium mt-0.5">
                        Manage granular privileges, executive overrides, and operational permissions by account.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthorityEmail('');
                        setSelectedCapabilities([]);
                        setIsFullAdminChecked(false);
                        setIsAuthorityModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Grant Authority & Permissions</span>
                    </button>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#7A6350] tracking-wider block">Configured Capabilities</span>
                      <div className="text-2xl font-black text-[#2C241D]">{CAPABILITY_DEFINITIONS.length} Privileges</div>
                      <span className="text-[10px] font-bold text-[#38A132] block">Active Security System</span>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#7A6350] tracking-wider block">Custom Account Authorities</span>
                      <div className="text-2xl font-black text-[#38A132]">{userAuthoritiesList.length} Accounts</div>
                      <span className="text-[10px] font-bold text-[#7A6350] block">Granular Permission Rules</span>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#7A6350] tracking-wider block">Standard Roles</span>
                      <div className="text-2xl font-black text-[#2C241D]">5 System Roles</div>
                      <span className="text-[10px] font-bold text-[#7A6350] block">Admin, Retail, Production, Artisan, Carrier</span>
                    </div>
                  </div>

                  {/* Capabilities Reference Matrix */}
                  <div className="bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-4">
                    <h4 className="text-xs font-black uppercase text-[#7A6350] tracking-wider">
                      System Capabilities Reference
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {CAPABILITY_DEFINITIONS.map((cap) => (
                        <div key={cap.key} className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-[#2C241D]">
                            <Key className="w-3.5 h-3.5 text-[#38A132]" />
                            <span>{cap.label}</span>
                          </div>
                          <p className="text-[10px] text-[#7A6350] leading-snug font-medium">
                            {cap.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Granted Authorities Table */}
                  <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[#E2D7CB] shadow-sm overflow-hidden space-y-3 p-5 sm:p-6">
                    <h4 className="text-xs font-black uppercase text-[#7A6350] tracking-wider">
                      Granted User Authorities & Overrides ({userAuthoritiesList.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6350]">
                            <th className="py-3 px-4">Account Email</th>
                            <th className="py-3 px-4">Granted Capabilities</th>
                            <th className="py-3 px-4">Last Updated</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D7CB]/60">
                          {userAuthoritiesList.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-[#7A6350] font-bold">
                                No custom account overrides set. Default role-based permissions apply to all users.
                              </td>
                            </tr>
                          ) : (
                            userAuthoritiesList.map((auth) => (
                              <tr key={auth.email} className="hover:bg-[#FAF7F2] transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-[#2C241D]">
                                  {auth.email}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {auth.capabilities.map((capKey) => {
                                      const cap = CAPABILITY_DEFINITIONS.find(c => c.key === capKey);
                                      return (
                                        <span
                                          key={capKey}
                                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#38A132]/15 text-[#2C6B27] border border-[#38A132]/30"
                                        >
                                          {cap ? cap.label : capKey}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-[#7A6350] font-mono text-[11px]">
                                  {auth.assignedDate || 'Active'}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => {
                                      setAuthorityEmail(auth.email);
                                      setSelectedCapabilities(auth.capabilities);
                                      setIsFullAdminChecked(auth.capabilities.length === CAPABILITY_DEFINITIONS.length);
                                      setIsAuthorityModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#EFE7DE] border border-[#E2D7CB] rounded-lg text-xs font-bold text-[#2C241D] transition-colors cursor-pointer"
                                  >
                                    Edit Authority
                                  </button>
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

              {/* TAB: SYSTEM AUDIT & ACTIVITY LOGS */}
              {activeTab === 'audit' && (
                <div className="relative z-10 space-y-6 animate-fadeIn">
                  {/* Top Bar: Title & Refresh */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-5 rounded-3xl border border-[#E2D7CB] shadow-xs">
                    <div>
                      <h3 className="text-base font-black text-[#2C241D] flex items-center gap-2">
                        <FileCheck2 className="w-5 h-5 text-[#38A132]" />
                        <span>System Audit & Security Activity Ledger</span>
                      </h3>
                      <p className="text-xs text-[#7A6350] font-medium mt-0.5">
                        Real-time chronological log of administrative events, data modifications, and system authorizations.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const logs = await fetchAuditLogsDB(100);
                          setAuditLogsList(logs || []);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#FAF7F2] hover:bg-[#EFE7DE] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>Refresh Logs</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportDatabaseExcel}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#2C2016] hover:bg-[#1A130C] text-[#FAF5ED] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5 text-[#DFCDBD]" />
                        <span>Export Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Audit Logs Table */}
                  <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[#E2D7CB] shadow-sm overflow-hidden p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-[#7A6350] tracking-wider">
                        Live Event Records ({auditLogsList.length})
                      </span>
                      <span className="text-[11px] font-bold text-[#38A132] bg-[#38A132]/10 border border-[#38A132]/30 px-2.5 py-0.5 rounded-full">
                        ● System Active
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6350]">
                            <th className="py-3 px-4">Timestamp</th>
                            <th className="py-3 px-4">Event / Action</th>
                            <th className="py-3 px-4">Operator / User</th>
                            <th className="py-3 px-4">Entity</th>
                            <th className="py-3 px-4">Details</th>
                            <th className="py-3 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D7CB]/60">
                          {auditLogsList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-[#7A6350] font-bold">
                                No audit log events recorded yet. System activities will appear here automatically.
                              </td>
                            </tr>
                          ) : (
                            auditLogsList.map((log: any, idx: number) => (
                              <tr key={log.log_id || idx} className="hover:bg-[#FAF7F2] transition-colors">
                                <td className="py-3 px-4 text-[#7A6350] font-mono text-[11px] whitespace-nowrap">
                                  {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                                </td>
                                <td className="py-3 px-4 font-bold text-[#2C241D]">
                                  <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] text-[11px]">
                                    {log.action || log.event || 'System Event'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-mono text-[#2C241D] text-[11px]">
                                  {log.user_email || log.user_name || log.operator || 'Admin System'}
                                </td>
                                <td className="py-3 px-4 text-[#7A6350] font-medium">
                                  {log.target_table || log.entity_type || 'Platform'}
                                </td>
                                <td className="py-3 px-4 text-[#5C4D3E] max-w-xs truncate">
                                  {log.description || log.details || (typeof log.changes === 'object' ? JSON.stringify(log.changes) : String(log.changes || 'Normal operation'))}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    VERIFIED
                                  </span>
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

              {/* TAB: CUSTOMER REVIEWS & FEEDBACK */}
              {activeTab === 'reviews' && (
                <AdminReviewsSection />
              )}

              {/* TAB: LOGISTICS AGREEMENTS & FREIGHT SETTLEMENTS */}
              {activeTab === 'carrier_governance' && (
                <AdminCarrierGovernanceSection />
              )}

              {/* TAB: RETURNS, REPLACEMENTS & CANCELLATIONS */}
              {activeTab === 'returns_cancellations' && (
                <AdminReturnsCancellationsSection />
              )}

              {/* TAB: WORKSHOP MACHINERY & MAINTENANCE */}
              {activeTab === 'machines' && (
                <AdminMachinesSection />
              )}

              {/* TAB: AI INTELLIGENCE & EXECUTION LOGS */}
              {activeTab === 'ai_logs' && (
                <AdminAILogsSection />
              )}
            </div>
          </main>
        </div>

      {/* MODAL 1: ADD STAFF MEMBER (High-Contrast Clean White Design) */}
      {isAddStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4 animate-fadeIn text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#2C241D]">Add Staff / Worker Member</h3>
                <p className="text-xs font-bold text-[#6B5C4D]">Account will be created & credentials emailed to staff/worker.</p>
              </div>
              <button onClick={() => setIsAddStaffModalOpen(false)} className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffFormError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-bold">
                {staffFormError}
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Staff Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Verma"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D] font-extrabold placeholder:text-[#9E9082]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Email Address (Username) *</label>
                <input
                  type="email"
                  placeholder="ramesh@retailsphere.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D] font-extrabold placeholder:text-[#9E9082]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D] font-extrabold placeholder:text-[#9E9082]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Assigned Role *</label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold cursor-pointer"
                >
                  <option value="Retail Staff" className="bg-white text-[#2C241D] font-bold">Retail Staff (Sales & Orders)</option>
                  <option value="Production Staff" className="bg-white text-[#2C241D] font-bold">Production Staff (Studio Manager / QC)</option>
                  <option value="Artisan Worker" className="bg-white text-[#2C241D] font-bold">Artisan Worker (Workshop Craftsman / Technician)</option>
                </select>
              </div>

              {newStaffRole === 'Artisan Worker' && (
                <div className="animate-fadeIn">
                  <label className="block font-extrabold text-[#2C241D] mb-1">Craftsman Specialization / Primary Skill *</label>
                  <select
                    value={newStaffWorkerSkill}
                    onChange={(e) => setNewStaffWorkerSkill(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 text-[#2C241D] font-extrabold text-xs cursor-pointer"
                  >
                    <option value="Woodwork & Carpentry" className="bg-white text-[#2C241D]">Woodwork & Carpentry (Furniture Framing & Timber Joinery)</option>
                    <option value="Upholstery & Cushioning" className="bg-white text-[#2C241D]">Upholstery & Cushioning (Fabric/Leather Padding)</option>
                    <option value="Assembly & Fitting" className="bg-white text-[#2C241D]">Assembly & Fitting (Hardware & Structural Assembly)</option>
                    <option value="Surface Finishing & Polishing" className="bg-white text-[#2C241D]">Surface Finishing & Polishing (Satin Varnish & Lacquer Polish)</option>
                    <option value="Custom Metalwork & Forging" className="bg-white text-[#2C241D]">Custom Metalwork & Forging (Steel/Brass Frames)</option>
                    <option value="Quality Inspection & QC" className="bg-white text-[#2C241D]">Quality Inspection & QC (Final Audit & Testing)</option>
                  </select>
                </div>
              )}

              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-[#2C241D] text-xs flex items-center gap-1.5 cursor-pointer">
                    <Truck className="w-4 h-4 text-[#38A132]" />
                    <span>Driver Capability (Eligible to Drive Fleet Vehicle)</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={newStaffIsDriver}
                    onChange={(e) => setNewStaffIsDriver(e.target.checked)}
                    className="w-4 h-4 text-[#38A132] accent-[#38A132] rounded cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-[#7A6C5E] font-medium">Mark this staff or worker as an eligible driver for company delivery vehicles.</p>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Temporary Password (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D] font-mono text-xs font-bold placeholder:text-[#9E9082]"
                />
                <p className="text-[11px] font-bold text-[#6B5C4D] mt-1">Leave empty to auto-generate a strong password. Credentials will be emailed.</p>
              </div>

              <div className="pt-3 flex gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsAddStaffModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                  disabled={isSubmittingStaff}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="w-1/2 py-3 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  {isSubmittingStaff ? <span>Creating...</span> : <><Mail className="w-4 h-4" /><span>Create & Send</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW PRODUCT */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-lg font-extrabold text-[#2C241D]">Add New Product</h3>
              <button onClick={() => setIsAddProductModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g. Modern Boucle Chair"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold"
                  required
                />
              </div>

              {/* Category Field with Provision to Add New Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-extrabold text-[#2C241D]">Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategoryMode(!isCustomCategoryMode);
                      if (!isCustomCategoryMode) setCustomCategoryInput('');
                    }}
                    className="text-[11px] font-extrabold text-[#48A63E] hover:underline"
                  >
                    {isCustomCategoryMode ? '← Select Existing' : '+ Add New Category'}
                  </button>
                </div>

                {isCustomCategoryMode ? (
                  <input
                    type="text"
                    placeholder="Enter new category name (e.g. Balcony & Garden)"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border-2 border-[#48A63E]/60 rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-bold text-xs"
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
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#48A63E] text-[#2C241D] font-semibold text-xs"
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

              {/* Material & Color Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Material Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-extrabold text-[#2C241D]">Material</label>
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
                      className="w-full px-3 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
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
                      className="w-full px-2.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
                    >
                      {['Solid Teak Wood', 'Sheesham Wood', 'Oak Wood', 'Bouclé Fabric', 'Italian Velvet', 'Genuine Leather', 'Italian Marble', 'Rattan', 'Brass & Metal', 'Engineered Wood'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      <option value="__CUSTOM__">Custom Material...</option>
                    </select>
                  )}
                </div>

                {/* Color Selection */}
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
                      className="w-full px-3 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
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
                      className="w-full px-2.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
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
                    placeholder="24999"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Stock Count</label>
                  <input
                    type="number"
                    placeholder="12"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">
                  Available Color Options (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emerald Green, Warm Beige, Charcoal Black, Slate Grey"
                  value={newProdAvailableColors}
                  onChange={(e) => setNewProdAvailableColors(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold text-xs"
                />
                <span className="text-[10px] text-[#7A6C5E] block mt-0.5 font-medium">
                  Enter multiple color choices (e.g., Emerald Green, Warm Beige, Charcoal Black). Leave single for 1 color.
                </span>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold text-xs"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PRODUCT */}
      {isEditProductModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-lg font-extrabold text-[#2C241D]">Edit Product Details</h3>
              <button onClick={() => setIsEditProductModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProductSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Product Title</label>
                <input
                  type="text"
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Stock Count</label>
                  <input
                    type="number"
                    value={editProdStock}
                    onChange={(e) => setEditProdStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProductModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REMOVE PRODUCT CONFIRMATION */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-[#E2D7CB] space-y-4 text-center">
            <PackageMinus className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-base font-extrabold text-[#2C241D]">Remove Product from Catalog?</h3>
            <p className="text-xs text-[#7A6C5E]">Are you sure you want to remove <strong>"{productToDelete.name}"</strong> from catalog?</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold text-xs cursor-pointer hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteProduct}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: UPDATE STOCK */}
      {isStockModalOpen && stockItemToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-[#E2D7CB] space-y-4">
            <h3 className="text-base font-extrabold text-[#2C241D]">Update Warehouse Stock</h3>
            <p className="text-xs text-[#7A6C5E]">{stockItemToEdit.name}</p>

            <form onSubmit={handleSaveStockUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2C241D] mb-1">New Total Stock Units</label>
                <input
                  type="number"
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: LOW STOCK REPORT MODAL */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-2xl shadow-2xl border border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-extrabold">Low Stock Inventory Alert Report</h3>
              </div>
              <button onClick={() => setShowLowStockModal(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Product Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Stock Units</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DE] font-medium">
                  {lowStockProductsList.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F5ECE1]/60">
                      <td className="py-3 px-3 font-bold text-[#2C241D]">{item.name}</td>
                      <td className="py-3 px-3 text-[#6B5C4D]">{item.category}</td>
                      <td className="py-3 px-3 font-bold">₹{item.price.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-amber-800 font-extrabold">{item.stockCount} Units</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setShowLowStockModal(false);
                            handleOpenStockModal(item);
                          }}
                          className="px-2.5 py-1 bg-[#48A63E] text-white rounded-lg text-[11px] font-bold"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowLowStockModal(false)}
                className="px-4 py-2 rounded-xl bg-[#F9F6F0] border border-[#E2D7CB] font-bold text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: ADD SUPPLIER */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">
                  {editingSupplier ? `Edit Supplier: ${editingSupplier.supplier_name}` : 'Add Product Supplier'}
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">
                  {editingSupplier ? 'Update vendor contact details, phone, address & status.' : 'Register wholesale vendors and ready-made product manufacturers.'}
                </p>
              </div>
              <button onClick={() => setIsAddSupplierModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplierSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Manufacturer / Vendor Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Teak Crafts & Furniture Ltd"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Arun Raj"
                  value={newSupContact}
                  onChange={(e) => setNewSupContact(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="9778237180"
                  value={newSupPhone}
                  onChange={(e) => setNewSupPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Vendor Status</label>
                <select
                  value={newSupStatus}
                  onChange={(e) => setNewSupStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold text-xs cursor-pointer"
                >
                  <option value="Active">Active (Fulfilling Orders)</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  {editingSupplier ? 'Save Changes' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: RESPOND TO QUERY MODAL */}
      {selectedQuery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 w-full max-w-lg shadow-2xl border border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">Respond to Staff Request</h3>
              <button onClick={() => setSelectedQuery(null)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F9F6F0] rounded-xl border border-[#E2D7CB] text-xs space-y-1">
              <p className="font-extrabold text-[#2C241D]">{selectedQuery.staffName} ({selectedQuery.staffEmail})</p>
              <p className="font-bold text-[#48A63E]">{selectedQuery.category}: {selectedQuery.subject}</p>
              <p className="text-[#6B5C4D] italic">"{selectedQuery.message}"</p>
            </div>

            <form onSubmit={handleSendAdminResponse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Set Resolution Status</label>
                <select
                  value={adminResponseStatus}
                  onChange={(e) => setAdminResponseStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                >
                  <option value="Approved">Approved</option>
                  <option value="Resolved">Resolved</option>
                  <option value="In Review">In Review</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Admin Response Message</label>
                <textarea
                  rows={4}
                  placeholder="Enter response or confirmation details..."
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuery(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] text-[#6B5C4D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#48A63E] text-white font-bold shadow-md"
                >
                  Send Response
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: ADMIN PROFILE & SECURITY MODAL */}
      {isAdminProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border-2 border-[#E2D7CB] space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Admin Security & Profile Settings</h3>
                <p className="text-[11px] font-bold text-[#6B5C4D]">Update credentials & system access settings</p>
              </div>
              <button
                onClick={() => setIsAdminProfileModalOpen(false)}
                className="p-1.5 text-[#6B5C4D] hover:text-[#2C241D] rounded-full bg-[#EAE0D4] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-bold">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleSaveAdminProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Admin Email Address</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold text-xs"
                  required
                />
              </div>

              <div className="pt-2 border-t border-[#E2D7CB] space-y-2">
                <span className="font-extrabold text-[#2C241D] block">Update Password Credentials</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New Password (min 6 chars)"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold text-xs placeholder-[#8C7C6D]"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm New Password"
                  value={profileForm.confirmPassword}
                  onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl focus:outline-none focus:border-[#38A132] text-[#2C241D] font-extrabold text-xs placeholder-[#8C7C6D]"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminProfileModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold bg-[#EAE0D4] hover:bg-[#DED2C2] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold transition-all shadow-md shadow-[#38A132]/20 cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDIT USER */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4 relative z-50">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">Edit User Profile</h3>
                <p className="text-xs text-[#7A6C5E] font-mono mt-0.5">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setIsEditUserModalOpen(false)}
                className="p-1.5 rounded-full text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#F9F6F0] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1 text-xs">Full Name</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#48A63E] focus:bg-white text-[#2C241D] text-xs transition-all shadow-inner-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1 text-xs">Email Address (Mail ID)</label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#48A63E] focus:bg-white text-[#2C241D] text-xs transition-all shadow-inner-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1 text-xs">Phone Number</label>
                <input
                  type="text"
                  value={editUserPhone}
                  onChange={(e) => setEditUserPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#48A63E] focus:bg-white text-[#2C241D] text-xs transition-all shadow-inner-xs"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1 text-xs">Account Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#48A63E] focus:bg-white text-[#2C241D] text-xs cursor-pointer transition-all shadow-inner-xs"
                >
                  <option value="Customer">Customer (Shopper)</option>
                  <option value="Retail Staff">Retail Staff (Sales & Operations)</option>
                  <option value="Production Staff">Production Staff (Furniture Studio Manager)</option>
                  <option value="Worker">Artisan Worker (Workshop Technician)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5 text-xs">Driver Capability (Can Drive Fleet Vehicle)</label>
                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setEditUserIsDriver(true)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editUserIsDriver === true
                        ? 'bg-purple-100 text-purple-800 border-purple-400 shadow-xs ring-2 ring-purple-400/20'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-purple-700" />
                    <span>Driver (Capable)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUserIsDriver(false)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editUserIsDriver === false
                        ? 'bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <span>No Driver Role</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5 text-xs">Account Status</label>
                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setEditUserStatus(true)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editUserStatus === true
                        ? 'bg-[#48A63E]/15 text-[#48A63E] border-[#48A63E] shadow-xs ring-2 ring-[#48A63E]/20'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUserStatus(false)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editUserStatus === false
                        ? 'bg-rose-100 text-rose-700 border-rose-400 shadow-xs ring-2 ring-rose-400/20'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#F2ECE1]'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Inactive Account</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="w-1/2 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer transform active:scale-95"
                >
                  {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 6: EDIT ORDER */}
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
                <div className="text-[#1A140E] font-black text-sm">{selectedOrderForEdit.customerName}</div>
                <div className="text-[#6B5C4D] font-mono text-xs">{selectedOrderForEdit.email}</div>
                <div className="text-[#48A63E] font-black text-sm pt-1">Total Amount: ₹{selectedOrderForEdit.totalAmount.toLocaleString('en-IN')}</div>
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

      {/* MODAL: USER PURCHASED / SOLD PRODUCTS */}
      {isPurchasedProductsModalOpen && selectedUserForPurchases && (() => {
        const userEmail = (selectedUserForPurchases.email || '').toLowerCase().trim();
        const userId = selectedUserForPurchases.user_id;
        const userRole = selectedUserForPurchases.role || selectedUserForPurchases.role_name || 'Customer';
        const isStaff = userRole.toLowerCase().includes('staff');

        const userOrders = orderList.filter((o: any) => {
          if (isStaff) {
            const oStaffEmail = (o.staffEmail || o.staff_email || o.handledBy || o.processedBy || '').toLowerCase().trim();
            if (oStaffEmail && oStaffEmail === userEmail) return true;
            if (o.staffId && (o.staffId === userId || String(o.staffId) === String(userId))) return true;
            if (o.retailStaffId && (o.retailStaffId === userId || String(o.retailStaffId) === String(userId))) return true;
            if (o.productionStaffId && (o.productionStaffId === userId || String(o.productionStaffId) === String(userId))) return true;

            const hasOtherStaff = (o.staffId && String(o.staffId) !== String(userId)) ||
                                  (o.retailStaffId && String(o.retailStaffId) !== String(userId)) ||
                                  (o.productionStaffId && String(o.productionStaffId) !== String(userId));
            if (!hasOtherStaff) return true;
            return false;
          } else {
            const orderEmail = (o.email || '').toLowerCase().trim();
            if (orderEmail && orderEmail === userEmail) return true;
            if (o.customerId && (o.customerId === userId || String(o.customerId) === String(userId))) return true;
            return false;
          }
        });

        const purchasedItems = userOrders.flatMap((order) =>
          (order.items || []).map((item, idx) => ({
            key: `${order.orderId}-${idx}`,
            orderId: order.orderId,
            orderDate: order.orderDate,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            name: item.name || 'Furniture Item',
            sku: item.productCode || item.sku || 'SKU-RS-STORE',
            price: item.price || 0,
            quantity: item.quantity || 1,
            total: (item.price || 0) * (item.quantity || 1),
            imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
          }))
        );

        const totalSpent = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const totalItemsCount = purchasedItems.reduce((sum, i) => sum + i.quantity, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A140E]/75 backdrop-blur-md">
            <div className="bg-[#FAF7F2] rounded-[2.2rem] p-6 sm:p-7 w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl border-2 border-[#D8CCBD] space-y-4 animate-fadeIn">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b-2 border-[#EFE7DE] pb-4 flex-shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-full ${isStaff ? 'bg-emerald-600' : 'bg-[#38A132]'} text-white font-black flex items-center justify-center text-base shadow-md flex-shrink-0`}>
                    {(selectedUserForPurchases.full_name || selectedUserForPurchases.name || selectedUserForPurchases.email)
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#1A140E] tracking-tight flex items-center gap-2">
                      <span>{isStaff ? 'Sold Products History' : 'Purchased Products History'}</span>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                        isStaff
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-[#38A132]/15 text-[#2C6B27] border border-[#38A132]/40'
                      }`}>
                        {userRole}
                      </span>
                    </h3>
                    <p className="text-sm font-extrabold text-[#2C241D] mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[#1A140E] font-black text-sm">{selectedUserForPurchases.full_name || selectedUserForPurchases.name}</span>
                      <span className="text-[#4A3E32] font-extrabold font-mono text-xs bg-[#EFE7DE] px-2.5 py-0.5 rounded-md border border-[#D8CCBD]">
                        {selectedUserForPurchases.email}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPurchasedProductsModalOpen(false)}
                  className="p-2 text-[#4A3E32] hover:text-[#1A140E] rounded-xl hover:bg-[#EFE7DE] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Purchase / Sales Overview Stats */}
              <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C4D3E]">
                    {isStaff ? 'Orders Processed' : 'Total Orders'}
                  </span>
                  <div className="text-xl font-black text-[#1A140E] mt-0.5">{userOrders.length}</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C4D3E]">
                    {isStaff ? 'Products Sold' : 'Items Purchased'}
                  </span>
                  <div className="text-xl font-black text-[#2C6B27] mt-0.5">{totalItemsCount} Products</div>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5C4D3E]">
                    {isStaff ? 'Total Revenue Sold' : 'Total Amount Spent'}
                  </span>
                  <div className="text-xl font-black text-[#1A140E] mt-0.5">₹{totalSpent.toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Products List Body */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3">
                {purchasedItems.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <ShoppingBag className="w-12 h-12 text-[#9E9082] mx-auto" />
                    <h4 className="font-extrabold text-base text-[#1A140E]">
                      {isStaff ? 'No Sold Products Found' : 'No Purchased Products Found'}
                    </h4>
                    <p className="text-xs text-[#5C4D3E] font-medium">
                      {isStaff
                        ? 'This staff member has not processed or sold any products yet.'
                        : 'This user has not completed any product orders yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchasedItems.map((item) => (
                      <div
                        key={item.key}
                        className="bg-white p-4 rounded-2xl border border-[#E2D7CB] flex items-center justify-between gap-4 shadow-xs hover:border-[#38A132] transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {item.imageUrl && item.imageUrl.trim() !== '' ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-16 h-16 rounded-xl object-cover border border-[#E2D7CB] flex-shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] flex-shrink-0 flex items-center justify-center font-extrabold text-[#38A132] shadow-2xs">
                              <FileText className="w-6 h-6 text-[#38A132]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-black text-sm text-[#1A140E] truncate">{item.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono bg-[#EFE7DE] text-[#2C241D] px-2 py-0.5 rounded-md font-extrabold border border-[#D8CCBD]">
                                {item.sku}
                              </span>
                              <span className="text-xs text-[#4A3E32] font-extrabold">
                                Qty: <strong className="text-[#1A140E] font-black">{item.quantity}</strong>
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6B5C4D] font-medium mt-1">
                              Order #{item.orderId} • {item.orderDate}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 space-y-1">
                          <div className="font-black text-base text-[#1A140E]">
                            ₹{item.total.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-[#5C4D3E] font-bold">
                            ₹{item.price.toLocaleString('en-IN')} each
                          </div>
                          <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                            item.orderStatus === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : item.orderStatus === 'Processing' || item.orderStatus === 'Shipped'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {item.orderStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t-2 border-[#EFE7DE] flex justify-end flex-shrink-0">
                <button
                  onClick={() => setIsPurchasedProductsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#2C241D] text-white font-extrabold text-xs hover:bg-[#1A140E] transition-all cursor-pointer shadow-md"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 8: GRANT AUTHORITY & CAPABILITIES */}
      {isAuthorityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="ultra-glass-panel bg-white/95 rounded-[2rem] p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-[#E2D7CB] space-y-4 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Grant Authority & Capabilities</h3>
                <p className="text-[11px] text-[#7A6C5E]">Assign executive capabilities or admin powers by email with granular checkboxes.</p>
              </div>
              <button onClick={() => setIsAuthorityModalOpen(false)} className="p-1.5 text-[#9E9082] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAuthoritySubmit} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block font-bold text-[#2C241D] mb-1">Target Account Email *</label>
                <input
                  type="email"
                  placeholder="Enter email e.g. john.staff@retailsphere.com"
                  value={authorityEmail}
                  onChange={(e) => setAuthorityEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-mono font-bold focus:outline-none focus:border-[#48A63E]"
                  required
                />
              </div>

              {/* Master Full Admin Toggle */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-amber-900 text-xs block">Full Executive Admin Authority</span>
                  <span className="text-[10px] text-amber-800 font-medium">Grant complete unrestricted administrative control</span>
                </div>
                <input
                  type="checkbox"
                  checked={isFullAdminChecked}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsFullAdminChecked(checked);
                    if (checked) {
                      setSelectedCapabilities(CAPABILITY_DEFINITIONS.map(c => c.key));
                    }
                  }}
                  className="w-4 h-4 accent-[#48A63E] cursor-pointer"
                />
              </div>

              {/* Granular Capabilities Checkboxes */}
              <div className="space-y-2">
                <label className="block font-extrabold text-[#2C241D] text-xs">Specific Granted Capabilities (Check all that apply):</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {CAPABILITY_DEFINITIONS.filter(c => c.key !== 'full_admin').map((cap) => {
                    const isChecked = selectedCapabilities.includes(cap.key);
                    return (
                      <label key={cap.key} className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isChecked ? 'bg-[#48A63E]/10 border-[#48A63E]/40' : 'bg-[#FAF7F2] border-[#E2D7CB]'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCapabilities(prev => [...prev, cap.key]);
                            } else {
                              setSelectedCapabilities(prev => prev.filter(k => k !== cap.key));
                              setIsFullAdminChecked(false);
                            }
                          }}
                          className="w-4 h-4 accent-[#48A63E] mt-0.5"
                        />
                        <div>
                          <span className="font-extrabold text-[#2C241D] block">{cap.label}</span>
                          <span className="text-[10px] text-[#7A6C5E] font-medium block">{cap.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuthorityModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] font-extrabold text-[#7A6C5E]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save & Assign Granted Authority</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN MODAL 1: Detailed Custom Order Specifications */}
      {selectedCustomForAdminDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCustomForAdminDetails(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#38A132] to-[#32922D] text-white flex items-center justify-center font-extrabold shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#38A132]/15 border border-[#38A132]/40 text-[#38A132]">
                  ORDER #{selectedCustomForAdminDetails.custom_order_id}
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-0.5">{selectedCustomForAdminDetails.furniture_type}</h3>
                <p className="text-xs text-[#6B5C4D] font-medium">Client: {selectedCustomForAdminDetails.customer_name}</p>
              </div>
            </div>

            {/* 1. CLIENT & ORDER TIMELINE SUMMARY */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
              <h4 className="text-[11px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Client Contact & Order Record</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Client Name</span>
                  <span className="font-extrabold text-[#2C241D] truncate block">{selectedCustomForAdminDetails.customer_name}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Email Address</span>
                  <span className="font-bold text-[#2C241D] block break-all text-[11px]">{selectedCustomForAdminDetails.customer_email || 'Not Provided'}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Phone Contact</span>
                  <span className="font-bold text-[#2C241D] block truncate">{selectedCustomForAdminDetails.customer_phone || 'Not Provided'}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Submission Date</span>
                  <span className="font-bold text-[#2C241D] block truncate">
                    {selectedCustomForAdminDetails.order_date
                      ? new Date(selectedCustomForAdminDetails.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Recent'}
                  </span>
                </div>
              </div>
            </div>

            {/* 1.5 ASSIGNED WORKERS CARD IN SPECS MODAL */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
              <h4 className="text-[11px] font-extrabold text-[#7A6C5E] uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-[#38A132]" />
                <span>Assigned Workshop Artisan(s) & Production Team</span>
              </h4>
              {selectedCustomForAdminDetails.assigned_workers && selectedCustomForAdminDetails.assigned_workers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {selectedCustomForAdminDetails.assigned_workers.map((w, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-[#2C241D] block text-xs">👷 {w.worker_name}</span>
                        {w.specialization && <span className="text-[10px] text-[#7A6C5E] block font-semibold">{w.specialization}</span>}
                        {w.worker_phone && <span className="text-[10px] text-[#38A132] block font-mono">📞 {w.worker_phone}</span>}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#38A132]/15 text-[#38A132] border border-[#38A132]/30">
                        {w.task_status || 'Assigned'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-bold">
                  ⚠️ No artisan worker assigned yet to this custom build. Production Staff can assign workshop artisans.
                </p>
              )}
            </div>

            {/* 2. SEPARATED PRODUCT FIELDS GRID */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Product Specifications & Parameters</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {parseOrderSpecDetails(selectedCustomForAdminDetails).map((field, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 shadow-2xs">
                    <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">{field.label}</span>
                    {field.isColor || field.label.toLowerCase().includes('color') ? (
                      renderColorSwatchBadge(field.value)
                    ) : (
                      <span className="font-extrabold text-xs text-[#2C241D] block">{field.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. CUSTOMER PROVIDED REFERENCE DESIGN IMAGES */}
            {selectedCustomForAdminDetails.reference_image && selectedCustomForAdminDetails.reference_image.trim() && (
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#38A132]" />
                  Customer Provided Reference Images ({parseReferenceImages(selectedCustomForAdminDetails.reference_image).length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {parseReferenceImages(selectedCustomForAdminDetails.reference_image).map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openImageInNewTab(imgUrl)}
                      className="group relative rounded-2xl overflow-hidden border border-[#E2D7CB] bg-[#FAF7F2] shadow-xs hover:shadow-md transition-all block h-32 text-left cursor-pointer w-full"
                    >
                      <img
                        src={imgUrl}
                        alt={`Reference Design ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}



            <div className="flex items-center justify-between gap-3 border-t border-[#E2D7CB] pt-4">
              {(selectedCustomForAdminDetails.payment_status === 'Paid' || selectedCustomForAdminDetails.order_status === 'Paid') ? (
                <button
                  onClick={() => downloadPaymentReceipt(selectedCustomForAdminDetails)}
                  className="px-4 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Download Payment Receipt</span>
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedCustomForAdminDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-[#2C241D] hover:bg-[#42372D] text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN MODAL 2: Set/Update Price Quote & Approval */}
      {selectedCustomForAdminReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedCustomForAdminReview(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-extrabold shadow-md">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                  ADMIN PRICE QUOTE & APPROVAL
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-0.5">Order #{selectedCustomForAdminReview.custom_order_id}</h3>
                <p className="text-xs text-[#6B5C4D] font-medium">{selectedCustomForAdminReview.furniture_type} • Client: {selectedCustomForAdminReview.customer_name}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-1">
                  Estimated Price Quote (INR ₹):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-sm text-[#38A132]">₹</span>
                  <input
                    type="number"
                    value={adminPriceInput}
                    onChange={(e) => setAdminPriceInput(e.target.value)}
                    placeholder="Enter estimated custom build price..."
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-[#E2D7CB] rounded-xl font-extrabold text-sm focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-1">
                  Approval Remarks / Staff Notes:
                </label>
                <textarea
                  rows={3}
                  value={adminReviewRemarks}
                  onChange={(e) => setAdminReviewRemarks(e.target.value)}
                  placeholder="Notes regarding timber sourcing, estimated lead time..."
                  className="w-full p-3 bg-white border border-[#E2D7CB] rounded-xl font-semibold text-xs focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#E2D7CB] pt-4">
              <button
                type="button"
                onClick={() => handleAdminSubmitQuote('Rejected')}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs cursor-pointer"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleAdminSubmitQuote('Approved')}
                className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Approve & Send Quote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN MODAL 3: Fabrication Request Details Modal */}
      {selectedFabForAdminDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-2xl shadow-2xl border border-[#E2D7CB] relative z-50 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    🪵 FABRICATION #{selectedFabForAdminDetails.fabrication_id}
                  </span>
                  <h3 className="text-base font-extrabold text-[#2C241D]">
                    {selectedFabForAdminDetails.service_type || 'Custom Joinery & Fabrication'}
                  </h3>
                </div>
                <p className="text-[11px] font-medium text-[#7A6C5E] mt-0.5">
                  Client: {selectedFabForAdminDetails.customer_name} • {selectedFabForAdminDetails.customer_email || 'No email'}
                </p>
              </div>
              <button
                onClick={() => setSelectedFabForAdminDetails(null)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status and Price Banner */}
            <div className="flex items-center justify-between p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB]">
              <div>
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Status</span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase inline-block mt-0.5 bg-amber-100 text-amber-900 border border-amber-200">
                  {selectedFabForAdminDetails.status || selectedFabForAdminDetails.review_status || 'Under Review'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Estimated Price</span>
                <span className="text-lg font-black text-amber-700">
                  {selectedFabForAdminDetails.estimated_price ? `₹${parseFloat(selectedFabForAdminDetails.estimated_price).toLocaleString('en-IN')}` : 'Quotation Pending'}
                </span>
              </div>
            </div>

            {/* Technical Specifications Grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Technical Specifications</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Dimensions</span>
                  <span className="font-extrabold text-[#2C241D] mt-0.5 block">{selectedFabForAdminDetails.dimensions || 'Custom Size'}</span>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Material Source</span>
                  <span className="font-extrabold text-[#2C241D] mt-0.5 block">{selectedFabForAdminDetails.material_source || 'Customer Supplied'}</span>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Quantity</span>
                  <span className="font-extrabold text-amber-800 mt-0.5 block">{selectedFabForAdminDetails.quantity || 1} Piece(s)</span>
                </div>
              </div>
            </div>

            {/* Notes / Requirements */}
            {selectedFabForAdminDetails.requirements && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Client Requirements & Notes</h4>
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-xs text-[#4A3E32] font-medium leading-relaxed">
                  {selectedFabForAdminDetails.requirements}
                </div>
              </div>
            )}

            {/* Technical Drawing Image */}
            {selectedFabForAdminDetails.drawing_image && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Technical Drawing / CAD Design</h4>
                <div className="rounded-2xl overflow-hidden border border-[#E2D7CB] bg-[#FAF7F2] p-2 max-h-60 flex items-center justify-center">
                  <img
                    src={selectedFabForAdminDetails.drawing_image}
                    alt="Technical Drawing"
                    className="max-h-56 object-contain rounded-xl cursor-pointer hover:opacity-95"
                    onClick={() => {
                      const w = window.open('');
                      w?.document.write(`<img src="${selectedFabForAdminDetails.drawing_image}" style="max-width:100%;" />`);
                    }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 text-right border-t border-[#EFE7DE]">
              <button
                type="button"
                onClick={() => setSelectedFabForAdminDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-[#2C241D] hover:bg-[#42372D] text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN MODAL 4: On-Site Service Details Modal */}
      {selectedServiceForAdminDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-2xl shadow-2xl border border-[#E2D7CB] relative z-50 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    🔧 ON-SITE SERVICE #{selectedServiceForAdminDetails.service_id}
                  </span>
                  <h3 className="text-base font-extrabold text-[#2C241D]">
                    {selectedServiceForAdminDetails.service_category || 'Skilled On-Site Service'}
                  </h3>
                </div>
                <p className="text-[11px] font-medium text-[#7A6C5E] mt-0.5">
                  Customer: {selectedServiceForAdminDetails.customer_name} • Phone: {selectedServiceForAdminDetails.customer_phone || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedServiceForAdminDetails(null)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status and Price Banner */}
            <div className="flex items-center justify-between p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB]">
              <div>
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Status</span>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase inline-block mt-0.5 bg-blue-100 text-blue-900 border border-blue-200">
                  {selectedServiceForAdminDetails.status || 'PENDING'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Estimated Price</span>
                <span className="text-lg font-black text-blue-700">
                  {selectedServiceForAdminDetails.estimated_price ? `₹${parseFloat(selectedServiceForAdminDetails.estimated_price).toLocaleString('en-IN')}` : 'Quotation Pending'}
                </span>
              </div>
            </div>

            {/* Location & Scheduling */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Site Location & Booking Slot</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Service Address</span>
                  <span className="font-extrabold text-[#2C241D] mt-0.5 block">{selectedServiceForAdminDetails.address || 'Address not specified'}</span>
                  <span className="text-[11px] text-[#7A6C5E] block mt-0.5">{selectedServiceForAdminDetails.city || 'Kottayam'}, {selectedServiceForAdminDetails.pincode || ''}</span>
                </div>
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Scheduled Date & Slot</span>
                  <span className="font-extrabold text-[#2C241D] mt-0.5 block">
                    📅 {selectedServiceForAdminDetails.preferred_date ? new Date(selectedServiceForAdminDetails.preferred_date).toLocaleDateString() : 'Flexible Date'}
                  </span>
                  <span className="text-[11px] text-blue-800 font-bold block mt-0.5">⏰ {selectedServiceForAdminDetails.preferred_time || 'Morning Slot'}</span>
                </div>
              </div>
            </div>

            {/* Description / Scope */}
            {selectedServiceForAdminDetails.description && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Scope of Work / Issue Description</h4>
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-xs text-[#4A3E32] font-medium leading-relaxed">
                  {selectedServiceForAdminDetails.description}
                </div>
              </div>
            )}

            {/* Assigned Technicians / Jobs */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Assigned Technicians & Work Status</h4>
              {selectedServiceForAdminDetails.jobs && selectedServiceForAdminDetails.jobs.length > 0 ? (
                <div className="space-y-2">
                  {selectedServiceForAdminDetails.jobs.map((job: any, idx: number) => (
                    <div key={idx} className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-blue-900 block">👷 {job.worker_name || `Technician #${job.worker_id}`}</span>
                        <span className="text-[10px] text-blue-700">Status: {job.status || 'Assigned'}</span>
                      </div>
                      {job.notes && (
                        <span className="text-[11px] text-[#5C4E42] italic">{job.notes}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-center text-[#7A6C5E] text-xs italic">
                  No field technician assigned yet.
                </div>
              )}
            </div>

            <div className="pt-2 text-right border-t border-[#EFE7DE]">
              <button
                type="button"
                onClick={() => setSelectedServiceForAdminDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-[#2C241D] hover:bg-[#42372D] text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
      {/* VEHICLE MODAL: ADD VEHICLE (Requirement 7) */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#38A132]" />
                  <span>Add Company Delivery Vehicle</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">Register internal transport vehicle for order dispatch.</p>
              </div>
              <button
                onClick={() => setIsAddVehicleModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {vehicleFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{vehicleFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateVehicleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Registration Number *</label>
                <input
                  type="text"
                  placeholder="e.g. KL-01-AB-1234 or KL-14-1234"
                  value={vRegNumber}
                  onChange={(e) => setVRegNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold uppercase focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
                <span className="text-[10px] text-[#7A6C5E] font-medium mt-1 block">Format: State Code + RTO + Series + Number (e.g., KL-01-AB-1234)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Vehicle Type *</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  >
                    <option value="Mini Truck">Mini Truck</option>
                    <option value="Pickup Van">Pickup Van</option>
                    <option value="Light Truck">Light Truck</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Capacity (kg) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={vCapacity}
                    onChange={(e) => setVCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Assigned Driver</label>
                <select
                  value={vDriverId}
                  onChange={(e) => setVDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="">-- Select Driver (Optional) --</option>
                  {allUsersList.filter(u => u.role !== 'Customer').map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name || u.name} ({u.role || u.role_name || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Initial Status</label>
                <select
                  value={vStatus}
                  onChange={(e) => setVStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="AVAILABLE">AVAILABLE (Can be selected for dispatch)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Servicing / Repairs)</option>
                  <option value="INACTIVE">INACTIVE (Not currently used)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Primary urban delivery vehicle for retail items..."
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVehicle}
                  className="w-1/2 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingVehicle ? 'Saving...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE MODAL: EDIT VEHICLE (Requirement 8) */}
      {isEditVehicleModalOpen && selectedVehicleForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#38A132]" />
                  <span>Edit Vehicle Specs — {selectedVehicleForEdit.id}</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">Update capacity, driver, status or notes.</p>
              </div>
              <button
                onClick={() => setIsEditVehicleModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {vehicleFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{vehicleFormError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateVehicleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Registration Number *</label>
                <input
                  type="text"
                  value={vRegNumber}
                  onChange={(e) => setVRegNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold uppercase focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Vehicle Type *</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  >
                    <option value="Mini Truck">Mini Truck</option>
                    <option value="Pickup Van">Pickup Van</option>
                    <option value="Light Truck">Light Truck</option>
                    <option value="Delivery Van">Delivery Van</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Capacity (kg) *</label>
                  <input
                    type="number"
                    value={vCapacity}
                    onChange={(e) => setVCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Assigned Driver</label>
                <select
                  value={vDriverId}
                  onChange={(e) => setVDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="">-- Select Driver (Unassigned) --</option>
                  {allUsersList.filter(u => u.role !== 'Customer').map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name || u.name} ({u.role || u.role_name || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Status</label>
                <select
                  value={vStatus}
                  onChange={(e) => setVStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="AVAILABLE">AVAILABLE (Can be selected for dispatch)</option>
                  <option value="ASSIGNED">ASSIGNED (Currently out on order delivery)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Servicing / Repairs)</option>
                  <option value="INACTIVE">INACTIVE (Preserved for historical data)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={vNotes}
                  onChange={(e) => setVNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsEditVehicleModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVehicle}
                  className="w-1/2 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingVehicle ? 'Saving...' : 'Save Specs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE MODAL: VIEW VEHICLE DETAIL & HISTORY (Requirement 9) */}
      {isVehicleDetailModalOpen && selectedVehicleForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-xl shadow-2xl border border-[#E2D7CB] relative z-50 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[#38A132] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {selectedVehicleForDetail.vehicle.id}
                  </span>
                  <h3 className="text-base font-extrabold text-[#2C241D]">
                    {selectedVehicleForDetail.vehicle.registration_number}
                  </h3>
                </div>
                <p className="text-[11px] font-medium text-[#7A6C5E] mt-0.5">
                  {selectedVehicleForDetail.vehicle.vehicle_type} • {selectedVehicleForDetail.vehicle.capacity} kg Capacity
                </p>
              </div>
              <button
                onClick={() => setIsVehicleDetailModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vehicle Master Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB]">
              <div>
                <span className="block text-[10px] font-bold text-[#7A6C5E] uppercase">Assigned Driver</span>
                <span className="font-extrabold text-[#2C241D]">{selectedVehicleForDetail.vehicle.assigned_driver_name}</span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-[#7A6C5E] uppercase">Status</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase mt-0.5 border ${
                  selectedVehicleForDetail.vehicle.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  selectedVehicleForDetail.vehicle.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  selectedVehicleForDetail.vehicle.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  'bg-gray-100 text-gray-700 border-gray-300'
                }`}>
                  {selectedVehicleForDetail.vehicle.status}
                </span>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-[#7A6C5E] uppercase">Model / Year</span>
                <span className="font-bold text-[#2C241D]">
                  {selectedVehicleForDetail.vehicle.model_name || 'Standard'} {selectedVehicleForDetail.vehicle.year ? `(${selectedVehicleForDetail.vehicle.year})` : ''}
                </span>
              </div>
            </div>

            {selectedVehicleForDetail.vehicle.notes && (
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-xs">
                <span className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-0.5">Notes</span>
                <p className="text-[#2C241D] font-medium italic">{selectedVehicleForDetail.vehicle.notes}</p>
              </div>
            )}

            {/* Current Active Assignment Section */}
            <div className="space-y-2 border-t border-[#EFE7DE] pt-4">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                <span>Current Active Delivery Assignment</span>
              </h4>

              {selectedVehicleForDetail.current_assignment ? (
                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-900">{selectedVehicleForDetail.current_assignment.order_id}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                      {selectedVehicleForDetail.current_assignment.order_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#4A3E32]">
                    <div><span className="font-bold">Customer:</span> {selectedVehicleForDetail.current_assignment.customer}</div>
                    <div><span className="font-bold">Dispatched:</span> {selectedVehicleForDetail.current_assignment.dispatch_date}</div>
                    <div><span className="font-bold">Expected Delivery:</span> {selectedVehicleForDetail.current_assignment.expected_delivery_date}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-center text-[#7A6C5E] text-xs italic">
                  No active delivery assignment. Vehicle is ready for dispatch.
                </div>
              )}
            </div>

            {/* Delivery History Section */}
            <div className="space-y-2 border-t border-[#EFE7DE] pt-4">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#38A132]" />
                <span>Delivery Order History</span>
              </h4>

              {selectedVehicleForDetail.delivery_history.length === 0 ? (
                <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-center text-[#7A6C5E] text-xs italic">
                  No previous order deliveries recorded for this vehicle.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Order ID</th>
                        <th className="py-2 px-3">Customer</th>
                        <th className="py-2 px-3">Dispatch Date</th>
                        <th className="py-2 px-3">Delivery Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                      {selectedVehicleForDetail.delivery_history.map((h, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF7F2]">
                          <td className="py-2 px-3 font-extrabold text-[#38A132] font-mono">{h.order_id}</td>
                          <td className="py-2 px-3">{h.customer}</td>
                          <td className="py-2 px-3 text-[#7A6C5E]">{h.dispatch_date}</td>
                          <td className="py-2 px-3 font-bold text-emerald-700">{h.delivery_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 text-right border-t border-[#EFE7DE]">
              <button
                type="button"
                onClick={() => setIsVehicleDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#F9F6F0] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#6B5C4D] font-extrabold text-xs cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STAFF & WORKER DETAILS */}
      {isEditStaffModalOpen && selectedStaffForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#38A132]" />
                  <span>Edit Staff / Worker — {selectedStaffForEdit.name}</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">Update contact details, role, specialization, or driver capability.</p>
              </div>
              <button
                onClick={() => setIsEditStaffModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editStaffModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editStaffModalError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStaffSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Email Address *</label>
                <input
                  type="email"
                  value={editStaffEmail}
                  onChange={(e) => setEditStaffEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editStaffPhone}
                  onChange={(e) => setEditStaffPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Assigned Role *</label>
                <select
                  value={editStaffRole}
                  onChange={(e) => setEditStaffRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="Retail Staff">Retail Staff (Store Operations & Orders)</option>
                  <option value="Production Staff">Production Staff (Manager & Stage QC)</option>
                  <option value="Artisan Worker">Artisan Worker (Workshop Technician)</option>
                </select>
              </div>

              {editStaffRole === 'Artisan Worker' && (
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Artisan Specialization Skill *</label>
                  <select
                    value={editStaffWorkerSkill}
                    onChange={(e) => setEditStaffWorkerSkill(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  >
                    <option value="Woodwork & Carpentry">Woodwork & Carpentry</option>
                    <option value="Finishing & Assembly">Finishing & Assembly</option>
                    <option value="Upholstery">Upholstery</option>
                    <option value="Metalwork & Framing">Metalwork & Framing</option>
                    <option value="Quality Inspection & Polish">Quality Inspection & Polish</option>
                  </select>
                </div>
              )}

              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB]">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editStaffIsDriver}
                    onChange={(e) => setEditStaffIsDriver(e.target.checked)}
                    className="w-4 h-4 text-[#38A132] rounded focus:ring-[#38A132] border-gray-300"
                  />
                  <div>
                    <span className="font-extrabold text-[#2C241D] block">🚚 Fleet Driver Capability</span>
                    <span className="text-[10px] text-[#7A6C5E] font-medium block">
                      Enable to allow dispatching delivery vehicles to this staff/worker.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsEditStaffModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditStaff}
                  className="w-1/2 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingEditStaff ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: REVIEW LEAVE APPLICATION WITH NOTES */}
      {isReviewLeaveModalOpen && selectedLeaveForReview && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-[#E2D7CB] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-2">
                <CalendarCheck className={`w-5 h-5 ${reviewActionType === 'Approved' ? 'text-emerald-600' : 'text-rose-600'}`} />
                <h3 className="font-extrabold text-base text-[#2C241D]">
                  {reviewActionType === 'Approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReviewLeaveModalOpen(false);
                  setSelectedLeaveForReview(null);
                }}
                className="text-[#7A6C5E] hover:text-[#2C241D] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#2C241D]">Worker:</span>
                <span className="font-bold text-[#38A132]">{selectedLeaveForReview.worker_name || `Worker #${selectedLeaveForReview.worker_id}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#2C241D]">Leave Type:</span>
                <span className="font-bold text-[#4A3E32]">{selectedLeaveForReview.leave_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#2C241D]">Duration:</span>
                <span className="font-bold text-[#2C241D]">{selectedLeaveForReview.duration_days} Day(s) ({selectedLeaveForReview.start_date} to {selectedLeaveForReview.end_date})</span>
              </div>
              <div className="pt-1 text-[11px] text-[#5C4E42] border-t border-[#EFE7DE]">
                <strong>Reason:</strong> {selectedLeaveForReview.reason || 'None provided'}
              </div>
            </div>

            <form onSubmit={handleConfirmReviewLeaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#2C241D] mb-1">
                  Administrator Remarks / Review Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reviewNotesInput}
                  onChange={(e) => setReviewNotesInput(e.target.value)}
                  placeholder="e.g., Approved with advance cover arrangement or Rejected due to urgent workshop delivery..."
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReviewLeaveModalOpen(false);
                    setSelectedLeaveForReview(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#FAF7F2] border border-[#E2D7CB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeaveReview}
                  className={`px-5 py-2 rounded-xl text-xs font-black text-white transition-all shadow-md cursor-pointer ${
                    reviewActionType === 'Approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  } ${isSubmittingLeaveReview ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isSubmittingLeaveReview ? 'Submitting...' : `Confirm ${reviewActionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: ADD RAW MATERIAL BATCH (OPTION 3) */}
      {isAddRawMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-[#38A132]" />
                  <span>Add Raw Material Batch</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">Register workshop timber, fabric, plywood or hardware.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRawMaterialModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRawMaterialSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Material Category *</label>
                <select
                  value={newMatCategory}
                  onChange={(e) => setNewMatCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                >
                  <option value="Timber">Timber Logs & Planks</option>
                  <option value="Plywood">Commercial Marine Plywood</option>
                  <option value="Fabric">Upholstery Fabric (Bouclé / Velvet / Leather)</option>
                  <option value="Foam">PU Cushioning Foam</option>
                  <option value="Hardware">Hardware, Hinges & Fasteners</option>
                  <option value="Finishing">Varnish, Polish & Stain</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Material Name / Species *</label>
                <input
                  type="text"
                  placeholder="e.g. Teak Wood Planks (4x2), Velvet Emerald"
                  value={newMatName}
                  onChange={(e) => setNewMatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-semibold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Initial Stock Units *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 150"
                    value={newMatAvailableQty}
                    onChange={(e) => setNewMatAvailableQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Unit of Measure *</label>
                  <select
                    value={newMatUnit}
                    onChange={(e) => setNewMatUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  >
                    <option value="cu_ft">Cubic Feet (cu_ft)</option>
                    <option value="pieces">Pieces / Boards</option>
                    <option value="meters">Meters (Fabrics)</option>
                    <option value="sq_ft">Square Feet (sq_ft)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="liters">Liters (Varnish)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Unit Cost (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1800"
                    value={newMatUnitCost}
                    onChange={(e) => setNewMatUnitCost(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Reorder Level Threshold</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 20"
                    value={newMatReorderLevel}
                    onChange={(e) => setNewMatReorderLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsAddRawMaterialModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewMaterial}
                  className="w-1/2 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingNewMaterial ? 'Saving...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK ADJUST (OPTION 3) */}
      {isStockAdjustModalOpen && selectedMatForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#38A132]" />
                  <span>Adjust Material Stock</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E] mt-0.5">{selectedMatForAdjust.material_name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStockAdjustModalOpen(false);
                  setSelectedMatForAdjust(null);
                }}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Current Available</span>
                <span className="text-lg font-black text-[#2C241D]">{selectedMatForAdjust.available_qty} {selectedMatForAdjust.unit}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Category</span>
                <span className="font-extrabold text-[#38A132]">{selectedMatForAdjust.category}</span>
              </div>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5">Adjustment Action *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('Replenish')}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      adjustType === 'Replenish'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB]'
                    }`}
                  >
                    + Replenish
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('Usage')}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      adjustType === 'Usage'
                        ? 'bg-blue-100 text-blue-900 border-blue-400 shadow-xs'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB]'
                    }`}
                  >
                    - Used / Fab
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('Wasted')}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      adjustType === 'Wasted'
                        ? 'bg-rose-100 text-rose-900 border-rose-400 shadow-xs'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB]'
                    }`}
                  >
                    - Scrap / Cut
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">
                  Quantity ({selectedMatForAdjust.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={`Enter quantity in ${selectedMatForAdjust.unit}...`}
                  value={adjustQtyInput}
                  onChange={(e) => setAdjustQtyInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold text-sm focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => {
                    setIsStockAdjustModalOpen(false);
                    setSelectedMatForAdjust(null);
                  }}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="w-1/2 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingAdjust ? 'Updating...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD QUALITY CONTROL INSPECTION (OPTION 4) */}
      {isRecordQCModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-[#38A132]" />
                  <span>Record QC Stage Audit</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E]">Perform 4-point technical tolerance check on order.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordQCModalOpen(false)}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordQCSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Order Category *</label>
                  <select
                    value={qcOrderType}
                    onChange={(e) => setQcOrderType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-extrabold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                  >
                    <option value="Custom">Custom Order (Bespoke)</option>
                    <option value="Fabrication">Workshop Fabrication</option>
                    <option value="Readymade">Readymade Catalog Item</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Target Numeric ID *</label>
                  <input
                    type="number"
                    placeholder="e.g. 37, 23, 1"
                    value={qcOrderId}
                    onChange={(e) => setQcOrderId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                    required
                  />
                </div>
              </div>

              {/* Overall Pass/Fail Switcher */}
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5">Overall Audit Outcome *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setQcResult('PASS')}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      qcResult === 'PASS'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400 shadow-xs ring-2 ring-emerald-400/20'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>PASSED (Approve Order)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcResult('FAIL')}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      qcResult === 'FAIL'
                        ? 'bg-rose-100 text-rose-900 border-rose-400 shadow-xs ring-2 ring-rose-400/20'
                        : 'bg-[#F9F6F0] text-[#7A6C5E] border-[#E2D7CB]'
                    }`}
                  >
                    <X className="w-4 h-4 text-rose-600" />
                    <span>FAILED (Queue Rework)</span>
                  </button>
                </div>
              </div>

              {/* 4-Point Checklist Checkboxes */}
              <div className="space-y-2 p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB]">
                <span className="font-extrabold text-xs text-[#2C241D] block">4-Point Compliance Checklist</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qcDimensionsCheck}
                      onChange={(e) => setQcDimensionsCheck(e.target.checked)}
                      className="w-4 h-4 accent-[#38A132] rounded"
                    />
                    <span>📏 Dimensions (±1mm)</span>
                  </label>
                  <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qcFinishingCheck}
                      onChange={(e) => setQcFinishingCheck(e.target.checked)}
                      className="w-4 h-4 accent-[#38A132] rounded"
                    />
                    <span>✨ Surface Finish & Polish</span>
                  </label>
                  <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qcStructureCheck}
                      onChange={(e) => setQcStructureCheck(e.target.checked)}
                      className="w-4 h-4 accent-[#38A132] rounded"
                    />
                    <span>🪵 Structural Integrity</span>
                  </label>
                  <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qcSpecificationsCheck}
                      onChange={(e) => setQcSpecificationsCheck(e.target.checked)}
                      className="w-4 h-4 accent-[#38A132] rounded"
                    />
                    <span>📋 CAD Spec Compliance</span>
                  </label>
                </div>
              </div>

              {qcResult === 'FAIL' && (
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Assign Rework to Artisan Craftsman</label>
                  <select
                    value={qcReworkWorkerId || ''}
                    onChange={(e) => setQcReworkWorkerId(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 bg-[#F9F6F0] border border-rose-300 rounded-xl font-bold text-xs focus:outline-none text-[#2C241D]"
                  >
                    <option value="">-- Select Artisan Worker (Optional) --</option>
                    {allUsersList.filter(u => u.role !== 'Customer').map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        👷 {u.full_name || u.name} ({u.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Inspector Notes & Specific Findings</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified teak grain, joinery alignment within 0.5mm tolerance. Ready for packaging."
                  value={qcInspectionNotes}
                  onChange={(e) => setQcInspectionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsRecordQCModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQC}
                  className="w-1/2 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingQC ? 'Recording...' : 'Submit QC Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE REWORK JOB (OPTION 4) */}
      {isResolveReworkModalOpen && selectedReworkForResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] relative z-50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Resolve Rework Job #{selectedReworkForResolve.rework_id}</span>
                </h3>
                <p className="text-[11px] font-medium text-[#7A6C5E] mt-0.5">
                  {selectedReworkForResolve.order_type} #{selectedReworkForResolve.order_id} • Assigned: {selectedReworkForResolve.worker_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResolveReworkModalOpen(false);
                  setSelectedReworkForResolve(null);
                }}
                className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#F9F6F0]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs space-y-1">
              <span className="font-extrabold text-rose-900 block">Reported Defect Reason:</span>
              <p className="text-rose-800 font-medium italic">{selectedReworkForResolve.rework_reason}</p>
            </div>

            <form onSubmit={handleResolveReworkSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Rectification Remarks / Artisan Sign-Off</label>
                <textarea
                  rows={3}
                  value={reworkResolveNotes}
                  onChange={(e) => setReworkResolveNotes(e.target.value)}
                  placeholder="e.g. Joints planed and re-sanded. Surface coat reapplied and dried."
                  className="w-full px-3 py-2 bg-[#F9F6F0] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132] focus:bg-white text-[#2C241D]"
                />
              </div>

              <div className="pt-2 flex items-center gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => {
                    setIsResolveReworkModalOpen(false);
                    setSelectedReworkForResolve(null);
                  }}
                  className="w-1/2 py-2.5 rounded-xl border border-[#E2D7CB] bg-[#F9F6F0] hover:bg-[#F2ECE1] text-[#6B5C4D] font-extrabold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolveRework}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {isSubmittingResolveRework ? 'Resolving...' : 'Confirm Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
