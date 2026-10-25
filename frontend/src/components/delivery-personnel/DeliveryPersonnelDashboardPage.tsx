import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearUserSession } from '../../utils/sessionUtils';
import { formatToIST } from '../../utils/timeUtils';
import {
  Truck,
  History,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Package,
  Layers,
  Search,
  Check,
  X,
  User,
  LogOut,
  Bell,
  ChevronDown,
  Navigation,
  Building2,
  Lock,
  AlertTriangle,
  Car,
  ShieldCheck,
  ExternalLink,
  Calendar,
  MessageSquare,
  XCircle,
  Send,
  RefreshCw,
  FileText,
  AlertCircle,
  Inbox,
  Eye,
  HelpCircle
} from 'lucide-react';

import {
  fetchPersonnelSummary,
  fetchPersonnelTasks,
  updatePersonnelTaskStatus,
  acknowledgePersonnelTask,
  submitEmailChangeRequest,
  fetchEmailChangeRequests,
  DeliveryPersonnelSummary,
  DeliveryPersonnelTask,
  EmailChangeRequestItem
} from '../../services/api_delivery_personnel';

import { getCurrentUser, updateUserProfile, changePasswordUser } from '../../services/api';
import { validatePhoneNumber, extract10DigitPhone } from '../../utils/formValidators';
import { applyWorkerLeave, fetchMyLeaveApplications, WorkerLeaveItem } from '../../services/api_leave';
import { getStaffQueries, addStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';
import { getMessagesForUser, markAdminMessageRead, AdminMessage } from '../../utils/adminMessagesStorage';
import DeliveryRouteMap from '../common/DeliveryRouteMap';

export const DeliveryPersonnelDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab - Only essential distinct pages
  const [activeTab, setActiveTab] = useState<'active_tasks' | 'completed_tasks' | 'vehicle_info' | 'carrier_info' | 'leave_application' | 'messages'>('active_tasks');

  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab]);

  // Loading & Notice states
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

  // Authenticated Profile & Data
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [summary, setSummary] = useState<DeliveryPersonnelSummary | null>(null);
  const [tasks, setTasks] = useState<DeliveryPersonnelTask[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Top Bar Dropdowns & Modals
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Route Map Visualizer Modal
  const [viewingRouteTask, setViewingRouteTask] = useState<DeliveryPersonnelTask | null>(null);

  // Delivery Completion Modal
  const [completingTask, setCompletingTask] = useState<DeliveryPersonnelTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState<string>('Delivered successfully to recipient.');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState<boolean>(false);

  // Delivery Rejection Modal States
  const [rejectingTask, setRejectingTask] = useState<DeliveryPersonnelTask | null>(null);
  const [rejectionCategory, setRejectionCategory] = useState<string>('Vehicle Breakdown / Mechanical Failure');
  const [rejectionNotes, setRejectionNotes] = useState<string>('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState<boolean>(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Delivery History Receipt Detail Modal (Space-saving compact detail view, NO MAP)
  const [selectedHistoryTask, setSelectedHistoryTask] = useState<DeliveryPersonnelTask | null>(null);

  // Leave Application States
  const [leavesList, setLeavesList] = useState<WorkerLeaveItem[]>([]);
  const [leaveType, setLeaveType] = useState<string>('Casual Leave');
  const [leaveStartDate, setLeaveStartDate] = useState<string>('');
  const [leaveEndDate, setLeaveEndDate] = useState<string>('');
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState<boolean>(false);
  const [leaveNotice, setLeaveNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Messaging & Dispatch Support States
  const [messagesTab, setMessagesTab] = useState<'helpdesk' | 'broadcasts'>('helpdesk');
  const [driverQueries, setDriverQueries] = useState<StaffQuery[]>([]);
  const [queryCategory, setQueryCategory] = useState<'Email Change Request' | 'Role & Access Permission' | 'General Query'>('General Query');
  const [querySubject, setQuerySubject] = useState<string>('');
  const [queryMessage, setQueryMessage] = useState<string>('');
  const [isSubmittingQuery, setIsSubmittingQuery] = useState<boolean>(false);
  const [queryFormNotice, setQueryFormNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [broadcastMessages, setBroadcastMessages] = useState<AdminMessage[]>([]);

  // Profile Form States
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Email Change Request States
  const [emailRequests, setEmailRequests] = useState<EmailChangeRequestItem[]>([]);
  const [isEmailChangeOpen, setIsEmailChangeOpen] = useState<boolean>(false);
  const [requestedNewEmail, setRequestedNewEmail] = useState<string>('');
  const [emailChangeReason, setEmailChangeReason] = useState<string>('');
  const [isSubmittingEmailRequest, setIsSubmittingEmailRequest] = useState<boolean>(false);
  const [emailRequestMsg, setEmailRequestMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Dashboard Data
  const loadData = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user?.phone) setProfilePhone(user.phone);

      const [summaryRes, tasksRes, emailReqRes] = await Promise.all([
        fetchPersonnelSummary().catch(() => null),
        fetchPersonnelTasks().catch(() => []),
        fetchEmailChangeRequests().catch(() => [])
      ]);

      if (summaryRes) setSummary(summaryRes);
      setTasks(tasksRes);
      setEmailRequests(emailReqRes);
      setLoading(false);
      loadLeavesData();
      loadDriverMessages();
    } catch (err: any) {
      console.error('Failed to load driver dashboard:', err);
      setErrorNotice(err.message || 'Failed to load assigned tasks. Please verify your session.');
      setLoading(false);
    }
  };

  const loadLeavesData = async () => {
    try {
      const leaves = await fetchMyLeaveApplications();
      setLeavesList(leaves);
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  const loadDriverMessages = () => {
    const userEmail = currentUser?.email || summary?.email || '';
    const userName = currentUser?.full_name || summary?.name || '';
    const allQueries = getStaffQueries();
    const myQueries = allQueries.filter((q) =>
      (userEmail && q.staffEmail && q.staffEmail.toLowerCase() === userEmail.toLowerCase()) ||
      (userName && q.staffName && q.staffName.toLowerCase() === userName.toLowerCase())
    );
    setDriverQueries(myQueries);

    const broadcast = getMessagesForUser(userEmail || 'driver@retailsphere.ai', 'Delivery Personnel');
    setBroadcastMessages(broadcast);
  };

  // Decline / Reject Delivery Assignment
  const handleConfirmRejection = async () => {
    if (!rejectingTask) return;
    setRejectionError(null);
    const trimmed = rejectionNotes.trim();
    if (!trimmed || trimmed.length < 5) {
      setRejectionError('Please provide an operational explanation (at least 5 characters) for declining this run.');
      return;
    }

    setIsSubmittingRejection(true);
    try {
      await updatePersonnelTaskStatus(
        rejectingTask.fulfillment_id,
        'Rejected',
        `${rejectionCategory}: ${trimmed}`
      );
      setSuccessNotice(`Consignment #${rejectingTask.order_id} declined and returned to dispatch for reassignment.`);
      setRejectingTask(null);
      setRejectionNotes('');
      setTimeout(() => setSuccessNotice(null), 5000);
      await loadData();
    } catch (err: any) {
      setRejectionError(err.message || 'Failed to decline assignment.');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // Submit Leave Application
  const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveNotice(null);
    if (!leaveStartDate || !leaveEndDate) {
      setLeaveNotice({ type: 'error', text: 'Please specify both start date and end date.' });
      return;
    }
    if (new Date(leaveEndDate) < new Date(leaveStartDate)) {
      setLeaveNotice({ type: 'error', text: 'Leave end date cannot be earlier than start date.' });
      return;
    }
    const trimmed = leaveReason.trim();
    if (!trimmed || trimmed.length < 5) {
      setLeaveNotice({ type: 'error', text: 'Please provide a reason with at least 5 characters.' });
      return;
    }

    setIsSubmittingLeave(true);
    try {
      const newLeave = await applyWorkerLeave({
        leave_type: leaveType,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        reason: trimmed
      });
      setLeavesList((prev) => [newLeave, ...prev]);
      setLeaveNotice({ type: 'success', text: `Time-off application for ${leaveType} submitted successfully!` });
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
      setTimeout(() => setLeaveNotice(null), 5000);
    } catch (err: any) {
      setLeaveNotice({ type: 'error', text: err.message || 'Failed to submit leave application.' });
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Submit Query to Dispatch
  const handleSendQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryFormNotice(null);
    const sub = querySubject.trim();
    const msg = queryMessage.trim();
    if (!sub || sub.length < 3) {
      setQueryFormNotice({ type: 'error', text: 'Please enter a query subject (at least 3 characters).' });
      return;
    }
    if (!msg || msg.length < 5) {
      setQueryFormNotice({ type: 'error', text: 'Please provide detailed message notes (at least 5 characters).' });
      return;
    }

    setIsSubmittingQuery(true);
    try {
      const newQ = addStaffQuery({
        staffName: summary?.name || currentUser?.full_name || 'Delivery Personnel',
        staffEmail: summary?.email || currentUser?.email || 'driver@retailsphere.ai',
        category: queryCategory,
        subject: sub,
        message: msg
      });
      setDriverQueries((prev) => [newQ, ...prev]);
      setQueryFormNotice({ type: 'success', text: 'Inquiry submitted to dispatch desk successfully!' });
      setQuerySubject('');
      setQueryMessage('');
      setTimeout(() => setQueryFormNotice(null), 5000);
    } catch (err: any) {
      setQueryFormNotice({ type: 'error', text: err.message || 'Failed to submit inquiry.' });
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  const handleRequestEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailRequestMsg(null);
    const target = requestedNewEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!target || !emailRegex.test(target)) {
      setEmailRequestMsg({ type: 'error', text: 'Please enter a valid RFC-compliant email address (e.g. driver@domain.com).' });
      return;
    }
    const current = (summary?.email || currentUser?.email || '').trim().toLowerCase();
    if (target === current) {
      setEmailRequestMsg({ type: 'error', text: 'New email cannot be identical to your current email address.' });
      return;
    }
    const reasonTrim = emailChangeReason.trim();
    if (!reasonTrim || reasonTrim.length < 5) {
      setEmailRequestMsg({ type: 'error', text: 'Please provide a reason for the email update (min. 5 characters).' });
      return;
    }

    setIsSubmittingEmailRequest(true);
    try {
      const res = await submitEmailChangeRequest({
        requested_email: target,
        reason: reasonTrim
      });
      setEmailRequestMsg({ type: 'success', text: res.message || 'Request submitted for Carrier approval.' });
      setRequestedNewEmail('');
      setEmailChangeReason('');
      setIsEmailChangeOpen(false);
      const updatedReqs = await fetchEmailChangeRequests().catch(() => []);
      setEmailRequests(updatedReqs);
    } catch (err: any) {
      setEmailRequestMsg({ type: 'error', text: err.message || 'Failed to submit email change request.' });
    } finally {
      setIsSubmittingEmailRequest(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleQueriesUpdate = () => loadDriverMessages();
    const handleMessagesUpdate = () => loadDriverMessages();
    const handleLeavesUpdate = () => loadLeavesData();

    window.addEventListener('staff-queries-updated', handleQueriesUpdate);
    window.addEventListener('admin-messages-updated', handleMessagesUpdate);
    window.addEventListener('leave-requests-updated', handleLeavesUpdate);

    return () => {
      window.removeEventListener('staff-queries-updated', handleQueriesUpdate);
      window.removeEventListener('admin-messages-updated', handleMessagesUpdate);
      window.removeEventListener('leave-requests-updated', handleLeavesUpdate);
    };
  }, []);

  // Status helper checkers
  const isTaskDelivered = (t: DeliveryPersonnelTask) => {
    const fSt = (t.fulfillment_status || '').toLowerCase();
    const dSt = (t.delivery_status || '').toLowerCase();
    return fSt === 'delivered' || dSt === 'delivered' || fSt === 'completed' || dSt === 'completed';
  };

  const isTaskOutForDelivery = (t: DeliveryPersonnelTask) => {
    if (isTaskDelivered(t)) return false;
    const fSt = (t.fulfillment_status || '').toLowerCase();
    const dSt = (t.delivery_status || '').toLowerCase();
    return dSt.includes('out') || dSt.includes('transit') || fSt.includes('out') || fSt.includes('transit');
  };

  const isTaskAccepted = (t: DeliveryPersonnelTask) => {
    if (isTaskDelivered(t) || isTaskOutForDelivery(t)) return false;
    const fSt = (t.fulfillment_status || '').toLowerCase();
    const dSt = (t.delivery_status || '').toLowerCase();
    return dSt.includes('accepted') || dSt.includes('read') || fSt.includes('accepted') || fSt.includes('read');
  };

  // Categorized Task Lists
  const activeTasksList = useMemo(() => {
    return tasks.filter((t) => !isTaskDelivered(t));
  }, [tasks]);

  const completedTasksList = useMemo(() => {
    return tasks.filter((t) => isTaskDelivered(t));
  }, [tasks]);

  // Search filter helper
  const filterBySearch = (list: DeliveryPersonnelTask[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (t) =>
        t.order_id.toLowerCase().includes(q) ||
        t.tracking_number.toLowerCase().includes(q) ||
        t.customer_name.toLowerCase().includes(q) ||
        t.destination_address.toLowerCase().includes(q) ||
        t.items.some((i) => i.product_name.toLowerCase().includes(q))
    );
  };

  // Mark task as Accepted / Read
  const handleAcknowledge = async (task: DeliveryPersonnelTask) => {
    try {
      await acknowledgePersonnelTask(task.fulfillment_id);
      setSuccessNotice(`Shipment #${task.order_id} marked as Accepted.`);
      await loadData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to acknowledge shipment.');
    }
  };

  // Start Delivery (Out for Delivery)
  const handleStartDelivery = async (task: DeliveryPersonnelTask) => {
    try {
      await updatePersonnelTaskStatus(task.fulfillment_id, 'Out for Delivery', 'Driver has commenced delivery route.');
      setSuccessNotice(`Delivery started for #${task.order_id}. Marked as Out for Delivery.`);
      await loadData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to start delivery.');
    }
  };

  // Complete Delivery
  const handleCompleteDeliverySubmit = async () => {
    if (!completingTask) return;
    const trimmedNotes = completionNotes.trim();
    if (!trimmedNotes || trimmedNotes.length < 3) {
      setErrorNotice('Please provide delivery completion remarks (at least 3 characters).');
      return;
    }

    setIsSubmittingCompletion(true);
    try {
      await updatePersonnelTaskStatus(
        completingTask.fulfillment_id,
        'Delivered',
        trimmedNotes
      );
      setSuccessNotice(`Shipment #${completingTask.order_id} successfully marked as Delivered!`);
      setCompletingTask(null);
      await loadData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to complete delivery.');
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  // Save Profile & Password
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

    let formattedPhone = '';
    if (profilePhone.trim()) {
      const phoneDigits = extract10DigitPhone(profilePhone);
      const phoneErr = validatePhoneNumber(phoneDigits, true);
      if (phoneErr) {
        setProfileMessage({ type: 'error', text: phoneErr });
        return;
      }
      formattedPhone = `+91${phoneDigits}`;
    }

    setIsUpdatingProfile(true);
    try {
      if (formattedPhone) {
        await updateUserProfile({
          full_name: currentUser?.full_name || summary?.name || 'Delivery Personnel',
          phone: formattedPhone
        });
      }
      if (hasPasswordUpdate) {
        await changePasswordUser(newPassword.trim());
      }

      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
      await loadData();
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleLogout = () => {
    clearUserSession();
    navigate('/login');
  };

  // Driver Initials
  const driverInitials = useMemo(() => {
    const name = summary?.name || currentUser?.full_name || 'Driver';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }, [summary, currentUser]);

  const activeCount = activeTasksList.length;
  const completedCount = completedTasksList.length;

  // Clean Sidebar Navigation
  const navCategories = [
    {
      title: 'Logistics Operations',
      items: [
        { id: 'active_tasks', label: 'Active Deliveries', icon: Truck },
        { id: 'completed_tasks', label: 'Delivery History', icon: History }
      ]
    },
    {
      title: 'Fleet & Vehicle',
      items: [
        { id: 'vehicle_info', label: 'Vehicle Fleet & Registry', icon: Car },
        { id: 'carrier_info', label: 'Carrier Partner Agency', icon: Building2 }
      ]
    },
    {
      title: 'Driver Services',
      items: [
        { id: 'leave_application', label: 'Time-Off & Leave', icon: Calendar },
        { id: 'messages', label: 'Messages & Support', icon: MessageSquare }
      ]
    }
  ];

  // Helper render for single shipment card
  const renderShipmentCard = (t: DeliveryPersonnelTask, isHistoryView: boolean = false) => {
    const delivered = isTaskDelivered(t);
    const inTransit = isTaskOutForDelivery(t);
    const accepted = isTaskAccepted(t);

    return (
      <div
        key={t.fulfillment_id}
        className="p-6 rounded-3xl bg-white/90 backdrop-blur-xl border border-[#E2D7CB] shadow-lg hover:shadow-xl transition-all space-y-4"
      >
        {/* Card Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2D7CB]/60">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-black text-[#2C241D]">{t.order_id}</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold bg-blue-50 text-blue-700 uppercase border border-blue-200">
                {t.job_type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs font-bold text-[#7A6C5E] mt-0.5">
              Waybill / Tracking: <strong className="font-mono text-[#2C241D]">{t.tracking_number}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 ${
                delivered
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : inTransit
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                  : accepted
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-stone-100 text-stone-800 border border-stone-300'
              }`}
            >
              {delivered && <CheckCircle2 className="w-3.5 h-3.5" />}
              {inTransit && <Clock className="w-3.5 h-3.5" />}
              {t.delivery_status}
            </span>
          </div>
        </div>

        {/* Consignment Items from DB */}
        {t.items && t.items.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#38A132]" />
                Cargo Items to Deliver ({t.items.length} Product{t.items.length > 1 ? 's' : ''})
              </span>
              <span className="text-xs font-black text-[#2C241D]">
                Consignment Value: ₹{t.total_amount.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {t.items.map((it) => (
                <div
                  key={it.item_id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#E2D7CB]/70 shadow-2xs"
                >
                  {it.image_url ? (
                    <img
                      src={it.image_url}
                      alt={it.product_name}
                      className="w-12 h-12 rounded-xl object-cover border border-[#E2D7CB] flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center text-[#7A6C5E] flex-shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-xs">
                    <h5 className="font-extrabold text-[#2C241D] truncate">{it.product_name}</h5>
                    <div className="flex items-center justify-between text-[11px] text-[#7A6C5E] mt-0.5">
                      <span>
                        Quantity: <strong className="text-[#2C241D] font-mono">{it.quantity}</strong>
                      </span>
                      <span className="font-bold text-[#38A132]">₹{it.unit_price.toLocaleString()}</span>
                    </div>
                    {it.dimensions && <p className="text-[10px] text-[#7A6C5E] truncate">Dim: {it.dimensions}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Destination & Recipient */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-bold text-[#7A6C5E] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Destination Drop-Off Address
              </p>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200">
                Route: {t.distance_km} km
              </span>
            </div>
            <p className="font-bold text-[#2C241D] leading-snug">{t.destination_address}</p>
            <div className="text-[10px] text-[#7A6C5E] font-medium flex items-center gap-1">
              <span className="text-[#38A132] font-bold">From Operations:</span>
              <span className="truncate">{t.pickup_address || 'RetailSphere Operations Facility, MC Road, Ettumanoor, Kottayam 686631'}</span>
            </div>
            <div className="pt-2 flex items-center justify-start border-t border-[#E2D7CB]/50">
              <button
                type="button"
                onClick={() => setViewingRouteTask(t)}
                className="px-3.5 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2F872A] text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="View interactive delivery route map from operations facility to delivery point"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Open Maps Route</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB]/60 space-y-1">
            <p className="text-[10px] uppercase font-bold text-[#7A6C5E] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" /> Customer Recipient
            </p>
            <p className="font-bold text-[#2C241D]">{t.customer_name}</p>
            {t.customer_phone ? (
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-[#7A6C5E]">{t.customer_phone}</span>
                <a
                  href={`tel:${t.customer_phone}`}
                  className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1 hover:bg-emerald-200 transition-colors cursor-pointer"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call Recipient</span>
                </a>
              </div>
            ) : (
              <p className="text-[11px] text-[#7A6C5E] pt-1">Contact on file</p>
            )}
          </div>
        </div>

        {/* Delivery / Handover Notes */}
        {t.delivery_notes && (
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
            <strong>{delivered ? 'Handover Notes:' : 'Delivery Notes:'}</strong> {t.delivery_notes}
          </div>
        )}

        {/* Timestamp Info */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-[#7A6C5E] pt-1">
          <span>Expected: <strong className="text-[#2C241D]">{t.expected_delivery_date}</strong></span>
          {delivered && t.delivered_at && (
            <span>Delivered At: <strong className="text-[#38A132]">{formatToIST(t.delivered_at)}</strong></span>
          )}
        </div>

        {/* Action Buttons for Driver (if not delivered) */}
        {!delivered && !isHistoryView && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2D7CB]/60">
            <div className="flex items-center gap-2 flex-wrap">
              {!accepted && !inTransit && (
                <button
                  onClick={() => handleAcknowledge(t)}
                  className="px-3.5 py-2 rounded-xl bg-[#F5ECE1] hover:bg-[#E2D7CB] text-[#2C241D] text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-[#38A132]" />
                  <span>Mark as Read & Accepted</span>
                </button>
              )}

              {!inTransit && (
                <button
                  onClick={() => handleStartDelivery(t)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Start Delivery Run (Out for Delivery)</span>
                </button>
              )}

              {!inTransit && (
                <button
                  type="button"
                  onClick={() => {
                    setRejectingTask(t);
                    setRejectionCategory('Vehicle Breakdown / Mechanical Failure');
                    setRejectionNotes('');
                    setRejectionError(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Decline this delivery assignment and return to dispatch"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Decline Assignment</span>
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setCompletingTask(t);
                setCompletionNotes('Delivered successfully to recipient in good condition.');
              }}
              className="px-5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F852A] text-white text-xs font-black shadow-md shadow-[#38A132]/25 transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Completed & Delivered</span>
            </button>
          </div>
        )}
      </div>
    );
  };

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
                Delivery Personnel
              </div>
            </div>
          </button>
        </div>

        {/* Sidebar Nav List with Categories - Clean, No Badges */}
        <nav className="flex-1 space-y-3.5 text-xs max-h-[calc(100vh-200px)] overflow-y-auto pr-0.5 scrollbar-none">
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
                    type="button"
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
      <div ref={mainContentRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Navigation Header */}
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E6E1DA] p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-[#2C241D]">Driver Portal</span>
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

            {/* Success Notice */}
            {successNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] flex items-start gap-3 shadow-md animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">{successNotice}</div>
                <button onClick={() => setSuccessNotice(null)} className="p-1 cursor-pointer hover:text-[#38A132]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error Notice */}
            {errorNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-md animate-fadeIn">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">{errorNotice}</div>
                <button onClick={() => setErrorNotice(null)} className="p-1 cursor-pointer hover:text-rose-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Page Top Header with Title, Search and User Profile */}
            <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                  {activeTab === 'active_tasks' && 'Driver Operations & Active Deliveries'}
                  {activeTab === 'completed_tasks' && 'Fulfilled Deliveries History'}
                  {activeTab === 'vehicle_info' && 'Vehicle Fleet & Allocation Specs'}
                  {activeTab === 'carrier_info' && 'Carrier Agency & Logistics Partner'}
                  {activeTab === 'leave_application' && 'Driver Time-Off & Leave Applications'}
                  {activeTab === 'messages' && 'Driver Dispatch Helpdesk & Messages'}
                </h1>
                <p className="text-xs text-[#6B5C4D] mt-0.5 font-medium">
                  {activeTab === 'active_tasks' &&
                    'Review assigned consignments, cargo items, road transit route, and confirm recipient drop-offs.'}
                  {activeTab === 'completed_tasks' &&
                    'Historical record of fulfilled orders with verified handover documentation.'}
                  {activeTab === 'vehicle_info' &&
                    'Registered transport vehicle specifications, registration plate, and fleet status.'}
                  {activeTab === 'carrier_info' &&
                    'Partner agency contact lines, hub locations, and dispatch manager details.'}
                  {activeTab === 'leave_application' &&
                    'Submit absence requests for vehicle scheduling and driver shift coverage.'}
                  {activeTab === 'messages' &&
                    'Communicate directly with Carrier Dispatch and review official announcements.'}
                </p>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">
                {/* Search Bar */}
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7A6C5E]" />
                  <input
                    type="text"
                    placeholder="Search Order, Items, Address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white/90 border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#38A132] shadow-2xs text-[#2C241D]"
                  />
                </div>

                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="p-2 rounded-xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] text-[#2C241D] transition-all shadow-xs cursor-pointer relative"
                    title="Notifications"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#48A63E]" />
                    {activeCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-600 text-white font-extrabold text-[8px] rounded-full flex items-center justify-center animate-pulse">
                        {activeCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-3 z-[100] animate-fadeIn space-y-2">
                      <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                        <span className="font-extrabold text-xs text-[#2C241D]">Assigned Shipments</span>
                        <span className="text-[10px] font-bold text-[#48A63E]">{activeCount} Active</span>
                      </div>
                      <div className="space-y-1 max-h-56 overflow-y-auto text-xs">
                        {activeTasksList.length === 0 ? (
                          <div className="p-3 text-center text-[#7A6C5E] text-xs">No pending shipments</div>
                        ) : (
                          activeTasksList.map((t) => (
                            <div
                              key={t.fulfillment_id}
                              onClick={() => {
                                setActiveTab('active_tasks');
                                setIsNotificationsOpen(false);
                              }}
                              className="p-2 rounded-xl bg-white border border-[#E2D7CB] text-xs hover:bg-[#F5ECE1] cursor-pointer transition-colors"
                            >
                              <span className="font-mono font-bold text-[#2C241D]">{t.order_id}</span>
                              <p className="text-[11px] text-[#7A6C5E] truncate">{t.destination_address}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Driver Profile Pill */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                      {driverInitials}
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-extrabold text-[#2C241D] block max-w-[120px] truncate">
                        {summary?.name || currentUser?.full_name || 'Driver'}
                      </span>
                      <span className="text-[10px] font-bold text-[#7A6C5E] block -mt-0.5">Personnel</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                      <button
                        onClick={() => {
                          setProfileMessage(null);
                          setIsProfileModalOpen(true);
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#EAE0D4] transition-colors text-left cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[#48A63E]" />
                        <span>View Profile</span>
                      </button>
                      <div className="border-t border-[#E2D7CB] my-1" />
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-extrabold text-rose-700 hover:bg-rose-100 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
              <div
                onClick={() => setActiveTab('active_tasks')}
                className={`ultra-glass-card rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  activeTab === 'active_tasks' ? 'border-[#38A132] ring-2 ring-[#38A132]/30 bg-white' : 'border-[#E2D7CB]'
                }`}
              >
                <div className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between mb-2">
                  <span>Active Tasks</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-[#38A132]">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-[#2C241D]">{activeCount}</div>
                <div className="text-[11px] text-[#48A63E] font-extrabold mt-1">Awaiting transit & drop-off</div>
              </div>

              <div
                onClick={() => setActiveTab('completed_tasks')}
                className={`ultra-glass-card rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  activeTab === 'completed_tasks' ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-white' : 'border-[#E2D7CB]'
                }`}
              >
                <div className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between mb-2">
                  <span>Completed Shipments</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-black text-[#2C241D]">{completedCount}</div>
                <div className="text-[11px] text-emerald-700 font-extrabold mt-1">Successfully fulfilled</div>
              </div>

              <div
                onClick={() => setActiveTab('vehicle_info')}
                className={`ultra-glass-card rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  activeTab === 'vehicle_info' ? 'border-blue-500 ring-2 ring-blue-500/30 bg-white' : 'border-[#E2D7CB]'
                }`}
              >
                <div className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between mb-2">
                  <span>Assigned Vehicle</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-700">
                    <Car className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-[#2C241D] font-mono truncate">
                  {summary?.vehicle_reg || 'KL-05-AT-4482'}
                </div>
                <div className="text-[11px] text-blue-700 font-extrabold mt-1 truncate">
                  {summary?.vehicle_type || 'Mini Truck'}
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* TAB 1: ACTIVE DELIVERIES                                            */}
            {/* =================================================================== */}
            {activeTab === 'active_tasks' && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#E2D7CB]/60 pb-3">
                  <div>
                    <h3 className="text-base font-black text-[#2C241D]">Assigned Deliveries Queue</h3>
                    <p className="text-xs text-[#7A6C5E]">All shipments in queue or active road transit</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-300">
                    {filterBySearch(activeTasksList).length} Active Consignments
                  </span>
                </div>

                {filterBySearch(activeTasksList).length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-xl p-16 text-center rounded-3xl border border-[#E2D7CB] shadow-lg space-y-3">
                    <Truck className="w-10 h-10 text-[#7A6C5E]/40 mx-auto" />
                    <p className="text-sm font-extrabold text-[#2C241D]">No active deliveries found</p>
                    <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto">
                      All assigned consignments have been successfully delivered or no active tasks match your search query.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filterBySearch(activeTasksList).map((t) => renderShipmentCard(t, false))}
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 2: DELIVERY HISTORY (COMPLETED DELIVERIES)                       */}
            {/* =================================================================== */}
            {activeTab === 'completed_tasks' && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                {/* Header & Metric Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2D7CB]/60 pb-3">
                  <div>
                    <h3 className="text-base font-black text-[#2C241D]">Fulfilled Deliveries Archive</h3>
                    <p className="text-xs text-[#7A6C5E]">Compact log of verified doorstep completions and recipient handovers</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {filterBySearch(completedTasksList).length} Delivered
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#FAF7F2] text-[#5C4E42] text-xs font-black border border-[#E2D7CB]">
                      Value: ₹{completedTasksList.reduce((acc, t) => acc + (t.total_amount || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {filterBySearch(completedTasksList).length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-xl p-12 text-center rounded-3xl border border-[#E2D7CB] shadow-sm space-y-3">
                    <History className="w-10 h-10 text-[#7A6C5E]/40 mx-auto" />
                    <p className="text-sm font-extrabold text-[#2C241D]">No fulfilled deliveries matching query</p>
                    <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto">
                      Completed consignments will appear here once marked as delivered to recipient.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Desktop & Tablet Compact Table */}
                    <div className="hidden md:block overflow-hidden rounded-2xl border border-[#E2D7CB] bg-white shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF7F2] border-b border-[#E2D7CB] text-[10px] font-black uppercase tracking-wider text-[#7A6C5E]">
                          <tr>
                            <th className="py-3 px-4">Waybill / Order</th>
                            <th className="py-3 px-4">Recipient & Destination</th>
                            <th className="py-3 px-4">Cargo Items</th>
                            <th className="py-3 px-4">Delivered Time</th>
                            <th className="py-3 px-4">Handover Remarks</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-semibold text-[#2C241D]">
                          {filterBySearch(completedTasksList).map((t) => (
                            <tr key={t.fulfillment_id} className="hover:bg-[#FCF9F5] transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-mono font-black text-xs text-[#2C241D]">{t.order_id}</div>
                                <div className="text-[10px] text-[#7A6C5E] font-mono">{t.tracking_number}</div>
                              </td>
                              <td className="py-3 px-4 max-w-xs">
                                <div className="font-bold text-[#2C241D] truncate">{t.customer_name}</div>
                                <div className="text-[11px] text-[#7A6C5E] truncate" title={t.destination_address}>
                                  {t.destination_address}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-bold text-[#2C241D]">
                                  {t.items.length} Product{t.items.length > 1 ? 's' : ''}
                                </div>
                                <div className="text-[11px] font-extrabold text-[#38A132]">
                                  ₹{t.total_amount.toLocaleString('en-IN')}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-[11px] text-[#5C4E42] whitespace-nowrap">
                                {t.delivered_at ? formatToIST(t.delivered_at) : 'Completed'}
                              </td>
                              <td className="py-3 px-4 max-w-[200px] text-[11px] text-[#7A6C5E] truncate" title={t.delivery_notes || ''}>
                                {t.delivery_notes || 'Handed over in verified condition'}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Check className="w-3 h-3 text-emerald-700" /> Fulfilled
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryTask(t)}
                                  className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EAE0D4] border border-[#E2D7CB] text-[#2C241D] text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  title="View consignment receipt without map"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#38A132]" />
                                  <span>Receipt</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Compact Cards (No map, highly space-efficient) */}
                    <div className="grid grid-cols-1 gap-2.5 md:hidden">
                      {filterBySearch(completedTasksList).map((t) => (
                        <div
                          key={t.fulfillment_id}
                          className="p-3.5 rounded-2xl bg-white border border-[#E2D7CB] shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-xs text-[#2C241D]">{t.order_id}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Delivered
                            </span>
                          </div>
                          <div className="text-xs">
                            <div className="font-bold text-[#2C241D]">{t.customer_name}</div>
                            <div className="text-[11px] text-[#7A6C5E] truncate">{t.destination_address}</div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-[#EFE7DE] text-[11px]">
                            <span className="font-extrabold text-[#38A132]">₹{t.total_amount.toLocaleString('en-IN')}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedHistoryTask(t)}
                              className="px-2.5 py-1 rounded-lg bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-[#38A132]" />
                              <span>Receipt</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 3: VEHICLE INFO                                                 */}
            {/* =================================================================== */}
            {activeTab === 'vehicle_info' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                <div className="ultra-glass-card rounded-3xl p-6 sm:p-8 border border-[#E2D7CB] shadow-lg space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#38A132]/15 text-[#38A132] flex items-center justify-center font-bold">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#2C241D]">Assigned Vehicle Details</h3>
                      <p className="text-xs text-[#7A6C5E]">Logistics transport vehicle registered under carrier partner agency</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">Vehicle Plate Number</span>
                      <p className="text-base font-black text-[#2C241D] font-mono">{summary?.vehicle_reg || 'KL-05-AT-4482'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">Vehicle Model / Class</span>
                      <p className="text-base font-black text-[#2C241D]">{summary?.vehicle_type || 'Mini Truck'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">Driver Operational Status</span>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {summary?.status || 'ACTIVE & ON-DUTY'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                    <div className="font-extrabold flex items-center gap-2 text-emerald-800">
                      <ShieldCheck className="w-4 h-4 text-[#38A132]" />
                      Safety & Road Compliance Verified
                    </div>
                    <p className="text-[#5C4E42] leading-relaxed">
                      This vehicle is authorized for RetailSphere furniture delivery operations with commercial transit insurance and route coverage.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 4: CARRIER AGENCY INFO                                          */}
            {/* =================================================================== */}
            {activeTab === 'carrier_info' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                <div className="ultra-glass-card rounded-3xl p-6 sm:p-8 border border-[#E2D7CB] shadow-lg space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-700 flex items-center justify-center font-bold">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#2C241D]">Carrier Partner Agency</h3>
                      <p className="text-xs text-[#7A6C5E]">Logistics enterprise managing vehicle fleet and dispatch allocations</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">Agency Name</span>
                      <p className="text-base font-black text-[#2C241D]">
                        {summary?.carrier?.carrier_name || 'RetailSphere Logistics'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">Contact Email</span>
                      <p className="text-xs font-bold text-[#2C241D] truncate">
                        {summary?.carrier?.contact_email || 'logistics@retailsphere.ai'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-1">
                      <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">Dispatch Helpline</span>
                      <p className="text-xs font-bold text-[#2C241D]">
                        {summary?.carrier?.contact_phone || '+91 94000 00000'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 5: LEAVE APPLICATION                                            */}
            {/* =================================================================== */}
            {activeTab === 'leave_application' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Apply for Leave Form (5 cols) */}
                  <div className="lg:col-span-5 ultra-glass-card rounded-3xl p-6 border border-[#E2D7CB] shadow-lg space-y-5">
                    <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-[#38A132] flex items-center justify-center font-bold">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-[#2C241D]">Apply for Time-Off</h3>
                        <p className="text-xs text-[#7A6C5E]">Submit absence request for dispatch vehicle coverage</p>
                      </div>
                    </div>

                    {leaveNotice && (
                      <div
                        className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                          leaveNotice.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {leaveNotice.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        )}
                        <span>{leaveNotice.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleApplyLeaveSubmit} className="space-y-4 text-xs font-semibold">
                      <div>
                        <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                          Leave Category *
                        </label>
                        <select
                          value={leaveType}
                          onChange={(e) => setLeaveType(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                        >
                          <option value="Casual Leave">Casual Leave (Personal / Urgent)</option>
                          <option value="Sick Leave">Sick / Medical Recovery</option>
                          <option value="Privilege Leave">Privilege / Annual Vacation</option>
                          <option value="Emergency Leave">Emergency / Family Support</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                            Start Date *
                          </label>
                          <input
                            type="date"
                            value={leaveStartDate}
                            onChange={(e) => setLeaveStartDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            required
                            className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                            End Date *
                          </label>
                          <input
                            type="date"
                            value={leaveEndDate}
                            onChange={(e) => setLeaveEndDate(e.target.value)}
                            min={leaveStartDate || new Date().toISOString().split('T')[0]}
                            required
                            className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                          Reason & Vehicle Handover Notes *
                        </label>
                        <textarea
                          rows={3}
                          value={leaveReason}
                          onChange={(e) => setLeaveReason(e.target.value)}
                          placeholder="e.g. Attending family function; keys returned to dispatch garage."
                          required
                          className="w-full p-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingLeave}
                        className="w-full py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F852A] text-white font-black text-xs shadow-md shadow-[#38A132]/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>{isSubmittingLeave ? 'Submitting Application...' : 'Submit Leave Request'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Leave History (7 cols) */}
                  <div className="lg:col-span-7 ultra-glass-card rounded-3xl p-6 border border-[#E2D7CB] shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                      <div>
                        <h3 className="text-base font-black text-[#2C241D]">My Leave Request History</h3>
                        <p className="text-xs text-[#7A6C5E]">Track approvals by carrier partner and workshop admin</p>
                      </div>
                      <button
                        onClick={loadLeavesData}
                        className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EAE0D4] border border-[#E2D7CB] text-[#2C241D] text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        title="Refresh leave requests"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {leavesList.length === 0 ? (
                      <div className="bg-white/80 p-12 text-center rounded-2xl border border-[#E2D7CB] space-y-2">
                        <Calendar className="w-8 h-8 text-[#7A6C5E]/40 mx-auto" />
                        <p className="text-xs font-extrabold text-[#2C241D]">No leave applications submitted yet</p>
                        <p className="text-[11px] text-[#7A6C5E]">Your leave history will show up here once submitted.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {leavesList.map((l) => {
                          const isApproved = l.status === 'Approved';
                          const isPending = l.status === 'Pending';
                          return (
                            <div
                              key={l.leave_id}
                              className="p-4 rounded-2xl bg-white border border-[#E2D7CB] shadow-xs space-y-2 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-[#2C241D]">{l.leave_type}</span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E2D7CB] text-[#7A6C5E]">
                                    {l.duration_days} Day{l.duration_days > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                    isApproved
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : isPending
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-rose-100 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  {l.status}
                                </span>
                              </div>

                              <div className="text-xs text-[#5C4E42] flex items-center gap-2 font-medium">
                                <span>📅 {l.start_date}</span>
                                <span>to</span>
                                <span>{l.end_date}</span>
                              </div>

                              <p className="text-xs text-[#7A6C5E] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EFE7DE] italic">
                                "{l.reason}"
                              </p>

                              {l.review_notes && (
                                <div className="text-[11px] text-emerald-900 bg-emerald-50/80 p-2 rounded-xl border border-emerald-200">
                                  <strong>Admin Review:</strong> {l.review_notes}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 6: MESSAGES & DISPATCH INQUIRIES                                */}
            {/* =================================================================== */}
            {activeTab === 'messages' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                {/* Sub Tab Switcher */}
                <div className="flex items-center gap-3 border-b border-[#E2D7CB]/60 pb-3">
                  <button
                    type="button"
                    onClick={() => setMessagesTab('helpdesk')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                      messagesTab === 'helpdesk'
                        ? 'bg-[#38A132] text-white shadow-sm shadow-[#38A132]/25'
                        : 'bg-white text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Dispatch Helpdesk & Queries</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-bold">
                      {driverQueries.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMessagesTab('broadcasts')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                      messagesTab === 'broadcasts'
                        ? 'bg-[#38A132] text-white shadow-sm shadow-[#38A132]/25'
                        : 'bg-white text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>Official Directives & Broadcasts</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-bold">
                      {broadcastMessages.length}
                    </span>
                  </button>
                </div>

                {messagesTab === 'helpdesk' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Send Inquiry Form */}
                    <div className="lg:col-span-5 ultra-glass-card rounded-3xl p-6 border border-[#E2D7CB] shadow-lg space-y-4">
                      <div className="flex items-center gap-3 border-b border-[#E2D7CB] pb-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-[#38A132] flex items-center justify-center font-bold">
                          <Send className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-[#2C241D]">Send Dispatch Inquiry</h3>
                          <p className="text-xs text-[#7A6C5E]">Message carrier managers and support team</p>
                        </div>
                      </div>

                      {queryFormNotice && (
                        <div
                          className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                            queryFormNotice.type === 'success'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {queryFormNotice.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          )}
                          <span>{queryFormNotice.text}</span>
                        </div>
                      )}

                      <form onSubmit={handleSendQuerySubmit} className="space-y-4 text-xs font-semibold">
                        <div>
                          <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                            Query Category *
                          </label>
                          <select
                            value={queryCategory}
                            onChange={(e: any) => setQueryCategory(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                          >
                            <option value="General Query">General Logistics Query</option>
                            <option value="Role & Access Permission">Vehicle / Route Permission</option>
                            <option value="Email Change Request">Driver Profile / Credentials</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                            Subject *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Fuel allowance claim / Route closure near Aluva"
                            value={querySubject}
                            onChange={(e) => setQuerySubject(e.target.value)}
                            required
                            className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                            Message Notes *
                          </label>
                          <textarea
                            rows={4}
                            placeholder="Detail your question or operational update for carrier management..."
                            value={queryMessage}
                            onChange={(e) => setQueryMessage(e.target.value)}
                            required
                            className="w-full p-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingQuery}
                          className="w-full py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F852A] text-white font-black text-xs shadow-md shadow-[#38A132]/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                          <Send className="w-4 h-4" />
                          <span>{isSubmittingQuery ? 'Sending...' : 'Send to Dispatch'}</span>
                        </button>
                      </form>
                    </div>

                    {/* Inquiries Thread History */}
                    <div className="lg:col-span-7 ultra-glass-card rounded-3xl p-6 border border-[#E2D7CB] shadow-lg space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                        <div>
                          <h3 className="text-base font-black text-[#2C241D]">Inquiries & Resolution Thread</h3>
                          <p className="text-xs text-[#7A6C5E]">Responses from dispatch coordination desk</p>
                        </div>
                        <button
                          onClick={loadDriverMessages}
                          className="p-2 rounded-xl bg-[#FAF7F2] hover:bg-[#EAE0D4] border border-[#E2D7CB] text-[#2C241D] text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#38A132]" />
                          <span>Refresh</span>
                        </button>
                      </div>

                      {driverQueries.length === 0 ? (
                        <div className="bg-white/80 p-12 text-center rounded-2xl border border-[#E2D7CB] space-y-2">
                          <Inbox className="w-8 h-8 text-[#7A6C5E]/40 mx-auto" />
                          <p className="text-xs font-extrabold text-[#2C241D]">No inquiries sent yet</p>
                          <p className="text-[11px] text-[#7A6C5E]">Submitted inquiries and dispatch answers will appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
                          {driverQueries.map((q) => {
                            const isResolved = q.status === 'Resolved' || q.status === 'Approved';
                            const isPending = q.status === 'Pending';
                            return (
                              <div
                                key={q.id}
                                className="p-4 rounded-2xl bg-white border border-[#E2D7CB] shadow-xs space-y-2.5 hover:shadow-sm transition-all"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">
                                      {q.category}
                                    </span>
                                    <h4 className="font-extrabold text-sm text-[#2C241D]">{q.subject}</h4>
                                  </div>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border shrink-0 ${
                                      isResolved
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : isPending
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-blue-100 text-blue-800 border-blue-300'
                                    }`}
                                  >
                                    {q.status}
                                  </span>
                                </div>

                                <p className="text-xs text-[#5C4E42] bg-[#FAF7F2] p-3 rounded-xl border border-[#EFE7DE] leading-relaxed">
                                  {q.message}
                                </p>

                                <div className="flex items-center justify-between text-[10px] text-[#7A6C5E] pt-0.5">
                                  <span>Sent: {q.createdAt}</span>
                                </div>

                                {q.adminResponse && (
                                  <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                      <Building2 className="w-3.5 h-3.5" />
                                      <span>Dispatch Manager Response:</span>
                                    </div>
                                    <p className="leading-relaxed pl-5">{q.adminResponse}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Official Broadcast Directives View */
                  <div className="ultra-glass-card rounded-3xl p-6 border border-[#E2D7CB] shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
                      <div>
                        <h3 className="text-base font-black text-[#2C241D]">Fleet Directives & Policy Updates</h3>
                        <p className="text-xs text-[#7A6C5E]">Official announcements sent by administration and carrier partner</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black border border-blue-200">
                        {broadcastMessages.length} Notice{broadcastMessages.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {broadcastMessages.length === 0 ? (
                      <div className="bg-white/80 p-12 text-center rounded-2xl border border-[#E2D7CB] space-y-2">
                        <Bell className="w-8 h-8 text-[#7A6C5E]/40 mx-auto" />
                        <p className="text-xs font-extrabold text-[#2C241D]">No active broadcast directives</p>
                        <p className="text-[11px] text-[#7A6C5E]">Official updates will be displayed here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {broadcastMessages.map((m) => (
                          <div
                            key={m.id}
                            className="p-4 rounded-2xl bg-white border border-[#E2D7CB] shadow-xs space-y-2 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-[#7A6C5E] flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-[#38A132]" />
                                From: {m.sender}
                              </span>
                              <span className="text-[10px] text-[#7A6C5E] font-medium">{m.createdDate}</span>
                            </div>
                            <h4 className="font-extrabold text-sm text-[#2C241D]">{m.subject}</h4>
                            <p className="text-xs text-[#5C4E42] bg-[#FAF7F2] p-3 rounded-xl border border-[#EFE7DE] leading-relaxed">
                              {m.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPLETION MODAL                                                       */}
      {/* ========================================================================= */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E2D7CB] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D7CB]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-[#38A132] flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#2C241D]">Confirm Delivery Drop-Off</h3>
                  <p className="text-[11px] text-[#7A6C5E] font-medium">
                    Order: <span className="font-mono font-bold text-[#2C241D]">{completingTask.order_id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompletingTask(null)}
                className="p-1 text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-1">
                <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">
                  Customer Recipient & Destination
                </span>
                <p className="font-extrabold text-[#2C241D] text-sm">{completingTask.customer_name}</p>
                <p className="text-xs text-[#7A6C5E] leading-relaxed pt-0.5">{completingTask.destination_address}</p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                  Proof of Delivery / Handover Notes
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Delivered and verified with recipient in good condition."
                  className="w-full p-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132] focus:bg-white transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2D7CB]/60">
              <button
                onClick={() => setCompletingTask(null)}
                className="px-4 py-2.5 rounded-xl bg-[#F5ECE1] hover:bg-[#E2D7CB] text-[#2C241D] text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteDeliverySubmit}
                disabled={isSubmittingCompletion}
                className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F852A] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/25 cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {isSubmittingCompletion ? 'Updating Status...' : 'Confirm Delivery Drop-Off'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DECLINE / REJECT DELIVERY ASSIGNMENT MODAL                                */}
      {/* ========================================================================= */}
      {rejectingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E2D7CB] p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D7CB]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#2C241D]">Decline Delivery Assignment</h3>
                  <p className="text-[11px] text-[#7A6C5E]">
                    Order #{rejectingTask.order_id} • Waybill {rejectingTask.tracking_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectingTask(null)}
                className="p-1 text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span>Notice to Driver</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Declining will return this consignment to your carrier dispatch pool so another vehicle can be assigned without customer delay.
              </p>
            </div>

            {rejectionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{rejectionError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                  Decline Reason Category *
                </label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132]"
                >
                  <option value="Vehicle Breakdown / Mechanical Failure">Vehicle Breakdown / Mechanical Issue</option>
                  <option value="Cargo Exceeds Vehicle Capacity">Cargo Dimensions / Weight Exceeds Capacity</option>
                  <option value="Route Inaccessible / Road Closure">Route Inaccessible / Road Blocked</option>
                  <option value="Shift Hours Limit Reached">Driver Shift Ended / Hours Limit</option>
                  <option value="Medical / Personal Emergency">Medical or Personal Emergency</option>
                  <option value="Other Operational Reason">Other Operational Constraint</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                  Explanation & Dispatch Handover Notes *
                </label>
                <textarea
                  rows={3}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Detail why this shipment cannot be delivered on your shift (min. 5 chars)..."
                  className="w-full p-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2D7CB]/60">
              <button
                type="button"
                onClick={() => setRejectingTask(null)}
                className="px-4 py-2 rounded-xl bg-[#F5ECE1] hover:bg-[#E2D7CB] text-[#2C241D] text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isSubmittingRejection}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
              >
                <XCircle className="w-4 h-4" />
                <span>{isSubmittingRejection ? 'Declining...' : 'Confirm Decline & Return'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPACT DELIVERY HISTORY RECEIPT MODAL (NO MAP)                           */}
      {/* ========================================================================= */}
      {selectedHistoryTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E2D7CB] p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D7CB]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#2C241D]">Consignment Delivery Receipt</h3>
                  <p className="text-[11px] text-[#7A6C5E]">
                    Order #{selectedHistoryTask.order_id} • {selectedHistoryTask.tracking_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryTask(null)}
                className="p-1 text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">
                  Customer & Drop-off Location
                </span>
                <div className="font-extrabold text-[#2C241D] text-sm">{selectedHistoryTask.customer_name}</div>
                <div className="text-xs text-[#5C4E42]">{selectedHistoryTask.destination_address}</div>
                {selectedHistoryTask.customer_phone && (
                  <div className="text-[11px] text-[#7A6C5E]">Phone: {selectedHistoryTask.customer_phone}</div>
                )}
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-[#7A6C5E] block">
                  Delivered Cargo Items ({selectedHistoryTask.items.length})
                </span>
                <div className="divide-y divide-[#EFE7DE] border border-[#E2D7CB] rounded-2xl bg-[#FAF7F2]/60 overflow-hidden">
                  {selectedHistoryTask.items.map((it) => (
                    <div key={it.item_id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#2C241D]">{it.product_name}</div>
                        <div className="text-[10px] text-[#7A6C5E]">Qty: {it.quantity}</div>
                      </div>
                      <div className="font-black text-[#38A132]">₹{it.unit_price.toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Handover & Completion Proof */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-800 block">
                  Handover & Verification Details
                </span>
                <p className="font-bold text-emerald-950">
                  {selectedHistoryTask.delivery_notes || 'Handed over in verified condition to customer recipient.'}
                </p>
                <div className="text-[11px] text-emerald-800 pt-1">
                  Completed on:{' '}
                  <strong>
                    {selectedHistoryTask.delivered_at
                      ? formatToIST(selectedHistoryTask.delivered_at)
                      : 'Delivered'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#E2D7CB]/60">
              <button
                type="button"
                onClick={() => setSelectedHistoryTask(null)}
                className="px-5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F852A] text-white font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DRIVER PROFILE & SECURITY MODAL                                        */}
      {/* ========================================================================= */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E2D7CB] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E2D7CB]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                  {driverInitials}
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#2C241D]">Driver Profile & Security</h3>
                  <p className="text-[11px] text-[#7A6C5E] font-medium">
                    Personnel Account #{summary?.personnel_id || '1'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Messages */}
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
              {/* Partner Agency & Vehicle Overview */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider text-[#7A6C5E] block">
                    Assigned Logistics Partner
                  </span>
                  <p className="font-black text-[#2C241D] text-sm mt-0.5">
                    {summary?.carrier?.carrier_name || 'RetailSphere Logistics'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[#E2D7CB]/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Assigned Vehicle</span>
                    <span className="font-mono text-[#2C241D] font-extrabold">
                      {summary?.vehicle_reg || 'KL-05-AT-4482'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#7A6C5E] block">Driver Status</span>
                    <span className="font-extrabold text-[#38A132]">ACTIVE & ON DUTY</span>
                  </div>
                </div>
              </div>

              {/* Personnel Name */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] mb-1.5">
                  Personnel Full Name
                </label>
                <input
                  type="text"
                  disabled
                  value={summary?.name || currentUser?.full_name || 'Driver'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5ECE1]/60 border border-[#E2D7CB] text-xs font-extrabold text-[#5C4E42] cursor-not-allowed"
                />
              </div>

              {/* Email Address & Change Request */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#7A6C5E]">
                    Registered Email Address
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailRequestMsg(null);
                      setIsEmailChangeOpen(!isEmailChangeOpen);
                    }}
                    className="text-[11px] font-extrabold text-[#38A132] hover:text-[#2E8B29] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isEmailChangeOpen ? 'Cancel Request' : 'Request Email Change'}</span>
                  </button>
                </div>

                <input
                  type="email"
                  disabled
                  value={summary?.email || currentUser?.email || ''}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5ECE1]/60 border border-[#E2D7CB] text-xs font-extrabold text-[#5C4E42] cursor-not-allowed"
                />

                {/* Pending / Recent Email Change Status Banner */}
                {emailRequests.length > 0 && emailRequests[0].status === 'PENDING' && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Email Change Request Pending Approval
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                        Pending Carrier Review
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Requested: <strong className="font-mono text-[#2C241D]">{emailRequests[0].requested_email}</strong>
                    </p>
                  </div>
                )}

                {/* Collapsible Email Change Form */}
                {isEmailChangeOpen && (
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#38A132]/40 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                      <span className="font-black text-xs text-[#2C241D]">Submit Email Change Request</span>
                      <span className="text-[10px] text-[#7A6C5E]">Carrier approval required</span>
                    </div>

                    {emailRequestMsg && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-bold ${
                          emailRequestMsg.type === 'success'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {emailRequestMsg.text}
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-1">
                        New Email Address
                      </label>
                      <input
                        type="email"
                        value={requestedNewEmail}
                        onChange={(e) => setRequestedNewEmail(e.target.value)}
                        placeholder="new.driver@example.com"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2D7CB] text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-1">
                        Reason for Change
                      </label>
                      <input
                        type="text"
                        value={emailChangeReason}
                        onChange={(e) => setEmailChangeReason(e.target.value)}
                        placeholder="e.g. Updated personal email account"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E2D7CB] text-xs text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEmailChangeOpen(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleRequestEmailSubmit}
                        disabled={isSubmittingEmailRequest}
                        className="px-4 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2E8B29] text-white text-xs font-extrabold shadow-sm shadow-[#38A132]/20 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingEmailRequest ? 'Submitting...' : 'Submit Request'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] mb-1.5">
                  Operational Contact Phone (10-digit)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#E2D7CB] bg-[#FAF7F2] text-[#2C241D] font-black text-xs select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={extract10DigitPhone(profilePhone)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setProfilePhone(val);
                    }}
                    placeholder="9400000000"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 rounded-r-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132] focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Change Section */}
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
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E2D7CB]/60">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#F5ECE1] hover:bg-[#E2D7CB] text-[#2C241D] text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-6 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F852A] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/25 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REAL-TIME SHOP-TO-DELIVERY OPENSTREETMAP ROUTE MODAL                    */}
      {/* ========================================================================= */}
      {viewingRouteTask && (
        <DeliveryRouteMap
          orderId={viewingRouteTask.order_id}
          trackingNumber={viewingRouteTask.tracking_number}
          pickupAddress={viewingRouteTask.pickup_address || 'RetailSphere Operations Facility, MC Road, Ettumanoor, Kottayam, Kerala 686631'}
          destinationAddress={viewingRouteTask.destination_address}
          customerName={viewingRouteTask.customer_name}
          customerPhone={viewingRouteTask.customer_phone}
          distanceKm={viewingRouteTask.distance_km}
          deliveryStatus={viewingRouteTask.delivery_status || viewingRouteTask.fulfillment_status}
          onClose={() => setViewingRouteTask(null)}
        />
      )}
    </div>
  );
};

export default DeliveryPersonnelDashboardPage;
