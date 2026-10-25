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
  Hammer,
  Home,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { openRazorpayCheckout } from '../../services/razorpay';
import { formatStatusLabel, getStatusBadgeColor } from '../../utils/statusUtils';
import { estimateTransportCostAPI } from '../../services/retailOrdersFulfillmentApi';
import { LeafletMapPicker } from '../common/LeafletMapPicker';
import { getCurrentUser, validateAddressApi } from '../../services/api';
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
  cutting_layout?: any;
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
  const navigate = useNavigate();
  const [requests, setRequests] = useState<FabricationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [selectedStrategyIdx, setSelectedStrategyIdx] = useState(0);
  const [attachedCuttingLayoutJson, setAttachedCuttingLayoutJson] = useState('');
  const [viewingBlueprintModal, setViewingBlueprintModal] = useState<any | null>(null);

  // Form State
  const [serviceType, setServiceType] = useState('Wood Cutting');
  const [materialSource, setMaterialSource] = useState('Company Stock Material');
  const [customerMaterials, setCustomerMaterials] = useState<any[]>([]);
  const [selectedCustomerMaterialId, setSelectedCustomerMaterialId] = useState<string>('');
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
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

  // User Saved Account Profile Address
  const [userProfileAddress, setUserProfileAddress] = useState<string | null>(null);

  useEffect(() => {
    const initProfile = async () => {
      try {
        const u = await getCurrentUser();
        if (u?.customer?.address) {
          const c = u.customer;
          const full = [c.address, c.city, c.pincode ? `- ${c.pincode}` : ''].filter(Boolean).join(', ');
          if (full.trim().length > 3) {
            setUserProfileAddress(full);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not fetch user profile from API:', e);
      }

      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          const addr = u.customer?.address || u.address || '';
          const city = u.customer?.city || u.city || '';
          const pin = u.customer?.pincode || u.pincode || '';
          const full = [addr, city, pin ? `- ${pin}` : ''].filter(Boolean).join(', ');
          if (full.trim().length > 3) {
            setUserProfileAddress(full);
          }
        }
      } catch (err) {
        console.warn('Could not read user profile address:', err);
      }
    };
    initProfile();
  }, []);

  useEffect(() => {
    if (materialSource === 'Customer-Owned Material') {
      const loadCustMaterials = async () => {
        try {
          setIsLoadingMaterials(true);
          const rawUser = localStorage.getItem('user');
          const user = rawUser ? JSON.parse(rawUser) : null;
          const uEmail = user?.email || '';
          const res = await fetch(`/api/materials/customer?customer_email=${encodeURIComponent(uEmail)}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setCustomerMaterials(data);
              if (data.length > 0 && !selectedCustomerMaterialId) {
                setSelectedCustomerMaterialId(String(data[0].material_id));
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load customer materials:', e);
        } finally {
          setIsLoadingMaterials(false);
        }
      };
      loadCustMaterials();
    }
  }, [materialSource]);

  const handleUseProfileAddressForPickup = () => {
    if (!userProfileAddress) {
      setPickupGpsStatusMessage('ℹ️ No saved profile address found. Please enter your address or search on the map.');
      return;
    }
    setMaterialPickupAddress(userProfileAddress);
    setPickupCoords({ lat: 9.5916, lng: 76.5222 });
    setPickupGpsStatusMessage(`🏠 Using Saved Profile Address: ${userProfileAddress}`);
  };

  const handleUseProfileAddressForDelivery = () => {
    if (!userProfileAddress) {
      setDeliveryGpsStatusMessage('ℹ️ No saved profile address found. Please enter your address or search on the map.');
      return;
    }
    setReturnDeliveryAddress(userProfileAddress);
    setDeliveryCoords({ lat: 9.5916, lng: 76.5222 });
    setDeliveryGpsStatusMessage(`🏠 Using Saved Profile Address: ${userProfileAddress}`);
  };

  const handleDetectPickupLocation = async () => {
    setIsDetectingPickupGps(true);
    setPickupGpsStatusMessage('Detecting current location...');

    let resolvedAddress = userProfileAddress;
    if (!resolvedAddress) {
      try {
        const u = await getCurrentUser();
        if (u?.customer?.address) {
          const c = u.customer;
          const full = [c.address, c.city, c.pincode ? `- ${c.pincode}` : ''].filter(Boolean).join(', ');
          if (full.trim().length > 3) {
            resolvedAddress = full;
            setUserProfileAddress(full);
          }
        }
      } catch (err) {
        console.warn('Failed to load profile address:', err);
      }
    }

    const defaultFallback = resolvedAddress || 'Central Junction, Kottayam, Kerala - 686001';

    if (!navigator.geolocation) {
      setMaterialPickupAddress(defaultFallback);
      setPickupCoords({ lat: 9.5916, lng: 76.5222 });
      setIsDetectingPickupGps(false);
      setPickupGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const accuracy = Math.round(pos.coords.accuracy || 0);

        // Check if browser returns Trivandrum ISP gateway (laptop connected to Wi-Fi/Jio broadband)
        const isTrivandrumIsp =
          accuracy > 1500 ||
          lat < 8.7 ||
          (lat >= 8.3 && lat <= 8.7 && lng >= 76.8 && lng <= 77.1);

        if (isTrivandrumIsp) {
          setIsDetectingPickupGps(false);
          setMaterialPickupAddress(defaultFallback);
          setPickupCoords({ lat: 9.5916, lng: 76.5222 });
          setPickupGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
          return;
        }

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

            if (
              finalAddress.toLowerCase().includes('thiruvananthapuram') ||
              finalAddress.toLowerCase().includes('kowdiar') ||
              finalAddress.toLowerCase().includes('nalanda')
            ) {
              setIsDetectingPickupGps(false);
              setMaterialPickupAddress(defaultFallback);
              setPickupCoords({ lat: 9.5916, lng: 76.5222 });
              setPickupGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
              return;
            }

            setPickupCoords({ lat, lng });
            setMaterialPickupAddress(finalAddress);
            setIsDetectingPickupGps(false);
            setPickupGpsStatusMessage(`📍 Current Location: ${finalAddress}`);
            return;
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
        }

        setMaterialPickupAddress(defaultFallback);
        setPickupCoords({ lat: 9.5916, lng: 76.5222 });
        setIsDetectingPickupGps(false);
        setPickupGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setMaterialPickupAddress(defaultFallback);
        setPickupCoords({ lat: 9.5916, lng: 76.5222 });
        setIsDetectingPickupGps(false);
        setPickupGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  const handlePickupLocationSelect = (loc: { lat: number; lng: number; address: string; city: string; pincode: string }) => {
    setPickupCoords({ lat: loc.lat, lng: loc.lng });
    setMaterialPickupAddress(loc.address);
    setPickupGpsStatusMessage(`📍 Map Location Selected: ${loc.address}`);
  };

  const handleDetectDeliveryLocation = async () => {
    setIsDetectingDeliveryGps(true);
    setDeliveryGpsStatusMessage('Detecting current location...');

    let resolvedAddress = userProfileAddress;
    if (!resolvedAddress) {
      try {
        const u = await getCurrentUser();
        if (u?.customer?.address) {
          const c = u.customer;
          const full = [c.address, c.city, c.pincode ? `- ${c.pincode}` : ''].filter(Boolean).join(', ');
          if (full.trim().length > 3) {
            resolvedAddress = full;
            setUserProfileAddress(full);
          }
        }
      } catch (err) {
        console.warn('Failed to load profile address:', err);
      }
    }

    const defaultFallback = resolvedAddress || 'Central Junction, Kottayam, Kerala - 686001';

    if (!navigator.geolocation) {
      setReturnDeliveryAddress(defaultFallback);
      setDeliveryCoords({ lat: 9.5916, lng: 76.5222 });
      setIsDetectingDeliveryGps(false);
      setDeliveryGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const accuracy = Math.round(pos.coords.accuracy || 0);

        // Check if browser returns Trivandrum ISP gateway (laptop connected to Wi-Fi/Jio broadband)
        const isTrivandrumIsp =
          accuracy > 1500 ||
          lat < 8.7 ||
          (lat >= 8.3 && lat <= 8.7 && lng >= 76.8 && lng <= 77.1);

        if (isTrivandrumIsp) {
          setIsDetectingDeliveryGps(false);
          setReturnDeliveryAddress(defaultFallback);
          setDeliveryCoords({ lat: 9.5916, lng: 76.5222 });
          setDeliveryGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
          return;
        }

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

            if (
              finalAddress.toLowerCase().includes('thiruvananthapuram') ||
              finalAddress.toLowerCase().includes('kowdiar') ||
              finalAddress.toLowerCase().includes('nalanda')
            ) {
              setIsDetectingDeliveryGps(false);
              setReturnDeliveryAddress(defaultFallback);
              setDeliveryCoords({ lat: 9.5916, lng: 76.5222 });
              setDeliveryGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
              return;
            }

            setDeliveryCoords({ lat, lng });
            setReturnDeliveryAddress(finalAddress);
            setIsDetectingDeliveryGps(false);
            setDeliveryGpsStatusMessage(`📍 Current Location: ${finalAddress}`);
            return;
          }
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
        }

        setReturnDeliveryAddress(defaultFallback);
        setDeliveryCoords({ lat: 9.5916, lng: 76.5222 });
        setIsDetectingDeliveryGps(false);
        setDeliveryGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setReturnDeliveryAddress(defaultFallback);
        setDeliveryCoords({ lat: 9.5916, lng: 76.5222 });
        setIsDetectingDeliveryGps(false);
        setDeliveryGpsStatusMessage(`📍 Current Location: ${defaultFallback}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
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

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (materialSource === 'Customer-Owned Material' && !selectedCustomerMaterialId) {
      setModalError('Please select a registered customer-owned material lot from the dropdown, or declare material in Customer Activity / My Materials first.');
      return;
    }

    const dimTrim = dimensions.trim();
    if (!dimTrim || dimTrim.length < 3) {
      setModalError('Please specify workpiece dimensions (min. 3 characters, e.g. 2440mm x 1220mm x 18mm).');
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      setModalError('Fabrication quantity must be a valid integer strictly greater than 0.');
      return;
    }

    if (materialArrivalMode === 'DOORSTEP_PICKUP') {
      const pAddr = materialPickupAddress.trim();
      if (!pAddr || pAddr.length < 5) {
        setModalError('Please provide a valid, complete doorstep pickup address (min. 5 characters).');
        return;
      }
    }

    if (returnDeliveryMode === 'DOORSTEP_DELIVERY') {
      const dAddr = returnDeliveryAddress.trim();
      if (!dAddr || dAddr.length < 5) {
        setModalError('Please provide a valid, complete destination delivery address (min. 5 characters).');
        return;
      }
    }

    setIsSubmittingRequest(true);
    try {
      const rawUser = localStorage.getItem('user');
      const user = rawUser ? JSON.parse(rawUser) : null;
      const token = localStorage.getItem('token');

      const payload: any = {
        customer_id: user?.customer_id || user?.user_id || 1,
        customer_email: user?.email || '',
        service_type: serviceType,
        material_source: materialSource,
        dimensions: dimTrim,
        quantity: qtyNum,
        drawing_image: drawingImage,
        requirements: requirements.trim(),
        cutting_layout: attachedCuttingLayoutJson || undefined,
        deadline: deadline || undefined,
        material_arrival_mode: materialArrivalMode,
        material_pickup_address: materialArrivalMode === 'DOORSTEP_PICKUP' ? materialPickupAddress.trim() : undefined,
        return_delivery_mode: returnDeliveryMode,
        return_delivery_address: returnDeliveryMode === 'DOORSTEP_DELIVERY' ? returnDeliveryAddress.trim() : undefined,
      };

      if (materialSource === 'Customer-Owned Material' && selectedCustomerMaterialId) {
        payload.customer_material_id = Number(selectedCustomerMaterialId);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/fabrication/requests', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsRequestModalOpen(false);
        setRequirements('');
        setDrawingImage('');
        setAttachedCuttingLayoutJson('');
        setSelectedCustomerMaterialId('');
        setModalError(null);
        fetchFabrications();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setModalError(errJson.detail || 'Failed to submit fabrication request. Please check inputs.');
      }
    } catch (err: any) {
      console.error('Failed to create fabrication request:', err);
      setModalError(err?.message || 'Network error while submitting fabrication request.');
    } finally {
      setIsSubmittingRequest(false);
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
        setSelectedStrategyIdx(0);
      }
    } catch (err) {
      console.error('Cutting optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyCuttingPlanToRequest = () => {
    if (!optimizationResult) return;
    const strategies = optimizationResult.strategies || [optimizationResult];
    const activeStrat = strategies[selectedStrategyIdx] || strategies[0] || optimizationResult;

    const planPayload = {
      sheet_dimensions: optimizationResult.sheet_dimensions,
      strategy_id: activeStrat.strategy_id || 'strategy_selected',
      strategy_name: activeStrat.strategy_name || 'Custom Optimized 2D Cutting Plan',
      badge: activeStrat.badge || 'Optimized Layout',
      description: activeStrat.description || 'Optimized timber cutting plan for workshop precision.',
      total_pieces_placed: activeStrat.total_pieces_placed,
      material_utilization_percent: activeStrat.material_utilization_percent,
      waste_percent: activeStrat.waste_percent,
      placed_layout: activeStrat.placed_layout || [],
      cutting_sequence_instructions: activeStrat.cutting_sequence_instructions || [],
      items_summary: [
        { label: 'Table Top Panels', width: parseFloat(cutP1W) || 600, height: parseFloat(cutP1H) || 400, quantity: parseInt(cutP1Qty) || 1 },
        { label: 'Side Shelves', width: parseFloat(cutP2W) || 800, height: parseFloat(cutP2H) || 300, quantity: parseInt(cutP2Qty) || 1 },
      ],
      created_at: new Date().toISOString()
    };

    const planJson = JSON.stringify(planPayload);
    setAttachedCuttingLayoutJson(planJson);
    setServiceType('Wood Cutting');
    setDimensions(`Stock Sheet: ${sheetW} x ${sheetH} mm (${activeStrat.total_pieces_placed} Cut Pieces)`);
    setRequirements(
      `[2D Cutting Blueprint Attached]: ${activeStrat.strategy_name} (${activeStrat.material_utilization_percent}% Yield, ${activeStrat.waste_percent}% Waste). Requires precision rip and cross cutting for ${activeStrat.total_pieces_placed} cut panels.`
    );
    setIsOptimizerOpen(false);
    setIsRequestModalOpen(true);
  };

  const handlePayFabrication = async (r: FabricationItem) => {
    try {
      if (r.material_arrival_mode === 'DOORSTEP_PICKUP' || r.return_delivery_mode === 'DOORSTEP_DELIVERY') {
        const addressStatus = await validateAddressApi();
        if (!addressStatus || !addressStatus.is_valid) {
          navigate(`/profile?address_required=true&return_to=${encodeURIComponent(window.location.pathname + window.location.hash)}&reason=fabrication_payment`);
          return;
        }
      }

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
            const allStagesDone = r.production_stages && r.production_stages.length > 0 && r.production_stages.every(s => s.status === 'COMPLETED');
            const isQcPending = r.status === 'QC_PENDING' || (r as any).qc_status === 'QC_PENDING' || (allStagesDone && r.status !== 'COMPLETED');
            const isCompleted = r.status === 'COMPLETED' || (r as any).qc_status === 'QC_PASSED';

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
                    <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isQcPending
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : r.status === 'IN_PRODUCTION'
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : isPaid
                        ? 'bg-[#38A132]/10 text-[#38A132] border-[#38A132]/30'
                        : getStatusBadgeColor(r.status)
                    }`}>
                      {isCompleted ? '✓ Completed (QC Passed)' : isQcPending ? '⏳ QC Inspection Pending' : r.status === 'IN_PRODUCTION' ? '⚙️ In Production' : isPaid ? `Paid ✓ (₹${finalTotalAmount.toLocaleString('en-IN')})` : formatStatusLabel(r.status)}
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

                  {/* 2D Cutting Blueprint Action (Customer View) */}
                  {r.cutting_layout && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parsed = typeof r.cutting_layout === 'string' ? JSON.parse(r.cutting_layout) : r.cutting_layout;
                          setViewingBlueprintModal({ ...parsed, fabrication_id: r.fabrication_id });
                        } catch (e) {
                          setViewingBlueprintModal(null);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-98"
                    >
                      <Cpu className="w-3.5 h-3.5 text-[#2E7D32]" />
                      <span>📐 View 2D Cutting Blueprint ({(() => {
                        try {
                          const p = typeof r.cutting_layout === 'string' ? JSON.parse(r.cutting_layout) : r.cutting_layout;
                          return p.strategy_name?.split(':')[0] || 'Layout Plan';
                        } catch {
                          return 'Plan';
                        }
                      })()})</span>
                    </button>
                  )}

                  {/* Live Workshop Manufacturing Widget */}
                  {(isPaid || r.status === 'IN_PRODUCTION' || isQcPending || isCompleted || r.active_stage || (r.production_stages && r.production_stages.length > 0)) && (() => {
                    const activeStg = r.active_stage || (r.production_stages && r.production_stages.find(s => s.status === 'IN_PROGRESS' || s.status === 'PAUSED')) || (r.production_stages && r.production_stages[0]);
                    const stgName = isCompleted ? 'Completed (QC Passed)' : isQcPending ? (activeStg?.stage_name ? `${activeStg.stage_name} (QC Pending)` : 'Quality Inspection Pending') : (activeStg ? activeStg.stage_name : r.service_type);
                    const sections = getStageSections(activeStg?.stage_name || stgName, r.service_type);
                    const completedSections = isCompleted || isQcPending ? sections.map(s => s.id) : (activeStg ? (activeStg.completed_sections || []) : []);
                    const checkedCount = completedSections.length;
                    const totalSections = sections.length;
                    const isPaused = Boolean(r.is_paused || (activeStg && (activeStg.status === 'PAUSED' || activeStg.pause_reason)));
                    const pauseReason = r.pause_reason || (activeStg && activeStg.pause_reason) || 'Temporarily paused by worker for curing/drying';
                    const progressPct = isCompleted
                      ? 100
                      : isQcPending
                      ? 90
                      : totalSections > 0
                      ? Math.min(85, Math.round((checkedCount / totalSections) * 85))
                      : (r.overall_progress_percentage || (activeStg ? activeStg.progress_percentage : 40));

                    return (
                      <div className="bg-gradient-to-br from-[#FAF8F5] to-[#F5ECE1]/60 p-3 rounded-2xl border border-[#E2D7CB] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Hammer className="w-3.5 h-3.5 text-[#38A132] shrink-0" />
                            <span className="text-xs font-black text-[#1C1814] truncate">
                              {isCompleted ? 'Completed (QC Passed)' : isQcPending ? (activeStg?.stage_name || 'Timber Dimensioning & Precision CNC Cutting') : (activeStg ? activeStg.stage_name : r.service_type)}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9.5px] uppercase shrink-0 ${
                            isPaused
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isQcPending
                              ? 'bg-amber-100 text-amber-900 border border-amber-400'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isPaused ? '⏸️ PAUSED' : isCompleted ? '✓ QC PASSED' : isQcPending ? '⏳ QC PENDING' : (activeStg ? activeStg.status : 'IN PRODUCTION')}
                          </span>
                        </div>

                        {/* Worker Note if available */}
                        {activeStg && activeStg.assigned_worker_name && (
                          <div className="text-[10px] text-[#6B5C4D]">
                            Worker: <strong className="text-[#1C1814]">{activeStg.assigned_worker_name}</strong>
                          </div>
                        )}

                        {/* Paused Alert */}
                        {isPaused && (
                          <div className="p-2 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-[10.5px] font-bold flex items-start gap-1.5">
                            <Pause className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                            <span className="text-[10px] leading-tight font-medium">{pauseReason}</span>
                          </div>
                        )}

                        {/* QC Pending Informative Alert */}
                        {isQcPending && (
                          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10.5px] font-bold flex items-start gap-1.5">
                            <Clock className="w-3 h-3 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
                            <span className="text-[10px] leading-tight font-medium">Workshop machining completed by worker. In queue for Quality Gate inspection under Retail Staff before packing and delivery.</span>
                          </div>
                        )}

                        {/* Progress Bar & Percentage */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-black text-[#7A6C5E] mb-1">
                            <span>{isCompleted ? 'Inspection & Build Completed' : isQcPending ? 'Quality Inspection Pending' : 'Stage Completion'}</span>
                            <span className="font-mono text-xs font-black text-[#38A132]">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-[#E2D7CB] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                isPaused
                                  ? 'bg-amber-500'
                                  : isCompleted
                                  ? 'bg-[#38A132]'
                                  : isQcPending
                                  ? 'bg-amber-500 animate-pulse'
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
                                  const isDone = completedSections.includes(sec.id) || isCompleted || isQcPending;
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
                    {isCompleted ? (
                      <span className="text-[10.5px] font-black text-[#2E8B29] bg-[#38A132]/10 border border-[#38A132]/25 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        ✓ Completed (QC Passed)
                      </span>
                    ) : isQcPending ? (
                      <span className="text-[10.5px] font-black text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        ⏳ QC Inspection Pending
                      </span>
                    ) : r.status === 'IN_PRODUCTION' ? (
                      <span className="text-[10.5px] font-black text-purple-900 bg-purple-50 border border-purple-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        ⚙️ In Production
                      </span>
                    ) : isPaid ? (
                      <span className="text-[10.5px] font-black text-[#2E8B29] bg-[#38A132]/10 border border-[#38A132]/25 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        ✓ Paid & Queued
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

            {modalError && (
              <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-300 rounded-2xl font-bold flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

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

              {materialSource === 'Customer-Owned Material' && (
                <div className="bg-[#FAF7F2] p-4 rounded-2xl border-2 border-[#E2D7CB] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-extrabold text-[#7A6C5E] uppercase">
                      Select Your Registered Material Lot *
                    </label>
                    <span className="text-[10px] text-[#48A63E] font-bold">
                      {customerMaterials.length} available
                    </span>
                  </div>
                  {isLoadingMaterials ? (
                    <p className="text-xs text-[#7A6C5E]">Loading your registered materials...</p>
                  ) : customerMaterials.length > 0 ? (
                    <>
                      <select
                        value={selectedCustomerMaterialId}
                        onChange={(e) => setSelectedCustomerMaterialId(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white font-bold text-xs"
                        required
                      >
                        <option value="">-- Select Registered Material Lot --</option>
                        {customerMaterials.map((m) => (
                          <option key={m.material_id} value={m.material_id}>
                            Lot #{m.material_id} • {m.wood_type || m.material_type} ({m.dimensions || 'Standard'}, {m.remaining_quantity ?? m.quantity} {m.unit} available) - Status: {m.status}
                          </option>
                        ))}
                      </select>
                      {selectedCustomerMaterialId && (() => {
                        const selMat = customerMaterials.find(m => String(m.material_id) === String(selectedCustomerMaterialId));
                        if (!selMat) return null;
                        return (
                          <div className="text-[11px] text-[#7A6C5E] bg-white p-2.5 rounded-xl border border-[#E2D7CB] flex justify-between">
                            <span><strong>Condition:</strong> {selMat.condition || 'Inspected'}</span>
                            <span><strong>Usable Balance:</strong> <span className="text-[#48A63E] font-bold">{selMat.remaining_quantity ?? selMat.quantity} {selMat.unit}</span></span>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <p className="font-bold">No registered materials found in your account.</p>
                      <p className="text-[11px]">Please declare or register your timber lot in the Customer Activity / My Materials section before submitting, or select Company Stock Material.</p>
                    </div>
                  )}
                </div>
              )}

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

                        <div className="flex flex-wrap items-center gap-1.5">
                          {userProfileAddress && (
                            <button
                              type="button"
                              onClick={handleUseProfileAddressForPickup}
                              className="px-2.5 py-1 rounded-lg bg-[#B89768]/15 hover:bg-[#B89768]/25 text-[#73542B] border border-[#B89768]/40 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                              title="Use my registered profile address"
                            >
                              <Home className="w-3 h-3 text-[#B89768]" />
                              <span>My Saved Address</span>
                            </button>
                          )}

                          {/* Current Location / Detect GPS Button */}
                          <button
                            type="button"
                            onClick={handleDetectPickupLocation}
                            disabled={isDetectingPickupGps}
                            className="px-2.5 py-1 rounded-lg bg-[#48A63E]/10 hover:bg-[#48A63E]/20 text-[#48A63E] border border-[#48A63E]/30 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                            title="Detect current location using GPS"
                          >
                            <Navigation className={`w-3 h-3 ${isDetectingPickupGps ? 'animate-spin' : ''}`} />
                            <span>{isDetectingPickupGps ? 'Locating...' : 'Current Location'}</span>
                          </button>

                          {/* Pick on Map Toggle Button */}
                          <button
                            type="button"
                            onClick={() => setIsPickupMapOpen(!isPickupMapOpen)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all border shadow-2xs ${
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

                        <div className="flex flex-wrap items-center gap-1.5">
                          {userProfileAddress && (
                            <button
                              type="button"
                              onClick={handleUseProfileAddressForDelivery}
                              className="px-2.5 py-1 rounded-lg bg-[#B89768]/15 hover:bg-[#B89768]/25 text-[#73542B] border border-[#B89768]/40 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                              title="Use my registered profile address"
                            >
                              <Home className="w-3 h-3 text-[#B89768]" />
                              <span>My Saved Address</span>
                            </button>
                          )}

                          {/* Current Location / Detect GPS Button */}
                          <button
                            type="button"
                            onClick={handleDetectDeliveryLocation}
                            disabled={isDetectingDeliveryGps}
                            className="px-2.5 py-1 rounded-lg bg-[#48A63E]/10 hover:bg-[#48A63E]/20 text-[#48A63E] border border-[#48A63E]/30 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                            title="Detect current location using GPS"
                          >
                            <Navigation className={`w-3 h-3 ${isDetectingDeliveryGps ? 'animate-spin' : ''}`} />
                            <span>{isDetectingDeliveryGps ? 'Locating...' : 'Current Location'}</span>
                          </button>

                          {/* Pick on Map Toggle Button */}
                          <button
                            type="button"
                            onClick={() => setIsDeliveryMapOpen(!isDeliveryMapOpen)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all border shadow-2xs ${
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

              {/* 2D Cutting Blueprint Attachment Notice */}
              {attachedCuttingLayoutJson && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#38A132] shrink-0" />
                    <div>
                      <span className="text-xs font-black text-emerald-900 block">2D Cutting Blueprint Attached ✓</span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        Stock sheet size, cut piece positions, and sawing sequence instructions will be sent to the workshop artisans.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedCuttingLayoutJson('')}
                    className="text-xs text-red-600 font-bold hover:underline cursor-pointer shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}

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
                <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} placeholder="Tolerance specs, edge bevel angles, hole diameters..." className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-white text-xs font-medium" />
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
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-scaleUp max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#48A63E]" />
                <div>
                  <h3 className="text-base font-extrabold text-[#2C241D]">AI 2D Sheet Cutting Optimizer Tool</h3>
                  <p className="text-xs text-[#7A6C5E] font-medium">Algorithmic Multi-Strategy Bin-Packing & Sheet Nesting Solver.</p>
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
                  className="w-full py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs transition-all shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2"
                >
                  <Cpu className="w-4 h-4" />
                  <span>{isOptimizing ? 'Computing Multi-Strategy Cutting Solver...' : 'Calculate Optimal Cutting Plan'}</span>
                </button>
              </div>

              {/* Cutting Visualization Diagram & Metrics */}
              <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-3">
                <h4 className="font-extrabold text-xs text-[#2C241D] uppercase border-b border-[#E2D7CB] pb-1">Optimization Metrics & Cutting Canvas</h4>

                {optimizationResult ? (() => {
                  const strategies = optimizationResult.strategies || [optimizationResult];
                  const currentStrat = strategies[selectedStrategyIdx] || strategies[0] || optimizationResult;

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl">
                          <span className="text-[10px] text-emerald-800 font-bold block">Utilization Rate</span>
                          <span className="text-base font-extrabold text-emerald-700">{currentStrat.material_utilization_percent}%</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl">
                          <span className="text-[10px] text-amber-800 font-bold block">Predicted Scrap Waste</span>
                          <span className="text-base font-extrabold text-amber-700">{currentStrat.waste_percent}%</span>
                        </div>
                      </div>

                      {/* Canvas Representation */}
                      <div className="relative aspect-[2/1] w-full bg-[#2C241D] rounded-xl overflow-hidden border-2 border-[#E2D7CB] p-2 flex items-center justify-center">
                        <div className="relative w-full h-full bg-[#8C6D4F] rounded border border-amber-200/50">
                          {currentStrat.placed_layout?.map((item: any) => (
                            <div
                              key={item.id}
                              style={{
                                left: `${(item.x / (optimizationResult.sheet_dimensions?.width || 2440)) * 100}%`,
                                top: `${(item.y / (optimizationResult.sheet_dimensions?.height || 1220)) * 100}%`,
                                width: `${(item.width / (optimizationResult.sheet_dimensions?.width || 2440)) * 100}%`,
                                height: `${(item.height / (optimizationResult.sheet_dimensions?.height || 1220)) * 100}%`,
                              }}
                              className="absolute bg-[#48A63E]/90 border border-white text-white text-[8px] font-extrabold flex items-center justify-center shadow-xs overflow-hidden"
                              title={`${item.label} (${item.width}x${item.height}mm)`}
                            >
                              <span className="truncate px-0.5">{item.id}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-[10px] text-[#7A6C5E] space-y-1">
                        <p className="font-bold text-[#2C241D]">Cutting Instructions:</p>
                        {currentStrat.cutting_sequence_instructions?.map((inst: string, idx: number) => (
                          <p key={idx}>• {inst}</p>
                        ))}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="py-12 text-center text-[#7A6C5E] text-xs">
                    Click "Calculate Optimal Cutting Plan" to render visual cutting map and calculate timber waste %.
                  </div>
                )}
              </div>
            </div>

            {/* Design Change / Strategy Selection Tabs */}
            {optimizationResult && (
              <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-[#E2D7CB]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-[#7A6C5E] tracking-wider">
                    Design Change / Layout Options (Select Below):
                  </span>
                  <span className="text-[10px] text-[#48A63E] font-extrabold bg-[#48A63E]/10 px-2.5 py-0.5 rounded-full">
                    {((optimizationResult.strategies || [optimizationResult]).length)} Options Generated
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(optimizationResult.strategies || [optimizationResult]).map((strat: any, sIdx: number) => {
                    const isSelected = selectedStrategyIdx === sIdx;
                    return (
                      <button
                        key={strat.strategy_id || sIdx}
                        type="button"
                        onClick={() => setSelectedStrategyIdx(sIdx)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-[#48A63E] ring-2 ring-[#48A63E]/30 shadow-xs'
                            : 'bg-[#FAF7F2] border-[#E2D7CB] hover:border-[#48A63E]/60 text-[#5C4E42]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono font-black text-[#48A63E] uppercase">{strat.badge || `Option ${sIdx + 1}`}</span>
                          <span className="text-[10px] font-black text-[#2C241D]">{strat.material_utilization_percent}% Yield</span>
                        </div>
                        <h5 className="font-extrabold text-xs text-[#2C241D] leading-tight mt-1 truncate">{strat.strategy_name}</h5>
                        <p className="text-[9.5px] text-[#7A6C5E] mt-0.5 line-clamp-2 leading-relaxed">{strat.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E2D7CB]">
              <button
                type="button"
                onClick={() => setIsOptimizerOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E2D7CB] text-[#7A6C5E] font-bold hover:bg-white cursor-pointer"
              >
                Close Optimizer
              </button>

              {optimizationResult && (
                <button
                  type="button"
                  onClick={handleApplyCuttingPlanToRequest}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-lg shadow-[#48A63E]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Selected Cutting Plan to Request</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blueprint Interactive Viewer Modal (Customer View) */}
      {viewingBlueprintModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FAF7F2] border-2 border-[#D9CEBF] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#48A63E]" />
                <div>
                  <h3 className="text-base font-extrabold text-[#2C241D]">
                    2D Cutting Blueprint {viewingBlueprintModal.fabrication_id ? `#FAB-${viewingBlueprintModal.fabrication_id}` : ''}
                  </h3>
                  <p className="text-xs text-[#7A6C5E] font-medium">
                    {viewingBlueprintModal.strategy_name || 'Workshop Timber Sawing Blueprint'}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingBlueprintModal(null)} className="text-[#7A6C5E] hover:text-[#2C241D] font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white border border-[#E2D7CB] p-2.5 rounded-xl">
                <span className="text-[10px] text-[#7A6C5E] font-bold block uppercase">Stock Sheet Size</span>
                <span className="font-extrabold text-[#2C241D]">
                  {viewingBlueprintModal.sheet_dimensions?.width} × {viewingBlueprintModal.sheet_dimensions?.height} mm
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">Material Yield</span>
                <span className="font-extrabold text-emerald-700">{viewingBlueprintModal.material_utilization_percent}%</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                <span className="text-[10px] text-amber-800 font-bold block uppercase">Scrap Waste</span>
                <span className="font-extrabold text-amber-700">{viewingBlueprintModal.waste_percent}%</span>
              </div>
            </div>

            {/* Visual Canvas Representation */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] space-y-2">
              <span className="text-[11px] font-black uppercase text-[#7A6C5E] block">Timber Sheet Cutting Layout</span>
              <div className="relative aspect-[2/1] w-full bg-[#2C241D] rounded-xl overflow-hidden border-2 border-[#E2D7CB] p-2 flex items-center justify-center">
                <div className="relative w-full h-full bg-[#8C6D4F] rounded border border-amber-200/50">
                  {viewingBlueprintModal.placed_layout?.map((item: any) => (
                    <div
                      key={item.id}
                      style={{
                        left: `${(item.x / (viewingBlueprintModal.sheet_dimensions?.width || 2440)) * 100}%`,
                        top: `${(item.y / (viewingBlueprintModal.sheet_dimensions?.height || 1220)) * 100}%`,
                        width: `${(item.width / (viewingBlueprintModal.sheet_dimensions?.width || 2440)) * 100}%`,
                        height: `${(item.height / (viewingBlueprintModal.sheet_dimensions?.height || 1220)) * 100}%`,
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

            {/* Step-by-step instructions */}
            {viewingBlueprintModal.cutting_sequence_instructions && (
              <div className="bg-white p-4 rounded-2xl border border-[#E2D7CB] text-xs space-y-1.5">
                <h5 className="font-bold text-[#2C241D]">Sawing Instructions for Artisans:</h5>
                {viewingBlueprintModal.cutting_sequence_instructions.map((inst: string, idx: number) => (
                  <p key={idx} className="text-[#6B5C4D] text-[11px]">• {inst}</p>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end border-t border-[#E2D7CB]">
              <button
                type="button"
                onClick={() => setViewingBlueprintModal(null)}
                className="px-5 py-2.5 rounded-xl bg-[#48A63E] text-white font-extrabold text-xs shadow-md cursor-pointer"
              >
                Close Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
