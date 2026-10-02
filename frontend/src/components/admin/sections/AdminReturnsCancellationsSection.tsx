import React, { useState, useEffect } from 'react';
import { 
  Undo2, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  User, 
  Edit3, 
  X,
  Eye,
  FileText
} from 'lucide-react';
import { 
  fetchAdminOrderReturnsDB, 
  updateAdminReturnStatusDB, 
  fetchAdminOrderCancellationsDB 
} from '../../../services/api_admin';

export const AdminReturnsCancellationsSection: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'returns' | 'cancellations'>('returns');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [cancellationsList, setCancellationsList] = useState<any[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>('ALL');

  // Modals
  const [selectedReturnForEdit, setSelectedReturnForEdit] = useState<any | null>(null);
  const [editReturnStatus, setEditReturnStatus] = useState('Approved');
  const [editPickupDate, setEditPickupDate] = useState('');
  const [editRefundStatus, setEditRefundStatus] = useState('Pending');
  const [editRefundAmount, setEditRefundAmount] = useState<number>(0);
  const [editStaffNotes, setEditStaffNotes] = useState('');
  const [isUpdatingReturn, setIsUpdatingReturn] = useState(false);

  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rets, cancs] = await Promise.all([
        fetchAdminOrderReturnsDB(),
        fetchAdminOrderCancellationsDB()
      ]);
      setReturnsList(rets || []);
      setCancellationsList(cancs || []);
    } catch (err) {
      console.error('Error loading returns & cancellations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturnForEdit) return;
    setIsUpdatingReturn(true);
    try {
      await updateAdminReturnStatusDB(selectedReturnForEdit.return_id, {
        status: editReturnStatus,
        refund_status: editRefundStatus,
        notes: editStaffNotes
      });
      setActionMsg({ type: 'success', text: `Return #${selectedReturnForEdit.return_id} status updated to ${editReturnStatus}!` });
      setSelectedReturnForEdit(null);
      await loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to update return status.' });
      setTimeout(() => setActionMsg(null), 5000);
    } finally {
      setIsUpdatingReturn(false);
    }
  };

  // Metrics
  const totalReturns = returnsList.length;
  const pendingReturns = returnsList.filter(r => (r.status || '').toLowerCase().includes('requested') || (r.status || '').toLowerCase().includes('pending')).length;
  const approvedReturns = returnsList.filter(r => (r.status || '').toLowerCase().includes('approved') || (r.status || '').toLowerCase().includes('refunded')).length;
  const totalRefundAmount = returnsList.reduce((acc, r) => acc + (r.refund_amount || 0), 0);

  const totalCancellations = cancellationsList.length;
  const totalCancelledValue = cancellationsList.reduce((acc, c) => acc + (c.total_amount || 0), 0);

  // Filtered Returns
  const filteredReturns = returnsList.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      r.order_number?.toLowerCase().includes(q) ||
      r.customer_name?.toLowerCase().includes(q) ||
      r.customer_email?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q);
    
    const matchStatus = returnStatusFilter === 'ALL' || (r.status || '').toUpperCase() === returnStatusFilter.toUpperCase();
    return matchSearch && matchStatus;
  });

  // Filtered Cancellations
  const filteredCancellations = cancellationsList.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    return !q ||
      c.order_number?.toLowerCase().includes(q) ||
      c.customer_name?.toLowerCase().includes(q) ||
      c.customer_email?.toLowerCase().includes(q) ||
      c.reason?.toLowerCase().includes(q) ||
      c.cancelled_by_role?.toLowerCase().includes(q);
  });

  return (
    <div className="relative z-10 space-y-6 animate-fadeIn">

      {/* Action Banner */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fadeIn ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-xs hover:opacity-70 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Return Claims</span>
          <div className="text-2xl font-black text-[#2C241D]">{totalReturns} Total</div>
          <span className="text-[10px] font-bold text-amber-700 block">{pendingReturns} Pending Action</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Approved / Refunded</span>
          <div className="text-2xl font-black text-emerald-700">{approvedReturns} Claims</div>
          <span className="text-[10px] font-bold text-emerald-800 block">Warranty & Replacement</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Cancelled Orders</span>
          <div className="text-2xl font-black text-rose-700">{totalCancellations} Orders</div>
          <span className="text-[10px] font-bold text-rose-800 block">Pre-dispatch Cancellations</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Total Refund Value</span>
          <div className="text-2xl font-black text-[#2C241D]">₹{Math.round(totalRefundAmount + totalCancelledValue).toLocaleString('en-IN')}</div>
          <span className="text-[10px] font-bold text-[#7A6C5E] block">Returns + Cancelled Items</span>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('returns')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubTab === 'returns'
                  ? 'bg-rose-700 text-white shadow-md'
                  : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Customer Returns & Replacements ({returnsList.length})</span>
              {pendingReturns > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-black">
                  {pendingReturns}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('cancellations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubTab === 'cancellations'
                  ? 'bg-[#2C241D] text-white shadow-md'
                  : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Cancelled Orders Ledger ({cancellationsList.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search order #, customer, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
            />
          </div>
        </div>

        {/* SUB-VIEW 1: RETURNS */}
        {activeSubTab === 'returns' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] bg-[#FAF7F2]">
                    <th className="py-3 px-4">Claim ID</th>
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Reason & Details</th>
                    <th className="py-3 px-4">Photo Proof</th>
                    <th className="py-3 px-4">Refund Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D7CB]/60">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#7A6C5E] font-bold">
                        No return claims found. All customer orders are in good standing.
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((r) => (
                      <tr key={r.return_id} className="hover:bg-[#FAF7F2]/60">
                        <td className="py-3 px-4 font-mono font-bold text-[#7A6C5E]">#{r.return_id}</td>
                        <td className="py-3 px-4 font-extrabold text-[#2C241D]">
                          {r.order_number || `RET-${r.order_id}`}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#2C241D]">{r.customer_name || 'Customer'}</div>
                          <div className="text-[10px] text-[#7A6C5E] font-mono">{r.customer_email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-rose-800">{r.reason}</div>
                          {r.description && (
                            <div className="text-[10px] text-[#5C4E42] max-w-xs truncate">{r.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {r.photo_url ? (
                            <button
                              onClick={() => setPreviewPhotoUrl(r.photo_url)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Photo</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#7A6C5E]">No photo attached</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-black text-[#2C241D]">
                          ₹{r.refund_amount ? Number(r.refund_amount).toLocaleString('en-IN') : '0'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            (r.status || '').toLowerCase().includes('approved')
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : (r.status || '').toLowerCase().includes('rejected')
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {r.status || 'Return Requested'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedReturnForEdit(r);
                              setEditReturnStatus(r.status || 'Approved');
                              setEditPickupDate(r.pickup_date || '');
                              setEditRefundStatus(r.refund_status || 'Pending');
                              setEditRefundAmount(r.refund_amount || 0);
                              setEditStaffNotes(r.notes || '');
                            }}
                            className="px-3 py-1 bg-white hover:bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] text-[11px] font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3 text-[#7A6C5E]" />
                            <span>Review Claim</span>
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

        {/* SUB-VIEW 2: CANCELLATIONS */}
        {activeSubTab === 'cancellations' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] bg-[#FAF7F2]">
                    <th className="py-3 px-4">Cancellation #</th>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Cancelled By</th>
                    <th className="py-3 px-4">Reason Given</th>
                    <th className="py-3 px-4">Order Value</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Cancellation Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D7CB]/60">
                  {filteredCancellations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#7A6C5E] font-bold">
                        No order cancellations recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredCancellations.map((c) => (
                      <tr key={c.cancellation_id} className="hover:bg-[#FAF7F2]/60">
                        <td className="py-3 px-4 font-mono font-bold text-[#7A6C5E]">#{c.cancellation_id}</td>
                        <td className="py-3 px-4 font-extrabold text-[#2C241D]">
                          {c.order_number || `ORD-${c.order_id}`}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#2C241D]">{c.customer_name}</div>
                          <div className="text-[10px] text-[#7A6C5E] font-mono">{c.customer_email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-800 text-[10px] font-bold">
                            {c.cancelled_by_role || 'Customer'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#5C4E42] max-w-xs truncate">
                          {c.reason || 'No detailed reason'}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#2C241D]">
                          ₹{c.total_amount ? Number(c.total_amount).toLocaleString('en-IN') : '0'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-stone-100 text-stone-700">
                            {c.payment_status || 'Cancelled'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-[#7A6C5E] whitespace-nowrap">
                          {c.cancelled_at ? new Date(c.cancelled_at).toLocaleString() : 'Recent'}
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

      {/* MODAL 1: REVIEW & UPDATE RETURN STATUS */}
      {selectedReturnForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E2D7CB] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h4 className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-rose-600" />
                <span>Review Claim #{selectedReturnForEdit.return_id}</span>
              </h4>
              <button onClick={() => setSelectedReturnForEdit(null)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateReturnSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] space-y-1">
                <div><strong>Order:</strong> {selectedReturnForEdit.order_number}</div>
                <div><strong>Customer:</strong> {selectedReturnForEdit.customer_name}</div>
                <div><strong>Reason:</strong> <span className="text-rose-700 font-bold">{selectedReturnForEdit.reason}</span></div>
                {selectedReturnForEdit.description && (
                  <div className="text-[11px] text-[#5C4E42]">"{selectedReturnForEdit.description}"</div>
                )}
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Update Return Status *</label>
                <select
                  value={editReturnStatus}
                  onChange={(e) => setEditReturnStatus(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                >
                  <option value="Return Requested">Return Requested (Under Review)</option>
                  <option value="Approved">Approved (Schedule Pickup)</option>
                  <option value="Item Picked Up">Item Picked Up & In Transit to Workshop</option>
                  <option value="Inspected & Verified">Inspected & Verified by QC</option>
                  <option value="Refunded">Refunded (Amount Credited)</option>
                  <option value="Replacement Dispatched">Replacement Dispatched</option>
                  <option value="Rejected">Rejected (Claim Ineligible)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Refund Status</label>
                <select
                  value={editRefundStatus}
                  onChange={(e) => setEditRefundStatus(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing Refund</option>
                  <option value="Refunded">Refund Completed</option>
                  <option value="Not Applicable">Not Applicable (Replacement)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Internal Notes & Action Remarks</label>
                <textarea
                  rows={2}
                  value={editStaffNotes}
                  onChange={(e) => setEditStaffNotes(e.target.value)}
                  placeholder="e.g. Return approved. Carrier courier assigned for reverse pickup."
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium text-[#2C241D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReturnForEdit(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#5C4E42]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingReturn}
                  className="px-5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isUpdatingReturn ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PREVIEW PHOTO PROOF */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full border border-[#E2D7CB] shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2">
              <span className="font-extrabold text-xs text-[#2C241D]">Customer Damage / Defect Photo</span>
              <button onClick={() => setPreviewPhotoUrl(null)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={previewPhotoUrl} alt="Defect proof" className="w-full max-h-[70vh] object-contain rounded-2xl border border-[#E2D7CB]" />
          </div>
        </div>
      )}
    </div>
  );
};
