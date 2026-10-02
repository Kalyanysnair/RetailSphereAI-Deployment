import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Plus,
  CheckCircle2,
  Clock,
  Upload,
  Cpu,
  Layers,
  FileText,
  Truck,
  MapPin,
  Navigation,
  PackageCheck,
  Map,
  Pause,
  Sliders,
  Check,
  Hammer
} from 'lucide-react';
import { openRazorpayCheckout } from '../../services/razorpay';
import { formatStatusLabel, getStatusBadgeColor } from '../../utils/statusUtils';
import { estimateTransportCostAPI } from '../../services/retailOrdersFulfillmentApi';
import { LeafletMapPicker } from '../common/LeafletMapPicker';
import { getStageSections, StageSection } from '../../utils/manufacturingSections';

export interface FulfillmentSummaryItem {
  fulfillment_id: number;
  job_type: string;
  fulfillment_status: string;
  delivery_status: string;
  tracking_number?: string;
  transportation_provider?: string;
  carrier?: string;
  carrier_name?: string;
  driver_name?: string;
  pickup_address?: string;
  destination_address?: string;
  distance_km?: number;
  transportation_charge?: number;
  expected_delivery_date?: string;
  dispatched_at?: string;
  delivered_at?: string;
}

export interface ProductionStageItem {
  stage_id: number;
  stage_name: string;
  sequence_order: number;
  status: string;
  progress_percentage: number;
  assigned_worker_name?: string;
  required_skill?: string;
  completed_sections?: string[];
  current_section?: string;
  pause_reason?: string;
  notes?: string;
}

export interface FabricationItem {
  fabrication_id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  service_type: string;
  material_source: string;
  customer_material_id?: number;
  dimensions: string;
  quantity: number;
  drawing_image?: string;
  requirements?: string;
  deadline?: string;
  estimated_price?: number;
  status: string; // REQUESTED, ASSESSED, QUOTED, APPROVED, PAID, IN_PRODUCTION, QC_PENDING, COMPLETED, CANCELLED
  payment_status?: string;
  material_arrival_mode?: string; // CUSTOMER_BRINGS vs DOORSTEP_PICKUP
  material_pickup_address?: string;
  material_pickup_distance_km?: number;
  material_pickup_charge?: number;
  return_delivery_mode?: string; // CUSTOMER_COLLECTS vs DOORSTEP_DELIVERY
  return_delivery_address?: string;
  return_delivery_distance_km?: number;
  return_delivery_charge?: number;
  fulfillments?: FulfillmentSummaryItem[];
  production_stages?: ProductionStageItem[];
  active_stage?: ProductionStageItem;
  overall_progress_percentage?: number;
  is_paused?: boolean;
  pause_reason?: string;
  created_at?: string;
}

export const FabricationTab: React.FC = () => {
  const [requests, setRequests] = useState<FabricationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);

  // Form State
  const [serviceType, setServiceType] = useState('Wood Cutting');
  const [materialSource, setMaterialSource] = useState('Company Stock Material');
  const [dimensions, setDimensions] = useState('2440mm x 1220mm x 18mm Sheet');
  const [quantity, setQuantity] = useState('1');
  const [drawingImage, setDrawingImage] = useState('');
  const [requirements, setRequirements] = useState('Precision edge trimming and smooth sanding required.');
  const [deadline, setDeadline] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Transportation Options Form State
  const [materialArrivalMode, setMaterialArrivalMode] = useState<'CUSTOMER_BRINGS' | 'DOORSTEP_PICKUP'>('CUSTOMER_BRINGS');
  const [materialPickupAddress, setMaterialPickupAddress] = useState('Kottayam, Kerala - 686001');
  const [pickupEstimate, setPickupEstimate] = useState<{ distance_km: number; calculated_charge: number } | null>(null);
  const [isPickupMapOpen, setIsPickupMapOpen] = useState(false);
  const [isDetectingPickupGps, setIsDetectingPickupGps] = useState(false);
  const [pickupGpsStatusMessage, setPickupGpsStatusMessage] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number }>({ lat: 9.5916, lng: 76.5222 });

  const [returnDeliveryMode, setReturnDeliveryMode] = useState<'CUSTOMER_COLLECTS' | 'DOORSTEP_DELIVERY'>('CUSTOMER_COLLECTS');
  const [returnDeliveryAddress, setReturnDeliveryAddress] = useState('Kottayam, Kerala - 686001');
  const [returnEstimate, setReturnEstimate] = useState<{ distance_km: number; calculated_charge: number } | null>(null);
  const [isDeliveryMapOpen, setIsDeliveryMapOpen] = useState(false);
  const [isDetectingDeliveryGps, setIsDetectingDeliveryGps] = useState(false);
  const [deliveryGpsStatusMessage, setDeliveryGpsStatusMessage] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number }>({ lat: 9.5916, lng: 76.5222 });

  const handleDetectPickupLocation = () => {
    if (!navigator.geolocation) {
      setPickupGpsStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingPickupGps(true);
    setPickupGpsStatusMessage('Acquiring high-accuracy GPS signal...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setPickupCoords({ lat, lng });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = addr.road || addr.suburb || addr.neighbourhood || addr.village || '';
            const houseNumber = addr.house_number ? `${addr.house_number}, ` : '';
            const suburb = addr.suburb || addr.town || addr.county || '';
            const state = addr.state || 'Kerala';
            const fetchedCity = addr.city || addr.town || addr.district || addr.county || 'Kottayam';
            const fetchedPincode = addr.postcode || '686001';

            const fullAddr = `${houseNumber}${road}${road && suburb ? ', ' : ''}${suburb}, ${fetchedCity}, ${state} - ${fetchedPincode}`.trim();
            const finalAddress = fullAddr || `GPS Pin (${lat}, ${lng})`;

            setMaterialPickupAddress(finalAddress);
            setIsDetectingPickupGps(false);
            setPickupGpsStatusMessage(`📍 Live GPS Detected: ${finalAddress}`);
            return;
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
        }

        setMaterialPickupAddress(`GPS Pin (${lat}, ${lng}), Kerala`);
        setIsDetectingPickupGps(false);
        setPickupGpsStatusMessage(`📍 Live GPS Coordinates Pinned: ${lat}° N, ${lng}° E`);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setIsDetectingPickupGps(false);
        setPickupGpsStatusMessage('📍 Could not detect GPS. Please pick on map or enter address manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handlePickupLocationSelect = (loc: { lat: number; lng: number; address: string; city: string; pincode: string }) => {
    setPickupCoords({ lat: loc.lat, lng: loc.lng });
    setMaterialPickupAddress(loc.address);
    setPickupGpsStatusMessage(`📍 Map Location Selected: ${loc.address}`);
  };

  const handleDetectDeliveryLocation = () => {
    if (!navigator.geolocation) {
      setDeliveryGpsStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingDeliveryGps(true);
    setDeliveryGpsStatusMessage('Acquiring high-accuracy GPS signal...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setDeliveryCoords({ lat, lng });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = addr.road || addr.suburb || addr.neighbourhood || addr.village || '';
            const houseNumber = addr.house_number ? `${addr.house_number}, ` : '';
            const suburb = addr.suburb || addr.town || addr.county || '';
            const state = addr.state || 'Kerala';
            const fetchedCity = addr.city || addr.town || addr.district || addr.county || 'Kottayam';
            const fetchedPincode = addr.postcode || '686001';

            const fullAddr = `${houseNumber}${road}${road && suburb ? ', ' : ''}${suburb}, ${fetchedCity}, ${state} - ${fetchedPincode}`.trim();
            const finalAddress = fullAddr || `GPS Pin (${lat}, ${lng})`;

            setReturnDeliveryAddress(finalAddress);
            setIsDetectingDeliveryGps(false);
            setDeliveryGpsStatusMessage(`📍 Live GPS Detected: ${finalAddress}`);
            return;
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
        }

        setReturnDeliveryAddress(`GPS Pin (${lat}, ${lng}), Kerala`);
        setIsDetectingDeliveryGps(false);
        setDeliveryGpsStatusMessage(`📍 Live GPS Coordinates Pinned: ${lat}° N, ${lng}° E`);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setIsDetectingDeliveryGps(false);
        setDeliveryGpsStatusMessage('📍 Could not detect GPS. Please pick on map or enter address manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleDeliveryLocationSelect = (loc: { lat: number; lng: number; address: string; city: string; pincode: string }) => {
    setDeliveryCoords({ lat: loc.lat, lng: loc.lng });
    setReturnDeliveryAddress(loc.address);
    setDeliveryGpsStatusMessage(`📍 Map Location Selected: ${loc.address}`);
  };

  // Optimizer State
  const [sheetW, setSheetW] = useState('2440');
  const [sheetH, setSheetH] = useState('1220');
  const [cutP1W, setCutP1W] = useState('600');
  const [cutP1H, setCutP1H] = useState('400');
  const [cutP1Qty, setCutP1Qty] = useState('4');
  const [cutP2W, setCutP2W] = useState('800');
  const [cutP2H, setCutP2H] = useState('300');
  const [cutP2Qty, setCutP2Qty] = useState('2');
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [processingActionId, setProcessingActionId] = useState<number | null>(null);
  const [expandedStepsMap, setExpandedStepsMap] = useState<Record<number, boolean>>({});

  const toggleCardSteps = (id: number) => {
    setExpandedStepsMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchFabrications = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const uEmail = user?.email || '';

      const res = await fetch(`/api/fabrication/requests?customer_email=${encodeURIComponent(uEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.warn('Error fetching fabrication requests:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFabrications(true);
  }, []);

  // Update transportation cost estimates dynamically
  useEffect(() => {
    if (materialArrivalMode === 'DOORSTEP_PICKUP' && materialPickupAddress.trim()) {
      estimateTransportCostAPI('FABRICATION_PICKUP', materialPickupAddress).then((est) => {
        if (est) setPickupEstimate({ distance_km: est.distance_km, calculated_charge: est.calculated_charge });
      });
    } else {
      setPickupEstimate(null);
    }
  }, [materialArrivalMode, materialPickupAddress]);

  useEffect(() => {
    if (returnDeliveryMode === 'DOORSTEP_DELIVERY' && returnDeliveryAddress.trim()) {
      estimateTransportCostAPI('FABRICATION_RETURN', returnDeliveryAddress).then((est) => {
        if (est) setReturnEstimate({ distance_km: est.distance_km, calculated_charge: est.calculated_charge });
      });
    } else {
      setReturnEstimate(null);
    }
  }, [returnDeliveryMode, returnDeliveryAddress]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setDrawingImage(data.url);
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;

      const payload = {
        customer_id: user?.customer_id || user?.user_id || 1,
        customer_email: user?.email || '',
        service_type: serviceType,
        material_source: materialSource,
        dimensions,
        quantity: parseInt(quantity) || 1,
        drawing_image: drawingImage,
        requirements,
        deadline: deadline || undefined,
        material_arrival_mode: materialArrivalMode,
        material_pickup_address: materialArrivalMode === 'DOORSTEP_PICKUP' ? materialPickupAddress : undefined,
        return_delivery_mode: returnDeliveryMode,
        return_delivery_address: returnDeliveryMode === 'DOORSTEP_DELIVERY' ? returnDeliveryAddress : undefined,
      };

      const res = await fetch('/api/fabrication/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsRequestModalOpen(false);
        setRequirements('');
        setDrawingImage('');
        fetchFabrications();
      }
    } catch (err) {
      console.error('Failed to create fabrication request:', err);
    }
  };

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const payload = {
        sheet_width: parseFloat(sheetW) || 2440.0,
        sheet_height: parseFloat(sheetH) || 1220.0,
        items: [
          { width: parseFloat(cutP1W) || 600, height: parseFloat(cutP1H) || 400, quantity: parseInt(cutP1Qty) || 1, label: 'Table Top Panels' },
          { width: parseFloat(cutP2W) || 800, height: parseFloat(cutP2H) || 300, quantity: parseInt(cutP2Qty) || 1, label: 'Side Shelves' },
        ],
      };

      const res = await fetch('/api/ai/optimize-cutting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setOptimizationResult(data);
      }
    } catch (err) {
      console.error('Cutting optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handlePayFabrication = async (r: FabricationItem) => {
    try {
      const rawUser = localStorage.getItem('user');
      const userObj = rawUser ? JSON.parse(rawUser) : null;
      
      let totalToPay = Number(r.estimated_price || 0);
      if (r.material_arrival_mode === 'DOORSTEP_PICKUP' && r.material_pickup_charge) {
        totalToPay += Number(r.material_pickup_charge);
      }
      if (r.return_delivery_mode === 'DOORSTEP_DELIVERY' && r.return_delivery_charge) {
        totalToPay += Number(r.return_delivery_charge);
      }

      const amountInPaise = Math.round(totalToPay * 100);

      await openRazorpayCheckout({
        amount: amountInPaise,
        name: 'RetailSphere Fabrication Studio',
        description: `Wood Fabrication Payment for FAB-#${r.fabrication_id} (${r.service_type})`,
        prefill: {
          name: userObj?.full_name || userObj?.username || 'Valued Customer',
          email: userObj?.email || 'customer@retailsphere.com',
          contact: userObj?.phone || '9876543210'
        },
        onSuccess: async () => {
          try {
            const res = await fetch(`/api/fabrication/requests/${r.fabrication_id}/pay`, { method: 'PUT' });
            if (res.ok) {
              fetchFabrications();
            }
          } catch (err) {
            console.error('Payment verification error:', err);
          }
        },
        onFailure: (reason) => {
          console.warn('Fabrication payment cancelled/failed:', reason);
        }
      });
    } catch (err) {
      console.error('Payment error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#FAF8F5] via-[#F4ECE1] to-[#FAF8F5] border-2 border-[#E2D7CB] text-[#1A1410] p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#2E8B29] bg-[#38A132]/15 px-3 py-1 rounded-full border border-[#38A132]/30 font-extrabold">
            Precision Workshop Services
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight text-[#1A1410]">Timber & Board Fabrication Studio</h2>
          <p className="text-xs text-[#5C4E42] font-semibold mt-1 max-w-xl">
            Custom wood cutting, shaping, edge profiling, drilling & surface finishing. Submit your technical drawings or use our AI 2D Sheet Cutting Optimizer tool!
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsOptimizerOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#FAF8F5] border-2 border-[#E2D7CB] text-[#1A1410] font-extrabold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-[#38A132]" /> 2D Cutting Optimizer
          </button>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold text-xs shadow-lg shadow-[#38A132]/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Request Fabrication
          </button>
        </div>
      </div>

      {/* Fabrication Request Cards */}
      {isLoading ? (
        <div className="py-12 text-center text-[#7A6C5E] text-xs font-bold">Loading fabrication requests...</div>
      ) : requests.length === 0 ? (
        <div className="bg-white/80 border-2 border-[#E2D7CB] rounded-3xl p-12 text-center space-y-4 backdrop-blur-md">
          <Scissors className="w-12 h-12 text-[#9E9082] mx-auto opacity-50" />
          <h3 className="text-base font-extrabold text-[#2C241D]">No Fabrication Requests Found</h3>
          <p className="text-xs text-[#7A6C5E] max-w-md mx-auto font-medium">
            Need timber cut to exact dimensions, edge profile routing, or CNC drilling? Submit your request with technical drawings or timber specifications.
          </p>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#48A63E] text-white text-xs font-bold hover:bg-[#3D9134] transition-all cursor-pointer shadow-sm"
          >
            Create Fabrication Request
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {requests.map((r) => {
            const hasPickup = r.material_arrival_mode === 'DOORSTEP_PICKUP' || r.material_arrival_mode === 'RETAILSPHERE_PICKUP';
            const hasReturn = r.return_delivery_mode === 'DOORSTEP_DELIVERY' || r.return_delivery_mode === 'RETAILSPHERE_DELIVERY';
            const pickupCost = hasPickup ? (Number(r.material_pickup_charge) || 0) : 0;
            const returnCost = hasReturn ? (Number(r.return_delivery_charge) || 0) : 0;
            const totalLogistics = pickupCost + returnCost;
            const quotePrice = Number(r.estimated_price) || 0;
            const finalTotalAmount = quotePrice + totalLogistics;
            const isPaid = r.payment_status === 'Paid';
            const isStepsExpanded = Boolean(expandedStepsMap[r.fabrication_id]);

            return (
              <div
                key={r.fabrication_id}
                className="bg-white border-2 border-[#E2D7CB] hover:border-[#38A132] rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Header Strip */}
                  <div className="flex items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2.5">
                    <span className="font-mono text-[10.5px] font-black text-[#38A132] bg-[#38A132]/10 px-2.5 py-1 rounded-lg border border-[#38A132]/25 shadow-2xs">
                      FAB-#{r.fabrication_id}
                    </span>
                    <span className={`${getStatusBadgeColor(r.status)} text-[10.5px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1`}>
                      {isPaid ? `Paid ✓ (₹${finalTotalAmount.toLocaleString('en-IN')})` : formatStatusLabel(r.status)}
                    </span>
                  </div>

                  {/* Title & Source Tag */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-black text-[#1C1814] tracking-tight leading-snug">
                        {r.service_type}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6B5C4D] bg-[#FAF8F5] border border-[#E2D7CB] px-2 py-0.5 rounded-md mt-1">
                        Source: {r.material_source}
                      </span>
                    </div>
                  </div>

                  {/* Compact 2x2 Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-[#FAF8F5] p-2.5 rounded-2xl border border-[#E2D7CB] text-xs">
                    <div className="bg-white p-2 rounded-xl border border-[#E2D7CB]/70 shadow-2xs">
                      <span className="text-[9.5px] font-black text-[#7A6C5E] uppercase tracking-wider block">
                        Dimensions
                      </span>
                      <span className="font-black text-[#1C1814] text-xs truncate block mt-0.5" title={r.dimensions}>
                        {r.dimensions}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-[#E2D7CB]/70 shadow-2xs">
                      <span className="text-[9.5px] font-black text-[#7A6C5E] uppercase tracking-wider block">
                        Quantity
                      </span>
                      <span className="font-black text-[#1C1814] text-xs block mt-0.5">
                        {r.quantity} pcs
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-[#E2D7CB]/70 shadow-2xs">
                      <span className="text-[9.5px] font-black text-[#7A6C5E] uppercase tracking-wider block">
                        Logistics
                      </span>
                      <span
                        className="font-black text-[#1C1814] text-[11px] truncate block mt-0.5"
                        title={hasPickup || hasReturn ? `Pickup (${hasPickup ? `₹${pickupCost}` : 'Self'}) + Delivery (${hasReturn ? `₹${returnCost}` : 'Self'})` : 'Self-Arranged (Bring & Collect)'}
                      >
                        {hasPickup && hasReturn ? `Pickup + Delivery (+₹${totalLogistics})` : hasPickup ? `Pickup (+₹${pickupCost})` : hasReturn ? `Delivery (+₹${returnCost})` : 'Self-Arranged'}
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl border shadow-2xs ${isPaid ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-[#E2D7CB]/70'}`}>
                      <span className={`text-[9.5px] font-black uppercase tracking-wider block ${isPaid ? 'text-emerald-700' : 'text-[#7A6C5E]'}`}>
                        {isPaid ? 'Amount Paid' : 'Total Quote'}
                      </span>
                      <span className={`font-black text-xs block mt-0.5 ${isPaid ? 'text-emerald-700' : 'text-[#38A132]'}`}>
                        ₹{finalTotalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Live Workshop Manufacturing Widget */}
                  {(isPaid || r.status === 'IN_PRODUCTION' || r.active_stage || (r.production_stages && r.production_stages.length > 0)) && (() => {
                    const activeStg = r.active_stage || (r.production_stages && r.production_stages.find(s => s.status === 'IN_PROGRESS' || s.status === 'PAUSED')) || (r.production_stages && r.production_stages[0]);
                    const stgName = activeStg ? activeStg.stage_name : r.service_type;
                    const sections = getStageSections(stgName, r.service_type);
                    const completedSections = activeStg ? (activeStg.completed_sections || []) : [];
                    const checkedCount = completedSections.length;
                    const totalSections = sections.length;
                    const isPaused = Boolean(r.is_paused || (activeStg && (activeStg.status === 'PAUSED' || activeStg.pause_reason)));
                    const pauseReason = r.pause_reason || (activeStg && activeStg.pause_reason) || 'Temporarily paused by artisan for curing/drying';
                    const progressPct = r.status === 'COMPLETED' || (activeStg && activeStg.status === 'COMPLETED')
                      ? 100
                      : totalSections > 0
                      ? Math.round((checkedCount / totalSections) * 100)
                      : (r.overall_progress_percentage || (activeStg ? activeStg.progress_percentage : 0));

                    return (
                      <div className="bg-gradient-to-br from-[#FAF8F5] to-[#F5ECE1]/60 p-3 rounded-2xl border border-[#E2D7CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Hammer className="w-3.5 h-3.5 text-[#38A132] shrink-0" />
                            <span className="text-xs font-black text-[#1C1814] truncate">
                              {stgName}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9.5px] uppercase shrink-0 ${
                            isPaused
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : r.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isPaused ? '⏸️ PAUSED' : activeStg ? activeStg.status : 'IN PRODUCTION'}
                          </span>
                        </div>

                        {/* Artisan Note if available */}
                        {activeStg && activeStg.assigned_worker_name && (
                          <div className="text-[10px] text-[#6B5C4D]">
                            Artisan: <strong className="text-[#1C1814]">{activeStg.assigned_worker_name}</strong>
                          </div>
                        )}

                        {/* Paused Alert */}
                        {isPaused && (
                          <div className="p-2 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-[10.5px] font-bold flex items-start gap-1.5">
                            <Pause className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                            <span className="text-[10px] leading-tight font-medium">{pauseReason}</span>
                          </div>
                        )}

                        {/* Progress Bar & Percentage */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-black text-[#7A6C5E] mb-1">
                            <span>Stage Completion</span>
                            <span className="font-mono text-xs font-black text-[#38A132]">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-[#E2D7CB] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                isPaused
                                  ? 'bg-amber-500'
                                  : progressPct >= 100
                                  ? 'bg-[#38A132]'
                                  : 'bg-gradient-to-r from-blue-500 to-[#38A132]'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Collapsible Procedural Steps Breakdown */}
                        {totalSections > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => toggleCardSteps(r.fabrication_id)}
                              className="w-full flex items-center justify-between py-1.5 px-2.5 text-[10px] font-black text-[#5C4E42] hover:text-[#2E8B29] bg-white/80 hover:bg-white rounded-xl border border-[#E2D7CB]/70 transition-all cursor-pointer shadow-2xs"
                            >
                              <span className="flex items-center gap-1.5">
                                <Sliders className="w-3 h-3 text-[#38A132]" />
                                <span>Steps: <strong>{checkedCount}/{totalSections} Done</strong></span>
                              </span>
                              <span className="text-[9.5px] font-bold text-[#38A132] hover:underline">
                                {isStepsExpanded ? 'Hide Steps ▲' : 'View Steps ▼'}
                              </span>
                            </button>

                            {isStepsExpanded && (
                              <div className="grid grid-cols-1 gap-1 pt-1.5 animate-fadeIn">
                                {sections.map((sec, idx) => {
                                  const isDone = completedSections.includes(sec.id);
                                  return (
                                    <div
                                      key={sec.id}
                                      className={`p-1.5 rounded-lg text-[10px] flex items-center justify-between border ${
                                        isDone
                                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-bold'
                                          : 'bg-white border-[#E2D7CB]/60 text-[#7A6C5E]'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {isDone ? (
                                          <div className="w-3 h-3 rounded-full bg-[#38A132] text-white flex items-center justify-center shrink-0">
                                            <Check className="w-2 h-2 stroke-[3]" />
                                          </div>
                                        ) : (
                                          <div className="w-3 h-3 rounded-full border border-[#B89768] shrink-0" />
                                        )}
                                        <span className={`truncate ${isDone ? 'text-emerald-900' : 'text-[#5C4E42]'}`}>
                                          {idx + 1}. {sec.title}
                                        </span>
                                      </div>
                                      <span className="text-[9px] font-mono text-[#7A6C5E] shrink-0 font-bold">+{sec.weightPct}%</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Requirements note */}
                  {r.requirements && (
                    <div className="text-[11px] text-[#5C4E42] bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#E2D7CB] flex items-center gap-1.5 truncate">
                      <span className="text-[10px] font-black uppercase text-[#9E9082] shrink-0">Note:</span>
                      <span className="truncate italic">"{r.requirements}"</span>
                    </div>
                  )}
                </div>

                {/* Footer and Actions */}
                <div className="pt-2 border-t border-[#EFE7DE] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#9E9082] font-semibold">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                    {isPaid ? (
                      <span className="text-[10.5px] font-black text-[#2E8B29] bg-[#38A132]/10 border border-[#38A132]/25 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        ✓ Paid in Full
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-black text-[#2C241D]">
                        {formatStatusLabel(r.status)}
                      </span>
                    )}
                  </div>

                  {quotePrice > 0 && !isPaid && (
                    <div>
                      {r.status === 'QUOTED' || r.status === 'CUSTOMER_APPROVAL_PENDING' ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex gap-2">
                            <button
                              disabled={processingActionId === r.fabrication_id}
                              onClick={async () => {
                                try {
                                  setProcessingActionId(r.fabrication_id);
                                  setRequests((prev) =>
                                    prev.map((item) =>
                                      item.fabrication_id === r.fabrication_id
                                        ? { ...item, status: 'APPROVED' }
                                        : item
                                    )
                                  );

                                  await fetch(`/api/fabrication/requests/${r.fabrication_id}/status`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'APPROVED' })
                                  });

                                  fetchFabrications(false);
                                } catch (e) {
                                  console.error('Error approving quotation:', e);
                                  fetchFabrications(false);
                                } finally {
                                  setProcessingActionId(null);
                                }
                              }}
                              className="flex-1 py-2 px-3 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-black cursor-pointer shadow-sm text-center disabled:opacity-60 transition-all active:scale-95"
                            >
                              {processingActionId === r.fabrication_id ? 'Approving...' : 'Approve Quotation'}
                            </button>
                            <button
                              disabled={processingActionId === r.fabrication_id}
                              onClick={async () => {
                                try {
                                  setProcessingActionId(r.fabrication_id);
                                  setRequests((prev) =>
                                    prev.map((item) =>
                                      item.fabrication_id === r.fabrication_id
                                        ? { ...item, status: 'REJECTED' }
                                        : item
                                    )
                                  );

                                  await fetch(`/api/fabrication/requests/${r.fabrication_id}/status`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'REJECTED' })
                                  });

                                  fetchFabrications(false);
                                } catch (e) {
                                  console.error('Error rejecting quotation:', e);
                                  fetchFabrications(false);
                                } finally {
                                  setProcessingActionId(null);
                                }
                              }}
                              className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-black cursor-pointer text-center disabled:opacity-60 transition-all active:scale-95"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : r.status === 'APPROVED' || r.status === 'CUSTOMER_APPROVED' ? (
                        <button
                          onClick={() => handlePayFabrication(r)}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-black cursor-pointer shadow-md shadow-[#38A132]/25 flex items-center justify-center gap-2 animate-fadeIn transition-all active:scale-98"
                        >
                          <span>
                            Pay Now (₹{((r.estimated_price || 0) + (hasPickup ? (r.material_pickup_charge || 0) : 0) + (hasReturn ? (r.return_delivery_charge || 0) : 0)).toLocaleString('en-IN')})
                          </span>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Fabrication Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">Request Wood Fabrication Service</h3>
                <p className="text-xs text-[#7A6C5E] font-medium">Precision cutting, shaping, drilling & edge finishing.</p>
              </div>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-[#7A6C5E] hover:text-[#2C241D] font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs font-semibold text-[#2C241D]">
              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Required Operation</label>
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                  <option value="Wood Cutting">Wood Cutting & Panel Sizing</option>
                  <option value="Wood Shaping">Wood Shaping & Contour Routing</option>
                  <option value="Precision Drilling">CNC Precision Drilling</option>
                  <option value="Edge Finishing">Edge Profile Finishing / Banding</option>
                  <option value="Surface Finishing">Surface Sanding & Satin Polish</option>
                  <option value="Custom Fabrication">Custom Mixed Fabrication</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Material Source</label>
                <select value={materialSource} onChange={(e) => setMaterialSource(e.target.value)} className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold">
                  <option value="Company Stock Material">Company Stock Material (Teak, Marine Ply, Oak)</option>
                  <option value="Customer-Owned Material">Customer-Owned Material (Registered Timber)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Target Dimensions</label>
                  <input type="text" value={dimensions} onChange={(e) => setDimensions(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Quantity (pcs)</label>
                  <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white font-bold" />
                </div>
              </div>

              {/* Transportation Options Section */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E2D7CB]">
                <h4 className="font-extrabold text-xs text-[#48A63E] uppercase flex items-center gap-1.5 border-b border-[#E2D7CB] pb-1.5">
                  <Truck className="w-4 h-4" /> Transportation & Logistics Requirements
                </h4>

                {/* 1. Material Arrival Mode */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase">1. Material Arrival</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`p-3 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition-all ${materialArrivalMode === 'CUSTOMER_BRINGS' ? 'border-[#48A63E] bg-[#48A63E]/5 font-bold' : 'border-[#E2D7CB] bg-white'}`}>
                      <input
                        type="radio"
                        name="materialArrivalMode"
                        checked={materialArrivalMode === 'CUSTOMER_BRINGS'}
                        onChange={() => setMaterialArrivalMode('CUSTOMER_BRINGS')}
                        className="accent-[#48A63E]"
                      />
                      <span>I will bring the material myself</span>
                    </label>

                    <label className={`p-3 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition-all ${materialArrivalMode === 'DOORSTEP_PICKUP' ? 'border-[#48A63E] bg-[#48A63E]/5 font-bold' : 'border-[#E2D7CB] bg-white'}`}>
                      <input
                        type="radio"
                        name="materialArrivalMode"
                        checked={materialArrivalMode === 'DOORSTEP_PICKUP'}
                        onChange={() => setMaterialArrivalMode('DOORSTEP_PICKUP')}
                        className="accent-[#48A63E]"
                      />
                      <span>Arrange pickup from my location</span>
                    </label>
                  </div>

                  {materialArrivalMode === 'DOORSTEP_PICKUP' && (
                    <div className="space-y-2 pt-1 pl-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <label className="text-[10px] text-[#7A6C5E] font-bold">Pickup Location Address:</label>

                        <div className="flex items-center gap-2">
                          {/* Current Location / Detect GPS Button */}
                          <button
                            type="button"
                            onClick={handleDetectPickupLocation}
                            disabled={isDetectingPickupGps}
                            className="px-2.5 py-1 rounded-lg bg-[#48A63E]/10 hover:bg-[#48A63E]/20 text-[#48A63E] border border-[#48A63E]/30 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all"
                            title="Detect current location using GPS"
                          >
                            <Navigation className={`w-3 h-3 ${isDetectingPickupGps ? 'animate-spin' : ''}`} />
                            <span>{isDetectingPickupGps ? 'Locating...' : 'Current Location'}</span>
                          </button>

                          {/* Pick on Map Toggle Button */}
                          <button
                            type="button"
                            onClick={() => setIsPickupMapOpen(!isPickupMapOpen)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all border ${
                              isPickupMapOpen
                                ? 'bg-[#2C241D] text-white border-[#2C241D]'
                                : 'bg-white text-[#2C241D] border-[#E2D7CB] hover:bg-[#FAF7F2]'
                            }`}
                          >
                            <Map className="w-3 h-3 text-[#48A63E]" />
                            <span>{isPickupMapOpen ? 'Hide Map' : 'Map Option 🗺️'}</span>
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={materialPickupAddress}
                        onChange={(e) => setMaterialPickupAddress(e.target.value)}
                        placeholder="House / Street, Landmark, City, Pincode"
                        required
                        className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] text-xs font-semibold"
                      />

                      {/* GPS Status Message Feedback */}
                      {pickupGpsStatusMessage && (
                        <p className="text-[10px] text-[#48A63E] font-bold flex items-center gap-1 bg-[#48A63E]/10 p-2 rounded-lg border border-[#48A63E]/20">
                          {pickupGpsStatusMessage}
                        </p>
                      )}

                      {/* Leaflet Map Interactive Pin Drawer */}
                      {isPickupMapOpen && (
                        <div className="pt-1 animate-fadeIn">
                          <LeafletMapPicker
                            initialLat={pickupCoords.lat}
                            initialLng={pickupCoords.lng}
                            onLocationSelect={handlePickupLocationSelect}
                          />
                        </div>
                      )}

                      {pickupEstimate && (
                        <div className="flex justify-between items-center text-[10px] text-[#48A63E] font-bold bg-[#48A63E]/10 p-2 rounded-lg border border-[#48A63E]/20">
                          <span>Est. Distance: {pickupEstimate.distance_km} km</span>
                          <span>Pickup Transportation Charge: ₹{pickupEstimate.calculated_charge}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Return Delivery Mode */}
                <div className="space-y-2 pt-2 border-t border-[#E2D7CB]">
                  <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase">2. After Fabrication Completion</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`p-3 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition-all ${returnDeliveryMode === 'CUSTOMER_COLLECTS' ? 'border-[#48A63E] bg-[#48A63E]/5 font-bold' : 'border-[#E2D7CB] bg-white'}`}>
                      <input
                        type="radio"
                        name="returnDeliveryMode"
                        checked={returnDeliveryMode === 'CUSTOMER_COLLECTS'}
                        onChange={() => setReturnDeliveryMode('CUSTOMER_COLLECTS')}
                        className="accent-[#48A63E]"
                      />
                      <span>I will collect it myself</span>
                    </label>

                    <label className={`p-3 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition-all ${returnDeliveryMode === 'DOORSTEP_DELIVERY' ? 'border-[#48A63E] bg-[#48A63E]/5 font-bold' : 'border-[#E2D7CB] bg-white'}`}>
                      <input
                        type="radio"
                        name="returnDeliveryMode"
                        checked={returnDeliveryMode === 'DOORSTEP_DELIVERY'}
                        onChange={() => setReturnDeliveryMode('DOORSTEP_DELIVERY')}
                        className="accent-[#48A63E]"
                      />
                      <span>Arrange delivery to my address</span>
                    </label>
                  </div>

                  {returnDeliveryMode === 'DOORSTEP_DELIVERY' && (
                    <div className="space-y-2 pt-1 pl-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <label className="text-[10px] text-[#7A6C5E] font-bold">Destination Delivery Address:</label>

                        <div className="flex items-center gap-2">
                          {/* Current Location / Detect GPS Button */}
                          <button
                            type="button"
                            onClick={handleDetectDeliveryLocation}
                            disabled={isDetectingDeliveryGps}
                            className="px-2.5 py-1 rounded-lg bg-[#48A63E]/10 hover:bg-[#48A63E]/20 text-[#48A63E] border border-[#48A63E]/30 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all"
                            title="Detect current location using GPS"
                          >
                            <Navigation className={`w-3 h-3 ${isDetectingDeliveryGps ? 'animate-spin' : ''}`} />
                            <span>{isDetectingDeliveryGps ? 'Locating...' : 'Current Location'}</span>
                          </button>

                          {/* Pick on Map Toggle Button */}
                          <button
                            type="button"
                            onClick={() => setIsDeliveryMapOpen(!isDeliveryMapOpen)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all border ${
                              isDeliveryMapOpen
                                ? 'bg-[#2C241D] text-white border-[#2C241D]'
                                : 'bg-white text-[#2C241D] border-[#E2D7CB] hover:bg-[#FAF7F2]'
                            }`}
                          >
                            <Map className="w-3 h-3 text-[#48A63E]" />
                            <span>{isDeliveryMapOpen ? 'Hide Map' : 'Map Option 🗺️'}</span>
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={returnDeliveryAddress}
                        onChange={(e) => setReturnDeliveryAddress(e.target.value)}
                        placeholder="House / Street, Landmark, City, Pincode"
                        required
                        className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] text-xs font-semibold"
                      />

                      {/* GPS Status Message Feedback */}
                      {deliveryGpsStatusMessage && (
                        <p className="text-[10px] text-[#48A63E] font-bold flex items-center gap-1 bg-[#48A63E]/10 p-2 rounded-lg border border-[#48A63E]/20">
                          {deliveryGpsStatusMessage}
                        </p>
                      )}

                      {/* Leaflet Map Interactive Pin Drawer */}
                      {isDeliveryMapOpen && (
                        <div className="pt-1 animate-fadeIn">
                          <LeafletMapPicker
                            initialLat={deliveryCoords.lat}
                            initialLng={deliveryCoords.lng}
                            onLocationSelect={handleDeliveryLocationSelect}
                          />
                        </div>
                      )}

                      {returnEstimate && (
                        <div className="flex justify-between items-center text-[10px] text-[#48A63E] font-bold bg-[#48A63E]/10 p-2 rounded-lg border border-[#48A63E]/20">
                          <span>Est. Distance: {returnEstimate.distance_km} km</span>
                          <span>Return Delivery Charge: ₹{returnEstimate.calculated_charge}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Technical Drawing / Diagram (Optional)</label>
                <div className="flex items-center gap-3">
                  <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="text-xs text-[#7A6C5E] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#48A63E] file:text-white cursor-pointer" />
                  {isUploading && <span className="text-[10px] text-[#48A63E] font-bold animate-pulse">Uploading...</span>}
                </div>
                {drawingImage && <p className="text-[10px] text-[#48A63E] font-bold mt-1">Drawing attached ✓</p>}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase mb-1">Additional Requirements</label>
                <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} placeholder="Tolerance specs, edge bevel angles, hole diameters..." className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white" />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E2D7CB]">
                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-[#E2D7CB] text-[#7A6C5E] font-bold hover:bg-white cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md cursor-pointer">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2D Cutting Optimization Visualizer Tool Modal */}
      {isOptimizerOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#48A63E]" />
                <div>
                  <h3 className="text-base font-extrabold text-[#2C241D]">AI 2D Sheet Cutting Optimizer Tool</h3>
                  <p className="text-xs text-[#7A6C5E] font-medium">Algorithmic Bin-Packing Layout Solver for Timber & Plywood Sheet Cutting.</p>
                </div>
              </div>
              <button onClick={() => setIsOptimizerOpen(false)} className="text-[#7A6C5E] hover:text-[#2C241D] font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-[#2C241D]">
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E2D7CB]">
                <h4 className="font-extrabold text-xs text-[#48A63E] uppercase border-b border-[#E2D7CB] pb-1">1. Stock Sheet Dimensions (mm)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#7A6C5E]">Width (mm):</label>
                    <input type="number" value={sheetW} onChange={(e) => setSheetW(e.target.value)} className="w-full p-2 border border-[#E2D7CB] rounded-lg" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#7A6C5E]">Height (mm):</label>
                    <input type="number" value={sheetH} onChange={(e) => setSheetH(e.target.value)} className="w-full p-2 border border-[#E2D7CB] rounded-lg" />
                  </div>
                </div>

                <h4 className="font-extrabold text-xs text-[#48A63E] uppercase border-b border-[#E2D7CB] pb-1 pt-2">2. Cut Pieces Required</h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={cutP1W} onChange={(e) => setCutP1W(e.target.value)} placeholder="W1" className="p-2 border border-[#E2D7CB] rounded-lg text-center" />
                    <input type="number" value={cutP1H} onChange={(e) => setCutP1H(e.target.value)} placeholder="H1" className="p-2 border border-[#E2D7CB] rounded-lg text-center" />
                    <input type="number" value={cutP1Qty} onChange={(e) => setCutP1Qty(e.target.value)} placeholder="Qty1" className="p-2 border border-[#E2D7CB] rounded-lg text-center font-bold text-[#48A63E]" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={cutP2W} onChange={(e) => setCutP2W(e.target.value)} placeholder="W2" className="p-2 border border-[#E2D7CB] rounded-lg text-center" />
                    <input type="number" value={cutP2H} onChange={(e) => setCutP2H(e.target.value)} placeholder="H2" className="p-2 border border-[#E2D7CB] rounded-lg text-center" />
                    <input type="number" value={cutP2Qty} onChange={(e) => setCutP2Qty(e.target.value)} placeholder="Qty2" className="p-2 border border-[#E2D7CB] rounded-lg text-center font-bold text-[#48A63E]" />
                  </div>
                </div>

                <button
                  onClick={handleRunOptimizer}
                  disabled={isOptimizing}
                  className="w-full py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs transition-all shadow-md cursor-pointer mt-2"
                >
                  {isOptimizing ? 'Running Guillotine Bin-Packing Solver...' : 'Calculate Optimal Cutting Plan'}
                </button>
              </div>

              {/* Cutting Visualization Diagram & Metrics */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-3">
                <h4 className="font-extrabold text-xs text-[#2C241D] uppercase border-b border-[#E2D7CB] pb-1">Optimization Metrics & Cutting Canvas</h4>

                {optimizationResult ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl">
                        <span className="text-[10px] text-emerald-800 font-bold block">Utilization Rate</span>
                        <span className="text-base font-extrabold text-emerald-700">{optimizationResult.material_utilization_percent}%</span>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl">
                        <span className="text-[10px] text-amber-800 font-bold block">Predicted Scrap Waste</span>
                        <span className="text-base font-extrabold text-amber-700">{optimizationResult.waste_percent}%</span>
                      </div>
                    </div>

                    {/* Canvas Representation */}
                    <div className="relative aspect-[2/1] w-full bg-[#2C241D] rounded-xl overflow-hidden border-2 border-[#E2D7CB] p-2 flex items-center justify-center">
                      <div className="relative w-full h-full bg-[#8C6D4F] rounded border border-amber-200/50">
                        {optimizationResult.placed_layout.map((item: any) => (
                          <div
                            key={item.id}
                            style={{
                              left: `${(item.x / optimizationResult.sheet_dimensions.width) * 100}%`,
                              top: `${(item.y / optimizationResult.sheet_dimensions.height) * 100}%`,
                              width: `${(item.width / optimizationResult.sheet_dimensions.width) * 100}%`,
                              height: `${(item.height / optimizationResult.sheet_dimensions.height) * 100}%`,
                            }}
                            className="absolute bg-[#48A63E]/90 border border-white text-white text-[8px] font-extrabold flex items-center justify-center shadow-xs overflow-hidden"
                          >
                            {item.id}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-[10px] text-[#7A6C5E] space-y-1">
                      <p className="font-bold text-[#2C241D]">Cutting Instructions:</p>
                      {optimizationResult.cutting_sequence_instructions.map((inst: string, idx: number) => (
                        <p key={idx}>• {inst}</p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-[#7A6C5E] text-xs">
                    Click "Calculate Optimal Cutting Plan" to render visual cutting map and calculate timber waste %.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
