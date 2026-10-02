import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearUserSession } from '../../utils/sessionUtils';
import {
  LayoutDashboard,
  Hammer,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
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
  AlertTriangle,
  SlidersHorizontal,
  Layers,
  Check,
  AlertCircle,
  Filter,
  Truck,
  MapPin,
  Calendar,
  Image as ImageIcon,
  CheckSquare,
  PackageCheck,
  Mail,
  Phone,
  Scissors,
  ShieldAlert,
  ExternalLink,
  Camera,
  Navigation,
  Box,
  Compass,
  ShoppingBag,
  Inbox,
  UserCheck,
  Pause,
  Play,
  Sliders,
  ListOrdered,
  Square
} from 'lucide-react';

import {
  fetchWorkerSummaryDB,
  fetchWorkerTasksDB,
  startWorkerTaskDB,
  completeWorkerTaskDB,
  reportWorkerTaskIssueDB,
  pauseWorkerTaskDB,
  resumeWorkerTaskDB,
  updateWorkerTaskProgressDB,
  fetchWorkerCompletedHistoryDB,
  fetchWorkerOnsiteJobsDB,
  updateWorkerOnsiteJobStatusDB,
  fetchWorkerReworkJobsDB,
  resolveWorkerReworkJobDB,
  fetchWorkerDeliveriesDB,
  updateWorkerDeliveryStatusDB,
  WorkerSummaryData,
  WorkerTaskItem,
  WorkerCompletedHistoryItem,
  WorkerOnsiteJobItem,
  WorkerReworkItem,
  WorkerDeliveryItem
} from '../../services/api_worker';
import { getCurrentUser, updateUserProfile, changeFirstPassword, changePasswordUser } from '../../services/api';
import { applyWorkerLeave, fetchMyLeaveApplications, WorkerLeaveItem } from '../../services/api_leave';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';
import { getStageSections, StageSection } from '../../utils/manufacturingSections';
import {
  getMessagesForUser,
  markAdminMessageRead,
  markAllAdminMessagesReadForUser,
  isMessageReadByUser,
  AdminMessage
} from '../../utils/adminMessagesStorage';
import { getStaffQueries, addStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';

export const WorkerDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // User Profile
  const [userProfile, setUserProfile] = useState<any>(null);

  // Summary & Workspace State
  const [summaryData, setSummaryData] = useState<WorkerSummaryData | null>(null);
  const [tasksList, setTasksList] = useState<WorkerTaskItem[]>([]);
  const [completedHistory, setCompletedHistory] = useState<WorkerCompletedHistoryItem[]>([]);
  const [onsiteJobsList, setOnsiteJobsList] = useState<WorkerOnsiteJobItem[]>([]);
  const [reworkList, setReworkList] = useState<WorkerReworkItem[]>([]);
  const [deliveriesList, setDeliveriesList] = useState<WorkerDeliveryItem[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<WorkerLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Navigation State
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'my_tasks' | 'onsite' | 'rework' | 'deliveries' | 'completed' | 'admin_messages' | 'queries' | 'leave'
  >('dashboard');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('All');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Leave Form State
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Directives & Queries State
  const [adminDirectives, setAdminDirectives] = useState<AdminMessage[]>([]);
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [queryCategory, setQueryCategory] = useState<'Role & Access Permission' | 'General Query' | 'Email Change Request'>('General Query');
  const [querySubject, setQuerySubject] = useState('');
  const [queryMessage, setQueryMessage] = useState('');
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);

  // Modals & Banners
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Selected Task Modal State
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<WorkerTaskItem | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);

  // Complete Task Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeWorkImages, setCompleteWorkImages] = useState('');
  const [completeProgressPct, setCompleteProgressPct] = useState(100);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  // Pause Task Modal State
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [selectedTaskForPause, setSelectedTaskForPause] = useState<WorkerTaskItem | null>(null);
  const [pauseReasonChoice, setPauseReasonChoice] = useState('Waiting for glue / adhesive curing');
  const [customPauseReason, setCustomPauseReason] = useState('');
  const [isSubmittingPause, setIsSubmittingPause] = useState(false);

  // Report Issue Modal State
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const [issueType, setIssueType] = useState('Material Unavailable');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhotoUrl, setIssuePhotoUrl] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Onsite Job Modal State
  const [selectedOnsiteJob, setSelectedOnsiteJob] = useState<WorkerOnsiteJobItem | null>(null);
  const [isOnsiteModalOpen, setIsOnsiteModalOpen] = useState(false);
  const [onsiteNotes, setOnsiteNotes] = useState('');
  const [onsiteBeforePhoto, setOnsiteBeforePhoto] = useState('');
  const [onsiteAfterPhoto, setOnsiteAfterPhoto] = useState('');
  const [isSubmittingOnsite, setIsSubmittingOnsite] = useState(false);

  // Rework Modal State
  const [selectedReworkForDetail, setSelectedReworkForDetail] = useState<WorkerReworkItem | null>(null);
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [reworkResolveNotes, setReworkResolveNotes] = useState('');
  const [isSubmittingRework, setIsSubmittingRework] = useState(false);

  // Delivery Modal & Filter State
  const [selectedDelivery, setSelectedDelivery] = useState<WorkerDeliveryItem | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryStatusInput, setDeliveryStatusInput] = useState('Out for Delivery');
  const [deliveryNotesInput, setDeliveryNotesInput] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);
  const [deliveryFilter, setDeliveryFilter] = useState<'All' | 'Dispatched' | 'Out for Delivery' | 'Delivered'>('All');
  const [deliverySearchQuery, setDeliverySearchQuery] = useState('');

  // Profile / Password Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mustChangePasswordModal, setMustChangePasswordModal] = useState(false);
  const [profilePhone, setProfilePhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Data Loading Function
  const loadWorkerWorkspaceData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        clearUserSession();
        navigate('/login', { replace: true });
        return;
      }

      setUserProfile(currentUser);
      const email = currentUser.email || 'worker@retailsphere.ai';
      const role = (currentUser as any).role || 'Worker';
      if ((currentUser as any).must_change_password) {
        setMustChangePasswordModal(true);
      }

      // Load Broadcast Directives and Staff Communication Queries
      const msgs = getMessagesForUser(email, role);
      setAdminDirectives(msgs);

      const allQueries = getStaffQueries();
      const userQueries = allQueries.filter(
        (q) => !q.staffEmail || q.staffEmail.toLowerCase() === email.toLowerCase()
      );
      setStaffQueries(userQueries);

      const [summary, tasks, history, onsite, leaves, reworks, deliveries] = await Promise.all([
        fetchWorkerSummaryDB(),
        fetchWorkerTasksDB(taskStatusFilter),
        fetchWorkerCompletedHistoryDB(),
        fetchWorkerOnsiteJobsDB(),
        fetchMyLeaveApplications(),
        fetchWorkerReworkJobsDB(),
        fetchWorkerDeliveriesDB()
      ]);

      const isDriver = Boolean(
        (currentUser as any).is_driver || 
        summary?.is_driver || 
        (deliveries && deliveries.length > 0)
      );

      setUserProfile({
        ...currentUser,
        is_driver: isDriver,
        specialization: summary?.specialization || (currentUser as any).specialization || 'Joinery & Assembly'
      });

      if (summary) setSummaryData({ ...summary, is_driver: isDriver });
      setTasksList(tasks || []);
      setCompletedHistory(history || []);
      setOnsiteJobsList(onsite || []);
      setLeaveApplications(leaves || []);
      setReworkList(reworks || []);
      setDeliveriesList(deliveries || []);
    } catch (err) {
      console.error('Failed to load worker workspace data:', err);
      setErrorNotice('Could not load latest workshop data. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkerWorkspaceData();
  }, [taskStatusFilter]);

  // Unread directives count
  const unreadAdminMsgsCount = useMemo(() => {
    if (!userProfile?.email) return 0;
    return adminDirectives.filter((m) => !isMessageReadByUser(m, userProfile.email)).length;
  }, [adminDirectives, userProfile]);

  // Active In-Progress Task (Hero on Home)
  const activeTask = useMemo(() => {
    return tasksList.find((t) => t.task_status === 'IN_PROGRESS') || null;
  }, [tasksList]);

  // Assigned Upcoming Queue
  const upcomingAssignedTasks = useMemo(() => {
    return tasksList.filter((t) => t.task_status === 'ASSIGNED');
  }, [tasksList]);

  // Filtered Tasks for My Tasks Tab
  const filteredTasks = useMemo(() => {
    return tasksList.filter((t) => {
      // Status Filter
      if (taskStatusFilter !== 'All' && t.task_status !== taskStatusFilter) {
        return false;
      }
      // Type Filter
      if (taskTypeFilter === 'Custom' && t.order_type !== 'Custom') return false;
      if (taskTypeFilter === 'Fabrication' && t.order_type !== 'Fabrication') return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (t.order_id || '').toLowerCase().includes(q);
        const matchName = (t.job_name || '').toLowerCase().includes(q);
        const matchStage = (t.stage_name || '').toLowerCase().includes(q);
        const matchMat = (t.material || '').toLowerCase().includes(q);
        return matchId || matchName || matchStage || matchMat;
      }
      return true;
    });
  }, [tasksList, taskStatusFilter, taskTypeFilter, searchQuery]);

  // Filtered Deliveries for Driver Deliveries Tab
  const filteredDeliveries = useMemo(() => {
    return deliveriesList.filter((d) => {
      if (deliveryFilter !== 'All') {
        const st = (d.delivery_status || d.fulfillment_status || '').toLowerCase();
        if (deliveryFilter === 'Dispatched' && !st.includes('dispatched') && st !== 'assigned to driver') return false;
        if (deliveryFilter === 'Out for Delivery' && !st.includes('out for delivery') && !st.includes('out_for_delivery')) return false;
        if (deliveryFilter === 'Delivered' && !st.includes('delivered')) return false;
      }
      if (deliverySearchQuery.trim()) {
        const q = deliverySearchQuery.toLowerCase();
        const matchId = (d.order_id || '').toLowerCase().includes(q);
        const matchName = (d.customer_name || '').toLowerCase().includes(q);
        const matchAddr = (d.delivery_address || '').toLowerCase().includes(q);
        const matchVeh = (d.vehicle_reg || '').toLowerCase().includes(q);
        return matchId || matchName || matchAddr || matchVeh;
      }
      return true;
    });
  }, [deliveriesList, deliveryFilter, deliverySearchQuery]);

  // Handlers for Task Actions
  const handleStartTask = async (taskId: string) => {
    try {
      const res = await startWorkerTaskDB(taskId);
      setSuccessNotice(res.message || 'Task started successfully.');
      setIsTaskDetailModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to start task.');
    }
  };

  const handleToggleSection = async (task: WorkerTaskItem, sectionId: string) => {
    const currentSections = task.completed_sections || [];
    const exists = currentSections.includes(sectionId);
    const newCompleted = exists
      ? currentSections.filter((id) => id !== sectionId)
      : [...currentSections, sectionId];

    const sections = getStageSections(task.stage_name, task.job_name);
    const newPct = Math.round((newCompleted.length / sections.length) * 100);

    const nextSec = sections.find((s) => !newCompleted.includes(s.id));
    const nextSectionTitle = nextSec ? nextSec.title : 'All Checklist Sections Completed';

    // Optimistic local state update
    setTasksList((prev) =>
      prev.map((t) =>
        t.task_id === task.task_id
          ? {
              ...t,
              completed_sections: newCompleted,
              progress_percentage: newPct,
              current_section: nextSectionTitle
            }
          : t
      )
    );

    if (selectedTaskForDetail && selectedTaskForDetail.task_id === task.task_id) {
      setSelectedTaskForDetail((prev) =>
        prev
          ? {
              ...prev,
              completed_sections: newCompleted,
              progress_percentage: newPct,
              current_section: nextSectionTitle
            }
          : null
      );
    }

    try {
      await updateWorkerTaskProgressDB(task.task_id, {
        completed_sections: newCompleted,
        progress_percentage: newPct,
        current_section: nextSectionTitle
      });
    } catch (err: any) {
      console.error('Failed to sync section progress to backend:', err);
    }
  };

  const handleOpenPauseModal = (task: WorkerTaskItem) => {
    setSelectedTaskForPause(task);
    setPauseReasonChoice('Waiting for glue / adhesive curing');
    setCustomPauseReason('');
    setIsPauseModalOpen(true);
  };

  const handleConfirmPause = async () => {
    if (!selectedTaskForPause) return;
    const finalReason =
      pauseReasonChoice === 'Other Workshop Impediment' && customPauseReason.trim()
        ? customPauseReason.trim()
        : pauseReasonChoice;

    setIsSubmittingPause(true);
    try {
      const res = await pauseWorkerTaskDB(selectedTaskForPause.task_id, {
        pause_reason: finalReason
      });
      setSuccessNotice(res.message || 'Stage paused successfully.');
      setIsPauseModalOpen(false);
      setIsTaskDetailModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to pause stage.');
    } finally {
      setIsSubmittingPause(false);
    }
  };

  const handleResumeTask = async (taskId: string) => {
    try {
      const res = await resumeWorkerTaskDB(taskId);
      setSuccessNotice(res.message || 'Stage resumed. Status back to In Progress.');
      if (selectedTaskForDetail && selectedTaskForDetail.task_id === taskId) {
        setSelectedTaskForDetail((prev) => (prev ? { ...prev, task_status: 'IN_PROGRESS', pause_reason: undefined } : null));
      }
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to resume stage.');
    }
  };

  const handleOpenCompleteModal = (task: WorkerTaskItem) => {
    setSelectedTaskForDetail(task);
    setCompleteNotes('');
    setCompleteWorkImages('');
    const sections = getStageSections(task.stage_name, task.job_name);
    const completedCount = (task.completed_sections || []).length;
    const calcPct = completedCount > 0 ? Math.round((completedCount / sections.length) * 100) : 100;
    setCompleteProgressPct(calcPct);
    setIsCompleteModalOpen(true);
  };

  const handleConfirmCompleteTask = async () => {
    if (!selectedTaskForDetail) return;
    setIsSubmittingComplete(true);
    try {
      const res = await completeWorkerTaskDB(selectedTaskForDetail.task_id, {
        notes: completeNotes,
        work_images: completeWorkImages,
        progress_percentage: completeProgressPct
      });
      setSuccessNotice(res.message || 'Task completed successfully.');
      setIsCompleteModalOpen(false);
      setIsTaskDetailModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to complete task.');
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  const handleOpenReportIssueModal = (task: WorkerTaskItem) => {
    setSelectedTaskForDetail(task);
    setIssueType('Material Unavailable');
    setIssueDescription('');
    setIssuePhotoUrl('');
    setIsReportIssueModalOpen(true);
  };

  const handleConfirmReportIssue = async () => {
    if (!selectedTaskForDetail || !issueDescription.trim()) return;
    setIsSubmittingIssue(true);
    try {
      const res = await reportWorkerTaskIssueDB(selectedTaskForDetail.task_id, {
        issue_type: issueType,
        description: issueDescription.trim(),
        photo_url: issuePhotoUrl.trim() || undefined
      });
      setSuccessNotice(res.message || 'Issue reported. Task moved to On Hold status.');
      setIsReportIssueModalOpen(false);
      setIsTaskDetailModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to report issue.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Handlers for Onsite Job
  const handleOpenOnsiteModal = (job: WorkerOnsiteJobItem) => {
    setSelectedOnsiteJob(job);
    setOnsiteNotes(job.customer_notes || '');
    setOnsiteBeforePhoto(job.before_photos || '');
    setOnsiteAfterPhoto(job.after_photos || '');
    setIsOnsiteModalOpen(true);
  };

  const handleUpdateOnsiteStatus = async (newStatus: string) => {
    if (!selectedOnsiteJob) return;
    setIsSubmittingOnsite(true);
    try {
      const res = await updateWorkerOnsiteJobStatusDB(selectedOnsiteJob.job_id, {
        status: newStatus,
        customer_notes: onsiteNotes,
        before_photos: onsiteBeforePhoto,
        after_photos: onsiteAfterPhoto
      });
      setSuccessNotice(res.message || `On-site job status updated to ${newStatus}.`);
      setIsOnsiteModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update on-site job.');
    } finally {
      setIsSubmittingOnsite(false);
    }
  };

  // Handlers for QC Rework
  const handleOpenReworkModal = (rw: WorkerReworkItem) => {
    setSelectedReworkForDetail(rw);
    setReworkResolveNotes('');
    setIsReworkModalOpen(true);
  };

  const handleConfirmResolveRework = async () => {
    if (!selectedReworkForDetail) return;
    setIsSubmittingRework(true);
    try {
      const res = await resolveWorkerReworkJobDB(selectedReworkForDetail.rework_id, reworkResolveNotes);
      setSuccessNotice(res.message || 'Rework marked as resolved and submitted for re-inspection.');
      setIsReworkModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to resolve rework.');
    } finally {
      setIsSubmittingRework(false);
    }
  };

  // Handlers for Driver Delivery
  const handleOpenDeliveryModal = (del: WorkerDeliveryItem) => {
    setSelectedDelivery(del);
    setDeliveryStatusInput(del.delivery_status || 'Out for Delivery');
    setDeliveryNotesInput(del.delivery_notes || '');
    setIsDeliveryModalOpen(true);
  };

  const handleConfirmUpdateDelivery = async () => {
    if (!selectedDelivery) return;
    setIsSubmittingDelivery(true);
    try {
      const res = await updateWorkerDeliveryStatusDB(selectedDelivery.fulfillment_id, {
        status: deliveryStatusInput,
        notes: deliveryNotesInput
      });
      setSuccessNotice(res.message || `Delivery status updated to ${deliveryStatusInput}.`);
      setIsDeliveryModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update delivery status.');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  // Handlers for Leave
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      setErrorNotice('Please provide a reason for the leave application.');
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await applyWorkerLeave({
        leave_type: leaveType,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        reason: leaveReason
      });
      setSuccessNotice('Leave application submitted successfully.');
      setLeaveReason('');
      const updatedLeaves = await fetchMyLeaveApplications();
      setLeaveApplications(updatedLeaves || []);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to submit leave application.');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Handlers for Staff Query
  const handleSubmitQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!querySubject.trim() || !queryMessage.trim()) return;
    setIsSubmittingQuery(true);
    try {
      addStaffQuery({
        staffName: userProfile?.full_name || 'Artisan Worker',
        staffEmail: userProfile?.email || 'worker@retailsphere.ai',
        category: queryCategory,
        subject: querySubject.trim(),
        message: queryMessage.trim()
      });
      setSuccessNotice('Your inquiry has been submitted to production supervisors.');
      setQuerySubject('');
      setQueryMessage('');
      const allQueries = getStaffQueries();
      const userQueries = allQueries.filter(
        (q) => !q.staffEmail || q.staffEmail.toLowerCase() === (userProfile?.email || '').toLowerCase()
      );
      setStaffQueries(userQueries);
    } catch (err: any) {
      setErrorNotice('Failed to submit inquiry.');
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  // Profile & Password Update Handler (No current password required)
  const handleSaveProfileAndSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);

    const hasPasswordUpdate = Boolean(newPassword.trim());
    if (mustChangePasswordModal && !hasPasswordUpdate) {
      setPasswordNotice({ type: 'error', text: 'Please set a new password to proceed.' });
      return;
    }

    if (hasPasswordUpdate) {
      if (newPassword.trim().length < 6) {
        setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters long.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordNotice({ type: 'error', text: 'New password and confirmation do not match.' });
        return;
      }
    }

    setIsUpdatingProfile(true);
    try {
      let updatedUser = userProfile;

      // 1. If password needs to be updated
      if (hasPasswordUpdate) {
        updatedUser = await changePasswordUser(newPassword.trim());
        setMustChangePasswordModal(false);
      }

      // 2. If phone is updated
      if (profilePhone.trim() !== (userProfile?.phone || '')) {
        updatedUser = await updateUserProfile({
          full_name: userProfile?.full_name || 'Artisan Worker',
          phone: profilePhone.trim()
        });
      }

      setUserProfile((prev: any) => ({
        ...prev,
        ...updatedUser,
        phone: profilePhone.trim()
      }));

      setPasswordNotice({
        type: 'success',
        text: hasPasswordUpdate
          ? 'Profile & security credentials updated successfully!'
          : 'Profile contact details saved successfully!'
      });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setPasswordNotice(null);
      }, 1500);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err.message || 'Failed to update profile or security settings.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleLogout = () => {
    clearUserSession();
    navigate('/login', { replace: true });
  };

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
                Worker Portal
              </div>
            </div>
          </button>
        </div>

        {/* Sidebar Scrollable Navigation */}
        <nav className="flex-1 space-y-3.5 text-xs max-h-[calc(100vh-140px)] overflow-y-auto pr-0.5 scrollbar-none">
          {/* Category 1: Workshop Operations */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                  Workshop Operations
                </div>
              )}
            </div>
            {[
              { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
              { id: 'my_tasks', label: 'My Workshop Tasks', icon: Hammer },
              { id: 'completed', label: 'Completed History', icon: CheckCircle2 }
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

          {/* Category 2: Field & Quality Services */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                  Field & Quality
                </div>
              )}
            </div>
            {[
              { id: 'onsite', label: 'On-Site Field Jobs', icon: MapPin },
              { id: 'rework', label: 'QC Rework Tickets', icon: AlertTriangle }
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

          {/* Category 3: Logistics & Fleet (Strictly Conditional on is_driver) */}
          {userProfile?.is_driver && (
            <div className="space-y-0.5">
              <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
                isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
              }`}>
                {isSidebarCollapsed ? (
                  <div className="h-px bg-[#DFD2C0]/80 mx-1" />
                ) : (
                  <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                    Logistics & Fleet
                  </div>
                )}
              </div>
              {[
                { id: 'deliveries', label: 'Driver Deliveries', icon: Truck }
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
          )}

          {/* Category 4: Support & Availability */}
          <div className="space-y-0.5">
            <div className={`transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden ${
              isSidebarCollapsed ? 'max-h-2 opacity-60 my-1' : 'max-h-8 opacity-100 my-0'
            }`}>
              {isSidebarCollapsed ? (
                <div className="h-px bg-[#DFD2C0]/80 mx-1" />
              ) : (
                <div className="text-[9px] font-black tracking-widest text-[#8F745D] uppercase px-2 py-1 font-mono truncate">
                  Support & Leave
                </div>
              )}
            </div>
            {[
              { id: 'admin_messages', label: 'Admin Directives', icon: Mail },
              { id: 'queries', label: 'Supervisor Inquiries', icon: MessageSquare },
              { id: 'leave', label: 'Leave Applications', icon: Clock }
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
        {/* Mobile Top Navigation */}
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E6E1DA] p-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-[#2C241D]">Worker Portal</span>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-[#E8F5E9] text-[#2D6338] rounded-md">
              {userProfile?.specialization || 'Production'}
            </span>
          </div>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-[#E2D7CB] text-[#2C241D]"
          >
            <option value="dashboard">📊 Dashboard Overview</option>
            <option value="my_tasks">🔨 Workshop Tasks</option>
            <option value="onsite">📍 On-Site Jobs</option>
            <option value="rework">⚠️ QC Rework</option>
            {userProfile?.is_driver && <option value="deliveries">🚚 Driver Deliveries</option>}
            <option value="completed">✅ Completed History</option>
            <option value="admin_messages">📢 Directives</option>
            <option value="queries">💬 Supervisor Inquiries</option>
            <option value="leave">📅 Leave Applications</option>
          </select>
        </div>

        {/* Main Content Container */}
        <main className={`space-y-6 w-full transition-all duration-300 ${
          isSidebarCollapsed 
            ? 'p-3 sm:p-5 lg:p-6 max-w-none' 
            : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'
        }`}>
          <div className="ultra-glass-panel rounded-3xl p-4 sm:p-6 lg:p-7 space-y-6 relative border border-[#DECDB7] shadow-[0_12px_40px_rgba(58,40,24,0.04)] bg-[#FCF9F3]/95 backdrop-blur-2xl w-full">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-3xl" />

            {/* Top Notifications Banner */}
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

            {errorNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-700 flex items-start gap-3 shadow-md animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">
                  {errorNotice}
                </div>
                <button onClick={() => setErrorNotice(null)} className="text-red-700 hover:text-red-900 p-1 cursor-pointer">
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
                      📢 You have {unreadAdminMsgsCount} unread Supervisor Directive{unreadAdminMsgsCount > 1 ? 's' : ''}!
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">
                      Workshop supervisors dispatched official instructions for active manufacturing operations.
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

            {/* Top Workspace Bar (Elevated z-index for dropdown stacking) */}
            <div className="relative z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D7CB]">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#2C241D] tracking-tight">
                    {activeTab === 'dashboard' && 'Workshop Execution Center'}
                    {activeTab === 'my_tasks' && 'My Assigned Manufacturing Stages'}
                    {activeTab === 'onsite' && 'On-Site Field Service Assignments'}
                    {activeTab === 'rework' && 'Quality Control & Rework Tickets'}
                    {activeTab === 'deliveries' && 'Driver Logistics & Order Delivery'}
                    {activeTab === 'completed' && 'Completed Workshop History'}
                    {activeTab === 'admin_messages' && 'Supervisor Directives & Broadcasts'}
                    {activeTab === 'queries' && 'Technical Queries & Material Requests'}
                    {activeTab === 'leave' && 'Leave Management & Absence Tracking'}
                  </h1>
                </div>
                <p className="text-xs text-[#7A6C5E] font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Artisan ID: #{userProfile?.user_id || '104'}</span>
                  <span>•</span>
                  <span>Specialization: <strong className="text-[#2C241D]">{userProfile?.specialization || 'Joinery & Assembly'}</strong></span>
                  {userProfile?.is_driver && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-400 font-extrabold text-[10px]">
                        <Truck className="w-3 h-3 text-amber-700" />
                        <span>Internal Delivery Driver</span>
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Top Controls: Staff Name Dropdown Pill Matching Other Dashboards */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs cursor-pointer"
                    title="Click for profile and sign out options"
                  >
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                      {(userProfile?.full_name || 'Worker').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-extrabold text-[#2C241D]">
                      {userProfile?.full_name || 'Worker'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      {/* Invisible backdrop to handle click-outside */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                        <button
                          onClick={() => {
                            setProfilePhone(userProfile?.phone || '');
                            setNewPassword('');
                            setConfirmPassword('');
                            setPasswordNotice(null);
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
                            setIsUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-700 hover:bg-rose-100/80 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* KPI METRICS RIBBON (Matching Retail/Production Staff Dashboards)       */}
            {/* ===================================================================== */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 relative z-10">
              {/* Metric 1: Active In-Progress Task */}
              <div
                onClick={() => setActiveTab('my_tasks')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#38A132]/10 text-[#38A132] flex items-center justify-center shrink-0">
                  <Hammer className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.active_tasks_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    Active Workshop
                  </div>
                </div>
              </div>

              {/* Metric 2: Pending Assigned Tasks */}
              <div
                onClick={() => setActiveTab('my_tasks')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.pending_tasks_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    Pending Queue
                  </div>
                </div>
              </div>

              {/* Metric 3: Completed Today */}
              <div
                onClick={() => setActiveTab('completed')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.completed_today_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    Done Today
                  </div>
                </div>
              </div>

              {/* Metric 4: On-Site Field Jobs */}
              <div
                onClick={() => setActiveTab('onsite')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.onsite_jobs_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    On-Site Jobs
                  </div>
                </div>
              </div>

              {/* Metric 5: QC Rework Tickets */}
              <div
                onClick={() => setActiveTab('rework')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.rework_jobs_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    QC Rework
                  </div>
                </div>
              </div>

              {/* Metric 6: Driver Deliveries (or Leave Status if not driver) */}
              {userProfile?.is_driver ? (
                <div
                  onClick={() => setActiveTab('deliveries')}
                  className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                      {summaryData?.driver_deliveries_count || 0}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                      Driver Deliveries
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setActiveTab('leave')}
                  className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                      {leaveApplications.filter(l => l.status === 'Pending').length}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                      Pending Leaves
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ===================================================================== */}
            {/* 3. TAB 1: DASHBOARD OVERVIEW (HOME)                                   */}
            {/* ===================================================================== */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                {/* A. CURRENT ACTIVE WORKSHOP TASK HERO */}
                <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 sm:p-6 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-[#EFE7DE] mb-5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-[#38A132] animate-pulse" />
                      <h2 className="text-base sm:text-lg font-black text-[#2C241D]">
                        Active Workshop Execution
                      </h2>
                    </div>
                    {activeTask && (
                      <span className="px-3 py-1 rounded-full bg-[#E8F5E9] text-[#2D6338] text-xs font-black uppercase tracking-wider border border-[#A5D6A7]">
                        Stage In Progress
                      </span>
                    )}
                  </div>

                  {activeTask ? (
                    (() => {
                      const sections = getStageSections(activeTask.stage_name, activeTask.job_name);
                      const completedList = activeTask.completed_sections || [];
                      const checkedCount = completedList.length;
                      const totalCount = sections.length;
                      const isFullyChecked = checkedCount >= totalCount;
                      const isPaused = activeTask.task_status === 'PAUSED' || Boolean(activeTask.pause_reason);
                      const currentPct = activeTask.task_status === 'COMPLETED'
                        ? 100
                        : totalCount > 0
                        ? Math.round((checkedCount / totalCount) * 100)
                        : (activeTask.progress_percentage || 0);

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          {/* Left: Design Reference Image / Preview */}
                          <div className="lg:col-span-3 bg-[#FAF7F2] rounded-2xl p-3 border border-[#E2D7CB] space-y-2">
                            <div className="relative h-44 w-full bg-[#EFE8DC] rounded-xl overflow-hidden flex items-center justify-center border border-[#D6C9B9]">
                              {activeTask.reference_image ? (
                                <img
                                  src={activeTask.reference_image}
                                  alt={activeTask.job_name}
                                  className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => {
                                    if (activeTask.reference_image) {
                                      openImageInNewTab(activeTask.reference_image);
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-center p-4 text-[#7A6C5E]">
                                  <ImageIcon className="w-10 h-10 mx-auto mb-1 opacity-40" />
                                  <span className="text-[11px] font-bold">Standard Workshop Blueprint</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-[#7A6C5E] px-1">
                              <span>{activeTask.order_type} Order</span>
                              <span className="font-mono text-[#B89768] font-black">{activeTask.order_id}</span>
                            </div>
                            {isPaused && (
                              <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-1.5">
                                <Pause className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span className="line-clamp-2">Paused: {activeTask.pause_reason || 'On Break / Hold'}</span>
                              </div>
                            )}
                          </div>

                          {/* Middle: Technical Job Specs & PROCEDURAL SECTIONS CHECKLIST */}
                          <div className="lg:col-span-5 space-y-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2.5 py-0.5 rounded-md border border-[#D6C9B9]">
                                  {activeTask.order_id} • Stage: {activeTask.stage_name}
                                </span>
                                {isPaused && (
                                  <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md">
                                    ⏸️ STAGE PAUSED
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base sm:text-lg font-black text-[#2C241D] mt-1.5 leading-snug">
                                {activeTask.job_name}
                              </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB]">
                                <span className="text-[9px] text-[#7A6C5E] uppercase font-bold block">Dimensions</span>
                                <span className="font-extrabold text-[#2C241D] truncate block">{activeTask.dimensions || 'Standard Specs'}</span>
                              </div>
                              <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB]">
                                <span className="text-[9px] text-[#7A6C5E] uppercase font-bold block">Timber / Material</span>
                                <span className="font-extrabold text-[#2C241D] truncate block">{activeTask.material || 'Solid Hardwood'}</span>
                              </div>
                            </div>

                            {/* Procedural Step Checklist (Interactive for artisan) */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-[11px] font-black">
                                <span className="text-[#5C4E42] flex items-center gap-1.5">
                                  <Sliders className="w-3.5 h-3.5 text-[#38A132]" />
                                  <span>Procedural Step Checklist ({checkedCount}/{totalCount})</span>
                                </span>
                                <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                                  isFullyChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {currentPct}% Analyzed
                                </span>
                              </div>

                              <div className="space-y-1.5 bg-[#FAF7F2] p-2 rounded-2xl border border-[#E2D7CB] max-h-56 overflow-y-auto">
                                {sections.map((sec, idx) => {
                                  const isChecked = completedList.includes(sec.id);
                                  return (
                                    <div
                                      key={sec.id}
                                      onClick={() => handleToggleSection(activeTask, sec.id)}
                                      className={`flex items-start gap-2 p-2 rounded-xl transition-all border select-none cursor-pointer hover:border-[#38A132] ${
                                        isChecked
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                          : 'bg-white border-[#E2D7CB] text-[#2C241D]'
                                      }`}
                                    >
                                      <div className="pt-0.5">
                                        {isChecked ? (
                                          <div className="w-4 h-4 rounded-md bg-[#38A132] text-white flex items-center justify-center shrink-0 shadow-xs">
                                            <Check className="w-3 h-3 stroke-[3]" />
                                          </div>
                                        ) : (
                                          <div className="w-4 h-4 rounded-md border-2 border-[#B89768] bg-white shrink-0 hover:border-[#38A132]" />
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className={`text-[11px] font-black ${isChecked ? 'text-emerald-900 line-through decoration-emerald-600/60' : 'text-[#2C241D]'}`}>
                                            Step {idx + 1}: {sec.title}
                                          </span>
                                          <span className="text-[10px] font-mono font-bold text-[#7A6C5E] shrink-0">+{sec.weightPct}%</span>
                                        </div>
                                        <p className="text-[10px] text-[#7A6C5E] font-medium leading-tight mt-0.5">{sec.description}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Right: Operational Actions & Stage Progress */}
                          <div className="lg:col-span-4 space-y-3 flex flex-col justify-between h-full bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB]">
                            <div>
                              <div className="flex items-center justify-between text-[11px] font-black uppercase text-[#7A6C5E] mb-1.5">
                                <span>Build Stage Progress</span>
                                <span className="font-mono text-sm font-extrabold text-[#38A132]">{currentPct}%</span>
                              </div>
                              <div className="w-full bg-[#E2D7CB] rounded-full h-3 overflow-hidden mb-2">
                                <div
                                  className={`h-3 rounded-full transition-all duration-500 ${
                                    isPaused
                                      ? 'bg-amber-500'
                                      : isFullyChecked
                                      ? 'bg-[#38A132]'
                                      : 'bg-gradient-to-r from-blue-500 to-[#38A132]'
                                  }`}
                                  style={{ width: `${currentPct}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[11px] font-bold text-[#7A6C5E]">
                                <span>Started: {activeTask.started_at ? new Date(activeTask.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}</span>
                                <span>{checkedCount} of {totalCount} Steps</span>
                              </div>
                            </div>

                            <div className="space-y-2 pt-2">
                              {/* Complete Stage Button */}
                              <button
                                onClick={() => handleOpenCompleteModal(activeTask)}
                                className={`w-full py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
                                  isFullyChecked
                                    ? 'bg-[#38A132] hover:bg-[#2F8829] text-white shadow-[#38A132]/30 ring-2 ring-[#38A132]/40 animate-pulse'
                                    : 'bg-[#38A132] hover:bg-[#2F8829] text-white shadow-[#38A132]/20'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                                <span>{isFullyChecked ? '✓ Finalize & Complete Stage' : 'Complete Stage'}</span>
                              </button>

                              {/* Pause / Resume Button */}
                              {isPaused ? (
                                <button
                                  onClick={() => handleResumeTask(activeTask.task_id)}
                                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>▶️ Resume Stage Work</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenPauseModal(activeTask)}
                                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                >
                                  <Pause className="w-3.5 h-3.5 fill-current" />
                                  <span>⏸️ Pause Stage</span>
                                </button>
                              )}

                              {/* Report Issue / Hold */}
                              <button
                                onClick={() => handleOpenReportIssueModal(activeTask)}
                                className="w-full py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Report Defect / Issue</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                        <Hammer className="w-7 h-7 opacity-40" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h4 className="text-sm font-extrabold text-[#2C241D]">No Stage Currently In Progress</h4>
                        <p className="text-xs text-[#7A6C5E] mt-1">
                          You do not have an active workshop task in progress right now. Review the upcoming queue below or check your assigned tasks to begin work.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* B. UPCOMING ASSIGNED STAGES QUEUE */}
                <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DE]">
                    <h3 className="text-sm sm:text-base font-black text-[#2C241D] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Upcoming Assigned Manufacturing Stages</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('my_tasks')}
                      className="text-xs font-bold text-[#38A132] hover:text-[#2F8829] flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Tasks ({tasksList.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {upcomingAssignedTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7A6C5E]">
                      No pending assigned stages in queue. You are completely caught up!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#E2D7CB] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider bg-[#FAF7F2]">
                            <th className="py-2.5 px-3 rounded-l-xl">Order Ref</th>
                            <th className="py-2.5 px-3">Product / Job</th>
                            <th className="py-2.5 px-3">Stage</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Priority</th>
                            <th className="py-2.5 px-3">Assigned Date</th>
                            <th className="py-2.5 px-3 text-right rounded-r-xl">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                          {upcomingAssignedTasks.slice(0, 5).map((task) => (
                            <tr key={task.task_id} className="hover:bg-[#FAF7F2] transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-[#B89768]">
                                {task.order_id}
                              </td>
                              <td className="py-3 px-3 font-extrabold text-[#2C241D]">
                                {task.job_name}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] font-bold text-[11px]">
                                  {task.stage_name}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-[11px] text-[#7A6C5E]">
                                {task.order_type}
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase ${
                                  task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {task.priority}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-[11px] text-[#7A6C5E]">
                                {task.assigned_date ? new Date(task.assigned_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {task.is_pickup_pending ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px]" title="Customer timber pickup pending via logistics partner before stage start">
                                    <Truck className="w-3 h-3 text-amber-600 animate-pulse" />
                                    <span>Pickup Pending</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleStartTask(task.task_id)}
                                    className="px-3 py-1 rounded-lg bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-[11px] transition-all cursor-pointer shadow-2xs"
                                  >
                                    Start Stage
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* C. FIELD SERVICE & REWORK GLANCE GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* On-Site Appointments Glance */}
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EFE7DE]">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#2C241D] flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Scheduled On-Site Appointments</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('onsite')}
                        className="text-[11px] font-bold text-[#38A132] hover:underline cursor-pointer"
                      >
                        View All ({onsiteJobsList.length})
                      </button>
                    </div>

                    {onsiteJobsList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#7A6C5E]">
                        No on-site service appointments assigned.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {onsiteJobsList.slice(0, 3).map((job) => (
                          <div key={job.job_id} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] flex items-center justify-between text-xs">
                            <div>
                              <div className="font-extrabold text-[#2C241D]">{job.customer_name} • {job.service_category}</div>
                              <div className="text-[11px] text-[#7A6C5E] truncate max-w-xs">{job.address}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">
                              {job.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* QC Rework Glance */}
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EFE7DE]">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#2C241D] flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
                        <span>Assigned QC Rework Defects</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('rework')}
                        className="text-[11px] font-bold text-[#38A132] hover:underline cursor-pointer"
                      >
                        View All ({reworkList.length})
                      </button>
                    </div>

                    {reworkList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#7A6C5E]">
                        No active QC rework tickets assigned. Quality standards 100%!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reworkList.slice(0, 3).map((rw) => (
                          <div key={rw.rework_id} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] flex items-center justify-between text-xs">
                            <div>
                              <div className="font-extrabold text-[#2C241D]">{rw.order_id} • {rw.order_title}</div>
                              <div className="text-[11px] text-red-600 font-bold truncate max-w-xs">{rw.rework_reason}</div>
                            </div>
                            <button
                              onClick={() => handleOpenReworkModal(rw)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Inspect
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* D. ASSIGNED DELIVERY DISPATCHES (FOR INTERNAL DELIVERY DRIVERS) */}
                {userProfile?.is_driver && (
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DE]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-[#2C241D]">
                            Assigned Delivery Orders (Driver Route)
                          </h3>
                          <p className="text-[11px] text-[#7A6C5E] font-medium">
                            Orders assigned for field delivery & customer handover
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('deliveries')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <span>Manage Deliveries ({deliveriesList.length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {deliveriesList.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[#7A6C5E] bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB]">
                        No active retail delivery orders currently assigned to your vehicle queue.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {deliveriesList.slice(0, 6).map((del) => (
                          <div
                            key={del.fulfillment_id}
                            className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] hover:border-indigo-300 transition-all space-y-2.5 flex flex-col justify-between shadow-2xs hover:shadow-xs"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2 py-0.5 rounded-md border border-[#D6C9B9]">
                                  {del.order_id}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${
                                  del.fulfillment_status === 'Delivered'
                                    ? 'bg-[#E8F5E9] text-[#2D6338]'
                                    : del.delivery_status === 'Out for Delivery'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {del.delivery_status || del.fulfillment_status}
                                </span>
                              </div>
                              <div>
                                <div className="font-extrabold text-xs text-[#2C241D] truncate">{del.customer_name}</div>
                                <div className="text-[11px] text-[#7A6C5E] truncate flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span className="truncate">{del.delivery_address}</span>
                                </div>
                              </div>
                              <div className="text-[10px] text-[#7A6C5E] font-medium truncate">
                                {del.items_description}
                              </div>
                              {del.delivery_notes && (
                                <div className="p-2 rounded-xl bg-[#F5ECE1]/70 border border-[#E2D7CB] text-[11px] text-[#3D3228] flex items-start gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#B89768] shrink-0 mt-0.5" />
                                  <span className="line-clamp-2 leading-tight">
                                    <strong className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Note:</strong>
                                    {del.delivery_notes}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="text-[10px] font-bold text-[#7A6C5E] flex items-center justify-between pt-2 border-t border-[#EFE7DE]">
                              <span className="truncate max-w-[120px]">{del.vehicle_reg}</span>
                              <button
                                onClick={() => handleOpenDeliveryModal(del)}
                                className="text-indigo-600 hover:text-indigo-800 hover:underline font-extrabold cursor-pointer"
                              >
                                Update Status &rarr;
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 4. TAB 2: MY WORKSHOP TASKS                                           */}
            {/* ===================================================================== */}
            {activeTab === 'my_tasks' && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                {/* Search & Filter Bar */}
                <div className="bg-white/95 p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks by order ID, product name, or material..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] placeholder:text-[#7A6C5E] focus:outline-none focus:border-[#38A132]"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category Filter */}
                    <select
                      value={taskTypeFilter}
                      onChange={(e) => setTaskTypeFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      <option value="Custom">Custom Production</option>
                      <option value="Fabrication">Wood Fabrication</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={taskStatusFilter}
                      onChange={(e) => setTaskStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Task Cards Grid */}
                {filteredTasks.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                      <Hammer className="w-6 h-6 opacity-40" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2C241D]">No Tasks Match Your Filter</h4>
                    <p className="text-xs text-[#7A6C5E]">Try adjusting the status or category filters above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map((task) => {
                      const sections = getStageSections(task.stage_name, task.job_name);
                      const completedList = task.completed_sections || [];
                      const checkedCount = completedList.length;
                      const totalCount = sections.length;
                      const isFullyChecked = checkedCount >= totalCount;
                      const isPaused = task.task_status === 'PAUSED' || Boolean(task.pause_reason);
                      const currentPct = task.task_status === 'COMPLETED'
                        ? 100
                        : totalCount > 0
                        ? Math.round((checkedCount / totalCount) * 100)
                        : (task.progress_percentage || 0);

                      return (
                        <div
                          key={task.task_id}
                          className={`bg-white/95 rounded-3xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                            isPaused
                              ? 'border-amber-400 bg-amber-50/20'
                              : task.task_status === 'IN_PROGRESS'
                              ? 'border-blue-300'
                              : 'border-[#E2D7CB]'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2 py-0.5 rounded-md border border-[#D6C9B9]">
                                {task.order_id}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                                task.task_status === 'COMPLETED' ? 'bg-[#E8F5E9] text-[#2D6338]' :
                                isPaused ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                task.task_status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                task.task_status === 'ON_HOLD' ? 'bg-red-100 text-red-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {isPaused ? '⏸️ PAUSED' : task.task_status}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-sm font-black text-[#2C241D] leading-snug">
                                {task.job_name}
                              </h4>
                              <span className="text-xs font-extrabold text-[#38A132] block mt-0.5">
                                Stage: {task.stage_name}
                              </span>
                            </div>

                            {isPaused && (
                              <div className="p-2 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-[11px] font-bold flex items-center gap-1.5">
                                <Pause className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>Paused: {task.pause_reason || 'Artisan temporarily paused'}</span>
                              </div>
                            )}

                            {/* Live Progress Bar & Percentage */}
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-extrabold text-[#7A6C5E] mb-1">
                                <span>Progress ({checkedCount}/{totalCount} Steps)</span>
                                <span className="font-mono text-xs text-[#38A132] font-black">{currentPct}%</span>
                              </div>
                              <div className="w-full bg-[#E2D7CB] rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    isPaused ? 'bg-amber-500' : isFullyChecked ? 'bg-[#38A132]' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${currentPct}%` }}
                                />
                              </div>
                            </div>

                            {/* Interactive Step Sections Breakdown */}
                            <div className="space-y-1 bg-[#FAF7F2] p-2 rounded-2xl border border-[#E2D7CB]">
                              <span className="text-[9px] font-black uppercase text-[#7A6C5E] block px-1">
                                Procedural Checklist
                              </span>
                              {sections.map((sec, idx) => {
                                const isChecked = completedList.includes(sec.id);
                                return (
                                  <div
                                    key={sec.id}
                                    onClick={() => {
                                      if (task.task_status === 'IN_PROGRESS' || isPaused) {
                                        handleToggleSection(task, sec.id);
                                      }
                                    }}
                                    className={`flex items-center justify-between p-1.5 rounded-lg text-[11px] transition-all ${
                                      task.task_status === 'IN_PROGRESS' || isPaused ? 'cursor-pointer hover:bg-white' : 'opacity-80'
                                    } ${isChecked ? 'bg-emerald-50 text-emerald-950 font-bold' : 'text-[#5C4E42] font-medium'}`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {isChecked ? (
                                        <div className="w-3.5 h-3.5 rounded bg-[#38A132] text-white flex items-center justify-center shrink-0">
                                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        </div>
                                      ) : (
                                        <div className="w-3.5 h-3.5 rounded border border-[#B89768] bg-white shrink-0" />
                                      )}
                                      <span className={`truncate ${isChecked ? 'line-through decoration-emerald-600/50' : ''}`}>
                                        {idx + 1}. {sec.title}
                                      </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-[#7A6C5E] shrink-0 ml-1">+{sec.weightPct}%</span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#FAF7F2] p-2 rounded-xl border border-[#E2D7CB]">
                              <div>
                                <span className="text-[#7A6C5E] uppercase block font-bold">Timber</span>
                                <span className="font-extrabold text-[#2C241D] truncate block">{task.material || 'Standard'}</span>
                              </div>
                              <div>
                                <span className="text-[#7A6C5E] uppercase block font-bold">Dimensions</span>
                                <span className="font-extrabold text-[#2C241D] truncate block">{task.dimensions || 'Standard'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Pickup in transit status alert */}
                          {task.is_pickup_pending && (
                            <div className="mx-4 mb-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                              <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                              <span className="font-semibold leading-tight">
                                Material pickup in transit via <strong>{task.pickup_carrier || 'Logistics Partner'}</strong>. Stage start unlocks upon arrival at workshop.
                              </span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="pt-2 border-t border-[#EFE7DE] flex flex-wrap items-center justify-between gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedTaskForDetail(task);
                                setIsTaskDetailModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#2C241D] font-bold text-xs border border-[#E2D7CB] cursor-pointer"
                            >
                              Details
                            </button>

                            {task.task_status === 'ASSIGNED' && (
                              task.is_pickup_pending ? (
                                <button
                                  disabled
                                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs cursor-not-allowed flex items-center gap-1.5 border border-slate-200"
                                  title="Awaiting customer material delivery to workshop by logistics partner"
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Pickup Pending</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStartTask(task.task_id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Start Stage</span>
                                </button>
                              )
                            )}

                            {isPaused && (
                              <button
                                onClick={() => handleResumeTask(task.task_id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Resume</span>
                              </button>
                            )}

                            {task.task_status === 'IN_PROGRESS' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenPauseModal(task)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs cursor-pointer flex items-center gap-1"
                                  title="Temporarily pause stage"
                                >
                                  <Pause className="w-3 h-3 fill-current" />
                                  <span>Pause</span>
                                </button>
                                <button
                                  onClick={() => handleOpenCompleteModal(task)}
                                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1 ${
                                    isFullyChecked
                                      ? 'bg-[#38A132] hover:bg-[#2F8829] text-white ring-2 ring-[#38A132]/30'
                                      : 'bg-[#38A132] hover:bg-[#2F8829] text-white'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Complete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 5. TAB 3: ON-SITE FIELD SERVICES                                      */}
            {/* ===================================================================== */}
            {activeTab === 'onsite' && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                {onsiteJobsList.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                      <MapPin className="w-6 h-6 opacity-40" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2C241D]">No On-Site Service Appointments</h4>
                    <p className="text-xs text-[#7A6C5E]">Service jobs assigned by production supervisors will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {onsiteJobsList.map((job) => (
                      <div
                        key={job.job_id}
                        className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2 py-0.5 rounded-md border border-[#D6C9B9]">
                              {job.service_id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                              job.status === 'COMPLETED' ? 'bg-[#E8F5E9] text-[#2D6338]' :
                              job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'IN_TRANSIT' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {job.status}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-black text-[#2C241D]">
                              {job.customer_name} • {job.service_category}
                            </h4>
                            <p className="text-xs text-[#7A6C5E] mt-1">{job.description}</p>
                          </div>

                          <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-[#2C241D] font-extrabold">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{job.address}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#7A6C5E] font-bold">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>{job.customer_phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#7A6C5E] font-bold">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Scheduled: {job.scheduled_time}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-between">
                          <button
                            onClick={() => handleOpenOnsiteModal(job)}
                            className="w-full py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Update Status & Photos</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 6. TAB 4: QC REWORK SECTION                                           */}
            {/* ===================================================================== */}
            {activeTab === 'rework' && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                {reworkList.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                      <CheckCircle2 className="w-6 h-6 text-[#38A132]" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2C241D]">Zero QC Defects Assigned</h4>
                    <p className="text-xs text-[#7A6C5E]">All inspected jobs have passed quality benchmarks cleanly.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reworkList.map((rw) => (
                      <div
                        key={rw.rework_id}
                        className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2 py-0.5 rounded-md border border-[#D6C9B9]">
                            {rw.order_id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                            rw.status === 'RESOLVED' ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-red-100 text-red-800'
                          }`}>
                            {rw.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-[#2C241D]">{rw.order_title}</h4>
                          <div className="p-3 bg-rose-50/80 rounded-2xl border border-rose-200 mt-2 text-xs text-rose-900 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <strong className="block font-bold text-[10px] uppercase text-rose-800 tracking-wider mb-0.5">QC Inspection Finding:</strong>
                              <p className="text-xs text-rose-900 font-medium leading-relaxed">{rw.rework_reason}</p>
                            </div>
                          </div>
                        </div>

                        {rw.checklist && (
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                            <div className={`p-1.5 rounded-lg ${rw.checklist.dimensions ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-red-100 text-red-800'}`}>
                              Dimensions: {rw.checklist.dimensions ? 'Passed' : 'Defect'}
                            </div>
                            <div className={`p-1.5 rounded-lg ${rw.checklist.finishing ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-red-100 text-red-800'}`}>
                              Finishing: {rw.checklist.finishing ? 'Passed' : 'Defect'}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => handleOpenReworkModal(rw)}
                          className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                        >
                          Resolve & Submit for Re-Inspection
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 7. TAB 5: DRIVER LOGISTICS (ONLY FOR is_driver)                       */}
            {/* ===================================================================== */}
            {activeTab === 'deliveries' && userProfile?.is_driver && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                {/* Search & Filter Ribbon */}
                <div className="bg-white/95 p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={deliverySearchQuery}
                      onChange={(e) => setDeliverySearchQuery(e.target.value)}
                      placeholder="Search delivery orders by customer, order ref, address, or vehicle..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] placeholder:text-[#7A6C5E] focus:outline-none focus:border-[#48A63E]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['All', 'Dispatched', 'Out for Delivery', 'Delivered'] as const).map((filter) => {
                      const count = filter === 'All'
                        ? deliveriesList.length
                        : deliveriesList.filter(d => {
                            const st = (d.delivery_status || d.fulfillment_status || '').toLowerCase();
                            if (filter === 'Dispatched') return st.includes('dispatched') || st === 'assigned to driver';
                            if (filter === 'Out for Delivery') return st.includes('out for delivery') || st.includes('out_for_delivery');
                            if (filter === 'Delivered') return st.includes('delivered');
                            return true;
                          }).length;

                      const isActive = deliveryFilter === filter;
                      return (
                        <button
                          key={filter}
                          onClick={() => setDeliveryFilter(filter)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#38A132] text-white shadow-sm shadow-[#38A132]/30'
                              : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE8DC]'
                          }`}
                        >
                          {filter} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {filteredDeliveries.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                      <Truck className="w-6 h-6 opacity-40 text-[#48A63E]" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2C241D]">
                      {deliveriesList.length === 0 ? 'No Deliveries Assigned' : 'No Deliveries Match Filter'}
                    </h4>
                    <p className="text-xs text-[#7A6C5E]">
                      {deliveriesList.length === 0
                        ? 'Orders dispatched for your delivery vehicle or driver account will appear here in real-time.'
                        : 'Try selecting a different status filter or clearing your search term.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDeliveries.map((del) => (
                      <div
                        key={del.fulfillment_id}
                        className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2.5 py-0.5 rounded-md border border-[#D6C9B9]">
                              {del.order_id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                              del.fulfillment_status === 'Delivered'
                                ? 'bg-[#E8F5E9] text-[#2D6338] border border-emerald-200'
                                : del.delivery_status === 'Out for Delivery'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-[#E8F5E9] text-[#2D6338] border border-emerald-300'
                            }`}>
                              {del.delivery_status || del.fulfillment_status}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-black text-[#2C241D]">{del.customer_name}</h4>
                            <p className="text-xs text-[#7A6C5E] mt-0.5">{del.items_description}</p>
                          </div>

                          <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-1.5 text-xs">
                            <div className="flex items-start gap-2 text-[#2C241D] font-extrabold">
                              <MapPin className="w-3.5 h-3.5 text-[#48A63E] shrink-0 mt-0.5" />
                              <span>{del.delivery_address}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#7A6C5E] font-bold">
                              <Truck className="w-3.5 h-3.5 text-[#B89768] shrink-0" />
                              <span>Vehicle: {del.vehicle_reg} ({del.vehicle_type})</span>
                            </div>
                            {del.customer_phone && (
                              <div className="flex items-center gap-2 text-[#7A6C5E] font-bold">
                                <Phone className="w-3.5 h-3.5 text-[#38A132] shrink-0" />
                                <a href={`tel:${del.customer_phone}`} className="hover:underline text-[#2C241D]">
                                  {del.customer_phone}
                                </a>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[11px] font-bold text-[#7A6C5E] pt-1 border-t border-[#EFE7DE]">
                              <span>Expected: <strong className="text-[#2C241D]">{del.expected_delivery_date}</strong></span>
                              {del.total_amount > 0 && (
                                <span className="text-[#38A132] font-black">₹{del.total_amount.toLocaleString('en-IN')}</span>
                              )}
                            </div>
                          </div>

                          {del.delivery_notes && (
                            <div className="p-3 rounded-2xl bg-[#F5ECE1]/70 border border-[#E2D7CB] text-xs text-[#2C241D] flex items-start gap-2.5 shadow-2xs">
                              <FileText className="w-4 h-4 text-[#B89768] shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-extrabold text-[#7A6C5E] uppercase tracking-wider block mb-0.5">
                                  Delivery Notes & Remarks
                                </span>
                                <p className="text-xs text-[#3D3228] font-medium leading-relaxed">
                                  {del.delivery_notes}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 pt-2">
                          <button
                            onClick={() => handleOpenDeliveryModal(del)}
                            className="w-full py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Update Delivery Status</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 8. TAB 6: COMPLETED HISTORY                                           */}
            {/* ===================================================================== */}
            {activeTab === 'completed' && (
              <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 sm:p-6 shadow-xs space-y-4 relative z-10 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DE]">
                  <h3 className="text-sm sm:text-base font-black text-[#2C241D]">
                    Workshop Finished Operations Log
                  </h3>
                  <span className="text-xs font-extrabold text-[#7A6C5E]">
                    Total Records: {completedHistory.length}
                  </span>
                </div>

                {completedHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#7A6C5E]">
                    No completed stage history logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2D7CB] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider bg-[#FAF7F2]">
                          <th className="py-2.5 px-3 rounded-l-xl">Order Ref</th>
                          <th className="py-2.5 px-3">Job Name</th>
                          <th className="py-2.5 px-3">Completed Stage</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3 text-right rounded-r-xl">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                        {completedHistory.map((item, idx) => (
                          <tr key={`${item.task_id}-${idx}`} className="hover:bg-[#FAF7F2] transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-[#B89768]">{item.order_id}</td>
                            <td className="py-3 px-3 font-extrabold text-[#2C241D]">{item.job_name}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] font-bold text-[11px]">
                                {item.stage_name}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[#7A6C5E]">{item.completed_date}</td>
                            <td className="py-3 px-3 font-bold text-[#38A132]">{item.duration}</td>
                            <td className="py-3 px-3 text-right">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#2D6338] font-black text-[10px] uppercase">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 9. TAB 7: ADMIN DIRECTIVES & BROADCASTS                               */}
            {/* ===================================================================== */}
            {activeTab === 'admin_messages' && (
              <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 sm:p-6 shadow-xs space-y-4 relative z-10 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DE]">
                  <h3 className="text-sm sm:text-base font-black text-[#2C241D] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#B89768]" />
                    <span>Supervisor & Admin Directives</span>
                  </h3>
                  {unreadAdminMsgsCount > 0 && (
                    <button
                      onClick={() => {
                        if (userProfile?.email) {
                          markAllAdminMessagesReadForUser(userProfile.email, userProfile.role || 'Worker');
                          setAdminDirectives(getMessagesForUser(userProfile.email, userProfile.role || 'Worker'));
                        }
                      }}
                      className="text-xs font-bold text-[#38A132] hover:underline cursor-pointer"
                    >
                      Mark All as Read
                    </button>
                  )}
                </div>

                {adminDirectives.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#7A6C5E]">
                    No broadcast directives from workshop supervisors.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adminDirectives.map((msg) => {
                      const isRead = isMessageReadByUser(msg, userProfile?.email || '');
                      return (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isRead ? 'bg-[#FAF7F2] border-[#E2D7CB]' : 'bg-amber-50/80 border-amber-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-sm text-[#2C241D]">{msg.subject}</span>
                            <span className="text-[10px] text-[#7A6C5E] font-bold">{msg.createdDate}</span>
                          </div>
                          <p className="text-xs text-[#5C4E42] leading-relaxed">{msg.message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 10. TAB 8: SUPERVISOR INQUIRIES                                       */}
            {/* ===================================================================== */}
            {activeTab === 'queries' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 animate-fadeIn">
                <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-4">
                  <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#B89768]" />
                    <span>Submit Technical Inquiry to Supervisor</span>
                  </h3>

                  <form onSubmit={handleSubmitQuery} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Category</label>
                      <select
                        value={queryCategory}
                        onChange={(e: any) => setQueryCategory(e.target.value)}
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                      >
                        <option value="General Query">General Operational / Technical Query</option>
                        <option value="Role & Access Permission">Role & Access Permission</option>
                        <option value="Email Change Request">Email / Profile Update Request</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Subject</label>
                      <input
                        type="text"
                        value={querySubject}
                        onChange={(e) => setQuerySubject(e.target.value)}
                        placeholder="Brief subject summary..."
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Details</label>
                      <textarea
                        rows={4}
                        value={queryMessage}
                        onChange={(e) => setQueryMessage(e.target.value)}
                        placeholder="Describe drawing clarification, technical inquiry, or tool requirement..."
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingQuery}
                      className="w-full py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer"
                    >
                      {isSubmittingQuery ? 'Submitting...' : 'Send Inquiry to Supervisor'}
                    </button>
                  </form>
                </div>

                <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-3">
                  <h3 className="text-sm font-extrabold text-[#2C241D]">Past Inquiries & Responses</h3>
                  {staffQueries.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7A6C5E]">No inquiries submitted yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {staffQueries.map((q) => (
                        <div key={q.id} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-xs space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-[#2C241D]">{q.subject}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              q.status === 'Resolved' ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {q.status}
                            </span>
                          </div>
                          <p className="text-[#5C4E42]">{q.message}</p>
                          {q.adminResponse && (
                            <div className="mt-1.5 p-2 bg-white rounded-xl border border-[#E2D7CB] text-xs text-[#2D6338]">
                              <strong>Supervisor Response:</strong> {q.adminResponse}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* 11. TAB 9: LEAVE MANAGEMENT                                           */}
            {/* ===================================================================== */}
            {activeTab === 'leave' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 animate-fadeIn">
                <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-4">
                  <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#B89768]" />
                    <span>Apply for Absence / Leave</span>
                  </h3>

                  <form onSubmit={handleSubmitLeave} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Leave Type</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                      >
                        <option value="Casual Leave">Casual Leave (CL)</option>
                        <option value="Medical Leave">Medical Leave (ML)</option>
                        <option value="Earned Leave">Earned Leave (EL)</option>
                        <option value="Special Duty Off">Special Duty Off</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Start Date</label>
                        <input
                          type="date"
                          value={leaveStartDate}
                          onChange={(e) => setLeaveStartDate(e.target.value)}
                          className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">End Date</label>
                        <input
                          type="date"
                          value={leaveEndDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                          className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Reason</label>
                      <textarea
                        rows={3}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="Reason for absence..."
                        className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingLeave}
                      className="w-full py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer"
                    >
                      {isSubmittingLeave ? 'Submitting Application...' : 'Submit Leave Application'}
                    </button>
                  </form>
                </div>

                <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-3">
                  <h3 className="text-sm font-extrabold text-[#2C241D]">Leave History & Status</h3>
                  {leaveApplications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7A6C5E]">No leave applications submitted.</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {leaveApplications.map((l) => (
                        <div key={l.leave_id} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-xs space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-[#2C241D]">{l.leave_type} ({l.duration_days} days)</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              l.status === 'Approved' ? 'bg-[#E8F5E9] text-[#2D6338]' :
                              l.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-900'
                            }`}>
                              {l.status}
                            </span>
                          </div>
                          <p className="text-[#7A6C5E] text-[11px]">{l.start_date} to {l.end_date}</p>
                          <p className="text-[#5C4E42]">{l.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 12. INTERACTIVE MODALS & DRAWERS                                          */}
      {/* ========================================================================= */}

      {/* A. TASK DETAILS MODAL */}
      {isTaskDetailModalOpen && selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-none text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2.5 py-0.5 rounded-md border border-[#D6C9B9]">
                  {selectedTaskForDetail.order_id}
                </span>
                <h3 className="text-base font-extrabold text-[#2C241D] mt-1.5">
                  {selectedTaskForDetail.job_name} — Stage: {selectedTaskForDetail.stage_name}
                </h3>
              </div>
              <button
                onClick={() => setIsTaskDetailModalOpen(false)}
                className="p-1 rounded-xl hover:bg-[#FAF7F2] text-[#7A6C5E] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedTaskForDetail.reference_image && (
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-[#7A6C5E]">Design Reference / Blueprint</span>
                <div className="relative h-48 w-full bg-[#FAF7F2] rounded-2xl overflow-hidden border border-[#E2D7CB] group">
                  <img
                    src={selectedTaskForDetail.reference_image}
                    alt="Blueprint"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => {
                      if (selectedTaskForDetail.reference_image) {
                        openImageInNewTab(selectedTaskForDetail.reference_image);
                      }
                    }}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-black transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" /> Full Size
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Dimensions</span>
                <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.dimensions || 'Standard'}</span>
              </div>
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Material</span>
                <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.material || 'Solid Wood'}</span>
              </div>
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Finish / Color</span>
                <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.color || 'Natural'}</span>
              </div>
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Required Skill</span>
                <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.required_skill}</span>
              </div>
            </div>

            {/* Interactive Procedural Checklist inside Task Details Modal */}
            {(() => {
              const sections = getStageSections(selectedTaskForDetail.stage_name, selectedTaskForDetail.job_name);
              const completedList = selectedTaskForDetail.completed_sections || [];
              const checkedCount = completedList.length;
              const totalCount = sections.length;
              const isFullyChecked = checkedCount >= totalCount;
              const isPaused = selectedTaskForDetail.task_status === 'PAUSED' || Boolean(selectedTaskForDetail.pause_reason);
              const currentPct = selectedTaskForDetail.task_status === 'COMPLETED'
                ? 100
                : totalCount > 0
                ? Math.round((checkedCount / totalCount) * 100)
                : (selectedTaskForDetail.progress_percentage || 0);

              return (
                <div className="space-y-3 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#2C241D] flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-[#38A132]" />
                      <span>Procedural Step Breakdown ({checkedCount}/{totalCount} Completed)</span>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full font-black text-xs ${
                      isFullyChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {currentPct}% Analyzed
                    </span>
                  </div>

                  {isPaused && (
                    <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-2">
                      <Pause className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Stage is currently Paused: {selectedTaskForDetail.pause_reason || 'Artisan temporarily paused'}</span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="w-full bg-[#E2D7CB] rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        isPaused ? 'bg-amber-500' : isFullyChecked ? 'bg-[#38A132]' : 'bg-blue-500'
                      }`}
                      style={{ width: `${currentPct}%` }}
                    />
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2 pt-1">
                    {sections.map((sec, idx) => {
                      const isChecked = completedList.includes(sec.id);
                      return (
                        <div
                          key={sec.id}
                          onClick={() => {
                            if (selectedTaskForDetail.task_status === 'IN_PROGRESS' || isPaused) {
                              handleToggleSection(selectedTaskForDetail, sec.id);
                            }
                          }}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all border select-none ${
                            selectedTaskForDetail.task_status === 'IN_PROGRESS' || isPaused
                              ? 'cursor-pointer hover:border-[#38A132]'
                              : 'opacity-80'
                          } ${
                            isChecked ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-[#E2D7CB] text-[#2C241D]'
                          }`}
                        >
                          <div className="pt-0.5">
                            {isChecked ? (
                              <div className="w-4 h-4 rounded-md bg-[#38A132] text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-md border-2 border-[#B89768] bg-white shrink-0" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-black ${isChecked ? 'text-emerald-900 line-through decoration-emerald-600/50' : 'text-[#2C241D]'}`}>
                                Step {idx + 1}: {sec.title}
                              </span>
                              <span className="text-[10px] font-mono text-[#7A6C5E]">+{sec.weightPct}%</span>
                            </div>
                            <p className="text-[11px] text-[#7A6C5E] font-medium mt-0.5">{sec.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {selectedTaskForDetail.technical_instructions && (
              <div className="p-3 rounded-2xl bg-[#F5ECE1]/70 border border-[#E2D7CB] text-xs text-[#2C241D] flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-[#B89768] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <strong className="font-extrabold block text-[10px] uppercase text-[#7A6C5E] tracking-wider mb-0.5">
                    Production Specifications & Guidelines
                  </strong>
                  <p className="text-xs text-[#3D3228] font-medium leading-relaxed">
                    {selectedTaskForDetail.technical_instructions}
                  </p>
                </div>
              </div>
            )}

            {/* Inbound Material Pickup Transit Alert */}
            {selectedTaskForDetail.is_pickup_pending && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <Truck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs space-y-0.5">
                  <p className="font-extrabold text-amber-950">Prerequisite Pending: Customer Material In Transit</p>
                  <p className="text-[#6B5542] leading-relaxed">
                    Customer-owned timber is scheduled for doorstep pickup by logistics carrier <strong>{selectedTaskForDetail.pickup_carrier || 'Assigned Carrier Partner'}</strong>. 
                    Workshop stage execution is locked until materials arrive at the workshop facility.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#EFE7DE] flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setIsTaskDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedTaskForDetail.task_status === 'ASSIGNED' && (
                  selectedTaskForDetail.is_pickup_pending ? (
                    <button
                      disabled
                      className="px-4 py-2 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed flex items-center gap-1.5 border border-slate-300"
                      title="Stage start locked until customer material arrives at workshop"
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Awaiting Material Delivery</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartTask(selectedTaskForDetail.task_id)}
                      className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Stage</span>
                    </button>
                  )
                )}

                {selectedTaskForDetail.task_status === 'PAUSED' && (
                  <button
                    onClick={() => handleResumeTask(selectedTaskForDetail.task_id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Work</span>
                  </button>
                )}

                {selectedTaskForDetail.task_status === 'IN_PROGRESS' && (
                  <>
                    <button
                      onClick={() => handleOpenPauseModal(selectedTaskForDetail)}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause Stage</span>
                    </button>
                    <button
                      onClick={() => handleOpenCompleteModal(selectedTaskForDetail)}
                      className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Complete Stage</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. COMPLETE TASK MODAL */}
      {isCompleteModalOpen && selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">
                Complete Stage: {selectedTaskForDetail.stage_name}
              </h3>
              <button onClick={() => setIsCompleteModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#38A132]" />
                <span>Procedural Analysis: {selectedTaskForDetail.progress_percentage || 100}% Ready</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Confirming completion will mark this stage finalized and notify production supervisors and customer dashboard.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Completion Notes / Remarks</label>
                <textarea
                  rows={3}
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="Notes on joinery tolerances, sanding smoothness, calibration verification..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Work Finished Photo URL (Optional)</label>
                <input
                  type="text"
                  value={completeWorkImages}
                  onChange={(e) => setCompleteWorkImages(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCompleteTask}
                disabled={isSubmittingComplete}
                className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white text-xs font-extrabold shadow-md shadow-[#38A132]/20 cursor-pointer"
              >
                {isSubmittingComplete ? 'Completing...' : 'Confirm Stage Completion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. PAUSE TASK MODAL */}
      {isPauseModalOpen && selectedTaskForPause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <Pause className="w-4 h-4 fill-current" />
                </div>
                <h3 className="text-base font-extrabold text-[#2C241D]">
                  Pause Stage Work
                </h3>
              </div>
              <button onClick={() => setIsPauseModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <p className="text-xs text-[#7A6C5E]">
              Select a reason for temporarily pausing work on <strong>{selectedTaskForPause.job_name} ({selectedTaskForPause.stage_name})</strong>. This will be updated live in the customer tracking portal.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Reason for Pause</label>
                <select
                  value={pauseReasonChoice}
                  onChange={(e) => setPauseReasonChoice(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D] cursor-pointer"
                >
                  <option value="Waiting for glue / adhesive curing">Waiting for glue / adhesive curing</option>
                  <option value="Waiting for stain / lacquer topcoat drying">Waiting for stain / lacquer topcoat drying</option>
                  <option value="Tool maintenance & blade realignment">Tool maintenance & blade realignment</option>
                  <option value="Material replenishment & lumber retrieval">Material replenishment & lumber retrieval</option>
                  <option value="Artisan shift break / Meal break">Artisan shift break / Meal break</option>
                  <option value="Technical design clarification with supervisor">Technical design clarification with supervisor</option>
                  <option value="Other Workshop Impediment">Other Workshop Impediment</option>
                </select>
              </div>

              {pauseReasonChoice === 'Other Workshop Impediment' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Specify Reason</label>
                  <input
                    type="text"
                    value={customPauseReason}
                    onChange={(e) => setCustomPauseReason(e.target.value)}
                    placeholder="Enter custom pause reason..."
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsPauseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPause}
                disabled={isSubmittingPause}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                {isSubmittingPause ? 'Pausing...' : 'Confirm Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. REPORT ISSUE / ON HOLD MODAL */}
      {isReportIssueModalOpen && selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-amber-900">
                Report Issue & Put Stage On Hold
              </h3>
              <button onClick={() => setIsReportIssueModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                >
                  <option value="Material Unavailable">Material Unavailable / Shortage</option>
                  <option value="Defect in Timber / Raw Material">Defect in Timber / Raw Material</option>
                  <option value="Machine Breakdown">Machine / Tool Breakdown</option>
                  <option value="Blueprint / Specification Discrepancy">Blueprint / Specification Discrepancy</option>
                  <option value="Hardware Fitting Missing">Hardware Fitting Missing</option>
                  <option value="Other Workshop Impediment">Other Workshop Impediment</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Description of Issue</label>
                <textarea
                  rows={3}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Detail the issue stopping production..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsReportIssueModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReportIssue}
                disabled={isSubmittingIssue || !issueDescription.trim()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                {isSubmittingIssue ? 'Submitting...' : 'Mark Stage On Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. ON-SITE JOB STATUS MODAL */}
      {isOnsiteModalOpen && selectedOnsiteJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">
                On-Site Job #{selectedOnsiteJob.job_id} — {selectedOnsiteJob.customer_name}
              </h3>
              <button onClick={() => setIsOnsiteModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Customer & Service Notes</label>
                <textarea
                  rows={2}
                  value={onsiteNotes}
                  onChange={(e) => setOnsiteNotes(e.target.value)}
                  placeholder="Notes from customer premises..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Before Service Photo URL</label>
                <input
                  type="text"
                  value={onsiteBeforePhoto}
                  onChange={(e) => setOnsiteBeforePhoto(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">After Service Photo URL</label>
                <input
                  type="text"
                  value={onsiteAfterPhoto}
                  onChange={(e) => setOnsiteAfterPhoto(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex flex-wrap justify-end gap-2">
              <button
                onClick={() => handleUpdateOnsiteStatus('IN_TRANSIT')}
                disabled={isSubmittingOnsite}
                className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-xs cursor-pointer"
              >
                In Transit
              </button>
              <button
                onClick={() => handleUpdateOnsiteStatus('IN_PROGRESS')}
                disabled={isSubmittingOnsite}
                className="px-3 py-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs cursor-pointer"
              >
                In Progress
              </button>
              <button
                onClick={() => handleUpdateOnsiteStatus('COMPLETED')}
                disabled={isSubmittingOnsite}
                className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer"
              >
                Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. REWORK RESOLUTION MODAL */}
      {isReworkModalOpen && selectedReworkForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">
                Resolve Rework #{selectedReworkForDetail.rework_id}
              </h3>
              <button onClick={() => setIsReworkModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="p-3 bg-rose-50/80 rounded-2xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <strong className="block font-bold text-[10px] uppercase text-rose-800 tracking-wider mb-0.5">QC Inspection Defect Finding:</strong>
                <p className="text-xs text-rose-900 font-medium leading-relaxed">{selectedReworkForDetail.rework_reason}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-[11px] font-bold text-[#7A6C5E]">Resolution / Rectification Notes</label>
              <textarea
                rows={3}
                value={reworkResolveNotes}
                onChange={(e) => setReworkResolveNotes(e.target.value)}
                placeholder="Describe rectifications performed (re-planed surface, replaced veneer...)"
                className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#48A63E]"
              />
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsReworkModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolveRework}
                disabled={isSubmittingRework}
                className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white text-xs font-extrabold shadow-md shadow-[#38A132]/20 cursor-pointer"
              >
                {isSubmittingRework ? 'Submitting...' : 'Mark Resolved & Request QC'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F. DRIVER DELIVERY MODAL */}
      {isDeliveryModalOpen && selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">
                Delivery Status: {selectedDelivery.order_id}
              </h3>
              <button onClick={() => setIsDeliveryModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-1 text-xs">
              <div className="flex items-center justify-between font-extrabold text-[#2C241D]">
                <span>{selectedDelivery.customer_name}</span>
                <span className="text-[#38A132] font-black">₹{selectedDelivery.total_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[#7A6C5E] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#48A63E] shrink-0" />
                <span className="truncate">{selectedDelivery.delivery_address}</span>
              </div>
              <div className="text-[#7A6C5E] flex items-center gap-1.5 font-bold">
                <Truck className="w-3.5 h-3.5 text-[#B89768] shrink-0" />
                <span>{selectedDelivery.vehicle_reg} ({selectedDelivery.vehicle_type})</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1.5">Update Status to:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Dispatched', label: 'Dispatched' },
                    { id: 'Out for Delivery', label: 'Out for Delivery' },
                    { id: 'Delivered', label: 'Delivered' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setDeliveryStatusInput(st.id)}
                      className={`py-2 px-1 rounded-xl text-center font-extrabold text-[11px] transition-all cursor-pointer border ${
                        deliveryStatusInput === st.id
                          ? st.id === 'Delivered'
                            ? 'bg-[#E8F5E9] text-[#2D6338] border-emerald-400 shadow-xs'
                            : st.id === 'Out for Delivery'
                            ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                            : 'bg-[#E8F5E9] text-[#2D6338] border-emerald-400 shadow-xs'
                          : 'bg-[#FAF7F2] text-[#7A6C5E] border-[#E2D7CB] hover:bg-[#EFE8DC]'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Delivery Handover Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={deliveryNotesInput}
                  onChange={(e) => setDeliveryNotesInput(e.target.value)}
                  placeholder="e.g. Delivered to customer living room, customer confirmed good condition..."
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#48A63E]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsDeliveryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdateDelivery}
                disabled={isSubmittingDelivery}
                className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white text-xs font-extrabold shadow-md shadow-[#38A132]/20 cursor-pointer transition-all"
              >
                {isSubmittingDelivery ? 'Updating...' : `Confirm Status: ${deliveryStatusInput}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* G. WORKER PROFILE & SECURITY MODAL */}
      {(isProfileModalOpen || mustChangePasswordModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto text-[#2C241D]">
            {!mustChangePasswordModal && (
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="absolute top-5 right-5 text-[#7A6C5E] hover:text-[#2C241D] p-1.5 rounded-xl hover:bg-[#EAE0D4] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 border-b border-[#E2D7CB] pb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-black text-lg flex items-center justify-center shadow-md flex-shrink-0">
                {(userProfile?.full_name || 'Worker').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-black text-[#2C241D] flex items-center gap-2">
                  <span>{mustChangePasswordModal ? 'Mandatory Password Setup' : 'Artisan Profile & Security'}</span>
                </h3>
                <p className="text-xs text-[#7A6C5E] font-medium">
                  {mustChangePasswordModal
                    ? 'Please set a secure password for your first login.'
                    : 'Manage artisan details, workstation assignment and access credentials'}
                </p>
              </div>
            </div>

            {/* Notice Banner */}
            {passwordNotice && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
                passwordNotice.type === 'success'
                  ? 'bg-[#48A63E]/15 text-[#3D9134] border border-[#48A63E]/30'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                {passwordNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{passwordNotice.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfileAndSecurity} className="space-y-4 text-xs">
              {/* Worker Information Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#6B5C4D]">
                  <User className="w-4 h-4 text-[#48A63E]" />
                  <span className="font-extrabold text-xs uppercase tracking-wider text-[#2C241D]">
                    Artisan & Station Details
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-[#6B5C4D] mb-1">Full Name</label>
                  <input
                    type="text"
                    readOnly
                    value={userProfile?.full_name || 'Artisan Worker'}
                    className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#EAE0D4] text-[#2C241D] font-bold cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#6B5C4D] mb-1">Primary Specialization</label>
                    <div className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#EAE0D4] text-[#2C241D] font-bold flex items-center gap-2">
                      <Hammer className="w-3.5 h-3.5 text-[#48A63E]" />
                      <span className="truncate">{userProfile?.specialization || 'Joinery & Assembly'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#6B5C4D] mb-1">Logistics / Driver Status</label>
                    <div className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#EAE0D4] text-[#2C241D] font-bold flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-amber-600" />
                      <span>{userProfile?.is_driver ? 'Internal Delivery Driver' : 'Workshop Floor Artisan'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#6B5C4D]">Email Address (Locked)</label>
                    {!mustChangePasswordModal && (
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
                    )}
                  </div>
                  <input
                    type="email"
                    readOnly
                    value={userProfile?.email || 'worker@retailsphere.ai'}
                    className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#EAE0D4] text-[#2C241D] font-bold cursor-not-allowed"
                  />
                  <p className="text-[10px] text-amber-800 font-bold mt-1">
                    🔒 Email modification is restricted. Submit an official request in the Queries section to change email.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-[#6B5C4D] mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                  />
                </div>
              </div>

              {/* Password Update Provision (No current password required) */}
              <div className="border-t border-[#E2D7CB] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#2C241D]">
                    <Key className="w-4 h-4 text-[#48A63E]" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#2C241D]">
                      Update Password Provision
                    </h4>
                  </div>
                  {!mustChangePasswordModal && (
                    <span className="text-[10px] font-bold text-[#7A6C5E]">Optional</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#6B5C4D] mb-1">New Password (Min 6 chars)</label>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required={mustChangePasswordModal}
                      className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#6B5C4D] mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={mustChangePasswordModal || Boolean(newPassword.trim())}
                      className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#E2D7CB] flex justify-end gap-2.5">
                {!mustChangePasswordModal && (
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white border border-[#E2D7CB] text-xs font-bold text-[#7A6C5E] hover:bg-[#EAE0D4] hover:text-[#2C241D] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white text-xs font-black shadow-md shadow-[#38A132]/20 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Saving...' : mustChangePasswordModal ? 'Set New Password' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
