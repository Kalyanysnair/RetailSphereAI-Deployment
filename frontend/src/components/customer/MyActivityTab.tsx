import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Wrench, 
  Scissors, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Download, 
  ShoppingCart, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  ChevronRight,
  User,
  MessageSquareText,
  FileText,
  Truck,
  Star,
  Search,
  RotateCcw,
  Send,
  X,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  ShoppingBag,
  ExternalLink,
  Pause,
  Sliders,
  Check,
  Hammer
} from 'lucide-react';
import { 
  fetchCustomOrders, 
  CustomOrderData, 
  downloadPaymentReceipt, 
  updateOrderStatus, 
  cancelCustomOrder 
} from '../../services/api_production';
import { fetchRetailOrdersFromDB, RetailOrder } from '../../utils/retailOrdersStorage';
import { setDirectCheckoutItem, addToCart } from '../../utils/cartStorage';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';
import { fetchOrderFulfillmentDetails, fetchOrderMessagesAPI, sendOrderMessageAPI, FulfillmentDetails } from '../../services/retailOrdersFulfillmentApi';
import { openRazorpayCheckout } from '../../services/razorpay';
import { validateAddressApi } from '../../services/api';
import { formatStatusLabel, getStatusBadgeColor } from '../../utils/statusUtils';
import { getStageSections, StageSection } from '../../utils/manufacturingSections';

export interface FabricationItem {
  fabrication_id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
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
  status: string;
  payment_status?: string;
  production_stages?: any[];
  active_stage?: any;
  overall_progress_percentage?: number;
  is_paused?: boolean;
  pause_reason?: string;
  created_at?: string;
}

export interface ServiceItem {
  service_id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  service_category: string;
  description: string;
  photos?: string;
  address: string;
  city: string;
  pincode: string;
  preferred_date?: string;
  preferred_time?: string;
  estimated_price?: number;
  status: string;
  payment_status?: string;
  jobs?: any[];
  created_at?: string;
}

export interface MaterialItem {
  material_id: number;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  material_type: string;
  wood_type?: string;
  quantity: number;
  unit: string;
  dimensions?: string;
  condition?: string;
  photos?: string;
  notes?: string;
  status: string;
  remaining_quantity?: number;
  created_at?: string;
}

export const MyActivityTab: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states for all activity areas
  const [retailOrders, setRetailOrders] = useState<RetailOrder[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrderData[]>([]);
  const [fabrications, setFabrications] = useState<FabricationItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Modals state
  const [trackingModalOrder, setTrackingModalOrder] = useState<RetailOrder | null>(null);
  const [trackingData, setTrackingData] = useState<FulfillmentDetails | null>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Rating / Review modal state
  const [reviewModalOrder, setReviewModalOrder] = useState<RetailOrder | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);

  // Messaging Modal State
  const [messagingModalOrder, setMessagingModalOrder] = useState<RetailOrder | null>(null);
  const [orderMessages, setOrderMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Material register modal
  const [isRegisterMaterialOpen, setIsRegisterMaterialOpen] = useState(false);
  const [matType, setMatType] = useState('Timber Wood');
  const [matWoodType, setMatWoodType] = useState('Teak');
  const [matQuantity, setMatQuantity] = useState('100');
  const [matUnit, setMatUnit] = useState('sq_ft');
  const [matDimensions, setMatDimensions] = useState('8ft x 1ft x 2inch planks');
  const [matCondition, setMatCondition] = useState('Good (Seasoned Lumber)');
  const [matNotes, setMatNotes] = useState('');
  const [submittingMat, setSubmittingMat] = useState(false);

  const userObj = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const userName = userObj?.full_name || userObj?.username || 'Valued Customer';
  const userEmail = userObj?.email || '';

  // Load all activities data from backend databases
  const loadAllActivities = async () => {
    setLoading(true);
    try {
      // 1. Retail / E-commerce Orders
      const rOrders = await fetchRetailOrdersFromDB();
      setRetailOrders(rOrders || []);

      // 2. Custom Furniture Requests
      const cOrders = await fetchCustomOrders();
      const activeCustom = cOrders.filter(o => o.order_status !== 'Cancelled');
      activeCustom.sort((a, b) => b.custom_order_id - a.custom_order_id);
      setCustomOrders(activeCustom);

      // 3. Fabrication Requests
      try {
        const fRes = await fetch(`/api/fabrication/requests?customer_email=${encodeURIComponent(userEmail)}`);
        if (fRes.ok) {
          const fData = await fRes.json();
          setFabrications(Array.isArray(fData) ? fData : []);
        }
      } catch (e) {
        console.warn('Fabrication load err:', e);
      }

      // 4. Service Bookings
      try {
        const sRes = await fetch(`/api/services/requests?customer_email=${encodeURIComponent(userEmail)}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setServices(Array.isArray(sData) ? sData : []);
        }
      } catch (e) {
        console.warn('Service load err:', e);
      }

      // 5. Materials
      try {
        const mRes = await fetch(`/api/materials/customer?customer_email=${encodeURIComponent(userEmail)}`);
        if (mRes.ok) {
          const mData = await mRes.json();
          setMaterials(Array.isArray(mData) ? mData : []);
        }
      } catch (e) {
        console.warn('Materials load err:', e);
      }

    } catch (err) {
      console.error('Error loading activity hub:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllActivities();
  }, []);

  const handleOpenTracking = async (ord: RetailOrder) => {
    setTrackingModalOrder(ord);
    setLoadingTracking(true);
    try {
      const details = await fetchOrderFulfillmentDetails(ord.orderId);
      setTrackingData(details);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleOpenMessaging = async (ord: RetailOrder) => {
    setMessagingModalOrder(ord);
    try {
      const msgs = await fetchOrderMessagesAPI(ord.orderId);
      setOrderMessages(msgs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messagingModalOrder || !newMessageText.trim()) return;
    setSendingMsg(true);
    try {
      const userId = userObj?.user_id || userObj?.id || userObj?.customer_id;
      const ok = await sendOrderMessageAPI(
        messagingModalOrder.orderId,
        'Customer',
        userName,
        newMessageText.trim(),
        userId
      );
      if (ok) {
        setNewMessageText('');
        const updated = await fetchOrderMessagesAPI(messagingModalOrder.orderId);
        setOrderMessages(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleOpenReviewModal = (ord: RetailOrder) => {
    setReviewModalOrder(ord);
    setReviewRating(5);
    setReviewComment('');
    setReviewSuccess(false);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalOrder) return;
    setSubmittingReview(true);
    try {
      const firstItem = reviewModalOrder.items[0];
      const prodId = firstItem?.id ? parseInt(firstItem.id.replace(/\D/g, '')) || 1 : 1;
      const custId = userObj?.customer_id || userObj?.user_id || 1;

      const payload = {
        customer_id: custId,
        product_id: prodId,
        order_id: reviewModalOrder.orderId,
        rating: reviewRating,
        comment: reviewComment.trim() || 'Verified Purchase - Great Quality',
        photos: []
      };

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setReviewSuccess(true);
        setTimeout(() => {
          setReviewModalOrder(null);
          setReviewSuccess(false);
        }, 1800);
      } else {
        alert('Thank you! Your verified rating has been recorded.');
        setReviewModalOrder(null);
      }
    } catch (e) {
      console.error('Error submitting review:', e);
      setReviewModalOrder(null);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRegisterMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qVal = parseFloat(matQuantity);
    if (!qVal || qVal <= 0) {
      alert('Material quantity must be strictly greater than 0.');
      return;
    }

    setSubmittingMat(true);
    try {
      const payload = {
        customer_id: userObj?.customer_id || userObj?.user_id || 1,
        customer_email: userEmail,
        material_type: matType,
        wood_type: matWoodType,
        quantity: qVal,
        unit: matUnit,
        dimensions: matDimensions,
        condition: matCondition,
        notes: matNotes
      };
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/materials/customer', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsRegisterMaterialOpen(false);
        setMatNotes('');
        loadAllActivities();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.detail || 'Failed to register customer material');
      }
    } catch (e) {
      console.error('Error registering material:', e);
      alert('Failed to register material. Please check your network connection.');
    } finally {
      setSubmittingMat(false);
    }
  };

  const handlePayCustomOrder = async (ord: CustomOrderData) => {
    if (!ord.estimated_price) return;

    // Check delivery address before payment
    const addressStatus = await validateAddressApi();
    if (!addressStatus || !addressStatus.is_valid) {
      const returnUrl = window.location.pathname + window.location.hash;
      navigate(`/profile?address_required=true&return_to=${encodeURIComponent(returnUrl)}&reason=custom_order`);
      return;
    }

    const amountInPaise = Math.round(ord.estimated_price * 100);
    await openRazorpayCheckout({
      amount: amountInPaise,
      name: 'RetailSphere Custom Furniture',
      description: `Payment for Custom #${ord.custom_order_id} (${ord.furniture_type})`,
      prefill: {
        name: userName,
        email: userEmail || 'customer@retailsphere.com',
        contact: ord.customer_phone || '9876543210',
      },
      onSuccess: async (paymentId) => {
        try {
          await updateOrderStatus(ord.custom_order_id, 'Paid');
          loadAllActivities();
        } catch (e) {
          console.error(e);
        }
      },
      onFailure: (reason) => {
        console.warn('Custom order payment cancelled:', reason);
      }
    });
  };

  const handlePayFabricationActivity = async (f: FabricationItem) => {
    if (!f.estimated_price) return;

    // Check delivery address before payment
    const addressStatus = await validateAddressApi();
    if (!addressStatus || !addressStatus.is_valid) {
      const returnUrl = window.location.pathname + window.location.hash;
      navigate(`/profile?address_required=true&return_to=${encodeURIComponent(returnUrl)}&reason=fabrication`);
      return;
    }

    const amountInPaise = Math.round(f.estimated_price * 100);
    await openRazorpayCheckout({
      amount: amountInPaise,
      name: 'RetailSphere Fabrication Studio',
      description: `Payment for Wood Fabrication FAB-#${f.fabrication_id} (${f.service_type})`,
      prefill: {
        name: userName,
        email: userEmail || 'customer@retailsphere.com',
      },
      onSuccess: async (paymentId) => {
        try {
          await fetch(`/api/fabrication/requests/${f.fabrication_id}/pay`, { method: 'PUT' });
          loadAllActivities();
        } catch (e) {
          console.error(e);
        }
      },
      onFailure: (reason) => {
        console.warn('Fabrication payment cancelled:', reason);
      }
    });
  };

  const handlePayServiceActivity = async (s: ServiceItem) => {
    if (!s.estimated_price) return;

    // Check delivery address before payment
    const addressStatus = await validateAddressApi();
    if (!addressStatus || !addressStatus.is_valid) {
      const returnUrl = window.location.pathname + window.location.hash;
      navigate(`/profile?address_required=true&return_to=${encodeURIComponent(returnUrl)}&reason=service`);
      return;
    }

    const amountInPaise = Math.round(s.estimated_price * 100);
    await openRazorpayCheckout({
      amount: amountInPaise,
      name: 'RetailSphere On-Site Services',
      description: `Payment for On-Site Service SRV-#${s.service_id} (${s.service_category})`,
      prefill: {
        name: userName,
        email: userEmail || 'customer@retailsphere.com',
      },
      onSuccess: async (paymentId) => {
        try {
          await fetch(`/api/services/requests/${s.service_id}/pay`, { method: 'PUT' });
          loadAllActivities();
        } catch (e) {
          console.error(e);
        }
      },
      onFailure: (reason) => {
        console.warn('Service payment cancelled:', reason);
      }
    });
  };

  const [addedToCartIds, setAddedToCartIds] = useState<Record<string, boolean>>({});

  const handleAddCustomToCart = (ord: CustomOrderData, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!ord.estimated_price) return;
    const refImgs = ord.reference_image ? parseReferenceImages(ord.reference_image) : [];
    addToCart({
      id: `custom_${ord.custom_order_id}`,
      name: `Bespoke ${ord.furniture_type} (#${ord.custom_order_id})`,
      material: `${ord.material} • ${ord.color || 'Custom'} (${ord.dimensions})`,
      price: Number(ord.estimated_price),
      imageUrl: refImgs[0] || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80'
    });
    navigate('/cart');
  };

  const handleAddFabricationToCart = (f: FabricationItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!f.estimated_price) return;
    addToCart({
      id: `fab_${f.fabrication_id}`,
      name: `Fabrication: ${f.service_type} (#${f.fabrication_id})`,
      material: `${f.material_source} (${f.dimensions})`,
      price: Number(f.estimated_price),
      imageUrl: f.drawing_image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80'
    });
    navigate('/cart');
  };

  const handleAddServiceToCart = (s: ServiceItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!s.estimated_price) return;
    addToCart({
      id: `srv_${s.service_id}`,
      name: `On-Site Service: ${s.service_category} (#${s.service_id})`,
      material: `${s.city} (${s.address}) - ${s.preferred_date || 'Appointment'}`,
      price: Number(s.estimated_price),
      imageUrl: s.photos || 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=500&q=80'
    });
    navigate('/cart');
  };

  const handleCancelServiceActivity = async (srvId: number) => {
    if (!window.confirm('Are you sure you want to cancel this on-site service appointment?')) return;
    try {
      setServices(prev => prev.map(s => s.service_id === srvId ? { ...s, status: 'Cancelled' } : s));
      await fetch(`/api/services/requests/${srvId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      loadAllActivities();
    } catch (e) {
      console.warn('Cancel activity service error:', e);
    }
  };

  const navigateToTab = (tabName: string) => {
    window.dispatchEvent(new CustomEvent('change-customer-tab', { detail: tabName }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const customStages = [
    'Material',
    'Joinery',
    'Assembly',
    'Finishing',
    'Ready'
  ];

  const getCustomStageIndex = (stageName: string) => {
    const idx = customStages.findIndex(s => s.toLowerCase().includes(stageName.toLowerCase().split(' ')[0]));
    return idx >= 0 ? idx : 0;
  };

  const formatCurrency = (amount?: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Filter queries
  const q = searchQuery.toLowerCase().trim();
  const filteredRetailOrders = retailOrders.filter(o => 
    !q || o.orderId.toLowerCase().includes(q) || o.items.some(i => i.name.toLowerCase().includes(q))
  );
  const filteredCustomOrders = customOrders.filter(o => 
    !q || String(o.custom_order_id).includes(q) || o.furniture_type.toLowerCase().includes(q) || o.material.toLowerCase().includes(q)
  );
  const filteredFabrications = fabrications.filter(f => 
    !q || String(f.fabrication_id).includes(q) || f.service_type.toLowerCase().includes(q)
  );
  const filteredServices = services.filter(s => 
    !q || String(s.service_id).includes(q) || s.service_category.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
  );
  const filteredMaterials = materials.filter(m => 
    !q || String(m.material_id).includes(q) || m.material_type.toLowerCase().includes(q) || (m.wood_type && m.wood_type.toLowerCase().includes(q))
  );

  // DYNAMIC CATEGORY RESOLUTION (ONLY CATEGORIES WITH VALUES > 0)
  const populatedCategories = [
    { id: 'orders', label: 'Store Purchases', icon: Package, count: retailOrders.length, color: 'text-[#48A63E]' },
    { id: 'custom', label: 'Custom Furniture', icon: Layers, count: customOrders.length, color: 'text-[#9C7A4B]' },
    { id: 'fabrication', label: 'Fabrication', icon: Scissors, count: fabrications.length, color: 'text-[#48A63E]' },
    { id: 'services', label: 'Services', icon: Wrench, count: services.length, color: 'text-[#38A132]' },
    { id: 'materials', label: 'My Materials', icon: Layers, count: materials.length, color: 'text-[#7A6C5E]' },
  ].filter(cat => cat.count > 0);

  const totalPopulatedCount = populatedCategories.reduce((acc, cat) => acc + cat.count, 0);

  return (
    <div className="max-w-6xl mx-auto text-[#2C241D]">
      {/* MASTER UNIFIED BOX OVER THE ENTIRE MY ACTIVITY SECTION */}
      <div className="bg-white/95 border-2 border-[#E2D7CB] rounded-[2.2rem] p-5 sm:p-7 shadow-sm backdrop-blur-xl relative overflow-hidden space-y-6">
        {/* 1. LUXURY GLASSMORPHIC ACTIVITY HEADER & SMART PILLS */}
        <div className="relative bg-gradient-to-r from-white/90 via-[#FAF8F5]/80 to-white/90 border border-[#E2D7CB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#48A63E] to-[#2D6338] text-white flex items-center justify-center shadow-md shadow-[#48A63E]/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-[#2C241D] tracking-tight">
                    My Activity Hub
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-[#E1EAD6] text-[#2D6338] text-[10px] font-black border border-[#A6C495]">
                    {totalPopulatedCount} Active
                  </span>
                </div>
                <p className="text-xs text-[#7A6C5E] font-medium">
                  Welcome, <strong>{userName}</strong> • Live tracking and order management
                </p>
              </div>
            </div>

            {/* Search Bar with Glass effect */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#7A6C5E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search active orders, items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/90 border border-[#D6C9B9] text-xs font-bold text-[#2C241D] placeholder-[#A69B8D] focus:outline-none focus:border-[#48A63E] focus:ring-2 focus:ring-[#48A63E]/20 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Dynamic Category Switcher Pills (ONLY POPULATED CATEGORIES) */}
          {populatedCategories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-3.5 border-t border-[#EFE7DE] mt-3.5">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeFilter === 'all'
                    ? 'bg-gradient-to-r from-[#2D6338] to-[#38A132] text-white shadow-sm shadow-[#2D6338]/30 scale-[1.02]'
                    : 'bg-white/80 border border-[#E2D7CB] text-[#6E6458] hover:bg-white hover:text-[#2C241D]'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>All Active ({totalPopulatedCount})</span>
              </button>

              {populatedCategories.map((cat) => {
                const IconComp = cat.icon;
                const isSelected = activeFilter === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveFilter(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#2D6338] to-[#38A132] text-white shadow-sm shadow-[#2D6338]/30 scale-[1.02]'
                        : 'bg-white/80 border border-[#E2D7CB] text-[#6E6458] hover:bg-white hover:text-[#2C241D]'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>{cat.label} ({cat.count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. ACTIVITY CARDS FEED (Clean flow inside the box container without inner scrollbar slider) */}
        <div className="space-y-6">
          {totalPopulatedCount === 0 ? (
            <div className="bg-gradient-to-br from-[#FAF8F5] via-[#F6F1EA] to-[#EEE8DF] border-2 border-[#D6C9B9] rounded-3xl p-10 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/30 flex items-center justify-center mx-auto text-[#48A63E] shadow-xs">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-extrabold text-[#2C241D]">No Active Activities Found</h3>
              <p className="text-xs text-[#6B5C4D] max-w-sm mx-auto leading-relaxed font-medium">
                You currently have no orders or active requests. Explore our catalog or commission bespoke furniture.
              </p>
              <button
                onClick={() => navigateToTab('shop')}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#2D6338] text-white text-xs font-black shadow-md shadow-[#48A63E]/25 hover:shadow-lg transition-all cursor-pointer"
              >
                Browse Shop Collection
              </button>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* SECTION 1: STORE PURCHASES (ONLY IF retailOrders.length > 0) */}
              {/* ========================================================================= */}
              {retailOrders.length > 0 && (activeFilter === 'all' || activeFilter === 'orders') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EFE7DE]">
                    <div className="flex items-center gap-2 text-xs font-black text-[#2C241D]">
                      <div className="w-5 h-5 rounded-lg bg-[#48A63E]/15 border border-[#48A63E]/30 flex items-center justify-center text-[#48A63E]">
                        <Package className="w-3 h-3" />
                      </div>
                      <span>Store Orders & Purchases ({filteredRetailOrders.length})</span>
                    </div>
                    <button
                      onClick={() => navigateToTab('shop')}
                      className="text-[11px] font-black text-[#48A63E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Shop Catalog</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredRetailOrders.map((ord) => {
                      const firstItem = ord.items[0];

                      return (
                        <div
                          key={ord.orderId}
                          className="group bg-gradient-to-b from-white/95 to-[#FAF8F5]/80 border-2 border-[#E2D7CB] rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-[#48A63E]/50 transition-all duration-300 flex flex-col justify-between space-y-3"
                        >
                          {/* Order Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-black text-[#2C241D] bg-[#FAF7F2] px-2.5 py-1 rounded-xl border border-[#E2D7CB] shadow-2xs">
                                #{ord.orderId}
                              </span>
                              <span className="text-[10px] font-bold text-[#7A6C5E] flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#48A63E]" />
                                {ord.orderDate || 'Recent'}
                              </span>
                            </div>

                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs ${
                              ord.orderStatus === 'Delivered'
                                ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/30'
                                : ord.orderStatus === 'Shipped' || (ord as any).status === 'Dispatched'
                                ? 'bg-amber-500/15 text-amber-800 border border-amber-500/30'
                                : 'bg-blue-500/15 text-blue-800 border border-blue-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                ord.orderStatus === 'Delivered' ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'
                              }`} />
                              {ord.orderStatus || (ord as any).status || 'Processing'}
                            </span>
                          </div>

                          {/* Order Body */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {firstItem?.imageUrl ? (
                                <img
                                  src={firstItem.imageUrl}
                                  alt={firstItem.name}
                                  className="w-14 h-14 rounded-2xl object-cover border-2 border-[#E2D7CB] shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border-2 border-[#E2D7CB] flex items-center justify-center text-[#48A63E] shrink-0">
                                  <Package className="w-6 h-6" />
                                </div>
                              )}

                              <div className="min-w-0 space-y-0.5">
                                <h4 className="text-xs font-black text-[#2C241D] truncate leading-snug">
                                  {firstItem?.name || 'Artisan Furniture'}
                                </h4>
                                <div className="text-[10px] text-[#7A6C5E] flex items-center gap-2">
                                <span>Qty: <strong>{firstItem?.quantity || 1} unit(s)</strong></span>
                                  {ord.items.length > 1 && (
                                    <span className="text-[#48A63E] font-bold">+{ord.items.length - 1} item</span>
                                  )}
                                </div>
                                {ord.paymentId && (
                                  <div className="text-[9px] font-mono text-[#7A6C5E] bg-[#FAF7F2] px-1.5 py-0.2 rounded border border-[#E2D7CB] inline-block truncate max-w-[140px]">
                                    {ord.paymentId}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm font-black text-[#48A63E] block">
                                {formatCurrency(ord.totalAmount)}
                              </span>
                              <span className="text-[9px] font-extrabold text-[#2D6338] bg-[#E1EAD6] px-2 py-0.5 rounded-md border border-[#A6C495] inline-block mt-0.5">
                                ✓ Paid Online
                              </span>
                            </div>
                          </div>

                          {/* Order Footer Actions & 4-Step Stepper */}
                          <div className="pt-2.5 border-t border-[#EFE7DE] flex items-center justify-between gap-2">
                            {/* 4-Step Slim Timeline */}
                            <div className="flex items-center gap-1 flex-1 max-w-[130px]">
                              {['Placed', 'Packed', 'Shipped', 'Delivered'].map((step, sIdx) => {
                                const isDone = 
                                  ord.orderStatus === 'Delivered' || 
                                  (step === 'Placed') ||
                                  (step === 'Packed' && (ord.orderStatus === 'Processing' || ord.orderStatus === 'Shipped' || (ord as any).status === 'Dispatched')) ||
                                  (step === 'Shipped' && (ord.orderStatus === 'Shipped' || (ord as any).status === 'Dispatched'));

                                return (
                                  <div key={sIdx} className="flex-1" title={step}>
                                    <div className={`w-full h-1 rounded-full ${isDone ? 'bg-[#48A63E]' : 'bg-[#E5DCD0]'}`} />
                                  </div>
                                );
                              })}
                            </div>

                            {/* Action Buttons with rich styling */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  const receiptObj: any = {
                                    custom_order_id: parseInt(ord.orderId.replace(/\D/g, '')) || 101,
                                    customer_name: ord.customerName || userName,
                                    customer_email: ord.email || userEmail,
                                    customer_phone: '',
                                    furniture_type: firstItem?.name || 'Store Furniture',
                                    material: 'Premium Finished Product',
                                    dimensions: 'Standard Specs',
                                    color: 'Standard Finish',
                                    estimated_price: ord.totalAmount,
                                    order_status: 'Paid',
                                    payment_status: 'Paid',
                                    order_date: ord.orderDate || new Date().toISOString(),
                                    assigned_workers: []
                                  };
                                  downloadPaymentReceipt(receiptObj);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D6C9B9] text-[#2C241D] text-[10px] font-black flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                title="Download official paid invoice receipt"
                              >
                                <Download className="w-3 h-3 text-[#48A63E]" />
                                <span>Invoice</span>
                              </button>

                              <button
                                onClick={() => handleOpenTracking(ord)}
                                className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#D6C9B9] text-[#2C241D] text-[10px] font-black flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                title="Track live shipment"
                              >
                                <Truck className="w-3 h-3 text-[#48A63E]" />
                                <span>Track</span>
                              </button>

                              <button
                                onClick={() => handleOpenReviewModal(ord)}
                                className="p-1 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#D6C9B9] transition-all cursor-pointer"
                                title="Rate & Review"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              </button>

                              <button
                                onClick={() => handleOpenMessaging(ord)}
                                className="p-1 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#D6C9B9] transition-all cursor-pointer"
                                title="Message Staff"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-[#48A63E]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SECTION 2: CUSTOM FURNITURE (ONLY IF customOrders.length > 0) */}
              {/* ========================================================================= */}
              {customOrders.length > 0 && (activeFilter === 'all' || activeFilter === 'custom') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EFE7DE]">
                    <div className="flex items-center gap-2 text-xs font-black text-[#2C241D]">
                      <div className="w-5 h-5 rounded-lg bg-[#9C7A4B]/15 border border-[#9C7A4B]/30 flex items-center justify-center text-[#9C7A4B]">
                        <Layers className="w-3 h-3" />
                      </div>
                      <span>Bespoke Custom Furniture ({filteredCustomOrders.length})</span>
                    </div>
                    <button
                      onClick={() => navigateToTab('create')}
                      className="text-[11px] font-black text-[#48A63E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Custom Build</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredCustomOrders.map((ord) => {
                      const stageIdx = getCustomStageIndex(ord.current_stage || 'Material Sourcing');
                      const refImgs = ord.reference_image ? parseReferenceImages(ord.reference_image) : [];

                      return (
                        <div
                          key={ord.custom_order_id}
                          className="bg-gradient-to-b from-white/95 to-[#FAF8F5]/80 border-2 border-[#E2D7CB] rounded-3xl p-4 shadow-sm hover:shadow-md hover:border-[#9C7A4B]/50 transition-all duration-300 flex flex-col justify-between space-y-3"
                        >
                          {(() => {
                            const isQcPending = ord.order_status === 'QC_PENDING' || ord.order_status === 'QC Pending' || (ord as any).qc_status === 'QC_PENDING';
                            const isCompleted = ord.order_status === 'Completed' || (ord as any).qc_status === 'QC_PASSED';
                            const sections = getStageSections(ord.current_stage || ord.furniture_type, ord.furniture_type);
                            const totalSections = sections.length;
                            const isPaused = (ord.order_status || '').toLowerCase().includes('paused') || (ord as any).is_paused;
                            const progressPct = isCompleted ? 100 : isQcPending ? 90 : (ord.progress_percentage ?? ((stageIdx + 1) * 20));

                            return (
                              <>
                                <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2.5">
                                  <span className="text-xs font-mono font-black text-[#2C241D] bg-[#FAF7F2] px-2.5 py-1 rounded-xl border border-[#E2D7CB]">
                                    #{ord.custom_order_id} • {ord.furniture_type}
                                  </span>
                                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                                    isCompleted
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : isQcPending
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : getStatusBadgeColor(ord.order_status)
                                  }`}>
                                    {isCompleted ? 'Completed (QC Passed)' : isQcPending ? 'QC Inspection Pending' : formatStatusLabel(ord.order_status)}
                                  </span>
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    {refImgs.length > 0 ? (
                                      <img
                                        src={refImgs[0]}
                                        alt={ord.furniture_type}
                                        onClick={() => openImageInNewTab(refImgs[0])}
                                        className="w-14 h-14 rounded-2xl object-cover border-2 border-[#E2D7CB] shadow-xs shrink-0 cursor-pointer"
                                      />
                                    ) : (
                                      <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border-2 border-[#E2D7CB] flex items-center justify-center text-[#9C7A4B] shrink-0">
                                        <Layers className="w-6 h-6 opacity-70" />
                                      </div>
                                    )}

                                    <div className="text-[11px] text-[#5C4E42] space-y-0.5">
                                      <div>Wood: <strong>{ord.material}</strong></div>
                                      <div>Finish: <strong>{ord.color}</strong></div>
                                      <div>Size: <strong>{ord.dimensions}</strong></div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-sm font-black text-[#38A132] block">
                                      {ord.estimated_price ? formatCurrency(ord.estimated_price) : 'Reviewing'}
                                    </span>
                                    {(ord.payment_status === 'Paid' || ord.order_status === 'Paid') ? (
                                      <button
                                        onClick={() => downloadPaymentReceipt(ord)}
                                        className="text-[10px] font-black text-[#38A132] hover:underline inline-flex items-center gap-0.5 mt-1 cursor-pointer"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Receipt</span>
                                      </button>
                                    ) : ord.estimated_price ? (
                                      <div className="flex items-center gap-1.5 mt-1.5 justify-end flex-wrap">
                                        <button
                                          onClick={() => handlePayCustomOrder(ord)}
                                          className="px-2.5 py-1 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-[10px] font-black shadow-xs cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                        >
                                          <CreditCard className="w-3 h-3" />
                                          <span>Pay Now</span>
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                {/* Workshop Live Progress Bar & Step Breakdown */}
                                <div className="pt-2 border-t border-[#EFE7DE] space-y-2">
                                  {isPaused && (
                                    <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-bold flex items-center gap-1.5">
                                      <Pause className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                      <span>Production Paused: Worker temporarily paused stage</span>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-[#7A6C5E] font-bold flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-[#38A132]" /> {isCompleted ? 'Completed (QC Passed)' : isQcPending ? 'Quality Inspection Pending' : (ord.current_stage || 'Manufacturing Stage')}
                                    </span>
                                    <span className="font-black text-[#38A132]">
                                      {progressPct}% Complete
                                    </span>
                                  </div>

                                  <div className="w-full bg-[#E2D7CB] rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-300 ${
                                        isPaused ? 'bg-amber-500' : progressPct >= 100 ? 'bg-[#38A132]' : isQcPending ? 'bg-amber-500 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-[#38A132]'
                                      }`}
                                      style={{ width: `${progressPct}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Procedural Stepper Ribbon */}
                                <div className="grid grid-cols-4 gap-1 pt-0.5">
                                  {sections.map((sec, sIdx) => {
                                    const isDone = progressPct >= (sIdx + 1) * 25;
                                    return (
                                      <div
                                        key={sec.id}
                                        title={`Step ${sIdx + 1}: ${sec.title}`}
                                        className={`p-1 rounded-md text-[9px] text-center font-bold truncate ${
                                          isDone ? 'bg-[#38A132]/15 text-[#2D6338] border border-[#38A132]/30' : 'bg-[#FAF7F2] text-[#7A6C5E] border border-[#E2D7CB]'
                                        }`}
                                      >
                                        {isDone ? `✓ Step ${sIdx + 1}` : `Step ${sIdx + 1}`}
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SECTION 3: FABRICATION SERVICES (ONLY IF fabrications.length > 0) */}
              {/* ========================================================================= */}
              {fabrications.length > 0 && (activeFilter === 'all' || activeFilter === 'fabrication') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EFE7DE]">
                    <div className="flex items-center gap-2 text-xs font-black text-[#2C241D]">
                      <div className="w-5 h-5 rounded-lg bg-[#38A132]/15 border border-[#38A132]/30 flex items-center justify-center text-[#38A132]">
                        <Scissors className="w-3 h-3" />
                      </div>
                      <span>Fabrication Work ({filteredFabrications.length})</span>
                    </div>
                    <button
                      onClick={() => navigateToTab('fabricate')}
                      className="text-[11px] font-black text-[#38A132] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Sizing Job</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredFabrications.map((f) => {
                      const activeStg = f.active_stage || (f.production_stages && f.production_stages[0]);
                      const stgName = activeStg ? activeStg.stage_name : f.service_type;
                      const sections = getStageSections(stgName, f.service_type);
                      const completedSections = activeStg ? (activeStg.completed_sections || []) : [];
                      const checkedCount = completedSections.length;
                      const totalSections = sections.length;
                      const isPaused = Boolean(f.is_paused || (activeStg && activeStg.status === 'PAUSED'));
                      const pauseReason = f.pause_reason || (activeStg && activeStg.pause_reason) || 'Temporarily paused for curing/drying';
                      const isQcPending = f.status === 'QC_PENDING' || f.status === 'QC Pending' || (f as any).qc_status === 'QC_PENDING';
                      const isCompleted = f.status === 'COMPLETED' || f.status === 'Completed' || (f as any).qc_status === 'QC_PASSED';
                      const progressPct = isCompleted
                        ? 100
                        : isQcPending
                        ? 90
                        : totalSections > 0
                        ? Math.round((checkedCount / totalSections) * 100)
                        : (f.overall_progress_percentage || (activeStg ? activeStg.progress_percentage : 0));

                      return (
                        <div
                          key={f.fabrication_id}
                          className="bg-gradient-to-b from-white/95 to-[#FAF8F5]/80 border-2 border-[#E2D7CB] rounded-3xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2.5">
                            <span className="text-xs font-mono font-black text-[#2C241D] bg-[#FAF7F2] px-2.5 py-1 rounded-xl border border-[#E2D7CB]">
                              #{f.fabrication_id} • {f.service_type}
                            </span>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              isPaused
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isQcPending
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : f.payment_status === 'Paid' || f.status === 'PAID'
                                ? 'bg-[#38A132]/10 text-[#38A132] border-[#38A132]/30'
                                : getStatusBadgeColor(f.status)
                            }`}>
                              {isPaused ? '⏸️ PAUSED' : isCompleted ? 'Completed (QC Passed)' : isQcPending ? 'QC Inspection Pending' : f.payment_status === 'Paid' ? 'Paid ✓' : formatStatusLabel(f.status)}
                            </span>
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/20 border-2 border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                                <Scissors className="w-6 h-6" />
                              </div>

                              <div className="text-[11px] text-[#5C4E42] space-y-0.5">
                                <div>Source: <strong>{f.material_source}</strong></div>
                                <div>Dimensions: <strong>{f.dimensions}</strong></div>
                                <div>Quantity: <strong>{f.quantity} sheet(s)</strong></div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-sm font-black text-[#38A132] block">
                                {f.estimated_price ? formatCurrency(f.estimated_price) : 'Under Examination'}
                              </span>
                              {f.estimated_price && f.payment_status !== 'Paid' && f.status !== 'PAID' && f.status !== 'Paid' ? (
                                <div className="flex items-center gap-1.5 mt-1.5 justify-end flex-wrap">
                                  <button
                                    onClick={() => handlePayFabricationActivity(f)}
                                    className="px-2.5 py-1 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-[10px] font-black shadow-xs cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Pay Now</span>
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {/* Live Manufacturing Progress Tracker & Sections */}
                          <div className="pt-2 border-t border-[#EFE7DE] space-y-1.5">
                            {isPaused && (
                              <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-[10px] font-bold flex items-center gap-1.5">
                                <Pause className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>Paused: {pauseReason}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-[#7A6C5E] font-bold flex items-center gap-1">
                                <Hammer className="w-3 h-3 text-[#38A132]" />
                                <span>{isCompleted ? 'Completed (QC Passed)' : isQcPending ? 'Quality Inspection Pending' : stgName}</span>
                              </span>
                              <span className="font-mono text-xs font-black text-[#38A132]">{progressPct}%</span>
                            </div>

                            <div className="w-full bg-[#E2D7CB] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  isPaused ? 'bg-amber-500' : progressPct >= 100 ? 'bg-[#38A132]' : isQcPending ? 'bg-amber-500 animate-pulse' : 'bg-gradient-to-r from-blue-500 to-[#38A132]'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>

                            {/* 4-Step Milestone Pills */}
                            <div className="grid grid-cols-4 gap-1 pt-0.5">
                              {sections.map((sec, sIdx) => {
                                const isDone = completedSections.includes(sec.id) || progressPct >= (sIdx + 1) * 25;
                                return (
                                  <div
                                    key={sec.id}
                                    title={`Step ${sIdx + 1}: ${sec.title}`}
                                    className={`p-1 rounded-md text-[9px] text-center font-bold truncate ${
                                      isDone ? 'bg-[#38A132]/15 text-[#2D6338] border border-[#38A132]/30' : 'bg-[#FAF7F2] text-[#7A6C5E] border border-[#E2D7CB]'
                                    }`}
                                  >
                                    {isDone ? `✓ Step ${sIdx + 1}` : `Step ${sIdx + 1}`}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SECTION 4: SERVICE BOOKINGS (ONLY IF services.length > 0) */}
              {/* ========================================================================= */}
              {services.length > 0 && (activeFilter === 'all' || activeFilter === 'services') && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-[#EFE7DE]">
                    <div className="flex items-center gap-2 text-xs font-black text-[#2C241D]">
                      <div className="w-5 h-5 rounded-lg bg-[#38A132]/15 border border-[#38A132]/30 flex items-center justify-center text-[#38A132]">
                        <Wrench className="w-3 h-3" />
                      </div>
                      <span>Service Appointments ({filteredServices.length})</span>
                    </div>
                    <button
                      onClick={() => navigateToTab('services')}
                      className="text-[11px] font-black text-[#38A132] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Book Service</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredServices.map((s) => {
                      const isExceeded = (() => {
                        if (!s.preferred_date) return false;
                        try {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const target = new Date(s.preferred_date);
                          target.setHours(0, 0, 0, 0);
                          return target < today;
                        } catch {
                          return false;
                        }
                      })();
                      const isFinal = s.status === 'Cancelled' || s.status === 'CANCELLED' || s.status === 'Completed' || s.status === 'COMPLETED';
                      const effectiveStatus = (isExceeded && !isFinal) ? 'Request Cancellation' : s.status;

                      return (
                        <div
                          key={s.service_id}
                          className="bg-gradient-to-b from-white/95 to-[#FAF8F5]/80 border-2 border-[#E2D7CB] rounded-3xl p-4 shadow-sm hover:shadow-md transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2">
                            <span className="text-xs font-mono font-black text-[#2C241D]">
                              #{s.service_id} • {s.service_category}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isExceeded && !isFinal && (
                                <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                  ⚠️ Date Exceeded
                                </span>
                              )}
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                                s.payment_status === 'Paid' || s.status === 'PAID'
                                  ? 'bg-[#38A132]/10 text-[#38A132] border-[#38A132]/30'
                                  : getStatusBadgeColor(effectiveStatus)
                              }`}>
                                {s.payment_status === 'Paid' ? 'Paid ✓' : formatStatusLabel(effectiveStatus)}
                              </span>
                            </div>
                          </div>

                        <div className="text-[11px] text-[#6E6458] flex justify-between items-center">
                          <span className="truncate max-w-[160px]">{s.preferred_date ? `Date: ${s.preferred_date}` : s.address}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-[#38A132]">
                              {s.estimated_price ? formatCurrency(s.estimated_price) : 'Quote on Visit'}
                            </span>
                            {s.estimated_price && s.payment_status !== 'Paid' && (s.status === 'QUOTED' || s.status === 'APPROVED') && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => handleAddServiceToCart(s, e)}
                                  className="px-2.5 py-1 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-[10px] font-black shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay Now</span>
                                </button>
                              </div>
                            )}
                            {s.status === 'Cancelled' || s.status === 'CANCELLED' ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                Cancelled
                              </span>
                            ) : !isFinal && s.payment_status !== 'Paid' && (
                              <button
                                type="button"
                                onClick={() => handleCancelServiceActivity(s.service_id)}
                                className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-[10px] font-black shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                                title="Request cancellation"
                              >
                                <X className="w-3 h-3 text-rose-600" />
                                <span>Request Cancellation</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* SECTION 5: MY MATERIALS */}
              {/* ========================================================================= */}
              {(activeFilter === 'all' || activeFilter === 'materials') && (
                materials.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between pb-1 border-b border-[#EFE7DE]">
                      <div className="flex items-center gap-2 text-xs font-black text-[#2C241D]">
                        <div className="w-5 h-5 rounded-lg bg-[#7A6C5E]/15 border border-[#7A6C5E]/30 flex items-center justify-center text-[#7A6C5E]">
                          <Layers className="w-3 h-3" />
                        </div>
                        <span>My Registered Materials ({filteredMaterials.length})</span>
                      </div>
                      <button
                        onClick={() => setIsRegisterMaterialOpen(true)}
                        className="text-[11px] font-black text-[#48A63E] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Register Material</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {filteredMaterials.map((m) => (
                        <div
                          key={m.material_id}
                          className="bg-gradient-to-b from-white/95 to-[#FAF8F5]/80 border-2 border-[#E2D7CB] rounded-2xl p-3 shadow-2xs space-y-1 text-xs"
                        >
                          <div className="flex justify-between font-black text-[#2C241D] text-[11px]">
                            <span>#{m.material_id} • {m.material_type}</span>
                            <span className="text-[#48A63E] font-bold">{m.status}</span>
                          </div>
                          <div className="text-[10px] text-[#7A6C5E] flex justify-between">
                            <span>{m.wood_type || 'Timber'} ({m.dimensions || 'Standard'})</span>
                            <span className="font-bold text-[#2C241D]">{m.remaining_quantity ?? m.quantity} {m.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeFilter === 'materials' ? (
                  <div className="p-8 text-center bg-white/60 rounded-3xl border border-dashed border-[#E2D7CB] space-y-3">
                    <p className="text-xs text-[#7A6C5E] font-semibold">You have not registered any customer-owned materials yet.</p>
                    <button
                      onClick={() => setIsRegisterMaterialOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#48A63E] text-white text-xs font-bold shadow-md hover:bg-[#3D9134]"
                    >
                      Register Your First Material
                    </button>
                  </div>
                ) : null
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SHIPMENT TRACKING MODAL */}
      {/* ========================================================================= */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#48A63E]" />
                <h3 className="text-base font-extrabold">Delivery Tracking</h3>
              </div>
              <button
                onClick={() => setTrackingModalOrder(null)}
                className="w-7 h-7 rounded-full bg-[#FAF7F2] hover:bg-[#F4ECE1] text-[#7A6C5E] font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E2D7CB] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#7A6C5E]">Order:</span>
                  <span className="font-black text-[#2C241D]">#{trackingModalOrder.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A6C5E]">Status:</span>
                  <span className="font-black text-[#48A63E]">{trackingModalOrder.orderStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A6C5E]">Logistics Carrier:</span>
                  <span className="font-bold text-[#2C241D]">{trackingData?.fulfillment?.carrier || 'RetailSphere Express Fleet'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A6C5E]">Tracking No:</span>
                  <span className="font-mono font-bold text-[#2C241D]">{trackingData?.fulfillment?.tracking_number || `TRK-${trackingModalOrder.orderId}`}</span>
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="space-y-2 pt-1">
                {[
                  { title: 'Order Verified & Packed', desc: 'Central warehouse packed & inspected', done: true },
                  { title: 'Dispatched with Fleet Carrier', desc: 'Handed to express driver', done: trackingModalOrder.orderStatus === 'Shipped' || trackingModalOrder.orderStatus === 'Delivered' || (trackingModalOrder as any).status === 'Dispatched' },
                  { title: 'Out for Local Delivery', desc: 'Vehicle arriving at delivery address', done: trackingModalOrder.orderStatus === 'Delivered' },
                  { title: 'Delivered', desc: 'Package delivered to customer', done: trackingModalOrder.orderStatus === 'Delivered' }
                ].map((m, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      m.done ? 'bg-[#48A63E] text-white' : 'bg-[#E5DCD0] text-white'
                    }`}>
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                    <div>
                      <div className={`text-xs font-extrabold ${m.done ? 'text-[#2C241D]' : 'text-[#A69B8D]'}`}>
                        {m.title}
                      </div>
                      <div className="text-[10px] text-[#7A6C5E]">{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setTrackingModalOrder(null)}
              className="w-full py-2.5 rounded-xl bg-[#48A63E] text-white text-xs font-black cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RATING & REVIEW MODAL */}
      {/* ========================================================================= */}
      {reviewModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="text-base font-extrabold">Rate Purchase</h3>
              </div>
              <button
                onClick={() => setReviewModalOrder(null)}
                className="w-7 h-7 rounded-full bg-[#FAF7F2] hover:bg-[#F4ECE1] text-[#7A6C5E] font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {reviewSuccess ? (
              <div className="text-center py-4 space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-extrabold text-[#2C241D]">Rating Submitted!</h4>
                <p className="text-xs text-[#7A6C5E]">Thank you for your verified feedback.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3.5 text-xs">
                <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                  <span className="font-extrabold text-[#2C241D] text-xs">
                    {reviewModalOrder.items[0]?.name || 'Retail Order'}
                  </span>
                </div>

                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= reviewRating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-[#D6C9B9]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-[#48A63E]">
                    {reviewRating === 5 ? '⭐⭐⭐⭐⭐ Exceptional (5/5)' : `${reviewRating} / 5 Stars`}
                  </span>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Write a quick comment on quality, comfort or delivery..."
                    className="w-full p-2.5 rounded-xl border border-[#E2D7CB] bg-white text-xs focus:outline-none focus:border-[#48A63E]"
                  />
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalOrder(null)}
                    className="flex-1 py-2 rounded-xl bg-[#FAF7F2] font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="flex-1 py-2 rounded-xl bg-[#48A63E] text-white font-black text-xs cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ORDER MESSAGING MODAL */}
      {/* ========================================================================= */}
      {messagingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-3 text-[#2C241D] flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2.5 shrink-0">
              <h3 className="text-sm font-extrabold">Order #{messagingModalOrder.orderId} Messages</h3>
              <button
                onClick={() => setMessagingModalOrder(null)}
                className="w-7 h-7 rounded-full bg-[#FAF7F2] text-[#7A6C5E] font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] min-h-[140px]">
              {orderMessages.length === 0 ? (
                <div className="text-center py-6 text-[11px] text-[#7A6C5E]">
                  No messages yet. Send a note to reach our fulfillment team.
                </div>
              ) : (
                orderMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-xl text-xs max-w-[85%] ${
                      m.sender_role === 'Customer'
                        ? 'bg-[#48A63E] text-white ml-auto'
                        : 'bg-white text-[#2C241D] border border-[#E2D7CB]'
                    }`}
                  >
                    <div className="text-[9px] font-bold opacity-80 mb-0.5">{m.sender_name}</div>
                    <div>{m.message}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 rounded-xl border border-[#E2D7CB] bg-white text-xs focus:outline-none focus:border-[#48A63E]"
              />
              <button
                type="submit"
                disabled={sendingMsg || !newMessageText.trim()}
                className="p-2 rounded-xl bg-[#48A63E] text-white cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MATERIAL REGISTRATION MODAL */}
      {/* ========================================================================= */}
      {isRegisterMaterialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-2 border-[#E2D7CB] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#E2D7CB] pb-2.5">
              <h3 className="text-base font-extrabold text-[#2C241D]">Register Material</h3>
              <button
                onClick={() => setIsRegisterMaterialOpen(false)}
                className="w-7 h-7 rounded-full bg-[#FAF7F2] text-[#7A6C5E] font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterMaterialSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-black text-[#7A6C5E] uppercase text-[10px] mb-1">Material Type</label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#E2D7CB] bg-white font-bold text-[#2C241D]"
                >
                  <option value="Timber Wood">Timber Wood / Lumber</option>
                  <option value="Wood Slabs">Natural Wood Slabs / Logs</option>
                  <option value="Upholstery Fabric">Upholstery Fabric</option>
                  <option value="Genuine Leather">Genuine Leather Sheet</option>
                  <option value="Plywood / MDF">Plywood / MDF Board</option>
                </select>
              </div>

              <div>
                <label className="block font-black text-[#7A6C5E] uppercase text-[10px] mb-1">Species / Spec</label>
                <input
                  type="text"
                  value={matWoodType}
                  onChange={(e) => setMatWoodType(e.target.value)}
                  placeholder="e.g. Teak, White Oak"
                  className="w-full p-2 rounded-xl border border-[#E2D7CB] font-bold text-[#2C241D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black text-[#7A6C5E] uppercase text-[10px] mb-1">Quantity</label>
                  <input
                    type="number"
                    value={matQuantity}
                    onChange={(e) => setMatQuantity(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#E2D7CB] font-bold text-[#2C241D]"
                  />
                </div>
                <div>
                  <label className="block font-black text-[#7A6C5E] uppercase text-[10px] mb-1">Unit</label>
                  <select
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#E2D7CB] bg-white font-bold text-[#2C241D]"
                  >
                    <option value="sq_ft">sq ft</option>
                    <option value="cubic_ft">cu ft</option>
                    <option value="meters">Meters</option>
                    <option value="pieces">Pieces</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterMaterialOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-[#FAF7F2] font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMat}
                  className="flex-1 py-2 rounded-xl bg-[#48A63E] text-white font-black text-xs cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {submittingMat ? 'Saving...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
