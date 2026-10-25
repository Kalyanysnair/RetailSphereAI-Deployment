import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Users,
  Sliders,
  AlertCircle,
  Plus,
  Send,
  Palette,
  Ruler,
  ArrowRight,
  ArrowLeft,
  Layers,
  MessageSquareText,
  Edit3,
  Image as ImageIcon,
  Trash2,
  Download,
  ShoppingCart,
  UploadCloud,
  Search,
  Package,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Maximize2,
  Minimize2,
  Minus,
  X
} from 'lucide-react';
import {
  fetchOrderTrackingTimeline,
  OrderTrackingInfo,
  fetchCustomOrders,
  CustomOrderData,
  submitCustomOrderRequest,
  cancelCustomOrder,
  downloadPaymentReceipt,
  updateOrderStatus
} from '../../services/api_production';
import { setDirectCheckoutItem } from '../../utils/cartStorage';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';
import { formatStatusLabel, getStatusBadgeColor } from '../../utils/statusUtils';

// ==========================================
// 1. DATA STRUCTURES & CATEGORY SPECIFICATIONS
// ==========================================

interface ItemTypeSpec {
  name: string;
  desc: string;
}

interface CategorySpec {
  id: string;
  name: string;
  heroImage: string;
  duoImages?: [string, string];
  types: ItemTypeSpec[];
  materials: string[];
  fabricsOrFinishes: string[];
  aspects: {
    label: string;
    key: string;
    options: string[];
  }[];
  dimDefaults: {
    length: string;
    width: string;
    height: string;
    presets: { label: string; l: string; w: string; h: string }[];
    guideline: string;
  };
}

export const CATEGORY_SPECS: CategorySpec[] = [
  {
    id: 'sofas',
    name: 'Sofas & Seating',
    heroImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80',
    duoImages: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=300&q=80',
    ],
    types: [
      {
        name: 'Custom 3-Seater Sofa',
        desc: 'Classic handcrafted family sofa with tailored cushions & deep seating.',
      },
      {
        name: 'L-Shape Sectional',
        desc: 'Modular corner layout with optional reversible chaise lounger.',
      },
      {
        name: 'Lounge Armchair',
        desc: 'Accent lounge chair with ergonomic lumbar support & sculpted arms.',
      },
      {
        name: 'Modular Sofa',
        desc: 'Flexible interlocking seating blocks with plush high-density cushions.',
      },
      {
        name: 'Recliner Chair',
        desc: 'Artisan recliner with smooth manual or motorized reclining mechanism.',
      },
    ],
    materials: ['Solid Teak Wood', 'Sheesham Rosewood', 'Dark Walnut', 'Natural Oak', 'Brushed Stainless Steel'],
    fabricsOrFinishes: ['Cream Bouclé', 'Emerald Green Velvet', 'Terracotta Microfiber', 'Tan Italian Leather', 'Charcoal Linen'],
    aspects: [
      {
        label: 'Seating Capacity',
        key: 'capacity',
        options: ['2-Seater (Compact)', '3-Seater (Standard)', '4-Seater (Spacious)', '5+ Seater L-Sectional'],
      },
      {
        label: 'Cushion Density & Comfort',
        key: 'cushionFirmness',
        options: ['Plush Cloud Soft', 'Ergonomic Medium-Firm', 'High-Density Orthopedic'],
      },
      {
        label: 'Armrest & Leg Style',
        key: 'legStyle',
        options: ['Tapered Wood Legs', 'Brushed Brass Metal', 'Matte Black Iron', 'Slanted Track Arm', 'Armless Minimalist'],
      },
    ],
    dimDefaults: {
      length: '220',
      width: '95',
      height: '85',
      presets: [
        { label: 'Compact 2-Seater', l: '160', w: '85', h: '82' },
        { label: 'Standard 3-Seater', l: '220', w: '95', h: '85' },
        { label: 'Spacious Sectional', l: '280', w: '160', h: '85' },
      ],
      guideline: 'Standard sofa depths range between 85–100 cm; seat heights 42–48 cm.',
    },
  },
  {
    id: 'dining',
    name: 'Dining Tables & Chairs',
    heroImage: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=500&q=80',
    duoImages: [
      'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=300&q=80',
    ],
    types: [
      {
        name: 'Dining Table',
        desc: 'Solid hardwood dining tabletop with architectural leg joinery.',
      },
      {
        name: 'Complete Dining Set with Chairs',
        desc: 'Matching handcrafted table with upholstered dining chairs.',
      },
      {
        name: 'Dining Bench',
        desc: 'Live-edge or beveled timber bench for communal dining spaces.',
      },
      {
        name: 'Kitchen Counter Island',
        desc: 'Multi-functional prep counter with integrated bar seating and storage.',
      },
    ],
    materials: ['Solid Teak Planks', 'Sheesham Wood', 'Italian Carrara Marble', 'Walnut Slab', 'Smoked Tempered Glass'],
    fabricsOrFinishes: ['Natural Matte Wax', 'High Gloss Lacquer', 'Dark Vintage Walnut Polish', 'Raw Organic Oil'],
    aspects: [
      {
        label: 'Tabletop Shape',
        key: 'tableShape',
        options: ['Rectangular', 'Oval', 'Round', 'Extendable Leaf Mechanism'],
      },
      {
        label: 'Seating Capacity',
        key: 'capacity',
        options: ['4-Seater', '6-Seater', '8-Seater', '10-Seater Grand'],
      },
      {
        label: 'Edge Profile',
        key: 'edgeProfile',
        options: ['Live Edge Natural', 'Beveled Soft Edge', 'Rounded Bullnose', 'Square Cut'],
      },
    ],
    dimDefaults: {
      length: '200',
      width: '100',
      height: '76',
      presets: [
        { label: '4-Seater Table', l: '140', w: '90', h: '76' },
        { label: '6-Seater Table', l: '200', w: '100', h: '76' },
        { label: '8-Seater Table', l: '240', w: '110', h: '76' },
      ],
      guideline: 'Recommended dining height is 74–76 cm with 60 cm width per seated person.',
    },
  },
  {
    id: 'beds',
    name: 'Beds & Sanctuary',
    heroImage: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=500&q=80',
    duoImages: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1540518614846-7ede433c5173?auto=format&fit=crop&w=300&q=80',
    ],
    types: [
      {
        name: 'Platform Bed Frame',
        desc: 'Low-profile minimalist solid wood platform with floating base effect.',
      },
      {
        name: 'Canopy Four-Poster Bed',
        desc: 'Architectural solid timber canopy with clean minimalist posts.',
      },
      {
        name: 'Hydraulic Storage Bed',
        desc: 'Gas-lift underbed compartment with deep dust-sealed storage.',
      },
      {
        name: 'Daybed',
        desc: 'Versatile lounger bed frame for guest rooms, reading nooks & lounges.',
      },
    ],
    materials: ['Solid Teak Wood', 'Sheesham Rosewood', 'Dark Walnut', 'Natural Oak Frame'],
    fabricsOrFinishes: ['Cream Bouclé Upholstery', 'Emerald Velvet Headboard', 'Washed Organic Linen', 'Raw Wood Finish'],
    aspects: [
      {
        label: 'Bed Size Specifications',
        key: 'bedSize',
        options: ['King Size (72" x 78")', 'Queen Size (60" x 78")', 'Super King (78" x 84")', 'Custom Floorplan Specs'],
      },
      {
        label: 'Headboard Design',
        key: 'headboardStyle',
        options: ['Tall Tufted Fabric Panel', 'Floating Wooden Slats', 'Curved Wingback', 'Integrated LED Nightstands'],
      },
      {
        label: 'Underbed Storage Feature',
        key: 'storageFeature',
        options: ['Hydraulic Gas Lift Storage', 'Dual Side Pullout Drawers', 'Low-Profile Platform (No Storage)'],
      },
    ],
    dimDefaults: {
      length: '210',
      width: '185',
      height: '110',
      presets: [
        { label: 'Queen Platform', l: '205', w: '160', h: '105' },
        { label: 'King Platform', l: '210', w: '185', h: '110' },
        { label: 'Super King Frame', l: '220', w: '200', h: '115' },
      ],
      guideline: 'Standard mattress dimensions plus 10–15 cm border allowance for the wooden frame.',
    },
  },
  {
    id: 'storage',
    name: 'Storage & Cabinets',
    heroImage: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=500&q=80',
    duoImages: [
      'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=300&q=80',
    ],
    types: [
      {
        name: 'TV Media Console',
        desc: 'Low-slung console with acoustic fluted doors & concealed cable routing.',
      },
      {
        name: 'Sideboard Credenza',
        desc: 'Dining room credenza with soft-close drawers & brushed brass handles.',
      },
      {
        name: 'Bookcase Display Cabinet',
        desc: 'Floor-to-ceiling shelving unit with warm LED backlighting channels.',
      },
      {
        name: 'Full Modular Wardrobe',
        desc: 'Bespoke closet system with tailored interior organizer compartments.',
      },
    ],
    materials: ['Solid Teak Wood', 'Sheesham Wood', 'Walnut & Brass', 'Oak & Tempered Glass'],
    fabricsOrFinishes: ['Natural Satin Wax', 'Smoked Espresso Stain', 'Matte Black Wood Grain', 'Clear Lacquer'],
    aspects: [
      {
        label: 'Door & Panel Style',
        key: 'doorStyle',
        options: ['Fluted Glass Sliding Doors', 'Soft-Close Push-Touch Solid Panels', 'Louvered Wooden Slats'],
      },
      {
        label: 'Interior Layout Requirement',
        key: 'internalLayout',
        options: ['Wine Bottle Rack & Bar', 'Glass Shelving with Warm LED', 'Clothes Hanging Rail & Drawers', 'Adjustable Shelves'],
      },
    ],
    dimDefaults: {
      length: '180',
      width: '45',
      height: '60',
      presets: [
        { label: 'Compact TV Unit', l: '150', w: '40', h: '50' },
        { label: 'Standard Credenza', l: '180', w: '45', h: '75' },
        { label: 'Full Wall Unit', l: '240', w: '50', h: '210' },
      ],
      guideline: 'Media consoles are typically 40–50 cm deep; wardrobes require 60 cm depth for hangers.',
    },
  },
  {
    id: 'workspace',
    name: 'Desks & Workstations',
    heroImage: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=500&q=80',
    duoImages: [
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=300&q=80',
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80',
    ],
    types: [
      {
        name: 'Executive L-Desk',
        desc: 'Spacious L-shaped timber workstation with modesty panel & brass hardware.',
      },
      {
        name: 'Standing Electric Lift Desk',
        desc: 'Height-adjustable solid wood desk top with digital memory presets.',
      },
      {
        name: 'Writing Desk',
        desc: 'Compact minimalist desk with slim stationery drawers.',
      },
      {
        name: 'Floating Wall Desk',
        desc: 'Space-saving wall-mounted timber desk with integrated wire drop.',
      },
    ],
    materials: ['Solid Teak Slab', 'Walnut & Steel', 'Oak Timber', 'Rosewood Executive'],
    fabricsOrFinishes: ['Matte Wood Finish', 'Dark Vintage Walnut', 'Natural Honey Oil'],
    aspects: [
      {
        label: 'Integrated Tech & Power Features',
        key: 'techFeature',
        options: ['Built-in Wireless Charger Pad', 'Cable Management Tray', 'Lockable Secret Drawer', 'Pop-Up Power Sockets'],
      },
    ],
    dimDefaults: {
      length: '160',
      width: '75',
      height: '75',
      presets: [
        { label: 'Compact Writing Desk', l: '120', w: '60', h: '75' },
        { label: 'Standard Workstation', l: '160', w: '75', h: '75' },
        { label: 'Executive L-Desk', l: '200', w: '140', h: '75' },
      ],
      guideline: 'Standard desk surface height is 74–76 cm; minimum 60 cm depth for comfortable screen distance.',
    },
  },
];



const COLOR_SWATCHES = [
  { name: 'Cream White', hex: '#FDFBF7' },
  { name: 'Warm Beige', hex: '#E7DEC8' },
  { name: 'Emerald Green', hex: '#0B4F37' },
  { name: 'Terracotta', hex: '#C85A32' },
  { name: 'Charcoal Grey', hex: '#2F3337' },
  { name: 'Navy Blue', hex: '#1E293B' },
  { name: 'Natural Teak', hex: '#A87948' },
  { name: 'Dark Walnut', hex: '#4A3525' },
  { name: 'Custom Shade', hex: 'CUSTOM' },
];

const STAGES = [
  'Material Sourcing',
  'Cutting & Joinery',
  'Assembly & Upholstery',
  'Quality Control & Finishing',
  'Ready for Dispatch',
];

interface CustomOrderTrackerProps {
  openModalTrigger?: number;
}

export const CustomOrderTracker: React.FC<CustomOrderTrackerProps> = ({ openModalTrigger }) => {
  const navigate = useNavigate();

  // State: Data from Backend
  const [userOrders, setUserOrders] = useState<CustomOrderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderTrackingMap, setOrderTrackingMap] = useState<Record<number, OrderTrackingInfo>>({});
  const [expandedTrackingId, setExpandedTrackingId] = useState<number | null>(null);

  // Layout & Navigation State
  const [mobileActiveView, setMobileActiveView] = useState<'create' | 'requests'>('create');
  const [ordersSearchQuery, setOrdersSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Maximise & Minimise Card Provision States
  const [studioMaximized, setStudioMaximized] = useState(false);
  const [studioMinimized, setStudioMinimized] = useState(false);
  const [requestsMaximized, setRequestsMaximized] = useState(false);
  const [requestsMinimized, setRequestsMinimized] = useState(false);
  const [minimizedOrderIds, setMinimizedOrderIds] = useState<Record<number, boolean>>({});
  const [maximizedOrderModal, setMaximizedOrderModal] = useState<CustomOrderData | null>(null);

  // Creation Studio Wizard State
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const stepEnteredTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    stepEnteredTimestampRef.current = Date.now();
  }, [modalStep]);

  // Selected Customization Options State
  const [selectedCategory, setSelectedCategory] = useState<CategorySpec>(CATEGORY_SPECS[0]);
  const [furnitureType, setFurnitureType] = useState<string>(CATEGORY_SPECS[0].types[0].name);
  const [material, setMaterial] = useState<string>(CATEGORY_SPECS[0].materials[0]);
  const [customMaterialInput, setCustomMaterialInput] = useState('');
  const [fabricOrFinish, setFabricOrFinish] = useState<string>(CATEGORY_SPECS[0].fabricsOrFinishes[0]);
  const [selectedColor, setSelectedColor] = useState('Cream White');
  const [customColorInput, setCustomColorInput] = useState('');
  const [customPickerHex, setCustomPickerHex] = useState('#48A63E');
  const [aspectSelections, setAspectSelections] = useState<Record<string, string>>({});
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>(['']);
  const [isDragging, setIsDragging] = useState(false);

  // Dimensions
  const [lengthCm, setLengthCm] = useState(CATEGORY_SPECS[0].dimDefaults.length);
  const [widthCm, setWidthCm] = useState(CATEGORY_SPECS[0].dimDefaults.width);
  const [heightCm, setHeightCm] = useState(CATEGORY_SPECS[0].dimDefaults.height);
  const [customNotes, setCustomNotes] = useState('');

  // Modals
  const [cancelModalOrderId, setCancelModalOrderId] = useState<number | null>(null);

  // Format order date helper matching MyOrdersPage
  const formatOrderDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to parse design_description string into clean aspect pills & special notes
  const parseOrderDescription = (desc?: string) => {
    if (!desc) return { aspectPills: [], specialNotes: '' };
    let specialNotes = desc;
    const aspectPills: { label: string; value: string }[] = [];

    if (desc.includes('Aspects: [')) {
      const parts = desc.split(']. Special Requirements: ');
      const rawAspects = parts[0].replace('Aspects: [', '');
      specialNotes = parts[1] || '';

      const aspectPairs = rawAspects.split('; ');
      aspectPairs.forEach((pair) => {
        const [k, v] = pair.split(': ');
        if (k && v) {
          const formattedKey = k
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .replace('Capacity', 'Seating')
            .replace('Cushion Firmness', 'Comfort')
            .replace('Leg Style', 'Leg & Base');
          aspectPills.push({ label: formattedKey, value: v });
        }
      });
    }

    return { aspectPills, specialNotes };
  };

  // Load custom requests from backend API
  const loadUserCustomOrders = async () => {
    setLoading(true);
    try {
      const allOrders = await fetchCustomOrders();
      allOrders.sort((a, b) => b.custom_order_id - a.custom_order_id);
      setUserOrders(allOrders);
    } catch (err) {
      console.error('Error loading custom order tracking:', err);
      setUserOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserCustomOrders();

    const handleCustomOrdersUpdate = () => {
      loadUserCustomOrders();
    };

    window.addEventListener('custom-orders-updated', handleCustomOrdersUpdate);
    return () => {
      window.removeEventListener('custom-orders-updated', handleCustomOrdersUpdate);
    };
  }, []);

  // Listen to openModalTrigger from Dashboard
  useEffect(() => {
    if (openModalTrigger && openModalTrigger > 0) {
      setEditingOrderId(null);
      setModalStep(1);
      setMobileActiveView('create');
    }
  }, [openModalTrigger]);

  // Lazy-load tracking timeline for an order
  const toggleTracking = async (orderId: number) => {
    if (expandedTrackingId === orderId) {
      setExpandedTrackingId(null);
      return;
    }
    setExpandedTrackingId(orderId);
    if (!orderTrackingMap[orderId]) {
      try {
        const info = await fetchOrderTrackingTimeline(orderId);
        setOrderTrackingMap((prev) => ({ ...prev, [orderId]: info }));
      } catch (e) {
        console.error('Error loading timeline:', e);
      }
    }
  };

  // Card toggle helpers for individual request cards
  const toggleOrderCardMinimized = (orderId: number) => {
    setMinimizedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const toggleAllOrdersMinimized = () => {
    const allCurrentlyMin = filteredOrders.length > 0 && filteredOrders.every((o) => minimizedOrderIds[o.custom_order_id]);
    const nextMap: Record<number, boolean> = {};
    filteredOrders.forEach((o) => {
      nextMap[o.custom_order_id] = !allCurrentlyMin;
    });
    setMinimizedOrderIds((prev) => ({ ...prev, ...nextMap }));
  };

  // Add to cart and direct checkout
  const handleAddToCartAndPay = (order: CustomOrderData) => {
    if (!order.estimated_price) return;
    setDirectCheckoutItem({
      id: `custom-order-${order.custom_order_id}`,
      name: `Custom ${order.furniture_type} (Order #${order.custom_order_id})`,
      material: `Material: ${order.material} | Shade: ${order.color}`,
      price: order.estimated_price,
      imageUrl: order.reference_image ? parseReferenceImages(order.reference_image)[0] || undefined : undefined,
    });
    navigate('/cart?direct=true');
  };



  // Handle Category Change
  const handleCategorySelect = (cat: CategorySpec) => {
    setSelectedCategory(cat);
    setFurnitureType(cat.types[0]?.name || '');
    setMaterial(cat.materials[0]);
    setFabricOrFinish(cat.fabricsOrFinishes[0]);
    setLengthCm(cat.dimDefaults.length);
    setWidthCm(cat.dimDefaults.width);
    setHeightCm(cat.dimDefaults.height);

    const initialAspects: Record<string, string> = {};
    cat.aspects.forEach((asp) => {
      initialAspects[asp.key] = asp.options[0];
    });
    setAspectSelections(initialAspects);
  };

  const handleAspectChange = (key: string, val: string) => {
    setAspectSelections((prev) => ({ ...prev, [key]: val }));
  };

  // Drag and Drop & File Upload handlers
  const processFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setReferenceImageUrls((prev) => {
            const filtered = prev.filter((url) => url.trim() !== '');
            return [...filtered, result];
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Start Editing Specs for a Pending Order
  const handleStartEditOrder = (order: CustomOrderData) => {
    if (order.order_status !== 'Pending' && order.order_status !== 'Pending Approval') {
      return;
    }

    setEditingOrderId(order.custom_order_id);
    setFurnitureType(order.furniture_type);
    setMaterial(order.material);
    setFabricOrFinish(order.color);

    if (order.reference_image) {
      const images = parseReferenceImages(order.reference_image);
      setReferenceImageUrls(images.length > 0 ? images : ['']);
    } else {
      setReferenceImageUrls(['']);
    }

    if (order.dimensions) {
      const match = order.dimensions.match(/(\d+)cm L × (\d+)cm W × (\d+)cm H/);
      if (match) {
        setLengthCm(match[1]);
        setWidthCm(match[2]);
        setHeightCm(match[3]);
      }
    }

    const { specialNotes } = parseOrderDescription(order.design_description);
    setCustomNotes(specialNotes === 'None' ? '' : specialNotes);

    setModalStep(1);
    setMobileActiveView('create');

    const formEl = document.getElementById('studio-creator-card');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEditing = () => {
    setEditingOrderId(null);
    setModalStep(1);
    setCustomNotes('');
    setReferenceImageUrls(['']);
    handleCategorySelect(CATEGORY_SPECS[0]);
  };

  // Submit or Update Custom Order
  const handleCreateOrUpdateCustomOrder = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // Guard: only allow submission from step 3 (Dimensions & Review)
    if (modalStep !== 3) {
      console.warn('Blocked attempt to submit custom order before reaching Step 3');
      return;
    }

    // Cooldown guard: block rapid/double click events that originated during the step 2 -> 3 transition
    if (Date.now() - stepEnteredTimestampRef.current < 500) {
      console.warn('Blocked rapid click event immediately following step transition');
      return;
    }

    if (submittingOrder) return;

    setSubmittingOrder(true);
    try {
      const formattedDimensions = `${lengthCm}cm L × ${widthCm}cm W × ${heightCm}cm H`;
      const aspectSummary = Object.entries(aspectSelections)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');

      const finalMaterial = material === 'Other' ? (customMaterialInput.trim() || 'Custom Material') : material;
      let finalColor = selectedColor;
      if (selectedColor === 'Custom Shade' || selectedColor === 'Custom Color Picker' || selectedColor === 'Other') {
        const shadeName = customColorInput.trim() || 'Custom Shade';
        finalColor = `${shadeName} (${customPickerHex.toUpperCase()})`;
      }
      const combinedColorFinish = `${fabricOrFinish} (${finalColor})`;
      const fullNotes = `Aspects: [${aspectSummary}]. Special Requirements: ${customNotes || 'None'}`;
      const validRefImages = referenceImageUrls.map((u) => u.trim()).filter(Boolean).join(', ');

      if (editingOrderId) {
        setUserOrders((prev) =>
          prev.map((o) =>
            o.custom_order_id === editingOrderId
              ? {
                  ...o,
                  furniture_type: furnitureType,
                  material: finalMaterial,
                  dimensions: formattedDimensions,
                  color: combinedColorFinish,
                  design_description: fullNotes,
                  reference_image: validRefImages || o.reference_image,
                }
              : o
          )
        );
      } else {
        const created = await submitCustomOrderRequest(
          furnitureType,
          finalMaterial,
          formattedDimensions,
          combinedColorFinish,
          fullNotes,
          validRefImages || undefined
        );
        setUserOrders((prev) => [created, ...prev]);
      }

      // Trigger backend contact notification
      try {
        const storedUser = localStorage.getItem('user');
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        const endpoint = `${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/contact`;

        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userObj?.full_name || userObj?.username || 'Logged Customer',
            email: userObj?.email || 'customer@retailsphere.ai',
            subject: `${editingOrderId ? 'Updated' : 'New'} Custom Furniture Order Request: ${furnitureType}`,
            message: `Custom Build Specifications:\n- Category: ${selectedCategory.name}\n- Product Type: ${furnitureType}\n- Primary Material: ${finalMaterial}\n- Upholstery / Finish: ${fabricOrFinish}\n- Dimensions: ${formattedDimensions}\n- Aspect Specs: ${aspectSummary}\n- Additional Requirements / Notes: ${customNotes || 'None'}`,
          }),
        });
      } catch (noticeErr) {
        console.warn('Contact email dispatch notice:', noticeErr);
      }

      setOrderSuccess(true);
      window.dispatchEvent(new Event('custom-orders-updated'));

      setTimeout(() => {
        setOrderSuccess(false);
        setEditingOrderId(null);
        setModalStep(1);
        setCustomNotes('');
        setReferenceImageUrls(['']);
        loadUserCustomOrders();
      }, 1800);
    } catch (err) {
      console.error('Error saving custom order:', err);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Quotation Response Handlers
  const handleApproveQuote = async (orderId: number) => {
    try {
      setUserOrders((prev) =>
        prev.map((o) => (o.custom_order_id === orderId ? { ...o, order_status: 'CUSTOMER_APPROVED' } : o))
      );
      await updateOrderStatus(orderId, 'CUSTOMER_APPROVED');
      window.dispatchEvent(new Event('custom-orders-updated'));
      await loadUserCustomOrders();
    } catch (e) {
      console.error('Approve quote failed:', e);
    }
  };

  const handleRejectQuote = async (orderId: number) => {
    try {
      setUserOrders((prev) =>
        prev.map((o) => (o.custom_order_id === orderId ? { ...o, order_status: 'CUSTOMER_REJECTED' } : o))
      );
      await updateOrderStatus(orderId, 'CUSTOMER_REJECTED');
      window.dispatchEvent(new Event('custom-orders-updated'));
      await loadUserCustomOrders();
    } catch (e) {
      console.error('Reject quote failed:', e);
    }
  };

  // Filtered orders list for the right panel
  const filteredOrders = userOrders.filter((ord) => {
    if (statusFilter !== 'All') {
      if (statusFilter === 'Pending' && ord.order_status !== 'Pending' && ord.order_status !== 'Pending Approval') return false;
      if (statusFilter === 'Quoted' && ord.order_status !== 'Quote Provided' && ord.order_status !== 'QUOTATION_READY') return false;
      if (statusFilter === 'Approved' && ord.order_status !== 'Approved' && ord.order_status !== 'CUSTOMER_APPROVED') return false;
      if (statusFilter === 'In Production' && ord.order_status !== 'In Production' && ord.order_status !== 'Paid') return false;
    }
    if (ordersSearchQuery.trim()) {
      const q = ordersSearchQuery.toLowerCase();
      const matchId = String(ord.custom_order_id).includes(q);
      const matchType = (ord.furniture_type || '').toLowerCase().includes(q);
      const matchMat = (ord.material || '').toLowerCase().includes(q);
      return matchId || matchType || matchMat;
    }
    return true;
  });

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-4 text-[#1C1814]">
      {/* ==================================================== */}
      {/* 1. COMPACT PAGE HEADER & MOBILE TABS SWITCHER         */}
      {/* ==================================================== */}
      <div className="bg-white rounded-2xl border border-[#E2D7CB] p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#48A63E]/10 border border-[#48A63E]/20 text-[#48A63E] text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-[#48A63E]" />
              <span>Bespoke Furniture Studio & Requests</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#2C241D] tracking-tight">
              Product Customisation & Build Studio
            </h1>
            <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
              Design bespoke furniture tailored to your space, review workshop quotations, and track craftsmanship in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#D6C9B9] text-xs font-bold text-[#5C4E42]">
              <Package className="w-3.5 h-3.5 text-[#48A63E]" />
              <span>{userOrders.length} Custom {userOrders.length === 1 ? 'Request' : 'Requests'}</span>
            </span>

            <button
              onClick={loadUserCustomOrders}
              className="p-2 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814] transition-all cursor-pointer shadow-2xs"
              title="Refresh requests status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#48A63E]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Quick Switcher Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#EFE7DE] lg:hidden">
          <button
            onClick={() => setMobileActiveView('create')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileActiveView === 'create'
                ? 'bg-[#48A63E] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-[#6B5C4D] hover:bg-white border border-[#E2D7CB]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Furniture Studio</span>
          </button>

          <button
            onClick={() => setMobileActiveView('requests')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileActiveView === 'requests'
                ? 'bg-[#48A63E] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-[#6B5C4D] hover:bg-white border border-[#E2D7CB]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Previous Requests ({userOrders.length})</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MAXIMISED VIEW RESTORE QUICK BANNER                  */}
      {/* ==================================================== */}
      {(studioMaximized || requestsMaximized) && (
        <div className="bg-[#FAF7F2] border border-[#D6C9B9] px-4 py-2.5 rounded-xl flex items-center justify-between text-xs animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2 text-[#5C4E42]">
            {studioMaximized ? (
              <>
                <Sparkles className="w-4 h-4 text-[#48A63E]" />
                <span>
                  <strong>Furniture Studio Card</strong> is currently maximised to full width.
                </span>
              </>
            ) : (
              <>
                <Layers className="w-4 h-4 text-[#48A63E]" />
                <span>
                  <strong>My Custom Requests Card</strong> is currently maximised to full width.
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setStudioMaximized(false);
              setRequestsMaximized(false);
            }}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F3EDE3] border border-[#D6C9B9] text-[#2C241D] font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Minimize2 className="w-3.5 h-3.5 text-[#48A63E]" />
            <span>Restore Normal View</span>
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. MAIN DASHBOARD (DYNAMIC 2-COLUMN OR EXPANDED)     */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ================================================== */}
        {/* LEFT COLUMN: CREATION STUDIO WIZARD CARD           */}
        {/* ================================================== */}
        <div
          id="studio-creator-card"
          className={`${
            requestsMaximized
              ? 'hidden'
              : studioMaximized
              ? 'lg:col-span-12 block'
              : requestsMinimized || studioMinimized
              ? `lg:col-span-12 ${mobileActiveView === 'requests' ? 'hidden lg:block' : 'block'}`
              : `lg:col-span-7 ${mobileActiveView === 'requests' ? 'hidden lg:block' : 'block'}`
          } bg-white rounded-2xl border border-[#E2D7CB] p-4 sm:p-5 shadow-2xs space-y-5 transition-all duration-300`}
        >
          {/* Creator Header with Status, Step Indicator & Window Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-[#2C241D] truncate">
                  {editingOrderId ? `Edit Specifications (Order #${editingOrderId})` : 'Configure Custom Furniture'}
                </h2>
                {editingOrderId && (
                  <button
                    onClick={handleCancelEditing}
                    className="text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 transition-colors cursor-pointer shrink-0"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <p className="text-xs text-[#7A6C5E] font-medium mt-0.5">
                {studioMinimized
                  ? `Studio Card Minimised • Step ${modalStep} (${selectedCategory.name} - ${furnitureType})`
                  : `Step ${modalStep} of 3 • ${modalStep === 1 ? 'Choose Category & Model' : modalStep === 2 ? 'Select Timber, Finish & Shade' : 'Set Exact Dimensions & Submit'}`}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {/* Compact 3-Step Wizard Navigator (visible when not minimised) */}
              {!studioMinimized && (
                <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#E2D7CB]">
                  {[
                    { step: 1, label: 'Model' },
                    { step: 2, label: 'Materials' },
                    { step: 3, label: 'Dimensions' },
                  ].map((s) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setModalStep(s.step as 1 | 2 | 3)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        modalStep === s.step
                          ? 'bg-[#48A63E] text-white shadow-2xs font-extrabold'
                          : 'text-[#6E6458] hover:text-[#1C1814] hover:bg-white/60'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                        modalStep === s.step ? 'bg-white/20 text-white font-black' : 'bg-black/5 text-[#7A6C5E]'
                      }`}>
                        {s.step}
                      </span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Window Controls: Minimise & Maximise Provision */}
              <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#D6C9B9]">
                <button
                  type="button"
                  onClick={() => {
                    setStudioMinimized((prev) => !prev);
                    if (studioMaximized) setStudioMaximized(false);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                    studioMinimized
                      ? 'bg-[#48A63E] text-white shadow-2xs'
                      : 'hover:bg-white text-[#5C4E42] hover:text-[#1C1814]'
                  }`}
                  title={studioMinimized ? 'Expand Studio Card' : 'Minimise Studio Card'}
                  aria-label={studioMinimized ? 'Expand Studio Card' : 'Minimise Studio Card'}
                >
                  {studioMinimized ? <Plus className="w-3.5 h-3.5 text-white" /> : <Minus className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline text-[10px]">{studioMinimized ? 'Expand' : 'Minimise'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (studioMinimized) setStudioMinimized(false);
                    setStudioMaximized((prev) => !prev);
                    setRequestsMaximized(false);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                    studioMaximized
                      ? 'bg-[#48A63E] text-white shadow-2xs'
                      : 'hover:bg-white text-[#5C4E42] hover:text-[#1C1814]'
                  }`}
                  title={studioMaximized ? 'Restore Normal Side-by-Side View' : 'Maximise Studio (Full Width)'}
                  aria-label={studioMaximized ? 'Restore Normal Side-by-Side View' : 'Maximise Studio (Full Width)'}
                >
                  {studioMaximized ? <Minimize2 className="w-3.5 h-3.5 text-white" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline text-[10px]">{studioMaximized ? 'Restore' : 'Maximise'}</span>
                </button>
              </div>
            </div>
          </div>

          {studioMinimized ? (
            <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E2D7CB] flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#48A63E]/10 flex items-center justify-center text-[#48A63E]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1C1814]">
                    Creation Studio is Minimised
                  </h4>
                  <p className="text-[11px] text-[#7A6C5E]">
                    Current selection: {selectedCategory.name} • {furnitureType}. Click Expand to continue configuring.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudioMinimized(false)}
                className="px-3 py-1.5 rounded-lg bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Expand Studio</span>
              </button>
            </div>
          ) : orderSuccess ? (
            <div className="py-12 text-center space-y-3 bg-[#FAF8F5] rounded-xl border border-[#E2D7CB] animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-[#48A63E]/10 border-2 border-[#48A63E]/30 text-[#48A63E] mx-auto flex items-center justify-center animate-bounce shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[#1C1814]">
                {editingOrderId ? 'Specifications Updated Successfully!' : 'Custom Build Request Submitted!'}
              </h3>
              <p className="text-xs text-[#6E6458] max-w-sm mx-auto font-medium">
                Your custom build request for <strong>{furnitureType}</strong> has been logged and sent to our workshop team. Check the panel on the right to review status!
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modalStep === 3) {
                  handleCreateOrUpdateCustomOrder(e);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
                    e.preventDefault();
                  }
                }
              }}
              className="space-y-5"
            >
              {/* ==================================================== */}
              {/* STEP 1: CATEGORY & PRODUCT SELECTION                 */}
              {/* ==================================================== */}
              {modalStep === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Category Selection with Photos */}
                  <div>
                    <label className="block text-xs font-black text-[#5C4E42] uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#48A63E]" />
                        <span>1. Select Furniture Category</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#7A6C5E]">{CATEGORY_SPECS.length} Categories</span>
                    </label>

                    <div className={`grid grid-cols-2 ${studioMaximized ? 'sm:grid-cols-5' : 'sm:grid-cols-5'} gap-2`}>
                      {CATEGORY_SPECS.map((cat) => {
                        const isSelected = selectedCategory.id === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategorySelect(cat)}
                            className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                              isSelected
                                ? 'bg-[#48A63E]/8 border-2 border-[#48A63E] shadow-xs ring-1 ring-[#48A63E]/20'
                                : 'bg-white hover:bg-[#FAF8F5] border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814]'
                            }`}
                          >
                            <div className="w-full h-16 rounded-lg overflow-hidden bg-[#F3EDE3] relative mb-1.5">
                              <img
                                src={cat.heroImage}
                                alt={cat.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#48A63E] text-white flex items-center justify-center shadow-xs">
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <span className={`text-[11px] font-bold leading-tight truncate block ${isSelected ? 'text-[#48A63E] font-black' : 'text-[#2C241D]'}`}>
                              {cat.name}
                            </span>
                            <span className="text-[9px] text-[#7A6C5E] font-medium mt-0.5">
                              {cat.types.length} Models
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ========================================================= */}
                  {/* SELECT SPECIFIC PRODUCT / MODEL — NO PHOTOS FOR THIS SECTION */}
                  {/* ========================================================= */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-[#5C4E42] uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#48A63E]" />
                        <span>2. Select Specific Product / Model</span>
                      </label>
                      <span className="text-[11px] font-semibold text-[#7A6C5E]">
                        {selectedCategory.types.length} Available Models in {selectedCategory.name}
                      </span>
                    </div>

                    <div className={`grid grid-cols-1 ${studioMaximized ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2.5`}>
                      {selectedCategory.types.map((typeObj) => {
                        const isSelected = furnitureType === typeObj.name;
                        return (
                          <div
                            key={typeObj.name}
                            onClick={() => setFurnitureType(typeObj.name)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                              isSelected
                                ? 'bg-[#48A63E]/8 border-2 border-[#48A63E] shadow-xs ring-1 ring-[#48A63E]/20'
                                : 'bg-white hover:bg-[#FAF8F5] border-[#E2D7CB] hover:border-[#48A63E]/50'
                            }`}
                          >
                            {/* Visual Radio / Check indicator */}
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                              isSelected ? 'border-[#48A63E] bg-[#48A63E] text-white' : 'border-[#C8BCAC] bg-white'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-[#48A63E] font-black' : 'text-[#1C1814]'}`}>
                                  {typeObj.name}
                                </h4>
                                {isSelected && (
                                  <span className="text-[9px] font-black uppercase text-[#48A63E] bg-[#48A63E]/10 px-1.5 py-0.5 rounded shrink-0">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#6E6458] font-medium leading-snug line-clamp-2 mt-0.5">
                                {typeObj.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* STEP 2: MATERIALS, FINISH, SHADES & ASPECTS          */}
              {/* ==================================================== */}
              {modalStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Primary Timber / Structural Material */}
                  <div>
                    <label className="block text-xs font-black text-[#5C4E42] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#48A63E]" />
                      <span>Primary Timber & Structural Material</span>
                    </label>

                    <div className={`grid grid-cols-2 ${studioMaximized ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2`}>
                      {[...selectedCategory.materials, 'Other'].map((mat) => {
                        const isSelected = material === mat;
                        return (
                          <button
                            key={mat}
                            type="button"
                            onClick={() => setMaterial(mat)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer truncate flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#48A63E] text-white shadow-xs font-extrabold'
                                : 'bg-[#FAF7F2] hover:bg-white border border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814]'
                            }`}
                          >
                            <span className="truncate">{mat === 'Other' ? '✨ Custom Material' : mat}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>

                    {material === 'Other' && (
                      <div className="mt-2.5 p-3 bg-[#FAF8F5] border border-[#E2D7CB] rounded-xl space-y-1">
                        <label className="block text-[11px] font-bold text-[#5C4E42]">
                          Specify Custom Structural Material:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Italian Carrara Gold Marble, Reclaimed Oak, Brass Frame..."
                          value={customMaterialInput}
                          onChange={(e) => setCustomMaterialInput(e.target.value)}
                          required={material === 'Other'}
                          className="w-full px-3 py-1.5 bg-white border border-[#E2D7CB] rounded-lg font-bold text-xs focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Upholstery Fabric / Polish Finish */}
                  <div>
                    <label className="block text-xs font-black text-[#5C4E42] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#48A63E]" />
                      <span>Upholstery Fabric & Texture Finish</span>
                    </label>
                    <div className={`grid grid-cols-2 ${studioMaximized ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2`}>
                      {selectedCategory.fabricsOrFinishes.map((fab) => {
                        const isSelected = fabricOrFinish === fab;
                        return (
                          <button
                            key={fab}
                            type="button"
                            onClick={() => setFabricOrFinish(fab)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer truncate flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#48A63E] text-white shadow-xs font-extrabold'
                                : 'bg-[#FAF7F2] hover:bg-white border border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814]'
                            }`}
                          >
                            <span className="truncate">{fab}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Palette Swatches */}
                  <div>
                    <label className="block text-xs font-black text-[#5C4E42] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#48A63E]" />
                      <span>Color & Polish Shade Palette</span>
                    </label>

                    <div className={`grid grid-cols-3 ${studioMaximized ? 'sm:grid-cols-5' : 'sm:grid-cols-3'} gap-2`}>
                      {COLOR_SWATCHES.map((swatch) => {
                        const isSelected = selectedColor === swatch.name;
                        if (swatch.hex === 'CUSTOM') {
                          return (
                            <button
                              key={swatch.name}
                              type="button"
                              onClick={() => setSelectedColor(swatch.name)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-[#48A63E]/10 border-2 border-[#48A63E] text-[#48A63E]'
                                  : 'bg-[#FAF7F2] hover:bg-white border border-[#E2D7CB] text-[#5C4E42]'
                              }`}
                            >
                              <span className="text-xs">🎨</span>
                              <span className="truncate">Custom Shade</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            key={swatch.name}
                            type="button"
                            onClick={() => setSelectedColor(swatch.name)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer flex items-center gap-2 ${
                              isSelected
                                ? 'bg-[#48A63E]/10 border-2 border-[#48A63E] text-[#48A63E]'
                                : 'bg-[#FAF7F2] hover:bg-white border border-[#E2D7CB] text-[#5C4E42]'
                            }`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full inline-block border shrink-0 ${
                                isSelected ? 'ring-2 ring-[#48A63E] ring-offset-1' : 'border-black/20'
                              }`}
                              style={{ backgroundColor: swatch.hex }}
                            />
                            <span className="truncate">{swatch.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {(selectedColor === 'Custom Shade' || selectedColor === 'Other') && (
                      <div className="mt-2.5 p-3 bg-[#FAF8F5] border border-[#E2D7CB] rounded-xl flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customPickerHex}
                            onChange={(e) => setCustomPickerHex(e.target.value)}
                            className="w-7 h-7 rounded border border-[#E2D7CB] cursor-pointer bg-transparent p-0.5"
                          />
                          <span className="font-mono text-[11px] font-bold text-[#2C241D] bg-white px-2 py-0.5 rounded border border-[#E2D7CB]">
                            {customPickerHex.toUpperCase()}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Sage Green, Vintage Mustard..."
                          value={customColorInput}
                          onChange={(e) => setCustomColorInput(e.target.value)}
                          className="flex-1 min-w-[140px] px-3 py-1 bg-white border border-[#E2D7CB] rounded-lg font-bold text-xs focus:outline-none focus:border-[#48A63E] text-[#2C241D]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Category-Specific Aspects */}
                  {selectedCategory.aspects.map((asp) => (
                    <div key={asp.key}>
                      <label className="block text-xs font-black text-[#5C4E42] uppercase tracking-wider mb-2">
                        {asp.label}
                      </label>
                      <div className={`grid grid-cols-2 ${studioMaximized ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2`}>
                        {asp.options.map((opt) => {
                          const isSelected = aspectSelections[asp.key] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleAspectChange(asp.key, opt)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer truncate flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#48A63E] text-white shadow-xs font-extrabold'
                                  : 'bg-[#FAF7F2] hover:bg-white border border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814]'
                              }`}
                            >
                              <span className="truncate">{opt}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ==================================================== */}
              {/* STEP 3: DIMENSIONS & SPECIAL REQUIREMENTS            */}
              {/* ==================================================== */}
              {modalStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Dimensions Entry & Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-[#5C4E42] uppercase tracking-wider flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-[#48A63E]" />
                        <span>Exact Custom Dimensions (in Centimeters)</span>
                      </label>
                      <span className="text-[10px] text-[#7A6C5E] font-medium hidden sm:inline">
                        {selectedCategory.dimDefaults.guideline}
                      </span>
                    </div>

                    {/* Quick Dimension Presets */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[#7A6C5E]">Quick Sizes:</span>
                      {selectedCategory.dimDefaults.presets.map((pre) => (
                        <button
                          key={pre.label}
                          type="button"
                          onClick={() => {
                            setLengthCm(pre.l);
                            setWidthCm(pre.w);
                            setHeightCm(pre.h);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            lengthCm === pre.l && widthCm === pre.w && heightCm === pre.h
                              ? 'bg-[#48A63E]/10 border-[#48A63E] text-[#48A63E]'
                              : 'bg-[#FAF7F2] hover:bg-white border-[#E2D7CB] text-[#5C4E42]'
                          }`}
                        >
                          {pre.label} ({pre.l}×{pre.w}×{pre.h} cm)
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                        <label className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-0.5">Length</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={lengthCm}
                            onChange={(e) => setLengthCm(e.target.value)}
                            required
                            min="30"
                            max="600"
                            className="w-full pr-7 py-1 text-sm bg-transparent font-extrabold focus:outline-none text-[#2C241D]"
                          />
                          <span className="absolute right-0 top-1 text-xs font-bold text-[#7A6C5E]">cm</span>
                        </div>
                      </div>

                      <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                        <label className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-0.5">Width / Depth</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={widthCm}
                            onChange={(e) => setWidthCm(e.target.value)}
                            required
                            min="20"
                            max="400"
                            className="w-full pr-7 py-1 text-sm bg-transparent font-extrabold focus:outline-none text-[#2C241D]"
                          />
                          <span className="absolute right-0 top-1 text-xs font-bold text-[#7A6C5E]">cm</span>
                        </div>
                      </div>

                      <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB]">
                        <label className="block text-[10px] font-bold text-[#7A6C5E] uppercase mb-0.5">Height</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={heightCm}
                            onChange={(e) => setHeightCm(e.target.value)}
                            required
                            min="20"
                            max="300"
                            className="w-full pr-7 py-1 text-sm bg-transparent font-extrabold focus:outline-none text-[#2C241D]"
                          />
                          <span className="absolute right-0 top-1 text-xs font-bold text-[#7A6C5E]">cm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reference Design Images (Retained & Supported!) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-[#5C4E42] uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#48A63E]" />
                        <span>Reference Design Images (Optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setReferenceImageUrls((prev) => [...prev, ''])}
                        className="text-[11px] font-bold text-[#48A63E] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Image URL</span>
                      </button>
                    </div>

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('studio-file-input')?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-[#48A63E] bg-[#48A63E]/5'
                          : 'border-[#E2D7CB] hover:border-[#48A63E]/60 bg-[#FAF7F2]'
                      }`}
                    >
                      <input
                        id="studio-file-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-3">
                        <UploadCloud className="w-5 h-5 text-[#48A63E]" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-[#2C241D]">
                            Drop photos here, or <span className="text-[#48A63E] underline">browse files</span>
                          </p>
                          <p className="text-[10px] text-[#7A6C5E]">Supports PNG, JPG, JPEG, WEBP</p>
                        </div>
                      </div>
                    </div>

                    {referenceImageUrls.filter((u) => u.trim() !== '').length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {referenceImageUrls.map((url, idx) => {
                          if (!url.trim()) return null;
                          return (
                            <div key={idx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-[#E2D7CB] bg-white">
                              <img src={url} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReferenceImageUrls((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Special Customization Notes */}
                  <div>
                    <label className="block text-xs font-black text-[#5C4E42] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <MessageSquareText className="w-3.5 h-3.5 text-[#48A63E]" />
                      <span>Additional Customization Notes & Requirements</span>
                    </label>
                    <textarea
                      rows={2}
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="e.g. Stain-resistant coating, custom leg carvings, exact clearance heights..."
                      className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-[#2C241D] font-medium focus:outline-none focus:border-[#48A63E]"
                    />
                  </div>

                  {/* Live Build Summary Chip with Category Photo */}
                  <div className="bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedCategory.heroImage}
                        alt={selectedCategory.name}
                        className="w-12 h-12 rounded-lg object-cover border border-[#E2D7CB] shrink-0"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6C5E] block">
                          Current Blueprint:
                        </span>
                        <p className="text-xs font-bold text-[#1C1814] truncate">
                          {furnitureType} • {material}
                        </p>
                        <p className="text-[11px] text-[#5C4E42] font-medium">
                          {fabricOrFinish} • {lengthCm}×{widthCm}×{heightCm} cm
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-[10px] font-bold text-[#7A6C5E] block">Estimated Range</span>
                      <span className="text-xs font-mono font-black text-[#48A63E]">
                        {selectedCategory.id === 'sofas' ? '₹45,000 – ₹1,20,000' :
                         selectedCategory.id === 'dining' ? '₹35,000 – ₹95,000' :
                         selectedCategory.id === 'beds' ? '₹40,000 – ₹1,10,000' :
                         selectedCategory.id === 'storage' ? '₹25,000 – ₹75,000' : '₹20,000 – ₹60,000'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Footer Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#EFE7DE]">
                {modalStep > 1 ? (
                  <button
                    key="wizard-back-btn"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setModalStep((modalStep - 1) as 1 | 2 | 3);
                    }}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {modalStep < 3 ? (
                  <button
                    key={`wizard-next-step-${modalStep}`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setModalStep((modalStep + 1) as 1 | 2 | 3);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next: {modalStep === 1 ? 'Materials & Finish' : 'Dimensions & Review'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    key="wizard-final-submit-btn"
                    type="button"
                    disabled={submittingOrder}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCreateOrUpdateCustomOrder(e);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold shadow-md shadow-[#48A63E]/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingOrder ? 'Submitting...' : editingOrderId ? 'Update Specifications' : 'Submit Custom Request'}</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* ================================================== */}
        {/* RIGHT COLUMN: PREVIOUS CUSTOM REQUESTS CARD        */}
        {/* ================================================== */}
        <div
          id="previous-requests-panel"
          className={`${
            studioMaximized
              ? 'hidden'
              : requestsMaximized
              ? 'lg:col-span-12 block'
              : studioMinimized || requestsMinimized
              ? `lg:col-span-12 ${mobileActiveView === 'create' ? 'hidden lg:block' : 'block'}`
              : `lg:col-span-5 ${mobileActiveView === 'create' ? 'hidden lg:block' : 'block'}`
          } bg-[#FAF7F2] rounded-2xl border border-[#D6C9B9] p-4 sm:p-5 shadow-2xs space-y-3.5 sticky top-20 transition-all duration-300`}
        >
          {/* Header Row with Window Controls */}
          <div className="flex items-center justify-between border-b border-[#D6C9B9]/70 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#48A63E]/10 border border-[#48A63E]/20 flex items-center justify-center text-[#48A63E]">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-extrabold text-[#2C241D] uppercase tracking-wider">
                My Custom Requests
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold bg-[#B89768] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                {userOrders.length} {userOrders.length === 1 ? 'Request' : 'Requests'}
              </span>

              {/* Window Controls: Minimise & Maximise Provision */}
              <div className="flex items-center gap-1 bg-white/90 p-1 rounded-xl border border-[#D6C9B9]">
                <button
                  type="button"
                  onClick={() => {
                    setRequestsMinimized((prev) => !prev);
                    if (requestsMaximized) setRequestsMaximized(false);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                    requestsMinimized
                      ? 'bg-[#48A63E] text-white shadow-2xs'
                      : 'hover:bg-[#FAF8F5] text-[#5C4E42] hover:text-[#1C1814]'
                  }`}
                  title={requestsMinimized ? 'Expand Requests Card' : 'Minimise Requests Card'}
                  aria-label={requestsMinimized ? 'Expand Requests Card' : 'Minimise Requests Card'}
                >
                  {requestsMinimized ? <Plus className="w-3.5 h-3.5 text-white" /> : <Minus className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline text-[10px]">{requestsMinimized ? 'Expand' : 'Minimise'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (requestsMinimized) setRequestsMinimized(false);
                    setRequestsMaximized((prev) => !prev);
                    setStudioMaximized(false);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold ${
                    requestsMaximized
                      ? 'bg-[#48A63E] text-white shadow-2xs'
                      : 'hover:bg-[#FAF8F5] text-[#5C4E42] hover:text-[#1C1814]'
                  }`}
                  title={requestsMaximized ? 'Restore Normal Side-by-Side View' : 'Maximise Requests (Full Width)'}
                  aria-label={requestsMaximized ? 'Restore Normal Side-by-Side View' : 'Maximise Requests (Full Width)'}
                >
                  {requestsMaximized ? <Minimize2 className="w-3.5 h-3.5 text-white" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline text-[10px]">{requestsMaximized ? 'Restore' : 'Maximise'}</span>
                </button>
              </div>
            </div>
          </div>

          {requestsMinimized ? (
            <div className="p-3.5 bg-white rounded-xl border border-[#D6C9B9] flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#48A63E]/10 flex items-center justify-center text-[#48A63E]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1C1814]">
                    My Custom Requests Panel is Minimised
                  </h4>
                  <p className="text-[11px] text-[#7A6C5E]">
                    {userOrders.length} {userOrders.length === 1 ? 'request' : 'requests'} logged. Click Expand to view orders & tracking.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequestsMinimized(false)}
                className="px-3 py-1.5 rounded-lg bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Expand Requests</span>
              </button>
            </div>
          ) : (
            <>
              {/* Quick Search & Status Filter if requests exist */}
              {userOrders.length > 1 && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A6C5E]" />
                    <input
                      type="text"
                      placeholder="Find by request ID, model, material..."
                      value={ordersSearchQuery}
                      onChange={(e) => setOrdersSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#D6C9B9] rounded-xl text-[11px] font-bold text-[#2C241D] focus:outline-none focus:border-[#48A63E]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px] font-bold flex-1">
                      {['All', 'Pending', 'Quoted', 'Approved', 'In Production'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                            statusFilter === st
                              ? 'bg-[#48A63E] text-white font-extrabold'
                              : 'bg-white border border-[#D6C9B9] text-[#5C4E42] hover:bg-[#FAF8F5]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    {filteredOrders.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllOrdersMinimized}
                        className="px-2 py-0.5 rounded-md bg-white hover:bg-[#FAF8F5] border border-[#D6C9B9] text-[10px] font-extrabold text-[#5C4E42] flex items-center gap-1 cursor-pointer transition-all shrink-0"
                        title={filteredOrders.every((o) => minimizedOrderIds[o.custom_order_id]) ? 'Expand all request cards' : 'Minimise all request cards'}
                      >
                        {filteredOrders.every((o) => minimizedOrderIds[o.custom_order_id]) ? (
                          <>
                            <Plus className="w-3 h-3 text-[#48A63E]" />
                            <span>Expand All</span>
                          </>
                        ) : (
                          <>
                            <Minus className="w-3 h-3 text-[#7A6C5E]" />
                            <span>Minimise All</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Requests Scrollable List Container */}
              <div
                className={`max-h-[calc(100vh-250px)] min-h-[460px] overflow-y-auto pr-1 ${
                  requestsMaximized ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5' : 'space-y-3'
                }`}
              >
                {loading ? (
                  <div className="py-16 text-center space-y-2 col-span-full">
                    <Clock className="w-6 h-6 animate-spin text-[#48A63E] mx-auto" />
                    <p className="text-xs font-bold text-[#7A6C5E]">Loading your custom requests...</p>
                  </div>
                ) : userOrders.length === 0 ? (
                  <div className="p-6 text-center space-y-3 bg-white rounded-xl border border-dashed border-[#D6C9B9] my-6 col-span-full">
                    <div className="w-12 h-12 rounded-full bg-[#48A63E]/10 border border-[#48A63E]/20 text-[#48A63E] mx-auto flex items-center justify-center">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#2C241D] uppercase tracking-wider">No Custom Requests Yet</h4>
                      <p className="text-[11px] text-[#7A6C5E] max-w-xs mx-auto mt-1 font-medium">
                        Configure your piece in the studio on the left to submit your first bespoke custom furniture request!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setModalStep(1);
                        setMobileActiveView('create');
                        if (studioMinimized) setStudioMinimized(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start Crafting Piece</span>
                    </button>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#7A6C5E] font-medium bg-white rounded-xl border border-[#D6C9B9] col-span-full">
                    No custom requests match your filter criteria.
                  </div>
                ) : (
                  filteredOrders.map((ord) => {
                    const isEditable = ord.order_status === 'Pending' || ord.order_status === 'Pending Approval';
                    const isExpanded = expandedTrackingId === ord.custom_order_id;
                    const isCardMin = !!minimizedOrderIds[ord.custom_order_id];
                    const timeline = orderTrackingMap[ord.custom_order_id];
                    const { aspectPills, specialNotes } = parseOrderDescription(ord.design_description);

                    // Find corresponding photo for request preview (reference image or category hero image)
                    const refImgs = ord.reference_image ? parseReferenceImages(ord.reference_image) : [];
                    const catMatch = CATEGORY_SPECS.find((c) =>
                      c.types.some((t) => t.name.toLowerCase() === (ord.furniture_type || '').toLowerCase())
                    ) || CATEGORY_SPECS.find((c) => (ord.furniture_type || '').toLowerCase().includes(c.id));
                    const displayThumbnail = refImgs[0] || catMatch?.heroImage;

                    return (
                      <div
                        key={ord.custom_order_id}
                        className="bg-white rounded-xl p-3.5 border border-[#E2D7CB] shadow-2xs space-y-3 transition-all hover:border-[#48A63E]/50"
                      >
                        {/* Card Header: ID, Date, and Status Badge + Individual Card Window Controls */}
                        <div className="flex items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-extrabold text-[#2C241D] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#D6C9B9]">
                              Order #{ord.custom_order_id}
                            </span>
                            <span className="text-[10px] text-[#7A6C5E] font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#B89768]" />
                              <span>{formatOrderDate(ord.order_date || ord.created_at)}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadgeColor(ord.order_status)}`}>
                              {formatStatusLabel(ord.order_status)}
                            </span>

                            {/* Card Provision: Minimise & Maximise this individual request card */}
                            <div className="flex items-center bg-[#FAF7F2] rounded-lg border border-[#E2D7CB] p-0.5">
                              <button
                                type="button"
                                onClick={() => toggleOrderCardMinimized(ord.custom_order_id)}
                                className="p-1 rounded text-[#5C4E42] hover:text-[#1C1814] hover:bg-white transition-all cursor-pointer"
                                title={isCardMin ? 'Expand Card Details' : 'Minimise Card'}
                              >
                                {isCardMin ? <Plus className="w-3 h-3 text-[#48A63E]" /> : <Minus className="w-3 h-3" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setMaximizedOrderModal(ord)}
                                className="p-1 rounded text-[#5C4E42] hover:text-[#48A63E] hover:bg-white transition-all cursor-pointer"
                                title="Maximise Card (Full Blueprint & Details)"
                              >
                                <Maximize2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Card Body: Collapsed view or Full details view */}
                        {isCardMin ? (
                          <div className="flex items-center justify-between pt-1 animate-fadeIn">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {displayThumbnail && (
                                <img
                                  src={displayThumbnail}
                                  alt={ord.furniture_type}
                                  onClick={() => openImageInNewTab(displayThumbnail)}
                                  className="w-8 h-8 rounded-lg object-cover border border-[#E2D7CB] shrink-0 cursor-pointer hover:opacity-80"
                                  title="Click to view full photo"
                                />
                              )}
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-[#1C1814] truncate">
                                  {ord.furniture_type}
                                </h4>
                                <span className="text-[10px] text-[#7A6C5E] font-medium truncate block">
                                  {ord.material} • {ord.dimensions || 'Bespoke Size'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-mono font-black text-[#48A63E]">
                                {ord.estimated_price && ord.estimated_price > 0
                                  ? `₹${ord.estimated_price.toLocaleString('en-IN')}`
                                  : 'Assessment In Progress'}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleOrderCardMinimized(ord.custom_order_id)}
                                className="px-2 py-0.5 rounded-md bg-[#FAF7F2] hover:bg-[#F3EDE3] border border-[#D6C9B9] text-[10px] font-bold text-[#48A63E] cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <span>Expand</span>
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Model Title, Photo Thumbnail & Specs Summary */}
                            <div className="flex items-start gap-3">
                              {displayThumbnail && (
                                <img
                                  src={displayThumbnail}
                                  alt={ord.furniture_type}
                                  onClick={() => openImageInNewTab(displayThumbnail)}
                                  className="w-12 h-12 rounded-lg object-cover border border-[#E2D7CB] shrink-0 cursor-pointer hover:opacity-85 shadow-2xs mt-0.5"
                                  title="Click to view photo"
                                />
                              )}

                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-black text-[#1C1814] truncate">
                                  {ord.furniture_type}
                                </h4>

                                {/* Specification Badges */}
                                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                  <span className="text-[10px] font-bold text-[#5C4E42] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E2D7CB]">
                                    🪵 {ord.material}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#5C4E42] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E2D7CB]">
                                    🎨 {ord.color}
                                  </span>
                                  {ord.dimensions && (
                                    <span className="text-[10px] font-mono font-bold text-[#5C4E42] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E2D7CB]">
                                      📏 {ord.dimensions}
                                    </span>
                                  )}
                                  {aspectPills.slice(0, 2).map((asp, idx) => (
                                    <span key={idx} className="text-[10px] font-semibold text-[#7A6C5E] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#EFE7DE]">
                                      {asp.label}: {asp.value}
                                    </span>
                                  ))}
                                </div>

                                {specialNotes && specialNotes !== 'None' && (
                                  <p className="text-[10px] text-[#6E6458] font-medium mt-1.5 line-clamp-1 italic">
                                    "{specialNotes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Quotation & Actions Block */}
                            <div className="bg-[#FAF8F5] border border-[#E2D7CB] rounded-xl p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-[9px] font-bold text-[#7A6C5E] uppercase block">
                                  Quotation Amount
                                </span>
                                <span className="text-sm font-black font-mono text-[#48A63E]">
                                  {ord.estimated_price && ord.estimated_price > 0
                                    ? `₹${ord.estimated_price.toLocaleString('en-IN')}`
                                    : 'Assessment In Progress'}
                                </span>
                              </div>

                              {/* Context-Aware Action Buttons */}
                              <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
                                {/* Quote Decision: Approve / Reject */}
                                {(ord.order_status === 'Quote Provided' || ord.order_status === 'QUOTATION_READY') && (
                                  <>
                                    <button
                                      onClick={() => handleApproveQuote(ord.custom_order_id)}
                                      className="px-2.5 py-1 rounded-lg bg-[#48A63E] hover:bg-[#3D9134] text-white text-[11px] font-black shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectQuote(ord.custom_order_id)}
                                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {/* Customer Approved -> Add to Cart & Pay */}
                                {(ord.order_status === 'CUSTOMER_APPROVED' || ord.order_status === 'Approved') &&
                                  ord.payment_status !== 'Paid' && (
                                    <button
                                      onClick={() => handleAddToCartAndPay(ord)}
                                      className="px-3 py-1 rounded-lg bg-[#48A63E] hover:bg-[#3D9134] text-white text-[11px] font-black shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                                    >
                                      <ShoppingCart className="w-3 h-3" />
                                      <span>Add to Cart & Pay</span>
                                    </button>
                                  )}

                                {/* Paid / In Production -> Download Official Receipt */}
                                {(ord.payment_status === 'Paid' ||
                                  ord.order_status === 'Paid' ||
                                  ord.order_status === 'In Production' ||
                                  ord.order_status === 'Completed') && (
                                  <button
                                    onClick={() => downloadPaymentReceipt(ord)}
                                    className="px-2.5 py-1 rounded-lg bg-[#48A63E] hover:bg-[#3D9134] text-white text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
                                    title="Download official paid receipt"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Receipt</span>
                                  </button>
                                )}

                                {/* Pending Order: Edit Specs or Cancel */}
                                {isEditable && (
                                  <>
                                    <button
                                      onClick={() => handleStartEditOrder(ord)}
                                      className="px-2 py-1 rounded-lg bg-white hover:bg-[#FAF7F2] border border-[#D6C9B9] text-[#2C241D] text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                      title="Edit specifications before production approval"
                                    >
                                      <Edit3 className="w-3 h-3 text-[#48A63E]" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => setCancelModalOrderId(ord.custom_order_id)}
                                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer"
                                      title="Cancel custom request"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Live Craftsmanship & QC Progress Status */}
                            {ord.order_status !== 'Cancelled' && ord.order_status !== 'Pending' && (
                              <div className="pt-1.5 space-y-1.5">
                                <div className="flex items-center justify-between text-[10.5px]">
                                  <span className="font-extrabold text-[#2C241D] flex items-center gap-1.5 truncate">
                                    <Sparkles className="w-3 h-3 text-[#48A63E] shrink-0" />
                                    <span className="truncate">
                                      {ord.order_status === 'Completed'
                                        ? 'Completed (QC Passed)'
                                        : ord.order_status === 'QC_PENDING' || (ord as any).qc_status === 'QC_PENDING'
                                        ? 'Quality Inspection Pending'
                                        : ord.current_stage || 'In Production'}
                                    </span>
                                  </span>
                                  <span className="font-mono font-black text-[#48A63E] shrink-0">
                                    {ord.order_status === 'Completed'
                                      ? 100
                                      : ord.order_status === 'QC_PENDING' || (ord as any).qc_status === 'QC_PENDING'
                                      ? 90
                                      : ord.progress_percentage || 40}%
                                  </span>
                                </div>
                                <div className="w-full bg-[#E2D7CB] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                      ord.order_status === 'Completed'
                                        ? 'bg-[#48A63E]'
                                        : ord.order_status === 'QC_PENDING' || (ord as any).qc_status === 'QC_PENDING'
                                        ? 'bg-amber-500 animate-pulse'
                                        : 'bg-gradient-to-r from-blue-500 to-[#48A63E]'
                                    }`}
                                    style={{
                                      width: `${
                                        ord.order_status === 'Completed'
                                          ? 100
                                          : ord.order_status === 'QC_PENDING' || (ord as any).qc_status === 'QC_PENDING'
                                          ? 90
                                          : ord.progress_percentage || 40
                                      }%`
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Progress Tracking Toggle */}
                            <div className="pt-1 border-t border-[#EFE7DE]">
                              <button
                                onClick={() => toggleTracking(ord.custom_order_id)}
                                className="w-full flex items-center justify-between text-[11px] font-bold text-[#5C4E42] hover:text-[#48A63E] py-1 cursor-pointer transition-colors"
                              >
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-[#48A63E]" />
                                  <span>Track Craftsmanship & Workers</span>
                                </span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] space-y-3 animate-fadeIn">
                                  {/* 5 Stages Tracker */}
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7A6C5E] block">
                                      Production Stages:
                                    </span>
                                    {(() => {
                                      const isQcPending = ord.order_status === 'QC_PENDING' || (ord as any).qc_status === 'QC_PENDING';
                                      const isCompleted = ord.order_status === 'Completed' || (ord as any).qc_status === 'QC_PASSED';
                                      return (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-5 gap-1 text-center">
                                            {STAGES.map((stg, sIdx) => {
                                              let isDone = false;
                                              let isCurrent = false;

                                              if (isCompleted) {
                                                isDone = true;
                                              } else if (isQcPending) {
                                                isDone = sIdx < 3;
                                                isCurrent = sIdx === 3;
                                              } else {
                                                const currentIdx = STAGES.findIndex(
                                                  (s) => s.toLowerCase() === (ord.current_stage || '').toLowerCase()
                                                );
                                                isDone = currentIdx > sIdx;
                                                isCurrent = currentIdx === sIdx;
                                              }

                                              return (
                                                <div key={stg} className="space-y-1">
                                                  <div
                                                    className={`h-1.5 rounded-full ${
                                                      isDone
                                                        ? 'bg-[#48A63E]'
                                                        : isCurrent
                                                        ? 'bg-[#48A63E] animate-pulse'
                                                        : 'bg-[#D6C9B9]'
                                                    }`}
                                                  />
                                                  <span
                                                    className={`text-[8px] font-bold block leading-tight line-clamp-1 ${
                                                      isDone || isCurrent ? 'text-[#1C1814]' : 'text-[#A69B8D]'
                                                    }`}
                                                  >
                                                    {stg}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>

                                          {isQcPending && (
                                            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[10px] text-amber-900 font-bold flex items-center gap-1.5">
                                              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 animate-pulse" />
                                              <span>Artisan workshop production complete. Awaiting official Quality Gate audit before dispatch.</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Latest Remarks from Workshop */}
                                  {ord.latest_remarks && (
                                    <div className="p-2 bg-white rounded-lg border border-[#E2D7CB] text-[10px] text-[#2C241D]">
                                      <strong className="text-[#48A63E] font-bold block">Workshop Update:</strong>
                                      <span>{ord.latest_remarks}</span>
                                    </div>
                                  )}

                                  {/* Assigned Workers */}
                                  {timeline && timeline.assigned_workers && timeline.assigned_workers.length > 0 && (
                                    <div className="space-y-1 pt-1 border-t border-[#EFE7DE]">
                                      <span className="text-[10px] font-bold text-[#7A6C5E] block flex items-center gap-1">
                                        <Users className="w-3 h-3 text-[#48A63E]" />
                                        <span>Assigned Craftsmen:</span>
                                      </span>
                                      <div className="space-y-1">
                                        {timeline.assigned_workers.map((w, wIdx) => (
                                          <div key={wIdx} className="flex items-center justify-between text-[10px] bg-white p-1.5 rounded border border-[#E2D7CB]">
                                            <span className="font-bold text-[#2C241D]">{w.worker_name}</span>
                                            <span className="text-[#48A63E] font-semibold">{w.task_status}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 3. CANCEL ORDER CONFIRMATION MODAL                   */}
      {/* ==================================================== */}
      {cancelModalOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white border border-[#E2D7CB] rounded-2xl p-5 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-[#2C241D]">Cancel Custom Request?</h3>
              <p className="text-xs text-[#7A6C5E] leading-relaxed">
                Are you sure you want to cancel request <strong>#{cancelModalOrderId}</strong>? This action updates the request status to Cancelled.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setCancelModalOrderId(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#E2D7CB] text-[#524538] font-bold text-xs transition-all cursor-pointer"
              >
                Keep Request
              </button>
              <button
                onClick={async () => {
                  const targetId = cancelModalOrderId;
                  setCancelModalOrderId(null);
                  if (targetId) {
                    setUserOrders((prev) =>
                      prev.map((o) =>
                        o.custom_order_id === targetId ? { ...o, order_status: 'Cancelled' } : o
                      )
                    );
                    await cancelCustomOrder(targetId);
                    window.dispatchEvent(new Event('custom-orders-updated'));
                    loadUserCustomOrders();
                  }
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ==================================================== */}
      {/* 4. MAXIMISED ORDER DETAILS & BLUEPRINT MODAL         */}
      {/* ==================================================== */}
      {maximizedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-[#E2D7CB] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-[#2C241D] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#48A63E]/10 border border-[#48A63E]/20 flex items-center justify-center text-[#48A63E]">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#1C1814]">
                      Order #{maximizedOrderModal.custom_order_id} Blueprint
                    </h3>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getStatusBadgeColor(maximizedOrderModal.order_status)}`}>
                      {formatStatusLabel(maximizedOrderModal.order_status)}
                    </span>
                  </div>
                  <p className="text-xs text-[#7A6C5E] font-medium">
                    Logged on {formatOrderDate(maximizedOrderModal.order_date || maximizedOrderModal.created_at)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMaximizedOrderModal(null)}
                className="p-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F3EDE3] border border-[#D6C9B9] text-[#5C4E42] hover:text-[#1C1814] transition-all cursor-pointer"
                title="Close modal (Restore)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Large Thumbnail & Blueprint Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(() => {
                const refImgs = maximizedOrderModal.reference_image ? parseReferenceImages(maximizedOrderModal.reference_image) : [];
                const catMatch = CATEGORY_SPECS.find((c) =>
                  c.types.some((t) => t.name.toLowerCase() === (maximizedOrderModal.furniture_type || '').toLowerCase())
                ) || CATEGORY_SPECS.find((c) => (maximizedOrderModal.furniture_type || '').toLowerCase().includes(c.id));
                const mainPhoto = refImgs[0] || catMatch?.heroImage;

                return (
                  <>
                    <div className="sm:col-span-1 space-y-2">
                      {mainPhoto && (
                        <div className="relative rounded-xl overflow-hidden border border-[#E2D7CB] bg-[#FAF8F5]">
                          <img
                            src={mainPhoto}
                            alt={maximizedOrderModal.furniture_type}
                            className="w-full h-44 object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => openImageInNewTab(mainPhoto)}
                          />
                          <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                            Click to expand
                          </span>
                        </div>
                      )}
                      <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E2D7CB] text-center">
                        <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Quotation Total</span>
                        <span className="text-base font-black font-mono text-[#48A63E]">
                          {maximizedOrderModal.estimated_price && maximizedOrderModal.estimated_price > 0
                            ? `₹${maximizedOrderModal.estimated_price.toLocaleString('en-IN')}`
                            : 'Assessment In Progress'}
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-3">
                      <div>
                        <h4 className="text-base font-black text-[#1C1814]">
                          {maximizedOrderModal.furniture_type}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="p-2 bg-[#FAF7F2] rounded-lg border border-[#E2D7CB]">
                            <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Core Timber</span>
                            <span className="text-xs font-bold text-[#2C241D]">{maximizedOrderModal.material || 'Standard Wood'}</span>
                          </div>
                          <div className="p-2 bg-[#FAF7F2] rounded-lg border border-[#E2D7CB]">
                            <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Finish / Shade</span>
                            <span className="text-xs font-bold text-[#2C241D]">{maximizedOrderModal.color || 'Standard Finish'}</span>
                          </div>
                          <div className="p-2 bg-[#FAF7F2] rounded-lg border border-[#E2D7CB] col-span-2">
                            <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Custom Dimensions</span>
                            <span className="text-xs font-mono font-bold text-[#2C241D]">{maximizedOrderModal.dimensions || 'Bespoke measurements'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Aspects & Notes */}
                      {(() => {
                        const { aspectPills, specialNotes } = parseOrderDescription(maximizedOrderModal.design_description);
                        return (
                          <div className="space-y-2">
                            {aspectPills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {aspectPills.map((asp, idx) => (
                                  <span key={idx} className="text-[10px] font-bold text-[#5C4E42] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#EFE7DE]">
                                    {asp.label}: {asp.value}
                                  </span>
                                ))}
                              </div>
                            )}
                            {specialNotes && specialNotes !== 'None' && (
                              <div className="p-2 bg-[#FAF8F5] rounded-lg border border-[#E2D7CB]">
                                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Special Artisan Notes</span>
                                <p className="text-xs text-[#5C4E42] italic mt-0.5">"{specialNotes}"</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFE7DE]">
              <button
                type="button"
                onClick={() => setMaximizedOrderModal(null)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#E2D7CB] text-[#524538] font-bold text-xs transition-all cursor-pointer"
              >
                Close Full View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
