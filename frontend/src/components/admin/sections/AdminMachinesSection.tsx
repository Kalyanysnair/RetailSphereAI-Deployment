import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  RotateCcw, 
  Plus, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Edit3, 
  Calendar, 
  User, 
  Clock, 
  ShieldCheck, 
  X,
  Layers,
  SlidersHorizontal
} from 'lucide-react';
import { 
  fetchAdminMachinesDB, 
  createAdminMachineDB, 
  updateAdminMachineStatusDB, 
  fetchAdminMachineMaintenanceDB, 
  addAdminMachineMaintenanceDB 
} from '../../../services/api_admin';

export const AdminMachinesSection: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'maintenance'>('directory');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [machines, setMachines] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);

  // Modals
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineCategory, setNewMachineCategory] = useState('CNC Cutting');
  const [isSubmittingMachine, setIsSubmittingMachine] = useState(false);

  const [selectedMachineForMaint, setSelectedMachineForMaint] = useState<any | null>(null);
  const [maintType, setMaintType] = useState('Routine');
  const [maintTech, setMaintTech] = useState('Workshop Engineering Team');
  const [maintDesc, setMaintDesc] = useState('');
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, logList] = await Promise.all([
        fetchAdminMachinesDB(),
        fetchAdminMachineMaintenanceDB()
      ]);
      setMachines(mList || []);
      setMaintenanceLogs(logList || []);
    } catch (err) {
      console.error('Error loading machinery data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineName.trim()) return;
    setIsSubmittingMachine(true);
    try {
      await createAdminMachineDB({
        machine_name: newMachineName.trim(),
        category: newMachineCategory.trim()
      });
      setActionMsg({ type: 'success', text: `Machine '${newMachineName}' registered successfully!` });
      setIsAddMachineModalOpen(false);
      setNewMachineName('');
      await loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to add machine.' });
      setTimeout(() => setActionMsg(null), 5000);
    } finally {
      setIsSubmittingMachine(false);
    }
  };

  const handleUpdateStatus = async (machineId: number, newStatus: string) => {
    try {
      await updateAdminMachineStatusDB(machineId, newStatus);
      setActionMsg({ type: 'success', text: `Machine #${machineId} status updated to ${newStatus}.` });
      await loadData();
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to update machine status.' });
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineForMaint || !maintDesc.trim()) return;
    setIsSubmittingMaint(true);
    try {
      await addAdminMachineMaintenanceDB(selectedMachineForMaint.machine_id, {
        description: maintDesc.trim(),
        performed_by: maintTech.trim() || 'Engineering Team',
        maintenance_type: maintType
      });
      setActionMsg({ type: 'success', text: `Maintenance logged for ${selectedMachineForMaint.machine_name}!` });
      setSelectedMachineForMaint(null);
      setMaintDesc('');
      await loadData();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Failed to log maintenance.' });
      setTimeout(() => setActionMsg(null), 5000);
    } finally {
      setIsSubmittingMaint(false);
    }
  };

  // Metrics
  const totalMachines = machines.length;
  const availableMachines = machines.filter(m => (m.status || '').toUpperCase() === 'AVAILABLE').length;
  const inUseMachines = machines.filter(m => (m.status || '').toUpperCase() === 'IN_USE').length;
  const maintenanceMachines = machines.filter(m => (m.status || '').toUpperCase() === 'MAINTENANCE' || (m.status || '').toUpperCase() === 'OFFLINE').length;

  // Filtered
  const filteredMachines = machines.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      m.machine_name.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      (m.current_worker_name && m.current_worker_name.toLowerCase().includes(q));
    
    const matchStatus = statusFilter === 'ALL' || (m.status || '').toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchStatus;
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
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Total Equipment</span>
          <div className="text-2xl font-black text-[#2C241D]">{totalMachines} Stations</div>
          <span className="text-[10px] font-bold text-[#38A132] block">Factory Floor Fleet</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Ready & Available</span>
          <div className="text-2xl font-black text-emerald-700">{availableMachines} Ready</div>
          <span className="text-[10px] font-bold text-emerald-800 block">Idle / Ready for Allocation</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Active in Production</span>
          <div className="text-2xl font-black text-blue-700">{inUseMachines} In Use</div>
          <span className="text-[10px] font-bold text-blue-800 block">Active Machining Jobs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Under Maintenance</span>
          <div className="text-2xl font-black text-amber-600">{maintenanceMachines} Offline</div>
          <span className="text-[10px] font-bold text-amber-800 block">Servicing & Calibration</span>
        </div>
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('directory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubTab === 'directory'
                  ? 'bg-[#38A132] text-white shadow-md'
                  : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Machinery Inventory ({machines.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('maintenance')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeSubTab === 'maintenance'
                  ? 'bg-[#2C241D] text-white shadow-md'
                  : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Maintenance & Servicing Ledger ({maintenanceLogs.length})</span>
            </button>
          </div>

          {activeSubTab === 'directory' && (
            <button
              onClick={() => setIsAddMachineModalOpen(true)}
              className="px-4 py-2 bg-[#38A132] hover:bg-[#2E8529] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Equipment Station</span>
            </button>
          )}
        </div>

        {/* SUB-VIEW 1: DIRECTORY */}
        {activeSubTab === 'directory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {['ALL', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OFFLINE'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      statusFilter === st
                        ? 'bg-[#2C241D] text-white'
                        : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
                    }`}
                  >
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search machine, category, operator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] bg-[#FAF7F2]">
                    <th className="py-3 px-4">Station ID</th>
                    <th className="py-3 px-4">Machinery Equipment</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Operating Status</th>
                    <th className="py-3 px-4">Active Operator</th>
                    <th className="py-3 px-4">Last Serviced</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D7CB]/60">
                  {filteredMachines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#7A6C5E] font-bold">
                        No machinery stations match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMachines.map((m) => (
                      <tr key={m.machine_id} className="hover:bg-[#FAF7F2]/60">
                        <td className="py-3 px-4 font-mono font-bold text-[#7A6C5E]">#{m.machine_id}</td>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-[#2C241D] flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-[#38A132]" />
                            <span>{m.machine_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E2D7CB] text-[#5C4E42] text-[10px] font-bold">
                            {m.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={m.status || 'AVAILABLE'}
                            onChange={(e) => handleUpdateStatus(m.machine_id, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border focus:outline-none ${
                              (m.status || '').toUpperCase() === 'AVAILABLE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : (m.status || '').toUpperCase() === 'IN_USE'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : (m.status || '').toUpperCase() === 'MAINTENANCE'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-stone-100 text-stone-700 border-stone-300'
                            }`}
                          >
                            <option value="AVAILABLE">AVAILABLE (Idle / Ready)</option>
                            <option value="IN_USE">IN_USE (Machining Active)</option>
                            <option value="MAINTENANCE">MAINTENANCE (Servicing)</option>
                            <option value="OFFLINE">OFFLINE (Decommissioned)</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#2C241D]">
                          {m.current_worker_name ? (
                            <span className="font-bold flex items-center gap-1">
                              <User className="w-3 h-3 text-[#7A6C5E]" />
                              {m.current_worker_name}
                            </span>
                          ) : (
                            <span className="text-[#7A6C5E] text-[10px]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#7A6C5E] whitespace-nowrap">
                          {m.last_serviced_at ? new Date(m.last_serviced_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedMachineForMaint(m);
                              setMaintType('Routine');
                              setMaintDesc('');
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-[#FAF7F2] border border-[#E2D7CB] rounded-lg text-[11px] font-bold text-[#2C241D] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Wrench className="w-3 h-3 text-[#7A6C5E]" />
                            <span>Log Service</span>
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

        {/* SUB-VIEW 2: MAINTENANCE LOGS */}
        {activeSubTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] bg-[#FAF7F2]">
                    <th className="py-3 px-4">Log ID</th>
                    <th className="py-3 px-4">Equipment Station</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Maintenance Type</th>
                    <th className="py-3 px-4">Servicing Details</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4 text-right">Serviced Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D7CB]/60">
                  {maintenanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#7A6C5E] font-bold">
                        No maintenance events logged yet. Use 'Log Service' from the equipment directory.
                      </td>
                    </tr>
                  ) : (
                    maintenanceLogs.map((log) => (
                      <tr key={log.maintenance_id} className="hover:bg-[#FAF7F2]/60">
                        <td className="py-3 px-4 font-mono font-bold text-[#7A6C5E]">#{log.maintenance_id}</td>
                        <td className="py-3 px-4 font-extrabold text-[#2C241D]">{log.machine_name}</td>
                        <td className="py-3 px-4 text-[#5C4E42]">{log.machine_category}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            log.maintenance_type === 'Repair'
                              ? 'bg-rose-100 text-rose-800'
                              : log.maintenance_type === 'Calibration'
                              ? 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.maintenance_type || 'Routine'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#3A2E24] max-w-sm">{log.description}</td>
                        <td className="py-3 px-4 font-bold text-[#2C241D]">{log.performed_by}</td>
                        <td className="py-3 px-4 text-right font-mono text-[11px] text-[#7A6C5E] whitespace-nowrap">
                          {log.serviced_date ? new Date(log.serviced_date).toLocaleString() : 'Recent'}
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

      {/* MODAL 1: ADD MACHINE */}
      {isAddMachineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E2D7CB] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h4 className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#38A132]" />
                <span>Register Machinery Station</span>
              </h4>
              <button onClick={() => setIsAddMachineModalOpen(false)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMachine} className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Station / Machine Name *</label>
                <input
                  type="text"
                  placeholder="e.g. CNC Router Heavy Duty #2"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Equipment Category *</label>
                <select
                  value={newMachineCategory}
                  onChange={(e) => setNewMachineCategory(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                >
                  <option value="CNC Cutting">CNC Cutting (High-Precision Timber Saws)</option>
                  <option value="Wood Shaper">Wood Shaper (Profiling & Moulding)</option>
                  <option value="CNC Router">CNC Router (3D Relief & Panel Routing)</option>
                  <option value="Edge Finisher">Edge Finisher (Automated Edge Banding)</option>
                  <option value="Sander">Sander (Orbital & Calibrated Surface Polishing)</option>
                  <option value="Metal Forging">Metal Forging (Custom Frame Welding)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMachineModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#5C4E42]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMachine}
                  className="px-5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmittingMachine ? 'Adding...' : 'Add Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG MAINTENANCE */}
      {selectedMachineForMaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E2D7CB] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h4 className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#38A132]" />
                <span>Log Maintenance: {selectedMachineForMaint.machine_name}</span>
              </h4>
              <button onClick={() => setSelectedMachineForMaint(null)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogMaintenance} className="space-y-3 text-xs">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Maintenance Type *</label>
                <select
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                >
                  <option value="Routine">Routine (Lubrication, Cleaning & Sensor Check)</option>
                  <option value="Repair">Repair (Component Fix / Part Replacement)</option>
                  <option value="Calibration">Calibration (Laser & Axis Alignment)</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Performed By (Technician / Crew) *</label>
                <input
                  type="text"
                  value={maintTech}
                  onChange={(e) => setMaintTech(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Servicing Details & Actions Taken *</label>
                <textarea
                  rows={3}
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="e.g. Cleaned router spindle, lubricated guide rails, calibrated laser zero point."
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium text-[#2C241D]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMachineForMaint(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#5C4E42]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMaint}
                  className="px-5 py-2 rounded-xl bg-[#38A132] hover:bg-[#2E8529] text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmittingMaint ? 'Logging...' : 'Save Maintenance Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
