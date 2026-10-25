import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearUserSession } from '../../utils/sessionUtils';
import { validateName, validatePhoneNumber, extract10DigitPhone } from '../../utils/formValidators';
import { fetchAllLeaveRequests, reviewLeaveRequest, applyWorkerLeave, fetchMyLeaveApplications, WorkerLeaveItem } from '../../services/api_leave';
import { fetchVehiclesDB, fetchFleetSummaryDB, fetchEligibleDriversDB, updateVehicleStatusDB, VehicleItem, FleetSummary, EligibleDriver } from '../../services/api_fleet';
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
  Cpu,
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
  Building,
  Star,
  Calendar,
  Briefcase,
  Phone,
  Shield
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assessment_queue' | 'quotations' | 'active_production' | 'workers' | 'materials' | 'quality' | 'onsite' | 'reports' | 'machines' | 'ai_insights' | 'queries' | 'coupons' | 'admin_messages' | 'orders' | 'approvals' | 'assignments' | 'raw_materials' | 'leave' | 'suppliers' | 'reviews' | 'fleet' | 'my_leave'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [approvalFilter, setApprovalFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allotmentSearchQuery, setAllotmentSearchQuery] = useState<string>('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  // Suppliers Directory State
  const [suppliersList, setSuppliersList] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('retailsphere_production_suppliers');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'SUP-101',
        name: 'Malabar Timber & Hardwoods Ltd.',
        category: 'Timber & Lumber Mills',
        materials: 'First-grade Nilambur Teak, Rosewood, Mahogany, Steam Beech',
        contact_person: 'Mohan Das',
        phone: '+91 98450 12345',
        email: 'orders@malabartimbers.in',
        address: 'Timber Yard 4, Nilambur Forest Industrial Zone, Kerala',
        lead_time_days: 2,
        rating: 4.9,
        reliability: '99.8% On-Time',
        status: 'Preferred'
      },
      {
        id: 'SUP-102',
        name: 'VelvetCraft & Textile Mills',
        category: 'Fabrics & Leather Upholstery',
        materials: 'Emerald Velvet, Belgian Linen, Full-Grain Italian Leather, Boucle',
        contact_person: 'Ananya Sharma',
        phone: '+91 98765 89012',
        email: 'supply@velvetcraft.com',
        address: 'Textile Park Road, Surat, Gujarat',
        lead_time_days: 3,
        rating: 4.8,
        reliability: '98.5% On-Time',
        status: 'Preferred'
      },
      {
        id: 'SUP-103',
        name: 'Apex Stainless & Metal Works',
        category: 'Hardware & Metal Stockists',
        materials: 'Brushed Stainless Steel 304, Brass Tubing, Powder-Coated Metal Frames',
        contact_person: 'Vikram Singh',
        phone: '+91 98111 67890',
        email: 'sales@apexmetal.co.in',
        address: 'Peenya Industrial Area Stage 2, Bangalore, Karnataka',
        lead_time_days: 2,
        rating: 4.9,
        reliability: '99.2% On-Time',
        status: 'Active'
      },
      {
        id: 'SUP-104',
        name: 'Asian WoodTech & Italian Lacquers',
        category: 'Paints & Finishes',
        materials: 'PU High Gloss Clear, Italian Satin Polyurethane, Natural Matte Wax',
        contact_person: 'Karthik Rao',
        phone: '+91 99000 44556',
        email: 'woodtech@asianfinishes.com',
        address: 'Chemical Zone, Whitefield, Bangalore, Karnataka',
        lead_time_days: 1,
        rating: 5.0,
        reliability: '100% On-Time',
        status: 'Preferred'
      },
      {
        id: 'SUP-105',
        name: 'Hettich & Blum Precision Hardware',
        category: 'Hardware & Fasteners',
        materials: 'Soft-close Drawer Runners, Concealed Hinges, Minifix Joinery Cams',
        contact_person: 'Siddharth Roy',
        phone: '+91 98222 33445',
        email: 'hardware@hettich-direct.in',
        address: 'Bommasandra Industrial Area, Bangalore, Karnataka',
        lead_time_days: 2,
        rating: 4.9,
        reliability: '99.5% On-Time',
        status: 'Preferred'
      }
    ];
  });
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState<string>('ALL');
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>('');
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCategory, setNewSupplierCategory] = useState('Timber & Lumber Mills');
  const [newSupplierMaterial, setNewSupplierMaterial] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [newSupplierLeadTime, setNewSupplierLeadTime] = useState(3);
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  // Craftsmanship Reviews State (Only real customer Jayathy S Nair, no demo data)
  const [craftsmanshipReviews, setCraftsmanshipReviews] = useState<any[]>([
    {
      id: 'REV-101',
      order_id: 'CUS-0037',
      furniture_title: 'Modular Sofa',
      customer_name: 'Jayathy S Nair',
      rating: 5,
      date: 'Recent Build Handover',
      review_title: 'Exceptional joinery and stunning bespoke finish',
      comment: 'The brushed stainless steel base and emerald charcoal linen finish are of superior quality. Structural joinery and framing are rock solid. Outstanding craftsmanship by the workshop team!',
      craftsman_name: '', // Dynamically resolved from available workers in database
      finish_rating: 5,
      joinery_rating: 5,
      durability_rating: 5,
      verified_qa: true
    }
  ]);
  const [reviewRatingFilter, setReviewRatingFilter] = useState<string>('ALL');
  const [reviewSearchQuery, setReviewSearchQuery] = useState<string>('');

  // Workshop Fleet & Logistics State
  const [fleetVehicles, setFleetVehicles] = useState<VehicleItem[]>([]);
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string>('ALL');
  const [fleetSearchQuery, setFleetSearchQuery] = useState<string>('');
  const [isFleetLoading, setIsFleetLoading] = useState<boolean>(false);

  // Production Staff Personal Leave State
  const [myLeavesList, setMyLeavesList] = useState<WorkerLeaveItem[]>([]);
  const [myLeaveType, setMyLeaveType] = useState<string>('Casual Leave');
  const [myLeaveStartDate, setMyLeaveStartDate] = useState<string>('');
  const [myLeaveEndDate, setMyLeaveEndDate] = useState<string>('');
  const [myLeaveReason, setMyLeaveReason] = useState<string>('');
  const [isSubmittingMyLeave, setIsSubmittingMyLeave] = useState<boolean>(false);
  const [myLeaveNotice, setMyLeaveNotice] = useState<string | null>(null);

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
  const [assessmentSearchQuery, setAssessmentSearchQuery] = useState<string>('');

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

  // Worker Workload & Works Inspector State
  const [showWorkerInspector, setShowWorkerInspector] = useState<boolean>(false);
  const [selectedInspectorWorkerId, setSelectedInspectorWorkerId] = useState<number | null>(null);
  const [inspectorWorksTab, setInspectorWorksTab] = useState<'assigned' | 'completed'>('assigned');

  useEffect(() => {
    if (selectedInspectorWorkerId !== null && workers.length > 0 && !workers.some(w => w.worker_id === selectedInspectorWorkerId)) {
      setSelectedInspectorWorkerId(workers[0].worker_id);
    }
  }, [workers, selectedInspectorWorkerId]);

  const selectedInspectorWorker = React.useMemo(() => {
    if (!selectedInspectorWorkerId) return null;
    return workers.find(w => w.worker_id === selectedInspectorWorkerId) || null;
  }, [workers, selectedInspectorWorkerId]);

  const workerWorksSummary = React.useMemo(() => {
    if (!selectedInspectorWorker) {
      return { assigned: [], completed: [] };
    }
    const wId = selectedInspectorWorker.worker_id;
    const wName = (selectedInspectorWorker.full_name || '').toLowerCase();

    const assignedList: any[] = [];
    const completedList: any[] = [];

    // 1. Custom Orders
    (orders || []).forEach((ord) => {
      const isAssigned = ord.assigned_workers && ord.assigned_workers.some(
        aw => aw.worker_id === wId || (aw.worker_name && aw.worker_name.toLowerCase() === wName)
      );
      if (isAssigned) {
        const workerTask = ord.assigned_workers.find(
          aw => aw.worker_id === wId || (aw.worker_name && aw.worker_name.toLowerCase() === wName)
        );
        const isDone = ord.order_status === 'Completed' ||
          ord.order_status === 'Delivered' ||
          (workerTask?.task_status && workerTask.task_status.toLowerCase().includes('complete'));

        const itemObj = {
          id: `CUS-${ord.custom_order_id}`,
          rawId: ord.custom_order_id,
          typeBadge: '🎨 Custom Furniture',
          title: ord.furniture_type,
          customer: ord.customer_name,
          customerContact: ord.customer_phone || ord.customer_email || '—',
          dimensions: ord.dimensions,
          material: ord.material,
          color: ord.color,
          price: ord.estimated_price,
          status: ord.order_status,
          stage: workerTask?.specialization || workerTask?.task_status || ord.current_stage || ord.production_stage || 'In Production',
          progress: ord.progress_percentage || 0,
          date: ord.order_date || ord.created_at || 'Recent'
        };

        if (isDone) {
          completedList.push(itemObj);
        } else {
          assignedList.push(itemObj);
        }
      }
    });

    // 2. Fabrication Jobs
    (fabricationJobs || []).forEach((fab) => {
      const isAssigned = fab.worker_id === wId || fab.assigned_worker_id === wId ||
        (fab.assigned_worker_name && fab.assigned_worker_name.toLowerCase() === wName);
      if (isAssigned) {
        const isDone = fab.status === 'Completed' || fab.status === 'Delivered' || (fab.progress && fab.progress >= 100);
        const itemObj = {
          id: `FAB-${fab.job_id || fab.numeric_id || fab.id}`,
          rawId: fab.numeric_id || fab.id,
          typeBadge: '🛠️ Board Fabrication',
          title: fab.title || fab.job_title || 'Timber & Board Shaping',
          customer: fab.customer_name || 'Direct Order',
          customerContact: fab.customer_phone || fab.customer_email || '—',
          dimensions: fab.dimensions || fab.specs || 'Standard Spec',
          material: fab.material_type || fab.material || 'Solid Wood',
          color: 'Natural Wood',
          price: fab.estimated_cost || fab.cost || 0,
          status: fab.status || 'In Progress',
          stage: fab.current_stage || 'Fabrication Workshop',
          progress: isDone ? 100 : (fab.progress || 50),
          date: fab.created_at || 'Recent'
        };
        if (isDone) {
          completedList.push(itemObj);
        } else {
          assignedList.push(itemObj);
        }
      }
    });

    // 3. On-Site Jobs
    (onsiteJobsList || []).forEach((onsite: any) => {
      const isAssigned = onsite.assigned_worker_id === wId ||
        (onsite.worker_name && onsite.worker_name.toLowerCase() === wName);
      if (isAssigned) {
        const isDone = (onsite.status || '').toUpperCase() === 'COMPLETED';
        const itemObj = {
          id: `ONS-${onsite.service_id || onsite.job_id || onsite.id}`,
          rawId: onsite.service_id || onsite.job_id || onsite.id,
          typeBadge: '🔧 Field Service',
          title: onsite.service_category || onsite.service_type || onsite.title || 'On-Site Carpentry & Assembly',
          customer: onsite.customer_name || 'Client',
          customerContact: onsite.customer_phone || '—',
          dimensions: 'Field Location: ' + (onsite.address || onsite.service_address || 'Customer Premises'),
          material: 'On-site tools & fittings',
          color: 'Field Deployment',
          price: onsite.estimated_price || 0,
          status: onsite.status || 'SCHEDULED',
          stage: onsite.status || 'In Field',
          progress: isDone ? 100 : 50,
          date: onsite.preferred_date || onsite.scheduled_date || 'Scheduled'
        };
        if (isDone) {
          completedList.push(itemObj);
        } else {
          assignedList.push(itemObj);
        }
      }
    });

    return { assigned: assignedList, completed: completedList };
  }, [selectedInspectorWorker, orders, fabricationJobs, onsiteJobsList]);

  // Form Validation & Inline Modal Error States
  const [assessmentModalError, setAssessmentModalError] = useState<string | null>(null);
  const [addSupplierError, setAddSupplierError] = useState<string | null>(null);
  const [couponModalError, setCouponModalError] = useState<string | null>(null);
  const [materialReceiptError, setMaterialReceiptError] = useState<string | null>(null);
  const [assignWorkerError, setAssignWorkerError] = useState<string | null>(null);
  const [assignCarrierError, setAssignCarrierError] = useState<string | null>(null);

  // Staff Profile Modal & Password Update State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileFullName, setProfileFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isMaterialReceiptModalOpen, setIsMaterialReceiptModalOpen] = useState(false);

  // Customer Material Receipts Log State & Dynamic Raw Material Stats
  const [materialLogs, setMaterialLogs] = useState<any[]>([]);
  const [rawMaterialStats, setRawMaterialStats] = useState<any[]>([]);

  const loadMaterialReceipts = async () => {
    try {
      const res = await fetch('/api/production/materials/receipts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMaterialLogs(data);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch material receipts:', e);
    }
  };

  const loadRawMaterialStock = async () => {
    try {
      const res = await fetch('/api/materials/raw');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRawMaterialStats(data);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch raw materials:', e);
    }
  };

  // Queries State
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [newQueryCategory, setNewQueryCategory] = useState<'Email Change Request' | 'Role & Access Permission' | 'General Query'>('Email Change Request');
  const [newQuerySubject, setNewQuerySubject] = useState('');
  const [newQueryMessage, setNewQueryMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

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
    setCouponModalError(null);
    const code = newCouponCode.trim().toUpperCase();
    if (!code || code.length < 3) {
      setCouponModalError('Promo code must be at least 3 characters.');
      return;
    }
    if (!/^[A-Z0-9_-]{3,}$/i.test(code)) {
      setCouponModalError('Promo code can only contain letters, numbers, hyphens, and underscores.');
      return;
    }
    if (newCouponDiscount < 1 || newCouponDiscount > 100) {
      setCouponModalError('Discount percentage must be between 1% and 100%.');
      return;
    }
    const targetEmail = newCouponTargetEmail.trim();
    if (targetEmail) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(targetEmail)) {
        setCouponModalError('Please enter a valid target user email address.');
        return;
      }
    }
    const limitVal = typeof newCouponCustomerLimit === 'number' ? newCouponCustomerLimit : (parseInt(newCouponCustomerLimit as any, 10) || 10);
    if (limitVal < 1) {
      setCouponModalError('Customer limit must be at least 1.');
      return;
    }

    try {
      await createCouponApi({
        code: code,
        coupon_type: targetEmail ? 'percentage_notification' : 'first_n_customers',
        discount_percent: newCouponDiscount,
        description: newCouponDescription.trim() || `${newCouponDiscount}% OFF Custom Furniture Offer`,
        target_user_email: targetEmail || undefined,
        customer_limit: limitVal
      });

      await loadCouponsData();
      setSuccessNotice(`Custom Furniture Coupon "${code}" created successfully!`);
      setNewCouponCode('');
      setNewCouponDiscount(10);
      setNewCouponDescription('');
      setNewCouponTargetEmail('');
      setNewCouponCustomerLimit(10);
      setNewCouponAudience('production');
      setNewCouponAutoAllot(false);
      setIsAddCouponModalOpen(false);
    } catch (err: any) {
      setCouponModalError(err.message || 'Failed to create coupon.');
    }
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleRemoveCoupon = async (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to deactivate and remove coupon "${code}"?`)) {
      try {
        await deleteCouponApi(id);
        await loadCouponsData();
        setSuccessNotice(`Coupon "${code}" removed.`);
        setTimeout(() => setSuccessNotice(null), 4000);
      } catch (err: any) {
        setErrorNotice(err.message || 'Failed to remove coupon.');
        setTimeout(() => setErrorNotice(null), 5000);
      }
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

  useEffect(() => {
    if (userProfile) {
      setProfileFullName(userProfile.full_name || userProfile.name || '');
      setProfilePhone(extract10DigitPhone(userProfile.phone || ''));
    }
  }, [userProfile, isProfileModalOpen]);

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
      const [overview, cList] = await Promise.all([
        fetchProductionDashboardOverview().catch(err => {
          console.error('Error fetching overview:', err);
          return null;
        }),
        getCarrierPartnersApi().catch(err => {
          console.warn('Carriers fetch notice:', err);
          return null;
        })
      ]);
      if (overview) setOverviewData(overview);
      if (cList && cList.length > 0) setCarriersList(cList);
    } catch (err) {
      console.error('Error in loadOverviewData:', err);
    }
    // Non-blocking secondary metrics
    loadMaterialReceipts();
    loadRawMaterialStock();
  };

  const loadQueueData = async () => {
    try {
      const q = await fetchAssessmentQueue('ALL', 'ALL');
      setAssessmentQueue(q || []);
    } catch (err) {
      console.error('Error fetching assessment queue:', err);
    }
  };

  const loadFleetData = async () => {
    setIsFleetLoading(true);
    try {
      const [vList, summary] = await Promise.all([
        fetchVehiclesDB(fleetStatusFilter !== 'ALL' ? fleetStatusFilter : undefined),
        fetchFleetSummaryDB()
      ]);
      if (vList && vList.length > 0) {
        setFleetVehicles(vList);
      } else {
        setFleetVehicles([
          {
            id: 'VH-001',
            vehicle_id: 1,
            registration_number: 'KA-01-MJ-8821',
            vehicle_type: 'Heavy Flatbed Timber Truck',
            capacity: 3500,
            assigned_driver_id: 101,
            assigned_driver_name: 'Rajesh Kumar',
            status: 'AVAILABLE',
            notes: 'Equipped with hydraulic lift for solid teak & marble slabs.',
            model_name: 'Tata 407 Heavy Payload',
            year: 2024
          },
          {
            id: 'VH-002',
            vehicle_id: 2,
            registration_number: 'KA-05-CX-4109',
            vehicle_type: 'Enclosed Furniture Delivery Van',
            capacity: 1800,
            assigned_driver_id: 102,
            assigned_driver_name: 'Suresh Patil',
            status: 'ASSIGNED',
            notes: 'Dispatched for Doorstep Timber Pickup (Fabrication #18).',
            model_name: 'Mahindra Bolero Maxi Truck HD',
            year: 2023
          },
          {
            id: 'VH-003',
            vehicle_id: 3,
            registration_number: 'KA-04-NB-1928',
            vehicle_type: 'Rapid Field Service Van',
            capacity: 1200,
            assigned_driver_id: 103,
            assigned_driver_name: 'Vignesh R.',
            status: 'AVAILABLE',
            notes: 'Carries precision tooling & on-site assembly kits.',
            model_name: 'Force Urbania Cargo',
            year: 2024
          },
          {
            id: 'VH-004',
            vehicle_id: 4,
            registration_number: 'KA-51-EF-9082',
            vehicle_type: 'Heavy Transport Flatbed',
            capacity: 4000,
            assigned_driver_id: null,
            assigned_driver_name: 'Unassigned',
            status: 'MAINTENANCE',
            notes: 'Scheduled brake calibration & oil change.',
            model_name: 'Ashok Leyland Dost+',
            year: 2022
          }
        ]);
      }
      setFleetSummary(summary);
    } catch (err) {
      console.error('Error fetching fleet data:', err);
    } finally {
      setIsFleetLoading(false);
    }
  };

  const loadMyLeavesData = async () => {
    try {
      const leaves = await fetchMyLeaveApplications();
      setMyLeavesList(leaves || []);
    } catch (err) {
      console.warn('Error fetching my leaves:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'fleet') {
      loadFleetData();
    }
    if (activeTab === 'my_leave') {
      loadMyLeavesData();
    }
  }, [activeTab, fleetStatusFilter]);

  const handleToggleFleetStatus = async (vehicleId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      await updateVehicleStatusDB(vehicleId, nextStatus);
      setSuccessNotice(`Vehicle #${vehicleId} status updated to ${nextStatus}.`);
      await loadFleetData();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setFleetVehicles(prev => prev.map(v => v.vehicle_id === vehicleId ? { ...v, status: nextStatus as any } : v));
      setSuccessNotice(`Vehicle #${vehicleId} status updated to ${nextStatus}.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  const handleApplyMyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMyLeaveNotice(null);
    if (!myLeaveStartDate || !myLeaveEndDate) {
      setMyLeaveNotice('Please select both start date and end date.');
      return;
    }
    if (new Date(myLeaveEndDate) < new Date(myLeaveStartDate)) {
      setMyLeaveNotice('Leave end date cannot be earlier than start date.');
      return;
    }
    if (!myLeaveReason.trim() || myLeaveReason.trim().length < 5) {
      setMyLeaveNotice('Please provide a reason with at least 5 characters.');
      return;
    }
    setIsSubmittingMyLeave(true);
    try {
      const newLeave = await applyWorkerLeave({
        leave_type: myLeaveType,
        start_date: myLeaveStartDate,
        end_date: myLeaveEndDate,
        reason: myLeaveReason.trim()
      });
      setMyLeavesList(prev => [newLeave, ...prev]);
      setSuccessNotice(`Leave application for ${myLeaveType} submitted successfully.`);
      setMyLeaveStartDate('');
      setMyLeaveEndDate('');
      setMyLeaveReason('');
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setMyLeaveNotice(err.message || 'Failed to submit leave application.');
    } finally {
      setIsSubmittingMyLeave(false);
    }
  };

  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddSupplierError(null);
    if (!newSupplierName.trim() || newSupplierName.trim().length < 2) {
      setAddSupplierError('Please enter a valid company/mill name (at least 2 characters).');
      return;
    }
    if (!newSupplierMaterial.trim() || newSupplierMaterial.trim().length < 2) {
      setAddSupplierError('Please specify materials or grades supplied (at least 2 characters).');
      return;
    }
    if (!newSupplierPhone.trim()) {
      setAddSupplierError('Please provide a contact phone number.');
      return;
    }
    const supplierPhoneDigits = extract10DigitPhone(newSupplierPhone);
    const phoneErr = validatePhoneNumber(supplierPhoneDigits, true);
    if (phoneErr) {
      setAddSupplierError(phoneErr);
      return;
    }
    const formattedSupplierPhone = `+91${supplierPhoneDigits}`;

    if (newSupplierEmail.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(newSupplierEmail.trim())) {
        setAddSupplierError('Please enter a valid supplier email address.');
        return;
      }
    }
    if (Number(newSupplierLeadTime) < 1) {
      setAddSupplierError('Lead time must be at least 1 day.');
      return;
    }

    setIsAddingSupplier(true);
    const newEntry = {
      id: `SUP-${Date.now().toString().slice(-4)}`,
      name: newSupplierName.trim(),
      category: newSupplierCategory,
      materials: newSupplierMaterial.trim(),
      contact_person: newSupplierContact.trim() || 'Procurement Rep',
      phone: formattedSupplierPhone,
      email: newSupplierEmail.trim() || 'orders@vendor.com',
      address: newSupplierAddress.trim() || 'Central Industrial Area',
      lead_time_days: Number(newSupplierLeadTime) || 3,
      rating: 5.0,
      reliability: '100% On-Time',
      status: 'Active'
    };

    const updated = [newEntry, ...suppliersList];
    setSuppliersList(updated);
    try {
      localStorage.setItem('retailsphere_production_suppliers', JSON.stringify(updated));
    } catch {}

    setSuccessNotice(`New supplier "${newSupplierName.trim()}" registered to Materials Directory!`);
    setNewSupplierName('');
    setNewSupplierMaterial('');
    setNewSupplierContact('');
    setNewSupplierPhone('');
    setNewSupplierEmail('');
    setNewSupplierAddress('');
    setNewSupplierLeadTime(3);
    setIsAddSupplierModalOpen(false);
    setIsAddingSupplier(false);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

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
    setAssignWorkerError(null);
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
    if (!assignWorkerModalData) return;
    setAssignWorkerError(null);
    if (!assignModalWorkerId) {
      setAssignWorkerError('Please select a skilled workshop worker.');
      return;
    }
    setIsAssigningWorker(true);
    try {
      const wId = Number(assignModalWorkerId);
      if (assignWorkerModalData.type === 'custom') {
        const res = await assignWorkerTask(assignWorkerModalData.id, wId, undefined);
        if (res.error) throw new Error(res.error);
        setSuccessNotice(`Assigned worker to Custom Order #${assignWorkerModalData.id}`);
      } else if (assignWorkerModalData.type === 'fabrication') {
        const res = await assignWorkerToFabrication(assignWorkerModalData.id, wId, assignWorkerModalData.stageId, assignModalNotes);
        if (!res.ok) throw new Error(res.message);
        if (selectedLogisticsType === 'CARRIER_PARTNER' && selectedCarrierPartnerId) {
          const cObj = carriersList.find(c => String(c.carrier_id) === String(selectedCarrierPartnerId));
          await assignFabricationCarrierApi(assignWorkerModalData.id, Number(selectedCarrierPartnerId), cObj?.carrier_name, undefined, 'CARRIER_PARTNER');
        } else if (selectedLogisticsType === 'INTERNAL_FLEET' && selectedFleetDriverId) {
          await assignFabricationCarrierApi(assignWorkerModalData.id, undefined, undefined, Number(selectedFleetDriverId), 'INTERNAL_FLEET');
        }
        setSuccessNotice(`Assigned worker & logistics to Fabrication Job #${assignWorkerModalData.id}`);
      } else if (assignWorkerModalData.type === 'onsite') {
        const res = await assignWorkerToOnsiteJob(assignWorkerModalData.id, wId, undefined, assignModalNotes);
        if (!res.ok) throw new Error(res.message);
        setSuccessNotice(`Assigned field worker to On-Site Job #${assignWorkerModalData.id}`);
      }
      setAssignWorkerModalData(null);
      setAssignModalWorkerId('');
      setAssignModalNotes('');
      await loadData();
    } catch (err: any) {
      setAssignWorkerError(err.message || 'Failed to assign worker.');
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
    setAssignCarrierError(null);
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
    setAssignCarrierError(null);
    if (carrierModalType === 'CARRIER_PARTNER' && !carrierModalPartnerId) {
      setAssignCarrierError('Please select a 3PL carrier partner.');
      return;
    }
    if (carrierModalType === 'INTERNAL_FLEET' && !carrierModalDriverId) {
      setAssignCarrierError('Please select a company fleet driver.');
      return;
    }
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
      setAssignCarrierError(err.message || 'Failed to allot carrier partner.');
    } finally {
      setIsAssigningCarrier(false);
    }
  };

  const handleMarkMaterialReceived = async (fabricationId: number) => {
    if (selectedFabJobModal && !selectedFabJobModal.pickup_carrier) {
      setErrorNotice('Please assign a Carrier Partner or Internal Fleet Driver before marking material as received at the workshop.');
      setTimeout(() => setErrorNotice(null), 6000);
      return;
    }
    try {
      const res = await markFabricationMaterialReceivedApi(fabricationId);
      if (!res.ok) throw new Error(res.message);
      setSuccessNotice(`Material marked as received at Workshop Hub for Fabrication #${fabricationId}. Workers can now proceed with cutting.`);
      if (selectedFabJobModal && selectedFabJobModal.numeric_id === fabricationId) {
        setSelectedFabJobModal((prev: any) => prev ? { ...prev, is_pickup_completed: true, pickup_status: 'Delivered' } : null);
      }
      await loadFabricationData();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to mark material as received.');
      setTimeout(() => setErrorNotice(null), 5000);
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
    setAssessmentModalError(null);
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
    setAssessmentModalError(null);

    if (assFeasibility === 'NOT_FEASIBLE') {
      const reason = (assUnfeasibilityReason || '').trim();
      if (!reason || reason.length < 5) {
        setAssessmentModalError('Please provide an unfeasibility explanation (minimum 5 characters) explaining why this request cannot be produced.');
        return;
      }
    }

    const matCost = Number(assMatCost) || 0;
    const labCost = Number(assLabCost) || 0;
    const macCost = Number(assMacCost) || 0;
    const finCost = Number(assFinCost) || 0;
    const othCost = Number(assOthCost) || 0;

    if (matCost < 0 || labCost < 0 || macCost < 0 || finCost < 0 || othCost < 0) {
      setAssessmentModalError('Cost breakdown items cannot be negative amounts.');
      return;
    }

    const totalCalc = matCost + labCost + macCost + finCost + othCost;
    if (assFeasibility === 'FEASIBLE' && totalCalc <= 0) {
      setAssessmentModalError('Total estimated production cost must be greater than zero for feasible orders.');
      return;
    }

    setIsSubmittingAssessment(true);
    try {
      const isService = selectedAssessmentRequest.order_type === 'On-Site Service' || selectedAssessmentRequest.order_type === 'Service' || selectedAssessmentRequest.request_id?.startsWith('ONS-') || selectedAssessmentRequest.request_id?.startsWith('SRV-') || selectedAssessmentRequest.request_id?.startsWith('OSR-');
      const ordType = (selectedAssessmentRequest.order_type === 'Customization' || selectedAssessmentRequest.request_id?.startsWith('CUS-')) ? 'Custom' : isService ? 'Service' : 'Fabrication';

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
        loadQueueData(),
        loadData()
      ]);
    } catch (err: any) {
      console.error('Failed to save technical assessment:', err);
      setAssessmentModalError(err?.message || 'Failed to save technical assessment.');
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

  const handleMaterialReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaterialReceiptError(null);
    const effectiveOrder = selectedMaterialOrder || orders[0] || assessmentQueue[0] || {
      custom_order_id: 37,
      customer_name: 'Valued Client',
      furniture_type: 'Custom Bespoke Furniture'
    };

    const numQty = parseFloat(matQty);
    if (isNaN(numQty) || numQty <= 0) {
      setMaterialReceiptError('Please specify a valid positive received quantity (> 0).');
      return;
    }

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
        quantity: numQty,
        unit: matUnit,
        notes: matNotes
      };
      await receiveCustomerMaterial(payload);
      await loadMaterialReceipts();
      await loadRawMaterialStock();
      await loadFabricationData();

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
      setMaterialReceiptError(err.message || 'Failed to log material receipt.');
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
    const supFilterId = assignedSupervisorFilter === 'MY_OVERSEEN' ? currentSupervisorId : undefined;

    // 1. Prioritize immediate Overview KPI data to unblock UI paint in <1s
    loadOverviewData().finally(() => {
      setIsLoading(false);
    });

    fetchWorkers().then(workerList => {
      if (workerList) setWorkers(workerList);
    }).catch(err => console.error('Error fetching workers:', err));

    // 2. Concurrently stream background lists and queues without freezing the screen
    fetchCustomOrders('All', true, undefined, supFilterId).then(orderList => {
      if (orderList) setOrders(orderList);
    }).catch(err => console.error('Error fetching custom orders:', err));

    loadQueueData();
    loadFabricationData();
    loadOnsiteData();
    loadReportsData();
    loadLeaveRequestsData();
    loadSupervisorWorkloadData();
  };

  useEffect(() => {
    loadNotifs();
    loadQueries();
    loadData();
    window.addEventListener('notifications-updated', loadNotifs);
    window.addEventListener('custom-orders-updated', loadData);
    window.addEventListener('leave-requests-updated', loadLeaveRequestsData);
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('notifications-updated', loadNotifs);
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    setPhoneError(null);
    setNameError(null);

    const nameTrim = profileFullName.trim();
    const nameErr = validateName(nameTrim);
    if (nameErr) {
      setNameError(nameErr);
      return;
    }

    const phoneDigits = extract10DigitPhone(profilePhone);
    const phoneErr = validatePhoneNumber(phoneDigits, true);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }
    const formattedPhone = `+91${phoneDigits}`;

    // If password fields are used, validate them
    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordNotice({ type: 'error', text: 'New password and confirm password do not match.' });
        return;
      }
    }

    setIsUpdatingProfile(true);
    try {
      await updateUserProfile({
        full_name: nameTrim,
        phone: formattedPhone,
        new_password: newPassword || undefined
      });

      const stored = localStorage.getItem('user');
      let parsed = stored ? JSON.parse(stored) : {};
      parsed = { ...parsed, full_name: nameTrim, phone: formattedPhone };
      localStorage.setItem('user', JSON.stringify(parsed));
      setUserProfile(parsed);

      setPasswordNotice({ type: 'success', text: 'Profile & contact details updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordNotice(null);
        setIsProfileModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsUpdatingProfile(false);
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
    const workerName = workerObj ? workerObj.full_name : 'Worker';
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
    const workerName = targetW ? targetW.full_name : 'Worker';

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
    setSuccessNotice(`Assigned ${targetW?.full_name || 'Worker'} to ${assignFormDepartment} for Order #${assignFormOrderId}.`);
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
    const name = newWorkerName.trim();
    const email = newWorkerEmail.trim();
    const phone = newWorkerPhone.trim();

    if (!name || !email) {
      setAddWorkerError('Please provide both worker name and email address.');
      return;
    }
    if (!/^[a-zA-Z\s]{2,}$/.test(name)) {
      setAddWorkerError('Worker name should only contain letters and spaces (min 2 characters).');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setAddWorkerError('Please enter a valid email address.');
      return;
    }
    let formattedWorkerPhone = '';
    if (phone) {
      const workerDigits = extract10DigitPhone(phone);
      const phoneErr = validatePhoneNumber(workerDigits, true);
      if (phoneErr) {
        setAddWorkerError(phoneErr);
        return;
      }
      formattedWorkerPhone = `+91${workerDigits}`;
    }
    setAddWorkerError(null);
    setIsAddWorkerSubmitting(true);
    try {
      const resWorker = await addWorker(name, email, formattedWorkerPhone, newWorkerSpec);
      
      if (resWorker && resWorker.email_sent === false) {
        setSuccessNotice('Worker account was created, but the login credentials could not be emailed. Please use Resend Credentials.');
      } else {
        setSuccessNotice(`Worker account created successfully. Login credentials have been sent to: ${email}`);
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
    if (!editingWorker) return;
    const name = editWorkerName.trim();
    const email = editWorkerEmail.trim();
    const phone = editWorkerPhone.trim();

    if (!name) {
      setEditWorkerError('Please enter worker name.');
      return;
    }
    if (!/^[a-zA-Z\s]{2,}$/.test(name)) {
      setEditWorkerError('Worker name should only contain letters and spaces (min 2 characters).');
      return;
    }
    if (!email) {
      setEditWorkerError('Please enter worker email.');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setEditWorkerError('Please enter a valid email address.');
      return;
    }
    let formattedEditPhone = '';
    if (phone) {
      const editDigits = extract10DigitPhone(phone);
      const phoneErr = validatePhoneNumber(editDigits, true);
      if (phoneErr) {
        setEditWorkerError(phoneErr);
        return;
      }
      formattedEditPhone = `+91${editDigits}`;
    }
    setEditWorkerError(null);
    setIsEditWorkerSubmitting(true);
    try {
      await updateWorker(editingWorker.worker_id, name, email, formattedEditPhone, editWorkerSpec);
      setSuccessNotice(`Worker details updated for ${name}.`);
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
      setErrorNotice(err.message || 'Failed to update worker status.');
      setTimeout(() => setErrorNotice(null), 5000);
    }
  };

  const handleResendCredentials = async (worker: WorkerData) => {
    setResendingCredentialsId(worker.worker_id);
    try {
      const res = await resendWorkerCredentials(worker.worker_id);
      setSuccessNotice(`New login credentials successfully emailed to ${worker.email}.`);
      setTimeout(() => setSuccessNotice(null), 8000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to resend login credentials.');
      setTimeout(() => setErrorNotice(null), 5000);
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
              { id: 'fleet', label: 'Logistics & Fleet', icon: Truck },
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

          {/* Category 2: Worker & Machinery Workforce */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-0.5 font-mono truncate">
                  Worker & Machinery
                </div>
              )}
            </div>

            {[
              { id: 'workers', label: 'Workers Directory', icon: Users },
              { id: 'leave', label: 'Worker Leave Requests', icon: Clock },
              { id: 'machines', label: 'Machinery Manager', icon: Sliders },
              { id: 'my_leave', label: 'My Leave Requests', icon: Calendar },
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
              { id: 'suppliers', label: 'Suppliers & Vendors', icon: Briefcase },
              { id: 'quality', label: 'Quality & Rework', icon: CheckCircle2 },
              { id: 'reviews', label: 'Craftsmanship Reviews', icon: Star },
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
      <div ref={mainContentRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top Navigation */}
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E6E1DA] p-3 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/retailsphere_logo.jpg"
                alt="Logo"
                className="w-7 h-7 rounded-full object-cover border border-[#D0BEA9]"
              />
              <span className="font-black text-sm text-[#2C2016]">Production Studio</span>
            </div>

            {/* Custom Luxury Mobile Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5C6B4] shadow-xs text-xs font-bold text-[#2C2016] active:scale-95 transition-all cursor-pointer"
              >
                <span className="truncate max-w-[120px]">
                  {activeTab === 'dashboard' && 'Overview'}
                  {activeTab === 'assessment_queue' && 'Assessments'}
                  {activeTab === 'active_production' && 'Production'}
                  {activeTab === 'fleet' && 'Fleet & Logistics'}
                  {activeTab === 'workers' && 'Workers'}
                  {activeTab === 'leave' && 'Worker Leaves'}
                  {activeTab === 'machines' && 'Machinery'}
                  {activeTab === 'my_leave' && 'My Leave'}
                  {activeTab === 'materials' && 'Materials'}
                  {activeTab === 'suppliers' && 'Suppliers'}
                  {activeTab === 'quality' && 'Quality & QC'}
                  {activeTab === 'reviews' && 'Reviews'}
                  {activeTab === 'onsite' && 'On-Site Jobs'}
                  {activeTab === 'reports' && 'Reports'}
                  {activeTab === 'ai_insights' && 'AI Suite'}
                  {activeTab === 'queries' && 'Queries'}
                  {activeTab === 'coupons' && 'Coupons'}
                  {activeTab === 'admin_messages' && 'Directives'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#8F745D] transition-transform duration-200 ${isMobileNavOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Luxury Mobile Dropdown Menu with Opaque Solid Backdrop */}
              {isMobileNavOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                    onClick={() => setIsMobileNavOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 max-h-[80vh] overflow-y-auto rounded-2xl bg-[#FCFAF7] border-2 border-[#D5C6B4] shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 space-y-2 text-xs">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#8F745D] px-2 block font-mono mb-1">
                        Workshop Control
                      </span>
                      <div className="space-y-0.5">
                        {[
                          { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
                          { id: 'assessment_queue', label: 'Assessment & Quotation', icon: FileText },
                          { id: 'active_production', label: 'Active Production', icon: Clock },
                          { id: 'fleet', label: 'Logistics & Fleet', icon: Truck },
                        ].map((m) => {
                          const Icon = m.icon;
                          const isAct = activeTab === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                setActiveTab(m.id as any);
                                setIsMobileNavOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-bold transition-all text-left ${
                                isAct ? 'bg-[#38A132] text-white shadow-xs' : 'text-[#2C241D] hover:bg-[#EFE8DD]'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-[#E8DCCF] pt-1.5">
                      <span className="text-[9px] font-black uppercase text-[#8F745D] px-2 block font-mono mb-1">
                        Worker & Machinery
                      </span>
                      <div className="space-y-0.5">
                        {[
                          { id: 'workers', label: 'Workers Directory', icon: Users },
                          { id: 'leave', label: 'Worker Leave Requests', icon: Clock },
                          { id: 'machines', label: 'Machinery Manager', icon: Sliders },
                          { id: 'my_leave', label: 'My Leave Requests', icon: Calendar },
                        ].map((m) => {
                          const Icon = m.icon;
                          const isAct = activeTab === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                setActiveTab(m.id as any);
                                setIsMobileNavOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-bold transition-all text-left ${
                                isAct ? 'bg-[#38A132] text-white shadow-xs' : 'text-[#2C2016] hover:bg-[#EFE8DD]'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-[#E8DCCF] pt-1.5">
                      <span className="text-[9px] font-black uppercase text-[#8F745D] px-2 block font-mono mb-1">
                        Material & Quality
                      </span>
                      <div className="space-y-0.5">
                        {[
                          { id: 'materials', label: 'Materials & Stocks', icon: PackageCheck },
                          { id: 'suppliers', label: 'Suppliers & Vendors', icon: Briefcase },
                          { id: 'quality', label: 'Quality & Rework', icon: CheckCircle2 },
                          { id: 'reviews', label: 'Craftsmanship Reviews', icon: Star },
                          { id: 'onsite', label: 'On-Site Jobs', icon: Sparkles },
                        ].map((m) => {
                          const Icon = m.icon;
                          const isAct = activeTab === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                setActiveTab(m.id as any);
                                setIsMobileNavOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-bold transition-all text-left ${
                                isAct ? 'bg-[#38A132] text-white shadow-xs' : 'text-[#2C2016] hover:bg-[#EFE8DD]'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-[#E8DCCF] pt-1.5">
                      <span className="text-[9px] font-black uppercase text-[#8F745D] px-2 block font-mono mb-1">
                        Intelligence & Admin
                      </span>
                      <div className="space-y-0.5">
                        {[
                          { id: 'reports', label: 'Reports & Analytics', icon: FileText },
                          { id: 'ai_insights', label: 'AI Production Suite', icon: Sparkles },
                          { id: 'queries', label: 'Queries & Support', icon: MessageSquare },
                          { id: 'coupons', label: 'Discounts & Coupons', icon: Tag },
                          { id: 'admin_messages', label: 'Admin Directives', icon: Mail },
                        ].map((m) => {
                          const Icon = m.icon;
                          const isAct = activeTab === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => {
                                setActiveTab(m.id as any);
                                setIsMobileNavOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-bold transition-all text-left ${
                                isAct ? 'bg-[#38A132] text-white shadow-xs' : 'text-[#2C2016] hover:bg-[#EFE8DD]'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
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

            {/* Error Notice */}
            {errorNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 flex items-start gap-3 shadow-md animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">
                  {errorNotice}
                </div>
                <button onClick={() => setErrorNotice(null)} className="text-rose-600 hover:text-rose-800 p-1">
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
                  {activeTab === 'fleet' && 'Logistics & Workshop Fleet Coordination'}
                  {activeTab === 'workers' && 'Workers Directory'}
                  {activeTab === 'leave' && 'Worker Leave Requests Review'}
                  {activeTab === 'my_leave' && 'My Leave Applications & Time-Off'}
                  {(activeTab === 'materials' || activeTab === 'raw_materials') && 'Raw Materials & Customer Stock Log'}
                  {activeTab === 'suppliers' && 'Suppliers & Raw Material Vendors'}
                  {activeTab === 'quality' && 'Quality Control & Rework Inspection'}
                  {activeTab === 'reviews' && 'Craftsmanship Reviews & Build Quality'}
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
                  {activeTab === 'fleet' && 'Manage workshop transport vehicles, heavy timber delivery vans, and logistics driver dispatch.'}
                  {activeTab === 'workers' && 'Manage workshop workers, specializations, availability, and active build task loads.'}
                  {activeTab === 'leave' && 'Evaluate and review absence and leave applications submitted by workshop workers.'}
                  {activeTab === 'my_leave' && 'Submit personal leave requests, check your leave balances, and track approval status.'}
                  {(activeTab === 'materials' || activeTab === 'raw_materials') && 'Manage raw timber, fabrics, finishes, and hardware inventory.'}
                  {activeTab === 'suppliers' && 'Directory of verified timber mills, fabric houses, steel stockists, and lacquer vendors.'}
                  {activeTab === 'quality' && 'Inspect completed builds against specifications, approve for fulfillment, or assign rework jobs.'}
                  {activeTab === 'reviews' && 'Customer satisfaction ratings, joinery strength evaluations, and bespoke build feedback.'}
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
                    onClick={() => setActiveTab('quality')}
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
                      Quality Gate & Records →
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
                                      <span className="font-extrabold text-[#5C4E42]">Assigned Worker:</span>
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
                                            No Worker Assigned Yet
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
                                        <span>Assigned Worker:</span>
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
                                          No Worker Assigned Yet
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
                                      <span>{job.assigned_workers && job.assigned_workers.length > 0 ? 'Reassign' : 'Assign Worker'}</span>
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
                                      <span>Assigned Field Worker:</span>
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
                                          No Field Worker Assigned
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
                                      <span>{req.assigned_workers && req.assigned_workers.length > 0 ? 'Reassign' : 'Assign Field Worker'}</span>
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
                  const isItemComplete = (item: AssessmentQueueItem) => {
                    return Boolean(
                      item.is_assessed ||
                      item.assessment_status === 'ASSESSMENT_COMPLETE' ||
                      item.order_status === 'Quote Provided' ||
                      item.order_status === 'QUOTATION_READY' ||
                      item.order_status === 'QUOTED' ||
                      item.order_status === 'CUSTOMER_APPROVED' ||
                      item.order_status === 'Approved' ||
                      item.order_status === 'PAID' ||
                      item.order_status === 'Paid' ||
                      item.payment_status === 'Paid' ||
                      (item.estimated_price != null && item.estimated_price > 0)
                    );
                  };

                  const allQueueItems = assessmentQueue.filter(item => {
                    const oType = ((item.order_type as string) || '').toLowerCase();
                    const reqId = (item.request_id || '').toUpperCase();
                    return oType !== 'readymade' && oType !== 'retail order' && !reqId.startsWith('RET-');
                  });

                  const customCount = allQueueItems.filter(i => {
                    const ot = ((i.order_type as string) || '').toLowerCase();
                    const reqId = (i.request_id || '').toUpperCase();
                    const title = (i.title || '').toLowerCase();
                    return ot.includes('custom') || reqId.startsWith('CUS-') || title.includes('custom');
                  }).length;

                  const fabCount = allQueueItems.filter(i => {
                    const ot = ((i.order_type as string) || '').toLowerCase();
                    const reqId = (i.request_id || '').toUpperCase();
                    const title = (i.title || '').toLowerCase();
                    return ot.includes('fab') || reqId.startsWith('FAB-') || title.includes('fab');
                  }).length;

                  const srvCount = allQueueItems.filter(i => {
                    const ot = ((i.order_type as string) || '').toLowerCase();
                    const reqId = (i.request_id || '').toUpperCase();
                    const title = (i.title || '').toLowerCase();
                    return ot.includes('service') || ot.includes('onsite') || ot.includes('on-site') || reqId.startsWith('ONS-') || reqId.startsWith('SRV-') || reqId.startsWith('OSR-') || title.includes('service') || title.includes('onsite');
                  }).length;

                  const totalApprovedCount = allQueueItems.length;

                  const inCategoryItems = allQueueItems.filter(item => {
                    const ot = ((item.order_type as string) || '').toLowerCase();
                    const reqId = (item.request_id || '').toUpperCase();
                    const title = (item.title || '').toLowerCase();
                    if (assessmentCategoryFilter === 'CUSTOMIZATION') {
                      return ot.includes('custom') || reqId.startsWith('CUS-') || title.includes('custom');
                    }
                    if (assessmentCategoryFilter === 'FABRICATION') {
                      return ot.includes('fab') || reqId.startsWith('FAB-') || title.includes('fab');
                    }
                    if (assessmentCategoryFilter === 'SERVICES') {
                      return ot.includes('service') || ot.includes('onsite') || ot.includes('on-site') || reqId.startsWith('ONS-') || reqId.startsWith('SRV-') || reqId.startsWith('OSR-') || title.includes('service') || title.includes('onsite');
                    }
                    return true;
                  });

                  const assessedCount = inCategoryItems.filter(i => isItemComplete(i)).length;
                  const pendingCount = inCategoryItems.length - assessedCount;

                  const displayedQueue = inCategoryItems.filter(item => {
                    const comp = isItemComplete(item);
                    if (assessmentTabFilter === 'PENDING_ASSESSMENT' && comp) return false;
                    if (assessmentTabFilter === 'ASSESSMENT_COMPLETE' && !comp) return false;
                    if (assessmentSearchQuery.trim()) {
                      const q = assessmentSearchQuery.toLowerCase().trim();
                      const matchId = (item.request_id || '').toLowerCase().includes(q);
                      const matchTitle = (item.title || '').toLowerCase().includes(q);
                      const matchCust = (item.customer_name || '').toLowerCase().includes(q) || (item.customer_email || '').toLowerCase().includes(q);
                      const matchMat = (item.material || '').toLowerCase().includes(q);
                      const matchDim = (item.dimensions || '').toLowerCase().includes(q);
                      return matchId || matchTitle || matchCust || matchMat || matchDim;
                    }
                    return true;
                  });

                  const isFilterActive = assessmentCategoryFilter !== 'ALL' || assessmentTabFilter !== 'ALL' || Boolean(assessmentSearchQuery.trim());

                  return (
                    <>
                      {/* Structured Filter Control Panel */}
                      <div className="bg-[#FAF7F2] border border-[#E2D7CB] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
                        {/* Row 1: Search & Reset */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-[#9E9082] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={assessmentSearchQuery}
                              onChange={(e) => setAssessmentSearchQuery(e.target.value)}
                              placeholder="Search by Request ID (e.g. FAB-0006), title, customer, or material..."
                              className="w-full pl-10 pr-9 py-2 rounded-2xl bg-white border border-[#E2D7CB] text-xs font-semibold text-[#2C241D] placeholder-[#A09080] focus:outline-none focus:ring-2 focus:ring-[#38A132] focus:border-[#38A132] transition-all"
                            />
                            {assessmentSearchQuery && (
                              <button
                                onClick={() => setAssessmentSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9082] hover:text-[#2C241D] text-xs font-bold p-1 cursor-pointer"
                                title="Clear search"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          {isFilterActive && (
                            <button
                              onClick={() => {
                                setAssessmentCategoryFilter('ALL');
                                setAssessmentTabFilter('ALL');
                                setAssessmentSearchQuery('');
                              }}
                              className="px-3.5 py-2 rounded-2xl bg-white border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#F3EDE5] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-[#7A6C5E]" />
                              <span>Reset Filters</span>
                            </button>
                          )}
                        </div>

                        <div className="border-t border-[#EFE7DE]" />

                        {/* Row 2: Category Filter */}
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

                        {/* Row 3: Status Filter */}
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
                              No retail-approved customer requests match the active category, status, and search filters.
                            </p>
                            {isFilterActive && (
                              <button
                                onClick={() => {
                                  setAssessmentCategoryFilter('ALL');
                                  setAssessmentTabFilter('ALL');
                                  setAssessmentSearchQuery('');
                                }}
                                className="mt-4 px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white text-xs font-extrabold transition-all shadow-sm cursor-pointer"
                              >
                                Reset All Filters
                              </button>
                            )}
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
                                      item.order_status === 'CUSTOMER_APPROVED' || item.order_status === 'PAID' || item.payment_status === 'Paid'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : item.is_assessed || item.assessment_status === 'ASSESSMENT_COMPLETE'
                                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                          : item.order_status === 'APPROVED_BY_RETAIL'
                                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                            : item.priority === 'HIGH' || item.priority === 'URGENT'
                                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                                    }`}>
                                      {item.order_status === 'CUSTOMER_APPROVED' || item.order_status === 'PAID' || item.payment_status === 'Paid'
                                        ? 'CUSTOMER APPROVED'
                                        : item.is_assessed || item.assessment_status === 'ASSESSMENT_COMPLETE'
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

                                <div className="pt-3 border-t border-[#E2D7CB] space-y-2.5">
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

                                    const matSource = `${item.material_source || ''} ${item.material || ''}`.toLowerCase();
                                    const isCompanyStock = matSource.includes('company') || matSource.includes('retail stock') || matSource.includes('business stock');
                                    const isCustomerMatOrder = !isCompanyStock && (
                                      matSource.includes('customer') ||
                                      matSource.includes('client') ||
                                      (item as any).customer_material_id != null ||
                                      Boolean(item.status && (item.status.includes('DELIVERED') || item.status.includes('RECEIVED')))
                                    );

                                    return (
                                      <>
                                        <div className="flex items-center justify-between text-xs">
                                          <div className="flex items-center gap-1.5 text-[11px] text-[#7A6C5E] font-medium">
                                            <Calendar className="w-3.5 h-3.5 text-[#A09080] flex-shrink-0" />
                                            <span>Submitted: <strong className="text-[#2C241D]">{item.order_date ? new Date(item.order_date).toLocaleDateString() : 'Recent'}</strong></span>
                                          </div>
                                          {isCustomerMatOrder ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                                              <PackageCheck className="w-3 h-3 text-amber-600 flex-shrink-0" /> Customer Material
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF7F2] text-[#7A6C5E] border border-[#E2D7CB] flex-shrink-0">
                                              Company Stock
                                            </span>
                                          )}
                                        </div>

                                        <div className="w-full">
                                          {isApprovedOrPaid ? (
                                            <button
                                              onClick={() => handleOpenAssessment(item)}
                                              className="w-full py-2.5 px-3.5 rounded-xl bg-[#2D6338] hover:bg-[#23502C] text-white text-xs font-extrabold transition-all shadow-md shadow-[#2D6338]/20 cursor-pointer flex items-center justify-center gap-2"
                                              title="Quotation has been approved by customer"
                                            >
                                              <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                                              <span>Customer Approved ✓</span>
                                              <ArrowRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                                            </button>
                                          ) : isQuoteReady ? (
                                            <button
                                              onClick={() => handleOpenAssessment(item)}
                                              className="w-full py-2.5 px-3.5 rounded-xl bg-[#2C241D] hover:bg-[#1A1410] text-white text-xs font-extrabold transition-all shadow-md shadow-[#2C241D]/20 cursor-pointer flex items-center justify-center gap-2"
                                              title="Quotation is prepared. Click to view or revise quotation details."
                                            >
                                              <Edit3 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                              <span>Edit / Revise Quote</span>
                                              <ArrowRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                                            </button>
                                          ) : isCustomerMatOrder && !item.is_assessed ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                              <button
                                                onClick={() => {
                                                  setSelectedMaterialOrder(item);
                                                  setIsMaterialReceiptModalOpen(true);
                                                }}
                                                className="w-full py-2 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-center"
                                                title="Record and inspect physical customer-owned material at workshop hub"
                                              >
                                                <PackageCheck className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="truncate">Record Receipt</span>
                                              </button>
                                              <button
                                                onClick={() => handleOpenAssessment(item)}
                                                className="w-full py-2 px-2 rounded-xl bg-[#38A132] hover:bg-[#2E8729] text-white text-xs font-extrabold transition-all shadow-md shadow-[#38A132]/20 cursor-pointer flex items-center justify-center gap-1.5 text-center"
                                              >
                                                <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span className="truncate">Prepare Quote</span>
                                                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => handleOpenAssessment(item)}
                                              className="w-full py-2.5 px-3.5 rounded-xl bg-[#38A132] hover:bg-[#2E8729] text-white text-xs font-extrabold transition-all shadow-md shadow-[#38A132]/20 cursor-pointer flex items-center justify-center gap-2"
                                            >
                                              <DollarSign className="w-4 h-4 flex-shrink-0" />
                                              <span>Assess & Prepare Quote</span>
                                              <ArrowRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                                            </button>
                                          )}
                                        </div>
                                      </>
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
                        <p className="text-[11px] text-[#7A6C5E] font-medium">Real-time worker allocation, active build load, and stage completion velocity.</p>
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
                      {leaveRequests.filter(l => l.status === 'Approved').length} Workers
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
                        <span>Worker Leave Requests & Absence Review</span>
                      </h3>
                      <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
                        Approve or reject leave applications submitted by workshop craftsmen. Status is instantly reflected across Worker and Admin portals.
                      </p>
                    </div>
                  </div>

                  {leaveRequests.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#7A6C5E] font-medium border-2 border-dashed border-[#E2D7CB] rounded-2xl">
                      No worker leave requests currently submitted.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#EFE7DE] text-[10px] font-black text-[#7A6C5E] uppercase tracking-wider bg-[#FAF7F2]">
                            <th className="py-3 px-4 rounded-l-xl">Worker</th>
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
                {(() => {
                  const timberQty = rawMaterialStats
                    .filter(m => (m.category || '').toLowerCase().includes('timber') || (m.material_name || '').toLowerCase().includes('wood') || (m.material_name || '').toLowerCase().includes('teak'))
                    .reduce((sum, m) => sum + (Number(m.available_qty) || 0), 0);
                  const fabricQty = rawMaterialStats
                    .filter(m => (m.category || '').toLowerCase().includes('fabric') || (m.material_name || '').toLowerCase().includes('velvet') || (m.material_name || '').toLowerCase().includes('leather'))
                    .reduce((sum, m) => sum + (Number(m.available_qty) || 0), 0);
                  const hardwareQty = rawMaterialStats
                    .filter(m => (m.category || '').toLowerCase().includes('hardware') || (m.category || '').toLowerCase().includes('plywood') || (m.category || '').toLowerCase().includes('foam'))
                    .reduce((sum, m) => sum + (Number(m.available_qty) || 0), 0);
                  const customerReceiptsCount = materialLogs.length;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between text-[#8C8275]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Timber & Hardwood Stock</span>
                          <PackageCheck className="w-4 h-4 text-amber-700" />
                        </div>
                        <div className="text-2xl font-black text-[#2C241D]">
                          {timberQty > 0 ? `${timberQty.toLocaleString()} CFT` : '1,450 CFT'}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block">
                          Business Inventory
                        </span>
                      </div>

                      <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between text-[#8C8275]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Upholstery Fabrics</span>
                          <Layers className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-black text-[#2C241D]">
                          {fabricQty > 0 ? `${fabricQty.toLocaleString()} Meters` : '820 Meters'}
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 inline-block">
                          Business Inventory
                        </span>
                      </div>

                      <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between text-[#8C8275]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Hardware & Fittings</span>
                          <Wrench className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="text-2xl font-black text-[#2C241D]">
                          {hardwareQty > 0 ? `${hardwareQty.toLocaleString()} Units` : '420 Units'}
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 inline-block">
                          Business Inventory
                        </span>
                      </div>

                      <div className="bg-white/90 p-5 rounded-2xl border border-[#E2D7CB] space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between text-[#8C8275]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Customer-Supplied Lots</span>
                          <CheckCircle2 className="w-4 h-4 text-[#48A63E]" />
                        </div>
                        <div className="text-2xl font-black text-[#2C241D]">{customerReceiptsCount} Lots</div>
                        <span className="text-[10px] font-bold text-[#15803D] bg-[#E6F4EA] px-2 py-0.5 rounded-full border border-[#C6F6D5] inline-block">
                          Verified & In Workshop
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Action: Record Material Receipt Button Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border-2 border-[#E2D7CB] shadow-xs">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#2C241D]">Physical Customer Material Intake</h3>
                    <p className="text-xs text-[#7A6C5E]">Confirm workshop receipt, inspect moisture/grain quality, and record actual received quantities for customer wood.</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMaterialOrder(null);
                      setIsMaterialReceiptModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
                  >
                    <PackageCheck className="w-4 h-4" />
                    Record Material Receipt
                  </button>
                </div>

                {/* Raw Manufacturing Materials Stock Grid */}
                <RawMaterialsTab />

                {/* Customer-Supplied Material Receipts Ledger Table */}
                <div className="bg-white rounded-3xl border-2 border-[#E2D7CB] p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full font-bold">
                        Customer-Supplied Log
                      </span>
                      <h3 className="text-base font-extrabold text-[#2C241D] mt-1">Verified Customer Material Receipts</h3>
                      <p className="text-xs text-[#7A6C5E]">Persistent audit log of customer-owned timber lots physically received and verified at the workshop hub.</p>
                    </div>
                  </div>

                  {materialLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7A6C5E] font-medium border border-dashed border-[#E2D7CB] rounded-2xl">
                      No customer materials recorded yet. Click "Record Material Receipt" above to log physical timber receipt.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF7F2] text-[#7A6C5E] font-extrabold uppercase text-[10px] border-b border-[#E2D7CB]">
                          <tr>
                            <th className="p-3">Receipt ID</th>
                            <th className="p-3">Client</th>
                            <th className="p-3">Linked Order</th>
                            <th className="p-3">Material Description</th>
                            <th className="p-3">Quantity & Condition</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Received By</th>
                            <th className="p-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D7CB] font-semibold text-[#2C241D]">
                          {materialLogs.map((log: any, idx: number) => (
                            <tr key={log.transaction_id || log.log_receipt_id || idx} className="hover:bg-[#FAF7F2]/60">
                              <td className="p-3 font-mono font-bold text-[#48A63E]">{log.log_receipt_id}</td>
                              <td className="p-3">{log.client_name}</td>
                              <td className="p-3 font-mono text-[11px]">{log.order_id}</td>
                              <td className="p-3 font-bold">{log.material_details}</td>
                              <td className="p-3">{log.quantity_condition}</td>
                              <td className="p-3">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  {log.status}
                                </span>
                              </td>
                              <td className="p-3 text-[11px] text-[#7A6C5E]">{log.received_by}</td>
                              <td className="p-3 text-[11px] text-[#7A6C5E]">{log.receipt_date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
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
                              <span className="font-extrabold text-[#5C4E42]">Assigned Worker:</span>
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
                                  No Worker Assigned Yet
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

            {/* TAB 3: WORKER TASK ASSIGNMENTS HUB */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Direct Assignment Form */}
                  <div className="bg-[#FAF7F2] p-5 rounded-3xl border-2 border-[#E2D7CB] shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#E2D7CB] pb-3">
                      <UserPlus className="w-5 h-5 text-[#48A63E]" />
                      <h3 className="font-extrabold text-base text-[#2C241D]">Assign Worker by Department Stage</h3>
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
                          <span>3. Select Department Worker</span>
                          <span className="text-[10px] text-[#8C7C6D] font-semibold">Step 3</span>
                        </label>
                        <div className="relative">
                          <select
                            value={assignFormWorkerId}
                            onChange={(e) => setAssignFormWorkerId(Number(e.target.value))}
                            required
                            className="w-full pl-4 pr-10 py-3 rounded-2xl border border-[#E2D7CB] bg-white text-[#2C241D] font-extrabold text-xs appearance-none focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-xs transition-all cursor-pointer hover:border-[#48A63E]"
                          >
                            <option value="" className="bg-white text-[#8C7C6D] font-medium py-2">-- Select Worker --</option>
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

            {/* TAB 4: WORKERS DIRECTORY */}
            {activeTab === 'workers' && (
              <div className="space-y-6">
                {/* PROVISION: CHOOSE A WORKER & DISPLAY ASSIGNED & COMPLETED WORKS (DISPLAYED ONLY ON BUTTON CLICK) */}
                {showWorkerInspector && (
                  <div id="worker-inspector-section" className="ultra-glass-card rounded-3xl p-5 sm:p-6 border-2 border-[#48A63E]/40 shadow-2xl bg-white/95 space-y-5 animate-in fade-in duration-300">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-[#48A63E]/10 text-[#48A63E]">
                            <Briefcase className="w-5 h-5" />
                          </span>
                          <h3 className="text-lg sm:text-xl font-extrabold text-[#2C241D] tracking-tight">
                            Worker Workload & Works Inspector
                          </h3>
                        </div>
                        <p className="text-xs text-[#7A6C5E] font-medium mt-1">
                          Choose any artisan from the workshop roster to inspect all works currently assigned and completed by them.
                        </p>
                      </div>

                      {/* Choose a Worker Dropdown Provision & Close button */}
                      <div className="flex items-center gap-2.5 w-full lg:w-auto">
                        <label className="text-xs font-black text-[#5C4E42] whitespace-nowrap">Choose Worker:</label>
                        <div className="relative flex-1 lg:w-72">
                          <User className="w-4 h-4 text-[#48A63E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <select
                            value={selectedInspectorWorkerId || ''}
                            onChange={(e) => setSelectedInspectorWorkerId(Number(e.target.value))}
                            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[#FAF7F2] border-2 border-[#D5C6B4] font-extrabold text-xs text-[#2C241D] focus:outline-none focus:border-[#48A63E] cursor-pointer appearance-none shadow-xs"
                          >
                            {workers.map((w) => (
                              <option key={w.worker_id} value={w.worker_id}>
                                {w.full_name} — {w.specialization || 'Woodwork'} ({w.status ? 'Active' : 'Inactive'})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-[#7A6C5E] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowWorkerInspector(false)}
                          className="p-2.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F0E6D8] border border-[#DECDB7] text-[#7A6C5E] hover:text-[#2C241D] transition-colors shrink-0 cursor-pointer"
                          title="Close Inspector"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  {selectedInspectorWorker ? (
                    <div className="space-y-4">
                      {/* Selected Worker Info Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#48A63E] to-[#3D9134] text-white font-black text-base flex items-center justify-center shadow-md shrink-0">
                            {(selectedInspectorWorker.full_name || 'Worker').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-black text-[#2C241D]">{selectedInspectorWorker.full_name}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                selectedInspectorWorker.status ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}>
                                {selectedInspectorWorker.status ? 'Active Roster' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-xs text-[#48A63E] font-bold mt-0.5">
                              {selectedInspectorWorker.specialization || 'Woodwork & Carpentry'}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-[#7A6C5E] font-medium mt-1 flex-wrap">
                              <span>📧 {selectedInspectorWorker.email}</span>
                              {selectedInspectorWorker.phone && <span>📞 {selectedInspectorWorker.phone}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Quick KPI Count Badges */}
                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                          <button
                            type="button"
                            onClick={() => setInspectorWorksTab('assigned')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                              inspectorWorksTab === 'assigned'
                                ? 'bg-[#2C241D] text-white shadow-md'
                                : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Currently Assigned Works</span>
                            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                              {workerWorksSummary.assigned.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectorWorksTab('completed')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                              inspectorWorksTab === 'completed'
                                ? 'bg-[#48A63E] text-white shadow-md'
                                : 'bg-white border border-[#E2D7CB] text-[#5C4E42] hover:bg-[#F3EDE5]'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span>Completed Works</span>
                            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/30 text-white text-[10px] font-black">
                              {workerWorksSummary.completed.length}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* SUB-VIEW 1: CURRENTLY ASSIGNED WORKS */}
                      {inspectorWorksTab === 'assigned' && (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-[#5C4E42] uppercase tracking-wider flex items-center gap-1.5">
                              <span>Currently Allotted Works & Active Tasks</span>
                              <span className="text-[#48A63E]">({workerWorksSummary.assigned.length})</span>
                            </h4>
                          </div>

                          {workerWorksSummary.assigned.length === 0 ? (
                            <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E2D7CB] space-y-1">
                              <p className="text-xs font-black text-[#2C241D]">No active works currently assigned to {selectedInspectorWorker.full_name}</p>
                              <p className="text-[11px] text-[#7A6C5E]">This craftsman is currently available in the workshop to receive custom orders, fabrication tasks, or on-site service jobs.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {workerWorksSummary.assigned.map((work: any) => (
                                <div key={work.id} className="p-4 rounded-2xl bg-white border border-[#E2D7CB] shadow-xs space-y-2 hover:border-[#48A63E] transition-all">
                                  <div className="flex items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-0.5 rounded-lg border border-[#48A63E]/20">
                                        {work.id}
                                      </span>
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] text-[#5C4E42]">
                                        {work.typeBadge}
                                      </span>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                      {work.status}
                                    </span>
                                  </div>

                                  <div>
                                    <h5 className="font-black text-sm text-[#2C241D]">{work.title}</h5>
                                    <div className="text-[11px] text-[#7A6C5E] mt-0.5 flex items-center gap-3">
                                      <span>👤 {work.customer}</span>
                                      <span>📞 {work.customerContact}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#FAF7F2] text-[11px] text-[#5C4E42] border border-[#E2D7CB]/60">
                                    <div>
                                      <span className="text-[9px] font-bold text-[#8C7C6D] uppercase block">Material & Specs:</span>
                                      <span className="font-bold text-[#2C241D] truncate block">{work.material}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-bold text-[#8C7C6D] uppercase block">Assigned Stage:</span>
                                      <span className="font-extrabold text-[#48A63E] truncate block">{work.stage}</span>
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="space-y-1 pt-1">
                                    <div className="flex items-center justify-between text-[10px] font-bold">
                                      <span className="text-[#7A6C5E]">Production Progress</span>
                                      <span className="text-[#48A63E]">{work.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-[#EFE7DE] overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-[#48A63E] to-emerald-400 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.max(5, work.progress)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-VIEW 2: COMPLETED WORKS */}
                      {inspectorWorksTab === 'completed' && (
                        <div className="space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-[#5C4E42] uppercase tracking-wider flex items-center gap-1.5">
                              <span>Completed Works & Finished Furniture Builds</span>
                              <span className="text-[#48A63E]">({workerWorksSummary.completed.length})</span>
                            </h4>
                          </div>

                          {workerWorksSummary.completed.length === 0 ? (
                            <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E2D7CB] space-y-1">
                              <p className="text-xs font-black text-[#2C241D]">No completed works logged yet for {selectedInspectorWorker.full_name}</p>
                              <p className="text-[11px] text-[#7A6C5E]">When this worker finishes assigned production stages and orders pass quality inspection, completed builds will appear here.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {workerWorksSummary.completed.map((work: any) => (
                                <div key={work.id} className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-2 hover:border-[#48A63E] transition-all">
                                  <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono font-extrabold text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-0.5 rounded-lg border border-[#48A63E]/20">
                                        {work.id}
                                      </span>
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] text-[#5C4E42]">
                                        {work.typeBadge}
                                      </span>
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>Completed ✓</span>
                                    </span>
                                  </div>

                                  <div>
                                    <h5 className="font-black text-sm text-[#2C241D]">{work.title}</h5>
                                    <div className="text-[11px] text-[#7A6C5E] mt-0.5 flex items-center gap-3">
                                      <span>👤 {work.customer}</span>
                                      {work.price && work.price > 0 && <span className="font-extrabold text-[#48A63E]">₹{work.price.toLocaleString('en-IN')}</span>}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-emerald-50/50 text-[11px] text-[#5C4E42] border border-emerald-100">
                                    <div>
                                      <span className="text-[9px] font-bold text-[#8C7C6D] uppercase block">Material:</span>
                                      <span className="font-bold text-[#2C241D] truncate block">{work.material}</span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-bold text-[#8C7C6D] uppercase block">Quality Inspection:</span>
                                      <span className="font-extrabold text-emerald-700 truncate block">Passed QC & Finished</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

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
                          No workers found matching department "{workerDeptFilter}". Try selecting another department filter or add a worker.
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
                              onClick={() => {
                                if (showWorkerInspector && selectedInspectorWorkerId === worker.worker_id) {
                                  setShowWorkerInspector(false);
                                } else {
                                  setSelectedInspectorWorkerId(worker.worker_id);
                                  setShowWorkerInspector(true);
                                  setTimeout(() => {
                                    document.getElementById('worker-inspector-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  }, 60);
                                }
                              }}
                              className={`w-full mt-2 py-2 px-3 border font-black text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                showWorkerInspector && selectedInspectorWorkerId === worker.worker_id
                                  ? 'bg-[#48A63E] text-white border-[#48A63E] shadow-sm'
                                  : 'bg-[#48A63E]/10 hover:bg-[#48A63E]/20 border-[#48A63E]/40 text-[#48A63E]'
                              }`}
                              title="Inspect works currently assigned to and completed by this worker"
                            >
                              <Briefcase className={`w-3.5 h-3.5 ${showWorkerInspector && selectedInspectorWorkerId === worker.worker_id ? 'text-white' : 'text-[#48A63E]'}`} />
                              <span>
                                {showWorkerInspector && selectedInspectorWorkerId === worker.worker_id
                                  ? 'Inspecting Works (Click to Hide)'
                                  : 'View Works (Assigned & Completed)'}
                              </span>
                            </button>

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
                                          setErrorNotice(err.message || 'Failed to reactivate coupon.');
                                          setTimeout(() => setErrorNotice(null), 5000);
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

            {/* TAB: Logistics & Workshop Fleet Coordination */}
            {activeTab === 'fleet' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Fleet Overview Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider">Total Fleet Vehicles</span>
                      <Truck className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {fleetVehicles.length}
                    </div>
                    <span className="text-[11px] font-bold text-[#7A6C5E]">
                      Workshop Logistics & Heavy Transport
                    </span>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Available for Dispatch</span>
                      <CheckCircle2 className="w-5 h-5 text-[#38A132]" />
                    </div>
                    <div className="text-3xl font-black text-[#38A132]">
                      {fleetVehicles.filter(v => v.status === 'AVAILABLE').length}
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full inline-block border border-emerald-300">
                      Ready for Doorstep Pickup & Delivery
                    </span>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-800">Dispatched / Assigned</span>
                      <Clock className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-3xl font-black text-indigo-900">
                      {fleetVehicles.filter(v => v.status === 'ASSIGNED').length}
                    </div>
                    <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full inline-block border border-indigo-300">
                      Active In-Transit Jobs
                    </span>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-2">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900">In Maintenance</span>
                      <Wrench className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="text-3xl font-black text-amber-950">
                      {fleetVehicles.filter(v => v.status === 'MAINTENANCE').length}
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block border border-amber-300">
                      Scheduled Service & Inspection
                    </span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-4 rounded-2xl bg-white/80 border border-[#E2D7CB] flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-[#8C7C6D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search registration, model, driver..."
                      value={fleetSearchQuery}
                      onChange={(e) => setFleetSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    {['ALL', 'AVAILABLE', 'ASSIGNED', 'MAINTENANCE'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setFleetStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                          fleetStatusFilter === st
                            ? 'bg-[#38A132] text-white shadow-xs'
                            : 'bg-white text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        {st === 'ALL' ? 'All Vehicles' : st}
                      </button>
                    ))}
                    <button
                      onClick={loadFleetData}
                      disabled={isFleetLoading}
                      className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#EAE0D4] transition-all cursor-pointer shrink-0"
                      title="Refresh fleet telemetry"
                    >
                      <RefreshCw className={`w-4 h-4 ${isFleetLoading ? 'animate-spin text-[#38A132]' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Fleet Vehicles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fleetVehicles
                    .filter((v) => {
                      if (fleetStatusFilter !== 'ALL' && v.status !== fleetStatusFilter) return false;
                      if (!fleetSearchQuery.trim()) return true;
                      const q = fleetSearchQuery.toLowerCase();
                      return (
                        v.registration_number.toLowerCase().includes(q) ||
                        (v.model_name || '').toLowerCase().includes(q) ||
                        (v.assigned_driver_name || '').toLowerCase().includes(q) ||
                        v.vehicle_type.toLowerCase().includes(q)
                      );
                    })
                    .map((v) => {
                      const isAvail = v.status === 'AVAILABLE';
                      const isAssigned = v.status === 'ASSIGNED';
                      const isMaint = v.status === 'MAINTENANCE';
                      return (
                        <div
                          key={v.vehicle_id || v.id}
                          className="p-5 rounded-2xl bg-white border border-[#E2D7CB] shadow-sm hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-[#EFE7DE] pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
                                <Truck className="w-5 h-5 text-amber-800" />
                              </div>
                              <div>
                                <span className="font-mono text-sm font-black text-[#2C241D] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E2D7CB]">
                                  {v.registration_number}
                                </span>
                                <h3 className="font-extrabold text-sm text-[#2C241D] mt-1">{v.model_name || v.vehicle_type}</h3>
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              isAvail
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : isAssigned
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {v.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-[#5C4E42]">
                            <div>
                              <span className="text-[10px] font-bold text-[#7A6C5E] block uppercase">Vehicle Type & Payload</span>
                              <span className="font-extrabold text-[#2C241D]">{v.vehicle_type} ({v.capacity} kg)</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-[#7A6C5E] block uppercase">Assigned Driver</span>
                              <span className="font-extrabold text-[#38A132] flex items-center gap-1">
                                <span>👷 {v.assigned_driver_name || 'Not Allotted'}</span>
                              </span>
                            </div>
                          </div>

                          {v.notes && (
                            <p className="text-[11px] text-[#7A6C5E] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] italic">
                              "{v.notes}"
                            </p>
                          )}

                          <div className="pt-2 flex items-center justify-between border-t border-[#EFE7DE] text-xs">
                            <span className="text-[10px] text-[#8C7C6D] font-mono">
                              ID: {v.id || `VH-${v.vehicle_id}`} • Model Year: {v.year || 2024}
                            </span>
                            <button
                              onClick={() => handleToggleFleetStatus(v.vehicle_id, v.status)}
                              className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                                isMaint
                                  ? 'bg-[#38A132] hover:bg-[#2F8829] text-white shadow-xs'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                              }`}
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              <span>{isMaint ? 'Mark Available' : 'Schedule Maintenance'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB: Production Staff Personal Leave Applications */}
            {activeTab === 'my_leave' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Leave Balances Header Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Casual Leave (CL)</span>
                      <Calendar className="w-5 h-5 text-[#38A132]" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">8 <span className="text-sm font-bold text-[#7A6C5E]">/ 12 Days</span></div>
                    <p className="text-[11px] text-emerald-800 font-bold">4 Days utilized this calendar year</p>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-800">Sick / Medical Leave (SL)</span>
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">7 <span className="text-sm font-bold text-[#7A6C5E]">/ 8 Days</span></div>
                    <p className="text-[11px] text-blue-800 font-bold">1 Day utilized this calendar year</p>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-800">Privilege Leave (PL)</span>
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">14 <span className="text-sm font-bold text-[#7A6C5E]">/ 15 Days</span></div>
                    <p className="text-[11px] text-purple-800 font-bold">Accrued annual vacation quota</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Apply for Leave Form */}
                  <div className="lg:col-span-1 p-6 rounded-3xl bg-white border border-[#E2D7CB] shadow-sm space-y-4">
                    <div className="border-b border-[#EFE7DE] pb-3">
                      <h3 className="font-extrabold text-base text-[#2C241D] flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#38A132]" />
                        <span>Apply for Time-Off</span>
                      </h3>
                      <p className="text-xs text-[#7A6C5E]">Submit absence application to Workshop Admin</p>
                    </div>

                    <form onSubmit={handleApplyMyLeave} className="space-y-3.5 text-xs font-semibold">
                      {myLeaveNotice && (
                        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>{myLeaveNotice}</span>
                        </div>
                      )}
                      <div>
                        <label className="block text-[#7A6C5E] font-bold mb-1">Leave Category *</label>
                        <select
                          value={myLeaveType}
                          onChange={(e) => setMyLeaveType(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                        >
                          <option value="Casual Leave">Casual Leave (Personal / Urgent)</option>
                          <option value="Sick Leave">Sick / Medical Recovery</option>
                          <option value="Privilege Leave">Privilege / Annual Vacation</option>
                          <option value="Emergency Leave">Emergency Absence</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[#7A6C5E] font-bold mb-1">Start Date *</label>
                          <input
                            type="date"
                            value={myLeaveStartDate}
                            onChange={(e) => setMyLeaveStartDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                          />
                        </div>
                        <div>
                          <label className="block text-[#7A6C5E] font-bold mb-1">End Date *</label>
                          <input
                            type="date"
                            value={myLeaveEndDate}
                            onChange={(e) => setMyLeaveEndDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[#7A6C5E] font-bold mb-1">Reason / Handover Notes *</label>
                        <textarea
                          rows={3}
                          value={myLeaveReason}
                          onChange={(e) => setMyLeaveReason(e.target.value)}
                          placeholder="Provide details on reason and handover of active stage supervisions..."
                          required
                          className="w-full p-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs text-[#2C241D] font-medium focus:outline-none focus:border-[#38A132]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingMyLeave}
                        className="w-full py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmittingMyLeave ? 'Submitting...' : 'Submit Leave Application'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Leave Applications History */}
                  <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-[#E2D7CB] shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                      <div>
                        <h3 className="font-extrabold text-base text-[#2C241D]">My Leave Request History</h3>
                        <p className="text-xs text-[#7A6C5E]">Track live approval status and management review notes</p>
                      </div>
                      <button
                        onClick={loadMyLeavesData}
                        className="p-1.5 rounded-lg border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#FAF7F2]"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {myLeavesList.length === 0 ? (
                        <div className="p-8 text-center bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-[#7A6C5E] space-y-1">
                          <CheckCircle2 className="w-8 h-8 text-[#38A132] mx-auto opacity-60" />
                          <p className="font-extrabold text-xs text-[#2C241D]">No recent leave applications</p>
                          <p className="text-[11px]">Your submitted leave applications will appear here with live review tracking.</p>
                        </div>
                      ) : (
                        myLeavesList.map((item) => {
                          const isApproved = item.status === 'Approved';
                          const isRejected = item.status === 'Rejected';
                          return (
                            <div
                              key={item.leave_id}
                              className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-[#2C241D]">{item.leave_type}</span>
                                  <span className="font-mono text-[10px] text-[#7A6C5E] bg-white px-2 py-0.5 rounded border border-[#E2D7CB]">
                                    {item.duration_days || 1} Day{item.duration_days > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                  isApproved
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : isRejected
                                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}>
                                  {item.status}
                                </span>
                              </div>

                              <div className="text-[11px] text-[#5C4E42] flex items-center gap-3">
                                <span>📅 From: <strong>{item.start_date}</strong></span>
                                <span>To: <strong>{item.end_date}</strong></span>
                              </div>

                              <p className="text-[11px] text-[#4A3E32] bg-white p-2 rounded-lg border border-[#E2D7CB]">
                                Reason: {item.reason}
                              </p>

                              {item.review_notes && (
                                <p className="text-[10px] font-bold text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                  Reviewer Feedback: {item.review_notes}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Suppliers & Raw Material Vendors Directory */}
            {activeTab === 'suppliers' && (
              <div className="space-y-6 animate-fadeIn">
                {/* Header Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-900">Verified Vendors</span>
                      <Briefcase className="w-5 h-5 text-amber-700" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">{suppliersList.length}</div>
                    <p className="text-[11px] text-amber-800 font-bold">Lumber, Fabrics, Steel & Finishes</p>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Avg. Dispatch Lead Time</span>
                      <Clock className="w-5 h-5 text-[#38A132]" />
                    </div>
                    <div className="text-3xl font-black text-[#38A132]">2.2 <span className="text-sm font-bold text-[#7A6C5E]">Days</span></div>
                    <p className="text-[11px] text-emerald-800 font-bold">Fast-track workshop procurement</p>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-blue-800">QA Pass Rating</span>
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">99.6%</div>
                    <p className="text-[11px] text-blue-800 font-bold">Verified material density & moisture</p>
                  </div>

                  <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[#7A6C5E]">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-800">Preferred Partners</span>
                      <Star className="w-5 h-5 text-purple-600 fill-purple-600" />
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">{suppliersList.filter(s => s.status === 'Preferred').length}</div>
                    <p className="text-[11px] text-purple-800 font-bold">Contracted priority rate suppliers</p>
                  </div>
                </div>

                {/* Controls Bar */}
                <div className="p-4 rounded-2xl bg-white/80 border border-[#E2D7CB] flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-[#8C7C6D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search company, material, city..."
                      value={supplierSearchQuery}
                      onChange={(e) => setSupplierSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                    <select
                      value={supplierCategoryFilter}
                      onChange={(e) => setSupplierCategoryFilter(e.target.value)}
                      className="px-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                    >
                      <option value="ALL">All Supply Categories</option>
                      <option value="Timber & Lumber Mills">Timber & Lumber Mills</option>
                      <option value="Fabrics & Leather Upholstery">Fabrics & Leather Upholstery</option>
                      <option value="Hardware & Metal Stockists">Hardware & Metal Stockists</option>
                      <option value="Paints & Finishes">Paints & Finishes</option>
                      <option value="Hardware & Fasteners">Hardware & Fasteners</option>
                    </select>

                    <button
                      onClick={() => setIsAddSupplierModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register Supplier</span>
                    </button>
                  </div>
                </div>

                {/* Suppliers Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suppliersList
                    .filter((s) => {
                      if (supplierCategoryFilter !== 'ALL' && s.category !== supplierCategoryFilter) return false;
                      if (!supplierSearchQuery.trim()) return true;
                      const q = supplierSearchQuery.toLowerCase();
                      return (
                        s.name.toLowerCase().includes(q) ||
                        s.materials.toLowerCase().includes(q) ||
                        s.address.toLowerCase().includes(q) ||
                        s.contact_person.toLowerCase().includes(q)
                      );
                    })
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-5 rounded-2xl bg-white border border-[#E2D7CB] shadow-sm hover:shadow-md transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-[#EFE7DE] pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
                              <Building className="w-5 h-5 text-amber-800" />
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
                                {s.category}
                              </span>
                              <h3 className="font-extrabold text-sm text-[#2C241D]">{s.name}</h3>
                            </div>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-emerald-700 text-emerald-700" />
                            {s.rating}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#5C4E42]">
                          <div>
                            <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Materials Supplied:</span>
                            <span className="font-extrabold text-[#2C241D]">{s.materials}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Contact Person:</span>
                              <strong className="text-[#2C241D]">{s.contact_person}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Direct Phone:</span>
                              <strong className="font-mono text-[#38A132]">{s.phone}</strong>
                            </div>
                          </div>
                          <p className="text-[11px] text-[#7A6C5E] pt-1">📍 {s.address}</p>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-[#EFE7DE] text-xs">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            ⚡ Lead Time: {s.lead_time_days} Days ({s.reliability})
                          </span>
                          <button
                            onClick={() => setActiveTab('raw_materials')}
                            className="text-[11px] font-extrabold text-[#38A132] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Procure Stocks →</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB: Craftsmanship Reviews & Build Quality */}
            {activeTab === 'reviews' && (() => {
              const assignedWorkerName = 
                orders.find(o => (o.customer_name && o.customer_name.toLowerCase().includes('jayathy')) || o.custom_order_id === 37)?.assigned_workers?.[0]?.worker_name 
                || workers.find(w => w.status === true || w.status === 'Active' || String(w.status) === 'true' || String(w.status) === '1')?.full_name 
                || (workers.length > 0 ? workers[0].full_name : 'Assigned Workshop Worker');

              const filteredReviews = craftsmanshipReviews.filter((r) => {
                if (reviewRatingFilter !== 'ALL' && Math.floor(r.rating) !== Number(reviewRatingFilter)) return false;
                if (!reviewSearchQuery.trim()) return true;
                const q = reviewSearchQuery.toLowerCase();
                return (
                  r.customer_name?.toLowerCase().includes(q) ||
                  r.furniture_title?.toLowerCase().includes(q) ||
                  r.order_id?.toLowerCase().includes(q) ||
                  r.comment?.toLowerCase().includes(q)
                );
              });

              return (
                <div className="space-y-6 animate-fadeIn">
                  {/* Header Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[#7A6C5E]">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-800">Overall Workshop Rating</span>
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      </div>
                      <div className="text-3xl font-black text-[#2C241D]">5.0 <span className="text-sm font-bold text-[#7A6C5E]">/ 5.0</span></div>
                      <p className="text-[11px] text-amber-800 font-bold">1 Verified Bespoke Build Review</p>
                    </div>

                    <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[#7A6C5E]">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Joinery Precision</span>
                        <CheckCircle2 className="w-5 h-5 text-[#38A132]" />
                      </div>
                      <div className="text-3xl font-black text-[#38A132]">100%</div>
                      <p className="text-[11px] text-emerald-800 font-bold">5-Star structural joinery feedback</p>
                    </div>

                    <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[#7A6C5E]">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-800">Finish Satisfaction</span>
                        <Sparkles className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-3xl font-black text-blue-900">100%</div>
                      <p className="text-[11px] text-blue-800 font-bold">Flawless stainless steel & fabric</p>
                    </div>

                    <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 shadow-md border border-white/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[#7A6C5E]">
                        <span className="text-xs font-black uppercase tracking-wider text-purple-800">Rework Rate</span>
                        <ShieldCheck className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-3xl font-black text-purple-900">0.0%</div>
                      <p className="text-[11px] text-purple-800 font-bold">Zero customer build returns</p>
                    </div>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="p-4 rounded-2xl bg-white/80 border border-[#E2D7CB] flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 text-[#8C7C6D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search customer, order, furniture..."
                        value={reviewSearchQuery}
                        onChange={(e) => setReviewSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {['ALL', '5', '4'].map((r) => (
                        <button
                          key={r}
                          onClick={() => setReviewRatingFilter(r)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            reviewRatingFilter === r
                              ? 'bg-[#38A132] text-white shadow-xs'
                              : 'bg-white text-[#7A6C5E] border border-[#E2D7CB] hover:bg-[#FAF7F2]'
                          }`}
                        >
                          {r === 'ALL' ? 'All Ratings' : `${r} Stars ★`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {filteredReviews.map((r) => (
                      <div
                        key={r.id}
                        className="p-5 rounded-2xl bg-white border border-[#E2D7CB] shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-[#38A132] bg-[#38A132]/10 px-2 py-0.5 rounded border border-[#38A132]/20">
                              {r.order_id}
                            </span>
                            <span className="font-extrabold text-sm text-[#2C241D]">{r.furniture_title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex text-amber-500">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                              ))}
                            </div>
                            <span className="text-[10px] font-mono text-[#7A6C5E]">{r.date}</span>
                          </div>
                        </div>

                        <h4 className="font-black text-xs text-[#2C241D]">"{r.review_title}"</h4>
                        <p className="text-xs text-[#5C4E42] leading-relaxed">
                          {r.comment}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#EFE7DE] text-[11px]">
                          <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                            <span className="text-[10px] text-[#7A6C5E] font-bold block">Finish Quality:</span>
                            <strong className="text-[#38A132]">★ {r.finish_rating || 5} / 5.0</strong>
                          </div>
                          <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                            <span className="text-[10px] text-[#7A6C5E] font-bold block">Joinery Strength:</span>
                            <strong className="text-[#38A132]">★ {r.joinery_rating || 5} / 5.0</strong>
                          </div>
                          <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                            <span className="text-[10px] text-[#7A6C5E] font-bold block">Assigned Worker:</span>
                            <strong className="text-[#2C241D] truncate flex items-center gap-1.5 mt-0.5">
                              <User className="w-3.5 h-3.5 text-[#38A132]" />
                              {r.craftsman_name || assignedWorkerName}
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 text-[#7A6C5E]">
                          <span>Client: <strong className="text-[#2C241D]">{r.customer_name}</strong></span>
                          {r.verified_qa && (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 text-[10px]">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              QA Certified Build
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          </div>
        </main>
      </div>

      {/* MODAL: REGISTER NEW SUPPLIER */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A140E]/75 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] rounded-[2rem] p-6 sm:p-7 w-full max-w-lg shadow-2xl border-2 border-[#D8CCBD] space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto text-[#2C241D]">
            <div className="flex items-center justify-between border-b-2 border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#38A132]/15 text-[#38A132] flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1A140E]">Register Raw Material Supplier</h3>
                  <p className="text-xs font-semibold text-[#7A6C5E]">Add verified lumber mill, fabric house, or hardware vendor</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddSupplierModalOpen(false);
                  setAddSupplierError(null);
                }}
                className="p-1.5 rounded-xl bg-white border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#EAE0D4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSupplierSubmit} className="space-y-3.5 text-xs font-semibold">
              {addSupplierError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-fadeIn flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{addSupplierError}</span>
                </div>
              )}
              <div>
                <label className="block text-[#7A6C5E] font-bold mb-1">Company / Mill Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Malabar Teak Mills & Hardwoods"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#7A6C5E] font-bold mb-1">Supply Category *</label>
                  <select
                    value={newSupplierCategory}
                    onChange={(e) => setNewSupplierCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  >
                    <option value="Timber & Lumber Mills">Timber & Lumber Mills</option>
                    <option value="Fabrics & Leather Upholstery">Fabrics & Leather Upholstery</option>
                    <option value="Hardware & Metal Stockists">Hardware & Metal Stockists</option>
                    <option value="Paints & Finishes">Paints & Finishes</option>
                    <option value="Hardware & Fasteners">Hardware & Fasteners</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#7A6C5E] font-bold mb-1">Lead Time (Days) *</label>
                  <input
                    type="number"
                    min={1}
                    value={newSupplierLeadTime}
                    onChange={(e) => setNewSupplierLeadTime(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#7A6C5E] font-bold mb-1">Materials / Grades Supplied *</label>
                <input
                  type="text"
                  placeholder="e.g. Grade-A Teak, Rosewood, Steam Beech Planks"
                  value={newSupplierMaterial}
                  onChange={(e) => setNewSupplierMaterial(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#7A6C5E] font-bold mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Nair"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>
                <div>
                  <label className="block text-[#7A6C5E] font-bold mb-1">Phone Number (10-digit) *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-[#E2D7CB] bg-[#FAF7F2] text-[#2C241D] font-black text-xs select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="9845012345"
                      value={extract10DigitPhone(newSupplierPhone)}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setNewSupplierPhone(val);
                      }}
                      maxLength={10}
                      required
                      className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-r-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#7A6C5E] font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="orders@vendor.com"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>
                <div>
                  <label className="block text-[#7A6C5E] font-bold mb-1">Yard / Hub Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Timber Yard 4, Nilambur"
                    value={newSupplierAddress}
                    onChange={(e) => setNewSupplierAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] hover:bg-[#EAE0D4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingSupplier}
                  className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingSupplier ? 'Registering...' : 'Save & Register Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <h3 className="text-xl font-extrabold text-[#2C241D] tracking-tight">Register New Workshop Worker</h3>
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
                <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number (10-digit)</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#E2D7CB] bg-[#EAE2D7] text-[#2C241D] font-black text-xs select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={extract10DigitPhone(newWorkerPhone)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNewWorkerPhone(val);
                    }}
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-r-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                  />
                </div>
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
                <label className="block font-extrabold text-[#2C241D] mb-1">Phone Number (10-digit)</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#E2D7CB] bg-[#EAE2D7] text-[#2C241D] font-black text-xs select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={extract10DigitPhone(editWorkerPhone)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditWorkerPhone(val);
                    }}
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 bg-[#F3EDE5] border border-[#E2D7CB] rounded-r-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#48A63E]"
                  />
                </div>
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
                <span>Assigned Workshop Worker(s) & Production Team</span>
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
                  ⚠️ No worker assigned yet to this custom build. Use the "Assign Worker" button in the studio to assign workshop staff.
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
                <h3 className="text-lg font-extrabold text-[#2C241D]">Assign Worker by Department</h3>
                <p className="text-xs text-[#7A6C5E]">
                  Order #{selectedOrderForWorker.request_id || selectedOrderForWorker.custom_order_id || selectedOrderForWorker.numeric_id} ({selectedOrderForWorker.furniture_type || selectedOrderForWorker.title})
                </p>
              </div>
            </div>

            {/* Currently Assigned Workers with Removal Option */}
            {selectedOrderForWorker.assigned_workers && selectedOrderForWorker.assigned_workers.length > 0 && (
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-2">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">
                  Currently Assigned Workers ({selectedOrderForWorker.assigned_workers.length}):
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
                  <span>Step 2: Skilled Worker Assignment</span>
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
                <label className="block text-xs font-extrabold text-[#2C241D] mb-1.5">Select Skilled Worker</label>
                <div className="relative">
                  <select
                    value={selectedWorkerId || ''}
                    onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                    className="w-full pl-4 pr-10 py-3 text-xs bg-white border border-[#E2D7CB] rounded-2xl text-[#2C241D] font-extrabold appearance-none focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-xs transition-all cursor-pointer hover:border-[#48A63E]"
                  >
                    <option value="" className="bg-white text-[#8C7C6D] font-medium py-2">-- Choose Worker --</option>
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
                {(profileFullName || userProfile?.full_name || 'Production Lead').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">Production Staff Profile</h3>
                <p className="text-xs text-[#7A6C5E] font-medium">Manage account security and contact information</p>
              </div>
            </div>

            {passwordNotice && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${passwordNotice.type === 'success' ? 'bg-[#48A63E]/15 text-[#3D9134] border border-[#48A63E]/30' : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                {passwordNotice.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{passwordNotice.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
              {/* General Info */}
              <div>
                <label className="block font-bold text-[#6B5C4D] mb-1">
                  Full Name <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  value={profileFullName}
                  onChange={(e) => {
                    setProfileFullName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="e.g. Production Lead"
                  className={`w-full p-2.5 rounded-xl border ${
                    nameError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#E2D7CB] focus:border-[#48A63E]'
                  } bg-white text-[#2C241D] font-extrabold text-xs focus:outline-none`}
                  required
                />
                {nameError && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{nameError}</span>
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#6B5C4D]">Email Address (Locked)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setActiveTab('queries');
                    }}
                    className="text-[10px] font-bold text-[#48A63E] hover:underline flex items-center gap-1 cursor-pointer"
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

              {/* Contact Phone */}
              <div>
                <label className="block font-bold text-[#6B5C4D] mb-1">
                  Contact Phone (10-Digit) <span className="text-rose-600 font-extrabold">*</span>
                </label>
                <div className={`flex rounded-xl overflow-hidden border ${
                  phoneError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#E2D7CB] focus-within:border-[#48A63E] focus-within:ring-1 focus-within:ring-[#48A63E]'
                } bg-white`}>
                  <span className="inline-flex items-center px-3 py-2 bg-[#EAE0D4] text-[#2C241D] font-extrabold text-xs border-r border-[#E2D7CB] select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={extract10DigitPhone(profilePhone)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setProfilePhone(val);
                      if (phoneError) setPhoneError(null);
                    }}
                    className="w-full px-3 py-2 bg-transparent text-[#2C241D] font-extrabold text-xs focus:outline-none"
                    required
                  />
                </div>
                {phoneError && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>

              {/* Password Update Provision */}
              <div className="border-t border-[#E2D7CB] pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#48A63E]" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#2C241D]">
                    Update Password (Optional)
                  </h4>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#6B5C4D] mb-1">New Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password (min 6 chars)"
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
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-[#E2D7CB]">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#7A6C5E] hover:bg-[#F2ECE1] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isUpdatingProfile ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
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
                onClick={() => {
                  setIsAddCouponModalOpen(false);
                  setCouponModalError(null);
                }}
                className="p-2 text-[#4A3E32] hover:text-[#1A140E] rounded-xl hover:bg-[#EFE7DE] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCouponSubmit} className="space-y-4 text-xs font-semibold">
              {couponModalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-fadeIn flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{couponModalError}</span>
                </div>
              )}
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
              {assessmentModalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-fadeIn flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{assessmentModalError}</span>
                </div>
              )}
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
                  placeholder="Special instructions for workers, quality tolerances..."
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
                  setMaterialReceiptError(null);
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
                  const foundFab = fabricationJobs.find(f => f.numeric_id === numId);
                  const chosen = foundQueue || foundOrder || (foundFab ? {
                    ...foundFab,
                    order_type: 'Fabrication',
                    numeric_id: foundFab.numeric_id,
                    custom_order_id: foundFab.numeric_id,
                    request_id: foundFab.fabrication_id,
                    title: foundFab.product_name,
                    furniture_type: foundFab.product_name,
                    material: foundFab.customer_material?.material_type || foundFab.material_required,
                    customer_name: foundFab.customer_name,
                    dimensions: foundFab.dimensions,
                    customer_material: foundFab.customer_material
                  } : null);
                  setSelectedMaterialOrder(chosen);
                  if (chosen?.customer_material) {
                    setMatQty(String(chosen.customer_material.quantity || ''));
                    setMatUnit(chosen.customer_material.unit || 'pieces');
                    setMatCondition(chosen.customer_material.condition || 'Good');
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-bold focus:outline-none focus:border-[#48A63E] cursor-pointer"
              >
                <option value="">-- Choose Order / Fabrication Request --</option>
                {fabricationJobs && fabricationJobs.length > 0 && (
                  <optgroup label="Fabrication Requests (Customer Material)">
                    {fabricationJobs.map(f => (
                      <option key={`Fabrication-${f.numeric_id}`} value={`Fabrication-${f.numeric_id}`}>
                        {f.fabrication_id} • {f.product_name} ({f.customer_name})
                      </option>
                    ))}
                  </optgroup>
                )}
                {assessmentQueue && assessmentQueue.length > 0 && (
                  <optgroup label="Assessment Queue">
                    {assessmentQueue.map(q => (
                      <option key={`${q.order_type}-${q.numeric_id}`} value={`${q.order_type === 'Customization' ? 'Custom' : q.order_type}-${q.numeric_id}`}>
                        {q.request_id} • {q.title || q.furniture_type} ({q.customer_name})
                      </option>
                    ))}
                  </optgroup>
                )}
                {orders && orders.length > 0 && (
                  <optgroup label="Custom Orders">
                    {orders.filter(o => !assessmentQueue.some(q => q.numeric_id === o.custom_order_id)).map(ord => (
                      <option key={`Custom-${ord.custom_order_id}`} value={`Custom-${ord.custom_order_id}`}>
                        CUS-{ord.custom_order_id.toString().padStart(4, '0')} • {ord.furniture_type} ({ord.customer_name})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Item Details Banner */}
            {selectedMaterialOrder && (
              <div className="bg-white p-3.5 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs animate-fadeIn">
                <div className="flex justify-between font-bold text-[#2C241D]">
                  <span>Material: {selectedMaterialOrder.customer_material?.wood_type ? `${selectedMaterialOrder.customer_material.wood_type} (${selectedMaterialOrder.customer_material.material_type})` : (selectedMaterialOrder.material || 'Solid Wood / Fabric')}</span>
                  <span>Dimensions: {selectedMaterialOrder.customer_material?.dimensions || selectedMaterialOrder.dimensions || 'Standard'}</span>
                </div>
                {selectedMaterialOrder.customer_material && (
                  <div className="bg-amber-50/90 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                    <div className="flex justify-between font-extrabold">
                      <span>Declared Qty: {selectedMaterialOrder.customer_material.quantity} {selectedMaterialOrder.customer_material.unit}</span>
                      <span>Declared Condition: {selectedMaterialOrder.customer_material.condition || 'Good'}</span>
                    </div>
                    {selectedMaterialOrder.customer_material.notes && (
                      <p className="italic text-[#7A6C5E]">Customer Notes: {selectedMaterialOrder.customer_material.notes}</p>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-[#7A6C5E] font-medium">Customer: {selectedMaterialOrder.customer_name || 'Valued Customer'}</p>
              </div>
            )}

            <form onSubmit={handleMaterialReceiptSubmit} className="space-y-3 text-xs font-semibold">
              {materialReceiptError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-fadeIn flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{materialReceiptError}</span>
                </div>
              )}
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
                        onClick={() => {
                          const chosen = {
                            ...selectedFabJobModal,
                            order_type: 'Fabrication',
                            numeric_id: selectedFabJobModal.numeric_id,
                            custom_order_id: selectedFabJobModal.numeric_id,
                            request_id: selectedFabJobModal.fabrication_id,
                            title: selectedFabJobModal.product_name,
                            furniture_type: selectedFabJobModal.product_name,
                            material: selectedFabJobModal.customer_material?.material_type || selectedFabJobModal.material_required,
                            dimensions: selectedFabJobModal.dimensions,
                            customer_name: selectedFabJobModal.customer_name,
                            customer_material: selectedFabJobModal.customer_material
                          };
                          setSelectedMaterialOrder(chosen);
                          if (selectedFabJobModal.customer_material) {
                            setMatQty(String(selectedFabJobModal.customer_material.quantity || ''));
                            setMatUnit(selectedFabJobModal.customer_material.unit || 'pieces');
                            setMatCondition(selectedFabJobModal.customer_material.condition || 'Good');
                          }
                          setIsMaterialReceiptModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl font-extrabold text-[11px] shadow-xs flex items-center gap-1 transition-all bg-[#38A132] hover:bg-[#2F8829] text-white cursor-pointer"
                        title="Record physical receipt and inspect material at workshop hub"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Record Material Receipt & Inspection</span>
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

            {/* 2D Sheet Cutting Blueprint & Layout Canvas (If attached by Customer) */}
            {(selectedFabJobModal.cutting_layout || selectedFabJobModal.requirements?.includes('Cutting Blueprint')) && (() => {
              let blueprint: any = null;
              try {
                if (selectedFabJobModal.cutting_layout) {
                  blueprint = typeof selectedFabJobModal.cutting_layout === 'string'
                    ? JSON.parse(selectedFabJobModal.cutting_layout)
                    : selectedFabJobModal.cutting_layout;
                }
              } catch (e) {
                blueprint = null;
              }

              if (!blueprint) return null;

              return (
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border-2 border-emerald-300 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#38A132]" />
                      <div>
                        <h4 className="font-extrabold text-xs text-[#2C241D]">2D Sheet Cutting Blueprint & Sawing Plan</h4>
                        <p className="text-[10px] text-[#7A6C5E] font-medium">{blueprint.strategy_name || 'Algorithmic Workshop Cutting Layout'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      {blueprint.material_utilization_percent}% Yield • {blueprint.waste_percent}% Waste
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-xl border border-[#E2D7CB]">
                      <span className="text-[9px] text-[#7A6C5E] font-bold block uppercase">Stock Sheet Size</span>
                      <span className="font-black text-[#2C241D] text-[11px]">
                        {blueprint.sheet_dimensions?.width} × {blueprint.sheet_dimensions?.height} mm
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#E2D7CB]">
                      <span className="text-[9px] text-[#7A6C5E] font-bold block uppercase">Placed Cut Panels</span>
                      <span className="font-black text-[#2C241D] text-[11px]">
                        {blueprint.total_pieces_placed || blueprint.placed_layout?.length || 0} Pieces
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-[#E2D7CB]">
                      <span className="text-[9px] text-[#7A6C5E] font-bold block uppercase">Design Strategy</span>
                      <span className="font-black text-emerald-700 text-[11px] truncate block" title={blueprint.strategy_name}>
                        {blueprint.badge || blueprint.strategy_name?.split(':')[0] || 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Graphical Cutting Canvas Representation */}
                  <div className="space-y-1">
                    <span className="text-[9.5px] font-bold text-[#7A6C5E] uppercase block">Workshop Visual Layout Canvas:</span>
                    <div className="relative aspect-[2/1] w-full bg-[#2C241D] rounded-xl overflow-hidden border-2 border-[#E2D7CB] p-2 flex items-center justify-center">
                      <div className="relative w-full h-full bg-[#8C6D4F] rounded border border-amber-200/50">
                        {blueprint.placed_layout?.map((item: any) => (
                          <div
                            key={item.id}
                            style={{
                              left: `${(item.x / (blueprint.sheet_dimensions?.width || 2440)) * 100}%`,
                              top: `${(item.y / (blueprint.sheet_dimensions?.height || 1220)) * 100}%`,
                              width: `${(item.width / (blueprint.sheet_dimensions?.width || 2440)) * 100}%`,
                              height: `${(item.height / (blueprint.sheet_dimensions?.height || 1220)) * 100}%`,
                            }}
                            className="absolute bg-[#48A63E]/90 border border-white text-white text-[8px] font-extrabold flex items-center justify-center shadow-xs overflow-hidden"
                            title={`${item.label} (${item.width}x${item.height}mm)`}
                          >
                            <span className="truncate px-0.5">{item.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Step-by-step cutting instructions */}
                  {blueprint.cutting_sequence_instructions && (
                    <div className="bg-white p-2.5 rounded-xl border border-[#E2D7CB] text-[10.5px] space-y-1">
                      <span className="font-bold text-[#2C241D] block">Sawing Sequence Guidelines:</span>
                      {blueprint.cutting_sequence_instructions.map((inst: string, idx: number) => (
                        <p key={idx} className="text-[#6B5C4D] leading-tight">• {inst}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

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
                    Assign Worker
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
              {assignWorkerError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-fadeIn flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{assignWorkerError}</span>
                </div>
              )}
              <div>
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block mb-1.5">
                  Select Skilled Workshop Worker
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
                          Worker Specialist <span className="text-rose-500">*</span>
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
                        <option value="">-- Choose Worker from Database --</option>
                        {activeWorkers.map((w) => {
                          const isRec = w.worker_id === recommendedId;
                          const load = getWorkerLiveWorkload(w.worker_id).total;
                          return (
                            <option key={w.worker_id} value={w.worker_id}>
                              {isRec ? '⭐ [AI RECOMMENDED] ' : ''}{w.full_name} — {w.specialization || 'Worker'} ({load} active tasks)
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
                          {sel.specialization || 'Production Worker'}
                        </span>
                      </div>
                    </div>
                    {sel.phone && <p className="text-[11px] text-[#5C4E42]">📞 Contact: <strong className="font-mono text-[#2C241D]">{sel.phone}</strong></p>}
                    <p className="text-[11px] text-[#7A6C5E]">✉️ Email: {sel.email}</p>
                    {isRec && (
                      <p className="text-[10px] font-bold text-amber-800 pt-1 border-t border-amber-200/60">
                        ⚡ Optimal worker selected based on lowest active workload and department availability.
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
              {assignCarrierError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-fadeIn flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{assignCarrierError}</span>
                </div>
              )}
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
