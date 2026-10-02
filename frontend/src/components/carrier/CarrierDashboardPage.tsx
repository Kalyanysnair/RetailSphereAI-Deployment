import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearUserSession } from '../../utils/sessionUtils';
import {
  LayoutDashboard,
  Truck,
  History,
  Users,
  FileCheck2,
  User,
  LogOut,
  Sparkles,
  Search,
  Plus,
  Bell,
  ChevronDown,
  ShieldCheck,
  X,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  Building2,
  FileText,
  DollarSign,
  ArrowUpRight,
  Filter,
  Check,
  Navigation,
  Key,
  Lock,
  Printer,
  Edit3,
  Car,
  Receipt,
  Map,
  BadgeDollarSign,
  Layers,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

import {
  fetchCarrierSummary,
  fetchCurrentDeliveries,
  fetchPreviousDeliveries,
  updateCarrierDeliveryStatus,
  assignPersonnelToDelivery,
  fetchDeliveryPersonnel,
  createDeliveryPersonnel,
  updateDeliveryPersonnel,
  fetchCarrierAgreements,
  fetchCarrierSettlements,
  fetchPersonnelEmailChangeRequests,
  reviewPersonnelEmailChangeRequest,
  CarrierSummaryResponse,
  CarrierDeliveryItem,
  DeliveryPersonnelItem,
  CarrierAgreementItem,
  CarrierSettlementItem,
  CarrierEmailChangeRequestItem
} from '../../services/api_carrier_portal';

import { getCurrentUser, updateUserProfile, changePasswordUser } from '../../services/api';
import DeliveryRouteMap from '../common/DeliveryRouteMap';

export const CarrierDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'current_deliveries' | 'previous_deliveries' | 'personnel' | 'fleet_vehicles' | 'settlements' | 'agreements' | 'coverage_zones'
  >('dashboard');

  // Loading & Error States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
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
  const [loading, setLoading] = useState<boolean>(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Authenticated User & Agency Profile
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [carrierSummary, setCarrierSummary] = useState<CarrierSummaryResponse | null>(null);

  // Top Bar Dropdowns & Modals
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Data Collections
  const [currentDeliveries, setCurrentDeliveries] = useState<CarrierDeliveryItem[]>([]);
  const [previousDeliveries, setPreviousDeliveries] = useState<CarrierDeliveryItem[]>([]);
  const [personnelList, setPersonnelList] = useState<DeliveryPersonnelItem[]>([]);
  const [agreementsList, setAgreementsList] = useState<CarrierAgreementItem[]>([]);
  const [settlementsList, setSettlementsList] = useState<CarrierSettlementItem[]>([]);
  const [emailChangeRequests, setEmailChangeRequests] = useState<CarrierEmailChangeRequestItem[]>([]);
  const [isReviewingEmailReq, setIsReviewingEmailReq] = useState<boolean>(false);

  // Search & Filters
  const [currentSearch, setCurrentSearch] = useState<string>('');
  const [prevSearch, setPrevSearch] = useState<string>('');
  const [prevTypeFilter, setPrevTypeFilter] = useState<string>('ALL');
  const [personnelSearch, setPersonnelSearch] = useState<string>('');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [statusModalDelivery, setStatusModalDelivery] = useState<CarrierDeliveryItem | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<string>('Dispatched');
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  const [assignModalDelivery, setAssignModalDelivery] = useState<CarrierDeliveryItem | null>(null);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | ''>('');
  const [isAssigningPersonnel, setIsAssigningPersonnel] = useState<boolean>(false);

  const [isAddPersonnelModalOpen, setIsAddPersonnelModalOpen] = useState<boolean>(false);
  const [editingPersonnel, setEditingPersonnel] = useState<DeliveryPersonnelItem | null>(null);
  const [personnelFormData, setPersonnelFormData] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_type: 'Mini Truck',
    vehicle_reg: '',
    notes: ''
  });
  const [isSavingPersonnel, setIsSavingPersonnel] = useState<boolean>(false);

  const [viewingAgreement, setViewingAgreement] = useState<CarrierAgreementItem | null>(null);
  const [viewingRouteDelivery, setViewingRouteDelivery] = useState<CarrierDeliveryItem | null>(null);

  // Profile Form States (No old password required)
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User Initials Calculation
  const userInitials = useMemo(() => {
    const name = carrierSummary?.carrier_name || currentUser?.full_name || 'Carrier';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [carrierSummary, currentUser]);

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Initial Data Fetch
  const loadDashboardData = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user?.phone) {
        setProfilePhone(user.phone);
      }

      const [summary, current, prev, personnel, agreements, settlements, emailReqs] = await Promise.all([
        fetchCarrierSummary().catch(() => null),
        fetchCurrentDeliveries().catch(() => []),
        fetchPreviousDeliveries().catch(() => []),
        fetchDeliveryPersonnel().catch(() => []),
        fetchCarrierAgreements().catch(() => []),
        fetchCarrierSettlements().catch(() => []),
        fetchPersonnelEmailChangeRequests().catch(() => [])
      ]);

      if (summary) setCarrierSummary(summary);
      setCurrentDeliveries(current);
      setPreviousDeliveries(prev);
      setPersonnelList(personnel);
      setAgreementsList(agreements);
      setSettlementsList(settlements);
      setEmailChangeRequests(emailReqs);
    } catch (err: any) {
      console.error('Failed to load carrier portal data:', err);
      setErrorNotice(err.message || 'Failed to connect to Carrier Portal. Please verify your session.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEmailChange = async (req: CarrierEmailChangeRequestItem) => {
    if (!window.confirm(`Approve email change for "${req.personnel_name}" from "${req.current_email}" to "${req.requested_email}"?`)) {
      return;
    }
    setIsReviewingEmailReq(true);
    try {
      const res = await reviewPersonnelEmailChangeRequest(req.request_id, 'APPROVE');
      setSuccessNotice(res.message || `Email changed successfully for ${req.personnel_name}.`);
      await loadDashboardData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to approve email change.');
    } finally {
      setIsReviewingEmailReq(false);
    }
  };

  const handleRejectEmailChange = async (req: CarrierEmailChangeRequestItem) => {
    const reason = window.prompt(`Enter rejection reason for "${req.personnel_name}" (Optional):`, 'Declined by carrier partner.');
    if (reason === null) return; // User cancelled prompt

    setIsReviewingEmailReq(true);
    try {
      const res = await reviewPersonnelEmailChangeRequest(req.request_id, 'REJECT', reason);
      setSuccessNotice(res.message || `Email change request for ${req.personnel_name} declined.`);
      await loadDashboardData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to decline email change.');
    } finally {
      setIsReviewingEmailReq(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filtered Current Deliveries
  const filteredCurrentDeliveries = useMemo(() => {
    if (!currentSearch.trim()) return currentDeliveries;
    const q = currentSearch.toLowerCase();
    return currentDeliveries.filter(
      (d) =>
        d.order_id.toLowerCase().includes(q) ||
        d.tracking_number.toLowerCase().includes(q) ||
        d.customer_name.toLowerCase().includes(q) ||
        d.destination_address.toLowerCase().includes(q) ||
        (d.job_type && d.job_type.toLowerCase().includes(q))
    );
  }, [currentDeliveries, currentSearch]);

  // Filtered Previous Deliveries
  const filteredPreviousDeliveries = useMemo(() => {
    let list = previousDeliveries;
    if (prevTypeFilter !== 'ALL') {
      list = list.filter((d) => d.job_type === prevTypeFilter);
    }
    if (prevSearch.trim()) {
      const q = prevSearch.toLowerCase();
      list = list.filter(
        (d) =>
          d.order_id.toLowerCase().includes(q) ||
          d.tracking_number?.toLowerCase().includes(q) ||
          d.customer_name.toLowerCase().includes(q) ||
          d.destination_address.toLowerCase().includes(q)
      );
    }
    return list;
  }, [previousDeliveries, prevSearch, prevTypeFilter]);

  // Filtered Personnel
  const filteredPersonnel = useMemo(() => {
    if (!personnelSearch.trim()) return personnelList;
    const q = personnelSearch.toLowerCase();
    return personnelList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.vehicle_reg && p.vehicle_reg.toLowerCase().includes(q))
    );
  }, [personnelList, personnelSearch]);

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    let list = personnelList.filter((p) => p.vehicle_reg || p.vehicle_type);
    if (vehicleFilter !== 'ALL') {
      list = list.filter((p) => p.vehicle_type === vehicleFilter);
    }
    return list;
  }, [personnelList, vehicleFilter]);

  // Active Personnel for Assignment Dropdown
  const activePersonnelOptions = useMemo(() => {
    return personnelList.filter((p) => p.status === 'ACTIVE');
  }, [personnelList]);

  // Delivery status badge rendering helper
  const getDeliveryStatusBadge = (status: string, isAssigned: boolean) => {
    const norm = (status || '').toLowerCase();
    if (!isAssigned || norm.includes('pending') || norm.includes('unassigned') || norm.includes('awaiting')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
          {status || 'Pending Driver Allotment'}
        </span>
      );
    }
    if (norm.includes('pickup')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs">
          {status}
        </span>
      );
    }
    if (norm.includes('transit') || norm.includes('dispatched')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-2xs">
          {status}
        </span>
      );
    }
    if (norm.includes('delivered') || norm.includes('completed')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
          {status}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
        {status}
      </span>
    );
  };

  // Total Payouts Calculated
  const totalSettledEarnings = useMemo(() => {
    return settlementsList.reduce((acc, s) => acc + (s.carrier_payout || 0), 0);
  }, [settlementsList]);

  // Handle Delivery Status Update
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalDelivery) return;
    setIsUpdatingStatus(true);
    try {
      await updateCarrierDeliveryStatus(statusModalDelivery.fulfillment_id, newStatusValue, statusNotes);
      setSuccessNotice(`Delivery status updated to '${newStatusValue}' successfully.`);
      setStatusModalDelivery(null);
      setStatusNotes('');
      await loadDashboardData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update delivery status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Personnel Assignment
  const handleAssignPersonnelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalDelivery || !selectedPersonnelId) return;
    setIsAssigningPersonnel(true);
    try {
      await assignPersonnelToDelivery(assignModalDelivery.fulfillment_id, Number(selectedPersonnelId));
      setSuccessNotice('Assigned delivery personnel successfully.');
      setAssignModalDelivery(null);
      setSelectedPersonnelId('');
      await loadDashboardData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to assign delivery personnel.');
    } finally {
      setIsAssigningPersonnel(false);
    }
  };

  // Handle Personnel Form Submit (Add or Edit)
  const handleSavePersonnelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personnelFormData.name.trim() || !personnelFormData.phone.trim()) {
      setErrorNotice('Name and Phone number are required fields.');
      return;
    }
    setIsSavingPersonnel(true);
    try {
      if (editingPersonnel) {
        await updateDeliveryPersonnel(editingPersonnel.personnel_id, personnelFormData);
        setSuccessNotice(`Updated personnel details for '${personnelFormData.name}'.`);
      } else {
        await createDeliveryPersonnel(personnelFormData);
        setSuccessNotice(`Added new Delivery Personnel '${personnelFormData.name}'.`);
      }
      setIsAddPersonnelModalOpen(false);
      setEditingPersonnel(null);
      setPersonnelFormData({
        name: '',
        phone: '',
        email: '',
        vehicle_type: 'Mini Truck',
        vehicle_reg: '',
        notes: ''
      });
      await loadDashboardData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to save delivery personnel.');
    } finally {
      setIsSavingPersonnel(false);
    }
  };

  // Toggle Personnel Status (Active / Inactive)
  const handleTogglePersonnelStatus = async (person: DeliveryPersonnelItem) => {
    const nextStatus = person.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateDeliveryPersonnel(person.personnel_id, { status: nextStatus });
      setSuccessNotice(`Delivery Personnel marked as ${nextStatus}.`);
      await loadDashboardData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update personnel status.');
    }
  };

  // Profile Save Handler (No old password required)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    const hasPasswordUpdate = Boolean(newPassword.trim());

    if (hasPasswordUpdate) {
      if (newPassword.trim().length < 6) {
        setProfileMessage({ type: 'error', text: 'New password must be at least 6 characters long.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileMessage({ type: 'error', text: 'New password and confirmation do not match.' });
        return;
      }
    }

    setIsUpdatingProfile(true);
    try {
      if (hasPasswordUpdate) {
        await changePasswordUser(newPassword.trim());
      }
      if (profilePhone.trim() && profilePhone.trim() !== currentUser?.phone) {
        await updateUserProfile({
          full_name: currentUser?.full_name || carrierSummary?.carrier_name || 'Carrier Partner',
          phone: profilePhone.trim()
        });
      }
      setProfileMessage({
        type: 'success',
        text: hasPasswordUpdate
          ? 'Profile and security credentials updated successfully.'
          : 'Contact information updated successfully.'
      });
      setNewPassword('');
      setConfirmPassword('');
      await loadDashboardData();
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Logout
  const handleLogout = () => {
    clearUserSession();
    navigate('/login');
  };

  // Structured Navigation Categories
  const navCategories = [
    {
      title: 'Logistics Operations',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Overview',
          icon: LayoutDashboard
        },
        {
          id: 'current_deliveries',
          label: 'Active Deliveries',
          icon: Truck
        },
        {
          id: 'previous_deliveries',
          label: 'Delivery History',
          icon: History
        }
      ]
    },
    {
      title: 'Fleet & Drivers',
      items: [
        {
          id: 'personnel',
          label: 'Delivery Personnel',
          icon: Users
        },
        {
          id: 'fleet_vehicles',
          label: 'Fleet & Vehicles',
          icon: Car
        }
      ]
    },
    {
      title: 'Financials & Coverage',
      items: [
        {
          id: 'settlements',
          label: 'Payout Settlements',
          icon: BadgeDollarSign
        },
        {
          id: 'agreements',
          label: 'Commercial SLAs',
          icon: FileCheck2
        },
        {
          id: 'coverage_zones',
          label: 'Service Hub & Zones',
          icon: MapPin
        }
      ]
    }
  ];

  return (
    <div className="relative min-h-screen text-[#2C2016] flex selection:bg-[#38A132] selection:text-white overflow-x-hidden font-sans admin-theme">
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
                Carrier Partner
              </div>
            </div>
          </button>
        </div>

        {/* Sidebar Scrollable Nav List with Categories */}
        <nav className="flex-1 space-y-3.5 text-xs max-h-[calc(100vh-140px)] overflow-y-auto pr-0.5 scrollbar-none">
          {navCategories.map((cat, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
                isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
              }`}>
                {isSidebarCollapsed ? (
                  <div className="h-px bg-[#DFD2C0]/80 mx-1" />
                ) : (
                  <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                    {cat.title}
                  </div>
                )}
              </div>
              {cat.items.map((item) => {
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
          ))}
        </nav>
      </aside>

      {/* MAIN RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Navigation Header */}
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E6E1DA] p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-[#2C241D]">Carrier Portal</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {navCategories.flatMap((c) => c.items).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                  activeTab === item.id ? 'bg-[#38A132] text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
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
            {/* Glossy Top Reflection Sheen */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-3xl" />

            {/* Success Notice Banner */}
            {successNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] flex items-start gap-3 shadow-md animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-[#48A63E] flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">
                  {successNotice}
                </div>
                <button onClick={() => setSuccessNotice(null)} className="text-[#48A63E] hover:text-[#3D9134] p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error Notice Banner */}
            {errorNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-md animate-fadeIn">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">
                  {errorNotice}
                </div>
                <button onClick={() => setErrorNotice(null)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Page Top Header with Partner Profile & Sign Out in Top Right */}
            <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                  {activeTab === 'dashboard' && 'Carrier Operations Dashboard'}
                  {activeTab === 'current_deliveries' && 'Current Deliveries & Active Transit'}
                  {activeTab === 'previous_deliveries' && 'Previous Deliveries History'}
                  {activeTab === 'personnel' && 'Agency Delivery Personnel & Drivers'}
                  {activeTab === 'fleet_vehicles' && 'Vehicle Fleet & Registry'}
                  {activeTab === 'settlements' && 'Payout Settlements & Earnings'}
                  {activeTab === 'agreements' && 'Carrier Agreements & SLAs'}
                  {activeTab === 'coverage_zones' && 'Service Hub & Coverage Areas'}
                </h1>
                <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                  {activeTab === 'dashboard' && 'Authorized partner portal for logistics fulfillment, fleet dispatch, and agreement monitoring.'}
                  {activeTab === 'current_deliveries' && 'Manage assigned shipments in transit, update milestones, and coordinate driver handovers.'}
                  {activeTab === 'previous_deliveries' && 'Review fulfilled delivery logs, completed dispatches, and proof of deliveries.'}
                  {activeTab === 'personnel' && 'Manage registered drivers, availability, and active job loads.'}
                  {activeTab === 'fleet_vehicles' && 'Monitor vehicle fleet specifications, registration numbers, and driver allocations.'}
                  {activeTab === 'settlements' && 'Review completed delivery payout invoices, per-km transit rates, and settlement ledgers.'}
                  {activeTab === 'agreements' && 'View binding Master Service Agreements, per-km rates, base payouts, and SLA terms.'}
                  {activeTab === 'coverage_zones' && 'Operational dispatch hubs, covered pin codes, and emergency logistics contact lines.'}
                </p>
              </div>

              {/* Top Right Controls (No Refresh Button) */}
              <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">
                {/* Global Search Field */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7A6C5E]" />
                  <input
                    type="text"
                    placeholder="Search Deliveries, Personnel..."
                    value={activeTab === 'personnel' ? personnelSearch : currentSearch}
                    onChange={(e) => {
                      if (activeTab === 'personnel') setPersonnelSearch(e.target.value);
                      else setCurrentSearch(e.target.value);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 bg-white/90 border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#38A132] shadow-2xs text-[#2C241D]"
                  />
                </div>

                {/* Notification Bell Button & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      setIsUserMenuOpen(false);
                    }}
                    className="relative p-2 rounded-xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] text-[#2C241D] transition-all shadow-xs flex items-center justify-center cursor-pointer"
                    title="System Notifications"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#48A63E]" />
                    {currentDeliveries.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-600 text-white font-extrabold text-[8px] rounded-full flex items-center justify-center animate-pulse">
                        {currentDeliveries.length}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-3 z-[100] animate-fadeIn space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                        <span className="font-extrabold text-xs text-[#2C241D]">Logistics Notifications</span>
                        <span className="text-[10px] font-bold text-[#48A63E]">Active Status</span>
                      </div>

                      <div className="space-y-1.5 max-h-64 overflow-y-auto text-xs">
                        {currentDeliveries.length === 0 ? (
                          <div className="p-4 text-center text-[#8C7C6D]">
                            <CheckCircle2 className="w-6 h-6 text-[#48A63E] mx-auto opacity-70 mb-1" />
                            <p className="text-xs font-extrabold text-[#2C241D]">All dispatches caught up</p>
                            <p className="text-[10px] text-[#A09080]">No active jobs awaiting transit update</p>
                          </div>
                        ) : (
                          currentDeliveries.map((d) => (
                            <div
                              key={d.fulfillment_id}
                              onClick={() => {
                                setActiveTab('current_deliveries');
                                setIsNotificationsOpen(false);
                              }}
                              className="p-2.5 rounded-xl border border-[#48A63E]/40 bg-[#F3EDE5] font-bold transition-all space-y-1 cursor-pointer hover:bg-[#EAE0D4]"
                            >
                              <div className="flex items-center justify-between text-[11px] mb-0.5">
                                <span className="font-extrabold text-[#2C241D] pr-2">{d.order_id}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  !d.assigned_personnel || (d.delivery_status || '').toLowerCase().includes('pending')
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {d.delivery_status}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#5C4E42] leading-snug font-normal">
                                Destination: {d.destination_address}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Partner Name Dropdown Pill (View Profile & Sign Out inside) */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                      setIsNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs cursor-pointer"
                    title="Click for profile and sign out options"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                      {userInitials}
                    </div>
                    <span className="text-xs font-extrabold text-[#2C241D] max-w-[140px] truncate">
                      {carrierSummary?.carrier_name || currentUser?.full_name || 'Carrier Partner'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                  </button>

                  {/* Dropdown Menu on Click */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                      <button
                        onClick={() => {
                          setProfileMessage(null);
                          setIsProfileModalOpen(true);
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#EAE0D4] transition-colors text-left cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[#48A63E]" />
                        <span>View Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('agreements');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#EAE0D4] transition-colors text-left cursor-pointer"
                      >
                        <FileCheck2 className="w-4 h-4 text-[#48A63E]" />
                        <span>SLA Agreements</span>
                      </button>
                      <div className="border-t border-[#E2D7CB] my-1" />
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-700 hover:bg-rose-100/80 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>

                {activeTab === 'personnel' && (
                  <button
                    onClick={() => {
                      setEditingPersonnel(null);
                      setPersonnelFormData({
                        name: '',
                        phone: '',
                        email: '',
                        vehicle_type: 'Mini Truck',
                        vehicle_reg: '',
                        notes: ''
                      });
                      setIsAddPersonnelModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#38A132] text-white text-xs font-extrabold hover:bg-[#2E8B29] shadow-md shadow-[#38A132]/25 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Personnel</span>
                  </button>
                )}
              </div>
            </div>

            {/* ===================================================================== */}
            {/* TAB 1: DASHBOARD OVERVIEW                                            */}
            {/* ===================================================================== */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                {/* KPI Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm hover:shadow-md transition-all">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between mb-2">
                      <span>Active Deliveries</span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-[#38A132]">
                        <Truck className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {carrierSummary?.active_deliveries ?? currentDeliveries.length}
                    </div>
                    <div className="text-[11px] text-[#48A63E] font-extrabold mt-1">In transit & awaiting drop-off</div>
                  </div>

                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm hover:shadow-md transition-all">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between mb-2">
                      <span>Pending Dispatch</span>
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-700">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {carrierSummary?.pending_deliveries ?? 0}
                    </div>
                    <div className="text-[11px] text-amber-700 font-extrabold mt-1">Ready at RetailSphere Central Hub</div>
                  </div>

                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm hover:shadow-md transition-all">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between mb-2">
                      <span>Completed Deliveries</span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {carrierSummary?.completed_deliveries ?? previousDeliveries.length}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-extrabold mt-1">Successfully fulfilled</div>
                  </div>

                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm hover:shadow-md transition-all">
                    <div className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between mb-2">
                      <span>Delivery Personnel</span>
                      <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-700">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-[#2C241D]">
                      {carrierSummary?.delivery_personnel_count ?? personnelList.length}
                    </div>
                    <div className="text-[11px] text-blue-700 font-extrabold mt-1">Active registered staff</div>
                  </div>
                </div>

                {/* Master Agreement Status Banner */}
                {carrierSummary?.active_agreement ? (
                  <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#E2D7CB] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200">
                          Active SLA Agreement
                        </span>
                        <span className="font-mono text-xs text-[#7A6C5E] font-bold">
                          {carrierSummary.active_agreement.agreement_number}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-[#2C241D] tracking-tight">{carrierSummary.active_agreement.title}</h3>
                      <p className="text-xs text-[#5C4E42]">
                        Contracted Base Payout: <span className="font-bold text-[#2C241D]">₹{carrierSummary.active_agreement.base_payout_rate}</span> + Rate: <span className="font-bold text-[#38A132]">₹{carrierSummary.active_agreement.per_km_payout_rate}/km</span> route distance.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('agreements')}
                      className="px-5 py-2.5 rounded-xl bg-[#38A132] text-white text-xs font-black hover:bg-[#2F852A] shadow-md shadow-[#38A132]/20 transition-all self-start md:self-center cursor-pointer"
                    >
                      View Agreement Details
                    </button>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span>No active Master Agreement found. RetailSphere Admin can issue a formal agreement.</span>
                    </div>
                  </div>
                )}

                {/* Quick Action Preview: Current Active Deliveries */}
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-[#2C241D]">Active Deliveries Priority Queue</h4>
                      <p className="text-[11px] text-[#7A6C5E]">Jobs requiring transit updates or driver assignment</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('current_deliveries')}
                      className="text-xs font-extrabold text-[#38A132] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Deliveries</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {currentDeliveries.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-white border border-[#E2D7CB]/60 space-y-2">
                      <Truck className="w-8 h-8 text-[#7A6C5E]/50 mx-auto" />
                      <p className="text-sm font-bold text-[#2C241D]">No active deliveries at the moment</p>
                      <p className="text-xs text-[#7A6C5E]">New transportation jobs assigned by RetailSphere Staff will appear here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {currentDeliveries.slice(0, 4).map((d) => (
                        <div
                          key={d.fulfillment_id}
                          className="p-5 rounded-2xl bg-white border border-[#E2D7CB]/80 shadow-sm hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-extrabold text-[#2C241D]">{d.order_id}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 uppercase">
                                  {d.job_type.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#7A6C5E] mt-0.5">Tracking: {d.tracking_number}</p>
                            </div>
                            {getDeliveryStatusBadge(
                              d.delivery_status,
                              Boolean(d.assigned_personnel && d.assigned_personnel !== 'Unassigned')
                            )}
                          </div>

                          {/* Consignment Items from DB */}
                          {d.items && d.items.length > 0 && (
                            <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-extrabold text-[#7A6C5E] uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
                                  <Layers className="w-3.5 h-3.5 text-[#38A132]" />
                                  Ordered Products ({d.items.length})
                                </span>
                                <span className="font-extrabold text-[#2C241D]">
                                  Value: ₹{d.total_amount.toLocaleString()}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {d.items.map((it) => (
                                  <div key={it.item_id} className="flex items-center gap-2.5 p-1.5 rounded-lg bg-white border border-[#E2D7CB]/50">
                                    {it.image_url ? (
                                      <img src={it.image_url} alt={it.product_name} className="w-9 h-9 rounded-md object-cover border border-[#E2D7CB] flex-shrink-0" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center text-[#7A6C5E] flex-shrink-0">
                                        <Layers className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1 text-xs">
                                      <p className="font-bold text-[#2C241D] truncate leading-tight">{it.product_name}</p>
                                      <div className="flex items-center justify-between text-[10px] text-[#7A6C5E] mt-0.5">
                                        <span>Qty: <strong className="text-[#2C241D]">{it.quantity}</strong></span>
                                        <span className="font-bold text-[#38A132]">₹{it.unit_price.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-1.5 text-xs text-[#5C4E42] pt-2 border-t border-[#E2D7CB]/50">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-[#7A6C5E]">Destination:</p>
                                <p className="font-semibold truncate">{d.destination_address}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1 text-[#7A6C5E]">
                              <span>Distance: <strong className="text-[#2C241D]">{d.distance_km} km</strong></span>
                              <span>Recipient: <strong className="text-[#2C241D]">{d.customer_name}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#E2D7CB]/50">
                            <div className="text-xs">
                              <span className="text-[11px] text-[#7A6C5E]">Assigned Driver: </span>
                              <span className="font-bold text-[#2C241D]">
                                {typeof d.assigned_personnel === 'object' && d.assigned_personnel
                                  ? d.assigned_personnel.name
                                  : typeof d.assigned_personnel === 'string'
                                  ? d.assigned_personnel
                                  : 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setAssignModalDelivery(d);
                                  setSelectedPersonnelId(
                                    typeof d.assigned_personnel === 'object' && d.assigned_personnel
                                      ? d.assigned_personnel.personnel_id
                                      : ''
                                  );
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#F5ECE1] text-[#2C241D] text-[11px] font-bold hover:bg-[#E2D7CB] transition-all cursor-pointer"
                              >
                                Assign Driver
                              </button>
                              <button
                                onClick={() => {
                                  setStatusModalDelivery(d);
                                  setNewStatusValue(d.delivery_status || 'Dispatched');
                                  setStatusNotes(d.delivery_notes || '');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#38A132] text-white text-[11px] font-bold hover:bg-[#2F852A] transition-all cursor-pointer"
                              >
                                Update Status
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 2: CURRENT DELIVERIES                                             */}
            {/* ===================================================================== */}
            {activeTab === 'current_deliveries' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                {/* Search & Filter Bar */}
                <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-[#E2D7CB] shadow-sm flex items-center justify-between gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by Order ID, Tracking Number, Customer Name, or Address..."
                      value={currentSearch}
                      onChange={(e) => setCurrentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-xs bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                    />
                  </div>
                  <div className="text-xs font-extrabold text-[#7A6C5E] bg-[#FAF7F2] px-3 py-1.5 rounded-full border border-[#E2D7CB]">
                    {filteredCurrentDeliveries.length} Active Jobs
                  </div>
                </div>

                {filteredCurrentDeliveries.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-xl p-16 text-center rounded-3xl border border-[#E2D7CB] shadow-lg space-y-3">
                    <Truck className="w-10 h-10 text-[#7A6C5E]/40 mx-auto" />
                    <p className="text-sm font-extrabold text-[#2C241D]">No active deliveries found</p>
                    <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto font-medium">
                      There are no current transportation jobs matching your criteria. Once RetailSphere Staff dispatches a job to your agency, it will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredCurrentDeliveries.map((d) => (
                      <div
                        key={d.fulfillment_id}
                        className="p-6 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#E2D7CB] shadow-lg hover:shadow-xl transition-all space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2D7CB]/60">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-extrabold text-[#2C241D]">{d.order_id}</span>
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold bg-blue-50 text-blue-700 uppercase tracking-wide border border-blue-200">
                                {d.job_type.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-[#7A6C5E] mt-1">
                              Waybill / Tracking: <strong className="text-[#2C241D]">{d.tracking_number}</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getDeliveryStatusBadge(
                              d.delivery_status,
                              Boolean(d.assigned_personnel && d.assigned_personnel !== 'Unassigned')
                            )}
                          </div>
                        </div>

                        {/* Full Items list from DB */}
                        {d.items && d.items.length > 0 && (
                          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/70 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center gap-2">
                                <Layers className="w-4 h-4 text-[#38A132]" />
                                Consignment Cargo Items ({d.items.length} products)
                              </span>
                              <span className="text-xs font-black text-[#2C241D]">
                                Order Total: ₹{d.total_amount.toLocaleString()}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {d.items.map((it) => (
                                <div
                                  key={it.item_id}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E2D7CB]/70 shadow-2xs"
                                >
                                  {it.image_url ? (
                                    <img
                                      src={it.image_url}
                                      alt={it.product_name}
                                      className="w-12 h-12 rounded-xl object-cover border border-[#E2D7CB] flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center text-[#7A6C5E] flex-shrink-0">
                                      <Layers className="w-6 h-6" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1 text-xs">
                                    <h5 className="font-extrabold text-[#2C241D] truncate">{it.product_name}</h5>
                                    <div className="flex items-center justify-between text-[11px] text-[#7A6C5E] mt-1">
                                      <span>Quantity: <strong className="text-[#2C241D] font-mono">{it.quantity}</strong></span>
                                      <span className="font-bold text-[#38A132]">₹{it.unit_price.toLocaleString()}</span>
                                    </div>
                                    {it.dimensions && (
                                      <p className="text-[10px] text-[#7A6C5E] mt-0.5 truncate">Dimensions: {it.dimensions}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-1">
                            <p className="text-[10px] uppercase font-bold text-[#7A6C5E] flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Destination
                            </p>
                            <p className="font-bold text-[#2C241D] leading-snug">{d.destination_address}</p>
                            <p className="text-[11px] text-[#7A6C5E] pt-1 flex items-center justify-between">
                              <span>Distance: <strong>{d.distance_km} km</strong></span>
                              <button
                                type="button"
                                onClick={() => setViewingRouteDelivery(d)}
                                className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                                title="Open driving route from shop hub to customer destination"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Route Map</span>
                              </button>
                            </p>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-1">
                            <p className="text-[10px] uppercase font-bold text-[#7A6C5E] flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-blue-600" /> Recipient Contact
                            </p>
                            <p className="font-bold text-[#2C241D]">{d.customer_name}</p>
                            <p className="text-[11px] text-[#7A6C5E]">{d.customer_phone || 'Contact on file'}</p>
                          </div>

                          <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-1">
                            <p className="text-[10px] uppercase font-bold text-[#7A6C5E] flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-purple-600" /> Assigned Personnel
                            </p>
                            <p className="font-bold text-[#2C241D]">
                              {typeof d.assigned_personnel === 'object' && d.assigned_personnel
                                ? d.assigned_personnel.name
                                : typeof d.assigned_personnel === 'string'
                                ? d.assigned_personnel
                                : 'Unassigned'}
                            </p>
                            {typeof d.assigned_personnel === 'object' && d.assigned_personnel?.phone && (
                              <p className="text-[11px] text-[#7A6C5E]">Phone: {d.assigned_personnel.phone}</p>
                            )}
                          </div>
                        </div>

                        {d.delivery_notes && (
                          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                            <strong>Latest Transit Notes:</strong> {d.delivery_notes}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[11px] text-[#7A6C5E]">
                            Dispatched: {d.dispatched_at ? new Date(d.dispatched_at).toLocaleString() : 'Recent'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setAssignModalDelivery(d);
                                setSelectedPersonnelId(
                                  typeof d.assigned_personnel === 'object' && d.assigned_personnel
                                    ? d.assigned_personnel.personnel_id
                                    : ''
                                );
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#F5ECE1] text-[#2C241D] text-xs font-bold hover:bg-[#E2D7CB] transition-all cursor-pointer"
                            >
                              Assign Driver
                            </button>
                            <button
                              onClick={() => {
                                setStatusModalDelivery(d);
                                setNewStatusValue(d.delivery_status || 'Dispatched');
                                setStatusNotes(d.delivery_notes || '');
                              }}
                              className="px-4 py-1.5 rounded-xl bg-[#38A132] text-white text-xs font-bold hover:bg-[#2F852A] shadow-md shadow-[#38A132]/20 transition-all cursor-pointer"
                            >
                              Update Status
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 3: PREVIOUS DELIVERIES                                            */}
            {/* ===================================================================== */}
            {activeTab === 'previous_deliveries' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                {/* Search & Filter Bar */}
                <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-[#E2D7CB] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search previous deliveries by ID, customer, tracking..."
                      value={prevSearch}
                      onChange={(e) => setPrevSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-xs bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                    />
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {['ALL', 'RETAIL_ORDER', 'CUSTOM_ORDER', 'ONSITE_RETURN'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setPrevTypeFilter(type)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          prevTypeFilter === type
                            ? 'bg-[#38A132] text-white shadow-xs'
                            : 'bg-[#FAF7F2] text-[#7A6C5E] hover:bg-[#E2D7CB]'
                        }`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredPreviousDeliveries.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-xl p-16 text-center rounded-3xl border border-[#E2D7CB] shadow-lg space-y-3">
                    <History className="w-10 h-10 text-[#7A6C5E]/40 mx-auto" />
                    <p className="text-sm font-extrabold text-[#2C241D]">No completed deliveries record found</p>
                    <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto font-medium">
                      Delivered consignments and fulfillment logs will appear here upon completion.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[#E2D7CB] overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF7F2] border-b border-[#E2D7CB] text-[#7A6C5E] uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3.5 px-4">Order & Type</th>
                            <th className="py-3.5 px-4">Consignment Items</th>
                            <th className="py-3.5 px-4">Waybill / Tracking</th>
                            <th className="py-3.5 px-4">Customer & Destination</th>
                            <th className="py-3.5 px-4">Distance</th>
                            <th className="py-3.5 px-4">Delivered By</th>
                            <th className="py-3.5 px-4">Completed Date</th>
                            <th className="py-3.5 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D7CB]/60">
                          {filteredPreviousDeliveries.map((d) => (
                            <tr key={d.fulfillment_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-bold text-[#2C241D] block">{d.order_id}</span>
                                <span className="text-[10px] text-blue-700 font-extrabold uppercase">
                                  {d.job_type.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {d.items && d.items.length > 0 ? (
                                  <div className="space-y-1 max-w-[220px]">
                                    {d.items.map((it) => (
                                      <div key={it.item_id} className="flex items-center gap-2 text-[11px]">
                                        {it.image_url && (
                                          <img src={it.image_url} alt={it.product_name} className="w-6 h-6 rounded object-cover border border-[#E2D7CB] flex-shrink-0" />
                                        )}
                                        <span className="font-bold text-[#2C241D] truncate flex-1">{it.product_name}</span>
                                        <span className="font-mono text-[#7A6C5E]">x{it.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-[#7A6C5E] italic">Standard Consignment</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-[#7A6C5E]">
                                {d.tracking_number}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-[#2C241D] block">{d.customer_name}</span>
                                <span className="text-[11px] text-[#7A6C5E] truncate max-w-xs block">
                                  {d.destination_address}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-[#2C241D]">
                                {d.distance_km} km
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-[#2C241D]">
                                  {typeof d.assigned_personnel === 'object' && d.assigned_personnel
                                    ? d.assigned_personnel.name
                                    : typeof d.assigned_personnel === 'string'
                                    ? d.assigned_personnel
                                    : 'Staff'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-[#7A6C5E]">
                                {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString() : '—'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {d.delivery_status}
                                </span>
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

            {/* ===================================================================== */}
            {/* TAB 4: DELIVERY PERSONNEL                                             */}
            {/* ===================================================================== */}
            {activeTab === 'personnel' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-[#E2D7CB] shadow-sm">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search delivery personnel by name, phone, email, or vehicle reg..."
                      value={personnelSearch}
                      onChange={(e) => setPersonnelSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-xs bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#7A6C5E] bg-[#FAF7F2] px-3 py-1.5 rounded-full border border-[#E2D7CB]">
                      {filteredPersonnel.length} Registered Staff
                    </span>
                  </div>
                </div>

                {filteredPersonnel.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-xl p-16 text-center rounded-3xl border border-[#E2D7CB] shadow-lg space-y-4">
                    <Users className="w-10 h-10 text-[#7A6C5E]/40 mx-auto" />
                    <p className="text-sm font-extrabold text-[#2C241D]">No delivery personnel registered</p>
                    <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto font-medium">
                      Add drivers and delivery agents to assign them to incoming shipments and active transit tasks.
                    </p>
                    <button
                      onClick={() => {
                        setEditingPersonnel(null);
                        setPersonnelFormData({
                          name: '',
                          phone: '',
                          email: '',
                          vehicle_type: 'Mini Truck',
                          vehicle_reg: '',
                          notes: ''
                        });
                        setIsAddPersonnelModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-[#38A132] text-white text-xs font-black hover:bg-[#2E8B29] shadow-md shadow-[#38A132]/20 inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Delivery Driver</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPersonnel.map((p) => (
                      <div
                        key={p.personnel_id}
                        className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#E2D7CB] shadow-md hover:shadow-lg transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#38A132] to-emerald-400 text-white font-black text-sm flex items-center justify-center shadow-md">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-[#2C241D]">{p.name}</h4>
                              <p className="text-[11px] text-[#7A6C5E] font-medium">{p.phone}</p>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              p.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-1.5 text-xs text-[#5C4E42]">
                          {p.email && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <Mail className="w-3.5 h-3.5 text-[#7A6C5E]" />
                              <span className="truncate">{p.email}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#7A6C5E]">Vehicle:</span>
                            <span className="font-bold text-[#2C241D]">{p.vehicle_type || 'General Fleet'}</span>
                          </div>
                          {p.vehicle_reg && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#7A6C5E]">Reg #:</span>
                              <span className="font-mono font-bold text-[#2C241D]">{p.vehicle_reg}</span>
                            </div>
                          )}
                        </div>

                        {p.notes && (
                          <p className="text-[11px] text-[#7A6C5E] italic line-clamp-2 px-1">
                            "{p.notes}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-[#E2D7CB]/60">
                          <button
                            onClick={() => handleTogglePersonnelStatus(p)}
                            className="text-[11px] font-extrabold text-[#7A6C5E] hover:text-[#2C241D] cursor-pointer"
                          >
                            Mark {p.status === 'ACTIVE' ? 'Inactive' : 'Active'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingPersonnel(p);
                              setPersonnelFormData({
                                name: p.name,
                                phone: p.phone,
                                email: p.email || '',
                                vehicle_type: p.vehicle_type || 'Mini Truck',
                                vehicle_reg: p.vehicle_reg || '',
                                notes: p.notes || ''
                              });
                              setIsAddPersonnelModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-xl bg-[#FAF7F2] hover:bg-[#E2D7CB] text-[#2C241D] text-xs font-extrabold transition-all cursor-pointer"
                          >
                            Edit Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* =================================================================== */}
                {/* DRIVER EMAIL CHANGE REQUESTS SECTION                                */}
                {/* =================================================================== */}
                <div className="p-6 rounded-3xl bg-white/85 backdrop-blur-xl border border-[#E2D7CB] shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2D7CB]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-[#38A132] flex items-center justify-center">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#2C241D]">Driver Email Change Requests</h3>
                        <p className="text-[11px] text-[#7A6C5E]">Approve or decline login email changes requested by delivery drivers</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {emailChangeRequests.filter((r) => r.status === 'PENDING').length} Pending Review
                      </span>
                    </div>
                  </div>

                  {emailChangeRequests.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-1">
                      <p className="text-xs font-extrabold text-[#2C241D]">No email change requests submitted</p>
                      <p className="text-[11px] text-[#7A6C5E]">
                        When delivery personnel request an email update via their portal profile, requests will appear here for verification.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF7F2] border-b border-[#E2D7CB] text-[#7A6C5E] uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Driver Personnel</th>
                            <th className="py-3 px-4">Current Registered Email</th>
                            <th className="py-3 px-4">Requested New Email</th>
                            <th className="py-3 px-4">Reason / Notes</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D7CB]/60">
                          {emailChangeRequests.map((req) => (
                            <tr key={req.request_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-[#2C241D]">
                                {req.personnel_name}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs text-[#7A6C5E]">
                                {req.current_email}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs font-extrabold text-[#38A132]">
                                {req.requested_email}
                              </td>
                              <td className="py-3.5 px-4 text-[#5C4E42] max-w-xs truncate">
                                {req.reason || 'Driver updated email'}
                              </td>
                              <td className="py-3.5 px-4 text-[11px] text-[#7A6C5E]">
                                {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recent'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  req.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : req.status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {req.status === 'PENDING' ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleApproveEmailChange(req)}
                                      disabled={isReviewingEmailReq}
                                      className="px-3 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2E8B29] text-white text-xs font-extrabold shadow-sm shadow-[#38A132]/20 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleRejectEmailChange(req)}
                                      disabled={isReviewingEmailReq}
                                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-[#7A6C5E] font-medium">
                                    {req.status === 'APPROVED' ? 'Processed' : 'Declined'}
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

            {/* ===================================================================== */}
            {/* TAB 5: FLEET & VEHICLES REGISTRY                                      */}
            {/* ===================================================================== */}
            {activeTab === 'fleet_vehicles' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                {/* Vehicle summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Total Registered Vehicles</span>
                    <p className="text-2xl font-black text-[#2C241D] mt-1">{personnelList.filter((p) => p.vehicle_reg).length}</p>
                    <p className="text-[11px] text-[#7A6C5E] mt-0.5">Assigned to active fleet drivers</p>
                  </div>
                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Mini Trucks (Bolero/Ace)</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">
                      {personnelList.filter((p) => p.vehicle_type === 'Mini Truck').length}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Medium furniture & local deliveries</p>
                  </div>
                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Large Cargo Vans / Trucks</span>
                    <p className="text-2xl font-black text-blue-700 mt-1">
                      {personnelList.filter((p) => p.vehicle_type?.includes('Van') || p.vehicle_type?.includes('Heavy')).length}
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">Heavy timber & bespoke suites</p>
                  </div>
                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Active in Route</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">{currentDeliveries.length}</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Live transit dispatches</p>
                  </div>
                </div>

                {/* Filter bar */}
                <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-[#E2D7CB] shadow-sm flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    {['ALL', 'Mini Truck', 'Large Cargo Van', 'Heavy Truck', 'Two Wheeler / Scooter'].map((vt) => (
                      <button
                        key={vt}
                        onClick={() => setVehicleFilter(vt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          vehicleFilter === vt
                            ? 'bg-[#38A132] text-white shadow-xs'
                            : 'bg-[#FAF7F2] text-[#7A6C5E] hover:bg-[#E2D7CB]'
                        }`}
                      >
                        {vt}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setEditingPersonnel(null);
                      setPersonnelFormData({
                        name: '',
                        phone: '',
                        email: '',
                        vehicle_type: 'Mini Truck',
                        vehicle_reg: '',
                        notes: ''
                      });
                      setIsAddPersonnelModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#38A132] text-white text-xs font-bold hover:bg-[#2E8B29] inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register Vehicle & Driver</span>
                  </button>
                </div>

                {filteredVehicles.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-xl p-16 text-center rounded-3xl border border-[#E2D7CB] shadow-lg space-y-3">
                    <Car className="w-10 h-10 text-[#7A6C5E]/40 mx-auto" />
                    <p className="text-sm font-extrabold text-[#2C241D]">No vehicles found in this category</p>
                    <p className="text-xs text-[#7A6C5E]">Add vehicles and registration numbers under Delivery Personnel.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVehicles.map((v) => (
                      <div
                        key={v.personnel_id}
                        className="p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-[#E2D7CB] shadow-md hover:shadow-lg transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-[#38A132]/15 text-[#38A132] flex items-center justify-center font-bold">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-[#2C241D] font-mono">{v.vehicle_reg || 'REG-PENDING'}</h4>
                              <p className="text-[11px] text-[#7A6C5E] font-medium">{v.vehicle_type || 'Commercial Carrier'}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Operational
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#7A6C5E]">Assigned Driver:</span>
                            <span className="font-bold text-[#2C241D]">{v.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#7A6C5E]">Driver Contact:</span>
                            <span className="font-bold text-[#2C241D]">{v.phone}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#E2D7CB]/60 text-xs">
                          <span className="text-[10px] text-[#7A6C5E]">Hub: Central Hub, Kottayam</span>
                          <button
                            onClick={() => {
                              setEditingPersonnel(v);
                              setPersonnelFormData({
                                name: v.name,
                                phone: v.phone,
                                email: v.email || '',
                                vehicle_type: v.vehicle_type || 'Mini Truck',
                                vehicle_reg: v.vehicle_reg || '',
                                notes: v.notes || ''
                              });
                              setIsAddPersonnelModalOpen(true);
                            }}
                            className="text-[11px] font-extrabold text-[#38A132] hover:underline cursor-pointer"
                          >
                            Update Info →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 6: SETTLEMENTS & PAYOUTS                                          */}
            {/* ===================================================================== */}
            {activeTab === 'settlements' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                {/* Financial Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Total Logistics Earnings</span>
                    <p className="text-3xl font-black text-emerald-700 mt-1">₹{totalSettledEarnings.toFixed(2)}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Dispatched fulfillment payouts</p>
                  </div>
                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Contracted Payout Rate</span>
                    <p className="text-3xl font-black text-[#2C241D] mt-1">
                      ₹{carrierSummary?.active_agreement?.per_km_payout_rate ?? 15}/km
                    </p>
                    <p className="text-[11px] text-[#7A6C5E] mt-0.5">
                      Base rate: ₹{carrierSummary?.active_agreement?.base_payout_rate ?? 100} / trip
                    </p>
                  </div>
                  <div className="ultra-glass-card rounded-2xl p-5 border border-[#E2D7CB] shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">Settled Shipments</span>
                    <p className="text-3xl font-black text-blue-700 mt-1">{settlementsList.length}</p>
                    <p className="text-[11px] text-blue-700 mt-0.5">Completed consignments ledger</p>
                  </div>
                </div>

                {settlementsList.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-xl p-16 text-center rounded-3xl border border-[#E2D7CB] shadow-lg space-y-3">
                    <BadgeDollarSign className="w-10 h-10 text-[#7A6C5E]/40 mx-auto" />
                    <p className="text-sm font-extrabold text-[#2C241D]">No payout settlements yet</p>
                    <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto font-medium">
                      As soon as your drivers complete assigned deliveries, earnings records and financial payout ledgers will automatically populate here.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-[#E2D7CB] overflow-hidden shadow-lg">
                    <div className="p-4 bg-[#FAF7F2] border-b border-[#E2D7CB] flex items-center justify-between">
                      <span className="font-extrabold text-xs text-[#2C241D]">Consignment Payout Ledger</span>
                      <span className="text-[11px] font-mono text-[#7A6C5E]">{settlementsList.length} Records</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF7F2]/60 border-b border-[#E2D7CB] text-[#7A6C5E] uppercase text-[10px] font-black tracking-wider">
                          <tr>
                            <th className="py-3.5 px-4">Settlement #</th>
                            <th className="py-3.5 px-4">Order ID</th>
                            <th className="py-3.5 px-4">Distance (km)</th>
                            <th className="py-3.5 px-4">Carrier Payout</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2D7CB]/60">
                          {settlementsList.map((s) => (
                            <tr key={s.settlement_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-[#2C241D]">
                                SETT-RS-{s.settlement_id.toString().padStart(4, '0')}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                                {s.order_id ? `ORD-RS-${s.order_id}` : 'Direct Fulfillment'}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-[#2C241D]">
                                {s.distance_km} km
                              </td>
                              <td className="py-3.5 px-4 font-black text-emerald-700 text-sm">
                                ₹{s.carrier_payout.toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  s.settlement_status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {s.settlement_status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-[#7A6C5E] text-[11px]">
                                {s.notes || 'Standard Delivery Fulfillment'}
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

            {/* ===================================================================== */}
            {/* TAB 7: CARRIER AGREEMENTS                                             */}
            {/* ===================================================================== */}
            {activeTab === 'agreements' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-lg space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#2C241D]">Master Service Agreements & SLAs</h3>
                    <p className="text-xs text-[#7A6C5E]">
                      Official contracted logistics rate cards, insurance bounds, and operational terms.
                    </p>
                  </div>

                  {agreementsList.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-2">
                      <FileCheck2 className="w-8 h-8 text-[#7A6C5E]/50 mx-auto" />
                      <p className="text-sm font-bold text-[#2C241D]">No commercial agreements found</p>
                      <p className="text-xs text-[#7A6C5E]">Admin can issue and attach an agreement to this carrier account.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {agreementsList.map((agr) => (
                        <div
                          key={agr.agreement_id}
                          className="p-6 rounded-3xl bg-[#FAF7F2] border border-[#E2D7CB] shadow-sm space-y-4 hover:shadow-md transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2D7CB]/60">
                            <div>
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-black text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                                  {agr.agreement_number}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                                  {agr.status}
                                </span>
                              </div>
                              <h4 className="text-sm font-black text-[#2C241D] mt-1">{agr.title}</h4>
                            </div>
                            <button
                              onClick={() => setViewingAgreement(agr)}
                              className="px-4 py-2 rounded-xl bg-[#38A132] text-white text-xs font-bold hover:bg-[#2E8B29] shadow-md shadow-[#38A132]/20 transition-all cursor-pointer self-start sm:self-auto"
                            >
                              View Terms & SLAs
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div className="p-3 rounded-2xl bg-white border border-[#E2D7CB]/60">
                              <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Base Payout</span>
                              <span className="font-extrabold text-[#2C241D] text-sm">₹{agr.base_payout_rate}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-white border border-[#E2D7CB]/60">
                              <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Per KM Rate</span>
                              <span className="font-extrabold text-[#2C241D] text-sm">₹{agr.per_km_payout_rate}/km</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-white border border-[#E2D7CB]/60">
                              <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Effective Date</span>
                              <span className="font-bold text-[#2C241D]">{agr.effective_date || 'Immediate'}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-white border border-[#E2D7CB]/60">
                              <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Expiry Date</span>
                              <span className="font-bold text-[#2C241D]">{agr.expiry_date || 'Ongoing'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 8: SERVICE HUBS & COVERAGE ZONES                                  */}
            {/* ===================================================================== */}
            {activeTab === 'coverage_zones' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Central Hub Details */}
                  <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-lg space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#38A132]/15 text-[#38A132] flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#2C241D]">Central Fulfillment Hub</h3>
                        <p className="text-xs text-[#7A6C5E]">Primary Goods Pickup & Logistics Warehouse</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-2 text-xs">
                      <p className="font-bold text-[#2C241D]">RetailSphere Operations & Manufacturing Facility</p>
                      <p className="text-[#5C4E42] leading-relaxed">
                        RetailSphere Operations Facility, MC Road, Ettumanoor, Kottayam, Kerala - 686631
                      </p>
                      <div className="pt-2 border-t border-[#E2D7CB]/60 flex items-center justify-between text-[11px] text-[#7A6C5E]">
                        <span>Pickup Hours: <strong>8:00 AM – 7:30 PM IST</strong></span>
                        <span>Dispatch Bay: <strong>Bay 3 & 4</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Coverage Areas */}
                  <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-lg space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-700 flex items-center justify-center font-bold">
                        <Map className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#2C241D]">Partner Coverage Territory</h3>
                        <p className="text-xs text-[#7A6C5E]">Registered delivery routes & districts</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Active Service Districts</span>
                        <p className="font-bold text-[#2C241D] text-sm mt-0.5">
                          {carrierSummary?.coverage_areas || 'Standard Operating Hub - Kerala State'}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#E2D7CB]/60 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#7A6C5E] block">Delivery SLA Window:</span>
                          <span className="font-bold text-[#2C241D]">24 to 48 Hours</span>
                        </div>
                        <div>
                          <span className="text-[#7A6C5E] block">Agency Helpline:</span>
                          <span className="font-bold text-[#38A132]">
                            {carrierSummary?.contact_phone || currentUser?.phone || 'On file'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS & POPUPS                                                        */}
      {/* ========================================================================= */}

      {/* MODAL 0: View Profile & Security Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E2D7CB] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D7CB]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                  {userInitials}
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#2C241D]">Carrier Partner Profile</h3>
                  <p className="text-[11px] text-[#7A6C5E]">Logistics Operator Account & Security</p>
                </div>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-[#7A6C5E] hover:text-[#2C241D] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileMessage && (
              <div
                className={`p-3.5 rounded-2xl text-xs font-bold ${
                  profileMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Partner Agency</span>
                  <p className="font-extrabold text-[#2C241D] text-sm">
                    {carrierSummary?.carrier_name || currentUser?.full_name || 'Carrier Partner'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2D7CB]/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Registered Email</span>
                    <span className="font-mono text-[#2C241D] font-bold">
                      {carrierSummary?.contact_email || currentUser?.email || 'carrier@retailsphere.com'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Active Role</span>
                    <span className="font-bold text-[#38A132]">Carrier Partner</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] uppercase mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="Enter operational phone number"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2D7CB]/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#38A132]" />
                  <span className="text-[11px] font-black uppercase text-[#2C241D]">Update Password (Optional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2D7CB]/60">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5ECE1] text-[#2C241D] text-xs font-bold hover:bg-[#E2D7CB] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-5 py-2 rounded-xl bg-[#38A132] text-white text-xs font-bold hover:bg-[#2F852A] shadow-md shadow-[#38A132]/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Update Delivery Status */}
      {statusModalDelivery && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E2D7CB] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D7CB]/60">
              <div>
                <h3 className="text-sm font-black text-[#2C241D]">Update Delivery Status</h3>
                <p className="text-[11px] text-[#7A6C5E]">Order: {statusModalDelivery.order_id}</p>
              </div>
              <button onClick={() => setStatusModalDelivery(null)} className="text-[#7A6C5E] hover:text-[#2C241D] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning if driver is not assigned */}
            {!statusModalDelivery.assigned_personnel && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-[#2C241D]">Driver Assignment Required</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      No delivery driver is currently assigned to this consignment. Assign a driver before moving the status to in-transit or delivered.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const d = statusModalDelivery;
                    setStatusModalDelivery(null);
                    setAssignModalDelivery(d);
                    setSelectedPersonnelId('');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Assign Fleet Driver Now</span>
                </button>
              </div>
            )}

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] uppercase mb-1">New Status</label>
                <select
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                >
                  {!statusModalDelivery.assigned_personnel ? (
                    <>
                      <option value="Pending Driver Allotment">Pending Driver Allotment</option>
                      <option value="Cancelled">Cancelled</option>
                    </>
                  ) : statusModalDelivery.job_type === 'FABRICATION_PICKUP' ? (
                    <>
                      <option value="Out for Pickup">Out for Pickup</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered (Handed to Hub)</option>
                      <option value="Cancelled">Cancelled</option>
                    </>
                  ) : (
                    <>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered (Handed to Recipient)</option>
                      <option value="Cancelled">Cancelled</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] uppercase mb-1">Transit / Handover Notes</label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Optional delivery notes (e.g. delivered to customer gate, signed by recipient)..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2D7CB]/60">
                <button
                  type="button"
                  onClick={() => setStatusModalDelivery(null)}
                  className="px-4 py-2 rounded-xl bg-[#F5ECE1] text-[#2C241D] text-xs font-bold hover:bg-[#E2D7CB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-5 py-2 rounded-xl bg-[#38A132] text-white text-xs font-bold hover:bg-[#2F852A] shadow-md shadow-[#38A132]/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingStatus && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Delivery Personnel */}
      {assignModalDelivery && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#FAF7F2] rounded-[2rem] border-2 border-[#D8CCBD] p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E2D7CB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                  <Truck className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#2C241D]">Assign Delivery Personnel</h3>
                  <p className="text-[11px] font-bold text-amber-800">Fleet Dispatch & Driver Allotment</p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalDelivery(null)}
                disabled={isAssigningPersonnel}
                className="p-1.5 rounded-xl bg-white border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#EAE0D4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Delivery Job Reference Overview */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#E2D7CB] text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block">
                  Delivery Work Reference
                </span>
                <span className="font-mono text-[11px] font-black text-amber-900 bg-amber-100/70 px-2.5 py-0.5 rounded-md border border-amber-300">
                  {assignModalDelivery.order_id}
                </span>
              </div>
              {assignModalDelivery.customer_name && (
                <p className="font-black text-[#2C241D] text-sm truncate">
                  👤 {assignModalDelivery.customer_name}
                </p>
              )}
              <p className="text-[11px] text-[#5C4E42] font-semibold flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{assignModalDelivery.destination_address || 'Central Delivery Hub'}</span>
              </p>
            </div>

            <form onSubmit={handleAssignPersonnelSubmit} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-extrabold text-[#2C241D] uppercase tracking-wider">
                    Select Active Fleet Driver *
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    {activePersonnelOptions.length} Active Available
                  </span>
                </div>

                {activePersonnelOptions.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold space-y-1 text-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto" />
                    <p className="font-black">No Active Drivers Registered</p>
                    <p className="text-[11px] text-amber-800/90 font-medium">Please add active personnel in the Delivery Personnel tab first.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {activePersonnelOptions.map((p) => {
                      const isSelected = selectedPersonnelId === p.personnel_id;
                      return (
                        <div
                          key={p.personnel_id}
                          onClick={() => setSelectedPersonnelId(p.personnel_id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-emerald-50/90 border-[#38A132] ring-2 ring-[#38A132]/30 shadow-xs'
                              : 'bg-white border-[#E2D7CB] hover:bg-[#FAF7F2]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                              isSelected ? 'bg-[#38A132] text-white' : 'bg-[#FAF7F2] text-[#7A6C5E] border border-[#E2D7CB]'
                            }`}>
                              🚚
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-[#2C241D] truncate">{p.name}</span>
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Active
                                </span>
                              </div>
                              <p className="text-[10px] text-[#7A6C5E] font-medium truncate pt-0.5">
                                📞 {p.phone} {p.vehicle_type ? `• 🛻 ${p.vehicle_type}` : ''} {p.vehicle_reg ? `(${p.vehicle_reg})` : ''}
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
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2D7CB]">
                <button
                  type="button"
                  onClick={() => setAssignModalDelivery(null)}
                  disabled={isAssigningPersonnel}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B5C4D] bg-[#F5ECE1] hover:bg-[#EAE0D4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningPersonnel || !selectedPersonnelId}
                  className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isAssigningPersonnel ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>{isAssigningPersonnel ? 'Assigning...' : 'Confirm Driver Allotment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add / Edit Delivery Personnel */}
      {isAddPersonnelModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E2D7CB] p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D7CB]/60">
              <div>
                <h3 className="text-sm font-black text-[#2C241D]">
                  {editingPersonnel ? 'Edit Delivery Personnel' : 'Add New Delivery Personnel'}
                </h3>
                <p className="text-[11px] text-[#7A6C5E]">Carrier Agency Logistics Staff & Fleet Registration</p>
              </div>
              <button onClick={() => setIsAddPersonnelModalOpen(false)} className="text-[#7A6C5E] hover:text-[#2C241D] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePersonnelSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#7A6C5E] uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={personnelFormData.name}
                    onChange={(e) => setPersonnelFormData({ ...personnelFormData, name: e.target.value })}
                    placeholder="e.g. Rajesh Nair"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#7A6C5E] uppercase mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={personnelFormData.phone}
                    onChange={(e) => setPersonnelFormData({ ...personnelFormData, phone: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#7A6C5E] uppercase mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={personnelFormData.email}
                    onChange={(e) => setPersonnelFormData({ ...personnelFormData, email: e.target.value })}
                    placeholder="e.g. rajesh@carrier.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#7A6C5E] uppercase mb-1">Vehicle Type</label>
                  <select
                    value={personnelFormData.vehicle_type}
                    onChange={(e) => setPersonnelFormData({ ...personnelFormData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                  >
                    <option value="Mini Truck">Mini Truck (Bolero / Ace)</option>
                    <option value="Large Cargo Van">Large Cargo Van</option>
                    <option value="Heavy Truck">Heavy Truck</option>
                    <option value="Two Wheeler / Scooter">Two Wheeler / Scooter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] uppercase mb-1">Vehicle Registration Number</label>
                <input
                  type="text"
                  value={personnelFormData.vehicle_reg}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, vehicle_reg: e.target.value })}
                  placeholder="e.g. KL-05-AB-1234"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] font-mono font-bold focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] uppercase mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={personnelFormData.notes}
                  onChange={(e) => setPersonnelFormData({ ...personnelFormData, notes: e.target.value })}
                  placeholder="Notes on availability, route expertise, etc."
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2D7CB]/60">
                <button
                  type="button"
                  onClick={() => setIsAddPersonnelModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5ECE1] text-[#2C241D] text-xs font-bold hover:bg-[#E2D7CB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPersonnel}
                  className="px-5 py-2 rounded-xl bg-[#38A132] text-white text-xs font-bold hover:bg-[#2F852A] shadow-md shadow-[#38A132]/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingPersonnel && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPersonnel ? 'Update Personnel' : 'Add Personnel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: View Agreement Terms */}
      {viewingAgreement && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E2D7CB] p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D7CB]/60">
              <div>
                <span className="text-[10px] font-mono text-[#48A63E] font-black uppercase">Official Master Agreement</span>
                <h3 className="text-base font-black text-[#2C241D]">{viewingAgreement.title}</h3>
                <p className="text-[11px] font-mono text-[#7A6C5E]">Ref: {viewingAgreement.agreement_number}</p>
              </div>
              <button onClick={() => setViewingAgreement(null)} className="text-[#7A6C5E] hover:text-[#2C241D] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[10px] uppercase text-[#7A6C5E] font-bold">Base Payout</p>
                <p className="font-bold text-[#2C241D]">₹{viewingAgreement.base_payout_rate}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#7A6C5E] font-bold">Per KM Rate</p>
                <p className="font-bold text-[#2C241D]">₹{viewingAgreement.per_km_payout_rate} / km</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#7A6C5E] font-bold">Effective</p>
                <p className="font-medium text-[#2C241D]">{viewingAgreement.effective_date || 'Immediate'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#7A6C5E] font-bold">Status</p>
                <p className="font-black text-emerald-700">{viewingAgreement.status}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-[#7A6C5E] tracking-wider">Contract Terms & SLA Conditions</h4>
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 text-xs text-[#5C4E42] whitespace-pre-line leading-relaxed font-sans max-h-60 overflow-y-auto">
                {viewingAgreement.terms_text ||
                  '1. The Carrier Partner shall provide reliable logistics transportation for finished furniture, raw materials, and on-site returns.\n2. All transit dispatches must be handled within the scheduled SLA delivery timeframe.\n3. Transportation payouts are calculated based on registered route distance at the agreed per-km rate.\n4. Both parties agree to standard goods insurance and non-disclosure standards.'}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E2D7CB]/60">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] text-xs font-bold hover:bg-[#E2D7CB] flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#7A6C5E]" />
                <span>Print Agreement</span>
              </button>
              <button
                onClick={() => setViewingAgreement(null)}
                className="px-5 py-2 rounded-xl bg-[#38A132] text-white text-xs font-bold hover:bg-[#2F852A] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Shop-to-Delivery Route Map Modal */}
      {viewingRouteDelivery && (
        <DeliveryRouteMap
          orderId={viewingRouteDelivery.order_id}
          trackingNumber={viewingRouteDelivery.tracking_number}
          pickupAddress={viewingRouteDelivery.pickup_address || 'RetailSphere Operations Facility, MC Road, Ettumanoor, Kottayam, Kerala 686631'}
          destinationAddress={viewingRouteDelivery.destination_address}
          customerName={viewingRouteDelivery.customer_name}
          customerPhone={viewingRouteDelivery.customer_phone}
          distanceKm={viewingRouteDelivery.distance_km}
          deliveryStatus={viewingRouteDelivery.delivery_status || viewingRouteDelivery.fulfillment_status}
          onClose={() => setViewingRouteDelivery(null)}
        />
      )}
    </div>
  );
};

export default CarrierDashboardPage;
