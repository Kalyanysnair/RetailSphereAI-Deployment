import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  Star, 
  ArrowLeft, 
  Calendar, 
  X, 
  Send,
  ThumbsUp,
  Loader2,
  Plus,
  Pencil,
  Lock,
  ShoppingBag,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  FileText,
  Download,
  MessageSquare,
  Clock,
  ShieldCheck,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Layers,
  Scissors,
  Wrench,
  ShoppingCart,
  Sparkles
} from 'lucide-react';
import { Header } from '../dashboard/Header';
import { fetchCustomOrders, getFurnitureImageUrl, cancelCustomOrder, payCustomOrder, downloadPaymentReceipt, CustomOrderData, isCustomerOrderMatch } from '../../services/api_production';
import { openRazorpayCheckout } from '../../services/razorpay';
import { validateAddressApi } from '../../services/api';
import { addToCart, getCartItems } from '../../utils/cartStorage';
import { getStoredRetailOrders, cancelStoredRetailOrder, fetchRetailOrdersFromDB } from '../../utils/retailOrdersStorage';
import { CustomerReworkTicketCard } from './CustomerReworkTicketCard';
import { CustomerReworkRequestModal } from './CustomerReworkRequestModal';
import {
  fetchReworkTicketsApi,
  customerDecisionReworkTicketApi,
  payReworkTicketApi,
  ReworkTicketItem
} from '../../services/api_quality';
import { parseReferenceImages } from '../../utils/imageUtils';
import { formatStatusLabel, getStatusBadgeColor } from '../../utils/statusUtils';
import { formatToIST } from '../../utils/timeUtils';
import { 
  fetchOrderFulfillmentDetails,
  fetchOrderHistoryAPI,
  fetchOrderMessagesAPI,
  sendOrderMessageAPI,
  cancelOrderAPI,
  submitReturnRequestAPI,
  FulfillmentDetails,
  StatusHistoryItem,
  OrderMessageItem
} from '../../services/retailOrdersFulfillmentApi';

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
  deadline?: string;
  estimated_price?: number;
  status: string;
  qc_status?: string;
  overall_progress_percentage?: number;
  active_stage?: any;
  production_stages?: any[];
  payment_status?: string;
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

interface OrderItem {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  quantity: number;
  specifications?: string;
}

interface OrderData {
  orderId: string;
  numericId: number;
  type?: 'standard' | 'custom' | 'fabrication' | 'service';
  date: string;
  status: string;
  current_stage?: string;
  progress_percentage?: number;
  qc_status?: string;
  totalPrice: number;
  originalSubtotal?: number;
  couponCode?: string;
  discountType?: string;
  discountDeducted?: number;
  shippingFee?: number;
  items: OrderItem[];
  isCustomBuild?: boolean;
  deliveryAddress?: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  feedbackGiven?: boolean;
  rating?: number;
  feedbackText?: boolean | string;
  is_locked?: boolean;
  sortTimestamp?: number;
  trackingTimeline?: {
    stage: string;
    timestamp?: string;
    completed: boolean;
    current?: boolean;
  }[];
}

interface MyOrdersPageProps {
  hideHeader?: boolean;
}

export const isServiceDateExceeded = (preferredDateStr?: string) => {
  if (!preferredDateStr) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pd = new Date(preferredDateStr);
    pd.setHours(0, 0, 0, 0);
    return pd < today;
  } catch {
    return false;
  }
};

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ hideHeader = false }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [fabrications, setFabrications] = useState<FabricationItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'current' | 'retail' | 'custom' | 'fabrication' | 'services' | 'materials'>('all');
  const [glanceQuery, setGlanceQuery] = useState('');

  const scrollToOrder = (orderId: string) => {
    const el = document.getElementById(`order-card-${orderId}`);
    if (el) {
      const yOffset = -80;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      el.classList.add('ring-2', 'ring-[#48A63E]', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#48A63E]');
      }, 2000);
    }
  };

  const [cartItemIds, setCartItemIds] = useState<string[]>(() => 
    getCartItems().map((item) => item.id)
  );

  useEffect(() => {
    const syncCart = () => {
      setCartItemIds(getCartItems().map((item) => item.id));
    };
    window.addEventListener('cart-updated', syncCart);
    return () => window.removeEventListener('cart-updated', syncCart);
  }, []);

  // Feedback Modal State
  const [feedbackModalOrder, setFeedbackModalOrder] = useState<OrderData | null>(null);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Excellent Craftsmanship', 'Fast Delivery']);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [submittedRatings, setSubmittedRatings] = useState<Record<string, any>>(() => {
    try {
      return JSON.parse(localStorage.getItem('customer_order_ratings') || '{}');
    } catch {
      return {};
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<{ id: string | number; isCustom: boolean } | null>(null);
  const [cancellingServiceId, setCancellingServiceId] = useState<number | null>(null);

  // Tracking & Fulfillment Modal State
  const [trackingModalOrder, setTrackingModalOrder] = useState<OrderData | null>(null);
  const [trackingFulfillmentData, setTrackingFulfillmentData] = useState<FulfillmentDetails | null>(null);
  const [loadingFulfillment, setLoadingFulfillment] = useState(false);

  // Order Communication Messaging Drawer State
  const [messagingModalOrder, setMessagingModalOrder] = useState<OrderData | null>(null);
  const [orderMessages, setOrderMessages] = useState<OrderMessageItem[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Customer Quality Rework State
  const [customerReworkTickets, setCustomerReworkTickets] = useState<ReworkTicketItem[]>([]);
  const [reworkModalItem, setReworkModalItem] = useState<{
    orderType: 'CUSTOM' | 'FABRICATION';
    orderId: number;
    itemTitle: string;
    approvedSpecs: string;
  } | null>(null);
  const [actionLoadingTicketId, setActionLoadingTicketId] = useState<number | null>(null);

  const handleCustomerApproveReworkQuotation = async (ticketId: number) => {
    setActionLoadingTicketId(ticketId);
    try {
      await customerDecisionReworkTicketApi(ticketId, true);
      setToastMessage('Quotation approved! Please proceed with payment if applicable.');
      setTimeout(() => setToastMessage(null), 3500);
      loadOrdersFromDB();
    } catch (err: any) {
      alert(err.message || 'Failed to approve quotation');
    } finally {
      setActionLoadingTicketId(null);
    }
  };

  const handleCustomerDeclineReworkQuotation = async (ticketId: number) => {
    if (!window.confirm('Are you sure you want to decline this rework quotation?')) return;
    setActionLoadingTicketId(ticketId);
    try {
      await customerDecisionReworkTicketApi(ticketId, false);
      setToastMessage('Quotation declined. Our support team will follow up.');
      setTimeout(() => setToastMessage(null), 3500);
      loadOrdersFromDB();
    } catch (err: any) {
      alert(err.message || 'Failed to decline quotation');
    } finally {
      setActionLoadingTicketId(null);
    }
  };

  const handleCustomerPayRework = async (ticket: ReworkTicketItem) => {
    const ticketId = ticket.id || ticket.rework_id;
    setActionLoadingTicketId(ticketId);
    try {
      await openRazorpayCheckout({
        amount: Math.round((ticket.additional_cost || 0) * 100),
        name: 'RetailSphere Rework & Modification',
        description: `Rework Ticket #${ticket.ticket_code}`,
        prefill: {
          name: userName,
          email: userEmail || 'customer@retailsphere.com',
        },
        onSuccess: async (paymentId) => {
          try {
            await payReworkTicketApi(ticketId, paymentId);
            setToastMessage('Rework payment received! Workshop artisan assigned.');
            setTimeout(() => setToastMessage(null), 3500);
            loadOrdersFromDB();
          } catch (e) {
            console.warn('Rework payment record error:', e);
          }
        },
        onFailure: (err) => console.warn('Payment failed:', err)
      });
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setActionLoadingTicketId(null);
    }
  };

  // Return Request Modal State
  const [returnModalOrder, setReturnModalOrder] = useState<OrderData | null>(null);
  const [returnReason, setReturnReason] = useState('Damaged');
  const [returnDescription, setReturnDescription] = useState('');
  const [returnPhotoUrl, setReturnPhotoUrl] = useState('');
  const [returnErrorMsg, setReturnErrorMsg] = useState<string | null>(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const handleOpenTrackingModal = async (ord: OrderData) => {
    setTrackingModalOrder(ord);
    setLoadingFulfillment(true);
    const details = await fetchOrderFulfillmentDetails(ord.orderId);
    setTrackingFulfillmentData(details);
    setLoadingFulfillment(false);
  };

  const handleOpenMessagingModal = async (ord: OrderData) => {
    setMessagingModalOrder(ord);
    const msgs = await fetchOrderMessagesAPI(ord.orderId);
    setOrderMessages(msgs);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = newMessageText.trim();
    if (!messagingModalOrder || !cleanMsg) return;

    setSendingMessage(true);
    const userId = userObj?.user_id || userObj?.id || userObj?.customer_id;
    const ok = await sendOrderMessageAPI(
      messagingModalOrder.orderId,
      'Customer',
      userName,
      cleanMsg,
      userId
    );
    if (ok) {
      setNewMessageText('');
      const updatedMsgs = await fetchOrderMessagesAPI(messagingModalOrder.orderId);
      setOrderMessages(updatedMsgs);
    }
    setSendingMessage(false);
  };

  const handleSubmitReturnRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalOrder) return;
    setReturnErrorMsg(null);

    const descTrim = returnDescription.trim();
    if (!descTrim || descTrim.length < 10) {
      setReturnErrorMsg('Please describe the return reason with at least 10 characters.');
      return;
    }

    const photoTrim = returnPhotoUrl.trim();
    if (photoTrim && !/^https?:\/\//i.test(photoTrim) && !photoTrim.startsWith('data:image/')) {
      setReturnErrorMsg('Please enter a valid image URL starting with http:// or https://');
      return;
    }

    const custId = userObj?.customer_id || userObj?.user_id || 1;
    setSubmittingReturn(true);
    try {
      const res = await submitReturnRequestAPI(
        returnModalOrder.orderId,
        custId,
        returnReason,
        descTrim,
        photoTrim
      );

      if (res.success) {
        setReturnModalOrder(null);
        setReturnDescription('');
        setReturnPhotoUrl('');
        setReturnErrorMsg(null);
        setToastMessage('Return request submitted! Our team will review it shortly.');
        setTimeout(() => setToastMessage(null), 3500);
        loadOrdersFromDB();
      } else {
        setReturnErrorMsg(res.message || 'Could not submit return request. Please try again.');
      }
    } catch (err: any) {
      setReturnErrorMsg(err?.message || 'Failed to submit return request.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const userObj = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const userName = userObj?.full_name || userObj?.username || 'Customer';
  const userEmail = (userObj?.email || userObj?.customer_email || localStorage.getItem('user_email') || '').toLowerCase().trim();

  const formatOrderDate = (rawDate: string) => {
    if (!rawDate) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return rawDate;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return rawDate;
    }
  };

  // Payment Handlers for Fabrication & Services
  const handlePayNowFabrication = async (fab: FabricationItem) => {
    // Check delivery address before payment
    const addressStatus = await validateAddressApi();
    if (!addressStatus || !addressStatus.is_valid) {
      navigate(`/profile?address_required=true&return_to=${encodeURIComponent('/orders')}&reason=fabrication_payment`);
      return;
    }

    await openRazorpayCheckout({
      amount: Math.round((fab.estimated_price || 0) * 100),
      name: 'RetailSphere Wood Fabrication',
      description: `Fabrication Sizing Job #${fab.fabrication_id}`,
      prefill: {
        name: userName,
        email: userEmail || 'customer@retailsphere.com',
      },
      onSuccess: async (paymentId) => {
        try {
          await fetch(`/api/fabrication/requests/${fab.fabrication_id}/pay`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId, payment_status: 'Paid', status: 'Approved' })
          });
        } catch (e) {
          console.warn('Fabrication payment error:', e);
        }
        loadOrdersFromDB();
        setToastMessage('Payment received! Your wood fabrication job has been scheduled.');
        setTimeout(() => setToastMessage(null), 3500);
      },
      onFailure: (err) => console.warn('Payment failed:', err)
    });
  };

  const handlePayNowService = async (srv: ServiceItem) => {
    // Check delivery address before payment
    const addressStatus = await validateAddressApi();
    if (!addressStatus || !addressStatus.is_valid) {
      navigate(`/profile?address_required=true&return_to=${encodeURIComponent('/orders')}&reason=service_payment`);
      return;
    }

    await openRazorpayCheckout({
      amount: Math.round((srv.estimated_price || 0) * 100),
      name: 'RetailSphere On-Site Service',
      description: `On-Site Service Request #${srv.service_id}`,
      prefill: {
        name: userName,
        email: userEmail || 'customer@retailsphere.com',
      },
      onSuccess: async (paymentId) => {
        try {
          await fetch(`/api/services/requests/${srv.service_id}/pay`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId, payment_status: 'Paid', status: 'Approved' })
          });
        } catch (e) {
          console.warn('Service payment error:', e);
        }
        loadOrdersFromDB();
        setToastMessage('Payment received! Your artisan appointment is confirmed.');
        setTimeout(() => setToastMessage(null), 3500);
      },
      onFailure: (err) => console.warn('Payment failed:', err)
    });
  };

  const handleAddFabricationToCart = (fab: FabricationItem) => {
    addToCart({
      id: `fab_${fab.fabrication_id}`,
      name: `Wood Fabrication - ${fab.service_type || 'Precision Cutting'}`,
      price: fab.estimated_price || 0,
      quantity: fab.quantity || 1,
      imageUrl: fab.drawing_image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
      material: `Wood: ${fab.material_source} • Specs: ${fab.dimensions}`,
      category: 'Fabrication Service'
    });
    navigate('/cart');
  };

  const handleAddServiceToCart = (srv: ServiceItem) => {
    addToCart({
      id: `srv_${srv.service_id}`,
      name: `On-Site Service - ${srv.service_category || 'Skilled Carpenter'}`,
      price: srv.estimated_price || 0,
      quantity: 1,
      imageUrl: (srv.photos ? parseReferenceImages(srv.photos)[0] : '') || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      material: `Location: ${srv.address}, ${srv.city} • Date: ${srv.preferred_date || 'Scheduled'} • Time: ${srv.preferred_time || 'Morning'}`,
      category: 'On-Site Service'
    });
    navigate('/cart');
  };

  const handleAddCustomToCart = (order: OrderData) => {
    addToCart({
      id: `custom_${order.numericId}`,
      name: order.items[0]?.name || 'Custom Furniture Piece',
      price: order.totalPrice,
      quantity: 1,
      imageUrl: order.items[0]?.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
      material: order.items[0]?.specifications || 'Custom Workshop Specs',
      category: 'Custom Furniture'
    });
    navigate('/cart');
  };

  const handleCancelFabrication = async (fabId: number) => {
    if (!window.confirm('Are you sure you want to cancel this fabrication request?')) return;
    try {
      await fetch(`/api/fabrication/requests/${fabId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      loadOrdersFromDB();
      setToastMessage('Fabrication request cancelled.');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e) {
      console.warn('Cancel error:', e);
    }
  };

  const handleCancelService = async (srvId: number) => {
    if (!window.confirm('Are you sure you want to cancel this on-site service appointment?')) return;
    setCancellingServiceId(srvId);
    try {
      setServices(prev => prev.map(s => s.service_id === srvId ? { ...s, status: 'Cancelled' } : s));

      const res = await fetch(`/api/services/requests/${srvId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      if (res.ok) {
        setToastMessage('On-site service appointment cancelled successfully.');
        setTimeout(() => setToastMessage(null), 3500);
      }
      await loadOrdersFromDB();
    } catch (e) {
      console.warn('Cancel error:', e);
      await loadOrdersFromDB();
    } finally {
      setCancellingServiceId(null);
    }
  };

  // Load orders strictly fetched from Database API for the active logged-in user session
  const loadOrdersFromDB = async () => {
    setLoading(true);
    try {
      const sessionEmail = userEmail;
      const sessionUserId = userObj?.id || userObj?.customer_id || userObj?.user_id;

      // 1. Custom Orders
      const allCustomOrders = await fetchCustomOrders();
      const userCustomOrders = allCustomOrders.filter((o) => {
        if (!userObj) return true;
        return isCustomerOrderMatch(o, userObj);
      });

      const finalCustomOrders = userCustomOrders;

      const formatted: OrderData[] = finalCustomOrders.map((o) => {
        const stages = [
          'Material Sourcing',
          'Cutting & Joinery',
          'Assembly & Upholstery',
          'Quality Control & Finishing',
          'Ready for Dispatch'
        ];
        const currentStageIdx = stages.findIndex(s => s.toLowerCase() === (o.current_stage || '').toLowerCase());
        const activeIdx = currentStageIdx >= 0 ? currentStageIdx : 0;

        return {
          orderId: `CUSTOM-${o.custom_order_id}`,
          numericId: o.custom_order_id,
          type: 'custom',
          date: o.order_date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: o.order_status || 'Pending Approval',
          current_stage: o.current_stage,
          progress_percentage: o.progress_percentage,
          qc_status: o.qc_status,
          totalPrice: o.estimated_price || 0,
          isCustomBuild: true,
          is_locked: o.is_locked,
          sortTimestamp: o.order_date ? new Date(o.order_date).getTime() : Date.now() + o.custom_order_id * 1000,
          deliveryAddress: 'Ettumanoor, Kottayam, Kerala 686631',
          estimatedDelivery: o.order_status === 'Completed' ? 'Delivered' : '7-10 Business Days',
          trackingNumber: `TRACK-CUST-${o.custom_order_id}`,
          items: [
            {
              id: `item-${o.custom_order_id}`,
              name: o.furniture_type,
              category: 'Custom Studio',
              image: o.reference_image ? parseReferenceImages(o.reference_image)[0] || '' : '',
              price: o.estimated_price || 0,
              quantity: 1,
              specifications: `Material: ${o.material} • Upholstery: ${o.color} • Specs: ${o.dimensions}${o.design_description ? ` • Notes: ${o.design_description}` : ''}`
            }
          ],
          trackingTimeline: stages.map((stg, idx) => ({
            stage: stg,
            timestamp: idx <= activeIdx ? 'Completed' : 'Pending',
            completed: idx <= activeIdx,
            current: idx === activeIdx
          }))
        };
      });

      // 2. Retail Orders
      let formattedRetailOrders: OrderData[] = [];
      try {
        const storedRetailOrders = await fetchRetailOrdersFromDB();

        const userRetailOrders = storedRetailOrders.filter((r) => {
          if (!userObj && !sessionEmail && !sessionUserId) return true;
          const oEmail = (r.email || '').toLowerCase().trim();
          const oCustomerId = r.customerId || (r as any).customer_id;
          const oUserId = (r as any).userId || (r as any).user_id;

          if (sessionUserId && (
            (oUserId && Number(oUserId) === Number(sessionUserId)) ||
            (oCustomerId && Number(oCustomerId) === Number(sessionUserId))
          )) return true;

          if (sessionEmail && oEmail && oEmail === sessionEmail) return true;

          return false;
        });

        const finalRetailOrders = userRetailOrders;

        formattedRetailOrders = finalRetailOrders.map((r, index) => ({
          orderId: r.orderId,
          numericId: 9000 + index,
          type: 'standard',
          date: r.orderDate,
          status: r.orderStatus || r.completionStatus || 'Order Placed',
          totalPrice: r.totalAmount,
          originalSubtotal: r.originalSubtotal,
          couponCode: r.couponCode,
          discountType: r.discountType,
          discountDeducted: r.discountDeducted,
          shippingFee: r.shippingFee,
          isCustomBuild: false,
          is_locked: true,
          sortTimestamp: r.createdAt || (r.orderDate ? new Date(r.orderDate).getTime() : Date.now() - index * 1000),
          items: r.items.map((i) => ({
            id: i.id,
            name: i.name,
            category: 'Ready-Made Store Furniture',
            image: i.imageUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
            price: i.price,
            quantity: i.quantity,
            specifications: `${i.quantity} Unit(s) • Ready-Made Store Purchase${r.paymentId ? ` • Payment ID: ${r.paymentId}` : ''}`,
          })),
          trackingTimeline: [
            { stage: 'Order Placed & Paid (Razorpay)', completed: true, current: false },
            { stage: 'Warehouse Processing', completed: true, current: true },
            { stage: 'Dispatched for Delivery', completed: false, current: false },
            { stage: 'Delivered to Customer', completed: false, current: false },
          ],
        }));
      } catch (retailErr) {
        console.warn('Retail orders load error:', retailErr);
      }

      // 3. Fabrication Requests
      try {
        const fRes = await fetch(`/api/fabrication/requests?customer_email=${encodeURIComponent(sessionEmail)}`);
        if (fRes.ok) {
          const fData = await fRes.json();
          setFabrications(Array.isArray(fData) ? fData : []);
        }
      } catch (e) {
        console.warn('Fabrication load err:', e);
      }

      // 4. Service Requests
      try {
        const sRes = await fetch(`/api/services/requests?customer_email=${encodeURIComponent(sessionEmail)}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setServices(Array.isArray(sData) ? sData : []);
        }
      } catch (e) {
        console.warn('Service load err:', e);
      }

      // 5. Materials
      try {
        const mRes = await fetch(`/api/materials/customer?customer_email=${encodeURIComponent(sessionEmail)}`);
        if (mRes.ok) {
          const mData = await mRes.json();
          setMaterials(Array.isArray(mData) ? mData : []);
        }
      } catch (e) {
        console.warn('Materials load err:', e);
      }

      // 6. Quality Rework Tickets
      try {
        const reworkTickets = await fetchReworkTicketsApi();
        setCustomerReworkTickets(Array.isArray(reworkTickets) ? reworkTickets : []);
      } catch (e) {
        console.warn('Customer rework tickets load err:', e);
      }

      const isExcludedId = (idVal: any) => {
        if (!idVal) return false;
        const str = String(idVal).toLowerCase().replace(/[^a-z0-9]/g, '');
        return str.includes('103') || str.includes('0103') || str.includes('102') || str.includes('13');
      };

      const mergedOrders = [...formatted, ...formattedRetailOrders].filter(o => 
        !isExcludedId(o.orderId) && !isExcludedId(o.numericId)
      );
      mergedOrders.sort((a, b) => (b.sortTimestamp || 0) - (a.sortTimestamp || 0));
      setOrders(mergedOrders);
    } catch (err) {
      console.error('Error fetching DB orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrdersFromDB();
    const handleUpdate = () => loadOrdersFromDB();
    window.addEventListener('retail-orders-updated', handleUpdate);
    window.addEventListener('custom-orders-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('retail-orders-updated', handleUpdate);
      window.removeEventListener('custom-orders-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackModalOrder) return;

    setSubmittingFeedback(true);

    const orderKey = feedbackModalOrder.orderId;
    const ratingObj = {
      rating,
      feedbackText,
      tags: selectedTags,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    // Save to local storage for persistent customer dashboard rendering
    const updated = {
      ...submittedRatings,
      [orderKey]: ratingObj
    };
    setSubmittedRatings(updated);
    localStorage.setItem('customer_order_ratings', JSON.stringify(updated));

    // Submit backend product review if product items present
    if (feedbackModalOrder.items) {
      for (const item of feedbackModalOrder.items) {
        const pid = (item as any).productId || (item as any).id || (item as any).product_id;
        if (pid && typeof pid === 'number') {
          try {
            await fetch('/api/reviews', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                product_id: pid,
                rating: rating,
                review: feedbackText || 'Excellent product!',
                user_email: userObj?.email || 'customer@gmail.com',
                customer_name: userObj?.full_name || 'Customer'
              })
            });
          } catch (err) {
            console.warn('Backend review submission note:', err);
          }
        }
      }
    }

    setOrders(prev => prev.map(o => {
      if (o.orderId === feedbackModalOrder.orderId) {
        return {
          ...o,
          feedbackGiven: true,
          rating,
          feedbackText
        };
      }
      return o;
    }));

    setSubmittingFeedback(false);
    setFeedbackModalOrder(null);
    setToastMessage(`Thank you! Your rating and feedback have been saved.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'retail') return !o.isCustomBuild;
    if (activeTab === 'custom') return o.isCustomBuild;
    if (activeTab === 'current') return o.status === 'Pending' || o.status === 'Pending Approval' || o.status === 'Quote Provided' || o.status === 'Order Placed' || o.status === 'In Production' || o.status === 'Approved' || o.status === 'Processing' || o.status === 'Shipped' || o.status === 'Warehouse Processing' || o.status === 'Paid' || o.status === 'Packed' || o.status === 'Dispatched' || o.status === 'Out for Delivery';
    if (activeTab === 'fabrication' || activeTab === 'services' || activeTab === 'materials') return false;
    return true;
  });

  const filteredFabrications = fabrications.filter(f => {
    if (activeTab === 'all' || activeTab === 'fabrication') return true;
    if (activeTab === 'current') return f.status !== 'Completed' && f.status !== 'Cancelled';
    return false;
  });

  const filteredServices = services.filter(s => {
    if (activeTab === 'all' || activeTab === 'services') return true;
    if (activeTab === 'current') return s.status !== 'Completed' && s.status !== 'Cancelled';
    return false;
  });

  const filteredMaterials = materials.filter(m => {
    if (activeTab === 'all' || activeTab === 'materials') return true;
    return false;
  });

  const totalItemsCount = filteredOrders.length + filteredFabrications.length + filteredServices.length + filteredMaterials.length;

  const parseToTimestamp = (val: any, fallbackId?: number): number => {
    if (typeof val === 'number' && val > 1000000000) return val;
    if (typeof val === 'string' && val.trim()) {
      const t = new Date(val).getTime();
      if (!isNaN(t) && t > 1000000000) return t;
    }
    if (fallbackId && fallbackId > 0) return fallbackId * 1000;
    return 0;
  };

  type UnifiedItem =
    | { kind: 'order'; data: OrderData; timestamp: number }
    | { kind: 'fabrication'; data: FabricationItem; timestamp: number }
    | { kind: 'service'; data: ServiceItem; timestamp: number }
    | { kind: 'material'; data: MaterialItem; timestamp: number };

  const unifiedItems: UnifiedItem[] = [
    ...filteredOrders.map((o) => ({
      kind: 'order' as const,
      data: o,
      timestamp: parseToTimestamp(o.sortTimestamp || o.date, o.numericId),
    })),
    ...filteredFabrications.map((f) => ({
      kind: 'fabrication' as const,
      data: f,
      timestamp: parseToTimestamp(f.created_at, f.fabrication_id),
    })),
    ...filteredServices.map((s) => ({
      kind: 'service' as const,
      data: s,
      timestamp: parseToTimestamp(s.created_at, s.service_id),
    })),
    ...filteredMaterials.map((m) => ({
      kind: 'material' as const,
      data: m,
      timestamp: parseToTimestamp(m.created_at, m.material_id),
    })),
  ];

  // Sort descending: most recent / last requested items at the top
  unifiedItems.sort((a, b) => b.timestamp - a.timestamp);

  const renderSpecBadges = (specs: string) => {
    if (!specs) return null;
    const parts = specs.split('•').map((s) => s.trim()).filter(Boolean);

    const badges: { icon: string; text: string }[] = [];

    parts.forEach((part) => {
      let lower = part.toLowerCase();

      if (lower.startsWith('material:')) {
        const clean = part.replace(/material:/i, '').trim();
        badges.push({ icon: '🪵', text: clean });
      } else if (lower.startsWith('upholstery:')) {
        const clean = part.replace(/upholstery:/i, '').trim();
        badges.push({ icon: '🧵', text: clean });
      } else if (lower.startsWith('specs:')) {
        const clean = part.replace(/specs:/i, '').trim();
        badges.push({ icon: '📐', text: clean });
      } else if (lower.startsWith('notes:')) {
        const notesRaw = part.replace(/notes:/i, '').trim();

        // Check if notes contains Aspects: [...]
        const aspectsMatch = notesRaw.match(/Aspects:\s*\[(.*?)\]/i);
        if (aspectsMatch && aspectsMatch[1]) {
          const aspectItems = aspectsMatch[1]
            .split(';')
            .map((a) => a.trim())
            .filter(Boolean);
          aspectItems.forEach((asp) => {
            const val = asp.includes(':') ? asp.split(':')[1].trim() : asp;
            if (val) {
              let icon = '✨';
              const aspLower = asp.toLowerCase();
              if (aspLower.includes('size') || aspLower.includes('king') || aspLower.includes('queen') || aspLower.includes('capacity') || aspLower.includes('seater')) {
                icon = '🛏️';
              } else if (aspLower.includes('storage') || aspLower.includes('drawer') || aspLower.includes('lift')) {
                icon = '📦';
              } else if (aspLower.includes('comfort') || aspLower.includes('cushion') || aspLower.includes('firmness')) {
                icon = '🛋️';
              } else if (aspLower.includes('leg') || aspLower.includes('armrest') || aspLower.includes('style')) {
                icon = '🪵';
              }
              badges.push({ icon, text: val });
            }
          });
        }

        // Check if notes contains Special Requirements: ...
        const specialMatch = notesRaw.match(/Special Requirements:\s*(.*)/i);
        if (specialMatch && specialMatch[1]) {
          const reqText = specialMatch[1].trim();
          if (reqText && !['nil', 'none', 'n/a', 'no', 'nil.'].includes(reqText.toLowerCase())) {
            badges.push({ icon: '📌', text: `Special: ${reqText}` });
          }
        } else if (!aspectsMatch) {
          if (notesRaw && !['nil', 'none', 'n/a'].includes(notesRaw.toLowerCase())) {
            badges.push({ icon: '📝', text: notesRaw });
          }
        }
      } else if (lower.includes('unit')) {
        badges.push({ icon: '📦', text: part });
      } else if (lower.includes('ready-made') || lower.includes('store')) {
        badges.push({ icon: '🛒', text: part });
      } else if (lower.includes('payment id:')) {
        const clean = part.replace(/payment id:/i, 'Pay ID:').trim();
        badges.push({ icon: '💳', text: clean });
      } else {
        badges.push({ icon: '⚡', text: part });
      }
    });

    if (badges.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {badges.map((b, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] text-[10px] font-bold text-[#4A3E32] shadow-2xs"
          >
            <span className="text-[11px]">{b.icon}</span>
            <span className="truncate max-w-[220px]">{b.text}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen text-[#1C1814] font-sans flex flex-col selection:bg-[#387A46] selection:text-white wood-grain-finish overflow-x-hidden">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#38A132] text-white px-5 py-3 rounded-2xl shadow-xl font-extrabold text-xs flex items-center gap-2 animate-bounce">
          <ThumbsUp className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Subtle Wood Finish Texture & Ambient Atmospheric Background */}
      {/* 1. Organic Vector Wood Grain Curves & Cathedral Growth Rings Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 wood-grain-overlay mix-blend-multiply" />

      {/* 2. Soft Natural Wood Satin Sheen & Top Ambient Light */}
      <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#E5D7C5]/70 via-[#EFE5D7]/40 to-transparent pointer-events-none z-0" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_100%_65%_at_50%_0%,rgba(255,250,242,0.6),rgba(245,239,230,0))] pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_rgba(224,210,192,0.4),_transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(215,198,178,0.35),_transparent_60%)] pointer-events-none" />

      {/* 3. Subtle Warm Ambient Atelier Glow Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-60">
        <div className="absolute -top-24 left-1/4 w-[40rem] h-64 rounded-full bg-[#DFD0BC]/40 blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#E5D7C5]/40 blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-[#DFCEB7]/30 blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[32rem] h-[32rem] rounded-full bg-[#E8DCCB]/35 blur-3xl" />
      </div>

      {/* ORIGINAL MASTER NAVIGATION HEADER (Rendered only when not embedded inside MyActivityTab) */}
      {!hideHeader && <Header />}

      {/* Main Content Area */}
      <main className={`relative z-10 w-full max-w-[1300px] mx-auto space-y-6 ${hideHeader ? 'p-0' : 'p-3 sm:p-5 lg:p-6'}`}>
        {/* Master Unified Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-[#E2D7CB] shadow-xs space-y-5">
          {/* Integrated Header Heading Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
            <div>
              <button
                onClick={() => {
                  if (hideHeader) {
                    window.dispatchEvent(new CustomEvent('change-customer-tab', { detail: 'shop' }));
                  } else {
                    navigate('/dashboard', { state: { activeTab: 'shop' } });
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#48A63E] hover:text-[#3D9134] mb-2 transition-colors cursor-pointer bg-[#48A63E]/10 hover:bg-[#48A63E]/20 px-3 py-1 rounded-full border border-[#48A63E]/20 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Furniture Studio</span>
              </button>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2C241D] tracking-tight">
                My Orders & Tracking
              </h2>
              <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
                Track your store purchases and custom furniture orders in real-time.
              </p>
            </div>

            <Link
              to="/dashboard#custom-order-section"
              onClick={(e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('change-customer-tab', { detail: 'create' }));
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold whitespace-nowrap shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0 text-white" />
              <span className="whitespace-nowrap">Request Custom Order</span>
            </Link>
          </div>

          {/* Tabs Filter Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#EFE7DE] scrollbar-none">
            {[
              { id: 'all', label: 'All Orders & Requests', count: orders.length + fabrications.length + services.length + materials.length },
              { id: 'retail', label: 'Ready-Made Store', count: orders.filter(o => !o.isCustomBuild).length },
              { id: 'custom', label: 'Custom Builds', count: orders.filter(o => o.isCustomBuild).length },
              { id: 'fabrication', label: 'Wood Fabrication', count: fabrications.length },
              { id: 'services', label: 'On-Site Services', count: services.length },
              { id: 'materials', label: 'Stored Materials', count: materials.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#48A63E] text-white shadow-2xs font-extrabold'
                    : 'bg-white/90 hover:bg-white text-[#6E6458] hover:text-[#1C1814] border border-[#E2D7CB]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-[#EAE0D4] text-[#5C4E42]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#38A132] mx-auto" />
              <p className="text-xs font-extrabold text-[#2C241D]">Loading your orders and requests...</p>
            </div>
          ) : totalItemsCount === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#38A132]/10 border border-[#38A132]/30 text-[#38A132] mx-auto flex items-center justify-center">
                <Package className="w-8 h-8 text-[#38A132]" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2C241D]">No Orders or Requests Found</h3>
                <p className="text-xs text-[#7A6C5E] max-w-sm mx-auto mt-1 font-medium">
                  You haven&apos;t created any orders or requests in this category yet.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold shadow-lg shadow-[#38A132]/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Browse Furniture Studio</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: STICKY AT-A-GLANCE ORDERS QUICK INDEX (4 cols) with Brownish Tint */}
              <div className="lg:col-span-4 sticky top-24 bg-[#EFE8DC] border border-[#D6C9B9] rounded-2xl p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#D6C9B9]/70 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#B89768]/20 flex items-center justify-center text-[#5C4E42]">
                      <Layers className="w-3.5 h-3.5 text-[#5C4E42]" />
                    </div>
                    <h3 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">
                      Orders At A Glance
                    </h3>
                  </div>
                  <span className="text-[10px] font-extrabold bg-[#B89768] text-white px-2 py-0.5 rounded-full shadow-2xs">
                    {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}
                  </span>
                </div>

                {/* Quick Search filter inside Brownish Side Panel */}
                {totalItemsCount > 2 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A6C5E]" />
                    <input
                      type="text"
                      placeholder="Find order or request..."
                      value={glanceQuery}
                      onChange={(e) => setGlanceQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white/90 border border-[#D6C9B9] rounded-xl text-[11px] font-bold text-[#2C241D] focus:outline-none focus:border-[#B89768]"
                    />
                  </div>
                )}

                {/* Quick Items List - Fully Expanded in Unified Chronological Order */}
                <div className="space-y-2">
                  {unifiedItems
                    .filter((item) => {
                      if (!glanceQuery.trim()) return true;
                      const q = glanceQuery.toLowerCase();
                      if (item.kind === 'order') {
                        const matchId = String(item.data.orderId).toLowerCase().includes(q);
                        const matchItem = item.data.items.some((i) => i.name.toLowerCase().includes(q));
                        return matchId || matchItem;
                      }
                      if (item.kind === 'fabrication') {
                        return String(item.data.fabrication_id).includes(q) || (item.data.service_type || '').toLowerCase().includes(q);
                      }
                      if (item.kind === 'service') {
                        return String(item.data.service_id).includes(q) || (item.data.service_category || '').toLowerCase().includes(q) || (item.data.address || '').toLowerCase().includes(q);
                      }
                      if (item.kind === 'material') {
                        return String(item.data.material_id).includes(q) || (item.data.material_type || '').toLowerCase().includes(q) || (item.data.wood_type || '').toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map((item) => {
                      if (item.kind === 'order') {
                        const ord = item.data;
                        const firstItem = ord.items[0];
                        return (
                          <div
                            key={`glance-ord-${ord.orderId}`}
                            onClick={() => scrollToOrder(ord.orderId)}
                            className="p-2.5 bg-[#FAF7F2] hover:bg-white rounded-xl border border-[#D6C9B9] cursor-pointer transition-all hover:border-[#B89768] hover:shadow-2xs group space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold text-[#2C241D] bg-[#E8DFC8] px-2 py-0.5 rounded-md border border-[#C8BCAC]">
                                Order #{ord.orderId}
                              </span>
                              <span className="text-[9px] font-extrabold text-[#2D6338] bg-[#E8F5E9] px-2 py-0.5 rounded-full border border-[#A6C495] truncate max-w-[100px]">
                                {formatStatusLabel(ord.status)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                              {firstItem?.image ? (
                                <img src={firstItem.image} alt={firstItem.name} className="w-9 h-9 rounded-lg object-cover border border-[#D6C9B9] shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-[#E8DFC8] border border-[#D6C9B9] flex items-center justify-center shrink-0">
                                  <Package className="w-3.5 h-3.5 text-[#5C4E42]" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[11px] font-bold text-[#1C1814] group-hover:text-[#48A63E] transition-colors truncate">
                                  {firstItem?.name || 'Furniture Item'}
                                </h4>
                                {ord.items.length > 1 && (
                                  <p className="text-[9px] font-semibold text-[#7A6C5E]">
                                    + {ord.items.length - 1} more item(s)
                                  </p>
                                )}
                                <div className="text-[10px] font-extrabold text-[#48A63E] mt-0.5">
                                  ₹{ord.totalPrice.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      if (item.kind === 'fabrication') {
                        const f = item.data;
                        return (
                          <div
                            key={`glance-fab-${f.fabrication_id}`}
                            onClick={() => scrollToOrder(`FAB-${f.fabrication_id}`)}
                            className="p-2.5 bg-[#FAF7F2] hover:bg-white rounded-xl border border-[#D6C9B9] cursor-pointer transition-all hover:border-amber-500 hover:shadow-2xs group space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-300">
                                #FAB-{String(f.fabrication_id).padStart(4, '0')}
                              </span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border truncate max-w-[100px] ${
                                f.payment_status === 'Paid' ? 'bg-[#E8F5E9] text-[#2D6338] border-[#A6C495]' : getStatusBadgeColor(f.status)
                              }`}>
                                {f.payment_status === 'Paid' ? 'Paid ✓' : formatStatusLabel(f.status)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-center shrink-0 text-amber-800">
                                <Scissors className="w-4 h-4 text-amber-700" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[11px] font-bold text-[#1C1814] group-hover:text-amber-800 transition-colors truncate">
                                  {f.service_type || 'Wood Sizing'}
                                </h4>
                                <div className="text-[10px] font-extrabold text-amber-700 mt-0.5">
                                  {f.estimated_price ? `₹${f.estimated_price.toLocaleString('en-IN')}` : 'Quote Pending'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      if (item.kind === 'service') {
                        const s = item.data;
                        const isExceeded = isServiceDateExceeded(s.preferred_date);
                        const isFinal = s.status === 'Cancelled' || s.status === 'COMPLETED' || s.status === 'Completed';
                        const effectiveStatus = (isExceeded && !isFinal) ? 'Request Cancellation' : s.status;
                        return (
                          <div
                            key={`glance-srv-${s.service_id}`}
                            onClick={() => scrollToOrder(`SRV-${s.service_id}`)}
                            className="p-2.5 bg-[#FAF7F2] hover:bg-white rounded-xl border border-[#D6C9B9] cursor-pointer transition-all hover:border-blue-500 hover:shadow-2xs group space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-100/90 px-2 py-0.5 rounded-md border border-blue-300">
                                #SRV-{String(s.service_id).padStart(4, '0')}
                              </span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border truncate max-w-[100px] ${
                                s.payment_status === 'Paid' ? 'bg-[#E8F5E9] text-[#2D6338] border-[#A6C495]' : getStatusBadgeColor(effectiveStatus)
                              }`}>
                                {s.payment_status === 'Paid' ? 'Paid ✓' : formatStatusLabel(effectiveStatus)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-300 flex items-center justify-center shrink-0 text-blue-800">
                                <Wrench className="w-4 h-4 text-blue-700" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[11px] font-bold text-[#1C1814] group-hover:text-blue-800 transition-colors truncate">
                                  {s.service_category || 'Skilled Service'}
                                </h4>
                                <div className="text-[10px] font-extrabold text-blue-700 mt-0.5">
                                  {s.estimated_price ? `₹${s.estimated_price.toLocaleString('en-IN')}` : 'Visit Scheduled'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      if (item.kind === 'material') {
                        const m = item.data;
                        return (
                          <div
                            key={`glance-mat-${m.material_id}`}
                            onClick={() => scrollToOrder(`MAT-${m.material_id}`)}
                            className="p-2.5 bg-[#FAF7F2] hover:bg-white rounded-xl border border-[#D6C9B9] cursor-pointer transition-all hover:border-[#48A63E] hover:shadow-2xs group space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold text-[#4A3E32] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#E2D7CB]">
                                #MAT-{m.material_id}
                              </span>
                              <span className="text-[9px] font-bold text-[#48A63E] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                                {m.status}
                              </span>
                            </div>
                            <div className="text-[11px] font-bold text-[#1C1814] truncate">
                              🪵 {m.material_type} ({m.wood_type || 'Timber'})
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                </div>
              </div>

              {/* RIGHT COLUMN: Main Detailed Cards List (8 cols) - Unified Chronological Order */}
              <div className="lg:col-span-8 space-y-4">
                {unifiedItems.map((item) => {
                  if (item.kind === 'order') {
                    const order = item.data;
                    const isEditable = order.status === 'Pending' || order.status === 'Pending Approval';
                    const firstItem = order.items[0];

                    return (
                      <div
                        id={`order-card-${order.orderId}`}
                        key={order.orderId}
                        className="bg-white rounded-2xl p-4 sm:p-5 transition-all border border-[#E2D7CB] shadow-2xs hover:shadow-xs space-y-4"
                      >
                        {/* TOP ROW: Order Info & Status / Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono font-bold text-[#1C1814] bg-[#FAF7F2] px-3 py-1 rounded-xl border border-[#D6C9B9]">
                              Order #{order.orderId}
                            </span>
                            <span className="text-xs font-medium text-[#7A6C5E] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#8C7C6D]" /> {formatOrderDate(order.date)}
                            </span>
                          </div>

                          {/* Status Badges & Quick Actions Cluster */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {order.status === 'Cancelled' ? (
                              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-[11px] font-extrabold flex items-center gap-1">
                                Status: Cancelled
                              </span>
                            ) : (order.status === 'Completed' || order.status === 'Delivered') ? (
                              <span className="px-3 py-1 rounded-full bg-[#E8F5E9] text-[#2D6338] border border-[#A6C495] text-[11px] font-extrabold flex items-center gap-1.5 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#48A63E]" />
                                Status: Completed (QC Passed)
                              </span>
                            ) : (order.status === 'QC_PENDING' || order.status === 'QC Pending' || order.qc_status === 'QC_PENDING') ? (
                              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-extrabold flex items-center gap-1.5 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                Status: Quality Inspection Pending
                              </span>
                            ) : order.status === 'In Production' ? (
                              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-300 text-[11px] font-extrabold flex items-center gap-1.5 shadow-2xs">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                Status: In Production
                              </span>
                            ) : (order.status === 'Paid' || order.status === 'Order Placed') ? (
                              <span className="px-3 py-1 rounded-full bg-[#E8F5E9] text-[#2D6338] border border-[#A6C495] text-[11px] font-extrabold flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#48A63E]" />
                                Status: Paid & Placed
                              </span>
                            ) : (
                              <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${getStatusBadgeColor(order.status)}`}>
                                Status: {formatStatusLabel(order.status)}
                              </span>
                            )}

                            {/* Download Receipt Button */}
                            {(order.status === 'Paid' || order.status === 'Order Placed' || order.status === 'In Production' || order.status === 'Completed' || order.status === 'Delivered') && (
                              <button
                                onClick={() => {
                                  const calculatedSubtotal = order.originalSubtotal || order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                                  const calculatedDiscount = order.discountDeducted || (calculatedSubtotal > order.totalPrice ? calculatedSubtotal - order.totalPrice : 0);
                                  const ordObj: CustomOrderData = {
                                    custom_order_id: order.numericId,
                                    customer_id: 1,
                                    customer_name: 'Valued Customer',
                                    customer_email: '',
                                    customer_phone: '',
                                    furniture_type: firstItem?.name || 'Artisan Furniture',
                                    material: firstItem?.specifications || 'Premium Build',
                                    dimensions: 'Standard Specs',
                                    color: 'Custom Finish',
                                    estimated_price: order.totalPrice,
                                    order_status: 'Paid',
                                    payment_status: 'Paid',
                                    order_date: order.date || new Date().toISOString(),
                                    assigned_workers: [],
                                    current_stage: 'Paid',
                                    progress_percentage: 100,
                                    originalSubtotal: calculatedSubtotal,
                                    couponCode: order.couponCode || (calculatedDiscount > 0 ? 'PROMO APPLIED' : undefined),
                                    discountType: order.discountType || (calculatedDiscount > 0 ? 'Discount Deducted' : undefined),
                                    discountDeducted: calculatedDiscount,
                                    shippingFee: order.shippingFee || 0
                                  };
                                  downloadPaymentReceipt(ordObj);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Download official paid invoice receipt"
                              >
                                <Download className="w-3.5 h-3.5 text-white" />
                                <span>Receipt</span>
                              </button>
                            )}

                            {/* Track Delivery Button */}
                            <button
                              onClick={() => handleOpenTrackingModal(order)}
                              className="px-3 py-1.5 rounded-xl bg-white border border-[#D6C9B9] hover:bg-[#FAF7F2] text-[#2C241D] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                              title="Track delivery status timeline"
                            >
                              <Truck className="w-3.5 h-3.5 text-[#48A63E]" />
                              <span>Track Delivery</span>
                            </button>

                            {/* Order Messaging Button */}
                            <button
                              onClick={() => handleOpenMessagingModal(order)}
                              className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#D6C9B9] hover:bg-[#F4ECE1] text-[#2C241D] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                              title="Message workshop staff regarding this order"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#48A63E]" />
                              <span>Message Staff</span>
                            </button>

                            {/* Customer Rate & Review Button for Completed / Delivered Orders */}
                            {(order.status === 'Completed' || order.status === 'Delivered') && (
                              <button
                                onClick={() => {
                                  setFeedbackModalOrder(order);
                                  const existingRating = submittedRatings[order.orderId];
                                  if (existingRating) {
                                    setRating(existingRating.rating || 5);
                                    setFeedbackText(existingRating.feedbackText || '');
                                  } else {
                                    setRating(5);
                                    setFeedbackText('');
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                title="Rate & add review feedback for this completed order"
                              >
                                <Star className="w-3.5 h-3.5 fill-white text-white" />
                                <span>{order.feedbackGiven || submittedRatings[order.orderId] ? `Rated ${order.rating || submittedRatings[order.orderId]?.rating}/5` : 'Rate & Review'}</span>
                              </button>
                            )}

                            {/* Customer Quality Rework Request Button for Custom Build Orders */}
                            {order.isCustomBuild && (
                              <button
                                onClick={() => {
                                  setReworkModalItem({
                                    orderType: 'CUSTOM',
                                    orderId: Number(order.numericId || order.orderId),
                                    itemTitle: order.items[0]?.name || 'Custom Build Furniture',
                                    approvedSpecs: order.items[0]?.specifications || 'Approved Custom Workshop Specifications'
                                  });
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                title="Report quality defect or request specification rework"
                              >
                                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                                <span>QC Rework / Issue</span>
                              </button>
                            )}

                            {/* Cancel Button */}
                            {order.status !== 'Cancelled' && order.status !== 'Completed' && order.status !== 'Delivered' && order.status !== 'Dispatched' && order.status !== 'Out for Delivery' && (
                              <button
                                onClick={() => setCancelModalOrder({ id: order.isCustomBuild ? order.numericId : order.orderId, isCustom: !!order.isCustomBuild })}
                                className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                                title="Cancel Order"
                              >
                                <X className="w-3.5 h-3.5 text-rose-600" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Active Quality Rework Ticket Banner for Custom Order */}
                        {(() => {
                          const customTicket = customerReworkTickets.find(
                            (t) => (t.custom_order_id && t.custom_order_id === Number(order.numericId)) ||
                                   (t.order_type === 'Custom' && t.order_id === Number(order.numericId))
                          );
                          if (!customTicket) return null;
                          return (
                            <div className="pt-1 pb-2">
                              <CustomerReworkTicketCard
                                ticket={customTicket}
                                onApproveQuotation={handleCustomerApproveReworkQuotation}
                                onDeclineQuotation={handleCustomerDeclineReworkQuotation}
                                onPayQuotation={handleCustomerPayRework}
                                actionLoading={actionLoadingTicketId === (customTicket.id || customTicket.rework_id)}
                              />
                            </div>
                          );
                        })()}

                        {/* Live Manufacturing & QC Progress Status */}
                        {order.status !== 'Cancelled' && (
                          <div className="bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl p-3.5 space-y-2 animate-fadeIn shadow-2xs">
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                              <span className="font-extrabold text-[#2C241D] flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-[#48A63E]" />
                                <span>Progress: {order.status === 'Completed' || order.status === 'Delivered' ? 'Completed (QC Passed)' : (order.status === 'QC_PENDING' || order.status === 'QC Pending' || order.qc_status === 'QC_PENDING' ? 'Quality Inspection Pending' : (order.current_stage || 'In Production'))}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  order.status === 'Completed' || order.status === 'Delivered'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : order.status === 'QC_PENDING' || order.status === 'QC Pending' || order.qc_status === 'QC_PENDING'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-blue-100 text-blue-800 border-blue-300'
                                }`}>
                                  {order.status === 'Completed' || order.status === 'Delivered'
                                    ? 'Gate Passed ✓'
                                    : order.status === 'QC_PENDING' || order.status === 'QC Pending' || order.qc_status === 'QC_PENDING'
                                    ? 'Audit in Progress ⏳'
                                    : 'Crafting 🪵'}
                                </span>
                                <span className="font-mono font-black text-[#48A63E] text-xs">
                                  {order.status === 'Completed' || order.status === 'Delivered' ? 100 : (order.status === 'QC_PENDING' || order.status === 'QC Pending' || order.qc_status === 'QC_PENDING' ? 90 : (order.progress_percentage || 40))}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-[#E2D7CB] rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  order.status === 'Completed' || order.status === 'Delivered'
                                    ? 'bg-[#48A63E]'
                                    : order.status === 'QC_PENDING' || order.status === 'QC Pending' || order.qc_status === 'QC_PENDING'
                                    ? 'bg-amber-500 animate-pulse'
                                    : 'bg-gradient-to-r from-blue-500 to-[#48A63E]'
                                }`}
                                style={{ width: `${order.status === 'Completed' || order.status === 'Delivered' ? 100 : (order.status === 'QC_PENDING' || order.status === 'QC Pending' || order.qc_status === 'QC_PENDING' ? 90 : (order.progress_percentage || 40))}%` }}
                              />
                            </div>
                            {(order.status === 'QC_PENDING' || order.status === 'QC Pending' || order.qc_status === 'QC_PENDING') && (
                              <p className="text-[11px] text-amber-900 font-bold bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 animate-pulse" />
                                <span>Workshop production stages completed. Undergoing strict Quality Gate inspection before packing and dispatch.</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* MAIN CONTENT ROW: Product Items List vs Payment Breakdown Box */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                          {/* Left Column: Product Items & Rating Summary (Lg: 8 cols) */}
                          <div className="lg:col-span-8 space-y-2.5">
                            {/* Customer Rating Card - Displays ONLY in Customer Dashboard */}
                            {(order.feedbackGiven || order.rating || submittedRatings[order.orderId]) && (
                              <div className="bg-[#FFFDF9] border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex text-amber-400">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-4 h-4 ${
                                          star <= (order.rating || submittedRatings[order.orderId]?.rating || 5)
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-amber-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="font-extrabold text-[#2C241D]">
                                    {order.rating || submittedRatings[order.orderId]?.rating || 5} / 5 Rating
                                  </span>
                                  {(order.feedbackText || submittedRatings[order.orderId]?.feedbackText) && (
                                    <span className="text-[#6E6458] font-medium italic text-[11px]">
                                      &ldquo;{order.feedbackText || submittedRatings[order.orderId]?.feedbackText}&rdquo;
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-amber-800 font-extrabold bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-200/80 shrink-0">
                                  Your Customer Rating
                                </span>
                              </div>
                            )}
                            {order.items.map((item, idx) => (
                              <div key={item.id || idx} className="flex items-start gap-3 bg-[#FAF7F2]/60 p-3 rounded-xl border border-[#EFE7DE]">
                                {item.image && item.image.trim() !== '' ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-14 h-14 rounded-lg object-cover border border-[#E2D7CB] shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-lg bg-[#FAF7F2] border border-[#E2D7CB] shrink-0 flex items-center justify-center font-bold text-[#48A63E]">
                                    <FileText className="w-5 h-5 text-[#48A63E]" />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h4 className="text-xs font-bold text-[#1C1814] truncate">
                                      {item.name}
                                    </h4>
                                    <span className="text-xs font-black text-[#48A63E]">
                                      ₹{((item.price || order.totalPrice) * (item.quantity || 1)).toLocaleString('en-IN')}
                                    </span>
                                  </div>

                                  {item.specifications ? (
                                    <div className="pt-0.5">
                                      {renderSpecBadges(item.specifications)}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] font-bold text-[#6E6458] flex items-center gap-2 flex-wrap">
                                      <span className="bg-white px-2 py-0.5 rounded-md border border-[#EFE7DE]">
                                        📦 {item.quantity || 1} Unit(s)
                                      </span>
                                      <span className="bg-white px-2 py-0.5 rounded-md border border-[#EFE7DE]">
                                        🛒 {order.isCustomBuild ? 'Custom Order Build' : 'Ready-Made Store Purchase'}
                                      </span>
                                      {(order as any).paymentId && (
                                        <span className="bg-white px-2 py-0.5 rounded-md border border-[#EFE7DE] font-mono text-[10px]">
                                          💳 Pay ID: {(order as any).paymentId}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Right Column: Pricing & Invoice Breakdown Box (Lg: 4 cols) */}
                          <div className="lg:col-span-4 bg-[#FAF7F2] rounded-xl p-3.5 border border-[#EAE0D4] space-y-2">
                            <div className="text-[11px] font-extrabold text-[#7A6C5E] border-b border-[#E4DCD0] pb-1.5 uppercase tracking-wider">
                              Payment & Invoice Breakdown
                            </div>

                            {(() => {
                              const calculatedSubtotal = order.originalSubtotal || order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                              const calculatedDiscount = order.discountDeducted || (calculatedSubtotal > order.totalPrice ? calculatedSubtotal - order.totalPrice : 0);
                              const hasDiscount = calculatedDiscount > 0 || !!order.couponCode;

                              return (
                                <div className="space-y-1.5 text-xs font-bold text-[#5C4E42]">
                                  {hasDiscount && (
                                    <>
                                      <div className="flex justify-between items-center text-[11px]">
                                        <span>Original Subtotal:</span>
                                        <span className="line-through font-extrabold text-[#7A6C5E]">₹{calculatedSubtotal.toLocaleString('en-IN')}</span>
                                      </div>

                                      <div className="flex justify-between items-center text-[11px] text-[#2D6338] font-extrabold bg-[#E8F5E9] px-2.5 py-1 rounded-lg border border-[#A6C495]">
                                        <span>🏷️ {order.couponCode || 'PROMO APPLIED'}:</span>
                                        <span>-₹{calculatedDiscount.toLocaleString('en-IN')}</span>
                                      </div>
                                    </>
                                  )}

                                  <div className="flex justify-between items-center text-[11px]">
                                    <span>Shipping Fee:</span>
                                    <span className="font-extrabold text-[#48A63E]">
                                      {order.shippingFee === 0 || !order.shippingFee ? 'FREE' : `₹${order.shippingFee}`}
                                    </span>
                                  </div>

                                  <div className="pt-2 border-t border-[#E4DCD0] flex justify-between items-baseline">
                                    <span className="text-[11px] font-extrabold uppercase text-[#1C1814] tracking-wider">Final Amount Paid:</span>
                                    <span className="text-lg font-black text-[#48A63E] tracking-tight">
                                      ₹{order.totalPrice.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (item.kind === 'fabrication') {
                    const f = item.data;
                    return (
                      <div
                        id={`order-card-FAB-${f.fabrication_id}`}
                        key={`fab-${f.fabrication_id}`}
                        className="bg-white rounded-2xl p-4 sm:p-5 transition-all border border-[#E2D7CB] shadow-2xs hover:shadow-xs space-y-4"
                      >
                        {/* TOP ROW: Fabrication Info & Status / Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                              Fabrication #FAB-{String(f.fabrication_id).padStart(4, '0')}
                            </span>
                            <span className="text-xs font-medium text-[#7A6C5E] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#8C7C6D]" /> {formatOrderDate(f.created_at || '')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
                              f.status === 'Cancelled'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : f.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                                : f.status === 'QC_PENDING' || f.qc_status === 'QC_PENDING'
                                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                                : f.status === 'IN_PRODUCTION'
                                ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-2xs'
                                : f.payment_status === 'Paid' || f.status === 'PAID'
                                ? 'bg-[#E8F5E9] text-[#2D6338] border-[#A6C495]'
                                : getStatusBadgeColor(f.status)
                            }`}>
                              Status: {
                                f.status === 'Cancelled'
                                  ? 'Cancelled'
                                  : f.status === 'COMPLETED'
                                  ? 'Completed (QC Passed)'
                                  : f.status === 'QC_PENDING' || f.qc_status === 'QC_PENDING'
                                  ? 'Quality Inspection Pending'
                                  : f.status === 'IN_PRODUCTION'
                                  ? 'In Production'
                                  : f.payment_status === 'Paid' && (f.status === 'PAID' || f.status === 'Paid')
                                  ? 'Paid & Queued'
                                  : formatStatusLabel(f.status)
                              }
                            </span>

                            {/* Pay Now Button */}
                            {f.estimated_price && f.payment_status !== 'Paid' && f.status !== 'PAID' && f.status !== 'Paid' && f.status !== 'Cancelled' && (
                              <button
                                onClick={() => handlePayNowFabrication(f)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-white" />
                                <span>Pay Now</span>
                              </button>
                            )}

                            {/* Customer Quality Rework Request Button for Fabrication */}
                            <button
                              onClick={() => {
                                setReworkModalItem({
                                  orderType: 'FABRICATION',
                                  orderId: f.fabrication_id,
                                  itemTitle: `${f.service_type} (${f.dimensions})`,
                                  approvedSpecs: `Dimensions: ${f.dimensions} • Material: ${f.material_source} • Quantity: ${f.quantity} sheet(s) • Requirements: ${f.requirements || 'N/A'}`
                                });
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                              title="Report fabrication defect or request specification rework"
                            >
                              <Wrench className="w-3.5 h-3.5 text-amber-600" />
                              <span>QC Rework / Issue</span>
                            </button>

                            {/* Cancel Button */}
                            {f.status !== 'Cancelled' && f.status !== 'Completed' && f.status !== 'COMPLETED' && f.status !== 'QC_PENDING' && f.payment_status !== 'Paid' && (
                              <button
                                onClick={() => handleCancelFabrication(f.fabrication_id)}
                                className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                                title="Cancel Fabrication Request"
                              >
                                <X className="w-3.5 h-3.5 text-rose-600" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Active Quality Rework Ticket Banner for Fabrication Request */}
                        {(() => {
                          const fabTicket = customerReworkTickets.find(
                            (t) => (t.fabrication_id && t.fabrication_id === f.fabrication_id) ||
                                   (t.order_type === 'Fabrication' && t.order_id === f.fabrication_id)
                          );
                          if (!fabTicket) return null;
                          return (
                            <div className="pt-1 pb-2">
                              <CustomerReworkTicketCard
                                ticket={fabTicket}
                                onApproveQuotation={handleCustomerApproveReworkQuotation}
                                onDeclineQuotation={handleCustomerDeclineReworkQuotation}
                                onPayQuotation={handleCustomerPayRework}
                                actionLoading={actionLoadingTicketId === (fabTicket.id || fabTicket.rework_id)}
                              />
                            </div>
                          );
                        })()}

                        {/* Live Manufacturing & QC Progress Status for Fabrication */}
                        {f.status !== 'Cancelled' && (
                          <div className="bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl p-3.5 space-y-2 animate-fadeIn shadow-2xs">
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                              <span className="font-extrabold text-[#2C241D] flex items-center gap-2">
                                <Scissors className="w-3.5 h-3.5 text-[#48A63E]" />
                                <span>Progress: {f.status === 'COMPLETED' ? 'Completed (QC Passed)' : (f.status === 'QC_PENDING' || f.qc_status === 'QC_PENDING' ? 'Quality Inspection Pending' : (f.active_stage ? f.active_stage.stage_name : (f.status === 'IN_PRODUCTION' ? 'Workshop Machining' : 'Queued for Workshop')))}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  f.status === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : f.status === 'QC_PENDING' || f.qc_status === 'QC_PENDING'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-blue-100 text-blue-800 border-blue-300'
                                }`}>
                                  {f.status === 'COMPLETED'
                                    ? 'Gate Passed ✓'
                                    : f.status === 'QC_PENDING' || f.qc_status === 'QC_PENDING'
                                    ? 'Audit in Progress ⏳'
                                    : 'Fabricating ⚙️'}
                                </span>
                                <span className="font-mono font-black text-[#48A63E] text-xs">
                                  {f.status === 'COMPLETED' ? 100 : (f.status === 'QC_PENDING' || f.qc_status === 'QC_PENDING' ? 90 : (f.overall_progress_percentage || (f.status === 'IN_PRODUCTION' ? 50 : 20)))}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-[#E2D7CB] rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  f.status === 'COMPLETED'
                                    ? 'bg-[#48A63E]'
                                    : f.status === 'QC_PENDING' || f.qc_status === 'QC_PENDING'
                                    ? 'bg-amber-500 animate-pulse'
                                    : 'bg-gradient-to-r from-blue-500 to-[#48A63E]'
                                }`}
                                style={{ width: `${f.status === 'COMPLETED' ? 100 : (f.status === 'QC_PENDING' || f.qc_status === 'QC_PENDING' ? 90 : (f.overall_progress_percentage || (f.status === 'IN_PRODUCTION' ? 50 : 20)))}%` }}
                              />
                            </div>
                            {(f.status === 'QC_PENDING' || f.qc_status === 'QC_PENDING') && (
                              <p className="text-[11px] text-amber-900 font-bold bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 animate-pulse" />
                                <span>CNC and fabrication stages completed. Undergoing strict Quality Gate inspection before packing and delivery.</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Content Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                          <div className="lg:col-span-8 space-y-2.5">
                            <div className="flex items-start gap-3 bg-[#FAF7F2]/60 p-3.5 rounded-xl border border-[#EFE7DE]">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/20 border-2 border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                                <Scissors className="w-6 h-6" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <h4 className="text-xs font-bold text-[#1C1814]">
                                  Wood Fabrication & Sizing — {f.service_type}
                                </h4>
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E2D7CB] text-[10px] font-bold text-[#4A3E32]">
                                    <span>🪵</span>
                                    <span>Source: {f.material_source}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E2D7CB] text-[10px] font-bold text-[#4A3E32]">
                                    <span>📐</span>
                                    <span>Dimensions: {f.dimensions}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E2D7CB] text-[10px] font-bold text-[#4A3E32]">
                                    <span>🔢</span>
                                    <span>Quantity: {f.quantity} sheet(s)</span>
                                  </span>
                                  {f.requirements && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E2D7CB] text-[10px] font-bold text-[#4A3E32]">
                                      <span>📝</span>
                                      <span>{f.requirements}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Pricing & Status Box */}
                          <div className="lg:col-span-4 bg-[#FAF7F2] rounded-xl p-3.5 border border-[#EAE0D4] space-y-2">
                            <div className="text-[11px] font-extrabold text-[#7A6C5E] border-b border-[#E4DCD0] pb-1.5 uppercase tracking-wider">
                              Fabrication Quotation
                            </div>
                            <div className="space-y-1.5 text-xs font-bold text-[#5C4E42]">
                              <div className="flex justify-between items-center text-[11px]">
                                <span>Service Status:</span>
                                <span className="font-extrabold text-[#2C241D]">{f.payment_status === 'Paid' ? 'Paid & Active' : 'Quoted'}</span>
                              </div>
                              <div className="pt-2 border-t border-[#E4DCD0] flex justify-between items-baseline">
                                <span className="text-[11px] font-extrabold uppercase text-[#1C1814] tracking-wider">Quotation:</span>
                                <span className="text-lg font-black text-[#48A63E] tracking-tight">
                                  {f.estimated_price ? `₹${f.estimated_price.toLocaleString('en-IN')}` : 'Under Review'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (item.kind === 'service') {
                    const s = item.data;
                    const isExceeded = isServiceDateExceeded(s.preferred_date);
                    const isFinal = s.status === 'Cancelled' || s.status === 'COMPLETED' || s.status === 'Completed';
                    const effectiveStatus = (isExceeded && !isFinal) ? 'Request Cancellation' : s.status;

                    return (
                      <div
                        id={`order-card-SRV-${s.service_id}`}
                        key={`srv-${s.service_id}`}
                        className="bg-white rounded-2xl p-4 sm:p-5 transition-all border border-[#E2D7CB] shadow-2xs hover:shadow-xs space-y-4"
                      >
                        {/* TOP ROW: Service Info & Status */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                              Service #SRV-{String(s.service_id).padStart(4, '0')}
                            </span>
                            <span className="text-xs font-medium text-[#7A6C5E] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#8C7C6D]" /> {formatOrderDate(s.created_at || '')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {isExceeded && !isFinal && (
                              <span className="text-[10.5px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                ⚠️ Date Exceeded
                              </span>
                            )}

                            <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${
                              s.payment_status === 'Paid' || s.status === 'PAID'
                                ? 'bg-[#E8F5E9] text-[#2D6338] border-[#A6C495]'
                                : getStatusBadgeColor(effectiveStatus)
                            }`}>
                              Status: {s.payment_status === 'Paid' ? 'Paid & Confirmed' : formatStatusLabel(effectiveStatus)}
                            </span>

                            {/* Pay Now Button */}
                            {s.estimated_price && s.payment_status !== 'Paid' && s.status !== 'PAID' && s.status !== 'Paid' && s.status !== 'Cancelled' && effectiveStatus !== 'Request Cancellation' && (
                              <button
                                onClick={() => handlePayNowService(s)}
                                className="px-3.5 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-white" />
                                <span>Pay Now</span>
                              </button>
                            )}

                            {/* Request Cancellation / Cancel Button */}
                            {s.status === 'Cancelled' || s.status === 'CANCELLED' ? (
                              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
                                Cancelled
                              </span>
                            ) : s.status !== 'Completed' && s.payment_status !== 'Paid' && (
                              <button
                                type="button"
                                disabled={cancellingServiceId === s.service_id}
                                onClick={() => handleCancelService(s.service_id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                                title="Request cancellation for this on-site service"
                              >
                                <X className="w-3.5 h-3.5 text-rose-600" />
                                <span>{cancellingServiceId === s.service_id ? 'Cancelling...' : 'Request Cancellation'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Content Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                          <div className="lg:col-span-8 space-y-2.5">
                            <div className="flex items-start gap-3 bg-[#FAF7F2]/60 p-3.5 rounded-xl border border-[#EFE7DE]">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/20 border-2 border-blue-300 flex items-center justify-center text-blue-700 shrink-0 shadow-2xs">
                                <Wrench className="w-6 h-6" />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <h4 className="text-xs font-bold text-[#1C1814]">
                                  On-Site Service — {s.service_category}
                                </h4>
                                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E2D7CB] text-[10px] font-bold text-[#4A3E32]">
                                    <MapPin className="w-3 h-3 text-[#48A63E]" />
                                    <span>{s.address}, {s.city}</span>
                                  </span>
                                  {s.preferred_date && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E2D7CB] text-[10px] font-bold text-[#4A3E32]">
                                      <span>📅</span>
                                      <span>Date: {s.preferred_date} {s.preferred_time || ''}</span>
                                    </span>
                                  )}
                                  {s.description && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E2D7CB] text-[10px] font-bold text-[#4A3E32]">
                                      <span>📝</span>
                                      <span>{s.description}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Pricing & Status Box */}
                          <div className="lg:col-span-4 bg-[#FAF7F2] rounded-xl p-3.5 border border-[#EAE0D4] space-y-2">
                            <div className="text-[11px] font-extrabold text-[#7A6C5E] border-b border-[#E4DCD0] pb-1.5 uppercase tracking-wider">
                              Service Estimation
                            </div>
                            <div className="space-y-1.5 text-xs font-bold text-[#5C4E42]">
                              <div className="flex justify-between items-center text-[11px]">
                                <span>Appointment:</span>
                                <span className="font-extrabold text-[#2C241D]">{s.preferred_date || 'Scheduled'}</span>
                              </div>
                              <div className="pt-2 border-t border-[#E4DCD0] flex justify-between items-baseline">
                                <span className="text-[11px] font-extrabold uppercase text-[#1C1814] tracking-wider">Estimated Cost:</span>
                                <span className="text-lg font-black text-[#48A63E] tracking-tight">
                                  {s.estimated_price ? `₹${s.estimated_price.toLocaleString('en-IN')}` : 'Quote on Visit'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (item.kind === 'material') {
                    const m = item.data;
                    return (
                      <div
                        id={`order-card-MAT-${m.material_id}`}
                        key={`mat-${m.material_id}`}
                        className="bg-white rounded-2xl p-4 sm:p-5 transition-all border border-[#E2D7CB] shadow-2xs hover:shadow-xs space-y-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-[#4A3E32] bg-[#FAF7F2] px-3 py-1 rounded-xl border border-[#E2D7CB]">
                              Material #MAT-{m.material_id}
                            </span>
                            <span className="text-xs font-medium text-[#7A6C5E] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#8C7C6D]" /> {formatOrderDate(m.created_at || '')}
                            </span>
                          </div>
                          <span className="text-[11px] font-extrabold text-[#48A63E] bg-[#E8F5E9] border border-[#A6C495] px-3 py-1 rounded-full">
                            {m.status}
                          </span>
                        </div>

                        <div className="flex items-start gap-3 bg-[#FAF7F2]/60 p-3.5 rounded-xl border border-[#EFE7DE]">
                          <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 text-xl font-bold">
                            🪵
                          </div>
                          <div className="min-w-0 flex-1 space-y-1 text-xs">
                            <h4 className="font-bold text-[#1C1814]">
                              {m.material_type} — {m.wood_type || 'Customer Timber'}
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#5C4E42]">
                              <span>Available: <strong>{m.remaining_quantity ?? m.quantity} {m.unit}</strong></span>
                              <span>•</span>
                              <span>Condition: <strong>{m.condition || 'Seasoned'}</strong></span>
                              {m.dimensions && <span>• Size: <strong>{m.dimensions}</strong></span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FEEDBACK & RATING MODAL */}
      {feedbackModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-4">
              <div>
                <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Customer Experience Feedback
                </div>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-2">
                  Rate Custom Furniture Order
                </h3>
                <p className="text-xs text-[#7A6C5E]">Share your thoughts on craftsmanship & delivery.</p>
              </div>
              <button
                onClick={() => setFeedbackModalOrder(null)}
                className="p-2 rounded-xl text-[#9E9082] hover:text-[#2C241D] hover:bg-[#F5ECE1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-5 text-xs">
              {/* Star Selector */}
              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-2">Overall Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-2xl transition-transform hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-[#E2D7CB]'}`} />
                    </button>
                  ))}
                  <span className="ml-2 font-extrabold text-sm text-[#2C241D]">{rating} out of 5</span>
                </div>
              </div>

              {/* Tag Chips */}
              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-2">What did you like most?</label>
                <div className="flex flex-wrap gap-2">
                  {['Excellent Craftsmanship', 'Timber Quality', 'Fast Delivery', 'Polite Staff', 'Safe Packaging'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-[#38A132] text-white border-[#38A132]'
                          : 'bg-[#FAF7F2] text-[#5C4E42] border-[#E2D7CB]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Textarea */}
              <div>
                <label className="block font-extrabold text-[#5C4E42] mb-2">Detailed Comments / Review</label>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us about your experience with the furniture, wood polish, comfort, or delivery speed..."
                  className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-2xl text-xs sm:text-sm font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFeedbackModalOrder(null)}
                  className="py-2.5 px-5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="py-2.5 px-6 bg-[#38A132] hover:bg-[#32922D] text-white font-extrabold rounded-xl shadow-md flex items-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingFeedback ? 'Submitting...' : 'Submit Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      {cancelModalOrder !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-[#2C241D]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-[#2C241D]">Cancel Order Request</h3>
              <p className="text-xs text-[#7A6C5E] leading-relaxed">
                Are you sure you want to cancel this order? This action will update the order status to <span className="font-extrabold text-rose-700">Cancelled</span>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#E2D7CB] text-[#524538] font-extrabold text-xs transition-all cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={async () => {
                  const target = cancelModalOrder;
                  setCancelModalOrder(null);
                  if (target) {
                    setOrders(prev => prev.map(o => {
                      const isMatch = target.isCustom 
                        ? o.numericId === target.id 
                        : o.orderId === target.id;
                      if (isMatch) {
                        return { ...o, status: 'Cancelled' };
                      }
                      return o;
                    }));

                    if (target.isCustom) {
                      await cancelCustomOrder(target.id as number);
                    } else {
                      const uId = userObj?.user_id || userObj?.id || userObj?.customer_id;
                      await cancelOrderAPI(target.id as string, 'Customer requested cancellation', uId, 'Customer');
                      cancelStoredRetailOrder(target.id as string);
                    }
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRACKING & FULFILLMENT TIMELINE MODAL */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-[#2C241D] max-h-[90vh] overflow-y-auto scrollbar-none">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#38A132] font-black bg-[#38A132]/10 px-2.5 py-1 rounded-md border border-[#38A132]/20">
                  {trackingModalOrder.orderId}
                </span>
                <h3 className="text-xl font-extrabold text-[#2C241D] mt-2">
                  Order Delivery Tracking & Timeline
                </h3>
                <p className="text-xs text-[#7A6C5E]">Live order fulfillment status</p>
              </div>
              <button
                onClick={() => {
                  setTrackingModalOrder(null);
                  setTrackingFulfillmentData(null);
                }}
                className="p-2 rounded-xl text-[#9E9082] hover:text-[#2C241D] hover:bg-[#F5ECE1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingFulfillment ? (
              <div className="py-12 text-center text-xs font-extrabold text-[#7A6C5E] space-y-2">
                <Loader2 className="w-7 h-7 animate-spin text-[#38A132] mx-auto" />
                <span>Fetching live order status history...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Fulfillment Details Banner */}
                <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] space-y-2 text-xs font-semibold">
                  <div className="flex justify-between items-center border-b border-[#E2D7CB]/60 pb-2">
                    <span className="text-[#7A6C5E]">Current Order Status:</span>
                    <span className="font-extrabold text-[#38A132] uppercase">{trackingFulfillmentData?.order_status || trackingModalOrder.status}</span>
                  </div>

                  {trackingFulfillmentData?.fulfillment?.carrier && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A6C5E]">Shipping Carrier:</span>
                      <span className="font-extrabold text-[#2C241D]">{trackingFulfillmentData.fulfillment.carrier}</span>
                    </div>
                  )}

                  {trackingFulfillmentData?.fulfillment?.tracking_number && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A6C5E]">Tracking Number:</span>
                      <span className="font-mono font-bold text-[#38A132] bg-[#38A132]/10 px-2 py-0.5 rounded border border-[#38A132]/20">
                        {trackingFulfillmentData.fulfillment.tracking_number}
                      </span>
                    </div>
                  )}

                  {trackingFulfillmentData?.fulfillment?.expected_delivery_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A6C5E]">Expected Delivery:</span>
                      <span className="font-bold text-[#2C241D]">{trackingFulfillmentData.fulfillment.expected_delivery_date}</span>
                    </div>
                  )}

                  {trackingFulfillmentData?.fulfillment?.driver_phone ? (
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A6C5E]">Driver Contact:</span>
                      <span className="font-mono font-extrabold text-[#38A132]">{trackingFulfillmentData.fulfillment.driver_phone}</span>
                    </div>
                  ) : (trackingFulfillmentData?.order_status === 'Dispatched' || trackingFulfillmentData?.order_status === 'Out for Delivery') ? (
                    <div className="flex justify-between items-center">
                      <span className="text-[#7A6C5E]">Driver Contact:</span>
                      <span className="font-medium text-[#7A6C5E] italic">Not assigned yet</span>
                    </div>
                  ) : null}
                </div>

                {/* Status Timeline */}
                <div>
                  <h4 className="text-xs font-black uppercase text-[#7A6C5E] tracking-wider mb-3">Order Lifecycle Progress</h4>
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2D7CB]">
                    {[
                      'Order Placed',
                      'Payment Confirmed',
                      'Order Confirmed',
                      'Processing',
                      'Packed',
                      'Dispatched',
                      'Out for Delivery',
                      'Delivered'
                    ].map((stageName, idx) => {
                      const curStatus = (trackingFulfillmentData?.order_status || trackingModalOrder.status).toLowerCase();
                      const isCompleted = curStatus === stageName.toLowerCase() || (
                        (curStatus === 'delivered' || curStatus === 'completed') ||
                        (curStatus === 'out for delivery' && idx <= 6) ||
                        (curStatus === 'dispatched' && idx <= 5) ||
                        (curStatus === 'packed' && idx <= 4) ||
                        (curStatus === 'processing' && idx <= 3) ||
                        (curStatus === 'order confirmed' && idx <= 2) ||
                        (curStatus === 'payment confirmed' && idx <= 1) ||
                        (curStatus === 'order placed' && idx <= 0)
                      );
                      const isCurrent = curStatus === stageName.toLowerCase();

                      return (
                        <div key={stageName} className="flex items-start gap-3 relative z-10">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                            isCompleted ? 'bg-[#38A132] text-white' : 'bg-white border-2 border-[#E2D7CB] text-[#9E9082]'
                          }`}>
                            {isCompleted ? '✓' : idx + 1}
                          </div>
                          <div>
                            <span className={`text-xs font-extrabold ${isCurrent ? 'text-[#38A132]' : isCompleted ? 'text-[#2C241D]' : 'text-[#9E9082]'}`}>
                              {stageName}
                            </span>
                            {isCurrent && <span className="ml-2 text-[10px] bg-[#38A132]/10 text-[#38A132] font-black px-2 py-0.5 rounded-full">ACTIVE STAGE</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit History Log */}
                {trackingFulfillmentData?.history && trackingFulfillmentData.history.length > 0 && (
                  <div className="pt-3 border-t border-[#E2D7CB]">
                    <h4 className="text-xs font-black uppercase text-[#7A6C5E] tracking-wider mb-2">Audit History Log</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-none">
                      {trackingFulfillmentData.history.map((h) => (
                        <div key={h.history_id} className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-[11px] font-semibold space-y-0.5">
                          <div className="flex justify-between text-[#2C241D]">
                            <span className="font-extrabold text-[#38A132]">{h.new_status}</span>
                            <span className="text-[10px] text-[#7A6C5E]">{formatToIST(h.changed_at)}</span>
                          </div>
                          {h.note && <p className="text-[#6E6458] text-[10px] italic">{h.note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDER COMMUNICATION MESSAGING DRAWER */}
      {messagingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 text-[#2C241D] flex flex-col h-[520px]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#38A132]" />
                  <span>Message Workshop Staff — {messagingModalOrder.orderId}</span>
                </h3>
                <p className="text-xs text-[#7A6C5E]">Direct communication for your order</p>
              </div>
              <button
                onClick={() => setMessagingModalOrder(null)}
                className="p-1.5 rounded-xl text-[#9E9082] hover:text-[#2C241D] hover:bg-[#F5ECE1]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] scrollbar-none">
              {orderMessages.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-[#7A6C5E]">
                  No messages yet. Send a message to workshop staff regarding your delivery or specifications.
                </div>
              ) : (
                orderMessages.map((msg) => {
                  const isMe = msg.sender_role === 'Customer';
                  return (
                    <div key={msg.message_id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-semibold shadow-xs ${
                        isMe ? 'bg-[#38A132] text-white rounded-br-none' : 'bg-white text-[#2C241D] border border-[#E2D7CB] rounded-bl-none'
                      }`}>
                        <div className="text-[10px] font-black opacity-80 mb-0.5">{msg.sender_name} ({msg.sender_role})</div>
                        <p>{msg.message}</p>
                      </div>
                      <span className="text-[9px] text-[#9E9082] mt-0.5 font-mono">
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Send Message Input */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-[#EFE7DE] shrink-0">
              <input
                type="text"
                placeholder="Type a message to workshop staff..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-bold text-[#2C241D] focus:outline-none focus:border-[#38A132]"
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessageText.trim()}
                className="px-4 py-2.5 bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER QUALITY REWORK REQUEST MODAL */}
      {reworkModalItem && (
        <CustomerReworkRequestModal
          isOpen={!!reworkModalItem}
          onClose={() => setReworkModalItem(null)}
          orderType={reworkModalItem.orderType}
          orderId={reworkModalItem.orderId}
          itemTitle={reworkModalItem.itemTitle}
          approvedSpecs={reworkModalItem.approvedSpecs}
          onSubmitted={() => {
            setToastMessage('Rework request submitted! Our quality engineering team is auditing the issue against approved specifications.');
            setTimeout(() => setToastMessage(null), 4000);
            loadOrdersFromDB();
          }}
        />
      )}

      {/* RETURN REQUEST MODAL */}
      {returnModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#2C241D]">Request Order Return</h3>
                <p className="text-xs text-[#7A6C5E]">Order #{returnModalOrder.orderId}</p>
              </div>
              <button
                onClick={() => setReturnModalOrder(null)}
                className="p-1 text-[#9E9082] hover:text-[#2C241D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {returnErrorMsg && (
              <div className="p-3 text-xs text-rose-800 bg-rose-50 border border-rose-300 rounded-2xl font-bold flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{returnErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReturnRequest} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1">Return Reason</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] font-bold"
                >
                  <option value="Damaged">Damaged during transit</option>
                  <option value="Wrong Item">Wrong item received</option>
                  <option value="Missing Item">Missing accessories / parts</option>
                  <option value="Defective">Defective / Structural fault</option>
                  <option value="Other">Other reason</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  placeholder="Describe the issue with the furniture item..."
                  className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2] font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-[#7A6C5E] mb-1">Photo URL (Optional)</label>
                <input
                  type="text"
                  value={returnPhotoUrl}
                  onChange={(e) => setReturnPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-3 rounded-xl border border-[#E2D7CB] bg-[#FAF7F2]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setReturnModalOrder(null)}
                  className="px-4 py-2 rounded-xl border border-[#E2D7CB] text-[#7A6C5E] font-bold hover:bg-[#FAF7F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submittingReturn ? 'Submitting...' : 'Submit Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

