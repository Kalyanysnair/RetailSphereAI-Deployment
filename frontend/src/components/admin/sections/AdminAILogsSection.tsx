import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Search, 
  Cpu, 
  Layers, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X,
  FileCode,
  SlidersHorizontal,
  Bot
} from 'lucide-react';
import { fetchAdminAILogsDB } from '../../../services/api_admin';

export const AdminAILogsSection: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<any | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminAILogsDB(150);
      setLogs(data || []);
    } catch (err) {
      console.error('Error loading AI logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Metrics
  const totalLogs = logs.length;
  const visionCount = logs.filter(l => (l.analysis_type || '').toLowerCase().includes('vision')).length;
  const sheetOptimizerCount = logs.filter(l => (l.analysis_type || '').toLowerCase().includes('sheet') || (l.analysis_type || '').toLowerCase().includes('optimizer')).length;
  const inspectionCount = logs.filter(l => (l.analysis_type || '').toLowerCase().includes('material') || (l.analysis_type || '').toLowerCase().includes('timber')).length;
  const chatbotCount = logs.filter(l => (l.analysis_type || '').toLowerCase().includes('chat') || (l.analysis_type || '').toLowerCase().includes('assistant')).length;

  const uniqueTypes = Array.from(new Set(logs.map(l => l.analysis_type))).filter(Boolean);

  const filteredLogs = logs.filter(l => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q ||
      l.analysis_type?.toLowerCase().includes(q) ||
      l.input_payload?.toLowerCase().includes(q) ||
      l.output_result?.toLowerCase().includes(q);
    
    const matchType = typeFilter === 'ALL' || l.analysis_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="relative z-10 space-y-6 animate-fadeIn">

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Total AI Invocations</span>
          <div className="text-2xl font-black text-[#38A132]">{totalLogs} Runs</div>
          <span className="text-[10px] font-bold text-[#2A7E25] block">Active Intelligence Engine</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Vision & Inspection</span>
          <div className="text-2xl font-black text-[#2C241D]">{visionCount + inspectionCount} Runs</div>
          <span className="text-[10px] font-bold text-[#7A6C5E] block">Grain, Flaws & Timber Slabs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">2D Sheet Optimizations</span>
          <div className="text-2xl font-black text-[#38A132]">{sheetOptimizerCount} Runs</div>
          <span className="text-[10px] font-bold text-[#2A7E25] block">Kerf & Scrap Minimization</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] shadow-xs space-y-1">
          <span className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider block">Chat & Support Queries</span>
          <div className="text-2xl font-black text-[#2C241D]">{chatbotCount} Queries</div>
          <span className="text-[10px] font-bold text-[#7A6C5E] block">Domain Assistant Interactions</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-[#E2D7CB] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                typeFilter === 'ALL'
                  ? 'bg-[#38A132] text-white shadow-xs font-black'
                  : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
              }`}
            >
              All Types ({totalLogs})
            </button>

            {uniqueTypes.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  typeFilter === t
                    ? 'bg-[#2C241D] text-white shadow-xs font-black'
                    : 'bg-[#FAF7F2] text-[#5C4E42] border border-[#E2D7CB] hover:bg-[#EFE7DE]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search AI type, inputs, results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
            />
          </div>
        </div>

        {/* AI Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2D7CB] text-[11px] font-black uppercase text-[#7A6C5E] bg-[#FAF7F2]">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Analysis Engine</th>
                <th className="py-3 px-4">Input Summary</th>
                <th className="py-3 px-4">AI Recommendations / Output Summary</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2D7CB]/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#7A6C5E] font-bold">
                    <Sparkles className="w-8 h-8 text-[#9E9082] mx-auto opacity-40 mb-2" />
                    <div>No AI execution logs found matching criteria.</div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.log_id} className="hover:bg-[#FAF7F2]/60">
                    <td className="py-3 px-4 font-mono font-bold text-[#7A6C5E] whitespace-nowrap">
                      #{l.log_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#7A6C5E] whitespace-nowrap">
                      {l.created_at ? new Date(l.created_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8F5E9] border border-[#C8E6C9] text-[#1B5E20] text-[11px] font-extrabold whitespace-nowrap">
                        <Sparkles className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>{l.analysis_type}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5C4E42] max-w-xs truncate font-mono text-[11px]">
                      {l.input_payload || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#2C241D] max-w-sm truncate font-medium">
                      {l.output_result || 'Completed with success'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLogForDetail(l)}
                        className="px-2.5 py-1 bg-white hover:bg-[#FAF7F2] border border-[#E2D7CB] rounded-lg text-[11px] font-bold text-[#2C241D] inline-flex items-center gap-1 cursor-pointer hover:border-[#38A132]"
                      >
                        <Eye className="w-3 h-3 text-[#7A6C5E]" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT MODAL */}
      {selectedLogForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C241D]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border border-[#E2D7CB] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h4 className="text-sm font-black text-[#2C241D] flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#38A132]" />
                <span>AI Execution #{selectedLogForDetail.log_id} Details</span>
              </h4>
              <button onClick={() => setSelectedLogForDetail(null)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB]">
                <div>
                  <span className="text-[10px] text-[#7A6C5E] uppercase font-bold block">Engine Type</span>
                  <span className="font-extrabold text-[#2C241D]">{selectedLogForDetail.analysis_type}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#7A6C5E] uppercase font-bold block">Execution Timestamp</span>
                  <span className="font-mono text-[#5C4E42]">{selectedLogForDetail.created_at ? new Date(selectedLogForDetail.created_at).toLocaleString() : 'Recent'}</span>
                </div>
              </div>

              <div>
                <label className="block font-black text-[#2C241D] mb-1">Input Parameters / Payload:</label>
                <pre className="p-3 bg-[#1E1B18] text-[#34D399] rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {selectedLogForDetail.input_payload || 'No payload'}
                </pre>
              </div>

              <div>
                <label className="block font-black text-[#2C241D] mb-1">AI Output / Results & Recommendations:</label>
                <pre className="p-3 bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {selectedLogForDetail.output_result || 'No output result'}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLogForDetail(null)}
                className="px-5 py-2 rounded-xl bg-[#2C241D] text-white text-xs font-bold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
