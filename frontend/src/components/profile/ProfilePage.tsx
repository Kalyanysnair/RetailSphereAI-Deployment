import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit3, 
  X, 
  Loader2,
  Package,
  Tag,
  Bell,
  Copy,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Heart,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Header } from '../dashboard/Header';
import { getCurrentUser, updateUserProfile, UserProfile } from '../../services/api';
import { isProfileAddressValid } from '../../utils/addressValidator';
import { getCartItems } from '../../utils/cartStorage';
import { getWishlistItems } from '../../utils/wishlistStorage';
import { getCustomerNotificationsApi, CustomerNotification } from '../../services/api_coupons';
import { fetchRetailOrdersFromDB } from '../../utils/retailOrdersStorage';
import { validateName, validatePhoneNumber, validatePincode, formatPhoneNumber, extract10DigitPhone } from '../../utils/formValidators';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAddressRequired = searchParams.get('address_required') === 'true';
  const returnToParam = searchParams.get('return_to');
  const reasonParam = searchParams.get('reason');

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Cart, Wishlist & Orders counts for top quick summary
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  // Single Unified Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Unified Edit Form
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState<{
    full_name?: string;
    phone?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
    password?: string;
    general?: string;
  }>({});

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notifications & Coupons
  const [myNotifs, setMyNotifs] = useState<CustomerNotification[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const stripDefaultValue = (val: string | null | undefined): string => {
    if (!val) return '';
    const trimmed = val.trim();
    const lower = trimmed.toLowerCase();
    if (
      lower === 'default address' ||
      lower === 'default city' ||
      lower === 'default state' ||
      lower === '000000' ||
      lower === '0' ||
      lower === 'not provided' ||
      lower === 'unknown' ||
      lower === 'null' ||
      lower === 'undefined'
    ) {
      return '';
    }
    return trimmed;
  };

  const fetchProfileFromDB = async () => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserProfile(parsed);
      } catch (e) {}
    } else {
      setLoading(true);
    }

    try {
      const data = await getCurrentUser();
      if (data) {
        setUserProfile(data);
        try {
          localStorage.setItem('user', JSON.stringify(data));
        } catch (e) {}

        const val = isProfileAddressValid(data);
        if (isAddressRequired && !val.isValid) {
          handleOpenEdit(data);
        }
      }
    } catch (err) {
      console.error('Error loading database profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshCustomerNotifs = async () => {
    try {
      const notifs = await getCustomerNotificationsApi();
      setMyNotifs(notifs);
    } catch {
      setMyNotifs([]);
    }
  };

  const refreshOrdersCount = async (currentUserEmail?: string) => {
    try {
      const orders = await fetchRetailOrdersFromDB();
      if (Array.isArray(orders)) {
        const emailToMatch = (currentUserEmail || userProfile?.email || '').toLowerCase().trim();
        if (emailToMatch) {
          const count = orders.filter((o) => {
            const oEmail = (o.customerEmail || o.email || o.customer_email || '').toLowerCase().trim();
            return oEmail === emailToMatch;
          }).length;
          setOrderCount(count);
        } else {
          setOrderCount(orders.length);
        }
      }
    } catch {
      setOrderCount(0);
    }
  };

  useEffect(() => {
    fetchProfileFromDB();
    setCartCount(getCartItems().length);
    setWishlistCount(getWishlistItems().length);
    refreshCustomerNotifs();

    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        refreshOrdersCount(parsed.email);
      } catch {}
    }

    window.addEventListener('customer-notifications-updated', refreshCustomerNotifs);
    window.addEventListener('storage', refreshCustomerNotifs);
    return () => {
      window.removeEventListener('customer-notifications-updated', refreshCustomerNotifs);
      window.removeEventListener('storage', refreshCustomerNotifs);
    };
  }, []);

  useEffect(() => {
    if (userProfile?.email) {
      refreshOrdersCount(userProfile.email);
    }
  }, [userProfile?.email]);

  const handleOpenEdit = (profileOverride?: UserProfile | null) => {
    const prof = profileOverride || userProfile;
    if (!prof) return;

    const existingAddr = stripDefaultValue(prof.customer?.address);
    let line1 = existingAddr;
    let line2 = '';

    if (line1.includes(',')) {
      const parts = line1.split(',').map((p) => p.trim());
      line1 = parts[0] || '';
      line2 = parts.slice(1).join(', ') || '';
    }

    setEditForm({
      full_name: prof.full_name || '',
      phone: extract10DigitPhone(prof.phone || ''),
      address_line1: line1,
      address_line2: line2,
      city: stripDefaultValue(prof.customer?.city),
      state: stripDefaultValue(prof.customer?.state),
      pincode: stripDefaultValue(prof.customer?.pincode),
      newPassword: '',
      confirmPassword: '',
    });
    setFormErrors({});
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof formErrors = {};

    // 1. Validate Full Name (letters & spaces only, min 2 chars)
    const nameTrim = editForm.full_name.trim();
    const nameErr = validateName(nameTrim);
    if (nameErr) errors.full_name = nameErr;

    // 2. Validate Phone (10 digits starting with 6-9)
    const phoneDigits = extract10DigitPhone(editForm.phone);
    const phoneErr = validatePhoneNumber(phoneDigits, true);
    if (phoneErr) errors.phone = phoneErr;

    // 3. Validate Address if entered or if address required
    const hasAnyAddressInput = 
      editForm.address_line1.trim() || 
      editForm.city.trim() || 
      editForm.state.trim() || 
      editForm.pincode.trim();

    if (hasAnyAddressInput || isAddressRequired) {
      if (!editForm.address_line1.trim()) {
        errors.address_line1 = 'Address line 1 is required.';
      }
      if (!editForm.city.trim()) {
        errors.city = 'City is required.';
      }
      if (!editForm.state.trim()) {
        errors.state = 'State is required.';
      }
      const pinErr = validatePincode(editForm.pincode.trim());
      if (pinErr) {
        errors.pincode = pinErr;
      }
    }

    // 4. Validate Password Provision (optional, but strict when entered)
    const newPwd = editForm.newPassword.trim();
    const confirmPwd = editForm.confirmPassword.trim();

    if (newPwd || confirmPwd) {
      if (newPwd.length < 6) {
        errors.password = 'New password must be at least 6 characters long.';
      } else if (!confirmPwd) {
        errors.password = 'Please confirm your new password.';
      } else if (newPwd !== confirmPwd) {
        errors.password = 'New password and confirm password do not match.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    let finalAddress = editForm.address_line1.trim();
    if (editForm.address_line2.trim()) {
      finalAddress += `, ${editForm.address_line2.trim()}`;
    }

    try {
      const updated = await updateUserProfile({
        full_name: nameTrim,
        phone: phoneDigits ? `+91${phoneDigits}` : undefined,
        address: finalAddress || undefined,
        city: editForm.city.trim() || undefined,
        state: editForm.state.trim() || undefined,
        pincode: editForm.pincode.trim() || undefined,
        new_password: newPwd || undefined,
      });

      setUserProfile(updated);
      try {
        localStorage.setItem('user', JSON.stringify(updated));
      } catch {}

      setIsEditing(false);
      setSuccessMsg('Customer profile & security details updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);

      if (returnToParam && returnToParam.startsWith('/') && !returnToParam.startsWith('//')) {
        setTimeout(() => {
          navigate(returnToParam, { replace: true });
        }, 800);
      }
    } catch (err: any) {
      setFormErrors({ general: err.message || 'Failed to update profile.' });
    } finally {
      setSubmitting(false);
    }
  };

  const userInitials = userProfile?.full_name
    ? userProfile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'CU';

  const addressValidation = isProfileAddressValid(userProfile);
  const hasSavedAddress = addressValidation.isValid;

  return (
    <div className="relative min-h-screen text-[#1C1814] flex flex-col selection:bg-[#387A46] selection:text-white bg-[#FAF8F5] overflow-x-hidden font-sans">
      {/* Subtle Warm Luxury Ambience Glow */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#FAF8F5]/90 via-[#F3ECE1]/80 to-[#EAE2D5]/85 pointer-events-none" />

      {/* Decorative ambient blurred spots */}
      <div className="fixed top-20 right-10 w-96 h-96 bg-[#38A132]/6 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-96 h-96 bg-[#D8C7B4]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header cartCount={cartCount} wishlistCount={wishlistCount} />

        {/* Main Central Container - Space Efficient & Stunning */}
        <main className="flex-1 p-3.5 sm:p-6 max-w-4xl w-full mx-auto space-y-4">
          {loading ? (
            <div className="py-20 text-center space-y-3 bg-white/90 backdrop-blur-xl rounded-3xl border border-[#DFD5C6] shadow-sm">
              <Loader2 className="w-8 h-8 text-[#38A132] animate-spin mx-auto" />
              <p className="text-xs font-extrabold text-[#7A6C5E] uppercase tracking-wider">Loading Customer Profile...</p>
            </div>
          ) : (
            <>
              {/* Required Address Alert Banner */}
              {isAddressRequired && !hasSavedAddress && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 p-4 rounded-2xl text-xs font-bold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-700" />
                    </div>
                    <div>
                      <p className="font-black text-amber-950">
                        {reasonParam === 'checkout'
                          ? 'Delivery address required to complete checkout'
                          : 'A complete delivery address is required for your order'}
                      </p>
                      <p className="text-[11px] text-amber-800/90 mt-0.5">Please add your shipping address to finalize order processing.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenEdit()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs shrink-0 cursor-pointer transition-all active:scale-95"
                  >
                    Add Address Now
                  </button>
                </div>
              )}

              {/* Success Notification */}
              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* 1. HERO CARD: CUSTOMER IDENTITY & QUICK KPI STATS */}
              <div className="relative overflow-hidden bg-white/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 border border-[#DFD5C6] shadow-[0_10px_35px_rgba(44,32,22,0.05)]">
                {/* Subtle Luxury Mesh Glow */}
                <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-l from-[#38A132]/12 via-[#E8DCCB]/25 to-transparent pointer-events-none rounded-full blur-2xl -mr-16 -mt-16" />

                {/* Hero Header Top Row */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    {/* Monogram Avatar */}
                    <div className="relative group shrink-0">
                      <div className="w-16 h-16 sm:w-17 sm:h-17 rounded-2xl bg-gradient-to-tr from-[#1E3A20] via-[#2D6C29] to-[#38A132] text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-[#38A132]/25 border-2 border-white tracking-wider">
                        {userInitials}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>

                    {/* Customer Name & Labels */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 justify-center sm:justify-start flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-black text-[#1C1814] tracking-tight">
                          {userProfile?.full_name || 'Customer Account'}
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Customer
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#6B5C4D] justify-center sm:justify-start flex-wrap">
                        <span className="flex items-center gap-1 font-medium">
                          <Mail className="w-3.5 h-3.5 text-[#38A132]" />
                          <span>{userProfile?.email}</span>
                        </span>
                        {userProfile?.phone && (
                          <span className="flex items-center gap-1 font-mono font-medium">
                            <Phone className="w-3.5 h-3.5 text-[#38A132]" />
                            <span>{formatPhoneNumber(userProfile.phone)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Single Unified "Edit Profile" Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#38A132] to-[#2E8529] hover:from-[#2F8829] hover:to-[#256E20] text-white text-xs font-black shadow-md shadow-[#38A132]/20 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>

                {/* Quick Customer Activity Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 mt-4 border-t border-[#EFE7DE] relative z-10">
                  <Link
                    to="/orders"
                    className="p-2.5 rounded-xl bg-[#FAF7F2]/80 hover:bg-[#F3ECE0] border border-[#E8DFD3] transition-all flex items-center gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Package className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-[#8C7C6D] uppercase">My Orders</div>
                      <div className="text-xs font-black text-[#1C1814] truncate">{orderCount} Placed</div>
                    </div>
                  </Link>

                  <Link
                    to="/wishlist"
                    className="p-2.5 rounded-xl bg-[#FAF7F2]/80 hover:bg-[#F3ECE0] border border-[#E8DFD3] transition-all flex items-center gap-2.5 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Heart className="w-4 h-4 text-rose-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-[#8C7C6D] uppercase">Saved Wishlist</div>
                      <div className="text-xs font-black text-[#1C1814] truncate">{wishlistCount} Items</div>
                    </div>
                  </Link>

                  <div className="p-2.5 rounded-xl bg-[#FAF7F2]/80 border border-[#E8DFD3] flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4 text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-[#8C7C6D] uppercase">Coupons</div>
                      <div className="text-xs font-black text-[#1C1814] truncate">{myNotifs.length} Active</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FAF7F2]/80 border border-[#E8DFD3] flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      hasSavedAddress ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      <MapPin className={`w-4 h-4 ${hasSavedAddress ? 'text-emerald-700' : 'text-amber-700'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-[#8C7C6D] uppercase">Delivery</div>
                      <div className="text-xs font-black text-[#1C1814] truncate">
                        {hasSavedAddress ? 'Address Set' : 'Not Provided'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. MAIN 2-COLUMN PROFILE & DELIVERY DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Customer Details & Account Security */}
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 border border-[#DFD5C6] shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#38A132]/10 text-[#38A132] flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#2C241D]">
                        Customer Details
                      </h2>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Active Account
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE2D5] space-y-0.5">
                      <span className="text-[10px] font-extrabold text-[#8C7C6D] uppercase tracking-wider block">Full Name</span>
                      <span className="font-extrabold text-[#1C1814] text-sm block">
                        {userProfile?.full_name || 'Not Provided'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE2D5] space-y-0.5">
                      <span className="text-[10px] font-extrabold text-[#8C7C6D] uppercase tracking-wider block">Registered Email</span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1C1814] text-xs">
                          {userProfile?.email}
                        </span>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE2D5] space-y-0.5">
                      <span className="text-[10px] font-extrabold text-[#8C7C6D] uppercase tracking-wider block">Contact Mobile Number</span>
                      <span className="font-mono font-extrabold text-[#1C1814] text-xs sm:text-sm block">
                        {formatPhoneNumber(userProfile?.phone) || '+91 Not Provided'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE2D5] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold text-[#8C7C6D] uppercase tracking-wider block">Account Credentials</span>
                        <span className="font-mono font-bold text-[#1C1814] text-xs">••••••••••••</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#5C4E42] bg-[#EFE7DE] px-2.5 py-1 rounded-lg">
                        <KeyRound className="w-3 h-3 text-[#38A132]" /> Secured
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Saved Delivery Destination */}
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 border border-[#DFD5C6] shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#38A132]/10 text-[#38A132] flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <h2 className="text-xs font-black uppercase tracking-wider text-[#2C241D]">
                        Delivery Destination
                      </h2>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      hasSavedAddress 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {hasSavedAddress ? 'Destination Saved' : 'Address Pending'}
                    </span>
                  </div>

                  {hasSavedAddress ? (
                    <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE2D5] space-y-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-[#8C7C6D] uppercase tracking-wider block">Address</span>
                        <p className="font-extrabold text-[#1C1814] text-xs sm:text-sm leading-snug">
                          {userProfile?.customer?.address}
                        </p>
                        <p className="font-black text-[#38A132] text-xs pt-0.5">
                          {userProfile?.customer?.city}, {userProfile?.customer?.state} - {userProfile?.customer?.pincode}
                        </p>
                      </div>

                      <div className="border-t border-[#EFE7DE] pt-2.5 flex items-center justify-between text-[11px] text-[#6B5C4D]">
                        <span className="font-bold">Recipient: {userProfile?.full_name}</span>
                        <span className="font-mono font-bold">{formatPhoneNumber(userProfile?.phone) || '+91 Not Provided'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-[#FAF8F5] border border-dashed border-[#D4C6B6] text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                        <MapPin className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#1C1814]">No delivery destination configured</p>
                        <p className="text-[11px] text-[#7A6C5E] mt-0.5">Add your address to enjoy fast delivery checkout for handcrafted furniture.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit()}
                        className="mt-1 px-4 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Edit3 className="w-3 h-3" /> Add Address
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. CUSTOMER PERKS & EXCLUSIVE COUPONS */}
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 border border-[#DFD5C6] shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-[#2C241D]">
                      Customer Perks & Exclusive Coupons
                    </h2>
                  </div>
                  <span className="text-[10px] font-black text-[#38A132] bg-[#38A132]/10 px-2.5 py-0.5 rounded-full border border-[#38A132]/20">
                    {myNotifs.length} Available
                  </span>
                </div>

                {myNotifs.length === 0 ? (
                  <div className="py-6 text-center text-[#8C7C6D] text-xs bg-[#FAF8F5] rounded-2xl border border-[#EAE2D5] space-y-1">
                    <Tag className="w-6 h-6 text-[#A89887] mx-auto opacity-60" />
                    <p className="font-bold text-[#1C1814]">No promotional coupons assigned right now</p>
                    <p className="text-[11px]">Special customer discount codes issued by the store manager will appear here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myNotifs.map((n) => (
                      <div 
                        key={n.id} 
                        className="p-3.5 rounded-2xl bg-gradient-to-br from-white to-[#FAF8F5] border border-[#DFD5C6] flex items-center justify-between gap-3 shadow-2xs hover:border-[#38A132] transition-colors"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs text-[#2A7524] bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                              {n.couponCode}
                            </span>
                            <span className="text-xs font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              {n.discountPercent}% OFF
                            </span>
                          </div>
                          <p className="text-[11px] text-[#6B5C4D] font-medium truncate">{n.message}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (n.couponCode) {
                              navigator.clipboard.writeText(n.couponCode);
                              setCopiedCode(n.couponCode);
                              setTimeout(() => setCopiedCode(null), 2500);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          {copiedCode === n.couponCode ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. FOOTER ACTIONS */}
              <div className="flex items-center justify-between pt-1">
                <Link
                  to="/orders"
                  className="px-4 py-2 bg-white hover:bg-[#F5EFE6] text-[#2C241D] border border-[#DFD5C6] rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-2xs"
                >
                  <Package className="w-3.5 h-3.5 text-[#38A132]" />
                  <span>My Orders & Delivery Tracking</span>
                </Link>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-white hover:bg-[#F5EFE6] text-[#2C241D] border border-[#DFD5C6] rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                >
                  <span>Explore Furniture Collection</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#7A6C5E]" />
                </button>
              </div>
            </>
          )}
        </main>
      </div>

      {/* UNIFIED SINGLE "EDIT PROFILE & SECURITY" MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white border border-[#DFD5C6] rounded-3xl p-5 sm:p-6 shadow-2xl text-[#1C1814] max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#38A132]/10 text-[#38A132] flex items-center justify-center font-bold">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1C1814]">Edit Customer Profile</h3>
                  <p className="text-[11px] text-[#7A6C5E] font-medium">Update personal information, shipping address, and password credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-[#8C7C6D] hover:text-[#1C1814] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Form Error Notice */}
            {formErrors.general && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formErrors.general}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* SECTION 1: PERSONAL INFORMATION */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center gap-1.5 border-b border-[#EFE7DE] pb-1">
                  <User className="w-3 h-3 text-[#38A132]" /> Personal Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[#5C4E42] font-extrabold mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => {
                        setEditForm({ ...editForm, full_name: e.target.value });
                        if (formErrors.full_name) setFormErrors({ ...formErrors, full_name: undefined });
                      }}
                      placeholder="e.g. John Doe"
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-[#FAF8F5] border ${
                        formErrors.full_name ? 'border-rose-400 bg-rose-50/50' : 'border-[#DFD5C6]'
                      } text-[#1C1814] font-bold focus:outline-none focus:border-[#38A132]`}
                      required
                    />
                    {formErrors.full_name && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.full_name}
                      </p>
                    )}
                  </div>

                  {/* Phone Number with +91 */}
                  <div>
                    <label className="block text-[#5C4E42] font-extrabold mb-1">
                      Phone Number *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-2.5 rounded-l-xl border border-r-0 border-[#DFD5C6] bg-[#EDE4D8] text-[#1C1814] font-black text-xs select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setEditForm({ ...editForm, phone: clean });
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                        }}
                        maxLength={10}
                        placeholder="9876543210"
                        className={`w-full px-3 py-2 text-xs rounded-r-xl bg-[#FAF8F5] border ${
                          formErrors.phone ? 'border-rose-400 bg-rose-50/50' : 'border-[#DFD5C6]'
                        } text-[#1C1814] font-bold font-mono focus:outline-none focus:border-[#38A132]`}
                        required
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: DELIVERY ADDRESS (NO CURRENT LOCATION BUTTON) */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center gap-1.5 border-b border-[#EFE7DE] pb-1">
                  <MapPin className="w-3 h-3 text-[#38A132]" /> Delivery Destination
                </h4>

                <div className="space-y-2.5">
                  {/* Address Line 1 */}
                  <div>
                    <label className="block text-[#5C4E42] font-extrabold mb-1">
                      Address Line 1 (Flat, House no., Street) *
                    </label>
                    <input
                      type="text"
                      value={editForm.address_line1}
                      onChange={(e) => {
                        setEditForm({ ...editForm, address_line1: e.target.value });
                        if (formErrors.address_line1) setFormErrors({ ...formErrors, address_line1: undefined });
                      }}
                      placeholder="e.g. 42 Rosewood Lane, Near Central Mall"
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-[#FAF8F5] border ${
                        formErrors.address_line1 ? 'border-rose-400 bg-rose-50/50' : 'border-[#DFD5C6]'
                      } text-[#1C1814] font-bold focus:outline-none focus:border-[#38A132]`}
                    />
                    {formErrors.address_line1 && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.address_line1}
                      </p>
                    )}
                  </div>

                  {/* Address Line 2 */}
                  <div>
                    <label className="block text-[#5C4E42] font-extrabold mb-1">
                      Address Line 2 (Area, Landmark - Optional)
                    </label>
                    <input
                      type="text"
                      value={editForm.address_line2}
                      onChange={(e) => setEditForm({ ...editForm, address_line2: e.target.value })}
                      placeholder="e.g. Gandhi Nagar"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF8F5] border border-[#DFD5C6] text-[#1C1814] font-bold focus:outline-none focus:border-[#38A132]"
                    />
                  </div>

                  {/* City, State, PIN Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[#5C4E42] font-extrabold mb-1">City *</label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => {
                          setEditForm({ ...editForm, city: e.target.value });
                          if (formErrors.city) setFormErrors({ ...formErrors, city: undefined });
                        }}
                        placeholder="e.g. Kottayam"
                        className={`w-full px-3 py-2 text-xs rounded-xl bg-[#FAF8F5] border ${
                          formErrors.city ? 'border-rose-400 bg-rose-50/50' : 'border-[#DFD5C6]'
                        } text-[#1C1814] font-bold focus:outline-none focus:border-[#38A132]`}
                      />
                      {formErrors.city && (
                        <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[#5C4E42] font-extrabold mb-1">State *</label>
                      <input
                        type="text"
                        value={editForm.state}
                        onChange={(e) => {
                          setEditForm({ ...editForm, state: e.target.value });
                          if (formErrors.state) setFormErrors({ ...formErrors, state: undefined });
                        }}
                        placeholder="e.g. Kerala"
                        className={`w-full px-3 py-2 text-xs rounded-xl bg-[#FAF8F5] border ${
                          formErrors.state ? 'border-rose-400 bg-rose-50/50' : 'border-[#DFD5C6]'
                        } text-[#1C1814] font-bold focus:outline-none focus:border-[#38A132]`}
                      />
                      {formErrors.state && (
                        <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.state}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[#5C4E42] font-extrabold mb-1">PIN Code (6 digits) *</label>
                      <input
                        type="text"
                        value={editForm.pincode}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setEditForm({ ...editForm, pincode: clean });
                          if (formErrors.pincode) setFormErrors({ ...formErrors, pincode: undefined });
                        }}
                        maxLength={6}
                        placeholder="e.g. 686001"
                        className={`w-full px-3 py-2 text-xs rounded-xl bg-[#FAF8F5] border ${
                          formErrors.pincode ? 'border-rose-400 bg-rose-50/50' : 'border-[#DFD5C6]'
                        } text-[#1C1814] font-bold font-mono focus:outline-none focus:border-[#38A132]`}
                      />
                      {formErrors.pincode && (
                        <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.pincode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PASSWORD PROVISION (VALIDATED & OPTIONAL) */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-1">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#7A6C5E] flex items-center gap-1.5">
                    <KeyRound className="w-3 h-3 text-[#38A132]" /> Update Password (Optional)
                  </h4>
                  <span className="text-[10px] font-bold text-[#8C7C6D]">Leave blank to keep unchanged</span>
                </div>

                {formErrors.password && (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formErrors.password}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* New Password */}
                  <div>
                    <label className="block text-[#5C4E42] font-extrabold mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={editForm.newPassword}
                        onChange={(e) => {
                          setEditForm({ ...editForm, newPassword: e.target.value });
                          if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                        }}
                        autoComplete="new-password"
                        placeholder="Min. 6 characters"
                        className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-[#FAF8F5] border border-[#DFD5C6] text-[#1C1814] font-bold focus:outline-none focus:border-[#38A132]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7C6D] hover:text-[#1C1814] cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-[#5C4E42] font-extrabold mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={editForm.confirmPassword}
                        onChange={(e) => {
                          setEditForm({ ...editForm, confirmPassword: e.target.value });
                          if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                        }}
                        autoComplete="new-password"
                        placeholder="Re-enter password"
                        className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-[#FAF8F5] border border-[#DFD5C6] text-[#1C1814] font-bold focus:outline-none focus:border-[#38A132]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7C6D] hover:text-[#1C1814] cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#EFE7DE]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EAE1] text-[#5C4E42] border border-[#DFD5C6] font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#38A132] to-[#2E8529] hover:from-[#2F8829] hover:to-[#246A20] text-white font-black text-xs shadow-md shadow-[#38A132]/25 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Customer Profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
