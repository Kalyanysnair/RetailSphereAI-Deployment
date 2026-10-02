import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Edit3, 
  DollarSign, 
  Truck, 
  Scale, 
  Calendar, 
  Mail, 
  Check, 
  X,
  Layers,
  Globe
} from 'lucide-react';
import { 
  fetchAdminCarrierAgreementsDB, 
  createAdminCarrierAgreementDB,
  fetchAdminRateCardsDB,
  updateAdminRateCardDB,
  fetchAdminCarrierSettlementsDB,
  updateAdminSettlementStatusDB,
  fetchAdminPersonnelEmailChangeRequestsDB,
  reviewAdminPersonnelEmailChangeRequestDB
} from '../../../services/api_admin';
import { getCarrierPartnersApi, CarrierPartner } from '../../../services/api_carriers';

export const AdminCarrierGovernanceSection: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'agreements' | 'rate_cards' | 'settlements' | 'email_requests'>('agreements');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data State
  const [carrierPartners, setCarrierPartners] = useState<CarrierPartner[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [emailRequests, setEmailRequests] = useState<any[]>([]);

  // Modals State
  const [isAddAgreementModalOpen, setIsAddAgreementModalOpen] = useState(false);
  const [editingRateCard, setEditingRateCard] = useState<any | null>(null);
  const [reviewingEmailReq, setReviewingEmailReq] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // New Agreement Form State
  const [agrCarrierId, setAgrCarrierId] = useState<number>(0);
  const [agrNumber, setAgrNumber] = useState(`AGR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [agrTitle, setAgrTitle] = useState('Standard Regional Freight Agreement');
  const [agrEffectiveDate, setAgrEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [agrExpiryDate, setAgrExpiryDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [agrBasePayout, setAgrBasePayout] = useState(100);
  const [agrPerKmRate, setAgrPerKmRate] = useState(15);
  const [agrServicesCovered, setAgrServicesCovered] = useState('Standard Furniture Logistics, On-Site Delivery, Fragile Packaging Support');
  const [agrTransportationTerms, setAgrTransportationTerms] = useState('Carrier agrees to handle all freight with standard transit care and ensure 24-48h delivery SLA.');
  const [agrSettlementTerms, setAgrSettlementTerms] = useState('Settlements processed bi-weekly upon verified delivery confirmation proof.');
  const [agrCoverageArea, setAgrCoverageArea] = useState('All Regional Districts');
  const [isSubmittingAgreement, setIsSubmittingAgreement] = useState(false);

  // Rate Card Edit Form State
  const [editRateBase, setEditRateBase] = useState(100);
  const [editRatePerKm, setEditRatePerKm] = useState(15);
  const [editRateMin, setEditRateMin] = useState(100);
  const [editRateActive, setEditRateActive] = useState(true);
  const [isSavingRateCard, setIsSavingRateCard] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cpList, agrList, rcList, setList, emailList] = await Promise.all([
        getCarrierPartnersApi(),
        fetchAdminCarrierAgreementsDB(),
        fetchAdminRateCardsDB(),
        fetchAdminCarrierSettlementsDB(),
        fetchAdminPersonnelEmailChangeRequestsDB()
      ]);

      setCarrierPartners(cpList || []);
      setAgreements(agrList || []);
      setRateCards(rcList || []);
      setSettlements(setList || []);
      setEmailRequests(emailList || []);
      if (cpList && cpList.length > 0 && agrCarrierId === 0) {
        setAgrCarrierId(cpList[0].carrier_id);
      }
    } catch (err) {
      console.error('Error loading carrier governance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agrCarrierId) {
      alert('Please select a Carrier Partner');
      return;
    }
    setIsSubmittingAgreement(true);
    try {
      await createAdminCarrierAgreementDB({
        carrier_id: Number(agrCarrierId),
        agreement_number: agrNumber.trim(),
        title: agrTitle.trim(),
        effective_date: agrEffectiveDate,
        expiry_date: agrExpiryDate,
        services_covered: agrServicesCovered.trim(),
        transportation_terms: agrTransportationTerms.trim(),
        settlement_terms: agrSettlementTerms.trim(),
        coverage_area: agrCoverageArea.trim(),
        base_payout_rate: Number(agrBasePayout),
        per_km_payout_rate: Number(agrPerKmRate),
        status: 'ACTIVE'
      });
      setActionMsg({ type: 'success', text: `Agreement '${agrNumber}' registered successfully!` });
      setIsAddAgreementModalOpen(false);
      await loadAllData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to create carrier agreement.' });
      setTimeout(() => setActionMsg(null), 5000);
    } finally {
      setIsSubmittingAgreement(false);
    }
  };

  const handleSaveRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRateCard) return;
    setIsSavingRateCard(true);
    try {
      await updateAdminRateCardDB(editingRateCard.rate_id, {
        base_charge: Number(editRateBase),
        rate_per_km: Number(editRatePerKm),
        min_charge: Number(editRateMin),
        is_active: editRateActive
      });
      setActionMsg({ type: 'success', text: `Rate Card #${editingRateCard.rate_id} updated successfully!` });
      setEditingRateCard(null);
      await loadAllData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to update rate card.' });
      setTimeout(() => setActionMsg(null), 5000);
    } finally {
      setIsSavingRateCard(false);
    }
  };

  const handleUpdateSettlementStatus = async (settlementId: number, status: string) => {
    try {
      await updateAdminSettlementStatusDB(settlementId, status);
      setActionMsg({ type: 'success', text: `Settlement #${settlementId} marked as ${status}.` });
      await loadAllData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to update settlement status.' });
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  const handleReviewEmailRequest = async (action: 'APPROVE' | 'REJECT') => {
    if (!reviewingEmailReq) return;
    try {
      await reviewAdminPersonnelEmailChangeRequestDB(reviewingEmailReq.request_id, action, rejectionReasonInput || undefined);
      setActionMsg({ type: 'success', text: `Driver email update ${action === 'APPROVE' ? 'Approved' : 'Rejected'}.` });
      setReviewingEmailReq(null);
      setRejectionReasonInput('');
      await loadAllData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to review email request.' });
      setTimeout(() => setActionMsg(null), 5000);
    }
  };

  // KPI Calculations
  const totalSettlementValue = settlements.reduce((acc, s) => acc + (s.customer_charge || 0), 0);
  const totalCarrierPayout = settlements.reduce((acc, s) => acc + (s.carrier_payout || 0), 0);
  const totalNetMargin = settlements.reduce((acc, s) => acc + (s.service_margin || 0), 0);
  const pendingSettlementsCount = settlements.filter(s => (s.settlement_status || '').toUpperCase() === 'PENDING').length;
  const pendingEmailRequestsCount = emailRequests.filter(e => (e.status || '').toUpperCase() === 'PENDING').length;

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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Legal Agreements</span>
          <div className="text-2xl font-black text-[#2C241D]">{agreements.length} Contracts</div>
          <span className="text-[10px] font-bold text-[#38A132] block">
            {agreements.filter(a => (a.status || '').toUpperCase() === 'ACTIVE').length} Active Bonds
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Rate Card Tiers</span>
          <div className="text-2xl font-black text-blue-700">{rateCards.length} Types</div>
          <span className="text-[10px] font-bold text-blue-800 block">Standard, Fragile & Heavy</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Freight Value Billed</span>
          <div className="text-2xl font-black text-[#2C241D]">₹{Math.round(totalSettlementValue).toLocaleString('en-IN')}</div>
          <span className="text-[10px] font-bold text-[#38A132] block">
            Net Margin: ₹{Math.round(totalNetMargin).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Pending Actions</span>
          <div className="text-2xl font-black text-amber-600">{pendingSettlementsCount + pendingEmailRequestsCount}</div>
          <span className="text-[10px] font-bold text-amber-800 block">
            {pendingSettlementsCount} Settlements, {pendingEmailRequestsCount} Email Reqs
          </span>
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: 'agreements', label: `Carrier Agreements (${agreements.length})`, icon: FileText },
              { key: 'rate_cards', label: `Tariff Rate Cards (${rateCards.length})`, icon: Scale },
              { key: 'settlements', label: `Freight Settlements (${settlements.length})`, icon: DollarSign },
              { key: 'email_requests', label: `Driver Email Requests (${emailRequests.length})`, icon: Mail, badge: pendingEmailRequestsCount }
            ].map(tb => {
              const Icon = tb.icon;
              const isActive = activeSubTab === tb.key;
              return (
                <button
                  key={tb.key}
                  onClick={() => setActiveSubTab(tb.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#38A132] text-white shadow-md'
                      : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tb.label}</span>
                  {tb.badge !== undefined && tb.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white">
                      {tb.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeSubTab === 'agreements' && (
            <button
              onClick={() => setIsAddAgreementModalOpen(true)}
              className="px-4 py-2 bg-[#38A132] hover:bg-[#2E8529] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Carrier Agreement</span>
            </button>
          )}
        </div>

        {/* SUB-VIEW 1: CARRIER AGREEMENTS */}
        {activeSubTab === 'agreements' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] bg-[#FAF7F2]">
                    <th className="py-3 px-4">Agreement #</th>
                    <th className="py-3 px-4">Carrier Partner</th>
                    <th className="py-3 px-4">Title / Scope</th>
                    <th className="py-3 px-4">Validity Period</th>
                    <th className="py-3 px-4">Payout Structure</th>
                    <th className="py-3 px-4">Coverage Zone</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D7CB]/60">
                  {agreements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#7A6C5E] font-bold">
                        No carrier agreements registered. Click 'New Carrier Agreement' to create one.
                      </td>
                    </tr>
                  ) : (
                    agreements.map((a) => {
                      const cp = carrierPartners.find(c => c.carrier_id === a.carrier_id);
                      return (
                        <tr key={a.agreement_id} className="hover:bg-[#FAF7F2]/60">
                          <td className="py-3 px-4 font-mono font-bold text-[#2C241D] whitespace-nowrap">
                            {a.agreement_number}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-extrabold text-[#2C241D]">
                              {cp?.carrier_name || `Carrier #${a.carrier_id}`}
                            </div>
                            <div className="text-[10px] text-[#7A6C5E] font-mono">{cp?.contact_phone || cp?.contact_email || ''}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#2C241D]">{a.title}</div>
                            <div className="text-[10px] text-[#7A6C5E] max-w-xs truncate">{a.services_covered || a.transportation_terms}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#5C4E42] whitespace-nowrap">
                            <div>From: {a.effective_date}</div>
                            <div>To: {a.expiry_date}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-[#2C241D]">Base: ₹{a.base_payout_rate}</span>
                            <span className="text-[10px] text-[#7A6C5E] block">+ ₹{a.per_km_payout_rate} / km</span>
                          </td>
                          <td className="py-3 px-4 text-[#5C4E42] text-[11px]">
                            {a.coverage_area || 'All Hub Routes'}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              (a.status || '').toUpperCase() === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-stone-100 text-stone-700'
                            }`}>
                              {a.status || 'ACTIVE'}
                            </span>
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

        {/* SUB-VIEW 2: TARIFF RATE CARDS */}
        {activeSubTab === 'rate_cards' && (
          <div className="space-y-4">
            <p className="text-xs text-[#7A6C5E] font-medium">
              Rate cards govern customer freight pricing calculation based on distance, minimum haul charge, and service type tiers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rateCards.map((rc) => (
                <div key={rc.rate_id} className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2">
                    <span className="font-mono text-[10px] font-bold text-[#7A6C5E]">RATE #{rc.rate_id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      rc.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                    }`}>
                      {rc.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-[#2C241D]">{rc.service_type.replace(/_/g, ' ')}</h4>

                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white rounded-xl border border-[#E2D7CB]">
                    <div>
                      <span className="text-[9px] text-[#7A6C5E] uppercase font-bold block">Base Rate</span>
                      <span className="font-black text-xs text-[#2C241D]">₹{rc.base_charge}</span>
                    </div>
                    <div className="border-x border-[#E2D7CB]">
                      <span className="text-[9px] text-[#7A6C5E] uppercase font-bold block">Per KM</span>
                      <span className="font-black text-xs text-[#38A132]">₹{rc.rate_per_km}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#7A6C5E] uppercase font-bold block">Min Charge</span>
                      <span className="font-black text-xs text-[#2C241D]">₹{rc.min_charge}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingRateCard(rc);
                      setEditRateBase(rc.base_charge);
                      setEditRatePerKm(rc.rate_per_km);
                      setEditRateMin(rc.min_charge);
                      setEditRateActive(rc.is_active);
                    }}
                    className="w-full py-2 bg-white hover:bg-[#EFE7DE] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#7A6C5E]" />
                    <span>Edit Tariff Parameters</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-VIEW 3: FREIGHT SETTLEMENTS */}
        {activeSubTab === 'settlements' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] bg-[#FAF7F2]">
                    <th className="py-3 px-4">Settlement ID</th>
                    <th className="py-3 px-4">Order / Request</th>
                    <th className="py-3 px-4">Carrier Partner</th>
                    <th className="py-3 px-4">Distance</th>
                    <th className="py-3 px-4">Customer Billed</th>
                    <th className="py-3 px-4">Carrier Payout</th>
                    <th className="py-3 px-4">Net Margin</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D7CB]/60">
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-[#7A6C5E] font-bold">
                        No carrier settlements recorded yet. Completed fulfillment runs will populate here.
                      </td>
                    </tr>
                  ) : (
                    settlements.map((s) => (
                      <tr key={s.settlement_id} className="hover:bg-[#FAF7F2]/60">
                        <td className="py-3 px-4 font-mono font-bold text-[#7A6C5E]">#{s.settlement_id}</td>
                        <td className="py-3 px-4 font-bold text-[#2C241D]">
                          <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E2D7CB]">
                            {s.order_type} #{s.order_id}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-extrabold text-[#2C241D]">{s.carrier_name}</td>
                        <td className="py-3 px-4 font-mono">{s.distance_km} km</td>
                        <td className="py-3 px-4 font-bold text-[#2C241D]">₹{s.customer_charge}</td>
                        <td className="py-3 px-4 font-bold text-amber-700">₹{s.carrier_payout}</td>
                        <td className="py-3 px-4 font-bold text-[#38A132]">₹{s.service_margin}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            (s.settlement_status || '').toUpperCase() === 'SETTLED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.settlement_status || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(s.settlement_status || '').toUpperCase() !== 'SETTLED' && (
                            <button
                              onClick={() => handleUpdateSettlementStatus(s.settlement_id, 'SETTLED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                            >
                              Mark Settled
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

        {/* SUB-VIEW 4: DRIVER EMAIL CHANGE REQUESTS */}
        {activeSubTab === 'email_requests' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] bg-[#FAF7F2]">
                    <th className="py-3 px-4">Req #</th>
                    <th className="py-3 px-4">Driver / Personnel</th>
                    <th className="py-3 px-4">Carrier Agency</th>
                    <th className="py-3 px-4">Current Email</th>
                    <th className="py-3 px-4">Requested Email</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D7CB]/60">
                  {emailRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-[#7A6C5E] font-bold">
                        No driver email update requests submitted.
                      </td>
                    </tr>
                  ) : (
                    emailRequests.map((req) => (
                      <tr key={req.request_id} className="hover:bg-[#FAF7F2]/60">
                        <td className="py-3 px-4 font-mono font-bold text-[#7A6C5E]">#{req.request_id}</td>
                        <td className="py-3 px-4 font-extrabold text-[#2C241D]">{req.personnel_name}</td>
                        <td className="py-3 px-4 text-[#5C4E42]">{req.carrier_name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#7A6C5E]">{req.current_email}</td>
                        <td className="py-3 px-4 font-mono text-[11px] font-bold text-[#38A132]">{req.requested_email}</td>
                        <td className="py-3 px-4 text-[#5C4E42] max-w-xs truncate">{req.reason || 'Email update'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            (req.status || '').toUpperCase() === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : (req.status || '').toUpperCase() === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(req.status || '').toUpperCase() === 'PENDING' && (
                            <button
                              onClick={() => setReviewingEmailReq(req)}
                              className="px-3 py-1 bg-[#38A132] hover:bg-[#2E8529] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              Review
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
      </div>

      {/* MODAL 1: NEW CARRIER AGREEMENT */}
      {isAddAgreementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-[#E2D7CB] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h4 className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#38A132]" />
                <span>Create Carrier Partner Agreement</span>
              </h4>
              <button onClick={() => setIsAddAgreementModalOpen(false)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAgreement} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Select Carrier Partner *</label>
                <select
                  value={agrCarrierId}
                  onChange={(e) => setAgrCarrierId(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                  required
                >
                  {carrierPartners.map(c => (
                    <option key={c.carrier_id} value={c.carrier_id}>
                      {c.carrier_name} ({c.contact_phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Agreement Number *</label>
                  <input
                    type="text"
                    value={agrNumber}
                    onChange={(e) => setAgrNumber(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Agreement Title *</label>
                  <input
                    type="text"
                    value={agrTitle}
                    onChange={(e) => setAgrTitle(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Effective Date *</label>
                  <input
                    type="date"
                    value={agrEffectiveDate}
                    onChange={(e) => setAgrEffectiveDate(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={agrExpiryDate}
                    onChange={(e) => setAgrExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Base Payout Rate (₹) *</label>
                  <input
                    type="number"
                    value={agrBasePayout}
                    onChange={(e) => setAgrBasePayout(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Per KM Payout Rate (₹/km) *</label>
                  <input
                    type="number"
                    value={agrPerKmRate}
                    onChange={(e) => setAgrPerKmRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Coverage Area *</label>
                <input
                  type="text"
                  value={agrCoverageArea}
                  onChange={(e) => setAgrCoverageArea(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Services Covered</label>
                <textarea
                  rows={2}
                  value={agrServicesCovered}
                  onChange={(e) => setAgrServicesCovered(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium text-[#2C241D]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAgreementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#5C4E42]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAgreement}
                  className="px-5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmittingAgreement ? 'Registering...' : 'Register Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT RATE CARD */}
      {editingRateCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E2D7CB] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h4 className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#38A132]" />
                <span>Edit Tariff Rate: {editingRateCard.service_type}</span>
              </h4>
              <button onClick={() => setEditingRateCard(null)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRateCard} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Base Charge (₹) *</label>
                <input
                  type="number"
                  value={editRateBase}
                  onChange={(e) => setEditRateBase(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Rate Per KM (₹/km) *</label>
                <input
                  type="number"
                  value={editRatePerKm}
                  onChange={(e) => setEditRatePerKm(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Minimum Haul Charge (₹) *</label>
                <input
                  type="number"
                  value={editRateMin}
                  onChange={(e) => setEditRateMin(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeRateCheck"
                  checked={editRateActive}
                  onChange={(e) => setEditRateActive(e.target.checked)}
                  className="w-4 h-4 text-[#38A132] accent-[#38A132] rounded cursor-pointer"
                />
                <label htmlFor="activeRateCheck" className="font-bold text-[#2C241D] cursor-pointer">
                  Active in Dispatch Routing Engine
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRateCard(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#5C4E42]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRateCard}
                  className="px-5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSavingRateCard ? 'Saving...' : 'Save Parameters'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REVIEW DRIVER EMAIL REQUEST */}
      {reviewingEmailReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E2D7CB] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h4 className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#38A132]" />
                <span>Review Driver Email Change</span>
              </h4>
              <button onClick={() => setReviewingEmailReq(null)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div><strong>Driver:</strong> {reviewingEmailReq.personnel_name}</div>
              <div><strong>Carrier:</strong> {reviewingEmailReq.carrier_name}</div>
              <div><strong>Current Email:</strong> <span className="font-mono text-stone-600">{reviewingEmailReq.current_email}</span></div>
              <div><strong>Requested New Email:</strong> <span className="font-mono font-bold text-[#38A132]">{reviewingEmailReq.requested_email}</span></div>
              <div><strong>Reason:</strong> {reviewingEmailReq.reason || 'None specified'}</div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-[#7A6C5E]">Rejection Reason (if rejecting):</label>
              <input
                type="text"
                placeholder="e.g. Email address verification failed"
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleReviewEmailRequest('REJECT')}
                className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => handleReviewEmailRequest('APPROVE')}
                className="px-5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-bold"
              >
                Approve & Update Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
