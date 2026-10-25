import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Truck,
  RotateCcw,
  Eye,
  FileText,
  DollarSign,
  User,
  ShieldCheck,
  Package,
  Wrench,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  Sparkles,
  Camera,
  RefreshCw,
  Check,
  X,
  CreditCard,
  Building,
  MapPin,
  Phone,
  Mail,
  Lock,
  ChevronDown,
  Percent
} from 'lucide-react';
import {
  fetchQualityControlJobsApi,
  fetchQualityInspectionsApi,
  recordQualityInspectionApi,
  fetchReworkTicketsApi,
  fetchReworkTicketDetailsApi,
  assessReworkResponsibilityApi,
  resolveReworkDisputeApi,
  createReworkQuotationApi,
  submitCustomerDecisionApi,
  payReworkQuotationApi,
  recordItemStoreReceiptApi,
  assignReworkWorkerApi,
  completeReworkProductionApi,
  dispatchReworkRedeliveryApi,
  fetchQualityTransportOptionsApi,
  QualityJobItem,
  QualityInspectionItem,
  ReworkTicketItem,
  TransportOptions
} from '../../services/api_quality';
import { fetchWorkers } from '../../services/api_production';

interface QualityControlHubProps {
  userRole: 'admin' | 'retail-staff' | string;
  userName?: string;
  userId?: number;
}

export const QualityControlHub: React.FC<QualityControlHubProps> = ({
  userRole,
  userName = 'Retail Staff',
  userId = 1
}) => {
  // Navigation Sub-tabs: 'jobs' | 'tickets' | 'inspections'
  const [activeSubTab, setActiveSubTab] = useState<'jobs' | 'tickets' | 'inspections'>('jobs');

  // Data states
  const [jobs, setJobs] = useState<QualityJobItem[]>([]);
  const [reworkTickets, setReworkTickets] = useState<ReworkTicketItem[]>([]);
  const [inspections, setInspections] = useState<QualityInspectionItem[]>([]);
  const [transportOptions, setTransportOptions] = useState<TransportOptions>({
    available_fleet_vehicles: [],
    active_carrier_partners: []
  });
  const [workersList, setWorkersList] = useState<any[]>([]);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters for Jobs Sub-tab
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('All');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('All');
  const [jobSearchQuery, setJobSearchQuery] = useState('');

  // Filters for Rework Tickets Sub-tab
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('All');
  const [ticketResponsibilityFilter, setTicketResponsibilityFilter] = useState<string>('All');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');

  // Filters for Audit Logs Sub-tab
  const [auditResultFilter, setAuditResultFilter] = useState<string>('All');
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>('All');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  // Modals
  const [selectedJobForQC, setSelectedJobForQC] = useState<QualityJobItem | null>(null);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<ReworkTicketItem | null>(null);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState<QualityJobItem | null>(null);
  const [isRepeatQCForTicket, setIsRepeatQCForTicket] = useState<ReworkTicketItem | null>(null);

  // Perform QC Form State
  const [qcChecklist, setQcChecklist] = useState<Record<string, { pass: boolean; remark: string }>>({});
  const [qcInspectionNotes, setQcInspectionNotes] = useState('');
  const [qcPhotos, setQcPhotos] = useState('');
  const [qcFinalDecision, setQcFinalDecision] = useState<'PASS' | 'FAIL'>('PASS');
  const [qcResponsibleTeam, setQcResponsibleTeam] = useState('Carpentry & Woodwork Team');

  // Responsibility Assessment Form State
  const [assessType, setAssessType] = useState<'RETAILSPHERE_ERROR' | 'CUSTOMER_CHANGE' | 'UNCLEAR_DISPUTED'>('RETAILSPHERE_ERROR');
  const [assessNotes, setAssessNotes] = useState('');
  const [assessRequiredChanges, setAssessRequiredChanges] = useState('');
  const [assessTransportMode, setAssessTransportMode] = useState<string>('INTERNAL_FLEET');
  const [assessSelectedVehicleId, setAssessSelectedVehicleId] = useState<number | undefined>(undefined);
  const [assessSelectedCarrierId, setAssessSelectedCarrierId] = useState<number | undefined>(undefined);

  // Quotation Builder State (for Customer Changes)
  const [quoteMaterialCost, setQuoteMaterialCost] = useState<number>(0);
  const [quoteLabourCost, setQuoteLabourCost] = useState<number>(0);
  const [quoteMachineCost, setQuoteMachineCost] = useState<number>(0);
  const [quoteFinishingCost, setQuoteFinishingCost] = useState<number>(0);
  const [quoteTransportCost, setQuoteTransportCost] = useState<number>(0);
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [quoteDuration, setQuoteDuration] = useState<string>('2-3 business days');

  // Worker Assignment State
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | undefined>(undefined);
  const [assignmentInstructions, setAssignmentInstructions] = useState('');

  // Redelivery Dispatch State
  const [dispatchTrackingNumber, setDispatchTrackingNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Admin Dispute Resolution Form State
  const [disputeResolution, setDisputeResolution] = useState<'RETAILSPHERE_ERROR' | 'CUSTOMER_CHANGE'>('RETAILSPHERE_ERROR');
  const [disputeResolutionNotes, setDisputeResolutionNotes] = useState('');

  // Fetch all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, ticketsData, inspectionsData, transportData, workersData] = await Promise.all([
        fetchQualityControlJobsApi(),
        fetchReworkTicketsApi(),
        fetchQualityInspectionsApi(),
        fetchQualityTransportOptionsApi(),
        fetchWorkers()
      ]);
      setJobs(jobsData);
      setReworkTickets(ticketsData);
      setInspections(inspectionsData);
      setTransportOptions(transportData);
      setWorkersList(workersData || []);
    } catch (err) {
      console.error('Error loading QC data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalJobs = jobs.length;
    const pendingQC = jobs.filter(j => j.qc_status === 'QC_PENDING').length;
    const passedQC = jobs.filter(j => j.qc_status === 'QC_PASSED' || j.qc_status === 'READY_FOR_PACKING' || j.qc_status === 'READY_FOR_DISPATCH' || j.qc_status === 'DISPATCHED').length;
    const failedQC = jobs.filter(j => j.qc_status === 'QC_FAILED' || j.qc_status === 'REWORK_IN_PROGRESS').length;
    const activeRework = reworkTickets.filter(r => !['CLOSED', 'CANCELLED', 'RESOLVED'].includes(r.status)).length;
    const dispatched = jobs.filter(j => j.qc_status === 'DISPATCHED').length;
    const passRate = totalJobs > 0 ? Math.round((passedQC / totalJobs) * 100) : 100;

    return {
      totalJobs,
      pendingQC,
      passedQC,
      failedQC,
      activeRework,
      dispatched,
      passRate
    };
  }, [jobs, reworkTickets]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Status Filter
      if (jobStatusFilter !== 'All') {
        if (jobStatusFilter === 'QC_PENDING' && job.qc_status !== 'QC_PENDING') return false;
        if (jobStatusFilter === 'QC_PASSED' && !['QC_PASSED', 'READY_FOR_PACKING'].includes(job.qc_status)) return false;
        if (jobStatusFilter === 'QC_FAILED' && job.qc_status !== 'QC_FAILED') return false;
        if (jobStatusFilter === 'REWORK_IN_PROGRESS' && job.qc_status !== 'REWORK_IN_PROGRESS') return false;
        if (jobStatusFilter === 'REWORK_COMPLETED' && job.qc_status !== 'REWORK_COMPLETED') return false;
        if (jobStatusFilter === 'READY_FOR_DISPATCH' && job.qc_status !== 'READY_FOR_DISPATCH') return false;
        if (jobStatusFilter === 'DISPATCHED' && job.qc_status !== 'DISPATCHED') return false;
      }

      // Type Filter
      if (jobTypeFilter !== 'All' && job.order_type !== jobTypeFilter) {
        return false;
      }

      // Search Query
      if (jobSearchQuery.trim()) {
        const q = jobSearchQuery.toLowerCase();
        const matchesId = job.job_id.toLowerCase().includes(q);
        const matchesCust = job.customer_name.toLowerCase().includes(q) || job.customer_email.toLowerCase().includes(q);
        const matchesTitle = job.job_title.toLowerCase().includes(q);
        if (!matchesId && !matchesCust && !matchesTitle) return false;
      }

      return true;
    });
  }, [jobs, jobStatusFilter, jobTypeFilter, jobSearchQuery]);

  // Filtered Rework Tickets
  const filteredTickets = useMemo(() => {
    return reworkTickets.filter(ticket => {
      if (ticketStatusFilter !== 'All') {
        if (ticketStatusFilter === 'ACTIVE' && ['CLOSED', 'CANCELLED'].includes(ticket.status)) return false;
        if (ticketStatusFilter !== 'ACTIVE' && ticket.status !== ticketStatusFilter) return false;
      }
      if (ticketResponsibilityFilter !== 'All' && ticket.responsibility_type !== ticketResponsibilityFilter) {
        return false;
      }
      if (ticketSearchQuery.trim()) {
        const q = ticketSearchQuery.toLowerCase();
        const matchesCode = ticket.ticket_code.toLowerCase().includes(q);
        const matchesCust = (ticket.customer_name || '').toLowerCase().includes(q);
        const matchesOrder = (ticket.display_order_id || '').toLowerCase().includes(q) || String(ticket.order_id).includes(q);
        const matchesReason = ticket.rework_reason.toLowerCase().includes(q);
        if (!matchesCode && !matchesCust && !matchesOrder && !matchesReason) return false;
      }
      return true;
    });
  }, [reworkTickets, ticketStatusFilter, ticketResponsibilityFilter, ticketSearchQuery]);

  // Filtered Inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter(insp => {
      if (auditResultFilter !== 'All' && insp.result !== auditResultFilter) return false;
      if (auditTypeFilter !== 'All' && insp.order_type !== auditTypeFilter) return false;
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase();
        const matchesInspector = insp.inspector_name.toLowerCase().includes(q);
        const matchesOrder = String(insp.order_id).includes(q);
        const matchesNotes = (insp.inspection_notes || '').toLowerCase().includes(q);
        if (!matchesInspector && !matchesOrder && !matchesNotes) return false;
      }
      return true;
    });
  }, [inspections, auditResultFilter, auditTypeFilter, auditSearchQuery]);

  // Dynamic checklist generator tailored to job type and approved specifications
  const getDynamicChecklistItems = (job: QualityJobItem | null) => {
    if (!job) return [];
    if (job.order_type === 'Custom') {
      const s = job.specifications;
      return [
        {
          key: 'dimensions',
          title: 'Dimensions & Physical Measurements',
          description: s.dimensions ? `Verify against approved dimensions: "${s.dimensions}". Confirm height, width, and depth tolerances within ±2mm.` : 'Verify dimensions against approved specifications.',
        },
        {
          key: 'specifications',
          title: 'Approved Design & Custom Specifications',
          description: s.design_description ? `Confirm design adherence: "${s.design_description.substring(0, 100)}...".` : 'Confirm all custom design details match approved order specifications.',
        },
        {
          key: 'material',
          title: 'Material Type & Substrate Quality',
          description: s.material ? `Verify authentic material: "${s.material}". Confirm absence of moisture warping, structural flaws, or grain defects.` : 'Verify material matches approved material grade.',
        },
        {
          key: 'finishing',
          title: 'Finish, Colour & Surface Quality',
          description: s.color ? `Check color match for "${s.color}". Inspect for smooth coating, zero dripping, uniform stain, and splinter-free sanding.` : 'Check uniform surface finish and coating.',
        },
        {
          key: 'structure',
          title: 'Structural Stability & Joint Assembly',
          description: 'Test load-bearing firmness, dowel/screw integrity, wobble-free stability, and reinforced joinery.',
        },
        {
          key: 'functionality',
          title: 'Functionality & Workmanship',
          description: 'Verify smooth hinge movements, drawer glides, soft-close mechanisms, and ergonomic beveling.',
        },
        {
          key: 'customer_specs',
          title: 'Customer-Specific Approved Requirements',
          description: 'Ensure any special customer requests, packaging preferences, or custom accessories are in place.',
        }
      ];
    } else {
      // Fabrication
      const s = job.specifications;
      return [
        {
          key: 'dimensions',
          title: 'Dimensions & CNC Cutting Tolerance',
          description: s.dimensions ? `Check precision cuts for "${s.dimensions}". Validate squareness and digital caliper tolerances.` : 'Verify dimensions against fabrication cut plan.',
        },
        {
          key: 'fabrication',
          title: 'Fabrication Service Precision',
          description: `Validate service "${job.job_title}". Check tool markings, bevel accuracy, and router depth consistency.`,
        },
        {
          key: 'material',
          title: 'Timber / Board Quality & Material Source',
          description: s.material_source ? `Verify material (${s.material_source}). Confirm zero splits, knot defects, or core delamination.` : 'Inspect raw material condition.',
        },
        {
          key: 'finishing',
          title: 'Edge Banding, Sanding & Surface Quality',
          description: 'Inspect edge finishing, deburring, smoothness to touch, and absence of burning or chipping.',
        },
        {
          key: 'structure',
          title: 'True-to-Drawing Structural Alignment',
          description: s.cutting_layout ? 'Verify alignment against the approved 2D cutting strategy and nesting layout.' : 'Verify true-to-drawing alignment and angles.',
        },
        {
          key: 'customer_specs',
          title: 'Customer-Specified Drilling & Assembly Preps',
          description: s.requirements ? `Inspect specific customer notes: "${s.requirements.substring(0, 100)}...".` : 'Verify customer fabrication requirements.',
        }
      ];
    }
  };

  // Initialize QC Modal
  const openPerformQCModal = (job: QualityJobItem) => {
    setSelectedJobForQC(job);
    setIsRepeatQCForTicket(null);
    const items = getDynamicChecklistItems(job);
    const initialChecklist: Record<string, { pass: boolean; remark: string }> = {};
    items.forEach(it => {
      initialChecklist[it.key] = { pass: true, remark: 'Verified compliant with specifications.' };
    });
    setQcChecklist(initialChecklist);
    setQcInspectionNotes('');
    setQcPhotos('');
    setQcFinalDecision('PASS');
    setQcResponsibleTeam(job.order_type === 'Custom' ? 'Carpentry & Assembly Workshop' : 'CNC & Wood Fabrication Team');
  };

  // Initialize Repeat QC Modal from a Rework Ticket
  const openRepeatQCModal = (ticket: ReworkTicketItem) => {
    // Find matching job
    const matchedJob = jobs.find(j => j.order_type === ticket.order_type && j.numeric_id === ticket.order_id);
    const syntheticJob: QualityJobItem = matchedJob || {
      job_id: ticket.display_order_id || `${ticket.order_type === 'Custom' ? 'CUS' : 'FAB'}-${String(ticket.order_id).padStart(4, '0')}`,
      numeric_id: ticket.order_id,
      order_type: ticket.order_type,
      customer_id: ticket.customer_id || 0,
      customer_name: ticket.customer_name || 'Customer',
      customer_email: ticket.customer_email || '',
      customer_phone: ticket.customer_phone || '',
      job_title: `${ticket.order_type} Job`,
      specifications: ticket.approved_specifications || {},
      production_status: 'REWORK_COMPLETED',
      production_staff_name: ticket.worker_name || 'Workshop Team',
      qc_status: 'REWORK_COMPLETED',
      can_dispatch: false,
      dispatch_blocked: true,
      dispatch_block_reason: 'Repeat QC pending'
    };

    setSelectedJobForQC(syntheticJob);
    setIsRepeatQCForTicket(ticket);
    const items = getDynamicChecklistItems(syntheticJob);
    const initialChecklist: Record<string, { pass: boolean; remark: string }> = {};
    items.forEach(it => {
      initialChecklist[it.key] = { pass: true, remark: 'Re-inspected following artisan rework. Compliant.' };
    });
    setQcChecklist(initialChecklist);
    setQcInspectionNotes(`Repeat QC inspection for ticket ${ticket.ticket_code}. Previous defect: ${ticket.rework_reason}`);
    setQcPhotos('');
    setQcFinalDecision('PASS');
  };

  // Submit QC Inspection
  const handleSubmitQCInspection = async () => {
    if (!selectedJobForQC) return;

    setActionLoading(true);
    try {
      const anyFailed = Object.values(qcChecklist).some(c => !c.pass);
      const computedResult = anyFailed ? 'FAIL' : qcFinalDecision;

      const checklistPayload: Record<string, any> = {};
      Object.entries(qcChecklist).forEach(([k, v]) => {
        checklistPayload[k] = { pass: v.pass, remark: v.remark };
      });

      const payload = {
        order_type: selectedJobForQC.order_type,
        order_id: selectedJobForQC.numeric_id,
        result: computedResult as 'PASS' | 'FAIL',
        dimensions_check: qcChecklist['dimensions'] ? qcChecklist['dimensions'].pass : true,
        finishing_check: qcChecklist['finishing'] ? qcChecklist['finishing'].pass : true,
        structure_check: qcChecklist['structure'] ? qcChecklist['structure'].pass : true,
        specifications_check: qcChecklist['specifications'] ? qcChecklist['specifications'].pass : true,
        material_check: qcChecklist['material'] ? qcChecklist['material'].pass : true,
        functionality_check: qcChecklist['functionality'] ? qcChecklist['functionality'].pass : true,
        fabrication_check: qcChecklist['fabrication'] ? qcChecklist['fabrication'].pass : true,
        customer_specs_check: qcChecklist['customer_specs'] ? qcChecklist['customer_specs'].pass : true,
        checklist_details: checklistPayload,
        inspection_notes: qcInspectionNotes || (computedResult === 'PASS' ? '100% compliant with approved specifications.' : 'Failed inspection standards.'),
        photos: qcPhotos || undefined,
        responsible_team: qcResponsibleTeam,
        is_repeat: !!isRepeatQCForTicket,
        rework_ticket_id: isRepeatQCForTicket?.rework_id
      };

      const res = await recordQualityInspectionApi(payload);
      if (computedResult === 'PASS') {
        showToast(`QC PASSED! Job ${selectedJobForQC.job_id} approved for packing and dispatch.`, 'success');
      } else {
        showToast(`QC FAILED. Rework ticket ${res.rework_ticket_code || 'generated'} created. Assigned for rectification.`, 'error');
      }

      setSelectedJobForQC(null);
      setIsRepeatQCForTicket(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit QC inspection', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Ticket Details Modal
  const openTicketDetails = async (ticket: ReworkTicketItem) => {
    setActionLoading(true);
    try {
      const detailed = await fetchReworkTicketDetailsApi(ticket.rework_id);
      setSelectedTicketDetails(detailed);
      // Pre-fill assessment state
      setAssessType((detailed.responsibility_type as any) || 'RETAILSPHERE_ERROR');
      setAssessNotes(detailed.responsibility_notes || '');
      setAssessRequiredChanges(detailed.required_changes || '');
      setAssessTransportMode(detailed.transportation_mode || 'INTERNAL_FLEET');
      if (detailed.quotation_breakdown) {
        setQuoteMaterialCost(detailed.quotation_breakdown.material_cost);
        setQuoteLabourCost(detailed.quotation_breakdown.labour_cost);
        setQuoteMachineCost(detailed.quotation_breakdown.machine_cost);
        setQuoteFinishingCost(detailed.quotation_breakdown.finishing_cost);
        setQuoteTransportCost(detailed.quotation_breakdown.transportation_cost);
        setQuoteNotes(detailed.quotation_breakdown.notes || '');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load ticket details', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Responsibility Assessment Submit
  const handleSaveAssessment = async () => {
    if (!selectedTicketDetails) return;
    setActionLoading(true);
    try {
      await assessReworkResponsibilityApi(selectedTicketDetails.rework_id, {
        responsibility_type: assessType,
        responsibility_notes: assessNotes || 'Assessed by authorized Retail Staff.',
        required_changes: assessRequiredChanges,
        transportation_mode: assessTransportMode,
        vehicle_id: assessSelectedVehicleId,
        carrier_id: assessSelectedCarrierId
      });
      showToast(`Responsibility recorded as ${assessType}. Ticket updated.`, 'success');
      const updated = await fetchReworkTicketDetailsApi(selectedTicketDetails.rework_id);
      setSelectedTicketDetails(updated);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save assessment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Admin Dispute Resolution Submit
  const handleResolveDispute = async () => {
    if (!selectedTicketDetails) return;
    setActionLoading(true);
    try {
      await resolveReworkDisputeApi(selectedTicketDetails.rework_id, {
        resolution: disputeResolution,
        resolution_notes: disputeResolutionNotes || 'Dispute reviewed and resolved by Admin.'
      });
      showToast(`Dispute resolved by Admin as ${disputeResolution}.`, 'success');
      const updated = await fetchReworkTicketDetailsApi(selectedTicketDetails.rework_id);
      setSelectedTicketDetails(updated);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve dispute', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Quotation Creation
  const handleCreateQuotation = async () => {
    if (!selectedTicketDetails) return;
    setActionLoading(true);
    try {
      const res = await createReworkQuotationApi(selectedTicketDetails.rework_id, {
        material_cost: Number(quoteMaterialCost) || 0,
        labour_cost: Number(quoteLabourCost) || 0,
        machine_cost: Number(quoteMachineCost) || 0,
        finishing_cost: Number(quoteFinishingCost) || 0,
        transportation_cost: Number(quoteTransportCost) || 0,
        notes: quoteNotes,
        estimated_duration: quoteDuration
      });
      showToast(`Itemized quotation of ₹${res.total_amount.toLocaleString()} created and sent for customer approval.`, 'success');
      const updated = await fetchReworkTicketDetailsApi(selectedTicketDetails.rework_id);
      setSelectedTicketDetails(updated);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create quotation', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Store Receipt Confirmation
  const handleConfirmStoreReceipt = async () => {
    if (!selectedTicketDetails) return;
    setActionLoading(true);
    try {
      await recordItemStoreReceiptApi(selectedTicketDetails.rework_id);
      showToast(`Item recorded as Received at Store for ticket ${selectedTicketDetails.ticket_code}.`, 'success');
      const updated = await fetchReworkTicketDetailsApi(selectedTicketDetails.rework_id);
      setSelectedTicketDetails(updated);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record store receipt', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Worker Assignment
  const handleAssignWorker = async () => {
    if (!selectedTicketDetails || !selectedWorkerId) return;
    setActionLoading(true);
    try {
      await assignReworkWorkerApi(selectedTicketDetails.rework_id, {
        assigned_worker_id: selectedWorkerId,
        instructions: assignmentInstructions
      });
      showToast(`Rework assigned to artisan worker. Status changed to REWORK_IN_PROGRESS.`, 'success');
      const updated = await fetchReworkTicketDetailsApi(selectedTicketDetails.rework_id);
      setSelectedTicketDetails(updated);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign worker', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Complete Rework
  const handleCompleteRework = async () => {
    if (!selectedTicketDetails) return;
    setActionLoading(true);
    try {
      await completeReworkProductionApi(selectedTicketDetails.rework_id, {
        notes: 'Artisan rework completed. Submitted for Repeat QC Inspection.'
      });
      showToast(`Rework completed! Item is now QC_PENDING for Repeat Quality Inspection.`, 'success');
      const updated = await fetchReworkTicketDetailsApi(selectedTicketDetails.rework_id);
      setSelectedTicketDetails(updated);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete rework', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Redelivery Dispatch
  const handleDispatchRedelivery = async () => {
    if (!selectedTicketDetails) return;
    setActionLoading(true);
    try {
      await dispatchReworkRedeliveryApi(selectedTicketDetails.rework_id, {
        tracking_number: dispatchTrackingNumber || undefined,
        dispatch_notes: dispatchNotes || undefined
      });
      showToast(`Item dispatched for redelivery. Rework ticket ${selectedTicketDetails.ticket_code} closed.`, 'success');
      setSelectedTicketDetails(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch redelivery', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold animate-slideDown ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/30'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="ml-2 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-[#E2D7CB] shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('jobs')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'jobs'
                ? 'bg-[#38A132] text-white shadow-md'
                : 'text-[#6C5E52] hover:text-[#2C241D] hover:bg-[#FAF7F2]'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Completed Jobs & QC Gate</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSubTab === 'jobs' ? 'bg-white text-[#38A132]' : 'bg-[#EAE0D4] text-[#2C241D]'
              }`}
            >
              {jobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('tickets')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'tickets'
                ? 'bg-[#38A132] text-white shadow-md'
                : 'text-[#6C5E52] hover:text-[#2C241D] hover:bg-[#FAF7F2]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Rework Tickets & Governance</span>
            {stats.activeRework > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-rose-500 text-white">
                {stats.activeRework}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('inspections')}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'inspections'
                ? 'bg-[#38A132] text-white shadow-md'
                : 'text-[#6C5E52] hover:text-[#2C241D] hover:bg-[#FAF7F2]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>QC Inspection Audit History</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                activeSubTab === 'inspections' ? 'bg-white text-[#38A132]' : 'bg-[#EAE0D4] text-[#2C241D]'
              }`}
            >
              {inspections.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-3">
          <div className="text-xs font-bold text-[#7A6C5E]">
            Role Access: <span className="text-[#2C241D] uppercase font-black">{userRole}</span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Refresh QC Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#38A132] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: COMPLETED JOBS & QC PIPELINE */}
      {/* ========================================================================= */}
      {activeSubTab === 'jobs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Job ID, customer, title..."
                value={jobSearchQuery}
                onChange={e => setJobSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132]"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E2D7CB]">
                <span className="text-[11px] font-bold text-[#7A6C5E]">Status:</span>
                <select
                  value={jobStatusFilter}
                  onChange={e => setJobStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-[#2C241D] focus:outline-none cursor-pointer"
                >
                  <option value="All">All QC Statuses</option>
                  <option value="QC_PENDING">QC Pending</option>
                  <option value="QC_PASSED">QC Passed</option>
                  <option value="QC_FAILED">QC Failed</option>
                  <option value="REWORK_IN_PROGRESS">Rework In Progress</option>
                  <option value="REWORK_COMPLETED">Rework Completed</option>
                  <option value="READY_FOR_DISPATCH">Ready for Dispatch</option>
                  <option value="DISPATCHED">Dispatched</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E2D7CB]">
                <span className="text-[11px] font-bold text-[#7A6C5E]">Module:</span>
                <select
                  value={jobTypeFilter}
                  onChange={e => setJobTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-[#2C241D] focus:outline-none cursor-pointer"
                >
                  <option value="All">All Modules</option>
                  <option value="Custom">Customisation</option>
                  <option value="Fabrication">Fabrication</option>
                </select>
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#EFE7DE] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#38A132]" />
                <span>Production Completion & Quality Gate Records ({filteredJobs.length})</span>
              </h3>
              <span className="text-[11px] font-semibold text-[#7A6C5E]">
                Dispatch Gating Active: Passing QC inspection required before dispatch
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EFE7DE] bg-[#FAF7F2] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 min-w-[170px]">Job ID & Type</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Approved Specifications</th>
                    <th className="py-3 px-4">Production Staff</th>
                    <th className="py-3 px-4">QC Status</th>
                    <th className="py-3 px-4">Latest Inspection</th>
                    <th className="py-3 px-4">Dispatch Gate</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DE] font-semibold">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#7A6C5E]">
                        <Package className="w-8 h-8 mx-auto text-[#C8BCB0] mb-2" />
                        <p className="font-extrabold">No completed production jobs match your filter criteria.</p>
                        <p className="text-[11px] text-[#A89C90] mt-1">Jobs reach here when all workshop stages are finished.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map(job => {
                      const isCustom = job.order_type === 'Custom';
                      const qcPass = job.qc_status === 'QC_PASSED' || job.qc_status === 'READY_FOR_PACKING' || job.qc_status === 'READY_FOR_DISPATCH' || job.qc_status === 'DISPATCHED';

                      return (
                        <tr key={job.job_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          {/* Job ID & Type */}
                          <td className="py-3.5 px-4 font-black">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border shrink-0 ${
                                  isCustom
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {job.order_type?.toUpperCase().includes('FAB') ? 'FAB' : job.order_type}
                              </span>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-[#2C241D] block whitespace-nowrap">{job.job_id}</span>
                                <span className="text-[10px] font-semibold text-[#7A6C5E] block truncate">{job.job_title}</span>
                              </div>
                            </div>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-[#2C241D]">{job.customer_name}</div>
                            <div className="text-[10px] text-[#7A6C5E]">{job.customer_email || job.customer_phone || 'Customer Profile'}</div>
                          </td>

                          {/* Approved Specifications */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="text-[11px] text-[#4E4135] truncate font-medium">
                              {isCustom ? (
                                <>
                                  <span className="font-bold">Dim:</span> {job.specifications.dimensions || 'N/A'} |{' '}
                                  <span className="font-bold">Mat:</span> {job.specifications.material || 'N/A'} |{' '}
                                  <span className="font-bold">Col:</span> {job.specifications.color || 'N/A'}
                                </>
                              ) : (
                                <>
                                  <span className="font-bold">Service:</span> {job.job_title} |{' '}
                                  <span className="font-bold">Dim:</span> {job.specifications.dimensions || 'N/A'}
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => setIsSpecsModalOpen(job)}
                              className="text-[10px] font-bold text-[#38A132] hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
                            >
                              <span>View Approved Specs</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>

                          {/* Production Staff */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-[#2C241D]">{job.production_staff_name}</div>
                            <span className="text-[10px] text-[#7A6C5E]">Workshop Supervisor</span>
                          </td>

                          {/* QC Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                job.qc_status === 'QC_PASSED' || job.qc_status === 'READY_FOR_PACKING'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : job.qc_status === 'QC_FAILED'
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                  : job.qc_status === 'REWORK_IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : job.qc_status === 'REWORK_COMPLETED'
                                  ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                  : job.qc_status === 'READY_FOR_DISPATCH'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                  : job.qc_status === 'DISPATCHED'
                                  ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {job.qc_status === 'QC_PASSED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {job.qc_status === 'QC_FAILED' && <XCircle className="w-3 h-3 text-rose-600" />}
                              {job.qc_status === 'QC_PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                              {job.qc_status === 'REWORK_IN_PROGRESS' && <RotateCcw className="w-3 h-3 text-amber-600" />}
                              {job.qc_status.replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Latest Inspection */}
                          <td className="py-3.5 px-4">
                            {job.latest_inspection ? (
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold text-[#2C241D]">
                                  {job.latest_inspection.inspector_name}
                                </div>
                                <div className="text-[10px] text-[#7A6C5E]">
                                  {job.latest_inspection.inspected_at
                                    ? new Date(job.latest_inspection.inspected_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : 'Recent'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#A89C90] italic">Not inspected yet</span>
                            )}
                          </td>

                          {/* Dispatch Gate */}
                          <td className="py-3.5 px-4">
                            {job.can_dispatch ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Permitted</span>
                              </span>
                            ) : (
                              <span
                                title={job.dispatch_block_reason || 'QC must pass before dispatch'}
                                className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 cursor-help"
                              >
                                <Lock className="w-3 h-3 text-rose-600" />
                                <span>Blocked</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* If QC is pending or rework completed, show perform QC */}
                              {['QC_PENDING', 'REWORK_COMPLETED', 'QC_FAILED'].includes(job.qc_status) && (
                                <button
                                  onClick={() => openPerformQCModal(job)}
                                  className="px-3 py-1.5 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-black rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" />
                                  <span>Perform QC</span>
                                </button>
                              )}

                              {/* If passed, view details */}
                              {qcPass && (
                                <button
                                  onClick={() => openPerformQCModal(job)}
                                  className="px-2.5 py-1.5 bg-[#FAF7F2] hover:bg-[#EFE7DE] text-[#2C241D] text-xs font-extrabold rounded-lg border border-[#E2D7CB] transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#7A6C5E]" />
                                  <span>View QC</span>
                                </button>
                              )}

                              {/* Linked Rework Ticket */}
                              {job.active_rework_ticket && (
                                <button
                                  onClick={() => {
                                    const t = reworkTickets.find(r => r.rework_id === job.active_rework_ticket?.rework_id);
                                    if (t) openTicketDetails(t);
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-extrabold rounded-lg border border-rose-200 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Ticket</span>
                                </button>
                              )}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: REWORK TICKETS & GOVERNANCE */}
      {/* ========================================================================= */}
      {activeSubTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Ticket ID, Customer, Reason..."
                value={ticketSearchQuery}
                onChange={e => setTicketSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E2D7CB]">
                <span className="text-[11px] font-bold text-[#7A6C5E]">Ticket Status:</span>
                <select
                  value={ticketStatusFilter}
                  onChange={e => setTicketStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-[#2C241D] focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="ACTIVE">Active Incidents</option>
                  <option value="OPEN">Open</option>
                  <option value="UNDER_ASSESSMENT">Under Assessment</option>
                  <option value="AWAITING_CUSTOMER_DECISION">Awaiting Customer</option>
                  <option value="AWAITING_PICKUP">Awaiting Pickup</option>
                  <option value="RECEIVED_AT_STORE">Received at Store</option>
                  <option value="REWORK_IN_PROGRESS">Rework In Progress</option>
                  <option value="REWORK_COMPLETED">Rework Completed</option>
                  <option value="QC_PENDING">QC Pending</option>
                  <option value="QC_PASSED">QC Passed</option>
                  <option value="READY_FOR_DISPATCH">Ready for Dispatch</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E2D7CB]">
                <span className="text-[11px] font-bold text-[#7A6C5E]">Responsibility:</span>
                <select
                  value={ticketResponsibilityFilter}
                  onChange={e => setTicketResponsibilityFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-[#2C241D] focus:outline-none cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="RETAILSPHERE_ERROR">RetailSphere Error (Warranty - Free)</option>
                  <option value="CUSTOMER_CHANGE">Customer Change (Chargeable)</option>
                  <option value="UNCLEAR_DISPUTED">Unclear / Disputed</option>
                  <option value="UNDER_ASSESSMENT">Under Assessment</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tickets List Table */}
          <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#EFE7DE] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Rework Incident Tickets & Action Center ({filteredTickets.length})</span>
              </h3>
              <span className="text-[11px] font-semibold text-[#7A6C5E]">
                Full trace audit: Responsibility assessment, Quotations, Artisans & Redelivery
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EFE7DE] bg-[#FAF7F2] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4">Origin & Order</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Defect Reason & Required Changes</th>
                    <th className="py-3 px-4">Responsibility</th>
                    <th className="py-3 px-4">Financials</th>
                    <th className="py-3 px-4">Ticket Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DE] font-semibold">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#7A6C5E]">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                        <p className="font-extrabold">No rework tickets match your filter criteria.</p>
                        <p className="text-[11px] text-[#A89C90] mt-1">Failed QC checks or customer complaints automatically appear here.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map(ticket => {
                      const isError = ticket.responsibility_type === 'RETAILSPHERE_ERROR';
                      const isCustChange = ticket.responsibility_type === 'CUSTOMER_CHANGE';
                      const isDisputed = ticket.responsibility_type === 'UNCLEAR_DISPUTED';

                      return (
                        <tr key={ticket.rework_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          {/* Ticket ID */}
                          <td className="py-3.5 px-4 font-black">
                            <span className="font-mono text-xs text-[#2C241D] block">{ticket.ticket_code}</span>
                            <span className="text-[10px] text-[#7A6C5E]">
                              {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Recent'}
                            </span>
                          </td>

                          {/* Origin & Order */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-[#2C241D]">{ticket.display_order_id}</div>
                            <span className="text-[10px] text-[#7A6C5E] uppercase font-bold">
                              {ticket.source === 'QC_FAILURE' ? 'QC Failure Gate' : 'Customer Post-Delivery'}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-[#2C241D]">{ticket.customer_name}</div>
                            <div className="text-[10px] text-[#7A6C5E]">{ticket.customer_phone || ticket.customer_email}</div>
                          </td>

                          {/* Reason */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-xs text-[#4E4135] font-semibold line-clamp-2">{ticket.rework_reason}</p>
                            {ticket.required_changes && (
                              <p className="text-[10px] text-[#7A6C5E] font-medium mt-0.5">
                                <span className="font-bold">Required:</span> {ticket.required_changes}
                              </p>
                            )}
                          </td>

                          {/* Responsibility */}
                          <td className="py-3.5 px-4">
                            {isError && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                                <span>Warranty Error (Free)</span>
                              </span>
                            )}
                            {isCustChange && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                <User className="w-3 h-3 text-amber-700" />
                                <span>Customer Change (Paid)</span>
                              </span>
                            )}
                            {isDisputed && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300">
                                <AlertTriangle className="w-3 h-3 text-purple-700" />
                                <span>Disputed (Admin Escalated)</span>
                              </span>
                            )}
                            {!isError && !isCustChange && !isDisputed && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-300">
                                <Clock className="w-3 h-3 text-slate-600" />
                                <span>Under Assessment</span>
                              </span>
                            )}
                          </td>

                          {/* Financials */}
                          <td className="py-3.5 px-4">
                            {isError ? (
                              <div>
                                <span className="text-xs font-black text-emerald-700">₹0.00</span>
                                <span className="text-[10px] text-emerald-600 block">Free Fleet Transport</span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-xs font-black text-[#2C241D]">
                                  ₹{ticket.additional_cost.toLocaleString()}
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold block ${
                                    ticket.payment_status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                                  }`}
                                >
                                  {ticket.payment_status}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                ticket.status === 'CLOSED'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                  : ticket.status === 'REWORK_IN_PROGRESS'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : ticket.status === 'QC_PASSED' || ticket.status === 'READY_FOR_DISPATCH'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {ticket.status.replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Repeat QC Action Button if rework completed */}
                              {ticket.status === 'REWORK_COMPLETED' && (
                                <button
                                  onClick={() => openRepeatQCModal(ticket)}
                                  className="px-2.5 py-1.5 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-black rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Repeat QC</span>
                                </button>
                              )}

                              <button
                                onClick={() => openTicketDetails(ticket)}
                                className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#EFE7DE] text-[#2C241D] text-xs font-black rounded-lg border border-[#E2D7CB] transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Wrench className="w-3.5 h-3.5 text-[#7A6C5E]" />
                                <span>Manage Ticket</span>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: QC INSPECTION AUDIT HISTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'inspections' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit logs by Inspector, Order ID, notes..."
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E2D7CB]">
                <span className="text-[11px] font-bold text-[#7A6C5E]">Outcome:</span>
                <select
                  value={auditResultFilter}
                  onChange={e => setAuditResultFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-[#2C241D] focus:outline-none cursor-pointer"
                >
                  <option value="All">All Outcomes</option>
                  <option value="PASS">PASS Only</option>
                  <option value="FAIL">FAIL Only</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E2D7CB]">
                <span className="text-[11px] font-bold text-[#7A6C5E]">Order Type:</span>
                <select
                  value={auditTypeFilter}
                  onChange={e => setAuditTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold text-[#2C241D] focus:outline-none cursor-pointer"
                >
                  <option value="All">All Modules</option>
                  <option value="Custom">Custom Furniture</option>
                  <option value="Fabrication">Fabrication</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#E2D7CB] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#EFE7DE] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#38A132]" />
                <span>Authoritative Quality Control Audit Logs ({filteredInspections.length})</span>
              </h3>
              <span className="text-[11px] font-semibold text-[#7A6C5E]">
                Inspections are permanent and tamper-proof. Initial and repeat QC preserved.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EFE7DE] bg-[#FAF7F2] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Audit ID & Order</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">QC Inspector</th>
                    <th className="py-3 px-4">Technical Check Results</th>
                    <th className="py-3 px-4">Inspection Result</th>
                    <th className="py-3 px-4">Inspector Remarks</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DE] font-semibold">
                  {filteredInspections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#7A6C5E]">
                        No inspection audit records match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredInspections.map(insp => {
                      const isPass = insp.result === 'PASS';
                      const chk = insp.checklist;

                      return (
                        <tr key={insp.inspection_id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                          <td className="py-3.5 px-4 font-black">
                            <span className="font-mono text-xs text-[#2C241D]">QC-#{String(insp.inspection_id).padStart(4, '0')}</span>
                            <span className="text-[10px] text-[#7A6C5E] block">
                              {insp.order_type === 'Custom' ? `CUS-${String(insp.order_id).padStart(4, '0')}` : `FAB-${String(insp.order_id).padStart(4, '0')}`}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D]">
                              {insp.order_type?.toUpperCase().includes('FAB') ? 'FAB' : insp.order_type}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-[#2C241D] flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-[#38A132]" />
                              <span>{insp.inspector_name}</span>
                            </div>
                            <span className="text-[10px] text-[#7A6C5E]">Authorized Inspector</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              <span className={chk.dimensions ? 'text-emerald-700' : 'text-rose-700'}>
                                {chk.dimensions ? '✓' : '✗'} Dimensions
                              </span>
                              <span className={chk.specifications ? 'text-emerald-700' : 'text-rose-700'}>
                                {chk.specifications ? '✓' : '✗'} Design Specs
                              </span>
                              <span className={chk.material ? 'text-emerald-700' : 'text-rose-700'}>
                                {chk.material ? '✓' : '✗'} Material
                              </span>
                              <span className={chk.finishing ? 'text-emerald-700' : 'text-rose-700'}>
                                {chk.finishing ? '✓' : '✗'} Finish/Coat
                              </span>
                              <span className={chk.structure ? 'text-emerald-700' : 'text-rose-700'}>
                                {chk.structure ? '✓' : '✗'} Structure
                              </span>
                              <span className={chk.functionality ? 'text-emerald-700' : 'text-rose-700'}>
                                {chk.functionality ? '✓' : '✗'} Workmanship
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {isPass ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>PASSED ✓</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>FAILED (REWORK)</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 max-w-xs text-xs text-[#4E4135]">
                            {insp.inspection_notes || <span className="text-[#A89C90] italic">No remarks recorded.</span>}
                          </td>

                          <td className="py-3.5 px-4 text-[11px] font-mono text-[#7A6C5E]">
                            {insp.inspected_at
                              ? new Date(insp.inspected_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Recent'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PERFORM QUALITY CONTROL INSPECTION MODAL */}
      {/* ========================================================================= */}
      {selectedJobForQC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#E2D7CB] shadow-2xl space-y-6 p-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#EFE7DE]">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>
                    {isRepeatQCForTicket ? `Repeat QC Inspection (${isRepeatQCForTicket.ticket_code})` : 'Production Quality Audit Gate'}
                  </span>
                </div>
                <h2 className="text-xl font-black text-[#2C241D]">
                  Perform QC Inspection — {selectedJobForQC.job_id}
                </h2>
                <p className="text-xs text-[#7A6C5E]">
                  Job Type: <span className="font-bold text-[#2C241D]">{selectedJobForQC.order_type}</span> ({selectedJobForQC.job_title}) | Customer: <span className="font-bold text-[#2C241D]">{selectedJobForQC.customer_name}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedJobForQC(null)}
                className="p-2 text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#FAF7F2] rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Approved Specifications Reference Box */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#38A132]" />
                <span>Reference Approved Job Specifications</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {selectedJobForQC.specifications.dimensions && (
                  <div className="bg-white p-2 rounded-xl border border-[#EAE0D4]">
                    <span className="text-[10px] text-[#7A6C5E] font-bold block">Dimensions:</span>
                    <span className="font-black text-[#2C241D]">{selectedJobForQC.specifications.dimensions}</span>
                  </div>
                )}
                {selectedJobForQC.specifications.material && (
                  <div className="bg-white p-2 rounded-xl border border-[#EAE0D4]">
                    <span className="text-[10px] text-[#7A6C5E] font-bold block">Material:</span>
                    <span className="font-black text-[#2C241D]">{selectedJobForQC.specifications.material}</span>
                  </div>
                )}
                {selectedJobForQC.specifications.color && (
                  <div className="bg-white p-2 rounded-xl border border-[#EAE0D4]">
                    <span className="text-[10px] text-[#7A6C5E] font-bold block">Colour / Finish:</span>
                    <span className="font-black text-[#2C241D]">{selectedJobForQC.specifications.color}</span>
                  </div>
                )}
                {selectedJobForQC.specifications.material_source && (
                  <div className="bg-white p-2 rounded-xl border border-[#EAE0D4]">
                    <span className="text-[10px] text-[#7A6C5E] font-bold block">Material Source:</span>
                    <span className="font-black text-[#2C241D]">{selectedJobForQC.specifications.material_source}</span>
                  </div>
                )}
              </div>
              {selectedJobForQC.specifications.design_description && (
                <div className="text-[11px] text-[#4E4135] bg-white p-2.5 rounded-xl border border-[#EAE0D4]">
                  <span className="font-bold text-[#2C241D]">Approved Design Description: </span>
                  {selectedJobForQC.specifications.design_description}
                </div>
              )}
            </div>

            {/* Dynamic Structured Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-[#2C241D] tracking-wider">
                  Technical Checklist Verification
                </h4>
                <span className="text-[11px] font-bold text-[#7A6C5E]">Mark each applicable standard</span>
              </div>

              <div className="space-y-2.5">
                {getDynamicChecklistItems(selectedJobForQC).map(item => {
                  const currentVal = qcChecklist[item.key] || { pass: true, remark: '' };
                  const isPass = currentVal.pass;

                  return (
                    <div
                      key={item.key}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isPass
                          ? 'bg-white border-[#E2D7CB]'
                          : 'bg-rose-50/50 border-rose-300 shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-[#2C241D] flex items-center gap-1.5">
                            {isPass ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            )}
                            {item.title}
                          </span>
                          <p className="text-[11px] text-[#6C5E52] leading-relaxed">{item.description}</p>
                        </div>

                        {/* Pass/Fail Selector Button */}
                        <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              setQcChecklist(prev => ({
                                ...prev,
                                [item.key]: { ...prev[item.key], pass: true }
                              }));
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              isPass
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-[#FAF7F2] text-[#7A6C5E] hover:text-[#2C241D]'
                            }`}
                          >
                            PASS
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQcChecklist(prev => ({
                                ...prev,
                                [item.key]: { ...prev[item.key], pass: false }
                              }));
                              setQcFinalDecision('FAIL');
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              !isPass
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-[#FAF7F2] text-[#7A6C5E] hover:text-[#2C241D]'
                            }`}
                          >
                            FAIL
                          </button>
                        </div>
                      </div>

                      {/* Remark for item */}
                      <input
                        type="text"
                        placeholder="Add specific inspector remark for this check..."
                        value={currentVal.remark}
                        onChange={e => {
                          const val = e.target.value;
                          setQcChecklist(prev => ({
                            ...prev,
                            [item.key]: { ...prev[item.key], remark: val }
                          }));
                        }}
                        className="mt-2 w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[11px] font-medium focus:outline-none focus:border-[#38A132]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inspector Notes & Photos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#5C4E42]">Overall Inspection Remarks:</label>
                <textarea
                  rows={3}
                  placeholder="Enter overall tolerance notes, artisan feedback, or defect description..."
                  value={qcInspectionNotes}
                  onChange={e => setQcInspectionNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#5C4E42]">Evidence Photo URL (Optional):</label>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#7A6C5E] shrink-0" />
                  <input
                    type="text"
                    placeholder="https://example.com/qc_photo.jpg"
                    value={qcPhotos}
                    onChange={e => setQcPhotos(e.target.value)}
                    className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#38A132]"
                  />
                </div>
                <p className="text-[10px] text-[#7A6C5E] mt-1">
                  Inspector: <span className="font-bold text-[#2C241D]">{userName}</span> (Derived from session)
                </p>
              </div>
            </div>

            {/* Final Decision Selector & Action */}
            <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-[#2C241D] block">Final QC Assessment Decision:</span>
                  <p className="text-[11px] text-[#7A6C5E]">
                    {qcFinalDecision === 'PASS'
                      ? 'Approves order for dispatch gating. Permits packing and delivery.'
                      : 'Rejects order. Automatically generates Rework Ticket and assigns to workshop.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQcFinalDecision('PASS')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      qcFinalDecision === 'PASS'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white border border-[#E2D7CB] text-[#7A6C5E]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>QC PASSED</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcFinalDecision('FAIL')}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      qcFinalDecision === 'FAIL'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-white border border-[#E2D7CB] text-[#7A6C5E]'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>QC FAILED</span>
                  </button>
                </div>
              </div>

              {qcFinalDecision === 'FAIL' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Rework Ticket Auto-Generation</span>
                  </div>
                  <p className="text-[11px]">
                    Submitting QC FAILED will automatically create a unique Rework Ticket with zero charge (RetailSphere error under warranty) and block dispatch until repeat QC passes.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EFE7DE]">
              <button
                type="button"
                onClick={() => setSelectedJobForQC(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E2D7CB] text-xs font-bold text-[#7A6C5E] hover:bg-[#FAF7F2] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitQCInspection}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Record Authoritative QC Decision</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: APPROVED SPECIFICATIONS VIEW MODAL */}
      {/* ========================================================================= */}
      {isSpecsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-[#E2D7CB] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-black text-[#2C241D] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#38A132]" />
                <span>Approved Job Specifications — {isSpecsModalOpen.job_id}</span>
              </h3>
              <button
                onClick={() => setIsSpecsModalOpen(null)}
                className="p-1 text-[#7A6C5E] hover:text-[#2C241D] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Module Type:</span>
                  <span className="font-black text-[#2C241D]">{isSpecsModalOpen.order_type}</span>
                </div>
                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Service / Title:</span>
                  <span className="font-black text-[#2C241D]">{isSpecsModalOpen.job_title}</span>
                </div>
                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Customer:</span>
                  <span className="font-black text-[#2C241D]">{isSpecsModalOpen.customer_name}</span>
                </div>
                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Dimensions:</span>
                  <span className="font-black text-[#2C241D]">{isSpecsModalOpen.specifications.dimensions || 'N/A'}</span>
                </div>
              </div>

              {isSpecsModalOpen.specifications.material && (
                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Approved Material:</span>
                  <span className="font-semibold text-[#2C241D]">{isSpecsModalOpen.specifications.material}</span>
                </div>
              )}

              {isSpecsModalOpen.specifications.color && (
                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Finish & Color:</span>
                  <span className="font-semibold text-[#2C241D]">{isSpecsModalOpen.specifications.color}</span>
                </div>
              )}

              {isSpecsModalOpen.specifications.design_description && (
                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Design Description:</span>
                  <p className="text-[#4E4135] mt-1 leading-relaxed">{isSpecsModalOpen.specifications.design_description}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[#EFE7DE]">
              <button
                onClick={() => setIsSpecsModalOpen(null)}
                className="px-4 py-2 bg-[#FAF7F2] hover:bg-[#EFE7DE] text-xs font-black text-[#2C241D] rounded-xl border border-[#E2D7CB]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REWORK TICKET MANAGEMENT & WORKFLOW MODAL */}
      {/* ========================================================================= */}
      {selectedTicketDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-[#E2D7CB] shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#EFE7DE]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-md font-black bg-rose-50 text-rose-800 border border-rose-200">
                    {selectedTicketDetails.ticket_code}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    Status: {selectedTicketDetails.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h2 className="text-xl font-black text-[#2C241D]">
                  Rework Incident & Governance Center
                </h2>
                <p className="text-xs text-[#7A6C5E]">
                  Order: <span className="font-bold text-[#2C241D]">{selectedTicketDetails.order_type} #{selectedTicketDetails.order_id}</span> | Customer: <span className="font-bold text-[#2C241D]">{selectedTicketDetails.customer_name}</span> ({selectedTicketDetails.customer_phone})
                </p>
              </div>
              <button
                onClick={() => setSelectedTicketDetails(null)}
                className="p-2 text-[#7A6C5E] hover:text-[#2C241D] hover:bg-[#FAF7F2] rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Side-by-Side Comparison: Approved Specifications vs Defect/Complaint */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box A: Original Approved Specs */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-2">
                <span className="text-[11px] font-black uppercase text-[#7A6C5E] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Original Approved Specifications</span>
                </span>
                <div className="space-y-1 text-xs">
                  <p><span className="font-bold text-[#2C241D]">Title:</span> {selectedTicketDetails.approved_specifications?.title || 'Job'}</p>
                  <p><span className="font-bold text-[#2C241D]">Dimensions:</span> {selectedTicketDetails.approved_specifications?.dimensions || 'N/A'}</p>
                  <p><span className="font-bold text-[#2C241D]">Material:</span> {selectedTicketDetails.approved_specifications?.material || 'N/A'}</p>
                  <p><span className="font-bold text-[#2C241D]">Color / Finish:</span> {selectedTicketDetails.approved_specifications?.color || 'N/A'}</p>
                  {selectedTicketDetails.approved_specifications?.design_description && (
                    <p className="text-[11px] text-[#4E4135] mt-1 bg-white p-2 rounded-lg border border-[#EAE0D4]">
                      {selectedTicketDetails.approved_specifications.design_description}
                    </p>
                  )}
                </div>
              </div>

              {/* Box B: Reported Defect / Failure Evidence */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-2">
                <span className="text-[11px] font-black uppercase text-rose-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Reported Defect & Evidence</span>
                </span>
                <div className="space-y-1.5 text-xs">
                  <p className="font-extrabold text-rose-950">{selectedTicketDetails.rework_reason}</p>
                  {selectedTicketDetails.required_changes && (
                    <p className="text-[11px] text-rose-900">
                      <span className="font-bold">Required Fix:</span> {selectedTicketDetails.required_changes}
                    </p>
                  )}
                  {selectedTicketDetails.evidence_photos && (
                    <div className="mt-2">
                      <span className="text-[10px] font-bold text-rose-800 block mb-1">Attached Evidence:</span>
                      <a
                        href={selectedTicketDetails.evidence_photos}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-rose-700 underline flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>View Photo Evidence</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Responsibility & Financial Status */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2D7CB] shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2">
                <span className="text-xs font-black uppercase text-[#2C241D]">
                  Responsibility & Transportation Status
                </span>
                <span className="text-xs font-bold text-[#7A6C5E]">
                  Transportation Mode: <span className="font-black text-[#2C241D]">{selectedTicketDetails.transportation_mode}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EAE0D4]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Responsibility:</span>
                  <span className="font-black text-[#2C241D] block mt-0.5">
                    {selectedTicketDetails.responsibility_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-[#7A6C5E]">
                    {selectedTicketDetails.responsibility_type === 'RETAILSPHERE_ERROR' ? 'Warranty: 100% Free' : 'Chargeable modification'}
                  </span>
                </div>

                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EAE0D4]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Quotation / Cost:</span>
                  <span className="font-black text-[#2C241D] block mt-0.5">
                    ₹{selectedTicketDetails.additional_cost.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#7A6C5E]">
                    Status: {selectedTicketDetails.quotation_status}
                  </span>
                </div>

                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#EAE0D4]">
                  <span className="text-[10px] text-[#7A6C5E] font-bold block">Payment Status:</span>
                  <span className="font-black text-[#2C241D] block mt-0.5">
                    {selectedTicketDetails.payment_status}
                  </span>
                  <span className="text-[10px] text-[#7A6C5E]">
                    Ref: {selectedTicketDetails.payment_reference || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* WORKFLOW ACTION SECTIONS */}
            {/* 1. Responsibility Assessment Form (if under assessment or to edit) */}
            {['OPEN', 'UNDER_ASSESSMENT'].includes(selectedTicketDetails.status) && (
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Step 1: Record Technical Responsibility Assessment
                  </h4>
                </div>
                <p className="text-[11px] text-amber-800">
                  Compare specifications with evidence to determine whether RetailSphere made a production error, or if the customer is requesting new modifications.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssessType('RETAILSPHERE_ERROR')}
                    className={`p-3 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer ${
                      assessType === 'RETAILSPHERE_ERROR'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                        : 'bg-white border-[#E2D7CB] text-[#2C241D]'
                    }`}
                  >
                    <span className="font-black block">A. RetailSphere Error</span>
                    <span className="text-[10px] opacity-85 block mt-0.5">Free rework + Free internal fleet pickup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssessType('CUSTOMER_CHANGE')}
                    className={`p-3 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer ${
                      assessType === 'CUSTOMER_CHANGE'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-md'
                        : 'bg-white border-[#E2D7CB] text-[#2C241D]'
                    }`}
                  >
                    <span className="font-black block">B. Customer Change</span>
                    <span className="text-[10px] opacity-85 block mt-0.5">Paid modification + Quotation approval required</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssessType('UNCLEAR_DISPUTED')}
                    className={`p-3 rounded-xl text-left border text-xs font-bold transition-all cursor-pointer ${
                      assessType === 'UNCLEAR_DISPUTED'
                        ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                        : 'bg-white border-[#E2D7CB] text-[#2C241D]'
                    }`}
                  >
                    <span className="font-black block">C. Unclear / Disputed</span>
                    <span className="text-[10px] opacity-85 block mt-0.5">Escalate for Admin review</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5C4E42]">Assessment Rationale & Notes:</label>
                  <textarea
                    rows={2}
                    placeholder="Explain why this decision was reached based on specifications vs evidence..."
                    value={assessNotes}
                    onChange={e => setAssessNotes(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none focus:border-[#38A132]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveAssessment}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    Save Responsibility Assessment
                  </button>
                </div>
              </div>
            )}

            {/* 2. Admin Dispute Resolution (If userRole === 'admin' and UNCLEAR_DISPUTED) */}
            {userRole === 'admin' && selectedTicketDetails.responsibility_type === 'UNCLEAR_DISPUTED' && (
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-purple-700" />
                  <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                    Admin Escalation: Resolve Disputed Responsibility Case
                  </h4>
                </div>
                <p className="text-[11px] text-purple-800">
                  As an Administrator, review the evidence and record the binding responsibility outcome.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDisputeResolution('RETAILSPHERE_ERROR')}
                    className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
                      disputeResolution === 'RETAILSPHERE_ERROR'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-[#2C241D] border border-purple-200'
                    }`}
                  >
                    Grant Warranty Rework (RetailSphere Error)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisputeResolution('CUSTOMER_CHANGE')}
                    className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer ${
                      disputeResolution === 'CUSTOMER_CHANGE'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white text-[#2C241D] border border-purple-200'
                    }`}
                  >
                    Require Chargeable Quotation (Customer Change)
                  </button>
                </div>

                <textarea
                  rows={2}
                  placeholder="Record binding administrative decision rationale..."
                  value={disputeResolutionNotes}
                  onChange={e => setDisputeResolutionNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-medium focus:outline-none"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleResolveDispute}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black rounded-xl"
                  >
                    Record Admin Dispute Decision
                  </button>
                </div>
              </div>
            )}

            {/* 3. Itemized Quotation Builder (if customer change) */}
            {selectedTicketDetails.responsibility_type === 'CUSTOMER_CHANGE' && (
              <div className="p-4 rounded-2xl bg-white border border-[#E2D7CB] shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2">
                  <h4 className="text-xs font-black uppercase text-[#2C241D] flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Itemized Quotation for Customer-Requested Work</span>
                  </h4>
                  <span className="text-[11px] font-bold text-[#7A6C5E]">
                    Quotation: {selectedTicketDetails.quotation_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-[#7A6C5E] block">Material (₹)</label>
                    <input
                      type="number"
                      value={quoteMaterialCost}
                      onChange={e => setQuoteMaterialCost(Number(e.target.value))}
                      className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7A6C5E] block">Labour (₹)</label>
                    <input
                      type="number"
                      value={quoteLabourCost}
                      onChange={e => setQuoteLabourCost(Number(e.target.value))}
                      className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7A6C5E] block">Machine (₹)</label>
                    <input
                      type="number"
                      value={quoteMachineCost}
                      onChange={e => setQuoteMachineCost(Number(e.target.value))}
                      className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7A6C5E] block">Finishing (₹)</label>
                    <input
                      type="number"
                      value={quoteFinishingCost}
                      onChange={e => setQuoteFinishingCost(Number(e.target.value))}
                      className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#7A6C5E] block">Transport (₹)</label>
                    <input
                      type="number"
                      value={quoteTransportCost}
                      onChange={e => setQuoteTransportCost(Number(e.target.value))}
                      className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-black"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm font-black text-[#2C241D]">
                    Total Quotation: ₹
                    {(
                      Number(quoteMaterialCost) +
                      Number(quoteLabourCost) +
                      Number(quoteMachineCost) +
                      Number(quoteFinishingCost) +
                      Number(quoteTransportCost)
                    ).toLocaleString()}
                  </div>
                  <button
                    onClick={handleCreateQuotation}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-black rounded-xl cursor-pointer"
                  >
                    Submit Quotation to Customer
                  </button>
                </div>
              </div>
            )}

            {/* 4. Item Receipt & Artisan Worker Assignment */}
            {['AWAITING_PICKUP', 'RECEIVED_AT_STORE', 'AWAITING_CUSTOMER_DECISION'].includes(selectedTicketDetails.status) && (
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-[#2C241D] flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#38A132]" />
                    <span>Store Receipt & Artisan Worker Assignment</span>
                  </h4>
                  {selectedTicketDetails.status === 'AWAITING_PICKUP' && (
                    <button
                      onClick={handleConfirmStoreReceipt}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl cursor-pointer"
                    >
                      Confirm Item Received at Store
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#5C4E42] block mb-1">
                      Assign Qualified Artisan Worker:
                    </label>
                    <select
                      value={selectedWorkerId || ''}
                      onChange={e => setSelectedWorkerId(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-extrabold focus:outline-none"
                    >
                      <option value="">-- Select Artisan Worker --</option>
                      {workersList.map(w => (
                        <option key={w.worker_id || w.user_id} value={w.worker_id || w.user_id}>
                          {w.full_name || w.name} ({w.specialization || 'Carpenter / Artisan'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#5C4E42] block mb-1">Special Instructions:</label>
                    <input
                      type="text"
                      placeholder="e.g. Re-sand top surface with 220 grit, replace joint dowels..."
                      value={assignmentInstructions}
                      onChange={e => setAssignmentInstructions(e.target.value)}
                      className="w-full p-2 bg-white border border-[#E2D7CB] rounded-xl text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleAssignWorker}
                    disabled={actionLoading || !selectedWorkerId}
                    className="px-4 py-2 bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-black rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Assign Artisan & Start Rework
                  </button>
                </div>
              </div>
            )}

            {/* 5. Complete Rework Stage */}
            {selectedTicketDetails.status === 'REWORK_IN_PROGRESS' && (
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-teal-950 uppercase tracking-wider">
                    Rework Production Underway
                  </h4>
                  <p className="text-[11px] text-teal-800">
                    Artisan: <span className="font-bold">{selectedTicketDetails.worker_name || 'Assigned Artisan'}</span> is executing rectifications.
                  </p>
                </div>
                <button
                  onClick={handleCompleteRework}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Mark Rework Completed (Send to Repeat QC)
                </button>
              </div>
            )}

            {/* 6. Repeat QC Passed -> Ready for Redelivery Dispatch */}
            {['QC_PASSED', 'READY_FOR_DISPATCH'].includes(selectedTicketDetails.status) && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Repeat QC Passed — Arrange Return Dispatch
                  </h4>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Item has successfully passed Repeat QC inspection. Redeliver via{' '}
                  <span className="font-bold">
                    {selectedTicketDetails.responsibility_type === 'RETAILSPHERE_ERROR'
                      ? 'Free Internal Fleet Vehicle'
                      : 'Carrier Partner / Customer Collection'}
                  </span>
                  .
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-emerald-900">
                    Close ticket upon redelivery completion
                  </span>
                  <button
                    onClick={handleDispatchRedelivery}
                    disabled={actionLoading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                  >
                    Confirm Redelivery & Close Ticket
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-[#EFE7DE]">
              <button
                type="button"
                onClick={() => setSelectedTicketDetails(null)}
                className="px-5 py-2.5 rounded-xl border border-[#E2D7CB] text-xs font-bold text-[#7A6C5E] hover:bg-[#FAF7F2]"
              >
                Close Ticket View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
