import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Award,
  ChevronRight,
  Package,
  Sparkles,
  Check,
  ShoppingBag,
  Heart,
  Zap,
  LogIn,
  Sliders,
  Plus,
  Minus,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { RecommendationProduct } from '../../types/dashboard';
import { HeaderNav } from '../landing/HeaderNav';
import { Header as CustomerDashboardHeader } from '../dashboard/Header';
import { fetchInventoryFromDB } from '../../services/api';
import { getColorHex, parseAvailableColors } from '../../utils/colorUtils';
import { openImageInNewTab } from '../../utils/imageUtils';
import { addToCart, getCartItems, getCartCount, setDirectCheckoutItem } from '../../utils/cartStorage';
import { getWishlistItems, toggleWishlist, getWishlistCount } from '../../utils/wishlistStorage';
import { getStoredUserIdentity } from '../../utils/sessionUtils';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<RecommendationProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RecommendationProduct[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [availableColorsList, setAvailableColorsList] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState<number>(() => getCartCount());
  const [wishlistCount, setWishlistCount] = useState<number>(() => getWishlistCount());
  const [cartIds, setCartIds] = useState<string[]>(() => getCartItems().map((it) => it.id));
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => getWishlistItems().map((it) => it.id));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const checkAuthStatus = (): boolean => {
    if (typeof window === 'undefined') return false;
    const identity = getStoredUserIdentity();
    return Boolean(identity.userObj || identity.email || localStorage.getItem('access_token') || localStorage.getItem('user'));
  };

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => checkAuthStatus());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    const syncStorage = () => {
      setCartCount(getCartCount());
      setWishlistCount(getWishlistCount());
      setCartIds(getCartItems().map((it) => it.id));
      setWishlistIds(getWishlistItems().map((it) => it.id));
      setIsLoggedIn(checkAuthStatus());
    };

    window.addEventListener('storage', syncStorage);
    window.addEventListener('cart-updated', syncStorage);
    window.addEventListener('wishlist-updated', syncStorage);
    window.addEventListener('user-logged-in', syncStorage);
    window.addEventListener('user-logout', syncStorage);

    return () => {
      window.removeEventListener('storage', syncStorage);
      window.removeEventListener('cart-updated', syncStorage);
      window.removeEventListener('wishlist-updated', syncStorage);
      window.removeEventListener('user-logged-in', syncStorage);
      window.removeEventListener('user-logout', syncStorage);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setQuantity(1);
    const loadProduct = async () => {
      try {
        const dbItems = await fetchInventoryFromDB();
        if (dbItems && dbItems.length > 0) {
          const match = dbItems.find(
            (p: any) => String(p.id) === String(id) || String(p.product_id) === String(id) || p.sku === id
          );
          const target = match || dbItems[0];
          const rawId = target.product_id || target.id;
          const code =
            target.productCode ||
            target.sku ||
            `SKU-RS-${typeof rawId === 'number' ? String(rawId).padStart(3, '0') : rawId}`;

          const rawColors =
            target.available_colors ||
            target.availableColors ||
            target.color ||
            'Emerald Green, Warm Beige, Charcoal Black';
          const parsedColors = parseAvailableColors(rawColors);
          const finalColors = parsedColors.length > 0 ? parsedColors : [target.color || 'Natural Wood'];

          setAvailableColorsList(finalColors);
          setSelectedColor(finalColors[0]);

          const loadedProduct: RecommendationProduct = {
            id: target.id || `inv-${target.product_id}`,
            productCode: code,
            name: target.name || target.product_name,
            category: target.category || 'Living Room',
            subcategory: target.subcategory || 'General',
            price: typeof target.price === 'number' ? target.price : parseFloat(target.price) || 0,
            originalPrice:
              (typeof target.price === 'number' ? target.price : parseFloat(target.price) || 0) * 1.15,
            stock: target.stockCount || 10,
            salesCount: 45,
            status: (target.status || 'In Stock') as any,
            imageUrl:
              target.image_url ||
              target.image ||
              'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
            rating: 4.9,
            reviewCount: 38,
            material: target.material || 'Solid Teak Wood',
            color: target.color || 'Natural Wood',
            dimensions: target.dimensions || '200cm x 90cm x 75cm',
            isCustomizable: true,
            isTopPick: target.stockCount > 0,
            badge: code,
            detailedDescription: target.description || target.detailedDescription,
          };

          setProduct(loadedProduct);

          // Get related products in same category or others
          const related = dbItems
            .filter((p: any) => String(p.id) !== String(target.id) && String(p.product_id) !== String(target.product_id))
            .slice(0, 4)
            .map((item: any) => {
              const rId = item.product_id || item.id;
              const rCode = item.productCode || item.sku || `SKU-RS-${typeof rId === 'number' ? String(rId).padStart(3, '0') : rId}`;
              return {
                id: item.id || `inv-${item.product_id}`,
                productCode: rCode,
                name: item.name || item.product_name,
                category: item.category || 'Living Room',
                subcategory: item.subcategory || 'General',
                price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                originalPrice: (typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0) * 1.15,
                stock: item.stockCount || 10,
                salesCount: 30,
                status: (item.status || 'In Stock') as any,
                imageUrl: item.image_url || item.image || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
                rating: 4.8,
                reviewCount: 20,
                material: item.material || 'Solid Wood',
                color: item.color || 'Natural Wood',
                dimensions: item.dimensions || '200cm x 90cm x 75cm',
                isCustomizable: true,
                isTopPick: true,
                badge: rCode,
              };
            });

          setRelatedProducts(related);
        }
      } catch (err) {
        console.warn('Error loading product detail from DB:', err);
      }
    };
    loadProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${product.id || id}`)}`);
      return;
    }
    if (cartIds.includes(product.id)) {
      navigate('/cart');
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      material: `${product.material}${selectedColor ? ` • Color: ${selectedColor}` : ''}`,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity: quantity,
      category: product.category,
    });
    setCartIds(getCartItems().map((it) => it.id));
    setCartCount(getCartCount());
    showToast(`Added "${product.name}" to your cart!`);
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(`/product/${product.id || id}`)}`);
      return;
    }
    setDirectCheckoutItem({
      id: product.id,
      name: product.name,
      material: `${product.material}${selectedColor ? ` • Color: ${selectedColor}` : ''}`,
      price: product.price,
      quantity: quantity,
      imageUrl: product.imageUrl,
    });
    navigate('/cart');
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    toggleWishlist({
      id: product.id,
      name: product.name,
      material: product.material,
      price: product.price,
      originalPrice: product.originalPrice,
      imageUrl: product.imageUrl,
      category: product.category,
      subcategory: product.subcategory,
      dimensions: product.dimensions,
      rating: product.rating,
      reviewCount: product.reviewCount,
      badge: product.badge,
      isCustomizable: product.isCustomizable,
      stock: product.stock,
    });
    const updated = getWishlistItems().map((it) => it.id);
    const added = updated.includes(product.id);
    setWishlistIds(updated);
    setWishlistCount(getWishlistCount());
    showToast(added ? `Added "${product.name}" to your wishlist!` : `Removed "${product.name}" from wishlist.`);
  };

  if (!product) {
    return (
      <div className="relative min-h-screen text-[#1C1814] flex items-center justify-center p-6 bg-[#FAF8F5] overflow-x-hidden font-sans">
        <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#FAF8F5] via-[#F1EDE6] to-[#E6E0D5] pointer-events-none" />
        <div className="relative z-10 text-center space-y-4 bg-white/90 backdrop-blur-md p-8 rounded-3xl border border-[#E2D7CB] shadow-sm">
          <Package className="w-12 h-12 text-[#38A132] mx-auto animate-bounce" />
          <h2 className="text-xl font-black text-[#1C1814]">Loading Product Details...</h2>
        </div>
      </div>
    );
  }

  const isWishlisted = wishlistIds.includes(product.id);
  const isCartAdded = cartIds.includes(product.id);

  return (
    <div className="relative min-h-screen text-[#1C1814] flex flex-col selection:bg-[#387A46] selection:text-white bg-[#FAF8F5] overflow-x-hidden font-sans">
      {/* Ambient Luxury Living Room Background with Enhanced Visibility */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-45 pointer-events-none scale-105 transition-all duration-700"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      {/* Warm Linen & Silk Ivory Translucent Studio Gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#FAF8F5]/60 via-[#F1EDE6]/50 to-[#E6E0D5]/55 pointer-events-none" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.5),_transparent_70%)] pointer-events-none" />

      {/* Foreground Interactive Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Header */}
        {isLoggedIn ? (
          <CustomerDashboardHeader
            cartCount={cartCount}
            wishlistCount={wishlistCount}
            activeTab="shop"
            onSelectTab={(tab) => navigate(`/dashboard?tab=${tab}`)}
            onOpenCustomOrder={() => navigate('/dashboard#custom-order-form')}
          />
        ) : (
          <HeaderNav />
        )}

        {/* Main Central Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pt-3 space-y-6">
          {/* Breadcrumb & Navigation Pill */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Link
              to={isLoggedIn ? "/dashboard#shop" : "/#shop"}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/90 border border-[#E2D7CB] text-xs font-black text-[#1C1814] hover:bg-white hover:border-[#38A132]/40 transition-all shadow-xs group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#38A132] group-hover:-translate-x-1 transition-transform" />
              <span>{isLoggedIn ? "Back to Store Catalog" : "Back to Furniture Catalog"}</span>
            </Link>

            <div className="flex items-center gap-1.5 text-xs font-black text-[#5C4E42] bg-white/90 border border-[#E2D7CB] px-4 py-2 rounded-xl shadow-xs">
              <span>{isLoggedIn ? "Store" : "Catalog"}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#A5998D]" />
              <span className="capitalize">{product.category.replace('-', ' ')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#A5998D]" />
              <span className="text-[#38A132] font-black">{product.name}</span>
            </div>
          </div>

          {/* Toast Alert */}
          {toastMessage && (
            <div className="bg-[#38A132] text-white text-xs font-black px-5 py-3 rounded-2xl shadow-xl shadow-[#38A132]/30 text-center animate-fadeIn max-w-md mx-auto flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Main Product Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-7 lg:p-8 space-y-6 relative overflow-hidden shadow-sm border border-[#E2D7CB]">
            {/* Top Header Banner */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE7DE] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#38A132]/10 border border-[#38A132]/25 flex items-center justify-center shadow-xs">
                  <Package className="w-5 h-5 text-[#38A132]" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1C1814] tracking-tight">
                      {product.name}
                    </h1>
                    {product.badge && (
                      <span className="text-xs font-mono font-black text-[#38A132] bg-[#38A132]/10 border border-[#38A132]/25 px-3 py-1 rounded-full shadow-2xs">
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B5C4D] font-bold mt-0.5">
                    Handcrafted artisan timber furniture • Dimensions: <span className="text-[#1C1814] font-black">{product.dimensions}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`px-4 py-2.5 rounded-full border text-xs font-black transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    isWishlisted
                      ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-xs'
                      : 'bg-[#FAF8F5] border-[#E2D7CB] text-[#5C4E42] hover:text-rose-600 hover:border-rose-300'
                  }`}
                  title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
                  <span>{isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                </button>
              </div>
            </div>

            {/* Product Body Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
              {/* LEFT COLUMN: Product Image & Guarantees (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                {/* Image Showcase Box */}
                <div className="relative h-[360px] sm:h-[420px] w-full rounded-2xl overflow-hidden border border-[#E2D7CB] bg-white shadow-xs group flex items-center justify-center p-6">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                    onClick={() => product.imageUrl && openImageInNewTab(product.imageUrl)}
                    title="Click to view full image in high resolution"
                  />

                  {/* SKU / Badge */}
                  {product.badge && (
                    <span className="absolute top-3.5 left-3.5 bg-[#FAF8F5]/95 backdrop-blur-md border border-[#E2D7CB] text-[#38A132] text-xs font-black px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#38A132]" />
                      {product.badge}
                    </span>
                  )}

                  {/* Quick Wishlist on Image */}
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/95 hover:bg-white border border-[#E2D7CB] flex items-center justify-center transition-all shadow-xs cursor-pointer ${
                      isWishlisted ? 'text-rose-600 border-rose-300 bg-rose-50' : 'text-[#524538] hover:text-rose-600'
                    }`}
                    title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                  </button>
                </div>

                {/* Guarantees Strip */}
                <div className="flex items-center justify-between gap-2 py-3 px-4 bg-[#FAF8F5] rounded-2xl border border-[#E2D7CB] text-xs font-black text-[#2C241D]">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#38A132]" />
                    <span>100% Solid Wood</span>
                  </div>
                  <span className="text-[#A5998D]">•</span>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#38A132]" />
                    <span>Free Delivery</span>
                  </div>
                  <span className="text-[#A5998D]">•</span>
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#38A132]" />
                    <span>5 Yr Warranty</span>
                  </div>
                </div>

                {/* Detailed Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-[#1C1814] uppercase tracking-wider">
                    Detailed Description
                  </h4>
                  <p className="text-xs font-medium text-[#4A3E31] leading-relaxed bg-[#FAF8F5] p-4 rounded-2xl border border-[#E2D7CB]">
                    {product.detailedDescription ||
                      `${product.name} is meticulously handcrafted using premium grade timber and artisan joinery techniques. Designed for modern luxury spaces, offering superior durability, structural stability, and timeless aesthetic appeal.`}
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: Specs, Pricing, Options & Actions (6 cols) */}
              <div className="lg:col-span-6 space-y-5">
                {/* Category, Material & Title */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-black text-[#38A132] bg-[#38A132]/10 border border-[#38A132]/25 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                      {product.material}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{product.status || 'In Stock'}</span>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-[#1C1814] tracking-tight leading-tight">
                    {product.name}
                  </h2>

                  <p className="text-xs font-bold text-[#5C4E42]">
                    Dimensions: <span className="text-[#1C1814] font-black">{product.dimensions}</span>
                  </p>
                </div>

                {/* Price & Savings Card */}
                <div className="p-4 sm:p-5 bg-[#FAF8F5] rounded-2xl border border-[#E2D7CB] flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-black text-[#5C4E42] block uppercase tracking-wider">
                      Store Price
                    </span>
                    <div className="flex items-baseline gap-3 mt-0.5">
                      <span className="text-3xl sm:text-4xl font-black text-[#38A132] tracking-tight">
                        ₹{product.price.toLocaleString('en-IN')}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-[#7A6C5E] line-through font-bold">
                          MSRP ₹{product.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {product.originalPrice && (
                    <span className="px-3.5 py-1.5 bg-[#38A132] text-white text-xs font-black rounded-xl shadow-xs">
                      Save ₹{(product.originalPrice - product.price).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* Finish & Color Options */}
                {availableColorsList.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-xs font-black text-[#1C1814] uppercase tracking-wider block">
                      Finish & Color Options
                    </span>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      {availableColorsList.map((colName) => {
                        const colorStyle = getColorHex(colName);
                        const isSelected = (selectedColor || product.color) === colName;
                        return (
                          <button
                            key={colName}
                            type="button"
                            onClick={() => setSelectedColor(colName)}
                            className={`group/swatch relative flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white border-[#38A132] ring-2 ring-[#38A132]/30 shadow-xs'
                                : 'bg-white border-[#E2D7CB] hover:border-[#38A132]/50 hover:bg-[#FAF8F5]'
                            }`}
                            title={colName}
                          >
                            <span
                              className="w-4 h-4 rounded-full border shadow-2xs transition-transform group-hover/swatch:scale-110 flex items-center justify-center"
                              style={{ backgroundColor: colorStyle.bg, borderColor: colorStyle.border }}
                            >
                              {isSelected && (
                                <Check
                                  className={`w-2.5 h-2.5 ${colorStyle.isDark ? 'text-white' : 'text-[#1A1410]'}`}
                                />
                              )}
                            </span>
                            <span
                              className={`text-xs font-black ${isSelected ? 'text-[#1A1410]' : 'text-[#5C4E42]'}`}
                            >
                              {colName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-[#1C1814] uppercase tracking-wider block">
                    Quantity
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#FAF8F5] border border-[#E2D7CB] rounded-xl p-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E2D7CB] hover:bg-[#F5EFE6] flex items-center justify-center text-[#1C1814] disabled:opacity-40 transition-all cursor-pointer"
                        title="Decrease Quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-12 text-center text-xs font-black text-[#1C1814]">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                        disabled={quantity >= 20}
                        className="w-8 h-8 rounded-lg bg-white border border-[#E2D7CB] hover:bg-[#F5EFE6] flex items-center justify-center text-[#1C1814] disabled:opacity-40 transition-all cursor-pointer"
                        title="Increase Quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-[#6B5C4D] font-bold">
                      {product.stock > 0 ? `${product.stock} units available in stock` : 'Made to order by artisans'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Authenticated Purchase vs. Login Call-To-Action */}
                <div className="pt-2">
                  {isLoggedIn ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="w-full py-3.5 px-6 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-[#38A132]/25 transition-all cursor-pointer active:scale-98"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{isCartAdded ? 'View in Cart' : 'Add to Cart'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className="w-full py-3.5 px-6 rounded-2xl bg-[#1C1814] hover:bg-[#2C241D] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-black/10 transition-all cursor-pointer active:scale-98"
                      >
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>Direct Checkout</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/product/${product.id || id}`)}`)}
                      className="w-full py-3.5 px-6 rounded-2xl bg-[#38A132] hover:bg-[#32922D] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md shadow-[#38A132]/25 transition-all cursor-pointer active:scale-98"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Login to Make a Purchase</span>
                    </button>
                  )}
                </div>

                {/* Specifications Grid */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-xs font-black text-[#1C1814] uppercase tracking-wider block">
                    Product Specifications
                  </span>
                  <div className="grid grid-cols-2 gap-3 p-4 bg-[#FAF8F5] rounded-2xl border border-[#E2D7CB] text-xs">
                    <div>
                      <span className="text-[10px] font-black text-[#6E6458] block uppercase tracking-wider">
                        Primary Material
                      </span>
                      <span className="font-black text-[#1C1814] text-xs mt-0.5 block">{product.material}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-[#6E6458] block uppercase tracking-wider">
                        Warranty Protection
                      </span>
                      <span className="font-black text-[#38A132] text-xs mt-0.5 block">
                        {product.warrantyInfo || '5 Years Warranty'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-[#6E6458] block uppercase tracking-wider">
                        Category
                      </span>
                      <span className="font-black text-[#1C1814] text-xs mt-0.5 block capitalize">
                        {product.category}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-[#6E6458] block uppercase tracking-wider">
                        Dimensions
                      </span>
                      <span className="font-black text-[#1C1814] text-xs mt-0.5 block">{product.dimensions}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended / Similar Collection Section */}
          {relatedProducts.length > 0 && (
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 sm:p-7 space-y-5 border border-[#E2D7CB] shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#38A132]/10 border border-[#38A132]/25 flex items-center justify-center shadow-2xs">
                    <Sparkles className="w-4 h-4 text-[#38A132]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#1C1814] tracking-tight">
                      You May Also Like
                    </h3>
                    <p className="text-[11px] text-[#6B5C4D] font-bold">
                      More handcrafted designs from the RetailSphere luxury collection
                    </p>
                  </div>
                </div>

                <Link
                  to={isLoggedIn ? "/dashboard#shop" : "/#shop"}
                  className="text-xs font-black text-[#38A132] hover:text-[#32922D] hover:underline"
                >
                  View Full Catalog →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {relatedProducts.map((rel) => {
                  const isRelWish = wishlistIds.includes(rel.id);
                  const isRelCart = cartIds.includes(rel.id);
                  return (
                    <div
                      key={rel.id}
                      onClick={() => navigate(`/product/${rel.id}`)}
                      className="group bg-[#FAF8F5] border border-[#E2D7CB] hover:border-[#38A132] rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between cursor-pointer"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white p-3 flex items-center justify-center">
                        <img
                          src={rel.imageUrl}
                          alt={rel.name}
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                        />
                        {rel.badge && (
                          <span className="absolute top-2 left-2 bg-[#FAF8F5]/90 text-[#38A132] text-[10px] font-mono font-black px-2 py-0.5 rounded-md border border-[#E2D7CB]">
                            {rel.badge}
                          </span>
                        )}
                      </div>

                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[#6E6458] block uppercase">
                            {rel.material}
                          </span>
                          <h4 className="text-xs font-black text-[#1C1814] line-clamp-1 group-hover:text-[#38A132] transition-colors">
                            {rel.name}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm font-black text-[#38A132]">
                            ₹{rel.price.toLocaleString('en-IN')}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isLoggedIn) {
                                navigate(`/login?redirect=${encodeURIComponent(`/product/${rel.id}`)}`);
                                return;
                              }
                              addToCart({
                                id: rel.id,
                                name: rel.name,
                                material: rel.material,
                                price: rel.price,
                                imageUrl: rel.imageUrl,
                              });
                              setCartIds(getCartItems().map((it) => it.id));
                              setCartCount(getCartCount());
                              showToast(`Added "${rel.name}" to your cart!`);
                            }}
                            className="w-7 h-7 rounded-lg bg-[#38A132] hover:bg-[#32922D] text-white flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
                            title={isLoggedIn ? "Add to Cart" : "Login to Purchase"}
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductDetailPage;

