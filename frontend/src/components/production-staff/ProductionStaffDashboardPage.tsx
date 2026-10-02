import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearUserSession } from '../../utils/sessionUtils';
import { fetchAllLeaveRequests, reviewLeaveRequest, WorkerLeaveItem } from '../../services/api_leave';
import { MachineryTab } from './MachineryTab';
import { RawMaterialsTab } from './RawMaterialsTab';
import { QualityControlTab } from './QualityControlTab';
import { ProductionAiSuiteTab } from './ProductionAiSuiteTab';
import {
  LayoutDashboard,
  Wrench,
  PackageCheck,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  Users,
  Sliders,
  LogOut,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  DollarSign,
  Edit3,
  Layers,
  ChevronRight,
  Search,
  Plus,
  Bell,
  User,
  ChevronDown,
  MessageSquare,
  Key,
  Lock,
  Unlock,
  ShieldCheck,
  Send,
  X,
  Eye,
  RefreshCw,
  Percent,
  Tag,
  Copy,
  Trash2,
  RotateCcw,
  UserCheck,
  UserX,
  Mail,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Download,
  AlertTriangle,
  MapPin,
  Filter,
  Building
} from 'lucide-react';
import {
  fetchCustomOrders,
  updateOrderStatus,
  toggleLockOrderSpecifications,
  fetchWorkers,
  addWorker,
  updateWorker,
  toggleWorkerStatus,
  deleteWorker,
  resendWorkerCredentials,
  assignWorkerTask,
  unassignWorkerTask,
  updateProductionProgress,
  CustomOrderData,
  WorkerData,
  downloadPaymentReceipt,
  fetchProductionDashboardOverview,
  fetchAssessmentQueue,
  saveTechnicalAssessment,
  fetchTechnicalAssessment,
  generateQuotation,
  fetchOrderQuotations,
  setupProductionStages,
  fetchOrderProductionStages,
  fetchWorkersAvailableForStage,
  assignStageWorker,
  receiveCustomerMaterial,
  fetchOrderProductionHistory,
  fetchFabricationJobsForProduction,
  fetchOnsiteJobsForProduction,
  assignWorkerToFabrication,
  assignWorkerToOnsiteJob,
  assignFabricationCarrierApi,
  markFabricationMaterialReceivedApi,
  fetchProductionReports,
  fetchSupervisorWorkload,
  assignProductionSupervisor,
  ProductionOverviewData,
  AssessmentQueueItem,
  TechnicalAssessmentData,
  QuotationData,
  ProductionStageData,
  ProductionHistoryItem,
  OnsiteJobData,
  ProductionReportsData,
  ProductionSupervisorWorkload
} from '../../services/api_production';
import {
  fetchQueriesFromDB,
  createStaffQueryInDB,
  fetchNotificationsFromDB,
  markNotificationReadInDB,
  markAllNotificationsReadInDB,
  updateUserProfile
} from '../../services/api';
import { StaffQuery, addStaffQuery } from '../../utils/staffQueriesStorage';
import {
  getCouponsApi,
  createCouponApi,
  deleteCouponApi,
  regenerateCouponApi,
  Coupon,
  CouponAllotment
} from '../../services/api_coupons';
import { getCarrierPartnersApi, CarrierPartner } from '../../services/api_carriers';
import { getStageSections } from '../../utils/manufacturingSections';
import {
  getMessagesForUser,
  markAdminMessageRead,
  markAllAdminMessagesReadForUser,
  isMessageReadByUser,
  AdminMessage
} from '../../utils/adminMessagesStorage';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';
import { formatStatusLabel, getStatusBadgeColor } from '../../utils/statusUtils';

const formatKolkataTime = (dateStr: string | null | undefined): string => {
  if (!dateStr || dateStr === '—') return '—';
  if (dateStr.includes('IST')) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d) + ' IST';
  } catch {
    return dateStr;
  }
};

export const ProductionStaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const currentUser = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : { email: 'production.staff@retailsphere.com', role: 'Production Staff' };
    } catch {
      return { email: 'production.staff@retailsphere.com', role: 'Production Staff' };
    }
  }, []);

  const [orders, setOrders] = useState<CustomOrderData[]>([]);
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<WorkerLeaveItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assessment_queue' | 'quotations' | 'active_production' | 'workers' | 'materials' | 'quality' | 'completed' | 'onsite' | 'reports' | 'machines' | 'ai_insights' | 'queries' | 'coupons' | 'admin_messages' | 'orders' | 'approvals' | 'assignments' | 'raw_materials' | 'leave'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [approvalFilter, setApprovalFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allotmentSearchQuery, setAllotmentSearchQuery] = useState<string>('');

  // 1. Dashboard Overview State
  const [overviewData, setOverviewData] = useState<ProductionOverviewData | null>(null);
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

  // 2. Assessment Queue State
  const [assessmentQueue, setAssessmentQueue] = useState<AssessmentQueueItem[]>([]);
  const [assessmentCategoryFilter, setAssessmentCategoryFilter] = useState<string>('ALL');
  const [assessmentTabFilter, setAssessmentTabFilter] = useState<string>('ALL');

  // 3. Technical Assessment Workspace State
  const [selectedAssessmentRequest, setSelectedAssessmentRequest] = useState<AssessmentQueueItem | null>(null);
  const [assFeasibility, setAssFeasibility] = useState<'FEASIBLE' | 'NOT_FEASIBLE'>('FEASIBLE');
  const [assUnfeasibilityReason, setAssUnfeasibilityReason] = useState('');
  const [assOperations, setAssOperations] = useState('Wood Cutting, Edge Profiling, Surface Sanding, Polish');
  const [assStages, setAssStages] = useState<string[]>(['Cutting', 'Shaping', 'Sanding', 'Finishing']);
  const [assMaterialReq, setAssMaterialReq] = useState('Teak Timber Planks 150x50mm');
  const [assMachineReq, setAssMachineReq] = useState('CNC Router, Orbital Sander');
  const [assSkillReq, setAssSkillReq] = useState('Woodwork & Carpentry, Surface Finishing');
  const [assLabourHours, setAssLabourHours] = useState('12');
  const [assMachineHours, setAssMachineHours] = useState('4');
  const [assDurationDays, setAssDurationDays] = useState('3');
  const [assCompletionDate, setAssCompletionDate] = useState('');
  const [assMatCost, setAssMatCost] = useState('18500');
  const [assLabCost, setAssLabCost] = useState('8500');
  const [assMacCost, setAssMacCost] = useState('3500');
  const [assFinCost, setAssFinCost] = useState('2500');
  const [assFinType, setAssFinType] = useState('Natural Matte Wax (Cream White)');
  const [assOthCost, setAssOthCost] = useState('2000');
  const [assProdNotes, setAssProdNotes] = useState('High precision moisture checking required before cutting.');
  const [assTechNotes, setAssTechNotes] = useState('');

  // 4. Quotation Generation State
  const [selectedQuotationRequest, setSelectedQuotationRequest] = useState<any | null>(null);
  const [orderQuotationsList, setOrderQuotationsList] = useState<QuotationData[]>([]);
  const [quoteMaterialCost, setQuoteMaterialCost] = useState('18500');
  const [quoteLabourCost, setQuoteLabourCost] = useState('8500');
  const [quoteMachineCost, setQuoteMachineCost] = useState('3500');
  const [quoteFinishingCost, setQuoteFinishingCost] = useState('2500');
  const [quoteOtherCost, setQuoteOtherCost] = useState('2000');
  const [quoteDuration, setQuoteDuration] = useState('3 Working Days');
  const [quoteNotes, setQuoteNotes] = useState('');

  // 5. Stage-by-Stage Worker Assignment & Multi-Supervisor State
  const [stageAssignOrder, setStageAssignOrder] = useState<any | null>(null);
  const [stageAssignList, setStageAssignList] = useState<ProductionStageData[]>([]);
  const [selectedStageToAssign, setSelectedStageToAssign] = useState<ProductionStageData | null>(null);
  const [availableSkillWorkers, setAvailableSkillWorkers] = useState<WorkerData[]>([]);
  const [selectedSkillWorkerId, setSelectedSkillWorkerId] = useState<number | ''>('');
  const [stageAssignNotes, setStageAssignNotes] = useState('');

  const [supervisorWorkloadList, setSupervisorWorkloadList] = useState<ProductionSupervisorWorkload[]>([]);
  const [assignedSupervisorFilter, setAssignedSupervisorFilter] = useState<'ALL' | 'MY_OVERSEEN'>('ALL');
  const [currentSupervisorId] = useState<number>(3); // Default to Supervisor A (id: 3)
  const [recommendedWorkerForStage, setRecommendedWorkerForStage] = useState<WorkerData | null>(null);

  // 6. Material Receipt State
  const [selectedMaterialOrder, setSelectedMaterialOrder] = useState<any | null>(null);
  const [matCondition, setMatCondition] = useState('Good');
  const [matQty, setMatQty] = useState('1');
  const [matUnit, setMatUnit] = useState('pieces');
  const [matNotes, setMatNotes] = useState('');

  // 7. Quality Control Inspection State
  const [selectedQCOrder, setSelectedQCOrder] = useState<any | null>(null);
  const [qcDimensions, setQcDimensions] = useState(true);
  const [qcMaterial, setQcMaterial] = useState(true);
  const [qcDesign, setQcDesign] = useState(true);
  const [qcSurface, setQcSurface] = useState(true);
  const [qcStages, setQcStages] = useState(true);
  const [qcCustomer, setQcCustomer] = useState(true);
  const [qcNotes, setQcNotes] = useState('');
  const [reworkWorkerId, setReworkWorkerId] = useState<number | ''>('');

  // 8. Audit History State
  const [auditHistoryOrder, setAuditHistoryOrder] = useState<{ type: string; id: number; title?: string } | null>(null);
  const [auditHistoryList, setAuditHistoryList] = useState<ProductionHistoryItem[]>([]);

  // 9. On-Site Jobs & Reports State
  const [onsiteJobsList, setOnsiteJobsList] = useState<OnsiteJobData[]>([]);
  const [reportsData, setReportsData] = useState<ProductionReportsData | null>(null);

  // Direct Assignment Form State
  const [assignFormOrderId, setAssignFormOrderId] = useState<number | ''>('');
  const [assignFormWorkerId, setAssignFormWorkerId] = useState<number | ''>('');
  const [assignFormDepartment, setAssignFormDepartment] = useState<string>('Woodwork & Carpentry');
  const [assignFormNotes, setAssignFormNotes] = useState<string>('');
  const [workerDeptFilter, setWorkerDeptFilter] = useState<'All' | 'Woodwork & Carpentry' | 'Upholstery' | 'Assembly'>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('Woodwork & Carpentry');
  const [prodActiveCategoryFilter, setProdActiveCategoryFilter] = useState<'all' | 'custom' | 'fabrication' | 'onsite'>('all');

  // Feature 1: Fabrication Details State (Strictly DB-Fetched)
  const [fabricationJobs, setFabricationJobs] = useState<any[]>([]);
  const [fabSearchQuery, setFabSearchQuery] = useState('');
  const [fabStatusFilter, setFabStatusFilter] = useState('All');
  const [selectedFabJobModal, setSelectedFabJobModal] = useState<any | null>(null);

  // Feature 2: Approved On-Site Requests State (Strictly DB-Fetched)
  const [approvedOnsiteRequests, setApprovedOnsiteRequests] = useState<any[]>([]);
  const [onsiteSearchQuery, setOnsiteSearchQuery] = useState('');
  const [onsiteStatusFilter, setOnsiteStatusFilter] = useState('All');
  const [selectedOnsiteRequestModal, setSelectedOnsiteRequestModal] = useState<any | null>(null);

  // Feature 3: Universal Worker Assignment Modal State
  const [assignWorkerModalData, setAssignWorkerModalData] = useState<{
    type: 'custom' | 'fabrication' | 'onsite';
    id: number;
    title: string;
    currentWorkerId?: number;
    stageId?: number;
  } | null>(null);
  const [assignModalWorkerId, setAssignModalWorkerId] = useState<number | ''>('');
  const [assignModalNotes, setAssignModalNotes] = useState<string>('');
  const [isAssigningWorker, setIsAssigningWorker] = useState<boolean>(false);

  const handleMarkOnsiteInProduction = (reqId: string) => {
    setApprovedOnsiteRequests(prev => prev.map(item => {
      if (item.request_id === reqId) {
        return { ...item, production_status: 'In Production' };
      }
      return item;
    }));
    setSuccessNotice(`On-Site Request ${reqId} marked as 'In Production'. Shop floor work scheduled.`);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleMarkOnsiteReadyForDispatch = (reqId: string) => {
    setApprovedOnsiteRequests(prev => prev.map(item => {
      if (item.request_id === reqId) {
        return { ...item, production_status: 'Ready for Dispatch' };
      }
      return item;
    }));
    setSuccessNotice(`On-Site Request ${reqId} marked as 'Ready for Dispatch'. Transferred to dispatch log.`);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const filteredFabJobs = React.useMemo(() => {
    return fabricationJobs.filter((job) => {
      const matchesSearch =
        !fabSearchQuery ||
        job.product_name.toLowerCase().includes(fabSearchQuery.toLowerCase()) ||
        job.fabrication_id.toLowerCase().includes(fabSearchQuery.toLowerCase()) ||
        job.order_id.toLowerCase().includes(fabSearchQuery.toLowerCase()) ||
        job.material_required.toLowerCase().includes(fabSearchQuery.toLowerCase()) ||
        job.assigned_team.toLowerCase().includes(fabSearchQuery.toLowerCase());

      const matchesStatus =
        fabStatusFilter === 'All' ? job.status !== 'Completed' : job.status.toLowerCase() === fabStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [fabricationJobs, fabSearchQuery, fabStatusFilter]);

  const filteredOnsiteRequests = React.useMemo(() => {
    return approvedOnsiteRequests.filter((req) => {
      const matchesSearch =
        !onsiteSearchQuery ||
        req.store_name.toLowerCase().includes(onsiteSearchQuery.toLowerCase()) ||
        req.request_id.toLowerCase().includes(onsiteSearchQuery.toLowerCase()) ||
        req.product_name.toLowerCase().includes(onsiteSearchQuery.toLowerCase()) ||
        req.assigned_production_team.toLowerCase().includes(onsiteSearchQuery.toLowerCase());

      const matchesStatus =
        onsiteStatusFilter === 'All' || req.production_status.toLowerCase() === onsiteStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [approvedOnsiteRequests, onsiteSearchQuery, onsiteStatusFilter]);

  const getRequiredProductionStages = (furnitureType?: string, material?: string, designDesc?: string) => {
    const typeStr = (furnitureType || '').toLowerCase();
    const matStr = (material || '').toLowerCase();
    const descStr = (designDesc || '').toLowerCase();

    const isAssemblyOnly = typeStr.includes('ready') || typeStr.includes('assembly only') || typeStr.includes('flatpack') || typeStr.includes('pre-cut') || typeStr.includes('modular kit');
    if (isAssemblyOnly) {
      return [
        { key: 'Assembly', label: 'Assembly & QA', icon: '🔧', desc: 'Final component fitting, hardware & quality inspection' }
      ];
    }

    const needsWood = !typeStr.includes('pure upholstery') && !typeStr.includes('re-cushion');
    const needsUpholstery = typeStr.includes('sofa') || typeStr.includes('couch') || typeStr.includes('chair') || typeStr.includes('seat') || typeStr.includes('recliner') || typeStr.includes('cushion') || typeStr.includes('upholster') || typeStr.includes('daybed') || typeStr.includes('ottoman') || matStr.includes('fabric') || matStr.includes('leather') || matStr.includes('velvet') || matStr.includes('cotton') || matStr.includes('foam') || descStr.includes('cushion') || descStr.includes('fabric') || descStr.includes('leather');

    const stages = [];
    if (needsWood) {
      stages.push({ key: 'Woodwork & Carpentry', label: 'Woodwork & Carpentry', icon: '🪵', desc: 'Cutting, shaping, drilling & timber frame joinery' });
    }
    if (needsUpholstery) {
      stages.push({ key: 'Upholstery', label: 'Upholstery', icon: '🪡', desc: 'Foam padding, fabric/leather cushioning & stitching' });
    }
    stages.push({ key: 'Assembly', label: 'Assembly & QA', icon: '🔧', desc: 'Final component fitting, hardware & quality inspection' });

    return stages;
  };

  // Notifications & User Menu Dropdown State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Add Worker Modal State
  const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerSpec, setNewWorkerSpec] = useState('Woodwork & Carpentry');
  const [addWorkerError, setAddWorkerError] = useState<string | null>(null);
  const [isAddWorkerSubmitting, setIsAddWorkerSubmitting] = useState(false);

  // Edit Worker Modal State
  const [editingWorker, setEditingWorker] = useState<WorkerData | null>(null);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editWorkerEmail, setEditWorkerEmail] = useState('');
  const [editWorkerPhone, setEditWorkerPhone] = useState('');
  const [editWorkerSpec, setEditWorkerSpec] = useState('Woodwork & Carpentry');
  const [editWorkerError, setEditWorkerError] = useState<string | null>(null);
  const [isEditWorkerSubmitting, setIsEditWorkerSubmitting] = useState(false);
  const [resendingCredentialsId, setResendingCredentialsId] = useState<number | null>(null);

  // Staff Profile Modal & Password Update State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isMaterialReceiptModalOpen, setIsMaterialReceiptModalOpen] = useState(false);

  // Customer Material Receipts Log State
  const [materialLogs, setMaterialLogs] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('customer_material_receipts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Queries State
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [newQueryCategory, setNewQueryCategory] = useState<'Email Change Request' | 'Role & Access Permission' | 'General Query'>('Email Change Request');
  const [newQuerySubject, setNewQuerySubject] = useState('');
  const [newQueryMessage, setNewQueryMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Admin Directives & Messages State
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);

  const loadAdminMessages = () => {
    const userEmail = currentUser.email || 'production.staff@retailsphere.com';
    const userRole = currentUser.role || 'Production Staff';
    setAdminMessages(getMessagesForUser(userEmail, userRole));
  };

  useEffect(() => {
    loadAdminMessages();
    window.addEventListener('admin-messages-updated', loadAdminMessages);
    window.addEventListener('storage', loadAdminMessages);
    return () => {
      window.removeEventListener('admin-messages-updated', loadAdminMessages);
      window.removeEventListener('storage', loadAdminMessages);
    };
  }, [currentUser]);

  const unreadAdminMsgsCount = adminMessages.filter(m => !isMessageReadByUser(m, currentUser.email)).length;

  // Coupons Management State
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [allotmentsList, setAllotmentsList] = useState<CouponAllotment[]>([]);
  const [couponSearchQuery, setCouponSearchQuery] = useState('');
  const [isAddCouponModalOpen, setIsAddCouponModalOpen] = useState(false);

  // New Coupon Form State
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(10);
  const [newCouponDescription, setNewCouponDescription] = useState('');
  const [newCouponTargetEmail, setNewCouponTargetEmail] = useState('');
  const [newCouponCustomerLimit, setNewCouponCustomerLimit] = useState<number | ''>(10);
  const [newCouponAudience, setNewCouponAudience] = useState<string>('production');
  const [newCouponAutoAllot, setNewCouponAutoAllot] = useState(false);

  const loadCouponsData = async () => {
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
    loadCouponsData();
  }, []);

  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;

    const limitVal = typeof newCouponCustomerLimit === 'number' ? newCouponCustomerLimit : (parseInt(newCouponCustomerLimit as any, 10) || 10);
    const targetEmail = newCouponTargetEmail.trim();

    try {
      await createCouponApi({
        code: newCouponCode.trim().toUpperCase(),
        coupon_type: targetEmail ? 'percentage_notification' : 'first_n_customers',
        discount_percent: newCouponDiscount,
        description: newCouponDescription.trim() || `${newCouponDiscount}% OFF Custom Furniture Offer`,
        target_user_email: targetEmail || undefined,
        customer_limit: limitVal
      });

      await loadCouponsData();
      setSuccessNotice(`Custom Furniture Coupon "${newCouponCode.trim().toUpperCase()}" created successfully!`);
      setNewCouponCode('');
      setNewCouponDiscount(10);
      setNewCouponDescription('');
      setNewCouponTargetEmail('');
      setNewCouponCustomerLimit(10);
      setNewCouponAudience('production');
      setNewCouponAutoAllot(false);
      setIsAddCouponModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create coupon.');
    }
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleRemoveCoupon = async (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to deactivate and remove coupon "${code}"?`)) {
      try {
        await deleteCouponApi(id);
        await loadCouponsData();
        setSuccessNotice(`Coupon "${code}" removed.`);
      } catch (err: any) {
        alert(err.message || 'Failed to remove coupon.');
      }
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  // Modals state
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<CustomOrderData | null>(null);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<CustomOrderData | null>(null);
  const [approvalPrice, setApprovalPrice] = useState<string>('');
  const [approvalRemarks, setApprovalRemarks] = useState<string>('');

  const [selectedOrderForWorker, setSelectedOrderForWorker] = useState<any | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [carriersList, setCarriersList] = useState<CarrierPartner[]>([
    { carrier_id: 1, carrier_name: 'BlueDart Express Logistics', contact_phone: '+91 98765 43210', status: true },
    { carrier_id: 2, carrier_name: 'Delivery Times Logistics', contact_phone: '+91 98765 43211', status: true },
    { carrier_id: 3, carrier_name: 'Delhivery Surface Logistics', contact_phone: '+91 98765 43212', status: true },
    { carrier_id: 4, carrier_name: 'DHL Express India', contact_phone: '+91 98765 43213', status: true },
    { carrier_id: 5, carrier_name: 'FedEx Cargo Services', contact_phone: '+91 98765 43214', status: true }
  ]);
  const [selectedLogisticsType, setSelectedLogisticsType] = useState<'CARRIER_PARTNER' | 'INTERNAL_FLEET' | 'CUSTOMER_ARRANGED'>('CARRIER_PARTNER');
  const [selectedCarrierPartnerId, setSelectedCarrierPartnerId] = useState<string>('1');
  const [selectedFleetDriverId, setSelectedFleetDriverId] = useState<string>('');

  // Dedicated Inbound Carrier Partner Allotment Modal State
  const [assignCarrierModalData, setAssignCarrierModalData] = useState<{
    fabricationId: number;
    title: string;
    currentCarrier?: string;
  } | null>(null);
  const [carrierModalType, setCarrierModalType] = useState<'CARRIER_PARTNER' | 'INTERNAL_FLEET'>('CARRIER_PARTNER');
  const [carrierModalPartnerId, setCarrierModalPartnerId] = useState<string>('1');
  const [carrierModalDriverId, setCarrierModalDriverId] = useState<string>('');
  const [carrierModalNotes, setCarrierModalNotes] = useState<string>('');
  const [isAssigningCarrier, setIsAssigningCarrier] = useState<boolean>(false);

  const [selectedOrderForProgress, setSelectedOrderForProgress] = useState<CustomOrderData | null>(null);
  const [progressStage, setProgressStage] = useState<string>('Material Sourcing');
  const [progressPercent, setProgressPercent] = useState<number>(30);
  const [progressRemarks, setProgressRemarks] = useState<string>('');
  const [modalProgressError, setModalProgressError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const loadNotifs = async () => {
    try {
      const dbNotifs = await fetchNotificationsFromDB();
      setNotifications(dbNotifs || []);
    } catch {
      setNotifications([]);
    }
  };

  const loadQueries = async () => {
    try {
      const dbQueries = await fetchQueriesFromDB();
      setStaffQueries(dbQueries || []);
    } catch {
      setStaffQueries([]);
    }
  };

  const loadOverviewData = async () => {
    try {
      const overview = await fetchProductionDashboardOverview();
      setOverviewData(overview);
    } catch (err) {
      console.error('Error fetching overview:', err);
    }
    try {
      const cList = await getCarrierPartnersApi();
      if (cList && cList.length > 0) {
        setCarriersList(cList);
      }
    } catch (err) {
      console.warn('Carriers fetch notice:', err);
    }
  };

  const loadQueueData = async (catFilt: string = assessmentCategoryFilter, tabFilt: string = assessmentTabFilter) => {
    try {
      const q = await fetchAssessmentQueue(catFilt, tabFilt);
      console.log('[ProductionStaffDashboard] Assessment queue records from API:', q);
      setAssessmentQueue(q || []);
    } catch (err) {
      console.error('Error fetching assessment queue:', err);
    }
  };

  useEffect(() => {
    loadOverviewData();
    loadQueueData(assessmentCategoryFilter, assessmentTabFilter);
  }, [assessmentCategoryFilter, assessmentTabFilter, activeTab]);

  const loadFabricationData = async () => {
    try {
      const fabs = await fetchFabricationJobsForProduction();
      setFabricationJobs(fabs || []);
    } catch (err) {
      console.error('Error fetching fabrication jobs from DB:', err);
      setFabricationJobs([]);
    }
  };

  const loadOnsiteData = async () => {
    try {
      const jobs = await fetchOnsiteJobsForProduction();
      setOnsiteJobsList(jobs || []);
      setApprovedOnsiteRequests(jobs || []);
    } catch (err) {
      console.error('Error fetching onsite jobs:', err);
      setApprovedOnsiteRequests([]);
    }
  };

  const getWorkerLiveWorkload = (workerId: number) => {
    const customCount = orders.filter(
      (o) => (o.assigned_workers || []).some((aw) => aw.worker_id === workerId) && !['Completed', 'Cancelled', 'Delivered'].includes(o.order_status)
    ).length;
    const fabCount = (fabricationJobs || []).filter(
      (j: any) => j.assigned_worker_id === workerId && !['Completed', 'Delivered'].includes(j.status)
    ).length;
    const onsiteCount = (onsiteJobsList || approvedOnsiteRequests || []).filter(
      (o: any) => o.assigned_worker_id === workerId && !['Completed', 'Delivered'].includes(o.status || o.production_status)
    ).length;
    return {
      customCount,
      fabCount,
      onsiteCount,
      total: customCount + fabCount + onsiteCount
    };
  };

  const handleOpenAssignWorkerModal = (
    type: 'custom' | 'fabrication' | 'onsite',
    id: number,
    title: string,
    currentWorkerId?: number,
    stageId?: number
  ) => {
    setAssignWorkerModalData({ type, id, title, currentWorkerId, stageId });
    if (currentWorkerId) {
      setAssignModalWorkerId(currentWorkerId);
    } else {
      // Find AI Recommended worker with lowest active workload
      const activeWorkers = workers.filter(w => w.status === true || w.status === 'Active' || w.status === 'active' || String(w.status) === 'true' || String(w.status) === '1');
      if (activeWorkers.length > 0) {
        const sorted = [...activeWorkers].sort((a, b) => {
          const loadA = getWorkerLiveWorkload(a.worker_id).total;
          const loadB = getWorkerLiveWorkload(b.worker_id).total;
          return loadA - loadB;
        });
        setAssignModalWorkerId(sorted[0].worker_id);
      } else {
        setAssignModalWorkerId('');
      }
    }
    setAssignModalNotes('');
  };

  const handleConfirmAssignWorker = async () => {
    if (!assignWorkerModalData || !assignModalWorkerId) return;
    setIsAssigningWorker(true);
    try {
      const wId = Number(assignModalWorkerId);
        if (assignWorkerModalData.type === 'custom') {
        const res = await assignWorkerTask(assignWorkerModalData.id, wId, undefined);
        if (res.error) throw new Error(res.error);
        setSuccessNotice(`Assigned artisan to Custom Order #${assignWorkerModalData.id}`);
      } else if (assignWorkerModalData.type === 'fabrication') {
        const res = await assignWorkerToFabrication(assignWorkerModalData.id, wId, assignWorkerModalData.stageId, assignModalNotes);
        if (!res.ok) throw new Error(res.message);
        if (selectedLogisticsType === 'CARRIER_PARTNER' && selectedCarrierPartnerId) {
          const cObj = carriersList.find(c => String(c.carrier_id) === String(selectedCarrierPartnerId));
          await assignFabricationCarrierApi(assignWorkerModalData.id, Number(selectedCarrierPartnerId), cObj?.carrier_name, undefined, 'CARRIER_PARTNER');
        } else if (selectedLogisticsType === 'INTERNAL_FLEET' && selectedFleetDriverId) {
          await assignFabricationCarrierApi(assignWorkerModalData.id, undefined, undefined, Number(selectedFleetDriverId), 'INTERNAL_FLEET');
        }
        setSuccessNotice(`Assigned artisan & logistics to Fabrication Job #${assignWorkerModalData.id}`);
      } else if (assignWorkerModalData.type === 'onsite') {
        const res = await assignWorkerToOnsiteJob(assignWorkerModalData.id, wId, undefined, assignModalNotes);
        if (!res.ok) throw new Error(res.message);
        setSuccessNotice(`Assigned field artisan to On-Site Job #${assignWorkerModalData.id}`);
      }
      setAssignWorkerModalData(null);
      setAssignModalWorkerId('');
      setAssignModalNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign worker.');
    } finally {
      setIsAssigningWorker(false);
      setTimeout(() => setSuccessNotice(null), 5000);
    }
  };

  const handleOpenAssignCarrierModal = (
    fabricationId: number,
    title: string,
    currentCarrier?: string
  ) => {
    setAssignCarrierModalData({ fabricationId, title, currentCarrier });
    setCarrierModalType('CARRIER_PARTNER');
    if (carriersList.length > 0) {
      setCarrierModalPartnerId(String(carriersList[0].carrier_id));
    }
    const driverWorkers = workers.filter(w => (w.specialization || '').toLowerCase().includes('driver') || (w as any).is_driver);
    setCarrierModalDriverId(driverWorkers.length > 0 ? String(driverWorkers[0].worker_id) : (workers.length > 0 ? String(workers[0].worker_id) : ''));
    setCarrierModalNotes('');
  };

  const handleConfirmAssignCarrier = async () => {
    if (!assignCarrierModalData) return;
    setIsAssigningCarrier(true);
    try {
      if (carrierModalType === 'CARRIER_PARTNER') {
        const cObj = carriersList.find((c) => String(c.carrier_id) === String(carrierModalPartnerId));
        const cName = cObj?.carrier_name || 'BlueDart Express Logistics';
        const res = await assignFabricationCarrierApi(
          assignCarrierModalData.fabricationId,
          Number(carrierModalPartnerId) || 1,
          cName,
          undefined,
          'CARRIER_PARTNER',
          carrierModalNotes
        );
        if (!res.ok) throw new Error(res.message);
        setSuccessNotice(`Carrier Partner '${cName}' allotted for material pickup of Fabrication #${assignCarrierModalData.fabricationId}`);
      } else {
        const dUser = workers.find((w) => String(w.worker_id) === String(carrierModalDriverId));
        const dName = dUser?.full_name || 'Internal Fleet Driver';
        const res = await assignFabricationCarrierApi(
          assignCarrierModalData.fabricationId,
          undefined,
          undefined,
          Number(carrierModalDriverId),
          'INTERNAL_FLEET',
          carrierModalNotes
        );
        if (!res.ok) throw new Error(res.message);
        setSuccessNotice(`Internal Fleet Driver '${dName}' allotted for material pickup of Fabrication #${assignCarrierModalData.fabricationId}`);
      }

      setAssignCarrierModalData(null);
      await loadFabricationData();
      if (selectedFabJobModal && selectedFabJobModal.numeric_id === assignCarrierModalData.fabricationId) {
        const chosenCarrierName = carrierModalType === 'CARRIER_PARTNER'
          ? (carriersList.find((c) => String(c.carrier_id) === String(carrierModalPartnerId))?.carrier_name || 'BlueDart Express Logistics')
          : `Internal Fleet (${workers.find((w) => String(w.worker_id) === String(carrierModalDriverId))?.full_name || 'Driver'})`;

        setSelectedFabJobModal((prev: any) =>
          prev
            ? {
                ...prev,
                pickup_carrier: chosenCarrierName,
                pickup_status: 'Out for Pickup',
                is_pickup_completed: false
              }
            : null
        );
      }
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to allot carrier partner.');
    } finally {
      setIsAssigningCarrier(false);
    }
  };

  const handleMarkMaterialReceived = async (fabricationId: number) => {
    if (selectedFabJobModal && !selectedFabJobModal.pickup_carrier) {
      alert('Please assign a Carrier Partner or Internal Fleet Driver before marking material as received at the workshop.');
      return;
    }
    try {
      const res = await markFabricationMaterialReceivedApi(fabricationId);
      if (!res.ok) throw new Error(res.message);
      setSuccessNotice(`Material marked as received at Workshop Hub for Fabrication #${fabricationId}. Artisans can now proceed with cutting.`);
      if (selectedFabJobModal && selectedFabJobModal.numeric_id === fabricationId) {
        setSelectedFabJobModal((prev: any) => prev ? { ...prev, is_pickup_completed: true, pickup_status: 'Delivered' } : null);
      }
      await loadFabricationData();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to mark material as received.');
    }
  };

  const loadReportsData = async () => {
    try {
      const rep = await fetchProductionReports();
      setReportsData(rep);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const handleOpenAssessment = async (item: AssessmentQueueItem) => {
    setSelectedAssessmentRequest(item);
    const isService = item.order_type === 'On-Site Service' || item.order_type === 'Service' || item.request_id?.startsWith('ONS-') || item.request_id?.startsWith('SRV-') || item.request_id?.startsWith('OSR-');
    const ordType = (item.order_type === 'Customization' || item.request_id?.startsWith('CUS-')) ? 'Custom' : isService ? 'Service' : 'Fabrication';

    // Calculate realistic default cost scale
    const titleLower = (item.title || item.furniture_type || '').toLowerCase();
    const matLower = (item.material || '').toLowerCase();

    let defaultMat = 18500;
    let defaultLab = 8500;
    let defaultMac = 3500;
    let defaultFin = 2500;
    let defaultOth = 2000; // Default total ₹35,000

    if (isService) {
      defaultMat = 2500;
      defaultLab = 4500;
      defaultMac = 1000;
      defaultFin = 1000;
      defaultOth = 1500; // Total ₹10,500
    } else if (titleLower.includes('sofa') || titleLower.includes('bed') || titleLower.includes('dining') || titleLower.includes('wardrobe') || matLower.includes('marble') || matLower.includes('teak')) {
      defaultMat = 22000;
      defaultLab = 9500;
      defaultMac = 4000;
      defaultFin = 3000;
      defaultOth = 2500; // Total ₹41,000
    } else if (titleLower.includes('desk') || titleLower.includes('console') || titleLower.includes('cabinet') || titleLower.includes('table')) {
      defaultMat = 17500;
      defaultLab = 7500;
      defaultMac = 3000;
      defaultFin = 2200;
      defaultOth = 1800; // Total ₹32,000
    }

    try {
      const ass = await fetchTechnicalAssessment(ordType, item.numeric_id);
      if (ass) {
        setAssFeasibility(ass.feasibility);
        setAssUnfeasibilityReason(ass.unfeasibility_reason || '');
        setAssOperations(ass.required_operations || '');
        setAssStages(ass.required_stages && ass.required_stages.length > 0 ? ass.required_stages : (isService ? ['Site Inspection', 'Structural Repair', 'Surface Finishing', 'Client Handover'] : ['Cutting', 'Shaping', 'Sanding', 'Finishing']));
        setAssMaterialReq(ass.material_requirements || '');
        setAssMachineReq(ass.machine_requirements || '');
        setAssSkillReq(ass.worker_skill_requirements || '');
        setAssLabourHours(ass.labour_hours ? ass.labour_hours.toString() : (isService ? '8' : '12'));
        setAssMachineHours(ass.machine_hours ? ass.machine_hours.toString() : (isService ? '2' : '4'));
        setAssDurationDays(ass.estimated_duration_days ? ass.estimated_duration_days.toString() : (isService ? '1' : '3'));
        setAssMatCost(ass.material_cost ? ass.material_cost.toString() : defaultMat.toString());
        setAssLabCost(ass.labour_cost ? ass.labour_cost.toString() : defaultLab.toString());
        setAssMacCost(ass.machine_cost ? ass.machine_cost.toString() : defaultMac.toString());
        setAssFinCost(ass.finishing_cost ? ass.finishing_cost.toString() : defaultFin.toString());
        setAssOthCost(ass.other_cost ? ass.other_cost.toString() : defaultOth.toString());
        setAssProdNotes(ass.production_notes || '');
        setAssTechNotes(ass.technical_notes || '');
      } else {
        setAssFeasibility('FEASIBLE');
        setAssUnfeasibilityReason('');
        setAssOperations(isService ? `On-Site Assessment, Carpentry Repair & Fitting` : `Precision ${item.material || 'Timber'} Processing & Assembly`);
        setAssStages(isService ? ['Site Inspection', 'Structural Repair', 'Surface Finishing', 'Client Handover'] : ['Cutting', 'Shaping', 'Sanding', 'Finishing']);
        setAssMaterialReq(isService ? `Required Hardware & Replacement Parts: ${item.title}` : `Material: ${item.material}`);
        setAssMachineReq(isService ? 'Portable Power Tools, Drill, Sander' : 'CNC Router, Sander');
        setAssSkillReq(isService ? 'Skilled Field Carpenter & Structural Specialist' : 'Woodwork & Carpentry, Surface Finishing');
        setAssLabourHours(isService ? '8' : '16');
        setAssMachineHours(isService ? '2' : '6');
        setAssDurationDays(isService ? '1' : '4');
        setAssMatCost(defaultMat.toString());
        setAssLabCost(defaultLab.toString());
        setAssMacCost(defaultMac.toString());
        setAssFinCost(defaultFin.toString());
        setAssOthCost(defaultOth.toString());
        setAssProdNotes(isService ? 'Scheduled on-site technician visit with necessary tooling.' : 'Moisture check & grain alignment required before cutting.');
        setAssTechNotes('');
      }
    } catch (e) {
      console.error('Error opening assessment workspace:', e);
    }
  };

  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);

  const handleSaveAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessmentRequest) return;
    setIsSubmittingAssessment(true);
    try {
      const isService = selectedAssessmentRequest.order_type === 'On-Site Service' || selectedAssessmentRequest.order_type === 'Service' || selectedAssessmentRequest.request_id?.startsWith('ONS-') || selectedAssessmentRequest.request_id?.startsWith('SRV-') || selectedAssessmentRequest.request_id?.startsWith('OSR-');
      const ordType = (selectedAssessmentRequest.order_type === 'Customization' || selectedAssessmentRequest.request_id?.startsWith('CUS-')) ? 'Custom' : isService ? 'Service' : 'Fabrication';
      const matCost = Number(assMatCost) || 0;
      const labCost = Number(assLabCost) || 0;
      const macCost = Number(assMacCost) || 0;
      const finCost = Number(assFinCost) || 0;
      const othCost = Number(assOthCost) || 0;
      const totalCalc = matCost + labCost + macCost + finCost + othCost;

      const payload: TechnicalAssessmentData = {
        order_type: ordType,
        order_id: selectedAssessmentRequest.numeric_id,
        assessed_by_id: userProfile?.user_id || 3,
        feasibility: assFeasibility,
        unfeasibility_reason: assUnfeasibilityReason,
        required_operations: assOperations,
        required_stages: assStages,
        material_requirements: assMaterialReq,
        machine_requirements: assMachineReq,
        worker_skill_requirements: assSkillReq,
        labour_hours: Number(assLabourHours) || 0,
        machine_hours: Number(assMachineHours) || 0,
        estimated_duration_days: Number(assDurationDays) || 0,
        material_cost: matCost,
        labour_cost: labCost,
        machine_cost: macCost,
        finishing_cost: finCost,
        other_cost: othCost,
        total_cost: totalCalc,
        production_notes: assFinType ? `Finish Type: ${assFinType}. ${assProdNotes || ''}` : assProdNotes,
        technical_notes: assTechNotes
      };

      await saveTechnicalAssessment(payload);
      if (assFeasibility === 'FEASIBLE') {
        try {
          await generateQuotation({
            order_type: ordType,
            order_id: selectedAssessmentRequest.numeric_id,
            created_by_id: userProfile?.user_id || 3,
            material_cost: matCost,
            labour_cost: labCost,
            machine_cost: macCost,
            finishing_cost: finCost,
            assembly_cost: othCost,
            notes: assProdNotes || 'Technical assessment & quotation completed.'
          });
        } catch (qErr) {
          console.warn('Quotation generation warning:', qErr);
        }
      }
      setSelectedAssessmentRequest(null);
      await Promise.all([
        loadOverviewData(),
        loadQueueData(assessmentCategoryFilter, assessmentTabFilter),
        loadData()
      ]);
    } catch (err: any) {
      console.error('Failed to save technical assessment:', err);
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

  const handleMaterialReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveOrder = selectedMaterialOrder || orders[0] || assessmentQueue[0] || {
      custom_order_id: 37,
      customer_name: 'Valued Client',
      furniture_type: 'Custom Bespoke Furniture'
    };
    setIsSubmittingReceipt(true);
    try {
      const ordType = effectiveOrder.order_type === 'Fabrication' || effectiveOrder.request_id?.startsWith('FAB-')
        ? 'Fabrication'
        : effectiveOrder.order_type === 'On-Site Service' || effectiveOrder.request_id?.startsWith('ONS-') || effectiveOrder.request_id?.startsWith('SRV-')
        ? 'Service'
        : 'Custom';
      const ordNumId = effectiveOrder.custom_order_id || effectiveOrder.numeric_id || 37;

      const payload = {
        order_type: ordType,
        order_id: ordNumId,
        received_by_id: userProfile?.user_id || 3,
        condition: matCondition,
        quantity: Number(matQty) || 1,
        unit: matUnit,
        notes: matNotes
      };
      await receiveCustomerMaterial(payload);

      const newLog = {
        log_receipt_id: `REC-CS-${String(Date.now()).slice(-4)}`,
        client_name: effectiveOrder.customer_name || 'Client',
        order_id: effectiveOrder.request_id || `ORD-${String(ordNumId).padStart(4, '0')}`,
        material_details: `${effectiveOrder.furniture_type || effectiveOrder.title || 'Material'} - ${matNotes || 'Customer-Supplied Material'}`,
        quantity_condition: `${matQty} ${matUnit} • ${matCondition}`,
        status: 'Verified & Sealed',
        receipt_date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      const updatedLogs = [newLog, ...materialLogs];
      setMaterialLogs(updatedLogs);
      localStorage.setItem('customer_material_receipts', JSON.stringify(updatedLogs));

      setIsMaterialReceiptModalOpen(false);
      setSelectedMaterialOrder(null);
      setMatNotes('');
      setSuccessNotice(`Logged Customer Material Receipt for ${effectiveOrder.request_id || 'Order #' + ordNumId} successfully.`);
      setTimeout(() => setSuccessNotice(null), 5000);
      await Promise.all([
        loadOverviewData(),
        loadQueueData(),
        loadData()
      ]);
    } catch (err: any) {
      console.error('Failed to log material receipt:', err);
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const loadLeaveRequestsData = async () => {
    try {
      const leaves = await fetchAllLeaveRequests();
      setLeaveRequests(leaves);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    }
  };

  const handleReviewLeave = async (leaveId: number, status: 'Approved' | 'Rejected', notes?: string) => {
    try {
      await reviewLeaveRequest(leaveId, status, notes, 'Production Staff');
      await loadLeaveRequestsData();
    } catch (err) {
      console.error('Failed to review leave request:', err);
    }
  };

  const loadSupervisorWorkloadData = async () => {
    try {
      const workloads = await fetchSupervisorWorkload();
      setSupervisorWorkloadList(workloads);
    } catch (err) {
      console.error('Error fetching supervisor workloads:', err);
    }
  };

  const handleAssignSupervisorToCustomOrder = async (orderId: number, supervisorId: number) => {
    const ok = await assignProductionSupervisor(orderId, supervisorId);
    if (ok) {
      setSuccessNotice(`Production Supervisor assigned to Order #${orderId}`);
      setTimeout(() => setSuccessNotice(null), 4000);
      await loadData();
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const supFilterId = assignedSupervisorFilter === 'MY_OVERSEEN' ? currentSupervisorId : undefined;
      const [orderList, workerList] = await Promise.all([
        fetchCustomOrders('All', true, undefined, supFilterId),
        fetchWorkers()
      ]);
      setOrders(orderList);
      setWorkers(workerList);
      await Promise.all([
        loadOverviewData(),
        loadQueueData(),
        loadFabricationData(),
        loadOnsiteData(),
        loadReportsData(),
        loadLeaveRequestsData(),
        loadSupervisorWorkloadData()
      ]);
    } catch (err) {
      console.error('Error loading production data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
    loadQueries();
    loadData();
    window.addEventListener('custom-orders-updated', loadData);
    window.addEventListener('leave-requests-updated', loadLeaveRequestsData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('custom-orders-updated', loadData);
      window.removeEventListener('leave-requests-updated', loadLeaveRequestsData);
      window.removeEventListener('storage', loadData);
    };
  }, [assignedSupervisorFilter]);

  const unreadNotifCount = notifications.filter(n => n.unread).length;

  const handleLogout = () => {
    clearUserSession();
    navigate('/login');
  };

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuerySubject.trim() || !newQueryMessage.trim()) return;

    const payload = {
      staff_name: userProfile?.full_name || 'Production Staff Member',
      staff_email: userProfile?.email || 'production.staff@retailsphere.com',
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
    setSuccessNotice('Your request has been submitted to Admin!');
    setTimeout(() => setSuccessNotice(null), 6000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    let userFullName = 'Production Staff';
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        userFullName = parsed.full_name || parsed.name || 'Production Staff';
      }
    } catch (e) { }

    try {
      await updateUserProfile({
        full_name: userFullName,
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordNotice({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordNotice(null), 5000);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err.message || 'Failed to update password.' });
    }
  };

  // Actions
  const handleOpenPriceModal = (ord: CustomOrderData) => {
    const isPaid = ord.payment_status === 'Paid' || ord.order_status === 'Paid' || ord.order_status === 'In Production' || ord.order_status === 'Completed';
    if (isPaid) {
      setSuccessNotice(`Payment is complete for Order #${ord.custom_order_id}. Price editing is locked.`);
      setTimeout(() => setSuccessNotice(null), 4000);
      return;
    }
    setSelectedOrderForReview(ord);
    setApprovalPrice(ord.estimated_price && ord.estimated_price > 0 ? ord.estimated_price.toString() : '');
    setApprovalRemarks(ord.latest_remarks || '');
  };

  const handleSavePriceOnly = async () => {
    if (!selectedOrderForReview) return;
    const priceNum = parseFloat(approvalPrice) || 0;
    const nextStatus = selectedOrderForReview.order_status === 'Pending' ? 'Approved' : selectedOrderForReview.order_status;
    await updateOrderStatus(selectedOrderForReview.custom_order_id, nextStatus, priceNum, approvalRemarks);
    setSelectedOrderForReview(null);
    setApprovalPrice('');
    setApprovalRemarks('');
    setSuccessNotice(`Price quote ₹${priceNum.toLocaleString('en-IN')} saved for Order #${selectedOrderForReview.custom_order_id}.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadData();
  };

  const handleApproveOrder = async () => {
    if (!selectedOrderForReview) return;
    const priceNum = parseFloat(approvalPrice) || 0;
    await updateOrderStatus(selectedOrderForReview.custom_order_id, 'Approved', priceNum, approvalRemarks);
    setSelectedOrderForReview(null);
    setApprovalPrice('');
    setApprovalRemarks('');
    setSuccessNotice(`Customization Order #${selectedOrderForReview.custom_order_id} approved and quote updated.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadData();
  };

  const handleToggleLock = async (ord: CustomOrderData) => {
    await toggleLockOrderSpecifications(ord.custom_order_id);
    loadData();
  };

  const renderColorSwatchBadge = (colorStr?: string, explicitHex?: string | null) => {
    if (!colorStr) return <span className="font-bold text-[#2C241D]">Natural Finish</span>;
    const hexMatch = explicitHex || colorStr.match(/#(?:[0-9a-fA-F]{3}){1,2}/)?.[0] || null;
    return (
      <div className="flex items-center gap-2 flex-wrap mt-0.5">
        {hexMatch && (
          <span
            className="w-4 h-4 rounded-full inline-block border border-black/30 shadow-xs shrink-0"
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

    // 1. Furniture Category Determination
    let categoryName = 'Bespoke Custom Furniture';
    const typeLower = (ord.furniture_type || '').toLowerCase();
    if (typeLower.includes('sofa') || typeLower.includes('chair') || typeLower.includes('seat') || typeLower.includes('recliner') || typeLower.includes('daybed') || typeLower.includes('sectional')) {
      categoryName = 'Sofas & Living Room Seating';
    } else if (typeLower.includes('table') || typeLower.includes('dining') || typeLower.includes('coffee')) {
      categoryName = 'Dining & Center Tables';
    } else if (typeLower.includes('desk') || typeLower.includes('office') || typeLower.includes('workstation')) {
      categoryName = 'Executive Desks & Workspace';
    } else if (typeLower.includes('bed') || typeLower.includes('headboard') || typeLower.includes('bedroom')) {
      categoryName = 'Bespoke Beds & Bedroom';
    } else if (typeLower.includes('cabinet') || typeLower.includes('credenza') || typeLower.includes('wardrobe') || typeLower.includes('sideboard')) {
      categoryName = 'Storage & Architectural Cabinets';
    }

    fields.push({ label: 'Furniture Category', value: categoryName });
    fields.push({ label: 'Specific Furniture Type', value: ord.furniture_type });
    fields.push({ label: 'Custom Dimensions', value: ord.dimensions });
    fields.push({ label: 'Primary Timber / Material', value: ord.material });

    // 2. Parse Upholstery Fabric / Texture Finish vs Color / Polish Finish
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

  const handleRejectOrder = async () => {
    if (!selectedOrderForReview) return;
    const remarks = approvalRemarks.trim() || 'Custom order request rejected by production staff.';
    await updateOrderStatus(selectedOrderForReview.custom_order_id, 'Rejected', 0, remarks);
    setSelectedOrderForReview(null);
    setApprovalPrice('');
    setApprovalRemarks('');
    setSuccessNotice(`Customization Order #${selectedOrderForReview.custom_order_id} marked as Rejected.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadData();
  };

  const handleAssignWorkerSubmit = async () => {
    if (!selectedOrderForWorker || !selectedWorkerId) return;
    const workerObj = workers.find(w => w.worker_id === selectedWorkerId);
    const workerName = workerObj ? workerObj.full_name : 'Artisan Worker';
    const ordId = selectedOrderForWorker.custom_order_id || selectedOrderForWorker.numeric_id;

    setOrders(prev => prev.map(ord => {
      if (ord.custom_order_id === ordId) {
        const existing = ord.assigned_workers || [];
        const updated = [...existing.filter(w => w.worker_id !== selectedWorkerId), {
          assignment_id: Date.now(),
          worker_id: selectedWorkerId,
          worker_name: workerName,
          task_status: `${selectedDepartment || 'Production'}: Assigned`
        }];
        return {
          ...ord,
          assigned_workers: updated,
          order_status: ord.order_status === 'Approved' ? 'In Production' : ord.order_status
        };
      }
      return ord;
    }));

    if (ordId) {
      await assignWorkerTask(ordId, selectedWorkerId, selectedDepartment);
    }
    setSelectedOrderForWorker(null);
    setSelectedWorkerId(null);
    setSuccessNotice(`Technician assigned to ${selectedDepartment} for Order #${selectedOrderForWorker.request_id || ordId}.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    await Promise.all([loadOverviewData(), loadQueueData(), loadData()]);
  };

  const handleUnassignWorker = async (orderId: number, workerId: number, workerName: string) => {
    try {
      setOrders(prev => prev.map(ord => {
        if (ord.custom_order_id === orderId) {
          const updated = (ord.assigned_workers || []).filter(w => w.worker_id !== workerId && w.assignment_id !== workerId);
          return { ...ord, assigned_workers: updated };
        }
        return ord;
      }));

      await unassignWorkerTask(orderId, workerId);
      setSuccessNotice(`Removed ${workerName} from Order #${orderId}.`);
      setTimeout(() => setSuccessNotice(null), 4000);
      await Promise.all([loadOverviewData(), loadData()]);
    } catch (err) {
      console.error('Failed to unassign worker:', err);
    }
  };

  const handleDirectAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignFormOrderId || !assignFormWorkerId) return;
    const orderIdNum = Number(assignFormOrderId);
    const workerIdNum = Number(assignFormWorkerId);
    const targetW = workers.find(w => w.worker_id === workerIdNum);
    const workerName = targetW ? targetW.full_name : 'Artisan Worker';

    setOrders(prev => prev.map(ord => {
      if (ord.custom_order_id === orderIdNum) {
        const existing = ord.assigned_workers || [];
        const updated = [...existing.filter(w => w.worker_id !== workerIdNum), {
          assignment_id: Date.now(),
          worker_id: workerIdNum,
          worker_name: workerName,
          task_status: `${assignFormDepartment || 'Production'}: Assigned`
        }];
        return {
          ...ord,
          assigned_workers: updated,
          order_status: ord.order_status === 'Approved' ? 'In Production' : ord.order_status
        };
      }
      return ord;
    }));

    await assignWorkerTask(orderIdNum, workerIdNum, assignFormDepartment);
    setAssignFormOrderId('');
    setAssignFormWorkerId('');
    setAssignFormNotes('');
    setSuccessNotice(`Assigned ${targetW?.full_name || 'Artisan'} to ${assignFormDepartment} for Order #${assignFormOrderId}.`);
    setTimeout(() => setSuccessNotice(null), 5000);
    loadData();
  };

  const syncStageFromPercent = (percent: number): string => {
    if (percent < 25) return 'Material Sourcing';
    if (percent < 45) return 'Structural Joinery & Framing';
    if (percent < 65) return 'Upholstery & Cushioning';
    if (percent < 85) return 'Surface Lacquering & Finishing';
    if (percent < 100) return 'Quality Assurance & Packaging';
    return 'Completed & Ready for Dispatch';
  };

  const handlePercentChange = (val: number) => {
    setModalProgressError(null);
    const clamped = Math.min(100, Math.max(0, isNaN(val) ? 0 : val));
    setProgressPercent(clamped);
    const autoStage = syncStageFromPercent(clamped);
    setProgressStage(autoStage);
  };

  const handleStageChange = (newStage: string) => {
    setModalProgressError(null);
    setProgressStage(newStage);
    switch (newStage) {
      case 'Material Sourcing':
        setProgressPercent(15);
        break;
      case 'Structural Joinery & Framing':
        setProgressPercent(35);
        break;
      case 'Upholstery & Cushioning':
        setProgressPercent(55);
        break;
      case 'Surface Lacquering & Finishing':
        setProgressPercent(75);
        break;
      case 'Quality Assurance & Packaging':
        setProgressPercent(90);
        break;
      case 'Completed & Ready for Dispatch':
        setProgressPercent(100);
        break;
      default:
        break;
    }
  };

  const handleUpdateProgressSubmit = async () => {
    if (!selectedOrderForProgress) return;
    setModalProgressError(null);

    const currentOrdProgress = selectedOrderForProgress.progress_percentage || 0;
    if (progressPercent < currentOrdProgress) {
      setModalProgressError(`⚠️ Build progress percentage cannot be reduced below current recorded progress of ${currentOrdProgress}%.`);
      return;
    }

    if (!progressRemarks || progressRemarks.trim().length < 3) {
      setModalProgressError('⚠️ Please enter technician build notes / remarks for this progress update (min 3 chars).');
      return;
    }

    try {
      await updateProductionProgress(selectedOrderForProgress.custom_order_id, progressStage, progressPercent, progressRemarks);
      setSelectedOrderForProgress(null);
      setProgressRemarks('');
      setSuccessNotice(`Production stage updated for Order #${selectedOrderForProgress.custom_order_id}.`);
      setTimeout(() => setSuccessNotice(null), 5000);
      loadData();
    } catch (err: any) {
      setModalProgressError(err?.message || 'Failed to update production stage.');
    }
  };

  const handleAddWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim() || !newWorkerEmail.trim()) {
      setAddWorkerError('Please provide both worker name and email address.');
      return;
    }
    if (newWorkerPhone.trim() && newWorkerPhone.trim().replace(/\D/g, '').length < 10) {
      setAddWorkerError('Please enter a valid 10-digit phone number.');
      return;
    }
    setAddWorkerError(null);
    setIsAddWorkerSubmitting(true);
    try {
      const resWorker = await addWorker(newWorkerName.trim(), newWorkerEmail.trim(), newWorkerPhone ? newWorkerPhone.trim() : '', newWorkerSpec);
      
      if (resWorker && resWorker.email_sent === false) {
        setSuccessNotice('Worker account was created, but the login credentials could not be emailed. Please use Resend Credentials.');
      } else {
        setSuccessNotice(`Worker account created successfully. Login credentials have been sent to: ${newWorkerEmail}`);
      }

      setNewWorkerName('');
      setNewWorkerEmail('');
      setNewWorkerPhone('');
      setIsAddWorkerModalOpen(false);
      setTimeout(() => setSuccessNotice(null), 10000);
      await loadData();
    } catch (err: any) {
      console.error('Error registering worker:', err);
      const errMsg = err?.message || 'Unable to create the worker account. Please try again.';
      setAddWorkerError(errMsg);
    } finally {
      setIsAddWorkerSubmitting(false);
    }
  };

  const handleOpenEditWorker = (worker: WorkerData) => {
    setEditingWorker(worker);
    setEditWorkerName(worker.full_name || '');
    setEditWorkerEmail(worker.email || '');
    setEditWorkerPhone(worker.phone || '');
    setEditWorkerSpec(worker.specialization || 'Woodwork & Carpentry');
    setEditWorkerError(null);
  };

  const handleEditWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker || !editWorkerName.trim() || !editWorkerEmail.trim()) return;
    setEditWorkerError(null);
    setIsEditWorkerSubmitting(true);
    try {
      await updateWorker(editingWorker.worker_id, editWorkerName.trim(), editWorkerEmail.trim(), editWorkerPhone, editWorkerSpec);
      setSuccessNotice(`Worker details updated for ${editWorkerName}.`);
      setEditingWorker(null);
      setTimeout(() => setSuccessNotice(null), 5000);
      await loadData();
    } catch (err: any) {
      console.error('Error updating worker:', err);
      setEditWorkerError(err?.message || 'Failed to update worker details.');
    } finally {
      setIsEditWorkerSubmitting(false);
    }
  };

  const handleToggleWorkerStatus = async (worker: WorkerData) => {
    const nextStatus = !worker.status;
    try {
      await toggleWorkerStatus(worker.worker_id, nextStatus);
      setSuccessNotice(`Worker ${worker.full_name} status set to ${nextStatus ? 'Active' : 'Inactive'}.`);
      setTimeout(() => setSuccessNotice(null), 4000);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update worker status.');
    }
  };

  const handleResendCredentials = async (worker: WorkerData) => {
    setResendingCredentialsId(worker.worker_id);
    try {
      const res = await resendWorkerCredentials(worker.worker_id);
      setSuccessNotice(`New login credentials successfully emailed to ${worker.email}.`);
      setTimeout(() => setSuccessNotice(null), 8000);
    } catch (err: any) {
      alert(err.message || 'Failed to resend login credentials.');
    } finally {
      setResendingCredentialsId(null);
    }
  };

  const isPaidCustomOrder = (o: CustomOrderData) => {
    const pStatus = (o.payment_status || '').toLowerCase().trim();
    const oStatus = (o.order_status || '').toLowerCase().trim();
    return pStatus === 'paid' || oStatus === 'paid' || oStatus === 'in production' || oStatus === 'completed';
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      o.furniture_type.toLowerCase().includes(query) ||
      o.customer_name.toLowerCase().includes(query) ||
      o.material.toLowerCase().includes(query) ||
      o.custom_order_id.toString().includes(query)
    );
  });

  const paidOrdersCount = orders.filter(isPaidCustomOrder).length;
  const inProductionCount = orders.filter(
    (o) =>
      isPaidCustomOrder(o) &&
      o.order_status !== 'Completed' &&
      (o.progress_percentage || 0) < 100
  ).length;
  const approvedCount = orders.filter((o) => (o.order_status === 'Approved' || o.order_status === 'Quote Provided') && !isPaidCustomOrder(o)).length;
  const pendingCount = orders.filter((o) => (o.order_status === 'Pending' || o.order_status === 'Pending Approval') && !isPaidCustomOrder(o)).length;
  const rejectedCount = orders.filter((o) => o.order_status === 'Rejected').length;
  const completedCount = orders.filter((o) => o.order_status === 'Completed' || (o.progress_percentage && o.progress_percentage >= 100)).length;

  React.useEffect(() => {
    if (pendingCount === 0 && approvedCount > 0 && approvalFilter === 'Pending') {
      setApprovalFilter('Approved');
    }
  }, [pendingCount, approvedCount, approvalFilter]);

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
                Production Staff
              </div>
            </div>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-2 text-xs overflow-y-auto pr-0.5 pb-10 scrollbar-thin scrollbar-thumb-[#DFD2C0] scrollbar-track-transparent">
          {/* Category 1: Workshop Control Center */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-0.5 font-mono truncate">
                  Workshop Control
                </div>
              )}
            </div>

            {[
              { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
              { id: 'assessment_queue', label: 'Assessment & Quotation', icon: FileText },
              { id: 'active_production', label: 'Active Production', icon: Clock },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id ||
                (item.id === 'assessment_queue' && (activeTab === 'approvals' || activeTab === 'quotations')) ||
                (item.id === 'active_production' && (activeTab === 'orders' || activeTab === 'assignments'));
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

          {/* Category 2: Artisan & Machinery Workforce */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-0.5 font-mono truncate">
                  Artisan & Machinery
                </div>
              )}
            </div>

            {[
              { id: 'workers', label: 'Workers Directory', icon: Users },
              { id: 'leave', label: 'Worker Leave Requests', icon: Clock },
              { id: 'machines', label: 'Machinery Manager', icon: Sliders },
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

          {/* Category 3: Material & Quality Management */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-0.5 font-mono truncate">
                  Material & Quality
                </div>
              )}
            </div>

            {[
              { id: 'materials', label: 'Materials & Stocks', icon: PackageCheck },
              { id: 'quality', label: 'Quality & Rework', icon: CheckCircle2 },
              { id: 'completed', label: 'Completed Jobs', icon: Check },
              { id: 'onsite', label: 'On-Site Jobs', icon: Sparkles },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'materials' && activeTab === 'raw_materials');
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

          {/* Category 4: Intelligence & Administration */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-0.5 font-mono truncate">
                  Intelligence & Admin
                </div>
              )}
            </div>

            {[
              { id: 'reports', label: 'Reports & Analytics', icon: FileText },
              { id: 'ai_insights', label: 'AI Production Suite', icon: Sparkles },
              { id: 'queries', label: 'Queries & Support', icon: MessageSquare },
              { id: 'coupons', label: 'Discounts & Coupons', icon: Tag },
              { id: 'admin_messages', label: 'Admin Directives', icon: Mail },
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
        </nav>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top Navigation */}
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E6E1DA] p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-[#2C241D]">Production Studio</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'orders' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'approvals' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Approvals
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'assignments' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'workers' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Workers
            </button>
            <button
              onClick={() => setActiveTab('machines')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'machines' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Machinery
            </button>
            <button
              onClick={() => setActiveTab('raw_materials')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'raw_materials' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Raw Materials
            </button>
            <button
              onClick={() => setActiveTab('quality')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'quality' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Quality & Rework
            </button>
            <button
              onClick={() => setActiveTab('ai_insights')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'ai_insights' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              AI Suite
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${activeTab === 'coupons' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Coupons
            </button>
            <button
              onClick={() => setActiveTab('admin_messages')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold relative ${activeTab === 'admin_messages' ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              <span>Directives</span>
              {unreadAdminMsgsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-amber-500 text-white">
                  {unreadAdminMsgsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <main className={`space-y-6 w-full transition-all duration-300 ${
          isSidebarCollapsed 
            ? 'p-3 sm:p-5 lg:p-6 max-w-none' 
            : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'
        }`}>
          <div className="ultra-glass-panel rounded-3xl p-4 sm:p-6 lg:p-7 space-y-6 relative border border-[#DECDB7] shadow-[0_12px_40px_rgba(58,40,24,0.04)] bg-[#FCF9F3]/95 backdrop-blur-2xl w-full">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-3xl" />

            {/* Success Notice */}
            {successNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-[#38A132]/15 border border-[#38A132]/40 text-[#38A132] flex items-start gap-3 shadow-md animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-[#38A132] flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">
                  {successNotice}
                </div>
                <button onClick={() => setSuccessNotice(null)} className="text-[#38A132] hover:text-[#2F8829] p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Unread Admin Directives Banner */}
            {unreadAdminMsgsCount > 0 && activeTab !== 'admin_messages' && (
              <div className="relative z-10 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border-2 border-amber-400 text-amber-900 flex items-center justify-between gap-3 shadow-md animate-fadeIn">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-600 animate-bounce flex-shrink-0" />
                  <div>
                    <span className="font-black text-xs block">
                      📢 You have {unreadAdminMsgsCount} unread Admin Directive{unreadAdminMsgsCount > 1 ? 's' : ''}!
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">
                      System Admin has dispatched official instructions to Production Staff.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('admin_messages')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs transition-all whitespace-nowrap cursor-pointer"
                >
                  View Directives →
                </button>
              </div>
            )}

            {/* Page Top Header */}
            <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                  {(activeTab === 'dashboard') && 'Production Dashboard Overview'}
                  {(activeTab === 'assessment_queue' || activeTab === 'approvals' || activeTab === 'quotations') && 'Assessment & Quotation Workspace'}
                  {(activeTab === 'active_production' || activeTab === 'orders' || activeTab === 'assignments') && 'Active Production & Stage Assignments'}
                  {activeTab === 'workers' && 'Artisan Technicians Directory'}
                  {(activeTab === 'materials' || activeTab === 'raw_materials') && 'Raw Materials & Customer Stock Log'}
                  {activeTab === 'quality' && 'Quality Control & Rework Inspection'}
                  {activeTab === 'completed' && 'Completed Production Jobs & Handover'}
                  {activeTab === 'onsite' && 'On-Site Technical Services & Jobs'}
                  {activeTab === 'reports' && 'Production Analytics & Performance Reports'}
                  {activeTab === 'machines' && 'Workshop Machinery Status'}
                  {activeTab === 'ai_insights' && 'AI Production Insights'}
                  {activeTab === 'queries' && 'Production Staff Queries & Admin Support'}
                  {activeTab === 'coupons' && 'Custom Furniture Coupons & Offers'}
                  {activeTab === 'admin_messages' && 'Admin Directives & Official Messages'}
                </h1>
                <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                  {activeTab === 'dashboard' && 'Real-time manufacturing metrics, shop floor priorities, and active build progress.'}
                  {(activeTab === 'assessment_queue' || activeTab === 'approvals' || activeTab === 'quotations') && 'Review Retail Staff-approved customer requests, evaluate technical feasibility, estimate manufacturing costs, and publish official customer quotations.'}
                  {(activeTab === 'active_production' || activeTab === 'orders' || activeTab === 'assignments') && 'Track stage-by-stage build progression and assign technicians based on required stage skills.'}
                  {activeTab === 'workers' && 'Manage workshop craftsmen, specializations, availability, and active build task loads.'}
                  {(activeTab === 'materials' || activeTab === 'raw_materials') && 'Manage raw timber, fabrics, finishes, and hardware inventory.'}
                  {activeTab === 'quality' && 'Inspect completed builds against specifications, approve for fulfillment, or assign rework jobs.'}
                  {activeTab === 'completed' && 'View completed custom furniture builds and initiate handover to Retail Staff fulfillment.'}
                  {activeTab === 'onsite' && 'Technical coordination and scheduling for on-site services.'}
                  {activeTab === 'reports' && 'Manufacturing metrics, pass rates, and worker utilization.'}
                  {activeTab === 'machines' && 'Monitor workshop machinery equipment status, maintenance, and allocation.'}
                  {activeTab === 'ai_insights' && 'AI-driven manufacturing recommendations, material estimation, and shop floor optimization.'}
                  {activeTab === 'queries' && 'Submit email change requests or system queries directly to system Admin.'}
                  {activeTab === 'coupons' && 'Manage promotional discount codes for bespoke furniture custom orders.'}
                  {activeTab === 'admin_messages' && 'Official executive announcements and directives from System Admin.'}
                </p>
              </div>

              {/* Top Right Controls */}
              <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">
                {/* Notification Bell */}
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
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-600 text-white font-extrabold text-[8px] rounded-full flex items-center justify-center animate-pulse">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-3 z-[100] animate-fadeIn space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                        <span className="font-extrabold text-xs text-[#2C241D]">System Notifications</span>
                        {unreadNotifCount > 0 && (
                          <button
                            onClick={async () => {
                              setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
                              await markAllNotificationsReadInDB();
                            }}
                            className="text-[10px] font-bold text-[#48A63E] hover:underline cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-64 overflow-y-auto text-xs">
                        {notifications.filter(n => n.unread).length === 0 ? (
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

                {/* Staff Name Dropdown Pill */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs"
                    title="Click for profile and sign out options"
                  >
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                      {(userProfile?.full_name || 'Production Lead').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-extrabold text-[#2C241D]">
                      {userProfile?.full_name || 'Production Lead'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                      <button
                        onClick={() => {
                          setIsProfileModalOpen(true);
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
                          handleLogout();
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

            {/* DASHBOARD OVERVIEW VIEW (activeTab === 'dashboard') */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 relative z-10">
                {/* 8 Real Database KPI Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    onClick={() => setActiveTab('assessment_queue')}
                    className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-xl hover:bg-white/85 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">Pending Assessment</span>
                      <FileText className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {overviewData?.metrics?.pending_assessment ?? 0}
                    </div>
                    <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block border border-amber-300">
                      Approved by Retail Staff →
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('quotations')}
                    className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-xl hover:bg-white/85 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">Quotation Pending</span>
                      <DollarSign className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {overviewData?.metrics?.quotation_pending ?? 0}
                    </div>
                    <span className="text-[11px] font-extrabold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full inline-block border border-blue-300">
                      Quote Generation Needed →
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('assessment_queue')}
                    className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-xl hover:bg-white/85 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Customer Approved</span>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {overviewData?.metrics?.customer_approved ?? 0}
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block border border-emerald-300">
                      Approved Quotations →
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('active_production')}
                    className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-xl hover:bg-white/85 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-800">In Production</span>
                      <Clock className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {overviewData?.metrics?.in_production ?? inProductionCount}
                    </div>
                    <span className="text-[11px] font-extrabold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full inline-block border border-indigo-300">
                      Stage Builds Active →
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('quality')}
                    className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-xl hover:bg-white/85 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-purple-800">QC Pending</span>
                      <ShieldCheck className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {overviewData?.metrics?.qc_pending ?? 0}
                    </div>
                    <span className="text-[11px] font-extrabold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full inline-block border border-purple-300">
                      Inspection Workspace →
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('quality')}
                    className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-xl hover:bg-white/85 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800">Active Rework</span>
                      <AlertTriangle className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {overviewData?.metrics?.rework ?? 0}
                    </div>
                    <span className="text-[11px] font-extrabold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full inline-block border border-rose-300">
                      Rework Jobs →
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('completed')}
                    className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-xl hover:bg-white/85 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800">Completed Today</span>
                      <PackageCheck className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {overviewData?.metrics?.completed_today ?? completedCount}
                    </div>
                    <span className="text-[11px] font-extrabold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full inline-block border border-teal-300">
                      Fulfillment Handover →
                    </span>
                  </div>

                  <div
                    onClick={() => setActiveTab('materials')}
                    className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-xl hover:bg-white/85 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">Material Pending</span>
                      <PackageCheck className="w-5 h-5 text-amber-700 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {overviewData?.metrics?.material_pending ?? 0}
                    </div>
                    <span className="text-[11px] font-extrabold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block border border-amber-300">
                      Log Raw Receipts →
                    </span>
                  </div>
                </div>

                {/* Today's Priorities & Active Summary Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Today's Priorities Card */}
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                      <h3 className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Today's Manufacturing Priorities</span>
                      </h3>
                      <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase bg-[#FAF7F2] px-2 py-0.5 rounded-md border">High Priority</span>
                    </div>

                    <div className="space-y-3">
                      {overviewData?.priorities && overviewData.priorities.length > 0 ? (
                        overviewData.priorities.map((item) => (
                          <div key={item.id} className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs text-[#2C241D]">{item.title}</span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${item.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#7A6C5E] font-medium leading-snug">{item.issue}</p>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-2">
                          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
                            <span className="font-extrabold text-amber-900 block">Assessment Required</span>
                            <span className="text-amber-800 text-[11px]">Retail Staff approved requests awaiting technical assessment.</span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs">
                            <span className="font-extrabold text-blue-900 block">Quotation Review</span>
                            <span className="text-blue-800 text-[11px]">Assessed jobs waiting for formal quotation dispatch.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Production Overview Table (2 Cols) */}
                  <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                      <div>
                        <h3 className="text-sm font-black text-[#2C241D]">Active Manufacturing Overview</h3>
                        <p className="text-[11px] text-[#7A6C5E] font-medium">Live production pipeline status.</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('active_production')}
                        className="text-xs font-extrabold text-[#48A63E] hover:underline"
                      >
                        View All Active →
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#E2D7CB] text-[10px] font-black uppercase text-[#7A6C5E]">
                            <th className="py-2.5 px-3">Order</th>
                            <th className="py-2.5 px-3">Client</th>
                            <th className="py-2.5 px-3">Item</th>
                            <th className="py-2.5 px-3">Stage</th>
                            <th className="py-2.5 px-3">Worker</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D7CB]/60">
                          {overviewData?.active_production && overviewData.active_production.length > 0 ? (
                            overviewData.active_production.map((act) => (
                              <tr key={act.order_id} className="hover:bg-[#FAF7F2] font-semibold text-[#2C241D]">
                                <td className="py-3 px-3 font-mono font-extrabold text-[#48A63E]">{act.order_id}</td>
                                <td className="py-3 px-3">{act.customer}</td>
                                <td className="py-3 px-3">{act.product}</td>
                                <td className="py-3 px-3">
                                  <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md border">
                                    {act.current_stage}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-[11px]">{act.worker || 'Unassigned'}</td>
                                <td className="py-3 px-3 text-right">
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                                    {act.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            orders.slice(0, 5).map((ord) => (
                              <tr key={ord.custom_order_id} className="hover:bg-[#FAF7F2] font-semibold text-[#2C241D]">
                                <td className="py-3 px-3 font-mono font-extrabold text-[#48A63E]">#CUS-{ord.custom_order_id}</td>
                                <td className="py-3 px-3">{ord.customer_name}</td>
                                <td className="py-3 px-3">{ord.furniture_type}</td>
                                <td className="py-3 px-3">
                                  <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md border">
                                    {ord.current_stage || 'Woodwork'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-[11px]">
                                  {ord.assigned_workers && ord.assigned_workers.length > 0 ? ord.assigned_workers.map(w => w.worker_name).join(', ') : 'Master Craftsman'}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                                    {ord.order_status}
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

                {/* ---------------------------------------------------- */}
                {/* FEATURE 1: FABRICATION DETAILS SECTION */}
                {/* ---------------------------------------------------- */}
                <div id="fabrication-details-section" className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-5">
                  {/* Section Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2D7CB] pb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/20">
                          <Layers className="w-5 h-5 text-amber-800" />
                        </div>
                        <h3 className="text-base font-black text-[#2C241D]">Fabrication Details</h3>
                        <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          {filteredFabJobs.length} {filteredFabJobs.length === 1 ? 'Job' : 'Jobs'}
                        </span>
                      </div>
                      <p className="text-xs text-[#7A6C5E] font-medium mt-1">
                        Production-ready fabrication jobs, material allocations, team assignments, and real-time build progress.
                      </p>
                    </div>

                    {/* Search & Filter controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search Input */}
                      <div className="relative min-w-[200px] flex-1 sm:flex-none">
                        <Search className="w-4 h-4 text-[#8C7C6D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search job, ID, material..."
                          value={fabSearchQuery}
                          onChange={(e) => setFabSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-[#E2D7CB] bg-white text-xs font-extrabold text-[#2C241D] placeholder:text-[#A09080] focus:outline-none focus:border-[#48A63E] focus:ring-1 focus:ring-[#48A63E]"
                        />
                        {fabSearchQuery && (
                          <button onClick={() => setFabSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7C6D] hover:text-[#2C241D]">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Status Filter Tabs */}
                      <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E2D7CB] text-[11px] font-extrabold flex-wrap sm:flex-nowrap">
                        {['All', 'Pending', 'In Progress', 'Quality Check', 'Completed'].map((st) => (
                          <button
                            key={st}
                            onClick={() => setFabStatusFilter(st)}
                            className={`px-2.5 py-1 rounded-lg transition-all ${
                              fabStatusFilter === st
                                ? 'bg-[#48A63E] text-white shadow-xs'
                                : 'text-[#6B5C4D] hover:text-[#2C241D] hover:bg-white/60'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Jobs Cards Grid */}
                  {filteredFabJobs.length === 0 ? (
                    <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E2D7CB] space-y-2">
                      <Layers className="w-8 h-8 text-[#A09080] mx-auto" />
                      <p className="font-extrabold text-sm text-[#2C241D]">No Fabrication Jobs Found</p>
                      <p className="text-xs text-[#7A6C5E]">No production-ready orders match the selected search query or status filter.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredFabJobs.map((job) => {
                        let statusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
                        if (job.status === 'In Progress') statusBadgeClass = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                        if (job.status === 'Quality Check') statusBadgeClass = 'bg-purple-100 text-purple-900 border-purple-300';
                        if (job.status === 'Completed') statusBadgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';

                        let priorityClass = 'bg-rose-100 text-rose-800 border-rose-300';
                        if (job.priority === 'Medium') priorityClass = 'bg-amber-100 text-amber-800 border-amber-300';
                        if (job.priority === 'Low') priorityClass = 'bg-blue-100 text-blue-800 border-blue-300';

                        return (
                          <div
                            key={job.fabrication_id}
                            onClick={() => setSelectedFabJobModal(job)}
                            className="group bg-white rounded-2xl p-4 border border-[#E2D7CB] shadow-xs hover:shadow-md hover:border-[#48A63E]/60 transition-all space-y-3 cursor-pointer flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              {/* Header Row */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-0.5 rounded-lg border border-[#48A63E]/20">
                                    {job.fabrication_id}
                                  </span>
                                  <span className="font-mono text-[11px] font-extrabold text-[#7A6C5E] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E2D7CB]">
                                    {job.order_id}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${priorityClass}`}>
                                  {job.priority} Priority
                                </span>
                              </div>

                              {/* Product Info Row with Thumbnail */}
                              <div className="flex items-start gap-3">
                                {job.product_thumbnail ? (
                                  <img
                                    src={job.product_thumbnail}
                                    alt={job.product_name}
                                    className="w-14 h-14 rounded-xl object-cover border border-[#E2D7CB] shrink-0 group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                    <Wrench className="w-6 h-6 text-amber-700" />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <h4 className="font-black text-sm text-[#2C241D] truncate leading-tight group-hover:text-[#48A63E] transition-colors">
                                    {job.product_name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] font-bold text-[#6B5C4D] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E2D7CB]">
                                      Qty: {job.quantity}
                                    </span>
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
                                      {job.status}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Details List */}
                              <div className="space-y-1.5 pt-2 border-t border-[#EFE7DE] text-xs">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-[11px] text-[#7A6C5E] font-bold shrink-0">Material Required:</span>
                                  <span className="text-[11px] text-[#2C241D] font-extrabold text-right truncate max-w-[180px]">
                                    {job.material_required}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-[#7A6C5E] font-bold shrink-0">Assigned Team:</span>
                                  <span className="text-[11px] text-[#2C241D] font-extrabold flex items-center gap-1">
                                    <Users className="w-3 h-3 text-[#48A63E]" />
                                    {job.assigned_team}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-[#7A6C5E] font-bold shrink-0">Expected Completion:</span>
                                  <span className="text-[11px] font-mono font-extrabold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    {job.expected_completion_date}
                                  </span>
                                </div>
                              </div>

                              {/* Material Pickup & Logistics Badge */}
                              {job.needs_pickup && (
                                <div className="pt-2 border-t border-[#EFE7DE]">
                                  {job.is_pickup_completed ? (
                                    <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] font-bold flex items-center justify-between">
                                      <span className="flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Material at Workshop</span>
                                      </span>
                                      <span className="text-[9px] font-mono text-emerald-700 font-extrabold">{job.pickup_carrier || 'Direct'}</span>
                                    </div>
                                  ) : job.pickup_carrier ? (
                                    <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-[10px] font-bold flex items-center justify-between">
                                      <span className="flex items-center gap-1">
                                        <Truck className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                                        <span>Pickup: {job.pickup_carrier}</span>
                                      </span>
                                      <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded">
                                        {job.pickup_status}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-950 text-[10px] font-bold flex items-center justify-between">
                                      <span className="flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Carrier Allotment Needed</span>
                                      </span>
                                      <span className="text-[9px] font-black uppercase text-rose-800 bg-rose-200 px-1.5 py-0.5 rounded">
                                        Pending
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Progress Bar Footer */}
                            <div className="pt-3 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-extrabold">
                                <span className="text-[#6B5C4D]">Completion Progress</span>
                                <span className="text-[#48A63E] font-mono">{job.progress_percentage}%</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-[#FAF7F2] border border-[#E2D7CB] overflow-hidden p-0.5">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#48A63E] to-[#38A132] transition-all duration-500"
                                  style={{ width: `${job.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ---------------------------------------------------- */}
                {/* FEATURE 2: APPROVED ON-SITE REQUESTS SECTION */}
                {/* ---------------------------------------------------- */}
                <div id="approved-onsite-requests-section" className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-5">
                  {/* Section Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2D7CB] pb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#48A63E]/10 text-[#48A63E] border border-[#48A63E]/20">
                          <Sparkles className="w-5 h-5 text-[#48A63E]" />
                        </div>
                        <h3 className="text-base font-black text-[#2C241D]">Approved On-Site Requests</h3>
                        <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Approved by Retail Staff ({filteredOnsiteRequests.length})
                        </span>
                      </div>
                      <p className="text-xs text-[#7A6C5E] font-medium mt-1">
                        Retail Staff-approved site installation & display requests ready for workshop fabrication, staging, and dispatch.
                      </p>
                    </div>

                    {/* Search & Status Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search Input */}
                      <div className="relative min-w-[200px] flex-1 sm:flex-none">
                        <Search className="w-4 h-4 text-[#8C7C6D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search store, ID, product..."
                          value={onsiteSearchQuery}
                          onChange={(e) => setOnsiteSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-[#E2D7CB] bg-white text-xs font-extrabold text-[#2C241D] placeholder:text-[#A09080] focus:outline-none focus:border-[#48A63E] focus:ring-1 focus:ring-[#48A63E]"
                        />
                        {onsiteSearchQuery && (
                          <button onClick={() => setOnsiteSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7C6D] hover:text-[#2C241D]">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E2D7CB] text-[11px] font-extrabold flex-wrap sm:flex-nowrap">
                        {['All', 'Approved & Ready', 'In Production', 'Ready for Dispatch'].map((st) => (
                          <button
                            key={st}
                            onClick={() => setOnsiteStatusFilter(st)}
                            className={`px-2.5 py-1 rounded-lg transition-all ${
                              onsiteStatusFilter === st
                                ? 'bg-[#48A63E] text-white shadow-xs'
                                : 'text-[#6B5C4D] hover:text-[#2C241D] hover:bg-white/60'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Onsite Cards Grid */}
                  {filteredOnsiteRequests.length === 0 ? (
                    <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E2D7CB] space-y-2">
                      <Sparkles className="w-8 h-8 text-[#A09080] mx-auto" />
                      <p className="font-extrabold text-sm text-[#2C241D]">No Approved On-Site Requests Found</p>
                      <p className="text-xs text-[#7A6C5E]">No retail staff approved site requests match your active query.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredOnsiteRequests.map((req) => {
                        let statusBadge = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                        if (req.production_status === 'In Production') statusBadge = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                        if (req.production_status === 'Ready for Dispatch') statusBadge = 'bg-teal-100 text-teal-900 border-teal-300';

                        let priorityClass = 'bg-rose-100 text-rose-800 border-rose-300';
                        if (req.priority === 'Medium') priorityClass = 'bg-amber-100 text-amber-800 border-amber-300';
                        if (req.priority === 'Low') priorityClass = 'bg-blue-100 text-blue-800 border-blue-300';

                        return (
                          <div
                            key={req.request_id}
                            className="bg-white rounded-2xl p-5 border border-[#E2D7CB] shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                          >
                            <div className="space-y-3">
                              {/* Header Info */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE7DE] pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-0.5 rounded-lg border border-[#48A63E]/20">
                                    {req.request_id}
                                  </span>
                                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${priorityClass}`}>
                                    {req.priority} Priority
                                  </span>
                                </div>
                                <span className={`text-[11px] font-black px-3 py-0.5 rounded-full border ${statusBadge}`}>
                                  {req.production_status}
                                </span>
                              </div>

                              {/* Store & Product Detail */}
                              <div className="space-y-1.5">
                                <h4 className="font-black text-sm text-[#2C241D] flex items-center gap-2">
                                  <span className="text-[#48A63E]">🏪</span>
                                  <span>{req.store_name}</span>
                                </h4>
                                <p className="text-xs text-[#6B5C4D] font-medium leading-relaxed pl-6">
                                  <span className="font-bold text-[#2C241D]">Product:</span> {req.product_name} ({req.requested_quantity})
                                </p>
                              </div>

                              {/* Meta Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs">
                                <div>
                                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Request Date</span>
                                  <span className="font-extrabold text-[#2C241D] text-[11px]">{req.request_date}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Required Install Date</span>
                                  <span className="font-extrabold text-amber-900 text-[11px] font-mono">{req.required_installation_date}</span>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Assigned Team</span>
                                  <span className="font-extrabold text-[#48A63E] text-[11px] truncate block">{req.assigned_production_team}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="pt-3 border-t border-[#EFE7DE] flex flex-wrap items-center justify-between gap-2">
                              <button
                                onClick={() => setSelectedOnsiteRequestModal(req)}
                                className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F3EDE5] text-[#2C241D] border border-[#E2D7CB] font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#48A63E]" />
                                <span>View Details</span>
                              </button>

                              <div className="flex items-center gap-2 flex-wrap">
                                {req.production_status !== 'In Production' && req.production_status !== 'Ready for Dispatch' && (
                                  <button
                                    onClick={() => handleMarkOnsiteInProduction(req.request_id)}
                                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Mark In Production</span>
                                  </button>
                                )}

                                {req.production_status !== 'Ready for Dispatch' && (
                                  <button
                                    onClick={() => handleMarkOnsiteReadyForDispatch(req.request_id)}
                                    className="px-3.5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Mark Ready for Dispatch</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KPI Stat Cards (Combined Custom Orders, Fabrications & On-Site Requests) */}
            {(activeTab === 'orders' || activeTab === 'active_production') && (() => {
              const activePaidCustom = orders.filter(isPaidCustomOrder).length;
              const activePaidFabs = fabricationJobs.filter(f => f.status === 'In Progress' || f.status === 'Quality Check' || f.status === 'Completed').length;
              const activePaidOnsites = approvedOnsiteRequests.length;
              const totalPaidActive = activePaidCustom + activePaidFabs + activePaidOnsites;

              const inProdCustom = inProductionCount;
              const inProdFabs = fabricationJobs.filter(f => f.status === 'In Progress' || f.status === 'Quality Check').length;
              const inProdOnsites = approvedOnsiteRequests.filter(r => r.production_status === 'In Production' || r.production_status === 'Approved & Ready').length;
              const totalInProd = inProdCustom + inProdFabs + inProdOnsites;

              const totalApproved = approvedCount + fabricationJobs.length + approvedOnsiteRequests.length;
              const totalCompleted = completedCount + fabricationJobs.filter(f => f.status === 'Completed').length + approvedOnsiteRequests.filter(r => r.production_status === 'Ready for Dispatch').length;

              return (
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-lg hover:bg-white/75">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Paid Active Works</span>
                      <DollarSign className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{totalPaidActive} Requests</div>
                    <div>
                      <span className="text-[11px] font-bold text-[#15803D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                        Custom • Fab • On-Site
                      </span>
                    </div>
                  </div>

                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-lg hover:bg-white/75">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">In Production</span>
                      <Layers className="w-4 h-4 text-[#2563EB]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{totalInProd} Builds</div>
                    <div>
                      <span className="text-[11px] font-bold text-[#1E40AF] bg-[#EBF5FF] px-2.5 py-0.5 rounded-full border border-[#DBEAFE] inline-block">
                        Active shop-floor execution
                      </span>
                    </div>
                  </div>

                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-lg hover:bg-white/75">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Approved Requests</span>
                      <CheckCircle2 className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{totalApproved} Total</div>
                    <div>
                      <span className="text-[11px] font-bold text-[#15803D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                        Staff approved & queued
                      </span>
                    </div>
                  </div>

                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2.5 transition-all hover:shadow-lg hover:bg-white/75">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Completed Builds</span>
                      <PackageCheck className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{totalCompleted} Works</div>
                    <div>
                      <span className="text-[11px] font-bold text-[#15803D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                        Ready for dispatch / QA
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB 1: Custom Orders, Fabrications & On-Site Active Production Management */}
            {(activeTab === 'orders' || activeTab === 'active_production' || activeTab === 'assignments') && (() => {
              const paidCustomOrders = filteredOrders.filter(isPaidCustomOrder);
              const hasAnyItems = (prodActiveCategoryFilter === 'all' && (paidCustomOrders.length > 0 || filteredFabJobs.length > 0 || filteredOnsiteRequests.length > 0)) ||
                (prodActiveCategoryFilter === 'custom' && paidCustomOrders.length > 0) ||
                (prodActiveCategoryFilter === 'fabrication' && filteredFabJobs.length > 0) ||
                (prodActiveCategoryFilter === 'onsite' && filteredOnsiteRequests.length > 0);

              return (
                <div className="space-y-5">
                  {/* Search & Filter Header Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search specs, item, or client..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-white/80 backdrop-blur-md border border-white/80 rounded-xl text-[#2C241D] font-semibold focus:outline-none focus:border-[#48A63E] shadow-xs"
                      />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className="text-xs font-bold text-[#7A6C5E]">Filter Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs font-bold text-[#2C241D] bg-white/80 backdrop-blur-md border border-white/80 rounded-xl py-2 px-3 focus:outline-none focus:border-[#48A63E] shadow-xs"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="In Production">In Production</option>
                        <option value="Completed">Completed</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {/* Production Category Filter Tabs */}
                  <div className="flex items-center gap-2 p-1.5 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] overflow-x-auto">
                    {[
                      { id: 'all', label: 'All Active Works', count: paidCustomOrders.length + filteredFabJobs.length + filteredOnsiteRequests.length },
                      { id: 'custom', label: 'Custom Furniture', count: paidCustomOrders.length },
                      { id: 'fabrication', label: 'Fabrication Works', count: filteredFabJobs.length },
                      { id: 'onsite', label: 'On-Site Field Jobs', count: filteredOnsiteRequests.length }
                    ].map((cat) => {
                      const isSelected = prodActiveCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setProdActiveCategoryFilter(cat.id as any)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                            isSelected
                              ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25'
                              : 'text-[#6B5C4D] hover:text-[#2C241D] hover:bg-white/60'
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-[#EFE7DE] text-[#7A6C5E]'
                          }`}>
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* PRODUCTION ITEMS LIST */}
                  {hasAnyItems ? (
                    <div className="space-y-6">
                      {/* 1. CUSTOM FURNITURE BUILDS */}
                      {(prodActiveCategoryFilter === 'all' || prodActiveCategoryFilter === 'custom') && paidCustomOrders.length > 0 && (
                        <div className="space-y-3">
                          {prodActiveCategoryFilter === 'all' && (
                            <div className="flex items-center justify-between text-xs font-black text-[#2C241D] border-b border-[#EFE7DE] pb-2">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#38A132]" />
                                Custom Furniture Builds ({paidCustomOrders.length})
                              </span>
                              <span className="text-[11px] text-[#7A6C5E] font-medium">Bespoke Workshop Orders</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-4">
                            {paidCustomOrders.map((ord) => (
                              <div
                                key={ord.custom_order_id}
                                className="ultra-glass-card rounded-3xl p-5 shadow-xl border border-white/80 bg-white/60 backdrop-blur-xl text-[#2C241D] space-y-4 hover:border-[#38A132]/50 hover:bg-white/70 transition-all"
                              >
                                {/* Top Badges & Price Header */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="text-xs font-mono font-extrabold text-[#38A132] px-3 py-1 rounded-full bg-[#38A132]/10 border border-[#38A132]/25">
                                      ORDER #{ord.custom_order_id}
                                    </span>

                                    {ord.payment_status === 'Paid' || ord.order_status === 'Paid' ? (
                                      <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Paid & Verified</span>
                                      </span>
                                    ) : (
                                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${ord.order_status === 'Pending' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                          ord.order_status === 'Approved' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                            ord.order_status === 'In Production' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                                              ord.order_status === 'Completed' ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                                                'bg-rose-50 text-rose-800 border border-rose-200'
                                        }`}>
                                        {ord.order_status}
                                      </span>
                                    )}
                                  </div>

                                  {ord.estimated_price && ord.estimated_price > 0 && (
                                    <div className="text-base font-black text-[#38A132] bg-[#38A132]/10 px-3.5 py-1 rounded-xl border border-[#38A132]/20">
                                      ₹{ord.estimated_price.toLocaleString('en-IN')}
                                    </div>
                                  )}
                                </div>

                                {/* Title & Specifications Grid */}
                                <div className="space-y-3">
                                  <h3 className="text-xl font-black text-[#2C241D] tracking-tight">
                                    {ord.furniture_type}
                                  </h3>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white/50 backdrop-blur-md p-3.5 rounded-2xl border border-white/70 text-xs shadow-inner">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-extrabold text-[#5C4E42] uppercase tracking-wider block">Client Name</span>
                                      <span className="font-extrabold text-[#2C241D] block truncate">👤 {ord.customer_name}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-extrabold text-[#5C4E42] uppercase tracking-wider block">Dimensions</span>
                                      <span className="font-extrabold text-[#2C241D] block truncate">📐 {ord.dimensions}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-extrabold text-[#5C4E42] uppercase tracking-wider block">Timber / Material</span>
                                      <span className="font-extrabold text-[#2C241D] block truncate">🪵 {ord.material}</span>
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-extrabold text-[#5C4E42] uppercase tracking-wider block">Color & Finish</span>
                                      <span className="font-extrabold text-[#38A132] block truncate">🎨 {renderColorSwatchBadge(ord.color)}</span>
                                    </div>
                                  </div>

                                  {/* Assigned Worker Banner */}
                                  <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs">
                                    <div className="flex items-center gap-2 flex-wrap flex-1">
                                      <Wrench className="w-4 h-4 text-[#38A132] flex-shrink-0" />
                                      <span className="font-extrabold text-[#5C4E42]">Assigned Artisan / Worker:</span>
                                      {ord.assigned_workers && ord.assigned_workers.length > 0 ? (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {ord.assigned_workers.map((w, idx) => (
                                            <span key={idx} className="font-extrabold text-[#2C241D] bg-white px-2.5 py-1 rounded-xl border border-[#E2D7CB] shadow-2xs flex items-center gap-1.5">
                                              <span>👷 {w.worker_name}</span>
                                              {w.specialization && <span className="text-[10px] text-[#7A6C5E]">({w.specialization})</span>}
                                              {w.worker_phone && <span className="text-[10px] text-[#38A132] font-mono">📞 {w.worker_phone}</span>}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-amber-800 italic bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                                            No Artisan Assigned Yet
                                          </span>
                                          <button
                                            onClick={() => handleOpenAssignWorkerModal('custom', ord.custom_order_id, ord.furniture_type)}
                                            className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                                          >
                                            <UserPlus className="w-3 h-3" />
                                            <span>+ Assign Worker</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons Toolbar */}
                                <div className="pt-2 border-t border-[#EFE7DE] flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end ml-auto">
                                    <button
                                      onClick={() => setSelectedOrderForDetails(ord)}
                                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                                      <span>View Specs</span>
                                    </button>

                                    <button
                                      onClick={() => handleOpenAssignWorkerModal('custom', ord.custom_order_id, ord.furniture_type, ord.assigned_workers?.[0]?.worker_id)}
                                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                      <span>{ord.assigned_workers && ord.assigned_workers.length > 0 ? 'Reassign Worker' : 'Assign Worker'}</span>
                                    </button>

                                    <button
                                      onClick={() => setSelectedOrderForProgress(ord)}
                                      className="px-3.5 py-2 rounded-xl bg-[#38A132]/10 hover:bg-[#38A132]/20 text-[#38A132] border border-[#38A132]/30 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      <span>Update Build Stage</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. FABRICATION WORKS */}
                      {(prodActiveCategoryFilter === 'all' || prodActiveCategoryFilter === 'fabrication') && filteredFabJobs.length > 0 && (
                        <div className="space-y-3">
                          {prodActiveCategoryFilter === 'all' && (
                            <div className="flex items-center justify-between text-xs font-black text-[#2C241D] border-b border-[#EFE7DE] pb-2 pt-2">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-600" />
                                Fabrication Works ({filteredFabJobs.length})
                              </span>
                              <span className="text-[11px] text-[#7A6C5E] font-medium">Precision CNC & Wood Works</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredFabJobs.map((job) => (
                              <div
                                key={job.fabrication_id}
                                className="ultra-glass-card rounded-3xl p-5 shadow-lg border border-[#E2D7CB] bg-white/75 backdrop-blur-xl text-[#2C241D] space-y-4 hover:border-amber-500/50 hover:bg-white/90 transition-all flex flex-col justify-between"
                              >
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2 border-b border-[#EFE7DE] pb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono font-extrabold text-amber-800 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300">
                                        {job.fabrication_id}
                                      </span>
                                      <span className="text-[11px] font-bold text-[#7A6C5E]">Ref: {job.order_id}</span>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                      job.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                      job.status === 'Quality Check' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                      job.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                      'bg-amber-100 text-amber-800 border-amber-300'
                                    }`}>
                                      {job.status}
                                    </span>
                                  </div>

                                  <div className="flex items-start gap-3.5">
                                    {job.product_thumbnail && (
                                      <img
                                        src={job.product_thumbnail}
                                        alt={job.product_name}
                                        className="w-16 h-16 rounded-2xl object-cover border border-[#E2D7CB] shrink-0 shadow-xs"
                                      />
                                    )}
                                    <div className="space-y-1 min-w-0 flex-1">
                                      <h4 className="text-sm font-black text-[#2C241D] truncate">{job.product_name}</h4>
                                      <p className="text-[11px] text-[#5C4E42] font-semibold truncate">🧱 {job.material_required}</p>
                                      <p className="text-[11px] text-[#7A6C5E] font-medium">📦 Qty: {job.quantity}</p>
                                    </div>
                                  </div>

                                  {/* Worker Info Card Section */}
                                  <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-extrabold text-[#5C4E42] flex items-center gap-1.5">
                                        <Wrench className="w-3.5 h-3.5 text-[#38A132]" />
                                        <span>Assigned Artisan:</span>
                                      </span>
                                    </div>
                                    {job.assigned_workers && job.assigned_workers.length > 0 ? (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {job.assigned_workers.map((w: any, idx: number) => (
                                          <div key={idx} className="font-extrabold text-[#2C241D] bg-white px-2.5 py-1 rounded-xl border border-[#E2D7CB] shadow-2xs flex items-center gap-1.5 flex-wrap">
                                            <span>👷 {w.worker_name}</span>
                                            {w.specialization && <span className="text-[10px] text-[#7A6C5E]">({w.specialization})</span>}
                                            {w.worker_phone && <span className="text-[10px] text-[#38A132] font-mono">📞 {w.worker_phone}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-2 bg-amber-50 p-2 rounded-xl border border-amber-200">
                                        <span className="font-bold text-amber-800 text-[11px] flex items-center gap-1">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                          No Artisan Assigned Yet
                                        </span>
                                        <button
                                          onClick={() => handleOpenAssignWorkerModal('fabrication', job.numeric_id, job.product_name, undefined, job.stages?.[0]?.stage_id)}
                                          className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                                        >
                                          <UserPlus className="w-3 h-3" />
                                          <span>+ Assign Worker</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Inbound Logistics Tag if Pickup Required */}
                                  {job.needs_pickup && (
                                    <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Truck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        <div className="min-w-0">
                                          <span className="text-[10px] text-[#7A6C5E] block font-bold">Inbound Material Carrier:</span>
                                          <strong className="text-xs text-[#2C241D] truncate block">
                                            {job.pickup_carrier || 'None Allotted Yet'}
                                          </strong>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleOpenAssignCarrierModal(job.numeric_id, job.product_name, job.pickup_carrier)}
                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold cursor-pointer shrink-0 ${
                                          job.pickup_carrier
                                            ? 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                        }`}
                                      >
                                        {job.pickup_carrier ? 'Change Carrier' : '+ Allot Carrier'}
                                      </button>
                                    </div>
                                  )}

                                  {/* Progress bar */}
                                  <div>
                                    <div className="flex justify-between text-[10px] font-extrabold text-[#7A6C5E] mb-1">
                                      <span>Build Progress</span>
                                      <span className="text-[#38A132]">{job.progress_percentage}%</span>
                                    </div>
                                    <div className="w-full bg-[#E2D7CB] rounded-full h-2 overflow-hidden">
                                      <div
                                        className="bg-[#38A132] h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${job.progress_percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-between text-xs flex-wrap gap-2">
                                  <span className="text-[10px] font-bold text-[#7A6C5E]">Target: {job.expected_completion_date}</span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenAssignWorkerModal('fabrication', job.numeric_id, job.product_name, job.assigned_workers?.[0]?.worker_id, job.stages?.[0]?.stage_id)}
                                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-extrabold text-xs cursor-pointer flex items-center gap-1"
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                      <span>{job.assigned_workers && job.assigned_workers.length > 0 ? 'Reassign' : 'Assign Artisan'}</span>
                                    </button>
                                    <button
                                      onClick={() => setSelectedFabJobModal(job)}
                                      className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-[#38A132]" />
                                      <span>Details</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. ON-SITE FIELD REQUESTS */}
                      {(prodActiveCategoryFilter === 'all' || prodActiveCategoryFilter === 'onsite') && filteredOnsiteRequests.length > 0 && (
                        <div className="space-y-3">
                          {prodActiveCategoryFilter === 'all' && (
                            <div className="flex items-center justify-between text-xs font-black text-[#2C241D] border-b border-[#EFE7DE] pb-2 pt-2">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                On-Site Field Jobs ({filteredOnsiteRequests.length})
                              </span>
                              <span className="text-[11px] text-[#7A6C5E] font-medium">Installation & Assembly Requests</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredOnsiteRequests.map((req) => (
                              <div
                                key={req.request_id}
                                className="ultra-glass-card rounded-3xl p-5 shadow-lg border border-[#E2D7CB] bg-white/75 backdrop-blur-xl text-[#2C241D] space-y-4 hover:border-blue-500/50 hover:bg-white/90 transition-all flex flex-col justify-between"
                              >
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2 border-b border-[#EFE7DE] pb-3">
                                    <span className="text-xs font-mono font-extrabold text-blue-800 px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-300">
                                      {req.request_id}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                      req.production_status === 'Ready for Dispatch' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                      req.production_status === 'In Production' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                      'bg-amber-100 text-amber-800 border-amber-300'
                                    }`}>
                                      {req.production_status}
                                    </span>
                                  </div>

                                  <div className="space-y-1">
                                    <h4 className="text-sm font-black text-[#2C241D]">{req.product_name}</h4>
                                    <p className="text-xs font-bold text-[#5C4E42]">📍 {req.store_name}</p>
                                    <p className="text-[11px] text-[#7A6C5E]">{req.store_location}</p>
                                    <div className="pt-1 flex items-center gap-2 text-[11px] text-[#7A6C5E] flex-wrap">
                                      <span className="font-bold text-[#2C241D]">Qty: {req.requested_quantity}</span>
                                      <span>•</span>
                                      <span className="font-medium text-[#5C4E42]">Client: <strong>{req.customer_name}</strong></span>
                                    </div>
                                  </div>

                                  {/* Worker Info Card Section */}
                                  <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs space-y-1.5">
                                    <span className="font-extrabold text-[#5C4E42] flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Assigned Field Artisan:</span>
                                    </span>
                                    {req.assigned_workers && req.assigned_workers.length > 0 ? (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {req.assigned_workers.map((w: any, idx: number) => (
                                          <div key={idx} className="font-extrabold text-[#2C241D] bg-white px-2.5 py-1 rounded-xl border border-[#E2D7CB] shadow-2xs flex items-center gap-1.5 flex-wrap">
                                            <span>👷 {w.worker_name}</span>
                                            {w.specialization && <span className="text-[10px] text-[#7A6C5E]">({w.specialization})</span>}
                                            {w.worker_phone && <span className="text-[10px] text-[#38A132] font-mono">📞 {w.worker_phone}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-2 bg-amber-50 p-2 rounded-xl border border-amber-200">
                                        <span className="font-bold text-amber-800 text-[11px] flex items-center gap-1">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                          No Field Artisan Assigned
                                        </span>
                                        <button
                                          onClick={() => handleOpenAssignWorkerModal('onsite', req.service_id, req.product_name)}
                                          className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer flex items-center gap-1"
                                        >
                                          <UserPlus className="w-3 h-3" />
                                          <span>+ Assign Worker</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleOpenAssignWorkerModal('onsite', req.service_id, req.product_name, req.assigned_workers?.[0]?.worker_id)}
                                      className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-extrabold text-xs cursor-pointer flex items-center gap-1"
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                      <span>{req.assigned_workers && req.assigned_workers.length > 0 ? 'Reassign' : 'Assign Field Artisan'}</span>
                                    </button>
                                    <button
                                      onClick={() => setSelectedOnsiteRequestModal(req)}
                                      className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-[#38A132]" />
                                      <span>Details</span>
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {req.production_status !== 'In Production' && req.production_status !== 'Ready for Dispatch' && (
                                      <button
                                        onClick={() => handleMarkOnsiteInProduction(req.request_id)}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
                                      >
                                        In Production
                                      </button>
                                    )}
                                    {req.production_status !== 'Ready for Dispatch' && (
                                      <button
                                        onClick={() => handleMarkOnsiteReadyForDispatch(req.request_id)}
                                        className="px-3 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-[11px] shadow-xs cursor-pointer"
                                      >
                                        Ready for Dispatch
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-[#E2D7CB] text-center space-y-3">
                      <Sliders className="w-10 h-10 text-[#A09080] mx-auto" />
                      <h4 className="font-extrabold text-base text-[#2C241D]">No Active Requests Found</h4>
                      <p className="text-xs text-[#7A6C5E]">No active works matched your selected category and search filters.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ASSESSMENT QUEUE VIEW (activeTab === 'assessment_queue' || activeTab === 'approvals') */}
            {(activeTab === 'assessment_queue' || activeTab === 'approvals') && (
              <div className="space-y-6 relative z-10">
                {(() => {
                  const allQueueItems = assessmentQueue.filter(item => {
                    const oType = (item.order_type as string);
                    return oType !== 'Readymade' && oType !== 'Retail Order' && !(item.request_id && item.request_id.startsWith('RET-'));
                  });

                  const customCount = allQueueItems.filter(i => i.order_type === 'Customization' || i.order_type === 'Custom' || i.request_id?.startsWith('CUS-')).length;
                  const fabCount = allQueueItems.filter(i => i.order_type === 'Fabrication' || i.request_id?.startsWith('FAB-')).length;
                  const srvCount = allQueueItems.filter(i => i.order_type === 'On-Site Service' || i.order_type === 'Service' || i.request_id?.startsWith('ONS-') || i.request_id?.startsWith('SRV-') || i.request_id?.startsWith('OSR-')).length;
                  const totalApprovedCount = allQueueItems.length;

                  const inCategoryItems = allQueueItems.filter(item => {
                    const oType = (item.order_type as string);
                    if (assessmentCategoryFilter === 'CUSTOMIZATION' && oType !== 'Customization' && oType !== 'Custom' && !item.request_id?.startsWith('CUS-')) return false;
                    if (assessmentCategoryFilter === 'FABRICATION' && oType !== 'Fabrication' && !item.request_id?.startsWith('FAB-')) return false;
                    if (assessmentCategoryFilter === 'SERVICES' && oType !== 'On-Site Service' && oType !== 'Service' && !item.request_id?.startsWith('ONS-') && !item.request_id?.startsWith('SRV-') && !item.request_id?.startsWith('OSR-')) return false;
                    return true;
                  });

                  const pendingCount = inCategoryItems.filter(i => !i.is_assessed && i.assessment_status !== 'ASSESSMENT_COMPLETE').length;
                  const assessedCount = inCategoryItems.filter(i => i.is_assessed || i.assessment_status === 'ASSESSMENT_COMPLETE').length;

                  const displayedQueue = inCategoryItems.filter(item => {
                    if (assessmentTabFilter === 'PENDING_ASSESSMENT' && (item.is_assessed || item.assessment_status === 'ASSESSMENT_COMPLETE')) return false;
                    if (assessmentTabFilter === 'ASSESSMENT_COMPLETE' && !item.is_assessed && item.assessment_status !== 'ASSESSMENT_COMPLETE') return false;
                    return true;
                  });

                  return (
                    <>
                      {/* Structured Filter Control Panel */}
                      <div className="bg-[#FAF7F2] border border-[#E2D7CB] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
                        {/* Row 1: Category Filter */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Sliders className="w-4 h-4 text-[#38A132]" />
                            <span className="text-xs font-black uppercase tracking-wider text-[#7A6C5E]">Category Filter:</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {[
                              { key: 'ALL', label: 'All Approved Requests', count: totalApprovedCount },
                              { key: 'CUSTOMIZATION', label: 'Furniture Customization', count: customCount },
                              { key: 'FABRICATION', label: 'Wood Fabrication', count: fabCount },
                              { key: 'SERVICES', label: 'On-Site Skilled Services', count: srvCount }
                            ].map(cat => (
                              <button
                                key={cat.key}
                                onClick={() => {
                                  setAssessmentCategoryFilter(cat.key);
                                }}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                                  assessmentCategoryFilter === cat.key
                                    ? 'bg-[#38A132] text-white shadow-sm ring-2 ring-[#38A132]/30'
                                    : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                                }`}
                              >
                                <span>{cat.label}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                  assessmentCategoryFilter === cat.key
                                    ? 'bg-white/25 text-white'
                                    : 'bg-[#FAF7F2] text-[#7A6C5E] border border-[#E2D7CB]'
                                }`}>
                                  {cat.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-[#EFE7DE]" />

                        {/* Row 2: Status Filter */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Filter className="w-4 h-4 text-[#2C241D]" />
                            <span className="text-xs font-black uppercase tracking-wider text-[#7A6C5E]">Status Filter:</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {[
                              { key: 'ALL', label: 'All Requests', count: inCategoryItems.length },
                              { key: 'PENDING_ASSESSMENT', label: 'Pending Assessment', count: pendingCount },
                              { key: 'ASSESSMENT_COMPLETE', label: 'Assessed & Quotation Ready', count: assessedCount }
                            ].map(st => (
                              <button
                                key={st.key}
                                onClick={() => {
                                  setAssessmentTabFilter(st.key);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                                  assessmentTabFilter === st.key
                                    ? 'bg-[#2C241D] text-white shadow-sm ring-2 ring-[#2C241D]/20'
                                    : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                                }`}
                              >
                                <span>{st.label}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                                  assessmentTabFilter === st.key
                                    ? 'bg-white/20 text-white'
                                    : 'bg-[#FAF7F2] text-[#7A6C5E] border border-[#E2D7CB]'
                                }`}>
                                  {st.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Queue Cards Grid */}
                      {displayedQueue.length === 0 ? (
                        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border-2 border-dashed border-[#E2D7CB] space-y-4 shadow-sm">
                          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs border border-amber-200">
                            <FileText className="w-8 h-8" />
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-[#2C241D]">No Requests Found Matching Filter</h3>
                            <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium mt-1">
                              No retail-approved customer requests match the active category and status filters.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {displayedQueue.map(item => {
                            const isService = item.order_type === 'On-Site Service' || item.order_type === 'Service' || item.request_id?.startsWith('ONS-') || item.request_id?.startsWith('SRV-') || item.request_id?.startsWith('OSR-');
                            return (
                              <div key={item.request_id} className="bg-white border-2 border-[#E2D7CB] hover:border-[#38A132] rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                                    <span className="font-mono text-[11px] font-extrabold text-[#38A132] bg-[#38A132]/10 px-2.5 py-1 rounded-md border border-[#38A132]/20">
                                      {item.request_id}
                                    </span>
                                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                                      item.is_assessed || item.assessment_status === 'ASSESSMENT_COMPLETE'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                        : item.order_status === 'APPROVED_BY_RETAIL'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : item.priority === 'HIGH' || item.priority === 'URGENT'
                                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}>
                                      {item.is_assessed || item.assessment_status === 'ASSESSMENT_COMPLETE'
                                        ? 'QUOTATION READY'
                                        : item.order_status === 'APPROVED_BY_RETAIL'
                                          ? 'UNDER EXAMINATION'
                                          : `${item.priority} PRIORITY`}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-sm font-extrabold text-[#2C241D] line-clamp-1">{item.title}</h4>
                                    <p className="text-xs text-[#7A6C5E] font-semibold mt-0.5 truncate">
                                      Customer: {item.customer_name} {item.customer_email ? `(${item.customer_email})` : ''}
                                    </p>
                                  </div>

                                  {isService ? (
                                    <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] text-xs space-y-2 font-medium">
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="text-[#7A6C5E] flex items-center gap-1.5 flex-shrink-0">
                                          <MapPin className="w-3.5 h-3.5 text-[#38A132]" /> Location:
                                        </span>
                                        <span className="font-bold text-[#2C241D] text-right truncate max-w-[170px]">{item.dimensions}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-[#7A6C5E] flex items-center gap-1.5 flex-shrink-0">
                                          <Building className="w-3.5 h-3.5 text-[#7A6C5E]" /> City / Pincode:
                                        </span>
                                        <span className="font-bold text-[#2C241D]">{item.material}</span>
                                      </div>
                                      {item.description && (
                                        <div className="pt-2 border-t border-[#EFE7DE] text-[11px] text-[#5C4E42] line-clamp-2 italic">
                                          "{item.description}"
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] text-xs space-y-1.5 font-medium">
                                      <div className="flex justify-between">
                                        <span className="text-[#7A6C5E]">Dimensions:</span>
                                        <span className="font-bold text-[#2C241D]">{item.dimensions}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-[#7A6C5E]">Material:</span>
                                        <span className="font-bold text-[#2C241D]">{item.material}</span>
                                      </div>
                                      {item.color && (
                                        <div className="flex justify-between">
                                          <span className="text-[#7A6C5E]">Color/Finish:</span>
                                          <span className="font-bold text-[#38A132]">{item.color}</span>
                                        </div>
                                      )}
                                      {item.quantity && item.quantity > 1 && (
                                        <div className="flex justify-between">
                                          <span className="text-[#7A6C5E]">Quantity:</span>
                                          <span className="font-bold text-[#2C241D]">{item.quantity} units</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="pt-3 border-t border-[#E2D7CB] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <span className="text-[10px] text-[#9E9082] font-semibold">
                                    Submitted: {item.order_date ? new Date(item.order_date).toLocaleDateString() : 'Recent'}
                                  </span>
                                  {(() => {
                                    const isQuoteReady = Boolean(
                                      item.is_assessed ||
                                      item.assessment_status === 'ASSESSMENT_COMPLETE' ||
                                      item.order_status === 'Quote Provided' ||
                                      item.order_status === 'QUOTATION_READY' ||
                                      item.order_status === 'QUOTED'
                                    );
                                    const isApprovedOrPaid = Boolean(
                                      item.order_status === 'CUSTOMER_APPROVED' ||
                                      item.order_status === 'Approved' ||
                                      item.order_status === 'PAID' ||
                                      item.order_status === 'Paid' ||
                                      item.payment_status === 'Paid'
                                    );

                                    if (isApprovedOrPaid) {
                                      return (
                                        <button
                                          onClick={() => handleOpenAssessment(item)}
                                          className="px-3.5 py-2 rounded-xl bg-[#2D6338] hover:bg-[#23502C] text-white text-xs font-extrabold transition-all shadow-md shadow-[#2D6338]/20 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0"
                                          title="Quotation has been approved by customer"
                                        >
                                          <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                                          <span>Customer Approved ✓</span>
                                          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                                        </button>
                                      );
                                    }

                                    if (isQuoteReady) {
                                      return (
                                        <button
                                          onClick={() => handleOpenAssessment(item)}
                                          className="px-3.5 py-2 rounded-xl bg-[#2C241D] hover:bg-[#1A1410] text-white text-xs font-extrabold transition-all shadow-md shadow-[#2C241D]/20 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0"
                                          title="Quotation is prepared. Click to view or revise quotation details."
                                        >
                                          <Edit3 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                          <span>Edit / Revise Quote</span>
                                          <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                                        </button>
                                      );
                                    }

                                    return (
                                      <button
                                        onClick={() => handleOpenAssessment(item)}
                                        className="px-3.5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2E8729] text-white text-xs font-extrabold transition-all shadow-md shadow-[#38A132]/20 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0"
                                      >
                                        <DollarSign className="w-4 h-4 flex-shrink-0" />
                                        <span>Assess & Prepare Quote</span>
                                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                                      </button>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* ON-SITE JOBS VIEW (activeTab === 'onsite') */}
            {activeTab === 'onsite' && (
              <div className="space-y-6 relative z-10">
                {onsiteJobsList.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border-2 border-dashed border-[#E2D7CB] space-y-4 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm border border-amber-200">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-[#2C241D]">No On-Site Service Jobs Scheduled</h3>
                      <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium mt-1">
                        Technical service requests for on-site measurement, timber fitting, or repair will appear here for technician dispatch.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {onsiteJobsList.map((job) => (
                      <div key={job.service_id} className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                          <span className="font-mono text-xs font-bold text-[#48A63E]">SRV-#{job.service_id}</span>
                          <span className={`${getStatusBadgeColor(job.status)} text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border`}>
                            {formatStatusLabel(job.status)}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-[#2C241D]">{job.service_category}</h4>
                        <p className="text-xs text-[#7A6C5E]">Client: {job.customer_name} ({job.city})</p>
                        <p className="text-[11px] text-[#5C4E42] bg-[#FAF7F2] p-2.5 rounded-xl border">📍 {job.address}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REPORTS & ANALYTICS VIEW (activeTab === 'reports') */}
            {activeTab === 'reports' && (
              <div className="space-y-6 relative z-10">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Total Customizations</span>
                      <Sliders className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-black text-[#2C241D]">{reportsData?.summary?.total_customizations ?? orders.length} Orders</div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                      Live Logged Orders
                    </span>
                  </div>

                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Total Fabrications</span>
                      <Layers className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-[#2C241D]">{reportsData?.summary?.total_fabrications ?? 14} Builds</div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 inline-block">
                      Bespoke Joinery Works
                    </span>
                  </div>

                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">QC Pass Rate</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-emerald-600">{reportsData?.summary?.pass_rate ?? 98.5}%</div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                      First-Time Pass Quality
                    </span>
                  </div>

                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Avg Production Duration</span>
                      <Clock className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-black text-purple-600">{reportsData?.summary?.avg_production_days ?? 3.2} Days</div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 inline-block">
                      Order Receipt to Dispatch
                    </span>
                  </div>
                </div>

                {/* Main Analytics Container */}
                <div className="ultra-glass-card rounded-3xl p-6 space-y-6 border border-[#E2D7CB] shadow-xl bg-white/70 backdrop-blur-xl">
                  {/* Department Load & Workstation Efficiency Table */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-[#48A63E]" />
                          <span>Department Production Capacity & Workstation Bottleneck Analysis</span>
                        </h4>
                        <p className="text-[11px] text-[#7A6C5E] font-medium">Real-time artisan allocation, active build load, and stage completion velocity.</p>
                      </div>
                      <span className="text-xs font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-3 py-1 rounded-lg border border-[#48A63E]/20">
                        Active Workshop Shift
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-4">Manufacturing Department</th>
                            <th className="py-3 px-4">Active Builds</th>
                            <th className="py-3 px-4">Assigned Craftsmen</th>
                            <th className="py-3 px-4">Avg Processing Time</th>
                            <th className="py-3 px-4">Workstation Efficiency</th>
                            <th className="py-3 px-4">Bottleneck Risk</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                          <tr className="hover:bg-[#F5ECE1]/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                              <span>🪵</span>
                              <span>Woodwork & Carpentry</span>
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-[#48A63E]">
                              {orders.filter(o => o.order_status === 'In Production').length || 3} Builds
                            </td>
                            <td className="py-3.5 px-4">
                              {workers.filter(w => (w.specialization || '').includes('Wood') || (w.specialization || '').includes('Carpen')).length || 2} Craftsmen
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">1.2 Days</td>
                            <td className="py-3.5 px-4">
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                96.4% Optimal
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                Low Risk
                              </span>
                            </td>
                          </tr>

                          <tr className="hover:bg-[#F5ECE1]/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                              <span>🪡</span>
                              <span>Upholstery & Cushioning</span>
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-[#48A63E]">2 Builds</td>
                            <td className="py-3.5 px-4">
                              {workers.filter(w => (w.specialization || '').includes('Upholster')).length || 1} Craftsmen
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">1.5 Days</td>
                            <td className="py-3.5 px-4">
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                94.2% Optimal
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                Moderate Capacity
                              </span>
                            </td>
                          </tr>

                          <tr className="hover:bg-[#F5ECE1]/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                              <span>🔧</span>
                              <span>Final Assembly & Fitting</span>
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-[#48A63E]">2 Builds</td>
                            <td className="py-3.5 px-4">
                              {workers.filter(w => (w.specialization || '').includes('Assembl') || (w.specialization || '').includes('Finish')).length || 2} Craftsmen
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">0.7 Days</td>
                            <td className="py-3.5 px-4">
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                98.8% Optimal
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                Low Risk
                              </span>
                            </td>
                          </tr>

                          <tr className="hover:bg-[#F5ECE1]/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold flex items-center gap-2">
                              <span>🛡️</span>
                              <span>Quality Control & Surface Inspection</span>
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-[#48A63E]">
                              {orders.filter(o => o.order_status === 'QC_PENDING').length || 1} Builds
                            </td>
                            <td className="py-3.5 px-4">Quality Inspector</td>
                            <td className="py-3.5 px-4 font-mono text-[#7A6C5E]">0.3 Days</td>
                            <td className="py-3.5 px-4">
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                99.5% Pass Rate
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Clear
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Production Metrics & Material Efficiency Bar Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#EFE7DE]">
                    <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] space-y-3">
                      <h5 className="font-extrabold text-xs text-[#2C241D] uppercase tracking-wider flex items-center justify-between">
                        <span>Seasoned Timber Utilization Efficiency</span>
                        <span className="text-[#48A63E] font-black">94.8%</span>
                      </h5>
                      <div className="w-full bg-[#E2D7CB] rounded-full h-2.5 overflow-hidden">
                        <div className="bg-[#48A63E] h-2.5 rounded-full" style={{ width: '94.8%' }} />
                      </div>
                      <p className="text-[11px] text-[#7A6C5E] font-medium">Timber cutting scrap loss maintained under 5.2% target across Teak & Rosewood logs.</p>
                    </div>

                    <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] space-y-3">
                      <h5 className="font-extrabold text-xs text-[#2C241D] uppercase tracking-wider flex items-center justify-between">
                        <span>On-Time Delivery & Handover Rate</span>
                        <span className="text-blue-600 font-black">98.2%</span>
                      </h5>
                      <div className="w-full bg-[#E2D7CB] rounded-full h-2.5 overflow-hidden">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '98.2%' }} />
                      </div>
                      <p className="text-[11px] text-[#7A6C5E] font-medium">98.2% of custom furniture builds delivered to Retail Fulfillment within promised schedule.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* WORKER LEAVE REQUESTS & ABSENCE ROSTER VIEW (activeTab === 'leave') */}
            {activeTab === 'leave' && (
              <div className="space-y-6 relative z-10">
                {/* Leave Overview Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Pending Approvals</span>
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-amber-700">
                      {leaveRequests.filter(l => l.status === 'Pending').length} Applications
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block">
                      Requires Production Review
                    </span>
                  </div>

                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Approved Leave Roster</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-emerald-800">
                      {leaveRequests.filter(l => l.status === 'Approved').length} Artisans
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                      Schedule Substituted
                    </span>
                  </div>

                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Total Requests Logged</span>
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-[#2C241D]">{leaveRequests.length} Total</div>
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 inline-block">
                      Synchronized with Worker Portal
                    </span>
                  </div>
                </div>

                {/* Main Leave Applications Table */}
                <div className="ultra-glass-card rounded-3xl p-6 shadow-xl border border-[#E2D7CB] bg-white/80 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#38A132]" />
                        <span>Artisan Leave Requests & Absence Review</span>
                      </h3>
                      <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
                        Approve or reject leave applications submitted by workshop craftsmen. Status is instantly reflected across Worker and Admin portals.
                      </p>
                    </div>
                  </div>

                  {leaveRequests.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#7A6C5E] font-medium border-2 border-dashed border-[#E2D7CB] rounded-2xl">
                      No artisan leave requests currently submitted.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE7DE] text-[10px] font-black text-[#7A6C5E] uppercase tracking-wider bg-[#FAF7F2]">
                            <th className="py-3 px-4 rounded-l-xl">Artisan Worker</th>
                            <th className="py-3 px-4">Leave Type</th>
                            <th className="py-3 px-4">Duration & Dates</th>
                            <th className="py-3 px-4">Reason</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 rounded-r-xl text-right">Actions / Review</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE]">
                          {leaveRequests.map((req) => (
                            <tr key={req.leave_id} className="hover:bg-[#F5ECE1]/40 transition-colors">
                              <td className="py-3.5 px-4 font-black text-[#2C241D] whitespace-nowrap">
                                👷 {req.worker_name || `Worker #${req.worker_id}`}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-[#4A3E32]">
                                {req.leave_type}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="font-extrabold text-[#2C241D] block">{req.duration_days} Day{req.duration_days > 1 ? 's' : ''}</span>
                                <span className="text-[10px] text-[#7A6C5E] font-mono">{req.start_date} to {req.end_date}</span>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-[#4A3E32] max-w-xs">
                                {req.reason}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  req.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                  'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                {req.status === 'Pending' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleReviewLeave(req.leave_id, 'Approved', 'Approved by Production Staff')}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold text-[11px] transition-all shadow-xs cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReviewLeave(req.leave_id, 'Rejected', 'Rejected by Production Staff due to tight build schedule')}
                                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-extrabold text-[11px] transition-all shadow-xs cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-[#7A6C5E] font-medium italic">
                                    Reviewed by {req.reviewed_by || 'Staff'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RAW MATERIALS & CUSTOMER STOCK LOG VIEW (activeTab === 'materials' || activeTab === 'raw_materials') */}
            {(activeTab === 'materials' || activeTab === 'raw_materials') && (
              <div className="space-y-6 relative z-10">
                {/* Inventory Overview Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Teak & Hardwood Stock</span>
                      <PackageCheck className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="text-2xl font-black text-[#2C241D]">1,450 CFT</div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                      Grade-A Seasoned Timber
                    </span>
                  </div>

                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Upholstery Fabrics</span>
                      <Layers className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-[#2C241D]">820 Meters</div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 inline-block">
                      Velvet, Jacquard & Leatherette
                    </span>
                  </div>

                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Finishes & Adhesives</span>
                      <CheckCircle2 className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-black text-[#2C241D]">
                      340 Liters
                    </div>
                    <span className="text-[10px] font-bold text-[#15803D] bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                      Polish, Primer & Lacquer
                    </span>
                  </div>

                  <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Hardware & Fittings</span>
                      <Wrench className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-black text-[#2C241D]">420 Units</div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 inline-block">
                      Hinges, Slides & Handles
                    </span>
                  </div>
                </div>

                {/* Raw Manufacturing Materials Stock Grid */}
                <RawMaterialsTab />
              </div>
            )}

            {/* QUALITY CONTROL & REWORK VIEW (activeTab === 'quality') */}
            {activeTab === 'quality' && (
              <div className="space-y-6 relative z-10">
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border-2 border-dashed border-[#E2D7CB] space-y-4 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-sm border border-purple-200">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#2C241D]">No Custom Builds Pending Quality Inspection</h3>
                    <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium mt-1">
                      Furniture builds completing final assembly stages will appear here for quality inspection checklist (dimensions, joinery, finish, stability) and pass/rework routing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* COMPLETED JOBS VIEW (activeTab === 'completed') */}
            {activeTab === 'completed' && (
              <div className="space-y-6 relative z-10">
                {orders.filter(o => o.order_status === 'Completed' || (o.assigned_workers && o.assigned_workers.length > 0 && o.assigned_workers.every(w => w.task_status && w.task_status.includes('Completed')))).length > 0 ? (
                  <div className="space-y-4">
                    {orders
                      .filter(o => o.order_status === 'Completed' || (o.assigned_workers && o.assigned_workers.length > 0 && o.assigned_workers.every(w => w.task_status && w.task_status.includes('Completed'))))
                      .map((ord) => (
                        <div
                          key={ord.custom_order_id}
                          className="ultra-glass-card rounded-3xl p-5 shadow-xl border border-emerald-300/80 bg-emerald-50/40 backdrop-blur-xl text-[#2C241D] space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-200 pb-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-xs font-mono font-extrabold text-[#38A132] px-3 py-1 rounded-full bg-[#38A132]/10 border border-[#38A132]/25">
                                ORDER #{ord.custom_order_id}
                              </span>
                              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Worker Production Completed</span>
                              </span>
                            </div>
                            {ord.estimated_price && ord.estimated_price > 0 && (
                              <div className="text-base font-black text-[#38A132] bg-white px-3.5 py-1 rounded-xl border border-[#38A132]/20">
                                ₹{ord.estimated_price.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <h3 className="text-xl font-black text-[#2C241D] tracking-tight flex items-center gap-2">
                              <span>{ord.furniture_type}</span>
                              <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                                Ready for Retail Fulfillment Handover
                              </span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white/70 p-3.5 rounded-2xl border border-emerald-200 text-xs shadow-inner">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-extrabold text-[#5C4E42] uppercase tracking-wider block">Client</span>
                                <span className="font-extrabold text-[#2C241D] block truncate">👤 {ord.customer_name}</span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-extrabold text-[#5C4E42] uppercase tracking-wider block">Dimensions</span>
                                <span className="font-extrabold text-[#2C241D] block truncate">📐 {ord.dimensions}</span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-extrabold text-[#5C4E42] uppercase tracking-wider block">Material</span>
                                <span className="font-extrabold text-[#2C241D] block truncate">🪵 {ord.material}</span>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-extrabold text-[#5C4E42] uppercase tracking-wider block">Color & Finish</span>
                                <span className="font-extrabold text-[#38A132] block truncate">🎨 {renderColorSwatchBadge(ord.color)}</span>
                              </div>
                            </div>

                            {/* Completed Artisans Roster */}
                            {ord.assigned_workers && ord.assigned_workers.length > 0 && (
                              <div className="bg-white p-3 rounded-2xl border border-emerald-200 text-xs space-y-1">
                                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                                  Completed Artisans & Department Stages:
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {ord.assigned_workers.map((w, idx) => (
                                    <span key={idx} className="font-extrabold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-300 text-xs flex items-center gap-1.5">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>👷 {w.worker_name} ({w.specialization || w.task_status})</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border-2 border-dashed border-[#E2D7CB] space-y-4 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-sm border border-teal-200">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-[#2C241D]">No Completed Production Jobs Yet</h3>
                      <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium mt-1">
                        Furniture orders that complete all manufacturing stages and pass quality assurance will be listed here for formal handover to Retail Staff fulfillment.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QUERIES & SUPPORT VIEW (activeTab === 'queries') */}
            {activeTab === 'queries' && (
              <div className="space-y-6 relative z-10">
                <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 text-center border-2 border-dashed border-[#E2D7CB] space-y-4 shadow-sm">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm border border-blue-200">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#2C241D]">No Technical Support Queries Pending</h3>
                    <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium mt-1">
                      Technical design inquiries, material availability questions, and production updates submitted by retail staff or clients will appear here.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* TAB: CUSTOMIZATION APPROVALS (activeTab === 'approvals') */}
            {activeTab === 'approvals' && (
              <div className="space-y-6">
                {/* Quotes & Approvals Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Pending Review</span>
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{pendingCount} Requests</div>
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 inline-block">
                        Awaiting review & quote
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Approved Quotes</span>
                      <CheckCircle2 className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{approvedCount} Orders</div>
                    <div>
                      <span className="text-[11px] font-bold text-[#15803D] bg-[#E6F4EA] px-2.5 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                        Quoted, awaiting customer payment
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/90 rounded-2xl p-5 shadow-xs border border-[#E5DEC9] space-y-2 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between text-[#8C8275]">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#8C8275]">Rejected Requests</span>
                      <XCircle className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D]">{rejectedCount} Requests</div>
                    <div>
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 inline-block">
                        Declined requests
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-[#7A6C5E]">Filter Status:</span>
                    {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setApprovalFilter(st as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${approvalFilter === st
                          ? 'bg-[#48A63E] text-white shadow-xs'
                          : 'bg-white border border-[#E2D7CB] text-[#6B5C4D] hover:bg-[#F5ECE1]'
                          }`}
                      >
                        {st === 'Pending' ? `Pending Review (${pendingCount})` : st === 'Approved' ? `Approved (${approvedCount})` : st}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search order ID, client, material..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {orders
                    .filter(o => !isPaidCustomOrder(o))
                    .filter((o) => {
                      if (approvalFilter === 'All') return true;
                      if (approvalFilter === 'Pending') return o.order_status === 'Pending' || o.order_status === 'Pending Approval';
                      if (approvalFilter === 'Approved') return o.order_status === 'Approved' || o.order_status === 'Quote Provided';
                      return o.order_status === approvalFilter;
                    })
                    .filter((o) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        o.furniture_type.toLowerCase().includes(q) ||
                        o.customer_name.toLowerCase().includes(q) ||
                        o.material.toLowerCase().includes(q) ||
                        o.custom_order_id.toString().includes(q)
                      );
                    })
                    .length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-[#E2D7CB] text-center space-y-3">
                      <CheckCircle2 className="w-10 h-10 text-[#48A63E] mx-auto" />
                      <h4 className="font-extrabold text-base text-[#2C241D]">No Customizations Found</h4>
                      <p className="text-xs text-[#7A6C5E]">All pending custom quotes have been reviewed and approved!</p>
                    </div>
                  ) : (
                    orders
                      .filter(o => !isPaidCustomOrder(o))
                      .filter((o) => {
                        if (approvalFilter === 'All') return true;
                        if (approvalFilter === 'Pending') return o.order_status === 'Pending' || o.order_status === 'Pending Approval';
                        if (approvalFilter === 'Approved') return o.order_status === 'Approved' || o.order_status === 'Quote Provided';
                        return o.order_status === approvalFilter;
                      })
                      .filter((o) => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          o.furniture_type.toLowerCase().includes(q) ||
                          o.customer_name.toLowerCase().includes(q) ||
                          o.material.toLowerCase().includes(q) ||
                          o.custom_order_id.toString().includes(q)
                        );
                      })
                      .map((ord) => (
                        <div key={ord.custom_order_id} className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-xl">
                                Order #{ord.custom_order_id}
                              </span>
                              <h3 className="font-extrabold text-sm sm:text-base text-[#2C241D]">{ord.furniture_type}</h3>
                            </div>

                            <span className={`px-3 py-1 rounded-full text-xs font-extrabold self-start sm:self-auto ${ord.order_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                              ord.order_status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                              {ord.order_status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs text-[#6B5C4D]">
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Client Name</span>
                              <span className="font-extrabold text-[#2C241D]">{ord.customer_name}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Material Finish</span>
                              <span className="font-bold text-[#2C241D]">{ord.material}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Color / Polish</span>
                              <span className="font-bold">{renderColorSwatchBadge(ord.color)}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Quoted Price</span>
                              <span className="font-extrabold text-[#48A63E]">{ord.estimated_price ? `₹${ord.estimated_price.toLocaleString('en-IN')}` : 'Quote Pending'}</span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Approved By</span>
                              <span className="font-extrabold text-[#38A132] truncate block">
                                Approved By: {ord.approved_by || ord.staff_name || (ord.order_status === 'Approved' || ord.order_status === 'Quote Provided' || ord.order_status === 'In Production' || ord.order_status === 'Paid' ? (currentUser?.full_name || currentUser?.name || 'Geetha Devi') : '—')}
                              </span>
                            </div>
                            <div>
                              <span className="font-bold block text-[#7A6C5E] text-[10px]">Order Date</span>
                              <span className="font-bold text-[#2C241D]">
                                {ord.order_date ? (ord.order_date.includes('T') ? ord.order_date.split('T')[0] : ord.order_date) : 'Standard Build'}
                              </span>
                            </div>
                          </div>

                          {/* Assigned Worker Banner */}
                          <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Wrench className="w-4 h-4 text-[#38A132] flex-shrink-0" />
                              <span className="font-extrabold text-[#5C4E42]">Assigned Artisan / Worker:</span>
                              {ord.assigned_workers && ord.assigned_workers.length > 0 ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {ord.assigned_workers.map((w, idx) => (
                                    <span key={idx} className="font-extrabold text-[#2C241D] bg-white px-2.5 py-1 rounded-xl border border-[#E2D7CB] shadow-2xs flex items-center gap-1.5">
                                      <span>👷 {w.worker_name}</span>
                                      {w.specialization && <span className="text-[10px] text-[#7A6C5E]">({w.specialization})</span>}
                                      {w.worker_phone && <span className="text-[10px] text-[#38A132] font-mono">📞 {w.worker_phone}</span>}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-bold text-amber-800 italic bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                                  No Artisan Assigned Yet
                                </span>
                              )}
                            </div>
                          </div>

                          {((ord.design_description && ord.design_description.trim()) || (ord.reference_image && ord.reference_image.trim())) && (
                            <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs space-y-2">
                              {ord.design_description && ord.design_description.trim() && (
                                <div>
                                  <span className="font-extrabold text-[10px] uppercase text-[#7A6C5E] block mb-0.5">📝 Additional Specs & Requirements</span>
                                  <span className="font-semibold text-[#2C241D] block">{ord.design_description}</span>
                                </div>
                              )}
                              {ord.reference_image && ord.reference_image.trim() && (
                                <div className="flex items-center gap-2 pt-1 border-t border-[#EAE0D4]">
                                  <span className="font-extrabold text-[10px] uppercase text-[#7A6C5E] block shrink-0">📷 Reference Design</span>
                                  <div className="flex items-center gap-1.5 overflow-x-auto">
                                    {parseReferenceImages(ord.reference_image).slice(0, 3).map((url, i) => (
                                      <img key={i} src={url} alt={`Reference ${i+1}`} className="w-10 h-10 rounded-lg object-cover border border-[#E2D7CB] shadow-2xs" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#EFE7DE]">
                            <button
                              onClick={() => setSelectedOrderForDetails(ord)}
                              className="px-3.5 py-2 rounded-xl bg-[#F5ECE1] hover:bg-[#EAE0D4] text-[#2C241D] font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#6B5C4D]" />
                              <span>View Specs</span>
                            </button>

                            {ord.order_status === 'Approved' || ord.order_status === 'Quote Provided' || (ord.estimated_price && ord.estimated_price > 0) ? (
                              <button
                                onClick={() => handleOpenPriceModal(ord)}
                                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Amount</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenPriceModal(ord)}
                                className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Review & Quote Price</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ARTISAN TASK ASSIGNMENTS HUB */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Direct Assignment Form */}
                  <div className="bg-[#FAF7F2] p-5 rounded-3xl border-2 border-[#E2D7CB] shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#E2D7CB] pb-3">
                      <UserPlus className="w-5 h-5 text-[#48A63E]" />
                      <h3 className="font-extrabold text-base text-[#2C241D]">Assign Artisan by Department Stage</h3>
                    </div>

                    <form onSubmit={handleDirectAssignSubmit} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-extrabold text-xs text-[#2C241D] mb-1.5 flex items-center justify-between">
                          <span>1. Select Custom Order</span>
                          <span className="text-[10px] text-[#8C7C6D] font-semibold">Step 1</span>
                        </label>
                        <div className="relative">
                          <select
                            value={assignFormOrderId}
                            onChange={(e) => setAssignFormOrderId(Number(e.target.value))}
                            required
                            className="w-full pl-4 pr-10 py-3 rounded-2xl border border-[#E2D7CB] bg-white text-[#2C241D] font-extrabold text-xs appearance-none focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-xs transition-all cursor-pointer hover:border-[#48A63E]"
                          >
                            <option value="" className="bg-white text-[#8C7C6D] font-medium py-2">-- Choose Approved Custom Order --</option>
                            {orders
                              .filter(isPaidCustomOrder)
                              .map((o) => (
                                <option key={o.custom_order_id} value={o.custom_order_id} className="bg-white text-[#2C241D] font-semibold py-2">
                                  #{o.custom_order_id} - {o.furniture_type} ({o.customer_name})
                                </option>
                              ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-[#8C7C6D] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block font-extrabold text-xs text-[#2C241D] mb-1.5 flex items-center justify-between">
                          <span>2. Select Production Department Stage</span>
                          <span className="text-[10px] text-[#8C7C6D] font-semibold">Step 2</span>
                        </label>
                        <div className="relative">
                          <select
                            value={assignFormDepartment}
                            onChange={(e) => setAssignFormDepartment(e.target.value)}
                            required
                            className="w-full pl-4 pr-10 py-3 rounded-2xl border border-[#E2D7CB] bg-white text-[#2C241D] font-extrabold text-xs appearance-none focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-xs transition-all cursor-pointer hover:border-[#48A63E]"
                          >
                            {assignFormOrderId ? (
                              (() => {
                                const targetOrd = orders.find(o => o.custom_order_id === Number(assignFormOrderId));
                                const req = getRequiredProductionStages(targetOrd?.furniture_type, targetOrd?.material, targetOrd?.design_description);
                                return req.map(s => (
                                  <option key={s.key} value={s.key}>
                                    {s.icon} {s.label}
                                  </option>
                                ));
                              })()
                            ) : (
                              <>
                                <option value="Woodwork & Carpentry">🪵 Woodwork & Carpentry (Cutting, Shaping & Joinery)</option>
                                <option value="Upholstery">🪡 Upholstery (Foam Padding & Cushioning)</option>
                                <option value="Assembly">🔧 Assembly & Quality Check (Final Assembly)</option>
                              </>
                            )}
                          </select>
                          <ChevronDown className="w-4 h-4 text-[#8C7C6D] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block font-extrabold text-xs text-[#2C241D] mb-1.5 flex items-center justify-between">
                          <span>3. Select Department Artisan Worker</span>
                          <span className="text-[10px] text-[#8C7C6D] font-semibold">Step 3</span>
                        </label>
                        <div className="relative">
                          <select
                            value={assignFormWorkerId}
                            onChange={(e) => setAssignFormWorkerId(Number(e.target.value))}
                            required
                            className="w-full pl-4 pr-10 py-3 rounded-2xl border border-[#E2D7CB] bg-white text-[#2C241D] font-extrabold text-xs appearance-none focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-xs transition-all cursor-pointer hover:border-[#48A63E]"
                          >
                            <option value="" className="bg-white text-[#8C7C6D] font-medium py-2">-- Select Artisan Worker --</option>
                            {workers.map((w) => (
                              <option key={w.worker_id} value={w.worker_id} className="bg-white text-[#2C241D] font-semibold py-2">
                                {w.full_name} ({w.specialization || 'Craft Specialist'})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-[#8C7C6D] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block font-extrabold text-xs text-[#2C241D] mb-1.5 flex items-center justify-between">
                          <span>Task Instructions & Craft Notes</span>
                          <span className="text-[10px] text-[#8C7C6D] font-semibold">Optional</span>
                        </label>
                        <textarea
                          placeholder="Department instructions (e.g., teak frame jointing, velvet upholstery, hardware specs)..."
                          value={assignFormNotes}
                          onChange={(e) => setAssignFormNotes(e.target.value)}
                          rows={3}
                          className="w-full p-3.5 rounded-2xl border border-[#E2D7CB] bg-white text-[#2C241D] font-semibold text-xs focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-xs transition-all placeholder:text-[#A09080] hover:border-[#48A63E]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Confirm Department Task Assignment</span>
                      </button>
                    </form>
                  </div>

                  {/* Active Worker Assignments Roster Feed with Production Pipeline Stages */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
                      {orders.filter(isPaidCustomOrder).length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl border border-[#E2D7CB] text-center space-y-2">
                          <Users className="w-8 h-8 text-[#A09080] mx-auto" />
                          <p className="font-extrabold text-sm text-[#2C241D]">No Active Paid Build Tasks</p>
                          <p className="text-xs text-[#7A6C5E]">Approved customer orders will appear here for craftsman allocation once paid.</p>
                        </div>
                      ) : (
                        orders.filter(isPaidCustomOrder).map((ord) => {
                          const assignedWorkersList = ord.assigned_workers || [];
                          const requiredStages = getRequiredProductionStages(ord.furniture_type, ord.material);
                          const currentPercent = ord.progress_percentage || 0;

                          return (
                            <div key={ord.custom_order_id} className="bg-white p-5 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-4">
                              {/* Header Row */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-black text-[#48A63E] bg-[#48A63E]/15 px-2.5 py-0.5 rounded-full">
                                      Order #{ord.custom_order_id}
                                    </span>
                                    <h4 className="font-black text-base text-[#2C241D]">{ord.furniture_type}</h4>
                                  </div>
                                  <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                                    <span className="font-bold">Client:</span> {ord.customer_name} | <span className="font-bold">Material:</span> {ord.material} | <span className="font-bold">Polish/Finish:</span> {ord.color || 'Natural'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                  <span className="text-xs font-black text-[#38A132] bg-[#38A132]/10 px-3 py-1 rounded-full border border-[#38A132]/30">
                                    {ord.order_status} ({currentPercent}%)
                                  </span>
                                </div>
                              </div>

                              {/* Department Production Stages Pipeline */}
                              <div className="space-y-2">
                                <h5 className="text-[11px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">
                                  Production Workflow Stages & Department Assignments
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {requiredStages.map((stg, idx) => {
                                    // Find worker assigned to this department
                                    const stageWorker = assignedWorkersList.find(w => 
                                      (w.specialization && w.specialization.toLowerCase().includes(stg.key.toLowerCase().split(' ')[0])) ||
                                      (w.task_status && w.task_status.toLowerCase().includes(stg.key.toLowerCase().split(' ')[0]))
                                    );

                                    // Determine stage availability/status based on sequence
                                    let isUnlocked = true;
                                    let stageStatusText = 'Assigned';
                                    let badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300';

                                    if (stg.key === 'Woodwork & Carpentry') {
                                      if (currentPercent >= 35) {
                                        stageStatusText = 'Completed ✓';
                                        badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
                                      } else if (stageWorker) {
                                        stageStatusText = 'In Progress';
                                      } else {
                                        stageStatusText = 'Awaiting Worker';
                                        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                                      }
                                    } else if (stg.key === 'Upholstery') {
                                      if (currentPercent < 35 && !stageWorker) {
                                        isUnlocked = false;
                                        stageStatusText = 'Waiting for Woodwork';
                                        badgeStyle = 'bg-neutral-100 text-neutral-600 border-neutral-200';
                                      } else if (currentPercent >= 70) {
                                        stageStatusText = 'Completed ✓';
                                        badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
                                      } else if (stageWorker) {
                                        stageStatusText = 'In Progress';
                                      } else {
                                        stageStatusText = 'Ready for Assignment';
                                        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                                      }
                                    } else if (stg.key === 'Assembly') {
                                      const prevRequiredDone = currentPercent >= (requiredStages.length === 3 ? 70 : 35);
                                      if (!prevRequiredDone && !stageWorker) {
                                        isUnlocked = false;
                                        stageStatusText = 'Waiting for Previous Stage';
                                        badgeStyle = 'bg-neutral-100 text-neutral-600 border-neutral-200';
                                      } else if (currentPercent >= 100) {
                                        stageStatusText = 'Completed ✓';
                                        badgeStyle = 'bg-purple-50 text-purple-800 border-purple-200';
                                      } else if (stageWorker) {
                                        stageStatusText = 'In Progress';
                                      } else {
                                        stageStatusText = 'Ready for Assembly';
                                        badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
                                      }
                                    }

                                    return (
                                      <div key={stg.key} className={`p-3 rounded-2xl border text-xs space-y-2 ${isUnlocked ? 'bg-[#FAF7F2] border-[#E2D7CB]' : 'bg-neutral-50/70 border-neutral-200 opacity-80'}`}>
                                        <div className="flex items-center justify-between">
                                          <span className="font-extrabold text-[#2C241D] flex items-center gap-1.5">
                                            <span>{stg.icon}</span>
                                            <span>{stg.key}</span>
                                          </span>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeStyle}`}>
                                            {stageStatusText}
                                          </span>
                                        </div>

                                        <p className="text-[10px] text-[#7A6C5E] font-medium leading-tight">{stg.desc}</p>

                                        <div className="pt-2 border-t border-[#EFE7DE] flex items-center justify-between">
                                          {stageWorker ? (
                                            <div className="min-w-0">
                                              <span className="font-extrabold text-[#2C241D] block truncate text-xs">👷 {stageWorker.worker_name}</span>
                                              {stageWorker.worker_phone && <span className="text-[10px] text-[#38A132] font-mono block">📞 {stageWorker.worker_phone}</span>}
                                            </div>
                                          ) : (
                                            <span className="text-[11px] font-bold text-amber-800 italic">No Worker Assigned</span>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedOrderForWorker(ord);
                                              setAssignFormOrderId(ord.custom_order_id);
                                              setAssignFormDepartment(stg.key);
                                              setSelectedDepartment(stg.key);
                                              if (stageWorker) setSelectedWorkerId(stageWorker.worker_id);
                                            }}
                                            className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#F3EDE5] text-[#48A63E] border border-[#E2D7CB] font-extrabold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                          >
                                            <UserPlus className="w-3 h-3 text-[#48A63E]" />
                                            <span>{stageWorker ? 'Reassign' : 'Assign'}</span>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ARTISAN TECHNICIANS DIRECTORY */}
            {activeTab === 'workers' && (
              <div className="space-y-5">
                {/* Artisan Workforce & Smart Workload AI Recommendation Panel */}
                <div className="bg-gradient-to-r from-[#2C241D] to-[#4A3B30] p-5 rounded-3xl text-white shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                        <h3 className="text-base font-extrabold tracking-wide">Multi-Artisan Workforce & Workload Roster</h3>
                      </div>
                      <p className="text-xs text-amber-200/80 mt-0.5">Real-time shop floor task distribution & AI decision support recommendations</p>
                    </div>

                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/20 text-xs font-bold">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>{workers.filter(w => w.status).length} Active Technicians Available</span>
                    </div>
                  </div>

                  {/* Worker Workload Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(() => {
                      const workerWorkloads = workers.map((w) => {
                        const load = getWorkerLiveWorkload(w.worker_id);
                        return {
                          ...w,
                          assignedCustom: load.customCount,
                          assignedFab: load.fabCount,
                          assignedOnsite: load.onsiteCount,
                          totalActive: load.total,
                        };
                      });

                      const activeOnly = workerWorkloads.filter(w => w.status === true || w.status === 'Active' || w.status === 'active' || String(w.status) === 'true' || String(w.status) === '1');
                      const minActive = activeOnly.length > 0 ? Math.min(...activeOnly.map(w => w.totalActive)) : 0;

                      return workerWorkloads.map((w) => {
                        const isActive = w.status === true || w.status === 'Active' || w.status === 'active' || String(w.status) === 'true' || String(w.status) === '1';
                        const isRecommended = isActive && w.totalActive === minActive;
                        return (
                          <div
                            key={w.worker_id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isRecommended
                                ? 'bg-amber-500/20 border-amber-400/60 shadow-lg'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-extrabold text-xs text-white flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                                {w.full_name}
                              </span>
                              {isRecommended && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-400 text-stone-950 rounded-full shadow-xs">
                                  AI Recommended
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-amber-300 font-semibold truncate">
                              {w.specialization || 'Woodwork & Carpentry'}
                            </div>
                            <div className="text-[11px] text-stone-300 flex items-center justify-between mt-2 flex-wrap gap-1">
                              <span>Active Workload:</span>
                              <span className="font-mono font-extrabold text-amber-300 text-xs">
                                {w.totalActive} active ({w.assignedCustom} Cust • {w.assignedFab} Fab • {w.assignedOnsite} Srv)
                              </span>
                            </div>
                            {isRecommended && (
                              <div className="text-[9px] text-amber-200 mt-1 italic leading-tight flex items-center gap-1">
                                ⚡ Lowest active workload ({w.totalActive} active items) • Ready for dispatch
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Search Bar & Department Filter Pills */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-[#7A6C5E] mr-1">Department Filter:</span>
                    <button
                      onClick={() => setWorkerDeptFilter('All')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                        workerDeptFilter === 'All'
                          ? 'bg-[#48A63E] text-white shadow-sm'
                          : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                      }`}
                    >
                      All ({workers.length})
                    </button>
                    <button
                      onClick={() => setWorkerDeptFilter('Woodwork & Carpentry')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                        workerDeptFilter === 'Woodwork & Carpentry'
                          ? 'bg-[#48A63E] text-white shadow-sm'
                          : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                      }`}
                    >
                      🪵 Wood & Carpentry ({workers.filter(w => (w.specialization || '').includes('Wood') || (w.specialization || '').includes('Carpen')).length})
                    </button>
                    <button
                      onClick={() => setWorkerDeptFilter('Upholstery')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                        workerDeptFilter === 'Upholstery'
                          ? 'bg-[#48A63E] text-white shadow-sm'
                          : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                      }`}
                    >
                      🪡 Upholstery ({workers.filter(w => (w.specialization || '').includes('Upholster')).length})
                    </button>
                    <button
                      onClick={() => setWorkerDeptFilter('Assembly')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                        workerDeptFilter === 'Assembly'
                          ? 'bg-[#48A63E] text-white shadow-sm'
                          : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                      }`}
                    >
                      🔧 Assembly ({workers.filter(w => (w.specialization || '').includes('Assembl') || (w.specialization || '').includes('Finish')).length})
                    </button>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search worker, email, specialty..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                      />
                    </div>

                    <button
                      onClick={() => setIsAddWorkerModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-[#48A63E]/20 transition-all whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Worker</span>
                    </button>
                  </div>
                </div>

                {(() => {
                  const filteredWorkers = workers.filter((w) => {
                    // Department filter
                    if (workerDeptFilter !== 'All') {
                      const spec = (w.specialization || '').toLowerCase();
                      const targetFilter = workerDeptFilter.toLowerCase();
                      if (targetFilter.includes('wood') && !spec.includes('wood') && !spec.includes('carpen')) return false;
                      if (targetFilter.includes('upholster') && !spec.includes('upholster')) return false;
                      if (targetFilter.includes('assembl') && !spec.includes('assembl') && !spec.includes('finish')) return false;
                    }

                    // Search query
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      w.full_name.toLowerCase().includes(q) ||
                      w.email.toLowerCase().includes(q) ||
                      (w.specialization && w.specialization.toLowerCase().includes(q)) ||
                      (w.phone && w.phone.toLowerCase().includes(q))
                    );
                  });

                  if (filteredWorkers.length === 0) {
                    return (
                      <div className="py-12 px-4 text-center bg-white rounded-3xl border border-[#E2D7CB] space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-[#F5ECE1] text-[#8C7C6D] flex items-center justify-center mx-auto shadow-xs">
                          <Users className="w-7 h-7" />
                        </div>
                        <h4 className="font-extrabold text-base text-[#2C241D]">No workers match filter</h4>
                        <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto font-medium">
                          No artisan technicians found matching department "{workerDeptFilter}". Try selecting another department filter or add a worker.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredWorkers.map((worker) => (
                        <div key={worker.worker_id} className="bg-white p-5 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-3 relative group">
                          {/* Card Action Buttons: Edit, Toggle Status & Delete */}
                          <div className="absolute top-4 right-4 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleWorkerStatus(worker)}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer text-xs font-extrabold flex items-center gap-1 ${worker.status
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                }`}
                              title={worker.status ? "Click to set Inactive" : "Click to set Active"}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="text-[10px] hidden sm:inline">{worker.status ? 'Active' : 'Inactive'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditWorker(worker)}
                              className="text-[#7A6C5E] hover:text-[#48A63E] p-1.5 rounded-xl hover:bg-[#F3EDE5] transition-colors cursor-pointer"
                              title="Edit Worker Details"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleWorkerStatus(worker)}
                              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${worker.status
                                  ? 'text-amber-700 hover:bg-amber-100/60 hover:text-amber-800'
                                  : 'text-emerald-700 hover:bg-emerald-100/60 hover:text-emerald-800'
                                }`}
                              title={worker.status ? "Set Worker Inactive" : "Set Worker Active"}
                            >
                              {worker.status ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-3 pr-28">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold flex items-center justify-center text-sm shadow-md flex-shrink-0">
                              {(worker.full_name || 'Worker').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-sm text-[#2C241D] truncate">{worker.full_name}</h4>
                              <p className="text-[11px] text-[#48A63E] font-bold truncate">{worker.specialization || 'Woodwork & Carpentry'}</p>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs text-[#6B5C4D] pt-1 border-t border-[#EFE7DE]">
                            <p><span className="font-bold text-[#7A6C5E]">Email:</span> <span className="font-semibold text-[#2C241D] break-all">{worker.email}</span></p>
                            <p><span className="font-bold text-[#7A6C5E]">Phone:</span> <span className="font-semibold text-[#2C241D]">{worker.phone || 'N/A'}</span></p>
                            <div className="flex items-center justify-between pt-1">
                              <span className="font-bold text-[#7A6C5E]">Account Status:</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${worker.status
                                  ? 'bg-emerald-100/80 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}>
                                {worker.status ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleResendCredentials(worker)}
                              disabled={resendingCredentialsId === worker.worker_id}
                              className="w-full mt-2 py-2 px-3 bg-[#FAF7F2] hover:bg-[#F3EDE5] border border-[#E2D7CB] hover:border-[#48A63E] text-[#48A63E] font-extrabold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                              title="Resend login credentials to worker's registered email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>{resendingCredentialsId === worker.worker_id ? 'Sending Credentials...' : 'Resend Login Credentials'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 5: STAFF QUERIES & ADMIN REQUESTS */}
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
                          className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block font-extrabold text-[#2C241D] mb-1">Detailed Explanation</label>
                        <textarea
                          placeholder="Please specify why this change or access permission is required..."
                          value={newQueryMessage}
                          onChange={(e) => setNewQueryMessage(e.target.value)}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit Request to Admin</span>
                      </button>
                    </form>
                  </div>

                  {/* Live Queries & Responses Feed */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[#E2D7CB] pb-3 gap-2">
                      <h4 className="font-extrabold text-sm text-[#2C241D]">Submitted Requests & Admin Feedback Feed</h4>
                      <div className="relative w-full sm:w-56">
                        <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search request subject..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1 bg-white border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                        />
                      </div>
                    </div>

                    {staffQueries.length === 0 ? (
                      <div className="bg-[#FAF7F2] p-8 rounded-2xl border-2 border-dashed border-[#E2D7CB] text-center space-y-2">
                        <MessageSquare className="w-8 h-8 text-[#A09080] mx-auto" />
                        <p className="font-extrabold text-sm text-[#2C241D]">No Admin Requests Available</p>
                        <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto">
                          You haven't submitted any email change requests or queries yet. Use the form on the left to reach out to system Admin.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                        {staffQueries
                          .filter((q) => {
                            if (!searchQuery.trim()) return true;
                            const sq = searchQuery.toLowerCase();
                            return (
                              q.subject.toLowerCase().includes(sq) ||
                              q.category.toLowerCase().includes(sq) ||
                              (q.message && q.message.toLowerCase().includes(sq))
                            );
                          })
                          .map((query) => (
                            <div key={query.id} className="bg-white p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#48A63E]/10 text-[#48A63E] mb-1">
                                    {query.category}
                                  </span>
                                  <h5 className="font-extrabold text-sm text-[#2C241D]">{query.subject}</h5>
                                  <p className="text-[11px] text-[#7A6C5E] font-medium">{query.createdAt}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${query.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                  query.status === 'In Review' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                    query.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                      'bg-slate-100 text-slate-800 border border-slate-200'
                                  }`}>
                                  {query.status}
                                </span>
                              </div>

                              <p className="text-xs text-[#5C4E42] bg-[#FAF7F2] p-3 rounded-xl border border-[#EFE7DE] leading-relaxed">
                                {query.message}
                              </p>

                              {query.adminResponse ? (
                                <div className="p-3.5 rounded-xl bg-[#48A63E]/10 border border-[#48A63E]/30 space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-[#3D9134] font-extrabold">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>Admin Response & Feedback ({query.updatedAt || 'Recently'}):</span>
                                  </div>
                                  <p className="text-[#2C241D] font-medium leading-relaxed italic">
                                    "{query.adminResponse}"
                                  </p>
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Waiting for Admin review and response...</span>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: CUSTOM FURNITURE COUPONS & PROMOTIONS HUB */}
            {activeTab === 'coupons' && (
              <div className="space-y-6 pt-2">
                {/* Coupon KPI Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Total Promo Provisions</span>
                      <Tag className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">{couponsList.length}</div>
                    <div className="text-[10px] text-[#48A63E] font-bold mt-1">Active Custom Offers</div>
                  </div>

                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>First N Payment Offers</span>
                      <Users className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {couponsList.filter(c => c.customerLimit && c.customerLimit > 0).length}
                    </div>
                    <div className="text-[10px] text-amber-700 font-bold mt-1">Payment Cap Offers</div>
                  </div>

                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Targeted VIP Offers</span>
                      <Sparkles className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {couponsList.filter(c => c.targetUserEmail && c.targetUserEmail.trim()).length}
                    </div>
                    <div className="text-[10px] text-purple-700 font-bold mt-1">Direct VIP Customer Offers</div>
                  </div>

                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Total Redemptions</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {couponsList.reduce((acc, c) => acc + (c.currentRedemptions || 0), 0)}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold mt-1">Redeemed At Checkout</div>
                  </div>
                </div>

                {/* Main Table Card */}
                <div className="ultra-glass-card rounded-3xl p-6 space-y-5 border border-[#E2D7CB] shadow-xl">
                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#EFE7DE] pb-4">
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6C5E]" />
                      <input
                        type="text"
                        placeholder="Search coupons by code or email..."
                        value={couponSearchQuery}
                        onChange={(e) => setCouponSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#48A63E]"
                      />
                    </div>

                    <button
                      onClick={() => setIsAddCouponModalOpen(true)}
                      className="px-5 py-2.5 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-[#48A63E]/20 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Coupon Provision</span>
                    </button>
                  </div>

                  {/* Coupon List Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4">Coupon Code</th>
                          <th className="py-3 px-4">Discount</th>
                          <th className="py-3 px-4">Audience / Offer Type</th>
                          <th className="py-3 px-4">Payment Limit Progress</th>
                          <th className="py-3 px-4">Target VIP Customer Email / Allotment</th>
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
                            const audience = coupon.audienceType || 'production';

                            let audienceBadge = '🏭 First N Production Customers';
                            let audienceBg = 'bg-amber-50 text-amber-700 border-amber-200';
                            if (audience === 'retail') {
                              audienceBadge = '🛍️ First N Retail Customers';
                              audienceBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            } else if (audience === 'all') {
                              audienceBadge = '🌐 First N Customers (All)';
                              audienceBg = 'bg-blue-50 text-blue-700 border-blue-200';
                            }

                            if (coupon.targetUserEmail && coupon.targetUserEmail.trim()) {
                              audienceBadge = '⭐ VIP / Special Offer';
                              audienceBg = 'bg-purple-50 text-purple-700 border-purple-200';
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
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${coupon.status === 'Active' && (!limitN || redeemed < limitN)
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
                                          await loadCouponsData();
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
                  <div className="mt-8 border-t border-[#EFE7DE] pt-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#2C241D] flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-[#48A63E]" />
                          <span>Customer Coupon Allotment & One-Time Usage Records</span>
                        </h4>
                        <p className="text-[11px] text-[#7A6C5E] font-medium">Maintains complete record of users allotted coupons, delivery status, and single-use enforcement.</p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7A6C5E]" />
                          <input
                            type="text"
                            placeholder="Search allotment email or code..."
                            value={allotmentSearchQuery}
                            onChange={(e) => setAllotmentSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#48A63E] shadow-2xs text-[#2C241D]"
                          />
                        </div>
                        <span className="text-xs font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-3 py-1.5 rounded-xl border border-[#48A63E]/20 whitespace-nowrap">
                          {allotmentsList.filter(alt =>
                            !allotmentSearchQuery.trim() ||
                            alt.targetUserEmail.toLowerCase().includes(allotmentSearchQuery.toLowerCase()) ||
                            alt.couponCode.toLowerCase().includes(allotmentSearchQuery.toLowerCase())
                          ).length} Total Records
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
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium">
                          {allotmentsList.filter(alt =>
                            !allotmentSearchQuery.trim() ||
                            alt.targetUserEmail.toLowerCase().includes(allotmentSearchQuery.toLowerCase()) ||
                            alt.couponCode.toLowerCase().includes(allotmentSearchQuery.toLowerCase())
                          ).length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-[#8C7C6D] italic">
                                {allotmentSearchQuery.trim()
                                  ? `No customer coupon allotments match search "${allotmentSearchQuery}".`
                                  : 'No customer coupon allotments recorded yet. When a coupon is sent to a customer email, it will be tracked here.'}
                              </td>
                            </tr>
                          ) : (
                            allotmentsList
                              .filter(alt =>
                                !allotmentSearchQuery.trim() ||
                                alt.targetUserEmail.toLowerCase().includes(allotmentSearchQuery.toLowerCase()) ||
                                alt.couponCode.toLowerCase().includes(allotmentSearchQuery.toLowerCase())
                              )
                              .map((alt) => (
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
                                    {formatKolkataTime(alt.allottedDate)}
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
                                    {formatKolkataTime(alt.usedDate)}
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

            {/* TAB 7: DEDICATED ADMIN DIRECTIVES & MESSAGES PAGE */}
            {activeTab === 'admin_messages' && (
              <div className="space-y-5">
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
                        Official executive announcements, workshop operational directives, and direct messages.
                      </p>
                    </div>

                    {unreadAdminMsgsCount > 0 && (
                      <button
                        onClick={() => {
                          markAllAdminMessagesReadForUser(currentUser.email, 'Production Staff');
                          loadAdminMessages();
                        }}
                        className="px-4 py-2 bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        <span>Mark All as Read</span>
                      </button>
                    )}
                  </div>

                  {/* Messages List */}
                  <div className="space-y-4">
                    {adminMessages.length === 0 ? (
                      <div className="p-10 text-center text-[#7A6C5E] space-y-2 bg-white rounded-2xl border border-[#E2D7CB]">
                        <Mail className="w-8 h-8 text-[#A09080] mx-auto opacity-50" />
                        <p className="text-sm font-extrabold text-[#2C241D]">No Admin Messages Received</p>
                        <p className="text-xs text-[#7A6C5E]">Official announcements dispatched by System Admin to Production Staff will appear here.</p>
                      </div>
                    ) : (
                      adminMessages.map((msg) => {
                        const isRead = isMessageReadByUser(msg, currentUser.email);
                        return (
                          <div
                            key={msg.id}
                            className={`p-5 rounded-2xl border transition-all space-y-3 ${isRead
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
                                  onClick={() => {
                                    markAdminMessageRead(msg.id, currentUser.email);
                                    loadAdminMessages();
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
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

            {/* TAB: Machinery & Equipment */}
            {activeTab === 'machines' && <MachineryTab />}

            {/* TAB: Raw Manufacturing Materials */}
            {activeTab === 'raw_materials' && <RawMaterialsTab />}

            {/* TAB: Quality Control & Rework Queue */}
            {activeTab === 'quality' && <QualityControlTab />}

            {/* TAB: Production Telemetry AI Suite */}
            {activeTab === 'ai_insights' && <ProductionAiSuiteTab />}

          </div>
        </main>
      </div>

      {/* MODAL 1: Add New Worker (Inside Workers Directory tab, similar to adding products in Retail) */}
      {isAddWorkerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-8 shadow-2xl border-2 border-[#E2D7CB] w-full max-w-lg space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddWorkerModalOpen(false)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1.5 rounded-full bg-[#EAE0D4] hover:bg-[#DED2C2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/30 flex items-center justify-center text-[#48A63E] font-extrabold shadow-sm">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#2C241D] tracking-tight">Register New Artisan Worker</h3>
                <p className="text-xs font-bold text-[#6B5C4D]">Add skilled craftsmen and technicians to the workshop roster</p>
              </div>
            </div>

            <form onSubmit={handleAddWorkerSubmit} className="space-y-4 text-xs">
              {addWorkerError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-fadeIn">
                  {addWorkerError}
                </div>
              )}

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Worker Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Master James Miller"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="james.m@retailsphere.ai"
                  value={newWorkerEmail}
                  onChange={(e) => setNewWorkerEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-948"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Craft Specialization / Production Department</label>
                <select
                  value={newWorkerSpec}
                  onChange={(e) => setNewWorkerSpec(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Woodwork & Carpentry">🪵 Woodwork & Carpentry (Framing & Timber Joining)</option>
                  <option value="Upholstery">🪡 Upholstery (Cushioning, Stitching & Fabrics)</option>
                  <option value="Assembly">🔧 Assembly & Quality Check (Final Assembly & QA)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddWorkerModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddWorkerSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isAddWorkerSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>{isAddWorkerSubmitting ? 'Registering Worker...' : 'Register Worker'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1b: Edit Worker Details */}
      {editingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] text-[#2C241D] rounded-[2rem] p-6 sm:p-8 shadow-2xl border-2 border-[#E2D7CB] w-full max-w-lg space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingWorker(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1.5 rounded-full bg-[#EAE0D4] hover:bg-[#DED2C2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-11 h-11 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/30 flex items-center justify-center text-[#48A63E] font-extrabold shadow-sm">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#2C241D] tracking-tight">Edit Worker Profile</h3>
                <p className="text-xs font-bold text-[#6B5C4D]">Update details for {editingWorker.full_name}</p>
              </div>
            </div>

            <form onSubmit={handleEditWorkerSubmit} className="space-y-4 text-xs">
              {editWorkerError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-fadeIn">
                  {editWorkerError}
                </div>
              )}

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Worker Full Name</label>
                <input
                  type="text"
                  value={editWorkerName}
                  onChange={(e) => setEditWorkerName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Email Address</label>
                <input
                  type="email"
                  value={editWorkerEmail}
                  onChange={(e) => setEditWorkerEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editWorkerPhone}
                  onChange={(e) => setEditWorkerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Craft Specialization / Department</label>
                <select
                  value={editWorkerSpec}
                  onChange={(e) => setEditWorkerSpec(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Woodwork & Carpentry">🪵 Woodwork & Carpentry (Framing & Timber Joining)</option>
                  <option value="Upholstery">🪡 Upholstery (Cushioning, Stitching & Fabrics)</option>
                  <option value="Assembly">🔧 Assembly & Quality Check (Final Assembly & QA)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingWorker(null)}
                  className="px-5 py-2.5 rounded-xl border border-[#E2D7CB] text-[#5C4A3A] font-extrabold hover:bg-[#EAE0D4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditWorkerSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isEditWorkerSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isEditWorkerSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Detailed Order Specifications */}
      {selectedOrderForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOrderForDetails(null)}
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
                  ORDER #{selectedOrderForDetails.custom_order_id}
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-0.5">{selectedOrderForDetails.furniture_type}</h3>
                <p className="text-xs text-[#6B5C4D] font-medium">Client: {selectedOrderForDetails.customer_name}</p>
              </div>
            </div>

            {/* 1. CLIENT & ORDER TIMELINE SUMMARY */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
              <h4 className="text-[11px] font-extrabold text-[#7A6C5E] uppercase tracking-wider">Client Contact & Order Record</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Client Name</span>
                  <span className="font-extrabold text-[#2C241D] truncate block">{selectedOrderForDetails.customer_name}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Email Address</span>
                  <span className="font-bold text-[#2C241D] block break-all text-[11px]" title={selectedOrderForDetails.customer_email}>{selectedOrderForDetails.customer_email || 'Not Provided'}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Phone Contact</span>
                  <span className="font-bold text-[#2C241D] block truncate">{selectedOrderForDetails.customer_phone || 'Not Provided'}</span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[#7A6C5E] text-[10px] block">Submission Date</span>
                  <span className="font-bold text-[#2C241D] block truncate">
                    {selectedOrderForDetails.order_date
                      ? new Date(selectedOrderForDetails.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
              {selectedOrderForDetails.assigned_workers && selectedOrderForDetails.assigned_workers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {selectedOrderForDetails.assigned_workers.map((w, i) => (
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
                  ⚠️ No artisan worker assigned yet to this custom build. Use the "Assign Worker" button in the studio to assign workshop staff.
                </p>
              )}
            </div>

            {/* 2. SEPARATED PRODUCT FIELDS GRID */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">Product Specifications & Parameters</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-[#E2D7CB] space-y-1">
                  <span className="font-extrabold text-[#7A6C5E] text-[10px] uppercase block">Furniture Category</span>
                  <span className="font-extrabold text-[#2C241D] text-xs block">{selectedOrderForDetails.furniture_type}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E2D7CB] space-y-1">
                  <span className="font-extrabold text-[#7A6C5E] text-[10px] uppercase block">Primary Hardwood / Material</span>
                  <span className="font-extrabold text-[#2C241D] text-xs block">{selectedOrderForDetails.material}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E2D7CB] space-y-1">
                  <span className="font-extrabold text-[#7A6C5E] text-[10px] uppercase block">Exact Dimensions</span>
                  <span className="font-extrabold text-[#2C241D] text-xs block">{selectedOrderForDetails.dimensions}</span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E2D7CB] space-y-1">
                  <span className="font-extrabold text-[#7A6C5E] text-[10px] uppercase block">Polish / Color Shade</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {renderColorSwatchBadge(selectedOrderForDetails.color)}
                  </div>
                </div>
              </div>

              {selectedOrderForDetails.design_description && (
                <div className="bg-white p-4 rounded-xl border border-[#E2D7CB] space-y-1.5">
                  <span className="font-extrabold text-[#7A6C5E] text-[10px] uppercase block">Client Customization Request / Notes</span>
                  <p className="bg-[#FAF7F2] p-3 rounded-lg border border-[#E2D7CB] text-[#4A3E32] text-xs leading-relaxed font-semibold whitespace-pre-wrap">
                    {selectedOrderForDetails.design_description}
                  </p>
                </div>
              )}
            </div>

            {/* 3. REFERENCE IMAGES GALLERY */}
            {selectedOrderForDetails.reference_image && selectedOrderForDetails.reference_image.trim() && (
              <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-3">
                <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2">
                  <span className="text-xs font-extrabold text-[#2C241D] flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#38A132]" />
                    <span>Customer Reference Images ({parseReferenceImages(selectedOrderForDetails.reference_image).length})</span>
                  </span>
                  <span className="text-[10px] font-bold text-[#7A6C5E]">Click photo to open full resolution</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {parseReferenceImages(selectedOrderForDetails.reference_image).map((imgUrl, i) => (
                    <div key={i} className="group relative rounded-xl overflow-hidden border border-[#E2D7CB] bg-[#FAF7F2] shadow-2xs hover:shadow-md transition-all flex flex-col h-44">
                      <div 
                        className="relative flex-1 bg-neutral-900/5 overflow-hidden flex items-center justify-center cursor-pointer"
                        onClick={() => openImageInNewTab(imgUrl)}
                      >
                        <img
                          src={imgUrl}
                          alt={`Reference ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      </div>
                      <div className="p-2 bg-white border-t border-[#E2D7CB] flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-[#2C241D]">Photo #{i + 1}</span>
                        <button
                          type="button"
                          onClick={() => openImageInNewTab(imgUrl)}
                          className="font-extrabold text-[#38A132] hover:underline flex items-center gap-1 bg-[#38A132]/10 px-2 py-0.5 rounded cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-[#38A132]" /> Full View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-[#E2D7CB] pt-4">
              <button
                onClick={() => setSelectedOrderForDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-[#2C241D] hover:bg-[#42372D] text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Set/Update Product Price & Approval */}
      {selectedOrderForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedOrderForReview(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Set / Edit Product Price</h3>
                <p className="text-xs text-[#7A6C5E]">Order #{selectedOrderForReview.custom_order_id} • Client: {selectedOrderForReview.customer_name}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
              <p><span className="font-bold text-[#7A6C5E]">Furniture Type:</span> {selectedOrderForReview.furniture_type}</p>
              <p><span className="font-bold text-[#7A6C5E]">Dimensions:</span> {selectedOrderForReview.dimensions}</p>
              <p><span className="font-bold text-[#7A6C5E]">Material:</span> {selectedOrderForReview.material}</p>
              <p><span className="font-bold text-[#7A6C5E]">Color / Polish Shade:</span> <strong className="text-[#48A63E]">{selectedOrderForReview.color || 'Natural Finish'}</strong></p>
              {selectedOrderForReview.estimated_price && selectedOrderForReview.estimated_price > 0 ? (
                <p><span className="font-bold text-[#7A6C5E]">Current Quote:</span> <strong className="text-[#38A132]">₹{selectedOrderForReview.estimated_price.toLocaleString()}</strong></p>
              ) : (
                <p><span className="font-bold text-[#7A6C5E]">Current Quote:</span> <strong className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Awaiting Price Quote from Staff</strong></p>
              )}

              {selectedOrderForReview.reference_image && (
                <div className="space-y-1.5 pt-2 border-t border-[#EFE7DE]">
                  <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Customer Reference Photos ({parseReferenceImages(selectedOrderForReview.reference_image).length})</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {parseReferenceImages(selectedOrderForReview.reference_image).map((imgUrl, idx) => (
                      <button key={idx} type="button" onClick={() => openImageInNewTab(imgUrl)} className="block relative group cursor-pointer">
                        <img
                          src={imgUrl}
                          alt={`Reference ${idx + 1}`}
                          className="w-14 h-14 rounded-xl object-cover border border-[#E2D7CB] group-hover:scale-105 transition-transform"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#2C241D] mb-1">
                Enter Product Price Quote (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 145000"
                value={approvalPrice}
                onChange={(e) => setApprovalPrice(e.target.value)}
                required
                className="w-full py-3 px-4 text-base bg-white border-2 border-[#E2D7CB] rounded-xl text-[#2C241D] font-extrabold focus:outline-none focus:border-[#38A132]"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#2C241D] mb-1">
                Staff Remarks / Technical Notes
              </label>
              <textarea
                rows={3}
                placeholder="Enter pricing details or technical notes..."
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                className="w-full py-2.5 px-3.5 text-xs bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-medium focus:outline-none focus:border-[#38A132]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedOrderForReview(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectOrder}
                className="bg-rose-600 hover:bg-rose-700 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <XCircle className="w-4 h-4 text-white" />
                <span>Reject Request</span>
              </button>

              <button
                type="button"
                onClick={handleApproveOrder}
                className="bg-[#38A132] hover:bg-[#32922D] px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md shadow-[#38A132]/20 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Approve & Save Price</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Assign Worker */}
      {selectedOrderForWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedOrderForWorker(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-extrabold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Assign Artisan by Department</h3>
                <p className="text-xs text-[#7A6C5E]">
                  Order #{selectedOrderForWorker.request_id || selectedOrderForWorker.custom_order_id || selectedOrderForWorker.numeric_id} ({selectedOrderForWorker.furniture_type || selectedOrderForWorker.title})
                </p>
              </div>
            </div>

            {/* Currently Assigned Artisans with Removal Option */}
            {selectedOrderForWorker.assigned_workers && selectedOrderForWorker.assigned_workers.length > 0 && (
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-2">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">
                  Currently Assigned Artisans ({selectedOrderForWorker.assigned_workers.length}):
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedOrderForWorker.assigned_workers.map((w: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 px-3 rounded-xl border border-[#E2D7CB] text-xs shadow-2xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#38A132] animate-pulse"></span>
                        <span className="font-extrabold text-[#2C241D]">👷 {w.worker_name}</span>
                        {w.specialization && <span className="text-[10px] text-[#7A6C5E]">({w.specialization})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const ordNumId = selectedOrderForWorker.custom_order_id || selectedOrderForWorker.numeric_id;
                          await handleUnassignWorker(ordNumId, w.worker_id, w.worker_name);
                          setSelectedOrderForWorker((prev: any) => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              assigned_workers: (prev.assigned_workers || []).filter((item: any) => item.worker_id !== w.worker_id)
                            };
                          });
                        }}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] rounded-lg border border-rose-200 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3 text-rose-600" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Logistics & Transportation Assignment */}
            <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#38A132]" />
                  <span>Step 1: Logistics & Carrier Allocation</span>
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  Assign First
                </span>
              </div>

              {/* Mode Selection */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedLogisticsType('CARRIER_PARTNER')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedLogisticsType === 'CARRIER_PARTNER'
                      ? 'bg-[#38A132] text-white border-[#38A132] shadow-xs'
                      : 'bg-white text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#FAF8F5]'
                  }`}
                >
                  🏢 3PL Carrier
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLogisticsType('INTERNAL_FLEET')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedLogisticsType === 'INTERNAL_FLEET'
                      ? 'bg-[#38A132] text-white border-[#38A132] shadow-xs'
                      : 'bg-white text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#FAF8F5]'
                  }`}
                >
                  🚚 Internal Fleet
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLogisticsType('CUSTOMER_ARRANGED')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedLogisticsType === 'CUSTOMER_ARRANGED'
                      ? 'bg-[#38A132] text-white border-[#38A132] shadow-xs'
                      : 'bg-white text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#FAF8F5]'
                  }`}
                >
                  🚶 Self-Arranged
                </button>
              </div>

              {selectedLogisticsType === 'CARRIER_PARTNER' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#2C241D] block">Designated 3PL Carrier Partner</label>
                  <select
                    value={selectedCarrierPartnerId}
                    onChange={(e) => setSelectedCarrierPartnerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold"
                  >
                    {carriersList.map((c) => (
                      <option key={c.carrier_id} value={c.carrier_id}>
                        {c.carrier_name} (Active Fleet Partner)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedLogisticsType === 'INTERNAL_FLEET' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#2C241D] block">Select Internal Driver & Vehicle</label>
                  <select
                    value={selectedFleetDriverId}
                    onChange={(e) => setSelectedFleetDriverId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold"
                  >
                    <option value="">-- Choose Company Fleet Driver --</option>
                    {workers.filter(w => (w.specialization || '').toLowerCase().includes('driver') || (w as any).is_driver).map((w) => (
                      <option key={w.worker_id} value={w.worker_id}>
                        🚚 {w.full_name} (Company Driver)
                      </option>
                    ))}
                    {workers.filter(w => !(w.specialization || '').toLowerCase().includes('driver') && !(w as any).is_driver).map((w) => (
                      <option key={w.worker_id} value={w.worker_id}>
                        🚚 {w.full_name} ({w.specialization || 'Logistics'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#38A132]" />
                  <span>Step 2: Skilled Artisan Assignment</span>
                </span>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#2C241D] mb-1.5">Production Department Stage</label>
                <div className="relative">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 text-xs bg-white border border-[#E2D7CB] rounded-2xl text-[#2C241D] font-extrabold appearance-none focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-xs transition-all cursor-pointer hover:border-[#48A63E]"
                  >
                    {getRequiredProductionStages(
                      selectedOrderForWorker.furniture_type,
                      selectedOrderForWorker.material,
                      selectedOrderForWorker.design_description
                    ).map(s => (
                      <option key={s.key} value={s.key}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#8C7C6D] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#2C241D] mb-1.5">Select Skilled Artisan Worker</label>
                <div className="relative">
                  <select
                    value={selectedWorkerId || ''}
                    onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                    className="w-full pl-4 pr-10 py-3 text-xs bg-white border border-[#E2D7CB] rounded-2xl text-[#2C241D] font-extrabold appearance-none focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-xs transition-all cursor-pointer hover:border-[#48A63E]"
                  >
                    <option value="" className="bg-white text-[#8C7C6D] font-medium py-2">-- Choose Artisan Worker --</option>
                    {workers.map((w) => (
                      <option key={w.worker_id} value={w.worker_id} className="bg-white text-[#2C241D] font-semibold py-2">
                        {w.full_name} ({w.specialization || 'Craft Specialist'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#8C7C6D] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForWorker(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleAssignWorkerSubmit}
                disabled={!selectedWorkerId}
                className="bg-[#48A63E] disabled:opacity-50 hover:bg-[#3D9134] px-5 py-2 rounded-xl text-xs font-extrabold text-white shadow-md shadow-[#48A63E]/20 cursor-pointer"
              >
                Confirm Department Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Update Build Stage & Progress */}
      {selectedOrderForProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedOrderForProgress(null)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-extrabold">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Update Workshop Build Stage</h3>
                <p className="text-xs text-[#7A6C5E]">Order #{selectedOrderForProgress.custom_order_id}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {modalProgressError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 font-extrabold rounded-2xl text-xs flex items-center gap-2 animate-fadeIn shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{modalProgressError}</span>
                </div>
              )}

              {/* Current Recorded Progress Indicator */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E2D7CB]">
                <span className="font-extrabold text-[#7A6C5E] text-[11px]">Current Order Progress</span>
                <span className="font-mono font-black text-xs text-[#2C241D] bg-[#FAF7F2] px-2.5 py-1 rounded-xl border border-[#E2D7CB]">
                  Recorded: <strong className="text-[#38A132]">{selectedOrderForProgress.progress_percentage || 0}%</strong>
                </span>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1.5">Current Workshop Stage</label>
                <div className="relative">
                  <select
                    value={progressStage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full py-3 pl-4 pr-10 text-xs bg-white border-2 border-[#E2D7CB] rounded-2xl text-[#2C241D] font-extrabold focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 transition-all appearance-none cursor-pointer shadow-xs hover:border-[#48A63E]"
                  >
                    <option value="Material Sourcing" className="py-2 font-bold bg-white text-[#2C241D]">1. Material Sourcing & Timber Prep (15%)</option>
                    <option value="Structural Joinery & Framing" className="py-2 font-bold bg-white text-[#2C241D]">2. Structural Joinery & Framing (35%)</option>
                    <option value="Upholstery & Cushioning" className="py-2 font-bold bg-white text-[#2C241D]">3. Upholstery & Cushioning (55%)</option>
                    <option value="Surface Lacquering & Finishing" className="py-2 font-bold bg-white text-[#2C241D]">4. Surface Lacquering & Finishing (75%)</option>
                    <option value="Quality Assurance & Packaging" className="py-2 font-bold bg-white text-[#2C241D]">5. Quality Assurance & Packaging (90%)</option>
                    <option value="Completed & Ready for Dispatch" className="py-2 font-bold bg-white text-[#2C241D]">6. Completed & Ready for Dispatch (100%)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#48A63E] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-extrabold text-[#2C241D]">Progress Percentage</label>
                  <div className="flex items-center gap-1 bg-[#48A63E]/10 border border-[#48A63E]/30 px-3 py-1 rounded-xl">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={progressPercent}
                      onChange={(e) => handlePercentChange(Number(e.target.value))}
                      className="w-12 text-right font-black text-sm text-[#48A63E] bg-transparent focus:outline-none"
                    />
                    <span className="font-black text-xs text-[#48A63E]">%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progressPercent}
                  onChange={(e) => handlePercentChange(Number(e.target.value))}
                  className="w-full accent-[#48A63E] h-2 bg-[#E2D7CB] rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between mt-2 text-[10px] text-[#7A6C5E] font-bold">
                  <button type="button" onClick={() => handlePercentChange(15)} className="hover:text-[#48A63E] cursor-pointer">15%</button>
                  <button type="button" onClick={() => handlePercentChange(35)} className="hover:text-[#48A63E] cursor-pointer">35%</button>
                  <button type="button" onClick={() => handlePercentChange(55)} className="hover:text-[#48A63E] cursor-pointer">55%</button>
                  <button type="button" onClick={() => handlePercentChange(75)} className="hover:text-[#48A63E] cursor-pointer">75%</button>
                  <button type="button" onClick={() => handlePercentChange(100)} className="hover:text-[#48A63E] cursor-pointer">100%</button>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Technician Build Remarks / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Notes on current build progress, quality checks, or technical notes..."
                  value={progressRemarks}
                  onChange={(e) => {
                    setModalProgressError(null);
                    setProgressRemarks(e.target.value);
                  }}
                  required
                  className="w-full p-3 bg-white border-2 border-[#E2D7CB] rounded-2xl text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForProgress(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateProgressSubmit}
                className="bg-[#48A63E] hover:bg-[#3D9134] px-5 py-2 rounded-xl text-xs font-extrabold text-white shadow-md shadow-[#48A63E]/20"
              >
                Update Build Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Staff Profile & Password Update Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                {(userProfile?.full_name || 'Production Lead').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Production Staff Profile</h3>
                <p className="text-xs text-[#7A6C5E] font-medium">Manage account security and view assigned credentials</p>
              </div>
            </div>

            {/* General Info */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#6B5C4D] mb-1">Full Name</label>
                <input
                  type="text"
                  readOnly
                  value={userProfile?.full_name || 'Production Staff Member'}
                  className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#EAE0D4] text-[#2C241D] font-extrabold cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#6B5C4D]">Email Address (Locked)</label>
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setActiveTab('queries');
                    }}
                    className="text-[10px] font-bold text-[#48A63E] hover:underline flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" /> Request Email Change →
                  </button>
                </div>
                <input
                  type="email"
                  readOnly
                  value={userProfile?.email || 'production.staff@retailsphere.com'}
                  className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#EAE0D4] text-[#2C241D] font-extrabold cursor-not-allowed"
                />
                <p className="text-[10px] text-amber-800 font-bold mt-1">
                  🔒 Email modification is restricted. Submit an official request in the Queries section to change email.
                </p>
              </div>
            </div>

            {/* Password Update Provision */}
            <div className="border-t border-[#E2D7CB] pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#48A63E]" />
                <h4 className="font-extrabold text-sm text-[#2C241D]">Update Password</h4>
              </div>

              {passwordNotice && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${passwordNotice.type === 'success' ? 'bg-[#48A63E]/15 text-[#3D9134] border border-[#48A63E]/30' : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                  {passwordNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                  <span>{passwordNotice.text}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">

                <div>
                  <label className="block font-bold text-[#6B5C4D] mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#6B5C4D] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1]"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE COUPON PROVISION */}
      {isAddCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A140E]/75 backdrop-blur-md">
          <div className="bg-[#FAF7F2] rounded-[2.2rem] p-6 sm:p-7 w-full max-w-lg shadow-2xl border-2 border-[#D8CCBD] space-y-4 animate-fadeIn max-h-[90vh] overflow-y-auto text-[#2C241D]">
            <div className="flex items-center justify-between border-b-2 border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#1A140E]">Create Custom Furniture Coupon</h3>
                <p className="text-xs font-medium text-[#7A6C5E]">Configure First N customer payment limits or VIP targeted customer special offers.</p>
              </div>
              <button
                onClick={() => setIsAddCouponModalOpen(false)}
                className="p-2 text-[#4A3E32] hover:text-[#1A140E] rounded-xl hover:bg-[#EFE7DE] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCouponSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Coupon Promo Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. BESPOKE15 or VIPPROD20"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-mono font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Discount Percentage (%) *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Offer Description</label>
                <input
                  type="text"
                  placeholder="e.g. 15% Off Custom Bespoke Furniture Orders (First 10 Customers)"
                  value={newCouponDescription}
                  onChange={(e) => setNewCouponDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#7A6C5E] text-xs mb-1">Target Audience & Category</label>
                <select
                  value={newCouponAudience}
                  onChange={(e) => setNewCouponAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="production">Production & Custom Furniture Customers Only</option>
                  <option value="retail">Retail Readymade Customers Only</option>
                  <option value="all">All RetailSphere Customers</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-[#E2D7CB]">
                <div>
                  <label className="block font-bold text-[#2C241D] text-xs mb-1">First N Payment Limit</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 10"
                    value={newCouponCustomerLimit}
                    onChange={(e) => setNewCouponCustomerLimit(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                  />
                  <p className="text-[10px] text-[#7A6C5E] mt-1 font-medium">Caps redemptions to first N paying customers.</p>
                </div>

                <div>
                  <label className="block font-bold text-[#2C241D] text-xs mb-1">Target VIP Customer Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. vip.customer@gmail.com"
                    value={newCouponTargetEmail}
                    onChange={(e) => setNewCouponTargetEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-mono text-xs font-bold focus:outline-none focus:border-[#48A63E]"
                  />
                  <p className="text-[10px] text-[#7A6C5E] mt-1 font-medium">Dispatches email + notification to specific VIP.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prod-auto-allot-check"
                  checked={newCouponAutoAllot}
                  onChange={(e) => setNewCouponAutoAllot(e.target.checked)}
                  className="w-4 h-4 accent-[#48A63E] rounded cursor-pointer"
                />
                <label htmlFor="prod-auto-allot-check" className="text-[11px] font-bold text-[#2C241D] cursor-pointer">
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

      {/* TECHNICAL ASSESSMENT & PRICING ESTIMATION MODAL */}
      {selectedAssessmentRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A140E]/75 backdrop-blur-md">
          <div className="bg-[#FAF7F2] rounded-[2.2rem] p-6 sm:p-7 w-full max-w-3xl shadow-2xl border-2 border-[#D8CCBD] space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto text-[#2C241D]">
            <div className="flex items-center justify-between border-b-2 border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#48A63E]/15 text-[#48A63E] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A140E]">Technical Assessment & Pricing Estimation</h3>
                  <p className="text-xs font-semibold text-[#7A6C5E]">
                    Request <span className="font-mono text-[#48A63E]">{selectedAssessmentRequest.request_id}</span> • Customer: {selectedAssessmentRequest.customer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAssessmentRequest(null)}
                className="p-2 text-[#4A3E32] hover:text-[#1A140E] rounded-xl hover:bg-[#EFE7DE] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary Banner */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-[#EFE7DE] pb-2">
                <span className="font-black text-sm text-[#2C241D]">{selectedAssessmentRequest.title}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(selectedAssessmentRequest.order_status === 'CUSTOMER_APPROVED' || selectedAssessmentRequest.order_status === 'Approved' || selectedAssessmentRequest.order_status === 'PAID' || selectedAssessmentRequest.order_status === 'Paid' || selectedAssessmentRequest.payment_status === 'Paid') && (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ CUSTOMER APPROVED
                    </span>
                  )}
                  {(selectedAssessmentRequest.order_status === 'QUOTATION_READY' || selectedAssessmentRequest.order_status === 'QUOTED' || selectedAssessmentRequest.order_status === 'Quote Provided') && (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      QUOTATION PUBLISHED
                    </span>
                  )}
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    selectedAssessmentRequest.priority === 'HIGH' || selectedAssessmentRequest.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedAssessmentRequest.priority} PRIORITY
                  </span>
                </div>
              </div>
              {(selectedAssessmentRequest.order_type === 'On-Site Service' || selectedAssessmentRequest.order_type === 'Service' || selectedAssessmentRequest.request_id?.startsWith('ONS-') || selectedAssessmentRequest.request_id?.startsWith('SRV-') || selectedAssessmentRequest.request_id?.startsWith('OSR-')) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#5C4E42] font-semibold">
                  <div><span className="text-[#7A6C5E]">Location:</span> {selectedAssessmentRequest.dimensions}</div>
                  <div><span className="text-[#7A6C5E]">City / Postal:</span> {selectedAssessmentRequest.material}</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[#5C4E42] font-semibold">
                  <div><span className="text-[#7A6C5E]">Dimensions:</span> {selectedAssessmentRequest.dimensions}</div>
                  <div><span className="text-[#7A6C5E]">Material:</span> {selectedAssessmentRequest.material}</div>
                  {selectedAssessmentRequest.color && (
                    <div><span className="text-[#7A6C5E]">Color/Finish:</span> <span className="text-[#38A132]">{selectedAssessmentRequest.color}</span></div>
                  )}
                </div>
              )}
              {selectedAssessmentRequest.description && (
                <p className="text-[11px] text-[#7A6C5E] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] italic">
                  "{selectedAssessmentRequest.description}"
                </p>
              )}
            </div>

            <form onSubmit={handleSaveAssessmentSubmit} className="space-y-4 text-xs font-semibold">
              {/* Feasibility Selection */}
              <div className="space-y-2 bg-white p-4 rounded-2xl border border-[#E2D7CB]">
                <label className="block font-extrabold text-[#2C241D] text-xs">Technical Feasibility Check</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="feasibility"
                      value="FEASIBLE"
                      checked={assFeasibility === 'FEASIBLE'}
                      onChange={() => setAssFeasibility('FEASIBLE')}
                      className="accent-[#48A63E]"
                    />
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      ✓ Feasible & Buildable
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="feasibility"
                      value="NOT_FEASIBLE"
                      checked={assFeasibility === 'NOT_FEASIBLE'}
                      onChange={() => setAssFeasibility('NOT_FEASIBLE')}
                      className="accent-rose-600"
                    />
                    <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      ✗ Not Feasible
                    </span>
                  </label>
                </div>
                {assFeasibility === 'NOT_FEASIBLE' && (
                  <input
                    type="text"
                    placeholder="Reason why request is unfeasible..."
                    value={assUnfeasibilityReason}
                    onChange={(e) => setAssUnfeasibilityReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs mt-2 focus:outline-none"
                    required
                  />
                )}
              </div>

              {/* Manufacturing Operations & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-[#E2D7CB]">
                <div>
                  <label className="block font-extrabold text-[#7A6C5E] mb-1">Required Operations</label>
                  <input
                    type="text"
                    value={assOperations}
                    onChange={(e) => setAssOperations(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2D7CB] rounded-xl text-xs focus:outline-none focus:border-[#48A63E]"
                    placeholder="e.g. Cutting, Shaping, Sanding, Polishing"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-[#7A6C5E] mb-1">Material Requirements</label>
                  <input
                    type="text"
                    value={assMaterialReq}
                    onChange={(e) => setAssMaterialReq(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2D7CB] rounded-xl text-xs focus:outline-none focus:border-[#48A63E]"
                    placeholder="e.g. Teak Timber Planks 150x50mm"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-[#7A6C5E] mb-1">Labour Hours</label>
                  <input
                    type="number"
                    value={assLabourHours}
                    onChange={(e) => setAssLabourHours(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2D7CB] rounded-xl text-xs focus:outline-none focus:border-[#48A63E]"
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-[#7A6C5E] mb-1">Estimated Duration (Days)</label>
                  <input
                    type="number"
                    value={assDurationDays}
                    onChange={(e) => setAssDurationDays(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2D7CB] rounded-xl text-xs focus:outline-none focus:border-[#48A63E]"
                  />
                </div>
              </div>

              {/* Cost Breakdown & Estimated Amount */}
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border-2 border-[#E2D7CB] space-y-3">
                <h4 className="font-extrabold text-xs text-[#2C241D] uppercase tracking-wider flex items-center justify-between">
                  <span>Pricing & Cost Estimation Breakdown</span>
                  <span className="text-[#38A132] font-black text-sm">
                    Calculated Total: ₹{((Number(assMatCost)||0) + (Number(assLabCost)||0) + (Number(assMacCost)||0) + (Number(assFinCost)||0) + (Number(assOthCost)||0)).toLocaleString('en-IN')}
                  </span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A6C5E]">Material (₹)</label>
                    <input
                      type="number"
                      value={assMatCost}
                      onChange={(e) => setAssMatCost(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A6C5E]">Labour (₹)</label>
                    <input
                      type="number"
                      value={assLabCost}
                      onChange={(e) => setAssLabCost(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A6C5E]">Machine (₹)</label>
                    <input
                      type="number"
                      value={assMacCost}
                      onChange={(e) => setAssMacCost(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#7A6C5E]">Finishing (₹)</label>
                    <input
                      type="number"
                      value={assFinCost}
                      onChange={(e) => setAssFinCost(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                    />
                    <select
                      value={assFinType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAssFinType(val);
                        if (val.includes('PU High Gloss')) setAssFinCost('3500');
                        else if (val.includes('Italian Satin')) setAssFinCost('4000');
                        else if (val.includes('Natural Matte Wax')) setAssFinCost('2500');
                        else if (val.includes('Walnut Dark Grain')) setAssFinCost('2800');
                        else if (val.includes('Oiled & Hand-Rubbed')) setAssFinCost('2200');
                        else if (val.includes('Powder Coated')) setAssFinCost('3000');
                        else if (val.includes('Raw Sanded')) setAssFinCost('0');
                      }}
                      className="w-full text-[10px] py-1 px-1 bg-white border border-[#E2D7CB] rounded-lg font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E] cursor-pointer"
                      title="Select Finishing Coating Type"
                    >
                      <option value="Natural Matte Wax (Cream White)">🌿 Natural Matte Wax</option>
                      <option value="PU High Gloss Clear Coat">✨ PU High Gloss Clear</option>
                      <option value="Italian Satin Polyurethane Lacquer">🛋️ Italian Satin Lacquer</option>
                      <option value="Walnut Dark Grain Stain & Varnish">🪵 Walnut Dark Stain</option>
                      <option value="Oiled & Hand-Rubbed Organic Polish">🪔 Oiled Organic Polish</option>
                      <option value="Powder Coated Matte Finish">⚡ Powder Coated Finish</option>
                      <option value="Custom Fabric Protectant / Nano-Coat">🧵 Fabric Nano-Protect</option>
                      <option value="Raw Sanded & Unfinished">🪵 Raw Sanded Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A6C5E]">Overhead (₹)</label>
                    <input
                      type="number"
                      value={assOthCost}
                      onChange={(e) => setAssOthCost(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#48A63E]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#7A6C5E] mb-1">Production Notes & Instructions</label>
                <textarea
                  value={assProdNotes}
                  onChange={(e) => setAssProdNotes(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white text-xs focus:outline-none focus:border-[#48A63E]"
                  placeholder="Special instructions for artisans, quality tolerances..."
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button
                  type="button"
                  onClick={() => setSelectedAssessmentRequest(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4]"
                >
                  Cancel
                </button>
                {(() => {
                  const isApprovedOrPaid = Boolean(
                    selectedAssessmentRequest.order_status === 'CUSTOMER_APPROVED' ||
                    selectedAssessmentRequest.order_status === 'Approved' ||
                    selectedAssessmentRequest.order_status === 'PAID' ||
                    selectedAssessmentRequest.order_status === 'Paid' ||
                    selectedAssessmentRequest.payment_status === 'Paid'
                  );
                  const isQuoteReady = Boolean(
                    selectedAssessmentRequest.is_assessed ||
                    selectedAssessmentRequest.assessment_status === 'ASSESSMENT_COMPLETE' ||
                    selectedAssessmentRequest.order_status === 'Quote Provided' ||
                    selectedAssessmentRequest.order_status === 'QUOTATION_READY' ||
                    selectedAssessmentRequest.order_status === 'QUOTED'
                  );

                  if (isApprovedOrPaid) {
                    return (
                      <button
                        type="submit"
                        disabled={isSubmittingAssessment}
                        className="px-5 py-2.5 rounded-xl bg-[#2D6338] hover:bg-[#23502C] text-white font-extrabold text-xs shadow-md shadow-[#2D6338]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>{isSubmittingAssessment ? 'Updating Production Plan...' : '✓ Customer Approved: Update Assessment & Plan →'}</span>
                      </button>
                    );
                  }

                  if (isQuoteReady) {
                    return (
                      <button
                        type="submit"
                        disabled={isSubmittingAssessment}
                        className="px-5 py-2.5 rounded-xl bg-[#2C241D] hover:bg-[#1A1410] text-white font-extrabold text-xs shadow-md shadow-[#2C241D]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Edit3 className="w-4 h-4 text-amber-400" />
                        <span>{isSubmittingAssessment ? 'Re-Publishing Quotation...' : 'Update & Re-Publish Customer Quotation →'}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      type="submit"
                      disabled={isSubmittingAssessment}
                      className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>{isSubmittingAssessment ? 'Publishing Quotation...' : 'Submit Assessment & Publish Customer Quotation →'}</span>
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG RAW MATERIAL RECEIPT */}
      {isMaterialReceiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A140E]/75 backdrop-blur-md">
          <div className="bg-[#FAF7F2] rounded-[2.2rem] p-6 sm:p-7 w-full max-w-lg shadow-2xl border-2 border-[#D8CCBD] space-y-4 animate-fadeIn text-[#2C241D] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A140E]">Log Raw Material Receipt</h3>
                  <p className="text-xs font-semibold text-[#7A6C5E]">
                    {selectedMaterialOrder ? (
                      <>
                        Order <span className="font-mono text-[#48A63E]">
                          {selectedMaterialOrder.request_id || `CUS-${(selectedMaterialOrder.custom_order_id || selectedMaterialOrder.numeric_id)?.toString().padStart(4, '0')}`}
                        </span> • {selectedMaterialOrder.furniture_type || selectedMaterialOrder.title || 'Production Order'}
                      </>
                    ) : (
                      'Log customer-owned materials delivered to workshop'
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsMaterialReceiptModalOpen(false);
                  setSelectedMaterialOrder(null);
                }}
                className="p-2 text-[#4A3E32] hover:text-[#1A140E] rounded-xl hover:bg-[#EFE7DE] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Order / Request dropdown */}
            <div>
              <label className="block font-extrabold text-[#7A6C5E] text-xs mb-1.5">Associated Customer Order / Request *</label>
              <select
                value={
                  selectedMaterialOrder
                    ? `${selectedMaterialOrder.order_type || 'Custom'}-${selectedMaterialOrder.custom_order_id || selectedMaterialOrder.numeric_id}`
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setSelectedMaterialOrder(null);
                    return;
                  }
                  const [type, idStr] = val.split('-');
                  const numId = Number(idStr);
                  const foundQueue = assessmentQueue.find(q => (q.order_type === type || (type === 'Custom' && q.order_type === 'Customization')) && q.numeric_id === numId);
                  const foundOrder = orders.find(o => o.custom_order_id === numId);
                  setSelectedMaterialOrder(foundQueue || foundOrder || null);
                }}
                className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold focus:outline-none focus:border-[#48A63E] cursor-pointer"
              >
                <option value="">-- Choose Order / Fabrication Request --</option>
                {assessmentQueue.map(q => (
                  <option key={`${q.order_type}-${q.numeric_id}`} value={`${q.order_type === 'Customization' ? 'Custom' : q.order_type}-${q.numeric_id}`}>
                    {q.request_id} • {q.title || q.furniture_type} ({q.customer_name})
                  </option>
                ))}
                {orders.filter(o => !assessmentQueue.some(q => q.numeric_id === o.custom_order_id)).map(ord => (
                  <option key={`Custom-${ord.custom_order_id}`} value={`Custom-${ord.custom_order_id}`}>
                    CUS-{ord.custom_order_id.toString().padStart(4, '0')} • {ord.furniture_type} ({ord.customer_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Item Details Banner */}
            {selectedMaterialOrder && (
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1 text-xs animate-fadeIn">
                <div className="flex justify-between font-bold text-[#2C241D]">
                  <span>Material: {selectedMaterialOrder.material || 'Solid Wood / Fabric'}</span>
                  <span>Dimensions: {selectedMaterialOrder.dimensions || 'Standard'}</span>
                </div>
                <p className="text-[11px] text-[#7A6C5E] font-medium">Customer: {selectedMaterialOrder.customer_name || 'Valued Customer'}</p>
              </div>
            )}

            <form onSubmit={handleMaterialReceiptSubmit} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block font-extrabold text-[#7A6C5E] mb-1">Received Material Quality & Condition</label>
                <select
                  value={matCondition}
                  onChange={(e) => setMatCondition(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold focus:outline-none focus:border-[#48A63E]"
                >
                  <option value="Good">✓ Good Condition (Verified & Inspected)</option>
                  <option value="Minor Defects">⚠️ Minor Defects / Scratches Noted</option>
                  <option value="Requires Drying/Treatment">🪵 Needs Kiln Drying / Moisture Treatment</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#7A6C5E] mb-1">Received Quantity</label>
                  <input
                    type="number"
                    value={matQty}
                    onChange={(e) => setMatQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold focus:outline-none focus:border-[#48A63E]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-[#7A6C5E] mb-1">Unit of Measure</label>
                  <select
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold focus:outline-none focus:border-[#48A63E]"
                  >
                    <option value="pieces">Pieces / Planks</option>
                    <option value="sqft">Sq. Feet (Fabric/Leather)</option>
                    <option value="kg">Kilograms (Hardwood)</option>
                    <option value="sets">Complete Sets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#7A6C5E] mb-1">Inspection & Warehouse Receipt Notes</label>
                <textarea
                  value={matNotes}
                  onChange={(e) => setMatNotes(e.target.value)}
                  rows={3}
                  placeholder="Note timber moisture level, grain pattern, delivery batch reference..."
                  className="w-full p-3 bg-white border border-[#E2D7CB] rounded-xl text-xs focus:outline-none focus:border-[#48A63E]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button
                  type="button"
                  onClick={() => {
                    setIsMaterialReceiptModalOpen(false);
                    setSelectedMaterialOrder(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceipt}
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{isSubmittingReceipt ? 'Recording Receipt...' : 'Confirm Raw Material Receipt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 1: FABRICATION JOB DETAILS MODAL */}
      {selectedFabJobModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-800 border border-amber-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-lg border border-[#48A63E]/20">
                      {selectedFabJobModal.fabrication_id}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-[#7A6C5E]">
                      Ref: {selectedFabJobModal.order_id}
                    </span>
                  </div>
                  <h3 className="font-black text-base text-[#2C241D] mt-0.5">{selectedFabJobModal.product_name}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedFabJobModal(null)}
                className="p-1.5 rounded-xl bg-white border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#EAE0D4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product & Material Overview */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#E2D7CB] shadow-xs">
              {selectedFabJobModal.product_thumbnail ? (
                <img
                  src={selectedFabJobModal.product_thumbnail}
                  alt={selectedFabJobModal.product_name}
                  className="w-20 h-20 rounded-xl object-cover border border-[#E2D7CB] shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <Wrench className="w-8 h-8 text-amber-700" />
                </div>
              )}
              <div className="space-y-1.5 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#7A6C5E]">Quantity:</span>
                  <span className="font-extrabold text-[#2C241D]">{selectedFabJobModal.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#7A6C5E]">Priority:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${
                    selectedFabJobModal.priority === 'High' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                    selectedFabJobModal.priority === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                  }`}>
                    {selectedFabJobModal.priority} Priority
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#7A6C5E]">Current Status:</span>
                  <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    {selectedFabJobModal.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Inbound Material Pickup Logistics Box */}
            {selectedFabJobModal.needs_pickup && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-800" />
                    <h4 className="font-black text-[#2C241D] uppercase tracking-wider text-[11px]">
                      Inbound Material Pickup Logistics
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                    selectedFabJobModal.is_pickup_completed
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-200 text-amber-950 border border-amber-400'
                  }`}>
                    {selectedFabJobModal.is_pickup_completed ? 'Material at Workshop Hub' : selectedFabJobModal.pickup_status || 'Pickup Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5C4E42]">
                  <div>
                    <span className="text-[#7A6C5E] font-bold block">Assigned Carrier Partner:</span>
                    <strong className="text-[#2C241D]">{selectedFabJobModal.pickup_carrier || 'None Allotted Yet'}</strong>
                  </div>
                  <div>
                    <span className="text-[#7A6C5E] font-bold block">Arrival Mode:</span>
                    <strong className="text-[#2C241D]">{selectedFabJobModal.material_arrival_mode || 'Doorstep Pickup'}</strong>
                  </div>
                </div>

                {!selectedFabJobModal.is_pickup_completed && (
                  <div className="pt-2 border-t border-amber-200/80 space-y-2">
                    {!selectedFabJobModal.pickup_carrier && (
                      <div className="text-[11px] text-amber-900 bg-amber-100/80 p-2 rounded-xl border border-amber-300 flex items-center gap-2 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Carrier partner or internal driver must be assigned first before marking material as received at the workshop.</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenAssignCarrierModal(selectedFabJobModal.numeric_id, selectedFabJobModal.product_name, selectedFabJobModal.pickup_carrier)}
                        className={`px-3.5 py-1.5 rounded-xl font-extrabold text-[11px] cursor-pointer flex items-center gap-1.5 shadow-xs transition-all ${
                          !selectedFabJobModal.pickup_carrier
                            ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                            : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{selectedFabJobModal.pickup_carrier ? 'Re-assign Carrier / Driver' : 'Assign Carrier Partner (Required)'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={!selectedFabJobModal.pickup_carrier}
                        onClick={() => handleMarkMaterialReceived(selectedFabJobModal.numeric_id)}
                        className={`px-3.5 py-1.5 rounded-xl font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition-all ${
                          !selectedFabJobModal.pickup_carrier
                            ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75'
                            : 'bg-[#38A132] hover:bg-[#2F8829] text-white cursor-pointer'
                        }`}
                        title={!selectedFabJobModal.pickup_carrier ? 'Assign a carrier partner or internal fleet driver first' : 'Confirm material received at workshop'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Material Received at Workshop</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Production Specifications */}
            <div className="space-y-2.5 text-xs p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]">
              <h4 className="font-black text-[#2C241D] uppercase tracking-wider text-[11px]">Shop Floor Specifications</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Material Required</span>
                  <span className="font-extrabold text-[#2C241D] block">{selectedFabJobModal.material_required}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Assigned Fabrication Team</span>
                  <span className="font-extrabold text-[#48A63E] flex items-center gap-1 block">
                    <Users className="w-3.5 h-3.5" />
                    {selectedFabJobModal.assigned_team}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Target Completion Date</span>
                  <span className="font-mono font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                    {selectedFabJobModal.expected_completion_date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Current Progress</span>
                  <span className="font-mono font-black text-[#48A63E]">{selectedFabJobModal.progress_percentage}% Completed</span>
                </div>
              </div>
            </div>

            {/* Procedural Checklist Breakdown */}
            {(() => {
              const fabSections = getStageSections(selectedFabJobModal.service_type || 'Wood Cutting', selectedFabJobModal.service_type || 'Wood Cutting');
              const currentProgress = selectedFabJobModal.progress_percentage || 0;
              return (
                <div className="p-4 rounded-2xl bg-white border border-[#E2D7CB] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-[#2C241D] flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#38A132]" />
                      <span>Procedural Step Progress ({currentProgress}%):</span>
                    </label>
                    <span className="font-mono font-extrabold text-xs text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-0.5 rounded-lg border border-[#48A63E]/20">
                      {currentProgress >= 100 ? 'Completed' : currentProgress > 0 ? `${currentProgress}% Done` : 'Ready to Start'}
                    </span>
                  </div>

                  <div className="w-full bg-[#E2D7CB] rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#38A132] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {fabSections.map((sec, sIdx) => {
                      const isDone = currentProgress >= (sIdx + 1) * 25;
                      return (
                        <div
                          key={sec.id}
                          className={`p-2 rounded-xl text-[10px] font-bold border flex items-center gap-1.5 ${
                            isDone ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-[#FAF7F2] text-[#7A6C5E] border-[#E2D7CB]'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${
                            isDone ? 'bg-[#38A132] text-white' : 'bg-[#E2D7CB] text-[#5C4E42]'
                          }`}>
                            {isDone ? '✓' : sIdx + 1}
                          </span>
                          <span className="truncate">{sec.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
              <button
                onClick={() => setSelectedFabJobModal(null)}
                className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 cursor-pointer"
              >
                Done / Save Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: APPROVED ON-SITE REQUEST DETAILS MODAL */}
      {selectedOnsiteRequestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[120] animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#48A63E]/10 text-[#48A63E] border border-[#48A63E]/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded-lg border border-[#48A63E]/20">
                      {selectedOnsiteRequestModal.request_id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Retail Staff Approved
                    </span>
                  </div>
                  <h3 className="font-black text-base text-[#2C241D] mt-0.5">Approved On-Site Request Details</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedOnsiteRequestModal(null)}
                className="p-1.5 rounded-xl bg-white border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#EAE0D4]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Store & Request Highlights */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2D7CB] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2">
                <h4 className="font-black text-sm text-[#2C241D] flex items-center gap-2">
                  <span className="text-[#48A63E]">🏪</span>
                  <span>{selectedOnsiteRequestModal.store_name}</span>
                </h4>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase ${
                  selectedOnsiteRequestModal.priority === 'High' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                  selectedOnsiteRequestModal.priority === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}>
                  {selectedOnsiteRequestModal.priority} Priority
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Store Location Address</span>
                  <span className="font-extrabold text-[#2C241D]">{selectedOnsiteRequestModal.store_location || 'Central Retail Branch'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Store Manager Contact</span>
                  <span className="font-extrabold text-[#48A63E]">{selectedOnsiteRequestModal.store_contact || 'Branch Staff'}</span>
                </div>
              </div>
            </div>

            {/* Product & Installation Requirements */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-3 text-xs">
              <h4 className="font-black text-[#2C241D] uppercase tracking-wider text-[11px]">Production & On-Site Installation Spec</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Product Requested</span>
                  <span className="font-extrabold text-[#2C241D]">{selectedOnsiteRequestModal.product_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Requested Quantity</span>
                  <span className="font-extrabold text-[#2C241D]">{selectedOnsiteRequestModal.requested_quantity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Retail Approval Date</span>
                  <span className="font-extrabold text-[#2C241D]">{selectedOnsiteRequestModal.request_date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Required Installation Date</span>
                  <span className="font-mono font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                    {selectedOnsiteRequestModal.required_installation_date}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Assigned Production Team</span>
                  <span className="font-extrabold text-[#48A63E]">{selectedOnsiteRequestModal.assigned_production_team}</span>
                </div>
              </div>

              {selectedOnsiteRequestModal.special_instructions && (
                <div className="pt-2 border-t border-[#E2D7CB]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Special Site Instructions</span>
                  <p className="font-medium text-[#2C241D] bg-white p-2.5 rounded-xl border border-[#E2D7CB] mt-1 leading-relaxed">
                    {selectedOnsiteRequestModal.special_instructions}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2D7CB]">
              <button
                onClick={() => setSelectedOnsiteRequestModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4]"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedOnsiteRequestModal.production_status !== 'In Production' && (
                  <button
                    onClick={() => {
                      handleMarkOnsiteInProduction(selectedOnsiteRequestModal.request_id);
                      setSelectedOnsiteRequestModal((prev: any) => prev ? ({ ...prev, production_status: 'In Production' }) : null);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Mark In Production</span>
                  </button>
                )}

                {selectedOnsiteRequestModal.production_status !== 'Ready for Dispatch' && (
                  <button
                    onClick={() => {
                      handleMarkOnsiteReadyForDispatch(selectedOnsiteRequestModal.request_id);
                      setSelectedOnsiteRequestModal((prev: any) => prev ? ({ ...prev, production_status: 'Ready for Dispatch' }) : null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Ready for Dispatch</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: UNIVERSAL WORKER ASSIGNMENT MODAL */}
      {assignWorkerModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[130] animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-700 border border-blue-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                    {assignWorkerModalData.type === 'custom' ? 'Customization Order' :
                     assignWorkerModalData.type === 'fabrication' ? 'Fabrication Work' : 'On-Site Field Job'}
                  </span>
                  <h3 className="font-black text-base text-[#2C241D] mt-0.5">
                    Assign Artisan / Worker
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setAssignWorkerModalData(null)}
                disabled={isAssigningWorker}
                className="p-1.5 rounded-xl bg-white border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#EAE0D4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task Info Summary */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E2D7CB] text-xs space-y-1">
              <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Task Reference</span>
              <p className="font-black text-[#2C241D] text-sm truncate">
                {assignWorkerModalData.title}
              </p>
              <p className="text-[11px] font-bold text-[#38A132]">
                Ref ID: #{assignWorkerModalData.id}
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmAssignWorker();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block mb-1.5">
                  Select Skilled Workshop Artisan
                </span>
                {(() => {
                  const activeWorkers = workers.filter((w) => w.status === true || w.status === 'Active' || w.status === 'active' || String(w.status) === 'true' || String(w.status) === '1');
                  const sorted = [...activeWorkers].sort((a, b) => {
                    const loadA = getWorkerLiveWorkload(a.worker_id).total;
                    const loadB = getWorkerLiveWorkload(b.worker_id).total;
                    return loadA - loadB;
                  });
                  const recommendedId = sorted.length > 0 ? sorted[0].worker_id : null;

                  return (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block font-black text-[#2C241D]">
                          Artisan Specialist <span className="text-rose-500">*</span>
                        </label>
                        {recommendedId && (
                          <span className="text-[10px] font-black text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                            AI Workload Balancing
                          </span>
                        )}
                      </div>

                      <select
                        value={assignModalWorkerId}
                        onChange={(e) => setAssignModalWorkerId(Number(e.target.value) || '')}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2D7CB] text-[#2C241D] font-bold focus:outline-none focus:ring-2 focus:ring-[#38A132] shadow-2xs"
                      >
                        <option value="">-- Choose Artisan from Database --</option>
                        {activeWorkers.map((w) => {
                          const isRec = w.worker_id === recommendedId;
                          const load = getWorkerLiveWorkload(w.worker_id).total;
                          return (
                            <option key={w.worker_id} value={w.worker_id}>
                              {isRec ? '⭐ [AI RECOMMENDED] ' : ''}{w.full_name} — {w.specialization || 'Artisan'} ({load} active tasks)
                            </option>
                          );
                        })}
                      </select>
                    </>
                  );
                })()}
              </div>

              {/* Selected Worker Details Preview */}
              {assignModalWorkerId && (() => {
                const sel = workers.find((w) => w.worker_id === Number(assignModalWorkerId));
                if (!sel) return null;
                const activeWorkers = workers.filter((w) => w.status === true || w.status === 'Active' || w.status === 'active' || String(w.status) === 'true' || String(w.status) === '1');
                const sorted = [...activeWorkers].sort((a, b) => {
                  const loadA = getWorkerLiveWorkload(a.worker_id).total;
                  const loadB = getWorkerLiveWorkload(b.worker_id).total;
                  return loadA - loadB;
                });
                const isRec = sorted.length > 0 && sorted[0].worker_id === sel.worker_id;

                return (
                  <div className={`p-3.5 rounded-2xl border space-y-1.5 text-xs transition-all ${isRec ? 'bg-gradient-to-r from-amber-50 to-emerald-50 border-amber-300 shadow-sm' : 'bg-[#FAF7F2] border-[#E2D7CB]'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-extrabold text-[#2C241D] flex items-center gap-1.5 text-sm">
                        <span>👷 {sel.full_name}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isRec && (
                          <span className="text-[10px] font-black uppercase bg-amber-400 text-stone-950 px-2.5 py-0.5 rounded-full shadow-xs">
                            ✨ AI Decision Match
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          {sel.specialization || 'Production Artisan'}
                        </span>
                      </div>
                    </div>
                    {sel.phone && <p className="text-[11px] text-[#5C4E42]">📞 Contact: <strong className="font-mono text-[#2C241D]">{sel.phone}</strong></p>}
                    <p className="text-[11px] text-[#7A6C5E]">✉️ Email: {sel.email}</p>
                    {isRec && (
                      <p className="text-[10px] font-bold text-amber-800 pt-1 border-t border-amber-200/60">
                        ⚡ Optimal artisan selected based on lowest active workload and department availability.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block font-bold text-[#5C4E42] mb-1">
                  Assignment Notes / Shop Floor Instructions (Optional)
                </label>
                <textarea
                  value={assignModalNotes}
                  onChange={(e) => setAssignModalNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Prioritize moisture calibration before dimension cutting..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2D7CB] text-[#2C241D] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#38A132]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAssignWorkerModalData(null)}
                  disabled={isAssigningWorker}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!assignModalWorkerId || isAssigningWorker}
                  className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isAssigningWorker ? 'Saving Assignment...' : 'Confirm Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DEDICATED INBOUND CARRIER PARTNER ALLOTMENT MODAL */}
      {assignCarrierModalData && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#D8CCBD] rounded-[2rem] p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                  <Truck className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#2C241D]">
                    Assign Carrier Partner
                  </h3>
                  <p className="text-[11px] font-bold text-amber-800">
                    Customer Doorstep Material Pickup
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignCarrierModalData(null)}
                disabled={isAssigningCarrier}
                className="p-1.5 rounded-xl bg-white border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#EAE0D4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Task Info Summary */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E2D7CB] text-xs space-y-1 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">Fabrication Work Reference</span>
                <span className="font-mono text-[11px] font-extrabold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-300">
                  Job #{assignCarrierModalData.fabricationId}
                </span>
              </div>
              <p className="font-black text-[#2C241D] text-sm truncate">
                {assignCarrierModalData.title}
              </p>
              <p className="text-[11px] text-[#7A6C5E] font-semibold pt-0.5 flex items-center gap-1">
                <span>📍 Service:</span>
                <strong className="text-[#2C241D]">Doorstep Material Pickup from Customer</strong>
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmAssignCarrier();
              }}
              className="space-y-4 text-xs"
            >
              {/* Provider Mode Switch: 2 Channels Only */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase tracking-wider mb-2">
                  Select Transportation Channel
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCarrierModalType('CARRIER_PARTNER')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      carrierModalType === 'CARRIER_PARTNER'
                        ? 'bg-[#38A132] text-white border-[#38A132] shadow-sm font-extrabold'
                        : 'bg-white text-[#5C4E42] border-[#E2D7CB] hover:bg-[#F5ECE1] font-bold'
                    }`}
                  >
                    <span className="text-base">🏢</span>
                    <span className="text-xs">3PL Carrier Partner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCarrierModalType('INTERNAL_FLEET')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      carrierModalType === 'INTERNAL_FLEET'
                        ? 'bg-[#38A132] text-white border-[#38A132] shadow-sm font-extrabold'
                        : 'bg-white text-[#5C4E42] border-[#E2D7CB] hover:bg-[#F5ECE1] font-bold'
                    }`}
                  >
                    <span className="text-base">🚚</span>
                    <span className="text-xs">Internal Fleet Driver</span>
                  </button>
                </div>
              </div>

              {/* 3PL Carrier Selection Cards */}
              {carrierModalType === 'CARRIER_PARTNER' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold text-[#2C241D]">
                    Available 3PL Logistics & Carrier Partners *
                  </label>
                  <div className="space-y-2">
                    {carriersList.map((c) => {
                      const isSelected = String(carrierModalPartnerId) === String(c.carrier_id);
                      const isBlueDart = c.carrier_name.toLowerCase().includes('bluedart') || c.carrier_name.toLowerCase().includes('blue dart');
                      const isDeliveryTimes = c.carrier_name.toLowerCase().includes('delivery times');
                      return (
                        <div
                          key={c.carrier_id}
                          onClick={() => setCarrierModalPartnerId(String(c.carrier_id))}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-emerald-50/90 border-[#38A132] ring-2 ring-[#38A132]/30 shadow-xs'
                              : 'bg-white border-[#E2D7CB] hover:bg-[#FBF8F4]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              isSelected ? 'bg-[#38A132] text-white' : 'bg-[#FAF7F2] text-[#7A6C5E] border border-[#E2D7CB]'
                            }`}>
                              {isBlueDart ? '🔷' : isDeliveryTimes ? '⏱️' : '📦'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-[#2C241D] text-xs truncate">
                                  {c.carrier_name}
                                </span>
                                {(isBlueDart || isDeliveryTimes) && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                    Primary Partner
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#7A6C5E] font-medium truncate">
                                📞 {c.contact_phone || '+91 98765 43210'} • Doorstep Timber Transport
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-[#38A132] bg-[#38A132]' : 'border-[#C4B5A5] bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Internal Fleet Driver Selection */}
              {carrierModalType === 'INTERNAL_FLEET' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold text-[#2C241D]">
                    Select Company Fleet Driver *
                  </label>
                  <select
                    value={carrierModalDriverId}
                    onChange={(e) => setCarrierModalDriverId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E2D7CB] text-[#2C241D] font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#38A132]"
                  >
                    <option value="">-- Choose Company Fleet Driver --</option>
                    {workers.map((w) => (
                      <option key={w.worker_id} value={w.worker_id}>
                        🚚 {w.full_name} ({w.specialization || 'Fleet Driver'}) — 📞 {w.phone || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dispatch Notes */}
              <div>
                <label className="block font-bold text-[#5C4E42] mb-1 text-[11px]">
                  Pickup Notes & Gate Instructions (Optional)
                </label>
                <textarea
                  value={carrierModalNotes}
                  onChange={(e) => setCarrierModalNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. 4 Oak timber planks (8ft x 4ft). Contact customer prior to arrival..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E2D7CB] text-[#2C241D] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#38A132]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#E2D7CB] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAssignCarrierModalData(null)}
                  disabled={isAssigningCarrier}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningCarrier}
                  className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Truck className="w-4 h-4" />
                  <span>{isAssigningCarrier ? 'Allotting Carrier...' : 'Confirm Carrier Partner Allotment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
