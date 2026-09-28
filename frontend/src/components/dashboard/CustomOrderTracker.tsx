import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Clock, CheckCircle2, Users, Sliders, ChevronRight, PackageCheck, AlertCircle, Plus, X, Send, Palette, Ruler, ArrowRight, ArrowLeft, Layers, MessageSquareText, Edit3, Lock, Image, Trash2, FileText, Download, ShoppingCart, UploadCloud } from 'lucide-react';
import { fetchOrderTrackingTimeline, OrderTrackingInfo, fetchCustomOrders, CustomOrderData, submitCustomOrderRequest, cancelCustomOrder, downloadPaymentReceipt, updateOrderStatus, customerRespondQuotation } from '../../services/api_production';
import { addToCart, setDirectCheckoutItem } from '../../utils/cartStorage';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';
import { formatStatusLabel, getStatusBadgeColor } from '../../utils/statusUtils';

// Category Definitions & Aspect Specs
interface ItemTypeSpec {
  name: string;
  desc: string;
  img: string;
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
}

const CATEGORY_SPECS: CategorySpec[] = [
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
        desc: 'Custom 3-Seater Sofa - Depth/Width Options available',
        img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'L-Shape Sectional',
        desc: 'Modular corner layout with optional chaise lounger',
        img: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Lounge Armchair',
        desc: 'Lounge Armchair - Depth/Width Options available',
        img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Modular Sofa',
        desc: 'Flexible interlocking seating blocks with plush cushions',
        img: 'https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Recliner Chair',
        desc: 'Recliner Chair - Ergonomic lumbar and reclining options',
        img: 'https://images.unsplash.com/photo-1580481072645-022f9a6d8310?auto=format&fit=crop&w=300&q=80',
      },
    ],
    materials: ['Premium Teak Wood', 'Sheesham Rosewood', 'Dark Walnut', 'Natural Oak', 'Brushed Stainless Steel'],
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
        desc: 'Solid wood or marble tabletop with custom leg geometry',
        img: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Complete Dining Set with Chairs',
        desc: 'Matching table and upholstered handcrafted dining chairs',
        img: 'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Dining Bench',
        desc: 'Live-edge timber bench for casual seating',
        img: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Kitchen Counter Island',
        desc: 'Multi-functional prep counter with integrated bar seating',
        img: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=300&q=80',
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
        desc: 'Low-profile minimalist solid wood platform',
        img: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Canopy Four-Poster Bed',
        desc: 'Architectural wooden canopy frame with draped linen option',
        img: 'https://images.unsplash.com/photo-1540518614846-7ede433c5173?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Hydraulic Storage Bed',
        desc: 'Gas-lift underbed compartment for ample linen storage',
        img: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Daybed',
        desc: 'Versatile lounger bed frame for guest rooms & lounges',
        img: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=300&q=80',
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
        desc: 'Low-slung console with acoustic fluted doors & cable routing',
        img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Sideboard Credenza',
        desc: 'Dining room credenza with drawers & brass handles',
        img: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Bookcase Display Cabinet',
        desc: 'Tall shelving unit with warm LED backlighting',
        img: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Full Modular Wardrobe',
        desc: 'Custom closet system with internal organizer drawers',
        img: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=300&q=80',
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
        desc: 'Spacious L-shaped timber workstation with modesty panel',
        img: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Standing Electric Lift Desk',
        desc: 'Height-adjustable solid wood desk with digital presets',
        img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Writing Desk',
        desc: 'Compact desk with slim stationery drawers',
        img: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=300&q=80',
      },
      {
        name: 'Floating Wall Desk',
        desc: 'Space-saving wall-mounted timber desk',
        img: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=300&q=80',
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
  },
];
const DEFAULT_SAMPLE_ORDER: CustomOrderData = {
  custom_order_id: 101,
  customer_id: 1,
  customer_name: 'Valued Customer',
  customer_email: 'customer@example.com',
  customer_phone: '+91 9778237180',
  furniture_type: 'Custom 3–Seater Sofa',
  material: 'Premium Teak Wood',
  dimensions: '220cm L x 95cm W x 85cm H',
  color: 'Terracotta Microfiber (Cream White)',
  estimated_price: 45000,
  payment_status: 'Paid',
  order_status: 'Paid',
  current_stage: 'Material Sourcing',
  progress_percentage: 10,
  latest_remarks: 'Raw teak wood planks selected & inspected for moisture content.',
  order_date: '2026-08-15',
  assigned_workers: []
};

interface CustomOrderTrackerProps {
  openModalTrigger?: number;
}

export const CustomOrderTracker: React.FC<CustomOrderTrackerProps> = ({ openModalTrigger }) => {
  const navigate = useNavigate();
  const [userOrders, setUserOrders] = useState<CustomOrderData[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<OrderTrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<number | null>(null);

  const handleAddToCartAndPay = (order: CustomOrderData) => {
    if (!order.estimated_price) return;
    setDirectCheckoutItem({
      id: `custom-order-${order.custom_order_id}`,
      name: `Custom ${order.furniture_type} (Order #${order.custom_order_id})`,
      material: `Material: ${order.material} | Shade: ${order.color}`,
      price: order.estimated_price,
      imageUrl: order.reference_image ? parseReferenceImages(order.reference_image)[0] || undefined : undefined
    });
    navigate('/cart?direct=true');
  };

  // New & Edit Customization Order Inline Form State
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    if (openModalTrigger && openModalTrigger > 0) {
      setEditingOrderId(null);
      setIsFormOpen(true);
      setModalStep(1);
      setTimeout(() => {
        const el = document.getElementById('custom-order-form');
        if (el) {
          const yOffset = -90;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [openModalTrigger]);

  // Auto-scroll smoothly to top of customizer form whenever step changes
  useEffect(() => {
    if (isFormOpen) {
      const timer = setTimeout(() => {
        const el = document.getElementById('custom-order-form');
        if (el) {
          const yOffset = -90;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [modalStep, isFormOpen]);

  const handleStepChange = (nextStep: 1 | 2 | 3) => {
    setModalStep(nextStep);
    setTimeout(() => {
      const el = document.getElementById('custom-order-form');
      if (el) {
        const yOffset = -90;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleCloseAndRedirectToShop = () => {
    setIsFormOpen(false);
    setEditingOrderId(null);
    const event = new CustomEvent('change-customer-tab', { detail: 'shop' });
    window.dispatchEvent(event);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // Dimensions & Specific Requirements State
  const [lengthCm, setLengthCm] = useState('220');
  const [widthCm, setWidthCm] = useState('95');
  const [heightCm, setHeightCm] = useState('85');
  const [customNotes, setCustomNotes] = useState('');

  const loadUserCustomOrders = async () => {
    setLoading(true);
    try {
      const allOrders = await fetchCustomOrders();
      // Filter out cancelled requests so they are hidden from the Build Studio section (only displayed in My Orders)
      const activeBuildOrders = allOrders.filter(o => o.order_status !== 'Cancelled');
      activeBuildOrders.sort((a, b) => b.custom_order_id - a.custom_order_id);
      if (activeBuildOrders.length > 0) {
        setUserOrders(activeBuildOrders);
        if (!selectedOrderId || !activeBuildOrders.some(o => o.custom_order_id === selectedOrderId)) {
          setSelectedOrderId(activeBuildOrders[0].custom_order_id);
        }
      } else {
        setUserOrders([]);
        setSelectedOrderId(null);
        setIsFormOpen(true);
      }
    } catch (err) {
      console.error('Error loading custom order tracking:', err);
      setUserOrders([]);
      setSelectedOrderId(null);
      setIsFormOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserCustomOrders();
  }, []);

  useEffect(() => {
    if (!selectedOrderId) return;
    const loadTracking = async () => {
      try {
        const info = await fetchOrderTrackingTimeline(selectedOrderId);
        setTrackingInfo(info);
      } catch (err) {
        console.error('Error fetching order tracking timeline:', err);
      }
    };
    loadTracking();
  }, [selectedOrderId]);

  // Handle Category Change
  const handleCategorySelect = (cat: CategorySpec) => {
    setSelectedCategory(cat);
    setFurnitureType(cat.types[0]?.name || '');
    setMaterial(cat.materials[0]);
    setFabricOrFinish(cat.fabricsOrFinishes[0]);
    const initialAspects: Record<string, string> = {};
    cat.aspects.forEach((asp) => {
      initialAspects[asp.key] = asp.options[0];
    });
    setAspectSelections(initialAspects);
  };

  const handleAspectChange = (key: string, val: string) => {
    setAspectSelections((prev) => ({ ...prev, [key]: val }));
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

  // Start Editing Specs for a Pending Order
  const handleStartEditOrder = (order: CustomOrderData) => {
    if (order.order_status !== 'Pending' && order.order_status !== 'Pending Approval') {
      return; // Editing disabled once approved!
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

    setIsFormOpen(true);
    setModalStep(1);

    setTimeout(() => {
      const el = document.getElementById('custom-order-form');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCreateOrUpdateCustomOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingOrder) return;

    setSubmittingOrder(true);
    try {
      const formattedDimensions = `${lengthCm}cm L × ${widthCm}cm W × ${heightCm}cm H`;
      const aspectSummary = Object.entries(aspectSelections)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');

      const finalMaterial = material === 'Other' ? (customMaterialInput.trim() || 'Custom Material') : material;
      let finalColor = selectedColor;
      if (selectedColor === 'Custom Color Picker' || selectedColor === 'Other') {
        const shadeName = customColorInput.trim() || 'Custom Shade';
        finalColor = `${shadeName} (${customPickerHex.toUpperCase()})`;
      }
      const combinedColorFinish = `${fabricOrFinish} (${finalColor})`;

      const fullNotes = `Aspects: [${aspectSummary}]. Special Requirements: ${customNotes || 'None'}`;

      const validRefImages = referenceImageUrls.map(u => u.trim()).filter(Boolean).join(', ');

      if (editingOrderId) {
        // Edit existing pending order
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
        setSelectedOrderId(editingOrderId);
      } else {
        // Create new custom order
        const created = await submitCustomOrderRequest(
          furnitureType,
          finalMaterial,
          formattedDimensions,
          combinedColorFinish,
          fullNotes,
          validRefImages || undefined
        );
        setUserOrders((prev) => [created, ...prev]);
        setSelectedOrderId(created.custom_order_id);
      }

      // Trigger backend contact email notification
      try {
        const storedUser = localStorage.getItem('user');
        const userObj = storedUser ? JSON.parse(storedUser) : null;
        const endpoint = `${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/contact`;

        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: userObj?.full_name || userObj?.username || 'Logged Customer',
            email: userObj?.email || 'kalyanys2004@gmail.com',
            subject: `${editingOrderId ? 'Updated' : 'New'} Custom Furniture Order Request: ${furnitureType}`,
            message: `Custom Build Specifications:\n- Category: ${selectedCategory.name}\n- Product Type: ${furnitureType}\n- Primary Material: ${material}\n- Upholstery / Finish: ${fabricOrFinish}\n- Dimensions: ${formattedDimensions}\n- Aspect Specs: ${aspectSummary}\n- Additional Requirements / Notes: ${customNotes || 'None'}`,
          }),
        });
      } catch (e) {
        console.warn("Contact email dispatch notice:", e);
      }

      setOrderSuccess(true);

      setTimeout(() => {
        setOrderSuccess(false);
        setIsFormOpen(false);
        setEditingOrderId(null);
        setModalStep(1);
        setCustomNotes('');
      }, 2000);
    } catch (err) {
      console.error('Error saving custom order:', err);
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="ultra-glass-card rounded-3xl p-8 text-center text-[#2C241D]">
        <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#38A132]" />
        <p className="text-xs font-bold text-[#2C241D]">Loading custom order live tracker...</p>
      </div>
    );
  }

  const activeOrder = userOrders.find(o => o.custom_order_id === selectedOrderId) || userOrders[0];

  const stages = [
    'Material Sourcing',
    'Cutting & Joinery',
    'Assembly & Upholstery',
    'Quality Control & Finishing',
    'Ready for Dispatch'
  ];

  const getStageIndex = (stageName: string) => {
    const idx = stages.findIndex(s => s.toLowerCase() === stageName.toLowerCase());
    return idx >= 0 ? idx : 0;
  };

  const currentStageIdx = activeOrder ? getStageIndex(activeOrder.current_stage || 'Material Sourcing') : 0;
  const { aspectPills, specialNotes } = activeOrder ? parseOrderDescription(activeOrder.design_description) : { aspectPills: [], specialNotes: '' };

  const isEditable = activeOrder && (activeOrder.order_status === 'Pending' || activeOrder.order_status === 'Pending Approval');

  return (
    <div className="space-y-8 text-[#2C241D]">
      {/* INLINE EXPANDABLE CUSTOMIZATION FORM (MODERN BESPOKE STUDIO DESIGN) */}
      {isFormOpen && (
        <div id="custom-order-form" className="relative bg-white/95 backdrop-blur-2xl border border-[#E2D7CB] rounded-[2.5rem] shadow-2xl overflow-hidden text-[#2C241D] animate-fadeIn scroll-mt-24">
          {/* Subtle Ambient Lighting Effects */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#38A132]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#B89768]/8 rounded-full blur-3xl pointer-events-none" />

          {orderSuccess ? (
            <div className="relative z-10 py-16 text-center space-y-4 bg-gradient-to-b from-white to-[#FAF8F5]">
              <div className="w-16 h-16 rounded-full bg-[#38A132]/10 border-2 border-[#38A132]/30 text-[#38A132] mx-auto flex items-center justify-center animate-bounce shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#1C1814]">
                {editingOrderId ? 'Specifications Updated Successfully!' : 'Custom Build Request Submitted!'}
              </h3>
              <p className="text-xs text-[#6E6458] max-w-sm mx-auto font-medium">
                Your bespoke configuration for <strong>{furnitureType}</strong> has been received by our master artisans.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateOrUpdateCustomOrder} className="relative z-10 flex flex-col lg:flex-row min-h-[640px]">
              {/* Left Main Studio Panel */}
              <div className="flex-1 p-6 sm:p-8 space-y-6 bg-gradient-to-br from-white via-[#FAF8F5] to-[#F5EFE6]/50">
                {/* Studio Header */}
                <div className="flex items-start justify-between border-b border-[#E2D7CB]/80 pb-5">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38A132]/10 border border-[#38A132]/20 text-[#38A132] text-[10px] font-black uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-[#38A132]" />
                      <span>Bespoke Studio Atelier</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1C1814] tracking-tight">
                      {editingOrderId ? `Edit Specifications for Order #${editingOrderId}` : 'Configure Your Custom Furniture'}
                    </h2>
                    <p className="text-xs text-[#7A6C5E] font-medium">
                      Step {modalStep} of 3 • {modalStep === 1 ? 'Select Category & Specific Item Type' : modalStep === 2 ? 'Select Timber, Color Palette & Specifications' : 'Define Exact Dimensions & Special Requirements'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {modalStep > 1 && (
                      <button
                        type="button"
                        onClick={() => handleStepChange((modalStep - 1) as any)}
                        className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E2D7CB] text-[#2C241D] text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>Back</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCloseAndRedirectToShop}
                      className="p-2 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E2D7CB] text-[#7A6C5E] hover:text-[#1C1814] transition-all cursor-pointer shadow-xs"
                      title="Close Studio"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3-Step Sleek Wizard Navigation */}
                <div className="grid grid-cols-3 gap-2 bg-[#F3EDE3]/70 p-1.5 rounded-2xl border border-[#E2D7CB]/80">
                  <button
                    type="button"
                    onClick={() => setModalStep(1)}
                    className={`py-2 px-3 text-center cursor-pointer transition-all rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                      modalStep === 1
                        ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                        : 'text-[#6E6458] hover:text-[#1C1814] hover:bg-white/60'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      modalStep === 1 ? 'bg-white/20 text-white font-black' : 'bg-black/5 text-[#7A6C5E]'
                    }`}>
                      1
                    </span>
                    <span className="truncate">Category & Style</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalStep(2)}
                    className={`py-2 px-3 text-center cursor-pointer transition-all rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                      modalStep === 2
                        ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                        : 'text-[#6E6458] hover:text-[#1C1814] hover:bg-white/60'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      modalStep === 2 ? 'bg-white/20 text-white font-black' : 'bg-black/5 text-[#7A6C5E]'
                    }`}>
                      2
                    </span>
                    <span className="truncate">Timber & Palette</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalStep(3)}
                    className={`py-2 px-3 text-center cursor-pointer transition-all rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                      modalStep === 3
                        ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                        : 'text-[#6E6458] hover:text-[#1C1814] hover:bg-white/60'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      modalStep === 3 ? 'bg-white/20 text-white font-black' : 'bg-black/5 text-[#7A6C5E]'
                    }`}>
                      3
                    </span>
                    <span className="truncate">Dimensions & Details</span>
                  </button>
                </div>

                {/* STEP 1: CATEGORY & PRODUCT SELECTION */}
                {modalStep === 1 && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Select Furniture Category */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-xs font-black text-[#5C4E42] uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#38A132]" />
                          <span>Select Furniture Category</span>
                        </h3>
                        <span className="text-[11px] font-semibold text-[#7A6C5E]">5 Categories</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {CATEGORY_SPECS.map((cat) => {
                          const isSelected = selectedCategory.id === cat.id;
                          return (
                            <div
                              key={cat.id}
                              onClick={() => handleCategorySelect(cat)}
                              className={`group relative p-2.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between overflow-hidden ${
                                isSelected
                                  ? 'bg-white border-2 border-[#38A132] ring-4 ring-[#38A132]/15 shadow-md scale-[1.02]'
                                  : 'bg-white/80 border-[#E2D7CB] hover:bg-white hover:border-[#38A132]/50 hover:shadow-sm'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#38A132] text-white flex items-center justify-center z-10 shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                              <div className="w-full h-20 rounded-xl overflow-hidden bg-[#F3EDE3] relative mb-2">
                                <img
                                  src={cat.heroImage || cat.duoImages?.[0]}
                                  alt={cat.name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                              </div>
                              <span className={`text-[11px] font-bold leading-snug text-center line-clamp-1 ${
                                isSelected ? 'text-[#38A132] font-extrabold' : 'text-[#1C1814]'
                              }`}>
                                {cat.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Select Specific Product / Item Type */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-xs font-black text-[#5C4E42] uppercase tracking-wider flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-[#38A132]" />
                          <span>Select Specific Product / Model</span>
                        </h3>
                        <span className="text-[11px] font-semibold text-[#7A6C5E]">{selectedCategory.types.length} Models available</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedCategory.types.map((typeObj) => {
                          const isSelected = furnitureType === typeObj.name;
                          return (
                            <div
                              key={typeObj.name}
                              onClick={() => setFurnitureType(typeObj.name)}
                              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3.5 ${
                                isSelected
                                  ? 'bg-gradient-to-r from-[#38A132]/8 via-[#38A132]/4 to-transparent border-2 border-[#38A132] shadow-sm ring-2 ring-[#38A132]/10'
                                  : 'bg-white/80 border-[#E2D7CB] hover:bg-white hover:border-[#38A132]/40 hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                                  isSelected ? 'border-[#38A132] bg-[#38A132] text-white' : 'border-[#C8BCAC] bg-white'
                                }`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-[#38A132] font-extrabold' : 'text-[#1C1814]'}`}>
                                    {typeObj.name}
                                  </h4>
                                  <p className="text-[11px] text-[#6E6458] font-medium truncate mt-0.5">
                                    {typeObj.desc}
                                  </p>
                                </div>
                              </div>
                              <img
                                src={typeObj.img}
                                alt={typeObj.name}
                                className="w-14 h-12 rounded-xl object-cover border border-[#E2D7CB] shrink-0 shadow-2xs"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: MATERIALS, FABRICS & CATEGORY ASPECTS */}
                {modalStep === 2 && (
                  <div className="space-y-5 animate-fadeIn">
                    {/* Primary Timber / Structural Material */}
                    <div>
                      <label className="block font-black text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <Sliders className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>Primary Timber & Structural Material</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[...selectedCategory.materials, 'Other'].map((mat) => {
                          const isSelected = material === mat;
                          return (
                            <button
                              key={mat}
                              type="button"
                              onClick={() => setMaterial(mat)}
                              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer truncate flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                                  : 'bg-white hover:bg-[#FAF8F5] border border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814]'
                              }`}
                            >
                              <span className="truncate">{mat === 'Other' ? '✨ Custom Material' : mat}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>

                      {material === 'Other' && (
                        <div className="mt-3 p-3.5 bg-white border border-[#E2D7CB] rounded-2xl animate-fadeIn space-y-1.5">
                          <label className="block text-[11px] font-bold text-[#5C4E42]">
                            Specify Custom Structural Material:
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Italian Carrara Gold Marble, Reclaimed Oak Timber, Brass Frame..."
                            value={customMaterialInput}
                            onChange={(e) => setCustomMaterialInput(e.target.value)}
                            required={material === 'Other'}
                            className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#E2D7CB] rounded-xl font-bold text-xs focus:outline-none focus:border-[#38A132] focus:ring-1 focus:ring-[#38A132] text-[#2C241D]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Color & Polish Shade Selection */}
                    <div>
                      <label className="block font-black text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <Palette className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>Color & Polish Shade Palette</span>
                      </label>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[
                          { name: 'Cream White', hex: '#FDFBF7' },
                          { name: 'Emerald Green', hex: '#0B4F37' },
                          { name: 'Terracotta Orange', hex: '#C85A32' },
                          { name: 'Charcoal Grey', hex: '#2F3337' },
                          { name: 'Navy Blue', hex: '#1E293B' },
                          { name: 'Natural Teak Wax', hex: '#A87948' },
                          { name: 'Dark Walnut Polish', hex: '#4A3525' },
                          { name: 'Gold / Brass Accent', hex: '#D4AF37' },
                          { name: 'Custom Color Picker', hex: 'CUSTOM_PICKER' }
                        ].map((swatch) => {
                          const isSelected = selectedColor === swatch.name;
                          if (swatch.hex === 'CUSTOM_PICKER') {
                            return (
                              <button
                                key={swatch.name}
                                type="button"
                                onClick={() => setSelectedColor(swatch.name)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer flex items-center gap-2 ${
                                  isSelected
                                    ? 'bg-[#38A132]/10 border-2 border-[#38A132] text-[#38A132] shadow-xs'
                                    : 'bg-white hover:bg-[#FAF8F5] border border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814]'
                                }`}
                              >
                                <div className="w-4 h-4 rounded-full border border-dashed border-[#38A132] flex items-center justify-center text-[10px] shrink-0 font-mono">
                                  🎨
                                </div>
                                <span className="truncate">Custom Shade</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={swatch.name}
                              type="button"
                              onClick={() => setSelectedColor(swatch.name)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                                isSelected
                                  ? 'bg-[#38A132]/10 border-2 border-[#38A132] text-[#38A132] shadow-xs'
                                  : 'bg-white hover:bg-[#FAF8F5] border border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814]'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full inline-block border shrink-0 ${
                                  isSelected ? 'ring-2 ring-[#38A132] ring-offset-1' : 'border-black/20'
                                }`}
                                style={{ backgroundColor: swatch.hex }}
                              />
                              <span className="truncate">{swatch.name}</span>
                            </button>
                          );
                        })}
                      </div>

                      {(selectedColor === 'Custom Color Picker' || selectedColor === 'Other') && (
                        <div className="mt-3 p-3.5 bg-white border border-[#E2D7CB] rounded-2xl space-y-2.5 animate-fadeIn shadow-xs">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div>
                              <label className="block text-[10px] font-extrabold text-[#7A6C5E] mb-1">
                                Pick Color Hex:
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={customPickerHex}
                                  onChange={(e) => setCustomPickerHex(e.target.value)}
                                  className="w-8 h-8 rounded-lg border border-[#E2D7CB] cursor-pointer bg-transparent p-0.5"
                                />
                                <span className="font-mono text-[11px] font-extrabold text-[#2C241D] bg-[#FAF8F5] px-2 py-1 rounded-md border border-[#E2D7CB]">
                                  {customPickerHex.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            <div className="flex-1 min-w-[180px]">
                              <label className="block text-[10px] font-extrabold text-[#7A6C5E] mb-1">
                                Custom Color / Shade Name:
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Sage Green, Dusty Rose Velvet..."
                                value={customColorInput}
                                onChange={(e) => setCustomColorInput(e.target.value)}
                                className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E2D7CB] rounded-lg font-bold text-xs focus:outline-none focus:border-[#38A132] text-[#2C241D]"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Upholstery Fabric / Texture Finish */}
                    <div>
                      <label className="block font-black text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <Sliders className="w-3.5 h-3.5 text-[#38A132]" />
                        <span>Upholstery Fabric & Texture Finish</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {selectedCategory.fabricsOrFinishes.map((fab) => {
                          const isSelected = fabricOrFinish === fab;
                          return (
                            <button
                              key={fab}
                              type="button"
                              onClick={() => setFabricOrFinish(fab)}
                              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer truncate flex items-center justify-between ${
                                isSelected
                                  ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                                  : 'bg-white hover:bg-[#FAF8F5] border border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814]'
                              }`}
                            >
                              <span className="truncate">{fab}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* DYNAMIC CATEGORY ASPECTS */}
                    {selectedCategory.aspects.map((asp) => (
                      <div key={asp.key}>
                        <label className="block font-black text-[#5C4E42] mb-2 text-xs uppercase tracking-wider">
                          {asp.label}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {asp.options.map((opt) => {
                            const isSelected = aspectSelections[asp.key] === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleAspectChange(asp.key, opt)}
                                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all cursor-pointer truncate flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                                    : 'bg-white hover:bg-[#FAF8F5] border border-[#E2D7CB] text-[#5C4E42] hover:text-[#1C1814]'
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

                {/* STEP 3: DIMENSIONS & REFERENCE IMAGES & SPECIAL REQUIREMENTS */}
                {modalStep === 3 && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Measurements */}
                    <div>
                      <label className="block font-black text-[#5C4E42] mb-2.5 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <Ruler className="w-4 h-4 text-[#38A132]" />
                        <span>Exact Custom Dimensions & Measurements</span>
                      </label>
                      <div className="grid grid-cols-3 gap-3.5">
                        <div className="bg-white p-3 rounded-2xl border border-[#E2D7CB] shadow-2xs">
                          <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Length</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={lengthCm}
                              onChange={(e) => setLengthCm(e.target.value)}
                              required
                              className="w-full pr-8 py-1.5 text-sm bg-transparent font-black focus:outline-none text-[#2C241D]"
                            />
                            <span className="absolute right-0 top-1.5 text-xs font-bold text-[#7A6C5E]">cm</span>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-2xl border border-[#E2D7CB] shadow-2xs">
                          <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Width / Depth</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={widthCm}
                              onChange={(e) => setWidthCm(e.target.value)}
                              required
                              className="w-full pr-8 py-1.5 text-sm bg-transparent font-black focus:outline-none text-[#2C241D]"
                            />
                            <span className="absolute right-0 top-1.5 text-xs font-bold text-[#7A6C5E]">cm</span>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-2xl border border-[#E2D7CB] shadow-2xs">
                          <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Height</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={heightCm}
                              onChange={(e) => setHeightCm(e.target.value)}
                              required
                              className="w-full pr-8 py-1.5 text-sm bg-transparent font-black focus:outline-none text-[#2C241D]"
                            />
                            <span className="absolute right-0 top-1.5 text-xs font-bold text-[#7A6C5E]">cm</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reference Design Images */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-black text-[#5C4E42] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                          <Image className="w-4 h-4 text-[#38A132]" />
                          <span>Reference Design Images (Optional)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setReferenceImageUrls((prev) => [...prev, ''])}
                          className="text-xs font-extrabold text-[#38A132] hover:text-[#32922D] flex items-center gap-1 cursor-pointer bg-[#38A132]/10 px-3 py-1 rounded-xl border border-[#38A132]/20 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Image URL</span>
                        </button>
                      </div>

                      {/* Drag and Drop Zone */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('reference-file-input')?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                          isDragging
                            ? 'border-[#38A132] bg-[#38A132]/10 shadow-md scale-[1.01]'
                            : 'border-[#E2D7CB] hover:border-[#38A132]/50 bg-white/80 hover:bg-white'
                        }`}
                      >
                        <input
                          id="reference-file-input"
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-[#38A132]/10 border border-[#38A132]/20 text-[#38A132] flex items-center justify-center">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-[#2C241D]">
                              Drag & drop reference design images here, or <span className="text-[#38A132] underline">browse files</span>
                            </p>
                            <p className="text-[11px] font-medium text-[#7A6C5E] mt-0.5">
                              Supports PNG, JPG, JPEG, WEBP
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Preview Thumbnails */}
                      {referenceImageUrls.filter(u => u.trim() !== '').length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {referenceImageUrls.map((url, idx) => {
                            if (!url.trim()) return null;
                            return (
                              <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-[#E2D7CB] bg-white shadow-2xs">
                                <img src={url} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReferenceImageUrls(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-400" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Special Notes Textarea */}
                    <div>
                      <label className="block font-black text-[#5C4E42] mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                        <MessageSquareText className="w-4 h-4 text-[#38A132]" />
                        <span>Additional Customization Notes & Requirements</span>
                      </label>
                      <textarea
                        rows={3}
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Write specific requirements here: e.g. Stain-resistant upholstery, custom leg carvings, exact clearance heights..."
                        className="w-full px-4 py-3 text-xs sm:text-sm bg-white border border-[#E2D7CB] rounded-2xl text-[#2C241D] font-bold focus:outline-none focus:border-[#38A132] focus:ring-1 focus:ring-[#38A132]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Blueprint Panel: Live Summary & Valuation Range */}
              <div className="w-full lg:w-80 bg-gradient-to-b from-[#FAF8F5] via-[#F4EFE7] to-[#EFE8DC] border-t lg:border-t-0 lg:border-l border-[#E2D7CB] p-6 space-y-5 flex flex-col justify-between flex-shrink-0">
                <div className="space-y-4">
                  {/* Blueprint Spec Card */}
                  <div className="bg-white/90 backdrop-blur-md border border-[#E2D7CB] rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#38A132]" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#5C4E42]">
                        Live Build Blueprint
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pb-3 border-b border-[#E2D7CB]">
                      <img
                        src={selectedCategory.types.find(t => t.name === furnitureType)?.img || selectedCategory.heroImage}
                        alt={furnitureType}
                        className="w-12 h-12 rounded-xl object-cover border border-[#E2D7CB] shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-[#1C1814] truncate">
                          {furnitureType || 'Custom Furniture'}
                        </h4>
                        <p className="text-[10px] text-[#7A6C5E] font-medium truncate mt-0.5">
                          {selectedCategory.name}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs font-bold text-[#2C241D]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#7A6C5E]">Material:</span>
                        <span className="truncate max-w-[130px] font-extrabold">{material}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#7A6C5E]">Color / Polish:</span>
                        <span className="truncate max-w-[130px] font-extrabold">{selectedColor}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#7A6C5E]">Finish:</span>
                        <span className="truncate max-w-[130px] font-extrabold">{fabricOrFinish}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#7A6C5E]">Dimensions:</span>
                        <span className="font-mono font-extrabold">{lengthCm}×{widthCm}×{heightCm} cm</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Valuation Range Card */}
                  <div className="bg-white/90 backdrop-blur-md border border-[#E2D7CB] rounded-2xl p-4 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#7A6C5E] uppercase tracking-wider">
                        Estimated Price Range
                      </span>
                      <span className="text-[10px] font-bold text-[#38A132] bg-[#38A132]/10 px-2 py-0.5 rounded-full">
                        Artisan Estimate
                      </span>
                    </div>
                    <div className="text-xl font-mono font-black text-[#38A132]">
                      {selectedCategory.id === 'sofas' ? '₹45,000 – ₹1,20,000' :
                       selectedCategory.id === 'dining' ? '₹35,000 – ₹95,000' :
                       selectedCategory.id === 'beds' ? '₹40,000 – ₹1,10,000' :
                       selectedCategory.id === 'storage' ? '₹25,000 – ₹75,000' : '₹20,000 – ₹60,000'}
                    </div>
                    <p className="text-[10px] text-[#7A6C5E] font-medium leading-relaxed">
                      Final quotation verified by craftsmen upon blueprint submission.
                    </p>
                  </div>
                </div>

                {/* Stepper Navigation Action Buttons */}
                <div className="space-y-2 pt-2">
                  {modalStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => handleStepChange((modalStep + 1) as any)}
                      className="w-full py-3 bg-gradient-to-r from-[#38A132] to-[#48A63E] hover:from-[#32922D] hover:to-[#38A132] text-white text-xs font-black rounded-xl shadow-md shadow-[#38A132]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                    >
                      <span>Next: {modalStep === 1 ? 'Timber & Palette' : 'Review & Submit'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submittingOrder}
                      className="w-full py-3.5 bg-gradient-to-r from-[#38A132] to-[#48A63E] hover:from-[#32922D] hover:to-[#38A132] text-white text-xs font-black rounded-xl shadow-lg shadow-[#38A132]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submittingOrder ? 'Submitting Blueprint...' : (editingOrderId ? 'Update Specifications' : 'Submit Custom Build Request')}</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      )}


      {/* SINGLE UNIFIED GLASS CARD CONTAINER FOR TRACKER (Rendered when user has active custom orders) */}
      {userOrders.length > 0 && activeOrder && (
        <div className="ultra-glass-card bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6">
        <div className="glass-sheen" aria-hidden="true" />

        {/* Card Header & Action Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#EFE7DE]">
          <div>
            <h2 className="text-2xl font-extrabold text-[#2C241D] tracking-tight mt-1">
              Custom Orders & Build Studio
            </h2>
            <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
              Configure bespoke furniture specs, customize dimensions & materials, and track artisan craftsmanship in real-time.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setEditingOrderId(null);
                setIsFormOpen(true);
                setModalStep(1);
                setTimeout(() => {
                  const el = document.getElementById('custom-order-form');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-[#38A132]/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Request Another Custom Piece</span>
            </button>
          </div>
        </div>

        {/* Multi-Order Selector Tabs (if customer has multiple custom orders) */}
        {userOrders.length > 1 && (
          <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#EFE7DE]">
            {userOrders.map((ord) => {
              const isSelected = ord.custom_order_id === selectedOrderId;
              return (
                <button
                  key={ord.custom_order_id}
                  onClick={() => setSelectedOrderId(ord.custom_order_id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#2D6338] text-white shadow-md'
                      : 'bg-white/80 text-[#6B5C4D] hover:bg-white border border-[#E2D7CB]'
                  }`}
                >
                  <span>#{ord.custom_order_id} - {ord.furniture_type}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#FAF7F2] text-[#7A6C5E]'
                  }`}>
                    {formatStatusLabel(ord.order_status)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="relative z-10 space-y-6">
            {/* Active Order Specs & Status Banner */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#EFE7DE]">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-black text-[#5C4E42] bg-[#FAF7F2] px-3 py-1 rounded-full border border-[#E2D7CB]">
                    Order #{activeOrder.custom_order_id}
                  </span>

                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${getStatusBadgeColor(activeOrder.order_status)}`}>
                    Status: {formatStatusLabel(activeOrder.order_status)}
                  </span>

                  {/* DOWNLOAD PAYMENT RECEIPT PROVISION */}
                  {(activeOrder.payment_status === 'Paid' || activeOrder.order_status === 'Paid') && (
                    <button
                      onClick={() => downloadPaymentReceipt(activeOrder)}
                      className="px-3.5 py-1.5 rounded-full bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md animate-fadeIn"
                      title="Download official paid invoice & receipt"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                      <span>Download Receipt</span>
                    </button>
                  )}

                  {/* EDIT PROVISION (Available only for Pending orders, locked once Approved!) */}
                  {isEditable ? (
                    <button
                      onClick={() => handleStartEditOrder(activeOrder)}
                      className="px-3 py-1 rounded-full bg-white/80 hover:bg-white border border-white/80 text-[#2C241D] text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Edit specifications before production approval"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#38A132]" />
                      <span>Edit Specifications</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-white/60 border border-white/80 text-[#8C7C6D] text-[11px] font-extrabold flex items-center gap-1.5" title="Order has been approved by production staff. Specs are locked.">
                      <Lock className="w-3.5 h-3.5 text-[#8C7C6D]" />
                      Specs Locked (Order Approved)
                    </span>
                  )}
                  {/* CANCEL REQUEST OPTION FOR UNPAID CUSTOM ORDERS */}
                  {activeOrder.order_status !== 'Cancelled' && activeOrder.order_status !== 'Completed' && activeOrder.order_status !== 'In Production' && activeOrder.order_status !== 'Paid' && (
                    <button
                      onClick={() => setCancelModalOrderId(activeOrder.custom_order_id)}
                      className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                      title="Cancel Order"
                    >
                      <X className="w-3.5 h-3.5 text-rose-600" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {activeOrder.reference_image && parseReferenceImages(activeOrder.reference_image).length > 0 && (
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                      {parseReferenceImages(activeOrder.reference_image).map((imgUrl, idx) => (
                        <div key={idx} className="relative group shrink-0">
                          <button
                            type="button"
                            onClick={() => openImageInNewTab(imgUrl)}
                            className="block cursor-pointer"
                          >
                            <img
                              src={imgUrl}
                              alt={`Design Reference ${idx + 1}`}
                              className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E2D7CB] shadow-md group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.target as HTMLElement;
                                target.style.display = 'none';
                                if (target.parentElement && target.parentElement.parentElement) {
                                  target.parentElement.parentElement.style.display = 'none';
                                }
                              }}
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-[#2C241D]/80 text-white font-extrabold text-[9px] backdrop-blur-xs">
                              Ref #{idx + 1}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-2xl font-extrabold text-[#2C241D] tracking-tight">
                      {activeOrder.furniture_type}
                    </h3>

                    {/* ELEGANT SPECIFICATION PILLS (Formatted cleanly, no raw text strings!) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-3 py-1.5 rounded-xl bg-white/50 backdrop-blur-md border border-white/70 text-xs font-bold text-[#2C241D] flex items-center gap-1.5 shadow-2xs">
                        <span className="text-[#5C4E42]">Wood/Frame:</span> {activeOrder.material}
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-white/50 backdrop-blur-md border border-white/70 text-xs font-bold text-[#2C241D] flex items-center gap-1.5 shadow-2xs">
                        <span className="text-[#5C4E42]">Upholstery/Finish:</span> {activeOrder.color}
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-white/50 backdrop-blur-md border border-white/70 text-xs font-bold text-[#2C241D] flex items-center gap-1.5 shadow-2xs">
                        <span className="text-[#5C4E42]">Dimensions:</span> {activeOrder.dimensions}
                      </span>

                      {aspectPills.map((asp, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-xl bg-[#38A132]/10 border border-[#38A132]/30 text-xs font-bold text-[#2C241D] flex items-center gap-1.5">
                          <span className="text-[#38A132]">{asp.label}:</span> {asp.value}
                        </span>
                      ))}
                    </div>

                    {/* CLEAN SPECIAL CUSTOMIZATION REQUIREMENTS */}
                    {specialNotes && specialNotes !== 'None' && (
                      <div className="mt-2 bg-white/50 backdrop-blur-md p-3.5 rounded-2xl border border-white/70 text-xs font-medium text-[#2C241D] shadow-inner">
                        <strong className="text-[#2C241D] font-extrabold flex items-center gap-1.5 mb-1">
                          📌 Special Customization Requirements:
                        </strong>
                        <span>{specialNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB] shrink-0 space-y-2 max-w-xs">
                <span className="block text-[11px] font-bold text-[#7A6C5E] uppercase">Estimated Quotation</span>
                <span className="text-xl font-extrabold text-[#38A132] block">
                  {activeOrder.estimated_price ? `₹${activeOrder.estimated_price.toLocaleString('en-IN')}` : 'Quote Under Assessment'}
                </span>

                {activeOrder.estimated_price && activeOrder.estimated_price > 0 && !(activeOrder.payment_status === 'Paid' || activeOrder.order_status === 'Paid') && (
                  <div>
                    {activeOrder.order_status === 'Quote Provided' || activeOrder.order_status === 'QUOTATION_READY' ? (
                      <div className="space-y-2 pt-1 text-left">
                        <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md block text-center">
                          Action Needed: Review & Approve Quotation
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                setUserOrders((prev) =>
                                  prev.map((o) =>
                                    o.custom_order_id === activeOrder.custom_order_id
                                      ? { ...o, order_status: 'CUSTOMER_APPROVED' }
                                      : o
                                  )
                                );
                                await updateOrderStatus(activeOrder.custom_order_id, 'CUSTOMER_APPROVED');
                                loadUserCustomOrders();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold cursor-pointer shadow-xs text-center transition-all"
                          >
                            Approve Quote
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                setUserOrders((prev) =>
                                  prev.map((o) =>
                                    o.custom_order_id === activeOrder.custom_order_id
                                      ? { ...o, order_status: 'CUSTOMER_REJECTED' }
                                      : o
                                  )
                                );
                                await updateOrderStatus(activeOrder.custom_order_id, 'CUSTOMER_REJECTED');
                                loadUserCustomOrders();
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="py-2 px-3 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-extrabold cursor-pointer text-center transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : activeOrder.order_status === 'CUSTOMER_APPROVED' || activeOrder.order_status === 'Approved' ? (
                      <button
                        onClick={() => handleAddToCartAndPay(activeOrder)}
                        className="mt-2 w-full px-3.5 py-2 rounded-xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                        title="Add approved custom furniture quote to cart"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Add to Cart & Checkout</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* LIVE 5-STAGE WORKSHOP PROGRESS TRACKER */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#48A63E]" />
                  <h4 className="text-xs font-black text-[#2C241D] uppercase tracking-wider">
                    Live Workshop Craftsmanship Progress
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#48A63E]">
                    {activeOrder.progress_percentage ?? Math.min(100, (currentStageIdx + 1) * 20)}% Completed
                  </span>
                </div>
              </div>

              {/* Progress Bar Shimmer */}
              <div className="w-full h-2.5 bg-[#EBE4D8] rounded-full overflow-hidden p-0.5 border border-[#D6C9B9]">
                <div
                  className="h-full bg-gradient-to-r from-[#48A63E] via-[#38A132] to-[#2D6338] rounded-full transition-all duration-700 ease-out shadow-xs"
                  style={{ width: `${activeOrder.progress_percentage ?? Math.min(100, (currentStageIdx + 1) * 20)}%` }}
                />
              </div>

              {/* 5-Step Stepper Icons */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {stages.map((stg, idx) => {
                  const isDone = idx < currentStageIdx || activeOrder.order_status === 'Completed';
                  const isCurrent = idx === currentStageIdx && activeOrder.order_status !== 'Completed';

                  return (
                    <div key={idx} className="flex flex-col items-center text-center space-y-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isDone
                          ? 'bg-[#48A63E] text-white shadow-xs'
                          : isCurrent
                          ? 'bg-[#E1EAD6] text-[#2D6338] border-2 border-[#48A63E] ring-2 ring-[#48A63E]/20 animate-pulse font-black'
                          : 'bg-white border border-[#D6C9B9] text-[#A69B8D]'
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span className="text-[11px] font-black">{idx + 1}</span>
                        )}
                      </div>
                      <span className={`text-[10px] leading-tight font-bold hidden sm:block ${
                        isDone || isCurrent ? 'text-[#2C241D]' : 'text-[#A69B8D]'
                      }`}>
                        {stg}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Latest Remarks Callout */}
              {activeOrder.latest_remarks && (
                <div className="mt-3 bg-[#FAF8F5] border border-[#E2D7CB] rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#48A63E]/15 border border-[#48A63E]/30 flex items-center justify-center text-[#48A63E] shrink-0 mt-0.5">
                    <MessageSquareText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-[#7A6C5E] uppercase tracking-wider block">
                      Artisan Workshop Update:
                    </span>
                    <p className="text-xs text-[#2C241D] font-semibold mt-0.5">
                      {activeOrder.latest_remarks}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Craftsmen Info */}
            {trackingInfo && trackingInfo.assigned_workers.length > 0 && (
              <div className="pt-4 border-t border-[#EFE7DE]">
                <h4 className="text-xs font-bold text-[#7A6C5E] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#38A132]" /> Assigned Master Craftsmen
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {trackingInfo.assigned_workers.map((w, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#38A132] text-white flex items-center justify-center text-xs font-extrabold">
                        {w.worker_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-[#2C241D]">{w.worker_name}</div>
                        <div className="text-[10px] font-bold text-[#38A132]">{w.task_status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM CANCEL ORDER CONFIRMATION MODAL */}
      {cancelModalOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E2D7CB] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-[#2C241D]">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-extrabold text-[#2C241D]">Cancel Custom Order</h3>
              <p className="text-xs text-[#7A6C5E] leading-relaxed">
                Are you sure you want to cancel this custom order request? This action will update your request status to Cancelled.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCancelModalOrderId(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#F4ECE1] border border-[#E2D7CB] text-[#524538] font-extrabold text-xs transition-all cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={async () => {
                  const targetId = cancelModalOrderId;
                  setCancelModalOrderId(null);
                  if (targetId) {
                    // Instant optimistic local state update without page refresh!
                    setUserOrders(prev => prev.filter(o => o.custom_order_id !== targetId));
                    await cancelCustomOrder(targetId);
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
    </div>
  );
};
